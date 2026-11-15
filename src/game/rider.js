// Procedural rider. A smooth-shaded IK puppet (tapered limbs, toon light, warm
// rim) animated by layered systems: blended key poses, physical springs on the
// hands and loose limbs (follow-through, ragdoll falls), cloth ribbons for
// capes and hair, and a board that parts company with its rider on a crash.
import * as THREE from 'three';
import { RIDERS, BOARDS } from './catalog.js';
import { ENV, toonMat } from './shade.js';
import { damp, lerp, clamp } from '../core/math.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const _d = V(), _n = V(), _p = V(), _w = V(), _w2 = V();
const _q = new THREE.Quaternion();
const _c = new THREE.Color();

// ---- shared geometry -------------------------------------------------------
/** Unit-length rounded limb along Y; rA / rB = radius at the start / end (0.5 = full thickness). */
function taper(rA, rB) {
  const pts = [], n = 7;
  for (let i = 0; i <= n; i++) {
    const a = ((i / n) * Math.PI) / 2;
    pts.push(new THREE.Vector2(Math.sin(a) * rA, -0.5 + (1 - Math.cos(a)) * rA * 0.55));
  }
  for (let i = n; i >= 0; i--) {
    const a = ((i / n) * Math.PI) / 2;
    pts.push(new THREE.Vector2(Math.sin(a) * rB, 0.5 - (1 - Math.cos(a)) * rB * 0.55));
  }
  return new THREE.LatheGeometry(pts, 16);
}
function lathe(profile) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 18);
}
const G = {
  ball: new THREE.SphereGeometry(1, 20, 16),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 20),
  box: new THREE.BoxGeometry(1, 1, 1),
  thigh: taper(0.5, 0.4),
  shin: taper(0.38, 0.5), // baggy trousers: wider over the boot
  uarm: taper(0.5, 0.4),
  farm: taper(0.4, 0.46), // sleeve gathered into a cuff
  torso: lathe([[0, -0.5], [0.34, -0.48], [0.46, -0.38], [0.45, -0.16], [0.41, 0.02], [0.47, 0.22], [0.5, 0.33], [0.4, 0.44], [0.2, 0.5], [0, 0.5]]),
  hem: new THREE.CylinderGeometry(0.47, 0.6, 1, 20, 1, true),
  // muffler wound around the neck
  ring: (() => {
    const g = new THREE.TorusGeometry(0.085, 0.045, 10, 22);
    g.rotateX(Math.PI / 2);
    return g;
  })(),
  deck: (() => {
    // snowboard outline: rounded tips, slight waist
    const s = new THREE.Shape();
    const L = 0.86, W = 0.19;
    s.moveTo(-L + 0.2, -W);
    s.quadraticCurveTo(0, -W * 0.82, L - 0.2, -W);
    s.quadraticCurveTo(L + 0.02, -W, L, 0);
    s.quadraticCurveTo(L + 0.02, W, L - 0.2, W);
    s.quadraticCurveTo(0, W * 0.82, -L + 0.2, W);
    s.quadraticCurveTo(-L - 0.02, W, -L, 0);
    s.quadraticCurveTo(-L - 0.02, -W, -L + 0.2, -W);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.045, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 10 });
    g.rotateX(Math.PI / 2);
    // upturned nose and tail
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), k = Math.max(0, Math.abs(x) - 0.52);
      pos.setY(i, pos.getY(i) + k * k * 0.75);
    }
    g.computeVertexNormals();
    return g;
  })(),
};
const L_THIGH = 0.42, L_SHIN = 0.4, L_UARM = 0.26, L_FARM = 0.25;
const HEAD = 1.24; // a slightly oversized head reads better at game scale
const FOOT_Y = 0.2; // ankle height above the board
const PIVOT = 0.52; // height of the body's centre: spins turn around it, not around the feet

function bone(mesh, a, b, tx, tz, extra = 0.06) {
  _d.subVectors(b, a);
  const len = _d.length() || 1e-4;
  mesh.position.copy(a).addScaledVector(_d, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, _d.multiplyScalar(1 / len));
  mesh.scale.set(tx, len + extra, tz);
}
function ik(a, b, l1, l2, bend, joint, end) {
  _d.subVectors(b, a);
  let d = _d.length() || 1e-4;
  _n.copy(_d).multiplyScalar(1 / d);
  d = clamp(d, Math.abs(l1 - l2) + 0.02, l1 + l2 - 0.004);
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  _p.copy(bend).addScaledVector(_n, -bend.dot(_n));
  if (_p.lengthSq() < 1e-6) _p.set(0, 0, 1);
  _p.normalize();
  joint.copy(a).addScaledVector(_n, along).addScaledVector(_p, h);
  end.copy(a).addScaledVector(_n, d);
}

