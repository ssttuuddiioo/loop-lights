import type { StageState } from '../types/stage';
import type { MediaSlot } from '../types/media';
import type { Scene, SceneStatus, FullTrigger } from './scenes';

export const MOCK_STAGES: StageState[] = [
  { id: '1', name: 'PROJECTION', intensity: 50, baseIntensity: 50, color: '#5e6ad2', mediaId: 1 },
  { id: '2', name: 'SPIRAL', intensity: 20, baseIntensity: 20, color: '#4780ff', mediaId: 2 },
  { id: '3', name: 'COLUMN-L', intensity: 50, baseIntensity: 50, color: '#b44bff', mediaId: '' },
  { id: '4', name: 'COLUMN-R', intensity: 55, baseIntensity: 55, color: '#00ff88', mediaId: '' },
  { id: '5', name: 'BAR', intensity: 25, baseIntensity: 25, color: '#ff8c00', mediaId: '' },
  { id: '6', name: 'RING', intensity: 25, baseIntensity: 25, color: '#e8ff47', mediaId: '' },
  { id: '7', name: 'FACADE', intensity: 80, baseIntensity: 80, color: '#ff3c3c', mediaId: 3 },
];

export const MOCK_MEDIA_SLOTS: MediaSlot[] = [
  { id: 1, name: 'Ambient Loop A', thumbnailETag: '' },
  { id: 2, name: 'Highlight Reel', thumbnailETag: '' },
  { id: 3, name: 'Opening Sequence', thumbnailETag: '' },
  { id: 4, name: 'Closing Sequence', thumbnailETag: '' },
  { id: 5, name: 'Countdown Timer', thumbnailETag: '' },
  { id: 6, name: 'Logo Sting', thumbnailETag: '' },
];

export const MOCK_SCENES: Record<string, Scene> = {
  '1': { name: '1', description: 'Default house lights', stages: {} },
  'warm-wash': { name: 'Warm Wash', description: 'Warm amber wash across all zones', stages: {} },
  'amber-white': { name: 'Amber White', description: 'Soft amber and white blend', stages: {} },
  'green': { name: 'Green', description: 'Green accent lighting', stages: {} },
  'red': { name: 'Red', description: 'Red accent lighting', stages: {} },
  'blackout': { name: 'Blackout', description: 'All lights off', stages: {} },
};

export const MOCK_SCENE_STATUS: SceneStatus = {
  activeScene: 'red',
  activeTrigger: null,
  manualOverrideActive: false,
  manualOverrideExpiresAt: null,
  scenes: ['1', 'warm-wash', 'amber-white', 'green', 'red', 'blackout'],
  triggers: {
    'daily-on': { type: 'clock', scene: 'warm-wash', enabled: true, priority: 10 },
    'nightly-blackout': { type: 'clock', scene: 'blackout', enabled: true, priority: 10 },
    'sunset-wash': { type: 'astro', scene: 'warm-wash', enabled: false, priority: 5 },
  },
};

export const MOCK_TRIGGERS: Record<string, FullTrigger> = {
  'daily-on': {
    type: 'clock',
    scene: '1',
    enabled: true,
    priority: 10,
    schedule: { time: '10:30', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
    transition: { duration: 5 },
  },
  'nightly-blackout': {
    type: 'clock',
    scene: 'blackout',
    enabled: true,
    priority: 10,
    schedule: { time: '19:07', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
    transition: { duration: 5 },
  },
  'sunset-wash': {
    type: 'astro',
    scene: 'warm-wash',
    enabled: false,
    priority: 5,
    astro: { event: 'sunset', offset: -30 },
    transition: { duration: 10 },
  },
};

export const MOCK_ENABLED = import.meta.env.VITE_MOCK === 'true';
