# Focus Garden v1 technical specification

**Task:** T-004  
**Run:** `2026-10-05-focus-garden`  
**Status:** Implementation-ready  
**Inputs:** `specs/idea.md`, approved design artifacts, corrected
`docs/product/focus-garden-v1-prd.md`, and T-003 `spec-review` evidence  
**Production target:** `https://devopsabcs-engineering.github.io/ai-team-sdlc-sample-focus-garden/`

## 1. Architecture summary

Focus Garden is a static, single-page, local-first application built with Vite and strict
TypeScript. It uses browser DOM APIs and small view/controller modules rather than a UI framework.
One versioned localStorage document is the system of record. Domain logic is pure TypeScript and
does not import DOM, storage, audio, clock, randomness, or network APIs; those capabilities enter
through typed ports. This makes timer reconciliation, streaks, migration, and import validation
deterministic under Vitest.

The production implementation must be new work under `src/`. Nothing under `prototype/` may be
imported, copied into the build, or treated as production code or assets.

### Runtime boundaries

```text
DOM views/components
       │ commands / view models
application controllers ─────── audio, download, online/install adapters
       │
pure domain modules ─────────── Clock, IdSource, RandomSource ports
       │
repository + schema codec ───── localStorage (one canonical document)
       │
service worker ──────────────── same-origin immutable application assets only
```

There is no backend, API, telemetry, remote font, remote image, CDN, account, sync, notification,
background-sync, or user-data network path. Internal navigation uses `#focus` and `#garden`, keeping
every reload on the one Pages `index.html` without a rewrite service.

## 2. Toolchain and build contract

Use the current supported Node LTS at implementation time and pin it in `.nvmrc` and CI. Required
direct development dependencies are Vite, TypeScript, Vitest, Playwright, ESLint, Prettier,
`vite-plugin-pwa`/Workbox, axe-core Playwright integration, and Lighthouse CI. Keep runtime
dependencies at zero unless an implementation review records a concrete need.

`tsconfig.json` enables `strict`, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `useUnknownInCatchVariables`, and
`noFallthroughCasesInSwitch`. Production code has no `any`; decoded JSON begins as `unknown`.

```ts
// vite.config.ts
export default defineConfig({
  base: "/ai-team-sdlc-sample-focus-garden/",
  build: { target: "es2022", sourcemap: true },
  // VitePWA configuration follows §12.
});
```

The exact public base is **`/ai-team-sdlc-sample-focus-garden/`**, including both slashes. Use
`import.meta.env.BASE_URL` for the manifest, icons, service-worker registration, and any generated
asset URL. No source path begins with `/assets` or assumes origin-root hosting. CI must also serve
`dist` beneath that exact prefix; a root-only preview is not sufficient release evidence.

Recommended scripts:

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint . --max-warnings=0",
  "format:check": "prettier --check .",
  "test": "vitest run --coverage",
  "test:e2e": "playwright test",
  "test:a11y": "playwright test --grep @a11y",
  "test:perf": "lhci autorun",
  "audit": "npm audit --audit-level=high"
}
```

## 3. Module and file boundaries

```text
src/
  main.ts                         composition root only
  app/
    app-controller.ts            initialize, command dispatch, render scheduling
    router.ts                    #focus/#garden parsing; unknown -> #focus
    view-model.ts                domain-to-display projections
  domain/
    types.ts                     branded IDs, presets, themes, species
    timer.ts                     reducer, elapsed/remaining/reconcile functions
    completion.ts                once-only completion transaction plan
    garden.ts                    week, totals, ordering, plant detail projections
    streak.ts                    local-calendar streak algorithm
    random.ts                    equal species selection
    validation.ts                domain invariants shared by storage/import
  data/
    schema.ts                    persisted and export DTOs; current version
    codec.ts                     unknown -> canonical DTO validation
    migrations.ts                ordered, pure schema migrations
    local-repository.ts          single-key read/replace/clear transaction boundary
    import-export.ts             file limits, preview, download DTO
  platform/
    clock.ts                     SystemClock adapter
    ids.ts                       crypto.randomUUID adapter
    random.ts                    crypto-backed RandomSource adapter
    audio.ts                     lazy same-origin chime playback
    lifecycle.ts                 visibility/focus/online/storage event adapters
    install.ts                   beforeinstallprompt capability adapter
  ui/
    shell.ts                     landmarks, skip link, navigation, status regions
    focus-view.ts                setup, dial, controls, completion state
    garden-view.ts               week grid/list, summary, plant disclosures
    settings-dialog.ts           themes, sound, import/export/clear/install
    completion-dialog.ts         modal behavior and focus lifecycle
    dialog.ts                    native-dialog wrapper/fallback contract
    plant-art.ts                 original, decorative inline SVG renderers
    dom.ts                       safe text/attribute helpers; no HTML string sink
  styles/
    tokens.css                   shared scales and semantic theme variables
    base.css                     reset, landmarks, focus, forced colors
    layout.css                   compact/medium/wide contracts
    components.css               stateful components
  pwa/
    register.ts                  registration/update state and offline-ready status