// ---- key poses ---------------------------------------------------------------
// Body space: x = direction of travel, y = up, z = towards the camera. The rider
// stands sideways: "l" limbs are the rear ones, "r" the leading ones. Hands are
// given relative to the chest, feet relative to the board.
function makePose() {
  return {
    crouch: 0.35, lean: 0.05, bend: 0.25, twist: 0.5, headYaw: 0.9, headPitch: 0, hipX: 0, hipY: 0,
    hl: V(-0.42, -0.12, 0.12), hr: V(0.44, -0.05, 0.18), fl: V(-0.27, FOOT_Y, 0), fr: V(0.27, FOOT_Y, 0),
  };
}
const POSES = {
  ride(o, t, k = 0) {
    // k = 0..1 with speed: the faster, the lower and the more committed
    o.crouch = 0.34 + k * 0.12 + Math.sin(t * 1.7) * 0.018; o.lean = 0.12 + k * 0.08; o.bend = 0.28; o.twist = 0.58; o.headYaw = 1.0;
    o.hipX = Math.sin(t * 0.9) * 0.012;
    o.hl.set(-0.4, -0.04 + k * 0.08 + Math.sin(t * 2.1) * 0.03, 0.04); // rear arm: out behind, for balance
    o.hr.set(0.36, -0.22 + Math.sin(t * 1.9 + 1) * 0.03, 0.2); // leading arm: low and forward
  },
  boost(o) {
    o.crouch = 0.66; o.lean = 0.4; o.bend = 0.55; o.twist = 0.8; o.headYaw = 0.85; o.headPitch = -0.18;
    o.hl.set(-0.5, 0.1, -0.06); o.hr.set(0.24, -0.3, 0.24);
  },
  pop(o) {
    o.crouch = 0.02; o.lean = -0.05; o.bend = 0.05; o.twist = 0.45; o.headYaw = 0.9; o.headPitch = -0.1; o.hipY = 0.04;
    o.hl.set(-0.42, 0.34, 0.04); o.hr.set(0.44, 0.4, 0.1);
  },
  air(o, t) {
    o.crouch = 0.44; o.lean = 0.03; o.bend = 0.2; o.twist = 0.5; o.headYaw = 0.95;
    o.hl.set(-0.48, 0.2 + Math.sin(t * 5) * 0.035, 0.02); o.hr.set(0.44, 0.08 + Math.sin(t * 5 + 2) * 0.035, 0.14);
  },
  tuck(o) {
    // grab: knees to the chest, leading hand on the edge of the board
    o.crouch = 0.97; o.lean = 0.14; o.bend = 0.75; o.twist = 0.35; o.headYaw = 0.6; o.headPitch = 0.3;
    o.hl.set(-0.42, 0.16, -0.02); o.hr.set(0.28, -0.72, 0.1);
  },
  landing(o) {
    // legs reaching for the ground, arms spread
    o.crouch = 0.1; o.lean = -0.06; o.bend = 0.12; o.twist = 0.5; o.headYaw = 0.9; o.headPitch = 0.2;
    o.hl.set(-0.52, 0.06, 0.02); o.hr.set(0.52, 0.02, 0.1);
  },
  grind(o, t) {
    o.crouch = 0.52; o.lean = -0.08 + Math.sin(t * 3.1) * 0.05; o.bend = 0.3; o.twist = 1.0; o.headYaw = 0.5;
    o.hl.set(-0.54, 0.1 + Math.sin(t * 9) * 0.05, 0.02); o.hr.set(0.54, 0.14 + Math.sin(t * 8 + 2) * 0.05, 0.04);
  },
  recover(o) {
    // getting back up after a fall: one hand still on the snow
    o.crouch = 0.84; o.lean = 0.1; o.bend = 0.5; o.twist = 0.5; o.headYaw = 0.8; o.headPitch = 0.3;
    o.hl.set(-0.3, -0.5, 0.1); o.hr.set(0.34, -0.22, 0.2);
  },
  // falls: the springs do most of the work, these are only loose targets
  tumble(o) {
    o.crouch = 0.55; o.lean = 0; o.bend = 0.45; o.twist = 0.2; o.headYaw = 0.3; o.headPitch = 0.3;
    o.hl.set(-0.4, 0.1, 0.1); o.hr.set(0.4, 0.1, 0.1);
    o.fl.set(-0.2, 0.3, 0.05); o.fr.set(0.22, 0.26, 0.05);
  },
  lying(o) {
    o.crouch = 0.02; o.lean = 0; o.bend = -0.1; o.twist = 0.1; o.headYaw = 0.2; o.headPitch = -0.35;
    o.hl.set(-0.36, 0.42, 0.06); o.hr.set(0.34, 0.5, 0.06);
    o.fl.set(-0.17, 0.08, 0.02); o.fr.set(0.19, 0.09, 0.02);
  },
  falling(o, t) {
    o.crouch = 0.25 + Math.sin(t * 11) * 0.15; o.lean = 0; o.bend = -0.15; o.twist = Math.sin(t * 6) * 0.5; o.headYaw = 0.3; o.headPitch = -0.4;
    o.hl.set(-0.4 + Math.sin(t * 13) * 0.2, 0.42 + Math.cos(t * 12) * 0.14, 0.1); o.hr.set(0.4 + Math.sin(t * 12 + 2) * 0.2, 0.44 + Math.cos(t * 13) * 0.14, 0.1);
    o.fl.set(-0.2 + Math.sin(t * 10) * 0.12, 0.14, 0.05); o.fr.set(0.2 + Math.sin(t * 10 + 3) * 0.12, 0.16, 0.05);
  },
  idle(o, t) {
    o.crouch = 0.05 + Math.sin(t * 1.5) * 0.012; o.lean = 0; o.bend = 0.05; o.twist = 0; o.headYaw = 0; o.headPitch = 0;
    o.hl.set(-0.25, -0.43, 0.04); o.hr.set(0.25, -0.43, 0.04);
    o.fl.set(-0.12, 0.12, 0); o.fr.set(0.12, 0.12, 0);
  },
  wait(o, t) {
    // on the board at the top of the slope: weight shifting, looking around
    o.crouch = 0.14 + Math.sin(t * 1.5) * 0.014; o.lean = 0.02 + Math.sin(t * 0.5) * 0.02; o.bend = 0.12; o.twist = 0.4;
    o.headYaw = 0.45 + Math.sin(t * 0.45) * 0.45; o.headPitch = Math.sin(t * 0.3) * 0.08; o.hipX = Math.sin(t * 0.5) * 0.02;
    o.hl.set(-0.3, -0.38, 0.06); o.hr.set(0.3, -0.36 + Math.sin(t * 0.8) * 0.02, 0.1);
  },
  walk(o, t, k = 0) {
    o.crouch = 0.1 + Math.abs(Math.sin(k)) * 0.03; o.lean = 0; o.bend = 0.12; o.twist = Math.sin(k) * 0.12; o.headYaw = 0;
    o.fl.set(-0.11, 0.12 + Math.max(0, Math.cos(k)) * 0.1, Math.sin(k) * 0.24);
    o.fr.set(0.11, 0.12 + Math.max(0, -Math.cos(k)) * 0.1, -Math.sin(k) * 0.24);
    o.hl.set(-0.24, -0.38, -Math.sin(k) * 0.2 + 0.04); o.hr.set(0.24, -0.38, Math.sin(k) * 0.2 + 0.04);
  },
  talk(o, t) {
    POSES.idle(o, t);
    o.hr.set(0.3, -0.12 + Math.sin(t * 4.2) * 0.07, 0.3); o.hl.set(-0.28, -0.3 + Math.sin(t * 3.4 + 1) * 0.05, 0.2);
    o.headPitch = Math.sin(t * 2.6) * 0.07; o.twist = Math.sin(t * 1.3) * 0.08;
  },
  point(o, t) {
    POSES.idle(o, t);
    o.hr.set(0.36, 0.14, 0.34); o.twist = -0.2;
  },
  offer(o, t) {
    POSES.idle(o, t);
    o.hl.set(-0.2, -0.16, 0.42); o.hr.set(0.2, -0.16, 0.42); o.bend = 0.22;
  },
  cheer(o, t) {
    POSES.idle(o, t);
    o.crouch = 0.05 + Math.abs(Math.sin(t * 5.5)) * 0.09;
    o.hl.set(-0.3, 0.42, 0.05); o.hr.set(0.3, 0.42 + Math.sin(t * 11) * 0.03, 0.05); o.headPitch = -0.22;
  },
  fear(o, t) {
    POSES.idle(o, t);
    o.crouch = 0.3; o.bend = -0.1; o.hl.set(-0.2, 0.1, 0.3); o.hr.set(0.2, 0.12, 0.3); o.headPitch = -0.3;
  },
  menace(o, t) {
    POSES.idle(o, t);
    o.hl.set(-0.44, 0.2 + Math.sin(t * 2) * 0.03, 0.15); o.hr.set(0.44, 0.26 + Math.sin(t * 2 + 1) * 0.03, 0.15); o.headPitch = 0.12;
  },
  reach(o, t) {
    POSES.ride(o, t);
    o.hr.set(0.5, 0.32, 0.2); o.crouch = 0.18; o.lean = 0.25;
  },
};
const ON_BOARD = { ride: 1, boost: 1, pop: 1, air: 1, tuck: 1, landing: 1, grind: 1, wait: 1, reach: 1, recover: 1 };
const LOOSE = { tumble: 1, lying: 1, falling: 1 };

