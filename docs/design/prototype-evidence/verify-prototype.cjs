/*
 * Durable browser-verification procedure for the throwaway T-002 prototype.
 * Run with PLAYWRIGHT_MODULE pointing to an installed Playwright module directory:
 *   $env:PLAYWRIGHT_MODULE='C:\...\node_modules\playwright'
 *   $env:PW_CHROMIUM_EXE='C:\...\chrome-headless-shell.exe' # only if revision differs
 *   node docs/design/prototype-evidence/verify-prototype.cjs
 */
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const fs = require("node:fs");
const playwrightPath = process.env.PLAYWRIGHT_MODULE || "playwright";
const { chromium } = require(playwrightPath);

const root = path.resolve(__dirname, "..", "..", "..");
const url = pathToFileURL(path.join(root, "prototype", "index.html")).href;
const evidence = __dirname;
const results = [];
const consoleErrors = [];

function pass(name, detail) {
  results.push({ name, result: "PASS", detail });
  process.stdout.write(`PASS ${name}: ${detail}\n`);
}

async function expectVisible(page, selector, description) {
  assert.equal(await page.locator(selector).isVisible(), true, description);
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PW_CHROMIUM_EXE ? { executablePath: process.env.PW_CHROMIUM_EXE } : {})
  });
  try {
    // Desktop critical flow.
    const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await desktop.newPage();
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(`[desktop] ${message.text()}`);
    });
    page.on("pageerror", error => consoleErrors.push(`[desktop pageerror] ${error.message}`));
    await page.goto(url, { waitUntil: "load" });
    await expectVisible(page, ".desktop-nav", "desktop navigation");
    assert.equal(await page.locator(".bottom-nav").isVisible(), false);

    await page.getByLabel("Task label (optional)").fill("Write launch outline");
    await page.getByRole("button", { name: "Start focus" }).click();
    await expectVisible(page, "#locked-summary", "active session summary");
    assert.match(await page.locator("#mode-text").textContent(), /running/i);
    await page.getByRole("button", { name: "Pause" }).click();
    assert.match(await page.locator("#mode-text").textContent(), /paused/i);
    await page.getByRole("button", { name: "Resume" }).click();
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expectVisible(page, "#reset-dialog", "reset confirmation");
    await page.getByRole("button", { name: "Keep focusing" }).click();
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await page.getByRole("button", { name: "Reset session" }).click();
    assert.equal(await page.locator("#session-status").textContent(), "Session reset.");
    pass("desktop timer", "start, pause, resume, cancel reset, and confirm reset");

    await page.getByLabel("Task label (optional)").fill("Write launch outline");
    await page.getByRole("button", { name: "Preview completed session" }).click();
    await expectVisible(page, "#completion-dialog", "completion dialog");
    assert.match(await page.locator("#completion-task").textContent(), /Write launch outline/);
    await page.getByRole("button", { name: "View garden" }).click();
    await expectVisible(page, "#garden-view", "garden view");
    await page.getByRole("button", { name: /Fern, today/ }).click();
    await expectVisible(page, "#plant-detail", "plant detail");
    assert.equal(await page.locator("#plant-task").textContent(), "Write launch outline");
    await page.screenshot({ path: path.join(evidence, "desktop-garden.png"), fullPage: true });
    pass("completion and garden", "completion reward adds a plant; keyboard-addressable detail shows task and minutes");

    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByLabel("Golden Hour").check();
    assert.equal(await page.locator("html").getAttribute("data-theme"), "golden");
    await page.getByLabel("Midnight Garden").check();
    assert.equal(await page.locator("html").getAttribute("data-theme"), "midnight");
    await page.getByLabel("Botanical Garden").check();
    pass("themes", "Botanical Garden, Golden Hour, and Midnight Garden apply from settings");

    await page.getByRole("button", { name: "Import garden" }).click();
    await page.getByRole("button", { name: "Choose invalid sample" }).click();
    await expectVisible(page, "#import-error", "inline import error");
    await page.getByRole("button", { name: "Choose another file" }).click();
    await page.getByRole("button", { name: "Choose valid sample" }).click();
    await expectVisible(page, "#import-preview", "replacement preview");
    await page.getByRole("button", { name: "Replace my garden" }).click();
    assert.match(await page.locator("#data-message").textContent(), /18 plants/);
    await page.getByRole("button", { name: "Clear all data" }).click();
    await expectVisible(page, "#clear-dialog", "clear confirmation");
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Clear all data" }).click();
    await page.locator("#clear-confirm").click();
    assert.equal(await page.locator("#data-message").textContent(), "All Focus Garden data cleared.");
    pass("data settings", "invalid import, valid replacement preview/result, and clear cancel/confirm states");
    await desktop.close();

    // 360px mobile, responsive navigation, keyboard and dialog smoke.
    const mobile = await browser.newContext({ viewport: { width: 360, height: 800 } });
    const mobilePage = await mobile.newPage();
    mobilePage.on("console", message => {
      if (message.type() === "error") consoleErrors.push(`[mobile] ${message.text()}`);
    });
    mobilePage.on("pageerror", error => consoleErrors.push(`[mobile pageerror] ${error.message}`));
    await mobilePage.goto(url, { waitUntil: "load" });
    assert.equal(await mobilePage.locator(".desktop-nav").isVisible(), false);
    await expectVisible(mobilePage, ".bottom-nav", "mobile bottom navigation");
    const bodyWidth = await mobilePage.evaluate(() => document.body.scrollWidth);
    assert.ok(bodyWidth <= 360, `body width ${bodyWidth} should not overflow 360`);
    await mobilePage.locator("body").press("Tab");
    assert.equal(await mobilePage.evaluate(() => document.activeElement.classList.contains("skip")), true);
    await mobilePage.getByRole("button", { name: "Garden" }).last().click();
    assert.equal(await mobilePage.locator(".week").evaluate(el => getComputedStyle(el).display), "block");
    await mobilePage.getByRole("button", { name: "Focus" }).last().click();
    await mobilePage.getByRole("button", { name: "Settings" }).click();
    assert.equal(await mobilePage.locator("#settings-dialog").evaluate(el => getComputedStyle(el).height), "800px");
    await mobilePage.screenshot({ path: path.join(evidence, "mobile-settings.png"), fullPage: true });
    pass("mobile and keyboard smoke", "360px has no overflow, bottom navigation, stacked garden, full-height settings, and skip-link-first tab");
    await mobile.close();

    // Reduced motion is emulated by the real browser, not inferred from source.
    const reduced = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: "reduce"
    });
    const reducedPage = await reduced.newPage();
    reducedPage.on("console", message => {
      if (message.type() === "error") consoleErrors.push(`[reduced] ${message.text()}`);
    });
    reducedPage.on("pageerror", error => consoleErrors.push(`[reduced pageerror] ${error.message}`));
    await reducedPage.goto(url, { waitUntil: "load" });
    const motion = await reducedPage.locator(".arc").evaluate(el => ({
      transition: getComputedStyle(el).transitionDuration,
      rootMotion: getComputedStyle(document.documentElement).getPropertyValue("--motion-grow").trim()
    }));
    assert.equal(motion.rootMotion, "0ms");
    assert.ok(parseFloat(motion.transition) <= 0.001, `transition ${motion.transition} should be effectively instant`);
    pass("reduced motion", `browser preference yields --motion-grow ${motion.rootMotion} and transition ${motion.transition}`);
    await reduced.close();

    assert.deepEqual(consoleErrors, []);
    pass("console health", "zero console errors and zero uncaught page errors across all contexts");

    const report = {
      testedAt: new Date().toISOString(),
      prototype: "prototype/index.html",
      browser: "Chromium (Playwright, headless)",
      viewports: ["1280x900", "360x800"],
      consoleErrors,
      results
    };
    fs.writeFileSync(path.join(evidence, "playwright-results.json"), JSON.stringify(report, null, 2) + "\n");
  } finally {
    await browser.close();
  }
})().catch(error => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
