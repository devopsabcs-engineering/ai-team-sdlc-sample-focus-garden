import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const base = "/ai-team-sdlc-sample-focus-garden/";
const dist = "dist";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const files = readdirSync(dist, { recursive: true }).map(String);
assert(
  !files.some((file) => file.includes("prototype")),
  "Prototype leaked into dist.",
);
assert(existsSync(join(dist, "sw.js")), "Generated service worker is missing.");

const manifestName = files.find((file) => file.endsWith(".webmanifest"));
assert(manifestName, "Web app manifest is missing.");
const manifest = JSON.parse(readFileSync(join(dist, manifestName), "utf8"));
assert(manifest.id === base, "Manifest id must use the exact repository path.");
assert(
  manifest.start_url === base,
  "Manifest start_url must use the exact repository path.",
);
assert(
  manifest.scope === base,
  "Manifest scope must use the exact repository path.",
);
assert(manifest.display === "standalone", "Manifest must be standalone.");
assert(
  manifest.icons.some(
    (icon) => icon.sizes === "192x192" && icon.purpose !== "maskable",
  ),
  "Manifest needs a standard 192px icon.",
);
assert(
  manifest.icons.some(
    (icon) => icon.sizes === "512x512" && icon.purpose === "maskable",
  ),
  "Manifest needs a maskable 512px icon.",
);

const worker = readFileSync(join(dist, "sw.js"), "utf8");
for (const asset of [
  "index.html",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "plants/fern.svg",
  "plants/wildflower.svg",
]) {
  assert(worker.includes(asset), `Precache is missing ${asset}.`);
}
assert(worker.includes("/api"), "Navigation fallback must deny API paths.");
assert(
  !worker.includes("runtimeCaching"),
  "Unexpected runtime cache configuration.",
);

const outputText = files
  .filter((file) => /\.(?:html|js|css|json|webmanifest)$/.test(file))
  .map((file) => readFileSync(join(dist, file), "utf8"))
  .join("\n");
assert(
  !outputText.includes("prototype/"),
  "Prototype source is referenced by production output.",
);

console.log("Static PWA checks passed.");
