# Project Context: Stage Controller (loop-lights)

> Last updated: 2026-03-29
> Repo: https://github.com/ssttuuddiioo/loop-lights

## What This Is

A web-based stage lighting controller for ENTTEC ELM (LED Mapper). Built with Preact + Vite + Material 3. Runs on a Windows PC alongside ELM, accessed from iPads over WiFi. Replaces a legacy single-file HTML controller (`index-ipad-0.9.12.html`, 2300 lines) with a proper component architecture.

## Stack

| Dependency | Version | Purpose |
|---|---|---|
| preact | ^10.29.0 | UI framework (React-compatible, 4KB) |
| @material/web | ^2.4.1 | Google Material 3 web components |
| vite | ^5.4.21 | Dev server + production build |
| typescript | ~5.9.3 | Type safety |
| @preact/preset-vite | ^2.10.5 | Vite plugin for Preact JSX |

No state management library — uses `useReducer` + Context.

## File Structure

```
stage-controller/
├── index.html                     Entry HTML with iPad meta tags
├── package.json                   Scripts: dev, build, serve
├── vite.config.ts                 Port 4200, proxy /elm → ELM server
├── serve.cjs                      Production Node.js server (static + proxy)
├── serve.bat                      Windows double-click launcher
├── .env.example                   Environment variable template
├── README.md                      Setup instructions
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
│   │   │                          ⚠️  postOverviewParams — logs to console, not yet wired to API
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
│   │   │   ├── media-monitor.tsx  ✅ MJPEG live preview of media slot content
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
- **Tab navigation** — M3 tabs switching between Control and Overview (uses addEventListener for Preact compat)
- **Overview page** — Zone on/off toggles, opacity sliders, master media bin, global controls
- **Production server** — `serve.cjs` serves dist/ and proxies /elm/ to local ELM
- **Windows deployment** — `serve.bat` for double-click start
- **Dark theme** — M3 tokens mapped from original design (#0a0a0b bg, #e8ff47 accent, DM Mono + Syne)
- **iPad optimizations** — Safe area insets, viewport-fit: cover, no zoom, no overscroll, touch-action

### Partially Working / Caveats
- **Media monitor (MJPEG)** — `media-monitor.tsx` exists and points at `/elm/media/slots/{id}/monitor`. Not yet integrated into stage-card.tsx (stage-card still uses MediaSection with static thumbnails). The file is ready to swap in.
- **Overview global controls** — Sliders for hue shift, speed, blur, wave, glitch render and update local state. `postOverviewParams()` logs to console but does NOT actually POST to the ELM server yet. Needs group ID selection and wiring to `/elm/groups/{id}/performer`.
- **Blackout button** — Posts master intensity to 0 on blackout, but doesn't post the restore value on un-blackout (the master fader component handles it indirectly).

### Not Yet Built
- **Groups API** — `/elm/groups` endpoints are documented but no `api/groups.ts` exists. Overview controls need this to wire hue shift, speed, shader params to the performer endpoint.
- **Live MJPEG in stage cards** — `media-monitor.tsx` component is built but not imported into `stage-card.tsx`. Cards currently show static PNG thumbnails via `media-section.tsx`.
- **Live MJPEG in media modal** — Planned: stream media slot monitors on hover/long-press in the media modal. Not started.
- **Auto-start on Windows boot** — Documented in README but shortcut not created automatically.

## Known Issues / TODOs

1. **`postOverviewParams()` is a no-op** — `src/api/settings.ts:24-26` logs to console but the actual `elmPost()` call is commented out. Needs group ID.
2. **`escapeHtml()` exported but unused** — `src/lib/color-utils.ts`. Can remove or keep for future use.
3. **`createThrottle` utilities exported but unused** — `src/lib/throttle.ts`. Components use inline setTimeout instead. Can clean up.
4. **`MARK_DIRTY` action defined but never dispatched** — `src/state/actions.ts`. The reducer handles it but nothing calls it (dirty flags are set inside other actions like `SET_STAGE_INTENSITY`).
5. **Lit dev mode warning** — M3 web components show "Lit is in dev mode" warning in browser console. Harmless, goes away in production build.
6. **Node version** — Vite 5 works on Node 20.12 but shows engine warnings. Not blocking.

## ELM Server Details

| Property | Value |
|---|---|
| IP | 192.168.1.206 |
| Port | 8057 |
| API prefix | `/elm/` |
| Stages | 6: Main, All Strip, Sides, Center LED, Mini Fixtures, Main Fixtures |
| Groups | 6: main, all strip, sides, center led, mini fixtures, main fixtures |
| Media slots | 123 (mostly GLSL shader effects) |
| Stage IDs | GUIDs (e.g. `3efac436-6d0d-4c89-b638-7344d492bfa2`) |
| Settings | masterIntensity=1, masterSpeed=1, outputRate=25 |

### Key API Endpoints
```
GET  /elm/stages?includeState=1
GET  /elm/stages/{id}/live
POST /elm/stages/{id}/live?intensity=0..1&red=0..255&green=0..255&blue=0..255&media=0..99
GET  /elm/media/slots?includeState=1
GET  /elm/media/slots/{id}/thumbnail?width=256&height=128
GET  /elm/media/slots/{id}/monitor?width=160&height=90&fps=3  (MJPEG stream)
GET  /elm/settings
POST /elm/settings?masterIntensity=0..1&masterSpeed=0..2
GET  /elm/groups
POST /elm/groups/{id}/performer?intensity=0..1&speed=0..10&blackout=0|1
```

## Dev Workflow

### Local development (Mac)
```bash
cd stage-controller
npm run dev          # Vite dev server on :4200, proxies /elm/ to ELM server
```
Edit code, browser hot-reloads. ELM server must be reachable at 192.168.1.206:8057.

To work offline, set `MOCK_ENABLED = true` in `src/api/mock.ts`.

### Build
```bash
npm run build        # TypeScript check + Vite production build → dist/
```
Output: ~200KB total (index.html + one JS + one CSS).

### Deploy to Windows PC
```bash
# On the Windows PC:
cd loop-lights
git pull
npm install          # only needed if deps changed
npm run build
# Restart serve.bat
```

### Production server
```bash
npm run serve        # or double-click serve.bat on Windows
```
Serves `dist/` on port 4200, proxies `/elm/*` to `localhost:8057`.

Environment variables: `PORT` (default 4200), `ELM_HOST` (default localhost), `ELM_PORT` (default 8057).

## Network Setup

```
[Venue internet] → [Dedicated router, SSID: STAGE_CTRL]
                         |                    \
                      Ethernet              WiFi
                         |                    \
                   [ELM Windows PC]        [iPad]
                    192.168.1.206        192.168.1.x
                    :8057 (ELM)          opens :4200
                    :4200 (this app)
                         |
                   [LED controllers]
                    Art-Net / sACN
```

iPad opens `http://192.168.1.206:4200` → add to home screen for app-like experience.

## Architecture Decisions

- **Preact over React** — 4KB vs 140KB. Same API. Critical for iPad performance.
- **useReducer over Zustand** — Single user, one screen, 6-20 stages. No deep nesting that would justify a store library. Memo'd components + local fader state solve the re-render problem.
- **Material 3 web components** — Need `addEventListener` for events in Preact (not JSX event props). Used for buttons, chips, tabs, switches, sliders. Custom components for faders and color swatches.
- **Faders own local state during drag** — `useState` inside VerticalFader. Server sync can't stomp a value you're actively dragging. This is the single biggest performance win over the old HTML version.
- **Dirty flags** — `dirtyUntil[index] = Date.now() + 3000`. Sync engine skips overwriting recently-touched stages from server data.
- **Single serve.cjs** — Zero-dependency Node.js production server. No express, no fastify. Just `http`, `fs`, `path`. Serves static files + proxies API. One file, 80 lines.
