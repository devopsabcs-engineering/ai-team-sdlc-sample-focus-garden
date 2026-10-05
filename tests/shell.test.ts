import { beforeEach, describe, expect, it, vi } from "vitest";

import { createShell } from "../src/ui/shell";

describe("semantic application shell", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("renders Focus with landmarks, one heading, navigation, and an accessible dial", () => {
    const shell = createShell({
      route: "focus",
      theme: "botanical",
      onThemeSelect: vi.fn(),
    });
    document.body.append(shell);

    expect(document.querySelector("header")).not.toBeNull();
    expect(document.querySelector("main")).not.toBeNull();
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelector('[aria-current="page"]')?.textContent).toBe(
      "Focus",
    );
    expect(document.querySelector("time")?.getAttribute("aria-label")).toBe(
      "25 minutes remaining",
    );
    expect(document.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(document.querySelectorAll('input[value="25-5"]')).toHaveLength(2);
  });

  it("renders the neutral empty Garden state and zero-valued metrics", () => {
    const shell = createShell({
      route: "garden",
      theme: "midnight",
      onThemeSelect: vi.fn(),
    });
    document.body.append(shell);

    expect(document.querySelector("h1")?.textContent).toBe("Your garden");
    expect(document.body.textContent).toContain(
      "Your first plant starts here.",
    );
    expect(document.body.textContent).toContain("0 min");
    expect(document.body.textContent).toContain("0 days");
    expect(document.querySelectorAll(".garden-day")).toHaveLength(7);
  });

  it("skips to main content without changing the hash route", () => {
    window.location.hash = "#garden";
    document.body.append(
      createShell({
        route: "garden",
        theme: "botanical",
        onThemeSelect: vi.fn(),
      }),
    );

    document
      .querySelector<HTMLAnchorElement>(".skip-link")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(document.activeElement?.id).toBe("main-content");
    expect(window.location.hash).toBe("#garden");
  });

  it("offers exactly the three approved themes with text selections", () => {
    const onThemeSelect = vi.fn();
    document.body.append(
      createShell({ route: "focus", theme: "golden", onThemeSelect }),
    );
    const choices = document.querySelectorAll<HTMLInputElement>(
      'input[name="theme"]',
    );

    expect([...choices].map((choice) => choice.value)).toEqual([
      "botanical",
      "golden",
      "midnight",
    ]);
    expect(
      document.querySelector<HTMLInputElement>('input[value="golden"]')
        ?.checked,
    ).toBe(true);

    const midnight = document.querySelector<HTMLInputElement>(
      'input[value="midnight"]',
    );
    midnight?.dispatchEvent(new Event("change"));
    expect(onThemeSelect).toHaveBeenCalledWith("midnight");
  });

  it("surfaces a file picker failure without changing the settings flow", () => {
    document.body.append(
      createShell({
        route: "focus",
        theme: "botanical",
        onThemeSelect: vi.fn(),
      }),
    );
    const picker =
      document.querySelector<HTMLInputElement>("[data-import-file]");
    const button = document.querySelector<HTMLButtonElement>(
      "[data-import-picker]",
    );
    if (picker === null || button === null)
      throw new Error("Missing import UI.");
    picker.click = () => {
      throw new DOMException("blocked");
    };

    button.click();

    expect(document.body.textContent).toContain(
      "The file picker couldn’t be opened. Try again.",
    );
  });
});
