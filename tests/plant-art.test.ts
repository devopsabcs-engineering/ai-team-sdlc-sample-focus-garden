import { describe, expect, it } from "vitest";

import { SPECIES_IDS, type Species } from "../src/domain/types";
import { createPlantArt } from "../src/ui/plant-art";

describe("plant art", () => {
  it.each(SPECIES_IDS)(
    "%s has complete, non-empty SVG path data",
    (species) => {
      const art = createPlantArt(species);
      const paths = [...art.querySelectorAll("path")];

      expect(art.dataset.species).toBe(species);
      expect(art.classList.contains(`plant-art--${species}`)).toBe(true);
      expect(paths).toHaveLength(6);
      for (const node of paths) {
        expect(node.getAttribute("d")).toMatch(/^[\d\s,.ACLMQVZaclmqvz-]+$/);
        expect(node.getAttribute("d")).not.toMatch(/\b(?:NaN|undefined)\b/);
      }
    },
  );

  it("gives every species a unique silhouette", () => {
    const blooms = new Map<Species, string>();
    for (const species of SPECIES_IDS) {
      const bloom = createPlantArt(species)
        .querySelector(".reward-plant__bloom")
        ?.getAttribute("d");
      if (bloom === null || bloom === undefined) {
        throw new Error(`Missing ${species} bloom.`);
      }
      blooms.set(species, bloom);
    }

    expect(new Set(blooms.values())).toHaveLength(SPECIES_IDS.length);
  });
});
