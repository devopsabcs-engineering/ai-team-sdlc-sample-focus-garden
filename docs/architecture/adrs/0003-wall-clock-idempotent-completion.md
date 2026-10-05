# ADR-0003: Reconcile wall-clock timers with idempotent completion

**Status:** Accepted  
**Date:** 2026-10-05  
**Task:** T-004

## Context

Browsers throttle or suspend timers. Repeated ticks, visibility events, reloads, and multiple tabs
must not grow duplicate plants or inflate minutes.

## Decision

Persist credited elapsed time plus the current running-segment timestamp. Recompute elapsed time
from wall clock at every reconciliation and calculate the exact completion boundary. Use the timer
UUID as the completed-session UUID. Completion reloads the latest snapshot, rejects an existing
session ID, commits the session and completed timer in one write, and emits UI/audio effects only
after that write. Serialize same-origin tabs with Web Locks where available.

## Consequences

Background throttling does not lose time, delayed foregrounding does not inflate minutes, and
completion is naturally idempotent. System-clock changes can alter elapsed behavior; negative
deltas are clamped and anti-cheat is explicitly out of scope. Interval-count timers and
setTimeout-as-authority were rejected because suspension makes them incorrect.
