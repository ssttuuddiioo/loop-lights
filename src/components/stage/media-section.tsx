import { memo } from 'preact/compat';
import { useAppState } from '../../state/context';
import { buildThumbnailUrl } from '../../api/media';
import type { StageState } from '../../types/stage';

interface MediaSectionProps {
  stage: StageState;
  stageIndex: number;
  onOpenModal: () => void;
}

export const MediaSection = memo(function MediaSection({ stage, onOpenModal }: MediaSectionProps) {
  const { mediaSlots } = useAppState();

  const currentSlot = mediaSlots.find(s => String(s.id) === String(stage.mediaId));
  const thumbUrl = currentSlot ? buildThumbnailUrl(currentSlot.id, currentSlot.thumbnailETag) : '';
  const mediaName = currentSlot ? currentSlot.name : 'None';

  return (
    <div style={{ width: '100%' }}>
      {/* Thumbnail */}
      <div
        onClick={onOpenModal}
        style={{
          width: '100%', height: '48px', borderRadius: 'var(--app-radius-sm)',
          border: '1px solid var(--app-border)', background: 'var(--app-surface3)',
          position: 'relative', overflow: 'hidden', cursor: 'pointer',
        }}
      >
        <div style={{
          width: '100%', height: '100%',
          backgroundImage: thumbUrl ? `url('${thumbUrl}')` : 'none',
          backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, padding: '3px 6px',
          fontSize: '9px', color: 'var(--app-text)',
          background: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0))',
          whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {mediaName}
        </div>
      </div>
    </div>
  );
});
