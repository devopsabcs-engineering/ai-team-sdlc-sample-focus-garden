import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AppController,
  type FocusCompletionDue,
} from "../src/app/app-controller";
import {
  createDefaultState,
  createLocalStateRepository,
  type StateRepository,
} from "../src/data/local-repository";
import type { Clock, IdSource } from "../src/domain/timer";
import type { RandomSource } from "../src/domain/random";
import type { FocusGardenStateV1 } from "../src/domain/types";
import type { DataExporter } from "../src/app/data-effects";
import { UUID_1, UUID_2 } from "./fixtures/schema-v1";
import { VALID_STATE_V1 } from "./fixtures/schema-v1";

const START = Date.parse("2026-10-05T13:00:00.000Z");
const UUID_3 = "11111111-1111-4111-8111-111111111111";

class FakeClock implements Clock {
  value = START;
  now(): number {
    return this.value;
  }
}

function setup(
  options: {
    state?: FocusGardenStateV1;
    repository?: StateRepository;
    onDue?: (event: FocusCompletionDue) => void;
    audioPlay?: () => Promise<void>;
    random?: RandomSource;
    exporter?: DataExporter;
  } = {},
) {
  const clock = new FakeClock();
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return values.size;
    },
    clear: () => {
      values.clear();
    },
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
  const now = () => new Date(clock.now()).toISOString();
  const repository =
    options.repository ?? createLocalStateRepository(() => storage, now);
  if (options.state !== undefined) {
    expect(repository.replace(options.state).ok).toBe(true);
  }
  const loaded = repository.load();
  const idNext = vi
    .fn<() => string>()
    .mockReturnValueOnce(UUID_2)
    .mockReturnValue(UUID_3);
  const ids: IdSource = { next: idNext };
  const randomNext = vi.fn(() => 0);
  const random: RandomSource = options.random ?? { next: randomNext };
  const audioPlay = vi.fn(
    options.audioPlay ?? (() => Promise.resolve(undefined)),
  );
  const root = document.createElement("div");
  document.body.replaceChildren(root);
  const controller = new AppController({
    root,
    documentElement: document.documentElement,
    route: "focus",
    theme: "botanical",
    repository,
    loaded,
    now,
    clock,
    ids,
    random,
    lock: { run: (callback) => Promise.resolve(callback()) },
    audio: { play: audioPlay },
    ...(options.exporter === undefined ? {} : { exporter: options.exporter }),
    ...(options.onDue === undefined
      ? {}
      : { onFocusCompletionDue: options.onDue }),
  });
  controller.render();
  return {
    audioPlay,
    clock,
    controller,
    idNext,
    randomNext,
    repository,
    root,
  };
}

function click(selector: string, root: ParentNode = document): void {
  const button = root.querySelector<HTMLButtonElement>(selector);
  if (button === null) throw new Error(`Missing button ${selector}`);
  button.click();
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function chooseImport(root: ParentNode, value: unknown): Promise<void> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const file = {
    size: bytes.byteLength,
    arrayBuffer: () =>
      Promise.resolve(
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ),
      ),
  };
  const input = root.querySelector<HTMLInputElement>("[data-import-file]");
  if (input === null) throw new Error("Missing import input.");
  Object.defineProperty(input, "files", {
    configurable: true,
    value: { item: () => file },
  });
  input.dispatchEvent(new Event("change"));
  await flushPromises();
}

