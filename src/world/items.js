// 3D views of the course items: shards (coins), obstacles, grind rails,
// time portals, power-ups, the story cog, the finish arch and chasm glows.
import * as THREE from 'three';
import { Kit, MAT } from './meshkit.js';
import { getProp } from './props.js';
import { ROCK_SIZES } from '../game/rules.js';
import { lerp, TAU } from '../core/math.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const COIN_CAP = 220;

const PORTAL_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const PORTAL_FRAG = /* glsl */ `
precision highp float;
uniform float uTime, uPower;
uniform vec3 uA, uB;
varying vec2 vUv;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float a = atan(p.y, p.x);
  float swirl = vn(vec2(a * 2.5 + r * 5.0 - uTime * 2.2, r * 6.0 - uTime * 1.4));
  float arms = 0.5 + 0.5 * sin(a * 5.0 + r * 9.0 - uTime * 4.0 + swirl * 3.0);
  float core = exp(-r * r * 5.0);
  float edge = smoothstep(1.0, 0.82, r);
  vec3 col = mix(uA, uB, arms * (1.0 - r * 0.5)) * (0.35 + 0.9 * swirl) + vec3(1.0) * core * 1.3;
  float alpha = edge * (0.55 + 0.45 * swirl) * uPower + core;
  gl_FragColor = vec4(col * uPower, clamp(alpha, 0.0, 1.0));
}`;

let shared = null;
function sharedGeos() {
  if (shared) return shared;
  const mk = (fn, seed = 3) => {
    const k = new Kit(seed);
    fn(k);
    return k.build();
  };
  shared = {
    coin: mk((k) => {
      k.gear(0.3, 8, 0.07, { c: 0xffb820, c2: 0xffe27a, glow: true });
      k.gear(0.15, 6, 0.1, { c: 0xfff6c8, glow: true, hole: 0 });
    }),
    magnet: mk((k) => {
      k.torus(0.3, 0.11, 6, 10, { c: 0xe8483a, glow: true, arc: Math.PI, r: [0, 0, 0] });
      k.box(0.22, 0.16, 0.22, { c: 0xf4f6fa, glow: true, p: [-0.3, -0.16, 0] });
      k.box(0.22, 0.16, 0.22, { c: 0xf4f6fa, glow: true, p: [0.3, -0.16, 0] });
    }),
    shield: mk((k) => {
      k.extrude([0, -0.46, 0.36, -0.12, 0.36, 0.34, 0, 0.44, -0.36, 0.34, -0.36, -0.12], 0.14, { c: 0x2f7fe8, c2: 0x7fc8ff, glow: true });
      k.extrude([0, -0.26, 0.2, -0.06, 0.2, 0.2, 0, 0.26, -0.2, 0.2, -0.2, -0.06], 0.2, { c: 0xe8f6ff, glow: true });
    }),
    double: mk((k) => {
      k.gear(0.27, 8, 0.08, { c: 0xffb820, c2: 0xffe27a, glow: true, p: [-0.14, -0.08, -0.05] });
      k.gear(0.27, 8, 0.08, { c: 0xffd23f, c2: 0xfff2a0, glow: true, p: [0.14, 0.08, 0.05] });
    }),
    charge: mk((k) => {
      k.extrude([0.1, 0.5, -0.26, -0.06, -0.02, -0.06, -0.12, -0.5, 0.28, 0.1, 0.02, 0.1], 0.14, { c: 0xffd23f, c2: 0xfff8c0, glow: true });
    }),
    cog: mk((k) => {
      k.gear(1.5, 12, 0.34, { c: 0xc8922a, c2: 0xffdc7a, hole: 0.42 });
      k.gear(0.62, 8, 0.4, { c: 0xfff0b0, glow: true, hole: 0.3 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        k.box(0.16, 0.62, 0.2, { c: 0xe8b84a, p: [Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0], r: [0, 0, a - Math.PI / 2], mid: true });
      }
    }),
    finish: mk((k) => {
      for (const z of [-2.7, 2.7]) {
        k.cyl(0.16, 0.22, 6.4, 8, { c: 0xdfe8f0, c2: 0xffffff, p: [0, 0, z] });
        k.ball(0.3, 1, { c: 0xffd23f, glow: true, p: [0, 6.6, z] });
      }
      const n = 12;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < 2; j++) {
          k.box(0.12, 0.45, 5.4 / n, { c: (i + j) % 2 ? 0x15151c : 0xffffff, glow: true, p: [0, 5.2 + j * 0.45, -2.7 + (5.4 / n) * (i + 0.5)] });
        }
      }
      k.box(0.14, 0.08, 5.6, { c: 0xffd23f, glow: true, p: [0, 6.12, 0] });
      k.box(0.14, 0.08, 5.6, { c: 0xffd23f, glow: true, p: [0, 5.12, 0] });
    }),
  };
  return shared;
}

