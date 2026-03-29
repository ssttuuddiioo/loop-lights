export interface StageInfo {
  id: string;
  name: string;
  width?: number;
  height?: number;
  merge?: string;
}

export interface StageLive {
  intensity?: number;     // 0-1
  red?: number;           // 0-255
  green?: number;         // 0-255
  blue?: number;          // 0-255
  media?: number;         // 0-99 (0 = empty)
  speed?: number;         // 0-10
  transitionFx?: string;
  transitionDuration?: number;
  testingMode?: number;
  remotelyControlled?: number;
  schedulerControlled?: number;
  audioMixControlled?: number;
}

export interface StageState {
  id: string;
  name: string;
  intensity: number;      // 0-100 (UI scale)
  baseIntensity: number;  // 0-100 (before master scaling)
  color: string;          // hex
  mediaId: string | number;
  speed?: number;         // 0-10
}
