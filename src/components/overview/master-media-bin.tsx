import { useCallback } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { postStageMedia } from '../../api/stages';
import { buildThumbnailUrl } from '../../api/media';

export function MasterMediaBin() {
  const { stages, mediaSlots } = useAppState();
  const dispatch = useAppDispatch();

  const pushToAll = useCallback(async (mediaId: string | number) => {
    dispatch({ type: 'SET_ALL_MEDIA', mediaId });
    try {
      await Promise.all(stages.map(s => postStageMedia(s.id, mediaId || 0)));
    } catch (err) {
      console.error('Failed to push media to all stages:', err);
    }
  }, [dispatch, stages]);

  return (
    <div>
      <div style={{
        fontSize: '11px', fontFamily: 'var(--font-display)', fontWeight: 700,
        textTransform: 'uppercase' as const, letterSpacing: '0.08em',
        color: 'var(--app-muted)', marginBottom: '10px',
      }}>
        Master Media Bin
      </div>
      <div class="media-bin-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '8px',
      }}>
        {/* None tile */}
        <div
          onClick={() => pushToAll('')}
          style={{
            background: 'var(--app-surface2)', border: '1px solid var(--app-border)',
            borderRadius: '10px', overflow: 'hidden', cursor: 'pointer',
            transition: 'border-color 0.12s',
          }}
        >
          <div style={{ width: '100%', height: '64px', background: 'var(--app-surface3)' }} />
          <div style={{ fontSize: '10px', padding: '6px 8px', color: 'var(--app-text)' }}>None</div>
        </div>

        {mediaSlots.map(slot => (
          <div
            key={slot.id}
            onClick={() => pushToAll(slot.id)}
            style={{
              background: 'var(--app-surface2)', border: '1px solid var(--app-border)',
              borderRadius: '10px', overflow: 'hidden', cursor: 'pointer',
              transition: 'border-color 0.12s, box-shadow 0.12s',
            }}
          >
            <div style={{
              width: '100%', height: '64px', background: 'var(--app-surface3)',
              backgroundImage: `url('${buildThumbnailUrl(slot.id, slot.thumbnailETag)}')`,
              backgroundSize: 'cover', backgroundPosition: 'center',
            }} />
            <div style={{ fontSize: '10px', padding: '6px 8px', color: 'var(--app-text)', lineHeight: 1.3 }}>
              {slot.id} · {slot.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
