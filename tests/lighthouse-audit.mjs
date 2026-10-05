import { mkdirSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const url = "http://127.0.0.1:4173/ai-team-sdlc-sample-focus-garden/";
const reports = "evidence/lighthouse";
const chromePort = 9222;
const chromePath = process.env.CHROME_PATH ?? chromium.executablePath();

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`${command} failed (${code}).\n${output}`));
    });
  });
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

mkdirSync(reports, { recursive: true });
const server = spawn(process.execPath, ["tests/preview-server.mjs"], {
  stdio: ["ignore", "pipe", "pipe"],
});
let chrome;

try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Preview server did not start.")),
      15_000,
    );
    server.once("error", reject);
    server.stdout.on("data", (chunk) => {
      if (String(chunk).includes("Exact-base preview:")) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });

  chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--no-sandbox",
      `--remote-debugging-port=${chromePort}`,
      `--user-data-dir=${resolve(reports, `chrome-profile-${Date.now()}`)}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  let chromeError = "";
  chrome.stderr.on("data", (chunk) => {
    chromeError += String(chunk);
  });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(
        `http://127.0.0.1:${chromePort}/json/version`,
      );
      if (response.ok) break;
    } catch {
      if (attempt === 99)
        throw new Error(`Lighthouse Chrome did not start.\n${chromeError}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const results = [];
  for (let runNumber = 1; runNumber <= 3; runNumber += 1) {
    const outputPath = `${reports}/run-${runNumber}.json`;
    await run(process.execPath, [
      "node_modules/lighthouse/cli/index.js",
      url,
      "--quiet",
      `--port=${chromePort}`,
      "--output=json",
      `--output-path=${outputPath}`,
      "--form-factor=mobile",
      "--throttling-method=simulate",
      "--screen-emulation.mobile=true",
      "--screen-emulation.width=360",
      "--screen-emulation.height=800",
      "--screen-emulation.deviceScaleFactor=2",
      "--only-categories=performance,best-practices",
    ]);
    results.push(JSON.parse(readFileSync(outputPath, "utf8")));
  }

  const performance = results.map(
    (result) => result.categories.performance.score,
  );
  const fcp = results.map(
    (result) => result.audits["first-contentful-paint"].numericValue,
  );
  const scriptBytes = results.map((result) => {
    const items = result.audits["resource-summary"].details.items;
    return (
      items.find((item) => item.resourceType === "script")?.transferSize ?? 0
    );
  });
  const totalBytes = results.map((result) => {
    const items = result.audits["resource-summary"].details.items;
    return (
      items.find((item) => item.resourceType === "total")?.transferSize ?? 0
    );
  });
  const consoleErrors = results.flatMap(
    (result) => result.audits["errors-in-console"].details?.items ?? [],
  );

  if (median(performance) < 0.9)
    throw new Error("Median Lighthouse performance score is below 0.90.");
  if (median(fcp) > 2000)
    throw new Error(
      "Median throttled first contentful paint exceeds 2 seconds.",
    );
  if (Math.max(...scriptBytes) > 153_600)
    throw new Error("Compressed first-party script exceeds 150 KiB.");
  if (Math.max(...totalBytes) > 307_200)
    throw new Error("Compressed initial transfer exceeds 300 KiB.");
  if (consoleErrors.length > 0)
    throw new Error("Lighthouse observed browser console errors.");

  console.log(
    `Lighthouse passed: median performance ${median(performance).toFixed(2)}, median FCP ${Math.round(median(fcp))} ms.`,
  );
} finally {
  chrome?.kill();
  server.kill();
}
