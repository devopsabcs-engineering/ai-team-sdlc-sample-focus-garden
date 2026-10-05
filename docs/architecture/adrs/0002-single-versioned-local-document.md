# ADR-0002: Persist one versioned local document

**Status:** Accepted  
**Date:** 2026-10-05  
**Task:** T-004

## Context

Sessions, preferences, the active timer, imports, and completion must remain consistent in
localStorage. Import replaces all data and must never expose partial replacement.

## Decision

Store one strict, versioned JSON document at `focus-garden:state`. Decode from `unknown`, construct
a canonical object, and replace it with one `localStorage.setItem`. Begin at schema version 1 and
require a pure sequential migration plus frozen fixtures for every later version.

## Consequences

Import and completion have a clear atomic commit boundary, export is a complete snapshot, and
corrupt/newer data can be preserved rather than guessed. Each write serializes the bounded document;
the 1 MiB/10,000-record import limits and v1 usage make that acceptable. IndexedDB was rejected
because it adds asynchronous transaction/migration complexity without a v1 data-volume need.
Multiple independent keys were rejected because replacement and completion could partially commit.
