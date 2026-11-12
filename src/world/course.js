// Deterministic procedural course: a 2D height profile plus gameplay items.
// The same seed + config always yields the same course (required for multiplayer).
import { RNG, noise1 } from '../core/rng.js';
import { clamp, lerp, DEG, smoothstep } from '../core/math.js';

export const DX = 0.5; // metres between height samples
export const X0 = -80; // world x of sample 0

/** Feature presets. `diff` is the difficulty range walked along `diffSpan` metres. */
export const COURSE_PRESETS = {
  endless: {
    length: Infinity, diff: [0, 1], diffSpan: 6500,
    portals: { first: 650, every: [900, 1200] },
    allow: { rocks: 1, gaps: 1, rails: 1, drops: 1, power: 1, kickers: 1, bumps: 1 },
  },
  race: {
    length: 1500, diff: [0.25, 0.6], diffSpan: 1500, end: 'finish',
    allow: { rocks: 1, gaps: 1, rails: 1, drops: 1, power: 0, kickers: 1, bumps: 1 },
  },
  menu: { length: Infinity, diff: [0, 0], diffSpan: 1, calm: true, allow: {} },
  stage: { length: Infinity, diff: [0, 0], diffSpan: 1, calm: true, flat: true, allow: {} },
};

const UNSAFE_AFTER_AIR = { rocks: 1, gap: 1, railgap: 1, steep: 1 };

export class Course {
  constructor(cfg = {}) {
    this.cfg = { ...COURSE_PRESETS.endless, ...cfg };
    this.cfg.allow = { ...(cfg.allow || this.cfg.allow) };
    this.seed = (this.cfg.seed ?? 1) >>> 0;
    this.rng = new RNG(this.seed);
    this.s1 = this.rng.int(1, 1e6);
    this.s2 = this.rng.int(1, 1e6);
    this.s3 = this.rng.int(1, 1e6);
    this.ys = []; // surface height per sample (NaN inside chasms)
    this.base = []; // smooth baseline (never NaN)
    this.n = 0;
    this.genX = X0; // x of the next sample to generate
    this.baseY = 0;
    this.bias = 0; // current slope bias in degrees
    this.items = []; // sorted by x
    this.rails = []; // sorted by x1
    this.gaps = []; // {x1, x2}
    this.length = this.cfg.length;
    this.endPlaced = false;
    this.nextPortalX = this.cfg.portals ? this.cfg.portals.first : Infinity;
    this.lastBlock = '';
    this.blockCount = 0;
    this.tutorialStep = this.cfg.tutorial ? 0 : -1;
    // Starting plateau behind the rider and a gentle launch slope.
    this._advance(-X0 + 46, null, 0);
    this.ensure(160);
  }

  // ---- queries -----------------------------------------------------------
  diffAt(x) {
    const [a, b] = this.cfg.diff;
    return lerp(a, b, clamp(x / this.cfg.diffSpan, 0, 1));
  }

  ensure(xMax) {
    if (this._busy) return;
    this._busy = true;
    let guard = 0;
    while (this.genX < xMax + 60 && guard++ < 400) this._nextBlock();
    this._busy = false;
  }

  // Internal lookups that never trigger generation (safe inside block builders).
  _h(x) {
    const f = (x - X0) / DX;
    const i = Math.floor(f);
    if (i < 0) return this.ys[0];
    if (i >= this.n - 1) {
      const v = this.ys[this.n - 1];
      return v !== v ? null : v;
    }
    const a = this.ys[i], b = this.ys[i + 1];
    if (a !== a || b !== b) return null;
    return a + (b - a) * (f - i);
  }
  _solid(x) {
    const h = this._h(x);
    if (h !== null) return h;
    const i = clamp(Math.round((x - X0) / DX), 0, this.n - 1);
    return this.base[i];
  }

  /** Surface height at x, or null over a chasm. */
  heightAt(x) {
    const f = (x - X0) / DX;
    let i = Math.floor(f);
    if (i < 0) return this.ys[0];
    if (i >= this.n - 2) this.ensure(x + 40);
    const a = this.ys[i], b = this.ys[i + 1];
    if (a !== a || b !== b) return null;
    return a + (b - a) * (f - i);
  }

