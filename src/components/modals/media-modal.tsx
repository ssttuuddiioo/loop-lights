import { useCallback } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { postStageMedia } from '../../api/stages';
import { buildThumbnailUrl } from '../../api/media';
import '@material/web/button/outlined-button.js';

export function MediaModal() {
  const { stages, mediaSlots, mediaModalStageIndex } = useAppState();
  const dispatch = useAppDispatch();

  const isOpen = mediaModalStageIndex !== null;
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

  const onBackdropClick = useCallback((e: MouseEvent) => {
    if (e.target === e.currentTarget) close();
  }, [close]);

  if (!isOpen || !stage) return null;

  return (
    <div
      onClick={onBackdropClick}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '20px',
      }}
    >
      <div class="media-modal-panel" style={{
        width: 'min(980px, 96vw)', maxHeight: '88vh', overflow: 'auto',
        background: 'var(--app-surface)', border: '1px solid var(--app-border2)',
        borderRadius: '16px', padding: '16px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700 }}>
            Select Media · {stage.name}
          </span>
          <md-outlined-button onClick={close}>Close</md-outlined-button>
        </div>

        {/* Grid */}
        <div class="media-modal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px' }}>
          {/* None tile */}
          <MediaTile
            name="None"
            thumbUrl=""
            selected={!stage.mediaId}
            onClick={() => choose('')}
          />
          {mediaSlots.map(slot => (
            <MediaTile
              key={slot.id}
              name={`${slot.id} · ${slot.name}`}
              thumbUrl={buildThumbnailUrl(slot.id, slot.thumbnailETag)}
              selected={String(slot.id) === String(stage.mediaId)}
              onClick={() => choose(slot.id)}
            />
          ))}
        </div>
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
        borderRadius: '10px', overflow: 'hidden', cursor: 'pointer',
        transition: 'transform 0.12s, border-color 0.12s, box-shadow 0.12s',
        boxShadow: selected ? '0 0 16px -8px var(--app-accent)' : 'none',
      }}
    >
      <div style={{
        width: '100%', height: '92px',
        background: 'var(--app-surface3)',
        backgroundImage: thumbUrl ? `url('${thumbUrl}')` : 'none',
        backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
      }} />
      <div style={{ fontSize: '10px', padding: '7px 8px 8px', color: 'var(--app-text)', lineHeight: 1.35 }}>
        {name}
      </div>
    </div>
  );
}
