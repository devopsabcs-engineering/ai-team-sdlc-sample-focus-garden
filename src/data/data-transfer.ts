import type { FocusGardenStateV1 } from "../domain/types";
import { isPlainObject } from "../domain/validation";
import { decodeStateV1 } from "./codec";
import { CURRENT_SCHEMA_VERSION, migrateToCurrent } from "./migrations";

export const MAX_IMPORT_BYTES = 1_048_576;
export const MAX_IMPORT_SESSIONS = 10_000;

export type ImportFailureCode =
  | "oversize"
  | "read"
  | "encoding"
  | "malformed"
  | "unsupported-version"
  | "invalid";

export type ImportResult =
  | {
      readonly ok: true;
      readonly value: FocusGardenStateV1;
      readonly preview: ImportPreview;
    }
  | { readonly ok: false; readonly code: ImportFailureCode };

export interface ImportPreview {
  readonly recordCount: number;
  readonly earliestCompletedAt: string | null;
  readonly latestCompletedAt: string | null;
  readonly hasActiveTimer: boolean;
  readonly selectedPreset: string;
  readonly soundEnabled: boolean;
  readonly theme: string;
}

export interface ImportFile {
  readonly size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export function serializeExport(state: FocusGardenStateV1): string {
  return `${JSON.stringify(state, null, 2)}\n`;
}

function preview(value: FocusGardenStateV1): ImportPreview {
  let earliestCompletedAt: string | null = null;
  let latestCompletedAt: string | null = null;
  for (const session of value.sessions) {
    if (
      earliestCompletedAt === null ||
      session.completedAt < earliestCompletedAt
    ) {
      earliestCompletedAt = session.completedAt;
    }
    if (latestCompletedAt === null || session.completedAt > latestCompletedAt) {
      latestCompletedAt = session.completedAt;
    }
  }
  return Object.freeze({
    recordCount: value.sessions.length,
    earliestCompletedAt,
    latestCompletedAt,
    hasActiveTimer: value.activeTimer !== null,
    selectedPreset: value.preferences.selectedPreset,
    soundEnabled: value.preferences.soundEnabled,
    theme: value.preferences.explicitTheme ?? "System default",
  });
}

export async function decodeImportFile(
  file: ImportFile,
): Promise<ImportResult> {
  if (file.size > MAX_IMPORT_BYTES) return { ok: false, code: "oversize" };

  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
  } catch {
    return { ok: false, code: "read" };
  }
  if (bytes.byteLength > MAX_IMPORT_BYTES) {
    return { ok: false, code: "oversize" };
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, code: "encoding" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, code: "malformed" };
  }
  if (!isPlainObject(parsed)) return { ok: false, code: "invalid" };

  const version = parsed.schemaVersion;
  if (
    typeof version !== "number" ||
    !Number.isInteger(version) ||
    version < 1
  ) {
    return { ok: false, code: "invalid" };
  }
  if (version > CURRENT_SCHEMA_VERSION) {
    return { ok: false, code: "unsupported-version" };
  }
  if (
    Array.isArray(parsed.sessions) &&
    parsed.sessions.length > MAX_IMPORT_SESSIONS
  ) {
    return { ok: false, code: "invalid" };
  }

  const migration = migrateToCurrent(parsed);
  if (!migration.ok) {
    return {
      ok: false,
      code:
        migration.code === "newer-version" ? "unsupported-version" : "invalid",
    };
  }
  const decoded = decodeStateV1(migration.value);
  if (!decoded.ok) return { ok: false, code: "invalid" };
  return {
    ok: true,
    value: decoded.value,
    preview: preview(decoded.value),
  };
}
