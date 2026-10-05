# ADR-0001: Use a modular vanilla TypeScript SPA

**Status:** Accepted  
**Date:** 2026-10-05  
**Task:** T-004

## Context

Focus Garden is a small static application with two primary views, dialogs, deterministic domain
logic, and no backend. The approved constraint is Vite + TypeScript without a heavy framework.

## Decision

Build an independently implemented single-page app with browser DOM APIs, strict TypeScript, a
small command/controller layer, pure domain modules, and capability adapters. Use hash navigation
for Focus and Garden so GitHub Pages refreshes always resolve to the deployed `index.html`.

## Consequences

Runtime dependencies and JavaScript stay small, offline precaching is simple, and the domain is
testable without a browser. The team must deliberately implement render scheduling, focus
lifecycle, and dialog behavior rather than receiving framework conventions. UI modules therefore
cannot own domain calculations or persistence, and common accessibility behavior is centralized.

Rejected alternatives: React/Vue/Svelte add framework/runtime conventions unnecessary for this
surface; separate HTML pages complicate durable timer state and Pages/offline navigation.
