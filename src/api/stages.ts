import { elmGet, elmPost } from './client';
import type { StageInfo, StageLive } from '../types/stage';

interface StagesResponse {
  stages: StageInfo[];
}

export async function getStages(): Promise<StageInfo[]> {
  const data = await elmGet<StagesResponse>('stages?includeState=1');
  return data.stages || [];
}

export async function getStageLive(stageId: string | number): Promise<StageLive> {
  return elmGet<StageLive>(`stages/${encodeURIComponent(stageId)}/live`);
}

export async function postStageIntensity(stageId: string | number, intensity: number): Promise<void> {
  await elmPost(`stages/${encodeURIComponent(stageId)}/live?intensity=${intensity}`);
}

export async function postStageColor(stageId: string | number, r: number, g: number, b: number): Promise<void> {
  await elmPost(`stages/${encodeURIComponent(stageId)}/live?red=${r}&green=${g}&blue=${b}`);
}

export async function postStageMedia(stageId: string | number, mediaId: string | number): Promise<void> {
  const param = mediaId === '' || mediaId === 0 ? 0 : encodeURIComponent(mediaId);
  await elmPost(`stages/${encodeURIComponent(stageId)}/live?media=${param}`);
}
