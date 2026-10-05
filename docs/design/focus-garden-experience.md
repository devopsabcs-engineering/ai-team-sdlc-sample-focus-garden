# Focus Garden experience design

**Task:** T-001  
**Status:** Design direction for prototype and requirements  
**Source:** `specs/idea.md`

## Experience thesis

Focus Garden helps someone begin concentrating before they have time to reconsider. The primary
screen therefore has one dominant action, **Start focus**, and makes the timer—not productivity
statistics—the visual center. A finished session becomes a plant. The reward is warm but brief;
the product never scolds, ranks, or turns a missed day into a failure.

### Users, jobs, and success signals

| User | Situation and job | Successful experience |
|---|---|---|
| Focused worker | Has a task and wants to begin now | Can label and start a default session in one interaction after load; can recover from pause/reset without losing garden history |
| Gentle habit builder | Wants evidence of effort without pressure | Can understand this week's garden, current streak, and minutes; copy remains neutral when a day is missed |
| Accessibility-first user | Uses keyboard, screen reader, zoom, high contrast, or reduced motion | Completes every flow without pointer, sound, color, or motion; focus and announcements are predictable |
| Privacy-conscious/offline user | Does not want an account or network dependency | Sees that data stays on this device; can use the timer offline and export, replace, or clear local data |

Product success should be evaluated without analytics or tracking: moderated task completion,
time-to-start in usability tests, comprehension of completion/garden state, keyboard completion,
and successful export/import recovery. The app itself makes no telemetry calls.

## Information architecture

- **Focus** (default): preset, optional task label, seed dial, timer controls, sound control.
- **Garden**: this-week plot, streak, focus minutes, accessible plant details.
- **Settings** (dialog or sheet): theme, sound, data export/import/clear, install/offline information,
  and privacy statement.
- Persistent header: product name, Focus/Garden navigation, compact theme control, Settings.
- Offline status is a quiet status chip only when offline; it is not an error because the app remains
  fully usable.

On a 360 px screen, Focus and Garden are bottom navigation destinations. At 768 px and above they
move into the header. Settings remains a labeled button, not an unlabeled gear at first use.

## Journeys

### J1 — Start quickly, finish, and receive a plant

1. Arrive on Focus. The 25/5 preset is selected and the Start focus button has a clear visual
   hierarchy; the task label is optional.
2. Optionally enter “Draft project outline” and/or choose 50/10 or 15/3.
3. Activate **Start focus**. The preset and label lock for this running session. The primary action
   becomes **Pause**; Reset remains secondary.
4. Pause/resume as needed. Reset asks for confirmation only after elapsed time exists.
5. At zero, a gentle chime plays if enabled, a visual completion status appears, and one random plant
   is saved. A focused completion dialog identifies the plant and task.
6. Choose **Start 5-minute break** or **View garden**. A break never plants a second plant.
7. At break completion, choose **Start another focus**; no automatic start prevents surprise timers.

Success: exactly one plant and the selected focus minutes are recorded once, even if the page is
backgrounded or reopened near completion.

### J2 — Interrupt or recover a session

1. Pause returns a stable remaining time and offers **Resume**.
2. Reset opens: “Reset this session? Its progress won’t be saved.” Cancel retains the timer; **Reset
   session** returns to the configured duration without changing garden data.
3. Reload/reopen restores a running session from its stored end time. If it ended while closed, the
   completion is processed once and shown on return.
4. If local storage is unavailable, the timer still works for the open tab and a persistent banner
   explains that progress cannot be kept after closing.

Success: the user always understands what will be discarded and duplicate plants are impossible.

### J3 — Review the weekly garden

1. Open Garden and encounter summary values first: current streak and this week's focus minutes.
2. Scan a Monday–Sunday garden bed; each completed session is a plant in its completion day.
3. Focus or activate a plant to open its detail popover: accessible plant name, completion day/time,
   minutes, and task label or “No task label.”
4. Close with Escape, the close control, or by returning focus to the plant. Browse other plants with
   Tab; DOM order is chronological.

Success: details are available without hover and the same data remains understandable without plant
color or illustration.

### J4 — Personalize theme and sound

1. Open the theme switcher and choose Botanical Garden, Golden Hour, or Midnight Garden.
2. The theme applies immediately and selection remains on this device. On first launch only, a dark
   system preference selects Midnight Garden; otherwise Botanical Garden is the default.
