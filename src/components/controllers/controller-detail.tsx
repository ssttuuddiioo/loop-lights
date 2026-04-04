import type { ControllerSummary } from '../../api/health';

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--app-muted)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: color || 'var(--app-text)' }}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: preact.ComponentChildren }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
        color: 'var(--app-muted)', letterSpacing: '0.08em',
        textTransform: 'uppercase', marginBottom: 8,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export function ControllerDetail({
  controller,
  onBack,
}: {
  controller: ControllerSummary;
  onBack: () => void;
}) {
  const { status, temp, cpu, pixData, eth, universes, diag, nickname, model, firmware, ip, lastSeen } = controller;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 12,
      maxWidth: 480, width: '100%',
    }}>
      {/* Back button + header */}
      <button
        onClick={onBack}
        style={{
          all: 'unset', cursor: 'pointer',
          fontFamily: 'var(--font-mono)', fontSize: 12,
          color: 'var(--app-muted)', display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        &larr; All Controllers
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
          background: status.color,
        }} />
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600,
          color: 'var(--app-text)',
        }}>
          {nickname}
        </span>
      </div>

      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--app-muted)',
      }}>
        {model} &middot; fw {firmware} &middot; {ip}
      </div>

      <div style={{
        padding: '8px 12px', borderRadius: 'var(--app-radius-sm)',
        background: status.level === 'healthy' ? 'rgba(51,204,102,0.08)' :
                    status.level === 'warning' ? 'rgba(255,170,0,0.08)' :
                    status.level === 'error' ? 'rgba(255,51,51,0.08)' : 'rgba(102,102,102,0.08)',
        fontFamily: 'var(--font-mono)', fontSize: 12, color: status.color,
      }}>
        {status.reason}
      </div>

      {/* Temperature */}
      {temp && (
        <Section title="Temperature">
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
            padding: '10px 12px', borderRadius: 'var(--app-radius-sm)',
            background: 'var(--app-surface)', border: '1px solid var(--app-border)',
          }}>
            {[
              { label: 'Current', value: `${temp.current}\u00B0C`, color: temp.current >= 50 ? '#FF3333' : temp.current >= 45 ? '#FFAA00' : 'var(--app-text)' },
              { label: 'Min', value: `${temp.min}\u00B0C` },
              { label: 'Max', value: `${temp.max}\u00B0C` },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--app-muted)', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500, color: s.color || 'var(--app-text)' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* CPU */}
      {cpu != null && (
        <Section title="CPU">
          <StatRow label="Usage" value={`${cpu}%`} />
        </Section>
      )}

      {/* Pixel Data */}
      {pixData && (
        <Section title="Pixel Data">
          <div style={{
            padding: '8px 12px', borderRadius: 'var(--app-radius-sm)',
            background: 'var(--app-surface)', border: '1px solid var(--app-border)',
          }}>
            <StatRow label="Output Frame Rate" value={`${pixData.outFrmRate} Hz`} />
            <StatRow label="Input Frame Rate" value={`${pixData.inFrmRate} Hz`} />
            <StatRow label="Overrun" value={String(pixData.overrun)} />
            <StatRow label="Overrun Drop" value={String(pixData.overrunDrop)} />
            <StatRow label="Force Sync" value={pixData.forceSync ? 'Yes' : 'No'} />
            <StatRow label="Ext Sync" value={pixData.extSync ? 'Yes' : 'No'} />
          </div>
        </Section>
      )}

      {/* Ethernet */}
      {eth && (
        <Section title="Ethernet">
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
          }}>
            {(['port1', 'port2'] as const).map((port, i) => (
              <div key={port} style={{
                padding: '10px 12px', borderRadius: 'var(--app-radius-sm)',
                background: 'var(--app-surface)', border: '1px solid var(--app-border)',
                textAlign: 'center',
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--app-muted)', marginBottom: 4 }}>
                  ETH {i + 1}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500,
                  color: eth[port].linkUp ? '#33CC66' : '#FF3333',
                }}>
                  {eth[port].linkUp ? 'UP' : 'DOWN'}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--app-muted)', marginTop: 2 }}>
                  {eth[port].speed >= 1000 ? '1 Gbps' : `${eth[port].speed} Mbps`}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Universes */}
      {universes && (
        <Section title="Universes">
          <div style={{
            padding: '8px 12px', borderRadius: 'var(--app-radius-sm)',
            background: 'var(--app-surface)', border: '1px solid var(--app-border)',
          }}>
            <StatRow label="Total" value={String(universes.total)} />
            <StatRow label="Active" value={String(universes.active)} color="#33CC66" />
            <StatRow label="Timed Out" value={String(universes.timedOut)} color={universes.timedOut > 0 ? '#FFAA00' : 'var(--app-text)'} />
            <StatRow label="Source" value={universes.source} />
          </div>
        </Section>
      )}

      {/* Diagnostics */}
      {diag && (
        <Section title="Diagnostics">
          <div style={{
            padding: '8px 12px', borderRadius: 'var(--app-radius-sm)',
            background: 'var(--app-surface)', border: '1px solid var(--app-border)',
          }}>
            <StatRow label="Error Count" value={String(diag.errCnt)} color={diag.errCnt > 0 ? '#FF3333' : 'var(--app-text)'} />
            <StatRow label="Last Error" value={diag.err || 'None'} color={diag.err ? '#FF3333' : 'var(--app-muted)'} />
          </div>
        </Section>
      )}

      {/* Meta */}
      {lastSeen && (
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--app-muted)',
          textAlign: 'right', marginTop: 4,
        }}>
          Last seen: {new Date(lastSeen).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
