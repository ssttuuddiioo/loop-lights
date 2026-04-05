---
name: Upcoming phases — what's not built yet
description: Key unbuilt features: groups API wiring, MJPEG in cards, design polish, public portal, monitoring enhancements
type: project
---

As of 2026-04-05, completed phases: password gate, watchdog, deploy reliability, 3D spatial view, Advatek monitoring, UI redesign ("flat calm" theme), blackout/restore fix, ELM FPS tracking.

Remaining work:

- **Phase 5 — Modals refinement:** Media modal with animated MJPEG previews on visible tiles
- **Phase 6 — Overview Mode:** Wire postOverviewParams() to actual ELM groups/performer API, create api/groups.ts
- **Phase 7 — Design Polish:** Refine flat calm theme on iPad, physical testing, responsive tweaks
- **Phase 9 — Public Portal:** loop.dimly.app with auth gate for clients/audience

**Monitoring enhancements (deferred):**
- ELM reachability logging (connection drop/recover events)
- Log rotation for server.log, tunnel.log, fps.log
- Network interface status monitoring (LAN vs pixel NIC)
- Controller temperature history (CSV trend data)
- Windows auto-restart on reboot (Task Scheduler for start.bat)

Known debt:
- `postOverviewParams()` in settings.ts is a no-op (logs to console, doesn't POST)
- MJPEG live preview component built but not wired into stage cards
- 3D view lightweight but zone labels/sidebar could use polish

**Why:** These are the remaining phases from PROJECT_CONTEXT.md plus new monitoring ideas.
**How to apply:** When Pablo says "next" or asks what to work on, reference these phases.
