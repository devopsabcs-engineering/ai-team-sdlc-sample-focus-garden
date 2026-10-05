# Decisions — 2026-10-05-focus-garden

## 2026-10-05 — Lifecycle scope

- The full UI lifecycle applies because Focus Garden is a user-facing application.
- Backend implementation is omitted: the brief explicitly requires a static site with localStorage, no accounts, no sync, and no runtime third-party calls.
- Deployment is out of scope for this run. The process must stop at pending human sign-off without pushing.

## 2026-10-05 — T-001 experience direction

- Selected the **Greenhouse instrument** direction and its accessible Seed Dial signature over the Herbarium ledger and Illustrated allotment alternatives.
- Botanical Garden is the first-launch light default; Midnight Garden follows a first-launch dark system preference. Any explicit selection persists.
- Breaks and later focus sessions start explicitly. Weeks begin Monday, streaks may anchor on yesterday, and each completed focus session creates exactly one plant.
- Import validates and previews a versioned file before replacing current data. Runtime type and plant assets remain offline-safe, with textual names and metadata carrying the same meaning as illustrations.
- The PRD and architecture must resolve a safe import-size limit and production plant-species scope.

## 2026-10-05 — T-002 prototype boundaries

- The prototype is a self-contained vanilla HTML/CSS/JavaScript design spike and must not be promoted into production.
- A labeled completion shortcut and simulated import/export states validate long-running and operating-system-mediated interactions without misrepresenting implementation readiness.
- Compact layouts use bottom navigation, vertical day beds, and a full-height settings sheet; wide layouts retain header navigation and seven-column beds.
- Playwright MCP was not exposed in the agent host, so the documented `ait-prototype-testing` workflow was executed with Playwright's Node API against real headless Chromium.

## 2026-10-05 — T-003 product scope

- v1 uses six original fictional plant species selected randomly through an isolated/injectable random source.
- Imports are limited to 1 MiB and 10,000 records, validated before an atomic replace.
- Completion is persisted once and shown in an accessible modal with explicit Start break, View garden, and Done actions.
- The initial PRD draft failed review because it changed exact presets and deferred source-required features. The corrected PRD preserves all eight v1 items and records source-to-requirement traceability.
- Required product scope includes the 25/5, 50/10, and 15/3 paired rhythms, optional label, muteable chime, weekly garden and streak, three named themes, and local-only offline operation.

## 2026-10-05 — T-004 architecture

- Use a strict modular vanilla TypeScript SPA with hash navigation and Vite base `/ai-team-sdlc-sample-focus-garden/`; production is independent of `prototype/`.
- Store one canonical versioned document at `focus-garden:state`; strict codecs, sequential migrations, and one-key replacement define the persistence boundary.
- Reconcile timers from persisted wall-clock segments. Timer and session IDs are identical; latest state is reloaded before the once-only completion commit, and modal/audio effects occur only after durable success.
- Breaks require explicit starts and never create sessions, plants, minutes, rewards, or chimes.
- Precache only same-origin application assets within the repository subpath and prompt before activating coherent updates. No backend task applies.

## 2026-10-05 — T-010 dependency advisory

- Build, lint/format, and 142 unit tests passed. `npm audit --audit-level=high` remains clean.
- Three moderate advisories affect Vitest development tooling only. A patched-major installation attempted to fetch a transitive remote tarball and was denied by the environment, so no risky forced upgrade was applied. This does not violate the brief's high/critical audit gate and remains explicit input to the final security review.

## 2026-10-05 — T-011 release boundary

- The generated service worker precaches only same-origin application assets within the exact repository subpath and does not runtime-cache user data.
- Updates remain waiting until the user chooses **Update now**.
- The Pages workflow is manual, sign-off-input gated, and bound to a protected environment. It was neither invoked nor pushed during this run.

## 2026-10-05 — T-012 acceptance blocker

- Automated acceptance is green after fixing a Garden skip-link routing defect: build, lint/format, 147 unit tests, 14 Chromium browser scenarios, PWA/installability/prototype checks, high/critical audit, and 1.355-second median throttled FCP passed.
- The acceptance gate remains blocked because the approved PRD explicitly requires representative screen-reader evidence, current Safari offline/update evidence, and human 200% zoom/320px forced-colors/browser-matrix inspection.
- This Windows non-interactive runner cannot truthfully produce those manual/macOS results. Critic review, security review, and mandatory human sign-off remain dependency-blocked; no waiver or self-approval is recorded.

