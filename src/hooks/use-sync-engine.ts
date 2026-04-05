import { useEffect, useRef } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../state/context';
import { getStages, getStageLive } from '../api/stages';
import { getMediaSlots } from '../api/media';
import { getSettings } from '../api/settings';
import type { Settings } from '../types/settings';
import { rgbToHex } from '../lib/color-utils';
import { SYNC_INTERVAL_MS, SWATCHES } from '../lib/constants';
import { MOCK_ENABLED, MOCK_STAGES, MOCK_MEDIA_SLOTS } from '../api/mock';
import type { AppState } from '../state/reducer';
import type { StageState } from '../types/stage';
import type { AppAction } from '../state/actions';

export function useSyncEngine() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const stateRef = useRef<AppState>(state);
  const dispatchRef = useRef<(a: AppAction) => void>(dispatch);
  const syncInFlight = useRef(false);
  const mockLoaded = useRef(false);

  // Keep refs current
  stateRef.current = state;
  dispatchRef.current = dispatch;

  useEffect(() => {
    async function tick() {
      const s = stateRef.current;
      const d = dispatchRef.current;

      // Mock mode: load mock data once, then skip sync
      if (MOCK_ENABLED) {
        if (!mockLoaded.current) {
          mockLoaded.current = true;
          d({ type: 'SET_STAGES', stages: MOCK_STAGES });
          d({ type: 'SET_MEDIA_SLOTS', slots: MOCK_MEDIA_SLOTS });
          d({ type: 'SET_CONNECTED', connected: true, message: 'MOCK' });
          d({ type: 'SET_SYNC_STATUS', status: 'synced' });
          d({ type: 'SET_WATCHDOG', text: 'mock', ok: true });
        }
        return;
      }

      // Pause sync during touch or modals
      if (s.userTouching || s.colorModalStageIndex !== null || s.mediaModalStageIndex !== null) {
        d({ type: 'SET_WATCHDOG', text: 'paused', ok: true });
        return;
      }

      if (syncInFlight.current) return;
      syncInFlight.current = true;

      try {
        const [stageInfos, mediaSlots, settings] = await Promise.all([
          getStages(),
          getMediaSlots().catch(() => []),
          getSettings().catch((): Settings => ({})),
        ]);

        d({ type: 'SET_MEDIA_SLOTS', slots: mediaSlots });

        // Fetch live state for each stage
        const liveStates = await Promise.all(
          stageInfos.map(async (info) => {
            try {
              const live = await getStageLive(info.id);
              return { info, live };
            } catch {
              return { info, live: null };
            }
          })
        );

        const now = Date.now();
        const currentState = stateRef.current;
        const newStages: StageState[] = liveStates.map(({ info, live }, index) => {
          // If this stage is dirty, keep existing local state
          const isDirty = (currentState.dirtyUntil[index] || 0) > now;
          const existing = currentState.stages[index];

          if (isDirty && existing) {
            return existing;
          }

          const intensity = live ? Math.round(Number(live.intensity || 0) * 100) : 0;
          const mediaId = live?.media ?? '';
          const color = live
            ? rgbToHex(live.red || 0, live.green || 0, live.blue || 0)
            : SWATCHES[index % SWATCHES.length];

          return {
            id: info.id,
            name: info.name || `Stage ${index + 1}`,
            intensity,
            baseIntensity: intensity,
            color,
            mediaId,
          };
        });

        d({ type: 'SET_STAGES', stages: newStages });

        // Update master from server (skip if recently changed locally)
        if (settings.masterIntensity !== undefined && (currentState.masterDirtyUntil || 0) < now) {
          const masterPct = Math.max(0, Math.min(100, Math.round(Number(settings.masterIntensity) * 100)));
          d({ type: 'SET_MASTER_LEVEL', level: masterPct, fromSync: true });
        }

        d({ type: 'SET_CONNECTED', connected: true });
        d({ type: 'SET_SYNC_STATUS', status: 'synced' });
        d({ type: 'SET_WATCHDOG', text: 'watching', ok: true });
        d({ type: 'RESET_FAILURES' });
      } catch (err) {
        console.error('Sync failed:', err);
        const currentState = stateRef.current;
        d({ type: 'SET_CONNECTED', connected: false, message: 'OFFLINE' });
        d({ type: 'SET_SYNC_STATUS', status: 'offline' });
        d({ type: 'INCREMENT_FAILURES' });

        if (currentState.reconnectFailures >= 2) {
          d({ type: 'SET_WATCHDOG', text: 'reconnecting', ok: false });
        } else {
          d({ type: 'SET_WATCHDOG', text: `retry ${currentState.reconnectFailures + 1}`, ok: false });
        }
      } finally {
        syncInFlight.current = false;
      }
    }

    tick();
    const handle = setInterval(tick, SYNC_INTERVAL_MS);
    return () => clearInterval(handle);
  }, []);
}
