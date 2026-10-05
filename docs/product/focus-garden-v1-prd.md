# Focus Garden v1 Product Requirements Document

**Task:** T-003  
**Run:** 2026-10-05-focus-garden  
**Status:** Ready for architecture/specification  
**Product surface:** Installable, offline-capable static web application  
**Delivery target:** GitHub Pages

## 1. Product intent

Focus Garden turns a bounded focus session into visible progress in a personal garden. A person chooses a duration, focuses, and receives one plant when the session completes. The experience should make starting another focused interval feel rewarding without introducing accounts, social pressure, or distracting game mechanics.

The v1 product is local-first: core use requires no sign-in or network connection after the first successful load. The design prototype and its evidence inform this PRD but remain **throwaway reference material**. Production implementation must not depend on, ship, or incrementally harden prototype code.

## 2. Users, needs, and jobs

### P1 — Independent focuser (primary)

A student, knowledge worker, or hobbyist who wants a lightweight ritual for beginning and completing one task.

* **When** I need to concentrate, **I want** to start a clearly timed focus session with minimal setup, **so that** I can begin rather than continue planning.
* **When** I complete a session, **I want** an immediate, calm record of progress, **so that** completion feels tangible.
* **When** I return later, **I want** to see my prior plants and basic totals, **so that** I can recognize sustained effort.

### P2 — Keyboard, screen-reader, reduced-motion, or low-vision user

* **When** I use the app, **I want** every core action and state to be perceivable and operable with my access needs, **so that** the garden metaphor does not exclude me.

### P3 — Privacy-conscious/offline user

* **When** I focus without dependable connectivity or an account, **I want** the timer and my garden to continue working locally, **so that** connectivity and data collection are not prerequisites.
* **When** I change devices or clear a browser, **I want** an understandable export/import path, **so that** I can control my data.

## 3. Goals and measurable outcomes

| ID | Goal | v1 measure |
|---|---|---|
| G1 | Reduce friction to begin focusing | A first-time user can start a default session in no more than two primary actions after app load. |
| G2 | Make completed focus visible | 100% of valid elapsed completions create exactly one persistent session and one plant. |
| G3 | Be dependable offline | After one successful online load, all P0 flows pass with the network disabled. |
| G4 | Be inclusively operable | P0 flows meet WCAG 2.2 AA acceptance criteria listed below using keyboard and a representative screen reader. |
| G5 | Keep user data under user control | No session/garden content leaves the device; valid export/import round trips without loss. |

These are release-quality measures, not analytics targets. v1 does not add telemetry to measure them; release verification supplies the evidence.

## 4. Product principles

1. **Focus first:** the active timer is visually dominant; rewards never compete with it.
2. **Calm completion:** acknowledge success without forced celebration, urgency, or guilt.
3. **Honest progress:** only elapsed, completed sessions grow the garden.
4. **Local ownership:** data is local, inspectable through export, and removable.
5. **Progressive enhancement:** installability and notifications may enhance the web app but cannot gate core use.

## 5. Prioritized scope

Priority meanings: **P0** is required to release v1; **P1** is desirable only after all P0 criteria pass and must not delay release; **P2** is explicitly deferred.

### P0 — Must ship

* Select one paired focus/break preset: **25/5** (default), **50/10**, or **15/3** minutes.
* Start, pause, resume, reset, and complete one local focus or break timer; breaks start explicitly and never grow plants.
* Optionally label a focus session before it starts; the label is stored locally and shown in plant details.
* Display elapsed/remaining time and timer status accurately; use wall-clock timestamps so background-tab throttling does not lose elapsed time.
* Count a plant only after the selected focus duration has elapsed while the session is not paused.
* Play a gentle completion chime when sound is enabled; the user can mute it and completion never depends on sound alone.
* Show a calm completion panel and add exactly one randomly selected plant/session record, presented through accessible sprout-to-bloom stages.
* Display this week's Monday–Sunday garden, current daily streak, total focused minutes, and keyboard-accessible plant details including the optional task label.
* Use a deterministic, bounded set of six original species:
  1. **Emberleaf**
  2. **Moonbell**
  3. **Cloudfern**
  4. **Sunspindle**
  5. **Dewstar**
  6. **Quietbloom**
