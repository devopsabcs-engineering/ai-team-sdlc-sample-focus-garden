import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const basePath = "/ai-team-sdlc-sample-focus-garden/";

async function waitForOfflineReady(page: Page): Promise<void> {
  await page.goto("./");
  await expect(page.getByText("Offline ready", { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

test("first online load supports an offline reload and core timer flow", async ({
  context,
  page,
}) => {
  await waitForOfflineReady(page);
  await context.setOffline(true);
  await page.reload();

  await expect(
    page.getByText("Offline — Focus Garden is ready to use."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start focus" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
});

test("all runtime requests remain same-origin and inside the repository path", async ({
  page,
}) => {
  const requests: { url: string; body: string | null }[] = [];
  page.on("request", (request) =>
    requests.push({
      url: request.url(),
      body: request.postData(),
    }),
  );

  await waitForOfflineReady(page);
  await page
    .locator('input[name="task-label"]:visible')
    .fill("private-test-label");
  await page.getByRole("button", { name: "Start focus" }).click();

  expect(requests.length).toBeGreaterThan(0);
  for (const request of requests) {
    const url = new URL(request.url);
    expect(url.origin).toBe("http://127.0.0.1:4173");
    expect(url.pathname.startsWith(basePath)).toBe(true);
    expect(request.url).not.toContain("private-test-label");
    expect(request.body ?? "").not.toContain("private-test-label");
  }
});

test("manifest and controlling worker are installable at the exact subpath", async ({
  page,
}) => {
  await waitForOfflineReady(page);
  const installability = await page.evaluate(async () => {
    const manifestLink = document.querySelector<HTMLLinkElement>(
      'link[rel="manifest"]',
    );
    const registration = await navigator.serviceWorker.ready;
    const manifestText = await fetch(manifestLink?.href ?? "").then(
      (response) => response.text(),
    );
    return {
      href: manifestLink?.href,
      manifestText,
      scope: registration.scope,
      controlled: navigator.serviceWorker.controller !== null,
    };
  });
  const manifest: unknown = JSON.parse(installability.manifestText);
  expect(installability.href).toContain(`${basePath}manifest.webmanifest`);
  expect(manifest).toMatchObject({
    id: basePath,
    start_url: basePath,
    scope: basePath,
    display: "standalone",
  });
  expect(installability.scope).toBe(`http://127.0.0.1:4173${basePath}`);
  expect(installability.controlled).toBe(true);
});

test("a waiting version requires explicit update action", async ({ page }) => {
  await waitForOfflineReady(page);

  await page.evaluate(async (scope) => {
    await navigator.serviceWorker.register(`${scope}update-sw.js?version=2`, {
      scope,
    });
  }, basePath);

  await expect(page.getByText("Update available", { exact: true })).toBeVisible(
    {
      timeout: 15_000,
    },
  );
  await expect(page.getByRole("button", { name: "Update now" })).toBeVisible();
  await page.waitForTimeout(250);
  await expect(
    page.getByText("Update available", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Update now" }).click();
  await expect(
    page.getByRole("heading", { name: "What will you tend?" }),
  ).toBeVisible();
});

test("registration failure preserves the online core experience", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.serviceWorker, "register", {
      configurable: true,
      value: () => Promise.reject(new Error("test registration failure")),
    });
  });
  await page.goto("./");

  await expect(
    page.getByText(
      "Offline setup is unavailable. Focus Garden still works while you’re online.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Start focus" })).toBeEnabled();
  await expect(page.getByText("Offline ready", { exact: true })).toHaveCount(0);
});

test("@a11y production shell has no serious or critical axe violations", async ({
  page,
}) => {
  await page.goto("./");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  const blocking = results.violations.filter(
    ({ impact }) => impact === "serious" || impact === "critical",
  );
  expect(blocking).toEqual([]);
});
