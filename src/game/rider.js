// Procedural low-poly rider: a small IK puppet built from boxes, posed by a
// handful of parameters (crouch, lean, hand targets...). No animation files.
import * as THREE from 'three';
import { RIDERS, BOARDS } from './catalog.js';
import { damp, lerp, clamp } from '../core/math.js';

const BOX = new THREE.BoxGeometry(1, 1, 1);
const BALL = new THREE.IcosahedronGeometry(1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 10);
const UP = new THREE.Vector3(0, 1, 0);
const _d = new THREE.Vector3(), _n = new THREE.Vector3(), _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

const L_THIGH = 0.43, L_SHIN = 0.43, L_UARM = 0.27, L_FARM = 0.26;

function bone(mesh, a, b, tx, tz, extra = 0.04) {
  _d.subVectors(b, a);
  const len = _d.length() || 1e-4;
  mesh.position.copy(a).addScaledVector(_d, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, _d.multiplyScalar(1 / len));
  mesh.scale.set(tx, len + extra, tz);
}

/** Two-bone IK. Writes the joint into `joint` and the (possibly clamped) end into `end`. */
function ik(a, b, l1, l2, bend, joint, end) {
  _d.subVectors(b, a);
  let d = _d.length() || 1e-4;
  _n.copy(_d).multiplyScalar(1 / d);
  d = clamp(d, Math.abs(l1 - l2) + 0.02, l1 + l2 - 0.005);
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  _p.copy(bend).addScaledVector(_n, -bend.dot(_n));
  if (_p.lengthSq() < 1e-6) _p.set(0, 0, 1);
  _p.normalize();
  joint.copy(a).addScaledVector(_n, along).addScaledVector(_p, h);
  end.copy(a).addScaledVector(_n, d);
}

function makePose() {
  return {
    crouch: 0.35, lean: 0.05, bend: 0.25, twist: 0.5, headYaw: 0.9, headPitch: 0, hipX: 0, hipY: 0,
    hl: V(-0.42, -0.12, 0.12), hr: V(0.44, -0.05, 0.18), fl: V(-0.27, 0.13, 0), fr: V(0.27, 0.13, 0),
  };
}

