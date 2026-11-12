// Deterministic random numbers (the multiplayer course depends on them).
export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashInt(x) {
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return (x ^ (x >>> 16)) >>> 0;
}

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export class RNG {
  constructor(seed = 1) {
    this.seed = seed >>> 0;
    this._f = mulberry32(this.seed);
  }
  next() { return this._f(); }
  range(a, b) { return a + (b - a) * this._f(); }
  int(a, b) { return Math.floor(a + (b - a + 1) * this._f()); }
  chance(p) { return this._f() < p; }
  pick(arr) { return arr[Math.floor(this._f() * arr.length)]; }
  sign() { return this._f() < 0.5 ? -1 : 1; }
  /** Weighted pick: items = [[value, weight], ...] */
  weighted(items) {
    let total = 0;
    for (const it of items) total += it[1];
    let r = this._f() * total;
    for (const it of items) {
      r -= it[1];
      if (r <= 0) return it[0];
    }
    return items[items.length - 1][0];
  }
  fork(tag) { return new RNG(hashInt(this.seed ^ hashStr(String(tag)))); }
}

// Value noise ---------------------------------------------------------------
const h1 = (i, seed) => hashInt((i | 0) ^ Math.imul(seed | 0, 0x9e3779b1)) / 4294967295;
const h2 = (i, j, seed) => hashInt(((i | 0) * 73856093) ^ ((j | 0) * 19349663) ^ Math.imul(seed | 0, 0x9e3779b1)) / 4294967295;

/** 1D value noise in [-1, 1]. */
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return (h1(i, seed) * (1 - u) + h1(i + 1, seed) * u) * 2 - 1;
}
/** 2D value noise in [-1, 1]. */
export function noise2(x, y, seed = 0) {
  const i = Math.floor(x), j = Math.floor(y);
  const fx = x - i, fy = y - j;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = h2(i, j, seed), b = h2(i + 1, j, seed), c = h2(i, j + 1, seed), d = h2(i + 1, j + 1, seed);
  return (a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy) * 2 - 1;
}
export function fbm2(x, y, seed = 0, oct = 3) {
  let amp = 0.5, f = 1, s = 0, n = 0;
  for (let o = 0; o < oct; o++) {
    s += noise2(x * f, y * f, seed + o * 17) * amp;
    n += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return s / n;
}
export const rand2 = (i, j, seed = 0) => h2(i, j, seed);
