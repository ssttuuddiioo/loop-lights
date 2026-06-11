/**
 * Safe-color clamp core (Node singleton).
 *
 * The "glitch zone" is the low-saturation + high-value corner of the HSV space
 * (washed-out near-white) that glitches the RGBW fixtures. This module is the
 * single enforcement point on the server side: it is require()'d by BOTH
 * serve.cjs (the /elm proxy) and src/scheduler.cjs (the scene engine), so they
 * share one in-memory zone. The /calibrate tool writes the zone to
 * safe-color.json via setZone()+saveToDisk(); the clamp reads getZone(), so a
 * recalibration takes effect without restarting the server.
 *
 * The browser mirror lives in src/lib/safe-color.ts (same math + policy).
 */

const fs = require('fs');
const path = require('path');

const ZONE_PATH = process.env.DIMLY_SAFE_COLOR_PATH || path.join(__dirname, '..', 'safe-color.json');

// Conservative pre-calibration default (mirrors safe-color.json). Used if the
// file is missing/unreadable so we always fail safe (clamping ON).
const DEFAULT_ZONE = { sMin: 0.45, vMax: 0.6, achromaticEps: 0.04 };

let zone = { ...DEFAULT_ZONE };
let calibration = { hues: [0, 60, 120, 180, 240, 300, 'gray'], marks: [] };

function loadFromDisk() {
  try {
    const raw = fs.readFileSync(ZONE_PATH, 'utf-8');
    const cfg = JSON.parse(raw);
    zone = {
      sMin: typeof cfg.sMin === 'number' ? cfg.sMin : DEFAULT_ZONE.sMin,
      vMax: typeof cfg.vMax === 'number' ? cfg.vMax : DEFAULT_ZONE.vMax,
      achromaticEps: typeof cfg.achromaticEps === 'number' ? cfg.achromaticEps : DEFAULT_ZONE.achromaticEps,
    };
    if (cfg.calibration && typeof cfg.calibration === 'object') calibration = cfg.calibration;
  } catch (_) {
    // Keep the safe default.
  }
  return zone;
}

function saveToDisk() {
  try {
    const out = { ...zone, calibration };
    fs.writeFileSync(ZONE_PATH, JSON.stringify(out, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('  [safe-color] Failed to save zone:', err.message);
    return false;
  }
}

function getZone() {
  return { ...zone };
}

function getCalibration() {
  return calibration;
}

/** Update the live zone (and optional calibration marks). Does not persist. */
function setZone(next) {
  if (next && typeof next.sMin === 'number') zone.sMin = next.sMin;
  if (next && typeof next.vMax === 'number') zone.vMax = next.vMax;
  if (next && typeof next.achromaticEps === 'number') zone.achromaticEps = next.achromaticEps;
  if (next && next.calibration && typeof next.calibration === 'object') calibration = next.calibration;
  return getZone();
}

// --- HSV <-> RGB (r,g,b in 0-255; h in 0-360; s,v in 0-1) ---

function rgbToHsv(r, g, b) {
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

function hsvToRgb(h, s, v) {
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
function clampRgbSafe(r, g, b) {
  const { sMin, vMax, achromaticEps } = zone;
  const { h, s, v } = rgbToHsv(r, g, b);
  if (!(s < sMin && v > vMax)) return { r, g, b };

  let ns = s, nv = v;
  if (s < achromaticEps) {
    nv = vMax;                            // no hue to saturate -> dim below the ceiling
  } else if ((sMin - s) <= (v - vMax)) {
    ns = sMin;                            // raise saturation, keep brightness
  } else {
    nv = vMax;                            // lower value, keep hue
  }
  return hsvToRgb(h, ns, nv);
}

/**
 * Rewrite the red/green/blue of an ELM `/stages/{id}/live` URL so the color is
 * outside the glitch zone. Pass-through for any other URL or partial color.
 */
function clampElmLiveUrl(rawUrl) {
  const qIdx = rawUrl.indexOf('?');
  if (qIdx === -1) return rawUrl;
  const reqPath = rawUrl.slice(0, qIdx);
  if (!/\/stages\/[^/]+\/live\/?$/.test(reqPath)) return rawUrl;

  const params = new URLSearchParams(rawUrl.slice(qIdx + 1));
  if (!(params.has('red') && params.has('green') && params.has('blue'))) return rawUrl;

  const r = parseInt(params.get('red'), 10);
  const g = parseInt(params.get('green'), 10);
  const b = parseInt(params.get('blue'), 10);
  if ([r, g, b].some(n => Number.isNaN(n))) return rawUrl;

  const safe = clampRgbSafe(r, g, b);
  if (safe.r === r && safe.g === g && safe.b === b) return rawUrl;

  params.set('red', String(safe.r));
  params.set('green', String(safe.g));
  params.set('blue', String(safe.b));
  return reqPath + '?' + params.toString();
}

loadFromDisk();

module.exports = {
  loadFromDisk,
  saveToDisk,
  getZone,
  setZone,
  getCalibration,
  rgbToHsv,
  hsvToRgb,
  clampRgbSafe,
  clampElmLiveUrl,
};