  /** Smooth baseline (defined everywhere, ignores bumps and chasms). */
  baseAt(x) {
    const f = (x - X0) / DX;
    let i = Math.floor(f);
    if (i < 0) return this.base[0];
    if (i >= this.n - 2) this.ensure(x + 40);
    return this.base[i] + (this.base[i + 1] - this.base[i]) * (f - i);
  }

  /** Height, falling back to the baseline over chasms (for cameras, scenery). */
  solidAt(x) {
    const h = this.heightAt(x);
    return h === null ? this.baseAt(x) : h;
  }

  /** Very smooth descent trend used to anchor the scenery. */
  trendAt(x) {
    const S = 48;
    const k = Math.floor(x / S), t = x / S - k;
    const a = this.baseAt(k * S), b = this.baseAt((k + 1) * S);
    const p = this.baseAt((k - 1) * S), q = this.baseAt((k + 2) * S);
    // Catmull-Rom through coarse anchors
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * (2 * a + (b - p) * t + (2 * p - 5 * a + 4 * b - q) * t2 + (3 * a - p - 3 * b + q) * t3);
  }

  /** Terrain tangent angle (radians, negative when going downhill). */
  slopeAt(x, span = 0.6) {
    let a = this.heightAt(x - span), b = this.heightAt(x + span);
    const c = this.heightAt(x);
    if (c === null) return 0;
    if (a === null && b === null) return 0;
    if (a === null) return Math.atan2(b - c, span);
    if (b === null) return Math.atan2(c - a, span);
    return Math.atan2(b - a, span * 2);
  }

  /** Convex curvature (rad/m, positive when the ground falls away). */
  curvatureAt(x) {
    return (this.slopeAt(x - 0.7) - this.slopeAt(x + 0.7)) / 1.4;
  }

  isGap(x) {
    const i = Math.floor((x - X0) / DX);
    if (i < 0 || i >= this.n - 1) return false;
    const a = this.ys[i], b = this.ys[i + 1];
    return a !== a || b !== b;
  }