3. Toggle **Completion sound**. A visible status always accompanies the chime.

Success: theme and sound survive reload; switching causes no flash, layout shift, or lost focus.

### J5 — Export, replace, or clear garden data

1. Open Settings > Your data. Copy states: “Stored only in this browser on this device.”
2. **Export garden** downloads a versioned JSON file. The success message names the file.
3. **Import garden** opens a file chooser accepting `.json`. The app validates before changing data,
   then previews plant count/date range and warns that import **replaces** current data.
4. Confirm with **Replace my garden**, or cancel with no mutation. On success, Garden reflects the
   imported data.
5. **Clear all data** opens a destructive confirmation naming plants, preferences, and current timer.
   Confirm with **Clear all data**. The app returns to the first-use Focus state and confirms locally.

Success: cancel/error paths never alter existing data; export and validated import provide a complete
round trip.

### J6 — Install and work offline

1. When the browser exposes an install prompt, Settings shows **Install Focus Garden**. Dismissal is
   respected; no repeated modal appears.
2. Where browser install UI is unavailable, explain: “Use your browser menu to install this app.”
   Do not imply an unsupported action.
3. The cached app opens offline. An **Offline · changes saved on this device** status appears and all
   timer, garden, theme, and data-management actions continue to work.
4. If the first-ever load has no cached assets and no connection, browser-level failure is outside
   the app; never show a fake in-app recovery.

Success: after one successful online load, reload and core flows need no network requests.

## Flow and state specification

### F1. Configure and run focus/break timers

- Presets are a single-select group: **25 focus · 5 break**, **50 · 10**, **15 · 3**. Their accessible
  names include both durations. Selection cannot change while running or paused.
- Task label is optional, maximum 80 characters after trimming; show a count at 64+ characters.
  Blank/whitespace saves as no label. Text is always rendered as text, never markup.
- Timer modes are `ready → running ⇄ paused → completed`; reset returns to `ready`. Focus completion
  adds one plant; break completion does not.
- The visible `MM:SS` derives from an absolute end time, not interval counts. When hidden/reopened,
  elapsed wall time is reconciled. Completion has an idempotent session ID.
- Control labels are literal and stable: **Start focus**, **Pause**, **Resume**, **Reset**, **Start
  5-minute break**, **Start another focus**.
- Chime failure does not block completion. Sound defaults on, with a plainly labeled mute toggle.

### F2. Completion reward

- Dialog heading: **A new [plant name] grew**. Body: **25 focused minutes · Draft project outline**.
  No label becomes **25 focused minutes**.
- Animation is one orchestrated 600 ms stem-to-bloom transition. With reduced motion it is an
  immediate cross-fade/no transform. Chime and motion are never the only completion indicators.
- Closing the dialog leaves the completed state with **View garden** and **Start break** actions.

### F3. Garden and habit summary

- “This week” is the local calendar week, Monday 00:00 through Sunday 23:59:59. Imported timestamps
  display in the device's current locale/time zone.
- A focus day contains one or more completed focus sessions. Current streak is consecutive local
  calendar days with at least one session; if today is empty, yesterday may anchor the current
  streak so it does not drop at midnight before the person has had a chance to focus.
- Empty copy: **Your first plant starts here. Finish a focus session to grow one.** Action:
  **Start a focus session**.
- Days with no plants show a labeled, quiet soil marker and “No sessions”; they are not marked
  failed. A large day may collapse visually to the first five plants plus **+N more**, which opens
  that day's accessible list.
- Plant popovers are non-modal disclosures on desktop and bottom sheets on small screens, triggered
  by click, Enter, or Space. Hover may mirror but never exclusively expose content.

### F4. Theme and sound preferences

- Theme is a radio group with text names and three small, non-essential swatches. Selected state has
  a check icon and text, not color alone.
- User selection overrides system preference. System dark preference only influences first launch.
- Native controls receive matching `color-scheme`; themes do not alter content, dimensions, or plant
  identity. See `focus-garden-themes.md`.
- Sound toggle exposes **Completion sound, on/off** to assistive technology.

### F5. Data management

- Export contains schema version, preferences, sessions/plants, and active timer if present; it
  excludes device/browser identifiers. Filename: `focus-garden-YYYY-MM-DD.json`.