/** Pose library. `t` is a running clock, `k` a per-pose parameter. */
const POSES = {
  ride(o, t, k) {
    o.crouch = 0.36 + Math.sin(t * 2.3) * 0.03; o.lean = 0.08; o.bend = 0.25; o.twist = 0.5; o.headYaw = 0.95;
    o.hl.set(-0.42, -0.14 + Math.sin(t * 3.1) * 0.03, 0.12); o.hr.set(0.44, -0.06 + Math.sin(t * 2.7 + 1) * 0.03, 0.18);
  },
  boost(o, t) {
    o.crouch = 0.58; o.lean = 0.32; o.bend = 0.5; o.twist = 0.75; o.headYaw = 0.8;
    o.hl.set(-0.5, 0.02 + Math.sin(t * 14) * 0.02, -0.05); o.hr.set(0.3, -0.22, 0.24);
  },
  air(o, t) {
    o.crouch = 0.22; o.lean = 0; o.bend = 0.1; o.twist = 0.45; o.headYaw = 0.9;
    o.hl.set(-0.5, 0.16, 0.08); o.hr.set(0.5, 0.2, 0.1);
  },
  tuck(o, t) {
    o.crouch = 0.88; o.lean = 0; o.bend = 0.75; o.twist = 0.3; o.headYaw = 0.6; o.headPitch = 0.3;
    o.hl.set(-0.24, -0.42, 0.2); o.hr.set(0.3, -0.42, 0.2);
  },
  grind(o, t) {
    o.crouch = 0.5; o.lean = -0.1; o.bend = 0.3; o.twist = 1.0; o.headYaw = 0.5;
    o.hl.set(-0.52, 0.1 + Math.sin(t * 11) * 0.04, 0.05); o.hr.set(0.52, 0.12 + Math.sin(t * 9 + 2) * 0.04, 0.05);
  },
  crash(o, t) {
    o.crouch = 0.25 + Math.sin(t * 9) * 0.2; o.lean = Math.sin(t * 7) * 0.4; o.bend = 0.2; o.twist = Math.sin(t * 5) * 0.8;
    o.hl.set(-0.4 + Math.sin(t * 13) * 0.2, Math.sin(t * 11) * 0.35, Math.cos(t * 9) * 0.3);
    o.hr.set(0.4 + Math.sin(t * 12 + 2) * 0.2, Math.cos(t * 10) * 0.35, Math.sin(t * 8) * 0.3);
  },
  idle(o, t) {
    o.crouch = 0.06 + Math.sin(t * 1.6) * 0.012; o.lean = 0; o.bend = 0.05; o.twist = 0; o.headYaw = 0; o.headPitch = 0;
    o.hl.set(-0.25, -0.42, 0.04); o.hr.set(0.25, -0.42, 0.04);
    o.fl.set(-0.12, 0.07, 0); o.fr.set(0.12, 0.07, 0);
  },
  /** On the board, relaxed, waiting (menus). */
  wait(o, t) {
    o.crouch = 0.12 + Math.sin(t * 1.6) * 0.015; o.lean = 0; o.bend = 0.1; o.twist = 0.35; o.headYaw = 0.5 + Math.sin(t * 0.5) * 0.4;
    o.hl.set(-0.3, -0.36, 0.06); o.hr.set(0.3, -0.36 + Math.sin(t * 0.8) * 0.02, 0.1);
  },
  walk(o, t, k = 0) {
    // k is the walk phase (radians); the body faces +z
    o.crouch = 0.1 + Math.abs(Math.sin(k)) * 0.03; o.lean = 0; o.bend = 0.12; o.twist = Math.sin(k) * 0.12; o.headYaw = 0;
    o.fl.set(-0.11, 0.07 + Math.max(0, Math.cos(k)) * 0.1, Math.sin(k) * 0.24);
    o.fr.set(0.11, 0.07 + Math.max(0, -Math.cos(k)) * 0.1, -Math.sin(k) * 0.24);
    o.hl.set(-0.24, -0.38, -Math.sin(k) * 0.2 + 0.04); o.hr.set(0.24, -0.38, Math.sin(k) * 0.2 + 0.04);
  },
  talk(o, t) {
    POSES.idle(o, t);
    o.hr.set(0.3, -0.12 + Math.sin(t * 5) * 0.06, 0.3); o.hl.set(-0.28, -0.3 + Math.sin(t * 4 + 1) * 0.04, 0.2);
    o.headPitch = Math.sin(t * 3) * 0.06;
  },
  point(o, t) {
    POSES.idle(o, t);
    o.hr.set(0.36, 0.14, 0.34); o.twist = -0.2;
  },
  offer(o, t) {
    POSES.idle(o, t);
    o.hl.set(-0.2, -0.16, 0.42); o.hr.set(0.2, -0.16, 0.42); o.bend = 0.2;
  },
  cheer(o, t) {
    POSES.idle(o, t);
    o.crouch = 0.05 + Math.abs(Math.sin(t * 6)) * 0.08;
    o.hl.set(-0.3, 0.42, 0.05); o.hr.set(0.3, 0.42 + Math.sin(t * 12) * 0.03, 0.05); o.headPitch = -0.2;
  },
  fear(o, t) {
    POSES.idle(o, t);
    o.crouch = 0.3; o.bend = -0.1; o.hl.set(-0.2, 0.1, 0.3); o.hr.set(0.2, 0.12, 0.3); o.headPitch = -0.3;
  },
  menace(o, t) {
    POSES.idle(o, t);
    o.hl.set(-0.42, 0.2 + Math.sin(t * 2) * 0.03, 0.15); o.hr.set(0.42, 0.24 + Math.sin(t * 2 + 1) * 0.03, 0.15); o.headPitch = 0.12;
  },
  reach(o, t) {
    POSES.ride(o, t);
    o.hr.set(0.5, 0.3, 0.2); o.crouch = 0.2; o.lean = 0.25;
  },
};
const ON_BOARD = { ride: 1, boost: 1, air: 1, tuck: 1, grind: 1, crash: 1, wait: 1, reach: 1 };

