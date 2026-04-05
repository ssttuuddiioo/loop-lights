---
name: Dimly — Stage Controller v2
description: Web-based stage lighting controller for ENTTEC ELM, built with Preact+Vite+TypeScript, accessed from iPads/phones
type: project
---

**Dimly** is a web-based stage lighting controller that talks to ENTTEC ELM (LED Mapper) via its HTTP API on port 8057. Built with Preact + Vite + TypeScript. Replaces a legacy 2300-line single HTML file.

**Why:** Pablo needs to control stage lighting from iPads/phones at venues, both on local WiFi and remotely over the internet.

**How to apply:** All work should consider iPad touch UX, dark theme ("flat calm" purple-gray palette), minimal dependencies, and the dual Mac-dev / Windows-prod workflow. The PROJECT_CONTEXT.md file at the repo root is the authoritative architecture reference.

Key facts:
- Brand: Dimly — domain dimly.app
- Repo: github.com/ssttuuddiioo/loop-lights
- Remote URL: ctrl.dimly.app (Cloudflare Tunnel → Windows PC port 4200)
- Production PC: C:\Users\loop\loop-lights (Dell Tower Plus, hostname LOOP-LIGHTING)
- ELM API: localhost:8057/elm/ (proxied through serve.cjs in prod, Vite proxy in dev)
- 7 stages, 123 media slots (GLSL shaders + animations)
- State: useReducer + Context (no external state lib)
- Password gate: cookie-based, default "warhorse"
- Mock mode: `VITE_MOCK=true npm run dev` for local UI dev without ELM
- UI theme: "Flat Calm" — purple-gray palette, vertical sidebar nav, inline panels
- Advatek monitoring: `/controllers` page, polls PixLite Mk3 via WebSocket
- Logging: `logs/server.log`, `logs/tunnel.log`, `logs/startup.log`, `logs/fps.log`
- Blackout/Restore: POSTs intensity=0 to all stages, not just masterIntensity
- Master fader: scales all stage intensities proportionally on drag end
