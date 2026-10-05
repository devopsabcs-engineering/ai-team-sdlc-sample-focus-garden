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
      "M60 26c-15-18-29 4-13 14-20 2-13 25 3 17 1 20 24 20 19 0 17-22 2-20 15-11 0-32-16-15z",
    accent: "M60 28v27",
    leaves: ["M58 72C41 68 36 54 52 52", "M62 82c18-5 22-20 7-22"],
  },
  moonbell: {
    bloom: "M39 30Q60 12 81 30L72 56Q60 68 48 56Z",
    accent: "M48 42h24",
    leaves: ["M58 74C37 73 34 57 52 55", "M62 84c20-7 22-23 7-24"],
  },
  cloudfern: {
    bloom: "M60 58C31 49 31 26 52 32C55 13 78 16 75 36C94 34 91 59 60 58Z",
    accent: "M45 42c10-7 21 8 30 0",
    leaves: ["M59 76C39 68 35 52 53 51", "M61 85c17-7 20-21 7-25"],
  },
  sunspindle: {
    bloom:
      "M60 17l7 15 16-8-5 17 17 5-15 9 10 14-18-2-2 18-10-16-13 12 1-18-18 2 12-14-16-7 18-4-7-17 16 9z",
    accent: "M60 38a10 10 0 1 0 0 20 10 10 0 0 0 0-20",
    leaves: ["M58 76C38 71 35 57 52 54", "M62 85c19-5 23-20 8-24"],
  },
  dewstar: {
    bloom: "M60 20l8 19 21-2-16 14 8 20-21-12-21 12 8-20-16-14 21 2z",
    accent: "M60 37l5 11-5 11-5-11z",
    leaves: ["M58 77C40 72 35 57 52 53", "M62 85c18-6 22-20 8-24"],
  },
  quietbloom: {
    bloom:
      "M60 49C25 31 33 9 58 34C69 5 92 20 72 43C101 45 88 70 65 57C54 85 31 68 49 52Z",
    accent: "M60 43a7 7 0 1 0 0 14 7 7 0 0 0 0-14",
    leaves: ["M58 77C39 72 34 57 52 54", "M62 86c19-6 22-22 7-25"],
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
  svg.setAttribute("class", className);
  svg.setAttribute("aria-hidden", "true");
  const soil = path("M20 105Q60 92 100 105", "reward-plant__soil");
  const stem = path("M60 103V50", "reward-plant__stem");
  const leaves = design.leaves.map((leaf) => path(leaf, "reward-plant__leaf"));
  const bloom = path(design.bloom, "reward-plant__bloom");
  const accent = path(design.accent, "reward-plant__accent");
  svg.append(soil, stem, ...leaves, bloom, accent);
  return svg;
}
