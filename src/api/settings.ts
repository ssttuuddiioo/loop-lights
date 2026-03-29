import { elmGet, elmPost } from './client';
import type { Settings, OverviewParams } from '../types/settings';

export async function getSettings(): Promise<Settings> {
  return elmGet<Settings>('settings');
}

export async function postMasterIntensity(level: number): Promise<void> {
  await elmPost(`settings?masterIntensity=${level}`);
}

export async function postMasterSpeed(speed: number): Promise<void> {
  await elmPost(`settings?masterSpeed=${speed}`);
}

/**
 * Post overview params to ELM group performer.
 * Maps to POST /elm/groups/{name}/performer
 */
export async function postOverviewParams(params: OverviewParams): Promise<void> {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;
  const qs = entries.map(([k, v]) => `${encodeURIComponent(k)}=${v}`).join('&');
  console.log('[overview] POST settings?' + qs);
  // TODO: wire to group performer endpoint once group selection is implemented
  // await elmPost(`groups/${groupId}/performer?${qs}`);
}
