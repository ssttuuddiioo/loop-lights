---
name: 3D + Dashboard plan (v3 final, 2026-04-02)
description: Approved phased plan — router (wouter-preact), dashboard (hand-rolled SVG), 3D spatial view (R3F with vanilla fallback), overview deprecated not deleted
type: project
---

Pablo wrote a detailed v3 phased implementation prompt for adding three features to Dimly:

**Phase 1 — Router + App Shell:** wouter-preact v3.9.0, three routes (/, /mixer, /3d). Split top-bar into global-toolbar + app-nav. Remove M3 tabs, keep md-assist-chip. PreviewStrip stays global. Overview files stay but stop being routed to.

**Phase 2 — Dashboard:** Hand-rolled SVG bar chart (no Recharts), compact stage status cards, system status header, "presets coming soon" label. Read-only over existing state.

**Phase 3a — R3F Spike:** Test React Three Fiber + Preact compat before committing. Context bridge test is critical. Decision gate: pass → 3b (R3F), fail → 3b-alt (vanilla Three.js).

**Phase 3b — 3D View:** 6 placeholder zones with emissive materials driven by live stage data. Zone modal reuses existing stage controls. Dynamic import for code-splitting.

**Why:** Pablo wants a proper multi-view architecture with a system dashboard and an interactive 3D venue visualization for spatial awareness during shows.

**How to apply:** When executing any phase, reference the v3 prompt doc Pablo wrote. Each phase has explicit DO NOT boundaries — respect them. The plan file is at `.claude/plans/curious-wondering-waterfall.md`.
