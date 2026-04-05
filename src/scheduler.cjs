/**
 * Scene Engine — lightweight scheduler that fires ELM HTTP commands
 * based on triggers (clock, astro, manual, weather).
 *
 * MVPs 1-4: scenes, clock triggers, astro triggers, manual overrides.
 */

const fs = require('fs');
const http = require('http');
const SunCalc = require('suncalc');

class SceneEngine {
  constructor(configPath, elmBaseUrl) {
    this.configPath = configPath;
    this.elmBaseUrl = elmBaseUrl;
    this.config = null;
    this.activeScene = null;
    this.activeTrigger = null;
    this.manualOverrideExpiry = null;
    this.MANUAL_OVERRIDE_TTL = 120 * 60_000; // 2 hours
    this.EVAL_INTERVAL = 30_000;
    this._stageGuids = null;
    this._stageGuidsTime = 0;
    this.todayAstroTimes = {};
  }

  start() {
    this.loadConfig();
    console.log(`  [scene-engine] Started with ${Object.keys(this.config.scenes).length} scenes, ${Object.keys(this.config.triggers).length} triggers`);

    // Astro computation
    this.computeAstroTimes();
    this.scheduleAstroRecompute();

    // Evaluation loop
    this.evalInterval = setInterval(() => this.evaluate(), this.EVAL_INTERVAL);
    this.evaluate();
  }

  stop() {
    clearInterval(this.evalInterval);
    clearTimeout(this.astroTimeout);
  }

  loadConfig() {
    const raw = fs.readFileSync(this.configPath, 'utf-8');
    // Strip JSON comments (// and /* */)
    const cleaned = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    this.config = JSON.parse(cleaned);
  }

  reloadConfig() {
    try {
      this.loadConfig();
      console.log(`  [scene-engine] Config reloaded`);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // --- Scene Activation ---

  async activateScene(sceneId, transitionDuration = 0) {
    const scene = this.config.scenes[sceneId];
    if (!scene) return { success: false, error: `Scene "${sceneId}" not found` };

    const stageGuids = await this.getStageGuids();
    if (stageGuids.length === 0) {
      console.error('  [scene-engine] No stages found — is ELM running?');
      return { success: false, error: 'No stages found' };
    }

    for (const guid of stageGuids) {
      const stageConfig = scene.stages[guid] || scene.stages['*'];
      if (!stageConfig) continue;

      const params = {};
      if (stageConfig.media !== undefined) params.media = stageConfig.media;
      if (stageConfig.intensity !== undefined) params.intensity = stageConfig.intensity;
      if (stageConfig.speed !== undefined) params.speed = stageConfig.speed;
      if (stageConfig.color) {
        if (stageConfig.color.red !== undefined) params.red = stageConfig.color.red;
        if (stageConfig.color.green !== undefined) params.green = stageConfig.color.green;
        if (stageConfig.color.blue !== undefined) params.blue = stageConfig.color.blue;
      }
      if (transitionDuration > 0) params.transition = transitionDuration;

      const qs = Object.entries(params)
        .map(([k, v]) => `${k}=${typeof v === 'number' ? v.toFixed(4) : v}`)
        .join('&');

      if (qs) {
        try {
          await this._elmPost(`/elm/stages/${guid}/live/?${qs}`);
        } catch (err) {
          console.error(`  [scene-engine] ELM error (${guid}):`, err.message);
        }
      }
    }

    this.activeScene = sceneId;
    console.log(`  [scene-engine] Activated "${sceneId}" (${transitionDuration}s crossfade)`);
    return { success: true, scene: sceneId };
  }

  // --- Stage Discovery ---

  async getStageGuids() {
    if (this._stageGuids && Date.now() - this._stageGuidsTime < 60_000) {
      return this._stageGuids;
    }
    try {
      const data = await this._elmGet('/elm/stages');
      const parsed = JSON.parse(data);
      this._stageGuids = parsed.map(s => s.guid || s.id || s.name);
      this._stageGuidsTime = Date.now();
      return this._stageGuids;
    } catch (err) {
      console.error('  [scene-engine] Stage list fetch failed:', err.message);
      return this._stageGuids || [];
    }
  }

  // --- Trigger Evaluation ---

  evaluate() {
    // Manual override blocks all automated triggers
    if (this.manualOverrideExpiry && Date.now() < this.manualOverrideExpiry) {
      return;
    } else if (this.manualOverrideExpiry) {
      console.log('  [scene-engine] Manual override expired');
      this.manualOverrideExpiry = null;
      this.activeTrigger = null;
    }

    const now = new Date();
    const candidates = [];

    for (const [id, trigger] of Object.entries(this.config.triggers || {})) {
      if (!trigger.enabled) continue;
      let fires = false;
      if (trigger.type === 'clock') fires = this.evalClockTrigger(trigger, now);
      if (trigger.type === 'astro') fires = this.evalAstroTrigger(trigger, now);
      if (fires) candidates.push({ id, ...trigger });
    }

    if (candidates.length === 0) return;
    candidates.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    const winner = candidates[0];

    if (this.activeTrigger !== winner.id) {
      console.log(`  [scene-engine] Trigger "${winner.id}" -> scene "${winner.scene}"`);
      this.activateScene(winner.scene, winner.transition?.duration || 0);
      this.activeTrigger = winner.id;
    }
  }

  evalClockTrigger(trigger, now) {
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const today = dayNames[now.getDay()];
    if (!trigger.schedule.days.includes(today)) return false;

    const [hours, minutes] = trigger.schedule.time.split(':').map(Number);
    const triggerTime = new Date(now);
    triggerTime.setHours(hours, minutes, 0, 0);

    const elapsed = now.getTime() - triggerTime.getTime();
    return elapsed >= 0 && elapsed < this.EVAL_INTERVAL * 2;
  }

  evalAstroTrigger(trigger, now) {
    const eventTime = this.todayAstroTimes[trigger.astro.event];
    if (!eventTime) return false;

    const offsetMs = (trigger.astro.offset || 0) * 60_000;
    const adjustedTime = eventTime + offsetMs;

    const elapsed = now.getTime() - adjustedTime;
    return elapsed >= 0 && elapsed < this.EVAL_INTERVAL * 2;
  }

  // --- Manual Override ---

  triggerManual(triggerId) {
    const trigger = this.config.triggers[triggerId];
    if (!trigger || trigger.type !== 'manual') {
      return { success: false, error: 'Invalid manual trigger' };
    }

    this.activateScene(trigger.scene, trigger.transition?.duration || 0);
    this.activeTrigger = triggerId;
    this.manualOverrideExpiry = Date.now() + this.MANUAL_OVERRIDE_TTL;

    return {
      success: true,
      scene: trigger.scene,
      overrideExpiresAt: new Date(this.manualOverrideExpiry).toISOString()
    };
  }

  clearManualOverride() {
    this.manualOverrideExpiry = null;
    this.activeTrigger = null;
    console.log('  [scene-engine] Manual override cleared');
    this.evaluate();
    return { success: true };
  }

  // --- Astro (suncalc) ---

  computeAstroTimes() {
    const { latitude, longitude } = this.config.venue;
    const times = SunCalc.getTimes(new Date(), latitude, longitude);
    this.todayAstroTimes = {};

    for (const [key, date] of Object.entries(times)) {
      if (date instanceof Date && !isNaN(date)) {
        this.todayAstroTimes[key] = date.getTime();
      }
    }

    console.log('  [scene-engine] Astro times:',
      'sunrise', new Date(this.todayAstroTimes.sunrise).toLocaleTimeString(),
      '| goldenHour', new Date(this.todayAstroTimes.goldenHour).toLocaleTimeString(),
      '| sunset', new Date(this.todayAstroTimes.sunset).toLocaleTimeString()
    );
  }

  scheduleAstroRecompute() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 10, 0);

    this.astroTimeout = setTimeout(() => {
      this.computeAstroTimes();
      this.scheduleAstroRecompute();
    }, midnight.getTime() - now.getTime());
  }