describe("timer application integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    HTMLDialogElement.prototype.showModal = function showModal(
      this: HTMLDialogElement,
    ) {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close(
      this: HTMLDialogElement,
    ) {
      this.removeAttribute("open");
    };
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("classifies script route changes as programmatic even from focused main", () => {
    const { controller, root } = setup();
    const main = root.querySelector<HTMLElement>("#main-content");
    if (main === null) throw new Error("Missing main content.");
    main.focus();

    controller.navigate("garden");

    expect(
      root.querySelector("#main-content")?.getAttribute("data-route-focus"),
    ).toBe("programmatic");
  });

  it("classifies only an Enter-activated route link as keyboard navigation", () => {
    const { controller, root } = setup();
    const link = root.querySelector<HTMLAnchorElement>(
      '.primary-nav--header a[href="#garden"]',
    );
    if (link === null) throw new Error("Missing garden navigation.");
    link.addEventListener("click", (event) => {
      event.preventDefault();
    });
    link.focus();
    link.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }),
    );
    link.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, detail: 0 }),
    );

    controller.navigate("garden");

    expect(
      root.querySelector("#main-content")?.getAttribute("data-route-focus"),
    ).toBe("keyboard");
  });

  it("configures exact paired presets and persists a trimmed locked label", () => {
    const { idNext, repository, root } = setup();
    const label = root.querySelector<HTMLInputElement>("#task-label-compact");
    const preset = root.querySelector<HTMLInputElement>('input[value="50-10"]');
    if (label === null || preset === null) throw new Error("Missing setup.");

    label.value = "  Prepare launch  ";
    label.dispatchEvent(new Event("input"));
    preset.click();
    click('[data-command="timer-primary"]', root);

    const state = repository.load();
    expect(idNext).toHaveBeenCalledOnce();
    expect(state.ok && state.value.activeTimer).toMatchObject({
      id: UUID_2,
      presetId: "50-10",
      durationSeconds: 3000,
      taskLabel: "Prepare launch",
      phase: "running",
    });
    expect(
      root.querySelector<HTMLInputElement>("#task-label-wide")?.disabled,
    ).toBe(true);
    expect(
      root.querySelector<HTMLInputElement>('input[value="25-5"]')?.disabled,
    ).toBe(true);
    expect(root.querySelector("time")?.textContent).toBe("50:00");
    expect(root.textContent).toContain("Next: a 10-minute break");
  });

  it("validates Unicode label length without starting a timer", () => {
    const { idNext, repository, root } = setup();
    const label = root.querySelector<HTMLInputElement>("#task-label-compact");
    if (label === null) throw new Error("Missing label.");
    label.value = "🌱".repeat(81);
    label.dispatchEvent(new Event("input"));

    click('[data-command="timer-primary"]', root);

    expect(idNext).not.toHaveBeenCalled();
    const state = repository.load();
    expect(state.ok && state.value.activeTimer).toBeNull();
    expect(label.getAttribute("aria-invalid")).toBe("true");
    expect(root.textContent).toContain(
      "Task label must be 80 characters or fewer.",
    );
  });

  it("pauses, reloads frozen state, and resumes without counting paused time", () => {
    const { clock, controller, repository, root } = setup();
    click('[data-command="timer-primary"]', root);
    clock.value += 10_250;
    click('[data-command="timer-primary"]', root);

    expect(root.querySelector("time")?.textContent).toBe("24:50");
    expect(root.querySelector(".timer-announcer")?.textContent).toBe(
      "Focus timer paused.",
    );
    clock.value += 600_000;
    controller.reconcile();
    expect(root.querySelector("time")?.textContent).toBe("24:50");

    controller.reload();
    click('[data-command="timer-primary"]', root);
    clock.value += 10_000;
    controller.reconcile();

    expect(root.querySelector("time")?.textContent).toBe("24:40");
    const state = repository.load();
    expect(state.ok && state.value.activeTimer?.phase).toBe("running");
  });

  it("requires confirmation only after credited progress and restores ready", () => {
    const { clock, repository, root } = setup();
    click('[data-command="timer-primary"]', root);
    clock.value += 1000;
    click('[data-command="reset"]', root);

    const dialog = root.querySelector<HTMLDialogElement>(".reset-dialog");
    expect(dialog?.hasAttribute("open")).toBe(true);
    expect(repository.load()).toMatchObject({
      ok: true,
      value: { activeTimer: { phase: "running" } },
    });
    click("button:last-child", dialog ?? root);

    const state = repository.load();
    expect(state.ok && state.value.activeTimer).toBeNull();
    expect(root.querySelector("time")?.textContent).toBe("25:00");
    expect(root.textContent).toContain("Session reset.");
  });

  it("resets immediately when no elapsed time exists", () => {
    const { repository, root } = setup();
    click('[data-command="timer-primary"]', root);
    click('[data-command="reset"]', root);

    expect(root.querySelector(".reset-dialog")?.hasAttribute("open")).toBe(
      false,
    );
    const state = repository.load();
    expect(state.ok && state.value.activeTimer).toBeNull();
  });

  it("commits one reward at the exact boundary across reload and visibility", async () => {
    const onDue = vi.fn<(event: FocusCompletionDue) => void>();
    const { audioPlay, clock, controller, randomNext, repository, root } =
      setup({ onDue });
    click('[data-command="timer-primary"]', root);
    clock.value += 1_700_000;

    controller.reconcile();
    controller.reconcile();

    expect(onDue).toHaveBeenCalledOnce();
    expect(onDue).toHaveBeenCalledWith({
      timerId: UUID_2,
      completionBoundary: "2026-10-05T13:25:00.000Z",
    });
    const state = repository.load();
    expect(state.ok && state.value.sessions).toEqual([
      expect.objectContaining({
        id: UUID_2,
        species: "emberleaf",
        completedAt: "2026-10-05T13:25:00.000Z",
      }),
    ]);
    expect(state.ok && state.value.activeTimer?.phase).toBe("completed");
    expect(root.querySelector("time")?.textContent).toBe("00:00");

    await vi.waitFor(() => {
      expect(audioPlay).toHaveBeenCalledOnce();
    });
    controller.reload();
    controller.reconcile();
    const visibility = vi
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    visibility.mockRestore();

    const reloaded = repository.load();
    expect(reloaded.ok && reloaded.value.sessions).toHaveLength(1);
    expect(randomNext).toHaveBeenCalledOnce();
    expect(audioPlay).toHaveBeenCalledOnce();
  });

  it("presents one accessible reward, then runs an isolated explicit break", async () => {
    const { audioPlay, clock, controller, randomNext, repository, root } =
      setup();
    click('[data-command="timer-primary"]', root);
    clock.value += 1_500_000;

    controller.reconcile();
    controller.reconcile();
    await vi.waitFor(() => {
      expect(
        root
          .querySelector<HTMLDialogElement>(".completion-dialog")
          ?.hasAttribute("open"),
      ).toBe(true);
    });

    const dialog = root.querySelector<HTMLDialogElement>(".completion-dialog");
    expect(dialog?.getAttribute("aria-labelledby")).toBe("completion-heading");
    expect(dialog?.textContent).toContain("A new Emberleaf grew");
    expect(dialog?.textContent).toContain("25 focused minutes");
    expect(document.activeElement?.textContent).toBe("Start break");
    dialog?.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
      }),
    );
    expect(document.activeElement?.textContent).toBe("Done");
    dialog?.querySelector<HTMLButtonElement>("[autofocus]")?.focus();
    expect(randomNext).toHaveBeenCalledOnce();
    expect(audioPlay).toHaveBeenCalledOnce();

    click("button", dialog ?? root);
    await vi.waitFor(() => {
      expect(repository.load()).toMatchObject({
        ok: true,
        value: { activeTimer: { kind: "break", phase: "prepared" } },
      });
    });
    expect(root.querySelector("time")?.textContent).toBe("05:00");
    expect(
      root.querySelector('[data-command="timer-primary"]')?.textContent,
    ).toBe("Start 5-minute break");

    click('[data-command="timer-primary"]', root);
    clock.value += 300_000;
    controller.reconcile();
    controller.reconcile();

    const state = repository.load();
    expect(state.ok && state.value.sessions).toHaveLength(1);
    expect(state.ok && state.value.activeTimer).toMatchObject({
      kind: "break",
      phase: "completed",
    });
    expect(audioPlay).toHaveBeenCalledOnce();
    await vi.waitFor(() => {
      expect(
        root
          .querySelector<HTMLDialogElement>(".completion-dialog")
          ?.hasAttribute("open"),
      ).toBe(false);
    });
    expect(
      root.querySelector('[data-command="timer-primary"]')?.textContent,
    ).toBe("Start another focus");
  });

  it("returns to persisted idle on Done and retains the session and preset after reload", async () => {
    const { clock, controller, repository, root } = setup();
    root.querySelector<HTMLInputElement>('input[value="50-10"]')?.click();
    click('[data-command="timer-primary"]', root);
    clock.value += 3_000_000;
    controller.reconcile();
    await vi.waitFor(() => {
      expect(
        root
          .querySelector<HTMLDialogElement>(".completion-dialog")
          ?.hasAttribute("open"),
      ).toBe(true);
    });
    const dialog = root.querySelector<HTMLDialogElement>(".completion-dialog");
    const done = [...(dialog?.querySelectorAll("button") ?? [])].find(
      (button) => button.textContent === "Done",
    );
    done?.click();

    await vi.waitFor(() => {
      const loaded = repository.load();
      expect(loaded.ok && loaded.value.activeTimer).toBeNull();
      expect(loaded.ok && loaded.value.sessions).toHaveLength(1);
      expect(loaded.ok && loaded.value.preferences.selectedPreset).toBe(
        "50-10",
      );
      expect(document.activeElement?.getAttribute("data-command")).toBe(
        "timer-primary",
      );
    });
    expect(
      root.querySelector('[data-command="timer-primary"]')?.textContent,
    ).toBe("Start focus");

    controller.reload();
    expect(repository.load()).toMatchObject({
      ok: true,
      value: {
        preferences: { selectedPreset: "50-10" },
        activeTimer: null,
        sessions: [{ id: UUID_2 }],
      },
    });
    expect(
      root.querySelector('[data-command="timer-primary"]')?.textContent,
    ).toBe("Start focus");
  });

  it("treats Escape as Done and returns the completed timer to idle", async () => {
    const { clock, controller, repository, root } = setup();
    click('[data-command="timer-primary"]', root);
    clock.value += 1_500_000;
    controller.reconcile();
    const dialog = await vi.waitFor(() => {
      const candidate =
        root.querySelector<HTMLDialogElement>(".completion-dialog");
      expect(candidate?.hasAttribute("open")).toBe(true);
      return candidate;
    });

    dialog?.dispatchEvent(new Event("cancel", { cancelable: true }));

    await vi.waitFor(() => {
      expect(repository.load()).toMatchObject({
        ok: true,
        value: { activeTimer: null, sessions: [{ id: UUID_2 }] },
      });
      expect(dialog?.hasAttribute("open")).toBe(false);
    });
    expect(
      root.querySelector('[data-command="timer-primary"]')?.textContent,
    ).toBe("Start focus");
  });

  it("keeps the completion dialog open when Done cannot be persisted", async () => {
    let state = createDefaultState(() => "2026-10-05T13:00:00.000Z");
    let replacements = 0;
    const repository: StateRepository = {
      load: () => ({ ok: true, value: state }),
      replace: (next) => {
        replacements += 1;
        if (replacements === 3) return { ok: false, code: "quota" };
        state = next;
        return { ok: true, value: undefined };
      },
      clear: () => ({ ok: true, value: undefined }),
    };
    const { clock, controller, root } = setup({ repository });
    click('[data-command="timer-primary"]', root);
    clock.value += 1_500_000;
    controller.reconcile();
    const dialog = await vi.waitFor(() => {
      const candidate =
        root.querySelector<HTMLDialogElement>(".completion-dialog");
      expect(candidate?.hasAttribute("open")).toBe(true);
      return candidate;
    });
    const done = [...(dialog?.querySelectorAll("button") ?? [])].find(
      (button) => button.textContent === "Done",
    );

    done?.click();

    await vi.waitFor(() => {
      expect(root.textContent).toContain(
        "Completion can’t be saved on this device right now.",
      );
      expect(dialog?.hasAttribute("open")).toBe(true);
      expect(done?.disabled).toBe(false);
    });
    expect(state.activeTimer?.phase).toBe("completed");
    expect(state.sessions).toHaveLength(1);
  });

  it("recovers an unacknowledged reward without replaying audio", () => {
    const state = createDefaultState(() => "2026-10-05T13:25:00.000Z");
    const recovered: FocusGardenStateV1 = {
      ...state,
      activeTimer: {
        id: UUID_1,
        kind: "focus",
        presetId: "25-5",
        durationSeconds: 1500,
        taskLabel: null,
        phase: "completed",
        startedAt: "2026-10-05T13:00:00.000Z",
        runStartedAt: null,
        creditedBeforeRunMs: 1_500_000,
        pausedAt: null,
        completedAt: "2026-10-05T13:25:00.000Z",
        rewardAcknowledgedAt: null,
      },
      sessions: [
        {
          id: UUID_1,
          presetId: "25-5",
          durationSeconds: 1500,
          taskLabel: null,
          species: "moonbell",
          startedAt: "2026-10-05T13:00:00.000Z",
          completedAt: "2026-10-05T13:25:00.000Z",
        },
      ],
    };

    const { audioPlay, root } = setup({ state: recovered });

    expect(
      root
        .querySelector<HTMLDialogElement>(".completion-dialog")
        ?.hasAttribute("open"),
    ).toBe(true);
    expect(root.textContent).toContain("A new Moonbell grew");
    expect(audioPlay).not.toHaveBeenCalled();
  });

  it("keeps visual completion when post-commit audio fails", async () => {
    const { clock, controller, repository, root } = setup({
      audioPlay: () =>
        Promise.reject(new DOMException("blocked", "NotAllowedError")),
    });
    click('[data-command="timer-primary"]', root);
    clock.value += 1_500_000;
    controller.reconcile();

    await vi.waitFor(() => {
      expect(root.textContent).toContain(
        "Your plant was saved, but the completion sound couldn’t play.",
      );
    });
    const state = repository.load();
    expect(state.ok && state.value.sessions).toHaveLength(1);
    expect(
      root
        .querySelector<HTMLDialogElement>(".completion-dialog")
        ?.hasAttribute("open"),
    ).toBe(true);
  });

  it("persists mute and never attempts a completion chime", async () => {
    const { audioPlay, clock, controller, repository, root } = setup();
    click('[data-command="toggle-sound"]', root);
    click('[data-command="timer-primary"]', root);
    clock.value += 1_500_000;
    controller.reconcile();

    await vi.waitFor(() => {
      const loaded = repository.load();
      expect(loaded.ok && loaded.value.sessions).toHaveLength(1);
    });
    const loaded = repository.load();
    expect(loaded.ok && loaded.value.preferences.soundEnabled).toBe(false);
    expect(audioPlay).not.toHaveBeenCalled();
    expect(root.textContent).toContain("A new Emberleaf grew");
  });

  it("claims no reward and explains an atomic completion write failure", async () => {
    let state = createDefaultState(() => "2026-10-05T13:00:00.000Z");
    let replacements = 0;
    const repository: StateRepository = {
      load: () => ({ ok: true, value: state }),
      replace: (next) => {
        replacements += 1;
        if (replacements > 1) return { ok: false, code: "quota" };
        state = next;
        return { ok: true, value: undefined };
      },
      clear: () => ({ ok: true, value: undefined }),
    };
    const { audioPlay, clock, controller, root } = setup({ repository });
    click('[data-command="timer-primary"]', root);
    clock.value += 1_500_000;
    controller.reconcile();

    await vi.waitFor(() => {
      expect(root.textContent).toContain(
        "Completion can’t be saved on this device right now.",
      );
    });
    expect(state.sessions).toHaveLength(0);
    expect(state.activeTimer?.phase).toBe("running");
    expect(root.querySelector(".completion-dialog")).toBeNull();
    expect(audioPlay).not.toHaveBeenCalled();
  });

  it("reconciles a running timer restored from storage on initialization", () => {
    const state = createDefaultState(() => "2026-10-05T13:10:00.000Z");
    const running: FocusGardenStateV1 = {
      ...state,
      activeTimer: {
        id: UUID_1,
        kind: "focus",
        presetId: "25-5",
        durationSeconds: 1500,
        taskLabel: null,
        phase: "running",
        startedAt: "2026-10-05T12:50:00.000Z",
        runStartedAt: "2026-10-05T12:50:00.000Z",
        creditedBeforeRunMs: 0,
        pausedAt: null,
        completedAt: null,
        rewardAcknowledgedAt: null,
      },
    };
    const onDue = vi.fn<(event: FocusCompletionDue) => void>();
    const { root } = setup({ state: running, onDue });

    expect(root.querySelector("time")?.textContent).toBe("15:00");
    expect(onDue).not.toHaveBeenCalled();
  });

  it("reconciles immediately when the document becomes visible", () => {
    const { clock, root } = setup();
    click('[data-command="timer-primary"]', root);
    clock.value += 5000;
    const visibility = vi
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("visible");

    document.dispatchEvent(new Event("visibilitychange"));

    expect(root.querySelector("time")?.textContent).toBe("24:55");
    visibility.mockRestore();
  });

  it("announces only bounded milestones when reconciliation skips seconds", () => {
    const { clock, controller, root } = setup();
    click('[data-command="timer-primary"]', root);
    expect(root.querySelector(".timer-announcer")?.textContent).toBe(
      "Focus timer started.",
    );

    clock.value += 1_200_000;
    controller.reconcile();
    expect(root.querySelector(".timer-announcer")?.textContent).toBe(
      "5 minutes remaining.",
    );
    controller.reconcile();
    expect(root.querySelector(".timer-announcer")?.textContent).toBe(
      "5 minutes remaining.",
    );
    clock.value += 240_000;
    controller.reconcile();
    expect(root.querySelector(".timer-announcer")?.textContent).toBe(
      "1 minute remaining.",
    );
  });

  it("keeps working in memory and reports unavailable persistence", () => {
    const failure = new DOMException("blocked", "SecurityError");
    const repository: StateRepository = {
      load: () => ({ ok: false, code: "unavailable", cause: failure }),
      replace: () => ({ ok: false, code: "unavailable", cause: failure }),
      clear: () => ({ ok: false, code: "unavailable", cause: failure }),
    };
    const { root } = setup({ repository });

    click('[data-command="timer-primary"]', root);

    expect(root.querySelector("time")?.textContent).toBe("25:00");
    expect(
      root.querySelector('[data-command="timer-primary"]')?.textContent,
    ).toBe("Pause");
    expect(root.textContent).toContain(
      "Progress can’t be saved on this device right now.",
    );
  });

  it("exports the canonical document and surfaces a blocked download", () => {
    const download = vi.fn(() => false);
    const { root } = setup({ exporter: { download } });

    click("[data-open-settings]", root);
    click("[data-export]", root);

    expect(download).toHaveBeenCalledWith(
      expect.objectContaining({ schemaVersion: 1 }),
      "2026-10-05",
    );
    expect(root.textContent).toContain(
      "Your garden couldn’t be exported. Try again.",
    );
  });

  it("previews replacement and cancels import without mutation", async () => {
    const original = structuredClone(VALID_STATE_V1);
    const replacement = {
      ...VALID_STATE_V1,
      sessions: [],
      preferences: {
        ...VALID_STATE_V1.preferences,
        selectedPreset: "50-10" as const,
      },
    };
    const { repository, root } = setup({ state: original });

    click("[data-open-settings]", root);
    await chooseImport(root, replacement);

    expect(root.textContent).toContain("0 sessions (No completed sessions)");
    expect(root.textContent).toContain(
      "replace your current 1 sessions, preferences, and timer",
    );
    expect(document.activeElement?.textContent).toBe("Cancel");
    click("[data-cancel-import]", root);
    expect(repository.load()).toEqual({ ok: true, value: original });
  });

  it("atomically imports literal XSS text only after confirmation", async () => {
    const hostile = "<img src=x onerror=alert(1)>";
    const imported: FocusGardenStateV1 = {
      ...VALID_STATE_V1,
      sessions: [
        {
          ...VALID_STATE_V1.sessions[0]!,
          taskLabel: hostile,
        },
      ],
    };
    const { repository, root } = setup();

    click("[data-open-settings]", root);
    await chooseImport(root, imported);
    expect(repository.load()).toMatchObject({
      ok: true,
      value: { sessions: [] },
    });
    click("[data-confirm-import]", root);
    await flushPromises();

    const loaded = repository.load();
    expect(loaded.ok && loaded.value.sessions[0]?.taskLabel).toBe(hostile);
    expect(root.querySelector("img")).toBeNull();
    expect(root.textContent).toContain(
      "Your garden was replaced from the validated export.",
    );
  });

  it("rolls back memory and storage when import replacement fails", async () => {
    const original = structuredClone(VALID_STATE_V1);
    const replace = vi.fn(() => ({
      ok: false as const,
      code: "quota" as const,
    }));
    const repository: StateRepository = {
      load: () => ({ ok: true, value: original }),
      replace,
      clear: () => ({ ok: true, value: undefined }),
    };
    const { root } = setup({ repository });

    click("[data-open-settings]", root);
    await chooseImport(root, { ...VALID_STATE_V1, sessions: [] });
    click("[data-confirm-import]", root);
    await flushPromises();

    expect(replace).toHaveBeenCalledOnce();
    expect(repository.load()).toEqual({ ok: true, value: original });
    expect(root.textContent).toContain(
      "Your garden wasn’t replaced because browser storage is full.",
    );
    expect(root.textContent).not.toContain(
      "Your garden was replaced from the validated export.",
    );
  });

  it("recovers corrupt storage through a validated replacement", async () => {
    let recovered: FocusGardenStateV1 | null = null;
    const repository: StateRepository = {
      load: () =>
        recovered === null
          ? { ok: false, code: "corrupt" }
          : { ok: true, value: recovered },
      replace: (next) => {
        recovered = next;
        return { ok: true, value: undefined };
      },
      clear: () => ({ ok: true, value: undefined }),
    };
    const { root } = setup({ repository });

    click("[data-open-settings]", root);
    await chooseImport(root, VALID_STATE_V1);
    click("[data-confirm-import]", root);
    await flushPromises();

    expect(recovered).toMatchObject({
      schemaVersion: 1,
      sessions: [{ id: UUID_1 }],
    });
    expect(root.textContent).toContain(
      "Your garden was replaced from the validated export.",
    );
  });

  it("cancels clear, then clears named data and restores first-use state", async () => {
    const { repository, root } = setup({ state: VALID_STATE_V1 });

    click("[data-open-settings]", root);
    click("[data-clear]", root);
    expect(root.textContent).toContain(
      "1 sessions, task labels, preferences, and no active timer",
    );
    expect(document.activeElement?.textContent).toBe("Cancel");
    click("[data-cancel-clear]", root);
    expect(repository.load()).toEqual({ ok: true, value: VALID_STATE_V1 });

    click("[data-clear]", root);
    click("[data-confirm-clear]", root);
    await flushPromises();

    expect(repository.load()).toMatchObject({
      ok: true,
      value: {
        preferences: {
          selectedPreset: "25-5",
          explicitTheme: null,
          soundEnabled: true,
        },
        activeTimer: null,
        sessions: [],
      },
    });
    expect(root.textContent).toContain(
      "All local Focus Garden data was cleared.",
    );
  });

  it("does not claim clear success when storage removal fails", async () => {
    const repository: StateRepository = {
      load: () => ({ ok: true, value: VALID_STATE_V1 }),
      replace: () => ({ ok: true, value: undefined }),
      clear: () => ({ ok: false, code: "unavailable" }),
    };
    const { root } = setup({ repository });

    click("[data-open-settings]", root);
    click("[data-clear]", root);
    click("[data-confirm-clear]", root);
    await flushPromises();

    expect(repository.load()).toEqual({ ok: true, value: VALID_STATE_V1 });
    expect(root.textContent).toContain(
      "Your garden couldn’t be cleared. Your existing data is unchanged.",
    );
    expect(root.textContent).not.toContain(
      "All local Focus Garden data was cleared.",
    );
  });
});
