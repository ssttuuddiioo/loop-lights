import { useCallback, useRef, useState } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { postStageMedia } from '../../api/stages';
import { buildThumbnailUrl, uploadMedia } from '../../api/media';

export function MasterMediaBin() {
  const { stages, mediaSlots } = useAppState();
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pushToAll = useCallback(async (mediaId: string | number) => {
    dispatch({ type: 'SET_ALL_MEDIA', mediaId });
    try {
      await Promise.all(stages.map(s => postStageMedia(s.id, mediaId || 0)));
    } catch (err) {
      console.error('Failed to push media to all stages:', err);
    }
  }, [dispatch, stages]);

  const handleUpload = useCallback(async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const slotStr = prompt('Upload to which slot number? (1-123)');
    if (!slotStr) return;
    const slotId = parseInt(slotStr, 10);
    if (isNaN(slotId) || slotId < 1) return;

    setUploading(true);
    try {
      await uploadMedia(slotId, file);
      // Force a media slots refresh on next sync cycle
      dispatch({ type: 'SET_SYNC_STATUS', status: 'syncing' });
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed — check console for details');
    } finally {
      setUploading(false);
      input.value = '';
    }
  }, [dispatch]);

  const tileStyle = {
    background: 'var(--app-surface2)', border: '1px solid var(--app-border)',
    borderRadius: '10px', overflow: 'hidden', cursor: 'pointer',
    transition: 'border-color 0.12s, box-shadow 0.12s',
  };

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
        <div onClick={() => pushToAll('')} style={tileStyle}>
          <div style={{ width: '100%', height: '64px', background: 'var(--app-surface3)' }} />
          <div style={{ fontSize: '10px', padding: '6px 8px', color: 'var(--app-text)' }}>None</div>
        </div>

        {mediaSlots.map(slot => (
          <div key={slot.id} onClick={() => pushToAll(slot.id)} style={tileStyle}>
            <div style={{
              width: '100%', height: '64px', background: 'var(--app-surface3)',
              backgroundImage: `url('${buildThumbnailUrl(slot.id, slot.thumbnailETag)}')`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              position: 'relative',
            }}>
              {/* Tune button — opens shader preview without assigning */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: 'OPEN_SHADER_PREVIEW', slotId: slot.id });
                }}
                style={{
                  position: 'absolute', top: '4px', right: '4px',
                  width: '24px', height: '24px', borderRadius: '6px',
                  background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', color: 'var(--app-muted)',
                  cursor: 'pointer', transition: 'color 0.12s',
                }}
                title="Tune shader parameters"
              >
                &#9881;
              </div>
            </div>
            <div style={{ fontSize: '10px', padding: '6px 8px', color: 'var(--app-text)', lineHeight: 1.3 }}>
              {slot.id} · {slot.name}
            </div>
          </div>
        ))}

        {/* Upload tile */}
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          style={{
            ...tileStyle,
            opacity: uploading ? 0.5 : 1,
            border: '1px dashed var(--app-border2)',
          }}
        >
          <div style={{
            width: '100%', height: '64px', background: 'var(--app-surface3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', color: 'var(--app-muted)',
          }}>
            {uploading ? '...' : '+'}
          </div>
          <div style={{ fontSize: '10px', padding: '6px 8px', color: 'var(--app-muted)' }}>
            {uploading ? 'Uploading...' : 'Upload'}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.mp4,.mov,.gif"
          style={{ display: 'none' }}
          onChange={handleUpload}
        />
      </div>
    </div>
  );
}