- Import has four phases: `idle → reading → valid/invalid → replacing → success`. Disable the confirm
  action while replacing. Files must be valid JSON, supported schema, structurally valid, and within
  an implementation-defined safety limit documented in the PRD.
- Import error copies:
  - malformed: **This file isn’t valid JSON. Choose a Focus Garden export and try again.**
  - unsupported: **This export uses a version this app can’t read. Update Focus Garden or choose a
    different file.**
  - invalid content: **This file doesn’t contain a valid Focus Garden. Your current garden is unchanged.**
  - read/storage failure: **The file couldn’t be imported. Your current garden is unchanged. Try again.**
- Clear confirmation body: **This permanently removes [N] plants, your preferences, and any current
  timer from this device. Export first if you want a backup.** Destructive button is not default
  focused.

### F6. Offline/install/privacy

- `online/offline` status uses a polite live region once per transition, not on every render.
- Offline is informational. Storage failure is an error because persistence is compromised.
- Privacy copy: **No account. No ads. No tracking. Your garden stays in this browser unless you
  export it.**
- There are no runtime third-party requests. Install affordance appears only when actionable; an
  instructional fallback is non-button text.

## Cross-flow interaction, error, and empty states

| State | Presentation and recovery |
|---|---|
| First use / empty garden | Focus remains fully configured at 25/5. Garden invitation links back to Focus. Metrics show `0 min` and `0 days`, never blank or `--`. |
| App initialization | Render a stable shell and “Preparing your garden…” status only while local data is read; do not expose controls that could overwrite it. |
| Local data corrupt | Preserve raw storage where feasible, start an in-memory safe state, and show **Garden data couldn’t be read. Import a backup or clear local data to start again.** |
| Storage quota/unavailable | Timer works in the tab; persistent error explains that new progress will not survive closing. Offer Export if existing readable data is present. |
| Background timer | Reconcile from timestamps on visibility/focus. Never replay a chime repeatedly or add more than one plant. |
| Chime blocked/unavailable | Show normal completion visuals. Optional inline note: **Completion sound couldn’t play.** |
| Import reading/replacing | Inline progress text; chooser and destructive controls disabled only during the operation. Existing data remains until an atomic validated replacement succeeds. |
| Import invalid/cancelled | Specific inline error is associated with the file field; focus moves to the error heading. Cancel makes no announcement beyond dialog closure. |
| Export failure | **Your garden couldn’t be exported. Try again.** Existing data is unaffected. |
| No install capability | Do not show a disabled install button; show browser-menu guidance in Settings. |
| Offline | Informational chip; no blocking banner and no disabled local features. |
| No sessions on a weekday | Bare soil plus “No sessions”; avoid broken-streak imagery or loss language. |

## Accessibility contract

- Meet WCAG 2.1 AA: text contrast at least 4.5:1, large text/UI graphics at least 3:1. Theme
  reference combinations are measured in `focus-garden-themes.md`.
- Everything works at 320 CSS px reflow and 200% zoom without two-dimensional scrolling (the target
  layout is optimized from 360 px). Touch targets are at least 44×44 CSS px with 8 px separation.
- Use semantic landmarks, one `<h1>`, real buttons/inputs/radios, and a skip link. Visible focus is a
  3 px outline with 2 px offset and is never clipped.
- Logical focus order follows the visual order. Opening a dialog focuses its heading or first safe
  control; Escape closes; focus returns to the trigger. Modal background is inert.
- The visual timer updates each second, but its live region does not. Announce start/pause/resume,
  five minutes remaining, one minute remaining, and completion. The timer has an accessible name
  such as “24 minutes 32 seconds remaining.”
- Completion uses a concise assertive announcement once: “Focus complete. A fern grew.” Other
  statuses are polite. Avoid stacked announcements.
- Plants have meaningful button names (“Fern, Monday at 10:32 AM, 25 minutes”). Illustrations and
  progress arcs are decorative when equivalent text exists.
- Do not require hover, drag, sound, fine pointer precision, or memorized shortcuts. Browser and
  assistive-technology shortcuts remain untouched.
- Respect `prefers-reduced-motion: reduce`: no growth/arc interpolation, parallax, pulsing, or smooth
  scroll. Respect forced-colors with system colors, borders, and non-color selected indicators.
- Error text identifies the problem and recovery; errors are programmatically associated with their
  controls. Do not erase label input after a recoverable error.

