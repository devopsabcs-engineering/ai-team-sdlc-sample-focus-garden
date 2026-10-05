import { describe, expect, it } from "vitest";

import { selectSpecies, type RandomSource } from "../src/domain/random";
import { SPECIES_IDS } from "../src/domain/types";

function source(value: number): RandomSource {
  return { next: () => value };
}

describe("species selection", () => {
  it("maps all six equal intervals deterministically", () => {
    expect(
      SPECIES_IDS.map((_, index) => selectSpecies(source(index / 6))),
    ).toEqual(SPECIES_IDS);
    expect(selectSpecies(source(1 - Number.EPSILON))).toBe("quietbloom");
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -0.01, 1])(
    "rejects invalid source value %s",
    (value) => {
      expect(() => selectSpecies(source(value))).toThrow(RangeError);
    },
  );
});