  // --- Status ---

  getStatus() {
    return {
      activeScene: this.activeScene,
      activeTrigger: this.activeTrigger,
      manualOverrideActive: !!(this.manualOverrideExpiry && Date.now() < this.manualOverrideExpiry),
      manualOverrideExpiresAt: this.manualOverrideExpiry
        ? new Date(this.manualOverrideExpiry).toISOString()
        : null,
      scenes: Object.keys(this.config.scenes),
      triggers: Object.fromEntries(
        Object.entries(this.config.triggers).map(([id, t]) => [id, {
          type: t.type,
          scene: t.scene,
          enabled: t.enabled,
          priority: t.priority,
          ...(t.manual ? { label: t.manual.label, icon: t.manual.icon, color: t.manual.color } : {})
        }])
      )
    };
  }

  getAstroTimes() {
    return {
      venue: this.config.venue,
      times: Object.fromEntries(
        Object.entries(this.todayAstroTimes)
          .map(([k, v]) => [k, new Date(v).toISOString()])
      )
    };
  }

  // --- HTTP helpers (Node built-in, no fetch needed in CJS) ---

  _elmGet(urlPath) {
    return new Promise((resolve, reject) => {
      const parsed = new URL(this.elmBaseUrl);
      http.get({
        hostname: parsed.hostname,
        port: parsed.port,
        path: urlPath,
        timeout: 5000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }

  _elmPost(urlPath) {
    return new Promise((resolve, reject) => {
      const parsed = new URL(this.elmBaseUrl);
      const req = http.request({
        hostname: parsed.hostname,
        port: parsed.port,
        path: urlPath,
        method: 'POST',
        timeout: 5000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.end();
    });
  }
}

module.exports = { SceneEngine };
