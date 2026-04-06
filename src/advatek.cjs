/**
 * Advatek PixLite Mk3 Controller Monitor
 *
 * Polls each controller every 30s via short-lived WebSocket connections.
 * Computes green/yellow/red/offline health status per device.
 * Exposes state through getAll() and getOne() for the /api/health/* endpoints.
 *
 * Environment:
 *   DIMLY_CONTROLLERS     - "ip:label,ip:label,..." (default: 2.0.0.21:T8-S Unit 1)
 *   DIMLY_POLL_INTERVAL   - ms between polls (default: 30000)
 *   DIMLY_CONNECT_TIMEOUT - ms before connection timeout (default: 5000)
 */

const WebSocket = require('ws');
const http = require('http');

class ControllerMonitor {
  /**
   * @param {Array<{ip: string, label: string}>} controllers
   * @param {{pollInterval?: number, connectTimeout?: number}} options
   */
  constructor(controllers, options = {}) {
    this.controllers = controllers;
    this.pollInterval = options.pollInterval || 30000;
    this.connectTimeout = options.connectTimeout || 5000;
    /** @type {Map<string, object>} ip -> cached state */
    this.state = new Map();
    this._timers = [];
    this._previousOverrun = new Map(); // ip -> { value, timestamp }
  }

  start() {
    this.controllers.forEach(c => this._poll(c));
    const timer = setInterval(() => {
      this.controllers.forEach(c => this._poll(c));
    }, this.pollInterval);
    this._timers.push(timer);
  }

  stop() {
    this._timers.forEach(t => clearInterval(t));
    this._timers = [];
  }

  async _poll(controller) {
    const { ip, label } = controller;
    try {
      const info = await this._fetchVer(ip);
      const stats = await this._wsStatisticRead(ip);
      const statistic = stats?.statistic || null;

      this.state.set(ip, {
        ip,
        label: info.result?.nickname || label || ip,
        model: info.result?.prodName || 'Unknown',
        firmware: info.result?.fwVer || 'Unknown',
        nickname: info.result?.nickname || label || ip,
        authRequired: info.result?.authReqd || false,
        stats: statistic,
        status: this._computeStatus(ip, statistic),
        lastSeen: new Date().toISOString(),
        error: null,
      });
    } catch (err) {
      const existing = this.state.get(ip) || {};
      this.state.set(ip, {
        ...existing,
        ip,
        label: label || existing.label || ip,
        status: { color: '#666666', level: 'offline', reason: err.message },
        lastSeen: existing.lastSeen || null,
        error: err.message,
      });
    }
  }

