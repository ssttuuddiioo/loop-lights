import { useState, useEffect, useCallback } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { postStageMedia } from '../../api/stages';
import { buildThumbnailUrl } from '../../api/media';
import {
  getScenes, getSceneStatus, activateScene,
  saveScene, deleteScene,
} from '../../api/scenes';
import type { Scene, SceneStatus } from '../../api/scenes';
import {
  MOCK_ENABLED, MOCK_SCENES, MOCK_SCENE_STATUS,
} from '../../api/mock';

type Tab = 'media' | 'presets';
type MediaFilter = 'all' | 'effects' | 'video';

const VIDEO_EXTS = /\.(mp4|mov|avi|gif|png|jpg|jpeg|webm|webp)$/i;
function isVideoSlot(name: string): boolean { return VIDEO_EXTS.test(name); }

// ─── Tab bar styles ─────────────────────────────────────────────────

const tabStyle = (active: boolean) => ({
  all: 'unset' as const,
  cursor: 'pointer' as const,
  flex: 1,
  textAlign: 'center' as const,
  padding: '8px 0',
  fontSize: '12px',
  fontFamily: 'var(--font-sans)',
  fontWeight: active ? 590 : 510,
  letterSpacing: '-0.01em',
  color: active ? 'var(--app-text)' : 'var(--app-muted)',
  borderBottom: active ? '2px solid var(--app-accent)' : '2px solid transparent',
  transition: 'all 0.15s',
});

// ─── Main toolkit ───────────────────────────────────────────────────

export function MixerToolkit() {
  const [tab, setTab] = useState<Tab>('media');
  const { mediaModalStageIndex } = useAppState();

  // Auto-switch to media tab when a stage opens the media modal
  useEffect(() => {
    if (mediaModalStageIndex !== null) setTab('media');
  }, [mediaModalStageIndex]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
      }}>
        <button onClick={() => setTab('media')} style={tabStyle(tab === 'media')}>Media</button>
        <button onClick={() => setTab('presets')} style={tabStyle(tab === 'presets')}>Presets</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'media' ? <MediaTab /> : <PresetsTab />}
      </div>
    </div>
  );
}

// ─── Media tab ──────────────────────────────────────────────────────

