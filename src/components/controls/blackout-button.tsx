import { useCallback } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { postMasterIntensity } from '../../api/settings';
import { postStageIntensity } from '../../api/stages';
import '@material/web/button/filled-button.js';

export function BlackoutButton() {
  const { blackout, preBlackoutLevel, preBlackoutStages, stages } = useAppState();
  const dispatch = useAppDispatch();

  const onClick = useCallback(async () => {
    // Capture current state before dispatch changes it
    const stageSnapshot = stages.map(s => ({ id: s.id, intensity: s.intensity }));
    const savedIntensities = preBlackoutStages;

    dispatch({ type: 'TOGGLE_BLACKOUT' });
    try {
      if (!blackout) {
        // Entering blackout → zero all stages + master
        await Promise.all([
          postMasterIntensity(0),
          ...stageSnapshot.map(s => postStageIntensity(s.id, 0)),
        ]);
      } else {
        // Restoring → restore all stages + master
        await Promise.all([
          postMasterIntensity(preBlackoutLevel / 100),
          ...stageSnapshot.map((s, i) =>
            postStageIntensity(s.id, (savedIntensities[i] ?? 100) / 100)
          ),
        ]);
      }
    } catch (err) {
      console.error('Blackout toggle failed:', err);
    }
  }, [blackout, preBlackoutLevel, preBlackoutStages, stages, dispatch]);

  return (
    <md-filled-button
      onClick={onClick}
      style={{
        '--md-filled-button-container-color': blackout ? 'var(--app-danger)' : 'transparent',
        '--md-filled-button-label-text-color': blackout ? '#fff' : 'var(--app-danger)',
        border: blackout ? 'none' : '1px solid var(--app-danger)',
        minHeight: '44px',
      }}
    >
      {blackout ? 'Restore' : 'Blackout'}
    </md-filled-button>
  );
}
