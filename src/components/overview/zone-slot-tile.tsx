import { memo } from 'preact/compat';
import type { MediaSlot } from '../../types/media';
import { buildThumbnailUrl } from '../../api/media';

interface ZoneSlotTileProps {
  slot: MediaSlot | null;
  slotId: number;
  isActive: boolean;
  onClick: () => void;
}

export const ZoneSlotTile = memo(function ZoneSlotTile({ slot, slotId, isActive, onClick }: ZoneSlotTileProps) {
  const hasMedia = slot !== null;

  return (
    <button
      onClick={onClick}
      style={{
        width: '96px',
        aspectRatio: '16 / 10',
        flexShrink: 0,
        border: isActive
          ? '2px solid var(--app-success)'
          : '1px solid var(--app-border2)',
        borderRadius: 'var(--app-radius-sm)',
        background: hasMedia ? 'var(--app-surface2)' : 'var(--app-surface)',
        backgroundImage: hasMedia ? `url(${buildThumbnailUrl(slot.id, slot.thumbnailETag)})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        cursor: hasMedia ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        padding: 0,
        outline: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: isActive ? '0 0 0 1px var(--app-success)' : 'none',
      }}
      disabled={!hasMedia}
    >
      {/* Slot ID label */}
      <span style={{
        position: 'absolute',
        bottom: '3px',
        right: '5px',
        fontSize: '10px',
        fontFamily: 'var(--font-mono)',
        fontWeight: 500,
        color: 'rgba(255,255,255,0.75)',
        textShadow: '0 1px 3px rgba(0,0,0,0.9)',
        lineHeight: 1,
      }}>
        {slotId}
      </span>
    </button>
  );
});
