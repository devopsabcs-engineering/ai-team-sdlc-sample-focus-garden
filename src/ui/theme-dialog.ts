import type {
  ImportFile,
  ImportPreview,
  ImportResult,
} from "../data/data-transfer";
import {
  THEME_OPTIONS,
  type FocusGardenStateV1,
  type ThemeId,
} from "../domain/types";
import { append, element } from "./dom";

export type DataActionResult =
  { readonly ok: true } | { readonly ok: false; readonly code: string };

export interface ThemeDialogOptions {
  readonly selected: ThemeId;
  readonly onSelect: (theme: ThemeId) => void;
  readonly data: {
    readonly sessionCount: number;
    readonly hasActiveTimer: boolean;
    readonly onExport: () => DataActionResult;
    readonly onReadImport: (file: ImportFile) => Promise<ImportResult>;
    readonly onReplace: (
      candidate: FocusGardenStateV1,
    ) => Promise<DataActionResult>;
    readonly onClear: () => Promise<DataActionResult>;
  };
}

const IMPORT_ERRORS: Readonly<Record<string, string>> = {
  oversize: "That file is larger than 1 MiB. Choose a smaller JSON file.",
  read: "That file couldn’t be read. Choose it again or try another file.",
  encoding: "That file isn’t valid UTF-8 text.",
  malformed: "That file contains malformed JSON.",
  "unsupported-version":
    "That export uses a newer, unsupported Focus Garden version.",
  invalid:
    "That file isn’t a valid Focus Garden export. Check its dates, IDs, and data.",
};

function localDate(instant: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(instant),
  );
}

function previewText(preview: ImportPreview, currentCount: number): string {
  const range =
    preview.earliestCompletedAt === null || preview.latestCompletedAt === null
      ? "No completed sessions"
      : `${localDate(preview.earliestCompletedAt)} to ${localDate(preview.latestCompletedAt)}`;
  const timer = preview.hasActiveTimer
    ? "Includes an active timer."
    : "No active timer.";
  const sound = preview.soundEnabled ? "sound on" : "sound off";
  return `${preview.recordCount.toLocaleString()} sessions (${range}). ${timer} Preset ${preview.selectedPreset}, ${sound}, theme ${preview.theme}. This will replace your current ${currentCount.toLocaleString()} sessions, preferences, and timer.`;
}

function actionFailure(action: "import" | "clear", code: string): string {
  if (code === "quota") {
    return action === "import"
      ? "Your garden wasn’t replaced because browser storage is full."
      : "Your garden wasn’t cleared because browser storage couldn’t be updated.";
  }
  return action === "import"
    ? "Your garden couldn’t be replaced. Your existing data is unchanged."
    : "Your garden couldn’t be cleared. Your existing data is unchanged.";
}

