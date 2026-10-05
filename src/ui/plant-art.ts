import type { Species } from "../domain/types";

const SVG_NS = "http://www.w3.org/2000/svg";

export const SPECIES_NAMES: Readonly<Record<Species, string>> = {
  emberleaf: "Emberleaf",
  moonbell: "Moonbell",
  cloudfern: "Cloudfern",
  sunspindle: "Sunspindle",
  dewstar: "Dewstar",
  quietbloom: "Quietbloom",
};

interface PlantDesign {
  readonly bloom: string;
  readonly accent: string;
  readonly leaves: readonly string[];
}

const DESIGNS: Readonly<Record<Species, PlantDesign>> = {
  emberleaf: {
    bloom:
      "M60 12 C72 27 81 34 76 48 C73 58 66 64 60 68 C48 62 40 53 42 42 C44 31 54 27 60 12 Z",
    accent: "M60 29 C53 40 53 50 60 58 C67 50 67 40 60 29 Z",
    leaves: [
      "M58 80 C42 79 33 67 37 55 C50 56 58 65 58 80 Z",
      "M62 91 C76 88 84 77 81 65 C69 67 62 77 62 91 Z",
    ],
  },
  moonbell: {
    bloom:
      "M34 25 C46 15 74 15 86 25 L78 51 C75 64 68 70 60 70 C52 70 45 64 42 51 Z",
    accent: "M48 43 Q60 54 72 43 M60 54 V64",
    leaves: [
      "M57 83 C43 88 31 82 28 69 C41 66 53 71 57 83 Z",
      "M63 94 C76 95 87 87 88 74 C75 73 65 81 63 94 Z",
    ],
  },
  cloudfern: {
    bloom:
      "M57 70 C38 65 29 53 35 43 C39 37 47 38 52 43 C43 31 49 20 59 23 C68 26 68 36 64 44 C72 33 84 34 87 43 C91 55 77 67 57 70 Z",
    accent: "M43 53 C52 48 59 48 78 51 M57 61 C63 55 69 52 78 51",
    leaves: [
      "M57 78 C45 75 36 67 34 58 C46 57 55 64 57 78 Z",
      "M63 91 C73 88 80 80 82 69 C71 69 64 78 63 91 Z",
    ],
  },
  sunspindle: {
    bloom:
      "M60 10 L67 29 L85 19 L79 39 L99 42 L81 53 L94 69 L73 66 L70 87 L60 68 L50 87 L47 66 L26 69 L39 53 L21 42 L41 39 L35 19 L53 29 Z",
    accent: "M60 37 A14 14 0 1 1 59.9 37 Z",
    leaves: [
      "M57 86 C42 87 31 79 29 67 C43 65 54 72 57 86 Z",
      "M63 98 C78 96 87 86 86 73 C72 74 64 84 63 98 Z",
    ],
  },
  dewstar: {
    bloom:
      "M60 11 C69 27 79 37 79 49 C79 61 71 70 60 70 C49 70 41 61 41 49 C41 37 51 27 60 11 Z",
    accent:
      "M60 32 L65 43 L77 45 L68 53 L70 65 L60 59 L50 65 L52 53 L43 45 L55 43 Z",
    leaves: [
      "M56 81 C41 83 30 76 26 63 C40 60 53 67 56 81 Z",
      "M64 93 C78 93 89 85 91 72 C77 70 66 79 64 93 Z",
    ],
  },
  quietbloom: {
    bloom:
      "M60 43 C48 15 29 22 39 45 C13 40 14 64 40 63 C25 84 47 94 60 69 C73 94 95 84 80 63 C106 64 107 40 81 45 C91 22 72 15 60 43 Z",
    accent: "M60 47 A11 11 0 1 1 59.9 47 Z",
    leaves: [
      "M56 84 C41 87 29 80 26 68 C40 64 52 71 56 84 Z",
      "M64 96 C79 94 89 85 88 72 C74 73 65 82 64 96 Z",
    ],
  },
};

function path(value: string, className: string): SVGPathElement {
  const node = document.createElementNS(SVG_NS, "path");
  node.setAttribute("d", value);
  node.setAttribute("class", className);
  return node;
}

export function createPlantArt(
  species: Species,
  className = "reward-plant",
): SVGSVGElement {
  const design = DESIGNS[species];
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 120 120");
  svg.setAttribute("class", `${className} plant-art--${species}`);
  svg.setAttribute("data-species", species);
  svg.setAttribute("aria-hidden", "true");
  const soil = path("M20 105Q60 92 100 105", "reward-plant__soil");
  const stem = path("M60 103V50", "reward-plant__stem");
  const leaves = design.leaves.map((leaf) => path(leaf, "reward-plant__leaf"));
  const bloom = path(design.bloom, "reward-plant__bloom");
  const accent = path(design.accent, "reward-plant__accent");
  svg.append(soil, stem, ...leaves, bloom, accent);
  return svg;
}
