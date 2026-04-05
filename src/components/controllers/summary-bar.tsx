import type { HealthResponse } from '../../api/health';
import { useAppState } from '../../state/context';

const LEVEL_LABELS: Record<string, string> = {
  healthy: 'All Healthy',
  warning: 'Warning',
  error: 'Error',
  offline: 'Offline',
};

export function SummaryBar({
  data,
  onRefresh,
  refreshing,
}: {
  data: HealthResponse;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const { elmOutputRate } = useAppState();

  const overallColor =
    data.overall === 'healthy' ? '#33CC66' :
    data.overall === 'warning' ? '#FFAA00' :
    data.overall === 'error' ? '#FF3333' : '#666666';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 16px',
      borderRadius: 'var(--app-radius)',
      border: '1px solid var(--app-border)',
      background: 'var(--app-surface)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
          background: overallColor,
        }} />
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--app-text)',
        }}>
          {data.respondingCount}/{data.controllerCount} Controllers Online
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 12, color: overallColor,
          fontWeight: 500,
        }}>
          {LEVEL_LABELS[data.overall] || data.overall}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--app-muted)',
          marginLeft: 8,
        }}>
          ELM {elmOutputRate || '—'} fps
        </span>
      </div>

      <button
        onClick={onRefresh}
        disabled={refreshing}
        style={{
          all: 'unset', cursor: refreshing ? 'default' : 'pointer',
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--app-muted)', padding: '4px 10px',
          borderRadius: 'var(--app-radius-sm)',
          border: '1px solid var(--app-border)',
          opacity: refreshing ? 0.5 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        {refreshing ? 'Polling...' : 'Refresh'}
      </button>
    </div>
  );
}
