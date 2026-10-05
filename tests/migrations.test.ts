import { describe, expect, it } from "vitest";

import {
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
  migrateSequentially,
  migrateToCurrent,
} from "../src/data/migrations";
import { VALID_STATE_V1 } from "./fixtures/schema-v1";

describe("sequential migration registry", () => {
  it("starts at schema v1 with a frozen empty registry", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
    expect(MIGRATIONS).toEqual([]);
    expect(Object.isFrozen(MIGRATIONS)).toBe(true);
  });

  it("accepts current canonical state without migration", () => {
    expect(migrateToCurrent(VALID_STATE_V1)).toEqual({
      ok: true,
      value: VALID_STATE_V1,
      migrated: false,
    });
  });

  it.each([
    ["missing object", null, "corrupt"],
    ["missing schema", {}, "corrupt"],
    ["fractional schema", { schemaVersion: 1.5 }, "corrupt"],
    ["pre-v1 schema", { schemaVersion: 0 }, "corrupt"],
    ["newer schema", { schemaVersion: 2 }, "newer-version"],
  ] as const)("classifies %s", (_name, input, code) => {
    expect(migrateToCurrent(input)).toEqual({ ok: false, code });
  });

  it("applies every registered migration in sequence and validates each step", () => {
    const migrations = [
      {
        from: 1,
        migrate: () => ({ schemaVersion: 2, migrated: "first" }),
        validate: (value: unknown) =>
          typeof value === "object" &&
          value !== null &&
          "schemaVersion" in value &&
          value.schemaVersion === 2,
      },
      {
        from: 2,
        migrate: () => ({ schemaVersion: 3, migrated: "second" }),
        validate: () => true,
      },
    ];

    expect(
      migrateSequentially({ schemaVersion: 1 }, 3, migrations, () => true),
    ).toEqual({
      ok: true,
      value: { schemaVersion: 3, migrated: "second" },
      migrated: true,
    });
  });

  it("fails closed for a missing migration or invalid intermediate/current shape", () => {
    expect(
      migrateSequentially({ schemaVersion: 1 }, 2, [], () => true),
    ).toEqual({ ok: false, code: "corrupt" });
    expect(
      migrateSequentially(
        { schemaVersion: 1 },
        2,
        [{ from: 1, migrate: () => ({}), validate: () => false }],
        () => true,
      ),
    ).toEqual({ ok: false, code: "corrupt" });
    expect(
      migrateSequentially(
        { schemaVersion: 1 },
        2,
        [
          {
            from: 1,
            migrate: () => ({ schemaVersion: 2 }),
            validate: () => true,
          },
        ],
        () => false,
      ),
    ).toEqual({ ok: false, code: "corrupt" });
  });
});
