// Every 3D model of the game, built procedurally (no external asset files).
// A builder receives a Kit and a seeded random function.
import { Kit } from './meshkit.js';
import { mulberry32, hashStr } from '../core/rng.js';

const PI = Math.PI;
const SNOW = 0xf3f8fd;

// small reusable pieces ------------------------------------------------------
function windowGlow(k, x, y, z, w = 0.7, h = 0.8, ry = 0, c = 0xffd98a) {
  k.box(w, h, 0.07, { c, glow: true, p: [x, y, z], r: [0, ry, 0] });
}
function gable(k, w, y0, rh, d, c) {
  const a = w / 2, z = d / 2;
  k.tris([-a, y0, z, a, y0, z, 0, y0 + rh, z, a, y0, -z, -a, y0, -z, 0, y0 + rh, -z], { c });
}
function roof(k, w, y0, rh, d, c, over = 0.35, thick = 0.2) {
  // two slabs from the ridge down past the eaves
  const len = Math.hypot(w / 2, rh) + over, ang = Math.atan2(rh, w / 2);
  const cx = (len / 2) * Math.cos(ang) + (thick / 2) * Math.sin(ang);
  const cy = y0 + rh - (len / 2) * Math.sin(ang) + (thick / 2) * Math.cos(ang);
  k.box(len, thick, d + over * 2, { c, p: [-cx, cy, 0], r: [0, 0, ang], mid: true, j: 0.03 });
  k.box(len, thick, d + over * 2, { c, p: [cx, cy, 0], r: [0, 0, -ang], mid: true, j: 0.03 });
}
function building(k, w, h, d, wall, opts = {}) {
  k.box(w, h, d, { c: wall, c2: opts.wall2 ?? wall, p: opts.p || [0, 0, 0] });
  const [px, py, pz] = opts.p || [0, 0, 0];
  const cols = opts.cols ?? Math.max(1, Math.floor(w / 1.5)), rows = opts.rows ?? Math.max(1, Math.floor(h / 1.8));
  const wc = opts.win ?? 0xffd98a;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (k.rand() < (opts.dark ?? 0.25)) continue;
      const x = px - w / 2 + (w / cols) * (c + 0.5), y = py + (h / rows) * (r + 0.28);
      k.box((w / cols) * 0.5, (h / rows) * 0.42, 0.06, { c: wc, glow: true, p: [x, y, pz + d / 2 + 0.01] });
    }
  }
}
function frond(k, len, c, c2, yaw, pitch, p, wide = 0.42) {
  // a leaf: thin stretched pyramid drooping outwards
  k.cone(wide, len, 4, { c, c2, p, r: [0, yaw, -PI / 2 + pitch], s: [1, 1, 0.16] });
}