* Select one species randomly for each completed focus session using an injectable random source so tests can remain deterministic. Species are cosmetic and have equal value.
* Persist state locally across reloads and browser restarts.
* Export all app-owned data as versioned JSON; import supported JSON with validation and an explicit destructive-replacement confirmation.
* Delete all app-owned user data through an explicit confirmation.
* Provide responsive, accessible UI for supported mobile and desktop browsers.
* Provide Botanical Garden, Golden Hour, and Midnight Garden themes through a persistent theme switcher; first launch is light/dark aware.
* Provide an installable PWA manifest and offline application shell/core flows.
* Publish as a static, subpath-safe GitHub Pages site.

### P1 — Should ship if it does not threaten P0

* A compact chronological completion history.
* Non-blocking install guidance when browser install criteria are available.

### P2 — Deferred

* User-created species, rarity, unlocks, currency, achievements, leaderboards, social sharing, or competitive features.
* Configurable/custom durations, automated start of break/focus cycles, task/project management beyond the optional label, and calendar integrations.
* Notifications, background sync, accounts, cloud backup, cross-device sync, collaboration, or server components.
* Garden editing, plant deletion independent of its session, animation-heavy effects beyond the brief sprout-to-bloom reward, custom sounds, or haptics.
* Native mobile/desktop packaging.

## 6. Resolved product decisions

### 6.1 Original species set

v1 uses only the six fictional names in section 5, with original project-owned visual assets. No real cultivars, third-party characters, copied illustrations, or species-selection UI are required. Random selection fulfills the garden's surprise-and-reward intent while keeping illustration scope bounded. Production code must inject or isolate the random source so unit tests can assert every species and boundary without flaky sampling. The accessible text representation must use the species name; appearance cannot be the only distinction.

### 6.2 Safe JSON import limit

The import picker accepts a single `.json` file of at most **1 MiB (1,048,576 bytes)**. The decoded document may contain at most **10,000 session records** and must match a supported schema version. The app rejects oversize, malformed, unsupported-version, invalid-date, duplicate-ID, or structurally invalid input before changing stored data. Import is an atomic **replace**, not a merge. A preview states the valid record count and replacement effect; the user must confirm. On any failure, existing data remains byte-for-byte logically unchanged. These limits bound memory/validation work while far exceeding normal v1 use.

### 6.3 Completion-panel behavior

On first detection of a valid completion, the app persists the session and plant atomically, changes status to complete, and opens one non-dismissible-by-timer **modal dialog**. The dialog names the earned species, states focused minutes, and provides:

* **Start break** (primary): closes the dialog and prepares the paired break without auto-starting it.
* **View garden**: closes the dialog and moves to this week's garden.
* **Done**: closes the dialog and returns to an idle timer with the prior preset selected.

The dialog does not auto-close, auto-start another timer, trigger confetti, request notification permission, or require a share action. The optional gentle chime plays once when enabled and is redundant with visible and announced status. Focus enters the dialog, remains trapped while open, returns logically when closed, and the dialog is announced once. `Escape` performs **Done**. Reload/reopen after persistence must not award another plant or reopen an already acknowledged panel. If completion occurred while hidden, reconciliation on return follows the same once-only behavior.

## 7. Functional requirements and acceptance criteria

### FR-1 — Configure and run a timer (P0; traces to G1, G3)

1. Given a fresh install, when the app opens, then the 25/5 preset is selected and a labeled **Start focus** control is visible.
2. Given the idle timer, a user can select exactly 25/5, 50/10, or 15/3 and the UI exposes both focus and break durations.
3. Given an idle focus timer, a user may enter an optional task label of at most 80 trimmed characters; the label locks when the session starts and blank input is stored as absent.
4. Given an active timer, Pause freezes credited elapsed time; Resume continues from that credited time.
5. Given an active or paused timer, Reset requires confirmation after elapsed time exists, returns to the configured duration, and creates no completion or plant.
6. Given a completed focus, Start break prepares the paired break and requires an explicit start; completing or resetting a break never creates a session record or plant.
7. Given an active timer and a reload/browser restart, the app reconstructs the correct state from persisted timestamps within one second, excluding persisted paused intervals.
8. Starting is prevented while another session is active.

