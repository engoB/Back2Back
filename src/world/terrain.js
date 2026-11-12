// Geometry builders for the ground ribbon, the mid-distance heightfield and the
// far parallax silhouettes. All low-poly, flat-shaded and generated on the fly.
import * as THREE from 'three';
import { DX, X0 } from './course.js';
import { noise1, noise2, fbm2, rand2, hashInt } from '../core/rng.js';
import { clamp, lerp, smoothstep } from '../core/math.js';
import { MAT } from './meshkit.js';

/** z rows of the ground ribbon, front (towards the camera) to back. */
export const ROWS = [3.2, 1.3, -1.3, -5, -11, -18];
const WALL = [0, 1.0, 4.5, 13, 34, 95];
const ROW_AMP = [0, 0, 0, 0.45, 1.0, 0.6];

export function rowOffset(x, k) {
  if (k < 3) return 0;
  return (noise2(x * 0.07, k * 3.7, 77) * 0.5 + 0.4) * ROW_AMP[k];
}

/** Height of the visible ground at (x, z); matches the ribbon mesh facets. */
export function topY(course, x, z) {
  const f = (x - X0) / DX;
  const i = clamp(Math.floor(f), 0, course.n - 2);
  const t = clamp(f - i, 0, 1);
  let a = course.ys[i], b = course.ys[i + 1];
  if (a !== a) a = course.base[i];
  if (b !== b) b = course.base[i + 1];
  let k = 0;
  while (k < ROWS.length - 2 && z < ROWS[k + 1]) k++;
  const tz = clamp((ROWS[k] - z) / (ROWS[k] - ROWS[k + 1]), 0, 1);
  const xa = X0 + i * DX;
  const ya = a + lerp(rowOffset(xa, k), rowOffset(xa, k + 1), tz);
  const yb = b + lerp(rowOffset(xa + DX, k), rowOffset(xa + DX, k + 1), tz);
  return lerp(ya, yb, t);
}

const _c = new THREE.Color();
const C = (hex) => new THREE.Color(hex);

