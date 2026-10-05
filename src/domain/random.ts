import { SPECIES_IDS, type Species } from "./types";

export interface RandomSource {
  next(): number;
}

export function selectSpecies(source: RandomSource): Species {
  const value = source.next();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError(
      "Random source must return a finite value from 0 up to 1.",
    );
  }
  return SPECIES_IDS[Math.floor(value * SPECIES_IDS.length)]!;
}
