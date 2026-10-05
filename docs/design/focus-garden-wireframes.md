# Focus Garden responsive wireframes

These wireframes define hierarchy and behavior, not final decoration. Bracketed labels are controls;
parenthetical text is annotation. The visual language and tokens are in
`focus-garden-themes.md`.

## Layout rules

- **Compact:** 320–767 px. One column, 16 px gutters, bottom navigation; content order is timer,
  controls, optional context.
- **Medium:** 768–1023 px. Header navigation, timer and session controls in a centered 8-column
  region; Garden uses seven columns.
- **Wide:** 1024 px and above. Max content width 1200 px. Focus becomes a 7/5 split: timer left,
  session setup/status right. Do not stretch cards to viewport edges.
- The header and bottom navigation are not both present. Bottom navigation reserves safe-area inset.
- At narrow heights, content scrolls normally; primary controls are not sticky over form fields.

## Focus — compact (360 px)

```text
┌────────────────────────────────────┐
│ [Skip to content]                  │
│ Focus Garden       [Theme] [Settings]
│ Offline · saved here (when needed)│
├────────────────────────────────────┤
│ FOCUS                              │
│ What will you tend?                │
│ Task label (optional)              │
│ [ Draft project outline________ ]  │
│                                    │
│ Session length                     │
│ [● 25/5] [○ 50/10] [○ 15/3]       │
│                                    │
│            ╭──────────╮            │
│         🌱 │  24:32   │  (seed dial)
│            │  Focus   │            │
│            ╰──────────╯            │
│         [ Start focus ]            │
│       [Sound on]   [Reset]         │
│                                    │
│ Your garden stays on this device.  │
├────────────────────────────────────┤
│ [Focus · selected]     [Garden]    │
└────────────────────────────────────┘
```

Running/paused replaces setup controls with a read-only session summary so nothing shifts above the
dial. Primary controls become `[Pause]` or `[Resume]`; `[Reset]` stays secondary. Preset and label
appear disabled with explanatory text “Available after this session.”

## Focus — wide (1280 px)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Focus Garden      [Focus] [Garden]              [Theme ▾] [Settings]     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  FOCUS / TODAY                         PREPARE THIS SESSION               │
│  What will you tend?                   Task label (optional)             │
│                                        [ Draft project outline_______ ]  │
│          ╭────────────────╮            Session length                    │
│       🌱 │     25:00      │            [● 25/5] [○ 50/10] [○ 15/3]      │
│          │     Focus      │                                                │
│          ╰────────────────╯            [ Start focus ]                   │
│       growth-ring seed dial            [Sound on] [Reset]                │
│                                                                          │
│  Privacy note / active status          Next: a 5-minute break            │
└──────────────────────────────────────────────────────────────────────────┘
```

At medium width this becomes one column in the same reading order as compact. The large timer is
never visually below data/settings controls.

## Active and completion states

```text
ACTIVE / PAUSED                         COMPLETION DIALOG
╭──────────────────╮                   ┌───────────────────────────────┐
│      18:42       │                   │ A new fern grew               │
│  Focus · running │                   │        (plant artwork)        │
╰──────────────────╯                   │ 25 focused minutes            │
[ Pause ] [ Reset ]                    │ Draft project outline         │
Status: Sound on                       │ [Start 5-minute break]         │
Task: Draft project outline            │ [View garden]        [Close]  │
                                       └───────────────────────────────┘
