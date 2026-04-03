import type { StageState } from '../types/stage';
import type { MediaSlot } from '../types/media';

export const MOCK_STAGES: StageState[] = [
  { id: '1', name: 'Main', intensity: 85, baseIntensity: 85, color: '#ff3c3c', mediaId: 1 },
  { id: '2', name: 'All Strip', intensity: 60, baseIntensity: 60, color: '#4780ff', mediaId: '' },
  { id: '3', name: 'Sides', intensity: 100, baseIntensity: 100, color: '#e8ff47', mediaId: '' },
  { id: '4', name: 'Center LED', intensity: 75, baseIntensity: 75, color: '#ff8c00', mediaId: '' },
  { id: '5', name: 'Mini Fixtures', intensity: 50, baseIntensity: 50, color: '#b44bff', mediaId: '' },
  { id: '6', name: 'Main Fixtures', intensity: 100, baseIntensity: 100, color: '#00ff88', mediaId: '' },
  { id: '7', name: 'Zone 7', intensity: 40, baseIntensity: 40, color: '#ff47a3', mediaId: '' },
];

export const MOCK_MEDIA_SLOTS: MediaSlot[] = [
  { id: 1, name: 'Ambient Loop A', thumbnailETag: '' },
  { id: 2, name: 'Highlight Reel', thumbnailETag: '' },
  { id: 3, name: 'Opening Sequence', thumbnailETag: '' },
  { id: 4, name: 'Closing Sequence', thumbnailETag: '' },
  { id: 5, name: 'Countdown Timer', thumbnailETag: '' },
  { id: 6, name: 'Logo Sting', thumbnailETag: '' },
];

export const MOCK_ENABLED = import.meta.env.VITE_MOCK === 'true';