public/
  icons/                         reviewed, original maskable and standard icons
  audio/completion-chime.*       reviewed, original same-origin asset
tests/
  unit/                          pure domain/data tests
  fixtures/                      schema and migration fixtures
  e2e/                           Playwright flows and accessibility
```

Rules:

* `domain/` imports no module outside `domain/` and no browser globals.
* `data/` may import domain types/validation, but domain never imports data.
* `ui/` receives view models and emits typed commands; it does not write storage or calculate time.
* Only `main.ts` constructs adapters and the controller. Only `local-repository.ts` accesses
  localStorage. Only `audio.ts` uses Web Audio/`HTMLAudioElement`.
* Every user string is assigned through `textContent`; do not use `innerHTML`,
  `insertAdjacentHTML`, or dynamic code execution.

## 4. Domain types and persistence schema

### 4.1 Closed sets

```ts
type PresetId = "25-5" | "50-10" | "15-3";
type TimerKind = "focus" | "break";
type TimerPhase = "prepared" | "running" | "paused" | "completed";
type ThemeId = "botanical" | "golden" | "midnight";
type Species =
  | "emberleaf" | "moonbell" | "cloudfern"
  | "sunspindle" | "dewstar" | "quietbloom";

const PRESETS = {
  "25-5": { focusSeconds: 1500, breakSeconds: 300 },
  "50-10": { focusSeconds: 3000, breakSeconds: 600 },
  "15-3": { focusSeconds: 900, breakSeconds: 180 }
} as const;
```

Species display names are Emberleaf, Moonbell, Cloudfern, Sunspindle, Dewstar, and Quietbloom.
Persistence stores stable lowercase IDs, never localized/display strings.

### 4.2 Canonical version 1 document

The only user-data key is `focus-garden:state`. A single document makes replacement a single
`Storage.setItem` operation rather than a partially written collection of keys.

```ts
interface FocusGardenStateV1 {
  schemaVersion: 1;
  savedAt: string; // valid ISO-8601 UTC instant
  preferences: {
    selectedPreset: PresetId;
    explicitTheme: ThemeId | null; // null means first-launch system choice
    soundEnabled: boolean;
  };
  activeTimer: PersistedTimerV1 | null;
  sessions: CompletedSessionV1[];
}

interface PersistedTimerV1 {
  id: string;                     // UUID, max 64 chars
  kind: TimerKind;
  presetId: PresetId;
  durationSeconds: 180 | 300 | 600 | 900 | 1500 | 3000;
  taskLabel: string | null;       // trimmed, 1..80 chars or null; break always null
  phase: TimerPhase;
  startedAt: string | null;       // set on first start
  runStartedAt: string | null;    // set only while running
  creditedBeforeRunMs: number;    // integer 0..durationMs
  pausedAt: string | null;        // set only while paused
  completedAt: string | null;     // exact calculated boundary when completed
  rewardAcknowledgedAt: string | null; // focus only; null until completion dialog closes
}

