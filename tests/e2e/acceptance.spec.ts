import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const stateKey = "focus-garden:state";
const ids = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
  "44444444-4444-4444-8444-444444444444",
  "55555555-5555-4555-8555-555555555555",
  "66666666-6666-4666-8666-666666666666",
  "77777777-7777-4777-8777-777777777777",
] as const;
const species = [
  "emberleaf",
  "moonbell",
  "cloudfern",
  "sunspindle",
  "dewstar",
  "quietbloom",
] as const;

interface SessionFixture {
  readonly id: string;
  readonly presetId: "15-3" | "25-5" | "50-10";
  readonly durationSeconds: 900 | 1500 | 3000;
  readonly taskLabel: string | null;
  readonly species: (typeof species)[number];
  readonly startedAt: string;
  readonly completedAt: string;
}

function session(
  id: string,
  completedAt: Date,
  taskLabel: string | null,
  plant: (typeof species)[number],
  durationSeconds: 900 | 1500 | 3000 = 1500,
): SessionFixture {
  return {
    id,
    presetId:
      durationSeconds === 900
        ? "15-3"
        : durationSeconds === 3000
          ? "50-10"
          : "25-5",
    durationSeconds,
    taskLabel,
    species: plant,
    startedAt: new Date(
      completedAt.getTime() - durationSeconds * 1000,
    ).toISOString(),
    completedAt: completedAt.toISOString(),
  };
}

function state(options?: {
  sessions?: readonly SessionFixture[];
  activeTimer?: Record<string, unknown> | null;
  theme?: "botanical" | "golden" | "midnight" | null;
}) {
  return {
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    preferences: {
      selectedPreset: "25-5",
      explicitTheme: options?.theme ?? null,
      soundEnabled: false,
    },
    activeTimer: options?.activeTimer ?? null,
    sessions: options?.sessions ?? [],
  };
}

async function seed(
  page: Page,
  value: ReturnType<typeof state>,
): Promise<void> {
  await page.addInitScript(
    ([key, seeded]) => localStorage.setItem(key, JSON.stringify(seeded)),
    [stateKey, value] as const,
  );
}

async function storedState(page: Page): Promise<ReturnType<typeof state>> {
  return page.evaluate<ReturnType<typeof state>, string>((key) => {
    const raw = localStorage.getItem(key);
    if (raw === null) throw new Error("Expected persisted Focus Garden state.");
    return JSON.parse(raw) as ReturnType<typeof state>;
  }, stateKey);
}

