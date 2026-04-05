import { useCallback, useState } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { postStageMedia } from '../../api/stages';
import { buildThumbnailUrl } from '../../api/media';

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
