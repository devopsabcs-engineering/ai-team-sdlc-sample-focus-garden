import { decodeStateV1 } from "./codec";

export const CURRENT_SCHEMA_VERSION = 1;

export type MigrationFailure = "corrupt" | "newer-version";
export type MigrationResult =
  | { readonly ok: true; readonly value: unknown; readonly migrated: boolean }
  | { readonly ok: false; readonly code: MigrationFailure };

export interface Migration {
  readonly from: number;
  readonly migrate: (value: unknown) => unknown;
  readonly validate: (value: unknown) => boolean;
}

export const MIGRATIONS: readonly Migration[] = Object.freeze([]);

export function migrateSequentially(
  value: unknown,
  targetVersion: number,
  migrations: readonly Migration[],
  validateCurrent: (candidate: unknown) => boolean,
): MigrationResult {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !("schemaVersion" in value)
  ) {
    return { ok: false, code: "corrupt" };
  }
  const version: unknown = value.schemaVersion;
  if (
    !Number.isInteger(version) ||
    typeof version !== "number" ||
    version < 1
  ) {
    return { ok: false, code: "corrupt" };
  }
  if (version > targetVersion) {
    return { ok: false, code: "newer-version" };
  }

  let current: unknown = value;
  let currentVersion = version;
  while (currentVersion < targetVersion) {
    const migration = migrations.find((item) => item.from === currentVersion);
    if (migration === undefined) return { ok: false, code: "corrupt" };
    current = migration.migrate(current);
    if (!migration.validate(current)) return { ok: false, code: "corrupt" };
    currentVersion += 1;
  }
  if (!validateCurrent(current)) return { ok: false, code: "corrupt" };
  return { ok: true, value: current, migrated: version !== currentVersion };
}

export function migrateToCurrent(value: unknown): MigrationResult {
  return migrateSequentially(
    value,
    CURRENT_SCHEMA_VERSION,
    MIGRATIONS,
    (candidate) => decodeStateV1(candidate).ok,
  );
}
