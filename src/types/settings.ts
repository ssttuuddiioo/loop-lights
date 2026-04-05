export interface Settings {
  masterIntensity?: number; // 0-1
  outputRate?: number;      // fps
}

export interface OverviewParams {
  hueShift?: number;   // 0-360
  speed?: number;      // 0-1
  [key: string]: number | undefined;
}
