import { buildGardenSummary, type GardenDay } from "../domain/garden";
import type { CompletedSessionV1 } from "../domain/types";
import { append, element } from "./dom";
import { createPlantArt, SPECIES_NAMES } from "./plant-art";

const VISIBLE_DENSE_PLANTS = 5;

export interface GardenViewOptions {
  readonly sessions: readonly CompletedSessionV1[];
  readonly now: Date;
}

function isSmallScreen(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 37.49rem)").matches
  );
}

function formatWeek(start: Date, endExclusive: Date): string {
  const end = new Date(endExclusive);
  end.setDate(end.getDate() - 1);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).formatRange(start, end);
}

function detailValues(
  session: CompletedSessionV1,
): readonly [string, string][] {
  return [
    [
      "Finished",
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "full",
        timeStyle: "short",
      }).format(new Date(session.completedAt)),
    ],
    ["Focus", `${session.durationSeconds / 60} minutes`],
    ["Task", session.taskLabel ?? "No task label"],
  ];
}

function populateDetails(
  container: HTMLElement,
  session: CompletedSessionV1,
): void {
  const heading = container.querySelector<HTMLElement>("[data-detail-heading]");
  const list = container.querySelector<HTMLDListElement>("[data-detail-list]");
  if (heading === null || list === null) return;
  heading.textContent = SPECIES_NAMES[session.species];
  list.replaceChildren();
  for (const [term, value] of detailValues(session)) {
    append(list, element("dt", { text: term }), element("dd", { text: value }));
  }
}

function createDetailPanel(): HTMLElement {
  const panel = element("aside", {
    className: "plant-detail",
    attributes: {
      id: "plant-detail",
      "aria-labelledby": "plant-detail-heading",
      hidden: "",
    },
  });
  append(
    panel,
    element("h2", {
      text: "Plant details",
      attributes: { id: "plant-detail-heading", "data-detail-heading": "" },
    }),
    element("dl", { attributes: { "data-detail-list": "" } }),
    element("button", {
      className: "button button--quiet",
      text: "Close details",
      attributes: { type: "button", "data-close-detail": "" },
    }),
  );
  return panel;
}

function createDetailSheet(): HTMLDialogElement {
  const sheet = element("dialog", {
    className: "plant-detail-sheet",
    attributes: { "aria-labelledby": "plant-sheet-heading" },
  });
  const header = element("div", { className: "dialog-header" });
  const heading = element("h2", {
    text: "Plant details",
    attributes: {
      id: "plant-sheet-heading",
      tabindex: "-1",
      "data-detail-heading": "",
    },
  });
  const close = element("button", {
    className: "icon-button",
    text: "Close",
    attributes: { type: "button" },
  });
  close.addEventListener("click", () => sheet.close());
  append(header, heading, close);
  append(
    sheet,
    header,
    element("dl", { attributes: { "data-detail-list": "" } }),
  );
  return sheet;
}

function plantName(session: CompletedSessionV1): string {
  const completed = new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(session.completedAt));
  return `${SPECIES_NAMES[session.species]}, ${completed}, ${session.durationSeconds / 60} focused minutes, ${session.taskLabel ?? "No task label"}`;
}

function createDay(
  day: GardenDay,
  onPlant: (session: CompletedSessionV1, trigger: HTMLButtonElement) => void,
): HTMLLIElement {
  const item = element("li", { className: "garden-day" });
  const labelText = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
  }).format(day.date);
  const label = element("span", {
    className: "garden-day__label",
    text: `${labelText}${day.isToday ? " - Today" : ""}`,
  });
  const soil = element("span", {
    className: "garden-day__soil",
    attributes: { "aria-hidden": "true" },
  });
  append(item, label, soil);

  if (day.sessions.length === 0) {
    item.append(
      element("span", {
        className: "garden-day__status",
        text: day.isFuture ? "Upcoming" : "No sessions",
      }),
    );
    return item;
  }

  const plants = element("div", {
    className: "garden-day__plants",
    attributes: {
      "aria-label": `${day.sessions.length} completed ${day.sessions.length === 1 ? "session" : "sessions"}`,
    },
  });
  day.sessions.forEach((session, index) => {
    const button = element("button", {
      className: "garden-plant",
      attributes: {
        type: "button",
        "aria-label": plantName(session),
        "aria-expanded": "false",
        "aria-controls": "plant-detail",
        ...(index >= VISIBLE_DENSE_PLANTS
          ? { hidden: "", "data-dense-plant": "" }
          : {}),
      },
    });
    button.append(createPlantArt(session.species, "garden-plant__art"));
    button.addEventListener("click", () => onPlant(session, button));
    plants.append(button);
  });
  if (day.sessions.length > VISIBLE_DENSE_PLANTS) {
    const moreCount = day.sessions.length - VISIBLE_DENSE_PLANTS;
    const more = element("button", {
      className: "garden-day__more",
      text: `+${moreCount} more`,
      attributes: { type: "button", "aria-expanded": "false" },
    });
    more.addEventListener("click", () => {
      const expanded = more.getAttribute("aria-expanded") === "true";
      more.setAttribute("aria-expanded", String(!expanded));
      more.textContent = expanded ? `+${moreCount} more` : "Show fewer";
      for (const plant of plants.querySelectorAll<HTMLElement>(
        "[data-dense-plant]",
      )) {
        plant.hidden = expanded;
      }
    });
    plants.append(more);
  }
  item.append(plants);
  return item;
}

