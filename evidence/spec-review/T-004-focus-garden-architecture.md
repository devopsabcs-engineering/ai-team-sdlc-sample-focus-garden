# Spec review evidence — T-004 Focus Garden architecture

**Run:** `2026-10-05-focus-garden`  
**Artifact:** `docs/architecture/focus-garden-technical-spec.md` and ADRs  
**Gate:** `spec-review`  
**Result:** PASS  
**Reviewed:** 2026-10-05

## Method

Desk review of the implementation specification against the corrected PRD, approved design
contracts, source brief, and T-003 gate evidence. No production project exists yet, so this gate
reviews feasibility, completeness, security defaults, testability, and requirement traceability;
it does not claim build or test execution.

## Gate checks

| Check | Result | Evidence |
|---|---|---|
| Static Vite + strict TypeScript architecture is feasible | Pass | Spec §§1–3 defines the composition root, dependency direction, zero-runtime-dependency preference, and exact module tree. |
| Exact Pages hosting is implementable | Pass | §§2, 12–14 fix `/ai-team-sdlc-sample-focus-garden/` for Vite, manifest, worker scope, test server, and navigation. |
| Domain and persistence contracts are typed | Pass | §4 defines closed sets, v1 DTOs, invariants, repository results, and migration pipeline. |
| Timer behavior is unambiguous | Pass | §§5–6 define all states/transitions, elapsed formula, reconciliation triggers, boundary time, reset, recovery, and break behavior. |
| Completion is once-only and durable | Pass | §6 uses timer/session identity, latest-state reload, single-document commit, post-commit effects, acknowledgment, and same-origin locking. |
| Randomness is production-safe and testable | Pass | §7 specifies equal indexed selection, crypto rejection sampling, and injected deterministic boundaries. |
| Week, streak, and totals are deterministic | Pass | §8 fixes Monday/local-calendar/DST behavior, today/yesterday anchoring, sorting, count, and all-time total semantics. |
| Import cannot partially replace data | Pass | §9 fixes byte/record limits, unknown-data decoding, canonical reconstruction, preview/confirmation, one-key set, cancel, and rollback. |
| Accessibility is behavioral, not cosmetic | Pass | §10 covers semantics, dialog focus, announcements, reflow, keyboard, targets, reduced motion, forced colors, and errors. |
| Theme implementation matches approved design | Pass | §11 requires all approved semantic variables, exact theme IDs, system-first behavior, persistence, contrast, and no layout/focus loss. |
| Offline/update design avoids mixed versions | Pass | §12 and ADR-0004 define scoped precache, waiting update, activation/reload, fallback, and no user-data cache. |
| Privacy/security defaults are explicit | Pass | §§3–4, 9, 12 prohibit unsafe HTML/JSON handling, remote runtime services, telemetry, permissions, secrets, and third-party calls; CSP is specified. |
| Failure states do not claim false success | Pass | §§4, 6, 9–10 require commit-before-effects and typed recovery for storage, import, audio, export, and SW failure. |
| Quality strategy is executable | Pass | §§13–14 specify CI steps and Vitest, Playwright, axe, lint, format, audit, network, performance, and manual matrices. |
| Work can be delegated without architecture discovery | Pass | §16 provides ordered frontend/QA/review tasks and a justified backend skip. |

## Corrected PRD P0 traceability

Every numbered P0 functional criterion is explicitly mapped in specification §15:

* FR-1.1 through FR-1.8: exact paired presets, task label, timer controls, reset, explicit break,
  recovery, and single-active behavior.
* FR-2.1 through FR-2.7: one durable session/plant, deduplication, credited minutes, completion
  dialog, chime, and accessible reduced-motion growth.
* FR-3.1 through FR-3.6: Monday–Sunday garden, plant details, streak, totals/count, persistence/order,
  and neutral empty state.
* FR-4.1 through FR-4.5: complete export, round trip, bounded validated preview/replace, clear, and
  no-mutation cancellation.
* FR-5.1 through FR-5.6: offline core, safe updates, manifest, exact subpath, static delivery, and
  graceful worker failure.
* FR-8.1 through FR-8.4: the three exact themes, first-launch system preference, persistence,
  contrast, state preservation, and offline assets.
* FR-6.1 through FR-6.9: keyboard, names/status, bounded announcements, WCAG 2.2 AA contrast/focus,
  320 CSS px/zoom, equivalent cues, reduced motion, targets, and automated/manual evidence.
* FR-7.1 through FR-7.6: no user-data egress, trackers, remote assets, unsafe JSON, misleading
  privacy copy, or permission requests.

The P0 scope bullets not unique to those criteria are also preserved: fixed six-species set and
equal cosmetic value (§§4, 7); persistent local state and migration (§4); original accessible plant
assets (§§10–11); static framework-light Vite delivery (§§1–3); and GitHub Pages CI (§13).

## Security, privacy, and operational review

* The only decoded-data trust transition is a strict `unknown` codec with limits before mutation.
* One storage key provides an atomic browser-operation boundary; set/remove failures retain the last
  committed state.
* Dynamic user/imported text never enters an HTML parsing sink.
* Runtime network is limited to same-origin static assets and worker updates; tests fail closed on
  cross-origin calls and known user-data egress.
* CSP, least-privilege CI permissions, immutable action pinning, no secrets, and high/critical audit
  gating are implementation requirements.
* PWA caches application code only and service-worker scope cannot control sibling repository sites.

## Testability review

Clock, random source, IDs, repository, audio, and lifecycle are explicit seams. Pure functions own
calendar and timer calculations. Boundary, DST, race/reload, rollback, accessibility, offline
upgrade, privacy-network, audit, and performance cases are enumerated with measurable outcomes.
The specification distinguishes unit, integration, browser, and manual evidence and does not claim
unrun checks.

## ADR review

* ADR-0001 selects modular vanilla TypeScript and hash navigation over framework or multi-page
  complexity.
* ADR-0002 selects one versioned document over multi-key localStorage or IndexedDB.
* ADR-0003 selects wall-clock reconciliation and stable-ID completion over tick authority.
* ADR-0004 selects scoped precache plus prompted coherent updates over unconditional activation.

The tradeoffs are proportionate to v1 and do not introduce a backend or unapproved product scope.

## Gate conclusion

**PASS.** The architecture is feasible, testable, secure and private by default, and sufficiently
specific for frontend implementation. It traces to every corrected PRD P0 criterion and does not
weaken static Pages delivery, local-only ownership, accessibility, offline behavior, or once-only
completion. Build, acceptance, accessibility, security, audit, performance, and deployment gates
remain future implementation/release work.
