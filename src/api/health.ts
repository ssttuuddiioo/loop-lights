/** API client for Advatek controller health monitoring */

export interface ControllerTemp {
  current: number;
  min: number;
  max: number;
}

export interface ControllerPixData {
  outFrmRate: number;
  inFrmRate: number;
  overrun: number;
  overrunDrop: number;
  forceSync: boolean;
  extSync: boolean;
}

export interface ControllerEthPort {
  linkUp: boolean;
  speed: number;
}

export interface ControllerUniverses {
  total: number;
  active: number;
  timedOut: number;
  source: string;
}

export interface ControllerStatus {
  color: string;
  level: 'healthy' | 'warning' | 'error' | 'offline';
  reason: string;
}

export interface ControllerDiag {
  errCnt: number;
  err: string;
}

export interface ControllerSummary {
  ip: string;
  label: string;
  model: string;
  firmware: string;
  nickname: string;
  status: ControllerStatus;
  lastSeen: string | null;
  error: string | null;
  temp: ControllerTemp | null;
  cpu: number | null;
  pixData: ControllerPixData | null;
  eth: { port1: ControllerEthPort; port2: ControllerEthPort } | null;
  universes: ControllerUniverses | null;
  diag: ControllerDiag | null;
}

export interface HealthResponse {
  overall: 'healthy' | 'warning' | 'error' | 'offline';
  pollInterval: number;
  controllerCount: number;
  respondingCount: number;
  lastPoll: string;
  controllers: ControllerSummary[];
}

export async function fetchControllerHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/health/controllers');
  if (!res.ok) throw new Error(`Health fetch failed: ${res.status}`);
  return res.json() as Promise<HealthResponse>;
}

export async function refreshControllerHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/health/controllers/refresh', { method: 'POST' });
  if (!res.ok) throw new Error(`Health refresh failed: ${res.status}`);
  return res.json() as Promise<HealthResponse>;
}
