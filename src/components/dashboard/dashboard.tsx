import { useMemo } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { postStageIntensity } from '../../api/stages';
import { ColorPanel } from '../modals/color-modal';
import { MediaPanel } from '../modals/media-modal';

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

// --- Stage Card ---

function DashboardCard({ index }: { index: number }) {
  const { stages, masterLevel, blackout, mediaSlots } = useAppState();
  const dispatch = useAppDispatch();
  const stage = stages[index];
  if (!stage) return null;

  const effective = blackout ? 0 : Math.round(stage.intensity * masterLevel / 100);
  const isOn = stage.intensity > 0;
  const currentSlot = mediaSlots.find(s => String(s.id) === String(stage.mediaId));
  const mediaName = currentSlot?.name || 'None';

  return (
    <div
      onClick={() => {
        const newIntensity = isOn ? 0 : (stage.baseIntensity > 0 ? stage.baseIntensity : 100);
        dispatch({ type: 'SET_STAGE_INTENSITY', index, value: newIntensity });
        postStageIntensity(stage.id, newIntensity / 100).catch(console.error);
      }}
      style={{
        background: 'var(--app-surface)',
        border: '1px solid var(--app-border)',
        borderRadius: 'var(--app-radius)',
        padding: '20px 16px 24px',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: stage.color, opacity: effective / 100,
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.03em' }}>
            {stage.name}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--app-muted)', marginTop: '1px' }}>
            ZONE {String(index + 1).padStart(2, '0')}
          </div>
        </div>
        <span style={{
          padding: '3px 10px', borderRadius: '12px',
          fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-sans)',
          letterSpacing: '0.04em',
          background: isOn ? stage.color : 'var(--app-surface3)',
          color: isOn ? '#000' : 'var(--app-muted)',
          border: `1px solid ${isOn ? stage.color : 'var(--app-border2)'}`,
          transition: 'all 0.15s',
        }}>
          {isOn ? 'ON' : 'OFF'}
        </span>
      </div>

      {/* Intensity slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <input
          type="range" min={0} max={100} value={stage.intensity}
          onClick={(e) => e.stopPropagation()}
          onInput={(e) => {
            const val = parseInt((e.target as HTMLInputElement).value);
            dispatch({ type: 'SET_STAGE_INTENSITY', index, value: val });
          }}
          onChange={(e) => {
            const val = parseInt((e.target as HTMLInputElement).value);
            postStageIntensity(stage.id, val / 100).catch(console.error);
          }}
          style={{ flex: 1, height: '6px', accentColor: stage.color, cursor: 'pointer' }}
        />
        <span style={{
          fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 500,
          color: effective > 0 ? 'var(--app-text)' : 'var(--app-muted)',
          minWidth: '32px', textAlign: 'right' as const,
        }}>
          {effective}%
        </span>
      </div>

      {/* Color + Media buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={(e) => { e.stopPropagation(); dispatch({ type: 'OPEN_COLOR_MODAL', index }); }}
          style={{
            all: 'unset', cursor: 'pointer',
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '6px', borderRadius: 'var(--app-radius-sm)',
            background: 'var(--app-surface3)', border: '1px solid var(--app-border)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--app-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><circle cx="12" cy="7" r="2" fill={stage.color} stroke={stage.color} />
            <circle cx="7" cy="14" r="2" fill="#ff4d4d" stroke="#ff4d4d" /><circle cx="17" cy="14" r="2" fill="#4780ff" stroke="#4780ff" />
          </svg>
          <span style={{ fontSize: '10px', color: 'var(--app-muted)', fontFamily: 'var(--font-sans)' }}>Color</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); dispatch({ type: 'OPEN_MEDIA_MODAL', index }); }}
          style={{
            all: 'unset', cursor: 'pointer',
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '6px', borderRadius: 'var(--app-radius-sm)',
            background: 'var(--app-surface3)', border: '1px solid var(--app-border)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--app-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 14l5-5 4 4 3-3 8 8" />
            <circle cx="15" cy="9" r="2" />
          </svg>
          <span style={{ fontSize: '10px', color: 'var(--app-muted)', fontFamily: 'var(--font-sans)' }}>{mediaName}</span>
        </button>
      </div>
    </div>
  );
}

// --- Stage Grid with inline panels ---

function StageStatusGrid() {
  const { stages, colorModalStageIndex, mediaModalStageIndex } = useAppState();

  const panelIndex = colorModalStageIndex ?? mediaModalStageIndex ?? -1;
  const panelRow = panelIndex >= 0 ? Math.floor(panelIndex / 3) : -1;

  const items: preact.ComponentChildren[] = [];

  for (let rowStart = 0; rowStart < stages.length; rowStart += 3) {
    const rowEnd = Math.min(rowStart + 3, stages.length);

    // Render cards for this row
    for (let i = rowStart; i < rowEnd; i++) {
      items.push(<DashboardCard key={stages[i].id} index={i} />);
    }

    // If this row has the active panel, insert it spanning full width
    if (Math.floor(rowStart / 3) === panelRow) {
      items.push(
        <div
          key="inline-panel"
          style={{
            gridColumn: '1 / -1',
            background: 'var(--app-surface)',
            border: '1px solid var(--app-border2)',
            borderRadius: 'var(--app-radius)',
            overflow: 'hidden',
            minHeight: '280px',
          }}
        >
          {colorModalStageIndex !== null && <ColorPanel />}
          {mediaModalStageIndex !== null && <MediaPanel />}
        </div>
      );
    }
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '12px',
    }}>
      {items}
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
      padding: '24px 500px',
      paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
      maxWidth: '100%',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <SystemStatus />
      <StageStatusGrid />
      <PresetsSection />
    </div>
  );
}
