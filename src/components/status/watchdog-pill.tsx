import { useAppState } from '../../state/context';
import '@material/web/chips/assist-chip.js';

export function WatchdogPill() {
  const { watchdogText, watchdogOk } = useAppState();
  const style = {
    '--md-assist-chip-label-text-color': watchdogOk ? 'var(--app-muted)' : 'var(--app-danger)',
    '--md-assist-chip-outline-color': watchdogOk ? 'var(--app-border2)' : 'var(--app-danger)',
  };

  return <span class="watchdog-pill"><md-assist-chip label={watchdogText} style={style} /></span>;
}
