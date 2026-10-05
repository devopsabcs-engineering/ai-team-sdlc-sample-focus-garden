import type {
  FocusGardenStateV1,
  PersistedTimerV1,
} from "../../src/domain/types";

export const UUID_1 = "3d594650-3436-4c66-8d3a-1f2f73a82b6b";
export const UUID_2 = "97e2ae10-876e-4a1c-bfa9-47324de774f8";

export const VALID_TIMER_V1: PersistedTimerV1 = Object.freeze({
  id: UUID_2,
  kind: "focus",
  presetId: "25-5",
  durationSeconds: 1500,
  taskLabel: "Write release notes",
  phase: "paused",
  startedAt: "2026-10-05T13:00:00.000Z",
  runStartedAt: null,
  creditedBeforeRunMs: 600_000,
  pausedAt: "2026-10-05T13:10:00.000Z",
  completedAt: null,
  rewardAcknowledgedAt: null,
});

export const VALID_STATE_V1: FocusGardenStateV1 = Object.freeze({
  schemaVersion: 1,
  savedAt: "2026-10-05T14:00:00.000Z",
  preferences: Object.freeze({
    selectedPreset: "25-5",
    explicitTheme: "golden",
    soundEnabled: true,
  }),
  activeTimer: null,
  sessions: Object.freeze([
    Object.freeze({
      id: UUID_1,
      presetId: "25-5",
      durationSeconds: 1500,
      taskLabel: "Plan the week",
      species: "emberleaf",
      startedAt: "2026-10-05T12:00:00.000Z",
      completedAt: "2026-10-05T12:25:00.000Z",
    }),
  ]),
});
