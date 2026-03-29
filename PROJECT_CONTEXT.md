# Dimly — Stage Controller v2
## Project Context & Architecture Reference

> Last updated: 2026-03-29
> Repo: https://github.com/ssttuuddiioo/loop-lights
> Domain: dimly.app
> Remote URL: https://ctrl.dimly.app

---

## What This Is

A web-based stage lighting controller for ENTTEC ELM (LED Mapper). Built with Preact + Vite + TypeScript. Runs on a Windows PC alongside ELM, accessed from iPads, phones, or any browser — locally over WiFi or remotely over the internet via Cloudflare Tunnel. Replaces a legacy single-file HTML controller (`index-ipad-0.9.12.html`, 2300 lines) with a proper component architecture.

**Brand name:** Dimly
**Repo:** https://github.com/ssttuuddiioo/loop-lights
**Domain:** dimly.app (registered on GoDaddy, DNS managed by Cloudflare)
**Remote control URL:** https://ctrl.dimly.app (Cloudflare Tunnel → PC)
**Future public portal:** https://loop.dimly.app (auth-gated, for clients/audience)
**Dev path (Mac):** `/Users/chemistrycreative/Dropbox/Studio/Cursor/CONTROLLER/stage-controller/`
**Prod path (Windows):** `C:\Users\livingwalls\loop-lights\`

---

## Stack

| Dependency | Version | Purpose |
|---|---|---|
| preact | ^10.29.0 | UI framework (React-compatible, 4KB) |
| @material/web | ^2.4.1 | Google Material 3 web components |
| vite | ^5.4.21 | Dev server + production build |
| typescript | ~5.9.3 | Type safety |
| @preact/preset-vite | ^2.10.5 | Vite plugin for Preact JSX |

No state management library — uses `useReducer` + Context.

**Note on M3:** Material 3 web components are currently used for buttons, chips, tabs, switches, and sliders. However, 80% of the UI is custom components (faders, stage cards, color swatches). There's an open design decision about whether to keep M3 or replace it with vanilla CSS using the existing design tokens — the Rams/gmunk design direction favors minimal dependencies. M3 requires `addEventListener` workarounds for Preact compatibility.

---

## Infrastructure

### Windows PC (production)
- **PC user:** `livingwalls`
- **PC hostname:** `pablo-lenovo`
- **PC IP (current WiFi):** `192.168.1.206`
- **ELM server:** `localhost:8057` (ENTTEC LED Mapper v741 / ELM 2025)
- **Stage controller:** `localhost:4200` (Node.js via `serve.cjs`)
- **Cloudflare Tunnel:** `cloudflared` routes `ctrl.dimly.app` → `localhost:4200`

### How it runs
- `serve.bat` → starts Node.js production server on port 4200
- `tunnel.bat` → starts Cloudflare Tunnel (`cloudflared tunnel run dimly`)
- Both should have shortcuts in Windows Startup folder:
  `C:\Users\livingwalls\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`

### tunnel.bat contents
```batch
@echo off
title Dimly Tunnel
C:\Users\livingwalls\Downloads\cloudflared-windows-amd64 tunnel run dimly
pause
```

### Network access
| Method | URL | When to use |
|--------|-----|-------------|
| Local network | `http://192.168.1.206:4200` | Same WiFi, lowest latency (live shows) |
| Remote / internet | `https://ctrl.dimly.app` | Any device, anywhere, over internet |
| PC itself | `http://localhost:4200` | Testing on the Windows PC |
| Phone hotspot fallback | Connect PC to phone hotspot, use PC's IP | No WiFi, no internet at venue |

### Cloudflare Tunnel details
- **Tunnel name:** dimly
- **Tunnel ID:** `f7ff7133-1f3d-4360-9cc1-336372c733da`
- **Config file:** `C:\Users\livingwalls\.cloudflared\config.yml`
- **Credentials:** `C:\Users\livingwalls\.cloudflared\f7ff7133-1f3d-4360-9cc1-336372c733da.json`
- **Cloudflared binary:** `C:\Users\livingwalls\Downloads\cloudflared-windows-amd64`
- **DNS record:** `ctrl` → tunnel CNAME (created via `cloudflared tunnel route dns dimly ctrl.dimly.app`)
- **Cloudflare account:** Pablo@studiostudio... (free plan)
- **Nameservers:** `eva.ns.cloudflare.com`, `rodney.ns.cloudflare.com` (set at GoDaddy)

