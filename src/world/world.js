// The streamed world for the current era: sky, the track silhouette, the ridge
// layers stacked behind it, scenery, far parallax skylines and clouds, with
// blended day/night moods. Nothing is lit: every shape is a flat colour tinted
// by the ambient mood and melted into the haze with distance.
import * as THREE from 'three';
import { ERAS } from './eras.js';
import { Sky } from './sky.js';
import { buildTerrainChunk, buildRidgeChunk, buildLayerChunk, makeLayerMaterial, topY, ridgeY } from './terrain.js';
import { getProp, propVariants } from './props.js';
import { Kit, MAT } from './meshkit.js';
import { RNG, hashInt, hashStr } from '../core/rng.js';
import { lerp, smoothstep, clamp } from '../core/math.js';

const TCH = 40; // track chunk length (m)
const RCH = 120; // ridge chunk length
const LCH = 420; // far layer chunk length (layer space)
const CAM_DIST = 45; // typical camera distance, used for haze estimates
const COLOR_KEYS = ['skyTop', 'skyMid', 'skyBot', 'fog', 'sun', 'sunGlow', 'hemiSky', 'hemiGround', 'dir', 'far', 'far2', 'cloud'];
const NUM_KEYS = ['midPos', 'fogNear', 'fogFar', 'sunSize', 'glowSize', 'hemiInt', 'dirInt', 'stars', 'glow', 'cloudAmt'];

const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const _white = new THREE.Color(0xffffff);
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

/** Fixed-capacity instanced prop (tinted + optional glow mesh sharing slots). */
class PropPool {
  constructor(parent, built, cap) {
    this.meshes = [];
    this.cap = cap;
    this.free = [];
    for (let i = cap - 1; i >= 0; i--) this.free.push(i);
    const add = (geo, mat) => {
      const m = new THREE.InstancedMesh(geo, mat, cap);
      m.frustumCulled = false;
      for (let i = 0; i < cap; i++) m.setMatrixAt(i, ZERO);
      parent.add(m);
      this.meshes.push(m);
    };
    if (built.lit) add(built.lit, MAT.lit);
    if (built.glow) add(built.glow, MAT.glow);
    this.dirty = true;
    this.parent = parent;
  }
  alloc(matrix) {
    if (!this.free.length) return -1;
    const slot = this.free.pop();
    for (const m of this.meshes) m.setMatrixAt(slot, matrix);
    this.dirty = true;
    return slot;
  }
  release(slot) {
    for (const m of this.meshes) m.setMatrixAt(slot, ZERO);
    this.free.push(slot);
    this.dirty = true;
  }
  flush() {
    if (!this.dirty) return;
    for (const m of this.meshes) m.instanceMatrix.needsUpdate = true;
    this.dirty = false;
  }
  dispose() {
    for (const m of this.meshes) {
      this.parent.remove(m);
      m.dispose();
    }
  }
}

function parseMood(m) {
  const o = { ...m };
  for (const k of COLOR_KEYS) o[k] = new THREE.Color(m[k]);
  return o;
}

