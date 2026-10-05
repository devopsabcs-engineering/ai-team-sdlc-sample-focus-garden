import {
  PRESETS,
  type CompletedSessionV1,
  type PersistedTimerV1,
  type PresetId,
} from "../domain/types";
import {
  createCompletionDialog,
  type CompletionAction,
} from "./completion-dialog";
import { append, element } from "./dom";
import { createSeedDial, updateSeedDial } from "./seed-dial";

export interface FocusViewModel {
  readonly selectedPreset: PresetId;
  readonly taskLabel: string;
  readonly soundEnabled: boolean;
  readonly timer: PersistedTimerV1 | null;
  readonly remainingSeconds: number;
  readonly reward: CompletedSessionV1 | null;
}

export interface FocusViewActions {
  readonly onTaskLabel: (value: string) => void;
  readonly onPreset: (preset: PresetId) => void;
  readonly onPrimary: () => void;
  readonly onReset: (confirmed: boolean) => void;
  readonly onToggleSound: () => void;
  readonly onCompletionAction: (action: CompletionAction) => Promise<boolean>;
}

function timerMode(model: FocusViewModel): string {
  if (model.timer === null) return "Focus · ready";
  const kind = model.timer.kind === "focus" ? "Focus" : "Break";
  return `${kind} · ${model.timer.phase}`;
}

function duration(model: FocusViewModel): number {
  return (
    model.timer?.durationSeconds ?? PRESETS[model.selectedPreset].focusSeconds
  );
}

function primaryLabel(model: FocusViewModel): string {
  if (model.timer === null) return "Start focus";
  switch (model.timer.phase) {
    case "prepared":
      return model.timer.kind === "focus"
        ? "Start focus"
        : `Start ${model.timer.durationSeconds / 60}-minute break`;
    case "running":
      return "Pause";
    case "paused":
      return "Resume";
    case "completed":
      return model.timer.kind === "focus"
        ? `Start ${PRESETS[model.timer.presetId].breakSeconds / 60}-minute break`
        : "Start another focus";
  }
}

function createPreset(
  value: PresetId,
  label: string,
  groupName: string,
  model: FocusViewModel,
  actions: FocusViewActions,
): HTMLLabelElement {
  const item = element("label", { className: "preset" });
  const input = element("input", {
    attributes: {
      type: "radio",
      name: groupName,
      value,
      ...(model.selectedPreset === value ? { checked: "" } : {}),
      ...(model.timer === null ? {} : { disabled: "" }),
    },
  });
  input.addEventListener("change", () => {
    if (input.checked) actions.onPreset(value);
  });
  const mark = element("span", {
    className: "preset__mark",
    text: "✓",
    attributes: { "aria-hidden": "true" },
  });
  append(item, input, mark, element("span", { text: label }));
  return item;
}

function createSessionSetup(
  instance: "compact" | "wide",
  model: FocusViewModel,
  actions: FocusViewActions,
): HTMLElement {
  const setup = element("div", { className: "session-setup" });
  const inputId = `task-label-${instance}`;
  const countId = `task-count-${instance}`;
  const groupName = `preset-${instance}`;
  const label = element("label", {
    className: "field-label",
    text: "Task label (optional)",
    attributes: { for: inputId },
  });
  const input = element("input", {
    className: "text-input",
    attributes: {
      id: inputId,
      name: "task-label",
      type: "text",
      maxlength: "160",
      autocomplete: "off",
      placeholder: "Draft project outline",
      value: model.taskLabel,
      "aria-describedby": countId,
      ...(model.timer === null ? {} : { disabled: "" }),
    },
  });
  input.addEventListener("input", () => {
    actions.onTaskLabel(input.value);
  });
  const count = element("span", {
    className: "character-count",
    attributes: { id: countId, "aria-live": "polite" },
  });
  const fieldset = element("fieldset", { className: "preset-group" });
  const legend = element("legend", { text: "Session length" });
  append(
    fieldset,
    legend,
    createPreset("25-5", "25 focus · 5 break", groupName, model, actions),
    createPreset("50-10", "50 focus · 10 break", groupName, model, actions),
    createPreset("15-3", "15 focus · 3 break", groupName, model, actions),
  );
  append(setup, label, input, count, fieldset);
  return setup;
}

function createResetDialog(actions: FocusViewActions): HTMLDialogElement {
  const dialog = element("dialog", {
    className: "settings-dialog reset-dialog",
    attributes: { "aria-labelledby": "reset-heading" },
  });
  const heading = element("h2", {
    text: "Reset this session?",
    attributes: { id: "reset-heading", tabindex: "-1" },
  });
  const copy = element("p", { text: "Its progress won’t be saved." });
  const buttons = element("div", { className: "button-row" });
  const cancel = element("button", {
    className: "button button--quiet",
    text: "Keep focusing",
    attributes: { type: "button", autofocus: "" },
  });
  const confirm = element("button", {
    className: "button button--primary",
    text: "Reset session",
    attributes: { type: "button" },
  });
  cancel.addEventListener("click", () => {
    dialog.close();
  });
  confirm.addEventListener("click", () => {
    dialog.close();
    actions.onReset(true);
  });
  append(buttons, cancel, confirm);
  append(dialog, heading, copy, buttons);
  return dialog;
}

