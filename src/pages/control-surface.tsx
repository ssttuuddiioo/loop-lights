import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../state/context';
import { useIsMobile } from '../hooks/use-media-query';
import { usePointerFader } from '../hooks/use-pointer-fader';
import { useFavorites } from '../hooks/use-favorites';
import { VerticalFader } from '../components/controls/vertical-fader';
import { BlackoutButton } from '../components/controls/blackout-button';
import { ColorWheel } from '../components/controls/color-wheel';
import { EffectsTab } from '../components/mixer/effects-tab';
import { PresetsTab, MediaTile } from '../components/mixer/mixer-toolkit';
import { postStageIntensity, postStageColor, postStageMedia } from '../api/stages';
import { postMasterIntensity } from '../api/settings';
import { buildThumbnailUrl } from '../api/media';
import { hexToRgb } from '../lib/color-utils';
import { clampHexSafe } from '../lib/safe-color';
import { SWATCHES, COLOR_THROTTLE_MS } from '../lib/constants';
import { MOCK_ENABLED } from '../api/mock';
import type { StageState } from '../types/stage';

type DetailTab = 'channel' | 'fx' | 'presets';

const VIDEO_EXTS = /\.(mp4|mov|avi|gif|png|jpg|jpeg|webm|webp)$/i;

// ─── Page: console-style mixer ──────────────────────────────────────
//
//  ┌─────────────────────────────────────────────┐
//  │ DETAIL — selected channel (color | media),  │
//  │          or FX / Presets tabs               │
//  ├────┬────┬────┬────┬────┬────┬────┬──────────┤
//  │ ch │ ch │ ch │ ch │ ch │ ch │ ch │  MASTER  │
//  └────┴────┴────┴────┴────┴────┴────┴──────────┘

export function ControlSurface() {
  const { stages } = useAppState();
  const isMobile = useIsMobile();
  const [selected, setSelected] = useState(0);
  const [tab, setTab] = useState<DetailTab>('channel');

  // Keep selection valid if the stage list shrinks
  useEffect(() => {
    if (selected >= stages.length && stages.length > 0) setSelected(0);
  }, [stages.length, selected]);

  const selectChannel = useCallback((i: number) => {
    setSelected(i);
    setTab('channel');
  }, []);

  const stage: StageState | undefined = stages[selected];

  // ── Console deck: channel strips + master ──
  const deck = (
    <div style={{
      flexShrink: 0,
      display: 'flex',
      boxSizing: 'border-box',
      borderTop: isMobile ? 'none' : '1px solid var(--app-border2)',
      borderBottom: isMobile ? '1px solid var(--app-border2)' : 'none',
      background: 'var(--app-surface)',
      ...(isMobile
        ? { paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }
        : { height: '312px', paddingBottom: 'calc(18px + env(safe-area-inset-bottom, 0px))' }),
    }}>
      {isMobile ? (
        /* Phone: 3-wide grid so every fader is visible — no hidden strips */
        <div style={{
          flex: 1, minWidth: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridAutoRows: '128px',
          gap: '6px',
          padding: '10px',
        }}>
          {stages.map((s, i) => (
            <ChannelStrip
              key={s.id}
              stage={s}
              stageIndex={i}
              selected={i === selected}
              compact
              onSelect={() => selectChannel(i)}
            />
          ))}
        </div>
      ) : (
        <div style={{
          flex: 1, minWidth: 0,
          display: 'flex', gap: '6px',
          padding: '10px',
          overflowX: 'auto', overflowY: 'hidden',
        }}>
          {stages.map((s, i) => (
            <ChannelStrip
              key={s.id}
              stage={s}
              stageIndex={i}
              selected={i === selected}
              compact={false}
              onSelect={() => selectChannel(i)}
            />
          ))}
        </div>
      )}

      {/* Master strip — desktop only (mobile has master in the toolbar) */}
      {!isMobile && <MasterStrip />}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Mobile: sliders first — deck sits above the detail area */}
      {isMobile && deck}

      {/* ── Detail area ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Header: channel name + tabs */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: isMobile ? '8px 12px' : '10px 20px',
          borderBottom: '1px solid var(--app-border)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
            {stage && (
              <span style={{
                width: '10px', height: '10px', borderRadius: '3px',
                background: stage.color, flexShrink: 0,
                boxShadow: stage.intensity > 0 ? `0 0 8px ${stage.color}` : 'none',
              }} />
            )}
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700,
              letterSpacing: '0.02em', color: 'var(--app-text)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {stage?.name ?? 'No channel'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            <DetailTabButton label="Channel" active={tab === 'channel'} onClick={() => setTab('channel')} />
            <DetailTabButton label="FX" active={tab === 'fx'} onClick={() => setTab('fx')} />
            <DetailTabButton label="Presets" active={tab === 'presets'} onClick={() => setTab('presets')} />
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {tab === 'channel' && stage && (
            <ChannelDetail stage={stage} stageIndex={selected} stacked={isMobile} />
          )}
          {tab === 'channel' && !stage && (
            <div style={{
              height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--app-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px',
            }}>
              No stages
            </div>
          )}
          {tab === 'fx' && <div style={{ height: '100%', overflow: 'auto' }}><EffectsTab /></div>}
          {tab === 'presets' && <div style={{ height: '100%', overflow: 'auto' }}><PresetsTab /></div>}
        </div>
      </div>

      {/* Desktop: deck below, mixing-desk style */}
      {!isMobile && deck}
    </div>
  );
}

function DetailTabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      all: 'unset', cursor: 'pointer', boxSizing: 'border-box',
      padding: '6px 12px', borderRadius: '7px',
      background: active ? 'var(--app-surface2)' : 'transparent',
      border: `1px solid ${active ? 'var(--app-border2)' : 'transparent'}`,
      color: active ? 'var(--app-text)' : 'var(--app-muted)',
      fontSize: '12px', fontFamily: 'var(--font-sans)',
      fontWeight: active ? 600 : 510, letterSpacing: '-0.01em',
      transition: 'all 0.15s', whiteSpace: 'nowrap',
    }}>{label}</button>
  );
}

// ─── Channel detail: color + media side by side ─────────────────────

function ChannelDetail({ stage, stageIndex, stacked }: {
  stage: StageState;
  stageIndex: number;
  stacked: boolean;
}) {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: stacked ? 'column' : 'row',
      overflow: stacked ? 'auto' : 'hidden',
    }}>
      {/* Color */}
      <div style={{
        flex: stacked ? '0 0 auto' : '0 0 340px',
        minWidth: 0,
        borderRight: stacked ? 'none' : '1px solid var(--app-border)',
        borderBottom: stacked ? '1px solid var(--app-border)' : 'none',
        overflow: stacked ? 'visible' : 'auto',
      }}>
        <ChannelColorPanel stage={stage} stageIndex={stageIndex} small={stacked} />
      </div>

      {/* Media */}
      <div style={{
        flex: 1, minWidth: 0, minHeight: stacked ? '300px' : 0,
        display: 'flex', flexDirection: 'column',
      }}>
        <SectionLabel label="Media" />
        <ChannelMediaGrid stage={stage} stageIndex={stageIndex} />
      </div>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      padding: '10px 16px 0',
      fontFamily: 'var(--font-mono)', fontSize: '10px',
      letterSpacing: '0.08em', textTransform: 'uppercase',
      color: 'var(--app-muted)', flexShrink: 0,
    }}>
      {label}
    </div>
  );
}

// ─── Color panel: swatches + hue picker + favorites ─────────────────

const colorTimers: Record<number, ReturnType<typeof setTimeout>> = {};

