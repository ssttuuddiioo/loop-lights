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

// ELM is inconsistent across versions: older builds return `name` as an object
// ({ id, default, value }); the current venue build returns it as a plain string
// (e.g. "Force", "Speed-Ex"). Parse the raw shape, then normalize to the object
// form every consumer in the app already expects (name.id / name.value).
interface RawMediaParameter extends Omit<MediaParameter, 'name'> {
  name: string | { id?: string; default?: string; value?: string };
}

interface MediaParametersResponse {
  parameters: RawMediaParameter[];
}

// Map an ELM parameter's display name to the canonical id the UI keys on —
// PARAM_MAP, HUE_PARAMS, and the preview uniforms all reference these ids.
function canonicalParamId(displayName: string): string {
  const n = displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (n === 'force') return 'media-param-force';
  if (n === 'force2') return 'media-param-force-2';
  if (n === 'nbitems' || n === 'complexity' || n === 'density') return 'media-param-nb-items';
  if (n === 'speed' || n === 'speedex') return 'media-param-speed';
  return 'media-param-' + n;
}

function normalizeParam(raw: RawMediaParameter): MediaParameter {
  const n = raw.name;
  // `display` is the human label AND the identifier ELM expects back on POST
  // (the POST path is /parameters/{display}); `id` is our stable internal key.
  const display = typeof n === 'string' ? n : (n?.value ?? n?.default ?? n?.id ?? '');
  const id = (n && typeof n === 'object' && n.id) ? n.id : canonicalParamId(display);
  return { ...raw, name: { id, default: display, value: display } };
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
  return (data.parameters || []).map(normalizeParam);
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