### FR-2 — Complete exactly once (P0; traces to G2)

1. Given a running focus session whose credited elapsed time reaches its duration, exactly one completed-session record and one randomly selected corresponding plant are persisted.
2. Repeated clock ticks, rerenders, tab visibility changes, reloads, and route changes cannot create a second record for the same session ID.
3. An abandoned session and a session short of its duration create no plant and add no focused minutes.
4. Completion uses the selected duration for credited minutes; delayed foreground reconciliation does not inflate the total.
5. The completion panel follows section 6.3 and is fully operable by keyboard.
6. When completion sound is enabled, one gentle chime is attempted; muting persists, audio failure does not block completion, and visible/programmatic completion remains equivalent.
7. The plant reward has accessible sprout-to-bloom stages and one restrained transition; reduced-motion mode presents the final stage without transform or delayed content.

### FR-3 — Garden and summary (P0; traces to G2)

1. The primary garden renders the current local Monday–Sunday week and groups each valid completion under its completion day.
2. Each plant exposes a keyboard- and pointer-operable detail disclosure/tooltip with species, local completion date/time, focused minutes, and task label or “No task label”; hover is never the only trigger.
3. Current streak is the count of consecutive local calendar days with at least one completion, anchored on today or yesterday when today is empty.
4. Total focused minutes equals the sum of credited focus durations, and this week's plant count equals visible current-week records.
5. Garden, streak, totals, labels, random species assignments, and chronological ordering are unchanged after reload.
6. An empty garden explains how to grow the first plant and links or returns to the timer without guilt-oriented copy.

### FR-4 — Local data control (P0; traces to G5)

1. Export downloads UTF-8 JSON containing a schema version and all app-owned localStorage settings, timer/session data, labels, species assignments, and preferences; it excludes transient UI state.
2. Export followed by deletion and import restores equivalent garden, history, totals, and settings.
3. Import meets every limit, validation, preview, confirmation, atomicity, and failure behavior in section 6.2.
4. Deletion names what will be removed, requires explicit confirmation, clears all app-owned persistent user data, and returns the app to its first-run state.
5. Canceling import or deletion changes no persistent data.

### FR-5 — Offline PWA and static delivery (P0; traces to G3)

1. On supported browsers, after one successful production load and service-worker activation, reload and all FR-1 through FR-4 flows work with network access disabled.
2. A new deployment updates cached application assets without deleting or corrupting user data; users are not trapped indefinitely on mixed asset versions.
3. The production manifest has a name, short name, icons, standalone display mode, theme/background colors, and a start URL within the deployed Pages base path.
4. No generated URL assumes hosting at `/`; refresh and navigation work at the repository subpath.
5. The deployed output is static and requires no secret, runtime server, database, or privileged API.
6. A missing/rejected service worker leaves the online web experience functional and presents no false “offline ready” claim.

### FR-8 — Themes and display preferences (P0)

1. A labeled theme switcher offers exactly Botanical Garden, Golden Hour, and Midnight Garden and indicates selection with text/icon state, not color alone.
2. On first launch only, a dark system preference selects Midnight Garden; otherwise Botanical Garden is the default. An explicit selection persists in localStorage and overrides later system changes.
3. Every theme preserves WCAG 2.1 AA contrast, visible focus, plant/detail readability, and component state meaning.
4. Switching themes causes no navigation, timer, label, focus, or persisted-data loss and works fully offline without remote fonts or assets.

### FR-6 — Accessibility (P0; traces to G4)

1. All P0 actions are operable using keyboard alone with visible focus and logical order; there is no keyboard trap except the intentional, escapable modal focus trap.
2. Controls have programmatic names; timer status, pause/resume state, validation errors, and completion are programmatically determinable.
3. Timer announcements do not occur more than once per minute; completion is announced once. Visual seconds may update without flooding live regions.
4. Text and meaningful UI meet WCAG 2.2 AA contrast; focus indicators meet WCAG 2.2 criteria 2.4.11/2.4.12 as applicable.
5. Content remains usable at 200% text zoom and at 320 CSS-pixel width without loss of core functionality or two-dimensional scrolling.
6. Species, status, and validation never rely on color, motion, shape, or position alone.
7. With `prefers-reduced-motion: reduce`, nonessential transitions and plant motion are absent; no content flashes more than three times per second.
8. Touch targets meet WCAG 2.2 AA target-size requirements or documented exceptions.
9. Automated accessibility checks report no serious/critical issues on timer, completion, garden, and data-management states; manual keyboard and representative screen-reader tests pass the criteria above.