interface CompletedSessionV1 {
  id: string;                     // equals originating focus timer ID; unique
  presetId: PresetId;
  durationSeconds: 900 | 1500 | 3000;
  taskLabel: string | null;
  species: Species;
  startedAt: string;
  completedAt: string;            // exact boundary; UTC instant
}
```

Invariant checks include: plain objects only; exact allowed keys; finite safe integers; valid
closed-set values; task labels trimmed and limited to 80 Unicode code points; parseable canonical
instants; `completedAt >= startedAt`; focus duration matches its preset; break duration matches its
preset; unique session IDs; timer phase/nullable-field combinations; no completed session in the
future by more than a documented five-minute clock-skew tolerance during import; and no more than
10,000 sessions. Imported object prototypes and unknown properties are discarded by constructing a
fresh canonical object field by field. They are never spread or deep-merged.

`savedAt` is metadata and is not used in domain calculations. Session instants remain UTC; local
week/day grouping is recalculated in the user's current time zone when rendered.

### 4.3 Initialization, corruption, and migration

Missing state creates the in-memory default: 25/5, sound on, no explicit theme, no timer, and no
sessions. Before first paint, choose Midnight when
`matchMedia("(prefers-color-scheme: dark)")` matches, otherwise Botanical; do not persist that
implicit choice until the user explicitly changes theme.

Read pipeline:

1. Read the one key once and retain its raw value until decoding succeeds.
2. Parse as JSON into `unknown`; reject non-object documents.
3. Read only an integer `schemaVersion`.
4. Reject a version greater than `CURRENT_SCHEMA_VERSION` without rewriting it.
5. Apply each registered pure migration `n -> n + 1`, validating after every step.
6. Decode the current shape into a newly constructed canonical object.
7. Only after all steps pass may the migrated current document replace the old value.

v1 is the first production schema, so there is no invented legacy migration. The migration registry
is empty at launch but is mandatory infrastructure. Every future schema change must add a frozen
old-version type, fixture, pure migration, validation tests, and an ADR. Migration or write failure
leaves the original raw value untouched and enters an in-memory safe mode with the PRD corruption
message. Never silently reset corrupt or newer data.

Repository methods return typed results rather than throwing into UI code:

```ts
type PersistenceResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: "unavailable" | "quota" | "corrupt" | "newer-version"; cause?: unknown };

interface StateRepository {
  load(): PersistenceResult<FocusGardenStateV1>;
  replace(next: FocusGardenStateV1): PersistenceResult<void>;
  clear(): PersistenceResult<void>;
}
```

## 5. Timer state machine

All transitions are reducer commands carrying epoch milliseconds from an injected clock. Tests
control that clock; production uses `Date.now()`. Interval ticks request a render/reconcile; they do
not add elapsed time.

```text
no active timer
  └─ PREPARE_FOCUS ─> focus.prepared