export class ItemViews {
  constructor(scene, fx) {
    this.scene = scene;
    this.fx = fx;
    this.group = new THREE.Group();
    scene.add(this.group);
    const G = sharedGeos();
    this.glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
    this.coins = new THREE.InstancedMesh(G.coin.glow, this.glowMat, COIN_CAP);
    this.coins.frustumCulled = false;
    for (let i = 0; i < COIN_CAP; i++) this.coins.setMatrixAt(i, ZERO);
    this.group.add(this.coins);
    this.coinFree = [];
    for (let i = COIN_CAP - 1; i >= 0; i--) this.coinFree.push(i);
    this.coinSlot = new Map(); // item id -> { slot, it }
    this.flying = []; // coins pulled by the magnet
    this.views = new Map(); // item id -> view
    this.railViews = new Map();
    this.gapViews = new Map();
    this.railCursor = 0;
    this.gapCursor = 0;
    this.frame = 0;
    this.time = 0;
    this.course = null;
    this.era = null;
    this.portalColor = new THREE.Color(0x6fd3ff);
    this.portalColor2 = new THREE.Color(0xff8ad8);
    this.boltT = 0;
  }

  setCourse(course, era) {
    this.clear();
    this.course = course;
    this.era = era;
    this.railCursor = 0;
    this.gapCursor = 0;
  }

  /** New era: obstacles and rails take the look of the period. */
  setEra(era, nextAccent, accent2) {
    this.era = era;
    for (const [id, v] of this.views) if (v.type === 'rock') this._drop(id, v);
    for (const [k, v] of this.railViews) { this._disposeGroup(v.group); this.railViews.delete(k); }
    for (const [k, v] of this.gapViews) { this._disposeGroup(v.group); this.gapViews.delete(k); }
    if (nextAccent !== undefined) this.setPortalColors(nextAccent, accent2);
  }

  setPortalColors(a, b) {
    this.portalColor.set(a);
    this.portalColor2.set(b ?? 0xffffff);
    for (const v of this.views.values()) {
      if (v.type === 'portal') {
        v.disc.material.uniforms.uA.value.copy(this.portalColor);
        v.disc.material.uniforms.uB.value.copy(this.portalColor2);
        v.ring.material.color.copy(this.portalColor).lerp(new THREE.Color(0xffffff), 0.55);
      }
    }
  }

  clear() {
    for (const [id, v] of this.views) this._drop(id, v);
    for (const v of this.railViews.values()) this._disposeGroup(v.group);
    for (const v of this.gapViews.values()) this._disposeGroup(v.group);
    this.railViews.clear();
    this.gapViews.clear();
    for (const { slot } of this.coinSlot.values()) {
      this.coins.setMatrixAt(slot, ZERO);
      this.coinFree.push(slot);
    }
    this.coinSlot.clear();
    for (const f of this.flying) {
      this.coins.setMatrixAt(f.slot, ZERO);
      this.coinFree.push(f.slot);
    }
    this.flying.length = 0;
    this.coins.instanceMatrix.needsUpdate = true;
  }

