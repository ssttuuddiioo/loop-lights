import type { StageState } from '../types/stage';
import type { MediaSlot } from '../types/media';
import type { AppAction } from './actions';
import { DIRTY_DURATION_MS } from '../lib/constants';

export interface AppState {
  // Stages
  stages: StageState[];
  masterLevel: number;
  blackout: boolean;
  preBlackoutLevel: number;
  preBlackoutStages: number[];
  dirtyUntil: Record<number, number>;
  masterDirtyUntil: number;

  // Media
  mediaSlots: MediaSlot[];

  // ELM
  elmOutputRate: number;

  // Connection
  connected: boolean;
  connectionMessage: string;
  syncStatus: 'syncing' | 'synced' | 'offline' | 'paused';
  watchdogText: string;
  watchdogOk: boolean;
  reconnectFailures: number;

  // UI
  currentBank: number;
  colorModalStageIndex: number | null;
  mediaModalStageIndex: number | null;
  shaderPreviewSlotId: string | number | null;
  paramPanelSlotId: string | number | null;
  paramPanelZoneIndex: number | null;
  userTouching: boolean;

  // Overview
  hueShift: number;
  speed: number;
  shaderParams: Record<string, number>;
}

export const initialState: AppState = {
  stages: [],
  masterLevel: 100,
  blackout: false,
  preBlackoutLevel: 100,
  preBlackoutStages: [],
  dirtyUntil: {},
  masterDirtyUntil: 0,

  mediaSlots: [],

  elmOutputRate: 0,

  connected: false,
  connectionMessage: 'CONNECTING',
  syncStatus: 'syncing',
  watchdogText: 'watching',
  watchdogOk: true,
  reconnectFailures: 0,

  currentBank: 0,
  colorModalStageIndex: null,
  mediaModalStageIndex: null,
  shaderPreviewSlotId: null,
  paramPanelSlotId: null,
  paramPanelZoneIndex: null,
  userTouching: false,

  hueShift: 0,
  speed: 0,
  shaderParams: {},
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_STAGES':
      return { ...state, stages: action.stages };

    case 'SET_STAGE_INTENSITY': {
      const stages = state.stages.map((s, i) =>
        i === action.index
          ? { ...s, intensity: action.value, baseIntensity: action.value }
          : s
      );
      return {
        ...state,
        stages,
        dirtyUntil: { ...state.dirtyUntil, [action.index]: Date.now() + DIRTY_DURATION_MS },
      };
    }

    case 'SET_STAGE_COLOR': {
      const stages = state.stages.map((s, i) =>
        i === action.index ? { ...s, color: action.hex } : s
      );
      return {
        ...state,
        stages,
        dirtyUntil: { ...state.dirtyUntil, [action.index]: Date.now() + DIRTY_DURATION_MS },
      };
    }

    case 'SET_STAGE_MEDIA': {
      const stages = state.stages.map((s, i) =>
        i === action.index ? { ...s, mediaId: action.mediaId } : s
      );
      return { ...state, stages };
    }

    case 'MARK_DIRTY':
      return {
        ...state,
        dirtyUntil: { ...state.dirtyUntil, [action.index]: Date.now() + DIRTY_DURATION_MS },
      };

    case 'SET_MASTER_LEVEL': {
      const level = Math.max(0, Math.min(100, action.level));
      const blackout = level === 0;
      return {
        ...state,
        masterLevel: level,
        blackout,
        preBlackoutLevel: blackout ? state.preBlackoutLevel : level,
        masterDirtyUntil: action.fromSync ? state.masterDirtyUntil : Date.now() + DIRTY_DURATION_MS,
      };
    }

    case 'TOGGLE_BLACKOUT': {
      const nowBlackout = !state.blackout;
      const dirty = Date.now() + DIRTY_DURATION_MS;
      const dirtyAll: Record<number, number> = { ...state.dirtyUntil };
      state.stages.forEach((_, i) => { dirtyAll[i] = dirty; });

      if (nowBlackout) {
        // Save current intensities, then zero everything
        const pre = state.masterLevel > 0 ? state.masterLevel : (state.preBlackoutLevel || 100);
        const savedStages = state.stages.map(s => s.intensity);
        const stages = state.stages.map(s => ({ ...s, intensity: 0 }));
        return {
          ...state, blackout: true, preBlackoutLevel: pre, preBlackoutStages: savedStages,
          masterLevel: 0, masterDirtyUntil: dirty, stages, dirtyUntil: dirtyAll,
        };
      } else {
        // Restore saved intensities
        const saved = state.preBlackoutStages;
        const stages = state.stages.map((s, i) => ({
          ...s, intensity: saved[i] ?? s.baseIntensity ?? 100,
        }));
        return {
          ...state, blackout: false, masterLevel: state.preBlackoutLevel || 100,
          masterDirtyUntil: dirty, stages, dirtyUntil: dirtyAll,
        };
      }
    }

    case 'SET_MEDIA_SLOTS':
      return { ...state, mediaSlots: action.slots };

    case 'SET_ELM_OUTPUT_RATE':
      return { ...state, elmOutputRate: action.rate };

    case 'SET_CONNECTED':
      return { ...state, connected: action.connected, connectionMessage: action.message || '' };

    case 'SET_SYNC_STATUS':
      return { ...state, syncStatus: action.status };

    case 'SET_WATCHDOG':
      return { ...state, watchdogText: action.text, watchdogOk: action.ok };

    case 'INCREMENT_FAILURES':
      return { ...state, reconnectFailures: state.reconnectFailures + 1 };

    case 'RESET_FAILURES':
      return { ...state, reconnectFailures: 0 };

    case 'SET_BANK':
      return { ...state, currentBank: action.bank };

    case 'OPEN_COLOR_MODAL':
      return { ...state, colorModalStageIndex: action.index, mediaModalStageIndex: null };

    case 'CLOSE_COLOR_MODAL':
      return { ...state, colorModalStageIndex: null };

    case 'OPEN_MEDIA_MODAL':
      return { ...state, mediaModalStageIndex: action.index, colorModalStageIndex: null };

    case 'CLOSE_MEDIA_MODAL':
      return { ...state, mediaModalStageIndex: null };

    case 'OPEN_SHADER_PREVIEW':
      return { ...state, shaderPreviewSlotId: action.slotId };

    case 'CLOSE_SHADER_PREVIEW':
      return { ...state, shaderPreviewSlotId: null };

    case 'SET_USER_TOUCHING':
      return { ...state, userTouching: action.touching };

    case 'SET_HUE_SHIFT':
      return { ...state, hueShift: action.degrees };

    case 'SET_SPEED':
      return { ...state, speed: action.value };

    case 'SET_SHADER_PARAM':
      return { ...state, shaderParams: { ...state.shaderParams, [action.key]: action.value } };

    case 'SET_ALL_MEDIA': {
      const stages = state.stages.map(s => ({ ...s, mediaId: action.mediaId }));
      return { ...state, stages };
    }

    case 'OPEN_PARAM_PANEL':
      return { ...state, paramPanelSlotId: action.slotId, paramPanelZoneIndex: action.zoneIndex };

    case 'CLOSE_PARAM_PANEL':
      return { ...state, paramPanelSlotId: null, paramPanelZoneIndex: null };

    case 'TOGGLE_ZONE': {
      const stages = state.stages.map((s, i) => {
        if (i !== action.index) return s;
        const isOff = s.intensity === 0;
        return {
          ...s,
          intensity: isOff ? (s.baseIntensity > 0 ? s.baseIntensity : 100) : 0,
          baseIntensity: isOff ? (s.baseIntensity > 0 ? s.baseIntensity : 100) : s.baseIntensity,
        };
      });
      return { ...state, stages };
    }

    default:
      return state;
  }
}
