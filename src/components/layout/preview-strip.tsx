import { useAppState } from '../../state/context';

export function PreviewStrip() {
  const { stages, masterLevel, blackout } = useAppState();

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: '4px', display: 'flex', zIndex: 200,
    }}>
      {stages.map((s) => {
        const effective = blackout ? 0 : Math.round(s.intensity * masterLevel / 100);
        return (
          <div
            key={s.id}
            style={{
              flex: 1,
              background: effective > 0 ? s.color : 'transparent',
              opacity: effective / 100,
              transition: 'background 0.2s, opacity 0.2s',
            }}
          />
        );
      })}
    </div>
  );
}