test("runs exact focus presets, locks the trimmed label, and recovers pause on reload", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator('input[value="25-5"]:visible')).toBeChecked();
  await page.locator('input[value="50-10"]:visible').check();
  await expect(page.getByText("Next: a 10-minute break")).toBeVisible();

  await page
    .locator('input[name="task-label"]:visible')
    .fill("  Integrated acceptance  ");
  await page.getByRole("button", { name: "Start focus" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  expect((await storedState(page)).activeTimer).toMatchObject({
    durationSeconds: 3000,
    taskLabel: "Integrated acceptance",
    phase: "running",
  });
  await expect(page.locator('input[name="task-label"]:visible')).toBeDisabled();

  await page.getByRole("button", { name: "Pause" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  expect((await storedState(page)).activeTimer).toMatchObject({
    phase: "paused",
  });
  await page.getByRole("button", { name: "Resume" }).click();
  await page.waitForTimeout(50);
  await page.getByRole("button", { name: "Reset" }).click();
  const reset = page.getByRole("dialog", { name: "Reset this session?" });
  await expect(reset).toBeVisible();
  await expect(
    reset.getByRole("button", { name: "Keep focusing" }),
  ).toBeFocused();
  await reset.getByRole("button", { name: "Reset session" }).click();
  await expect(page.getByRole("button", { name: "Start focus" })).toBeVisible();
});

test("credits one completion across reload and runs a non-rewarding explicit break", async ({
  page,
}) => {
  const now = Date.now();
  await seed(
    page,
    state({
      activeTimer: {
        id: ids[0],
        kind: "focus",
        presetId: "15-3",
        durationSeconds: 900,
        taskLabel: "Finish report",
        phase: "running",
        startedAt: new Date(now - 901_000).toISOString(),
        runStartedAt: new Date(now - 901_000).toISOString(),
        creditedBeforeRunMs: 0,
        pausedAt: null,
        completedAt: null,
        rewardAcknowledgedAt: null,
      },
    }),
  );
  await page.goto("./");

  const completion = page.getByRole("dialog", { name: /A new .* grew/ });
  await expect(completion).toBeVisible();
  await expect(
    completion.getByText("15 focused minutes · Finish report"),
  ).toBeVisible();
  await expect(
    completion.getByRole("button", { name: "Start break" }),
  ).toBeFocused();
  await completion.getByRole("button", { name: "Done" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    completion.getByRole("button", { name: "Start break" }),
  ).toBeFocused();

  await page.reload();
  await expect(completion).toBeVisible();
  expect((await storedState(page)).sessions).toHaveLength(1);
  await completion.getByRole("button", { name: "Start break" }).click();
  await expect(
    page.getByRole("button", { name: "Start 3-minute break" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start 3-minute break" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  expect((await storedState(page)).sessions).toHaveLength(1);
});

test("shows weekly totals, streak, labels, dense plants, and keyboard-restored details", async ({
  page,
}) => {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sessions = species.map((plant, index) =>
    session(
      ids[index] ?? ids[0],
      new Date(today.getTime() + index * 60_000),
      index === 0 ? "Weekly label" : null,
      plant,
      index === 1 ? 3000 : 1500,
    ),
  );
  sessions.push(session(ids[6], yesterday, null, "emberleaf", 900));
  await seed(page, state({ sessions }));
  await page.goto("./#garden");

  const expectedWeekCount = today.getDay() === 1 ? 6 : 7;
  await expect(page.getByText("2 days")).toBeVisible();
  await expect(page.getByText("190 min")).toBeVisible();
  await expect(
    page.getByText(String(expectedWeekCount), { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "+1 more" })).toBeVisible();
  const labeledPlant = page.getByRole("button", {
    name: /Weekly label/,
  });
  await labeledPlant.click();
  const details = page.locator("#plant-detail");
  await expect(details).toContainText("Weekly label");
  await details.getByRole("button", { name: "Close details" }).click();
  await expect(labeledPlant).toBeFocused();
});

test("supports all themes without losing timer data and honors reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await page
    .locator('input[name="task-label"]:visible')
    .fill("Theme continuity");
  await page.getByRole("button", { name: "Settings" }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  for (const [label, id] of [
    ["Golden Hour", "golden"],
    ["Midnight Garden", "midnight"],
    ["Botanical Garden", "botanical"],
  ] as const) {
    await settings.getByLabel(label).check();
    await expect(page.locator("html")).toHaveAttribute("data-theme", id);
    const contrast = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();
    expect(contrast.violations).toEqual([]);
  }
  await settings.getByRole("button", { name: "Close" }).click();
  await expect(page.locator('input[name="task-label"]:visible')).toHaveValue(
    "Theme continuity",
  );
  await expect(page.locator(".seed-dial__progress")).toHaveCSS(
    "transition-duration",
    "0s",
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "botanical");
});

test("exports, previews and cancels import, replaces atomically, and clears only after confirmation", async ({
  page,
}) => {
  const original = session(ids[0], new Date(), "Original", "emberleaf");
  const replacement = session(ids[1], new Date(), "Imported", "moonbell");
  await seed(page, state({ sessions: [original], theme: "golden" }));
  await page.goto("./");
  await page.getByRole("button", { name: "Settings" }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^focus-garden-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const downloadPath = await download.path();
  if (downloadPath === null) throw new Error("Export download has no path.");
  // Playwright provides this isolated temporary path for the completed download.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const exported: unknown = JSON.parse(await readFile(downloadPath, "utf8"));
  expect(exported).toMatchObject({
    schemaVersion: 1,
    sessions: [{ taskLabel: "Original" }],
  });

  const importState = state({ sessions: [replacement], theme: "midnight" });
  const input = page.locator("[data-import-file]");
  await input.setInputFiles({
    name: "garden.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(importState)),
  });
  await expect(page.getByText("Replace your garden?")).toBeVisible();
  await expect(page.getByText(/1 sessions .* theme midnight/)).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  expect((await storedState(page)).sessions[0]).toMatchObject({
    taskLabel: "Original",
  });

  await input.setInputFiles({
    name: "garden.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(importState)),
  });
  await page.getByRole("button", { name: "Replace my garden" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "midnight");
  expect((await storedState(page)).sessions[0]).toMatchObject({
    taskLabel: "Imported",
  });

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Clear all data" }).click();
  await page.getByRole("button", { name: "Cancel" }).click();
  expect((await storedState(page)).sessions).toHaveLength(1);
  await page.getByRole("button", { name: "Clear all data" }).click();
  await page
    .locator("[data-confirm-clear]")
    .getByText("Clear all data")
    .click();
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), stateKey))
    .toBe(null);
  await expect(page.getByRole("button", { name: "Start focus" })).toBeVisible();
});

test("invalid import preserves existing data", async ({ page }) => {
  const original = session(ids[0], new Date(), "Keep me", "emberleaf");
  await seed(page, state({ sessions: [original] }));
  await page.goto("./");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator("[data-import-file]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":1,"sessions":['),
  });
  await expect(page.getByText("Import couldn’t be prepared")).toBeVisible();
  expect((await storedState(page)).sessions[0]).toMatchObject({
    taskLabel: "Keep me",
  });
});

test("failed import replacement preserves browser storage", async ({
  page,
}) => {
  const original = session(
    ids[0],
    new Date(),
    "Rollback original",
    "emberleaf",
  );
  const replacement = session(
    ids[1],
    new Date(),
    "Must not replace",
    "moonbell",
  );
  await seed(page, state({ sessions: [original] }));
  await page.goto("./");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator("[data-import-file]").setInputFiles({
    name: "replacement.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify(state({ sessions: [replacement], theme: "midnight" })),
    ),
  });
  await expect(page.getByText("Replace your garden?")).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(Storage.prototype, "setItem", {
      configurable: true,
      value: () => {
        throw new DOMException("full", "QuotaExceededError");
      },
    });
  });
  await page.getByRole("button", { name: "Replace my garden" }).click();

  await expect(
    page.getByText(
      "Your garden wasn’t replaced because browser storage is full.",
    ),
  ).toBeVisible();
  expect((await storedState(page)).sessions[0]).toMatchObject({
    taskLabel: "Rollback original",
  });
});

test("360px reflow, mobile detail dialog, keyboard navigation, and axe smoke pass", async ({
  page,
}) => {
  const plant = session(ids[0], new Date(), "Mobile details", "dewstar");
  await seed(page, state({ sessions: [plant] }));
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("./#garden");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page.getByRole("link", { name: "Skip to content" }).focus();
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await page.getByRole("button", { name: /Mobile details/ }).click();
  const details = page.getByRole("dialog", { name: "Dewstar" });
  await expect(details).toBeVisible();
  await expect(details.getByText("Mobile details")).toBeVisible();
  await details.getByRole("button", { name: "Close" }).click();
  await expect(
    page.getByRole("button", { name: /Mobile details/ }),
  ).toBeFocused();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    results.violations.filter(
      ({ impact }) => impact === "serious" || impact === "critical",
    ),
  ).toEqual([]);
});
