import {
  createDefaultState,
  STATE_KEY,
  type PersistenceResult,
  type StateRepository,
} from "../data/local-repository";
import {
  decodeImportFile,
  type ImportFile,
  type ImportResult,
} from "../data/data-transfer";
import { acknowledgeReward, completeDueFocus } from "../domain/completion";
import type { RandomSource } from "../domain/random";
import {
  announcementText,
  creditedMs,
  crossedAnnouncementThreshold,
  normalizeTaskLabel,
  pauseTimer,
  prepareBreakTimer,
  reconcileTimer,
  remainingSeconds,
  resumeTimer,
  startFocusTimer,
  startPreparedTimer,
  type Clock,
  type IdSource,
  type TimerAnnouncement,
} from "../domain/timer";
import {
  PRESETS,
  type FocusGardenStateV1,
  type PersistedTimerV1,
  type PresetId,
  type Route,
  type ThemeId,
} from "../domain/types";
import {
  openCompletionDialog,
  type CompletionAction,
} from "../ui/completion-dialog";
import {
  openResetConfirmation,
  updateFocusView,
  type FocusViewActions,
  type FocusViewModel,
} from "../ui/focus-view";
import { createShell } from "../ui/shell";
import { SPECIES_NAMES } from "../ui/plant-art";
import type { DataActionResult } from "../ui/theme-dialog";
import type { CompletionAudio, ExclusiveLock } from "./effects";
import { localDateStamp, type DataExporter } from "./data-effects";
import { applyTheme, persistExplicitTheme } from "./theme";

export interface FocusCompletionDue {
  readonly timerId: string;
  readonly completionBoundary: string;
}

export class AppController {
  readonly #root: HTMLElement;
  readonly #documentElement: HTMLElement;
  readonly #repository: StateRepository;
  readonly #now: () => string;
  readonly #clock: Clock;
  readonly #ids: IdSource;
  readonly #onFocusCompletionDue: (event: FocusCompletionDue) => void;
  readonly #random: RandomSource;
  readonly #lock: ExclusiveLock;
  readonly #audio: CompletionAudio;
  readonly #exporter: DataExporter;
  #loaded: PersistenceResult<FocusGardenStateV1>;
  #state: FocusGardenStateV1;
  #route: Route;
  #theme: ThemeId;
  #taskLabel = "";
  #interval: number | null = null;
  #lastRemaining: number | null = null;
  #overwriteBlocked: boolean;
  readonly #announced = new Set<string>();
  readonly #reportedDue = new Set<string>();
  readonly #completionInFlight = new Set<string>();
  readonly #emittedCompletions = new Set<string>();

