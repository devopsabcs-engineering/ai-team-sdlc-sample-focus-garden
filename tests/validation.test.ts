import { describe, expect, it } from "vitest";

import { isThemeId } from "../src/domain/types";
import {
  hasExactKeys,
  isCanonicalInstant,
  isPlainObject,
  isSafeIntegerInRange,
  isTaskLabel,
  isUuid,
} from "../src/domain/validation";
import { UUID_1 } from "./fixtures/schema-v1";

describe("shared domain invariants", () => {
  it("accepts only plain records with exact enumerable keys", () => {
    expect(isPlainObject({ value: true })).toBe(true);
    expect(isPlainObject(Object.create(null))).toBe(true);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(new Date())).toBe(false);

    expect(hasExactKeys({ one: 1, two: 2 }, ["one", "two"])).toBe(true);
    expect(hasExactKeys({ one: 1, three: 3 }, ["one", "two"])).toBe(false);
    expect(hasExactKeys({ one: 1 }, ["one", "two"])).toBe(false);
  });

  it("requires canonical UTC instants and bounded UUIDs", () => {
    expect(isCanonicalInstant("2026-10-05T14:00:00.000Z")).toBe(true);
    expect(isCanonicalInstant("not-a-date")).toBe(false);
    expect(isCanonicalInstant(123)).toBe(false);
    expect(isUuid(UUID_1)).toBe(true);
    expect(isUuid("x".repeat(65))).toBe(false);
    expect(isUuid(123)).toBe(false);
  });

  it("counts Unicode code points in trimmed task labels", () => {
    expect(isTaskLabel(null)).toBe(true);
    expect(isTaskLabel("Plant 🌱")).toBe(true);
    expect(isTaskLabel(" label")).toBe(false);
    expect(isTaskLabel("")).toBe(false);
    expect(isTaskLabel("🌱".repeat(81))).toBe(false);
    expect(isTaskLabel(1)).toBe(false);
  });

  it("accepts only finite safe integers inside inclusive bounds", () => {
    expect(isSafeIntegerInRange(0, 0, 1)).toBe(true);
    expect(isSafeIntegerInRange(1, 0, 1)).toBe(true);
    expect(isSafeIntegerInRange(-1, 0, 1)).toBe(false);
    expect(isSafeIntegerInRange(2, 0, 1)).toBe(false);
    expect(isSafeIntegerInRange(0.5, 0, 1)).toBe(false);
    expect(isSafeIntegerInRange("1", 0, 1)).toBe(false);
  });

  it("recognizes only the closed theme set", () => {
    expect(isThemeId("botanical")).toBe(true);
    expect(isThemeId("golden")).toBe(true);
    expect(isThemeId("midnight")).toBe(true);
    expect(isThemeId("blue")).toBe(false);
    expect(isThemeId(null)).toBe(false);
  });
});