### FR-7 — Privacy and safety (P0; traces to G5)

1. v1 sends no user-entered content, session records, identifiers, or behavioral analytics over the network.
2. There are no trackers, ad scripts, remote fonts, remote images, or unnecessary third-party runtime requests.
3. All production assets are same-origin and cacheable for offline use; network inspection of each P0 flow shows no request containing user data.
4. JSON is treated only as data: imported text is never executed or inserted as unsanitized markup.
5. The app explains that data is stored in the current browser, may be lost if site data is cleared, and can be exported or deleted.
6. The app requests no notification, location, contacts, camera, microphone, or background-sync permission.

## 8. Constraints

### Delivery and technical

* GitHub Pages is the production host; v1 is a static client application with build-time configuration only.
* Production uses Vite + TypeScript without a heavy UI framework; CSS custom properties are the single theming mechanism.
* Vite `base` is `/ai-team-sdlc-sample-focus-garden/`, targeting `https://devopsabcs-engineering.github.io/ai-team-sdlc-sample-focus-garden/`.
* Repository/project-page base paths must be supported for scripts, styles, icons, manifest, service worker, and navigation.
* Service-worker scope must not exceed the application’s Pages subpath.
* Browser storage is the system of record. Storage failure/quota errors must be surfaced and must not claim a successful start, completion, import, or deletion.
* The authoritative timer model uses persisted wall-clock boundaries and paused duration, not interval tick counts.
* Updates and schema migrations must be forward-safe; unsupported newer imports are rejected rather than guessed.
* No secret may be present in source, generated output, workflow, or browser runtime.

### Supported experience

* Target the current and previous major versions of Chromium, Firefox, and Safari at release verification.
* Installation affordances vary by browser; browser installation is not required to use P0 functionality.
* Fully closing a browser may suspend execution. On reopening, timestamp reconciliation determines completion; v1 promises no background alarm or notification.

### Prototype boundary

* Files under `prototype/` and design prototype evidence are disposable discovery artifacts.
* Production code must be independently implemented against approved requirements and architecture.
* Prototype code, dependencies, assets, and shortcuts are not assumed to satisfy quality, licensing, accessibility, offline, privacy, or security requirements.

## 9. Explicit non-goals

v1 is not a medical, productivity-monitoring, parental-control, time-billing, or employee-surveillance product. It does not guarantee uninterrupted background execution or alarms. It does not prevent users from changing the system clock and does not attempt anti-cheat behavior. It does not provide accounts, remote persistence, sharing, comparative scoring, monetization, third-party integrations, or the P2 features listed above.

## 10. Backlog slices

Each slice should be independently demonstrable; priority order is the recommended delivery order.

| Slice | Priority | User value | Included requirements | Exit evidence |
|---|---:|---|---|---|
| S1. Accessible focus/break loop | P0 | Start and control one clear paired rhythm | FR-1; relevant FR-6 | Exact preset/start/pause/resume/reset/break tests; label, keyboard, and timer-state checks |
| S2. Durable once-only completion | P0 | Trust that effort creates exactly one reward | FR-2; section 6.3 | Clock/reload/visibility/idempotency tests and completion-dialog accessibility evidence |
| S3. Weekly garden and habit summary | P0 | See accumulated effort without pressure | FR-3; species decision | Weekly grouping, random selection with seeded tests, streak, labels/details, empty-state, and totals tests |
| S4. Data ownership | P0 | Move or remove local data safely | FR-4; import decision; FR-7.4–5 | Round-trip, boundary, invalid/oversize, atomic rollback, cancel, and delete tests |
| S5. Offline Pages release | P0 | Reliably use the app from its target host | FR-5; delivery constraints | Production-build subpath test, manifest audit, first-load/offline matrix, update test |
| S6. Release accessibility/privacy hardening | P0 | Use the complete experience safely and inclusively | FR-6, FR-7 | WCAG manual/automated report and clean network/privacy inspection |
| S7. Themes, chime, and completion polish | P0 | Personalize a calm, perceivable experience | FR-2, FR-8 | Three-theme, light/dark-first-launch, persistence, mute/audio-failure, reduced-motion, and contrast tests |
| S8. History | P1 | Inspect prior completions beyond the weekly garden | P1 scope | Persistence, export/import, responsive, and accessibility tests |
| S9. Install guidance | P1 | Discover optional installation | P1 scope | Supported/unsupported-browser behavior and dismissal test |