// ---------------------------------------------------------------------------
export const PROPS = {
  // ======================= PRESENT (snow) =======================
  pine(k, R) {
    k.cyl(0.14, 0.2, 1.3, 5, { c: 0x5a3d2b });
    const tiers = 3 + (R() > 0.6 ? 1 : 0);
    let y = 0.9, r = 1.5;
    for (let i = 0; i < tiers; i++) {
      const th = 2.0 - i * 0.2;
      k.cone(r, th, 6, { c: 0x1f5a4a, c2: 0x2f7a5c, p: [0, y, 0], r: [0, R() * 3, 0] });
      k.cone(r * 0.63, th * 0.62, 6, { c: SNOW, p: [0, y + th * 0.42, 0], r: [0, R() * 3, 0], j: 0.02 });
      y += th * 0.56;
      r *= 0.74;
    }
  },
  rockSnow(k, R) {
    k.ball(0.62, 0, { c: 0x71839a, c2: 0x9aabc0, p: [0, 0.34, 0], s: [1.05, 0.72, 0.9], r: [R(), R() * 3, R()] });
    k.ball(0.36, 0, { c: 0x8797ab, p: [0.42, 0.18, 0.18], s: [1, 0.7, 0.9], r: [R(), R(), R()] });
    k.ball(0.5, 0, { c: SNOW, p: [0, 0.6, 0], s: [1.1, 0.4, 0.95], r: [0, R() * 3, 0], j: 0.02 });
  },
  snowman(k, R) {
    k.ball(0.36, 1, { c: SNOW, c2: 0xffffff, p: [0, 0.3, 0], j: 0.03 });
    k.ball(0.24, 1, { c: 0xffffff, p: [0, 0.74, 0], j: 0.03 });
    k.cone(0.045, 0.22, 5, { c: 0xff8a3a, p: [0.2, 0.74, 0.05], r: [0, 0, -PI / 2] });
    k.box(0.05, 0.05, 0.05, { c: 0x1c2030, p: [0.17, 0.82, 0.1] });
    k.box(0.05, 0.05, 0.05, { c: 0x1c2030, p: [0.17, 0.82, -0.06] });
    k.cyl(0.02, 0.02, 0.5, 4, { c: 0x5a3d2b, p: [0, 0.5, 0.25], r: [0.9, 0, 0] });
    k.cyl(0.02, 0.02, 0.5, 4, { c: 0x5a3d2b, p: [0, 0.5, -0.25], r: [-0.9, 0, 0] });
    k.cyl(0.2, 0.2, 0.05, 8, { c: 0xc8413a, p: [0, 0.56, 0] });
  },
  chalet(k, R) {
    const w = 5.2, h = 2.5, d = 4.2;
    k.box(w + 0.2, 0.5, d + 0.2, { c: 0x8c93a0 });
    k.box(w, h, d, { c: 0x70462f, c2: 0x8f5f40, p: [0, 0.5, 0] });
    gable(k, w, 0.5 + h, 2.1, d, 0x7d5238);
    roof(k, w, 0.5 + h, 2.1, d, SNOW, 0.5, 0.26);
    windowGlow(k, -1.45, 1.35, d / 2 + 0.02);
    windowGlow(k, 1.45, 1.35, d / 2 + 0.02);
    windowGlow(k, 0, 3.4, d / 2 + 0.02, 0.6, 0.6);
    k.box(0.9, 1.6, 0.08, { c: 0x3f2a1e, p: [0, 0.5, d / 2 + 0.02] });
    k.box(0.6, 1.5, 0.6, { c: 0x8c93a0, p: [1.5, 3.6, -0.9] });
    k.box(0.74, 0.16, 0.74, { c: SNOW, p: [1.5, 5.1, -0.9], j: 0.02 });
    k.box(w + 0.6, 0.14, 0.9, { c: 0x5f3d2a, p: [0, 1.9, d / 2 + 0.4] });
  },
  lamp(k) {
    k.cyl(0.05, 0.07, 2.7, 5, { c: 0x2b3345 });
    k.box(0.5, 0.05, 0.05, { c: 0x2b3345, p: [0.2, 2.6, 0] });
    k.box(0.26, 0.32, 0.26, { c: 0xffe2a0, glow: true, p: [0.42, 2.2, 0] });
    k.cone(0.24, 0.16, 4, { c: 0x2b3345, p: [0.42, 2.52, 0], r: [0, PI / 4, 0] });
    k.box(0.3, 0.08, 0.3, { c: SNOW, p: [0.42, 2.66, 0], j: 0.02 });
  },
  fence(k) {
    for (const x of [-1.5, 0, 1.5]) k.box(0.12, 0.95, 0.12, { c: 0x6b4a35, p: [x, 0, 0] });
    k.box(3.2, 0.09, 0.07, { c: 0x7a563e, p: [0, 0.4, 0] });
    k.box(3.2, 0.09, 0.07, { c: 0x7a563e, p: [0, 0.75, 0] });
    k.box(3.2, 0.06, 0.1, { c: SNOW, p: [0, 0.84, 0], j: 0.02 });
  },

  // ======================= JURASSIC =======================
  fern(k, R) {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const yaw = (i / n) * PI * 2 + R() * 0.5;
      frond(k, 1.1 + R() * 0.5, 0x2f8a3c, 0x7fd05a, yaw, 0.45 + R() * 0.35, [0, 0.05, 0], 0.3);
    }
  },
  cycad(k, R) {
    let y = 0, lean = (R() - 0.5) * 0.25;
    const segs = 4;
    for (let i = 0; i < segs; i++) {
      k.cyl(0.24 - i * 0.02, 0.3 - i * 0.02, 0.95, 6, { c: 0x6a4a2e, c2: 0x85603a, p: [lean * y, y, 0], r: [0, R() * 3, lean * -0.3] });
      y += 0.9;
    }
    const n = 9;
    for (let i = 0; i < n; i++) {
      const yaw = (i / n) * PI * 2 + R() * 0.4;
      frond(k, 2.4 + R() * 0.8, 0x1f7a3c, 0x6fc04a, yaw, 0.1 + R() * 0.4, [lean * y, y - 0.05, 0], 0.5);
    }
    k.ball(0.26, 0, { c: 0xd8a03a, p: [lean * y, y + 0.1, 0] });
  },
  giantTree(k, R) {
    k.cyl(0.55, 0.95, 5.5, 7, { c: 0x4d3423, c2: 0x6a4a30 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2 + R();
      k.cyl(0.12, 0.38, 1.6, 5, { c: 0x4d3423, p: [Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8], r: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5] });
    }
    const blobs = [[0, 6.6, 0, 2.6], [1.8, 5.8, 0.6, 1.9], [-1.7, 6.0, -0.5, 2.0], [0.3, 7.9, -0.4, 1.8], [-0.6, 5.6, 1.4, 1.6]];
    for (const [x, y, z, r] of blobs) k.ball(r, 0, { c: 0x1d6b3a, c2: 0x55b04e, p: [x, y, z], s: [1, 0.75, 1], r: [R(), R() * 3, R()] });
  },
  mushroom(k, R) {
    const cap = R() > 0.5 ? 0xd8483a : 0xe8943a;
    k.cyl(0.14, 0.2, 0.8, 6, { c: 0xf0e6cc });
    k.cone(0.72, 0.5, 7, { c: cap, c2: 0xffb060, p: [0, 0.7, 0] });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2;
      k.ball(0.08, 0, { c: 0xfff3c0, glow: true, p: [Math.cos(a) * 0.4, 0.92, Math.sin(a) * 0.4] });
    }
  },
  ribcage(k, R) {
    k.cyl(0.14, 0.14, 6.4, 5, { c: 0xe9e2cc, p: [-3.2, 0.5, 0], r: [0, 0, -PI / 2] });
    for (let i = 0; i < 6; i++) {
      const x = -2.6 + i * 1.05, h = 2.4 - Math.abs(i - 2.5) * 0.25;
      for (const s of [-1, 1]) {
        k.cyl(0.07, 0.11, h, 4, { c: 0xe9e2cc, c2: 0xf8f4e6, p: [x, 0.45, s * 0.1], r: [s * 0.55, 0, 0] });
        k.cyl(0.05, 0.07, h * 0.55, 4, { c: 0xf8f4e6, p: [x, 0.45 + h * 0.84, s * (0.1 + h * 0.52)], r: [s * -0.5, 0, 0] });
      }
    }
    k.ball(0.55, 0, { c: 0xe9e2cc, p: [3.6, 0.6, 0], s: [1.5, 0.8, 0.8] });
  },
  sauropod(k, R) {
    const body = 0x4f7a68, belly = 0x8fb090;
    k.ball(2.2, 1, { c: body, c2: belly, p: [0, 4.2, 0], s: [1.7, 0.95, 0.95] });
    for (const [x, z] of [[-1.9, 0.9], [-1.9, -0.9], [1.9, 0.9], [1.9, -0.9]]) k.cyl(0.42, 0.52, 3.2, 6, { c: body, p: [x, 0, z] });
    let px = 2.8, py = 5.0;
    for (let i = 0; i < 6; i++) {
      const a = 0.5 + i * 0.13;
      k.cyl(0.42 - i * 0.045, 0.55 - i * 0.05, 1.7, 6, { c: body, c2: belly, p: [px, py, 0], r: [0, 0, -PI / 2 + a] });
      px += Math.cos(a) * 1.5;
      py += Math.sin(a) * 1.5;
    }
    k.ball(0.5, 0, { c: body, p: [px + 0.3, py + 0.1, 0], s: [1.5, 0.75, 0.8] });
    let tx = -3.0, ty = 4.4;
    for (let i = 0; i < 5; i++) {
      const a = PI - 0.15 - i * 0.12;
      k.cyl(0.4 - i * 0.07, 0.5 - i * 0.08, 1.6, 5, { c: body, p: [tx, ty, 0], r: [0, 0, -PI / 2 + a] });
      tx += Math.cos(a) * 1.4;
      ty += Math.sin(a) * 1.4 - 0.25;
    }
  },
  boulderMoss(k, R) {
    k.ball(0.64, 0, { c: 0x6b6f66, c2: 0x8a8f80, p: [0, 0.36, 0], s: [1.05, 0.74, 0.9], r: [R(), R() * 3, R()] });
    k.ball(0.5, 0, { c: 0x4f9a48, p: [-0.05, 0.6, 0], s: [1.1, 0.42, 0.95], r: [0, R() * 3, 0] });
    k.ball(0.3, 0, { c: 0x74786e, p: [0.45, 0.18, 0.15] });
  },
  eggNest(k, R) {
    k.cyl(0.62, 0.5, 0.26, 8, { c: 0x6a4a2e, c2: 0x8a6a40 });
    for (const [x, z, t] of [[-0.2, 0.1, 0.1], [0.22, 0.05, -0.15], [0.0, -0.2, 0.05]]) {
      k.ball(0.25, 1, { c: 0xf0e8d0, c2: 0xc8e0c0, p: [x, 0.5, z], s: [0.8, 1.15, 0.8], r: [t, 0, t] });
    }
  },

  // ======================= FAR WEST =======================
  saguaro(k, R) {
    const g = 0x3f8a4a, g2 = 0x5fae5a;
    const h = 3.6 + R() * 1.4;
    k.cyl(0.3, 0.36, h, 7, { c: g, c2: g2 });
    k.ball(0.3, 0, { c: g2, p: [0, h, 0] });
    const arms = 1 + (R() > 0.4 ? 1 : 0);
    for (let i = 0; i < arms; i++) {
      const s = i === 0 ? 1 : -1, ay = h * (0.38 + R() * 0.2), ah = 1.1 + R() * 0.9;
      k.cyl(0.2, 0.2, 0.8, 6, { c: g, p: [s * 0.25, ay, 0], r: [0, 0, s * -PI / 2] });
      k.cyl(0.19, 0.21, ah, 6, { c: g, c2: g2, p: [s * 0.95, ay - 0.1, 0] });
      k.ball(0.2, 0, { c: g2, p: [s * 0.95, ay + ah - 0.1, 0] });
    }
  },
  deadTree(k, R) {
    k.cyl(0.12, 0.22, 2.6, 5, { c: 0x5a4334, r: [0, 0, 0.08] });
    k.cyl(0.05, 0.1, 1.5, 4, { c: 0x5a4334, p: [-0.15, 2.1, 0], r: [0, 0, 0.9] });
    k.cyl(0.05, 0.09, 1.3, 4, { c: 0x5a4334, p: [-0.2, 1.5, 0], r: [0.3, 0, -0.9] });
    k.cyl(0.03, 0.06, 0.9, 4, { c: 0x5a4334, p: [-0.95, 2.9, 0], r: [0, 0, 0.2] });
  },
  mesaRock(k, R) {
    k.ball(0.7, 0, { c: 0xb5603a, c2: 0xd98a54, p: [0, 0.38, 0], s: [1.1, 0.75, 0.9], r: [R(), R() * 3, R()] });
    k.ball(0.4, 0, { c: 0xc87648, p: [0.55, 0.2, 0.2], r: [R(), R(), R()] });
  },
  tuft(k, R) {
    for (let i = 0; i < 5; i++) {
      k.cone(0.07, 0.4 + R() * 0.3, 3, { c: 0x8a9a4a, c2: 0xc8c070, p: [(R() - 0.5) * 0.3, 0, (R() - 0.5) * 0.3], r: [(R() - 0.5) * 0.7, R() * 3, (R() - 0.5) * 0.7] });
    }
  },
  saloon(k, R) {
    const w = 7, h = 3.4, d = 4.5;
    k.box(w, h, d, { c: 0x9a6a44, c2: 0xb07e52 });
    k.box(w + 0.4, 2.0, 0.25, { c: 0xb8875a, p: [0, h, d / 2 - 0.1] });
    k.box(3.6, 0.9, 0.1, { c: 0xf0dcae, p: [0, h + 0.55, d / 2 + 0.06] });
    k.box(w + 0.6, 0.14, 1.8, { c: 0x70482e, p: [0, 2.4, d / 2 + 0.9] });
    for (const x of [-3.3, -1.1, 1.1, 3.3]) k.box(0.14, 2.4, 0.14, { c: 0x70482e, p: [x, 0, d / 2 + 1.7] });
    k.box(w + 0.6, 0.2, 1.9, { c: 0x8a6040, p: [0, 0, d / 2 + 0.9] });
    windowGlow(k, -2.2, 1.2, d / 2 + 0.02, 0.9, 1.0, 0, 0xffc870);
    windowGlow(k, 2.2, 1.2, d / 2 + 0.02, 0.9, 1.0, 0, 0xffc870);
    k.box(1.0, 1.1, 0.08, { c: 0x5a3a26, p: [0, 0.2, d / 2 + 0.03] });
  },
  waterTower(k, R) {
    for (const [x, z] of [[-1.1, 1.1], [1.1, 1.1], [-1.1, -1.1], [1.1, -1.1]]) k.cyl(0.09, 0.11, 4.6, 4, { c: 0x6a4a34, p: [x, 0, z], r: [z * 0.05, 0, -x * 0.05] });
    k.box(2.5, 0.08, 0.08, { c: 0x6a4a34, p: [0, 2.2, 1.05], r: [0, 0, 0.5] });
    k.box(2.5, 0.08, 0.08, { c: 0x6a4a34, p: [0, 2.2, 1.05], r: [0, 0, -0.5] });
    k.cyl(1.55, 1.45, 2.3, 9, { c: 0x8a5e3c, c2: 0xa87648, p: [0, 4.5, 0] });
    k.cone(1.75, 1.0, 9, { c: 0x5a3a2a, p: [0, 6.8, 0] });
    k.cyl(1.58, 1.58, 0.1, 9, { c: 0x3a3a40, p: [0, 5.2, 0] });
  },
  windmill(k, R) {
    for (const [x, z] of [[-0.9, 0.9], [0.9, 0.9], [-0.9, -0.9], [0.9, -0.9]]) k.cyl(0.05, 0.08, 7.2, 4, { c: 0x6a5240, p: [x, 0, z], r: [z * 0.11, 0, -x * 0.11] });
    for (const y of [1.6, 3.6, 5.4]) {
      const s = 1 - y / 9;
      k.box(1.9 * s, 0.07, 0.07, { c: 0x6a5240, p: [0, y, 0.9 * s] });
      k.box(1.9 * s, 0.07, 0.07, { c: 0x6a5240, p: [0, y, -0.9 * s] });
    }
    k.box(0.5, 0.4, 0.8, { c: 0x7a6250, p: [0, 7.0, 0] });
    k.box(0.05, 0.9, 1.4, { c: 0x9a8268, p: [0, 6.9, -1.2] });
  },
  windmillFan(k) {
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2;
      k.box(0.34, 1.5, 0.03, { c: 0xb8b0a0, p: [Math.cos(a + PI / 2) * 0.25, Math.sin(a + PI / 2) * 0.25, 0], r: [0, 0.35, a] });
    }
    k.cyl(0.14, 0.14, 0.2, 6, { c: 0x5a4a40, p: [0, 0, -0.1], r: [PI / 2, 0, 0] });
  },
  telegraph(k) {
    k.cyl(0.08, 0.11, 5.4, 5, { c: 0x5a3f2c });
    k.box(1.6, 0.1, 0.1, { c: 0x5a3f2c, p: [0, 4.8, 0], r: [0, PI / 2, 0] });
    for (const z of [-0.65, 0.65]) k.cyl(0.05, 0.05, 0.16, 5, { c: 0x9fd0c8, p: [0, 4.9, z] });
  },
  skull(k) {
    k.ball(0.26, 0, { c: 0xece4cc, p: [0, 0.2, 0], s: [1.3, 0.8, 0.9] });
    k.cone(0.06, 0.5, 4, { c: 0xdcd4bc, p: [0.05, 0.3, 0.2], r: [0.9, 0, -0.3] });
    k.cone(0.06, 0.5, 4, { c: 0xdcd4bc, p: [0.05, 0.3, -0.2], r: [-0.9, 0, -0.3] });
  },
  barrel(k) {
    k.cyl(0.42, 0.42, 0.26, 9, { c: 0x8a5a34 });
    k.cyl(0.5, 0.42, 0.28, 9, { c: 0x9a6840, p: [0, 0.26, 0] });
    k.cyl(0.42, 0.5, 0.28, 9, { c: 0x9a6840, p: [0, 0.54, 0] });
    k.cyl(0.43, 0.43, 0.05, 9, { c: 0x3a3a42, p: [0, 0.2, 0] });
    k.cyl(0.43, 0.43, 0.05, 9, { c: 0x3a3a42, p: [0, 0.6, 0] });
    k.box(0.5, 0.12, 0.5, { c: 0x5a3a26, p: [0.35, 0.0, 0.3], r: [0.2, 0.5, 0.1] });
  },
  crateStack(k, R) {
    k.box(0.9, 0.62, 0.9, { c: 0xa87848, c2: 0xc08e58, r: [0, 0.1, 0] });
    k.box(0.7, 0.5, 0.7, { c: 0x9a6c40, c2: 0xb88450, p: [0.05, 0.62, 0], r: [0, 0.5, 0] });
    k.box(0.94, 0.06, 0.94, { c: 0x6a4a30, p: [0, 0.28, 0], r: [0, 0.1, 0] });
    k.cyl(0.05, 0.05, 0.3, 5, { c: 0xd83a2a, p: [0.05, 1.12, 0] });
  },

  // ======================= CHROME 1957 =======================
  maple(k, R) {
    const pal = [[0xe8663a, 0xffb04a], [0xd8483a, 0xff8a5a], [0xf0a030, 0xffd86a], [0xe86a8a, 0xffb0c0]][Math.floor(R() * 4)];
    k.cyl(0.14, 0.22, 2.0, 6, { c: 0x6a4a3a });
    k.ball(1.4, 0, { c: pal[0], c2: pal[1], p: [0, 3.0, 0], s: [1, 0.9, 1], r: [R(), R() * 3, R()] });
    k.ball(0.95, 0, { c: pal[0], c2: pal[1], p: [0.8, 2.5, 0.3], r: [R(), R(), R()] });
    k.ball(0.9, 0, { c: pal[0], c2: pal[1], p: [-0.8, 2.6, -0.2], r: [R(), R(), R()] });
  },
  house50(k, R) {
    const pal = [0xa8e0d0, 0xffc8d0, 0xfff0b8, 0xb8d8f8][Math.floor(R() * 4)];
    const w = 5.6, h = 2.5, d = 4.4;
    k.box(w, h, d, { c: pal });
    gable(k, w, h, 1.3, d, pal);
    roof(k, w, h, 1.3, d, 0x6a7a8a, 0.4, 0.16);
    windowGlow(k, -1.6, 1.0, d / 2 + 0.02, 1.2, 0.9);
    windowGlow(k, 1.6, 1.0, d / 2 + 0.02, 1.2, 0.9);
    k.box(0.9, 1.7, 0.08, { c: 0xffffff, p: [0, 0, d / 2 + 0.02] });
    k.box(0.5, 1.1, 0.5, { c: 0xd8dde4, p: [-1.6, 3.0, 0] });
    k.box(2.2, 0.08, 1.2, { c: 0xffffff, p: [0, 1.9, d / 2 + 0.6] });
  },
  diner(k, R) {
    const w = 8, h = 2.6, d = 3.6;
    k.box(w, h, d, { c: 0xe8eef4, c2: 0xf8fbff });
    k.cyl(d / 2, d / 2, h, 10, { c: 0xe8eef4, p: [-w / 2, 0, 0] });
    k.cyl(d / 2, d / 2, h, 10, { c: 0xe8eef4, p: [w / 2, 0, 0] });
    k.box(w + 0.1, 0.34, d + 0.1, { c: 0xff5a7a, p: [0, 0.5, 0] });
    k.box(w, 0.9, 0.06, { c: 0x9ff0f8, glow: true, p: [0, 1.3, d / 2 + 0.02] });
    k.box(w + d, 0.3, d + 0.3, { c: 0xc8d2dc, p: [0, h, 0] });
    k.box(3.4, 1.0, 0.2, { c: 0xff5a7a, glow: true, p: [0, h + 0.5, 0] });
    k.box(3.0, 0.5, 0.24, { c: 0xfff3c0, glow: true, p: [0, h + 0.75, 0] });
    k.cyl(0.08, 0.08, 1.6, 5, { c: 0xc8d2dc, p: [0, h + 1.4, 0] });
    k.gem(0.4, 0.8, { c: 0x9ff0f8, glow: true, p: [0, h + 2.9, 0] });
  },
  billboard(k, R) {
    for (const x of [-1.8, 1.8]) k.box(0.16, 3.4, 0.16, { c: 0x8a7a6a, p: [x, 0, 0] });
    k.box(5.0, 2.4, 0.14, { c: 0xfff3d8, p: [0, 2.6, 0] });
    const c = [0xff5a7a, 0x3fb8c8, 0xffb83a][Math.floor(R() * 3)];
    k.box(4.6, 0.7, 0.04, { c, p: [0, 3.9, 0.09] });
    k.cyl(0.6, 0.6, 0.04, 10, { c: 0xffb83a, p: [-1.2, 3.3, 0.1], r: [PI / 2, 0, 0], mid: true });
    k.box(2.2, 0.22, 0.04, { c: 0x4a5a6a, p: [0.8, 3.3, 0.09] });
    k.box(1.6, 0.22, 0.04, { c: 0x4a5a6a, p: [0.5, 2.95, 0.09] });
  },
  gasPump(k) {
    k.box(0.7, 1.5, 0.5, { c: 0xe8483a, c2: 0xf06a5a });
    k.box(0.5, 0.4, 0.04, { c: 0xfff8e0, p: [0, 0.9, 0.26] });
    k.cyl(0.32, 0.32, 0.1, 10, { c: 0xfff3c0, glow: true, p: [0, 1.82, 0], r: [PI / 2, 0, 0], mid: true });
    k.box(0.9, 0.12, 0.7, { c: 0xc8d2dc });
  },
  lamp50(k) {
    k.cyl(0.05, 0.08, 3.6, 5, { c: 0x6a7a8a });
    k.box(1.0, 0.06, 0.06, { c: 0x6a7a8a, p: [0.4, 3.55, 0], r: [0, 0, 0.15] });
    k.ball(0.2, 0, { c: 0xfff0c0, glow: true, p: [0.85, 3.5, 0], s: [1.4, 0.7, 1] });
  },
  car50(k, R) {
    const c = [0x7fd8c8, 0xff9ab0, 0xffe08a, 0x9ac0ff][Math.floor(R() * 4)];
    k.box(4.2, 0.6, 1.7, { c, p: [0, 0.35, 0] });
    k.box(2.0, 0.55, 1.5, { c: 0xfafcff, p: [-0.2, 0.95, 0] });
    k.box(1.7, 0.36, 1.52, { c: 0x4a6a8a, p: [-0.2, 1.02, 0] });
    for (const z of [-0.8, 0.8]) k.box(1.0, 0.5, 0.08, { c, p: [-1.75, 0.8, z], r: [0, 0, 0.35] });
    k.box(0.14, 0.22, 1.8, { c: 0xe8eef4, p: [2.1, 0.3, 0] });
    k.box(0.14, 0.22, 1.8, { c: 0xe8eef4, p: [-2.1, 0.3, 0] });
    for (const [x, z] of [[-1.3, 0.86], [1.3, 0.86], [-1.3, -0.86], [1.3, -0.86]]) {
      k.cyl(0.34, 0.34, 0.2, 9, { c: 0x22252c, p: [x, 0.34, z], r: [PI / 2, 0, 0], mid: true });
      k.cyl(0.17, 0.17, 0.22, 7, { c: 0xf4f6f8, p: [x, 0.34, z], r: [PI / 2, 0, 0], mid: true });
    }
    for (const z of [-0.6, 0.6]) k.ball(0.11, 0, { c: 0xfff3c0, glow: true, p: [2.12, 0.62, z] });
  },
  picket(k) {
    for (let i = 0; i < 9; i++) {
      const x = -1.6 + i * 0.4;
      k.box(0.12, 0.8, 0.04, { c: 0xffffff, p: [x, 0, 0] });
      k.cone(0.085, 0.14, 4, { c: 0xffffff, p: [x, 0.8, 0], r: [0, PI / 4, 0], s: [1, 1, 0.4] });
    }
    k.box(3.4, 0.07, 0.03, { c: 0xf0f0f0, p: [0, 0.25, -0.03] });
    k.box(3.4, 0.07, 0.03, { c: 0xf0f0f0, p: [0, 0.6, -0.03] });
  },
  hydrant(k) {
    k.cyl(0.3, 0.34, 0.12, 8, { c: 0xb8322a });
    k.cyl(0.22, 0.24, 0.56, 8, { c: 0xe8483a, c2: 0xf06050, p: [0, 0.1, 0] });
    k.ball(0.24, 0, { c: 0xe8483a, p: [0, 0.68, 0], s: [1, 0.7, 1] });
    k.cyl(0.07, 0.07, 0.1, 6, { c: 0xd8dde4, p: [0, 0.8, 0] });
    k.cyl(0.1, 0.1, 0.76, 6, { c: 0xd8dde4, p: [0, 0.42, -0.38], r: [PI / 2, 0, 0] });
    k.cyl(0.38, 0.38, 0.05, 8, { c: 0x7a7f88 });
    k.cone(0.2, 0.5, 7, { c: 0xff8a2a, p: [0.52, 0, 0.2] });
    k.cyl(0.21, 0.21, 0.06, 7, { c: 0xffffff, p: [0.52, 0.2, 0.2] });
  },
  jukebox(k) {
    k.box(0.9, 0.85, 0.6, { c: 0x8a4a2a, c2: 0xb86a3a });
    k.cyl(0.45, 0.45, 0.6, 10, { c: 0xb86a3a, p: [0, 0.85, 0], r: [PI / 2, 0, 0], mid: true });
    k.torus(0.4, 0.06, 5, 10, { c: 0xff5a7a, glow: true, p: [0, 0.85, 0.31], arc: PI });
    k.box(0.6, 0.36, 0.05, { c: 0xfff3c0, glow: true, p: [0, 0.62, 0.31] });
    k.box(0.1, 0.7, 0.05, { c: 0x9ff0f8, glow: true, p: [-0.36, 0.1, 0.31] });
    k.box(0.1, 0.7, 0.05, { c: 0x9ff0f8, glow: true, p: [0.36, 0.1, 0.31] });
    k.box(0.5, 0.3, 0.05, { c: 0xd8b060, p: [0, 0.15, 0.31] });
  },

  // ======================= NEON 1986 =======================
  palmNeon(k, R) {
    let x = 0, y = 0;
    const lean = (R() - 0.5) * 0.5;
    for (let i = 0; i < 6; i++) {
      k.cyl(0.14, 0.17, 1.05, 5, { c: 0x160a34, c2: 0x2a1458, p: [x, y, 0], r: [0, 0, -lean * 0.3 * i * 0.3] });
      y += 1.0;
      x += lean * 0.12 * i;
    }
    const n = 8;
    for (let i = 0; i < n; i++) {
      const yaw = (i / n) * PI * 2 + R() * 0.3;
      frond(k, 2.5 + R() * 0.6, 0x1a0c40, 0x3a1a78, yaw, 0.05 + R() * 0.45, [x, y, 0], 0.5);
    }
    k.torus(0.2, 0.04, 4, 8, { c: 0xff3fa4, glow: true, p: [x * 0.3, 2.0, 0], r: [PI / 2, 0, 0] });
    k.torus(0.2, 0.04, 4, 8, { c: 0x3ff6ff, glow: true, p: [x * 0.6, 3.6, 0], r: [PI / 2, 0, 0] });
  },
  neonSign(k, R) {
    for (const x of [-1.3, 1.3]) k.box(0.12, 3.0, 0.12, { c: 0x1a1030, p: [x, 0, 0] });
    k.box(3.4, 2.0, 0.12, { c: 0x120a28, p: [0, 2.4, 0] });
    const t = Math.floor(R() * 3);
    const A = 0xff3fa4, B = 0x3ff6ff, C3 = 0xffe14a;
    if (t === 0) {
      k.torus(0.6, 0.06, 4, 14, { c: A, glow: true, p: [-0.7, 3.4, 0.1] });
      k.torus(0.6, 0.06, 4, 3, { c: B, glow: true, p: [0.75, 3.3, 0.1], r: [0, 0, PI / 2] });
    } else if (t === 1) {
      for (let i = 0; i < 4; i++) k.box(2.6 - i * 0.5, 0.09, 0.05, { c: i % 2 ? A : C3, glow: true, p: [0, 2.75 + i * 0.4, 0.09] });
    } else {
      k.box(0.09, 1.4, 0.05, { c: B, glow: true, p: [-1.0, 2.7, 0.09] });
      k.box(0.09, 1.4, 0.05, { c: B, glow: true, p: [-0.5, 2.7, 0.09], r: [0, 0, 0.5] });
      k.torus(0.5, 0.06, 4, 12, { c: C3, glow: true, p: [0.7, 3.4, 0.1] });
    }
    k.box(3.5, 0.07, 0.14, { c: A, glow: true, p: [0, 4.4, 0] });
    k.box(3.5, 0.07, 0.14, { c: A, glow: true, p: [0, 2.36, 0] });
  },
  arcadeTower(k, R) {
    const w = 3.5 + R() * 2, h = 7 + R() * 9, d = 3.5 + R() * 1.5;
    const wc = [0xff3fa4, 0x3ff6ff, 0xffe14a, 0x8a5fff][Math.floor(R() * 4)];
    building(k, w, h, d, 0x150a30, { wall2: 0x24104c, win: wc, dark: 0.5, cols: Math.floor(w / 0.9), rows: Math.floor(h / 1.1) });
    k.box(w + 0.1, 0.12, d + 0.1, { c: wc, glow: true, p: [0, h, 0] });
    if (R() > 0.5) k.cyl(0.05, 0.05, 2.5, 4, { c: 0xff3fa4, glow: true, p: [0, h, 0] });
  },
  gridPylon(k, R) {
    const h = 2.2;
    const e = (ax, az, bx, bz, by = 0) => {
      const dx = bx - ax, dz = bz - az;
      k.box(Math.hypot(dx, dz), 0.05, 0.05, { c: 0x3ff6ff, glow: true, p: [(ax + bx) / 2, by, (az + bz) / 2], r: [0, -Math.atan2(dz, dx), 0] });
    };
    e(-0.8, 0.8, 0.8, 0.8); e(0.8, 0.8, 0.8, -0.8); e(0.8, -0.8, -0.8, -0.8); e(-0.8, -0.8, -0.8, 0.8);
    for (const [x, z] of [[-0.8, 0.8], [0.8, 0.8], [0.8, -0.8], [-0.8, -0.8]]) {
      const len = Math.hypot(0.8, h, 0.8);
      k.box(0.05, len, 0.05, { c: 0xff3fa4, glow: true, p: [x / 2, h / 2, z / 2], r: [Math.atan2(-z, h) * 1, 0, Math.atan2(x, h)], mid: true });
    }
  },
  car80(k, R) {
    const c = [0xff3fa4, 0x8a5fff, 0xf4f4ff][Math.floor(R() * 3)];
    k.box(4.2, 0.45, 1.8, { c, p: [0, 0.3, 0] });
    k.tris([-1.5, 0.75, 0.85, 1.9, 0.75, 0.85, -0.6, 1.3, 0.7, 1.9, 0.75, -0.85, -1.5, 0.75, -0.85, -0.6, 1.3, -0.7,
      -0.6, 1.3, 0.7, 1.9, 0.75, 0.85, 1.9, 0.75, -0.85, -0.6, 1.3, 0.7, 1.9, 0.75, -0.85, -0.6, 1.3, -0.7,
      -1.5, 0.75, 0.85, -0.6, 1.3, 0.7, -0.6, 1.3, -0.7, -1.5, 0.75, 0.85, -0.6, 1.3, -0.7, -1.5, 0.75, -0.85], { c: 0x1a1030 });
    k.box(0.5, 0.1, 1.9, { c, p: [-2.0, 0.95, 0] });
    for (const z of [-0.8, 0.8]) k.box(0.08, 0.3, 0.08, { c, p: [-2.0, 0.7, z] });
    k.box(0.06, 0.12, 1.5, { c: 0xff2e4a, glow: true, p: [-2.12, 0.55, 0] });
    k.box(0.06, 0.1, 0.4, { c: 0xfff3c0, glow: true, p: [2.12, 0.5, 0.6] });
    k.box(0.06, 0.1, 0.4, { c: 0xfff3c0, glow: true, p: [2.12, 0.5, -0.6] });
    k.box(4.0, 0.05, 1.86, { c: 0x3ff6ff, glow: true, p: [0, 0.22, 0] });
    for (const [x, z] of [[-1.3, 0.9], [1.3, 0.9], [-1.3, -0.9], [1.3, -0.9]]) k.cyl(0.33, 0.33, 0.22, 9, { c: 0x0c0818, p: [x, 0.33, z], r: [PI / 2, 0, 0], mid: true });
  },
  lampNeon(k) {
    k.cyl(0.05, 0.07, 3.4, 5, { c: 0x1a1030 });
    k.box(0.9, 0.08, 0.08, { c: 0xff3fa4, glow: true, p: [0.35, 3.4, 0] });
    k.box(0.06, 3.0, 0.02, { c: 0x3ff6ff, glow: true, p: [0, 0.2, 0.07] });
  },
  barrierNeon(k) {
    k.box(1.3, 0.34, 0.16, { c: 0x1a1030, p: [0, 0.42, 0] });
    for (let i = 0; i < 4; i++) k.box(0.2, 0.3, 0.03, { c: i % 2 ? 0xff3fa4 : 0xffe14a, glow: true, p: [-0.48 + i * 0.32, 0.44, 0.1], r: [0, 0, 0.35] });
    for (const x of [-0.5, 0.5]) k.box(0.1, 0.5, 0.5, { c: 0x2a1a4a, p: [x, 0, 0] });
    k.ball(0.09, 0, { c: 0xff3fa4, glow: true, p: [-0.5, 0.86, 0] });
    k.ball(0.09, 0, { c: 0xff3fa4, glow: true, p: [0.5, 0.86, 0] });
  },
  arcadeCab(k) {
    k.box(0.8, 1.05, 0.75, { c: 0x1a1030, c2: 0x2a1650 });
    k.box(0.82, 0.3, 0.3, { c: 0x2a1650, p: [0, 0.78, 0.2] });
    k.box(0.62, 0.42, 0.05, { c: 0x3ff6ff, glow: true, p: [0, 0.56, 0.39], r: [-0.25, 0, 0] });
    k.box(0.7, 0.14, 0.05, { c: 0xff3fa4, glow: true, p: [0, 0.94, 0.37] });
    k.box(0.05, 1.0, 0.72, { c: 0xffe14a, glow: true, p: [-0.42, 0.02, 0] });
    k.ball(0.05, 0, { c: 0xff2e4a, glow: true, p: [0.15, 0.5, 0.42] });
  },

  // ======================= FUTURE 2187 =======================
  podTree(k, R) {
    k.cyl(0.08, 0.16, 2.6, 6, { c: 0xe8eef4, c2: 0xffffff, r: [0, 0, (R() - 0.5) * 0.15] });
    k.ball(1.1, 1, { c: 0x2fc8b0, c2: 0x9ff8e0, p: [0, 3.2, 0], s: [1, 0.85, 1] });
    k.torus(1.25, 0.04, 4, 14, { c: 0xffffff, glow: true, p: [0, 3.1, 0], r: [PI / 2, 0, 0] });
    k.ball(0.16, 0, { c: 0xfff8d0, glow: true, p: [0, 4.3, 0] });
  },
  tower(k, R) {
    const h = 9 + R() * 12, r = 1.4 + R() * 1.2;
    k.cyl(r * 0.72, r, h, 8, { c: 0xdfe8f0, c2: 0xffffff });
    const n = Math.floor(h / 1.6);
    for (let i = 1; i < n; i++) {
      const y = i * 1.6, rr = r - (r * 0.28 * y) / h + 0.02;
      if (R() > 0.3) k.cyl(rr, rr, 0.22, 8, { c: R() > 0.5 ? 0x3fe8d0 : 0xfff0b0, glow: true, p: [0, y, 0] });
    }
    k.cyl(r * 0.2, r * 0.72, 1.6, 8, { c: 0xc8d6e4, p: [0, h, 0] });
    k.cyl(0.04, 0.04, 2.6, 4, { c: 0xffffff, p: [0, h + 1.6, 0] });
    k.ball(0.14, 0, { c: 0xff5a6a, glow: true, p: [0, h + 4.2, 0] });
    if (R() > 0.5) k.torus(r * 1.5, 0.1, 4, 14, { c: 0xdfe8f0, p: [0, h * 0.62, 0], r: [PI / 2, 0, 0] });
  },
  dome(k, R) {
    k.ball(3.2, 1, { c: 0xdfe8f0, c2: 0xffffff, p: [0, 0, 0], s: [1, 0.8, 1] });
    k.cyl(3.3, 3.3, 0.3, 12, { c: 0xa3b6cc });
    k.torus(2.8, 0.07, 4, 16, { c: 0x3fe8d0, glow: true, p: [0, 1.3, 0], r: [PI / 2, 0, 0] });
    k.box(1.2, 1.5, 0.1, { c: 0x9ff8f0, glow: true, p: [0, 0.3, 3.05] });
  },
  holoSign(k, R) {
    k.cyl(0.05, 0.12, 1.2, 5, { c: 0xdfe8f0 });
    const c = [0x3fe8d0, 0xff8ad8, 0xfff0b0][Math.floor(R() * 3)];
    k.box(2.6, 1.5, 0.03, { c, glow: true, p: [0, 1.7, 0], j: 0 });
    k.box(2.9, 0.05, 0.06, { c: 0xffffff, glow: true, p: [0, 1.6, 0] });
    k.box(2.9, 0.05, 0.06, { c: 0xffffff, glow: true, p: [0, 3.25, 0] });
    k.box(1.6, 0.14, 0.05, { c: 0xffffff, glow: true, p: [-0.3, 2.7, 0.04] });
    k.box(1.0, 0.14, 0.05, { c: 0xffffff, glow: true, p: [-0.6, 2.35, 0.04] });
  },
  antenna(k, R) {
    k.cyl(0.03, 0.1, 5.5, 5, { c: 0xdfe8f0 });
    k.torus(0.5, 0.03, 4, 10, { c: 0x3fe8d0, glow: true, p: [0, 3.6, 0], r: [PI / 2, 0, 0] });
    k.torus(0.32, 0.03, 4, 10, { c: 0x3fe8d0, glow: true, p: [0, 4.4, 0], r: [PI / 2, 0, 0] });
    k.ball(0.12, 0, { c: 0xff5a6a, glow: true, p: [0, 5.6, 0] });
  },
  lampFuture(k) {
    k.cyl(0.04, 0.07, 3.2, 5, { c: 0xdfe8f0 });
    k.torus(0.34, 0.05, 4, 12, { c: 0x9ff8f0, glow: true, p: [0, 3.5, 0] });
  },
  drone(k) {
    k.ball(0.36, 1, { c: 0xe8eef4, c2: 0xffffff, p: [0, 0.5, 0], s: [1, 0.8, 1] });
    k.torus(0.56, 0.06, 4, 12, { c: 0x5a6f8e, p: [0, 0.5, 0], r: [PI / 2, 0, 0] });
    k.ball(0.13, 0, { c: 0xff3a4a, glow: true, p: [0.3, 0.52, 0] });
    k.cyl(0.03, 0.03, 0.3, 4, { c: 0x5a6f8e, p: [0, 0.75, 0] });
    k.cone(0.2, 0.26, 6, { c: 0x3fe8d0, glow: true, p: [0, 0.0, 0], r: [0, 0, 0] });
  },
  pylon(k) {
    k.cyl(0.26, 0.4, 0.3, 6, { c: 0x7d92ae });
    k.cyl(0.12, 0.2, 1.0, 6, { c: 0xdfe8f0, p: [0, 0.3, 0] });
    k.gem(0.2, 0.44, { c: 0xff8a3a, glow: true, p: [0, 1.0, 0] });
    k.torus(0.3, 0.035, 4, 10, { c: 0xff8a3a, glow: true, p: [0, 0.75, 0], r: [PI / 2, 0, 0] });
  },

  // ======================= END OF TIME =======================
  crystal(k, R) {
    const c = R() > 0.5 ? [0x8a5fff, 0xd8c0ff] : [0xffb83a, 0xfff0b0];
    k.gem(0.42, 2.2 + R(), { c: c[0], c2: c[1], p: [0, -0.3, 0], r: [(R() - 0.5) * 0.4, R() * 3, (R() - 0.5) * 0.4] });
    k.gem(0.26, 1.2 + R() * 0.6, { c: c[0], c2: c[1], p: [0.4, -0.2, 0.1], r: [0.2, R() * 3, -0.5] });
    k.gem(0.2, 0.9, { c: c[1], glow: true, p: [-0.35, -0.15, -0.1], r: [-0.2, R(), 0.5] });
  },
  hourglass(k, R) {
    k.cyl(1.0, 1.0, 0.2, 8, { c: 0xc89a4a });
    k.cyl(1.0, 1.0, 0.2, 8, { c: 0xc89a4a, p: [0, 3.6, 0] });
    k.cyl(0.12, 0.85, 1.7, 8, { c: 0xb8c8f0, c2: 0xe8f0ff, p: [0, 0.2, 0] });
    k.cyl(0.85, 0.12, 1.7, 8, { c: 0xe8f0ff, c2: 0xb8c8f0, p: [0, 1.9, 0] });
    k.cone(0.6, 0.6, 8, { c: 0xffcf5a, glow: true, p: [0, 0.22, 0] });
    k.cyl(0.03, 0.03, 1.4, 4, { c: 0xffcf5a, glow: true, p: [0, 0.8, 0] });
    for (const [x, z] of [[0.9, 0], [-0.9, 0], [0, 0.9], [0, -0.9]]) k.cyl(0.06, 0.06, 3.4, 5, { c: 0xc89a4a, p: [x, 0.2, z] });
  },
  brokenColumn(k, R) {
    const h = 1.5 + R() * 2.5;
    k.box(1.0, 0.3, 1.0, { c: 0x6a628e });
    k.cyl(0.34, 0.38, h, 8, { c: 0x7a72a0, c2: 0x9a92c0, p: [0, 0.3, 0] });
    k.cyl(0.3, 0.34, 0.5, 8, { c: 0x8a82b0, p: [0.5, 0, 0.9], r: [1.4, 0.4, 0.2] });
    k.box(0.16, 0.04, 0.5, { c: 0xffcf5a, glow: true, p: [0, 0.3 + h * 0.6, 0.36] });
  },
  clockRuin(k, R) {
    k.cyl(2.4, 2.4, 0.3, 14, { c: 0xe8e0c8, c2: 0xfaf4e0, p: [0, 2.0, 0], r: [PI / 2 - 0.25, 0, 0.2], mid: true });
    k.torus(2.4, 0.16, 5, 14, { c: 0xc89a4a, p: [0, 2.0, 0], r: [-0.25, 0, 0.2] });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2;
      k.box(0.12, 0.4, 0.06, { c: 0x2a2440, p: [Math.cos(a) * 1.95, 2.0 + Math.sin(a) * 1.9, 0.22 + Math.sin(a) * 0.45], r: [-0.25, 0, a - PI / 2], mid: true });
    }
    k.box(0.12, 1.5, 0.06, { c: 0xffcf5a, glow: true, p: [0.25, 2.5, 0.35], r: [-0.25, 0, -0.5], mid: true });
    k.box(0.1, 1.0, 0.06, { c: 0xffcf5a, glow: true, p: [-0.3, 2.2, 0.3], r: [-0.25, 0, 1.2], mid: true });
  },
  gearRuin(k, R) {
    k.gear(1.3, 10, 0.3, { c: 0xb8863a, c2: 0xe8b85a, p: [0, 0.8, 0], r: [0.3, R(), 0.4] });
    k.gear(0.7, 8, 0.2, { c: 0x8a6a9a, p: [1.3, 0.35, 0.4], r: [1.2, 0.5, 0.2] });
  },
  shard(k, R) {
    k.gem(0.4, 1.0, { c: 0x8a5fff, c2: 0xe0d0ff, p: [0, -0.12, 0], r: [0.1, 0.4, -0.15] });
    k.gem(0.26, 0.7, { c: 0xffb83a, glow: true, p: [0.34, -0.1, 0.1], r: [0.2, 1, -0.5] });
    k.gem(0.22, 0.6, { c: 0x8a5fff, p: [-0.34, -0.1, -0.05], r: [-0.2, 2, 0.5] });
  },
  gearHalf(k) {
    k.gear(0.62, 9, 0.24, { c: 0xb8863a, c2: 0xf0c060, p: [0, 0.2, 0], r: [0, 0.3, 0.3] });
    k.gear(0.3, 7, 0.26, { c: 0xffcf5a, glow: true, p: [0, 0.2, 0], r: [0, 0.3, 0.3], hole: 0 });
  },
};

// Registry with a handful of variants per prop ------------------------------
const cache = new Map();
const VARIANT_COUNT = { pine: 3, rockSnow: 2, cycad: 3, fern: 2, giantTree: 2, saguaro: 3, maple: 4, house50: 4, car50: 4,
  mesaRock: 2, arcadeTower: 4, neonSign: 3, tower: 4, crystal: 3, brokenColumn: 2, palmNeon: 2, billboard: 3, mushroom: 2,
  car80: 3, holoSign: 3 };

export function propVariants(name) {
  return VARIANT_COUNT[name] || 1;
}

/** Built geometries { lit, glow } for a prop variant (cached). */
export function getProp(name, variant = 0) {
  const key = name + '#' + variant;
  let p = cache.get(key);
  if (!p) {
    const fn = PROPS[name];
    if (!fn) return null;
    const seed = hashStr(key) || 1;
    const kit = new Kit(seed);
    fn(kit, mulberry32(seed ^ 0x5bd1e995));
    p = kit.build();
    cache.set(key, p);
  }
  return p;
}
