# T-012 integrated acceptance evidence

**Run:** `2026-10-05-focus-garden`  
**Date:** 2026-10-05  
**Result:** Automated acceptance passed after one product fix. The full corrected-PRD release
acceptance remains blocked on manual Safari and assistive-technology evidence that cannot be
produced on this Windows runner.

## Inputs reviewed

- Source brief: `specs/idea.md`
- Corrected PRD: `docs/product/focus-garden-v1-prd.md`
- Architecture and test strategy: `docs/architecture/focus-garden-technical-spec.md`
- Production implementation under `src/`, production configuration, workflow, unit tests, and
  browser tests

## Gate results

| Gate | Result | Durable evidence |
|---|---:|---|
| Production build | Pass | `evidence/qa/build.txt` |
| ESLint | Pass, zero warnings | `evidence/qa/lint.txt` |
| Prettier check | Pass | `evidence/qa/format.txt` |
| Full Vitest with coverage | Pass: 16 files, 147 tests; 92.07% statements, 88.75% branches | `evidence/qa/vitest.txt` |
| Playwright production build | Pass: 14 Chromium scenarios | `evidence/qa/playwright.txt` |
| Static PWA/installability/prototype separation | Pass | `evidence/qa/pwa-static.txt` |
| Dependency audit | Pass at the required high/critical threshold; zero high/critical, 20 moderate transitive development-tool findings | `evidence/qa/audit.txt` |
| Throttled Lighthouse | Pass: median performance 0.99, median FCP 1,355 ms | `evidence/qa/performance.txt`, `evidence/qa/performance-details.txt`, `evidence/lighthouse/run-{1,2,3}.json` |

The Lighthouse profile was mobile simulation at 360x800, device scale factor 2, simulated
throttling, three runs, on Windows 11 ARM64 / Snapdragon X 12-core. FCP values were 1,355, 1,347,
and 1,355 ms. Each run transferred 58,608 script bytes and 86,497 total bytes, with zero console
errors. This is below the 2,000 ms, 153,600-byte script, and 307,200-byte initial-transfer gates.
The local shell exposed Node 26.7.0 although `.nvmrc` pins Node 24; CI uses `.nvmrc`.

## Acceptance trace

| Acceptance area | Evidence and result |
|---|---|
| Focus, presets, label, pause/resume/reset/reload | Browser test exercises the exact 25/5 default and 50/10 pair, trimmed/locked label persistence, pause, reload recovery, resume, and confirmed reset. Exact preset and timer boundaries are also covered by Vitest. Pass. |
| Completion, idempotency, dialog, break | Browser test restores an expired 15-minute timer, verifies one durable reward across reload, initial dialog focus and Tab wrap, explicit 3-minute break, and unchanged session count during break. Unit tests cover concurrent/repeated completion and audio failure/mute. Pass. |
| Weekly garden, labels, details, totals, streak | Browser fixture verifies a two-day streak, 190 all-time minutes, Monday-boundary-aware weekly count, dense-day expansion, label details, and focus restoration. Calendar, DST, ordering, totals, and streak boundaries pass in Vitest. Pass. |
| Three themes | Botanical Garden, Golden Hour, and Midnight Garden are selected through the real dialog; each updates the root token set, retains task data, passes axe color-contrast analysis, and explicit preference survives reload. Pass. |
| Import/export/clear/rollback | Browser tests validate downloaded canonical JSON, preview/cancel without mutation, confirmed replacement, malformed-file preservation, quota-failure rollback, clear cancel, and confirmed removal. Vitest covers exact 1 MiB/10,000 limits, validation, migrations, XSS text, and repository failures. Pass. |
| Exact subpath and installability | All observed runtime requests remain same-origin and under `/ai-team-sdlc-sample-focus-garden/`. Manifest ID/start/scope, controlling worker scope, standard/maskable icons, precache, navigation fallback, and static output pass. Pass. |
| First load, offline, update, failure | Browser tests verify first online activation, controlled offline reload and timer start/pause, explicit waiting-worker update, and graceful registration rejection without a false offline-ready claim. Pass in Chromium. |
| Privacy and permissions | Request URL and body inspection while using a private test label found no cross-origin, out-of-subpath, or user-data request. Source inspection found no fetch/XHR/WebSocket/beacon or permission API; SVG namespace literals are non-network identifiers. Pass for exercised flows. |
| Reduced motion | Under `prefers-reduced-motion: reduce`, the production computed transition duration is `0s`; reward animation declarations are disabled by the matching production media rule. Pass. |
| 360px reflow | At a 360x800 production viewport, `documentElement.scrollWidth <= innerWidth`; the mobile plant-detail dialog remains operable. Pass. |
| Keyboard/dialog focus | Skip-link activation focuses `main` without changing the Garden route; completion focus enters the primary action and wraps; reset confirmation focuses its safe action; desktop/mobile plant details restore their trigger. Pass. |
| Accessibility smoke | Axe reports zero serious/critical WCAG A/AA violations on the production shell and zero serious/critical findings at 360px Garden state. All three themes have zero axe color-contrast violations. Pass for automated and keyboard inspection. |
| High/critical audit | `npm audit --audit-level=high` exits successfully with zero high/critical findings. Moderate findings are confined to Lighthouse/OpenTelemetry and Vitest development tooling and remain visible in the audit log. Pass at the specified threshold. |
| Production/prototype separation | `dist` has 22 files, zero prototype-named files, zero prototype path references, and no production npm dependencies. The generated Workbox library contains a help-link string but observed runtime traffic is same-origin only. Pass. |

## Defect found and remediated

The Garden skip link originally navigated to `#main-content`. The hash router treated that value as
an unknown application route and canonicalized it to `#focus`, so keyboard users silently left the
Garden when skipping to content. `src/ui/shell.ts` now prevents that hash mutation and focuses the
main landmark directly. `tests/shell.test.ts` and the 360px Playwright scenario prove route
retention and focus movement.

## Blocking manual evidence

The following corrected-PRD release criteria were not represented as automated success:

1. A representative screen reader across all P0 states was not available in this non-interactive
   run. Axe, the browser accessibility tree, semantic-name assertions, keyboard focus, and live
   region implementation are concrete supporting evidence, but they are not a substitute for an
   actual screen-reader session.
2. Current Safari offline/update behavior cannot be executed on this Windows 11 runner. Chromium
   first-load/offline/update behavior passed. Playwright WebKit would not constitute current Safari
   evidence.
3. The PRD's broader manual release matrix (200% zoom at 320 CSS pixels, forced colors, and
   current/previous supported browser majors) was not available as a human visual inspection.
   Automated 360px reflow, reduced motion, keyboard behavior, and theme contrast passed.

No automated product failure remains. Full release acceptance must stay blocked until these manual
checks are executed on suitable hardware/software and attached to this evidence set.
