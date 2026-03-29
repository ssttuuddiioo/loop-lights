import { useAppState } from '../../state/context';
import { ZoneCard } from './zone-card';

export function ZoneGrid() {
  const { stages } = useAppState();

  return (
    <div class="zone-grid" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
      gap: '10px',
    }}>
      {stages.map((stage, index) => (
        <ZoneCard key={stage.id} stage={stage} stageIndex={index} />
      ))}
    </div>
  );
}
