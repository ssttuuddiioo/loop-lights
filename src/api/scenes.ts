export interface Scene {
  name: string;
  description: string;
  stages: Record<string, unknown>;
}

export interface TriggerInfo {
  type: 'clock' | 'astro' | 'manual';
  scene: string;
  enabled: boolean;
  priority: number;
  label?: string;
  icon?: string;
  color?: string;
}

export interface SceneStatus {
  activeScene: string | null;
  activeTrigger: string | null;
  manualOverrideActive: boolean;
  manualOverrideExpiresAt: string | null;
  scenes: string[];
  triggers: Record<string, TriggerInfo>;
}

export async function getScenes(): Promise<Record<string, Scene>> {
  const res = await fetch('/api/scenes');
  if (!res.ok) throw new Error(`GET /api/scenes failed: ${res.status}`);
  return res.json();
}

export async function getSceneStatus(): Promise<SceneStatus> {
  const res = await fetch('/api/scenes/status');
  if (!res.ok) throw new Error(`GET /api/scenes/status failed: ${res.status}`);
  return res.json();
}

export async function activateScene(sceneId: string): Promise<void> {
  await fetch(`/api/scenes/${sceneId}/activate`, { method: 'POST' });
}

export async function getTriggers(): Promise<Record<string, unknown>> {
  const res = await fetch('/api/triggers');
  if (!res.ok) throw new Error(`GET /api/triggers failed: ${res.status}`);
  return res.json();
}

export async function toggleTrigger(triggerId: string): Promise<{ success: boolean; enabled: boolean }> {
  const res = await fetch(`/api/triggers/${triggerId}/toggle`, { method: 'POST' });
  if (!res.ok) throw new Error(`POST toggle failed: ${res.status}`);
  return res.json();
}

export async function fireManualTrigger(triggerId: string): Promise<void> {
  await fetch(`/api/triggers/${triggerId}/fire`, { method: 'POST' });
}
