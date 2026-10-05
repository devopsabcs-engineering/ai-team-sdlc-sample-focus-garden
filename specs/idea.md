# Focus Garden - product brief

## Idea

A calm, beautiful focus timer where every finished focus session grows a plant in your personal
garden. Anyone can use it in seconds: students, remote workers, parents, makers. No account, no
sign-up, no tracking. It works offline and on any phone or laptop.

## Why it has broad appeal

- Everyone has a to-do list and wants to concentrate; the Pomodoro-style 25/5 rhythm is widely known.
- The garden turns invisible effort into something visible and rewarding, so people return daily.
- It is friendly, quiet and accessible, with no ads and no data collection.

## Users and jobs to be done

- **Focused worker**: start a timer in one click, pick a task label, finish a session, see a plant grow.
- **Gentle habit builder**: see a daily streak and a weekly garden without guilt or pressure.
- **Accessibility-first user**: operate everything by keyboard, with screen reader support and reduced-motion respect.

## Scope (v1)

1. Focus timer with presets (25/5 default, 50/10, 15/3), start, pause, reset, and a gentle chime (mutable).
2. Each completed focus session plants a random plant (sprout to bloom stages) in a garden grid.
3. Garden view with this week's plants, daily streak, total focus minutes, and a plant detail tooltip.
4. Optional task label per session, shown on the plant tooltip.
5. Three themes ("Botanical Garden", "Golden Hour", "Midnight Garden") with a theme switcher, light/dark aware.
6. Installable PWA that works fully offline; all data stays in localStorage on the device.
7. Export and import of garden data as a JSON file, and a clear-all-data button.
8. Responsive from 360 px phones to wide desktops; WCAG 2.1 AA colour contrast; full keyboard operation;
   `prefers-reduced-motion` respected.

Out of scope for v1: accounts, sync across devices, sharing, notifications from a server.

## Non-functional requirements

- Static site only (no backend). Stack: Vite + TypeScript (no heavy framework), CSS variables for theming.
- Unit tests with Vitest (timer logic, garden state, streak calculation, import/export), end-to-end tests
  with Playwright (core flows), ESLint and Prettier, `npm audit` clean for high/critical.
- Lighthouse-style smoke: page loads under 2 s on a throttled connection, installable manifest and service worker present.
- Secrets: none required. No third-party network calls at runtime.

## Delivery

- Production target: GitHub Pages for this repository via a GitHub Actions workflow
  (`https://devopsabcs-engineering.github.io/ai-team-sdlc-sample-focus-garden/`), with the Vite `base` set to
  `/ai-team-sdlc-sample-focus-garden/`.
- Gates: `design-review`, `prototype-review`, `spec-review`, build, lint, unit, acceptance (e2e), critic review,
  security (secrets, SAST, dependency audit, privacy/RAI check), then the human sign-off, then `pre-deploy`, `smoke`, `rollback-ready`.

## Run rules for the agents

- Work on a git branch named `feature/focus-garden`; commit locally with Conventional Commit messages; **never push** and never
  deploy before the human sign-off is recorded.
- Pause at the sign-off gate and wait. Do not populate approvers yourself.
- If a plugin component does not naturally apply (for example a backend developer agent for a backend-less app), record a justified
  skip in `decisions.md`.