  /** Index of the first item with x >= value (binary search). */
  itemIndex(x) {
    let lo = 0, hi = this.items.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (this.items[m].x < x) lo = m + 1;
      else hi = m;
    }
    return lo;
  }

  // ---- low level generation ---------------------------------------------
  _slopeDeg(x) {
    if (this.cfg.flat) return 1.5 + 1.2 * noise1(x / 60, this.s1);
    const d = this.diffAt(Math.max(0, x));
    let a = 10.5 + 2.5 * d + 8.5 * noise1(x / 120, this.s1) + 6 * noise1(x / 41, this.s2) + 2 * noise1(x / 13, this.s3);
    if (this.cfg.calm) a = 7 + 5 * noise1(x / 120, this.s1) + 3 * noise1(x / 41, this.s2);
    if (x < 40) a = lerp(2, a, smoothstep(-30, 40, x));
    return a;
  }

  /** Append `len` metres of ground. bump(u) adds a local profile, bias tilts the slope. */
  _advance(len, bump = null, biasDeg = 0) {
    const n = Math.max(1, Math.round(len / DX));
    const startX = this.genX;
    for (let k = 0; k < n; k++) {
      const x = this.genX;
      this.bias += clamp(biasDeg - this.bias, -1.4, 1.4);
      const a = clamp(this._slopeDeg(x) + this.bias, -7, 31) * DEG;
      this.baseY -= Math.tan(a) * DX;
      const u = x - startX + DX;
      this.ys.push(this.baseY + (bump ? bump(u) : 0));
      this.base.push(this.baseY);
      this.n++;
      this.genX += DX;
    }
    return startX;
  }

  _gap(width, drop) {
    const n = Math.max(2, Math.round(width / DX));
    const x1 = this.genX - DX;
    for (let k = 0; k < n; k++) {
      const a = clamp(this._slopeDeg(this.genX), 0, 20) * DEG;
      this.baseY -= Math.tan(a) * DX + drop / n;
      this.ys.push(NaN);
      this.base.push(this.baseY);
      this.n++;
      this.genX += DX;
    }
    this.gaps.push({ x1, x2: this.genX });
    return { x1, x2: this.genX };
  }

  _cliff(h) {
    this.baseY -= h;
  }

  _add(items) {
    items.sort((a, b) => a.x - b.x);
    const arr = this.items;
    for (const it of items) {
      it.id = this.nextId = (this.nextId || 0) + 1;
      let k = arr.length;
      arr.push(it);
      while (k > 0 && arr[k - 1].x > it.x) {
        arr[k] = arr[k - 1];
        k--;
      }
      arr[k] = it;
    }
  }

  _coinsGround(out, x1, x2, step = 1.7, lift = 0.95, wave = 0) {
    for (let x = x1; x <= x2; x += step) {
      const h = this._h(x);
      if (h === null) continue;
      out.push({ type: 'coin', x, y: h + lift + (wave ? Math.sin((x - x1) * 0.9) * wave + wave : 0) });
    }
  }

  _coinsArc(out, xa, ya, xb, yb, apex, n = 7) {
    for (let k = 0; k < n; k++) {
      const u = n === 1 ? 0.5 : k / (n - 1);
      out.push({ type: 'coin', x: lerp(xa, xb, u), y: lerp(ya, yb, u) + 4 * apex * u * (1 - u) });
    }
  }

  _rock(out, x, size, extra = {}) {
    const h = this._h(x);
    if (h === null) return;
    out.push({ type: 'rock', x, y: h, size, variant: this.rng.int(0, 3), ...extra });
  }

  _rail(x1, x2, h1, h2) {
    let y1 = this._solid(x1) + h1, y2 = this._solid(x2) + h2;
    // keep a minimum clearance above the ground along the rail
    let deficit = 0;
    for (let x = x1; x <= x2; x += 1) {
      const g = this._h(x);
      if (g === null) continue;
      const ry = lerp(y1, y2, (x - x1) / (x2 - x1));
      deficit = Math.max(deficit, g + 0.9 - ry);
    }
    y1 += deficit;
    y2 += deficit;
    const rail = { type: 'rail', x: x1, x1, y1, x2, y2, id: -1, index: this.rails.length };
    this.rails.push(rail);
    return rail;
  }

  // ---- blocks ------------------------------------------------------------
  _nextBlock() {
    const rng = this.rng;
    const cfg = this.cfg;
    const d = this.diffAt(this.genX);
    this.blockCount++;

    if (cfg.calm) {
      this._advance(60);
      return;
    }
    if (Number.isFinite(this.length) && !this.endPlaced && this.genX >= this.length - 70) {
      this._endBlock();
      return;
    }
    if (this.endPlaced) {
      this._advance(80, null, -6);
      return;
    }
    if (this.tutorialStep >= 0) {
      this._tutorialBlock();
      return;
    }
    if (this.genX >= this.nextPortalX) {
      this._portalBlock();
      const [a, b] = cfg.portals.every;
      this.nextPortalX = this.genX + rng.range(a, b);
      return;
    }
    const al = cfg.allow;
    const w = [
      ['cruise', 3 - 2 * d],
      ['rocks', al.rocks ? 2.6 + 2.4 * d : 0],
      ['kicker', al.kickers ? 2 : 0],
      ['gap', al.gaps ? 0.6 + 2.6 * d : 0],
      ['rail', al.rails ? 1.6 + d : 0],
      ['railgap', al.rails && al.gaps && d > 0.2 ? 1.4 * d : 0],
      ['drop', al.drops ? 1 + d : 0],
      ['steep', 1],
      ['bumps', al.bumps ? 1 : 0],
      ['power', al.power && this.blockCount > 4 ? 0.9 : 0],
    ].filter((e) => e[1] > 0 && e[0] !== this.lastBlock && !(this.safeNext && UNSAFE_AFTER_AIR[e[0]]));
    const pick = rng.weighted(w);
    this.lastBlock = pick;
    // after a big-air feature the next block must be a clean landing strip
    this.safeNext = pick === 'kicker' || pick === 'drop';
    this['_b_' + pick](d);
    this._advance(rng.range(7, 15) * (1.25 - 0.65 * d));
  }

  _tutorialBlock() {
    const step = this.tutorialStep++;
    const out = [];
    if (step === 0) {
      const s = this._advance(50, null, 1);
      this._coinsGround(out, s + 14, s + 40);
    } else if (step === 1) {
      const s = this._advance(46, null, 0);
      this._rock(out, s + 24, 0, { tut: 'jump' });
      this._coinsArc(out, s + 19, this._h(s + 19) + 1, s + 29, this._h(s + 29) + 1, 1.6, 5);
    } else if (step === 2) {
      const s = this._advance(44, null, 1);
      this._rock(out, s + 26, 0);
      this._coinsGround(out, s + 4, s + 16);
    } else if (step === 3) {
      this._b_kicker(0, out, 'flip');
    } else if (step === 4) {
      this._advance(30);
      this._b_kicker(0, out);
    } else if (step === 5) {
      this._b_rail(0, out, 'rail');
    } else {
      this.tutorialStep = -1;
      this._advance(20);
    }
    this._add(out);
  }

  _b_cruise(d) {
    const rng = this.rng, out = [];
    const len = rng.range(26, 46);
    const s = this._advance(len);
    if (rng.chance(0.7)) this._coinsGround(out, s + 4, s + len - 6, 1.7, 0.95, rng.chance(0.4) ? 0.5 : 0);
    this._add(out);
  }

  _b_steep(d) {
    const rng = this.rng, out = [];
    const len = rng.range(40, 60);
    const s = this._advance(len, null, 9);
    this._coinsGround(out, s + 6, s + len - 10, 2.1);
    if (this.cfg.allow.rocks && d > 0.3 && rng.chance(0.6)) this._rock(out, s + len * 0.72, 0);
    this._advance(12, null, 0);
    this._add(out);
  }

  _b_rocks(d) {
    const rng = this.rng, out = [];
    const count = rng.int(1, d > 0.5 ? 3 : 2);
    // spacing longer than a full-speed jump so two rocks never trap a rider
    const gap = rng.range(30, 38) + 8 * d;
    const s = this._advance(14 + (count - 1) * gap + 10, null, 2);
    for (let k = 0; k < count; k++) {
      const x = s + 14 + k * gap;
      const size = d > 0.35 && rng.chance(0.2 + 0.3 * d) ? 1 : 0;
      this._rock(out, x, size);
      // tight pair: one well-timed jump clears both
      if (size === 0 && d > 0.3 && rng.chance(0.3 * d)) this._rock(out, x + 2.1, 0);
      if (rng.chance(0.75)) {
        const ya = this._h(x - 5), yb = this._h(x + 6);
        if (ya !== null && yb !== null) this._coinsArc(out, x - 5, ya + 1, x + 6, yb + 1, 1.7 + size * 0.4, 5);
      }
    }
    this._add(out);
  }

  _b_kicker(d, ext = null, tut = null) {
    const rng = this.rng, out = ext || [];
    const L = rng.range(6, 8), h = rng.range(1.5, 2.4);
    this._advance(12, null, -2);
    const s = this._advance(L, (u) => h * (u / L) * (u / L), -2);
    const lipX = s + L - DX, lipY = this.ys[this.n - 1];
    if (tut) out.push({ type: 'hint', x: s - 11, y: 0, tut });
    const land = this._advance(42, null, 6);
    const xb = land + 18 + 6 * d;
    this._coinsArc(out, lipX + 1, lipY + 1.2, xb, this._solid(xb) + 1.2, 3.2, 8);
    if (!ext) this._add(out);
  }

  _b_gap(d) {
    const rng = this.rng, out = [];
    const L = rng.range(6, 7.5), h = rng.range(1.3, 1.9);
    this._advance(14, null, -1);
    const s = this._advance(L, (u) => h * (u / L) * (u / L), -1);
    const lipX = s + L - DX, lipY = this.ys[this.n - 1];
    const W = 4.5 + 5 * d + rng.range(0, 1.5);
    const g = this._gap(W, rng.range(1.2, 2.4));
    const land = this._advance(38, null, 6);
    const xb = g.x2 + 6;
    this._coinsArc(out, lipX + 1, lipY + 1.3, xb, this._solid(xb) + 1.1, 2.6, 7);
    this._add(out);
  }

  _b_rail(d, ext = null, tut = null) {
    const rng = this.rng, out = ext || [];
    const len = rng.range(18, 34) + 8 * d;
    this._advance(8, null, 0);
    const L = 5, h = rng.range(0.9, 1.3);
    const s = this._advance(L, (u) => h * (u / L) * (u / L), 0);
    if (tut) out.push({ type: 'hint', x: s - 7, y: 0, tut });
    const start = this._advance(len + 6, null, 3);
    const x1 = start + 2.5, x2 = x1 + len;
    const rail = this._rail(x1, x2, rng.range(1.25, 1.6), rng.range(1.0, 1.4));
    for (let x = x1 + 2; x < x2 - 1; x += 2.2) {
      out.push({ type: 'coin', x, y: lerp(rail.y1, rail.y2, (x - x1) / (x2 - x1)) + 1.05 });
    }
    this._advance(22, null, 5);
    if (!ext) this._add(out);
  }

  _b_railgap(d) {
    const rng = this.rng, out = [];
    this._advance(10, null, 0);
    const L = 6, h = rng.range(1.2, 1.6);
    const s = this._advance(L, (u) => h * (u / L) * (u / L), 0);
    const lipX = s + L - DX, lipY = this.ys[this.n - 1];
    const W = 7 + 5 * d + rng.range(0, 2);
    const g = this._gap(W, rng.range(1.5, 2.5));
    this._advance(30, null, 5);
    const x1 = lipX + 2.2, x2 = g.x2 + rng.range(4, 9);
    const y1 = lipY + 0.9;
    const y2 = this._solid(x2) + 1.1;
    const rail = { type: 'rail', x: x1, x1, y1, x2, y2: Math.min(y2, y1 - 0.4), id: -1, index: this.rails.length };
    this.rails.push(rail);
    for (let x = x1 + 2; x < x2 - 1; x += 2.2) {
      out.push({ type: 'coin', x, y: lerp(rail.y1, rail.y2, (x - x1) / (x2 - x1)) + 1.05 });
    }
    this._add(out);
  }

  _b_drop(d) {
    const rng = this.rng, out = [];
    const s = this._advance(14, null, -4);
    const lipX = this.genX - DX, lipY = this.ys[this.n - 1];
    const H = rng.range(3.5, 6.5) + 2 * d;
    this._cliff(H);
    const land = this._advance(46, null, 8);
    const xb = land + 14 + 6 * d;
    this._coinsArc(out, lipX + 1.5, lipY + 0.9, xb, this._solid(xb) + 1.2, 1.2, 8);
    this._add(out);
  }

  _b_bumps(d) {
    const rng = this.rng, out = [];
    const count = rng.int(2, 4), L = rng.range(7, 9), h = rng.range(0.7, 1.05);
    this._advance(8);
    const s = this._advance(count * L, (u) => {
      const v = Math.sin((Math.PI * u) / L);
      return h * v * v;
    }, -1);
    for (let k = 0; k < count; k++) {
      const x = s + (k + 0.5) * L;
      const g = this._h(x);
      if (g !== null) out.push({ type: 'coin', x, y: g + 1.3 });
    }
    this._add(out);
  }

  _b_power(d) {
    const rng = this.rng, out = [];
    const s = this._advance(30);
    const x = s + 16;
    const kind = rng.weighted([['magnet', 3], ['shield', 2.5], ['double', 2], ['charge', 2]]);
    out.push({ type: 'power', kind, x, y: this._solid(x) + 1.5 });
    this._coinsGround(out, s + 3, s + 11);
    this._add(out);
  }

  _portalBlock() {
    const out = [];
    const s = this._advance(34, null, -4);
    this._coinsGround(out, s + 6, s + 30, 2);
    const L = 6, h = 1.3;
    const k = this._advance(L, (u) => h * (u / L) * (u / L), -3);
    const x = k + L + 3;
    this._advance(46, null, 6);
    out.push({ type: 'portal', x, y: this._solid(x) });
    this._add(out);
  }

  _endBlock() {
    const out = [];
    this.endPlaced = true;
    const s = this._advance(Math.max(20, this.length - this.genX), null, -5);
    this._advance(120, null, -7);
    this._coinsGround(out, s + 4, this.length - 6, 2);
    const type = this.cfg.end || 'cog';
    out.push({ type, x: this.length, y: this._solid(this.length) });
    this._add(out);
  }
}
