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
  dirtyUntil: Record<number, number>;

  // Media
  mediaSlots: MediaSlot[];

  // Connection
  connected: boolean;
  connectionMessage: string;
  syncStatus: 'syncing' | 'synced' | 'offline' | 'paused';
  watchdogText: string;
  watchdogOk: boolean;
  reconnectFailures: number;

  // UI
  activePage: 'control' | 'overview';
  currentBank: number;
  colorModalStageIndex: number | null;
  mediaModalStageIndex: number | null;
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
  dirtyUntil: {},

  mediaSlots: [],

  connected: false,
  connectionMessage: 'CONNECTING',
  syncStatus: 'syncing',
  watchdogText: 'watching',
  watchdogOk: true,
  reconnectFailures: 0,

  activePage: 'control',
  currentBank: 0,
  colorModalStageIndex: null,
  mediaModalStageIndex: null,
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
      };
    }

    case 'TOGGLE_BLACKOUT': {
      const nowBlackout = !state.blackout;
      if (nowBlackout) {
        const pre = state.masterLevel > 0 ? state.masterLevel : (state.preBlackoutLevel || 100);
        return { ...state, blackout: true, preBlackoutLevel: pre, masterLevel: 0 };
      } else {
        return { ...state, blackout: false, masterLevel: state.preBlackoutLevel || 100 };
      }
    }

    case 'SET_MEDIA_SLOTS':
      return { ...state, mediaSlots: action.slots };

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

    case 'SET_ACTIVE_PAGE':
      return { ...state, activePage: action.page };

    case 'SET_BANK':
      return { ...state, currentBank: action.bank };

    case 'OPEN_COLOR_MODAL':
      return { ...state, colorModalStageIndex: action.index };

    case 'CLOSE_COLOR_MODAL':
      return { ...state, colorModalStageIndex: null };

    case 'OPEN_MEDIA_MODAL':
      return { ...state, mediaModalStageIndex: action.index };

    case 'CLOSE_MEDIA_MODAL':
      return { ...state, mediaModalStageIndex: null };

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
