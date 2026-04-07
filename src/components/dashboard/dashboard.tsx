import { useState, useEffect, useCallback } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { postStageIntensity } from '../../api/stages';
import { getScenes, getSceneStatus, activateScene, toggleTrigger, fireManualTrigger } from '../../api/scenes';
import type { Scene, SceneStatus } from '../../api/scenes';

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

// --- Stage Card (simplified: on/off + intensity only) ---

function DashboardCard({ index }: { index: number }) {
  const { stages, masterLevel, blackout } = useAppState();
  const dispatch = useAppDispatch();
  const stage = stages[index];
  if (!stage) return null;

  const effective = blackout ? 0 : Math.round(stage.intensity * masterLevel / 100);
  const isOn = stage.intensity > 0;

  const toggleOnOff = () => {
    const newIntensity = isOn ? 0 : (stage.baseIntensity > 0 ? stage.baseIntensity : 100);
    dispatch({ type: 'SET_STAGE_INTENSITY', index, value: newIntensity });
    postStageIntensity(stage.id, newIntensity / 100).catch(console.error);
  };

  return (
    <div style={{
      background: 'var(--app-surface)',
      border: '1px solid var(--app-border)',
      borderRadius: 'var(--app-radius)',
      padding: '16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Top accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: stage.color, opacity: effective / 100,
      }} />

      {/* Header: name + on/off toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.03em' }}>
            {stage.name}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--app-muted)', marginTop: '1px' }}>
            ZONE {String(index + 1).padStart(2, '0')}
          </div>
        </div>
        <button
          onClick={toggleOnOff}
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: '36px',
            height: '20px',
            borderRadius: '10px',
            background: isOn ? stage.color : 'var(--app-surface3)',
            border: `1px solid ${isOn ? stage.color : 'var(--app-border2)'}`,
            position: 'relative',
            transition: 'background 0.15s, border-color 0.15s',
            flexShrink: 0,
          }}
        >
          <div style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: isOn ? '#fff' : 'var(--app-muted)',
            position: 'absolute',
            top: '2px',
            left: isOn ? '19px' : '2px',
            transition: 'left 0.15s, background 0.15s',
          }} />
        </button>
      </div>

      {/* Intensity slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="range" min={0} max={100} value={stage.intensity}
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
    </div>
  );
}

// --- Stage Grid ---

function StageStatusGrid() {
  const { stages } = useAppState();

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '12px',
    }}>
      {stages.map((s, i) => <DashboardCard key={s.id} index={i} />)}
    </div>
  );
}

// --- Presets (Scenes) ---

function PresetsSection() {
  const [scenes, setScenes] = useState<Record<string, Scene>>({});
  const [status, setStatus] = useState<SceneStatus | null>(null);

  const refresh = useCallback(() => {
    getScenes().then(setScenes).catch(console.error);
    getSceneStatus().then(setStatus).catch(console.error);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleActivate = async (sceneId: string) => {
    await activateScene(sceneId);
    refresh();
  };

  return (
    <div style={{
      background: 'var(--app-surface)',
      border: '1px solid var(--app-border)',
      borderRadius: 'var(--app-radius)',
      padding: '16px 20px',
    }}>
      <div style={{ fontSize: '11px', color: 'var(--app-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-sans)', marginBottom: '12px' }}>
        Presets
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {Object.entries(scenes).map(([id, scene]) => {
          const isActive = status?.activeScene === id;
          return (
            <button
              key={id}
              onClick={() => handleActivate(id)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                padding: '10px 20px',
                borderRadius: 'var(--app-radius-sm)',
                background: isActive ? 'var(--app-accent)' : 'var(--app-surface3)',
                border: `1px solid ${isActive ? 'var(--app-accent)' : 'var(--app-border)'}`,
                color: isActive ? '#fff' : 'var(--app-text)',
                fontSize: '13px',
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                transition: 'all 0.15s',
              }}
            >
              {scene.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Schedule (Triggers) ---

function ScheduleSection() {
  const [status, setStatus] = useState<SceneStatus | null>(null);

  const refresh = useCallback(() => {
    getSceneStatus().then(setStatus).catch(console.error);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleToggle = async (triggerId: string) => {
    await toggleTrigger(triggerId);
    refresh();
  };

  const handleFire = async (triggerId: string) => {
    await fireManualTrigger(triggerId);
    refresh();
  };

  if (!status) return null;

  const triggerEntries = Object.entries(status.triggers);

  return (
    <div style={{
      background: 'var(--app-surface)',
      border: '1px solid var(--app-border)',
      borderRadius: 'var(--app-radius)',
      padding: '16px 20px',
    }}>
      <div style={{ fontSize: '11px', color: 'var(--app-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-sans)', marginBottom: '12px' }}>
        Schedule
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {triggerEntries.map(([id, trigger]) => {
          const isActive = status.activeTrigger === id;
          return (
            <div
              key={id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: 'var(--app-radius-sm)',
                background: isActive ? 'var(--app-surface3)' : 'transparent',
                border: `1px solid ${isActive ? 'var(--app-border2)' : 'var(--app-border)'}`,
              }}
            >
              {/* Enable/disable toggle */}
              <button
                onClick={() => handleToggle(id)}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  width: '32px',
                  height: '18px',
                  borderRadius: '9px',
                  background: trigger.enabled ? '#47ff6a' : 'var(--app-surface3)',
                  border: `1px solid ${trigger.enabled ? '#47ff6a' : 'var(--app-border2)'}`,
                  position: 'relative',
                  transition: 'background 0.15s, border-color 0.15s',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: trigger.enabled ? '#fff' : 'var(--app-muted)',
                  position: 'absolute',
                  top: '2px',
                  left: trigger.enabled ? '17px' : '2px',
                  transition: 'left 0.15s, background 0.15s',
                }} />
              </button>

              {/* Type badge */}
              <span style={{
                fontSize: '9px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase' as const,
                padding: '2px 6px',
                borderRadius: '4px',
                background: trigger.type === 'manual' ? 'var(--app-surface3)' :
                             trigger.type === 'astro' ? '#2d2050' : '#1a3040',
                color: trigger.type === 'manual' ? 'var(--app-muted)' :
                       trigger.type === 'astro' ? '#c084fc' : '#38bdf8',
                flexShrink: 0,
              }}>
                {trigger.type}
              </span>

              {/* Label / ID */}
              <span style={{
                fontSize: '13px',
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
                color: trigger.enabled ? 'var(--app-text)' : 'var(--app-muted)',
                flex: 1,
              }}>
                {trigger.label || id.replace(/-/g, ' ')}
              </span>

              {/* Scene target */}
              <span style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--app-muted)',
              }}>
                {trigger.scene}
              </span>

              {/* Fire button for manual triggers */}
              {trigger.type === 'manual' && (
                <button
                  onClick={() => handleFire(id)}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    padding: '4px 12px',
                    borderRadius: 'var(--app-radius-sm)',
                    background: trigger.color || 'var(--app-surface3)',
                    border: '1px solid var(--app-border)',
                    fontSize: '11px',
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 600,
                    color: '#fff',
                    transition: 'opacity 0.15s',
                  }}
                >
                  Fire
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Dashboard Page ---

export function Dashboard() {
  return (
    <div style={{
      padding: '24px',
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
      <ScheduleSection />
    </div>
  );
}