/** What each rider wears on top of the catalogue colours. */
const STYLE = {
  nova: { scarf: 0x2ab7d6, hood: true, visor: true },
  tobias: { scarf: 0xffd23f },
  ada: { scarf: 0xffcf5a },
  rouage: {},
  elea: {},
  baron: { scarf: 0x8a1c30 },
};

/** Ribbons worn by each rider: scarves, capes, coat tails, hair. anchor = part + local offset. */
const RIBBONS = {
  nova: [
    { part: 'neck', off: [-0.07, 0.02, -0.06], len: 0.8, w0: 0.115, w1: 0.08, n: 9, color: () => 0x2ab7d6, z: -0.16 },
    { part: 'neck', off: [-0.06, -0.01, -0.08], len: 0.54, w0: 0.105, w1: 0.07, n: 7, color: () => 0x1f93b0, z: -0.18 },
    { part: 'head', off: [-0.02, 0.08, -0.15], len: 0.46, w0: 0.11, w1: 0.03, n: 6, color: (R) => R.hair, z: -0.14 },
  ],
  tobias: [
    { part: 'neck', off: [-0.07, 0.02, -0.06], len: 0.46, w0: 0.13, w1: 0.1, n: 6, color: () => 0xffd23f, z: -0.16 },
    { part: 'hip', off: [0, 0.06, -0.12], len: 0.3, w0: 0.34, w1: 0.32, n: 4, color: () => 0x2f7a46, z: -0.14 },
  ],
  ada: [
    { part: 'hip', off: [0, 0.08, -0.12], len: 0.66, w0: 0.36, w1: 0.34, n: 7, color: (R) => R.coat, z: -0.15 },
    { part: 'neck', off: [-0.06, 0.02, -0.06], len: 0.5, w0: 0.09, w1: 0.06, n: 6, color: () => 0xffcf5a, z: -0.17 },
  ],
  rouage: [],
  elea: [
    { part: 'head', off: [0, 0.1, -0.13], len: 0.85, w0: 0.05, w1: 0.012, n: 9, color: (R) => R.accent, z: -0.14, glow: true },
    { part: 'head', off: [0, 0.0, -0.13], len: 0.6, w0: 0.04, w1: 0.01, n: 7, color: () => 0xffffff, z: -0.15, glow: true },
  ],
  baron: [
    { part: 'chest', off: [0, 0.12, -0.13], len: 1.05, w0: 0.5, w1: 0.44, n: 9, color: () => 0x2a1c40, z: -0.17 },
    { part: 'neck', off: [-0.06, 0.02, -0.06], len: 0.4, w0: 0.1, w1: 0.07, n: 5, color: () => 0x8a1c30, z: -0.16 },
  ],
};