## 2026-10-05 — T-012 human acceptance waiver

- **Human identity:** Emmanuel Knafo (GitHub user `emmanuelknafo`).
- **Request presented in VS Code chat:** "T-012 (QA) is blocked only on 3 manual checks no agent can perform (representative screen reader, current Safari offline/update, manual zoom/forced-colors/browser matrix). Waive them for this demo run so critic review, security and sign-off can proceed?"
- **Verbatim human answer:** "Waive for this demo".
- **Waived criteria for this demo run only:** representative screen-reader verification; current Safari offline/update verification; and manual 200% zoom/320px, forced-colors, and browser-matrix inspection.
- **Automated acceptance evidence:** fully green — build, lint/format, 147 unit tests, 14 Chromium browser scenarios, PWA/installability/prototype checks, high/critical dependency audit, and 1.355-second median throttled FCP all passed.
- **Disposition:** T-012 acceptance is `passed-with-human-waiver`. This waiver unblocks critic and security review but is not deployment approval and does not populate any mandatory sign-off approver.

## 2026-10-05 — T-013 critic review

- Initial critic review found one blocking completion-state defect: Done and Escape acknowledged the reward but retained the completed focus timer instead of returning to idle.
- The frontend owner changed dismissal to atomically retain the completed session and selected preset while clearing `activeTimer`; a failed persistence write leaves the dialog and completed state available for retry.
- Regression coverage now verifies Done, Escape, reload durability, retained session/preset data, and persistence-failure behavior.
- The rerun critic gate passed with 150 tests, 14 Chromium browser scenarios, static PWA checks, and the required high-severity audit threshold green. The three T-012 waived manual checks were not used to waive review findings.

## 2026-10-05 — T-014 security, privacy, and Responsible-AI review

- The security gate passed with no unresolved blocking security, privacy, supply-chain, import-threat, service-worker, or Responsible-AI finding. This review is evidence for sign-off, not deployment approval.
- Existing SAST/type-aware lint, credential-pattern scans, dependency audit, lockfile integrity review, workflow review, privacy/data-flow analysis, PWA checks, browser scenarios, build, and 150 tests passed.
- Two moderate development-only advisory families remain non-blocking: the Vitest mocker path-traversal advisory and an OpenTelemetry baggage-processing advisory reachable through Lighthouse. Neither package is shipped in the application or exposed to untrusted network execution in the reviewed workflow.
- Residual low risks for human review are bounded local import CPU/memory use, plaintext localStorage/exports and same-origin browser-profile exposure, and mild habit reinforcement from plants/streaks. Future changes must preserve local-only operation, explicit breaks, no punitive streak messaging, no variable-value rewards, and no telemetry.
- The T-012 waiver remains limited to its three recorded manual checks; no security finding and no deployment approval was waived.

## 2026-10-05 — Mandatory human sign-off package

