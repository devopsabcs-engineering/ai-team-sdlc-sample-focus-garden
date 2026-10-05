import type { CompletedSessionV1 } from "../domain/types";
import { append, element } from "./dom";
import { createPlantArt, SPECIES_NAMES } from "./plant-art";

export type CompletionAction = "break" | "garden" | "done";

const returnFocus = new WeakMap<HTMLDialogElement, HTMLElement>();

export function createCompletionDialog(
  session: CompletedSessionV1,
  onAction: (action: CompletionAction) => Promise<boolean>,
): HTMLDialogElement {
  const name = SPECIES_NAMES[session.species];
  const dialog = element("dialog", {
    className: "settings-dialog completion-dialog",
    attributes: {
      "aria-labelledby": "completion-heading",
      "aria-describedby": "completion-summary",
    },
  });
  const heading = element("h2", {
    text: `A new ${name} grew`,
    attributes: { id: "completion-heading", tabindex: "-1" },
  });
  const minutes = session.durationSeconds / 60;
  const summary = element("p", {
    className: "completion-dialog__summary",
    text: `${minutes} focused minutes${session.taskLabel === null ? "" : ` · ${session.taskLabel}`}`,
    attributes: { id: "completion-summary" },
  });
  const art = element("div", { className: "completion-dialog__art" });
  art.append(createPlantArt(session.species));
  const buttons = element("div", {
    className: "button-row completion-dialog__actions",
  });
  const startBreak = element("button", {
    className: "button button--primary",
    text: "Start break",
    attributes: { type: "button", autofocus: "" },
  });
  const garden = element("button", {
    className: "button button--quiet",
    text: "View garden",
    attributes: { type: "button" },
  });
  const done = element("button", {
    className: "button button--quiet",
    text: "Done",
    attributes: { type: "button" },
  });
  const controls = [startBreak, garden, done];
  const act = async (action: CompletionAction): Promise<void> => {
    for (const control of controls) control.disabled = true;
    const canClose = await onAction(action);
    if (canClose) {
      dialog.close();
      const target = returnFocus.get(dialog);
      if (target?.isConnected) target.focus();
      return;
    }
    for (const control of controls) control.disabled = false;
    heading.focus();
  };
  startBreak.addEventListener("click", () => void act("break"));
  garden.addEventListener("click", () => void act("garden"));
  done.addEventListener("click", () => void act("done"));
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    void act("done");
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const enabled = controls.filter((control) => !control.disabled);
    const first = enabled[0];
    const last = enabled.at(-1);
    if (first === undefined || last === undefined) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  append(art, element("span", { className: "visually-hidden", text: name }));
  append(buttons, startBreak, garden, done);
  append(dialog, heading, summary, art, buttons);
  return dialog;
}

export function openCompletionDialog(dialog: HTMLDialogElement): void {
  if (dialog.open) return;
  const active = document.activeElement;
  const fallback = document.querySelector<HTMLElement>(
    '[data-command="timer-primary"]',
  );
  if (active instanceof HTMLElement && active !== document.body) {
    returnFocus.set(dialog, active);
  } else if (fallback !== null) {
    returnFocus.set(dialog, fallback);
  }
  dialog.showModal();
  dialog.querySelector<HTMLButtonElement>("[autofocus]")?.focus();
}