export class RiderRig {
  constructor(riderId = 'nova', boardId = 'mk1') {
    this.root = new THREE.Group();
    this.tilt = new THREE.Group(); // board-space (rotates with the slope / flips)
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
    this.tail = 0;
    this.blend = 12;
    this.boardV = V();
    this.boardSpin = 0;
    this.detached = false;
    this.ghost = false;
    this.mats = new Map();
    this.riderId = null;
    this.boardId = null;
    this.set(riderId, boardId);
  }

  mat(color, glow = false) {
    const key = (glow ? 'g' : 'l') + color;
    let m = this.mats.get(key);
    if (!m) {
      m = glow ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color, flatShading: true });
      if (this.ghost) {
        m.transparent = true;
        m.opacity = 0.5;
        m.depthWrite = false;
      }
      this.mats.set(key, m);
    }
    return m;
  }

  part(parent, geo, color, sx, sy, sz, x = 0, y = 0, z = 0, glow = false) {
    const m = new THREE.Mesh(geo, this.mat(color, glow));
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  setGhost(on) {
    this.ghost = on;
    for (const m of this.mats.values()) m.dispose();
    this.mats.clear();
    const r = this.riderId, b = this.boardId;
    this.riderId = this.boardId = null;
    this.set(r, b);
  }

  /** (Re)build meshes for a rider/board pair. */
  set(riderId, boardId) {
    if (riderId === this.riderId && boardId === this.boardId) return;
    this.riderId = riderId;
    this.boardId = boardId;
    const R = (this.def = RIDERS[riderId] || RIDERS.nova);
    const B = (this.boardDef = BOARDS[boardId] || BOARDS.mk1);
    this.body.clear();
    this.boardG.clear();
    const k = R.bulk;
    this.bulk = k;
    this.body.scale.setScalar(R.scale);

    // ---- board
    const bg = this.boardG;
    this.part(bg, BOX, B.deck, 1.42, 0.05, 0.36, 0, 0.065, 0);
    const nose = this.part(bg, BOX, B.deck, 0.26, 0.05, 0.36, 0.8, 0.105, 0);
    nose.rotation.z = 0.38;
    const tail = this.part(bg, BOX, B.deck, 0.26, 0.05, 0.36, -0.8, 0.105, 0);
    tail.rotation.z = -0.38;
    this.part(bg, BOX, B.trim, 1.1, 0.012, 0.09, 0, 0.094, 0);
    this.part(bg, BOX, B.trim, 0.2, 0.03, 0.4, 0.27, 0.095, 0);
    this.part(bg, BOX, B.trim, 0.2, 0.03, 0.4, -0.27, 0.095, 0);
    this.glowStrip = this.part(bg, BOX, B.glow, 1.2, 0.022, 0.2, 0, 0.035, 0, true);
    this.part(bg, BOX, B.trim, 0.16, 0.07, 0.3, -0.62, 0.05, 0);

    // ---- body parts
    const b = this.body;
    const P = (this.parts = {});
    P.pelvis = this.part(b, BOX, R.pants, 0.3 * k, 0.17, 0.2 * k);
    P.torso = this.part(b, BOX, R.jacket, 1, 1, 1);
    for (const s of ['L', 'R']) {
      P['thigh' + s] = this.part(b, BOX, R.pants, 1, 1, 1);
      P['shin' + s] = this.part(b, BOX, R.pants, 1, 1, 1);
      P['foot' + s] = this.part(b, BOX, R.boots, 0.15 * k, 0.12, 0.28);
      P['uArm' + s] = this.part(b, BOX, R.jacket, 1, 1, 1);
      P['fArm' + s] = this.part(b, BOX, R.jacket, 1, 1, 1);
      P['hand' + s] = this.part(b, BOX, R.glove, 0.09, 0.1, 0.09);
    }
    if (R.coat !== undefined) {
      P.coat = new THREE.Group();
      this.part(P.coat, BOX, R.coat, 0.34 * k, 0.5, 0.05, 0, -0.25, 0);
      b.add(P.coat);
    }
    if (R.pack !== undefined) {
      P.pack = this.part(b, BOX, R.pack, 0.26, 0.3, 0.14);
      P.packGlow = this.part(b, BALL, R.accent, 0.05, 0.05, 0.05, 0, 0, 0, true);
    }
    if (!R.robot) P.belt = this.part(b, BOX, R.accent, 0.31 * k, 0.04, 0.21 * k);

    // ---- head
    const h = (P.head = new THREE.Group());
    b.add(h);
    if (R.head === 'robot') {
      this.part(h, BOX, R.skin, 0.27, 0.22, 0.24);
      this.part(h, BOX, R.accent, 0.2, 0.06, 0.02, 0, 0.02, 0.125, true);
      this.part(h, CYL, R.pants, 0.012, 0.14, 0.012, 0.06, 0.17, 0);
      this.part(h, BALL, R.accent, 0.03, 0.03, 0.03, 0.06, 0.25, 0, true);
      this.part(h, CYL, R.pants, 0.05, 0.31, 0.05).rotation.z = Math.PI / 2;
      this.part(h, BOX, R.pants, 0.12, 0.02, 0.02, 0, -0.06, 0.125);
    } else {
      this.part(h, BALL, R.skin, 0.132, 0.14, 0.132);
      this.part(h, BOX, 0x1c1c24, 0.028, 0.034, 0.02, -0.05, 0.01, 0.125);
      this.part(h, BOX, 0x1c1c24, 0.028, 0.034, 0.02, 0.05, 0.01, 0.125);
      if (R.head === 'helmet') {
        this.part(h, BALL, R.jacket, 0.158, 0.16, 0.165, 0, 0.02, -0.015);
        this.part(h, BOX, R.accent, 0.2, 0.075, 0.03, 0, 0.012, 0.14, true);
        this.part(h, BOX, R.accent, 0.03, 0.03, 0.2, 0, 0.17, -0.02, true);
      } else {
        this.part(h, BALL, R.hair, 0.143, 0.115, 0.15, 0, 0.045, -0.025);
        if (R.head === 'goggles') {
          this.part(h, CYL, 0x23232c, 0.142, 0.05, 0.142, 0, 0.07, 0);
          this.part(h, BOX, R.accent, 0.17, 0.055, 0.03, 0, 0.07, 0.132, true);
        } else if (R.head === 'beanie') {
          this.part(h, BALL, R.accent, 0.15, 0.115, 0.15, 0, 0.075, -0.01);
          this.part(h, CYL, R.jacket, 0.152, 0.045, 0.152, 0, 0.045, -0.005);
          this.part(h, BALL, 0xffffff, 0.045, 0.045, 0.045, 0, 0.2, -0.01);
        } else if (R.head === 'tophat') {
          this.part(h, CYL, 0x0e0c14, 0.2, 0.02, 0.2, 0, 0.12, 0);
          this.part(h, CYL, 0x0e0c14, 0.125, 0.25, 0.125, 0, 0.25, 0);
          this.part(h, CYL, R.accent, 0.128, 0.04, 0.128, 0, 0.155, 0, true);
          this.part(h, CYL, R.accent, 0.035, 0.012, 0.035, 0.05, 0.012, 0.13, true).rotation.x = Math.PI / 2;
          this.part(h, BOX, R.hair, 0.13, 0.025, 0.03, 0, -0.045, 0.125);
        }
        if (R.hair3d === 'bun') this.part(h, BALL, R.hair, 0.065, 0.065, 0.065, 0, 0.13, -0.09);
      }
    }
    if (R.hair3d === 'ponytail') {
      P.pony = new THREE.Group();
      this.part(P.pony, BOX, R.hair, 0.07, 0.2, 0.07, 0, -0.1, 0);
      const seg = new THREE.Group();
      seg.position.y = -0.2;
      this.part(seg, BOX, R.hair, 0.055, 0.18, 0.055, 0, -0.09, 0);
      P.pony.add(seg);
      P.pony2 = seg;
      b.add(P.pony);
    }
    this.tmp = { hip: V(), chest: V(), neck: V(), spine: V(), a: V(), b: V(), j: V(), e: V(), bend: V() };
    this.apply();
  }

  /** Cinematic / menu control. */
  play(name, param = 0, blend = 10) {
    this.poseName = name;
    this.poseParam = param;
    this.blend = blend;
  }

  kickSquash(amount) {
    this.squashV += amount * 9;
  }

  /** Drive the puppet from the physics state of a Player. */
  drive(dt, p, held) {
    let name = 'ride';
    if (p.crashed) name = 'crash';
    else if (p.rail) name = 'grind';
    else if (!p.grounded && p.airTime > 0.07) name = Math.abs(p.angVel) > 1.6 ? 'tuck' : 'air';
    else if (p.boosting) name = 'boost';
    this.poseName = name;
    this.blend = name === 'tuck' ? 16 : 12;
    if (p.crashed && !this.detached) {
      this.detached = true;
      this.boardV.set(-2 - Math.random() * 2, 5 + Math.random() * 2, 0);
      this.boardSpin = 6 + Math.random() * 6;
    } else if (!p.crashed && this.detached) {
      this.detached = false;
      this.boardG.position.set(0, 0, 0);
      this.boardG.rotation.set(0, 0, 0);
    }
    this.speedHint = Math.hypot(p.vx, p.vy);
    this.update(dt);
  }

  update(dt) {
    this.clock += dt;
    const t = this.clock, T = this.target, P = this.pose;
    const onBoard = !!ON_BOARD[this.poseName];
    // defaults that individual poses may override
    T.headPitch = 0; T.hipX = 0; T.hipY = 0;
    if (onBoard) {
      T.fl.set(-0.27, 0.13, 0);
      T.fr.set(0.27, 0.13, 0);
    }
    (POSES[this.poseName] || POSES.ride)(T, t, this.poseParam);
    const k = 1 - Math.exp(-this.blend * dt);
    for (const key of ['crouch', 'lean', 'bend', 'twist', 'headYaw', 'headPitch', 'hipX', 'hipY']) P[key] += (T[key] - P[key]) * k;
    P.hl.lerp(T.hl, k); P.hr.lerp(T.hr, k); P.fl.lerp(T.fl, k); P.fr.lerp(T.fr, k);
    // landing squash spring
    this.squashV += (-this.squash * 90 - this.squashV * 13) * dt;
    this.squash += this.squashV * dt;
    // trailing bits (ponytail, coat)
    const want = clamp((this.speedHint || 0) * 0.045, 0, 1.15);
    this.tail = damp(this.tail, want, 5, dt);
    if (this.detached) {
      this.boardV.y -= 16 * dt;
      this.boardG.position.addScaledVector(this.boardV, dt);
      this.boardG.rotation.z += this.boardSpin * dt;
    }
    this.boardG.visible = onBoard || this.showBoard === true;
    this.apply();
  }

  apply() {
    const P = this.pose, S = this.parts, K = this.bulk, M = this.tmp;
    const crouch = clamp(P.crouch + this.squash * 0.5, 0, 1);
    M.hip.set(P.hipX + P.lean * 0.1, lerp(0.9, 0.48, crouch) + P.hipY, 0.02 + crouch * 0.07);
    M.spine.set(P.lean * 0.55, 1, P.bend * 0.6).normalize();
    M.chest.copy(M.hip).addScaledVector(M.spine, 0.42);
    M.neck.copy(M.chest).addScaledVector(M.spine, 0.1);
    const cs = Math.cos(P.twist), sn = Math.sin(P.twist);

    S.pelvis.position.copy(M.hip);
    S.pelvis.rotation.set(0, P.twist * 0.4, 0);
    if (S.belt) {
      S.belt.position.copy(M.hip).addScaledVector(M.spine, 0.09);
      S.belt.rotation.set(0, P.twist * 0.5, 0);
    }
    M.a.copy(M.hip).addScaledVector(M.spine, 0.05);
    M.b.copy(M.chest).addScaledVector(M.spine, 0.07);
    bone(S.torso, M.a, M.b, 0.37 * K, 0.23 * K, 0.02);
    _q.setFromAxisAngle(UP, P.twist);
    S.torso.quaternion.multiply(_q);

    // legs
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      const foot = s < 0 ? P.fl : P.fr;
      M.a.set(M.hip.x + s * 0.1 * K, M.hip.y - 0.05, M.hip.z);
      M.bend.set(s * 0.5, 0.1, 1);
      ik(M.a, foot, L_THIGH, L_SHIN, M.bend, M.j, M.e);
      bone(S['thigh' + n], M.a, M.j, 0.15 * K, 0.15 * K);
      bone(S['shin' + n], M.j, M.e, 0.125 * K, 0.125 * K);
      S['foot' + n].position.set(M.e.x, M.e.y - 0.025, M.e.z + 0.045);
    }
    // arms
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      const hand = s < 0 ? P.hl : P.hr;
      M.a.set(M.chest.x + s * 0.21 * K * cs, M.chest.y + 0.04, M.chest.z - s * 0.21 * K * sn);
      M.b.copy(M.chest).add(hand);
      M.bend.set(s * 0.4, -0.7, -0.5);
      ik(M.a, M.b, L_UARM, L_FARM, M.bend, M.j, M.e);
      bone(S['uArm' + n], M.a, M.j, 0.115 * K, 0.115 * K);
      bone(S['fArm' + n], M.j, M.e, 0.1 * K, 0.1 * K);
      S['hand' + n].position.copy(M.e);
    }
    // head
    S.head.position.copy(M.neck).addScaledVector(M.spine, 0.14);
    S.head.rotation.set(P.headPitch, P.headYaw, 0, 'YXZ');
    if (S.pony) {
      S.pony.position.set(S.head.position.x - 0.1 * Math.sin(P.headYaw), S.head.position.y + 0.04, S.head.position.z - 0.1 * Math.cos(P.headYaw));
      const w = Math.sin(this.clock * 9) * 0.08 * this.tail;
      S.pony.rotation.z = -this.tail * 1.1 + w;
      S.pony2.rotation.z = -this.tail * 0.5 + w * 1.5;
    }
    if (S.coat) {
      S.coat.position.set(M.hip.x, M.hip.y - 0.02, M.hip.z - 0.12 * K);
      S.coat.rotation.set(-0.15, P.twist * 0.4, -this.tail * 0.85 + Math.sin(this.clock * 8) * 0.06 * this.tail);
    }
    if (S.pack) {
      S.pack.position.copy(M.chest).addScaledVector(M.spine, -0.12);
      S.pack.position.x -= 0.17 * sn;
      S.pack.position.z -= 0.17 * cs;
      S.pack.rotation.set(0, P.twist, 0);
      S.packGlow.position.copy(S.pack.position);
      S.packGlow.position.y += 0.2;
    }
  }

  dispose() {
    for (const m of this.mats.values()) m.dispose();
    this.mats.clear();
    this.root.removeFromParent();
  }
}