  /** GET http://<ip>/ver — quick reachability + device info */
  _fetchVer(ip) {
    return new Promise((resolve, reject) => {
      const req = http.get(
        `http://${ip}/ver`,
        { timeout: this.connectTimeout },
        (res) => {
          let data = '';
          res.on('data', chunk => (data += chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error('Invalid JSON from /ver'));
            }
          });
        },
      );
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
      req.on('error', e => reject(new Error(`HTTP error: ${e.message}`)));
    });
  }

  /** Open WS, send statisticRead, receive response, close */
  _wsStatisticRead(ip) {
    return new Promise((resolve, reject) => {
      const authToken =
        '47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU';
      const ws = new WebSocket(
        `ws://${ip}/v1.7?user=admin&auth=${authToken}`,
      );
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          ws.close();
          reject(new Error('WebSocket timeout'));
        }
      }, this.connectTimeout);

      ws.on('open', () => {
        ws.send(
          JSON.stringify({
            req: 'statisticRead',
            id: 1,
            params: { path: [''] },
          }),
        );
      });

      ws.on('message', data => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.resp === 'statisticRead' && msg.id === 1) {
            resolved = true;
            clearTimeout(timeout);
            ws.close();
            resolve(msg.result);
          }
        } catch {
          /* ignore non-JSON frames */
        }
      });

      ws.on('error', err => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error(`WebSocket error: ${err.message}`));
        }
      });

      ws.on('close', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error('WebSocket closed unexpectedly'));
        }
      });
    });
  }

  /**
   * Determine health status color for a controller.
   * Priority: offline > error/hot > warm/overrun/ethDown/timedOut > healthy
   */
  _computeStatus(ip, statistic) {
    if (!statistic) {
      return { color: '#666666', level: 'offline', reason: 'No data' };
    }

    const temp = statistic.dev?.temp?.current;
    const errCnt = statistic.diag?.errCnt;
    const errMsg = statistic.diag?.err;
    const linkUp = statistic.eth?.extp?.linkUp || [];
    const overrun = statistic.pixData?.overrun || 0;
    const priorities = statistic.inUni?.sACN?.priority || [];
    const timedOut = statistic.inUni?.sACN?.timedOut || [];

    // --- Red conditions ---
    if (errCnt > 0 || (errMsg && errMsg !== '')) {
      return {
        color: '#FF3333',
        level: 'error',
        reason: `Error: ${errMsg || 'errCnt=' + errCnt}`,
      };
    }
    if (temp >= 50) {
      return {
        color: '#FF3333',
        level: 'error',
        reason: `Critical temp: ${temp}°C`,
      };
    }

    // --- Yellow conditions ---
    if (temp >= 45) {
      return {
        color: '#FFAA00',
        level: 'warning',
        reason: `High temp: ${temp}°C`,
      };
    }

    // Overrun rate check (>1000 increase per poll AND >10/sec)
    const prev = this._previousOverrun.get(ip);
    const now = Date.now();
    if (prev) {
      const delta = overrun - prev.value;
      const elapsed = (now - prev.timestamp) / 1000;
      if (delta > 1000 && elapsed > 0 && delta / elapsed > 10) {
        this._previousOverrun.set(ip, { value: overrun, timestamp: now });
        return {
          color: '#FFAA00',
          level: 'warning',
          reason: `Overrun rate: ${Math.round(delta / elapsed)}/sec`,
        };
      }
    }
    this._previousOverrun.set(ip, { value: overrun, timestamp: now });

    if (linkUp.some(up => up === false)) {
      const downPorts = linkUp
        .map((up, i) => (up ? null : i + 1))
        .filter(Boolean);
      return {
        color: '#FFAA00',
        level: 'warning',
        reason: `Eth port(s) down: ${downPorts.join(', ')}`,
      };
    }

    // Active universes that timed out
    const activeTimedOut = priorities.reduce((acc, pri, i) => {
      if (pri > 0 && timedOut[i]) acc.push(i + 1);
      return acc;
    }, []);
    if (activeTimedOut.length > 0) {
      return {
        color: '#FFAA00',
        level: 'warning',
        reason: `Universe(s) timed out: ${activeTimedOut.join(', ')}`,
      };
    }

    // --- Green ---
    return { color: '#33CC66', level: 'healthy', reason: 'All systems nominal' };
  }

  /** Summary of all controllers for /api/health/controllers */
  getAll() {
    const controllers = Array.from(this.state.values());
    const levels = controllers.map(c => c.status?.level);
    let overall = 'healthy';
    if (levels.includes('offline')) overall = 'offline';
    else if (levels.includes('error')) overall = 'error';
    else if (levels.includes('warning')) overall = 'warning';

    return {
      overall,
      pollInterval: this.pollInterval,
      controllerCount: this.controllers.length,
      respondingCount: controllers.filter(c => c.status?.level !== 'offline')
        .length,
      lastPoll: new Date().toISOString(),
      controllers: controllers.map(c => ({
        ip: c.ip,
        label: c.label,
        model: c.model,
        firmware: c.firmware,
        nickname: c.nickname,
        status: c.status,
        lastSeen: c.lastSeen,
        error: c.error,
        temp: c.stats?.dev?.temp || null,
        cpu: c.stats?.dev?.cpu ?? null,
        pixData: c.stats?.pixData
          ? {
              outFrmRate: c.stats.pixData.outFrmRate,
              inFrmRate: c.stats.pixData.inFrmRate,
              overrun: c.stats.pixData.overrun,
              overrunDrop: c.stats.pixData.overrunDrop,
              forceSync: c.stats.pixData.forceSync,
              extSync: c.stats.pixData.extSync,
            }
          : null,
        eth: c.stats?.eth?.extp
          ? {
              port1: {
                linkUp: c.stats.eth.extp.linkUp[0],
                speed: c.stats.eth.extp.linkSpeed[0],
              },
              port2: {
                linkUp: c.stats.eth.extp.linkUp[1],
                speed: c.stats.eth.extp.linkSpeed[1],
              },
            }
          : null,
        universes: c.stats?.inUni?.sACN
          ? {
              total: c.stats.inUni.sACN.uniNum?.length || 0,
              active:
                c.stats.inUni.sACN.timedOut?.filter(t => !t).length || 0,
              timedOut:
                c.stats.inUni.sACN.timedOut?.filter(t => t).length || 0,
              source: c.stats.inUni.sACN.sourceName?.[0] || 'Unknown',
            }
          : null,
        diag: c.stats?.diag || null,
      })),
    };
  }

  /** Full detail for a single controller */
  getOne(ip) {
    const c = this.state.get(ip);
    if (!c) return null;
    return { ...c, stats: c.stats };
  }
}

module.exports = { ControllerMonitor };
