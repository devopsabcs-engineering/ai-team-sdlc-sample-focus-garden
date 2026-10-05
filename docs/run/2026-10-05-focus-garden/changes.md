# Changes — 2026-10-05-focus-garden

Append-only consolidated file-change log.

## 2026-10-05 — T-001 · ait-product-designer

- Added `docs/design/focus-garden-experience.md` with journeys, states, accessibility contracts, copy, and UX acceptance notes.
- Added `docs/design/focus-garden-wireframes.md` with compact-to-wide responsive flows.
- Added `docs/design/focus-garden-themes.md` with explored directions, semantic tokens, and all three named themes.
- Added `docs/design/design-review-T-001.md` with passing design-review evidence.

## 2026-10-05 — T-002 · ait-product-designer

- Added the disposable clickable prototype at `prototype/index.html` and usage notes at `prototype/README.md`.
- Added a durable Playwright runner, JSON results, desktop/mobile screenshots, and passing prototype-review report under `docs/design/prototype-evidence/`.
- Verified seven browser checks at 1280×900 and 360×800 with no console or page errors.

## 2026-10-05 — T-003 · ait-product-owner

- Added `docs/product/focus-garden-v1-prd.md`.
- Added `evidence/spec-review/T-003-focus-garden-v1-prd.md`.
- Corrected the first draft's source-scope regressions and added complete brief-to-PRD traceability before passing `spec-review`.

## 2026-10-05 — T-004 · ait-architect

- Added `docs/architecture/focus-garden-technical-spec.md`.
- Added ADRs 0001–0004 for modular TypeScript, canonical local persistence, idempotent wall-clock completion, and scoped prompted PWA updates.
- Added `evidence/spec-review/T-004-focus-garden-architecture.md` with passing P0 traceability.

## 2026-10-05 — T-005 · ait-frontend-dev

- Created the independent production Vite + strict TypeScript application, tooling, semantic shell, exact Pages base, responsive approved visual system, and three CSS-variable themes.
- Added foundation router/theme/shell tests; build, lint/format, 15 unit tests, high-severity audit, and exact-base preview smoke passed.

## 2026-10-05 — T-006 · ait-frontend-dev

- Added strict schema-v1 validation, codec, migration registry, canonical localStorage repository, typed persistence failures, fixtures, and theme integration.
- Build, lint/format, 71 unit tests, and high-severity audit passed.

## 2026-10-05 — T-007 · ait-frontend-dev

- Added the wall-clock paired timer state machine, exact presets, bounded label, pause/resume/reset, reload/visibility reconciliation, announcements, UI integration, and typed test seams.
- Build, lint/format, 96 unit tests, and high-severity audit passed.

## 2026-10-05 — T-008 · ait-frontend-dev

- Added durable idempotent completion, unbiased testable random species, original accessible SVG rewards, reduced-motion growth, focus-managed modal, persisted mute/chime behavior, and explicit non-rewarding breaks.
- Build, lint/format, 111 unit tests, and high-severity audit passed.

## 2026-10-05 — T-009 · ait-frontend-dev

- Added DST-safe weekly grouping, today/yesterday streak anchoring, totals, responsive themed garden beds, dense/empty states, and accessible desktop/mobile plant details.
- Build, lint/format, 121 unit tests, and high-severity audit passed.

## 2026-10-05 — T-010 · ait-frontend-dev

- Added strict bounded JSON export/import with preview and atomic replacement, rollback-safe clear, storage/download/file-picker error handling, accessible settings controls, and XSS-safe rendering.
- Build, lint/format, 142 unit tests, and high-severity audit passed.

## 2026-10-05 — T-011 · ait-frontend-dev

- Added manifest, original icons, generated scoped service worker, offline/update UI, static PWA checks, Playwright and Lighthouse harnesses, and a future governance-gated Pages workflow.
- Build, lint/format, 146 unit tests, five browser flows, static checks, high/critical audit, and throttled Lighthouse passed; median FCP was 1.33 seconds.

## 2026-10-05 — T-012 · ait-qa-test

- Added full integrated acceptance browser coverage and durable evidence under `evidence/qa/`.
- Fixed Garden skip-link routing so keyboard users remain on the Garden route while focus moves to the main landmark.
- Automated acceptance passed; the task remains blocked on environment-bound manual evidence.

## 2026-10-05 — T-013 · ait-code-reviewer / ait-frontend-dev

- Critic review identified a blocking Done/Escape completion-state transition defect.
- Updated `src/app/app-controller.ts` and `src/domain/completion.ts` so dismissal atomically clears the active timer while retaining the durable session and selected preset.
- Added regression coverage in `tests/app-controller.test.ts` and `tests/completion.test.ts` for Done, Escape, reload durability, atomic persistence, and persistence failure.
- Build, lint, format check, 150 tests, 14 Chromium browser scenarios, static PWA checks, and the high-severity audit threshold passed; the rerun critic-review gate passed.

## 2026-10-05 — T-014 · ait-security-rai

- Completed SAST/code-path, secret, dependency/SCA, lockfile/supply-chain, workflow, local-data privacy, import threat, PWA/offline/update, and Responsible-AI review.
- Security passed with no blocker; 150 tests, 14 Chromium scenarios, PWA checks, build, lint/format, performance, and the high-severity audit threshold were green.
- Retained two moderate development-only advisory families and documented local plaintext/browser-origin and habit-reinforcement limitations as non-blocking residual risks for human sign-off.
## 2026-10-05 — T-015 requested-change implementation

- Replaced malformed plant SVG geometry and added stable species metadata in `src/ui/plant-art.ts`.
- Added six distinct, theme-aware species palettes and larger garden/completion sizing in `src/styles/components.css`.
- Added input-modality-aware main-route focus behavior in `src/app/app-controller.ts`, `src/ui/shell.ts`, and `src/styles/base.css`.
- Added unit and production-browser regression coverage in `tests/plant-art.test.ts`, `tests/e2e/plant-art-focus.spec.ts`, and `tests/e2e/acceptance.spec.ts`.
- Build, lint, format check, 157 unit tests, and three focused Chromium regressions passed.

## 2026-10-05 — T-015 route-focus retry

- Reworked route modality tracking in `src/app/app-controller.ts` so only a causal Enter-key/link-click sequence is classified as keyboard navigation; pointer and scripted hash changes are programmatic.
- Refined main-region focus styling in `src/styles/base.css` and added controller regression coverage in `tests/app-controller.test.ts`.
- Build, lint, format check, 159 unit tests, focused route and plant-art suites, and all 16 E2E scenarios passed.

## 2026-10-05 — T-019 lockfile reproducibility repair

- Added exact npm overrides in `package.json` for `@paulirish/trace_engine` transitive dependencies `third-party-web@0.29.2` and `legacy-javascript@0.0.1`, containing mutable `latest` edges while retaining existing exact lock records.
- Under Node 24.17.0/npm 11.11.1, clean `npm ci`, build, lint, format check, 159 unit tests, high-severity audit, PWA checks, and all 16 serial E2E scenarios passed.

## 2026-10-05 — Corrected sign-off artifact

- Committed the requested plant-art, route-focus, dependency-reproducibility, and regression-test changes locally as `5d3c73fa286b3e58138da4339e8909149172ec57` (`fix: refine plant art and route focus`).
- No push or deployment was performed.
