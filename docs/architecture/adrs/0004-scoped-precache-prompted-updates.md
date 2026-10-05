# ADR-0004: Use scoped precaching with prompted updates

**Status:** Accepted  
**Date:** 2026-10-05  
**Task:** T-004

## Context

The app must work offline after first load at a GitHub Pages repository subpath, while deployments
must not leave users on mixed application assets or interrupt an active timer.

## Decision

Generate a Workbox service worker at build time, scoped exactly to
`/ai-team-sdlc-sample-focus-garden/`. Precache the hashed application shell and same-origin static
assets. Do not runtime-cache cross-origin content or user data. Let a new worker wait and offer an
explicit Update now action; activate and reload once only after user acceptance.

## Consequences

An activated version has a coherent asset set, updates do not surprise an active user, and the
worker cannot control sibling Pages projects. Users can temporarily remain on the prior complete
version. Unconditional skip-waiting was rejected because it can mix chunks or interrupt state;
network-first runtime caching was rejected because core assets are immutable and offline-first.
