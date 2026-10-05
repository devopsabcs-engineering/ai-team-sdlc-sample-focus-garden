import type { Route, ThemeId } from "../domain/types";
import type { CompletedSessionV1 } from "../domain/types";
import type { ImportFile, ImportResult } from "../data/data-transfer";
import type { FocusGardenStateV1 } from "../domain/types";
import { createCompletionDialog } from "./completion-dialog";
import { append, element } from "./dom";
import {
  createFocusView,
  type FocusViewActions,
  type FocusViewModel,
} from "./focus-view";
import { createGardenView } from "./garden-view";
import { createThemeDialog, type DataActionResult } from "./theme-dialog";

export interface ShellOptions {
  readonly route: Route;
  readonly theme: ThemeId;
  readonly onThemeSelect: (theme: ThemeId) => void;
  readonly data?: {
    readonly sessionCount: number;
    readonly hasActiveTimer: boolean;
    readonly onExport: () => DataActionResult;
    readonly onReadImport: (file: ImportFile) => Promise<ImportResult>;
    readonly onReplace: (
      candidate: FocusGardenStateV1,
    ) => Promise<DataActionResult>;
    readonly onClear: () => Promise<DataActionResult>;
  };
  readonly focus?: {
    readonly model: FocusViewModel;
    readonly actions: FocusViewActions;
  };
  readonly garden?: {
    readonly sessions: readonly CompletedSessionV1[];
    readonly now: Date;
  };
}

function createNavigation(route: Route, modifier: string): HTMLElement {
  const nav = element("nav", {
    className: `primary-nav ${modifier}`,
    attributes: { "aria-label": "Primary navigation" },
  });
  for (const item of ["focus", "garden"] as const) {
    const link = element("a", {
      className: `primary-nav__link${route === item ? " is-active" : ""}`,
      text: item === "focus" ? "Focus" : "Garden",
      attributes: {
        href: `#${item}`,
        ...(route === item ? { "aria-current": "page" } : {}),
      },
    });
    nav.append(link);
  }
  return nav;
}

export function createShell(options: ShellOptions): HTMLElement {
  const shell = element("div", { className: "app-shell" });
  const skip = element("a", {
    className: "skip-link",
    text: "Skip to content",
    attributes: { href: "#main-content" },
  });
  const header = element("header", { className: "site-header" });
  const headerInner = element("div", { className: "site-header__inner" });
  const brand = element("a", {
    className: "brand",
    text: "Focus Garden",
    attributes: { href: "#focus", "aria-label": "Focus Garden home" },
  });
  const headerNav = createNavigation(options.route, "primary-nav--header");
  const tools = element("div", { className: "header-tools" });
  const theme = element("button", {
    className: "button button--quiet header-tool",
    text: "Theme",
    attributes: { type: "button", "data-open-settings": "" },
  });
  const settings = element("button", {
    className: "button button--quiet header-tool",
    text: "Settings",
    attributes: { type: "button", "data-open-settings": "" },
  });
  append(tools, theme, settings);
  append(headerInner, brand, headerNav, tools);
  header.append(headerInner);

  const status = element("div", {
    className: "status-region",
    attributes: {
      role: "status",
      "aria-live": "polite",
      "aria-atomic": "true",
    },
  });
  const pwaStatus = element("div", {
    className: "pwa-region",
    attributes: {
      role: "status",
      "aria-live": "polite",
      "aria-atomic": "true",
    },
  });
  const completionAnnouncer = element("div", {
    className: "visually-hidden completion-announcer",
    attributes: { role: "alert", "aria-live": "assertive" },
  });
  const main = element("main", {
    attributes: { id: "main-content", tabindex: "-1" },
  });
  skip.addEventListener("click", (event) => {
    event.preventDefault();
    main.focus();
  });
  main.append(
    options.route === "focus"
      ? createFocusView(
          options.focus?.model ?? {
            selectedPreset: "25-5",
            taskLabel: "",
            soundEnabled: true,
            timer: null,
            remainingSeconds: 1500,
            reward: null,
          },
          options.focus?.actions ?? {
            onTaskLabel: () => undefined,
            onPreset: () => undefined,
            onPrimary: () => undefined,
            onReset: () => undefined,
            onToggleSound: () => undefined,
            onCompletionAction: () => Promise.resolve(true),
          },
        )
      : createGardenView(
          options.garden ?? {
            sessions: [],
            now: new Date(),
          },
        ),
  );
  const bottomNav = createNavigation(options.route, "primary-nav--bottom");
  const dialog = createThemeDialog({
    selected: options.theme,
    onSelect: options.onThemeSelect,
    data: options.data ?? {
      sessionCount: 0,
      hasActiveTimer: false,
      onExport: () => ({ ok: false, code: "unavailable" }),
      onReadImport: () => Promise.resolve({ ok: false, code: "read" }),
      onReplace: () => Promise.resolve({ ok: false, code: "unavailable" }),
      onClear: () => Promise.resolve({ ok: false, code: "unavailable" }),
    },
  });

  for (const trigger of [theme, settings]) {
    trigger.addEventListener("click", () => {
      dialog.showModal();
      dialog.querySelector<HTMLInputElement>("input:checked")?.focus();
    });
  }

  append(
    shell,
    skip,
    header,
    pwaStatus,
    status,
    completionAnnouncer,
    main,
    bottomNav,
    dialog,
  );
  const focus = options.focus;
  if (options.route !== "focus" && focus?.model.reward) {
    shell.append(
      createCompletionDialog(
        focus.model.reward,
        focus.actions.onCompletionAction,
      ),
    );
  }
  return shell;
}
