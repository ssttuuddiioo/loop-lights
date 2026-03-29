import type { MediaSlot } from '../types/media';

export const SLOTS_PER_ZONE = 10;

/** Returns the inclusive slot ID range for a zone (0-based index). */
export function getZoneSlotRange(zoneIndex: number): { start: number; end: number } {
  const start = zoneIndex * SLOTS_PER_ZONE + 1;
  return { start, end: start + SLOTS_PER_ZONE - 1 };
}

/** Returns all 10 slot IDs for a zone, regardless of whether they're loaded. */
export function getZoneSlotIds(zoneIndex: number): number[] {
  const { start } = getZoneSlotRange(zoneIndex);
  return Array.from({ length: SLOTS_PER_ZONE }, (_, i) => start + i);
}

/** Filters the full media slots array to only those in a zone's range. */
export function getZoneSlots(allSlots: MediaSlot[], zoneIndex: number): MediaSlot[] {
  const { start, end } = getZoneSlotRange(zoneIndex);
  return allSlots.filter(s => {
    const id = typeof s.id === 'string' ? parseInt(s.id, 10) : s.id;
    return id >= start && id <= end;
  });
}