  _disposeGroup(g) {
    this.group.remove(g);
    g.traverse((o) => {
      if (o.geometry && o.userData.own) o.geometry.dispose();
      if (o.material && o.userData.ownMat) o.material.dispose();
    });
  }
  _drop(id, v) {
    this._disposeGroup(v.group);
    this.views.delete(id);
  }

  /** Remove the view of a collected / destroyed item right now. */
  remove(it) {
    if (it.type === 'coin') {
      const c = this.coinSlot.get(it.id);
      if (c) {
        this.coins.setMatrixAt(c.slot, ZERO);
        this.coinFree.push(c.slot);
        this.coinSlot.delete(it.id);
      }
      return;
    }
    const v = this.views.get(it.id);
    if (v) this._drop(it.id, v);
  }

  /** A collected coin flies to the rider (magnet). target: object with x, y. */
  fly(it, target) {
    const c = this.coinSlot.get(it.id);
    if (!c) return;
    this.coinSlot.delete(it.id);
    this.flying.push({ slot: c.slot, x: it.x, y: it.y, t: 0, target });
  }

  _makeRock(it) {
    const era = this.era;
    const name = era.obstacles[Math.min(it.size, era.obstacles.length - 1)];
    const built = getProp(name, 0);
    const g = new THREE.Group();
    if (!built) return { type: 'rock', group: g };
    if (built.lit) g.add(new THREE.Mesh(built.lit, MAT.lit));
    if (built.glow) g.add(new THREE.Mesh(built.glow, MAT.glow));
    const bb = (built.lit || built.glow).boundingBox;
    const S = ROCK_SIZES[it.size] || ROCK_SIZES[0];
    const sy = (S.h * 1.08) / Math.max(0.2, bb.max.y), sx = (S.hw * 2.1) / Math.max(0.2, bb.max.x - bb.min.x);
    const sc = Math.min(sy, sx * 1.25);
    g.scale.setScalar(sc);
    g.rotation.y = (it.id * 1.7) % 1 - 0.5;
    g.position.set(it.x, it.y - 0.04, 0);
    return { type: 'rock', group: g, hover: name === 'drone', baseY: it.y };
  }

  _makeRail(r) {
    const era = this.era, course = this.course, R = era.rail;
    const k = new Kit(r.index + 11);
    const len = Math.hypot(r.x2 - r.x1, r.y2 - r.y1), ang = Math.atan2(r.y2 - r.y1, r.x2 - r.x1);
    const beamGlow = R.glow > 0.5;
    k.box(len + 0.3, 0.11, 0.13, { c: R.beam, glow: beamGlow, p: [(r.x1 + r.x2) / 2, (r.y1 + r.y2) / 2 - 0.085, 0], r: [0, 0, ang], mid: true });
    if (!beamGlow) k.box(len + 0.3, 0.03, 0.15, { c: era.terrain.edge, p: [(r.x1 + r.x2) / 2, (r.y1 + r.y2) / 2 - 0.02, 0], r: [0, 0, ang], mid: true, j: 0.02 });
    const n = Math.max(2, Math.round(len / 7) + 1);
    for (let i = 0; i < n; i++) {
      const x = lerp(r.x1 + 0.2, r.x2 - 0.2, i / (n - 1));
      const g = course.heightAt(x);
      if (g === null) continue;
      const top = lerp(r.y1, r.y2, (x - r.x1) / (r.x2 - r.x1)) - 0.12;
      if (top - g < 0.15) continue;
      k.box(0.14, top - g + 0.3, 0.14, { c: R.post, p: [x, g - 0.3, 0] });
      k.box(0.3, 0.07, 0.3, { c: R.post, p: [x, top - 0.02, 0] });
      if (R.vine) k.ball(0.22, 0, { c: 0x4f9a48, p: [x, top + 0.02, 0.05], s: [1.3, 0.6, 1] });
      if (R.glow > 0) k.box(0.05, top - g, 0.02, { c: R.beam, glow: true, p: [x, g, 0.085] });
    }
    const built = k.build();
    const g = new THREE.Group();
    const add = (geo, mat) => {
      const m = new THREE.Mesh(geo, mat);
      m.userData.own = true;
      m.frustumCulled = false;
      g.add(m);
    };
    if (built.lit) add(built.lit, MAT.lit);
    if (built.glow) add(built.glow, this.glowMat);
    return { group: g };
  }

