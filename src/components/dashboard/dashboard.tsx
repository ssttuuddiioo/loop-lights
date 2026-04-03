import { useMemo } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { useAppState } from '../../state/context';

// --- System Status Header ---

function SystemStatus() {
  const { stages, connected, masterLevel, blackout } = useAppState();
  const activeCount = stages.filter(s => s.intensity > 0).length;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '24px',
      padding: '16px 20px',
      background: 'var(--app-surface)',
      border: '1px solid var(--app-border)',
      borderRadius: 'var(--app-radius)',
      flexWrap: 'wrap',
    }}>
      <StatusItem
        label="ELM"
        value={connected ? 'Connected' : 'Offline'}
        color={connected ? '#47ff6a' : 'var(--app-danger)'}
      />
      <StatusItem label="Stages" value={`${stages.length}`} />
      <StatusItem label="Active" value={`${activeCount}`} color={activeCount > 0 ? 'var(--app-text)' : 'var(--app-muted)'} />
      <StatusItem label="Master" value={blackout ? 'BLACKOUT' : `${masterLevel}%`} color={blackout ? 'var(--app-danger)' : 'var(--app-text)'} />
    </div>
  );
}

function StatusItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '10px', color: 'var(--app-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-sans)' }}>
        {label}
      </span>
      <span style={{ fontSize: '14px', fontWeight: 600, color: color || 'var(--app-text)', fontFamily: 'var(--font-mono)' }}>
        {value}
      </span>
    </div>
  );
}

// --- Stage Status Grid ---

function StageStatusGrid() {
  const { stages, mediaSlots, masterLevel, blackout } = useAppState();
  const [, navigate] = useLocation();

  const mediaMap = useMemo(() => {
    const map = new Map<string | number, string>();
    for (const slot of mediaSlots) {
      map.set(slot.id, slot.name);
    }
    return map;
  }, [mediaSlots]);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: '12px',
    }}>
      {stages.map((stage, i) => {
        const effective = blackout ? 0 : Math.round(stage.intensity * masterLevel / 100);
        const mediaName = mediaMap.get(stage.mediaId) || (stage.mediaId ? `Media ${stage.mediaId}` : 'None');

        return (
          <div
            key={stage.id}
            onClick={() => navigate('/mixer')}
            style={{
              background: 'var(--app-surface)',
              border: '1px solid var(--app-border)',
              borderRadius: 'var(--app-radius)',
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'border-color 0.15s',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--app-border2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--app-border)'; }}
          >
            {/* Top accent */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
              background: stage.color, opacity: effective / 100,
            }} />

            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.03em' }}>
                  {stage.name}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--app-muted)', marginTop: '1px' }}>
                  ZONE {String(i + 1).padStart(2, '0')}
                </div>
              </div>
              {/* Color swatch */}
              <div style={{
                width: '14px', height: '14px', borderRadius: '3px',
                background: stage.color,
                opacity: effective > 0 ? 1 : 0.3,
                border: '1px solid var(--app-border2)',
                flexShrink: 0,
              }} />
            </div>

            {/* Intensity bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{
                flex: 1, height: '6px',
                background: 'var(--app-border)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${effective}%`, height: '100%',
                  background: stage.color,
                  borderRadius: '3px',
                  transition: 'width 0.2s',
                }} />
              </div>
              <span style={{
                fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 500,
                color: effective > 0 ? 'var(--app-text)' : 'var(--app-muted)',
                minWidth: '32px', textAlign: 'right' as const,
              }}>
                {effective}%
              </span>
            </div>

            {/* Media name */}
            <div style={{
              fontSize: '11px', color: 'var(--app-muted)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {mediaName}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- SVG Intensity Chart ---

function IntensityChart() {
  const { stages, masterLevel, blackout } = useAppState();

  const barWidth = 48;
  const barGap = 12;
  const chartHeight = 140;
  const labelHeight = 28;
  const topPad = 8;
  const totalWidth = stages.length * (barWidth + barGap) - barGap;
  const svgWidth = totalWidth + 40; // left padding for axis
  const svgHeight = chartHeight + labelHeight + topPad;
  const originX = 32;

  return (
    <div style={{
      background: 'var(--app-surface)',
      border: '1px solid var(--app-border)',
      borderRadius: 'var(--app-radius)',
      padding: '16px 20px',
    }}>
      <div style={{ fontSize: '11px', color: 'var(--app-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '12px', fontFamily: 'var(--font-sans)' }}>
        Intensity Overview
      </div>
      <svg
        width="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ display: 'block', maxWidth: `${svgWidth}px` }}
      >
        {/* Y-axis labels */}
        <text x={originX - 6} y={topPad + 8} textAnchor="end" fill="var(--app-muted)" fontSize="9" fontFamily="var(--font-mono)">100</text>
        <text x={originX - 6} y={topPad + chartHeight / 2 + 3} textAnchor="end" fill="var(--app-muted)" fontSize="9" fontFamily="var(--font-mono)">50</text>
        <text x={originX - 6} y={topPad + chartHeight + 3} textAnchor="end" fill="var(--app-muted)" fontSize="9" fontFamily="var(--font-mono)">0</text>

        {/* Grid lines */}
        <line x1={originX} y1={topPad} x2={originX + totalWidth} y2={topPad} stroke="var(--app-border)" strokeWidth="0.5" />
        <line x1={originX} y1={topPad + chartHeight / 2} x2={originX + totalWidth} y2={topPad + chartHeight / 2} stroke="var(--app-border)" strokeWidth="0.5" />
        <line x1={originX} y1={topPad + chartHeight} x2={originX + totalWidth} y2={topPad + chartHeight} stroke="var(--app-border)" strokeWidth="0.5" />

        {/* Bars + labels */}
        {stages.map((stage, i) => {
          const effective = blackout ? 0 : Math.round(stage.intensity * masterLevel / 100);
          const barH = (effective / 100) * chartHeight;
          const x = originX + i * (barWidth + barGap);
          const y = topPad + chartHeight - barH;

          return (
            <g key={stage.id}>
              {/* Bar */}
              <rect
                x={x} y={y}
                width={barWidth} height={barH}
                fill={stage.color}
                opacity={effective > 0 ? 0.85 : 0.1}
                rx={3}
              />
              {/* Stage label */}
              <text
                x={x + barWidth / 2}
                y={topPad + chartHeight + labelHeight - 6}
                textAnchor="middle"
                fill="var(--app-muted)"
                fontSize="9"
                fontFamily="var(--font-mono)"
              >
                {stage.name.length > 8 ? stage.name.slice(0, 7) + '\u2026' : stage.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// --- Presets Placeholder ---

function PresetsSection() {
  return (
    <div style={{
      background: 'var(--app-surface)',
      border: '1px solid var(--app-border)',
      borderRadius: 'var(--app-radius)',
      padding: '16px 20px',
    }}>
      <div style={{ fontSize: '11px', color: 'var(--app-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-sans)' }}>
        Presets
      </div>
      <div style={{ fontSize: '13px', color: 'var(--app-muted)', marginTop: '8px' }}>
        Save and recall stage configurations — coming soon
      </div>
    </div>
  );
}

// --- Dashboard Page ---

export function Dashboard() {
  return (
    <div style={{
      padding: '24px 28px',
      paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
      maxWidth: '960px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <SystemStatus />
      <StageStatusGrid />
      <IntensityChart />
      <PresetsSection />
    </div>
  );
}
