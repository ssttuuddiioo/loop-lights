/** API client for the glitch-zone calibration tool (admin-gated). */

import type { SafeZone } from '../lib/safe-color';

export interface SafeZoneResponse extends SafeZone {
  calibration?: {
    hues?: (number | string)[];
    marks?: CalibrationMark[];
    note?: string;
  };
}

/** A single (hue, s, v) cell the operator flagged as glitching. */
export interface CalibrationMark {
  h: number | 'gray';
  s: number;
  v: number;
}

/** Push a RAW (unclamped) color to a stage so we can probe the glitch boundary. */
export async function rawPush(
  stageId: string | number,
  r: number, g: number, b: number,
  intensity?: number,
): Promise<void> {
  const qp = [`stage=${encodeURIComponent(stageId)}`, `red=${r}`, `green=${g}`, `blue=${b}`];
  if (intensity !== undefined) qp.push(`intensity=${intensity}`);
  const res = await fetch(`/api/calibrate/push?${qp.join('&')}`, { method: 'POST' });
  if (!res.ok) throw new Error(`calibrate push failed: ${res.status}`);
}

/** Read the current calibrated zone (and stored marks). */
export async function getSafeColor(): Promise<SafeZoneResponse> {
  const res = await fetch('/api/safe-color');
  if (!res.ok) throw new Error(`safe-color fetch failed: ${res.status}`);
  return res.json() as Promise<SafeZoneResponse>;
}

/** Persist a calibrated zone + the raw marks. */
export async function saveCalibration(payload: {
  sMin: number;
  vMax: number;
  achromaticEps: number;
  calibration: { hues: (number | string)[]; marks: CalibrationMark[] };
}): Promise<{ success: boolean; zone?: SafeZone; error?: string }> {
  const res = await fetch('/api/calibrate/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}
