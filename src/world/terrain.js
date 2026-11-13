// Geometry builders for the silhouette world: the track (a smooth curve filled
// with a soft gradient) and the ridge layers that stack up behind it, from the
// nearest hills to the far parallax skylines. Everything is flat and unlit.
import * as THREE from 'three';
import { DX, X0 } from './course.js';
import { noise1, rand2 } from '../core/rng.js';
import { clamp, smoothstep } from '../core/math.js';
import { MAT } from './meshkit.js';

/** Height of the track surface at x (falls back to the baseline over chasms). */
export function topY(course, x) {
  const f = (x - X0) / DX;
  const i = clamp(Math.floor(f), 0, course.n - 2);
  const t = clamp(f - i, 0, 1);
  let a = course.ys[i], b = course.ys[i + 1];
  if (a !== a) a = course.base[i];
  if (b !== b) b = course.base[i + 1];
  return a + (b - a) * t;
}

const C = (hex) => new THREE.Color(hex);

// --------------------------------------------------------------------------
// Track chunk: gradient-filled silhouette with a bright rim
// --------------------------------------------------------------------------
const BANDS = [0, 0.2, 1.3, 5.5, 18, 55, 170];

export function buildTerrainChunk(course, era, xStart, xEnd) {
  course.ensure(xEnd + 8);
  const T = era.terrain;
  // colours at each band stop: rim, then the five fill tones (last one repeated)
  const cols = [C(T.edge), C(T.fill[0]), C(T.fill[1]), C(T.fill[2]), C(T.fill[3]), C(T.fill[4]), C(T.fill[4])];
  const pos = [], col = [];
  const lines = T.grid !== undefined ? [] : null;
  const i0 = Math.round((xStart - X0) / DX), i1 = Math.round((xEnd - X0) / DX);
  const ys = course.ys;
  const v = (x, y, c) => {
    pos.push(x, y, 0);
    col.push(c.r, c.g, c.b);
  };
  for (let i = i0; i < i1; i++) {
    const A = ys[i], B = ys[i + 1];
    if (A !== A || B !== B) continue;
    const xa = X0 + i * DX, xb = xa + DX;
    for (let j = 0; j < BANDS.length - 1; j++) {
      const d0 = BANDS[j], d1 = BANDS[j + 1], c0 = cols[j], c1 = cols[j + 1];
      v(xa, A - d1, c1); v(xb, B - d1, c1); v(xb, B - d0, c0);
      v(xa, A - d1, c1); v(xb, B - d0, c0); v(xa, A - d0, c0);
    }
    if (lines) {
      for (const d of [1.1, 3, 6.5, 13]) lines.push(xa, A - d, 0.03, xb, B - d, 0.03);
      if (i % 8 === 0) lines.push(xa, A - 0.05, 0.03, xa, A - 13, 0.03);
    }
  }
  const group = new THREE.Group();
  if (pos.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const mesh = new THREE.Mesh(g, MAT.lit);
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  if (lines && lines.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    const m = new THREE.LineSegments(g, gridMaterial(T.grid, T.gridAlpha ?? 0.5));
    m.frustumCulled = false;
    group.add(m);
  }
  return group;
}

const gridMats = new Map();
function gridMaterial(color, opacity) {
  const key = color + '|' + opacity;
  if (!gridMats.has(key)) {
    gridMats.set(key, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, fog: false }));
  }
  return gridMats.get(key);
}

