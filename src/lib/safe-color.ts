/**
 * Safe-color clamp core (browser mirror of src/safe-color.cjs).
 *
 * The "glitch zone" is the low-saturation + high-value corner of HSV space
 * (washed-out near-white) that glitches the RGBW fixtures. This is the
 * client-side floor + visible snap: the picker snaps to a safe color and dev
 * (Vite proxy) is covered even though the node proxy isn't in the path.
 *
 * The live zone is fetched once from GET /api/safe-color (written by the
 * /calibrate tool). Until that resolves — or in dev without the node server —
 * we fall back to a conservative default so clamping is always ON.
 */

import { hexToRgb, rgbToHex } from './color-utils';

export interface SafeZone {
  sMin: number;
  vMax: number;
  achromaticEps: number;
}

// Conservative pre-calibration default (mirrors safe-color.json).
const DEFAULT_ZONE: SafeZone = { sMin: 0.45, vMax: 0.6, achromaticEps: 0.04 };

let zone: SafeZone = { ...DEFAULT_ZONE };

export function getSafeZone(): SafeZone {
  return { ...zone };
}

export function setSafeZone(next: Partial<SafeZone>): void {
  if (typeof next.sMin === 'number') zone.sMin = next.sMin;
  if (typeof next.vMax === 'number') zone.vMax = next.vMax;
  if (typeof next.achromaticEps === 'number') zone.achromaticEps = next.achromaticEps;
}

/** Fetch the calibrated zone from the server once (call at app startup). */
export async function loadSafeZone(): Promise<SafeZone> {
  try {
    const res = await fetch('/api/safe-color');
    if (res.ok) {
      const cfg = await res.json();
      setSafeZone(cfg);
    }
  } catch {
    // Keep the safe default.
  }
  return getSafeZone();
}

// --- HSV <-> RGB (r,g,b in 0-255; h in 0-360; s,v in 0-1) ---

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) { r1 = c; g1 = x; }
  else if (h < 120) { r1 = x; g1 = c; }
  else if (h < 180) { g1 = c; b1 = x; }
  else if (h < 240) { g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; b1 = c; }
  else { r1 = c; b1 = x; }
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

/**
 * Clamp an RGB color out of the forbidden rectangle (s < sMin && v > vMax).
 * Moves to the NEAREST safe boundary — raise saturation OR lower value — never
 * toward black. Achromatic colors (no hue) can only lower value.
 */
export function clampRgbSafe(r: number, g: number, b: number): { r: number; g: number; b: number } {
  const { sMin, vMax, achromaticEps } = zone;
  const { h, s, v } = rgbToHsv(r, g, b);
  if (!(s < sMin && v > vMax)) return { r, g, b };

  let ns = s, nv = v;
  if (s < achromaticEps) {
    nv = vMax;
  } else if ((sMin - s) <= (v - vMax)) {
    ns = sMin;
  } else {
    nv = vMax;
  }
  return hsvToRgb(h, ns, nv);
}

/** Clamp a hex color; returns a safe hex (snaps the picker/swatch). */
export function clampHexSafe(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const safe = clampRgbSafe(r, g, b);
  return rgbToHex(safe.r, safe.g, safe.b);
}