/** A strip of cloth simulated with Verlet integration and pinned at one end. */
class Ribbon {
  constructor(def, color) {
    this.def = def;
    const n = (this.n = def.n);
    this.seg = def.len / (n - 1);
    this.p = [];
    this.q = [];
    for (let i = 0; i < n; i++) { this.p.push(V()); this.q.push(V()); }
    this.posAttr = new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage);
    const idx = [];
    for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', this.posAttr);
    g.setIndex(idx);
    this.base = new THREE.Color(color);
    this.mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, fog: !def.glow });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.fresh = true;
    this.t = Math.random() * 9;
  }
  /** anchor: world position of the pinned end; vel: velocity of the wearer. */
  update(dt, anchor, vx, vy) {
    const { p, q, n, seg } = this;
    const tail = p[n - 1];
    // (re)hang the cloth after a teleport, or if the simulation ever went non-finite
    if (this.fresh || !(p[0].distanceToSquared(anchor) <= 9) || tail.x - tail.x !== 0 || tail.y - tail.y !== 0) {
      for (let i = 0; i < n; i++) { p[i].set(anchor.x, anchor.y - i * seg, anchor.z); q[i].copy(p[i]); }
      this.fresh = false;
    }
    this.t += dt;
    const h = Math.min(dt, 1 / 30) / 2;
    for (let s = 0; s < 2 && h > 0; s++) {
      p[0].copy(anchor); q[0].copy(anchor);
      for (let i = 1; i < n; i++) {
        const pt = p[i], pr = q[i];
        const vX = (pt.x - pr.x) / h || 0, vY = (pt.y - pr.y) / h || 0;
        // air drag relative to the rider's own wind, a little gravity, a little flutter
        const gust = Math.sin(this.t * 7 + i * 1.3) * (0.6 + Math.hypot(vx, vy) * 0.12);
        const ax = (-vx * 0.9 - vX) * 7 + gust * 2, ay = (-vy * 0.9 - vY) * 7 - 7.5 + gust * 1.2;
        pr.copy(pt);
        pt.x += vX * h * 0.985 + ax * h * h;
        pt.y += vY * h * 0.985 + ay * h * h;
        pt.z = anchor.z;
      }
      for (let it = 0; it < 3; it++) {
        for (let i = 1; i < n; i++) {
          const a = p[i - 1], b = p[i];
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-5, k = (d - seg) / d;
          b.x -= dx * k; b.y -= dy * k;
        }
      }
    }
    const arr = this.posAttr.array, D = this.def;
    for (let i = 0; i < n; i++) {
      const a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)];
      let nx = -(b.y - a.y), ny = b.x - a.x;
      const l = Math.hypot(nx, ny) || 1;
      const w = lerp(D.w0, D.w1, i / (n - 1)) * 0.5;
      nx = (nx / l) * w; ny = (ny / l) * w;
      arr[i * 6] = p[i].x + nx; arr[i * 6 + 1] = p[i].y + ny; arr[i * 6 + 2] = p[i].z;
      arr[i * 6 + 3] = p[i].x - nx; arr[i * 6 + 4] = p[i].y - ny; arr[i * 6 + 5] = p[i].z;
    }
    this.posAttr.needsUpdate = true;
    if (!D.glow) this.mat.color.copy(this.base).multiply(ENV.tint.value);
  }
}

export class RiderRig {
  constructor(riderId = 'nova', boardId = 'mk1') {
    this.root = new THREE.Group();
    this.tilt = new THREE.Group(); // board space: rotates with the slope and in flips
    this.boardG = new THREE.Group();
    this.body = new THREE.Group();
    this.tilt.add(this.boardG, this.body);
    this.root.add(this.tilt);
    this.pose = makePose();
    this.target = makePose();
    this.clock = Math.random() * 10;
    this.poseName = 'ride';
    this.poseParam = 0;
    this.squash = 0;
    this.squashV = 0;
    this.blend = 12;
    this.extraCrouch = 0;
    this.extraLean = 0;
    this.speedHint = 0;
    this.velX = 0;
    this.velY = 0;
    this.detached = false;
    this.free = null; // detached board physics
    this.groundFn = null; // (x) => ground height | null, for the loose board
    this.ghost = false;
    this.mats = new Map();
    this.ribbons = [];
    this.eff = { hl: { p: V(), v: V(), ok: false }, hr: { p: V(), v: V(), ok: false }, fl: { p: V(), v: V(), ok: false }, fr: { p: V(), v: V(), ok: false } };
    this.loose = 0; // 0 = controlled limbs, 1 = ragdoll
    this.airK = 0; // 1 while airborne: the body spins around its centre
    this.slope = 0; // slope under the rider (reference for the spin pivot)
    this.recover = 0; // seconds left of the "getting back up" pose
    this.riderId = null;
    this.boardId = null;
    this.set(riderId, boardId);
  }