- **Status:** `pending`. Product Owner, Security Team, and Tech Lead approvers are intentionally unpopulated. No approval is inferred from the T-012 demo waiver.
- **Exact artifact:** local branch `feature/focus-garden` at commit `5a9626c27a0a5c13380ab2243b0055f48e9e36dd` (`fix: return completed timer to idle`). Nothing has been pushed or deployed.
- **What was built:** a static, local-only Vite/TypeScript Focus Garden PWA with accessible paired focus/break timers; durable once-only plant rewards; Monday-Sunday garden, streak, and totals; Botanical Garden, Midnight Garden, and High Contrast themes; bounded versioned import/export and clear controls; exact-subpath offline support and prompted coherent updates; and a manual, governance-gated GitHub Pages workflow.
- **Plan/build gates:** design-review, prototype-review, both spec-review gates, and build/lint/unit gates for T-005 through T-011 passed.
- **Acceptance:** T-012 automated acceptance was fully green: build, lint/format, 147 tests at QA time, 14 Chromium browser scenarios, PWA/installability/prototype checks, high/critical dependency audit, and 1.355-second median throttled FCP. Emmanuel Knafo (`emmanuelknafo`) answered verbatim "Waive for this demo" for representative screen-reader verification, current Safari offline/update verification, and manual 200% zoom/320px, forced-colors, and browser-matrix inspection. Acceptance is `passed-with-human-waiver`.
- **Critic review:** an initial blocking Done/Escape state-transition defect was fixed by atomically clearing the active timer while retaining the session and preset. Regression coverage increased the suite to 150 tests. The rerun critic-review gate passed with build, lint/format, 150 tests, 14 Chromium scenarios, PWA checks, and the required audit threshold green.
- **Security/privacy/RAI:** security passed with no unresolved blocker after SAST/code-path, secrets, dependency/SCA, lockfile/supply-chain, workflow, local-data privacy, import threat, PWA/offline/update, and Responsible-AI review.
- **Key decisions:** local-only/no backend or telemetry; one canonical versioned localStorage document; wall-clock timer reconciliation and once-only completion; explicit non-rewarding breaks; six equally selected fictional species; 1 MiB/10,000-record import limits; exact repository-subpath service-worker scope; user-prompted updates; deploy remains out of scope.
- **Residual risks for approvers:** the three manually waived compatibility/accessibility checks remain unverified for this demo; localStorage and exports are plaintext and share the GitHub Pages origin trust boundary; bounded adversarial imports can consume local CPU/memory; plants/streaks retain mild habit-reinforcement risk; Vitest and Lighthouse transitively retain two moderate development-only advisory families that are absent from the shipped app and not exposed to untrusted workflow execution.
- **Required governance action:** a real human Product Owner, Security Team representative, and Tech Lead must each approve this exact commit in separate, attributable human turns before any release action. Any artifact or gate change resets the package. Do not push or deploy from this pending state.

## 2026-10-05 — Human sign-off changes requested

- **Human identity and roles:** Emmanuel Knafo (GitHub user `emmanuelknafo`), reviewing as Product Owner, Security Team, and Tech Lead.
- **Artifact reviewed:** local branch `feature/focus-garden` at commit `5a9626c27a0a5c13380ab2243b0055f48e9e36dd`.
- **Review context:** the mandatory sign-off package was presented in VS Code chat on 2026-10-05.
- **Verbatim human answer:** "Request changes (fix the 3 defects), then re-sign-off".
- **Defect 1:** malformed SVG path data in at least one plant species causes production garden console errors such as `<path> attribute d: Expected number, ...15-11 0-32-16-15z` when `focus-garden:state` contains 21 sessions across the six species.
- **Defect 2:** the six species are too small and visually similar/orange; they must become clearly distinct in shape and colour palette, noticeably larger and more delightful, theme-aware, and WCAG AA.
- **Defect 3:** hash navigation leaves a heavy outline around the entire main region; keyboard users must retain a visible focus indicator, while programmatic route focus must not show the large outline, using `:focus-visible` semantics.
- **Disposition:** sign-off for commit `5a9626c27a0a5c13380ab2243b0055f48e9e36dd` is `changes_requested`. Approvers remain unpopulated. Follow-up tasks T-015 through T-018 require frontend correction, integrated QA, critic review, and security/privacy/RAI review before a new artifact returns to pending human sign-off.

## 2026-10-05 — T-015 requested-change implementation

- Retained persisted theme ID `golden` for schema-v1 compatibility while presenting it as **High Contrast**.
- SVG geometry is validated in the production browser with `SVGGeometryElement.getTotalLength()` and console/page-error capture; unit tests also require complete path attributes and unique bloom silhouettes.
- Programmatic route focus is tagged by input modality so the main landmark does not receive a large outline after hash navigation, while keyboard route navigation and skip-link use retain visible `:focus-visible` feedback.
- All six species now have distinct silhouettes and theme-specific palettes, with larger garden and completion-modal presentation.

## 2026-10-05 — T-016 acceptance blocker

- Production plant-art acceptance passed for 21 seeded sessions, all six species, all three themes, garden and completion-modal contexts, valid SVG geometry, unique silhouettes and palettes, larger sizing, zero console/page errors, and axe colour contrast.
- The strengthened browser regression found that scripted `location.hash` navigation inherited the prior main element's `:focus-visible` state and incorrectly marked route focus as keyboard-originated, producing the prohibited heavy main-region outline.
- T-016 acceptance remains failed and T-015 is reopened for the frontend owner. The new regression must remain and the full acceptance gate must rerun after correction.

## 2026-10-05 — T-015 route-focus correction

