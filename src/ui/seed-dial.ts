import { append, element } from "./dom";

export interface SeedDialModel {
  readonly durationSeconds: number;
  readonly remainingSeconds: number;
  readonly mode: string;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function durationValue(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `PT${minutes > 0 ? `${minutes}M` : ""}${remainder > 0 ? `${remainder}S` : ""}`;
}

function accessibleRemaining(seconds: number): string {
  if (seconds === 0) return "0 seconds remaining";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  const parts: string[] = [];
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  if (remainder > 0) {
    parts.push(`${remainder} second${remainder === 1 ? "" : "s"}`);
  }
  return `${parts.join(" ")} remaining`;
}

export function createSeedDial(model: SeedDialModel): HTMLElement {
  const figure = element("figure", {
    className: "seed-dial",
    attributes: { "aria-labelledby": "timer-value timer-mode" },
  });
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "seed-dial__art");
  svg.setAttribute("viewBox", "0 0 240 240");
  svg.setAttribute("aria-hidden", "true");

  const track = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle",
  );
  track.setAttribute("class", "seed-dial__track");
  track.setAttribute("cx", "120");
  track.setAttribute("cy", "120");
  track.setAttribute("r", "101");

  const progress = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle",
  );
  progress.setAttribute("class", "seed-dial__progress");
  progress.setAttribute("cx", "120");
  progress.setAttribute("cy", "120");
  progress.setAttribute("r", "101");

  const bud = document.createElementNS("http://www.w3.org/2000/svg", "path");
  bud.setAttribute("class", "seed-dial__bud");
  bud.setAttribute(
    "d",
    "M120 15c-8-12-20-8-20 4 0 11 12 17 20 23 8-6 20-12 20-23 0-12-12-16-20-4Z",
  );

  svg.append(track, progress, bud);

  const caption = element("figcaption", { className: "seed-dial__caption" });
  const time = element("time", {
    className: "seed-dial__time",
    text: formatTime(model.remainingSeconds),
    attributes: {
      id: "timer-value",
      datetime: durationValue(model.remainingSeconds),
      "aria-label": accessibleRemaining(model.remainingSeconds),
    },
  });
  const mode = element("span", {
    className: "seed-dial__mode",
    text: model.mode,
    attributes: { id: "timer-mode" },
  });
  append(caption, time, mode);
  append(figure, svg, caption);
  updateSeedDial(figure, model);
  return figure;
}

export function updateSeedDial(dial: HTMLElement, model: SeedDialModel): void {
  const time = dial.querySelector<HTMLTimeElement>(".seed-dial__time");
  const mode = dial.querySelector<HTMLElement>(".seed-dial__mode");
  const progress = dial.querySelector<SVGCircleElement>(".seed-dial__progress");
  if (time !== null) {
    time.textContent = formatTime(model.remainingSeconds);
    time.dateTime = durationValue(model.remainingSeconds);
    time.setAttribute(
      "aria-label",
      accessibleRemaining(model.remainingSeconds),
    );
  }
  if (mode !== null) mode.textContent = model.mode;
  if (progress !== null) {
    const elapsed = model.durationSeconds - model.remainingSeconds;
    const ratio =
      model.durationSeconds === 0 ? 0 : elapsed / model.durationSeconds;
    progress.style.strokeDashoffset = String(634.6 * ratio);
  }
}
