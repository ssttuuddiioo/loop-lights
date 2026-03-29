import { elmGet, baseUrl } from './client';
import type { MediaSlot } from '../types/media';

interface MediaSlotsResponse {
  slots: Array<{
    id: string | number;
    name?: string;
    thumbnailETag?: string;
  }>;
}

export async function getMediaSlots(): Promise<MediaSlot[]> {
  const data = await elmGet<MediaSlotsResponse>('media/slots?includeState=1');
  return (data.slots || []).map(slot => ({
    id: slot.id,
    name: slot.name || `Media ${slot.id}`,
    thumbnailETag: slot.thumbnailETag || '',
  }));
}

export function buildThumbnailUrl(slotId: string | number, etag: string): string {
  return baseUrl(`media/slots/${slotId}/thumbnail?width=256&height=128&v=${etag}`);
}
