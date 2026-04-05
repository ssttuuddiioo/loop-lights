export const SWATCHES = [
  '#000000', '#ff3c3c', '#ff8c00', '#ffe600', '#47ff6a',
  '#00d4ff', '#4780ff', '#b44bff', '#ff4bd6',
  '#ffffff', '#aaaaaa',
] as const;

export const COLOR_PRESETS = [
  { name: 'White', hex: '#ffffff' },
  { name: 'Warm', hex: '#ffd28a' },
  { name: 'Brand', hex: '#e8ff47' },
  { name: 'Blue', hex: '#33a7ff' },
  { name: 'Magenta', hex: '#ff4bd6' },
  { name: 'Red', hex: '#ff3c3c' },
] as const;

export const STAGES_PER_BANK = 7;
export const SYNC_INTERVAL_MS = 10_000;
export const DIRTY_DURATION_MS = 3_000;
export const FADER_THROTTLE_MS = 60;
export const COLOR_THROTTLE_MS = 90;
export const OVERVIEW_THROTTLE_MS = 200;
export const INERTIA_CAP = 6;

export const VERSION = '2.0.0';