### config.yml contents
```yaml
tunnel: f7ff7133-1f3d-4360-9cc1-336372c733da
credentials-file: C:\Users\livingwalls\.cloudflared\f7ff7133-1f3d-4360-9cc1-336372c733da.json

ingress:
  - hostname: ctrl.dimly.app
    service: http://localhost:4200
  - service: http_status:404
```

### Firewall
- Port 4200 TCP inbound allowed (for local network access)
- Port 8057 only needs localhost access (the proxy handles it)
- Firewall command: `netsh advfirewall firewall add rule name="Stage Controller" dir=in action=allow protocol=TCP localport=4200`

### Network diagram
```
[Venue internet] ──→ [Dedicated router] ← SSID: STAGE_CTRL
                          |              \
                       Ethernet         WiFi
                          |                \
                    [ELM Windows PC]    [iPad / Phone]
                     192.168.1.206       192.168.1.x
                     :8057 (ELM)         Local: http://192.168.1.206:4200
                     :4200 (serve.cjs)   Remote: https://ctrl.dimly.app
                     cloudflared tunnel
                          |
                          |── Cloudflare edge ──→ ctrl.dimly.app (internet access)
                          |
                    [LED controllers]
                     Art-Net / sACN / KiNet
```

### Deployment / Update workflow
```bash
# On Windows PC:
cd C:\Users\livingwalls\loop-lights
git pull
npm install       # only if deps changed
npm run build
# Restart serve.bat
```

---

## File Structure

