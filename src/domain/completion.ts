import type {
  PersistenceFailureCode,
  StateRepository,
} from "../data/local-repository";
import { completeFocusTimer, creditedMs, type Clock } from "./timer";
import type { CompletedSessionV1, FocusGardenStateV1 } from "./types";
import { PRESETS } from "./types";
import { selectSpecies, type RandomSource } from "./random";

export type CompletionResult =
  | {
      readonly status: "committed";
      readonly state: FocusGardenStateV1;
      readonly session: CompletedSessionV1;
    }
  | {
      readonly status: "unchanged";
      readonly state: FocusGardenStateV1;
    }
  | {
      readonly status: "failed";
      readonly code: PersistenceFailureCode;
    };

export function completeDueFocus(options: {
  readonly repository: StateRepository;
  readonly timerId: string;
  readonly clock: Clock;
  readonly now: () => string;
  readonly random: RandomSource;
}): CompletionResult {
  const loaded = options.repository.load();
  if (!loaded.ok) return { status: "failed", code: loaded.code };

  const state = loaded.value;
  const timer = state.activeTimer;
  if (
    timer?.id !== options.timerId ||
    timer.kind !== "focus" ||
    timer.phase !== "running" ||
    creditedMs(timer, options.clock.now()) < timer.durationSeconds * 1000
  ) {
    return { status: "unchanged", state };
  }

  const existing = state.sessions.find((session) => session.id === timer.id);
  if (timer.runStartedAt === null) {
    throw new Error("A running focus timer must have a running segment.");
  }
  const boundaryMs =
    Date.parse(timer.runStartedAt) +
    (timer.durationSeconds * 1000 - timer.creditedBeforeRunMs);
  const boundary = new Date(boundaryMs).toISOString();
  const completedTimer = completeFocusTimer(timer, boundary);

  if (existing !== undefined) {
    const normalized = {
      ...state,
      savedAt: options.now(),
      activeTimer: completedTimer,
    };
    const saved = options.repository.replace(normalized);
    return saved.ok
      ? { status: "unchanged", state: normalized }
      : { status: "failed", code: saved.code };
  }

  if (timer.startedAt === null) {
    throw new Error("A running focus timer must have a start time.");
  }
  const session: CompletedSessionV1 = {
    id: timer.id,
    presetId: timer.presetId,
    durationSeconds: PRESETS[timer.presetId].focusSeconds,
    taskLabel: timer.taskLabel,
    species: selectSpecies(options.random),
    startedAt: timer.startedAt,
    completedAt: boundary,
  };
  const next: FocusGardenStateV1 = {
    ...state,
    savedAt: options.now(),
    activeTimer: completedTimer,
    sessions: [...state.sessions, session],
  };
  const saved = options.repository.replace(next);
  return saved.ok
    ? { status: "committed", state: next, session }
    : { status: "failed", code: saved.code };
}

export type AcknowledgeResult =
  | { readonly ok: true; readonly state: FocusGardenStateV1 }
  | { readonly ok: false; readonly code: PersistenceFailureCode };

export function acknowledgeReward(options: {
  readonly repository: StateRepository;
  readonly sessionId: string;
  readonly now: () => string;
}): AcknowledgeResult {
  const loaded = options.repository.load();
  if (!loaded.ok) return loaded;
  const timer = loaded.value.activeTimer;
  if (
    timer?.id !== options.sessionId ||
    timer.kind !== "focus" ||
    timer.phase !== "completed" ||
    timer.rewardAcknowledgedAt !== null ||
    !loaded.value.sessions.some((session) => session.id === timer.id)
  ) {
    return { ok: true, state: loaded.value };
  }
  const acknowledgedAt = options.now();
  const next: FocusGardenStateV1 = {
    ...loaded.value,
    savedAt: acknowledgedAt,
    activeTimer: { ...timer, rewardAcknowledgedAt: acknowledgedAt },
  };
  const saved = options.repository.replace(next);
  return saved.ok ? { ok: true, state: next } : saved;
}
