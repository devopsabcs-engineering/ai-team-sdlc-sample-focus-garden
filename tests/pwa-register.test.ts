import { beforeEach, describe, expect, it, vi } from "vitest";

import { startPwa } from "../src/pwa/register";

function setup(): HTMLElement {
  const root = document.createElement("div");
  const region = document.createElement("div");
  region.className = "pwa-region";
  root.append(region);
  document.body.replaceChildren(root);
  return root;
}

describe("PWA lifecycle UI", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { controller: null },
    });
  });

  it("claims offline readiness only after successful precaching", () => {
    const root = setup();
    let ready = (): void => undefined;
    startPwa(root, (options) => {
      ready = options.onOfflineReady;
      return () => Promise.resolve();
    });

    expect(root.textContent).not.toContain("Offline ready");
    ready();
    expect(root.textContent).toContain("Offline ready");

    Object.defineProperty(navigator, "onLine", { value: false });
    window.dispatchEvent(new Event("offline"));
    expect(root.textContent).toContain(
      "Offline — Focus Garden is ready to use.",
    );
  });

  it("waits for explicit user action before applying an update", () => {
    const root = setup();
    let needsRefresh = (): void => undefined;
    const update = vi.fn(() => Promise.resolve());
    startPwa(root, (options) => {
      needsRefresh = options.onNeedRefresh;
      return update;
    });

    needsRefresh();
    expect(root.textContent).toContain("Update available");
    expect(update).not.toHaveBeenCalled();

    root.querySelector<HTMLButtonElement>("button")?.click();
    expect(update).toHaveBeenCalledWith(true);
  });

  it("keeps the online app usable when registration fails", () => {
    const root = setup();
    startPwa(root, (options) => {
      options.onRegisterError(new Error("blocked"));
      return () => Promise.resolve();
    });

    expect(root.textContent).toContain(
      "Offline setup is unavailable. Focus Garden still works while you’re online.",
    );
    expect(root.textContent).not.toContain("Offline ready");
  });

  it("restores lifecycle status after the application shell rerenders", async () => {
    const root = setup();
    startPwa(root, (options) => {
      options.onOfflineReady();
      return () => Promise.resolve();
    });
    const replacement = document.createElement("div");
    replacement.className = "pwa-region";

    root.replaceChildren(replacement);
    await Promise.resolve();

    expect(root.textContent).toContain("Offline ready");
  });
});