- Keyboard route focus now requires an Enter keydown causally followed by activation of the same still-focused navigation link.
- Pointer activation and direct/scripted hash changes are classified as programmatic and do not draw a main-region outline.
- Keyboard route activation retains an explicit visible focus ring, and skip-link focus behavior remains visible.

## 2026-10-05 — T-016 acceptance rerun

- Acceptance passed after the focus-modality correction: production build, lint, format check, 159 unit tests, 16 Chromium browser scenarios, static PWA checks, and Lighthouse performance passed.
- Seeded production coverage proved zero console/page errors and valid SVG geometry for 21 garden plants across six species, plus every species/theme completion-modal permutation.
- Objective regressions cover silhouette and palette uniqueness, per-theme palette changes, larger rendered dimensions, axe colour contrast, script/pointer focus suppression, and keyboard/skip-link focus visibility.
- `npm audit --audit-level=high` reported no high or critical vulnerabilities. Twenty moderate development-tooling findings remain explicit, non-blocking risk under the required threshold.

## 2026-10-05 — T-017 repeated critic review

- Critic review found no blocking correctness, reliability, accessibility, maintainability, architecture, SVG, focus-management, or regression-test defect in the requested-change implementation.
- The reviewer independently passed 34 targeted unit tests, both focused Chromium scenarios, and `git diff --check`, and accepted the complete T-016 gate evidence.

## 2026-10-05 — T-018 security blocker

- Security found no unsafe SVG injection, XSS, privacy regression, focus/accessibility security concern, PWA scope defect, high/critical dependency issue, secret, workflow-permission issue, or Responsible-AI blocker.
- The security gate is blocked because `npm ci --ignore-scripts --dry-run` reports `package-lock.json` missing `third-party-web@0.30.0`; the release workflow's clean install is therefore not reproducible.
- T-019 routes lockfile remediation to the frontend/dependency owner. Because the artifact changes, T-020 and T-021 repeat acceptance and critic gates before T-018 reruns security.

## 2026-10-05 — T-019 dependency reproducibility correction

- Node 24.17.0/npm 11.11.1 confirmed that exact overrides for `@paulirish/trace_engine`'s mutable `third-party-web` and `legacy-javascript` edges restore deterministic `npm ci`.
- Existing `package-lock.json` entries were already exact, so the minimal repair is manifest-level containment rather than lockfile churn or a broad dependency upgrade.
- Twenty moderate development-tool advisories remain below the required high/critical threshold. Parallel E2E encountered two resource-related timeouts; their targeted retries and a complete serial 16/16 run passed.

## 2026-10-05 — T-020 repaired-artifact acceptance

- Under Node 24.17.0/npm 11.11.1, clean `npm ci`, build, lint, format check, 159 unit tests, all 16 E2E tests with the normal six workers, PWA checks, Lighthouse/performance, and the high-severity dependency audit passed.
- Requested-change coverage remains green for the 21-session seeded garden, six species and three themes in garden/completion contexts, valid SVG geometry, zero console/page errors, visual distinction and sizing, axe contrast, and route focus modality.
- Twenty moderate development-tool vulnerabilities remain explicit non-blocking risk.

## 2026-10-05 — T-021 repaired-artifact critic review

- Critic review found no blocking correctness, reproducibility, maintainability, accessibility, compatibility, supply-chain, plant-art, or route-focus regression.
- Supplemental clean-install dry-run, high-threshold audit, dependency-resolution inspection, and `git diff --check` passed.

## 2026-10-05 — T-018 final security, privacy, and Responsible-AI review

- The security gate passed after Node 24/npm 11 clean-install and override-resolution validation, SAST/type-aware lint, secret scanning, high/critical SCA, lockfile/supply-chain/workflow review, SVG/XSS review, local-data/import privacy analysis, PWA/offline review, focus/accessibility review, and Responsible-AI analysis.
- Prior blocker `SEC-SC-001` is resolved with no hidden manifest/lock or dependency-graph mismatch.
- No exploitable or policy-relevant blocker remains. Residual risks are the 20 moderate development-tool advisories, plaintext same-origin localStorage/exports, user-accepted stale precache windows, repository governance of manual deployment dispatch, the existing manual accessibility/browser waiver, and potential E2E contention on heavily loaded hosts.

## 2026-10-05 — Refreshed mandatory human sign-off package

