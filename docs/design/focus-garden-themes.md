# Focus Garden visual direction and theme tokens

## Exploration and choice

The visual study used the `frontend-design` craft process and adapted the selected Theme Factory
references—Botanical Garden, Golden Hour, and Midnight Galaxy (renamed and product-adapted as
**Midnight Garden**) rather than copying presentation colors directly.

### Directions explored

1. **Herbarium ledger** — pressed-specimen labels, rules, and archival serif type. It makes plant
   details legible but feels like a static collection and places too much visual weight on history.
2. **Greenhouse instrument** — a precise timer treated as a garden instrument, surrounded by quiet
   labels and a weekly soil bed. It balances “start now” utility with an organic reward and works in
   all three palettes.
3. **Illustrated allotment** — dense, playful beds and oversized plant characters. It is warm but
   risks childishness, visual noise, and inaccessible target density.

**Chosen: Greenhouse instrument.** The interface is calm and functional; restraint around one
organic timer gesture makes it recognizable without turning every panel into garden decoration.
Unlike a generic cream/serif wellness dashboard, the structure is anchored by timer instrumentation,
calendar beds, and botanical specimen labels that carry real information.

## Signature visual element: the Seed Dial

The timer is encircled by a single SVG **growth ring**: a fine stem traces the remaining-time arc and
ends in a seed/bud marker. On successful focus completion, the bud opens once into the earned plant;
the completion dialog then shows the full specimen. It expresses effort becoming growth and makes
the timer identifiable in silhouette.

- The ring is progress, not the sole source of time; centered `MM:SS` and mode text are primary.
- It uses semantic `timer-track` and `timer-progress` tokens, not a gradient.
- One 600 ms completion transition is the sole expressive motion. Pausing freezes it. Reduced-motion
  mode changes state instantly with no path interpolation.
- The SVG is `aria-hidden`; text exposes state. In forced colors, a 2 px system-color ring and bud
  remain visible.
- No decorative vines, floating particles, glass cards, or gradients compete with it.

## Typography, shape, and imagery

- **Display:** Georgia, `Iowan Old Style`, `Palatino Linotype`, serif. Use only for the timer numerals,
  plant names, and page title; its old-style figures evoke field notes without requiring a download.
- **Body:** `Aptos`, `Segoe UI`, system-ui, sans-serif for forms and reading.
- **Utility/data:** `Cascadia Mono`, `SFMono-Regular`, Consolas, monospace for eyebrow labels, dates,
  durations, and counts. This gives the instrument direction a specific technical counterpoint.
- Runtime uses system font stacks: offline-safe, no third-party font requests, and no layout shift.
- Sentence case throughout. Uppercase is limited to short utility eyebrows with 0.08 em tracking.
- Corners: 6 px controls, 10 px panels, 999 px only for status chips. Shadows are subtle and reserved
  for modal/popover elevation. Cards use borders rather than “floating glass.”
- Plants should be original geometric SVG specimens with shared stroke weight and named species.
  Their silhouette, label, and day placement—not color—carry identity.

## Shared scales

```css
:root {
  --font-display: Georgia, "Iowan Old Style", "Palatino Linotype", serif;
  --font-body: Aptos, "Segoe UI", system-ui, sans-serif;
  --font-data: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-md: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.75rem;
  --text-display: clamp(3.5rem, 12vw, 7rem);
  --leading-tight: 1.1;
  --leading-body: 1.55;

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;

  --radius-control: 0.375rem;
  --radius-panel: 0.625rem;
  --radius-pill: 999px;
  --border-thin: 1px;
  --border-strong: 2px;
  --focus-width: 3px;
  --focus-offset: 2px;
  --target-min: 44px;
  --content-max: 75rem;
  --reading-max: 68ch;
  --motion-fast: 120ms;
  --motion-state: 220ms;
  --motion-grow: 600ms;
  --ease-standard: cubic-bezier(.2, .8, .2, 1);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-fast: 0ms;
    --motion-state: 0ms;
    --motion-grow: 0ms;
  }
}
```

## Complete semantic theme sets

All application CSS consumes semantic names; never reference palette names inside components.
`on-*` tokens are the only text/icons allowed over their paired action/status fill. Marigold and
other bright accents are deliberately reserved for non-text plant detail or paired with dark ink.

### Botanical Garden (default light)

Adaptation: Theme Factory fern green, marigold, terracotta, and cream become a quieter greenhouse
palette with deeper action colors for AA contrast.

```css
[data-theme="botanical"] {
  color-scheme: light;
  --canvas: #F4F1E8;
  --surface: #FFFCF5;
  --surface-raised: #FFFFFF;
  --surface-sunken: #E6E8DC;
  --text: #183229;
  --text-muted: #53635C;
  --border: #A8B2A8;
  --border-strong-color: #66786D;
  --action: #285B3A;
  --on-action: #FFFFFF;
  --action-hover: #1F492F;
  --action-soft: #D8E6D8;
  --on-action-soft: #183229;
  --accent: #9A4A21;
  --on-accent: #FFFFFF;
  --plant-highlight: #F9A620;
  --focus-ring: #8A3B15;
  --success: #2D6A44;
  --on-success: #FFFFFF;
  --warning: #765100;
  --on-warning: #FFFFFF;
  --danger: #9F2F2B;
  --on-danger: #FFFFFF;
  --info: #285B64;
  --on-info: #FFFFFF;
  --soil: #8A6247;
  --timer-track: #C9D0C5;
  --timer-progress: #285B3A;
  --shadow: 24 50 41;
}
```

### Golden Hour (warm light)