// --------------------------------------------------------------------------
// Ground ribbon chunk
// --------------------------------------------------------------------------
export function buildTerrainChunk(course, era, xStart, xEnd) {
  course.ensure(xEnd + 8);
  const T = era.terrain;
  const cTop = C(T.top), cTop2 = C(T.top2), cEdge = C(T.edge);
  const cWall = T.wall.map(C);
  const pos = [], col = [];
  const lines = T.grid !== undefined ? [] : null;
  const i0 = Math.round((xStart - X0) / DX), i1 = Math.round((xEnd - X0) / DX);
  const nR = ROWS.length;
  const ys = course.ys;
  const rowY = (i, k) => ys[i] + rowOffset(X0 + i * DX, k);

  const v = (x, y, z, c, f) => {
    pos.push(x, y, z);
    col.push(c.r * f, c.g * f, c.b * f);
  };
  // quad a,b,c,d counter-clockwise seen from its visible side
  const quad = (a, b, c, d, ca, cb, cc, cd, f) => {
    v(a[0], a[1], a[2], ca, f); v(b[0], b[1], b[2], cb, f); v(c[0], c[1], c[2], cc, f);
    v(a[0], a[1], a[2], ca, f); v(c[0], c[1], c[2], cc, f); v(d[0], d[1], d[2], cd, f);
  };
  const topCol = (x, k, out) => {
    const n = noise2(x * 0.16, k * 1.9, 31) * 0.5 + 0.5;
    out.copy(cTop).lerp(cTop2, n);
    if (k === 0) out.lerp(cEdge, 0.7);
    return out;
  };
  const ca = new THREE.Color(), cb = new THREE.Color(), cc = new THREE.Color(), cd = new THREE.Color();

  for (let i = i0; i < i1; i++) {
    const xa = X0 + i * DX, xb = xa + DX;
    const A = ys[i], B = ys[i + 1];
    const va = A === A, vb = B === B;
    const jit = 1 + ((hashInt(i * 7919) % 1000) / 1000 - 0.5) * 0.05;
    if (va && vb) {
      for (let k = 0; k < nR - 1; k++) {
        const zf = ROWS[k], zb = ROWS[k + 1];
        topCol(xa, k, ca); topCol(xb, k, cb); topCol(xb, k + 1, cc); topCol(xa, k + 1, cd);
        quad([xa, rowY(i, k), zf], [xb, rowY(i + 1, k), zf], [xb, rowY(i + 1, k + 1), zb], [xa, rowY(i, k + 1), zb], ca, cb, cc, cd, jit);
      }
      const z0 = ROWS[0];
      for (let j = 0; j < WALL.length - 1; j++) {
        const w0 = WALL[j], w1 = WALL[j + 1];
        const c0 = cWall[j], c1 = cWall[Math.min(j + 1, cWall.length - 1)];
        const mixBot = j === WALL.length - 2 ? c1 : c0;
        quad([xa, A - w1, z0], [xb, B - w1, z0], [xb, B - w0, z0], [xa, A - w0, z0], mixBot, mixBot, c0, c0, jit);
      }
      if (lines) {
        for (const k of [0, 2, 3, 4, 5]) lines.push(xa, rowY(i, k) + 0.04, ROWS[k], xb, rowY(i + 1, k) + 0.04, ROWS[k]);
        if (i % 8 === 0) for (let k = 0; k < nR - 1; k++) lines.push(xa, rowY(i, k) + 0.04, ROWS[k], xa, rowY(i, k + 1) + 0.04, ROWS[k + 1]);
      }
    } else if (va !== vb) {
      // chasm side wall
      const i2 = va ? i : i + 1, x = va ? xa : xb;
      for (let k = 0; k < nR - 1; k++) {
        const zf = ROWS[k], zb = ROWS[k + 1];
        const yf = rowY(i2, k), yb = rowY(i2, k + 1);
        for (let j = 0; j < WALL.length - 1; j++) {
          const w0 = WALL[j], w1 = WALL[j + 1];
          const c0 = cWall[j];
          if (va) quad([x, yf - w1, zf], [x, yb - w1, zb], [x, yb - w0, zb], [x, yf - w0, zf], c0, c0, c0, c0, jit * 0.9);
          else quad([x, yb - w1, zb], [x, yf - w1, zf], [x, yf - w0, zf], [x, yb - w0, zb], c0, c0, c0, c0, jit * 0.82);
        }
      }
    }
  }

  const group = new THREE.Group();
  if (pos.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, MAT.lit);
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  if (lines && lines.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    const m = new THREE.LineSegments(g, gridMaterial(T.grid, era.id === 'neon' ? 0.75 : 0.32));
    m.frustumCulled = false;
    group.add(m);
  }
  return group;
}

