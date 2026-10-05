import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CompletedSessionV1, Species } from "../src/domain/types";
import { createGardenView } from "../src/ui/garden-view";

let smallScreen = false;

function session(
  id: string,
  hour: number,
  species: Species,
  taskLabel: string | null = null,
): CompletedSessionV1 {
  const completed = new Date(2026, 9, 5, hour);
  return {
    id,
    presetId: "25-5",
    durationSeconds: 1500,
    taskLabel,
    species,
    startedAt: new Date(completed.getTime() - 1_500_000).toISOString(),
    completedAt: completed.toISOString(),
  };
}

describe("weekly garden view", () => {
  beforeEach(() => {
    smallScreen = false;
    document.body.replaceChildren();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({
        matches: smallScreen,
        media: "",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    HTMLDialogElement.prototype.showModal = function showModal(
      this: HTMLDialogElement,
    ) {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close(
      this: HTMLDialogElement,
    ) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  });

  it("renders the complete neutral empty week and zero metrics", () => {
    document.body.append(
      createGardenView({ sessions: [], now: new Date(2026, 9, 5, 12) }),
    );

    expect(document.querySelectorAll(".garden-day")).toHaveLength(7);
    expect(document.body.textContent).toContain(
      "Your first plant starts here.",
    );
    expect(
      [...document.querySelectorAll(".garden-stat dd")].map(
        (node) => node.textContent,
      ),
    ).toEqual(["0 days", "0 min", "0"]);
    expect(
      document.querySelectorAll(".garden-day__status")[0]?.textContent,
    ).toBe("No sessions");
    expect(
      [...document.querySelectorAll(".garden-day__status")]
        .slice(1)
        .every((node) => node.textContent === "Upcoming"),
    ).toBe(true);
  });

  it("keeps stored plants in chronological DOM order and exposes dense days", () => {
    const species: readonly Species[] = [
      "quietbloom",
      "moonbell",
      "emberleaf",
      "dewstar",
      "cloudfern",
      "sunspindle",
      "emberleaf",
    ];
    const sessions = species
      .map((plant, index) => session(`id-${index}`, 8 + index, plant))
      .reverse();
    document.body.append(
      createGardenView({ sessions, now: new Date(2026, 9, 5, 16) }),
    );

    const plants = [
      ...document.querySelectorAll<HTMLButtonElement>(".garden-plant"),
    ];
    expect(plants).toHaveLength(7);
    expect(
      plants.map((plant) => plant.getAttribute("aria-label")?.split(",")[0]),
    ).toEqual([
      "Quietbloom",
      "Moonbell",
      "Emberleaf",
      "Dewstar",
      "Cloudfern",
      "Sunspindle",
      "Emberleaf",
    ]);
    expect(plants.slice(5).every((plant) => plant.hidden)).toBe(true);

    const more = document.querySelector<HTMLButtonElement>(".garden-day__more");
    expect(more?.textContent).toBe("+2 more");
    more?.click();
    expect(plants.every((plant) => !plant.hidden)).toBe(true);
    expect(more?.getAttribute("aria-expanded")).toBe("true");
  });

  it("opens and toggles keyboard/pointer-operable wide details", () => {
    document.body.append(
      createGardenView({
        sessions: [session("one", 9, "dewstar", null)],
        now: new Date(2026, 9, 5, 12),
      }),
    );
    const plant = document.querySelector<HTMLButtonElement>(".garden-plant");
    plant?.click();

    const detail = document.querySelector<HTMLElement>(".plant-detail");
    expect(detail?.hidden).toBe(false);
    expect(detail?.textContent).toContain("Dewstar");
    expect(detail?.textContent).toContain("25 minutes");
    expect(detail?.textContent).toContain("No task label");
    expect(plant?.getAttribute("aria-expanded")).toBe("true");

    plant?.click();
    expect(detail?.hidden).toBe(true);
    expect(plant?.getAttribute("aria-expanded")).toBe("false");
  });

  it("uses a small-screen modal sheet and restores focus on close", () => {
    smallScreen = true;
    document.body.append(
      createGardenView({
        sessions: [session("one", 9, "cloudfern", "Plan launch")],
        now: new Date(2026, 9, 5, 12),
      }),
    );
    const plant = document.querySelector<HTMLButtonElement>(".garden-plant");
    plant?.focus();
    plant?.click();

    const sheet = document.querySelector<HTMLDialogElement>(
      ".plant-detail-sheet",
    );
    expect(sheet?.hasAttribute("open")).toBe(true);
    expect(sheet?.textContent).toContain("Cloudfern");
    expect(sheet?.textContent).toContain("Plan launch");
    expect(
      document.activeElement?.getAttribute("data-detail-heading"),
    ).not.toBeNull();

    sheet?.querySelector<HTMLButtonElement>("button")?.click();
    expect(sheet?.hasAttribute("open")).toBe(false);
    expect(document.activeElement).toBe(plant);
    expect(plant?.getAttribute("aria-expanded")).toBe("false");
  });
});
