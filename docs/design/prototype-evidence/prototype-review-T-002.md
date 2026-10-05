# Prototype review — T-002

**Gate:** `prototype-review`  
**Prototype:** `prototype/index.html` (throwaway static HTML/CSS/JavaScript spike)  
**Verified:** 2026-10-05T14:11:59Z

## Method

Applied the installed `ait-product-prototype` and `ait-prototype-testing` procedures. The host did
not expose Playwright MCP browser tools to this agent, so the same browser-verification workflow was
run directly through the installed Playwright Node API against a real headless Chromium process.
No production test dependency or package manifest was added.

The durable runner is `verify-prototype.cjs`. It opens the local prototype with a `file:` URL,
drives controls by accessible label and role, emulates desktop, 360 px mobile, and reduced-motion
contexts, records console/page errors, makes assertions, and always closes the browser.

Final command:

```powershell
$env:PLAYWRIGHT_MODULE="$env:LOCALAPPDATA\npm-cache\_npx\9833c18b2d85bc59\node_modules\playwright"
$env:PW_CHROMIUM_EXE=(Get-ChildItem "$env:LOCALAPPDATA\ms-playwright\chromium_headless_shell-1223\chrome-headless-shell-win64\chrome-headless-shell.exe").FullName
node docs\design\prototype-evidence\verify-prototype.cjs
```

Result: exit code 0, seven checks passed.

## Browser evidence

| Criterion | Real-browser result | Evidence |
|---|---|---|
| Core timer | Start → running → pause → resume; reset cancel preserves the session; reset confirm returns ready and reports “Session reset.” | `playwright-results.json`: `desktop timer` |
| Completion | The prototype shortcut opens the completion reward with minutes and task. “View garden” adds the earned fern exactly once. | `playwright-results.json`: `completion and garden` |
| Garden/details | Weekly beds render; the earned plant is a named button; activating it exposes finished time, minutes, and full task text. | `desktop-garden.png` |
| Themes | Settings radio controls successfully apply Botanical Garden, Golden Hour, and Midnight Garden semantic token sets. | `playwright-results.json`: `themes` |
| Import and clear | Invalid sample shows an inline, non-destructive error; valid sample requires replacement preview; result confirms 18 plants. Clear supports cancel and confirmed result. | `playwright-results.json`: `data settings` |
| Responsive | At 1280×900, header navigation and seven beds are visible. At 360×800, header navigation is replaced by bottom navigation, the week stacks, settings fills the viewport, and body width does not overflow 360 px. | `desktop-garden.png`, `mobile-settings.png` |
| Keyboard/a11y smoke | Controls were located by accessible role/name; plant details are button-operated; the first Tab reaches “Skip to main content”; native modal dialogs constrain focus/escape behavior; textual status does not depend on sound or color. | Runner assertions and screenshots |
| Reduced motion | A Chromium context with `reducedMotion: "reduce"` computed `--motion-grow: 0ms` and an effectively instant `1e-06s` transition. | `playwright-results.json`: `reduced motion` |
| Console health | No console errors or uncaught page errors in desktop, mobile, or reduced-motion contexts. | `playwright-results.json`: `consoleErrors: []` |

## What the prototype proves

- The Greenhouse instrument hierarchy keeps the Seed Dial dominant on wide and compact layouts
  while moving session setup before it in compact reading order.
- One start action can become pause/resume without shifting the timer; label and preset lock during
  an active session with an explanation.
- Completion reward, weekly garden, and plant details form a coherent, short loop.
- Compact navigation and vertical day beds work at the required 360 px width without horizontal
  scrolling.
- The three approved themes work from both quick and settings controls with one semantic component
  mapping.
- Import preview and destructive confirmation add necessary friction without making routine data
  settings difficult to find.

## Deliberate spike boundaries

- Time is held rather than elapsed; **Preview completed session** avoids a 25-minute browser run.
- Sound does not play. Export reports the interaction state without writing a file.
- Import uses valid/invalid samples instead of the operating-system file picker.
- Seed garden data and dates are fixed. There is no localStorage, service worker, manifest, PWA
  installation, or offline implementation.
- Emoji stand in for the specified original geometric plant artwork.

These are visible and documented prototype simplifications, not production decisions. The
prototype must not be promoted into implementation.

## Spec-ready notes, assumptions, and risks

1. Specify timer completion as idempotent and derived from monotonic/end timestamps so returning
   from background cannot plant twice.
2. Preserve native-dialog-level focus containment, focus return, Escape behavior, and initially
   focused safe action for reset/clear.
3. Keep the compact breakpoint behavior: one bottom primary nav, vertical day list, full-height
   settings sheet, and at least 44×44 px plant targets.
4. Import requires schema validation, a replace preview with current/imported counts and range, and
   no mutation on invalid or cancelled imports. File-size and schema-version limits remain open.
5. Completion motion is the only expressive animation and must become instantaneous for reduced
   motion. Sound remains optional and never communicates status alone.
6. Production must replace emoji with original, non-color-dependent SVG species and verify all
   theme pairs with automated accessibility and contrast checks.
7. Product Owner should decide plant species count, import size limit, and whether a completed
   session’s close action leaves a persistent completion panel; none blocks the validated core
   flow.

## Gate result

The clickable prototype is runnable and stakeholder-validatable. Critical flows work in a real
headless browser, the responsive layouts pass at desktop and 360 px, the keyboard/accessibility
smoke and reduced-motion checks pass, and the captured console error count is zero.

### Gates — T-002
- prototype-review: passed

Verdict: PASS