let cloudGeos = null;
function getCloudGeos() {
  if (cloudGeos) return cloudGeos;
  cloudGeos = [];
  for (let v = 0; v < 3; v++) {
    const k = new Kit(77 + v);
    const n = 4 + v;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * 0.9 + (k.rand() - 0.5) * 0.4;
      const r = 0.75 + k.rand() * 0.55 - Math.abs(i - (n - 1) / 2) * 0.12;
      k.ball(r, 1, { c: 0xd9d9d9, c2: 0xffffff, p: [x, r * 0.55, 0], s: [1.3, 0.7, 0.4] });
    }
    k.box(n * 0.95, 0.5, 0.3, { c: 0xd9d9d9, p: [0, 0.02, 0] });
    cloudGeos.push(k.build().lit);
  }
  return cloudGeos;
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.sky = new Sky();
    scene.add(this.sky.mesh);
    scene.fog = new THREE.Fog(0xffffff, 45, 430);

    this.root = new THREE.Group();
    this.gTerrain = new THREE.Group();
    this.gRidges = new THREE.Group();
    this.gDecor = new THREE.Group();
    this.gLayers = new THREE.Group();
    this.gClouds = new THREE.Group();
    this.gAnim = new THREE.Group();
    this.root.add(this.gLayers, this.gClouds, this.gRidges, this.gDecor, this.gTerrain, this.gAnim);
    scene.add(this.root);

    this.cloudMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
    this.chunks = new Map();
    this.ridges = [];
    this.layers = [];
    this.pools = [];
    this.clouds = [];
    this.anims = [];
    this.time = 0;
    this.moodPos = 0;
    this.moodSpeed = 1 / 60;
    this.mood = parseMood(ERAS.present.moods[0]);
    this.tint = new THREE.Color(1, 1, 1); // ambient tint applied to every flat shape
    this.flash = 0;
    this.density = 1; // scenery density (graphics quality)
    this.course = null;
    this.era = null;
    this.focusX = 0;
    this.aspect = 1.6;
  }

  // ---- loading -----------------------------------------------------------
  /** Build the world for a course and an era. opts: { mood, moodSpeed, focusX } */
  load(course, eraId, opts = {}) {
    this.course = course;
    this._clearEra();
    this.era = ERAS[eraId];
    this.eraId = eraId;
    this.moods = this.era.moods.map(parseMood);
    this.moodPos = opts.mood ?? 0;
    this.moodSpeed = opts.moodSpeed ?? 1 / 60;
    const seed = hashStr(eraId);

    // ridges behind the track (world space) with their own scenery pools
    this.ridges = this.era.ridges.map((def, i) => {
      const group = new THREE.Group();
      group.position.z = def.z;
      this.gRidges.add(group);
      return { def, group, mat: makeLayerMaterial(def), chunks: new Map(), seed: seed + 900 + i * 57, index: i, base: new THREE.Color(def.color) };
    });

    // instanced scenery pools
    this.pools = [];
    this.era.decor.forEach((sp, si) => {
      const variants = propVariants(sp.prop);
      const onRidge = sp.ridge !== undefined;
      const span = onRidge ? 420 : 260;
      const cap = Math.ceil(((sp.per100 * this.density * span) / 100) * 1.5 / variants) + 6;
      const list = [];
      for (let v = 0; v < variants; v++) {
        const built = getProp(sp.prop, v);
        if (built) list.push(new PropPool(this.gDecor, built, cap));
      }
      this.pools.push({ sp, si, list });
    });

    // far parallax layers
    this.layers = this.era.layers.map((def, i) => {
      const group = new THREE.Group();
      group.position.z = def.z;
      this.gLayers.add(group);
      return { def, group, mat: makeLayerMaterial(def), chunks: new Map(), seed: seed + i * 101, index: i };
    });

    // clouds
    const geos = getCloudGeos();
    const count = Math.round(10 * (this.era.clouds || 0));
    const rng = new RNG(seed + 5);
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geos[i % geos.length], this.cloudMat);
      const sc = rng.range(22, 52);
      mesh.scale.set(sc * rng.range(1, 1.5), sc * 0.6, sc);
      mesh.frustumCulled = false;
      this.gClouds.add(mesh);
      this.clouds.push({ mesh, u: rng.range(-1300, 1300), y: rng.range(90, 260), z: rng.range(-1000, -620), speed: rng.range(1.5, 5) });
    }
    this.focusX = opts.focusX ?? 0;
    this.update(0, this.focusX, course.solidAt(this.focusX), true);
  }

  _clearEra() {
    for (const c of this.chunks.values()) this._disposeChunk(c);
    this.chunks.clear();
    for (const r of this.ridges) {
      for (const rec of r.chunks.values()) this._disposeRidgeChunk(r, rec);
      this.gRidges.remove(r.group);
      r.mat.dispose();
    }
    this.ridges = [];
    for (const p of this.pools) for (const pool of p.list) pool.dispose();
    this.pools = [];
    for (const l of this.layers) {
      for (const m of l.chunks.values()) if (m) m.geometry.dispose();
      this.gLayers.remove(l.group);
      l.mat.dispose();
    }
    this.layers = [];
    for (const c of this.clouds) this.gClouds.remove(c.mesh);
    this.clouds = [];
    for (const a of this.anims) this.gAnim.remove(a.mesh);
    this.anims = [];
  }

  /** Swap the scenery to another era around the current focus (time jump). */
  setEra(eraId, opts = {}) {
    this.load(this.course, eraId, { focusX: this.focusX, ...opts });
  }

  // ---- scenery placement -------------------------------------------------
  _place(rec, sp, list, rng, x, y, z) {
    const sc = rng.range(sp.scale[0], sp.scale[1]);
    const rot = sp.spin === undefined ? rng.next() * Math.PI * 2 : (rng.next() - 0.5) * 2 * sp.spin;
    const vi = Math.floor(rng.next() * list.length);
    _e.set(0, rot, 0);
    _m4.compose(_v.set(x, y, z), _q.setFromEuler(_e), _s.set(sc, sc, sc));
    const slot = list[vi].alloc(_m4);
    if (slot >= 0) rec.slots.push(list[vi], slot);
    if (sp.anim === 'windmill') this._addAnim(rec, 'windmillFan', x, y + 7.2 * sc, z + 0.55 * sc, sc, rot, 'spinZ', 1.2 + rng.next());
  }

  _buildChunk(ci) {
    const x0 = ci * TCH;
    const course = this.course;
    const group = buildTerrainChunk(course, this.era, x0, x0 + TCH);
    this.gTerrain.add(group);
    const rec = { group, slots: [], anims: [] };
    for (const { sp, si, list } of this.pools) {
      if (!list.length || sp.ridge !== undefined) continue;
      const rng = new RNG(hashInt(ci * 9973 + si * 131 + 7));
      const want = (sp.per100 * this.density * TCH) / 100;
      const n = Math.floor(want) + (rng.chance(want - Math.floor(want)) ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const x = x0 + rng.next() * TCH;
        const z = rng.range(sp.z[0], sp.z[1]);
        if (course.isGap(x) || course.isGap(x - 1.5) || course.isGap(x + 1.5)) {
          rng.next(); rng.next(); rng.next();
          continue;
        }
        // seen from slightly above, things behind the track must sink a little to stay rooted
        const y = topY(course, x) - 0.12 + z * 0.085;
        this._place(rec, sp, list, rng, x, y, z);
      }
    }
    return rec;
  }

  _buildRidgeChunk(R, ci) {
    const x0 = ci * RCH, def = R.def;
    const geo = buildRidgeChunk(def, this.course, x0, RCH, R.seed);
    const rec = { mesh: null, slots: [], anims: [] };
    if (geo) {
      rec.mesh = new THREE.Mesh(geo, R.mat);
      rec.mesh.frustumCulled = false;
      R.group.add(rec.mesh);
    }
    for (const { sp, si, list } of this.pools) {
      if (!list.length || sp.ridge !== R.index) continue;
      const rng = new RNG(hashInt(ci * 7919 + si * 311 + R.index * 53 + 3));
      const want = (sp.per100 * this.density * RCH) / 100;
      const n = Math.floor(want) + (rng.chance(want - Math.floor(want)) ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const x = x0 + rng.next() * RCH;
        const y = ridgeY(def, this.course, x, R.seed) - 0.35;
        this._place(rec, sp, list, rng, x, y, def.z - 0.4 - rng.next() * 2.5);
      }
    }
    return rec;
  }

  _addAnim(rec, prop, x, y, z, sc, rot, kind, speed) {
    const built = getProp(prop, 0);
    if (!built || !built.lit) return;
    const mesh = new THREE.Mesh(built.lit, MAT.lit);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(sc);
    mesh.rotation.y = rot;
    this.gAnim.add(mesh);
    const a = { mesh, kind, speed };
    this.anims.push(a);
    rec.anims.push(a);
  }

  _release(rec) {
    for (let i = 0; i < rec.slots.length; i += 2) rec.slots[i].release(rec.slots[i + 1]);
    for (const a of rec.anims) {
      this.gAnim.remove(a.mesh);
      const k = this.anims.indexOf(a);
      if (k >= 0) this.anims.splice(k, 1);
    }
  }
  _disposeChunk(rec) {
    this.gTerrain.remove(rec.group);
    rec.group.traverse((o) => o.geometry && o.geometry.dispose());
    this._release(rec);
  }
  _disposeRidgeChunk(R, rec) {
    if (rec.mesh) {
      R.group.remove(rec.mesh);
      rec.mesh.geometry.dispose();
    }
    this._release(rec);
  }

  _stream(map, size, lo, hi, build, dispose, force) {
    const a = Math.floor(lo / size), b = Math.floor(hi / size);
    for (const [ci, rec] of map) {
      if (ci < a - 1 || ci > b + 1) {
        dispose(rec);
        map.delete(ci);
      }
    }
    let built = 0;
    for (let ci = a; ci <= b; ci++) {
      if (map.has(ci)) continue;
      map.set(ci, build(ci));
      if (!force && ++built >= 1) return true;
    }
    return false;
  }

  // ---- per-frame ---------------------------------------------------------
  setMood(index, instant = true) {
    this.moodPos = index;
    if (instant) this._blendMood();
  }

  _blendMood() {
    const n = this.moods.length;
    const p = ((this.moodPos % n) + n) % n;
    const i = Math.floor(p), t = smoothstep(0.62, 1, p - i);
    const A = this.moods[i], B = this.moods[(i + 1) % n], m = this.mood;
    for (const k of COLOR_KEYS) m[k].copy(A[k]).lerp(B[k], t);
    for (const k of NUM_KEYS) m[k] = lerp(A[k], B[k], t);
    m.sunPos = [lerp(A.sunPos[0], B.sunPos[0], t), lerp(A.sunPos[1], B.sunPos[1], t)];
    m.skyStyle = A.skyStyle;
    // the sun dips while two moods cross so discs never slide across the sky
    m.sunPos[1] -= Math.sin(t * Math.PI) * 0.9;
    m.sunSize = lerp(A.sunSize, B.sunSize, t);
    // ambient tint of all flat shapes: sky light plus a touch of sun colour
    const k1 = 0.78 * m.hemiInt, k2 = 0.3 * m.dirInt;
    this.tint.setRGB(
      Math.min(1, m.hemiSky.r * k1 + m.dir.r * k2),
      Math.min(1, m.hemiSky.g * k1 + m.dir.g * k2),
      Math.min(1, m.hemiSky.b * k1 + m.dir.b * k2));
  }

  update(dt, focusX, focusY, force = false) {
    const course = this.course;
    if (!course) return;
    this.time += dt;
    this.focusX = focusX;
    this.moodPos += dt * this.moodSpeed;
    this._blendMood();
    const m = this.mood;

    // sky, haze and ambient tint
    this.flash = Math.max(0, this.flash - dt * 3.5);
    const fl = this.flash;
    this.sky.apply(m, this.time, this.aspect, focusX);
    this.sky.uniforms.uFlash.value = fl * 0.55;
    const fog = this.scene.fog;
    fog.color.copy(m.fog);
    if (fl > 0) fog.color.lerp(_white, fl * 0.5);
    fog.near = m.fogNear;
    fog.far = m.fogFar;
    _c.copy(this.tint);
    if (fl > 0) _c.lerp(_white, fl * 0.6);
    MAT.lit.color.copy(_c);
    MAT.litDouble.color.copy(_c);
    MAT.glow.color.setScalar(lerp(0.6, 1, m.glow));
    this.cloudMat.color.copy(m.cloud);

    // streaming (at most one new chunk per frame once loaded)
    let busy = this._stream(this.chunks, TCH, focusX - 75, focusX + 125, (ci) => this._buildChunk(ci), (r) => this._disposeChunk(r), force);
    for (const R of this.ridges) {
      const half = (CAM_DIST - R.def.z) * 0.62 + 50;
      if (busy && !force) break;
      busy = this._stream(R.chunks, RCH, focusX - half, focusX + half * 1.5, (ci) => this._buildRidgeChunk(R, ci), (r) => this._disposeRidgeChunk(R, r), force);
    }
    for (const p of this.pools) for (const pool of p.list) pool.flush();

    // ridge colours: flat tone, tinted by the mood and melted into the haze with depth
    const span = Math.max(1, fog.far - fog.near);
    for (const R of this.ridges) {
      const d = R.def, U = R.mat.uniforms;
      const f = clamp((CAM_DIST - d.z - fog.near) / span, 0, 1);
      U.uColor.value.copy(R.base).multiply(_c).lerp(fog.color, f);
      U.uLow.value.copy(U.uColor.value).lerp(fog.color, 0.42);
      U.uWinAmt.value = d.windows !== undefined ? m.glow * m.glow : 0;
      if (d.rim !== undefined) U.uRimAmt.value = d.rimAmt ?? 1;
      else {
        U.uRim.value.copy(m.sunGlow);
        U.uRimAmt.value = 0.1;
      }
    }

    // far layers (their own parallax space)
    const trend = course.trendAt(focusX);
    const nL = this.layers.length;
    for (const L of this.layers) {
      const d = L.def;
      const u = focusX * d.scroll;
      L.group.position.x = focusX - u;
      L.group.position.y = trend + d.base;
      const R = -d.z + 250;
      const a = Math.floor((u - R * 0.8) / LCH), b = Math.floor((u + R * 1.2) / LCH);
      for (const [ci, mesh] of L.chunks) {
        if (ci < a || ci > b) {
          if (mesh) {
            L.group.remove(mesh);
            mesh.geometry.dispose();
          }
          L.chunks.delete(ci);
        }
      }
      for (let ci = a; ci <= b; ci++) {
        if (L.chunks.has(ci)) continue;
        const geo = buildLayerChunk(d, ci, LCH, L.seed);
        let mesh = null;
        if (geo) {
          mesh = new THREE.Mesh(geo, L.mat);
          mesh.frustumCulled = false;
          mesh.renderOrder = -900 + L.index;
          L.group.add(mesh);
        }
        L.chunks.set(ci, mesh);
      }
      const k = nL > 1 ? L.index / (nL - 1) : 0;
      const U = L.mat.uniforms;
      U.uColor.value.copy(m.far).lerp(m.far2, k);
      if (fl > 0) U.uColor.value.lerp(_white, fl * 0.25);
      U.uLow.value.copy(U.uColor.value).lerp(m.fog, 0.8);
      U.uH.value = d.H * 0.9;
      U.uWinAmt.value = d.windows !== undefined ? m.glow * m.glow : 0;
      if (d.rim !== undefined) U.uRimAmt.value = d.rimAmt ?? 1;
      else {
        U.uRim.value.copy(m.sunGlow);
        U.uRimAmt.value = 0.14;
      }
    }

    // clouds
    const cu = focusX * 0.12;
    for (const c of this.clouds) {
      c.u += c.speed * dt;
      const rel = c.u - cu;
      if (rel > 1400) c.u -= 2800;
      else if (rel < -1400) c.u += 2800;
      c.mesh.position.set(focusX + (c.u - cu), trend + c.y, c.z);
      c.mesh.visible = m.cloudAmt > 0.05;
    }

    for (const a of this.anims) {
      if (a.kind === 'spinZ') a.mesh.rotation.z += dt * a.speed;
    }
  }

  /** Track height at x (for shadows, particles, set pieces). */
  groundY(x) {
    return topY(this.course, x);
  }
}