```
stage-controller/
├── index.html                     Entry HTML with iPad meta tags
├── package.json                   Scripts: dev, build, serve
├── vite.config.ts                 Port 4200, proxy /elm → ELM server
├── serve.cjs                      Production Node.js server (static + proxy)
├── serve.bat                      Windows double-click launcher
├── tunnel.bat                     Windows launcher for cloudflared tunnel
├── .env.example                   Environment variable template
├── README.md                      Setup instructions
├── PROJECT_CONTEXT.md             This file
├── tsconfig.json                  TypeScript project references
├── tsconfig.app.json              App TypeScript config (strict mode)
├── tsconfig.node.json             Node TypeScript config
│
├── src/
│   ├── main.tsx                   Entry: renders <App />, imports theme CSS
│   ├── app.tsx                    AppProvider + page routing (Control / Overview)
│   ├── vite-env.d.ts              M3 custom element type declarations for Preact
│   │
│   ├── api/
│   │   ├── client.ts              ✅ elmGet, elmPost, baseUrl — all routes prefixed /elm/
│   │   ├── stages.ts              ✅ getStages, getStageLive, postStageIntensity/Color/Media
│   │   ├── media.ts               ✅ getMediaSlots, buildThumbnailUrl
│   │   ├── settings.ts            ✅ getSettings, postMasterIntensity, postMasterSpeed
│   │   │                          ⚠️  postOverviewParams — logs to console, not wired to API
│   │   └── mock.ts                ✅ Mock data for offline dev (MOCK_ENABLED = false)
│   │
│   ├── state/
│   │   ├── actions.ts             ✅ 25 action types, discriminated union
│   │   ├── reducer.ts             ✅ Full reducer: stages, master, media, connection, UI, overview
│   │   └── context.tsx            ✅ Split contexts: AppStateContext + AppDispatchContext
│   │
│   ├── hooks/
│   │   ├── use-sync-engine.ts     ✅ 10s poll, dirty flags, pause on touch/modal, reconnection
│   │   ├── use-pointer-fader.ts   ✅ Vertical drag: pointer capture, rAF, velocity, inertial settle
│   │   ├── use-pointer-horizontal.ts ✅ Horizontal drag for master fader, keyboard arrows
│   │   ├── use-favorites.ts       ✅ localStorage CRUD for color favorites (10 slots)
│   │   └── use-swipe-banks.ts     ✅ Swipe gesture detection for bank paging
│   │
│   ├── lib/
│   │   ├── constants.ts           ✅ SWATCHES, COLOR_PRESETS, timing constants, VERSION
│   │   ├── color-utils.ts         ✅ hexToRgb, rgbToHex, escapeHtml
│   │   └── throttle.ts            ✅ createThrottle, createThrottleMap (exported but unused)
│   │
│   ├── types/
│   │   ├── stage.ts               ✅ StageInfo, StageLive, StageState
│   │   ├── media.ts               ✅ MediaSlot
│   │   └── settings.ts            ✅ Settings, OverviewParams
│   │
│   ├── theme/
│   │   ├── tokens.css             ✅ M3 dark theme mapped from original design tokens
│   │   ├── typography.css         ✅ DM Mono + Syne font imports
│   │   ├── global.css             ✅ Reset, safe areas, overscroll, iPad fixes
│   │   └── m3-overrides.css       ✅ @material/web component theming
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── top-bar.tsx        ✅ Sticky bar: title, pills, M3 tabs, master fader, blackout
│   │   │   ├── preview-strip.tsx  ✅ Fixed 4px bottom bar, one segment per stage
│   │   │   └── page-shell.tsx     ✅ Wraps pages, runs sync engine, tracks touch events
│   │   │
│   │   ├── controls/
│   │   │   ├── master-fader.tsx   ✅ Custom horizontal pointer-drag fader
│   │   │   ├── blackout-button.tsx ✅ Toggle with pre-blackout level memory
│   │   │   ├── vertical-fader.tsx ✅ Per-stage fader, owns local state during drag
│   │   │   └── color-swatch.tsx   ✅ Memo'd 28px swatch with selection border
│   │   │
│   │   ├── stage/
│   │   │   ├── stage-grid.tsx     ✅ 6-column grid with bank slicing + swipe
│   │   │   ├── stage-card.tsx     ✅ Memo'd card: fader, color, media, dynamic glow
│   │   │   ├── color-section.tsx  ✅ 11 swatches + native color picker
│   │   │   ├── media-section.tsx  ✅ Thumbnail preview + dropdown selector
│   │   │   ├── media-monitor.tsx  ✅ MJPEG live preview component (built, not yet wired into cards)
│   │   │   └── bank-nav.tsx       ✅ Dot indicators + offscreen hints
│   │   │
│   │   ├── modals/
│   │   │   ├── color-modal.tsx    ✅ Full overlay: preview, picker, swatches, 10-slot favorites
│   │   │   └── media-modal.tsx    ✅ 4-column thumbnail grid, click-to-assign
│   │   │
│   │   ├── overview/
│   │   │   ├── overview-page.tsx  ✅ Master controls + zone grid + media bin + global controls
│   │   │   ├── zone-grid.tsx      ✅ Auto-fill grid of all stages
│   │   │   ├── zone-card.tsx      ✅ M3 switch on/off + M3 slider opacity per stage
│   │   │   ├── master-media-bin.tsx ✅ Push media to all stages at once
│   │   │   └── global-controls.tsx ✅ Hue shift, speed, blur, wave, glitch sliders
│   │   │
│   │   └── status/
│   │       ├── connection-pill.tsx ✅ CONNECTED/OFFLINE M3 chip
│   │       ├── sync-status.tsx    ✅ synced/offline/paused text
│   │       └── watchdog-pill.tsx   ✅ watching/reconnecting M3 chip
│   │
│   └── pages/
│       ├── control-surface.tsx    ✅ StageGrid + BankNav
│       └── overview.tsx           ✅ OverviewPage wrapper
│
└── dist/                          Built output (~200KB total, not in git)
    ├── index.html
    └── assets/
        ├── index-*.js             ~193KB
        └── index-*.css            ~5KB
```

---

## What's Actually Working