focus.prepared ─ START ─> focus.running ⇄ PAUSE/RESUME ⇄ focus.paused
focus.running ─ RECONCILE(at boundary) ─> focus.completed
focus.running|paused ─ CONFIRM_RESET ─> no active timer
focus.completed ─ START_BREAK ─> break.prepared
focus.completed ─ DONE ─> no active timer
break.prepared ─ START ─> break.running ⇄ PAUSE/RESUME ⇄ break.paused
break.running ─ RECONCILE(at boundary) ─> break.completed
break.running|paused ─ CONFIRM_RESET ─> no active timer
break.completed ─ PREPARE_FOCUS ─> focus.prepared
```

Changing preset/label is allowed only with no active timer or a prepared focus. A prepared break
inherits the completed focus's paired preset and never auto-starts. Reset confirmation is required
only after credited elapsed time is greater than zero. A paused timer can remain paused indefinitely.

```ts
function creditedMs(timer: PersistedTimerV1, nowMs: number): number {
  const runningDelta =
    timer.phase === "running" && timer.runStartedAt
      ? Math.max(0, nowMs - Date.parse(timer.runStartedAt))
      : 0;
  return Math.min(timer.durationSeconds * 1000, timer.creditedBeforeRunMs + runningDelta);
}
```

Pause stores `creditedBeforeRunMs = creditedMs(timer, now)`, clears `runStartedAt`, and sets
`pausedAt`. Resume clears `pausedAt`, sets `runStartedAt = now`, and does not alter credited time.
Remaining display is `ceil((durationMs - creditedMs) / 1000)`, clamped to `[0, durationSeconds]`.
The accessible timer name is derived from that value. A backward wall-clock change contributes zero
negative time; v1 intentionally does not detect cheating.

Completion boundary is
`Date.parse(runStartedAt) + (durationMs - creditedBeforeRunMs)`, not the delayed reconciliation
time. Reconcile on initialization, each visual tick, `visibilitychange` to visible, window focus,
and relevant `storage` events.

## 6. Once-only focus completion

`completeDueFocus(timerId, now)` is the only code path that creates a session. It runs inside
`navigator.locks.request("focus-garden:state", ...)` where Web Locks is available. The same
transaction code remains idempotent without the lock because the session ID is the timer ID and the
canonical document forbids duplicate IDs; Web Locks additionally serializes same-origin tabs on
supported release browsers.

Algorithm:

1. Reload the latest canonical document inside the lock; never complete from a stale render copy.
2. Return unchanged unless `activeTimer.id === timerId`, kind is focus, phase is running, and
   `creditedMs(timer, now) >= durationMs`.
3. If `sessions` already contains `timerId`, normalize the timer to completed and return it; do not
   select another species, chime, or add minutes.
4. Calculate the exact completion boundary.
5. Call `selectSpecies(randomSource)` once. Construct one immutable session using the selected
   configured duration, locked label, and timer ID.
6. Construct a new document with that session appended, the timer in `completed`, completion
   boundary stored, and `rewardAcknowledgedAt: null`.
7. Persist the whole document with one `localStorage.setItem`. Only a successful write commits the
   in-memory state and emits `focus-completed`.
8. The event coordinator opens the completion dialog and attempts one chime for that committed
   transition. A Set of emitted session IDs prevents duplicate effects in the current document
   lifecycle. Other tabs reconcile via the `storage` event and do not emit completion effects for a
   session they did not commit.

If persistence fails, no successful completion or plant is claimed. Keep the timer at zero in
non-persistent error state, explain that progress cannot be saved, and allow retry/export. The
write-first/effect-second order prevents a visible reward that disappears on reload.

Closing the dialog by Start break, View garden, Done, or Escape first persists
`rewardAcknowledgedAt`; after success it performs the action. A committed focus with null
acknowledgment opens its dialog after a later reload, while an acknowledged one never does. Dialog
presentation is serialized under the same lock and attributed to the committing tab; this avoids
two-tab duplicate presentation in supported browsers. A fallback tab that observes an already
persisted completion does not open effects unless it is initialization recovery for an unacknowledged
reward. This is a graceful-degradation boundary to test explicitly.

Break reconciliation uses the same elapsed calculation but only marks the break completed. It never
creates a session, species, focused minutes, completion reward dialog, or chime.

## 7. Random species selection

```ts
interface RandomSource { next(): number } // finite 0 <= n < 1
const SPECIES: readonly Species[] = [
  "emberleaf", "moonbell", "cloudfern", "sunspindle", "dewstar", "quietbloom"
];
function selectSpecies(source: RandomSource): Species {
  const value = source.next();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError("random");
  return SPECIES[Math.floor(value * SPECIES.length)]!;
}
```

Production uses `crypto.getRandomValues` with rejection sampling to produce an unbiased fraction;
it does not use `Math.random`. Tests inject fixed boundary values (`0`, each `n/6`, and the largest
representable value below `1`). Selection happens only in the committed completion path and the
result is stored permanently, so rerenders/imports never reroll a plant.

## 8. Garden, week, totals, and streak calculations

All calculations accept an injected `now: Date` and use browser-local calendar components.

* Sort sessions by `completedAt` ascending, then ID ascending for stable ties.
* Week starts at local Monday 00:00. Compute `offset = (dayOfWeek + 6) % 7`, then use
  `setHours(0,0,0,0)` and `setDate(getDate() - offset)`. End is the next Monday, exclusive.
  Do not subtract fixed 24-hour milliseconds across DST.
* Include a session in the current week when `weekStart <= completedInstant < nextWeekStart`.
  Render Monday through Sunday even when empty. Future days say Upcoming; past/today empty days say
  No sessions without failure language.
* This week's plant count is the number of included records. The required **total focused minutes**
  is the all-time sum of `durationSeconds / 60` over every valid session. A supplementary weekly
  minutes value may be shown but cannot replace the total.
* Build a set of local date keys from sessions using numeric `{year, month, day}` tuples, not
  locale-formatted strings.
* Streak anchor is today if today is in the set; otherwise yesterday if yesterday is in the set;
  otherwise streak is zero. Starting at the anchor, move backward one local calendar day with
  `setDate(getDate() - 1)` and count consecutive keys.

Unit fixtures cover Sunday/Monday boundaries, month/year changes, spring-forward/fall-back,
multiple sessions in one day, today empty/yesterday occupied, gaps, invalid future imports, and a
changed display time zone. Plant detail controls expose species display name, localized completion
date/time, credited minutes, and label or “No task label.”

## 9. Import, export, replacement, and deletion

### Export

Export serializes the canonical current document as UTF-8 JSON with two-space indentation and a
trailing newline. It includes schema version, preferences, active timer, sessions, labels, and
stored species; excludes modal, route, focus, install prompt, connectivity, error, device, and
browser state. Filename is `focus-garden-YYYY-MM-DD.json` using the local date. Download uses a
temporary Blob URL that is revoked. No upload or Web Share API is used.

### Import validation pipeline

1. File chooser accepts one `.json`; extension is a hint, not the security check.
2. Before reading, reject `file.size > 1_048_576`.
3. Read the bytes once and decode with `new TextDecoder("utf-8", { fatal: true })`; reject read or
   UTF-8 decode failure. JSON.parse into `unknown`; never evaluate.
4. Reject missing/non-integer schema, schema `< 1`, and schema `> CURRENT_SCHEMA_VERSION`.
5. Run supported migrations, strict shape/invariant validation, and the 10,000-record limit.
6. Build a fresh canonical object. Do not retain unknown fields or references from decoded input.
7. Produce an immutable preview: record count, earliest/latest local completion dates (or Empty),
   current record count to be replaced, active timer presence, and preference summary.
8. Hold the validated candidate in memory only. No storage changes occur before explicit
   **Replace my garden** confirmation.
9. On confirmation, refresh current-state metadata for the warning, set candidate `savedAt` to now,
   and call the single-key repository `replace` once.
10. Update UI state only after successful `setItem`; on any error, keep both the persistent and
    current in-memory garden logically unchanged and show the specific associated error.

`localStorage.setItem` is atomic for the one key: it either replaces the value or throws. The app
must not clear first. Cancel drops the candidate. Import controls are disabled only during reading
or replacement. A storage event causes other open tabs to reload the replacement.

Clear confirmation names session count, preferences, and active timer. **Cancel** is initially
focused. On confirm, `removeItem("focus-garden:state")`; only successful removal resets memory to
first-run defaults. Cache Storage is application code, not user garden data, and is not cleared.

## 10. UI, accessibility, and error behavior

### Semantic and responsive contract

Use a skip link, one `<h1>`, `header`, `nav`, `main`, and status regions. Controls are native
buttons, inputs, and radio groups. Compact layout is 320–767 px with bottom navigation; medium is
768–1023 px; wide is at least 1024 px with a 75rem maximum and 7/5 Focus split. At 200% zoom the
week reflows to the vertical compact list. Targets are at least 44×44 CSS px with adequate spacing.
No core action requires hover, drag, sound, color, animation, or a fine pointer.

Use native `<dialog>` where supported, with a tested wrapper that sets initial focus, traps focus,
marks the background inert, handles Escape according to the calling flow, and restores focus.
Completion Escape means Done. Import/reset/clear Escape means Cancel. Plant details are non-modal
disclosures/popovers at wide sizes and modal bottom sheets below 600 px. Plant DOM order is
chronological.

The visual timer updates each second but is not a live region. A separate bounded status announcer
announces start, pause, resume, five minutes, one minute, and completion only; it deduplicates keys
per timer ID. Completion uses one assertive message. Online/offline transitions use one polite
message. Errors use headings and `aria-describedby`/`aria-errormessage`, then receive focus when the
flow requires it.

The Seed Dial SVG and plant art are `aria-hidden` when equivalent text is adjacent. Accessible plant
button names include species, local date/time, minutes, and task label status. With
`prefers-reduced-motion: reduce`, all motion tokens are zero and the final bloom appears
immediately. Forced-colors rules use system colors, visible borders, and non-color selected marks.

### Failure mapping

| Failure | Required behavior |
|---|---|
| Corrupt/newer stored schema | Preserve raw key, run safe in memory, block persistence over it, offer import or confirmed clear |
| Storage unavailable/quota | Keep open-tab timer usable, show persistent non-persistence error, never claim durable completion/import/delete |
| Audio policy/decode/play failure | Complete normally; show optional inline note; do not retry repeatedly |
| Invalid/oversize import | Associated specific error, focus error heading, no state change |
| Export Blob/download failure | “Your garden couldn’t be exported. Try again.”; no state change |
| Service-worker registration failure | Online app remains usable; do not claim Offline ready |
| Unknown hash | Replace hash with `#focus` without network navigation |
| System clock moves backward | Clamp running delta to zero; preserve prior credited time |
| Unexpected exception | Catch at command boundary, retain last committed state, show recoverable generic error; log no user data |

