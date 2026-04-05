import { useEffect } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { usePointerHorizontal } from '../../hooks/use-pointer-horizontal';
import { postMasterIntensity } from '../../api/settings';
import { postStageIntensity } from '../../api/stages';

export function MasterFader() {
  const { masterLevel, stages } = useAppState();
  const dispatch = useAppDispatch();

  const { handlers, setCurrentValue } = usePointerHorizontal({
    onValueChange: (value) => {
      dispatch({ type: 'SET_MASTER_LEVEL', level: value });
    },
    onDragEnd: (finalValue) => {
      const masterFraction = finalValue / 100;
      Promise.all([
        postMasterIntensity(masterFraction),
        ...stages.map(s => {
          const scaled = (s.baseIntensity * masterFraction) / 100;
          return postStageIntensity(s.id, scaled);
        }),
      ]).catch(console.error);
    },
  });

  // Keep the hook's internal value in sync with state
  useEffect(() => {
    setCurrentValue(masterLevel);
  }, [masterLevel, setCurrentValue]);

  const pct = Math.max(0, Math.min(100, masterLevel));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 14px', background: 'var(--app-surface2)', border: '1px solid var(--app-border)', borderRadius: '8px' }}>
      <span style={{ fontSize: '10px', color: 'var(--app-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
        Master
      </span>
      <div
        class="no-select master-track"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        tabIndex={0}
        style={{
          position: 'relative',
          width: '170px',
          height: '34px',
          touchAction: 'none',
          cursor: 'ew-resize',
          flex: '0 0 auto',
        }}
        {...handlers}
      >
        {/* Track */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '50%', height: '10px',
          transform: 'translateY(-50%)', background: 'var(--app-border2)', borderRadius: '999px',
        }} />
        {/* Fill */}
        <div style={{
          position: 'absolute', left: 0, top: '50%', height: '10px',
          transform: 'translateY(-50%)', background: 'var(--app-accent)', borderRadius: '999px',
          width: `${pct}%`, boxShadow: '0 0 8px rgba(232,255,71,0.35)',
        }} />
        {/* Thumb */}
        <div style={{
          position: 'absolute', top: '50%', left: `${pct}%`,
          width: '24px', height: '24px',
          transform: 'translate(-50%, -50%)', borderRadius: '50%',
          background: 'var(--app-accent)',
          border: '2px solid rgba(10,10,11,0.95)',
          boxShadow: '0 0 10px rgba(232,255,71,0.5)',
        }} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--app-accent)', minWidth: '36px', textAlign: 'right' as const }}>
        {pct}%
      </span>
    </div>
  );
}
