import { useCallback } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { postMasterIntensity } from '../../api/settings';
import '@material/web/button/filled-button.js';

export function BlackoutButton() {
  const { blackout } = useAppState();
  const dispatch = useAppDispatch();

  const onClick = useCallback(async () => {
    dispatch({ type: 'TOGGLE_BLACKOUT' });
    // Read the new master level after toggle
    // Blackout → master=0, Restore → master=preBlackout
    // We post after the state update
    try {
      // Small delay to let reducer run, then read from DOM
      // Actually we know: if was blackout, we restore; if wasn't, we set 0
      const nextLevel = blackout ? undefined : 0;
      if (nextLevel === 0) {
        await postMasterIntensity(0);
      }
      // For restore, the master-fader component will post
    } catch (err) {
      console.error('Blackout toggle failed:', err);
    }
  }, [blackout, dispatch]);

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
