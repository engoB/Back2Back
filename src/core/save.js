// Local save (localStorage with an in-memory fallback): progress, wallet,
// settings and stats. Everything stays on the device.
const KEY = 'back2back.save.v1';

function defaults() {
  const lang = (typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().startsWith('fr')) ? 'fr' : 'en';
  return {
    v: 1,
    name: 'Rider-' + Math.floor(1000 + Math.random() * 9000),
    coins: 0,
    settings: { music: 0.7, sfx: 0.9, quality: 'auto', haptics: true, lang, shake: true, fps: false },
    owned: { riders: ['nova'], boards: ['mk1'] },
    rider: 'nova',
    board: 'mk1',
    upgrades: { fulgur: 0, magnet: 0, shield: 0, double: 0 },
    items: { headstart: 1, revive: 1 },
    story: { unlocked: 0, done: [], seen: {} },
    missions: { level: 1, slots: [], claimed: 0 },
    stats: {
      runs: 0, bestScore: 0, bestDist: 0, bestCombo: 0, flips: 0, totalDist: 0, coins: 0, grind: 0,
      timeJumps: 0, crashes: 0, playTime: 0, eras: [], races: 0, wins: 0, bestFlip: 0, smashes: 0, gaps: 0,
    },
    board10: [],
    tuto: { jump: false, flip: false, rail: false, done: false },
    daily: { last: '', streak: 0 },
    server: '',
  };
}

function merge(base, extra) {
  if (!extra || typeof extra !== 'object') return base;
  for (const k of Object.keys(extra)) {
    const v = extra[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) merge(base[k], v);
    else base[k] = v;
  }
  return base;
}

class SaveStore {
  constructor() {
    this.data = defaults();
    this.listeners = new Set();
    this._timer = 0;
    this.persistent = true;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) merge(this.data, JSON.parse(raw));
    } catch (e) {
      this.persistent = false;
    }
  }

  /** Persist soon (debounced) and notify listeners (wallet display...). */
  touch() {
    for (const fn of this.listeners) fn(this.data);
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.flush(), 250);
  }
  flush() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {
      this.persistent = false;
    }
  }
  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  reset() {
    const keep = { settings: this.data.settings, name: this.data.name };
    this.data = merge(defaults(), keep);
    this.touch();
  }

  // wallet ------------------------------------------------------------
  addCoins(n) {
    this.data.coins = Math.max(0, Math.round(this.data.coins + n));
    this.touch();
  }
  spend(n) {
    if (this.data.coins < n) return false;
    this.data.coins -= n;
    this.touch();
    return true;
  }

  /** Top-10 local leaderboard. Returns the rank (1-based) or 0. */
  record(entry) {
    const b = this.data.board10;
    b.push(entry);
    b.sort((a, c) => c.score - a.score);
    if (b.length > 10) b.length = 10;
    this.touch();
    return b.indexOf(entry) + 1;
  }
}

export const save = new SaveStore();
