import { useState, useEffect, useCallback } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { postStageIntensity } from '../../api/stages';
import {
  getScenes, getSceneStatus, activateScene, toggleTrigger,
  saveScene, deleteScene, updateTrigger,
} from '../../api/scenes';
import type { Scene, SceneStatus, FullTrigger } from '../../api/scenes';
import {
  MOCK_ENABLED, MOCK_SCENES, MOCK_SCENE_STATUS, MOCK_TRIGGERS,
} from '../../api/mock';

// --- Stage Card ---

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
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px',
      padding: '16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Header: dot + name + toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: stage.color, opacity: isOn ? 1 : 0.3,
            flexShrink: 0,
          }} />
          <div>
            <div style={{
              fontSize: '13px', fontWeight: 510, fontFamily: 'var(--font-sans)',
              letterSpacing: '-0.01em', color: 'var(--app-text)',
            }}>
              {stage.name}
            </div>
            <div style={{
              fontSize: '10px', color: 'var(--app-text-quaternary)',
              fontFamily: 'var(--font-mono)', marginTop: '1px',
            }}>
              Zone {String(index + 1).padStart(2, '0')}
            </div>
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
            background: isOn ? 'var(--app-accent)' : 'var(--app-surface3)',
            border: `1px solid ${isOn ? 'var(--app-accent)' : 'var(--app-border2)'}`,
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
          style={{ flex: 1, height: '4px', accentColor: stage.color, cursor: 'pointer' }}
        />
        <span style={{
          fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 510,
          color: effective > 0 ? 'var(--app-accent)' : 'var(--app-muted)',
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

  const facadeIndex = stages.findIndex(s => s.name.toUpperCase() === 'FACADE');
  const topStages = stages.filter((_, i) => i !== facadeIndex);

  return (
    <div>
      <div style={{
        fontSize: '13px', fontWeight: 590, fontFamily: 'var(--font-sans)',
        letterSpacing: '-0.01em', color: 'var(--app-text)',
        marginBottom: '12px',
      }}>
        Zone Control
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '10px',
      }}>
        {topStages.map((s) => {
          const originalIndex = stages.findIndex(st => st.id === s.id);
          return <DashboardCard key={s.id} index={originalIndex} />;
        })}
        {facadeIndex >= 0 && (
          <DashboardCard index={facadeIndex} />
        )}
      </div>
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
    if (!MOCK_ENABLED) {
      await saveScene({ id, scene: { name: name.trim(), description: 'Custom preset', stages: stagesConfig } });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <div style={{
      background: 'var(--app-surface2)',
      border: '1px solid var(--app-border2)',
      borderRadius: '8px',
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
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '6px',
            padding: '8px 12px',
            color: 'var(--app-text)',
            fontSize: '13px',
            fontFamily: 'var(--font-sans)',
            outline: 'none',
          }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {stages.map((stage) => {
          const config = zones[stage.name];
          if (!config) return null;
          return (
            <div key={stage.name} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 10px',
              background: 'var(--app-surface)',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <span style={{
                fontSize: '12px', fontFamily: 'var(--font-sans)', fontWeight: 510,
                color: 'var(--app-text-secondary)', width: '90px', flexShrink: 0,
              }}>
                {stage.name}
              </span>
              <select
                value={config.media}
                onChange={(e) => updateZone(stage.name, 'media', parseInt((e.target as HTMLSelectElement).value))}
                style={{
                  background: 'var(--app-surface3)', border: '1px solid var(--app-border)',
                  borderRadius: '6px', padding: '4px 8px',
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
          all: 'unset', cursor: 'pointer', padding: '6px 16px', borderRadius: '6px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          fontSize: '12px', fontFamily: 'var(--font-sans)', fontWeight: 510, color: 'var(--app-muted)',
        }}>Cancel</button>
        <button onClick={handleSave} disabled={!name.trim() || saving} style={{
          all: 'unset', cursor: name.trim() ? 'pointer' : 'not-allowed',
          padding: '6px 16px', borderRadius: '6px',
          background: name.trim() ? 'var(--app-accent)' : 'var(--app-surface3)',
          border: '1px solid transparent',
          fontSize: '12px', fontFamily: 'var(--font-sans)', fontWeight: 510,
          color: name.trim() ? '#fff' : 'var(--app-muted)', opacity: saving ? 0.6 : 1,
        }}>{saving ? 'Saving...' : 'Save Preset'}</button>
      </div>
    </div>
  );
}

// --- Presets (Scenes) ---

function PresetsSection() {
  const [scenes, setScenes] = useState<Record<string, Scene>>(MOCK_ENABLED ? MOCK_SCENES : {});
  const [status, setStatus] = useState<SceneStatus | null>(MOCK_ENABLED ? MOCK_SCENE_STATUS : null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(() => {
    if (MOCK_ENABLED) return;
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
    if (MOCK_ENABLED) {
      setStatus(prev => prev ? { ...prev, activeScene: sceneId } : prev);
      return;
    }
    await activateScene(sceneId);
    refresh();
    window.dispatchEvent(new Event('dimly:force-sync'));
  };

  const handleDelete = async (sceneId: string) => {
    if (MOCK_ENABLED) {
      setScenes(prev => {
        const next = { ...prev };
        delete next[sceneId];
        return next;
      });
      return;
    }
    const result = await deleteScene(sceneId);
    if (!result.success && result.error) {
      alert(result.error);
    }
    refresh();
  };

  return (
    <div style={{
      background: 'var(--app-surface)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px',
      padding: '16px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{
          fontSize: '13px', fontWeight: 590, fontFamily: 'var(--font-sans)',
          letterSpacing: '-0.01em', color: 'var(--app-text)',
        }}>
          Presets
        </div>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '8px',
      }}>
        {Object.entries(scenes).filter(([id]) => id !== 'blackout').map(([id, scene]) => {
          const isActive = status?.activeScene === id;
          return (
            <div key={id} style={{ position: 'relative' }}>
              <button onClick={() => handleActivate(id)} style={{
                all: 'unset', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '100%', boxSizing: 'border-box',
                padding: '12px 16px',
                borderRadius: '8px',
                background: isActive
                  ? 'var(--app-accent)'
                  : 'var(--app-surface)',
                border: `1px solid ${isActive ? 'var(--app-accent)' : 'rgba(255,255,255,0.08)'}`,
                boxShadow: isActive
                  ? '0 0 16px rgba(94,106,210,0.25), inset 0 1px 0 rgba(255,255,255,0.1)'
                  : 'none',
                color: isActive ? '#fff' : 'var(--app-text-secondary)',
                fontSize: '13px', fontFamily: 'var(--font-sans)',
                fontWeight: isActive ? 590 : 510,
                letterSpacing: '-0.01em',
                transition: 'all 0.15s',
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
        {!creating && (
          <button onClick={() => { setEditing(true); setCreating(true); }} style={{
            all: 'unset', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', boxSizing: 'border-box',
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'transparent',
            border: '1px dashed rgba(255,255,255,0.12)',
            color: 'var(--app-accent)',
            fontSize: '13px', fontFamily: 'var(--font-sans)',
            fontWeight: 510, letterSpacing: '-0.01em',
            transition: 'all 0.15s',
          }}>+ New</button>
        )}
      </div>
      {creating && (
        <PresetEditor
          onSaved={() => { setEditing(false); setCreating(false); refresh(); }}
          onCancel={() => { setCreating(false); }}
        />
      )}
      {editing && !creating && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button onClick={() => setEditing(false)} style={{
            all: 'unset', cursor: 'pointer', padding: '6px 16px',
            borderRadius: '6px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            fontSize: '12px', fontFamily: 'var(--font-sans)', fontWeight: 510,
            color: 'var(--app-text-secondary)',
          }}>Done</button>
        </div>
      )}
    </div>
  );
}

// --- Daily Schedule Editor ---

function DailyScheduleEditor({
  onTrigger, offTrigger, scenes, onDone,
}: {
  onTrigger: { id: string; trigger: FullTrigger } | null;
  offTrigger: { id: string; trigger: FullTrigger } | null;
  scenes: Record<string, Scene>;
  onDone: () => void;
}) {
  const [onTime, setOnTime] = useState(onTrigger?.trigger.schedule?.time || '17:00');
  const [onScene, setOnScene] = useState(onTrigger?.trigger.scene || 'warm-wash');
  const [offTime, setOffTime] = useState(offTrigger?.trigger.schedule?.time || '23:00');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    if (!MOCK_ENABLED) {
      if (onTrigger) {
        await updateTrigger(onTrigger.id, {
          schedule: { ...onTrigger.trigger.schedule, time: onTime },
          scene: onScene,
        });
      }
      if (offTrigger) {
        await updateTrigger(offTrigger.id, {
          schedule: { ...offTrigger.trigger.schedule, time: offTime },
        });
      }
    }
    setSaving(false);
    onDone();
  };

  const sceneOptions = Object.entries(scenes).filter(([id]) => id !== 'blackout');

  return (
    <div style={{
      padding: '12px 16px', marginTop: '8px',
      background: 'var(--app-surface2)',
      borderRadius: '6px',
      border: '1px solid var(--app-border2)',
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      {/* Lights ON row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: 'var(--app-success)', flexShrink: 0,
        }} />
        <span style={{
          fontSize: '12px', fontFamily: 'var(--font-sans)', fontWeight: 510,
          color: 'var(--app-text-secondary)', width: '60px', flexShrink: 0,
        }}>Lights On</span>
        <input
          type="time" value={onTime}
          onInput={(e) => setOnTime((e.target as HTMLInputElement).value)}
          style={{
            background: 'var(--app-surface)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '6px', padding: '6px 10px',
            color: 'var(--app-text)', fontSize: '13px', fontFamily: 'var(--font-mono)',
            outline: 'none',
          }}
        />
        <select
          value={onScene}
          onChange={(e) => setOnScene((e.target as HTMLSelectElement).value)}
          style={{
            background: 'var(--app-surface3)', border: '1px solid var(--app-border)',
            borderRadius: '6px', padding: '6px 10px',
            color: 'var(--app-text)', fontSize: '12px', fontFamily: 'var(--font-sans)',
            outline: 'none', flex: 1,
          }}
        >
          {sceneOptions.map(([id, s]) => (
            <option key={id} value={id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Lights OFF row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: 'var(--app-danger)', flexShrink: 0,
        }} />
        <span style={{
          fontSize: '12px', fontFamily: 'var(--font-sans)', fontWeight: 510,
          color: 'var(--app-text-secondary)', width: '60px', flexShrink: 0,
        }}>Lights Off</span>
        <input
          type="time" value={offTime}
          onInput={(e) => setOffTime((e.target as HTMLInputElement).value)}
          style={{
            background: 'var(--app-surface)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '6px', padding: '6px 10px',
            color: 'var(--app-text)', fontSize: '13px', fontFamily: 'var(--font-mono)',
            outline: 'none',
          }}
        />
        <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--app-muted)', flex: 1 }}>
          Blackout
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button onClick={onDone} style={{
          all: 'unset', cursor: 'pointer', padding: '5px 14px',
          borderRadius: '6px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          fontSize: '11px', fontFamily: 'var(--font-sans)', fontWeight: 510, color: 'var(--app-muted)',
        }}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={{
          all: 'unset', cursor: 'pointer', padding: '5px 14px',
          borderRadius: '6px',
          background: 'var(--app-accent)', border: '1px solid transparent',
          fontSize: '11px', fontFamily: 'var(--font-sans)', fontWeight: 510,
          color: '#fff', opacity: saving ? 0.6 : 1,
        }}>{saving ? 'Saving...' : 'Save'}</button>
      </div>
    </div>
  );
}

// --- Schedule Section ---

function ScheduleSection() {
  const [status, setStatus] = useState<SceneStatus | null>(MOCK_ENABLED ? MOCK_SCENE_STATUS : null);
  const [fullTriggers, setFullTriggers] = useState<Record<string, FullTrigger>>(MOCK_ENABLED ? MOCK_TRIGGERS : {});
  const [scenes, setScenes] = useState<Record<string, Scene>>(MOCK_ENABLED ? MOCK_SCENES : {});
  const [editing, setEditing] = useState(false);

  const refresh = useCallback(() => {
    if (MOCK_ENABLED) return;
    getSceneStatus().then(setStatus).catch(console.error);
    fetch('/api/triggers').then(r => r.json()).then(setFullTriggers).catch(console.error);
    getScenes().then(setScenes).catch(console.error);
  }, []);

  useEffect(() => {
    refresh();
    if (editing) return;
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh, editing]);

  const handleToggleBoth = async () => {
    if (MOCK_ENABLED) {
      setFullTriggers(prev => ({
        ...prev,
        'daily-on': prev['daily-on'] ? { ...prev['daily-on'], enabled: !prev['daily-on'].enabled } : prev['daily-on'],
        'nightly-blackout': prev['nightly-blackout'] ? { ...prev['nightly-blackout'], enabled: !prev['nightly-blackout'].enabled } : prev['nightly-blackout'],
      }));
      setStatus(prev => {
        if (!prev) return prev;
        const updated = { ...prev, triggers: { ...prev.triggers } };
        for (const k of ['daily-on', 'nightly-blackout']) {
          if (updated.triggers[k]) updated.triggers[k] = { ...updated.triggers[k], enabled: !updated.triggers[k].enabled };
        }
        return updated;
      });
      return;
    }
    const onTrigger = fullTriggers['daily-on'];
    const offTrigger = fullTriggers['nightly-blackout'];
    if (onTrigger) await toggleTrigger('daily-on');
    if (offTrigger) await toggleTrigger('nightly-blackout');
    refresh();
  };

  if (!status) return null;

  const onTrigger = fullTriggers['daily-on'];
  const offTrigger = fullTriggers['nightly-blackout'];
  const clockEnabled = onTrigger?.enabled || offTrigger?.enabled;
  const astroTriggers = Object.entries(fullTriggers).filter(([, t]) => t.type === 'astro');

  return (
    <div style={{
      background: 'var(--app-surface)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px',
      padding: '16px 20px',
    }}>
      <div style={{
        fontSize: '13px', fontWeight: 590, fontFamily: 'var(--font-sans)',
        letterSpacing: '-0.01em', color: 'var(--app-text)',
        marginBottom: '12px',
      }}>
        Schedule
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>

        {/* Daily Clock Schedule */}
        {(onTrigger || offTrigger) && (
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 12px',
              borderRadius: '6px',
              background: clockEnabled ? 'var(--app-surface)' : 'transparent',
              border: `1px solid ${clockEnabled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)'}`,
            }}>
              {/* Toggle */}
              <button onClick={handleToggleBoth} style={{
                all: 'unset', cursor: 'pointer',
                width: '32px', height: '18px', borderRadius: '9px',
                background: clockEnabled ? 'var(--app-success)' : 'var(--app-surface3)',
                border: `1px solid ${clockEnabled ? 'var(--app-success)' : 'var(--app-border2)'}`,
                position: 'relative', transition: 'background 0.15s, border-color 0.15s', flexShrink: 0,
              }}>
                <div style={{
                  width: '12px', height: '12px', borderRadius: '50%',
                  background: clockEnabled ? '#fff' : 'var(--app-muted)',
                  position: 'absolute', top: '2px',
                  left: clockEnabled ? '17px' : '2px',
                  transition: 'left 0.15s, background 0.15s',
                }} />
              </button>

              {/* Badge */}
              <span style={{
                fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 510,
                letterSpacing: '0.03em', textTransform: 'uppercase' as const,
                padding: '2px 8px', borderRadius: '9999px',
                background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--app-accent)', flexShrink: 0,
              }}>clock</span>

              {/* Label */}
              <span style={{
                fontSize: '13px', fontFamily: 'var(--font-sans)', fontWeight: 510,
                color: clockEnabled ? 'var(--app-text)' : 'var(--app-muted)', flex: 1,
              }}>Daily Schedule</span>

              {/* Time summary */}
              {clockEnabled && (
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--app-text-secondary)' }}>
                  {onTrigger?.schedule?.time || '—'} on · {offTrigger?.schedule?.time || '—'} off
                </span>
              )}

              {/* Scene name */}
              {clockEnabled && onTrigger && (
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--app-muted)' }}>
                  {scenes[onTrigger.scene]?.name || onTrigger.scene}
                </span>
              )}

              {/* Edit button */}
              <button
                onClick={() => setEditing(!editing)}
                style={{
                  all: 'unset', cursor: 'pointer', padding: '3px 10px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  fontSize: '10px', fontFamily: 'var(--font-sans)', fontWeight: 510,
                  color: 'var(--app-muted)',
                }}
              >Edit</button>
            </div>

            {editing && (
              <DailyScheduleEditor
                onTrigger={onTrigger ? { id: 'daily-on', trigger: onTrigger } : null}
                offTrigger={offTrigger ? { id: 'nightly-blackout', trigger: offTrigger } : null}
                scenes={scenes}
                onDone={() => { setEditing(false); refresh(); }}
              />
            )}
          </div>
        )}

        {/* Astro triggers */}
        {astroTriggers.map(([id, trigger]) => {
          const isActive = status.activeTrigger === id;
          const statusTrigger = status.triggers[id];
          return (
            <div key={id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 12px',
              borderRadius: '6px',
              background: isActive ? 'var(--app-surface)' : 'transparent',
              border: `1px solid ${isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)'}`,
            }}>
              <button onClick={() => {
                if (MOCK_ENABLED) {
                  setFullTriggers(prev => ({ ...prev, [id]: { ...prev[id], enabled: !prev[id].enabled } }));
                  setStatus(prev => {
                    if (!prev || !prev.triggers[id]) return prev;
                    return { ...prev, triggers: { ...prev.triggers, [id]: { ...prev.triggers[id], enabled: !prev.triggers[id].enabled } } };
                  });
                  return;
                }
                toggleTrigger(id).then(refresh);
              }} style={{
                all: 'unset', cursor: 'pointer',
                width: '32px', height: '18px', borderRadius: '9px',
                background: statusTrigger?.enabled ? 'var(--app-success)' : 'var(--app-surface3)',
                border: `1px solid ${statusTrigger?.enabled ? 'var(--app-success)' : 'var(--app-border2)'}`,
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
              <span style={{
                fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 510,
                letterSpacing: '0.03em', textTransform: 'uppercase' as const,
                padding: '2px 8px', borderRadius: '9999px',
                background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                color: '#c084fc', flexShrink: 0,
              }}>astro</span>
              <span style={{
                fontSize: '13px', fontFamily: 'var(--font-sans)', fontWeight: 510,
                color: statusTrigger?.enabled ? 'var(--app-text)' : 'var(--app-muted)', flex: 1,
              }}>{id.replace(/-/g, ' ')}</span>
              {statusTrigger?.enabled && trigger.astro && (
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--app-text-secondary)' }}>
                  {trigger.astro.event}{trigger.astro.offset ? ` ${trigger.astro.offset > 0 ? '+' : ''}${trigger.astro.offset}m` : ''}
                </span>
              )}
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--app-muted)' }}>
                {trigger.scene}
              </span>
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
      padding: '32px',
      paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
      maxWidth: '100%',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    }}>
      <StageStatusGrid />
      <PresetsSection />
      <ScheduleSection />
    </div>
  );
}