export function createGardenView(options: GardenViewOptions): HTMLElement {
  const summary = buildGardenSummary(options.sessions, options.now);
  const section = element("section", {
    className: "garden-view",
    attributes: { "aria-labelledby": "page-title" },
  });
  const titleRow = element("div", { className: "garden-title-row" });
  const title = element("div");
  append(
    title,
    element("p", {
      className: "eyebrow",
      text: `This week / ${formatWeek(summary.weekStart, summary.nextWeekStart)}`,
    }),
    element("h1", { text: "Your garden", attributes: { id: "page-title" } }),
    element("p", {
      className: "garden-intro",
      text: "Each specimen marks finished focus, never unfinished effort.",
    }),
  );
  const stats = element("dl", { className: "garden-stats" });
  stats.append(
    createStat(
      `${summary.streakDays} ${summary.streakDays === 1 ? "day" : "days"}`,
      "current streak",
    ),
    createStat(`${summary.totalMinutes} min`, "focused all time"),
    createStat(String(summary.weekCount), "plants this week"),
  );
  append(titleRow, title, stats);

  const panel = createDetailPanel();
  const sheet = createDetailSheet();
  let activeTrigger: HTMLButtonElement | null = null;
  const showPlant = (
    session: CompletedSessionV1,
    trigger: HTMLButtonElement,
  ): void => {
    if (activeTrigger === trigger && !panel.hidden && !isSmallScreen()) {
      trigger.setAttribute("aria-expanded", "false");
      panel.hidden = true;
      activeTrigger = null;
      return;
    }
    activeTrigger?.setAttribute("aria-expanded", "false");
    activeTrigger = trigger;
    trigger.setAttribute("aria-expanded", "true");
    if (isSmallScreen()) {
      populateDetails(sheet, session);
      sheet.showModal();
      sheet.querySelector<HTMLElement>("[data-detail-heading]")?.focus();
    } else {
      populateDetails(panel, session);
      panel.hidden = false;
    }
  };
  sheet.addEventListener("close", () => {
    activeTrigger?.setAttribute("aria-expanded", "false");
    activeTrigger?.focus();
    activeTrigger = null;
  });
  panel
    .querySelector<HTMLButtonElement>("[data-close-detail]")
    ?.addEventListener("click", () => {
      panel.hidden = true;
      activeTrigger?.setAttribute("aria-expanded", "false");
      activeTrigger?.focus();
      activeTrigger = null;
    });

  const bed = element("ol", {
    className: "garden-bed",
    attributes: { "aria-label": "This week, Monday to Sunday" },
  });
  for (const day of summary.days) bed.append(createDay(day, showPlant));

  append(section, titleRow, bed, panel, sheet);
  if (options.sessions.length === 0) {
    const empty = element("div", { className: "empty-garden" });
    append(
      empty,
      element("span", {
        className: "empty-garden__seed",
        text: "◆",
        attributes: { "aria-hidden": "true" },
      }),
      element("h2", { text: "Your first plant starts here." }),
      element("p", { text: "Finish a focus session to grow one." }),
      element("a", {
        className: "button button--primary",
        text: "Start a focus session",
        attributes: { href: "#focus" },
      }),
    );
    section.append(empty);
  }
  return section;
}

function createStat(value: string, label: string): HTMLDivElement {
  const item = element("div", { className: "garden-stat" });
  append(item, element("dt", { text: label }), element("dd", { text: value }));
  return item;
}