Production may log static error codes to the local console for diagnostics, but not labels,
timestamps, imported contents, or session records.

## 11. Theme and asset contracts

`tokens.css` must implement every shared scale and every semantic variable approved in
`docs/design/focus-garden-themes.md`: typography, spacing, radii, borders, focus, target size,
motion, plus `--canvas`, `--surface`, `--surface-raised`, `--surface-sunken`, `--text`,
`--text-muted`, `--border`, `--border-strong-color`, `--action`, `--on-action`,
`--action-hover`, `--action-soft`, `--on-action-soft`, `--accent`, `--on-accent`,
`--plant-highlight`, `--focus-ring`, `--success`, `--on-success`, `--warning`,
`--on-warning`, `--danger`, `--on-danger`, `--info`, `--on-info`, `--soil`,
`--timer-track`, `--timer-progress`, and `--shadow`.

Components consume semantic variables only. `[data-theme="botanical"]`, `golden`, and `midnight`
carry the approved values unchanged unless a contrast review records a correction. Set matching
`color-scheme`. Theme change only updates the document attribute and explicit preference; it cannot
recreate views, move focus, or change timer state. An early same-origin inline-free bootstrap module
applies the stored/implicit theme before rendering to avoid flash.

All fonts use the approved system stacks. Plant SVGs, icons, and chime are original project-owned
assets, reviewed for licensing, bundled same-origin, and represented without copied prototype
shortcuts. The completion growth transition is at most 600 ms and is the sole expressive motion.