Adaptation: the reference mustard, terracotta, beige, and chocolate become sun-warmed paper and
clay. Mustard is a highlight, while a deeper umber handles interactive contrast.

```css
[data-theme="golden"] {
  color-scheme: light;
  --canvas: #FFF5DE;
  --surface: #FFFBF2;
  --surface-raised: #FFFFFF;
  --surface-sunken: #F1DFC4;
  --text: #3B2B22;
  --text-muted: #66564E;
  --border: #BDAA92;
  --border-strong-color: #786654;
  --action: #7A3E22;
  --on-action: #FFFFFF;
  --action-hover: #61301B;
  --action-soft: #F2D6B0;
  --on-action-soft: #3B2B22;
  --accent: #8B4B54;
  --on-accent: #FFFFFF;
  --plant-highlight: #F4A900;
  --focus-ring: #235E72;
  --success: #426334;
  --on-success: #FFFFFF;
  --warning: #795000;
  --on-warning: #FFFFFF;
  --danger: #982E2E;
  --on-danger: #FFFFFF;
  --info: #235E72;
  --on-info: #FFFFFF;
  --soil: #8A573C;
  --timer-track: #DCC9AD;
  --timer-progress: #7A3E22;
  --shadow: 59 43 34;
}
```

### Midnight Garden (dark)

Adaptation: Midnight Galaxy's deep purple, cosmic blue, lavender, and silver are shifted from a
space theme into moonlit aubergine foliage and warm night-blooming gold.

```css
[data-theme="midnight"] {
  color-scheme: dark;
  --canvas: #181326;
  --surface: #241C35;
  --surface-raised: #2E2442;
  --surface-sunken: #120F1D;
  --text: #F3EFFA;
  --text-muted: #C4B9D4;
  --border: #625575;
  --border-strong-color: #9384A8;
  --action: #D8B85D;
  --on-action: #21192E;
  --action-hover: #E8C96D;
  --action-soft: #45395C;
  --on-action-soft: #F3EFFA;
  --accent: #AFA1D4;
  --on-accent: #21192E;
  --plant-highlight: #FFD36A;
  --focus-ring: #FFD36A;
  --success: #8DD6A7;
  --on-success: #14251A;
  --warning: #F1CB7A;
  --on-warning: #281E0B;
  --danger: #FFB4A9;
  --on-danger: #32110E;
  --info: #AFC9FF;
  --on-info: #14203A;
  --soil: #A98168;
  --timer-track: #514662;
  --timer-progress: #D8B85D;
  --shadow: 0 0 0;
}
```

### Required component mapping

| Component/state | Token use |
|---|---|
| Page / panel / inset | `canvas` / `surface` / `surface-sunken` |
| Default / secondary text | `text` / `text-muted` |
| Primary button | `action` + `on-action`; hover uses `action-hover` |
| Secondary/selected preset | `action-soft` + `on-action-soft`, 2 px `action` border, check/radio marker |
| Destructive action | `danger` + `on-danger`; never use danger only as text below 4.5:1 |
| Informational offline chip | transparent or `surface-sunken`, icon + text + `info` border |
| Focus | 3 px `focus-ring` outline with 2 px canvas offset; forced colors uses `Highlight` |
| Timer | `timer-track`, `timer-progress`, textual `text`; paused adds “Paused,” not color alone |
| Garden bed | `surface-sunken`, `soil`, day labels in `text`; plant fills may use highlight/accent |
| Modal/popover | `surface-raised`, `border`, shadow at 12% using `shadow` RGB |

Disabled controls retain readable text at full contrast and use reduced border/fill contrast plus
`not-allowed` only where appropriate; opacity is not applied to an entire component. Hover is an
enhancement and has an equivalent focus/selected state.

## Contrast evidence

Ratios were calculated with the WCAG relative-luminance formula against the intended background.
These are design-review checks, not a substitute for browser testing in the prototype.

| Theme | Pair | Ratio |
|---|---|---:|
| Botanical | text / canvas | 12.18:1 |
| Botanical | text-muted / canvas | 5.62:1 |
| Botanical | on-action / action | 7.93:1 |
| Botanical | danger / surface | 7.03:1 |
| Botanical | focus-ring / canvas | 6.84:1 |
| Golden | text / canvas | 12.46:1 |
| Golden | text-muted / canvas | 6.44:1 |
| Golden | on-action / action | 8.27:1 |
| Golden | danger / surface | 7.35:1 |
| Golden | focus-ring / canvas | 6.64:1 |
| Midnight | text / canvas | 15.98:1 |
| Midnight | text-muted / canvas | 9.69:1 |
| Midnight | on-action / action | 8.80:1 |
| Midnight | danger / surface | 9.56:1 |
| Midnight | focus-ring / canvas | 12.74:1 |

Borders and non-text progress indicators must remain at least 3:1 against adjacent surfaces.
Decorative plant highlight colors are exempt only when they communicate no state or identity.

## Visual acceptance notes

1. All three themes implement every semantic token above; switching theme changes no spacing,
   typography metrics, content, focus position, or control state.
2. The Seed Dial is the only expressive animated element and accurately mirrors remaining time;
   reduced-motion mode is immediate and equivalent.
3. Timer numerals are the highest-emphasis type, primary actions are second, and stats never compete
   with the current-session job.
4. No component depends on gradient, blur/glass, remote font, photograph, or color alone.
5. At 360 px, the dial and primary action fit without horizontal scrolling; at wide sizes the layout
   follows the 7/5 split rather than expanding a centered generic card.
6. Focus, selected preset/theme, running/paused, offline, error, and destructive states each have a
   non-color cue.

