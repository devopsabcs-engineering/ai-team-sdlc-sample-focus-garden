import type {
  PersistenceResult,
  StateRepository,
} from "../data/local-repository";
import type { FocusGardenStateV1, ThemeId } from "../domain/types";

export interface ThemeState {
  readonly repository: StateRepository;
  readonly loaded: PersistenceResult<FocusGardenStateV1>;
  readonly now: () => string;
}

export function resolveInitialTheme(
  loaded: PersistenceResult<FocusGardenStateV1>,
  prefersDark: boolean,
): ThemeId {
  return loaded.ok
    ? (loaded.value.preferences.explicitTheme ??
        (prefersDark ? "midnight" : "botanical"))
    : prefersDark
      ? "midnight"
      : "botanical";
}

export function persistExplicitTheme(
  theme: ThemeId,
  state: ThemeState,
): PersistenceResult<FocusGardenStateV1> {
  if (!state.loaded.ok) return state.loaded;

  const next: FocusGardenStateV1 = {
    ...state.loaded.value,
    savedAt: state.now(),
    preferences: {
      ...state.loaded.value.preferences,
      explicitTheme: theme,
    },
  };
  const replaced = state.repository.replace(next);
  return replaced.ok ? { ok: true, value: next } : replaced;
}

export function applyTheme(documentElement: HTMLElement, theme: ThemeId): void {
  documentElement.dataset.theme = theme;
}

export function bootstrapTheme(
  windowTarget: {
    readonly matchMedia: (query: string) => { readonly matches: boolean };
  },
  documentElement: HTMLElement,
  loaded: PersistenceResult<FocusGardenStateV1>,
): ThemeId {
  const prefersDark = windowTarget.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;
  const theme = resolveInitialTheme(loaded, prefersDark);
  applyTheme(documentElement, theme);
  return theme;
}