## 12. PWA, caching, updates, and privacy

Use Vite PWA `generateSW` with:

* scope and start URL `/ai-team-sdlc-sample-focus-garden/`;
* `display: "standalone"`, app name/short name, theme/background colors, and same-origin standard
  and maskable icons;
* precaching of hashed JS/CSS, `index.html`, manifest, icons, six plant assets, and chime;
* `cleanupOutdatedCaches: true`;
* navigation fallback only for requests inside the app scope, denying `/api/` and file-like paths;
* **no runtime cache for cross-origin requests**, no background sync, and no user-data caching;
* service-worker scope no broader than `/ai-team-sdlc-sample-focus-garden/`.

Use a conservative prompt-to-update strategy. A newly installed worker waits; the app displays
“Update available” with **Update now**. Acceptance sends the skip-waiting message, waits for
`controllerchange`, then reloads once. Do not call unconditional `skipWaiting` or reload mid-timer.
Hashed precache entries and one worker manifest prevent mixed asset versions. A first activated
worker sets Offline ready only after successful precache. A failed registration leaves the online
app fully functional.

The application itself performs no `fetch`, XHR, beacon, WebSocket, analytics, telemetry, remote
asset, or third-party request. The only post-load network traffic permitted is same-origin
navigation/static-asset/service-worker update traffic. Add this build-compatible CSP in
`index.html` and verify Vite output against it:

```html
<meta http-equiv="Content-Security-Policy"
 content="default-src 'self'; script-src 'self'; style-src 'self';
 img-src 'self' data:; media-src 'self'; connect-src 'self';
 object-src 'none'; base-uri 'self'; form-action 'none';">
```

Do not request notifications, location, camera, microphone, contacts, background sync, persistent
storage, or clipboard permission. Imported labels are text only. No secret or environment credential
is required in source, build, runtime, or CI.

## 13. CI and GitHub Pages workflow specification

`.github/workflows/ci.yml` runs on pull requests and pushes to the feature/default branches with
least-privilege `contents: read`, concurrency cancellation, npm cache, and a pinned Node LTS:

1. `npm ci`
2. `npm run format:check`
3. `npm run lint`
4. `npm run test -- --coverage`
5. `npm run build`
6. `npm audit --audit-level=high`
7. Install pinned Playwright browsers, serve the production build at
   `/ai-team-sdlc-sample-focus-garden/`, then `npm run test:e2e`
8. Run Lighthouse CI against the same subpath and upload non-sensitive reports/artifacts.

Use action references pinned to immutable commit SHAs. Cache only npm's download cache, never
`node_modules`. The Pages workflow is a separate, specification-only deliverable until governance
sign-off. When implementation reaches deployment, it must build the same artifact, upload `dist`
with official Pages actions, use only `pages: write` and `id-token: write` on the deploy job, target
the protected `github-pages` environment, and never contain a secret. T-004 does not add, run, push,
or deploy either workflow.

## 14. Test and quality strategy

### Vitest

Use fake clocks and injected ports. Target 90% line/branch coverage for `domain/` and `data/`, with
100% branch coverage for `timer.ts`, `completion.ts`, `streak.ts`, `codec.ts`, and migrations.
Coverage is a floor, not a substitute for cases:

* every timer transition, pause accumulation, reload/visibility reconcile, exact boundary,
  backward clock, and long suspension;
* repeated completion calls, stale state, storage failure, duplicate ID, and two-controller
  serialization;
* all six random boundaries and invalid random values;
* Monday/Sunday, DST, month/year, today/yesterday streak anchors, gaps, totals, and ordering;
* current schema round trip, malformed/unknown/newer shape, duplicate IDs, dates, exact 1 MiB and
  10,000-record boundaries, 1-byte/1-record over limits, migration fixtures, rollback, and cancel;
* theme first-launch/explicit precedence and error-code mapping.

Use an in-memory repository fake for most tests and a real localStorage integration suite for
atomic set/remove and quota/unavailable exceptions.

### Playwright

Run Chromium for every PR; run Chromium, Firefox, and WebKit for release evidence. Use test-only
clock/audio/random adapters enabled at build time only under a non-production mode. Core scenarios:

* default and all exact presets; label trim/lock; start/pause/resume/reset/cancel;
* focus once-only completion across repeated ticks, reload, hidden page, and two tabs;
* completion modal focus, Escape/Done, View garden, explicitly prepared/started break, and no break
  plant;
* sound enabled/muted/playback-failure and reduced-motion immediate final plant;
* weekly garden, all six species, details/no-label, totals, streak, dense/empty days;
* all themes, persistence, first-launch dark preference, forced colors, and no focus/layout loss;
* export/delete/import round trip; invalid, oversize, duplicate, newer, cancel, quota, and atomic
  rollback paths;
* service-worker first online activation, full offline reload/core flows, update prompt/activation,
  and registration failure;
* 320/360/768/1280 widths, 200% zoom, keyboard-only flows, focus restoration, bounded live regions,
  and automated axe scans with zero serious/critical findings.

Intercept requests and fail tests on any cross-origin request or request whose URL/body contains
known test labels/session data. Assert all requests stay within the exact Pages path except the
origin document navigation.

### Lint, audit, performance, and manual evidence

ESLint includes TypeScript type-aware rules, no floating promises, exhaustive switches, no explicit
`any`, and restricted DOM HTML sinks. Prettier is check-only in CI. `npm audit` must report zero
high/critical findings; exceptions require security and product sign-off rather than suppression.

Lighthouse CI uses a production build and a documented throttled mobile profile. Gate median
navigation load under 2 seconds for the agreed smoke metric, installable manifest/service worker,
no console errors, and budgets of 150 KiB compressed first-party JS and 300 KiB compressed initial
transfer excluding browser-generated service-worker update traffic. Record the precise metric and
hardware/runner in evidence to avoid an ambiguous “load” claim.

Manual release evidence covers keyboard, one representative screen reader, contrast in all themes,
320 CSS px/200% zoom, reduced motion, forced colors, current/previous browser majors, Safari offline
update behavior, network privacy inspection, and absence of prototype assets/dependencies.

## 15. PRD traceability and spec-review

