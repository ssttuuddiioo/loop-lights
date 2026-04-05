---
name: R3F does not work with Preact
description: React Three Fiber is incompatible with Preact compat — use vanilla Three.js for 3D features
type: feedback
---

React Three Fiber (both v8 and v9) does NOT work with Preact via preact/compat aliasing. R3F uses react-reconciler which reaches into React internals that Preact doesn't implement. The error is `TypeError: Cannot read properties of undefined (reading 'transition')` at `requestCurrentTransition`.

**Why:** R3F's custom reconciler depends on React internal APIs (`use`, `act`, `requestCurrentTransition`) that Preact's compat layer doesn't expose. This is a fundamental incompatibility, not a configuration issue.

**How to apply:** For any 3D features in Dimly (or any Preact project), use vanilla Three.js with imperative setup in useEffect. The state bridge pattern: Preact component reads state via useAppState(), useEffect watches changes and imperatively updates Three.js materials/properties. Works perfectly. drei's Html component also fails (needs createRoot).
