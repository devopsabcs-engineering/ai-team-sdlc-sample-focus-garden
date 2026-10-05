import {
  PRESET_IDS,
  PRESETS,
  SPECIES_IDS,
  THEME_IDS,
  TIMER_KINDS,
  TIMER_PHASES,
  type CompletedSessionV1,
  type FocusGardenStateV1,
  type PersistedTimerV1,
} from "../domain/types";
import {
  hasExactKeys,
  isCanonicalInstant,
  isPlainObject,
  isSafeIntegerInRange,
  isTaskLabel,
  isUuid,
} from "../domain/validation";

const STATE_KEYS = [
  "schemaVersion",
  "savedAt",
  "preferences",
  "activeTimer",
  "sessions",
] as const;
const PREFERENCE_KEYS = [
  "selectedPreset",
  "explicitTheme",
  "soundEnabled",
] as const;
const TIMER_KEYS = [
  "id",
  "kind",
  "presetId",
  "durationSeconds",
  "taskLabel",
  "phase",
  "startedAt",
  "runStartedAt",
  "creditedBeforeRunMs",
  "pausedAt",
  "completedAt",
  "rewardAcknowledgedAt",
] as const;
const SESSION_KEYS = [
  "id",
  "presetId",
  "durationSeconds",
  "taskLabel",
  "species",
  "startedAt",
  "completedAt",
] as const;
const MAX_SESSIONS = 10_000;

export type DecodeResult =
  | { readonly ok: true; readonly value: FocusGardenStateV1 }
  | { readonly ok: false };

function isMember<T extends string>(
  value: unknown,
  values: readonly T[],
): value is T {
  return typeof value === "string" && values.some((item) => item === value);
}

function decodeNullableInstant(value: unknown): string | null | undefined {
  if (value === null) return null;
  return isCanonicalInstant(value) ? value : undefined;
}

function decodeTimer(value: unknown): PersistedTimerV1 | null | undefined {
  if (value === null) return null;
  if (!isPlainObject(value) || !hasExactKeys(value, TIMER_KEYS)) {
    return undefined;
  }

  const {
    id,
    kind,
    presetId,
    durationSeconds,
    taskLabel,
    phase,
    creditedBeforeRunMs,
  } = value;
  const startedAt = decodeNullableInstant(value.startedAt);
  const runStartedAt = decodeNullableInstant(value.runStartedAt);
  const pausedAt = decodeNullableInstant(value.pausedAt);
  const completedAt = decodeNullableInstant(value.completedAt);
  const rewardAcknowledgedAt = decodeNullableInstant(
    value.rewardAcknowledgedAt,
  );
  if (
    !isUuid(id) ||
    !isMember(kind, TIMER_KINDS) ||
    !isMember(presetId, PRESET_IDS) ||
    !isMember(phase, TIMER_PHASES) ||
    !isTaskLabel(taskLabel) ||
    startedAt === undefined ||
    runStartedAt === undefined ||
    pausedAt === undefined ||
    completedAt === undefined ||
    rewardAcknowledgedAt === undefined
  ) {
    return undefined;
  }

  const expectedDuration =
    kind === "focus"
      ? PRESETS[presetId].focusSeconds
      : PRESETS[presetId].breakSeconds;
  if (
    durationSeconds !== expectedDuration ||
    !isSafeIntegerInRange(creditedBeforeRunMs, 0, expectedDuration * 1000) ||
    (kind === "break" && (taskLabel !== null || rewardAcknowledgedAt !== null))
  ) {
    return undefined;
  }

  const phaseIsValid =
    (phase === "prepared" &&
      startedAt === null &&
      runStartedAt === null &&
      creditedBeforeRunMs === 0 &&
      pausedAt === null &&
      completedAt === null &&
      rewardAcknowledgedAt === null) ||
    (phase === "running" &&
      startedAt !== null &&
      runStartedAt !== null &&
      pausedAt === null &&
      completedAt === null &&
      rewardAcknowledgedAt === null) ||
    (phase === "paused" &&
      startedAt !== null &&
      runStartedAt === null &&
      pausedAt !== null &&
      completedAt === null &&
      rewardAcknowledgedAt === null) ||
    (phase === "completed" &&
      startedAt !== null &&
      runStartedAt === null &&
      pausedAt === null &&
      completedAt !== null &&
      Date.parse(completedAt) >= Date.parse(startedAt) &&
      (rewardAcknowledgedAt === null ||
        (kind === "focus" &&
          Date.parse(rewardAcknowledgedAt) >= Date.parse(completedAt))));
  if (!phaseIsValid) return undefined;

  return {
    id,
    kind,
    presetId,
    durationSeconds: expectedDuration,
    taskLabel,
    phase,
    startedAt,
    runStartedAt,
    creditedBeforeRunMs,
    pausedAt,
    completedAt,
    rewardAcknowledgedAt,
  };
}

function decodeSession(value: unknown): CompletedSessionV1 | undefined {
  if (!isPlainObject(value) || !hasExactKeys(value, SESSION_KEYS)) {
    return undefined;
  }
  const {
    id,
    presetId,
    durationSeconds,
    taskLabel,
    species,
    startedAt,
    completedAt,
  } = value;
  if (
    !isUuid(id) ||
    !isMember(presetId, PRESET_IDS) ||
    durationSeconds !== PRESETS[presetId].focusSeconds ||
    !isTaskLabel(taskLabel) ||
    !isMember(species, SPECIES_IDS) ||
    !isCanonicalInstant(startedAt) ||
    !isCanonicalInstant(completedAt) ||
    Date.parse(completedAt) < Date.parse(startedAt)
  ) {
    return undefined;
  }
  return {
    id,
    presetId,
    durationSeconds: PRESETS[presetId].focusSeconds,
    taskLabel,
    species,
    startedAt,
    completedAt,
  };
}

export function decodeStateV1(value: unknown): DecodeResult {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, STATE_KEYS) ||
    value.schemaVersion !== 1 ||
    !isCanonicalInstant(value.savedAt) ||
    !isPlainObject(value.preferences) ||
    !hasExactKeys(value.preferences, PREFERENCE_KEYS)
  ) {
    return { ok: false };
  }

  const { selectedPreset, explicitTheme, soundEnabled } = value.preferences;
  if (
    !isMember(selectedPreset, PRESET_IDS) ||
    !(explicitTheme === null || isMember(explicitTheme, THEME_IDS)) ||
    typeof soundEnabled !== "boolean" ||
    !Array.isArray(value.sessions) ||
    value.sessions.length > MAX_SESSIONS
  ) {
    return { ok: false };
  }

  const activeTimer = decodeTimer(value.activeTimer);
  if (activeTimer === undefined) return { ok: false };

  const sessions: CompletedSessionV1[] = [];
  const ids = new Set<string>();
  for (const candidate of value.sessions) {
    const session = decodeSession(candidate);
    if (session === undefined || ids.has(session.id)) return { ok: false };
    ids.add(session.id);
    sessions.push(session);
  }

  return {
    ok: true,
    value: {
      schemaVersion: 1,
      savedAt: value.savedAt,
      preferences: {
        selectedPreset,
        explicitTheme,
        soundEnabled,
      },
      activeTimer,
      sessions,
    },
  };
}
