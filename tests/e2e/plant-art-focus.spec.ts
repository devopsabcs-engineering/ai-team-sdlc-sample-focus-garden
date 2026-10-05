import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const stateKey = "focus-garden:state";
const species = [
  "emberleaf",
  "moonbell",
  "cloudfern",
  "sunspindle",
  "dewstar",
  "quietbloom",
] as const;
const themes = ["botanical", "golden", "midnight"] as const;
const speciesNames: Record<(typeof species)[number], string> = {
  emberleaf: "Emberleaf",
  moonbell: "Moonbell",
  cloudfern: "Cloudfern",
  sunspindle: "Sunspindle",
  dewstar: "Dewstar",
  quietbloom: "Quietbloom",
};

function id(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function completedSession(index: number, plant: (typeof species)[number]) {
  const completedAt = new Date();
  completedAt.setMilliseconds(0);
  const startedAt = new Date(completedAt.getTime() - 1_500_000);
  return {
    id: id(index),
    presetId: "25-5" as const,
    durationSeconds: 1500 as const,
    taskLabel: `Specimen ${index}`,
    species: plant,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
  };
}

function state(
  theme: (typeof themes)[number],
  sessions: ReturnType<typeof completedSession>[],
  reward: ReturnType<typeof completedSession> | null = null,
) {
  return {
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    preferences: {
      selectedPreset: "25-5",
      explicitTheme: theme,
      soundEnabled: false,
    },
    activeTimer:
      reward === null
        ? null
        : {
            id: reward.id,
            kind: "focus",
            presetId: "25-5",
            durationSeconds: 1500,
            taskLabel: reward.taskLabel,
            phase: "completed",
            startedAt: reward.startedAt,
            runStartedAt: null,
            creditedBeforeRunMs: 1_500_000,
            pausedAt: null,
            completedAt: reward.completedAt,
            rewardAcknowledgedAt: null,
          },
    sessions,
  };
}

async function replaceState(page: Page, value: ReturnType<typeof state>) {
  await page.evaluate(
    ([key, next]) => localStorage.setItem(key, JSON.stringify(next)),
    [stateKey, value] as const,
  );
  await page.reload();
}

async function inspectArt(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((artworks) =>
    artworks.map((art) => {
      const paths = [...art.querySelectorAll<SVGPathElement>("path")];
      const bloom = art.querySelector<SVGPathElement>(".reward-plant__bloom");
      return {
        species: (art as SVGSVGElement).dataset.species,
        bloom: bloom?.getAttribute("d"),
        fill: bloom === null ? "" : getComputedStyle(bloom).fill,
        width: (art as SVGSVGElement).getBoundingClientRect().width,
        cssWidth: Number.parseFloat(getComputedStyle(art).width),
        pathLengths: paths.map((path) => path.getTotalLength()),
      };
    }),
  );
}

test("all species have valid, large, distinct art in every theme and reward context", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("./#garden");
  const gardenSessions = Array.from({ length: 21 }, (_, index) =>
    completedSession(index + 1, species[index % species.length]!),
  );
  const gardenThemeFills = new Map(
    species.map((plant) => [plant, [] as string[]]),
  );
  const modalThemeFills = new Map(
    species.map((plant) => [plant, [] as string[]]),
  );

  for (const theme of themes) {
    await replaceState(page, state(theme, gardenSessions));
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const gardenArt = await inspectArt(page, ".garden-plant__art");
    expect(gardenArt).toHaveLength(21);
    expect(new Set(gardenArt.map(({ species: plant }) => plant))).toEqual(
      new Set(species),
    );
    expect(
      new Set(
        species.map(
          (plant) =>
            gardenArt.find(({ species: candidate }) => candidate === plant)
              ?.bloom,
        ),
      ).size,
    ).toBe(species.length);
    expect(
      new Set(
        species.map(
          (plant) =>
            gardenArt.find(({ species: candidate }) => candidate === plant)
              ?.fill,
        ),
      ).size,
    ).toBe(species.length);
    expect(gardenArt.every(({ cssWidth }) => cssWidth >= 64)).toBe(true);
    expect(
      gardenArt.every(({ pathLengths }) =>
        pathLengths.every((length) => Number.isFinite(length) && length > 0),
      ),
    ).toBe(true);
    for (const plant of species) {
      gardenThemeFills
        .get(plant)!
        .push(
          gardenArt.find(({ species: candidate }) => candidate === plant)!.fill,
        );
    }

    const contrast = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();
    expect(contrast.violations).toEqual([]);

    const modalArtBySpecies = [];
    for (const [index, plant] of species.entries()) {
      const reward = completedSession(100 + index, plant);
      await replaceState(page, state(theme, [reward], reward));
      const dialog = page.getByRole("dialog", {
        name: `A new ${speciesNames[plant]} grew`,
      });
      await expect(dialog).toBeVisible();
      const [modalArt] = await inspectArt(
        page,
        ".completion-dialog .reward-plant",
      );
      expect(modalArt?.species).toBe(plant);
      expect(modalArt?.width).toBeGreaterThanOrEqual(260);
      expect(
        modalArt?.pathLengths.every(
          (length) => Number.isFinite(length) && length > 0,
        ),
      ).toBe(true);
      const modalContrast = await new AxeBuilder({ page })
        .include(".completion-dialog")
        .withRules(["color-contrast"])
        .analyze();
      expect(modalContrast.violations).toEqual([]);
      modalArtBySpecies.push(modalArt!);
      modalThemeFills.get(plant)!.push(modalArt!.fill);
    }
    expect(new Set(modalArtBySpecies.map(({ bloom }) => bloom)).size).toBe(
      species.length,
    );
    expect(new Set(modalArtBySpecies.map(({ fill }) => fill)).size).toBe(
      species.length,
    );
  }

  for (const plant of species) {
    expect(new Set(gardenThemeFills.get(plant)).size).toBe(themes.length);
    expect(new Set(modalThemeFills.get(plant)).size).toBe(themes.length);
  }

  expect(consoleErrors).toEqual([]);
});

test("route focus hides pointer outlines while keyboard focus remains visible", async ({
  page,
}) => {
  await page.goto("./#focus");

  await page.evaluate(() => {
    location.hash = "#garden";
  });
  const programmaticMain = page.locator("#main-content");
  await expect(programmaticMain).toBeFocused();
  await expect(programmaticMain).toHaveCSS("outline-style", "none");
  await expect(programmaticMain).toHaveAttribute(
    "data-route-focus",
    "programmatic",
  );

  await page.goto("./#focus");
  await page.locator('.primary-nav--header a[href="#garden"]').click();
  const main = page.locator("#main-content");
  await expect(main).toBeFocused();
  await expect(main).toHaveAttribute("data-route-focus", "programmatic");
  await expect(main).toHaveCSS("outline-style", "none");

  await page.locator(".skip-link").focus();
  await page.keyboard.press("Enter");
  await expect(main).toBeFocused();
  await expect(main).toHaveCSS("outline-style", "solid");
  await expect(main).toHaveCSS("outline-width", "3px");

  await page.locator('.primary-nav--header a[href="#focus"]').focus();
  await page.keyboard.press("Enter");
  const nextMain = page.locator("#main-content");
  await expect(nextMain).toBeFocused();
  await expect(nextMain).toHaveAttribute("data-route-focus", "keyboard");
  await expect(nextMain).toHaveCSS("outline-style", "solid");
});