## Acceptance-ready UX notes

These notes are intended to become verifiable PRD/prototype criteria.

| ID | Flow | Acceptance note |
|---|---|---|
| UX-01 | First launch | Given no saved preferences, Focus loads with 25/5 selected, an empty optional label, sound on, and Start focus available; dark system preference chooses Midnight, otherwise Botanical. |
| UX-02 | Start/pause/resume | Starting changes mode and control labels without changing the chosen duration/label; pause freezes the display; resume continues from the saved remainder. All actions work by keyboard. |
| UX-03 | Reset | Reset after elapsed time requires confirmation; cancel retains exact state; confirm creates no plant/minutes and returns to ready. |
| UX-04 | Completion | Reaching zero records exactly one plant and focus-minute total, presents text/visual completion, optionally sounds once, and offers break or Garden. |
| UX-05 | Break | Starting and finishing the preset break creates no plant and ends with an explicit Start another focus action; timers never auto-start. |
| UX-06 | Recovery | Reload/background reconciliation uses elapsed wall time and never duplicates completion; unavailable storage exposes the non-persistence warning while preserving in-tab timer use. |
| UX-07 | Garden | Garden groups current local Monday–Sunday sessions chronologically, calculates total minutes/streak as defined, and exposes every plant’s name, local completion time, minutes, and label/no-label to pointer and keyboard users. |
| UX-08 | Empty garden | With no sessions, Garden shows zero-valued metrics, neutral empty copy, and Start a focus session; it does not render blank/broken content. |
| UX-09 | Theme | Each named theme can be selected from a labeled radio group, meets documented contrast, applies without layout change, and persists; explicit choice overrides system preference. |
| UX-10 | Sound | The labeled sound toggle persists and completion remains visually/programmatically evident when muted or playback fails. |
| UX-11 | Export | Export produces a versioned, device-identifier-free JSON download named by local date and representing preferences, timer, and full garden state. |
| UX-12 | Import | Only a valid supported export reaches replace confirmation; preview shows plant count/date range; cancel or any error leaves current data byte-for-byte unchanged; confirm atomically replaces it and reports success. |
| UX-13 | Clear | Clear names its scope and count, is not default focused, supports cancel without mutation, and on confirm removes timer/garden/preferences and returns to first-use state. |
| UX-14 | Offline/PWA | After an online load, Focus, Garden, themes, and data tools reload and function offline; status says local changes are saved. Install is offered only when supported, otherwise accurate guidance appears. |
| UX-15 | Responsive | At 360, 768, and 1280 px, primary actions and timer remain visible in logical order, no content overlaps or causes page-level horizontal scroll, and plant details adapt from sheet to popover. |
| UX-16 | Accessibility | All flows complete with keyboard and screen reader semantics; focus is visible/restored; status announcements are bounded; 200% zoom, reduced motion, forced colors, sound-off use, and 44 px targets retain equivalent operation. |
| UX-17 | Privacy | Runtime makes no third-party requests or telemetry calls and Settings accurately states browser-local storage and export behavior. |

## Assumptions, risks, and Product Owner questions

### Decisions made for v1

- A week starts Monday; current streak may be anchored by yesterday until today has a session.
- Import replaces rather than merges, avoiding hard-to-explain duplicates.
- Breaks and subsequent focus sessions require explicit starts.
- Growth is a completion transition; each completed focus produces one final random plant.
- Theme/system behavior and responsive navigation are defined above.

### Risks

- Browser timer throttling, clock changes, and repeated reopen events can duplicate rewards unless the
  implementation uses persisted absolute time plus an idempotent session ID.
- `localStorage` can be unavailable or too small; the non-persistent mode and atomic imports require
  deliberate implementation and tests.
- “Random plant” can make the reward inaccessible if identity relies on illustration; textual names
  and deterministic stored identity are required.
- Streaks can undermine the gentle positioning. Neutral language and yesterday anchoring reduce but
  do not remove this risk; validate with habit builders.
- PWA install UI differs by browser, especially iOS. Avoid custom instructions that become stale.

### Open questions (not blockers for T-001/T-002)

1. Which plant species set and illustration technique are feasible for production? Prototype with
   6–8 original geometric species and generic names.
2. What import size ceiling is safe across target devices? Architecture/PRD must define and test it.
3. Should week-start follow locale in a later release? v1 deliberately uses Monday for consistency.