// --------------------------------------------------------------------------
// Ridge profiles
// --------------------------------------------------------------------------
const ridge = (u, f, s) => 1 - Math.abs(noise1(u / f, s));
const PROFILE = {
  /** Soft rolling hills, value in [-1, 1]. */
  roll: (u, s, w = 90) => noise1(u / w, s) * 0.72 + noise1(u / (w * 0.37), s + 7) * 0.28,
  alpine: (u, s) => clamp(Math.pow(ridge(u, 190, s), 1.7) * 0.74 + ridge(u, 57, s + 1) * 0.2 + noise1(u / 19, s + 2) * 0.05, 0.03, 1),
  hills: (u, s) => clamp(0.5 + 0.34 * noise1(u / 280, s) + 0.13 * noise1(u / 95, s + 1), 0.05, 1),
  jungle: (u, s) => clamp(0.42 + 0.26 * noise1(u / 210, s) + 0.1 * noise1(u / 60, s + 1) + 0.09 * Math.abs(noise1(u / 9, s + 2))
    + 0.05 * Math.abs(Math.sin(u / 5.3)), 0.05, 1),
  volcano: (u, s) => {
    const P = 1500;
    const k = Math.round(u / P);
    const c = k * P + (rand2(k, 3, s) - 0.5) * 500;
    const d = Math.abs(u - c);
    let v = Math.pow(Math.max(0, 1 - d / 340), 1.25);
    if (d < 30) v = Math.min(v, 0.89 - 0.05 * (1 - d / 30));
    const base = 0.22 + 0.1 * noise1(u / 200, s) + 0.04 * noise1(u / 50, s + 1);
    return Math.max(base, v * 0.98);
  },
  mesa: (u, s) => {
    const t = noise1(u / 260, s) * 0.5 + 0.5;
    let v = 0.16 + smoothstep(0.42, 0.46, t) * 0.3 + smoothstep(0.6, 0.63, t) * 0.3;
    const b = noise1(u / 43, s + 5);
    if (b > 0.5) v += smoothstep(0.5, 0.56, b) * 0.2;
    return clamp(v + noise1(u / 15, s + 7) * 0.015, 0, 1);
  },
};

function blockPoints(kind, u0, u1, seed, H) {
  const pts = [];
  const BW = kind === 'town' ? 24 : kind === 'spires' ? 36 : 28;
  const b0 = Math.ceil(u0 / BW - 1e-6), b1 = Math.ceil(u1 / BW - 1e-6);
  const baseOf = (x) => (kind === 'town' ? 0.3 + 0.16 * noise1(x / 220, seed) : 0.1);
  for (let b = b0; b < b1; b++) {
    const x = b * BW;
    const r1 = rand2(b, 1, seed), r2 = rand2(b, 2, seed), r3 = rand2(b, 3, seed);
    const bh = baseOf(x), bh2 = baseOf(x + BW);
    if (kind === 'skyline') {
      const w = BW * (0.55 + 0.4 * r2), h = 0.22 + 0.78 * r1 * r1;
      const xa = x + (BW - w) / 2, xb = xa + w;
      pts.push(x, bh, xa, bh, xa, h);
      if (r3 > 0.55) {
        const sw = w * 0.22;
        pts.push(xa + sw, h, xa + sw, h + 0.09);
        if (r3 > 0.82) {
          const xm = (xa + xb) / 2;
          pts.push(xm - 0.5, h + 0.09, xm - 0.5, h + 0.28, xm + 0.5, h + 0.28, xm + 0.5, h + 0.09);
        }
        pts.push(xb - sw, h + 0.09, xb - sw, h);
      }
      pts.push(xb, h, xb, bh);
    } else if (kind === 'spires') {
      if (r3 < 0.22) {
        const w = BW * 0.84, xa = x + (BW - w) / 2;
        pts.push(x, bh, xa, bh);
        for (let k = 0; k <= 10; k++) {
          const a = (Math.PI * k) / 10;
          pts.push(xa + w * (0.5 - 0.5 * Math.cos(a)), bh + (0.14 + 0.1 * r1) * Math.sin(a));
        }
      } else {
        const w = BW * (0.2 + 0.25 * r2), h = 0.3 + 0.7 * r1, xm = x + BW / 2;
        pts.push(x, bh, xm - w / 2, bh, xm - w * 0.42, h * 0.8, xm - w * 0.18, h * 0.96);
        if (r3 > 0.7) pts.push(xm - 0.4, h, xm, h + 0.14, xm + 0.4, h);
        pts.push(xm + w * 0.18, h * 0.96, xm + w * 0.42, h * 0.8, xm + w / 2, bh);
      }
    } else {
      // town: little houses, a steeple from time to time, round trees
      if (r1 > 0.42) {
        const w = 10 + 7 * r2, xa = x + (BW - w) * r3, h = bh + 0.16 + 0.2 * r2;
        pts.push(x, bh, xa, bh, xa, h);
        if (r3 > 0.86) pts.push(xa + w * 0.3, h + 0.08, xa + w * 0.3, h + 0.3, xa + w * 0.5, h + 0.55, xa + w * 0.7, h + 0.3, xa + w * 0.7, h + 0.08);
        else pts.push(xa + w / 2, h + 0.14);
        pts.push(xa + w, h, xa + w, bh);
      } else {
        const xm = x + BW * (0.3 + 0.4 * r2), R = 5 + 4 * r3;
        pts.push(x, bh, xm - R, bh);
        for (let k = 1; k < 8; k++) {
          const a = (Math.PI * k) / 8;
          pts.push(xm - R * Math.cos(a), bh + ((R * 1.5) / H) * Math.sin(a));
        }
        pts.push(xm + R, bh);
      }
    }
    pts.push(x + BW, bh2);
  }
  return pts;
}

