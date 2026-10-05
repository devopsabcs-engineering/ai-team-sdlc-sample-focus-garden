import { beforeEach, describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";

import {
  STATE_KEY,
  createLocalStateRepository,
} from "../src/data/local-repository";
import { VALID_STATE_V1 } from "./fixtures/schema-v1";

const NOW = "2026-10-05T14:00:00.000Z";

function instrumentStorage(storage: Storage) {
  return {
    getItem: vi.fn((key: string) => storage.getItem(key)),
    setItem: vi.fn((key: string, value: string) => {
      storage.setItem(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      storage.removeItem(key);
    }),
  };
}

describe("canonical localStorage repository", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new JSDOM("", { url: "https://focus-garden.test/" }).window
      .localStorage;
  });

  it("initializes missing storage safely in memory without writing", () => {
    const instrumented = instrumentStorage(storage);
    const repository = createLocalStateRepository(
      () => instrumented,
      () => NOW,
    );

    expect(repository.load()).toEqual({
      ok: true,
      value: {
        schemaVersion: 1,
        savedAt: NOW,
        preferences: {
          selectedPreset: "25-5",
          explicitTheme: null,
          soundEnabled: true,
        },
        activeTimer: null,
        sessions: [],
      },
    });
    expect(instrumented.setItem).not.toHaveBeenCalled();
  });

  it("reads the key once and decodes a canonical copy", () => {
    storage.setItem(STATE_KEY, JSON.stringify(VALID_STATE_V1));
    const instrumented = instrumentStorage(storage);
    const repository = createLocalStateRepository(
      () => instrumented,
      () => NOW,
    );

    expect(repository.load()).toEqual({ ok: true, value: VALID_STATE_V1 });
    expect(instrumented.getItem).toHaveBeenCalledOnce();
    expect(instrumented.getItem).toHaveBeenCalledWith(STATE_KEY);
  });

  it.each([
    ["invalid JSON", "{", "corrupt"],
    ["strict shape violation", JSON.stringify({ schemaVersion: 1 }), "corrupt"],
    ["newer version", JSON.stringify({ schemaVersion: 2 }), "newer-version"],
  ] as const)("preserves %s state", (_name, raw, code) => {
    storage.setItem(STATE_KEY, raw);
    const instrumented = instrumentStorage(storage);
    const repository = createLocalStateRepository(
      () => instrumented,
      () => NOW,
    );

    expect(repository.load()).toMatchObject({ ok: false, code });
    expect(storage.getItem(STATE_KEY)).toBe(raw);
    expect(instrumented.setItem).not.toHaveBeenCalled();
  });

  it("replaces the whole document with exactly one atomic setItem", () => {
    storage.setItem(STATE_KEY, "old");
    const instrumented = instrumentStorage(storage);
    const repository = createLocalStateRepository(
      () => instrumented,
      () => NOW,
    );

    expect(repository.replace(VALID_STATE_V1)).toEqual({
      ok: true,
      value: undefined,
    });
    expect(instrumented.setItem).toHaveBeenCalledOnce();
    expect(instrumented.setItem).toHaveBeenCalledWith(
      STATE_KEY,
      JSON.stringify(VALID_STATE_V1),
    );
    expect(instrumented.removeItem).not.toHaveBeenCalled();
  });

  it("rejects noncanonical runtime input without touching storage", () => {
    const instrumented = instrumentStorage(storage);
    const repository = createLocalStateRepository(
      () => instrumented,
      () => NOW,
    );
    const invalid = structuredClone(VALID_STATE_V1);
    Object.defineProperty(invalid, "unknown", {
      value: true,
      enumerable: true,
    });

    expect(repository.replace(invalid)).toEqual({
      ok: false,
      code: "corrupt",
    });
    expect(instrumented.setItem).not.toHaveBeenCalled();
  });

  it("removes only the canonical key once", () => {
    storage.setItem(STATE_KEY, JSON.stringify(VALID_STATE_V1));
    storage.setItem("other", "kept");
    const instrumented = instrumentStorage(storage);
    const repository = createLocalStateRepository(
      () => instrumented,
      () => NOW,
    );

    expect(repository.clear()).toEqual({ ok: true, value: undefined });
    expect(instrumented.removeItem).toHaveBeenCalledOnce();
    expect(instrumented.removeItem).toHaveBeenCalledWith(STATE_KEY);
    expect(storage.getItem("other")).toBe("kept");
  });

  it.each([
    ["read", "getItem"],
    ["write", "setItem"],
    ["remove", "removeItem"],
  ] as const)("maps unavailable %s failures", (_operation, method) => {
    const failure = new DOMException("blocked", "SecurityError");
    const storage = {
      getItem: () =>
        method === "getItem"
          ? (() => {
              throw failure;
            })()
          : null,
      setItem: () => {
        if (method === "setItem") throw failure;
      },
      removeItem: () => {
        if (method === "removeItem") throw failure;
      },
    };
    const repository = createLocalStateRepository(
      () => storage,
      () => NOW,
    );
    const result =
      method === "getItem"
        ? repository.load()
        : method === "setItem"
          ? repository.replace(VALID_STATE_V1)
          : repository.clear();

    expect(result).toEqual({
      ok: false,
      code: "unavailable",
      cause: failure,
    });
  });

  it("maps quota failures without changing the previous raw value", () => {
    const setItem = vi.fn(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    const storage = {
      getItem: () => "previous",
      setItem,
      removeItem: vi.fn(),
    };
    const repository = createLocalStateRepository(
      () => storage,
      () => NOW,
    );

    expect(repository.replace(VALID_STATE_V1)).toMatchObject({
      ok: false,
      code: "quota",
    });
    expect(setItem).toHaveBeenCalledOnce();
    expect(storage.getItem()).toBe("previous");
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("maps a blocked localStorage provider to unavailable", () => {
    const failure = new DOMException("blocked", "SecurityError");
    const repository = createLocalStateRepository(
      () => {
        throw failure;
      },
      () => NOW,
    );
    expect(repository.load()).toEqual({
      ok: false,
      code: "unavailable",
      cause: failure,
    });
  });
});
