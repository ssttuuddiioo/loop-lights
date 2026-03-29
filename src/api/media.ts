import { elmGet, elmPost, baseUrl, elmPostFormData } from './client';
import type { MediaSlot } from '../types/media';

interface MediaSlotsResponse {
  slots: Array<{
    id: string | number;
    name?: string;
    thumbnailETag?: string;
  }>;
}

export interface MediaParameter {
  name: { id: string; default: string; value: string };
  min: number;
  max: number;
  value: number;
  type: string;
  isRemotelyControlled: number;
  remoteName: string;
}

interface MediaParametersResponse {
  parameters: MediaParameter[];
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

export async function getMediaParameters(slotId: string | number): Promise<MediaParameter[]> {
  const data = await elmGet<MediaParametersResponse>(`media/slots/${slotId}/parameters`);
  return data.parameters || [];
}

export async function postMediaParameter(
  slotId: string | number,
  displayName: string,
  value: number,
): Promise<Response> {
  return elmPost(`media/slots/${slotId}/parameters/${encodeURIComponent(displayName)}?value=${value}`);
}

export async function uploadMedia(slotId: string | number, file: File): Promise<Response> {
  const formData = new FormData();
  formData.append('file', file);
  return elmPostFormData(`media/slots/${slotId}`, formData);
}
