// Every piece of scenery, drawn in code as a paper-cut illustration (see art.js):
// curved silhouettes, soft gradients, a few emissive accents. Units are metres,
// the origin is where the object meets the ground.
import { Art } from './art.js';
import { mulberry32, hashStr } from '../core/rng.js';

const PI = Math.PI;
const SNOW = 0xf3f8fd;

// ---- reusable motifs -------------------------------------------------------
function conifer(a, R, o) {
  const { h, w, tiers, c, c2, snow, trunk } = o;
  a.rect(-w * 0.04, -0.4, w * 0.08, h * 0.3, trunk, { c2: 0x7a5a44 });
  const base = h * 0.1, step = (h - base) / (tiers + 0.7);
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    // each skirt of branches overlaps the next one by about half
    const y0 = base + step * i, th = step * (1.95 - 0.25 * t);
    const hw = (w / 2) * (1 - t * 0.72) * (0.93 + R() * 0.14), sk = (R() - 0.5) * 0.12 * hw;
    a.fill(`M ${-hw} ${y0} Q ${-hw * 0.4} ${y0 + th * 0.36} ${sk} ${y0 + th} Q ${hw * 0.4} ${y0 + th * 0.36} ${hw} ${y0}
      Q ${hw * 0.72} ${y0 + th * 0.15} ${hw * 0.44} ${y0 + th * 0.07} Q ${hw * 0.2} ${y0 - th * 0.05} 0 ${y0 + th * 0.05}
      Q ${-hw * 0.2} ${y0 - th * 0.05} ${-hw * 0.44} ${y0 + th * 0.07} Q ${-hw * 0.72} ${y0 + th * 0.15} ${-hw} ${y0} Z`, c, { c2 });
    if (snow !== undefined) {
      // snow resting on the upper boughs: a ragged band under the next skirt
      const s0 = i === tiers - 1 ? 0.62 : 0.4, sw = 0.62 - (s0 - 0.4) * 0.9;
      a.fill(`M ${-hw * sw} ${y0 + th * s0} Q ${-hw * 0.26} ${y0 + th * (s0 + 0.3)} ${sk} ${y0 + th} Q ${hw * 0.26} ${y0 + th * (s0 + 0.3)} ${hw * sw} ${y0 + th * s0}
        Q ${hw * sw * 0.72} ${y0 + th * (s0 + 0.09)} ${hw * sw * 0.46} ${y0 + th * (s0 + 0.02)} Q ${hw * sw * 0.18} ${y0 + th * (s0 + 0.13)} ${-hw * sw * 0.08} ${y0 + th * (s0 + 0.03)}
        Q ${-hw * sw * 0.42} ${y0 + th * (s0 + 0.12)} ${-hw * sw * 0.62} ${y0 + th * s0} Q ${-hw * sw * 0.82} ${y0 + th * (s0 + 0.07)} ${-hw * sw} ${y0 + th * s0} Z`, snow, { c2: 0xffffff });
    }
  }
}
function boulder(a, R, w, h, c, c2, cap, cap2 = 0xffffff) {
  const top = [], n = 7;
  for (let i = 0; i < n; i++) {
    const ang = PI * (i / (n - 1)), r = 0.84 + R() * 0.28;
    top.push((-Math.cos(ang) * w * r) / 2, Math.sin(ang) * h * r);
  }
  a.blob([...top, w * 0.36, -0.2, -w * 0.36, -0.2], c, { c2 });
  if (cap !== undefined) {
    // snow or moss hugging the crown of the rock, with a wavy lower edge
    const pts = [];
    for (let i = 1; i < n - 1; i++) pts.push(top[i * 2] * 1.02, top[i * 2 + 1] * 1.02);
    for (let i = n - 2; i >= 1; i--) pts.push(top[i * 2] * 0.9, top[i * 2 + 1] * (0.7 + ((i % 2) * 0.1)) );
    a.blob(pts, cap, { c2: cap2 });
  }
}
function canopy(a, R, cx, cy, r, c, c2) {
  // a cloud of overlapping rounded masses, lighter on top
  const n = 5;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * PI * 2 + R(), d = r * 0.42;
    a.ellipse(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d * 0.7, r * (0.6 + R() * 0.2), r * (0.52 + R() * 0.16), c, { c2 });
  }
  a.ellipse(cx, cy, r * 0.8, r * 0.7, c, { c2 });
  a.ellipse(cx - r * 0.15, cy + r * 0.3, r * 0.5, r * 0.32, c2, { c2 });
}
function windowLit(a, x, y, w, h, c = 0xffd98a, bars = true) {
  a.rect(x, y, w, h, c, { glow: true, c2: 0xfff3c8 });
  if (bars) {
    a.rect(x + w / 2 - 0.03, y, 0.06, h, 0x3f2a1e);
    a.rect(x, y + h / 2 - 0.03, w, 0.06, 0x3f2a1e);
  }
}
function wheel(a, x, y, r, hub = 0xe8eef4) {
  a.circle(x, y, r, 0x1c1c24);
  a.circle(x, y, r * 0.5, hub);
}
function frondFan(a, R, x, y, n, len, c, c2, spread = PI * 1.25, wide = 0.42) {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const ang = PI / 2 + (t - 0.5) * spread + (R() - 0.5) * 0.15;
    const l = len * (0.8 + R() * 0.35), dx = Math.cos(ang), dy = Math.sin(ang);
    // fronds arc outwards then droop under their own weight
    a.stroke([x, y, x + dx * l * 0.5, y + dy * l * 0.5 + l * 0.14, x + dx * l, y + dy * l * 0.55 - l * 0.22 * Math.abs(dx)], wide, 0, i % 2 ? c : c2, { leaf: true, c2 });
  }
}

