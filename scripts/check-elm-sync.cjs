/**
 * ELM sync check — verify the app's available media/effects correlate with
 * what the loaded ELM project actually exposes.
 *
 * Run this ON THE MACHINE WHERE ELM IS RUNNING (the venue PC), e.g.:
 *   node scripts/check-elm-sync.cjs
 *   set ELM_HOST=localhost&& set ELM_PORT=8057&& node scripts/check-elm-sync.cjs
 *
 * It reads ELM's live API and reports, ASCII-only (safe for Windows console):
 *   1. The 12 Effects-tab presets -> which map to an ELM media slot, which are MISSING.
 *   2. Whether each matched slot exposes the 4 tuneable params the app drives.
 *   3. Every ELM media slot (so you see the full bin, incl. ramp1-7 etc).
 *   4. The stage list (the zone "mapping" the app reads live).
 *
 * Exits non-zero if any preset is missing, so it can gate a deploy if you want.
 */

const http = require('http');

const ELM_HOST = process.env.ELM_HOST || 'localhost';
const ELM_PORT = parseInt(process.env.ELM_PORT || '8057', 10);

// Mirrors PRESETS[].key in src/components/mixer/effects-tab.tsx
const APP_PRESETS = [
  'gradient ramp', 'plasma', 'color wash', 'strobe', 'pulse', 'rainbow',
  'checker', 'fire', 'scan', 'spiral', 'ripple', 'sparkle',
];

// Mirrors PARAM_MAP keys in effects-tab.tsx — the sliders the app drives.
const EXPECTED_PARAM_IDS = [
  'media-param-force', 'media-param-force-2', 'media-param-nb-items', 'media-param-speed',
];

// Mirrors findSlotForKey(): lowercase, strip non-alnum, equality-or-prefix.
const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
function findSlot(slots, key) {
  const k = norm(key);
  return slots.find((s) => {
    const n = norm(s.name);
    return n === k || n.startsWith(k);
  });
}

function getJson(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { hostname: ELM_HOST, port: ELM_PORT, path, timeout: 5000 },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error('HTTP ' + res.statusCode + ' for ' + path));
          }
          try { resolve(JSON.parse(body)); }
          catch (e) { reject(new Error('Bad JSON from ' + path + ': ' + e.message)); }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function line() { console.log('-'.repeat(64)); }

(async () => {
  console.log('ELM sync check  ->  http://' + ELM_HOST + ':' + ELM_PORT + '/elm');
  line();

  let slots, stages;
  try {
    const m = await getJson('/elm/media/slots?includeState=1');
    slots = (m && m.slots) || [];
  } catch (e) {
    console.error('FAILED to read media slots: ' + e.message);
    console.error('Is ELM running and is a project loaded? Is the port right?');
    process.exit(2);
  }
  try {
    const s = await getJson('/elm/stages?includeState=1');
    stages = (s && s.stages) || [];
  } catch (e) {
    console.error('WARN  could not read stages: ' + e.message);
    stages = [];
  }

  // 1 + 2: presets -> slots, and param coverage on matched slots
  console.log('EFFECTS-TAB PRESETS  (' + APP_PRESETS.length + ' expected)');
  line();
  const missing = [];
  const matchedSlotIds = new Set();
  for (const key of APP_PRESETS) {
    const slot = findSlot(slots, key);
    if (!slot) {
      missing.push(key);
      console.log('  MISSING   "' + key + '"  -> no ELM media slot');
      continue;
    }
    matchedSlotIds.add(String(slot.id));
    let paramNote = '';
    try {
      const p = await getJson('/elm/media/slots/' + encodeURIComponent(slot.id) + '/parameters');
      const ids = new Set(((p && p.parameters) || []).map((x) => x && x.name && x.name.id));
      const have = EXPECTED_PARAM_IDS.filter((id) => ids.has(id));
      const lack = EXPECTED_PARAM_IDS.filter((id) => !ids.has(id));
      paramNote = '  params ' + have.length + '/' + EXPECTED_PARAM_IDS.length +
        (lack.length ? '  (missing: ' + lack.join(', ') + ')' : '');
    } catch (e) {
      paramNote = '  params ?  (' + e.message + ')';
    }
    console.log('  OK        "' + key + '"  -> slot ' + slot.id + ' "' + slot.name + '"' + paramNote);
  }
  line();

  // 3: full ELM bin, flag the ones no preset claims
  console.log('FULL ELM MEDIA BIN  (' + slots.length + ' slots)');
  line();
  for (const s of slots) {
    const tag = matchedSlotIds.has(String(s.id)) ? '[preset] ' : '         ';
    console.log('  ' + tag + 'id ' + s.id + '  "' + s.name + '"');
  }
  line();

  // 4: stages / zone mapping
  console.log('STAGES / ZONE MAPPING  (' + stages.length + ' stages)');
  line();
  for (const st of stages) {
    const bits = ['id ' + st.id, '"' + (st.name != null ? st.name : '?') + '"'];
    if (st.media != null) bits.push('media=' + st.media);
    if (st.intensity != null) bits.push('intensity=' + st.intensity);
    console.log('  ' + bits.join('  '));
  }
  line();

  // Summary
  if (missing.length) {
    console.log('RESULT  ' + missing.length + ' preset(s) NOT in ELM: ' + missing.join(', '));
    console.log('Fix: import the matching .frag into the ELM project and name the');
    console.log('slot so it starts with the preset name, then save the project.');
    process.exit(1);
  } else {
    console.log('RESULT  All ' + APP_PRESETS.length + ' presets map to an ELM media slot. OK.');
  }
})();