### Fully Functional
- **App scaffolding** — Preact + Vite + TypeScript, builds clean, zero TS errors
- **ELM API integration** — All routes use correct `/elm/` prefix, proxy works in dev and production
- **Sync engine** — 10s poll with dirty flags, pauses during touch/modal, reconnection logic
- **State management** — useReducer with 25 action types, split contexts for perf
- **Stage cards** — Name, fader, intensity readout, color swatches, media section
- **Vertical faders** — Pointer capture, velocity tracking, inertial settle, local state during drag
- **Master fader** — Horizontal drag with keyboard support
- **Blackout** — Toggle with pre-blackout level memory
- **Color picker** — 11 preset swatches + native `<input type="color">`
- **Color modal** — Full picker + 10-slot favorites persisted to localStorage
- **Media modal** — 4-column thumbnail grid, click-to-assign
- **Bank pagination** — 6 stages per bank, swipe navigation, dot indicators, offscreen hints
- **Preview strip** — Fixed bottom bar with live color/intensity per stage
- **Status indicators** — Connection, sync, watchdog pills
- **Tab navigation** — M3 tabs switching between Control and Overview
- **Overview page** — Zone on/off toggles, opacity sliders, master media bin, global controls
- **Production server** — `serve.cjs` serves dist/ and proxies /elm/ to local ELM
- **Windows deployment** — `serve.bat` for double-click start
- **Remote access** — Cloudflare Tunnel to `ctrl.dimly.app` confirmed working from cellular
- **Dark theme** — M3 tokens mapped from original design
- **iPad optimizations** — Safe area insets, viewport-fit, no zoom, no overscroll, touch-action

### Partially Working / Caveats
- **Media monitor (MJPEG)** — `media-monitor.tsx` exists and points at `/elm/media/slots/{id}/monitor`. Not yet integrated into `stage-card.tsx` (cards still use static thumbnails via `media-section.tsx`). Ready to swap in.
- **Overview global controls** — Sliders render and update local state. `postOverviewParams()` logs to console but does NOT POST to ELM. Needs group ID selection and wiring to `/elm/groups/{id}/performer`.
- **Blackout button** — Posts master intensity to 0 on blackout, but doesn't post the restore value on un-blackout (master fader handles it indirectly).

### Not Yet Built
- **Groups API** — `/elm/groups` endpoints are documented but no `api/groups.ts` exists
- **Live MJPEG in stage cards** — component built, not wired into `stage-card.tsx`
- **Live MJPEG in media modal** — stream previews on hover/long-press, not started
- **Refined design** — current UI is functional but hasn't been styled to the Rams/gmunk direction yet
- **3D Spatial View** — Three.js venue model (Phase 8)
- **Public portal** — `loop.dimly.app` with auth gate (Phase 9)
- **Custom GLSL shaders** — authoring workflow not built (ELM supports it natively)

### Known Issues / TODOs
1. **`postOverviewParams()` is a no-op** — `src/api/settings.ts:24-26` logs but doesn't POST. Needs group ID.
2. **`escapeHtml()` exported but unused** — `src/lib/color-utils.ts`
3. **`createThrottle` utilities exported but unused** — `src/lib/throttle.ts`
4. **`MARK_DIRTY` action defined but never dispatched** — dirty flags set inside other actions instead
5. **Lit dev mode warning** — M3 web components console warning, harmless, gone in production
6. **Node version** — Vite 5 works on Node 20.12 with engine warnings, not blocking

---

## Complete ELM HTTP API Reference

**Base URL:** `http://[PC-IP]:8057/elm/`
**Protocol:** HTTP REST, JSON responses
**Port:** 8057
**Auth:** Optional Basic Auth (not currently used)
**Names are case-insensitive.** Wildcard `*` in stage names targets multiple stages.
**Parameters** can be in query string or form data. Media ID 0 = empty slot.

### Settings
| Method | Endpoint | Parameters | Returns |
|--------|----------|------------|---------|
| GET | `/elm/status` | — | Statuses of all sub-systems |
| GET | `/elm/heartbeat` | — | 200 OK if server running |
| GET | `/elm/settings` | — | Master intensity, speed, output rate, scheduler, etc. |
| POST | `/elm/settings` | `masterIntensity` 0..1, `masterSpeed` 0..2 | — |

