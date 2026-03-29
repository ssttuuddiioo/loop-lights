import { useCallback } from 'preact/hooks';
import { memo } from 'preact/compat';
import { useAppState, useAppDispatch } from '../../state/context';
import { postStageMedia } from '../../api/stages';
import { buildThumbnailUrl } from '../../api/media';
import type { StageState } from '../../types/stage';

interface MediaSectionProps {
  stage: StageState;
  stageIndex: number;
  onOpenModal: () => void;
}

export const MediaSection = memo(function MediaSection({ stage, stageIndex, onOpenModal }: MediaSectionProps) {
  const { mediaSlots } = useAppState();
  const dispatch = useAppDispatch();

  const currentSlot = mediaSlots.find(s => String(s.id) === String(stage.mediaId));
  const thumbUrl = currentSlot ? buildThumbnailUrl(currentSlot.id, currentSlot.thumbnailETag) : '';
  const mediaName = currentSlot ? currentSlot.name : 'None';

  const onSelectChange = useCallback((e: Event) => {
    const val = (e.target as HTMLSelectElement).value;
    const mediaId = val === '' ? '' : val;
    dispatch({ type: 'SET_STAGE_MEDIA', index: stageIndex, mediaId });
    postStageMedia(stage.id, mediaId || 0).catch(console.error);
  }, [dispatch, stageIndex, stage.id]);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontSize: '9px', textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--app-muted)', marginBottom: '5px' }}>
        Media
      </div>
      {/* Live preview / thumbnail */}
      <div
        onClick={onOpenModal}
        style={{
          width: '100%', height: '56px', borderRadius: '8px',
          border: '1px solid var(--app-border)', background: 'var(--app-surface3)',
          marginBottom: '6px', position: 'relative', overflow: 'hidden', cursor: 'pointer',
        }}
      >
        <div style={{
          width: '100%', height: '100%',
          backgroundImage: thumbUrl ? `url('${thumbUrl}')` : 'none',
          backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, padding: '4px 6px',
          fontSize: '9px', color: 'var(--app-text)',
          background: 'linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0))',
          whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {mediaName}
        </div>
      </div>
      {/* Dropdown */}
      <select
        value={String(stage.mediaId || '')}
        onChange={onSelectChange}
        style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px', width: '100%',
          padding: '6px 24px 6px 8px', background: 'var(--app-surface3)',
          border: '1px solid var(--app-border)', borderRadius: 'var(--app-radius-sm)',
          color: 'var(--app-text)', cursor: 'pointer', outline: 'none',
          appearance: 'none', WebkitAppearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='rgba(240,240,239,0.3)' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
        }}
      >
        <option value="">None</option>
        {mediaSlots.map(m => (
          <option key={m.id} value={String(m.id)}>
            {m.id} · {m.name}
          </option>
        ))}
      </select>
    </div>
  );
});
