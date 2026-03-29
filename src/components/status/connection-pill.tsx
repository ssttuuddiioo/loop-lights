import { useAppState } from '../../state/context';
import '@material/web/chips/assist-chip.js';

export function ConnectionPill() {
  const { connected, connectionMessage } = useAppState();
  const label = connected ? 'CONNECTED' : (connectionMessage || 'OFFLINE');
  const style = {
    '--md-assist-chip-label-text-color': connected ? 'var(--app-accent)' : 'var(--app-danger)',
    '--md-assist-chip-outline-color': connected ? 'var(--app-border2)' : 'rgba(255,77,77,0.45)',
  };

  return <md-assist-chip label={label} style={style} />;
}
