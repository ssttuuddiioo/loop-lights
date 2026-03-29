import { useAppState, useAppDispatch } from '../../state/context';
import { STAGES_PER_BANK } from '../../lib/constants';

export function BankNav() {
  const { stages, currentBank } = useAppState();
  const dispatch = useAppDispatch();
  const totalBanks = Math.max(1, Math.ceil(stages.length / STAGES_PER_BANK));

  if (totalBanks <= 1) return null;

  const hiddenLeft = currentBank * STAGES_PER_BANK;
  const hiddenRight = Math.max(0, stages.length - ((currentBank + 1) * STAGES_PER_BANK));

  return (
    <>
      {/* Bank dots */}
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', padding: '8px 0' }}>
        {Array.from({ length: totalBanks }, (_, i) => (
          <div
            key={i}
            onClick={() => dispatch({ type: 'SET_BANK', bank: i })}
            style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: i === currentBank ? 'var(--app-accent)' : 'var(--app-border2)',
              opacity: i === currentBank ? 1 : 0.45,
              transform: i === currentBank ? 'scale(1.2)' : 'none',
              transition: 'transform 0.15s, opacity 0.15s, background 0.15s',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>

      {/* Offscreen hints */}
      {hiddenLeft > 0 && (
        <OffscreenHint side="left" count={hiddenLeft} onClick={() => dispatch({ type: 'SET_BANK', bank: currentBank - 1 })} />
      )}
      {hiddenRight > 0 && (
        <OffscreenHint side="right" count={hiddenRight} onClick={() => dispatch({ type: 'SET_BANK', bank: currentBank + 1 })} />
      )}
    </>
  );
}

function OffscreenHint({ side, count, onClick }: { side: 'left' | 'right'; count: number; onClick: () => void }) {
  return (
    <div
      class="offscreen-hint"
      onClick={onClick}
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 68px)',
        [side]: '8px',
        zIndex: 250,
        width: '34px', height: '64px',
        border: '1px solid var(--app-border2)',
        background: 'rgba(17,17,20,0.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '12px', opacity: 0.85, cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
        <div style={{ fontSize: '16px', color: 'var(--app-text)' }}>{side === 'left' ? '‹' : '›'}</div>
        <div style={{ fontSize: '9px', color: 'var(--app-muted)' }}>{count}</div>
      </div>
    </div>
  );
}