/** Normalised profile points [u, v, u, v, ...] of a layer between u0 and u1. */
function profilePoints(def, u0, u1, seed) {
  if (PROFILE[def.style]) {
    const fn = PROFILE[def.style], pts = [];
    const n = Math.max(2, Math.round((u1 - u0) / (def.step || 4)));
    for (let k = 0; k <= n; k++) {
      const u = u0 + ((u1 - u0) * k) / n;
      pts.push(u, fn(u, seed, def.wave));
    }
    return pts;
  }
  return blockPoints(def.style, u0, u1, seed, def.amp ?? def.H);
}

/** Smooth-profile height of a world ridge at x (used to stand scenery on it). */
export function ridgeY(def, course, x, seed) {
  const fn = PROFILE[def.style];
  const v = fn ? fn(x, seed, def.wave) : 0.1;
  return course.trendAt(x) + def.base + def.amp * v;
}

function stripGeometry(pos, rid) {
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aRidge', new THREE.Float32BufferAttribute(rid, 1));
  return g;
}

function islands(def, u0, u1, seed, H, yOf, pos, rid) {
  const P = 240;
  for (let k = Math.ceil(u0 / P - 1e-6); k * P < u1 - 1e-6; k++) {
    const r1 = rand2(k, 1, seed), r2 = rand2(k, 2, seed), r3 = rand2(k, 3, seed), r4 = rand2(k, 4, seed), r5 = rand2(k, 5, seed);
    if (r1 < 0.18) continue;
    const cu = k * P + r2 * P * 0.6, w = 50 + 150 * r3, top = yOf(cu) + H * (0.1 + 0.85 * r4), depth = w * (0.35 + 0.35 * r5);
    const n = 18;
    let prev = null;
    for (let q = 0; q <= n; q++) {
      const f = q / n, u = cu - w / 2 + w * f;
      let ty = top + noise1(u / 12, seed) * H * 0.015;
      const tower = noise1(u / 6, seed + 9);
      if (tower > 0.55 && f > 0.15 && f < 0.85) ty += H * 0.06 * (tower - 0.55) * 4;
      const by = top - depth * Math.pow(Math.sin(Math.PI * f), 0.8) * (0.75 + 0.25 * noise1(u / 8, seed + 3)) - 1.5;
      const cur = [u, ty, by];
      if (prev) {
        pos.push(prev[0], prev[2], 0, cur[0], cur[2], 0, cur[0], cur[1], 0, prev[0], prev[2], 0, cur[0], cur[1], 0, prev[0], prev[1], 0);
        rid.push(prev[1], cur[1], cur[1], prev[1], cur[1], prev[1]);
      }
      prev = cur;
    }
  }
}

