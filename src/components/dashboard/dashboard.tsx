import { useState, useEffect, useCallback } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { postStageIntensity } from '../../api/stages';
import {
  getScenes, getSceneStatus, activateScene, toggleTrigger,
  saveScene, deleteScene, updateTrigger,
} from '../../api/scenes';
import type { Scene, SceneStatus, FullTrigger } from '../../api/scenes';

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

function DashboardCard({ index, fullWidth }: { index: number; fullWidth?: boolean }) {
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
      ...(fullWidth ? { gridColumn: '1 / -1' } : {}),
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

// --- Stage Grid: 6 across top row, FACADE full width below ---

function StageStatusGrid() {
  const { stages } = useAppState();

  // Find the FACADE index (case-insensitive)
  const facadeIndex = stages.findIndex(s => s.name.toUpperCase() === 'FACADE');
  const topStages = stages.filter((_, i) => i !== facadeIndex);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Top row: all non-facade stages in one row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${topStages.length}, 1fr)`,
        gap: '12px',
      }}>
        {topStages.map((s) => {
          const originalIndex = stages.findIndex(st => st.id === s.id);
          return <DashboardCard key={s.id} index={originalIndex} />;
        })}
      </div>

      {/* Facade full width */}
      {facadeIndex >= 0 && (
        <DashboardCard index={facadeIndex} fullWidth />
      )}
    </div>
  );
}

// --- Hex/RGB helpers ---

function hexToRgb(hex: string): { red: number; green: number; blue: number } {
  const h = hex.replace('#', '');
  return {
    red: parseInt(h.substring(0, 2), 16) / 255,
    green: parseInt(h.substring(2, 4), 16) / 255,
    blue: parseInt(h.substring(4, 6), 16) / 255,
  };
}

// --- Preset Editor ---

interface ZoneConfig {
  media: number;
  color: string;
  intensity: number;
}

function PresetEditor({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const { stages, mediaSlots } = useAppState();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const [zones, setZones] = useState<Record<string, ZoneConfig>>(() => {
    const initial: Record<string, ZoneConfig> = {};
    for (const stage of stages) {
      initial[stage.name] = {
        media: Number(stage.mediaId) || 1,
        color: stage.color || '#ffffff',
        intensity: stage.intensity / 100,
      };
    }
    return initial;
  });

  const updateZone = (zoneName: string, field: keyof ZoneConfig, value: number | string) => {
    setZones(prev => ({ ...prev, [zoneName]: { ...prev[zoneName], [field]: value } }));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const id = name.trim().toLowerCase().replace(/\s+/g, '-');
    const stagesConfig: Record<string, { media: number; intensity: number; speed: number; color: { red: number; green: number; blue: number } }> = {};
    for (const [zoneName, config] of Object.entries(zones)) {
      const rgb = hexToRgb(config.color);
      stagesConfig[zoneName] = {
        media: config.media,
        intensity: config.intensity,
        speed: 0.5,
        color: rgb,
      };
    }
    await saveScene({ id, scene: { name: name.trim(), description: 'Custom preset', stages: stagesConfig } });
    setSaving(false);
    onSaved();
  };

  return (
    <div style={{
      background: 'var(--app-surface2)',
      border: '1px solid var(--app-border2)',
      borderRadius: 'var(--app-radius)',
      padding: '16px',
      marginTop: '8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Preset name..."
          value={name}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
          style={{
            flex: 1,
            background: 'var(--app-surface)',
            border: '1px solid var(--app-border)',
            borderRadius: 'var(--app-radius-sm)',
            padding: '8px 12px',
            color: 'var(--app-text)',
            fontSize: '13px',
            fontFamily: 'var(--font-sans)',
            outline: 'none',
          }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {stages.map((stage) => {
          const config = zones[stage.name];
          if (!config) return null;
          return (
            <div key={stage.name} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 10px',
              background: 'var(--app-surface)',
              borderRadius: 'var(--app-radius-sm)',
              border: '1px solid var(--app-border)',
            }}>
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-sans)', fontWeight: 600, color: 'var(--app-text)', width: '90px', flexShrink: 0 }}>
                {stage.name}
              </span>
              <select
                value={config.media}
                onChange={(e) => updateZone(stage.name, 'media', parseInt((e.target as HTMLSelectElement).value))}
                style={{
                  background: 'var(--app-surface3)', border: '1px solid var(--app-border)',
                  borderRadius: 'var(--app-radius-sm)', padding: '4px 8px',
                  color: 'var(--app-text)', fontSize: '11px', fontFamily: 'var(--font-sans)',
                  width: '140px', flexShrink: 0, outline: 'none',
                }}
              >
                {mediaSlots.map(slot => (
                  <option key={slot.id} value={Number(slot.id)}>{Number(slot.id)}. {slot.name}</option>
                ))}
              </select>
              <input
                type="color" value={config.color}
                onInput={(e) => updateZone(stage.name, 'color', (e.target as HTMLInputElement).value)}
                style={{ width: '28px', height: '28px', border: '1px solid var(--app-border)', borderRadius: '4px', padding: 0, cursor: 'pointer', background: 'transparent', flexShrink: 0 }}
              />
              <input
                type="range" min={0} max={100}
                value={Math.round(config.intensity * 100)}
                onInput={(e) => updateZone(stage.name, 'intensity', parseInt((e.target as HTMLInputElement).value) / 100)}
                style={{ flex: 1, height: '4px', accentColor: config.color, cursor: 'pointer' }}
              />
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--app-muted)', width: '32px', textAlign: 'right' as const }}>
                {Math.round(config.intensity * 100)}%
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{
          all: 'unset', cursor: 'pointer', padding: '6px 16px', borderRadius: 'var(--app-radius-sm)',
          background: 'var(--app-surface3)', border: '1px solid var(--app-border)',
          fontSize: '12px', fontFamily: 'var(--font-sans)', fontWeight: 600, color: 'var(--app-muted)',
        }}>Cancel</button>
        <button onClick={handleSave} disabled={!name.trim() || saving} style={{
          all: 'unset', cursor: name.trim() ? 'pointer' : 'not-allowed',
          padding: '6px 16px', borderRadius: 'var(--app-radius-sm)',
          background: name.trim() ? 'var(--app-accent)' : 'var(--app-surface3)',
          border: '1px solid var(--app-border)',
          fontSize: '12px', fontFamily: 'var(--font-sans)', fontWeight: 600,
          color: name.trim() ? '#fff' : 'var(--app-muted)', opacity: saving ? 0.6 : 1,
        }}>{saving ? 'Saving...' : 'Save Preset'}</button>
      </div>
    </div>
  );
}

// --- Presets (Scenes) ---

function PresetsSection() {
  const [scenes, setScenes] = useState<Record<string, Scene>>({});
  const [status, setStatus] = useState<SceneStatus | null>(null);
  const [editing, setEditing] = useState(false);

  const refresh = useCallback(() => {
    getScenes().then(setScenes).catch(console.error);
    getSceneStatus().then(setStatus).catch(console.error);
  }, []);

  useEffect(() => {
    refresh();
    if (editing) return;
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh, editing]);

  const handleActivate = async (sceneId: string) => {
    await activateScene(sceneId);
    refresh();
    window.dispatchEvent(new Event('dimly:force-sync'));
  };

  const handleDelete = async (sceneId: string) => {
    const result = await deleteScene(sceneId);
    if (!result.success && result.error) {
      alert(result.error);
    }
    refresh();
  };

  return (
    <div style={{
      background: 'var(--app-surface)',
      border: '1px solid var(--app-border)',
      borderRadius: 'var(--app-radius)',
      padding: '16px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: 'var(--app-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-sans)' }}>
          Presets
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} style={{
            all: 'unset', cursor: 'pointer', fontSize: '11px', fontFamily: 'var(--font-sans)', fontWeight: 600, color: 'var(--app-accent)',
          }}>+ New</button>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {Object.entries(scenes).map(([id, scene]) => {
          const isActive = status?.activeScene === id;
          return (
            <div key={id} style={{ position: 'relative', display: 'inline-flex' }}>
              <button onClick={() => handleActivate(id)} style={{
                all: 'unset', cursor: 'pointer', padding: '10px 20px',
                borderRadius: 'var(--app-radius-sm)',
                background: isActive ? 'var(--app-accent)' : 'var(--app-surface3)',
                border: `1px solid ${isActive ? 'var(--app-accent)' : 'var(--app-border)'}`,
                color: isActive ? '#000' : 'var(--app-text)',
                fontSize: '13px', fontFamily: 'var(--font-sans)', fontWeight: 600, transition: 'all 0.15s',
              }}>{scene.name}</button>
              {editing && id !== 'blackout' && (
                <button onClick={(e) => { e.stopPropagation(); handleDelete(id); }} style={{
                  all: 'unset', cursor: 'pointer', position: 'absolute', top: '-4px', right: '-4px',
                  width: '16px', height: '16px', borderRadius: '50%',
                  background: 'var(--app-surface3)', border: '1px solid var(--app-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', color: 'var(--app-muted)', lineHeight: 1,
                }}>x</button>
              )}
            </div>
          );
        })}
      </div>
      {editing && (
        <PresetEditor
          onSaved={() => { setEditing(false); refresh(); }}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}

// --- Clock Trigger Editor ---

function ClockTriggerEditor({ triggerId, trigger, onDone }: {
  triggerId: string;
  trigger: FullTrigger;
  onDone: () => void;
}) {
  const [time, setTime] = useState(trigger.schedule?.time || '23:00');
  const [scene, setScene] = useState(trigger.scene);
  const [scenes, setScenes] = useState<Record<string, Scene>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getScenes().then(setScenes).catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await updateTrigger(triggerId, {
      schedule: { ...trigger.schedule, time },
      scene,
    });
    setSaving(false);
    onDone();
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '8px 12px', marginTop: '6px',
      background: 'var(--app-surface2)',
      borderRadius: 'var(--app-radius-sm)',
      border: '1px solid var(--app-border2)',
    }}>
      <span style={{ fontSize: '11px', color: 'var(--app-muted)', fontFamily: 'var(--font-sans)' }}>Time</span>
      <input
        type="time" value={time}
        onInput={(e) => setTime((e.target as HTMLInputElement).value)}
        style={{
          background: 'var(--app-surface)', border: '1px solid var(--app-border)',
          borderRadius: 'var(--app-radius-sm)', padding: '4px 8px',
          color: 'var(--app-text)', fontSize: '12px', fontFamily: 'var(--font-mono)',
          outline: 'none',
        }}
      />
      <span style={{ fontSize: '11px', color: 'var(--app-muted)', fontFamily: 'var(--font-sans)' }}>Scene</span>
      <select
        value={scene}
        onChange={(e) => setScene((e.target as HTMLSelectElement).value)}
        style={{
          background: 'var(--app-surface3)', border: '1px solid var(--app-border)',
          borderRadius: 'var(--app-radius-sm)', padding: '4px 8px',
          color: 'var(--app-text)', fontSize: '11px', fontFamily: 'var(--font-sans)',
          outline: 'none',
        }}
      >
        {Object.entries(scenes).map(([id, s]) => (
          <option key={id} value={id}>{s.name}</option>
        ))}
      </select>
      <button onClick={handleSave} disabled={saving} style={{
        all: 'unset', cursor: 'pointer', padding: '4px 12px',
        borderRadius: 'var(--app-radius-sm)',
        background: 'var(--app-accent)', border: '1px solid var(--app-border)',
        fontSize: '11px', fontFamily: 'var(--font-sans)', fontWeight: 600,
        color: '#fff', opacity: saving ? 0.6 : 1,
      }}>{saving ? '...' : 'Save'}</button>
      <button onClick={onDone} style={{
        all: 'unset', cursor: 'pointer', padding: '4px 8px',
        fontSize: '11px', fontFamily: 'var(--font-sans)', color: 'var(--app-muted)',
      }}>Cancel</button>
    </div>
  );
}

// --- Schedule (Triggers) — clock and astro only ---

function ScheduleSection() {
  const [status, setStatus] = useState<SceneStatus | null>(null);
  const [fullTriggers, setFullTriggers] = useState<Record<string, FullTrigger>>({});
  const [editingTrigger, setEditingTrigger] = useState<string | null>(null);

  const refresh = useCallback(() => {
    getSceneStatus().then(setStatus).catch(console.error);
    fetch('/api/triggers').then(r => r.json()).then(setFullTriggers).catch(console.error);
  }, []);

  useEffect(() => {
    refresh();
    if (editingTrigger) return;
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh, editingTrigger]);

  const handleToggle = async (triggerId: string) => {
    await toggleTrigger(triggerId);
    refresh();
  };

  if (!status) return null;

  // Only show clock and astro triggers
  const triggerEntries = Object.entries(fullTriggers).filter(
    ([, t]) => t.type === 'clock' || t.type === 'astro'
  );

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
          const statusTrigger = status.triggers[id];
          return (
            <div key={id}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 12px',
                borderRadius: 'var(--app-radius-sm)',
                background: isActive ? 'var(--app-surface3)' : 'transparent',
                border: `1px solid ${isActive ? 'var(--app-border2)' : 'var(--app-border)'}`,
              }}>
                {/* Enable/disable toggle */}
                <button onClick={() => handleToggle(id)} style={{
                  all: 'unset', cursor: 'pointer',
                  width: '32px', height: '18px', borderRadius: '9px',
                  background: statusTrigger?.enabled ? '#47ff6a' : 'var(--app-surface3)',
                  border: `1px solid ${statusTrigger?.enabled ? '#47ff6a' : 'var(--app-border2)'}`,
                  position: 'relative', transition: 'background 0.15s, border-color 0.15s', flexShrink: 0,
                }}>
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: statusTrigger?.enabled ? '#fff' : 'var(--app-muted)',
                    position: 'absolute', top: '2px',
                    left: statusTrigger?.enabled ? '17px' : '2px',
                    transition: 'left 0.15s, background 0.15s',
                  }} />
                </button>

                {/* Type badge */}
                <span style={{
                  fontSize: '9px', fontFamily: 'var(--font-mono)', fontWeight: 600,
                  letterSpacing: '0.05em', textTransform: 'uppercase' as const,
                  padding: '2px 6px', borderRadius: '4px',
                  background: trigger.type === 'astro' ? '#2d2050' : '#1a3040',
                  color: trigger.type === 'astro' ? '#c084fc' : '#38bdf8',
                  flexShrink: 0,
                }}>
                  {trigger.type}
                </span>

                {/* Label */}
                <span style={{
                  fontSize: '13px', fontFamily: 'var(--font-sans)', fontWeight: 500,
                  color: statusTrigger?.enabled ? 'var(--app-text)' : 'var(--app-muted)', flex: 1,
                }}>
                  {id.replace(/-/g, ' ')}
                </span>

                {/* Time / event info when enabled */}
                {statusTrigger?.enabled && trigger.type === 'clock' && trigger.schedule && (
                  <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                    {trigger.schedule.time}
                  </span>
                )}
                {statusTrigger?.enabled && trigger.type === 'astro' && trigger.astro && (
                  <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#c084fc' }}>
                    {trigger.astro.event}{trigger.astro.offset ? ` ${trigger.astro.offset > 0 ? '+' : ''}${trigger.astro.offset}m` : ''}
                  </span>
                )}

                {/* Scene target */}
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--app-muted)' }}>
                  {trigger.scene}
                </span>

                {/* Edit button for clock triggers */}
                {trigger.type === 'clock' && (
                  <button
                    onClick={() => setEditingTrigger(editingTrigger === id ? null : id)}
                    style={{
                      all: 'unset', cursor: 'pointer', padding: '3px 10px',
                      borderRadius: 'var(--app-radius-sm)',
                      background: 'var(--app-surface3)', border: '1px solid var(--app-border)',
                      fontSize: '10px', fontFamily: 'var(--font-sans)', fontWeight: 600,
                      color: 'var(--app-muted)',
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>

              {/* Inline editor for clock triggers */}
              {editingTrigger === id && trigger.type === 'clock' && (
                <ClockTriggerEditor
                  triggerId={id}
                  trigger={trigger}
                  onDone={() => { setEditingTrigger(null); refresh(); }}
                />
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
