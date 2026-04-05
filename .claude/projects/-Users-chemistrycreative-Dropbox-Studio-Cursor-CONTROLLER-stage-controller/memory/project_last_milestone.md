---
name: Last milestone — Advatek monitoring + UI redesign (2026-04-05)
description: Added Advatek controller monitoring, fixed blackout/restore, full UI redesign (flat calm theme), ELM FPS tracking
type: project
---

Major session on 2026-04-04/05 covering Advatek monitoring, blackout fixes, and a full UI overhaul:

**Advatek PixLite Mk3 Monitoring:**
1. `src/advatek.cjs` — polls controllers every 30s via WebSocket, computes health status
2. `/api/health/controllers` endpoint in `serve.cjs` with auth
3. `/controllers` page with card grid + detail view
4. First controller verified: T8-S Unit 1 at 2.0.0.21
5. `ws` npm dependency added, `DIMLY_CONTROLLERS` env var

**Blackout/Restore Fix:**
- Blackout now POSTs `intensity=0` to every stage (not just masterIntensity)
- Restore POSTs saved pre-blackout intensities back
- Master fader scales and POSTs all stage intensities on drag end
- `masterDirtyUntil` prevents sync engine from overwriting during transitions

**UI Redesign — "Flat Calm" Theme:**
- Purple-gray palette (#13131a bg, #1e1e2e surfaces)
- Vertical left sidebar nav with icons (Dashboard, Mixer, 3D, Controllers)
- Stats bar replaces old toolbar (stages, master level, media loaded, ELM FPS)
- Stage cards: percentage overlaid inside fader, simplified color/media
- Dashboard: on/off toggles, functional intensity sliders, color/media buttons
- Color and media panels open inline in grid (one at a time)
- Modals converted from centered overlays to inline panels

**3D View Performance:**
- Removed bloom post-processing, glow shells, fog
- Shadows disabled, 30fps cap, pixel ratio 1
- `disposed` flag ensures full cleanup on nav away
- Distributed point lights follow zone shape

**Infrastructure:**
- `start.bat`: kills old processes, halts on build failure, logs to `logs/`
- Startup timestamps in `logs/startup.log`
- ELM FPS sampled every 5min, daily avg/min/max logged to `logs/fps.log`
- 7 stages per bank (no pagination needed)

**Why:** Production install needed hardware monitoring, reliable blackout, and a cleaner UI.
**How to apply:** The infrastructure + monitoring layer is solid. UI is in "flat calm" theme. 3D view is lightweight. Next work likely on design polish, groups API, or public portal.
