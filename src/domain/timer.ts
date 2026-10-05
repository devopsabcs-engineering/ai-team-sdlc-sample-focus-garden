import { PRESETS, type PersistedTimerV1, type PresetId } from "./types";

export interface Clock {
  now(): number;
}

export interface IdSource {
  next(): string;
}

export type TimerReconciliation =
  | {
      readonly timer: PersistedTimerV1;
      readonly focusCompletionDue: false;
      readonly completedNow: boolean;
    }
  | {
      readonly timer: PersistedTimerV1;
      readonly focusCompletionDue: true;
      readonly completedNow: false;
      readonly completionBoundary: string;
    };

function instant(epochMs: number): string {
  if (!Number.isFinite(epochMs)) throw new RangeError("Invalid clock value.");
  return new Date(epochMs).toISOString();
}

export function normalizeTaskLabel(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if ([...trimmed].length > 80) {
    throw new RangeError("Task label must be 80 characters or fewer.");
  }
  return trimmed;
}

export function creditedMs(timer: PersistedTimerV1, nowMs: number): number {
  const runningDelta =
    timer.phase === "running" && timer.runStartedAt !== null
      ? Math.max(0, nowMs - Date.parse(timer.runStartedAt))
      : 0;
  return Math.min(
    timer.durationSeconds * 1000,
    timer.creditedBeforeRunMs + runningDelta,
  );
}

export function remainingSeconds(
  timer: PersistedTimerV1,
  nowMs: number,
): number {
  return Math.max(
    0,
    Math.min(
      timer.durationSeconds,
      Math.ceil(
        (timer.durationSeconds * 1000 - creditedMs(timer, nowMs)) / 1000,
      ),
    ),
  );
}

export function completionBoundary(timer: PersistedTimerV1): string | null {
  if (timer.phase === "completed") return timer.completedAt;
  if (timer.phase !== "running" || timer.runStartedAt === null) return null;
  return instant(
    Date.parse(timer.runStartedAt) +
      (timer.durationSeconds * 1000 - timer.creditedBeforeRunMs),
  );
}

export function startFocusTimer(
  presetId: PresetId,
  taskLabel: string | null,
  nowMs: number,
  id: string,
): PersistedTimerV1 {
  const startedAt = instant(nowMs);
  return {
    id,
    kind: "focus",
    presetId,
    durationSeconds: PRESETS[presetId].focusSeconds,
    taskLabel,
    phase: "running",
    startedAt,
    runStartedAt: startedAt,
    creditedBeforeRunMs: 0,
    pausedAt: null,
    completedAt: null,
    rewardAcknowledgedAt: null,
  };
}

export function startPreparedTimer(
  timer: PersistedTimerV1,
  nowMs: number,
): PersistedTimerV1 {
  if (timer.phase !== "prepared") {
    throw new Error("Only a prepared timer can start.");
  }
  const startedAt = instant(nowMs);
  return {
    ...timer,
    phase: "running",
    startedAt,
    runStartedAt: startedAt,
  };
}

export function prepareBreakTimer(
  completedFocus: PersistedTimerV1,
  id: string,
): PersistedTimerV1 {
  if (completedFocus.kind !== "focus" || completedFocus.phase !== "completed") {
    throw new Error("A break can only follow a completed focus timer.");
  }
  return {
    id,
    kind: "break",
    presetId: completedFocus.presetId,
    durationSeconds: PRESETS[completedFocus.presetId].breakSeconds,
    taskLabel: null,
    phase: "prepared",
    startedAt: null,
    runStartedAt: null,
    creditedBeforeRunMs: 0,
    pausedAt: null,
    completedAt: null,
    rewardAcknowledgedAt: null,
  };
}

export function pauseTimer(
  timer: PersistedTimerV1,
  nowMs: number,
): PersistedTimerV1 {
  if (timer.phase !== "running") {
    throw new Error("Only a running timer can pause.");
  }
  if (remainingSeconds(timer, nowMs) === 0) {
    throw new Error("A due timer cannot pause.");
  }
  return {
    ...timer,
    phase: "paused",
    runStartedAt: null,
    creditedBeforeRunMs: creditedMs(timer, nowMs),
    pausedAt: instant(nowMs),
  };
}

export function resumeTimer(
  timer: PersistedTimerV1,
  nowMs: number,
): PersistedTimerV1 {
  if (timer.phase !== "paused") {
    throw new Error("Only a paused timer can resume.");
  }
  return {
    ...timer,
    phase: "running",
    runStartedAt: instant(nowMs),
    pausedAt: null,
  };
}

export function reconcileTimer(
  timer: PersistedTimerV1,
  nowMs: number,
): TimerReconciliation {
  if (
    timer.phase !== "running" ||
    creditedMs(timer, nowMs) < timer.durationSeconds * 1000
  ) {
    return { timer, focusCompletionDue: false, completedNow: false };
  }

  const boundary = completionBoundary(timer);
  if (boundary === null) {
    throw new Error("Running timer has no completion boundary.");
  }
  if (timer.kind === "focus") {
    return {
      timer,
      focusCompletionDue: true,
      completedNow: false,
      completionBoundary: boundary,
    };
  }
  return {
    timer: {
      ...timer,
      phase: "completed",
      runStartedAt: null,
      creditedBeforeRunMs: timer.durationSeconds * 1000,
      completedAt: boundary,
    },
    focusCompletionDue: false,
    completedNow: true,
  };
}

export function completeFocusTimer(
  timer: PersistedTimerV1,
  boundary: string,
): PersistedTimerV1 {
  if (
    timer.kind !== "focus" ||
    timer.phase !== "running" ||
    completionBoundary(timer) !== boundary
  ) {
    throw new Error("Focus timer is not due at this boundary.");
  }
  return {
    ...timer,
    phase: "completed",
    runStartedAt: null,
    creditedBeforeRunMs: timer.durationSeconds * 1000,
    completedAt: boundary,
  };
}

export type TimerAnnouncement =
  "started" | "paused" | "resumed" | "five-minutes" | "one-minute";

export function announcementText(
  announcement: TimerAnnouncement,
  kind: PersistedTimerV1["kind"],
): string {
  const name = kind === "focus" ? "Focus" : "Break";
  switch (announcement) {
    case "started":
      return `${name} timer started.`;
    case "paused":
      return `${name} timer paused.`;
    case "resumed":
      return `${name} timer resumed.`;
    case "five-minutes":
      return "5 minutes remaining.";
    case "one-minute":
      return "1 minute remaining.";
  }
}

export function crossedAnnouncementThreshold(
  previousSeconds: number,
  nextSeconds: number,
): TimerAnnouncement | null {
  if (previousSeconds > 60 && nextSeconds <= 60) return "one-minute";
  if (previousSeconds > 300 && nextSeconds <= 300) return "five-minutes";
  return null;
}