### Stages
| Method | Endpoint | Parameters | Returns |
|--------|----------|------------|---------|
| GET | `/elm/stages` | `includeState` 0 (names) or 1 (IDs + info) | List of stages |
| GET | `/elm/stages/{name or id}` | — | Stage id, name, width, height, merge |
| GET | `/elm/stages/{name or id}/live` | — | intensity, rgb, media, speed |
| POST | `/elm/stages/{name or id}/live` | `intensity` 0..1, `media` 0..255, `speed` 0..10, `transitionFx` {name}, `transitionDuration` 0..9999, `red` 0..255, `green` 0..255, `blue` 0..255, `audioMixControlled` 0/1, `remotelyControlled` 0/1 | — |
| POST | `/elm/stages/{name or id}/live/dvi` | `visible` 0 or 1 | Show/hide DVI windows |
| GET | `/elm/stages/{name or id}/patch` | — | List of all patched strips |
| GET | `/elm/stages/{name or id}/monitor` | `width`, `height`, `fps` | MJPEG stream of LED preview |
| GET | `/elm/stages/transitionFxNames` | — | List of valid transition effect names |

### Media
| Method | Endpoint | Parameters | Returns |
|--------|----------|------------|---------|
| GET | `/elm/media/slots` | `includeState` 0 (IDs only) or 1 (full state) | List of media slots |
| GET | `/elm/media/slots/{id}` | — | State of a single media slot |
| GET | `/elm/media/slots/{id}/thumbnail` | `width`, `height` | PNG thumbnail image |
| GET | `/elm/media/slots/{id}/monitor` | `width`, `height`, `fps` | MJPEG stream of media content |
| POST | `/elm/media/slots/{id}` | `path` (local file) or form file upload | Load/upload media |
| GET | `/elm/media/slots/{id}/parameters` | — | List of all media parameters |
| POST | `/elm/media/slots/{id}/parameters/{name}` | `value` (range per live panel) | Change parameter value |
| POST | `/elm/media/slots/{id}/parameters/text` | `value` (text) | Change text for text media |

### Groups / Sequences / Performer
| Method | Endpoint | Parameters | Returns |
|--------|----------|------------|---------|
| GET | `/elm/groups` | — | List of groups |
| GET | `/elm/groups/{name or id}/stages` | — | Stages in the group |
| GET | `/elm/groups/{name or id}/sequences` | — | Sequences in the group |
| GET | `/elm/groups/{name or id}/sequences/{seqId}` | — | Sequence info |
| POST | `/elm/groups/{name or id}/sequences/{seqId}/schedule` | `enabled` 0 or 1 | Enable/disable schedule |
| GET | `/elm/groups/{name or id}/performer` | — | Full performer state |
| POST | `/elm/groups/{name or id}/performer` | Any params from GET state except computed | Set performer params |
| POST | `/elm/groups/{name or id}/performer/go` | — | Next step in sequence |
| POST | `/elm/groups/{name or id}/performer/back` | — | Previous step in sequence |
| POST | `/elm/groups/{name or id}/performer/tap` | — | Tap tempo button |

### MJPEG stream notes
- **Stage monitor** (`/elm/stages/{id}/monitor`): Shows composited LED output — what the fixtures are actually doing (after merge, color filter, intensity). Use this for "truth of the room."
- **Media slot monitor** (`/elm/media/slots/{id}/monitor`): Shows raw content animation at full brightness/color. Use this for "what content is loaded." This is what we display on stage cards — so the operator sees the animation regardless of the stage's current intensity/color state.
- Both are MJPEG streams: point an `<img>` tag at the URL and it continuously pushes frames. No polling needed.
- For stage cards: `?width=160&height=90&fps=3` is the recommended starting point.

### OSC endpoints (for reference)
ELM also supports full OSC control at the same paths with `/elm/` prefix. OSC addresses mirror HTTP paths. See ELM manual page 52-53 for full OSC reference.

---

## Current ELM Project

### Stages (6 total)
| Name | ID | Size | Merge |
|------|----|------|-------|
| Main | `3efac436-6d0d-4c89-b638-7344d492bfa2` | 1280x720 | overwrite |
| All Strip | `7a09c113-e3be-4289-8a78-d4920095ebd5` | 1280x720 | overwrite |
| Sides | `faf6f1fa-c473-4827-bd74-7f4bda3d8b8a` | 1280x720 | add |
| Center LED | `70f9119f-3aa0-4cc0-9b72-74ece270963f` | 540x304 | overwrite |
| Mini Fixtures | `27bfb6ac-805c-4c08-9a3c-e2c4ecfcdcc2` | 540x304 | overwrite |
| Main Fixtures | `39be1fe8-617e-4bee-ba42-a17c1752befd` | 540x304 | overwrite |