export const PROPS = {
  // ============================ PRESENT (snow) ============================
  pine(a, R) {
    conifer(a, R, { h: 5.4 + R() * 2.4, w: 2.5 + R() * 0.7, tiers: 5, c: 0x17473c, c2: 0x2c7257, snow: SNOW, trunk: 0x4d3426 });
  },
  rockSnow(a, R) {
    boulder(a, R, 1.3, 0.78, 0x62748c, 0x97a9be, SNOW);
  },
  snowman(a) {
    a.circle(0, 0.3, 0.36, 0xdfe8f4, { c2: 0xffffff });
    a.circle(0, 0.78, 0.24, 0xe8eff8, { c2: 0xffffff });
    a.stroke([-0.2, 0.52, -0.52, 0.72], 0.04, 0.02, 0x5a3d2b);
    a.stroke([0.2, 0.52, 0.5, 0.78], 0.04, 0.02, 0x5a3d2b);
    a.fill('M -0.2 0.58 Q 0 0.52 0.2 0.58 L 0.2 0.66 Q 0 0.6 -0.2 0.66 Z', 0xc8413a);
    a.poly([0.06, 0.8, 0.34, 0.76, 0.06, 0.74], 0xff8a3a);
    a.circle(-0.02, 0.86, 0.025, 0x1c2030);
    a.circle(0.1, 0.86, 0.025, 0x1c2030);
    a.rect(-0.19, 0.98, 0.38, 0.05, 0x1c2030);
    a.rect(-0.13, 1.02, 0.26, 0.2, 0x1c2030);
  },
  chalet(a, R) {
    a.rect(-2.95, -0.4, 5.9, 0.9, 0x8d95a4, { c2: 0xa7afbd });
    a.rect(-2.7, 0.5, 5.4, 2.4, 0x5f3b28, { c2: 0x8a5a3c });
    a.poly([-2.7, 2.9, 2.7, 2.9, 0, 5.05], 0x74492f, { c2: 0x8f5f40 });
    for (let i = 0; i < 6; i++) a.rect(-2.7, 0.8 + i * 0.38, 5.4, 0.035, 0x4a2d1e);
    a.rect(-2.95, 1.95, 5.9, 0.12, 0x4a2d1e);
    for (let i = 0; i < 9; i++) a.rect(-2.85 + i * 0.7, 1.45, 0.07, 0.5, 0x4a2d1e);
    a.rect(-2.95, 1.42, 5.9, 0.08, 0x4a2d1e);
    windowLit(a, -1.95, 0.85, 0.9, 0.9);
    windowLit(a, 1.05, 0.85, 0.9, 0.9);
    windowLit(a, -0.36, 3.25, 0.72, 0.72);
    a.rrect(-0.46, 0.5, 0.92, 1.5, 0.12, 0x3a2418);
    a.rect(1.35, 3.9, 0.6, 1.55, 0x8d95a4, { c2: 0xa7afbd });
    a.rrect(1.26, 5.36, 0.78, 0.26, 0.12, SNOW);
    // snow-laden roof
    a.fill('M -3.55 2.62 L 0 5.5 L 3.55 2.62 Q 3.62 2.98 3.4 3.12 L 0 5.86 L -3.4 3.12 Q -3.62 2.98 -3.55 2.62 Z', 0xe3ecf6, { c2: 0xffffff });
    a.fill('M -3.55 2.62 L 0 5.5 L 3.55 2.62 L 3.3 2.5 L 0 5.2 L -3.3 2.5 Z', 0x4a2d1e);
  },
  lamp(a) {
    a.rect(-0.05, -0.3, 0.1, 3.1, 0x252c3e);
    a.stroke([0, 2.75, 0.2, 2.95, 0.46, 2.82], 0.07, 0.05, 0x252c3e);
    a.fill('M 0.3 2.34 L 0.62 2.34 L 0.56 2.74 L 0.36 2.74 Z', 0xffe2a0, { glow: true, c2: 0xfff6d8 });
    a.poly([0.26, 2.74, 0.66, 2.74, 0.46, 2.92], 0x252c3e);
    a.rrect(0.28, 2.88, 0.36, 0.1, 0.05, SNOW);
  },
  fence(a) {
    for (const x of [-1.5, 0, 1.5]) a.rect(x - 0.07, -0.3, 0.14, 1.25, 0x5f4330, { c2: 0x7a573f });
    a.rect(-1.65, 0.36, 3.3, 0.1, 0x6f4e38);
    a.rect(-1.65, 0.72, 3.3, 0.1, 0x6f4e38);
    a.rrect(-1.65, 0.81, 3.3, 0.09, 0.04, SNOW);
    for (const x of [-1.5, 0, 1.5]) a.rrect(x - 0.1, 0.93, 0.2, 0.09, 0.04, SNOW);
  },

  // ============================== JURASSIC ==============================
  fern(a, R) {
    frondFan(a, R, 0, 0, 7 + Math.floor(R() * 3), 1.2, 0x2a8038, 0x74c858, PI * 1.05, 0.34);
  },
  cycad(a, R) {
    const lean = (R() - 0.5) * 1.2, h = 3 + R() * 1.6;
    a.stroke([0, -0.3, lean * 0.2, h * 0.5, lean, h], 0.62, 0.36, 0x5c3f28, { c2: 0x8a6440 });
    for (let i = 1; i < 7; i++) {
      const t = i / 7;
      a.stroke([lean * t * t - 0.3 + t * 0.1, h * t, lean * t * t + 0.3 - t * 0.1, h * t + 0.05], 0.05, 0.05, 0x4a311f);
    }
    frondFan(a, R, lean, h - 0.1, 9, 2.6, 0x1c7438, 0x62b848, PI * 1.5, 0.5);
    a.circle(lean, h, 0.26, 0xd8a03a, { c2: 0xf0c060 });
  },
  giantTree(a, R) {
    a.fill('M -1.5 -0.4 Q -0.7 0.2 -0.62 2.2 L -0.5 5.6 L 0.55 5.6 L 0.62 2.2 Q 0.75 0.2 1.6 -0.4 Z', 0x3f2a1c, { c2: 0x66462c });
    a.stroke([-0.3, 3.9, -1.4, 5.2, -2.2, 6.0], 0.34, 0.14, 0x4a321f);
    a.stroke([0.3, 4.2, 1.5, 5.4, 2.4, 5.9], 0.34, 0.14, 0x4a321f);
    canopy(a, R, -2.1, 6.4, 1.7, 0x175a34, 0x3f9a48);
    canopy(a, R, 2.2, 6.3, 1.8, 0x175a34, 0x3f9a48);
    canopy(a, R, 0, 7.4, 2.5, 0x1b6638, 0x58b450);
  },
  mushroom(a, R) {
    const cap = R() > 0.5 ? 0xc93c30 : 0xe08a30;
    a.fill('M -0.18 -0.2 Q -0.12 0.5 -0.14 0.8 L 0.14 0.8 Q 0.12 0.5 0.2 -0.2 Z', 0xe6dcc0, { c2: 0xfaf4e2 });
    a.fill('M -0.78 0.74 Q -0.7 1.36 0 1.4 Q 0.7 1.36 0.78 0.74 Q 0.4 0.9 0 0.86 Q -0.4 0.9 -0.78 0.74 Z', cap, { c2: 0xffb060 });
    for (const [x, y, r] of [[-0.36, 1.06, 0.09], [0.08, 1.2, 0.11], [0.42, 1.0, 0.07]]) a.circle(x, y, r, 0xfff3c0, { glow: true });
  },
  ribcage(a, R) {
    a.stroke([-3.4, 0.5, -1, 1.0, 1.4, 0.9, 3.3, 0.5], 0.3, 0.16, 0xe4dcc4, { c2: 0xf8f4e6 });
    for (let i = 0; i < 7; i++) {
      const x = -2.6 + i * 0.86, h = 2.6 - Math.abs(i - 3) * 0.32;
      a.stroke([x, 0.8, x - 0.5, 0.8 + h * 0.6, x + 0.1, 0.8 + h], 0.17, 0.05, 0xe9e2cc, { c2: 0xfbf8ec });
    }
    a.fill('M 3.1 0.2 Q 3.2 1.1 4.1 1.0 Q 4.9 0.9 4.8 0.4 Q 4.3 0.1 3.1 0.2 Z', 0xe9e2cc, { c2: 0xfbf8ec });
    a.circle(4.2, 0.72, 0.13, 0x3a2c20);
  },
  sauropod(a, R) {
    const c = 0x3f6858, c2 = 0x7fa890, far = 0x2f5246;
    a.stroke([-2.1, 4.4, -1.9, 2.2, -2.0, -0.3], 0.8, 0.62, far);
    a.stroke([1.5, 4.4, 1.7, 2.2, 1.6, -0.3], 0.8, 0.62, far);
    a.stroke([-3.2, 4.6, -6.0, 4.2, -8.4, 2.6, -9.8, 2.2], 1.3, 0.08, c, { c2 });
    a.blob([-3.6, 3.6, -2.6, 5.6, 0, 6.1, 2.6, 5.5, 3.5, 4.2, 2.2, 3.0, -1.0, 2.8], c, { c2 });
    a.stroke([2.4, 4.9, 4.4, 7.2, 5.6, 10.2, 6.6, 12.2], 1.5, 0.5, c, { c2 });
    a.fill('M 6.2 11.9 Q 6.6 13.0 7.6 12.9 Q 8.5 12.7 8.6 12.2 Q 7.8 11.7 6.2 11.9 Z', c, { c2 });
    a.circle(7.6, 12.55, 0.09, 0x10201a);
    a.stroke([-1.2, 4.0, -1.0, 2.0, -1.1, -0.3], 0.92, 0.7, c, { c2 });
    a.stroke([2.3, 4.0, 2.5, 2.0, 2.4, -0.3], 0.92, 0.7, c, { c2 });
  },
  boulderMoss(a, R) {
    boulder(a, R, 1.3, 0.8, 0x5e6258, 0x8a8f80, 0x3f8a40, 0x7fc860);
  },
  eggNest(a) {
    a.fill('M -0.7 0.0 Q -0.66 0.34 -0.2 0.3 Q 0.3 0.4 0.72 0.02 Q 0.5 -0.2 -0.5 -0.2 Z', 0x5c3f28, { c2: 0x8a6a40 });
    for (const [x, y, r] of [[-0.3, 0.48, -0.25], [0.04, 0.56, 0.05], [0.36, 0.46, 0.3]]) a.ellipse(x, y, 0.2, 0.28, 0xe6dcc0, { c2: 0xf6f0d8 });
    a.fill('M -0.7 0.0 Q -0.2 0.2 0.72 0.02 Q 0.5 -0.2 -0.5 -0.2 Z', 0x6a4a2e);
  },

  // ============================== FAR WEST ==============================
  saguaro(a, R) {
    const g = 0x2f7a44, g2 = 0x5fb060, h = 3.6 + R() * 1.6;
    a.rrect(-0.34, -0.3, 0.68, h + 0.3, 0.34, g, { c2: g2 });
    const arm = (s, y, len) => {
      a.stroke([s * 0.2, y, s * 0.9, y - 0.05, s * 1.0, y + 0.5, s * 1.0, y + len], 0.42, 0.4, g, { c2: g2 });
      a.circle(s * 1.0, y + len, 0.2, g2);
    };
    arm(-1, h * 0.42, 1.1 + R() * 0.8);
    if (R() > 0.35) arm(1, h * 0.56, 0.8 + R() * 0.9);
    for (const x of [-0.14, 0.08]) a.rect(x, 0, 0.03, h - 0.3, 0x256638);
  },
  deadTree(a, R) {
    a.stroke([0, -0.3, 0.08, 1.4, -0.1, 2.7], 0.34, 0.12, 0x4f3a2c, { c2: 0x6a5040 });
    a.stroke([0.02, 1.5, 0.7, 2.2, 1.2, 2.3], 0.14, 0.04, 0x4f3a2c);
    a.stroke([-0.05, 2.0, -0.7, 2.7, -0.8, 3.3], 0.13, 0.03, 0x4f3a2c);
    a.stroke([-0.1, 2.7, 0.2, 3.3, 0.1, 3.8], 0.09, 0.02, 0x4f3a2c);
  },
  mesaRock(a, R) {
    boulder(a, R, 1.5, 0.8, 0xa8502f, 0xdc8c56);
  },
  tuft(a, R) {
    frondFan(a, R, 0, -0.05, 6, 0.5, 0x7f8f44, 0xc8c070, PI * 0.9, 0.09);
  },
  saloon(a, R) {
    a.rect(-3.6, -0.3, 7.2, 3.9, 0x8f603e, { c2: 0xb07e52 });
    for (let i = 0; i < 9; i++) a.rect(-3.6, 0.2 + i * 0.4, 7.2, 0.035, 0x77502f);
    a.fill('M -3.9 3.4 L -3.9 5.0 Q -2 5.0 -1.6 5.7 L 1.6 5.7 Q 2 5.0 3.9 5.0 L 3.9 3.4 Z', 0xa87a50, { c2: 0xc4935f });
    a.rrect(-1.9, 4.0, 3.8, 1.0, 0.12, 0xf0dcae, { c2: 0xfff0c8 });
    a.rect(-1.5, 4.36, 3.0, 0.1, 0x8a3c28);
    a.rect(-1.1, 4.62, 2.2, 0.08, 0x8a3c28);
    a.fill('M -4.3 2.25 L 4.3 2.25 L 3.9 2.7 L -3.9 2.7 Z', 0x5c3a24);
    for (const x of [-3.9, -1.3, 1.3, 3.9]) a.rect(x - 0.08, -0.3, 0.16, 2.6, 0x5c3a24);
    windowLit(a, -2.9, 0.8, 1.0, 1.1, 0xffc870);
    windowLit(a, 1.9, 0.8, 1.0, 1.1, 0xffc870);
    a.rect(-0.6, -0.3, 1.2, 2.0, 0x2a1a12);
    a.rrect(-0.58, 0.5, 0.56, 0.9, 0.1, 0x9a6c44);
    a.rrect(0.02, 0.5, 0.56, 0.9, 0.1, 0x9a6c44);
    a.rect(-4.3, -0.3, 8.6, 0.24, 0x77502f);
  },
  waterTower(a, R) {
    for (const x of [-1.25, 1.25]) a.stroke([x * 1.25, -0.3, x, 4.7], 0.16, 0.13, 0x5c4230);
    a.stroke([-1.5, 0.6, 1.3, 3.4], 0.07, 0.07, 0x5c4230);
    a.stroke([1.5, 0.6, -1.3, 3.4], 0.07, 0.07, 0x5c4230);
    a.rect(-1.5, 3.4, 3.0, 0.1, 0x5c4230);
    a.rrect(-1.6, 4.5, 3.2, 2.4, 0.12, 0x7f5636, { c2: 0xaa7a4c });
    for (const y of [5.0, 5.9, 6.5]) a.rect(-1.62, y, 3.24, 0.09, 0x33333a);
    for (let i = 1; i < 8; i++) a.rect(-1.6 + i * 0.4, 4.5, 0.03, 2.4, 0x6a4628);
    a.poly([-1.9, 6.9, 1.9, 6.9, 0, 8.0], 0x4a2f22, { c2: 0x6a4630 });
    a.stroke([1.6, 4.9, 2.3, 4.6, 2.3, 3.6], 0.08, 0.08, 0x33333a);
  },
  windmill(a, R) {
    a.stroke([-1.0, -0.3, -0.16, 7.2], 0.09, 0.07, 0x5f4a3a);
    a.stroke([1.0, -0.3, 0.16, 7.2], 0.09, 0.07, 0x5f4a3a);
    for (let i = 0; i < 5; i++) {
      const y0 = 0.3 + i * 1.35, y1 = y0 + 1.35, w0 = 0.93 - y0 * 0.105, w1 = 0.93 - y1 * 0.105;
      a.stroke([-w0, y0, w1, y1], 0.04, 0.04, 0x5f4a3a);
      a.stroke([w0, y0, -w1, y1], 0.04, 0.04, 0x5f4a3a);
      a.rect(-w0, y0, w0 * 2, 0.05, 0x5f4a3a);
    }
    a.rect(-0.26, 7.1, 0.52, 0.26, 0x6f5848);
    a.fill('M -0.2 7.24 L -1.5 7.5 L -2.3 7.7 L -2.3 6.8 L -1.5 7.0 Z', 0x9a8268, { c2: 0xb8a080 });
  },
  windmillFan(a) {
    const n = 14;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * PI * 2, b = ang + 0.3;
      a.poly([Math.cos(ang) * 0.24, Math.sin(ang) * 0.24, Math.cos(ang - 0.02) * 1.55, Math.sin(ang - 0.02) * 1.55, Math.cos(b) * 1.55, Math.sin(b) * 1.55], i % 2 ? 0xb8b0a0 : 0xd0c8b8);
    }
    a.circle(0, 0, 0.2, 0x4f4038);
  },
  telegraph(a) {
    a.rect(-0.08, -0.3, 0.16, 6.0, 0x4f3828, { c2: 0x6a4e38 });
    a.rect(-0.9, 5.0, 1.8, 0.12, 0x4f3828);
    a.rect(-0.62, 4.5, 1.24, 0.1, 0x4f3828);
    for (const x of [-0.8, -0.5, 0.5, 0.8]) a.rrect(x - 0.05, 5.12, 0.1, 0.16, 0.04, 0x9fd0c8);
  },
  skull(a) {
    a.fill('M -0.3 0.02 Q -0.42 0.4 -0.06 0.44 Q 0.3 0.46 0.44 0.2 L 0.42 0.02 Z', 0xe6dec6, { c2: 0xf6f0de });
    a.circle(0.14, 0.24, 0.07, 0x3a2c20);
    a.stroke([-0.14, 0.38, -0.34, 0.66, -0.2, 0.84], 0.09, 0.02, 0xdcd4bc);
    a.stroke([0.06, 0.42, 0.26, 0.7, 0.46, 0.76], 0.09, 0.02, 0xdcd4bc);
  },
  barrel(a) {
    a.fill('M -0.42 0 Q -0.56 0.42 -0.42 0.84 L 0.42 0.84 Q 0.56 0.42 0.42 0 Z', 0x7f5230, { c2: 0xa87444 });
    for (const x of [-0.22, 0, 0.22]) a.rect(x - 0.012, 0.02, 0.024, 0.8, 0x6a4226);
    for (const y of [0.12, 0.62]) a.fill(`M -0.47 ${y} Q 0 ${y - 0.05} 0.47 ${y} L 0.47 ${y + 0.09} Q 0 ${y + 0.04} -0.47 ${y + 0.09} Z`, 0x33333a);
  },
  crateStack(a) {
    a.rect(-0.55, 0, 1.1, 0.68, 0x9a6c40, { c2: 0xc08e58 });
    a.rect(-0.55, 0, 1.1, 0.08, 0x6a4a30);
    a.rect(-0.55, 0.6, 1.1, 0.08, 0x6a4a30);
    a.stroke([-0.5, 0.06, 0.5, 0.62], 0.07, 0.07, 0x7a5636);
    a.rect(-0.36, 0.68, 0.72, 0.46, 0x8f6238, { c2: 0xb88450 });
    a.rect(-0.36, 0.68, 0.72, 0.06, 0x6a4a30);
    a.rect(-0.36, 1.08, 0.72, 0.06, 0x6a4a30);
  },

  // ============================ CHROME, 1957 ============================
  maple(a, R) {
    const pal = [[0xd9562e, 0xffa648], [0xc83c34, 0xff8258], [0xe8982a, 0xffd668], [0xdc5f80, 0xffa8ba]][Math.floor(R() * 4)];
    const lean = (R() - 0.5) * 0.4;
    a.stroke([0, -0.3, lean * 0.4, 1.4, lean, 2.5], 0.36, 0.2, 0x5c4032, { c2: 0x7a5a46 });
    a.stroke([lean * 0.7, 1.9, lean - 0.7, 2.7], 0.12, 0.06, 0x5c4032);
    a.stroke([lean * 0.8, 2.0, lean + 0.8, 2.9], 0.12, 0.06, 0x5c4032);
    canopy(a, R, lean, 3.6, 1.7, pal[0], pal[1]);
  },
  house50(a, R) {
    const wall = [0x9fd8c8, 0xffbcc8, 0xfff0b8, 0xb0d0f4][Math.floor(R() * 4)];
    a.rect(-3.0, -0.3, 6.0, 2.9, wall, { c2: 0xffffff });
    a.rect(-3.0, -0.3, 6.0, 0.5, 0xd8dde4);
    a.fill('M -3.5 2.5 L -1.2 3.9 L 3.5 3.9 L 3.5 2.5 Z', 0x5f6f80, { c2: 0x7f90a2 });
    a.rect(-3.5, 2.42, 7.0, 0.14, 0xffffff);
    a.rect(1.9, 3.6, 0.6, 1.1, 0xd8dde4);
    windowLit(a, -2.3, 0.9, 1.5, 1.0, 0xffe7a8);
    windowLit(a, 1.0, 0.9, 1.5, 1.0, 0xffe7a8);
    a.rrect(-0.45, -0.3, 0.9, 2.0, 0.06, 0xf4f6f8);
    a.circle(0.24, 0.7, 0.05, 0xffcf5a);
    a.fill('M -0.8 1.9 L 0.8 1.9 L 0.95 1.62 L -0.95 1.62 Z', 0xff6f8a);
    for (let i = 0; i < 4; i++) a.rect(-0.75 + i * 0.44, 1.62, 0.2, 0.28, 0xffffff);
  },
  diner(a, R) {
    a.rrect(-5.2, -0.3, 10.4, 3.1, 1.3, 0xdfe6ee, { c2: 0xffffff });
    a.rect(-5.2, 0.5, 10.4, 0.34, 0xff5a7a);
    a.rect(-5.2, 0.2, 10.4, 0.1, 0xb8c2cc);
    a.rrect(-4.2, 1.2, 8.4, 1.0, 0.3, 0x9ff0f8, { glow: true, c2: 0xdffcff });
    for (let i = 1; i < 7; i++) a.rect(-4.2 + i * 1.2, 1.2, 0.07, 1.0, 0xdfe6ee);
    a.rrect(-5.5, 2.7, 11, 0.36, 0.18, 0xc0cad4, { c2: 0xe8eef4 });
    a.rrect(-1.9, 3.2, 3.8, 1.2, 0.2, 0xff5a7a, { glow: true, c2: 0xff8fa8 });
    a.rrect(-1.6, 3.5, 3.2, 0.6, 0.1, 0xfff3c0, { glow: true });
    a.rect(-0.06, 4.4, 0.12, 1.4, 0xc0cad4);
    const star = [];
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.26 : 0.62, ang = (i / 10) * PI * 2 + PI / 2; star.push(Math.cos(ang) * r, 6.2 + Math.sin(ang) * r); }
    a.poly(star, 0x9ff0f8, { glow: true });
  },
  billboard(a, R) {
    for (const x of [-1.9, 1.9]) a.rect(x - 0.09, -0.3, 0.18, 3.0, 0x7f6f60);
    a.rrect(-2.7, 2.5, 5.4, 2.7, 0.1, 0xfff3d8, { c2: 0xffffff });
    const c = [0xff5a7a, 0x3fb8c8, 0xffb83a][Math.floor(R() * 3)];
    a.rect(-2.5, 4.3, 5.0, 0.7, c);
    a.circle(-1.3, 3.4, 0.64, 0xffb83a, { c2: 0xffe08a });
    a.fill('M -1.3 3.4 L -0.75 3.75 L -1.3 4.04 Z', 0xfff3d8);
    a.rrect(-0.2, 3.5, 2.4, 0.24, 0.1, 0x4a5a6a);
    a.rrect(-0.2, 3.0, 1.7, 0.24, 0.1, 0x4a5a6a);
  },
  gasPump(a) {
    a.rect(-0.5, -0.3, 1.0, 0.36, 0xc0cad4);
    a.rrect(-0.38, 0, 0.76, 1.6, 0.12, 0xd9412f, { c2: 0xf06a5a });
    a.rrect(-0.27, 0.9, 0.54, 0.42, 0.06, 0xfff8e0);
    a.circle(0, 1.94, 0.33, 0xfff3c0, { glow: true });
    a.circle(0, 1.94, 0.2, 0xff5a7a, { glow: true });
    a.stroke([0.38, 1.1, 0.7, 0.9, 0.62, 0.2], 0.05, 0.05, 0x23232c);
  },
  lamp50(a) {
    a.stroke([0, -0.3, 0, 3.0, 0.3, 3.7, 0.95, 3.8], 0.11, 0.07, 0x6a7a8a, { seg: 24 });
    a.fill('M 0.72 3.72 Q 0.98 3.46 1.3 3.72 Z', 0xfff0c0, { glow: true });
    a.fill('M 0.66 3.72 L 1.36 3.72 Q 1.0 3.98 0.66 3.72 Z', 0x6a7a8a);
  },
  car50(a, R) {
    const c = [0x6fd0c0, 0xff8fa8, 0xffd87a, 0x8ab8ff][Math.floor(R() * 4)];
    a.fill('M -2.45 0.3 L -2.5 0.95 Q -2.5 1.28 -2.1 1.2 L -1.2 1.02 L 1.3 0.98 Q 2.3 0.9 2.5 0.62 L 2.5 0.3 Z', c, { c2: 0xffffff });
    a.fill('M -2.5 0.95 L -2.62 1.42 L -1.9 1.14 Z', c);
    a.fill('M -1.1 1.0 Q -0.9 1.66 -0.1 1.66 Q 0.7 1.66 1.1 1.0 Z', 0xf6f8fb);
    a.fill('M -0.9 1.04 Q -0.74 1.52 -0.14 1.52 L -0.14 1.04 Z', 0x4a6a8a);
    a.fill('M 0.02 1.04 L 0.02 1.52 Q 0.56 1.5 0.86 1.04 Z', 0x4a6a8a);
    a.rect(-2.55, 0.3, 5.1, 0.13, 0xe8eef4);
    wheel(a, -1.5, 0.34, 0.38);
    wheel(a, 1.5, 0.34, 0.38);
    a.circle(2.42, 0.72, 0.11, 0xfff3c0, { glow: true });
    a.rect(-2.56, 0.74, 0.08, 0.2, 0xff3a4a, { glow: true });
  },
  picket(a) {
    for (let i = 0; i < 9; i++) {
      const x = -1.6 + i * 0.4;
      a.fill(`M ${x - 0.07} -0.3 L ${x - 0.07} 0.72 L ${x} 0.88 L ${x + 0.07} 0.72 L ${x + 0.07} -0.3 Z`, 0xf0f0f0, { c2: 0xffffff });
    }
    a.rect(-1.7, 0.2, 3.4, 0.07, 0xe0e0e0);
    a.rect(-1.7, 0.55, 3.4, 0.07, 0xe0e0e0);
  },
  hydrant(a) {
    a.rrect(-0.3, 0, 0.6, 0.12, 0.04, 0xa82a22);
    a.rrect(-0.2, 0.1, 0.4, 0.5, 0.06, 0xd9412f, { c2: 0xf06a5a });
    a.fill('M -0.22 0.58 Q -0.22 0.82 0 0.84 Q 0.22 0.82 0.22 0.58 Z', 0xd9412f, { c2: 0xf06a5a });
    a.rrect(-0.06, 0.82, 0.12, 0.08, 0.03, 0xd8dde4);
    a.rrect(-0.36, 0.34, 0.16, 0.16, 0.05, 0xd8dde4);
    a.rrect(0.2, 0.34, 0.16, 0.16, 0.05, 0xd8dde4);
    a.fill('M 0.42 0 L 0.56 0.5 L 0.7 0 Z', 0xff8a2a);
    a.rect(0.47, 0.18, 0.18, 0.07, 0xffffff);
  },
  jukebox(a) {
    a.fill('M -0.48 0 L -0.48 0.76 Q -0.48 1.2 0 1.2 Q 0.48 1.2 0.48 0.76 L 0.48 0 Z', 0x7f4426, { c2: 0xb86a3a });
    a.fill('M -0.38 0.74 Q -0.38 1.1 0 1.1 Q 0.38 1.1 0.38 0.74 Z', 0xff5a7a, { glow: true, c2: 0xffb0c0 });
    a.fill('M -0.26 0.74 Q -0.26 0.98 0 0.98 Q 0.26 0.98 0.26 0.74 Z', 0xfff3c0, { glow: true });
    a.rrect(-0.3, 0.36, 0.6, 0.3, 0.05, 0x9ff0f8, { glow: true });
    a.rect(-0.42, 0.04, 0.08, 0.66, 0xffd87a, { glow: true });
    a.rect(0.34, 0.04, 0.08, 0.66, 0xffd87a, { glow: true });
    a.rrect(-0.26, 0.06, 0.52, 0.24, 0.04, 0xd8b060);
  },

  // ============================= NEON, 1986 =============================
  palmNeon(a, R) {
    const lean = (R() - 0.5) * 1.6, h = 5 + R() * 1.6;
    a.stroke([0, -0.3, lean * 0.15, h * 0.5, lean, h], 0.34, 0.2, 0x100726, { c2: 0x2a1458 });
    frondFan(a, R, lean, h - 0.05, 9, 2.7, 0x140a30, 0x30186a, PI * 1.55, 0.46);
    a.stroke([-0.17, 1.2, 0.17 + lean * 0.05, 1.24], 0.06, 0.06, 0xff3fa4, { glow: true });
    a.stroke([lean * 0.3 - 0.14, h * 0.55, lean * 0.3 + 0.14, h * 0.55 + 0.04], 0.06, 0.06, 0x3ff6ff, { glow: true });
  },
  neonSign(a, R) {
    for (const x of [-1.3, 1.3]) a.rect(x - 0.06, -0.3, 0.12, 2.9, 0x160c2c);
    a.rrect(-1.8, 2.4, 3.6, 2.1, 0.14, 0x0f0822, { c2: 0x1c1038 });
    const A = 0xff3fa4, B = 0x3ff6ff, C = 0xffe14a, t = Math.floor(R() * 3);
    const ring = (cx, cy, r, c) => { a.circle(cx, cy, r, c, { glow: true }); a.circle(cx, cy, r - 0.09, 0x0f0822); };
    if (t === 0) {
      ring(-0.8, 3.45, 0.6, A);
      a.stroke([0.2, 2.9, 0.95, 4.05, 1.5, 2.9, 0.2, 2.9], 0.09, 0.09, B, { glow: true, seg: 3 });
    } else if (t === 1) {
      for (let i = 0; i < 4; i++) a.rrect(-1.4 + i * 0.25, 2.75 + i * 0.4, 2.8 - i * 0.5, 0.1, 0.05, i % 2 ? A : C, { glow: true });
    } else {
      a.stroke([-1.3, 2.8, -1.3, 4.1], 0.1, 0.1, B, { glow: true });
      a.stroke([-0.9, 2.8, -0.3, 4.1], 0.1, 0.1, B, { glow: true });
      ring(0.8, 3.45, 0.55, C);
    }
    a.rrect(-1.86, 4.46, 3.72, 0.09, 0.04, A, { glow: true });
    a.rrect(-1.86, 2.36, 3.72, 0.09, 0.04, A, { glow: true });
  },
  arcadeTower(a, R) {
    const w = 3.6 + R() * 2.4, h = 8 + R() * 9;
    const wc = [0xff3fa4, 0x3ff6ff, 0xffe14a, 0x8a5fff][Math.floor(R() * 4)];
    a.rect(-w / 2, -0.4, w, h + 0.4, 0x120828, { c2: 0x24104c });
    const cols = Math.floor(w / 0.8), rows = Math.floor(h / 1.05);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (R() < 0.55) continue;
        a.rect(-w / 2 + (w / cols) * (c + 0.25), 0.5 + r * 1.05, (w / cols) * 0.5, 0.5, wc, { glow: true });
      }
    }
    a.rect(-w / 2 - 0.05, h, w + 0.1, 0.12, wc, { glow: true });
    if (R() > 0.5) a.rect(-0.03, h, 0.06, 2.4, 0xff3fa4, { glow: true });
  },
  gridPylon(a) {
    const g = { glow: true };
    a.stroke([-0.9, 0, 0, 2.3], 0.06, 0.06, 0xff3fa4, g);
    a.stroke([0.9, 0, 0, 2.3], 0.06, 0.06, 0xff3fa4, g);
    a.stroke([-0.3, 0, 0, 2.3], 0.04, 0.04, 0xff3fa4, g);
    a.stroke([0.4, 0, 0, 2.3], 0.04, 0.04, 0xff3fa4, g);
    a.stroke([-0.9, 0.02, 0.9, 0.02], 0.06, 0.06, 0x3ff6ff, g);
    a.stroke([-0.5, 1.0, 0.5, 1.0], 0.04, 0.04, 0x3ff6ff, g);
  },
  car80(a, R) {
    const c = [0xff3fa4, 0x8a5fff, 0xe8e8ff][Math.floor(R() * 3)];
    a.fill('M -2.3 0.26 L -2.34 0.8 L -1.5 0.86 L -0.5 1.26 L 0.5 1.24 L 1.25 0.84 L 2.3 0.6 L 2.36 0.26 Z', c, { c2: 0xffffff });
    a.fill('M -1.36 0.88 L -0.46 1.18 L 0.42 1.16 L 1.02 0.86 Z', 0x150c2e);
    a.fill('M -2.34 0.8 L -2.5 1.06 L -1.9 1.0 L -1.8 0.84 Z', c);
    a.rect(-2.4, 0.2, 4.8, 0.07, 0x3ff6ff, { glow: true });
    a.rect(-2.38, 0.56, 0.08, 0.16, 0xff2e4a, { glow: true });
    a.rect(2.2, 0.5, 0.14, 0.08, 0xfff3c0, { glow: true });
    wheel(a, -1.45, 0.34, 0.35, 0x8a8aa0);
    wheel(a, 1.45, 0.34, 0.35, 0x8a8aa0);
  },
  lampNeon(a) {
    a.rect(-0.05, -0.3, 0.1, 3.8, 0x160c2c);
    a.rrect(-0.05, 3.42, 1.0, 0.1, 0.05, 0xff3fa4, { glow: true });
    a.rect(0.06, 0.2, 0.03, 3.0, 0x3ff6ff, { glow: true });
  },
  barrierNeon(a) {
    for (const x of [-0.52, 0.52]) a.rect(x - 0.05, 0, 0.1, 0.8, 0x24163e);
    a.rrect(-0.68, 0.34, 1.36, 0.34, 0.05, 0x160c2c);
    for (let i = 0; i < 4; i++) a.fill(`M ${-0.6 + i * 0.32} 0.38 L ${-0.48 + i * 0.32} 0.38 L ${-0.36 + i * 0.32} 0.64 L ${-0.48 + i * 0.32} 0.64 Z`, i % 2 ? 0xff3fa4 : 0xffe14a, { glow: true });
    a.circle(-0.52, 0.86, 0.09, 0xff3fa4, { glow: true });
    a.circle(0.52, 0.86, 0.09, 0xff3fa4, { glow: true });
  },
  arcadeCab(a) {
    a.fill('M -0.4 0 L -0.4 1.14 L 0.14 1.14 L 0.4 0.82 L 0.4 0.56 L 0.22 0.5 L 0.4 0.44 L 0.4 0 Z', 0x160c2c, { c2: 0x2e1858 });
    a.fill('M -0.26 0.62 L -0.26 1.02 L 0.1 1.02 L 0.26 0.82 L 0.26 0.62 Z', 0x3ff6ff, { glow: true, c2: 0xbffcff });
    a.rect(-0.4, 1.06, 0.54, 0.08, 0xff3fa4, { glow: true });
    a.rect(-0.4, 0, 0.06, 1.06, 0xffe14a, { glow: true });
    a.circle(0.28, 0.5, 0.045, 0xff2e4a, { glow: true });
  },

  // ============================ FUTURE, 2187 ============================
  podTree(a, R) {
    const lean = (R() - 0.5) * 0.5;
    a.stroke([0, -0.3, lean * 0.3, 1.5, lean, 2.9], 0.2, 0.1, 0xd8e2ec, { c2: 0xffffff });
    a.circle(lean, 3.5, 1.1, 0x23b8a0, { c2: 0x9ff8e0 });
    a.ellipse(lean - 0.25, 3.9, 0.5, 0.34, 0xc8fff0);
    a.ellipse(lean, 3.45, 1.4, 0.16, 0xffffff, { glow: true });
    a.ellipse(lean, 3.5, 1.24, 0.1, 0x23b8a0);
    a.circle(lean, 4.72, 0.13, 0xfff8d0, { glow: true });
  },
  tower(a, R) {
    const h = 10 + R() * 12, w = 1.5 + R() * 1.2;
    a.fill(`M ${-w} -0.4 Q ${-w * 0.9} ${h * 0.6} ${-w * 0.56} ${h} L ${w * 0.56} ${h} Q ${w * 0.9} ${h * 0.6} ${w} -0.4 Z`, 0xcfdae6, { c2: 0xffffff });
    const n = Math.floor(h / 1.5);
    for (let i = 1; i < n; i++) {
      if (R() < 0.3) continue;
      const y = i * 1.5, ww = w * (1 - (0.44 * y) / h);
      a.rrect(-ww * 0.86, y, ww * 1.72, 0.2, 0.08, R() > 0.5 ? 0x3fe8d0 : 0xfff0b0, { glow: true });
    }
    a.fill(`M ${-w * 0.56} ${h} Q 0 ${h + 1.8} ${w * 0.56} ${h} Z`, 0xb8c8d8, { c2: 0xe8f0f8 });
    a.rect(-0.03, h + 0.8, 0.06, 2.6, 0xffffff);
    a.circle(0, h + 3.5, 0.14, 0xff5a6a, { glow: true });
  },
  dome(a) {
    a.fill('M -3.3 0 Q -3.3 2.9 0 2.9 Q 3.3 2.9 3.3 0 Z', 0xcfdae6, { c2: 0xffffff });
    a.rrect(-3.5, -0.3, 7.0, 0.5, 0.2, 0x9fb2c8);
    a.fill('M -2.9 1.3 Q 0 1.75 2.9 1.3 L 2.86 1.42 Q 0 1.88 -2.86 1.42 Z', 0x3fe8d0, { glow: true });
    a.rrect(-0.55, 0.2, 1.1, 1.3, 0.3, 0x9ff8f0, { glow: true, c2: 0xe8ffff });
    a.fill('M -1.6 2.5 Q 0 3.1 1.6 2.5 Q 0 2.86 -1.6 2.5 Z', 0xffffff);
  },
  holoSign(a, R) {
    a.stroke([0, -0.3, 0, 1.5], 0.16, 0.08, 0xd8e2ec);
    const c = [0x3fe8d0, 0xff8ad8, 0xfff0b0][Math.floor(R() * 3)];
    a.rrect(-1.4, 1.7, 2.8, 1.6, 0.12, c, { glow: true, c2: 0xffffff });
    a.rrect(-1.1, 2.8, 1.7, 0.16, 0.06, 0xffffff, { glow: true });
    a.rrect(-1.1, 2.45, 1.1, 0.16, 0.06, 0xffffff, { glow: true });
    a.circle(0.9, 2.2, 0.24, 0xffffff, { glow: true });
  },
  antenna(a) {
    a.stroke([0, -0.3, 0, 5.6], 0.16, 0.04, 0xd8e2ec, { c2: 0xffffff });
    for (const [y, r] of [[3.6, 0.5], [4.4, 0.34]]) {
      a.ellipse(0, y, r, 0.07, 0x3fe8d0, { glow: true });
      a.ellipse(0, y + 0.02, r * 0.8, 0.04, 0xd8e2ec);
    }
    a.circle(0, 5.7, 0.12, 0xff5a6a, { glow: true });
  },
  lampFuture(a) {
    a.stroke([0, -0.3, 0, 3.2], 0.09, 0.06, 0xd8e2ec, { c2: 0xffffff });
    a.circle(0, 3.55, 0.36, 0x9ff8f0, { glow: true });
    a.circle(0, 3.55, 0.25, 0xd8e2ec);
    a.circle(0, 3.55, 0.12, 0xffffff, { glow: true });
  },
  drone(a) {
    a.fill('M -0.16 0.02 L 0 0.3 L 0.16 0.02 Z', 0x3fe8d0, { glow: true });
    a.ellipse(0, 0.52, 0.6, 0.1, 0x55708e);
    a.ellipse(0, 0.56, 0.4, 0.3, 0xd8e2ec, { c2: 0xffffff });
    a.circle(0.2, 0.56, 0.12, 0xff3a4a, { glow: true });
    a.rect(-0.02, 0.84, 0.04, 0.18, 0x55708e);
  },
  pylon(a) {
    a.fill('M -0.4 0 L -0.26 0.3 L 0.26 0.3 L 0.4 0 Z', 0x74889e);
    a.fill('M -0.2 0.3 L -0.12 1.02 L 0.12 1.02 L 0.2 0.3 Z', 0xd8e2ec, { c2: 0xffffff });
    a.poly([0, 0.98, 0.18, 1.2, 0, 1.44, -0.18, 1.2], 0xff8a3a, { glow: true });
    a.ellipse(0, 0.74, 0.32, 0.05, 0xff8a3a, { glow: true });
  },

  // ============================ END OF TIME ============================
  crystal(a, R) {
    const p = R() > 0.5 ? [0x6a45d8, 0xd8c0ff, 0xb090ff] : [0xd89a2a, 0xfff0b0, 0xffcf5a];
    const sh = (x, h, w, lean) => {
      a.poly([x - w, -0.3, x - w * 0.8 + lean * 0.5, h * 0.7, x + lean, h, x + w * 0.9 + lean * 0.5, h * 0.62, x + w, -0.3], p[0], { c2: p[1] });
      a.poly([x + lean, h, x + w * 0.9 + lean * 0.5, h * 0.62, x + w, -0.3, x + w * 0.2, -0.3], p[2]);
    };
    sh(0, 2.3 + R(), 0.42, (R() - 0.5) * 0.6);
    sh(0.5, 1.2 + R() * 0.6, 0.26, 0.35);
    a.poly([-0.5, -0.3, -0.62, 0.7, -0.4, 1.0, -0.26, 0.6, -0.2, -0.3], p[1], { glow: true });
  },
  hourglass(a) {
    a.rrect(-1.1, -0.3, 2.2, 0.5, 0.1, 0xb8863a, { c2: 0xe8b85a });
    a.rrect(-1.1, 3.6, 2.2, 0.34, 0.1, 0xb8863a, { c2: 0xe8b85a });
    for (const x of [-0.95, 0.95]) a.rect(x - 0.05, 0.2, 0.1, 3.4, 0xc89a4a);
    a.fill('M -0.8 3.6 Q -0.8 2.5 -0.08 1.96 L 0.08 1.96 Q 0.8 2.5 0.8 3.6 Z', 0xaec0ee, { c2: 0xeef3ff });
    a.fill('M -0.8 0.2 Q -0.8 1.3 -0.08 1.84 L 0.08 1.84 Q 0.8 1.3 0.8 0.2 Z', 0xaec0ee, { c2: 0xeef3ff });
    a.fill('M -0.62 0.24 Q -0.2 0.9 0 1.0 Q 0.2 0.9 0.62 0.24 Z', 0xffcf5a, { glow: true });
    a.rect(-0.02, 0.9, 0.04, 1.2, 0xffcf5a, { glow: true });
    a.fill('M -0.5 3.2 Q 0 2.86 0.5 3.2 Q 0.3 2.6 0 2.2 Q -0.3 2.6 -0.5 3.2 Z', 0xffe9a8, { glow: true });
  },
  brokenColumn(a, R) {
    const h = 1.6 + R() * 2.6;
    a.rrect(-0.62, -0.3, 1.24, 0.6, 0.06, 0x625a86, { c2: 0x7f77a6 });
    a.fill(`M -0.4 0.3 L -0.36 ${h} L -0.1 ${h + 0.3} L 0.12 ${h - 0.1} L 0.38 ${h + 0.16} L 0.4 0.3 Z`, 0x736b9a, { c2: 0xa39bca });
    for (const x of [-0.22, -0.04, 0.14]) a.rect(x, 0.4, 0.05, h - 0.5, 0x5f5786);
    a.rect(-0.3, 0.3 + h * 0.55, 0.6, 0.05, 0xffcf5a, { glow: true });
    a.fill('M 0.8 -0.3 L 0.9 0.2 L 1.5 0.3 L 1.7 -0.3 Z', 0x736b9a);
  },
  clockRuin(a, R) {
    a.ellipse(0, 2.1, 2.5, 2.4, 0xb8863a, { c2: 0xe8b85a });
    a.ellipse(0, 2.1, 2.24, 2.14, 0xd9d0b8, { c2: 0xfaf4e0 });
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * PI * 2, r0 = i % 3 ? 1.86 : 1.7;
      a.stroke([Math.cos(ang) * r0, 2.1 + Math.sin(ang) * r0 * 0.955, Math.cos(ang) * 2.06, 2.1 + Math.sin(ang) * 2.06 * 0.955], i % 3 ? 0.07 : 0.13, i % 3 ? 0.07 : 0.13, 0x2a2440);
    }
    a.stroke([0, 2.1, 0.7, 3.5], 0.14, 0.05, 0xffcf5a, { glow: true });
    a.stroke([0, 2.1, -1.1, 2.6], 0.12, 0.05, 0xffcf5a, { glow: true });
    a.circle(0, 2.1, 0.16, 0xb8863a);
    a.poly([-0.5, 4.5, 0.1, 3.4, -0.3, 2.9, 0.4, 2.0, 0.34, 2.02, -0.38, 2.9, 0.02, 3.4, -0.56, 4.5], 0x2a2440);
  },
  gearRuin(a, R) {
    a.gear(0, 0.7, 1.35, 10, 0xa87830, { c2: 0xe8b85a, hole: 0.34, holeColor: 0x2a2440 });
    a.gear(1.5, 0.2, 0.74, 8, 0x7a5f92, { c2: 0xa88fc0, hole: 0.3, holeColor: 0x2a2440 });
  },
  shard(a) {
    a.poly([-0.3, 0, -0.18, 0.66, 0.02, 1.0, 0.24, 0.56, 0.3, 0], 0x6a45d8, { c2: 0xe0d0ff });
    a.poly([0.02, 1.0, 0.24, 0.56, 0.3, 0, 0.08, 0], 0xb090ff);
    a.poly([0.26, 0, 0.36, 0.44, 0.52, 0.66, 0.62, 0.3, 0.6, 0], 0xffb83a, { glow: true, c2: 0xfff0b0 });
    a.poly([-0.6, 0, -0.52, 0.36, -0.4, 0.56, -0.3, 0.2, -0.3, 0], 0x8a6ae8, { c2: 0xd8c8ff });
  },
  gearHalf(a) {
    a.gear(0, 0.34, 0.66, 9, 0xa87830, { c2: 0xf0c060 });
    a.gear(0, 0.34, 0.3, 7, 0xffcf5a, { glow: true });
  },
};

// Registry with a handful of variants per prop ------------------------------
const cache = new Map();
const VARIANT_COUNT = { pine: 4, rockSnow: 2, cycad: 3, fern: 3, giantTree: 2, saguaro: 3, maple: 4, house50: 4, car50: 4,
  mesaRock: 2, arcadeTower: 4, neonSign: 3, tower: 4, crystal: 3, brokenColumn: 2, palmNeon: 3, billboard: 3, mushroom: 2,
  car80: 3, holoSign: 3, podTree: 2, tuft: 2, deadTree: 1 };

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
    const art = new Art(seed);
    fn(art, mulberry32(seed ^ 0x5bd1e995));
    p = art.build();
    cache.set(key, p);
  }
  return p;
}
