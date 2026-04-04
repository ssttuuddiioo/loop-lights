import type { ControllerSummary } from '../../api/health';

function formatOverrun(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function EthDot({ linkUp }: { linkUp: boolean }) {
  return (
    <span style={{
      display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
      background: linkUp ? '#33CC66' : '#FF3333',
      marginRight: 4, verticalAlign: 'middle',
    }} />
  );
}

export function ControllerCard({
  controller,
  onSelect,
}: {
  controller: ControllerSummary;
  onSelect: (ip: string) => void;
}) {
  const { status, temp, cpu, pixData, eth, universes, nickname, model, firmware, ip } = controller;
  const isOffline = status.level === 'offline';

  return (
    <button
      onClick={() => onSelect(ip)}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '14px 16px',
        borderRadius: 'var(--app-radius)',
        border: '1px solid var(--app-border)',
        background: 'var(--app-surface)',
        opacity: isOffline ? 0.5 : 1,
        transition: 'border-color 0.15s, opacity 0.15s',
        width: '100%',
        boxSizing: 'border-box',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = status.color)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--app-border)')}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
          background: status.color, flexShrink: 0,
        }} />
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
          color: 'var(--app-text)', flex: 1, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {nickname}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--app-muted)',
        }}>
          {ip}
        </span>
      </div>

      {/* Model / firmware */}
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--app-muted)',
        letterSpacing: '0.02em',
      }}>
        {model} &middot; fw {firmware}
      </div>

      {/* Stats grid */}
      {!isOffline && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 4, textAlign: 'center',
        }}>
          {[
            { label: 'TEMP', value: temp ? `${temp.current}\u00B0C` : '--' },
            { label: 'CPU', value: cpu != null ? `${cpu}%` : '--' },
            { label: 'IN', value: pixData ? `${pixData.inFrmRate}Hz` : '--' },
            { label: 'OUT', value: pixData ? `${pixData.outFrmRate}Hz` : '--' },
            { label: 'OVERRUN', value: pixData ? formatOverrun(pixData.overrun) : '--' },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 9,
                color: 'var(--app-muted)', letterSpacing: '0.06em',
                marginBottom: 2,
              }}>
                {label}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 13,
                color: 'var(--app-text)', fontWeight: 500,
              }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ethernet + Universes */}
      {!isOffline && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--app-muted)',
        }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {eth && (
              <>
                <span><EthDot linkUp={eth.port1.linkUp} />ETH1 {eth.port1.speed >= 1000 ? '1G' : `${eth.port1.speed}M`}</span>
                <span><EthDot linkUp={eth.port2.linkUp} />ETH2 {eth.port2.speed >= 1000 ? '1G' : `${eth.port2.speed}M`}</span>
              </>
            )}
          </div>
          {universes && (
            <span>{universes.active}/{universes.total} uni &middot; {universes.source}</span>
          )}
        </div>
      )}

      {/* Status reason */}
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: status.level === 'healthy' ? 'var(--app-muted)' : status.color,
        fontWeight: status.level === 'healthy' ? 400 : 500,
      }}>
        {status.reason}
      </div>
    </button>
  );
}
