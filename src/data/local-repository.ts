import type { FocusGardenStateV1 } from "../domain/types";
import { decodeStateV1 } from "./codec";
import { migrateToCurrent } from "./migrations";

export const STATE_KEY = "focus-garden:state";

export type PersistenceFailureCode =
  "unavailable" | "quota" | "corrupt" | "newer-version";
export type PersistenceResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly code: PersistenceFailureCode;
      readonly cause?: unknown;
    };

export interface StateRepository {
  load(): PersistenceResult<FocusGardenStateV1>;
  replace(next: FocusGardenStateV1): PersistenceResult<void>;
  clear(): PersistenceResult<void>;
}

type StorageProvider = () => Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

function storageFailure(cause: unknown): PersistenceResult<never> {
  const quota =
    cause instanceof DOMException &&
    (cause.name === "QuotaExceededError" ||
      cause.name === "NS_ERROR_DOM_QUOTA_REACHED");
  return { ok: false, code: quota ? "quota" : "unavailable", cause };
}

export function createDefaultState(now: () => string): FocusGardenStateV1 {
  return {
    schemaVersion: 1,
    savedAt: now(),
    preferences: {
      selectedPreset: "25-5",
      explicitTheme: null,
      soundEnabled: true,
    },
    activeTimer: null,
    sessions: [],
  };
}

export function createLocalStateRepository(
  storageProvider: StorageProvider,
  now: () => string,
): StateRepository {
  return {
    load(): PersistenceResult<FocusGardenStateV1> {
      let storage: ReturnType<StorageProvider>;
      let raw: string | null;
      try {
        storage = storageProvider();
        raw = storage.getItem(STATE_KEY);
      } catch (cause) {
        return storageFailure(cause);
      }
      if (raw === null) return { ok: true, value: createDefaultState(now) };

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw) as unknown;
      } catch (cause) {
        return { ok: false, code: "corrupt", cause };
      }
      const migration = migrateToCurrent(parsed);
      if (!migration.ok) return migration;
      const decoded = decodeStateV1(migration.value);
      if (!decoded.ok) return { ok: false, code: "corrupt" };

      if (migration.migrated) {
        try {
          storage.setItem(STATE_KEY, JSON.stringify(decoded.value));
        } catch (cause) {
          return storageFailure(cause);
        }
      }
      return decoded;
    },

    replace(next: FocusGardenStateV1): PersistenceResult<void> {
      const decoded = decodeStateV1(next);
      if (!decoded.ok) return { ok: false, code: "corrupt" };
      try {
        storageProvider().setItem(STATE_KEY, JSON.stringify(decoded.value));
        return { ok: true, value: undefined };
      } catch (cause) {
        return storageFailure(cause);
      }
    },

    clear(): PersistenceResult<void> {
      try {
        storageProvider().removeItem(STATE_KEY);
        return { ok: true, value: undefined };
      } catch (cause) {
        return storageFailure(cause);
      }
    },
  };
}