  mat(color, glow = false, double = false) {
    const key = (glow ? 'g' : 'l') + (double ? 'd' : '') + color;
    let m = this.mats.get(key);
    if (!m) {
      m = toonMat(color, { glow, ghost: this.ghost, double });
      this.mats.set(key, m);
    }
    return m;
  }
  part(parent, geo, color, sx, sy, sz, x = 0, y = 0, z = 0, glow = false) {
    const m = new THREE.Mesh(geo, this.mat(color, glow, geo === G.hem));
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  /** Kept for callers: the tint now reaches every rider through shared uniforms. */
  setTint() {}

  setGhost(on) {
    this.ghost = on;
    const r = this.riderId, b = this.boardId;
    this.riderId = this.boardId = null;
    this.set(r, b);
  }

  _clear() {
    for (const m of this.mats.values()) m.dispose();
    this.mats.clear();
    for (const rb of this.ribbons) {
      rb.mesh.removeFromParent();
      rb.mesh.geometry.dispose();
      rb.mat.dispose();
    }
    this.ribbons = [];
    this.body.clear();
    this.boardG.clear();
  }

  /** (Re)build the puppet for a rider / board pair. */
  set(riderId, boardId) {
    if (riderId === this.riderId && boardId === this.boardId) return;
    this._clear();
    this.riderId = riderId;
    this.boardId = boardId;
    const R = (this.def = RIDERS[riderId] || RIDERS.nova);
    const B = (this.boardDef = BOARDS[boardId] || BOARDS.mk1);
    const ST = (this.style = STYLE[riderId] || {});
    const k = (this.bulk = R.bulk);
    this.body.scale.setScalar(R.scale);
    const dark = (hex, f) => _c.set(hex).multiplyScalar(f).getHex();

    // ---- board: deck, inlay, bindings, light strip underneath
    const bg = this.boardG;
    this.part(bg, G.deck, B.deck, 1, 1, 1, 0, 0.1, 0);
    this.part(bg, G.box, B.trim, 0.9, 0.012, 0.1, 0, 0.118, 0);
    for (const x of [-0.27, 0.27]) {
      this.part(bg, G.box, dark(B.trim, 0.8), 0.2, 0.04, 0.3, x, 0.125, 0);
      this.part(bg, G.box, B.trim, 0.2, 0.13, 0.03, x, 0.19, -0.15); // highback
    }
    this.part(bg, G.box, B.glow, 1.2, 0.02, 0.2, 0, 0.04, 0, true);

    // ---- body
    const b = this.body, P = (this.parts = {});
    P.pelvis = this.part(b, G.ball, R.pants, 0.17 * k, 0.13, 0.125 * k);
    P.torso = this.part(b, G.torso, R.jacket, 1, 1, 1);
    P.hem = this.part(b, G.hem, dark(R.jacket, 0.86), 0.37 * k, 0.16, 0.26 * k);
    for (const s of ['L', 'R']) {
      // the far limbs are a shade darker: free depth, as in an illustration
      const f = s === 'L' ? 0.82 : 1;
      P['thigh' + s] = this.part(b, G.thigh, dark(R.pants, f), 1, 1, 1);
      P['shin' + s] = this.part(b, G.shin, dark(R.pants, f), 1, 1, 1);
      const foot = (P['foot' + s] = new THREE.Group());
      b.add(foot);
      this.part(foot, G.cyl, dark(R.boots, f * 1.25), 0.082 * k, 0.13, 0.085 * k, 0, 0.0, 0);
      this.part(foot, G.ball, dark(R.boots, f), 0.085 * k, 0.068, 0.155, 0, -0.07, 0.045);
      this.part(foot, G.box, dark(R.boots, f * 0.7), 0.15 * k, 0.03, 0.3, 0, -0.118, 0.045);
      P['sh' + s] = this.part(b, G.ball, dark(R.jacket, f), 0.082 * k, 0.082 * k, 0.082 * k);
      P['uArm' + s] = this.part(b, G.uarm, dark(R.jacket, f), 1, 1, 1);
      P['fArm' + s] = this.part(b, G.farm, dark(R.jacket, f), 1, 1, 1);
      P['hand' + s] = this.part(b, G.ball, dark(R.glove, f), 0.064, 0.074, 0.06);
    }
    if (R.pack !== undefined) {
      P.pack = this.part(b, G.torso, R.pack, 0.26, 0.32, 0.16);
      P.packGlow = this.part(b, G.ball, R.accent, 0.05, 0.05, 0.05, 0, 0, 0, true);
    }
    if (!R.robot) P.belt = this.part(b, G.cyl, R.accent, 0.172 * k, 0.035, 0.122 * k);
    P.collar = this.part(b, G.cyl, dark(R.jacket, 1.12), 0.1, 0.07, 0.1);
    if (ST.scarf !== undefined) P.scarf = this.part(b, G.ring, ST.scarf, 1.12, 1.25, 1.12);
    if (ST.hood) P.hood = this.part(b, G.ball, dark(R.jacket, 0.9), 0.125, 0.105, 0.085);

    // ---- head
    const h = (P.head = new THREE.Group());
    h.scale.setScalar(HEAD);
    b.add(h);
    const eyes = () => {
      this.part(h, G.ball, 0x1c1c24, 0.016, 0.022, 0.012, -0.05, 0.012, 0.123);
      this.part(h, G.ball, 0x1c1c24, 0.016, 0.022, 0.012, 0.05, 0.012, 0.123);
    };
    if (R.head === 'robot') {
      this.part(h, G.torso, R.skin, 0.3, 0.25, 0.27);
      this.part(h, G.ball, R.accent, 0.1, 0.04, 0.03, 0, 0.02, 0.125, true);
      this.part(h, G.cyl, R.pants, 0.012, 0.16, 0.012, 0.06, 0.19, 0);
      this.part(h, G.ball, R.accent, 0.034, 0.034, 0.034, 0.06, 0.28, 0, true);
      this.part(h, G.cyl, R.pants, 0.05, 0.31, 0.05).rotation.z = Math.PI / 2;
    } else {
      this.part(h, G.ball, R.skin, 0.128, 0.142, 0.13);
      this.part(h, G.ball, R.skin, 0.02, 0.022, 0.02, 0, -0.02, 0.128);
      if (R.head === 'helmet') {
        this.part(h, G.ball, R.jacket, 0.156, 0.16, 0.162, 0, 0.02, -0.015);
        this.part(h, G.ball, R.accent, 0.11, 0.05, 0.04, 0, 0.015, 0.125, true);
        this.part(h, G.ball, R.accent, 0.016, 0.016, 0.1, 0, 0.175, -0.02, true);
      } else {
        this.part(h, G.ball, R.hair, 0.14, 0.118, 0.148, 0, 0.042, -0.026);
        if (R.head === 'goggles') {
          // worn over the eyes (Nova) or pushed up on the forehead (Ada)
          const gy = ST.visor ? 0.018 : 0.078;
          this.part(h, G.cyl, 0x23232c, 0.137, 0.05, 0.137, 0, gy, 0);
          this.part(h, G.ball, R.accent, 0.1, 0.042, 0.034, 0, gy, 0.118, true);
          if (!ST.visor) eyes();
        } else if (R.head === 'beanie') {
          this.part(h, G.ball, R.accent, 0.148, 0.12, 0.148, 0, 0.074, -0.01);
          this.part(h, G.cyl, R.jacket, 0.15, 0.046, 0.15, 0, 0.045, -0.005);
          this.part(h, G.ball, 0xffffff, 0.048, 0.048, 0.048, 0, 0.205, -0.01);
          eyes();
        } else if (R.head === 'tophat') {
          this.part(h, G.cyl, 0x0e0c14, 0.2, 0.02, 0.2, 0, 0.12, 0);
          this.part(h, G.cyl, 0x0e0c14, 0.125, 0.25, 0.125, 0, 0.25, 0);
          this.part(h, G.cyl, R.accent, 0.128, 0.04, 0.128, 0, 0.155, 0, true);
          this.part(h, G.cyl, R.accent, 0.034, 0.012, 0.034, 0.05, 0.012, 0.128, true).rotation.x = Math.PI / 2;
          this.part(h, G.ball, R.hair, 0.07, 0.016, 0.02, 0, -0.05, 0.122);
          eyes();
        } else eyes();
        if (R.hair3d === 'bun') this.part(h, G.ball, R.hair, 0.066, 0.066, 0.066, 0, 0.13, -0.09);
        if (R.hair3d === 'ponytail') this.part(h, G.ball, R.hair, 0.05, 0.05, 0.05, 0, 0.08, -0.15);
      }
    }
    // ---- cloth
    for (const def of RIBBONS[riderId] || []) {
      const rb = new Ribbon(def, def.color(R));
      if (this.ghost) { rb.mat.transparent = true; rb.mat.opacity = 0.45; rb.mat.depthWrite = false; }
      this.ribbons.push(rb);
    }
    this.tmp = { hip: V(), chest: V(), neck: V(), spine: V(), a: V(), b: V(), j: V(), e: V(), bend: V() };
    for (const e of Object.values(this.eff)) e.ok = false;
    this.apply(0);
  }

  // ---- control -----------------------------------------------------------
  /** Cinematic / menu control. */
  play(name, param = 0, blend = 10) {
    this.poseName = name;
    this.poseParam = param;
    this.blend = blend;
  }
  kickSquash(amount) {
    this.squashV += amount * 9;
  }

  /** Drive the puppet from a Player. env: { ground, curv, slope } at the rider's position. */
  drive(dt, p, env) {
    const ground = env && env.ground !== undefined ? env.ground : p.y;
    const above = p.y - ground;
    const speed = Math.hypot(p.vx, p.vy);
    this.recover = Math.max(0, this.recover - dt);
    let name = 'ride';
    if (p.crashed) name = p.crashType === 'fall' || (above < -1 && !p.settled) ? 'falling' : p.settled ? 'lying' : 'tumble';
    else if (p.rail) name = 'grind';
    else if (!p.grounded && p.airTime > 0.1 && above > 0.25) {
      if (Math.abs(p.angVel) > 1.6) name = 'tuck';
      else if (p.vy < -2.5 && above < 1.9) name = 'landing';
      else if (p.jumped && p.airTime < 0.26) name = 'pop';
      else name = 'air';
    } else if (this.recover > 0) name = 'recover';
    else if (p.boosting) name = 'boost';
    this.poseName = name;
    this.poseParam = name === 'ride' ? clamp((speed - 11) / 13, 0, 1) : 0;
    this.blend = name === 'tuck' || name === 'pop' ? 18 : name === 'landing' ? 14 : name === 'recover' ? 7 : 11;
    // legs soak up dips and stretch over crests; the body leans into speed
    const curv = env && env.curv ? env.curv : 0;
    this.extraCrouch = name === 'ride' || name === 'boost' ? clamp((-curv * speed * speed) / 19, -0.14, 0.3) : 0;
    this.extraLean = 0;
    this.speedHint = speed;
    this.velX = p.vx;
    this.velY = p.vy;
    this.slope = env && env.slope !== undefined ? env.slope : this.tilt.rotation.z;
    const airborne = !p.grounded && !p.rail && !p.crashed && p.airTime > 0.05;
    this.airK = damp(this.airK, airborne ? 1 : 0, airborne ? 10 : 18, dt);
    if (p.crashed && !this.detached) this._detach(p);
    else if (!p.crashed && this.detached) {
      this._attach();
      this.recover = 0.55;
    }
    this.update(dt);
  }

  _detach(p) {
    this.detached = true;
    const scene = this.root.parent;
    if (!scene) return;
    this.tilt.updateWorldMatrix(true, false);
    const pos = this.boardG.getWorldPosition(V());
    scene.add(this.boardG);
    this.boardG.position.copy(pos);
    this.boardG.rotation.set(0, 0, this.tilt.rotation.z);
    this.free = { vx: p.vx * 0.55 + 1.5, vy: Math.max(3, p.vy * 0.3 + 5), spin: -6 - Math.random() * 5, rest: false };
  }
  _attach() {
    this.detached = false;
    this.free = null;
    this.tilt.add(this.boardG);
    this.boardG.position.set(0, 0, 0);
    this.boardG.rotation.set(0, 0, 0);
    for (const e of Object.values(this.eff)) e.ok = false;
  }

  update(dt) {
    this.clock += dt;
    const t = this.clock, T = this.target, P = this.pose;
    const onBoard = !!ON_BOARD[this.poseName];
    T.headPitch = 0; T.hipX = 0; T.hipY = 0;
    if (onBoard) {
      T.fl.set(-0.27, FOOT_Y, 0);
      T.fr.set(0.27, FOOT_Y, 0);
    }
    (POSES[this.poseName] || POSES.ride)(T, t, this.poseParam);
    T.crouch = clamp(T.crouch + this.extraCrouch, 0, 1);
    T.lean += this.extraLean;
    const k = 1 - Math.exp(-this.blend * dt);
    for (const key of ['crouch', 'lean', 'bend', 'twist', 'headYaw', 'headPitch', 'hipX', 'hipY']) P[key] += (T[key] - P[key]) * k;
    P.hl.lerp(T.hl, k); P.hr.lerp(T.hr, k); P.fl.lerp(T.fl, k); P.fr.lerp(T.fr, k);
    // landing squash: a slightly under-damped spring
    this.squashV += (-this.squash * 110 - this.squashV * 12) * dt;
    this.squash += this.squashV * dt;
    this.loose = damp(this.loose, LOOSE[this.poseName] ? 1 : 0, 14, dt);
    // pivots: flips turn around the centre of the body (kept where it would be on the
    // slope), tumbles around the hips lying close to the ground
    const L = clamp(this.loose, 0, 1);
    const c = PIVOT * this.airK * (1 - L), rz = this.tilt.rotation.z, sl = this.slope;
    const piv = L * 0.72;
    this.tilt.position.x = c * (Math.sin(rz) - Math.sin(sl));
    this.tilt.position.y = c * (Math.cos(sl) - Math.cos(rz)) + piv * 0.55;
    this.body.position.y = -piv;
    // loose board
    const f = this.free;
    if (f && !f.rest) {
      const bg = this.boardG;
      f.vy -= 19 * dt;
      bg.position.x += f.vx * dt;
      bg.position.y += f.vy * dt;
      bg.rotation.z += f.spin * dt;
      const gy = this.groundFn ? this.groundFn(bg.position.x) : null;
      if (gy !== null && gy !== undefined && bg.position.y < gy + 0.02) {
        bg.position.y = gy + 0.02;
        if (f.vy < -3) { f.vy = -f.vy * 0.35; f.spin *= 0.5; }
        else { f.vy = 0; f.spin *= Math.exp(-6 * dt); }
        f.vx *= Math.exp(-2.4 * dt);
        if (Math.abs(f.vx) < 0.3 && Math.abs(f.spin) < 0.4) f.rest = true;
      }
    }
    this.boardG.visible = this.detached ? true : onBoard || this.showBoard === true;
    this.apply(dt);
  }

  /** Physical spring on an end effector (world space): lag, overshoot, and ragdoll when loose. */
  _spring(e, local, dt, base) {
    this.tilt.localToWorld(_w.copy(local).applyMatrix4(this.body.matrix));
    if (!e.ok || e.p.distanceToSquared(_w) > 6 || dt <= 0) {
      e.p.copy(_w);
      e.v.set(0, 0, 0);
      e.ok = true;
    } else {
      const L = this.loose;
      const kS = lerp(base, 34, L), kD = lerp(Math.sqrt(base) * 1.5, 3.2, L);
      const h = Math.min(dt, 1 / 30);
      e.v.x += ((_w.x - e.p.x) * kS - e.v.x * kD) * h;
      e.v.y += ((_w.y - e.p.y) * kS - e.v.y * kD - 9 * L) * h;
      e.v.z += ((_w.z - e.p.z) * kS - e.v.z * kD) * h;
      e.p.addScaledVector(e.v, h);
    }
    this.tilt.worldToLocal(_w2.copy(e.p));
    return _w2.applyMatrix4(_inv.copy(this.body.matrix).invert());
  }

  apply(dt = 0) {
    const P = this.pose, S = this.parts, K = this.bulk, M = this.tmp;
    this.body.updateMatrix();
    this.tilt.updateWorldMatrix(true, false);
    const crouch = clamp(P.crouch + this.squash * 0.5, 0, 1);
    M.hip.set(P.hipX + P.lean * 0.1, lerp(0.97, 0.56, crouch) + P.hipY, 0.02 + crouch * 0.07);
    M.spine.set(P.lean * 0.55, 1, P.bend * 0.6).normalize();
    M.chest.copy(M.hip).addScaledVector(M.spine, 0.42);
    M.neck.copy(M.chest).addScaledVector(M.spine, 0.1);
    const cs = Math.cos(P.twist), sn = Math.sin(P.twist);

    S.pelvis.position.copy(M.hip);
    S.pelvis.position.y -= 0.01;
    S.pelvis.rotation.set(0, P.twist * 0.4, 0);
    if (S.belt) {
      S.belt.position.copy(M.hip).addScaledVector(M.spine, 0.085);
      S.belt.quaternion.setFromUnitVectors(UP, M.spine);
    }
    M.a.copy(M.hip).addScaledVector(M.spine, 0.04);
    M.b.copy(M.chest).addScaledVector(M.spine, 0.1);
    bone(S.torso, M.a, M.b, 0.38 * K, 0.265 * K, 0);
    _q.setFromAxisAngle(UP, P.twist);
    S.torso.quaternion.multiply(_q);
    S.hem.position.copy(M.hip).addScaledVector(M.spine, 0.03);
    S.hem.quaternion.copy(S.torso.quaternion);
    S.collar.position.copy(M.neck);
    S.collar.quaternion.setFromUnitVectors(UP, M.spine);
    if (S.scarf) {
      S.scarf.position.copy(M.neck).addScaledVector(M.spine, 0.035);
      S.scarf.quaternion.copy(S.collar.quaternion);
    }
    if (S.hood) {
      S.hood.position.copy(M.chest).addScaledVector(M.spine, 0.07);
      S.hood.position.x -= 0.13 * sn;
      S.hood.position.z -= 0.13 * cs;
      S.hood.quaternion.copy(S.torso.quaternion);
    }

    // legs (feet stay on the board unless the rider is thrown off)
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      let foot = s < 0 ? P.fl : P.fr;
      if (this.loose > 0.02) foot = this._spring(s < 0 ? this.eff.fl : this.eff.fr, foot, dt, 160);
      else (s < 0 ? this.eff.fl : this.eff.fr).ok = false;
      M.a.set(M.hip.x + s * 0.1 * K, M.hip.y - 0.05, M.hip.z);
      M.bend.set(s * 0.5, 0.1, 1);
      ik(M.a, foot, L_THIGH, L_SHIN, M.bend, M.j, M.e);
      bone(S['thigh' + n], M.a, M.j, 0.19 * K, 0.19 * K, 0.1);
      bone(S['shin' + n], M.j, M.e, 0.165 * K, 0.165 * K, 0.08);
      S['foot' + n].position.copy(M.e);
    }
    // arms (always sprung: they trail, overshoot and flail)
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      M.b.copy(M.chest).add(s < 0 ? P.hl : P.hr);
      const hand = this._spring(s < 0 ? this.eff.hl : this.eff.hr, M.b, dt, 210);
      M.b.copy(hand);
      M.a.set(M.chest.x + s * 0.2 * K * cs, M.chest.y + 0.05, M.chest.z - s * 0.2 * K * sn);
      S['sh' + n].position.copy(M.a);
      M.bend.set(s * 0.4, -0.7, -0.5);
      ik(M.a, M.b, L_UARM, L_FARM, M.bend, M.j, M.e);
      bone(S['uArm' + n], M.a, M.j, 0.135 * K, 0.135 * K, 0.08);
      bone(S['fArm' + n], M.j, M.e, 0.118 * K, 0.118 * K, 0.05);
      S['hand' + n].position.copy(M.e);
    }
    // head
    S.head.position.copy(M.neck).addScaledVector(M.spine, 0.175);
    S.head.rotation.set(P.headPitch, P.headYaw, 0, 'YXZ');
    if (S.pack) {
      S.pack.position.copy(M.chest).addScaledVector(M.spine, -0.12);
      S.pack.position.x -= 0.17 * sn;
      S.pack.position.z -= 0.17 * cs;
      S.pack.rotation.set(0, P.twist, 0);
      S.packGlow.position.copy(S.pack.position);
      S.packGlow.position.y += 0.2;
    }
    // cloth follows its anchor in world space
    if (this.ribbons.length) {
      const scene = this.root.parent;
      for (const rb of this.ribbons) {
        if (!scene) continue;
        if (rb.mesh.parent !== scene) scene.add(rb.mesh);
        const D = rb.def;
        const src = D.part === 'head' ? S.head.position : D.part === 'hip' ? M.hip : D.part === 'neck' ? M.neck : M.chest;
        _w.set(src.x + D.off[0], src.y + D.off[1], src.z + D.off[2]).applyMatrix4(this.body.matrix);
        this.tilt.localToWorld(_w);
        _w.z = this.root.position.z + D.z;
        rb.mesh.visible = this.root.visible;
        rb.update(dt, _w, this.velX, this.velY);
      }
    }
  }

  dispose() {
    this._clear();
    this.boardG.removeFromParent();
    this.root.removeFromParent();
  }
}
const _inv = new THREE.Matrix4();