function ChannelColorPanel({ stage, stageIndex, small = false }: {
  stage: StageState;
  stageIndex: number;
  /** Compact variant for phones — smaller wheel, tighter spacing. */
  small?: boolean;
}) {
  const { stages } = useAppState();
  const dispatch = useAppDispatch();
  // Custom swatches share the favorites localStorage slots
  const { favorites, replace } = useFavorites();
  // While set, wheel/hex changes also update this custom swatch slot
  const [editingSlot, setEditingSlot] = useState<number | null>(null);

  const setColor = useCallback((hex: string, slot: number | null = editingSlot) => {
    const safe = clampHexSafe(hex); // snap out of the glitch zone
    dispatch({ type: 'SET_STAGE_COLOR', index: stageIndex, hex: safe });
    if (slot !== null) replace(slot, safe);
    if (colorTimers[stageIndex]) clearTimeout(colorTimers[stageIndex]);
    colorTimers[stageIndex] = setTimeout(() => {
      const { r, g, b } = hexToRgb(safe);
      postStageColor(stage.id, r, g, b).catch(console.error);
    }, COLOR_THROTTLE_MS);
  }, [dispatch, stageIndex, stage.id, editingSlot, replace]);

  // Pick an existing swatch — just applies it, stops editing
  const pickSwatch = useCallback((hex: string) => {
    setEditingSlot(null);
    setColor(hex, null);
  }, [setColor]);

  // "+" tile: claim the first free slot, seed it with the current color,
  // and bind the wheel to it until another swatch is picked.
  const addSwatch = useCallback(() => {
    const slot = favorites.findIndex(c => c === null);
    if (slot === -1) return;
    replace(slot, stage.color);
    setEditingSlot(slot);
  }, [favorites, replace, stage.color]);

  const applyToAll = useCallback(() => {
    const { r, g, b } = hexToRgb(stage.color);
    for (let i = 0; i < stages.length; i++) {
      dispatch({ type: 'SET_STAGE_COLOR', index: i, hex: stage.color });
      postStageColor(stages[i].id, r, g, b).catch(console.error);
    }
  }, [dispatch, stages, stage.color]);

  const hasFreeSlot = favorites.some(c => c === null);

  // Swatch squares — 33% smaller than before, fixed size.
  const SW = 22;

  const swatchTile = (hex: string, opts: { key: string; editing?: boolean; onClick: () => void }) => (
    <div
      key={opts.key}
      onClick={opts.onClick}
      style={{
        width: `${SW}px`, height: `${SW}px`,
        borderRadius: 'var(--app-radius-sm)', background: hex, cursor: 'pointer',
        boxSizing: 'border-box', flexShrink: 0,
        border: opts.editing
          ? '2px solid var(--app-accent)'
          : stage.color.toLowerCase() === hex.toLowerCase()
            ? '2px solid #fff' : '2px solid var(--app-border)',
      }}
    />
  );

  const swatches = (
    <div style={{
      display: 'grid',
      // Mobile: narrow column beside the wheel. Desktop: wide row above it.
      gridTemplateColumns: `repeat(${small ? 4 : 8}, ${SW}px)`,
      gap: '5px', alignContent: 'start', justifyContent: small ? 'start' : 'space-between',
    }}>
      {SWATCHES.map(hex => swatchTile(hex, { key: hex, onClick: () => pickSwatch(hex) }))}
      {favorites.map((hex, slot) => hex && swatchTile(hex, {
        key: `custom-${slot}`,
        editing: editingSlot === slot,
        onClick: () => (editingSlot === slot ? undefined : pickSwatch(hex)),
      }))}
      {hasFreeSlot && (
        <div
          onClick={addSwatch}
          title="New swatch — set it with the wheel"
          style={{
            width: `${SW}px`, height: `${SW}px`,
            borderRadius: 'var(--app-radius-sm)', cursor: 'pointer',
            boxSizing: 'border-box', flexShrink: 0,
            background: '#000', border: '2px solid var(--app-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--app-muted)', fontSize: '12px', lineHeight: 1,
          }}
        >+</div>
      )}
    </div>
  );

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      gap: small ? '8px' : '10px',
      padding: small ? '8px 12px 12px' : '10px 16px 16px',
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '10px',
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--app-muted)',
      }}>Color</span>

      {small ? (
        /* Mobile: swatches column to the LEFT of the wheel */
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          {swatches}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
            <ColorWheel hex={stage.color} onChange={setColor} size={150} />
          </div>
        </div>
      ) : (
        <>
          {swatches}
          <ColorWheel hex={stage.color} onChange={setColor} size={208} />
        </>
      )}

      {/* Apply the dialed-in color everywhere */}
      <button
        onClick={applyToAll}
        style={{
          all: 'unset', cursor: 'pointer', boxSizing: 'border-box',
          textAlign: 'center', width: '100%',
          padding: '9px 0', borderRadius: '7px',
          background: 'var(--app-surface2)',
          border: '1px solid var(--app-border2)',
          fontSize: '11px', fontFamily: 'var(--font-sans)', fontWeight: 590,
          color: 'var(--app-text-secondary)',
          transition: 'all 0.15s',
        }}
      >Apply to all zones</button>
    </div>
  );
}

