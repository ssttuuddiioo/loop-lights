import { useCallback } from 'preact/hooks';
import { memo } from 'preact/compat';
import { useAppState, useAppDispatch } from '../../state/context';
import { postStageMedia } from '../../api/stages';
import { getZoneSlotIds } from '../../lib/slot-allocation';
import { ZoneSlotTile } from './zone-slot-tile';
import type { StageState } from '../../types/stage';

interface ZoneMediaStripProps {
  stage: StageState;
  stageIndex: number;
}

export const ZoneMediaStrip = memo(function ZoneMediaStrip({ stage, stageIndex }: ZoneMediaStripProps) {
  const dispatch = useAppDispatch();
  const { mediaSlots } = useAppState();

  const slotIds = getZoneSlotIds(stageIndex);
  const slotMap = new Map(mediaSlots.map(s => [Number(s.id), s]));

  const onSlotClick = useCallback((slotId: number) => {
    dispatch({ type: 'SET_STAGE_MEDIA', index: stageIndex, mediaId: slotId });
    postStageMedia(stage.id, slotId).catch(console.error);
  }, [dispatch, stageIndex, stage.id]);

  const onGearClick = useCallback(() => {
    if (!stage.mediaId) return;
    dispatch({ type: 'OPEN_PARAM_PANEL', slotId: stage.mediaId, zoneIndex: stageIndex });
  }, [dispatch, stage.mediaId, stageIndex]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      height: '100%',
    }}>
      <div style={{
        display: 'flex',
        gap: 'var(--space-2)',
        overflowX: 'auto',
        flex: 1,
        alignItems: 'center',
        padding: 'var(--space-2) 0',
      }}>
        {slotIds.map(id => {
          const slot = slotMap.get(id) ?? null;
          const isActive = String(stage.mediaId) === String(id);
          return (
            <ZoneSlotTile
              key={id}
              slot={slot}
              slotId={id}
              isActive={isActive}
              onClick={() => onSlotClick(id)}
            />
          );
        })}
      </div>

      <button
        class="geist-icon-btn"
        onClick={onGearClick}
        disabled={!stage.mediaId}
        title="Open parameters"
      >
        ⚙
      </button>
    </div>
  );
});