```

Completion dialog actions stack full width at 360 px. On close, the underlying completion panel
retains both next actions. The plant artwork is decorative beside equivalent text.

## Garden — compact (360 px)

```text
┌────────────────────────────────────┐
│ Focus Garden       [Theme] [Settings]
├────────────────────────────────────┤
│ THIS WEEK                         │
│ Your garden                       │
│ ┌────────────┐ ┌────────────────┐ │
│ │ 3-day      │ │ 125 min        │ │
│ │ streak     │ │ focused        │ │
│ └────────────┘ └────────────────┘ │
│                                    │
│ Mon  [plant] [plant]               │
│ Tue  bare soil · No sessions       │
│ Wed  [plant] [plant] [+2 more]     │
│ Thu  Today · bare soil             │
│ Fri  Upcoming                      │
│ Sat  Upcoming                      │
│ Sun  Upcoming                      │
│                                    │
│ Plant buttons follow date order.   │
├────────────────────────────────────┤
│ [Focus]              [Garden · selected]
└────────────────────────────────────┘
```

Compact uses a vertical day list rather than squeezing seven columns. Future days are labeled
“Upcoming,” not empty/failures.

## Garden — wide (1280 px)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Focus Garden      [Focus] [Garden]              [Theme ▾] [Settings]     │
├──────────────────────────────────────────────────────────────────────────┤
│ THIS WEEK / OCT 5–11                     [3-day streak] [125 min focused]│
│ Your garden                                                             │
│ ┌────────┬────────┬────────┬────────┬────────┬────────┬────────┐          │
│ │ MON 5  │ TUE 6  │ WED 7  │ THU 8  │ FRI 9  │ SAT 10 │ SUN 11 │          │
│ │ 🌿 🌱  │  soil  │ 🌻 🌿  │today   │upcoming│upcoming│upcoming│          │
│ │        │        │ 🌱 +2  │ soil   │        │        │        │          │
│ └────────┴────────┴────────┴────────┴────────┴────────┴────────┘          │
│                                                                          │
│ (focused plant anchors popover)                                          │
│                          ┌──────────────────────────┐                     │
│                          │ Fern                    ×│                     │
│                          │ Wed, Oct 7 · 10:32 AM    │                     │
│                          │ 25 focused minutes       │                     │
│                          │ Draft project outline    │                     │
│                          └──────────────────────────┘                     │
└──────────────────────────────────────────────────────────────────────────┘
```

At 200% zoom this reflows to the compact vertical list rather than horizontally scrolling the week.

## Empty Garden

```text
                (single seed in a quiet soil line)
                  Your first plant starts here.
            Finish a focus session to grow one.
                    [Start a focus session]

                 0-day streak · 0 min focused
```

The empty artwork is decorative. Focus moves to the Focus heading after following the action.

## Settings and data — compact sheet / wide dialog

```text
┌──────────────────────────────────────────┐
│ Settings                              [×]│
│ THEME                                    │
│ (●) Botanical Garden   [swatches]        │
│ ( ) Golden Hour        [swatches]        │
│ ( ) Midnight Garden    [swatches]        │
│                                          │
│ SOUND                                    │
│ Completion sound                  [On]   │
│                                          │
│ YOUR DATA                                │
│ Stored only in this browser on this device.
│ [Export garden]  [Import garden]         │
│ [Clear all data]                         │
│                                          │
│ INSTALL                                  │
│ [Install Focus Garden] (only if actionable)
│ or browser-menu guidance                 │
│ No account. No ads. No tracking.         │
└──────────────────────────────────────────┘
```

At compact widths it is a full-height modal sheet; at wide widths it is a max-640 px modal. Sections
retain this order. Destructive action is separated from import/export by space and explanatory copy.

## Import replace sequence

```text
1 CHOOSE                   2 VALID PREVIEW               3 RESULT
Import garden              Ready to replace?             Garden imported
[Choose JSON file]         18 plants · Sep 2–Oct 5       18 plants are now
                           Replaces 7 current plants.     in your garden.
                           [Replace my garden] [Cancel]   [View garden]

INVALID
Import garden
[bad-file.json]
! This file doesn’t contain a valid Focus Garden.
  Your current garden is unchanged.
[Choose another file]
```

The preview is required before replacement. Error is inline and announced; no separate generic toast
duplicates it.

## Reset and clear confirmations

```text
RESET SESSION                         CLEAR ALL DATA
Reset this session?                   Clear all data?
Its progress won’t be saved.          Permanently removes 18 plants,
[Keep focusing] [Reset session]       preferences, and current timer.
                                      [Export first] [Cancel] [Clear all data]
```

Cancel/keep is initially focused. Buttons preserve their text through the resulting confirmation:
“Session reset” and “All Focus Garden data cleared.”

## Responsive and implementation annotations

1. Content max width 1200 px; reading/form line length max 68 characters.
2. The dial is 240 px at 360 width, 320 px at ≥768, and 380 px at ≥1024; its textual time remains
   selectable and exposed independently of SVG.
3. Garden plant hit areas are minimum 44×44 px even when artwork is smaller. Dense days use +N rather
   than shrinking targets.
4. Popover placement may flip to stay on screen. Below 600 px, use a modal bottom sheet with explicit
   close; never let content clip under the bottom navigation.
5. Long labels wrap to two lines in summaries and fully in details; they do not widen the layout.
6. Dialogs cap at the viewport with internal vertical scrolling, a visible heading, and reachable
   close/action controls.
7. Browser text enlargement must not hide timer state or actions. No fixed content heights except
   minimum target dimensions.

