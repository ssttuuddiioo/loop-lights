import { useAppState } from '../../state/context';

export function SyncStatus() {
  const { syncStatus } = useAppState();
  const color = syncStatus === 'synced' ? 'var(--app-accent)' : 'var(--app-danger)';

  return (
    <span class="sync-status" style={{ fontSize: '10px', color, minWidth: '60px', textAlign: 'right' }}>
      {syncStatus}
    </span>
  );
}