const gridMats = new Map();
function gridMaterial(color, opacity) {
  const key = color + '|' + opacity;
  if (!gridMats.has(key)) {
    gridMats.set(key, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  }
  return gridMats.get(key);
}

// --------------------------------------------------------------------------
// Mid-distance heightfield (real 3D relief behind the track)
// --------------------------------------------------------------------------
export const MZ = [-17, -27, -42, -64, -94, -134, -186, -250, -330];
export const MCELL = 12;

/** Returns [y, v] : height and a 0..1 "relief" factor used for colouring. */
export function midSample(course, style, amp, x, z, out) {
  const t = clamp((-z - 17) / 313, 0, 1);
  const trend = course.trendAt(x);
  let h = 0, v = 0;
  if (style === 'alpine') {
    const r = 1 - Math.abs(noise2(x / 130, z / 95, 5));
    const r2 = 1 - Math.abs(noise2(x / 47, z / 40, 9));
    h = (r * r * 1.25 - 0.35) * (4 + 42 * t) + r2 * (1.5 + 9 * t) + 22 * t;
    v = clamp(r * r * 0.8 + r2 * 0.2 + t * 0.25, 0, 1);
  } else if (style === 'hills') {
    const f = fbm2(x / 140, z / 120, 5);
    h = f * (6 + 36 * t) + 16 * t + noise2(x / 37, z / 37, 3) * 2.2;
    v = clamp(f * 0.9 + 0.5, 0, 1);
  } else if (style === 'mesa') {
    const m = fbm2(x / 170, z / 140, 5) * 0.5 + 0.5;
    const q = smoothstep(0.5, 0.55, m) * 0.55 + smoothstep(0.66, 0.7, m) * 0.45;
    h = q * (10 + 44 * t) + 10 * t + noise2(x / 30, z / 30, 3) * 1.2;
    v = q;
  } else if (style === 'terrace') {
    const m = fbm2(x / 150, z / 130, 5) * 0.5 + 0.5;
    const s = m * 5;
    const q = (Math.floor(s) + smoothstep(0.82, 1, s - Math.floor(s))) / 5;
    h = q * (8 + 40 * t) + 14 * t;
    v = q;
  }
  const dip = -9 * (1 - smoothstep(0, 0.2, t) * 0.75);
  out[0] = trend + dip + h * amp * smoothstep(0, 0.1, t);
  out[1] = v;
  return out;
}

const _ms = [0, 0];
export function midY(course, era, x, z) {
  return midSample(course, era.mid.style, era.mid.amp, x, z, _ms)[0];
}

export function buildMidChunk(course, era, x0, width) {
  const M = era.mid;
  if (!M || M.style === 'none') return null;
  course.ensure(x0 + width + 60);
  const nx = Math.round(width / MCELL), nz = MZ.length;
  const cLow = C(M.low), cHigh = C(M.high), cCap = C(M.cap);
  const hs = new Float32Array((nx + 1) * nz), vs = new Float32Array((nx + 1) * nz);
  const s = [0, 0];
  for (let ix = 0; ix <= nx; ix++) {
    for (let iz = 0; iz < nz; iz++) {
      // stagger alternate columns so the facets don't line up
      const x = x0 + ix * MCELL, z = MZ[iz];
      midSample(course, M.style, M.amp, x, z, s);
      hs[ix * nz + iz] = s[0];
      vs[ix * nz + iz] = s[1];
    }
  }
  const pos = [], col = [], wire = M.wire !== undefined ? [] : null;
  const colour = (v, f) => {
    _c.copy(cLow).lerp(cHigh, clamp(v / Math.max(M.capLevel, 0.01), 0, 1));
    if (v > M.capLevel) _c.lerp(cCap, smoothstep(M.capLevel, M.capLevel + 0.12, v));
    col.push(_c.r * f, _c.g * f, _c.b * f);
  };
  const P = (ix, iz) => {
    pos.push(x0 + ix * MCELL, hs[ix * nz + iz], MZ[iz]);
  };
  for (let ix = 0; ix < nx; ix++) {
    for (let iz = 0; iz < nz - 1; iz++) {
      const f1 = 1 + (rand2(ix + Math.round(x0), iz, 3) - 0.5) * 0.12;
      const f2 = 1 + (rand2(ix + Math.round(x0), iz, 4) - 0.5) * 0.12;
      const vA = vs[ix * nz + iz], vB = vs[(ix + 1) * nz + iz], vC = vs[(ix + 1) * nz + iz + 1], vD = vs[ix * nz + iz + 1];
      // A(front-left) B(front-right) C(back-right) D(back-left); up-facing
      if ((ix + iz) % 2 === 0) {
        P(ix, iz); P(ix + 1, iz); P(ix + 1, iz + 1);
        const m1 = (vA + vB + vC) / 3; colour(m1, f1); colour(m1, f1); colour(m1, f1);
        P(ix, iz); P(ix + 1, iz + 1); P(ix, iz + 1);
        const m2 = (vA + vC + vD) / 3; colour(m2, f2); colour(m2, f2); colour(m2, f2);
      } else {
        P(ix, iz); P(ix + 1, iz); P(ix, iz + 1);
        const m1 = (vA + vB + vD) / 3; colour(m1, f1); colour(m1, f1); colour(m1, f1);
        P(ix + 1, iz); P(ix + 1, iz + 1); P(ix, iz + 1);
        const m2 = (vB + vC + vD) / 3; colour(m2, f2); colour(m2, f2); colour(m2, f2);
      }
      if (wire) {
        const o = 0.25;
        wire.push(x0 + ix * MCELL, hs[ix * nz + iz] + o, MZ[iz], x0 + (ix + 1) * MCELL, hs[(ix + 1) * nz + iz] + o, MZ[iz]);
        wire.push(x0 + ix * MCELL, hs[ix * nz + iz] + o, MZ[iz], x0 + ix * MCELL, hs[ix * nz + iz + 1] + o, MZ[iz + 1]);
      }
    }
  }
  const group = new THREE.Group();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, MAT.lit);
  mesh.frustumCulled = false;
  group.add(mesh);
  if (wire) {
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
    const lm = new THREE.LineSegments(wg, gridMaterial(M.wire, 0.55));
    lm.frustumCulled = false;
    group.add(lm);
  }
  return group;
}