### Groups (6 total, matching stages)
main, all strip, sides, center led, mini fixtures, main fixtures

### Media library
- 123 slots loaded (mostly GLSL shader effects + built-in animations)
- Types: glsl (GPU-rendered shaders), animation (built-in effects)
- Includes: Auroras, Particles, Noise Flow, FFT bars, Circle Scroll, Fireworks, Lightning, Plasma, etc.
- All effects are real-time GPU-rendered (OpenGL 3.3)
- ELM settings: masterIntensity=1, masterSpeed=1, outputRate=25

---

## UI Design Direction

### Philosophy
- **Rams + gmunk:** Functional clarity first (Dieter Rams), cinematic richness from the content itself (gmunk). The UI is a clean frame; the live previews are the visual richness.
- **The Rams test:** Could you remove anything else and still have it work? If yes, remove it.
- **Gmunk lives in the data, not the chrome.** The live MJPEG previews showing GLSL shaders are the visual richness — the UI framing them stays quiet.

### Target palette (not yet implemented)
- **Background:** `#111110` (warm dark gray, not pure black)
- **Text:** `#e0ddd8` (warm off-white)
- **Accent:** `#e8ff47` (yellow-green, used sparingly — active states only)
- **Touch feedback:** `rgba(120, 200, 220, 0.06)` (muted cyan on interactive surfaces)
- **Typography:** DM Mono (data/values), Syne (headings/labels)

### Stage card anatomy (target layout)
1. Stage name + active dot
2. Vertical fader (180px+ tall, 24px wide track)
3. Intensity number (28-32px, DM Mono)
4. Live media content preview — MJPEG from `/elm/media/slots/{id}/monitor`
5. Media name (tappable → opens media modal)
6. Color swatches row (6-8 preset circles, 28px, + custom picker)

---

## Key Performance Architecture

### Dirty flag system
When user drags a fader: `dirtyUntil[stageId] = Date.now() + 3000`
During sync: if `Date.now() < dirtyUntil[stageId]`, skip overwriting that stage from server.

### Fader local state
Faders own position via local `useState` during drag. Only accept server value when `!isDragging`.

### Sync engine
- Polls every 10 seconds
- Pauses during touch interaction and while modals are open
- 3 requests per cycle (stages, media, settings) instead of N+2
- Reconnection logic after consecutive failures

### Architecture decisions
- **Preact over React** — 4KB vs 140KB, same API
- **useReducer over Zustand** — single user, one screen, 6-20 stages
- **Single serve.cjs** — zero-dependency Node.js server, 80 lines
- **Faders own local state during drag** — biggest performance win over the old HTML version

---

## Dev Workflow

### Local development (Mac)
```bash
cd stage-controller
npm run dev          # Vite on :4200, proxies /elm/ to ELM server
```
For offline work: set `MOCK_ENABLED = true` in `src/api/mock.ts`.

### Build
```bash
npm run build        # TypeScript check + Vite production build → dist/
```

### Deploy to Windows PC
```bash
cd C:\Users\livingwalls\loop-lights
git pull
npm install          # only if deps changed
npm run build
# Restart serve.bat
```

### Environment variables
| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4200 | Server port |
| ELM_HOST | localhost | ELM server hostname |
| ELM_PORT | 8057 | ELM server port |

---

## Future Features (by phase)

### Phase 5: Modals refinement
- Media modal with animated MJPEG previews on visible tiles

### Phase 6: Overview Mode refinement
- Wire `postOverviewParams()` to actual ELM groups/performer API
- Create `api/groups.ts` with full groups endpoint support

### Phase 7: Polish
- Apply Rams/gmunk design direction
- iPad physical testing
- Resolve M3 vs vanilla CSS decision

### Phase 8: 3D Spatial View
- Three.js venue model with live color/intensity from ELM API

### Phase 9: Public Portal (loop.dimly.app)
- Auth gate via Cloudflare Access
- Simplified interface for clients/audience

---

## iPad-Specific Requirements

- Apple web app meta tags
- Safe area insets: `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`
- `viewport-fit: cover`, `user-scalable: no`
- `touch-action: none` on interactive elements
- `overscroll-behavior: none`
- Minimum touch targets: 44px
- `-webkit-tap-highlight-color: transparent`
