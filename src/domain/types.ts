export const THEME_IDS = ["botanical", "golden", "midnight"] as const;
export const PRESET_IDS = ["25-5", "50-10", "15-3"] as const;
export const TIMER_KINDS = ["focus", "break"] as const;
export const TIMER_PHASES = [
  "prepared",
  "running",
  "paused",
  "completed",
] as const;
export const SPECIES_IDS = [
  "emberleaf",
  "moonbell",
  "cloudfern",
  "sunspindle",
  "dewstar",
  "quietbloom",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];
export type PresetId = (typeof PRESET_IDS)[number];
export type TimerKind = (typeof TIMER_KINDS)[number];
export type TimerPhase = (typeof TIMER_PHASES)[number];
export type Species = (typeof SPECIES_IDS)[number];
export type Route = "focus" | "garden";

export const PRESETS: Readonly<
  Record<
    PresetId,
    {
      readonly focusSeconds: 900 | 1500 | 3000;
      readonly breakSeconds: 180 | 300 | 600;
    }
  >
> = {
  "25-5": { focusSeconds: 1500, breakSeconds: 300 },
  "50-10": { focusSeconds: 3000, breakSeconds: 600 },
  "15-3": { focusSeconds: 900, breakSeconds: 180 },
};

export interface PreferencesV1 {
  readonly selectedPreset: PresetId;
  readonly explicitTheme: ThemeId | null;
  readonly soundEnabled: boolean;
}

export interface PersistedTimerV1 {
  readonly id: string;
  readonly kind: TimerKind;
  readonly presetId: PresetId;
  readonly durationSeconds: 180 | 300 | 600 | 900 | 1500 | 3000;
  readonly taskLabel: string | null;
  readonly phase: TimerPhase;
  readonly startedAt: string | null;
  readonly runStartedAt: string | null;
  readonly creditedBeforeRunMs: number;
  readonly pausedAt: string | null;
  readonly completedAt: string | null;
  readonly rewardAcknowledgedAt: string | null;
}

export interface CompletedSessionV1 {
  readonly id: string;
  readonly presetId: PresetId;
  readonly durationSeconds: 900 | 1500 | 3000;
  readonly taskLabel: string | null;
  readonly species: Species;
  readonly startedAt: string;
  readonly completedAt: string;
}

export interface FocusGardenStateV1 {
  readonly schemaVersion: 1;
  readonly savedAt: string;
  readonly preferences: PreferencesV1;
  readonly activeTimer: PersistedTimerV1 | null;
  readonly sessions: readonly CompletedSessionV1[];
}

export interface ThemeOption {
  readonly id: ThemeId;
  readonly label: string;
}

export const THEME_OPTIONS: readonly ThemeOption[] = [
  { id: "botanical", label: "Botanical Garden" },
  { id: "golden", label: "High Contrast" },
  { id: "midnight", label: "Midnight Garden" },
];

export function isThemeId(value: unknown): value is ThemeId {
  return (
    typeof value === "string" && THEME_IDS.some((theme) => theme === value)
  );
}