function MediaTab() {
  const { stages, mediaSlots, mediaModalStageIndex } = useAppState();
  const dispatch = useAppDispatch();
  const [filter, setFilter] = useState<MediaFilter>('all');
  const [target, setTarget] = useState<number | null>(null);

  useEffect(() => {
    if (mediaModalStageIndex !== null) setTarget(mediaModalStageIndex);
  }, [mediaModalStageIndex]);

  const targetStage = target !== null ? (stages[target] ?? null) : null;

  const choose = useCallback(async (mediaId: string | number) => {
    if (target === null) {
      for (let i = 0; i < stages.length; i++) {
        dispatch({ type: 'SET_STAGE_MEDIA', index: i, mediaId });
        if (!MOCK_ENABLED) postStageMedia(stages[i].id, mediaId || 0).catch(() => {});
      }
    } else {
      const s = stages[target];
      if (!s) return;
      dispatch({ type: 'SET_STAGE_MEDIA', index: target, mediaId });
      if (!MOCK_ENABLED) postStageMedia(s.id, mediaId || 0).catch(() => {});
    }
    if (mediaModalStageIndex !== null) dispatch({ type: 'CLOSE_MEDIA_MODAL' });
  }, [dispatch, target, stages, mediaModalStageIndex]);

  const isMediaSelected = (mediaId: string | number): boolean => {
    if (target !== null) return targetStage ? String(targetStage.mediaId) === String(mediaId) : false;
    if (stages.length === 0) return false;
    return stages.every(s => String(s.mediaId) === String(mediaId));
  };

  const isNoneSelected = target !== null
    ? (targetStage ? !targetStage.mediaId : false)
    : (stages.length > 0 && stages.every(s => !s.mediaId));

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
      {/* Target selector */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        <TargetChip label="All Stages" active={target === null} accent onClick={() => setTarget(null)} />
        {stages.map((s, i) => (
          <TargetChip key={s.id} label={s.name} active={target === i} color={s.color} onClick={() => setTarget(i)} />
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {(['all', 'effects', 'video'] as MediaFilter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            all: 'unset', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 510,
            padding: '4px 10px', borderRadius: '6px',
            border: `1px solid ${filter === f ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)'}`,
            background: filter === f ? 'rgba(255,255,255,0.06)' : 'transparent',
            color: filter === f ? 'var(--app-text)' : 'var(--app-muted)',
            textTransform: 'capitalize', transition: 'all 0.15s',
          }}>{f}</button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', overflow: 'auto', flex: 1 }}>
        <MediaTile name="None" thumbUrl="" selected={isNoneSelected} onClick={() => choose('')} />
        {mediaSlots.filter(slot => {
          if (filter === 'all') return true;
          if (filter === 'video') return isVideoSlot(slot.name);
          return !isVideoSlot(slot.name);
        }).map(slot => (
          <MediaTile
            key={slot.id}
            name={slot.name}
            thumbUrl={buildThumbnailUrl(slot.id, slot.thumbnailETag)}
            selected={isMediaSelected(slot.id)}
            onClick={() => choose(slot.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Presets tab ────────────────────────────────────────────────────

function PresetsTab() {
  const { stages, mediaSlots } = useAppState();
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
      setScenes(prev => { const next = { ...prev }; delete next[sceneId]; return next; });
      return;
    }
    const result = await deleteScene(sceneId);
    if (!result.success && result.error) alert(result.error);
    refresh();
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
      {/* Preset grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '4px',
        overflow: 'auto',
        flex: creating ? 0 : 1,
      }}>
        {Object.entries(scenes).filter(([id]) => id !== 'blackout').map(([id, scene]) => {
          const isActive = status?.activeScene === id;
          return (
            <div key={id} style={{ position: 'relative' }}>
              <button onClick={() => handleActivate(id)} style={{
                all: 'unset', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '100%', boxSizing: 'border-box',
                aspectRatio: '1', padding: '8px',
                borderRadius: '8px',
                background: isActive ? 'var(--app-accent)' : 'var(--app-surface)',
                border: `1px solid ${isActive ? 'var(--app-accent)' : 'rgba(255,255,255,0.08)'}`,
                boxShadow: isActive ? '0 0 16px rgba(94,106,210,0.25), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
                color: isActive ? '#fff' : 'var(--app-text-secondary)',
                fontSize: '12px', fontFamily: 'var(--font-sans)',
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
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {!creating && (
          <button onClick={() => { setEditing(true); setCreating(true); }} style={{
            all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center',
            padding: '8px', borderRadius: '8px',
            background: 'transparent',
            border: '1px dashed rgba(255,255,255,0.12)',
            color: 'var(--app-accent)',
            fontSize: '12px', fontFamily: 'var(--font-sans)', fontWeight: 510,
            transition: 'all 0.15s',
          }}>+ New Preset</button>
        )}
        {editing && !creating && (
          <button onClick={() => setEditing(false)} style={{
            all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center',
            padding: '8px', borderRadius: '6px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            fontSize: '12px', fontFamily: 'var(--font-sans)', fontWeight: 510,
            color: 'var(--app-text-secondary)',
          }}>Done</button>
        )}
      </div>

      {/* Preset editor */}
      {creating && (
        <PresetEditor
          stages={stages}
          mediaSlots={mediaSlots}
          onSaved={() => { setEditing(false); setCreating(false); refresh(); }}
          onCancel={() => setCreating(false)}
        />
      )}
    </div>
  );
}

// ─── Preset Editor ──────────────────────────────────────────────────

interface ZoneConfig {
  media: number;
  color: string;
  intensity: number;
}

function hexToRgb(hex: string): { red: number; green: number; blue: number } {
  const h = hex.replace('#', '');
  return {
    red: parseInt(h.substring(0, 2), 16) / 255,
    green: parseInt(h.substring(2, 4), 16) / 255,
    blue: parseInt(h.substring(4, 6), 16) / 255,
  };
}

function PresetEditor({ stages, mediaSlots, onSaved, onCancel }: {
  stages: { name: string; mediaId: string | number; color: string; intensity: number }[];
  mediaSlots: { id: string | number; name: string }[];
  onSaved: () => void;
  onCancel: () => void;
}) {
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
      stagesConfig[zoneName] = { media: config.media, intensity: config.intensity, speed: 0.5, color: rgb };
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
      borderRadius: '8px', padding: '12px',
      display: 'flex', flexDirection: 'column', gap: '8px',
      overflow: 'auto', flex: 1,
    }}>
      <input
        type="text" placeholder="Preset name..."
        value={name}
        onInput={(e) => setName((e.target as HTMLInputElement).value)}
        style={{
          background: 'var(--app-surface)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '6px', padding: '8px 10px',
          color: 'var(--app-text)', fontSize: '12px', fontFamily: 'var(--font-sans)',
          outline: 'none', width: '100%', boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {stages.map((stage) => {
          const config = zones[stage.name];
          if (!config) return null;
          return (
            <div key={stage.name} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 8px', background: 'var(--app-surface)',
              borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <span style={{
                fontSize: '10px', fontFamily: 'var(--font-sans)', fontWeight: 510,
                color: 'var(--app-text-secondary)', width: '70px', flexShrink: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{stage.name}</span>
              <select
                value={config.media}
                onChange={(e) => updateZone(stage.name, 'media', parseInt((e.target as HTMLSelectElement).value))}
                style={{
                  background: 'var(--app-surface3)', border: '1px solid var(--app-border)',
                  borderRadius: '4px', padding: '2px 4px',
                  color: 'var(--app-text)', fontSize: '10px', fontFamily: 'var(--font-sans)',
                  width: '80px', flexShrink: 0, outline: 'none',
                }}
              >
                {mediaSlots.map(slot => (
                  <option key={slot.id} value={Number(slot.id)}>{slot.name}</option>
                ))}
              </select>
              <input
                type="color" value={config.color}
                onInput={(e) => updateZone(stage.name, 'color', (e.target as HTMLInputElement).value)}
                style={{ width: '22px', height: '22px', border: '1px solid var(--app-border)', borderRadius: '3px', padding: 0, cursor: 'pointer', background: 'transparent', flexShrink: 0 }}
              />
              <input
                type="range" min={0} max={100}
                value={Math.round(config.intensity * 100)}
                onInput={(e) => updateZone(stage.name, 'intensity', parseInt((e.target as HTMLInputElement).value) / 100)}
                style={{ flex: 1, height: '3px', accentColor: config.color, cursor: 'pointer', minWidth: '40px' }}
              />
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--app-muted)', width: '28px', textAlign: 'right' as const }}>
                {Math.round(config.intensity * 100)}%
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{
          all: 'unset', cursor: 'pointer', padding: '6px 14px', borderRadius: '6px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          fontSize: '11px', fontFamily: 'var(--font-sans)', fontWeight: 510, color: 'var(--app-muted)',
        }}>Cancel</button>
        <button onClick={handleSave} disabled={!name.trim() || saving} style={{
          all: 'unset', cursor: name.trim() ? 'pointer' : 'not-allowed',
          padding: '6px 14px', borderRadius: '6px',
          background: name.trim() ? 'var(--app-accent)' : 'var(--app-surface3)',
          border: '1px solid transparent',
          fontSize: '11px', fontFamily: 'var(--font-sans)', fontWeight: 510,
          color: name.trim() ? '#fff' : 'var(--app-muted)', opacity: saving ? 0.6 : 1,
        }}>{saving ? 'Saving...' : 'Save'}</button>
      </div>
    </div>
  );
}

// ─── Shared components ──────────────────────────────────────────────

function TargetChip({ label, active, accent, color, onClick }: {
  label: string; active: boolean; accent?: boolean; color?: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      all: 'unset', cursor: 'pointer',
      fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 510,
      padding: '4px 8px', borderRadius: '9999px',
      background: active
        ? (accent ? 'var(--app-accent)' : 'rgba(255,255,255,0.08)')
        : 'transparent',
      border: `1px solid ${active
        ? (accent ? 'var(--app-accent)' : 'rgba(255,255,255,0.12)')
        : 'rgba(255,255,255,0.05)'}`,
      color: active
        ? (accent ? '#fff' : 'var(--app-text)')
        : 'var(--app-text-quaternary)',
      transition: 'all 0.15s',
      display: 'flex', alignItems: 'center', gap: '4px',
    }}>
      {color && (
        <span style={{
          width: '5px', height: '5px', borderRadius: '50%',
          background: color, opacity: active ? 1 : 0.4, flexShrink: 0,
        }} />
      )}
      {label}
    </button>
  );
}

function MediaTile({ name, thumbUrl, selected, onClick }: {
  name: string; thumbUrl: string; selected: boolean; onClick: () => void;
}) {
  return (
    <div onClick={onClick} style={{
      aspectRatio: '1',
      background: 'var(--app-surface2)',
      border: `1px solid ${selected ? 'var(--app-accent)' : 'var(--app-border)'}`,
      borderRadius: '6px', overflow: 'hidden', cursor: 'pointer',
      transition: 'border-color 0.12s, box-shadow 0.12s',
      boxShadow: selected ? '0 0 10px -5px var(--app-accent)' : 'none',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        flex: 1,
        background: 'var(--app-surface3)',
        backgroundImage: thumbUrl ? `url('${thumbUrl}')` : 'none',
        backgroundSize: 'cover', backgroundPosition: 'center',
      }} />
      <div style={{ fontSize: '9px', padding: '4px 6px', color: 'var(--app-text)', lineHeight: 1.3, flexShrink: 0 }}>
        {name}
      </div>
    </div>
  );
}
