import type { StageState } from '../types/stage';
import type { MediaSlot } from '../types/media';

// Stage actions
export const SET_STAGES = 'SET_STAGES' as const;
export const SET_STAGE_INTENSITY = 'SET_STAGE_INTENSITY' as const;
export const SET_STAGE_COLOR = 'SET_STAGE_COLOR' as const;
export const SET_STAGE_MEDIA = 'SET_STAGE_MEDIA' as const;
export const MARK_DIRTY = 'MARK_DIRTY' as const;

// Master actions
export const SET_MASTER_LEVEL = 'SET_MASTER_LEVEL' as const;
export const TOGGLE_BLACKOUT = 'TOGGLE_BLACKOUT' as const;

// Media actions
export const SET_MEDIA_SLOTS = 'SET_MEDIA_SLOTS' as const;

// Connection actions
export const SET_CONNECTED = 'SET_CONNECTED' as const;
export const SET_SYNC_STATUS = 'SET_SYNC_STATUS' as const;
export const SET_WATCHDOG = 'SET_WATCHDOG' as const;
export const INCREMENT_FAILURES = 'INCREMENT_FAILURES' as const;
export const RESET_FAILURES = 'RESET_FAILURES' as const;

// UI actions
export const SET_BANK = 'SET_BANK' as const;
export const OPEN_COLOR_MODAL = 'OPEN_COLOR_MODAL' as const;
export const CLOSE_COLOR_MODAL = 'CLOSE_COLOR_MODAL' as const;
export const OPEN_MEDIA_MODAL = 'OPEN_MEDIA_MODAL' as const;
export const CLOSE_MEDIA_MODAL = 'CLOSE_MEDIA_MODAL' as const;
export const SET_USER_TOUCHING = 'SET_USER_TOUCHING' as const;

// Shader preview
export const OPEN_SHADER_PREVIEW = 'OPEN_SHADER_PREVIEW' as const;
export const CLOSE_SHADER_PREVIEW = 'CLOSE_SHADER_PREVIEW' as const;

// Parameter panel (overview per-zone)
export const OPEN_PARAM_PANEL = 'OPEN_PARAM_PANEL' as const;
export const CLOSE_PARAM_PANEL = 'CLOSE_PARAM_PANEL' as const;

// Overview actions
export const SET_HUE_SHIFT = 'SET_HUE_SHIFT' as const;
export const SET_SPEED = 'SET_SPEED' as const;
export const SET_SHADER_PARAM = 'SET_SHADER_PARAM' as const;
export const SET_ALL_MEDIA = 'SET_ALL_MEDIA' as const;
export const TOGGLE_ZONE = 'TOGGLE_ZONE' as const;

export type AppAction =
  | { type: typeof SET_STAGES; stages: StageState[] }
  | { type: typeof SET_STAGE_INTENSITY; index: number; value: number }
  | { type: typeof SET_STAGE_COLOR; index: number; hex: string }
  | { type: typeof SET_STAGE_MEDIA; index: number; mediaId: string | number }
  | { type: typeof MARK_DIRTY; index: number }
  | { type: typeof SET_MASTER_LEVEL; level: number }
  | { type: typeof TOGGLE_BLACKOUT }
  | { type: typeof SET_MEDIA_SLOTS; slots: MediaSlot[] }
  | { type: typeof SET_CONNECTED; connected: boolean; message?: string }
  | { type: typeof SET_SYNC_STATUS; status: 'syncing' | 'synced' | 'offline' | 'paused' }
  | { type: typeof SET_WATCHDOG; text: string; ok: boolean }
  | { type: typeof INCREMENT_FAILURES }
  | { type: typeof RESET_FAILURES }
  | { type: typeof SET_BANK; bank: number }
  | { type: typeof OPEN_COLOR_MODAL; index: number }
  | { type: typeof CLOSE_COLOR_MODAL }
  | { type: typeof OPEN_MEDIA_MODAL; index: number }
  | { type: typeof CLOSE_MEDIA_MODAL }
  | { type: typeof SET_USER_TOUCHING; touching: boolean }
  | { type: typeof SET_HUE_SHIFT; degrees: number }
  | { type: typeof SET_SPEED; value: number }
  | { type: typeof SET_SHADER_PARAM; key: string; value: number }
  | { type: typeof SET_ALL_MEDIA; mediaId: string | number }
  | { type: typeof TOGGLE_ZONE; index: number }
  | { type: typeof OPEN_SHADER_PREVIEW; slotId: string | number }
  | { type: typeof CLOSE_SHADER_PREVIEW }
  | { type: typeof OPEN_PARAM_PANEL; slotId: string | number; zoneIndex: number }
  | { type: typeof CLOSE_PARAM_PANEL };
