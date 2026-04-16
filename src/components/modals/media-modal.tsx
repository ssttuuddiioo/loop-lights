import { useCallback, useState, useEffect } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { postStageMedia } from '../../api/stages';
import { buildThumbnailUrl } from '../../api/media';
import { MOCK_ENABLED } from '../../api/mock';

type MediaFilter = 'all' | 'effects' | 'video';

const VIDEO_EXTS = /\.(mp4|mov|avi|gif|png|jpg|jpeg|webm|webp)$/i;

function isVideoSlot(name: string): boolean {
  return VIDEO_EXTS.test(name);
}

export function MediaPanel() {
  const { stages, mediaSlots, mediaModalStageIndex } = useAppState();
  const dispatch = useAppDispatch();
  const [filter, setFilter] = useState<MediaFilter>('all');

  const stage = mediaModalStageIndex !== null ? stages[mediaModalStageIndex] : null;

  const choose = useCallback(async (mediaId: string | number) => {
    if (mediaModalStageIndex === null) return;
    dispatch({ type: 'SET_STAGE_MEDIA', index: mediaModalStageIndex, mediaId });
    const stageData = stages[mediaModalStageIndex];
    if (stageData) {
      try { await postStageMedia(stageData.id, mediaId || 0); } catch (_) {}
    }
    dispatch({ type: 'CLOSE_MEDIA_MODAL' });
  }, [dispatch, mediaModalStageIndex, stages]);

  const close = useCallback(() => {
    dispatch({ type: 'CLOSE_MEDIA_MODAL' });
  }, [dispatch]);

  if (!stage) return null;

  return (
    <div style={{
      padding: '16px',
      display: 'flex', flexDirection: 'column', gap: '12px',
      height: '100%',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 700, color: 'var(--app-text)' }}>
          Media · {stage.name}
        </span>
        <button onClick={close} style={{
          all: 'unset', cursor: 'pointer', fontSize: '16px', color: 'var(--app-muted)',
          width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 'var(--app-radius-sm)', background: 'var(--app-surface3)',
        }}>
          &times;
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '5px' }}>
        {(['all', 'effects', 'video'] as MediaFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              all: 'unset', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 500,
              padding: '4px 10px', borderRadius: 'var(--app-radius-sm)',
              border: `1px solid ${filter === f ? 'var(--app-text)' : 'var(--app-border2)'}`,
              background: filter === f ? 'var(--app-text)' : 'transparent',
              color: filter === f ? 'var(--app-bg)' : 'var(--app-muted)',
              textTransform: 'capitalize',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px',
        overflow: 'auto', flex: 1,
      }}>
        <MediaTile name="None" thumbUrl="" selected={!stage.mediaId} onClick={() => choose('')} />
        {mediaSlots.filter(slot => {
          if (filter === 'all') return true;
          if (filter === 'video') return isVideoSlot(slot.name);
          return !isVideoSlot(slot.name);
        }).map(slot => (
          <MediaTile
            key={slot.id}
            name={slot.name}
            thumbUrl={buildThumbnailUrl(slot.id, slot.thumbnailETag)}
            selected={String(slot.id) === String(stage.mediaId)}
            onClick={() => choose(slot.id)}
          />
        ))}
      </div>
    </div>
  );
}

function MediaTile({ name, thumbUrl, selected, onClick }: {
  name: string;
  thumbUrl: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--app-surface2)',
        border: `1px solid ${selected ? 'var(--app-border2)' : 'var(--app-border)'}`,
        borderRadius: 'var(--app-radius-sm)', overflow: 'hidden', cursor: 'pointer',
        transition: 'border-color 0.12s, box-shadow 0.12s',
        boxShadow: selected ? '0 0 10px -5px var(--app-accent)' : 'none',
      }}
    >
      <div style={{
        width: '100%', height: '70px',
        background: 'var(--app-surface3)',
        backgroundImage: thumbUrl ? `url('${thumbUrl}')` : 'none',
        backgroundSize: 'cover', backgroundPosition: 'center',
      }} />
      <div style={{ fontSize: '9px', padding: '5px 6px', color: 'var(--app-text)', lineHeight: 1.3 }}>
        {name}
      </div>
    </div>
  );
}