// ─── Shared toggle pill ─────────────────────────────────────────────

function TogglePill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      all: 'unset', cursor: 'pointer',
      fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 510,
      padding: '4px 10px', borderRadius: '9999px',
      border: `1px solid ${active ? 'var(--app-accent)' : 'rgba(255,255,255,0.08)'}`,
      background: active ? 'var(--app-accent)' : 'transparent',
      color: active ? '#fff' : 'var(--app-muted)',
      transition: 'all 0.15s', whiteSpace: 'nowrap',
    }}>{label}</button>
  );
}

// ─── Media grid for the selected channel ────────────────────────────

function ChannelMediaGrid({ stage, stageIndex }: { stage: StageState; stageIndex: number }) {
  const { stages, mediaSlots } = useAppState();
  const dispatch = useAppDispatch();
  const [filter, setFilter] = useState<'all' | 'video'>('all');
  const [applyAll, setApplyAll] = useState(false);

  const choose = useCallback((mediaId: string | number) => {
    if (applyAll) {
      for (let i = 0; i < stages.length; i++) {
        dispatch({ type: 'SET_STAGE_MEDIA', index: i, mediaId });
        if (!MOCK_ENABLED) postStageMedia(stages[i].id, mediaId || 0).catch(() => {});
      }
    } else {
      dispatch({ type: 'SET_STAGE_MEDIA', index: stageIndex, mediaId });
      if (!MOCK_ENABLED) postStageMedia(stage.id, mediaId || 0).catch(() => {});
    }
  }, [dispatch, applyAll, stages, stageIndex, stage.id]);

  const slots = mediaSlots.filter(slot => filter === 'all' || VIDEO_EXTS.test(slot.name));

  return (
    <div style={{
      flex: 1, minHeight: 0, padding: '10px 16px 16px',
      display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      {/* Filter + apply-all */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
        {(['all', 'video'] as const).map(f => (
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
        <div style={{ flex: 1 }} />
        <TogglePill label="Apply to all" active={applyAll} onClick={() => setApplyAll(a => !a)} />
      </div>

      {/* Grid */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
        gap: '6px', alignContent: 'start',
      }}>
        <MediaTile name="None" thumbUrl="" selected={!stage.mediaId} onClick={() => choose('')} />
        {slots.map(slot => (
          <MediaTile
            key={slot.id}
            name={slot.name}
            thumbUrl={buildThumbnailUrl(slot.id, slot.thumbnailETag)}
            selected={String(stage.mediaId) === String(slot.id)}
            onClick={() => choose(slot.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Channel strip ──────────────────────────────────────────────────

function ChannelStrip({ stage, stageIndex, selected, compact, onSelect }: {
  stage: StageState;
  stageIndex: number;
  selected: boolean;
  compact: boolean;
  onSelect: () => void;
}) {
  const { masterLevel, blackout } = useAppState();
  const dispatch = useAppDispatch();

  const effectiveIntensity = blackout ? 0 : Math.round(stage.intensity * masterLevel / 100);
  const isOn = stage.intensity > 0;

  const toggleOnOff = useCallback((e: Event) => {
    e.stopPropagation();
    const newVal = isOn ? 0 : (stage.baseIntensity > 0 ? stage.baseIntensity : 100);
    dispatch({ type: 'SET_STAGE_INTENSITY', index: stageIndex, value: newVal });
    postStageIntensity(stage.id, newVal / 100).catch(console.error);
  }, [dispatch, stageIndex, isOn, stage.baseIntensity, stage.id]);

  return (
    <div
      onClick={onSelect}
      style={{
        // Desktop: flexible strip in a row. Mobile: sized by its grid cell.
        ...(compact ? { minHeight: 0 } : { flex: '1 0 0', minWidth: '84px' }),
        display: 'flex', flexDirection: 'column', gap: '10px',
        padding: '10px',
        borderRadius: '10px', boxSizing: 'border-box',
        background: selected ? 'var(--app-surface2)' : 'transparent',
        border: `1px solid ${selected ? 'var(--app-accent)' : 'var(--app-border)'}`,
        cursor: 'pointer',
        overflow: 'hidden', // keep the fader fill inside the rounded bounds
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {/* Name */}
      <div style={{
        textAlign: 'center', flexShrink: 0,
        fontSize: '10px', fontFamily: 'var(--font-sans)', fontWeight: 700,
        letterSpacing: '0.04em', textTransform: 'uppercase',
        color: selected ? 'var(--app-text)' : 'var(--app-text-secondary)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{stage.name}</div>

      {/* On/off */}
      <button
        aria-label={`Toggle ${stage.name}`}
        onClick={toggleOnOff}
        style={{
          all: 'unset', cursor: 'pointer', flexShrink: 0,
          height: '30px', borderRadius: '7px', boxSizing: 'border-box',
          textAlign: 'center',
          background: isOn ? stage.color : 'var(--app-surface3)',
          border: `1px solid ${isOn ? stage.color : 'var(--app-border2)'}`,
          fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700,
          letterSpacing: '0.14em', lineHeight: '28px',
          color: isOn ? '#fff' : 'var(--app-muted)',
          textShadow: isOn ? '0 1px 2px rgba(0,0,0,0.45)' : 'none',
          transition: 'all 0.15s',
        }}
      >{isOn ? 'ON' : 'OFF'}</button>

      {/* Fader — flex fills remaining height, clipped to its own rounded track */}
      <div style={{ flex: 1, minHeight: '60px', display: 'flex' }}>
        <VerticalFader
          stage={stage}
          stageIndex={stageIndex}
          effectiveIntensity={effectiveIntensity}
          color={stage.color}
        />
      </div>
    </div>
  );
}

// ─── Master strip ───────────────────────────────────────────────────

function MasterStrip() {
  const { masterLevel, stages } = useAppState();
  const dispatch = useAppDispatch();
  const [localValue, setLocalValue] = useState(masterLevel);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!draggingRef.current) setLocalValue(masterLevel);
  }, [masterLevel]);

  const { handlers } = usePointerFader({
    onValueChange: (value) => {
      setLocalValue(value);
      dispatch({ type: 'SET_MASTER_LEVEL', level: value });
    },
    onDragStart: () => { draggingRef.current = true; },
    onDragEnd: (finalValue) => {
      draggingRef.current = false;
      const masterFraction = finalValue / 100;
      Promise.all([
        postMasterIntensity(masterFraction),
        ...stages.map(s => {
          const scaled = (s.baseIntensity * masterFraction) / 100;
          return postStageIntensity(s.id, scaled);
        }),
      ]).catch(console.error);
    },
  });

  const pct = Math.max(0, Math.min(100, draggingRef.current ? localValue : masterLevel));

  return (
    <div style={{
      width: '120px', flexShrink: 0,
      display: 'flex', flexDirection: 'column', gap: '6px',
      padding: '10px',
      borderLeft: '1px solid var(--app-border2)',
      boxSizing: 'border-box',
    }}>
      <div style={{
        fontSize: '9px', fontFamily: 'var(--font-mono)', fontWeight: 600,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--app-muted)', textAlign: 'center', flexShrink: 0,
      }}>
        Master
      </div>

      {/* Vertical master fader */}
      <div
        class="no-select"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        style={{
          flex: 1, minHeight: 0, position: 'relative',
          background: 'var(--app-surface3)',
          borderRadius: 'var(--app-radius)',
          border: '1px solid var(--app-border)',
          overflow: 'hidden', touchAction: 'none', cursor: 'ns-resize',
        }}
        {...handlers}
      >
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          height: `${pct}%`,
          background: 'var(--app-accent)',
          opacity: 0.8,
          transition: draggingRef.current ? 'none' : 'height 0.15s ease',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 700,
          color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.5)',
          pointerEvents: 'none', userSelect: 'none',
        }}>
          {pct}%
        </div>
      </div>

      <BlackoutButton />
    </div>
  );
}