export function createThemeDialog(
  options: ThemeDialogOptions,
): HTMLDialogElement {
  const dialog = element("dialog", {
    className: "settings-dialog",
    attributes: { "aria-labelledby": "settings-title" },
  });
  const header = element("div", { className: "dialog-header" });
  const title = element("h2", {
    text: "Settings",
    attributes: { id: "settings-title" },
  });
  const close = element("button", {
    className: "icon-button",
    text: "Close",
    attributes: { type: "button", "data-close-dialog": "" },
  });
  append(header, title, close);

  const form = element("form", { attributes: { method: "dialog" } });
  const fieldset = element("fieldset", { className: "theme-options" });
  const legend = element("legend", { className: "eyebrow", text: "Theme" });
  fieldset.append(legend);
  for (const option of THEME_OPTIONS) {
    const label = element("label", {
      className: "theme-option",
      attributes: { "data-preview-theme": option.id },
    });
    const radio = element("input", {
      attributes: {
        type: "radio",
        name: "theme",
        value: option.id,
        ...(option.id === options.selected ? { checked: "" } : {}),
      },
    });
    radio.addEventListener("change", () => {
      options.onSelect(option.id);
    });
    const check = element("span", {
      className: "theme-option__check",
      text: "✓",
      attributes: { "aria-hidden": "true" },
    });
    const name = element("span", {
      className: "theme-option__name",
      text: option.label,
    });
    const swatches = element("span", {
      className: "theme-option__swatches",
      attributes: { "aria-hidden": "true" },
    });
    swatches.append(element("i"), element("i"), element("i"));
    append(label, radio, check, name, swatches);
    fieldset.append(label);
  }
  const privacy = element("p", {
    className: "settings-privacy",
    text: "No account. No ads. No tracking. Your garden stays in this browser unless you export it.",
  });
  const dataSection = element("section", {
    className: "data-settings",
    attributes: { "aria-labelledby": "data-settings-title" },
  });
  const dataTitle = element("h3", {
    text: "Your local data",
    attributes: { id: "data-settings-title" },
  });
  const dataExplanation = element("p", {
    text: "Sessions, task labels, timer state, and preferences are stored only in this browser.",
  });
  const dataActions = element("div", { className: "button-row" });
  const exportButton = element("button", {
    className: "button button--quiet",
    text: "Export JSON",
    attributes: { type: "button", "data-export": "" },
  });
  const importButton = element("button", {
    className: "button button--quiet",
    text: "Import JSON",
    attributes: { type: "button", "data-import-picker": "" },
  });
  const fileInput = element("input", {
    className: "visually-hidden",
    attributes: {
      type: "file",
      accept: ".json,application/json",
      "data-import-file": "",
      tabindex: "-1",
    },
  });
  const clearButton = element("button", {
    className: "button button--danger",
    text: "Clear all data",
    attributes: { type: "button", "data-clear": "" },
  });
  append(dataActions, exportButton, importButton, clearButton, fileInput);

  const flow = element("section", {
    className: "data-flow",
    attributes: {
      hidden: "",
      "aria-labelledby": "data-flow-title",
    },
  });
  const flowTitle = element("h4", {
    attributes: { id: "data-flow-title", tabindex: "-1" },
  });
  const flowSummary = element("p", { className: "data-flow__summary" });
  const flowActions = element("div", { className: "button-row" });
  append(flow, flowTitle, flowSummary, flowActions);
  const feedback = element("p", {
    className: "data-feedback",
    attributes: { role: "status", "aria-live": "polite" },
  });
  append(dataSection, dataTitle, dataExplanation, dataActions, flow, feedback);
  append(form, fieldset, privacy, dataSection);
  append(dialog, header, form);

  let candidate: FocusGardenStateV1 | null = null;
  const setBusy = (busy: boolean): void => {
    importButton.disabled = busy;
    exportButton.disabled = busy;
    clearButton.disabled = busy;
  };
  const hideFlow = (): void => {
    candidate = null;
    flow.hidden = true;
    flowActions.replaceChildren();
  };
  const showError = (message: string): void => {
    hideFlow();
    flow.hidden = false;
    flowTitle.textContent = "Import couldn’t be prepared";
    flowSummary.textContent = message;
    flowTitle.focus();
  };

  exportButton.addEventListener("click", () => {
    const result = options.data.onExport();
    feedback.textContent = result.ok
      ? "Your garden export download has started."
      : "Your garden couldn’t be exported. Try again.";
  });
  importButton.addEventListener("click", () => {
    feedback.textContent = "";
    try {
      fileInput.click();
    } catch {
      feedback.textContent = "The file picker couldn’t be opened. Try again.";
    }
  });
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.item(0);
    fileInput.value = "";
    if (file === null || file === undefined) return;
    setBusy(true);
    void options.data
      .onReadImport(file)
      .then((result) => {
        if (!result.ok) {
          showError(
            IMPORT_ERRORS[result.code] ?? "That file couldn’t be imported.",
          );
          return;
        }
        candidate = result.value;
        flow.hidden = false;
        flowTitle.textContent = "Replace your garden?";
        flowSummary.textContent = previewText(
          result.preview,
          options.data.sessionCount,
        );
        const cancel = element("button", {
          className: "button button--quiet",
          text: "Cancel",
          attributes: { type: "button", "data-cancel-import": "" },
        });
        const replace = element("button", {
          className: "button button--danger",
          text: "Replace my garden",
          attributes: { type: "button", "data-confirm-import": "" },
        });
        cancel.addEventListener("click", () => {
          hideFlow();
          importButton.focus();
        });
        replace.addEventListener("click", () => {
          if (candidate === null) return;
          setBusy(true);
          const selected = candidate;
          void options.data.onReplace(selected).then((replacement) => {
            setBusy(false);
            if (!replacement.ok) {
              flowSummary.textContent = actionFailure(
                "import",
                replacement.code,
              );
              flowTitle.focus();
            }
          });
        });
        flowActions.replaceChildren(cancel, replace);
        cancel.focus();
      })
      .catch(() => {
        showError("That file couldn’t be read. Choose it again.");
      })
      .finally(() => {
        setBusy(false);
      });
  });
  clearButton.addEventListener("click", () => {
    candidate = null;
    flow.hidden = false;
    flowTitle.textContent = "Clear all local data?";
    const timerText = options.data.hasActiveTimer
      ? "your active timer"
      : "no active timer";
    flowSummary.textContent = `This removes ${options.data.sessionCount.toLocaleString()} sessions, task labels, preferences, and ${timerText}. Focus Garden will return to its first-use state.`;
    const cancel = element("button", {
      className: "button button--quiet",
      text: "Cancel",
      attributes: { type: "button", "data-cancel-clear": "" },
    });
    const confirm = element("button", {
      className: "button button--danger",
      text: "Clear all data",
      attributes: { type: "button", "data-confirm-clear": "" },
    });
    cancel.addEventListener("click", () => {
      hideFlow();
      clearButton.focus();
    });
    confirm.addEventListener("click", () => {
      setBusy(true);
      void options.data.onClear().then((result) => {
        setBusy(false);
        if (!result.ok) {
          flowSummary.textContent = actionFailure("clear", result.code);
          flowTitle.focus();
        }
      });
    });
    flowActions.replaceChildren(cancel, confirm);
    cancel.focus();
  });
  close.addEventListener("click", () => {
    dialog.close();
  });
  dialog.addEventListener("close", hideFlow);
  return dialog;
}