export function createFocusView(
  model: FocusViewModel,
  actions: FocusViewActions,
): HTMLElement {
  const view = element("section", {
    className: "focus-layout",
    attributes: { "aria-labelledby": "page-title" },
  });
  const instrument = element("div", { className: "focus-instrument" });
  const eyebrow = element("p", { className: "eyebrow", text: "Focus / today" });
  const heading = element("h1", {
    text: "What will you tend?",
    attributes: { id: "page-title" },
  });
  const compactSetup = element("div", { className: "compact-setup" });
  compactSetup.append(createSessionSetup("compact", model, actions));
  append(
    instrument,
    eyebrow,
    heading,
    compactSetup,
    createSeedDial({
      durationSeconds: duration(model),
      remainingSeconds: model.remainingSeconds,
      mode: timerMode(model),
    }),
  );

  const primary = element("button", {
    className: "button button--primary focus-instrument__action",
    text: primaryLabel(model),
    attributes: {
      type: "button",
      "data-command": "timer-primary",
    },
  });
  primary.addEventListener("click", actions.onPrimary);
  const utility = element("div", {
    className: "button-row button-row--center",
  });
  const sound = element("button", {
    className: "button button--quiet",
    text: model.soundEnabled ? "Completion sound on" : "Completion sound off",
    attributes: {
      type: "button",
      "aria-pressed": String(model.soundEnabled),
      "data-command": "toggle-sound",
    },
  });
  sound.addEventListener("click", actions.onToggleSound);
  const reset = element("button", {
    className: "button button--quiet",
    text: "Reset",
    attributes: {
      type: "button",
      "data-command": "reset",
      ...(model.timer === null || model.timer.phase === "completed"
        ? { disabled: "" }
        : {}),
    },
  });
  const resetDialog = createResetDialog(actions);
  reset.addEventListener("click", () => {
    actions.onReset(false);
  });
  append(utility, sound, reset);
  const announcer = element("div", {
    className: "visually-hidden timer-announcer",
    attributes: {
      role: "status",
      "aria-live": "polite",
      "aria-atomic": "true",
    },
  });
  const privacy = element("p", {
    className: "privacy-note",
    text: "Your garden stays in this browser unless you export it.",
  });
  append(instrument, primary, utility, announcer, privacy, resetDialog);
  if (model.reward !== null) {
    instrument.append(
      createCompletionDialog(model.reward, actions.onCompletionAction),
    );
  }

  const preparation = element("aside", {
    className: "session-panel",
    attributes: { "aria-labelledby": "prepare-heading" },
  });
  append(
    preparation,
    element("p", { className: "eyebrow", text: "Prepare this session" }),
    element("h2", {
      className: "session-panel__heading",
      text: "Set your focus",
      attributes: { id: "prepare-heading" },
    }),
    createSessionSetup("wide", model, actions),
  );
  const next = element("p", {
    className: "next-session",
    text: `Next: a ${PRESETS[model.selectedPreset].breakSeconds / 60}-minute break`,
  });
  preparation.append(next);
  append(view, instrument, preparation);
  return view;
}

export function updateFocusView(
  view: HTMLElement,
  model: FocusViewModel,
): void {
  const locked = model.timer !== null;
  for (const input of view.querySelectorAll<HTMLInputElement>(
    'input[name="task-label"]',
  )) {
    if (input.value !== model.taskLabel) input.value = model.taskLabel;
    input.disabled = locked;
    const count = input.nextElementSibling;
    const length = [...model.taskLabel].length;
    if (count instanceof HTMLElement) {
      count.textContent = length >= 64 ? `${length} of 80 characters` : "";
    }
    input.setAttribute("aria-invalid", String(length > 80));
  }
  for (const radio of view.querySelectorAll<HTMLInputElement>(
    'input[type="radio"]',
  )) {
    radio.checked = radio.value === model.selectedPreset;
    radio.disabled = locked;
  }
  const dial = view.querySelector<HTMLElement>(".seed-dial");
  if (dial !== null) {
    updateSeedDial(dial, {
      durationSeconds: duration(model),
      remainingSeconds: model.remainingSeconds,
      mode: timerMode(model),
    });
  }
  const primary = view.querySelector<HTMLButtonElement>(
    '[data-command="timer-primary"]',
  );
  if (primary !== null) {
    primary.textContent = primaryLabel(model);
    primary.disabled = false;
  }
  const reset = view.querySelector<HTMLButtonElement>('[data-command="reset"]');
  if (reset !== null) {
    reset.disabled = model.timer === null || model.timer.phase === "completed";
  }
  const sound = view.querySelector<HTMLButtonElement>(
    '[data-command="toggle-sound"]',
  );
  if (sound !== null) {
    sound.textContent = model.soundEnabled
      ? "Completion sound on"
      : "Completion sound off";
    sound.setAttribute("aria-pressed", String(model.soundEnabled));
  }
  const next = view.querySelector<HTMLElement>(".next-session");
  if (next !== null) {
    next.textContent = `Next: a ${PRESETS[model.selectedPreset].breakSeconds / 60}-minute break`;
  }
}

export function openResetConfirmation(view: HTMLElement): void {
  const dialog = view.querySelector<HTMLDialogElement>(".reset-dialog");
  if (dialog === null) return;
  dialog.showModal();
  dialog.querySelector<HTMLButtonElement>("[autofocus]")?.focus();
}