  _makeGap(gap) {
    const course = this.course;
    const y = Math.min(course.baseAt(gap.x1), course.baseAt(gap.x2)) - 7;
    const geo = new THREE.PlaneGeometry(gap.x2 - gap.x1 + 6, 26);
    const mat = new THREE.MeshBasicMaterial({ color: this.era.chasm, fog: false, transparent: true, opacity: 0.92 });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set((gap.x1 + gap.x2) / 2, y, -7.4);
    m.userData.own = true;
    m.userData.ownMat = true;
    const g = new THREE.Group();
    g.add(m);
    return { group: g, x: (gap.x1 + gap.x2) / 2, y, w: gap.x2 - gap.x1 };
  }

  _makePortal(it) {
    const g = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    ringMat.color.copy(this.portalColor).lerp(new THREE.Color(0xffffff), 0.55);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.22, 6, 40), ringMat);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(3.4, 40), new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPower: { value: 1 }, uA: { value: this.portalColor.clone() }, uB: { value: this.portalColor2.clone() } },
      vertexShader: PORTAL_VERT, fragmentShader: PORTAL_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }));
    for (const o of [ring, disc]) { o.userData.own = true; o.userData.ownMat = true; }
    disc.renderOrder = 26;
    const spin = new THREE.Group();
    const G = sharedGeos();
    const gears = [];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(G.cog.lit, MAT.lit);
      const a = (i / 3) * TAU + 0.5;
      m.position.set(Math.cos(a) * 3.9, Math.sin(a) * 3.9, 0);
      m.scale.setScalar(0.42);
      spin.add(m);
      gears.push(m);
    }
    const tilt = new THREE.Group();
    tilt.add(ring, disc, spin);
    tilt.rotation.y = -0.95; // faces the incoming rider and, partly, the camera
    g.add(tilt);
    // plinths
    const k = new Kit(5);
    for (const z of [-2.3, 2.3]) {
      k.cyl(0.5, 0.75, 1.1, 6, { c: 0x8a93a8, c2: 0xb8c2d4, p: [z * 0.6, 0, z * 0.82] });
      k.gem(0.26, 0.7, { c: 0xffffff, glow: true, p: [z * 0.6, 1.15, z * 0.82] });
    }
    const built = k.build();
    const pl = new THREE.Mesh(built.lit, MAT.lit);
    pl.userData.own = true;
    const pg = new THREE.Mesh(built.glow, this.glowMat);
    pg.userData.own = true;
    g.add(pl, pg);
    g.position.set(it.x, it.y, 0);
    tilt.position.y = 3.9;
    return { type: 'portal', group: g, ring, disc, spin, gears, it };
  }

  _makePower(it) {
    const G = sharedGeos();
    const g = new THREE.Group();
    const icon = new THREE.Mesh(G[it.kind].glow, this.glowMat);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 4, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
    halo.userData.own = true;
    halo.userData.ownMat = true;
    g.add(icon, halo);
    g.position.set(it.x, it.y, 0);
    return { type: 'power', group: g, icon, halo, baseY: it.y };
  }

  _makeCog(it) {
    const G = sharedGeos();
    const g = new THREE.Group();
    const cog = new THREE.Group();
    cog.add(new THREE.Mesh(G.cog.lit, MAT.lit), new THREE.Mesh(G.cog.glow, this.glowMat));
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.6, 60, 20, 1, true), new THREE.MeshBasicMaterial({
      color: this.era.accent, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
    }));
    beam.position.y = 28;
    beam.userData.own = true;
    beam.userData.ownMat = true;
    g.add(cog, beam);
    g.position.set(it.x, it.y + 2.4, 0);
    return { type: 'cog', group: g, cog, baseY: it.y + 2.4 };
  }

  _makeFinish(it) {
    const G = sharedGeos();
    const g = new THREE.Group();
    g.add(new THREE.Mesh(G.finish.lit, MAT.lit), new THREE.Mesh(G.finish.glow, this.glowMat));
    g.position.set(it.x, it.y - 0.2, 0);
    return { type: 'finish', group: g };
  }

  /**
   * Sync views with the course around focusX.
   * collected: Set of item ids already taken; player: for magnet / portal sparks.
   */
  update(dt, focusX, collected, player) {
    const course = this.course;
    if (!course) return;
    this.time += dt;
    this.frame++;
    const t = this.time, items = course.items;
    const lo = focusX - 46, hi = focusX + 118;
    let coinDirty = false;

    for (let i = course.itemIndex(lo); i < items.length; i++) {
      const it = items[i];
      if (it.x > hi) break;
      if (collected.has(it.id) || it.type === 'hint') continue;
      if (it.type === 'coin') {
        let c = this.coinSlot.get(it.id);
        if (!c) {
          if (!this.coinFree.length) continue;
          c = { slot: this.coinFree.pop(), it, frame: 0 };
          this.coinSlot.set(it.id, c);
        }
        c.frame = this.frame;
        _e.set(0, t * 3.2 + it.x * 0.35, 0);
        _m.compose(_p.set(it.x, it.y + Math.sin(t * 2.4 + it.x) * 0.07, 0), _q.setFromEuler(_e), _s.set(1, 1, 1));
        this.coins.setMatrixAt(c.slot, _m);
        coinDirty = true;
        continue;
      }
      let v = this.views.get(it.id);
      if (!v) {
        if (it.type === 'rock') v = this._makeRock(it);
        else if (it.type === 'portal') v = this._makePortal(it);
        else if (it.type === 'power') v = this._makePower(it);
        else if (it.type === 'cog') v = this._makeCog(it);
        else if (it.type === 'finish') v = this._makeFinish(it);
        else continue;
        this.group.add(v.group);
        this.views.set(it.id, v);
      }
      v.frame = this.frame;
      if (v.type === 'rock') {
        if (v.hover) v.group.position.y = v.baseY + 0.12 + Math.sin(t * 3 + it.x) * 0.1;
      } else if (v.type === 'power') {
        v.group.position.y = v.baseY + Math.sin(t * 2.6 + it.x) * 0.16;
        v.icon.rotation.y = t * 2.2;
        v.halo.rotation.x = Math.PI / 2 + Math.sin(t * 1.7) * 0.4;
        v.halo.rotation.y = t * 1.3;
        if (Math.random() < dt * 5) this.fx.glow(it.x, v.group.position.y, 0.2, 0xffffff, 1.3, 0.5, 0.25);
      } else if (v.type === 'cog') {
        v.cog.rotation.z = t * 0.9;
        v.cog.rotation.y = Math.sin(t * 0.7) * 0.5;
        v.group.position.y = v.baseY + Math.sin(t * 1.5) * 0.25;
        if (Math.random() < dt * 12) this.fx.energy(it.x + (Math.random() - 0.5) * 2, v.baseY - 1.5 + Math.random() * 3, this.era.accent, 1);
      } else if (v.type === 'portal') {
        v.disc.material.uniforms.uTime.value = t;
        v.spin.rotation.z = t * 0.5;
        for (const g of v.gears) g.rotation.z = -t * 2;
        const s = 1 + Math.sin(t * 5) * 0.015;
        v.ring.scale.set(s, s, 1);
        this.boltT -= dt;
        if (this.boltT <= 0 && Math.abs(it.x - focusX) < 70) {
          this.boltT = 0.25 + Math.random() * 0.5;
          const a1 = Math.random() * TAU, a2 = a1 + 1.5 + Math.random() * 2.5;
          const P = (a) => ({ x: it.x + Math.cos(a) * 3.3 * 0.58, y: it.y + 3.9 + Math.sin(a) * 3.3, z: Math.cos(a) * 3.3 * 0.8 });
          this.fx.bolt(P(a1), P(a2), this.portalColor.getHex(), 0.09, 0.2, 0.2, 0);
        }
        if (Math.random() < dt * 20) {
          const a = Math.random() * TAU;
          this.fx.energy(it.x + Math.cos(a) * 2, it.y + 3.9 + Math.sin(a) * 3.3, this.portalColor.getHex(), 1);
        }
      }
    }
    for (const [id, c] of this.coinSlot) {
      if (c.frame !== this.frame) {
        this.coins.setMatrixAt(c.slot, ZERO);
        this.coinFree.push(c.slot);
        this.coinSlot.delete(id);
        coinDirty = true;
      }
    }
    for (const [id, v] of this.views) if (v.frame !== this.frame) this._drop(id, v);

    // magnetised coins
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i];
      f.t += dt * 5.5;
      const k = Math.min(1, f.t * f.t);
      const x = lerp(f.x, f.target.x, k), y = lerp(f.y, f.target.y + 0.8, k);
      const sc = 1 - k * 0.6;
      _e.set(0, t * 9, 0);
      _m.compose(_p.set(x, y, 0), _q.setFromEuler(_e), _s.set(sc, sc, sc));
      this.coins.setMatrixAt(f.slot, _m);
      coinDirty = true;
      if (f.t >= 1) {
        this.coins.setMatrixAt(f.slot, ZERO);
        this.coinFree.push(f.slot);
        this.flying.splice(i, 1);
      }
    }
    if (coinDirty) this.coins.instanceMatrix.needsUpdate = true;

    // rails
    const rails = course.rails;
    while (this.railCursor < rails.length && rails[this.railCursor].x2 < lo - 30) this.railCursor++;
    for (let i = this.railCursor; i < rails.length && rails[i].x1 < hi; i++) {
      if (!this.railViews.has(i)) {
        const v = this._makeRail(rails[i]);
        this.group.add(v.group);
        this.railViews.set(i, v);
      }
    }
    for (const [i, v] of this.railViews) {
      if (i < this.railCursor || rails[i].x1 > hi + 40) {
        this._disposeGroup(v.group);
        this.railViews.delete(i);
      }
    }
    // chasm glows
    const gaps = course.gaps;
    while (this.gapCursor < gaps.length && gaps[this.gapCursor].x2 < lo - 30) this.gapCursor++;
    for (let i = this.gapCursor; i < gaps.length && gaps[i].x1 < hi; i++) {
      let v = this.gapViews.get(i);
      if (!v) {
        v = this._makeGap(gaps[i]);
        this.group.add(v.group);
        this.gapViews.set(i, v);
      }
      if (Math.random() < dt * 9) {
        this.fx.add.emit(v.x + (Math.random() - 0.5) * v.w, v.y + 1, 2.6 - Math.random() * 9, (Math.random() - 0.5) * 0.6, 2.5 + Math.random() * 3, 0,
          1.4 + Math.random(), 0.3, 0.05, ...this._chasmRGB(), 0.9, -0.4, 0.3);
      }
    }
    for (const [i, v] of this.gapViews) {
      if (i < this.gapCursor || gaps[i].x1 > hi + 40) {
        this._disposeGroup(v.group);
        this.gapViews.delete(i);
      }
    }
  }

  _chasmRGB() {
    const c = (this._cc = this._cc || new THREE.Color());
    c.set(this.era.chasm);
    return [c.r, c.g, c.b];
  }
}