  constructor(options: {
    root: HTMLElement;
    documentElement: HTMLElement;
    route: Route;
    theme: ThemeId;
    repository: StateRepository;
    loaded: PersistenceResult<FocusGardenStateV1>;
    now: () => string;
    clock: Clock;
    ids: IdSource;
    random: RandomSource;
    lock: ExclusiveLock;
    audio: CompletionAudio;
    exporter?: DataExporter;
    onFocusCompletionDue?: (event: FocusCompletionDue) => void;
  }) {
    this.#root = options.root;
    this.#documentElement = options.documentElement;
    this.#route = options.route;
    this.#theme = options.theme;
    this.#repository = options.repository;
    this.#loaded = options.loaded;
    this.#now = options.now;
    this.#clock = options.clock;
    this.#ids = options.ids;
    this.#random = options.random;
    this.#lock = options.lock;
    this.#audio = options.audio;
    this.#exporter = options.exporter ?? { download: () => false };
    this.#onFocusCompletionDue =
      options.onFocusCompletionDue ?? (() => undefined);
    this.#state = options.loaded.ok
      ? options.loaded.value
      : createDefaultState(options.now);
    this.#overwriteBlocked =
      !options.loaded.ok &&
      (options.loaded.code === "corrupt" ||
        options.loaded.code === "newer-version");
    this.#taskLabel = this.#state.activeTimer?.taskLabel ?? "";

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") this.reconcile();
    });
    window.addEventListener("focus", () => {
      this.reconcile();
      this.#openPendingReward();
    });
    window.addEventListener("storage", (event) => {
      if (event.key === STATE_KEY) this.reload();
    });
  }

  render(): void {
    this.#root.replaceChildren(
      createShell({
        route: this.#route,
        theme: this.#theme,
        onThemeSelect: (theme) => {
          this.selectTheme(theme);
        },
        data: {
          sessionCount: this.#state.sessions.length,
          hasActiveTimer: this.#state.activeTimer !== null,
          onExport: () => this.#exportData(),
          onReadImport: (file) => this.#readImport(file),
          onReplace: (candidate) => this.#replaceImported(candidate),
          onClear: () => this.#clearData(),
        },
        focus: {
          model: this.#focusModel(),
          actions: this.#focusActions(),
        },
        garden: {
          sessions: this.#state.sessions,
          now: new Date(this.#clock.now()),
        },
      }),
    );
    this.#lastRemaining = this.#focusModel().remainingSeconds;
    if (!this.#loaded.ok) {
      this.#showPersistenceFailure(this.#loaded.code);
    }
    if (this.#interval === null) {
      this.#interval = window.setInterval(() => {
        this.reconcile();
      }, 1000);
    }
    this.reconcile();
    this.#openPendingReward();
  }

  navigate(route: Route): void {
    if (route === this.#route && this.#root.hasChildNodes()) return;
    this.#route = route;
    this.render();
    this.#root.querySelector<HTMLElement>("#main-content")?.focus();
  }

  selectTheme(theme: ThemeId): void {
    this.#theme = theme;
    applyTheme(this.#documentElement, theme);
    const saved = persistExplicitTheme(theme, {
      repository: this.#repository,
      loaded: this.#loaded,
      now: this.#now,
    });
    if (saved.ok) {
      this.#loaded = saved;
      this.#state = saved.value;
    } else {
      this.#showPersistenceFailure(saved.code);
    }
  }

  reconcile(): void {
    const timer = this.#state.activeTimer;
    if (timer === null) {
      this.#updateFocus();
      return;
    }
    const nowMs = this.#clock.now();
    const previousRemaining = this.#lastRemaining;
    const result = reconcileTimer(timer, nowMs);
    if (result.timer !== timer) {
      this.#commitState({ ...this.#state, activeTimer: result.timer });
    }
    const nextRemaining = remainingSeconds(result.timer, nowMs);
    if (previousRemaining !== null) {
      const milestone = crossedAnnouncementThreshold(
        previousRemaining,
        nextRemaining,
      );
      if (milestone !== null) this.#announce(milestone, result.timer);
    }
    this.#lastRemaining = nextRemaining;
    this.#updateFocus();

    if (result.focusCompletionDue) {
      if (!this.#reportedDue.has(result.timer.id)) {
        this.#reportedDue.add(result.timer.id);
        this.#onFocusCompletionDue({
          timerId: result.timer.id,
          completionBoundary: result.completionBoundary,
        });
      }
      void this.#completeFocus(result.timer.id);
    }
  }

  reload(): void {
    const loaded = this.#repository.load();
    if (!loaded.ok) {
      this.#loaded = loaded;
      this.#showPersistenceFailure(loaded.code);
      return;
    }
    this.#loaded = loaded;
    this.#state = loaded.value;
    this.#taskLabel = loaded.value.activeTimer?.taskLabel ?? "";
    this.#lastRemaining = null;
    this.reconcile();
  }

  #focusActions(): FocusViewActions {
    return {
      onTaskLabel: (value) => {
        this.#taskLabel = value;
        this.#updateFocus();
      },
      onPreset: (preset) => {
        this.#selectPreset(preset);
      },
      onPrimary: () => {
        this.#primaryAction();
      },
      onReset: (confirmed) => {
        this.#reset(confirmed);
      },
      onToggleSound: () => {
        this.#toggleSound();
      },
      onCompletionAction: (action) => this.#handleCompletionAction(action),
    };
  }

  #exportData(): DataActionResult {
    const downloaded = this.#exporter.download(
      this.#state,
      localDateStamp(new Date(this.#clock.now())),
    );
    return downloaded ? { ok: true } : { ok: false, code: "download" };
  }

  #readImport(file: ImportFile): Promise<ImportResult> {
    return decodeImportFile(file);
  }

  async #replaceImported(
    candidate: FocusGardenStateV1,
  ): Promise<DataActionResult> {
    const next = { ...candidate, savedAt: this.#now() };
    const result = await this.#lock.run(() => this.#repository.replace(next));
    if (!result.ok) {
      this.#showPersistenceFailure(result.code);
      return { ok: false, code: result.code };
    }
    this.#state = next;
    this.#loaded = { ok: true, value: next };
    this.#overwriteBlocked = false;
    this.#taskLabel = next.activeTimer?.taskLabel ?? "";
    this.#lastRemaining = null;
    this.#theme = next.preferences.explicitTheme ?? this.#systemDefaultTheme();
    applyTheme(this.#documentElement, this.#theme);
    this.render();
    this.#status("Your garden was replaced from the validated export.");
    return { ok: true };
  }

  async #clearData(): Promise<DataActionResult> {
    const result = await this.#lock.run(() => this.#repository.clear());
    if (!result.ok) {
      this.#showPersistenceFailure(result.code);
      return { ok: false, code: result.code };
    }
    const firstUse = createDefaultState(this.#now);
    this.#state = firstUse;
    this.#loaded = { ok: true, value: firstUse };
    this.#overwriteBlocked = false;
    this.#taskLabel = "";
    this.#lastRemaining = null;
    this.#theme = this.#systemDefaultTheme();
    applyTheme(this.#documentElement, this.#theme);
    this.render();
    this.#status("All local Focus Garden data was cleared.");
    return { ok: true };
  }

  #systemDefaultTheme(): ThemeId {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "midnight"
      : "botanical";
  }

  #focusModel(): FocusViewModel {
    const timer = this.#state.activeTimer;
    return {
      selectedPreset: this.#state.preferences.selectedPreset,
      taskLabel: this.#taskLabel,
      soundEnabled: this.#state.preferences.soundEnabled,
      timer,
      remainingSeconds:
        timer === null
          ? PRESETS[this.#state.preferences.selectedPreset].focusSeconds
          : remainingSeconds(timer, this.#clock.now()),
      reward:
        timer?.kind === "focus" &&
        timer.phase === "completed" &&
        timer.rewardAcknowledgedAt === null
          ? (this.#state.sessions.find((session) => session.id === timer.id) ??
            null)
          : null,
    };
  }

  #primaryAction(): void {
    const timer = this.#state.activeTimer;
    const nowMs = this.#clock.now();
    if (timer === null) {
      let label: string | null;
      try {
        label = normalizeTaskLabel(this.#taskLabel);
      } catch {
        this.#status("Task label must be 80 characters or fewer.");
        this.#root
          .querySelector<HTMLInputElement>('input[name="task-label"]')
          ?.focus();
        this.#updateFocus();
        return;
      }
      const started = startFocusTimer(
        this.#state.preferences.selectedPreset,
        label,
        nowMs,
        this.#ids.next(),
      );
      this.#taskLabel = label ?? "";
      this.#commitState({ ...this.#state, activeTimer: started });
      this.#lastRemaining = remainingSeconds(started, nowMs);
      this.#announce("started", started);
    } else if (timer.phase === "prepared") {
      const started = startPreparedTimer(timer, nowMs);
      this.#commitState({ ...this.#state, activeTimer: started });
      this.#lastRemaining = remainingSeconds(started, nowMs);
      this.#announce("started", started);
    } else if (timer.phase === "running") {
      const result = reconcileTimer(timer, nowMs);
      if (result.focusCompletionDue || result.completedNow) {
        this.reconcile();
        return;
      }
      const paused = pauseTimer(timer, nowMs);
      this.#commitState({ ...this.#state, activeTimer: paused });
      this.#lastRemaining = remainingSeconds(paused, nowMs);
      this.#announce("paused", paused);
    } else if (timer.phase === "paused") {
      const resumed = resumeTimer(timer, nowMs);
      this.#commitState({ ...this.#state, activeTimer: resumed });
      this.#lastRemaining = remainingSeconds(resumed, nowMs);
      this.#announce("resumed", resumed);
    } else if (timer.kind === "focus") {
      this.#prepareBreak(timer);
    } else {
      this.#commitState({ ...this.#state, activeTimer: null });
      this.#taskLabel = "";
      this.#lastRemaining = null;
      this.#status("Ready for another focus session.");
    }
    this.#updateFocus();
  }

  #reset(confirmed: boolean): void {
    const timer = this.#state.activeTimer;
    if (timer === null || timer.phase === "completed") return;
    if (creditedMs(timer, this.#clock.now()) > 0 && !confirmed) {
      const view = this.#root.querySelector<HTMLElement>(".focus-layout");
      if (view !== null) openResetConfirmation(view);
      return;
    }
    this.#reportedDue.delete(timer.id);
    this.#state = this.#withSavedAt({ ...this.#state, activeTimer: null });
    this.#persistCurrentState();
    this.#taskLabel = "";
    this.#lastRemaining = null;
    this.#status("Session reset.");
    this.#updateFocus();
  }

  #selectPreset(preset: PresetId): void {
    if (this.#state.activeTimer !== null) return;
    this.#commitState({
      ...this.#state,
      preferences: { ...this.#state.preferences, selectedPreset: preset },
    });
    this.#lastRemaining = PRESETS[preset].focusSeconds;
    this.#updateFocus();
  }

  #toggleSound(): void {
    this.#commitState({
      ...this.#state,
      preferences: {
        ...this.#state.preferences,
        soundEnabled: !this.#state.preferences.soundEnabled,
      },
    });
    this.#updateFocus();
  }

  async #completeFocus(timerId: string): Promise<void> {
    if (this.#completionInFlight.has(timerId)) return;
    this.#completionInFlight.add(timerId);
    try {
      const result = await this.#lock.run(() =>
        completeDueFocus({
          repository: this.#repository,
          timerId,
          clock: this.#clock,
          now: this.#now,
          random: this.#random,
        }),
      );
      if (result.status === "failed") {
        this.#showCompletionPersistenceFailure(result.code);
        return;
      }
      this.#state = result.state;
      this.#loaded = { ok: true, value: result.state };
      this.#lastRemaining = 0;
      if (result.status !== "committed") {
        this.#updateFocus();
        return;
      }
      this.render();
      const name = SPECIES_NAMES[result.session.species];
      const alert = this.#root.querySelector<HTMLElement>(
        ".completion-announcer",
      );
      if (alert !== null)
        alert.textContent = `Focus complete. A new ${name} grew.`;
      if (
        result.state.preferences.soundEnabled &&
        !this.#emittedCompletions.has(result.session.id)
      ) {
        this.#emittedCompletions.add(result.session.id);
        try {
          await this.#audio.play();
        } catch {
          this.#status(
            "Your plant was saved, but the completion sound couldn’t play.",
          );
        }
      }
    } catch {
      this.#status(
        "Completion couldn’t be saved. Your timer is still at zero; try again.",
      );
    } finally {
      this.#completionInFlight.delete(timerId);
    }
  }

  async #handleCompletionAction(action: CompletionAction): Promise<boolean> {
    const timer = this.#state.activeTimer;
    if (timer?.kind !== "focus") return false;
    const result = await this.#lock.run(() =>
      acknowledgeReward({
        repository: this.#repository,
        sessionId: timer.id,
        now: this.#now,
        clearTimer: action === "done",
      }),
    );
    if (!result.ok) {
      this.#showCompletionPersistenceFailure(result.code);
      return false;
    }
    this.#state = result.state;
    this.#loaded = { ok: true, value: result.state };
    if (action === "break") {
      return this.#prepareBreak(result.state.activeTimer);
    }
    if (action === "garden") {
      window.location.hash = "garden";
      return true;
    }
    this.#updateFocus();
    return true;
  }

  #prepareBreak(timer: PersistedTimerV1 | null): boolean {
    if (timer?.kind !== "focus" || timer.phase !== "completed") {
      return false;
    }
    const prepared = prepareBreakTimer(timer, this.#ids.next());
    const next = this.#withSavedAt({ ...this.#state, activeTimer: prepared });
    const saved = this.#repository.replace(next);
    if (!saved.ok) {
      this.#showCompletionPersistenceFailure(saved.code);
      return false;
    }
    this.#state = next;
    this.#loaded = { ok: true, value: next };
    this.#lastRemaining = prepared.durationSeconds;
    this.#updateFocus();
    this.#status(
      `${prepared.durationSeconds / 60}-minute break prepared. Start it when you’re ready.`,
    );
    return true;
  }

  #openPendingReward(): void {
    const dialog =
      this.#root.querySelector<HTMLDialogElement>(".completion-dialog");
    if (dialog !== null) openCompletionDialog(dialog);
  }

  #commitState(next: FocusGardenStateV1): void {
    this.#state = this.#withSavedAt(next);
    this.#persistCurrentState();
  }

  #withSavedAt(state: FocusGardenStateV1): FocusGardenStateV1 {
    return { ...state, savedAt: this.#now() };
  }

  #persistCurrentState(): void {
    if (this.#overwriteBlocked) {
      this.#showPersistenceFailure("corrupt");
      return;
    }
    const result = this.#repository.replace(this.#state);
    if (result.ok) {
      this.#loaded = { ok: true, value: this.#state };
    } else {
      this.#loaded = result;
      this.#showPersistenceFailure(result.code);
    }
  }

  #updateFocus(): void {
    const view = this.#root.querySelector<HTMLElement>(".focus-layout");
    if (view !== null) updateFocusView(view, this.#focusModel());
  }

  #announce(announcement: TimerAnnouncement, timer: PersistedTimerV1): void {
    const key = `${timer.id}:${announcement}`;
    if (this.#announced.has(key)) return;
    this.#announced.add(key);
    const region = this.#root.querySelector<HTMLElement>(".timer-announcer");
    if (region !== null) {
      region.textContent = announcementText(announcement, timer.kind);
    }
  }

  #status(message: string): void {
    const status = this.#root.querySelector<HTMLElement>(".status-region");
    if (status !== null) status.textContent = message;
  }

  #showPersistenceFailure(code: string): void {
    const message =
      code === "corrupt" || code === "newer-version"
        ? "Garden data couldn’t be read. The timer will work in this tab, but changes won’t be saved."
        : "Progress can’t be saved on this device right now. The timer will keep working in this tab.";
    this.#status(message);
  }

  #showCompletionPersistenceFailure(code: string): void {
    const message =
      code === "corrupt" || code === "newer-version"
        ? "Completion can’t be saved because the stored garden data can’t be read. Your timer remains at zero."
        : "Completion can’t be saved on this device right now. Your timer remains at zero; try again.";
    this.#status(message);
  }
}