/**
 * One chunk of a world-attached ridge: its crest follows the descent of the
 * course (trend) with its own relief. Absolute world coordinates.
 */
export function buildRidgeChunk(def, course, x0, W, seed) {
  course.ensure(x0 + W + 60);
  const pos = [], rid = [];
  const DEPTH = 420;
  const yOf = (u) => course.trendAt(u) + def.base;
  if (def.style === 'islands') islands(def, x0, x0 + W, seed, def.amp, yOf, pos, rid);
  else {
    const pts = profilePoints(def, x0, x0 + W, seed);
    for (let k = 0; k + 3 < pts.length; k += 2) {
      const ua = pts[k], ub = pts[k + 2];
      if (ub - ua < 1e-4) continue;
      const ya = yOf(ua) + pts[k + 1] * def.amp, yb = yOf(ub) + pts[k + 3] * def.amp;
      const ba = Math.min(ya, yb) - DEPTH;
      pos.push(ua, ba, 0, ub, ba, 0, ub, yb, 0, ua, ba, 0, ub, yb, 0, ua, ya, 0);
      rid.push(ya, yb, yb, ya, yb, ya);
    }
  }
  return stripGeometry(pos, rid);
}

/** One chunk of a far parallax layer, in layer space (flat horizon). */
export function buildLayerChunk(def, c, W, seed) {
  const u0 = c * W, u1 = u0 + W;
  const H = def.H;
  const pos = [], rid = [];
  const DEPTH = 700;
  if (def.style === 'islands') islands(def, u0, u1, seed, H, () => 0, pos, rid);
  else {
    const pts = profilePoints(def, u0, u1, seed);
    for (let k = 0; k + 3 < pts.length; k += 2) {
      const ua = pts[k], ha = pts[k + 1] * H, ub = pts[k + 2], hb = pts[k + 3] * H;
      if (ub - ua < 1e-4) continue;
      pos.push(ua, -DEPTH, 0, ub, -DEPTH, 0, ub, hb, 0, ua, -DEPTH, 0, ub, hb, 0, ua, ha, 0);
      rid.push(ha, hb, hb, ha, hb, ha);
    }
  }
  return stripGeometry(pos, rid);
}

const LAYER_VERT = /* glsl */ `
attribute float aRidge;
varying float vY;
varying float vRidge;
varying float vX;
void main() {
  vY = position.y;
  vX = position.x;
  vRidge = aRidge;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const LAYER_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uColor, uLow, uRim, uWin;
uniform float uH, uRimAmt, uWinAmt, uRimW;
uniform vec2 uWinSize;
varying float vY;
varying float vRidge;
varying float vX;
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
void main() {
  float d = vRidge - vY;
  vec3 col = mix(uColor, uLow, smoothstep(0.0, uH, d));
  if (uWinAmt > 0.0) {
    vec2 g = vec2(vX, vY) / uWinSize;
    vec2 id = floor(g);
    vec2 f = fract(g);
    float lit = step(0.7, hash(id)) * step(0.25, f.x) * step(f.x, 0.75) * step(0.3, f.y) * step(f.y, 0.72) * step(uWinSize.y * 0.6, d);
    col = mix(col, uWin, lit * uWinAmt * 0.85);
  }
  col += uRim * uRimAmt * (1.0 - smoothstep(0.0, uRimW, d));
  gl_FragColor = vec4(col, 1.0);
}`;

export function makeLayerMaterial(def) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color() }, uLow: { value: new THREE.Color() },
      uRim: { value: new THREE.Color(def.rim ?? 0xffffff) }, uWin: { value: new THREE.Color(def.windows ?? 0) },
      uH: { value: def.fade ?? def.H ?? 40 }, uRimAmt: { value: 0 }, uRimW: { value: def.rimW ?? 2.2 }, uWinAmt: { value: 0 },
      uWinSize: { value: new THREE.Vector2(...(def.winSize || [5, 6.5])) },
    },
    vertexShader: LAYER_VERT, fragmentShader: LAYER_FRAG,
  });
}
