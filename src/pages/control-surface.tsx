import { useState } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../state/context';
import { useIsMobile } from '../hooks/use-media-query';
import { StageGrid } from '../components/stage/stage-grid';
import { BankNav } from '../components/stage/bank-nav';
import { ColorPanel } from '../components/modals/color-modal';
import { MixerToolkit } from '../components/mixer/mixer-toolkit';
import { BottomSheet } from '../components/layout/bottom-sheet';

export function ControlSurface() {
  const { colorModalStageIndex } = useAppState();
  const dispatch = useAppDispatch();
  const isMobile = useIsMobile();
  const [mixerOpen, setMixerOpen] = useState(false);
  const colorOpen = colorModalStageIndex !== null;

  // ── Mobile (≤900px): faders front-and-centre; mixer + color in bottom sheets ──
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <StageGrid />
          <BankNav />
        </div>

        {/* FAB to reveal the mixer toolkit (media / effects / presets) */}
        <button
          onClick={() => setMixerOpen(true)}
          style={{
            position: 'fixed', zIndex: 800,
            right: 'calc(16px + env(safe-area-inset-right, 0px))',
            bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            padding: '12px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
            background: 'var(--app-accent)', color: '#fff',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          Media / FX
        </button>

        <BottomSheet open={mixerOpen} onClose={() => setMixerOpen(false)}>
          <div style={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <MixerToolkit />
          </div>
        </BottomSheet>

        <BottomSheet open={colorOpen} onClose={() => dispatch({ type: 'CLOSE_COLOR_MODAL' })}>
          <ColorPanel />
        </BottomSheet>
      </div>
    );
  }

  // ── Desktop (>900px): three-pane layout ──
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div class="cs-stages" style={{ width: '75%', flexShrink: 0, minWidth: 0, overflow: 'auto' }}>
        <StageGrid />
        <BankNav />
      </div>

      {/* Color panel — slides in when a stage color is being edited */}
      {colorOpen && (
        <div class="cs-color" style={{
          width: '320px', flexShrink: 0, overflow: 'auto',
          borderLeft: '1px solid var(--app-border)',
        }}>
          <ColorPanel />
        </div>
      )}

      {/* Toolkit sidebar — media + presets tabs */}
      <div class="cs-mixer" style={{
        flex: 1, minWidth: 0, overflow: 'hidden',
        borderLeft: '1px solid var(--app-border)', background: 'var(--app-surface)',
      }}>
        <MixerToolkit />
      </div>
    </div>
  );
}
