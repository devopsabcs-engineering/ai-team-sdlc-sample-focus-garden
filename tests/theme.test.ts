import { beforeEach, describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";

import {
  applyTheme,
  bootstrapTheme,
  persistExplicitTheme,
  resolveInitialTheme,
} from "../src/app/theme";
import {
  createLocalStateRepository,
  type PersistenceResult,
} from "../src/data/local-repository";
import type { FocusGardenStateV1 } from "../src/domain/types";

function successful(
  explicitTheme: FocusGardenStateV1["preferences"]["explicitTheme"],
): PersistenceResult<FocusGardenStateV1> {
  return {
    ok: true,
    value: {
      schemaVersion: 1,
      savedAt: "2026-10-05T14:00:00.000Z",
      preferences: {
        selectedPreset: "25-5",
        explicitTheme,
        soundEnabled: true,
      },
      activeTimer: null,
      sessions: [],
    },
  };
}

describe("theme repository integration", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new JSDOM("", { url: "https://focus-garden.test/" }).window
      .localStorage;
    document.documentElement.removeAttribute("data-theme");
  });

  it("uses system preference only when the canonical state has no explicit choice", () => {
    expect(resolveInitialTheme(successful(null), false)).toBe("botanical");
    expect(resolveInitialTheme(successful(null), true)).toBe("midnight");
    expect(resolveInitialTheme(successful("golden"), true)).toBe("golden");
  });

  it("uses the safe implicit theme when state cannot be decoded", () => {
    const failed: PersistenceResult<FocusGardenStateV1> = {
      ok: false,
      code: "corrupt",
    };
    expect(resolveInitialTheme(failed, false)).toBe("botanical");
    expect(resolveInitialTheme(failed, true)).toBe("midnight");
  });

  it("persists a theme by replacing the complete canonical state", () => {
    const now = () => "2026-10-05T15:00:00.000Z";
    const repository = createLocalStateRepository(() => storage, now);
    const loaded = repository.load();

    const saved = persistExplicitTheme("golden", {
      repository,
      loaded,
      now,
    });

    expect(saved.ok && saved.value.preferences.explicitTheme).toBe("golden");
    expect(repository.load()).toEqual(saved);
  });

  it("does not overwrite corrupt state while applying a visual theme", () => {
    storage.setItem("focus-garden:state", "{");
    const repository = createLocalStateRepository(
      () => storage,
      () => "2026-10-05T15:00:00.000Z",
    );
    const loaded = repository.load();

    expect(
      persistExplicitTheme("golden", {
        repository,
        loaded,
        now: () => "2026-10-05T15:00:00.000Z",
      }),
    ).toMatchObject({ ok: false, code: "corrupt" });
    applyTheme(document.documentElement, "golden");
    expect(document.documentElement.dataset.theme).toBe("golden");
    expect(storage.getItem("focus-garden:state")).toBe("{");
  });

  it("bootstraps the selected theme before rendering", () => {
    const theme = bootstrapTheme(
      { matchMedia: () => ({ matches: true }) },
      document.documentElement,
      successful("golden"),
    );
    expect(theme).toBe("golden");
    expect(document.documentElement.dataset.theme).toBe("golden");
  });
});