// --------------------------------------------------------------------------
// Far parallax silhouettes
// --------------------------------------------------------------------------
const ridge = (u, f, s) => 1 - Math.abs(noise1(u / f, s));
const PROFILE = {
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
        for (let k = 0; k <= 8; k++) {
          const a = (Math.PI * k) / 8;
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
        for (let k = 1; k < 6; k++) {
          const a = (Math.PI * k) / 6;
          pts.push(xm - R * Math.cos(a), bh + ((R * 1.5) / H) * Math.sin(a));
        }
        pts.push(xm + R, bh);
      }
    }
    pts.push(x + BW, bh2);
  }
  return pts;
}

/** One chunk of a far layer in layer space. Returns a BufferGeometry or null. */
export function buildLayerChunk(def, c, W, seed) {
  const u0 = c * W, u1 = u0 + W;
  const H = def.H;
  const pos = [], rid = [];
  const DEPTH = 700;
  if (def.style === 'islands') {
    const P = 240;
    for (let k = Math.ceil(u0 / P - 1e-6); k * P < u1 - 1e-6; k++) {
      const r1 = rand2(k, 1, seed), r2 = rand2(k, 2, seed), r3 = rand2(k, 3, seed), r4 = rand2(k, 4, seed), r5 = rand2(k, 5, seed);
      if (r1 < 0.18) continue;
      const cu = k * P + r2 * P * 0.6, w = 50 + 150 * r3, top = H * (0.1 + 0.85 * r4), depth = w * (0.35 + 0.35 * r5);
      const n = 12;
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
  } else {
    let pts;
    if (PROFILE[def.style]) {
      const fn = PROFILE[def.style];
      pts = [];
      const n = Math.round(W / def.step);
      for (let k = 0; k <= n; k++) {
        const u = u0 + (k / n) * W;
        pts.push(u, fn(u, seed));
      }
    } else {
      pts = blockPoints(def.style, u0, u1, seed, H);
    }
    for (let k = 0; k + 3 < pts.length; k += 2) {
      const ua = pts[k], ha = pts[k + 1] * H, ub = pts[k + 2], hb = pts[k + 3] * H;
      if (ub - ua < 1e-4) continue;
      pos.push(ua, -DEPTH, 0, ub, -DEPTH, 0, ub, hb, 0, ua, -DEPTH, 0, ub, hb, 0, ua, ha, 0);
      rid.push(ha, hb, hb, ha, hb, ha);
    }
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aRidge', new THREE.Float32BufferAttribute(rid, 1));
  return g;
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
uniform vec3 uColor, uHaze, uRim, uWin;
uniform float uH, uRimAmt, uWinAmt, uFlat;
varying float vY;
varying float vRidge;
varying float vX;
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
void main() {
  float h = clamp(vY / uH, 0.0, 1.0);
  vec3 col = mix(uHaze, uColor, mix(smoothstep(-0.25, 0.6, h), 1.0, uFlat));
  float d = vRidge - vY;
  if (uWinAmt > 0.0) {
    vec2 g = vec2(vX / 5.0, vY / 6.5);
    vec2 id = floor(g);
    vec2 f = fract(g);
    float lit = step(0.7, hash(id)) * step(0.25, f.x) * step(f.x, 0.75) * step(0.3, f.y) * step(f.y, 0.72) * step(4.0, d) * step(0.0, vY);
    col = mix(col, uWin, lit * uWinAmt * 0.85);
  }
  col += uRim * uRimAmt * (1.0 - smoothstep(0.0, 2.2, d));
  gl_FragColor = vec4(col, 1.0);
}`;

export function makeLayerMaterial(def) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color() }, uHaze: { value: new THREE.Color() },
      uRim: { value: new THREE.Color(def.rim ?? 0) }, uWin: { value: new THREE.Color(def.windows ?? 0) },
      uH: { value: def.H }, uRimAmt: { value: def.rim !== undefined ? 1 : 0 },
      uWinAmt: { value: 0 }, uFlat: { value: def.style === 'islands' ? 0.7 : 0 },
    },
    vertexShader: LAYER_VERT, fragmentShader: LAYER_FRAG,
  });
}
