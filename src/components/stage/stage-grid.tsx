import { useCallback } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { useSwipeBanks } from '../../hooks/use-swipe-banks';
import { StageCard } from './stage-card';
import { STAGES_PER_BANK } from '../../lib/constants';

export function StageGrid() {
  const { stages, currentBank } = useAppState();
  const dispatch = useAppDispatch();
  const totalBanks = Math.max(1, Math.ceil(stages.length / STAGES_PER_BANK));

  const onSwipeLeft = useCallback(() => {
    if (currentBank < totalBanks - 1) {
      dispatch({ type: 'SET_BANK', bank: currentBank + 1 });
    }
  }, [currentBank, totalBanks, dispatch]);

  const onSwipeRight = useCallback(() => {
    if (currentBank > 0) {
      dispatch({ type: 'SET_BANK', bank: currentBank - 1 });
    }
  }, [currentBank, dispatch]);

  const swipeHandlers = useSwipeBanks({ onSwipeLeft, onSwipeRight });

  const start = currentBank * STAGES_PER_BANK;
  const displayed = stages.slice(start, start + STAGES_PER_BANK);

  return (
    <div
      class="stage-grid"
      style={{
        padding: '24px 28px 40px',
        display: 'grid',
        gap: '12px',
        touchAction: 'pan-y',
      }}
      {...swipeHandlers}
    >
      {displayed.map((stage) => {
        const globalIndex = stages.indexOf(stage);
        return (
          <StageCard
            key={stage.id}
            stage={stage}
            stageIndex={globalIndex}
          />
        );
      })}
    </div>
  );
}