No P1 slice begins until S1–S6 acceptance criteria pass or an explicit product exception is recorded.

## 11. Release acceptance

v1 is releasable when:

1. Every P0 acceptance criterion has objective passing evidence on a production-equivalent GitHub Pages subpath build.
2. Automated unit/integration tests cover paired timer calculation, pause accounting, streaks, once-only completion, injectable random species selection, totals, schema validation, import boundaries, and rollback.
3. End-to-end tests cover exact presets, task label, focus and break flows, completion/chime mute, weekly garden details, all three themes, reload recovery, offline completion, export/import round trip, and deletion.
4. Manual accessibility testing covers keyboard-only use, 200% zoom/320 CSS pixels, reduced motion, contrast, and one representative screen reader across all P0 states.
5. Offline/cache update behavior is verified in at least current Chromium and current Safari; core online behavior is verified across the supported matrix.
6. Runtime network inspection confirms no user-data egress or third-party runtime request.
7. Production output contains no prototype dependency or prototype asset unless separately reviewed, licensed, and recreated as a production asset.
8. Known P0 defects are zero. Any unmet P1 item is documented as deferred, not treated as a release failure.
9. Vitest covers timer logic, garden state, streak calculation, and import/export; Playwright covers core flows; ESLint and Prettier pass.
10. `npm audit` reports no high or critical vulnerability, and a throttled Lighthouse-style smoke loads the page in under two seconds with an installable manifest and registered service worker.

## 12. Risks and mitigations

| Risk | Impact / likelihood | Mitigation |
|---|---|---|
| Browser timer throttling or process suspension | High / High | Persist timestamps and paused duration; reconcile on visibility/load; promise no background alarm. |
| Duplicate completion during reload/races | High / Medium | Stable session IDs and one atomic/idempotent completion transaction; test concurrent triggers. |
| Storage unavailable, cleared, or quota exceeded | High / Medium | Detect failures, avoid false success, explain local-storage limits, and provide export. |
| Service-worker cache serves mixed/stale versions | High / Medium | Version caches, atomically activate compatible assets, preserve data, and test upgrades. |
| GitHub Pages base-path mistakes | High / Medium | Inject one build-time base path and test all URLs from a repository subpath. |
| Garden visuals exclude assistive-technology users | High / Medium | Equivalent text names/status, semantic structure, contrast, and manual AT testing. |
| Corrupt or hostile JSON causes data loss/XSS/resource exhaustion | High / Medium | 1 MiB/10,000-record limits, strict schema, safe rendering, preview, atomic replace, rollback. |
| Prototype shortcuts leak into production | Medium / Medium | Treat prototype as throwaway; independently implement and review production dependencies/assets. |
| Static hosting cannot provide sync/recovery | Medium / High | Set clear local-only expectations; export/import and delete controls; keep cloud sync out of v1. |
| Original species art expands scope | Medium / Medium | Fixed six-species set, equal mechanics, reusable visual system, text fallback. |

## 13. Assumptions and product clarifications

* “Focused minutes” means the configured completed duration, not unbounded wall time after expiry.
* Pausing may continue indefinitely in v1; no plant is awarded while paused or abandoned.
* A system-clock change can affect a running session; v1 does not implement tamper detection. Architecture should prevent negative elapsed values and obvious duplicate completion.
* Imported data replaces current data only after validation and confirmation. Merge semantics are deferred.
* The optional task label is P0 user data and inherits all offline, privacy, deletion, export/import, and accessibility requirements.

No product blocker remains for architecture/specification. Any architecture proposal that cannot satisfy static GitHub Pages hosting, local-only privacy, or once-only offline completion must return for product review rather than silently weakening those requirements.