- **Status:** `pending`. Product Owner, Security Team, and Tech Lead approvers are intentionally unpopulated. The prior changes-requested decision is preserved above and is not an approval.
- **Exact artifact:** local branch `feature/focus-garden` at commit `5d3c73fa286b3e58138da4339e8909149172ec57` (`fix: refine plant art and route focus`). Nothing has been pushed or deployed.
- **Requested defect 1 resolved:** all six species use valid compile-time SVG paths. Production-browser tests seed `focus-garden:state` with 21 sessions, render every species, call `getTotalLength()` for each path, and assert zero console/page errors. Every species/theme completion-modal permutation receives the same validation.
- **Requested defect 2 resolved:** six unique silhouettes and six distinct computed bloom palettes are asserted in Botanical Garden, Midnight Garden, and High Contrast, in both garden and completion contexts. Garden art is at least 64 px wide, completion art at least 260 px, and axe colour-contrast checks pass for every permutation.
- **Requested defect 3 resolved:** pointer and direct/scripted hash navigation move semantic focus to `main` without the large region outline; causal Enter-key navigation and skip-link activation retain a visible 3 px focus indicator.
- **Regression coverage:** 159 unit tests and 16 Chromium E2E scenarios cover SVG validity, console errors, visual distinction, sizing, all themes/contexts, colour contrast, and route focus modality.
- **Build and acceptance gates:** under Node 24.17.0/npm 11.11.1, clean `npm ci`, production build, lint, format check, unit, normal six-worker E2E, static PWA checks, Lighthouse/performance, and `npm audit --audit-level=high` passed.
- **Critic gates:** both the requested-change review and the dependency-repair review passed with no unresolved blocking correctness, reliability, accessibility, maintainability, compatibility, reproducibility, architecture, SVG, focus, or supply-chain defect.
- **Security/privacy/RAI:** final security passed with no unresolved blocker. Exact npm overrides contain mutable `@paulirish/trace_engine` transitive edges while preserving the integrity-bearing lock and deterministic clean install.
- **Prior QA waiver remains scoped:** Emmanuel Knafo (`emmanuelknafo`) previously answered verbatim "Waive for this demo" only for representative screen-reader verification, current Safari offline/update verification, and manual 200% zoom/320px, forced-colors, and browser-matrix inspection. It is not sign-off approval.
- **Residual risks for approvers:** those three manually waived checks remain unverified; 20 moderate development-only advisories remain below the high/critical threshold; localStorage and exports are plaintext; static assets may remain precached until an update is accepted; deployment dispatch relies on repository/environment governance; and highly contended hosts can require serial E2E retry.
- **Required governance action:** a real human Product Owner, Security Team representative, and Tech Lead must approve this exact commit in attributable human turns before any release action. Any artifact or gate change resets the package. Do not push or deploy from this pending state.

## 2026-10-05 — Human sign-off approval

- **Approval timestamp:** `2026-10-05T16:12:05.406-04:00`.
- **Approved artifact:** branch `feature/focus-garden`, commit `5d3c73fa286b3e58138da4339e8909149172ec57`, tree `7c1db614c64697fecfc664c5080788eb3c8a865c`.
- **Product Owner approver:** Emmanuel Knafo (GitHub user `emmanuelknafo`), acting as Product Owner.
- **Security Team approver:** Emmanuel Knafo (GitHub user `emmanuelknafo`), acting as Security Team.
- **Tech Lead approver:** Emmanuel Knafo (GitHub user `emmanuelknafo`), acting as Tech Lead.
- **Human approval source:** VS Code chat human turn on 2026-10-05.
- **Verbatim approval:** "Approve all three roles for 5d3c73f and deploy".
- **Decision:** all three mandatory governance roles approved the exact artifact above; deployment is authorized only for that commit/tree.

## D-DEPLOY-1 Release fix after approval
The first governed release failed at the perf gate because tests/lighthouse-audit.mjs hardcoded a Windows Chrome path. PR #2 (CI tooling only, no product code) defaulted it to Playwright Chromium. main therefore differs from approved tree 7c1db61 by that one test file; recorded and accepted by the operator without a fresh sign-off. Release run 37385524282 passed all jobs. Live smoke: 200, manifest, SW scope, 0 console errors, 0 external requests, offline reload ok. Rollback: re-run the workflow on an earlier commit or revert and dispatch.
