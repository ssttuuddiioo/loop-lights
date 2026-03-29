import type { StageState } from '../types/stage';
import type { MediaSlot } from '../types/media';

export const MOCK_STAGES: StageState[] = [
  { id: '1', name: 'Front Wash', intensity: 85, baseIntensity: 85, color: '#ff3c3c', mediaId: '' },
  { id: '2', name: 'Back Light', intensity: 60, baseIntensity: 60, color: '#4780ff', mediaId: '' },
  { id: '3', name: 'Side Left', intensity: 100, baseIntensity: 100, color: '#e8ff47', mediaId: 1 },
  { id: '4', name: 'Side Right', intensity: 100, baseIntensity: 100, color: '#e8ff47', mediaId: 1 },
  { id: '5', name: 'Spot Center', intensity: 0, baseIntensity: 0, color: '#ffffff', mediaId: '' },
  { id: '6', name: 'Ambient', intensity: 40, baseIntensity: 40, color: '#b44bff', mediaId: 2 },
];

export const MOCK_MEDIA_SLOTS: MediaSlot[] = [
  { id: 1, name: 'Ambient Loop A', thumbnailETag: '' },
  { id: 2, name: 'Highlight Reel', thumbnailETag: '' },
  { id: 3, name: 'Opening Sequence', thumbnailETag: '' },
  { id: 4, name: 'Closing Sequence', thumbnailETag: '' },
  { id: 5, name: 'Countdown Timer', thumbnailETag: '' },
  { id: 6, name: 'Logo Sting', thumbnailETag: '' },
];

export const MOCK_ENABLED = false;