/** @deprecated Use MediaPanel instead — kept as re-export for app.tsx */
export function MediaModal() {
  return null;
}

/** Always-visible media library bin for the mixer page.
 *  Target selector: "All" (default) broadcasts to every stage,
 *  or pick a specific stage chip to target individually.
 *  Opening a stage's media modal auto-selects that stage chip. */
export function MediaBin() {
  const { stages, mediaSlots, mediaModalStageIndex } = useAppState();
  const dispatch = useAppDispatch();
  const [filter, setFilter] = useState<MediaFilter>('all');
  // null = "All stages" mode, number = individual stage index
  const [target, setTarget] = useState<number | null>(null);

  // When a stage opens the media modal, auto-select that stage
  useEffect(() => {
    if (mediaModalStageIndex !== null) {
      setTarget(mediaModalStageIndex);
    }
  }, [mediaModalStageIndex]);

  const targetStage = target !== null ? (stages[target] ?? null) : null;

  const choose = useCallback(async (mediaId: string | number) => {
    if (target === null) {
      // All stages mode
      for (let i = 0; i < stages.length; i++) {
        dispatch({ type: 'SET_STAGE_MEDIA', index: i, mediaId });
        if (!MOCK_ENABLED) {
          postStageMedia(stages[i].id, mediaId || 0).catch(() => {});
        }
      }
    } else {
      // Individual stage
      const s = stages[target];
      if (!s) return;
      dispatch({ type: 'SET_STAGE_MEDIA', index: target, mediaId });
      if (!MOCK_ENABLED) {
        postStageMedia(s.id, mediaId || 0).catch(() => {});
      }
    }
    if (mediaModalStageIndex !== null) {
      dispatch({ type: 'CLOSE_MEDIA_MODAL' });
    }
  }, [dispatch, target, stages, mediaModalStageIndex]);

  // For "selected" highlight: in All mode, show selected if ALL stages have that media
  const isMediaSelected = (mediaId: string | number): boolean => {
    if (target !== null) {
      return targetStage ? String(targetStage.mediaId) === String(mediaId) : false;
    }
    if (stages.length === 0) return false;
    return stages.every(s => String(s.mediaId) === String(mediaId));
  };

  const isNoneSelected = target !== null
    ? (targetStage ? !targetStage.mediaId : false)
    : (stages.length > 0 && stages.every(s => !s.mediaId));

  return (
    <div style={{
      padding: '16px',
      display: 'flex', flexDirection: 'column', gap: '10px',
      height: '100%',
    }}>
      {/* Header */}
      <div style={{
        fontSize: '13px', fontWeight: 590, fontFamily: 'var(--font-sans)',
        letterSpacing: '-0.01em', color: 'var(--app-text)',
      }}>
        Media
      </div>

      {/* Target selector */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setTarget(null)}
          style={{
            all: 'unset', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 510,
            padding: '4px 10px', borderRadius: '9999px',
            background: target === null ? 'var(--app-accent)' : 'transparent',
            border: `1px solid ${target === null ? 'var(--app-accent)' : 'rgba(255,255,255,0.08)'}`,
            color: target === null ? '#fff' : 'var(--app-muted)',
            transition: 'all 0.15s',
          }}
        >All Stages</button>
        {stages.map((s, i) => {
          const active = target === i;
          return (
            <button
              key={s.id}
              onClick={() => setTarget(i)}
              style={{
                all: 'unset', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 510,
                padding: '4px 8px', borderRadius: '9999px',
                background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                border: `1px solid ${active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}`,
                color: active ? 'var(--app-text)' : 'var(--app-text-quaternary)',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              <span style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: s.color, opacity: active ? 1 : 0.4,
                flexShrink: 0,
              }} />
              {s.name}
            </button>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {(['all', 'effects', 'video'] as MediaFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              all: 'unset', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 510,
              padding: '4px 10px', borderRadius: '6px',
              border: `1px solid ${filter === f ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)'}`,
              background: filter === f ? 'rgba(255,255,255,0.06)' : 'transparent',
              color: filter === f ? 'var(--app-text)' : 'var(--app-muted)',
              textTransform: 'capitalize',
              transition: 'all 0.15s',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px',
        overflow: 'auto', flex: 1,
      }}>
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
