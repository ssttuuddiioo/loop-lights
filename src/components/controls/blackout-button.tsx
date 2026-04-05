import { useCallback } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { postMasterIntensity } from '../../api/settings';
import '@material/web/button/filled-button.js';

export function BlackoutButton() {
  const { blackout, preBlackoutLevel } = useAppState();
  const dispatch = useAppDispatch();

  const onClick = useCallback(async () => {
    dispatch({ type: 'TOGGLE_BLACKOUT' });
    try {
      if (!blackout) {
        // Entering blackout → send 0 to ELM
        await postMasterIntensity(0);
      } else {
        // Restoring → send pre-blackout level to ELM
        await postMasterIntensity(preBlackoutLevel / 100);
      }
    } catch (err) {
      console.error('Blackout toggle failed:', err);
    }
  }, [blackout, preBlackoutLevel, dispatch]);

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