| Corrected PRD P0 contract | Architecture sections | Required evidence |
|---|---|---|
| FR-1.1–1.3 defaults, exact pairs, label | §§4–5, 10 | UNIT-TIMER, E2E-FOCUS |
| FR-1.4–1.5 pause/resume/reset | §5 | UNIT-TIMER, E2E-RESET |
| FR-1.6 break behavior | §§5–6 | UNIT-BREAK, E2E-BREAK |
| FR-1.7–1.8 recovery/single active | §§5–6 | UNIT-RECONCILE, E2E-RELOAD |
| FR-2.1–2.4 once-only credited completion | §§5–7 | UNIT-COMPLETE, E2E-IDEMPOTENCY |
| FR-2.5 completion dialog | §§6, 10 | E2E-DIALOG, A11Y-MANUAL |
| FR-2.6 chime/mute/failure | §§6, 10–11 | UNIT-AUDIO, E2E-SOUND |
| FR-2.7 growth/reduced motion | §§10–11 | E2E-MOTION |
| FR-3.1 weekly garden | §8 | UNIT-WEEK, E2E-GARDEN |
| FR-3.2 accessible details/label | §§8, 10 | E2E-DETAIL, A11Y-MANUAL |
| FR-3.3 streak | §8 | UNIT-STREAK |
| FR-3.4 totals/count | §8 | UNIT-GARDEN |
| FR-3.5 persistence/order | §§4, 8 | UNIT-CODEC, E2E-RELOAD |
| FR-3.6 empty state | §§8, 10 | E2E-EMPTY |
| FR-4.1–4.2 complete export/round trip | §§4, 9 | UNIT-ROUNDTRIP, E2E-DATA |
| FR-4.3 import limits/preview/atomicity | §9 | UNIT-IMPORT, E2E-ROLLBACK |
| FR-4.4–4.5 clear/cancel | §§9–10 | E2E-CLEAR |
| FR-5.1 offline core | §§12, 14 | E2E-OFFLINE |
| FR-5.2 safe updates | §12 | E2E-SW-UPDATE |
| FR-5.3–5.5 manifest/subpath/static | §§2, 12–13 | BUILD-PAGES, PWA-AUDIT |
| FR-5.6 graceful SW failure | §12 | E2E-SW-FAIL |
| FR-8.1–8.4 exact themes/system/persistence/offline | §§4, 11–12 | E2E-THEMES, CONTRAST |
| FR-6.1–6.3 keyboard/semantics/announcements | §10 | AXE, A11Y-MANUAL |
| FR-6.4 contrast/focus | §§10–11 | CONTRAST, A11Y-MANUAL |
| FR-6.5 reflow/zoom | §§10, 14 | E2E-REFLOW |
| FR-6.6–6.8 equivalent cues/motion/targets | §§10–11 | AXE, E2E-MOTION, A11Y-MANUAL |
| FR-6.9 automated/manual verification | §14 | AXE, A11Y-MANUAL |
| FR-7.1–7.3 no egress/third parties/same-origin | §§2, 12, 14 | E2E-NETWORK, CSP-VERIFY |
| FR-7.4 safe JSON | §§4, 9–10 | UNIT-CODEC, SECURITY-REVIEW |
| FR-7.5 local-data explanation | §10 | E2E-PRIVACY-COPY |
| FR-7.6 no permissions | §12 | E2E-PERMISSIONS |
| Delivery: Vite/TS/no framework, CSS variables, exact Pages base | §§1–3, 11, 13 | BUILD-PAGES, REVIEW |
| Release: Vitest/Playwright/lint/audit/performance | §§13–14 | CI artifacts |

The specification preserves all corrected P0 requirements, source non-functional constraints, and
the accepted design behaviors. It is feasible on static GitHub Pages, secure/local-only by default,
and testable through explicit seams and gates. `spec-review`: **PASS**. Detailed gate evidence is in
`evidence/spec-review/T-004-focus-garden-architecture.md`.

## 16. Implementation task decomposition recommendation

1. **FE-01 — Foundation and shell:** independent Vite/TS setup, exact base, semantic shell/hash
   router, tokens/themes, responsive layout, CSP. Exit: build/lint/theme/reflow smoke.
2. **FE-02 — Persistence and schema:** v1 codec, repository, safe initialization, migration registry,
   storage errors, fixtures. Exit: schema/atomicity tests.
3. **FE-03 — Timer domain and UI:** paired presets, label, reducer, wall-clock reconcile,
   pause/resume/reset and announcements. Exit: timer unit and keyboard E2E.
4. **FE-04 — Completion and break:** idempotent transaction, random seam, original plant assets,
   modal/chime, explicit break. Exit: reload/visibility/two-tab/reduced-motion tests.
5. **FE-05 — Garden:** week/streak/totals, responsive bed/list, disclosures/sheets, empty/dense
   states. Exit: calendar unit tests and garden accessibility E2E.
6. **FE-06 — Data ownership:** export, strict bounded import preview/atomic replace, clear, corrupt
   and quota recovery. Exit: boundaries, round trip, rollback, XSS-safety tests.
7. **FE-07 — PWA and CI:** manifest, scoped service worker, update UI, exact-subpath harness,
   CI/audit/Lighthouse. Exit: offline/update/static/network tests. Pages deployment remains blocked
   until human sign-off.
8. **QA-01 — Integrated acceptance:** cross-browser Playwright, accessibility/manual AT, privacy
   network inspection, performance, dependency audit, and prototype-separation evidence.
9. **CR-01 / SEC-01 — Critic and security/RAI reviews:** review only after integrated acceptance;
   resolve blocking findings before governance sign-off.

No backend task is needed. Record a justified backend skip because the approved architecture has no
server component. Keep each task independently demonstrable and do not begin P1 history/install
guidance until the PRD's P0 gate condition is met.
