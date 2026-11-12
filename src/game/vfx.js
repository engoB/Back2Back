// Visual effects: pooled particles, GPU weather, light trail, speed lines,
// lightning bolts, shockwave rings and the contact shadow. All procedural.
import * as THREE from 'three';
import { clamp, lerp, TAU } from '../core/math.js';

const P_VERT = /* glsl */ `
attribute vec4 aColor;
attribute float aSize;
uniform float uScale;
varying vec4 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
  vColor = aColor;
}`;
const P_FRAG = /* glsl */ `
precision mediump float;
uniform float uSoft;
varying vec4 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, uSoft, d);
  if (a * vColor.a < 0.004) discard;
  gl_FragColor = vec4(vColor.rgb, vColor.a * a);
}`;

class ParticlePool {
  constructor(scene, cap, additive) {
    this.cap = cap;
    this.n = 0;
    this.head = 0;
    this.pos = new Float32Array(cap * 3);
    this.col = new Float32Array(cap * 4);
    this.size = new Float32Array(cap);
    this.vel = new Float32Array(cap * 3);
    this.life = new Float32Array(cap);
    this.max = new Float32Array(cap);
    this.s0 = new Float32Array(cap);
    this.s1 = new Float32Array(cap);
    this.a0 = new Float32Array(cap);
    this.grav = new Float32Array(cap);
    this.drag = new Float32Array(cap);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 600 }, uSoft: { value: additive ? 0.0 : 0.25 } },
      vertexShader: P_VERT, fragmentShader: P_FRAG, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 30 : 20;
    scene.add(this.points);
    this.geo = g;
  }

  emit(x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a, grav = 0, drag = 0) {
    const i = this.head;
    this.head = (this.head + 1) % this.cap;
    const i3 = i * 3, i4 = i * 4;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.col[i4] = r; this.col[i4 + 1] = g; this.col[i4 + 2] = b; this.col[i4 + 3] = a;
    this.life[i] = life; this.max[i] = life; this.s0[i] = s0; this.s1[i] = s1; this.a0[i] = a;
    this.grav[i] = grav; this.drag[i] = drag;
    this.size[i] = s0;
  }

  update(dt) {
    const { pos, vel, life, max, size, s0, s1, col, a0, grav, drag, cap } = this;
    for (let i = 0; i < cap; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      const i3 = i * 3;
      if (life[i] <= 0) {
        size[i] = 0;
        col[i * 4 + 3] = 0;
        continue;
      }
      const d = 1 - drag[i] * dt;
      vel[i3] *= d; vel[i3 + 1] = vel[i3 + 1] * d - grav[i] * dt; vel[i3 + 2] *= d;
      pos[i3] += vel[i3] * dt; pos[i3 + 1] += vel[i3 + 1] * dt; pos[i3 + 2] += vel[i3 + 2] * dt;
      const t = 1 - life[i] / max[i];
      size[i] = s0[i] + (s1[i] - s0[i]) * t;
      col[i * 4 + 3] = a0[i] * (t < 0.1 ? t * 10 : 1 - (t - 0.1) / 0.9);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
  }

  clear() {
    this.life.fill(0);
    this.size.fill(0);
  }
}

// ---- GPU weather ------------------------------------------------------------
const W_VERT = /* glsl */ `
attribute vec3 aSeed;
uniform float uTime, uSize, uScale, uSway;
uniform vec3 uBox, uCenter, uVel;
varying float vA;
void main() {
  vec3 p = aSeed * uBox + uVel * uTime;
  p.x += sin(uTime * (0.6 + aSeed.y) + aSeed.z * 40.0) * uSway;
  p.y += cos(uTime * (0.5 + aSeed.x) + aSeed.y * 31.0) * uSway * 0.6;
  p = mod(p - uCenter, uBox) + uCenter - uBox * 0.5;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.5 + aSeed.z) * uScale / max(0.1, -mv.z);
  vA = 0.55 + 0.45 * sin(uTime * (1.0 + aSeed.x * 3.0) + aSeed.y * 50.0);
}`;
const W_FRAG = /* glsl */ `
precision mediump float;
uniform vec3 uColor;
uniform float uOpacity, uSoft, uTwinkle;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, uSoft, d) * uOpacity * mix(1.0, vA, uTwinkle);
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor, a);
}`;

export const WEATHER = {
  none: null,
  snow: { count: 420, color: 0xffffff, size: 0.2, vel: [-2.2, -3.2, 0.3], sway: 0.5, opacity: 0.9, soft: 0.1 },
  storm: { count: 620, color: 0xdfeaff, size: 0.2, vel: [-9, -9, 0.5], sway: 0.9, opacity: 0.9, soft: 0.1 },
  pollen: { count: 220, color: 0xf6ff9a, size: 0.26, vel: [-0.6, 0.35, 0.1], sway: 1.2, opacity: 0.9, soft: 0, add: true, twinkle: 1 },
  dust: { count: 260, color: 0xf6d9a0, size: 0.34, vel: [-6.5, -0.2, 0.4], sway: 0.6, opacity: 0.4, soft: 0 },
  leaves: { count: 200, color: 0xff9a3a, size: 0.27, vel: [-2.5, -2.0, 0.4], sway: 1.3, opacity: 0.95, soft: 0.38 },
  bokeh: { count: 150, color: 0xff5fc0, size: 0.9, vel: [-0.8, 0.25, 0], sway: 0.8, opacity: 0.2, soft: 0.1, add: true, twinkle: 0.8 },
  motes: { count: 260, color: 0x9ffff0, size: 0.16, vel: [-0.4, 1.4, 0], sway: 0.5, opacity: 0.85, soft: 0, add: true, twinkle: 1 },
  timedust: { count: 320, color: 0xffd98a, size: 0.2, vel: [0.3, 2.2, 0], sway: 0.9, opacity: 0.9, soft: 0, add: true, twinkle: 1 },
};

class Weather {
  constructor(scene) {
    this.scene = scene;
    this.points = null;
    this.kind = 'none';
    this.time = 0;
    this.scale = 600;
  }
  set(kind, density = 1) {
    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
      this.points.material.dispose();
      this.points = null;
    }
    this.kind = kind;
    const W = WEATHER[kind];
    if (!W) return;
    const n = Math.round(W.count * density);
    const seed = new Float32Array(n * 3);
    for (let i = 0; i < seed.length; i++) seed[i] = Math.random();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uSize: { value: W.size }, uScale: { value: this.scale }, uSway: { value: W.sway },
        uBox: { value: new THREE.Vector3(90, 46, 34) }, uCenter: { value: new THREE.Vector3() },
        uVel: { value: new THREE.Vector3(...W.vel) }, uColor: { value: new THREE.Color(W.color) },
        uOpacity: { value: W.opacity }, uSoft: { value: W.soft }, uTwinkle: { value: W.twinkle || 0 },
      },
      vertexShader: W_VERT, fragmentShader: W_FRAG, transparent: true, depthWrite: false,
      blending: W.add ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 25;
    this.scene.add(this.points);
  }
  update(dt, cx, cy) {
    if (!this.points) return;
    this.time += dt;
    const u = this.points.material.uniforms;
    u.uTime.value = this.time;
    u.uCenter.value.set(cx, cy, 4);
    u.uScale.value = this.scale;
  }
}

// ---- lightning ---------------------------------------------------------------
const BOLT_PTS = 33;
class Bolt {
  constructor(scene) {
    this.pos = new Float32Array(BOLT_PTS * 2 * 3);
    const idx = [];
    for (let i = 0; i < BOLT_PTS - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(idx);
    this.mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
      side: THREE.DoubleSide, fog: false, depthTest: false,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 40;
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.life = 0;
    this.max = 1;
  }
  fire(ax, ay, az, bx, by, bz, color, width, life, jag) {
    const pts = new Float32Array(BOLT_PTS * 3);
    const set = (i, x, y, z) => { pts[i * 3] = x; pts[i * 3 + 1] = y; pts[i * 3 + 2] = z; };
    set(0, ax, ay, az);
    set(BOLT_PTS - 1, bx, by, bz);
    const len = Math.hypot(bx - ax, by - ay, bz - az);
    const sub = (i0, i1, amp) => {
      if (i1 - i0 < 2) return;
      const m = (i0 + i1) >> 1;
      set(m, (pts[i0 * 3] + pts[i1 * 3]) / 2 + (Math.random() - 0.5) * amp,
        (pts[i0 * 3 + 1] + pts[i1 * 3 + 1]) / 2 + (Math.random() - 0.5) * amp,
        (pts[i0 * 3 + 2] + pts[i1 * 3 + 2]) / 2 + (Math.random() - 0.5) * amp * 0.3);
      sub(i0, m, amp * 0.52);
      sub(m, i1, amp * 0.52);
    };
    sub(0, BOLT_PTS - 1, len * jag);
    const p = this.pos;
    for (let i = 0; i < BOLT_PTS; i++) {
      const a = Math.max(0, i - 1), b = Math.min(BOLT_PTS - 1, i + 1);
      let nx = -(pts[b * 3 + 1] - pts[a * 3 + 1]), ny = pts[b * 3] - pts[a * 3];
      const l = Math.hypot(nx, ny) || 1;
      const w = width * (0.6 + 0.4 * Math.sin((i / (BOLT_PTS - 1)) * Math.PI));
      nx = (nx / l) * w; ny = (ny / l) * w;
      p[i * 6] = pts[i * 3] + nx; p[i * 6 + 1] = pts[i * 3 + 1] + ny; p[i * 6 + 2] = pts[i * 3 + 2];
      p[i * 6 + 3] = pts[i * 3] - nx; p[i * 6 + 4] = pts[i * 3 + 1] - ny; p[i * 6 + 5] = pts[i * 3 + 2];
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mat.color.set(color);
    this.life = this.max = life;
    this.mesh.visible = true;
    return pts;
  }
  update(dt) {
    if (this.life <= 0) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.mesh.visible = false;
      return;
    }
    const t = this.life / this.max;
    this.mat.opacity = t * (0.65 + 0.35 * Math.sin(t * 60));
  }
}

// ---- main facade ---------------------------------------------------------------
const RIBBON_N = 30;
const _c = new THREE.Color();

export class Fx {
  constructor(scene, density = 1) {
    this.scene = scene;
    this.density = density;
    this.normal = new ParticlePool(scene, 700, false);
    this.add = new ParticlePool(scene, 900, true);
    this.weather = new Weather(scene);
    this.bolts = [];
    for (let i = 0; i < 8; i++) this.bolts.push(new Bolt(scene));
    this.boltI = 0;

    // light trail behind the board
    this.ribPos = new Float32Array(RIBBON_N * 2 * 3);
    this.ribCol = new Float32Array(RIBBON_N * 2 * 4);
    const idx = [];
    for (let i = 0; i < RIBBON_N - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(this.ribPos, 3).setUsage(THREE.DynamicDrawUsage));
    rg.setAttribute('color', new THREE.BufferAttribute(this.ribCol, 4).setUsage(THREE.DynamicDrawUsage));
    rg.setIndex(idx);
    this.ribbon = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
    }));
    this.ribbon.frustumCulled = false;
    this.ribbon.renderOrder = 28;
    scene.add(this.ribbon);
    this.trail = [];
    this.trailColor = new THREE.Color(0x6fd3ff);

    // speed lines
    this.lineN = 26;
    this.linePos = new Float32Array(this.lineN * 6);
    this.lineData = [];
    for (let i = 0; i < this.lineN; i++) this.lineData.push({ life: 0, x: 0, y: 0, z: 0, len: 0, v: 0 });
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(this.linePos, 3).setUsage(THREE.DynamicDrawUsage));
    this.lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 29;
    scene.add(this.lines);

    // shockwave rings
    this.rings = [];
    const ringGeo = new THREE.RingGeometry(0.86, 1, 40);
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
      }));
      m.visible = false;
      m.renderOrder = 31;
      scene.add(m);
      this.rings.push({ mesh: m, life: 0, max: 1, r0: 1, r1: 5 });
    }

    // contact shadow
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 16), new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false, fog: false,
    }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.renderOrder = 5;
    scene.add(this.shadow);
    this.pixelScale = 600;
  }

  setViewport(height, fovDeg) {
    this.pixelScale = height / (2 * Math.tan((fovDeg * Math.PI) / 360));
    this.normal.mat.uniforms.uScale.value = this.pixelScale;
    this.add.mat.uniforms.uScale.value = this.pixelScale;
    this.weather.scale = this.pixelScale;
  }

  // ---- emitters ---------------------------------------------------------
  /** Spray thrown up behind the board while carving. */
  spray(x, y, speed, color, slope) {
    _c.set(color);
    const n = Math.random() < this.density ? 1 : 0;
    for (let i = 0; i < n; i++) {
      const a = slope + Math.PI - 0.35 - Math.random() * 0.7;
      const v = speed * (0.12 + Math.random() * 0.16);
      this.normal.emit(x - 0.5 + Math.random() * 0.3, y + 0.05, (Math.random() - 0.5) * 0.4,
        Math.cos(a) * v + speed * 0.25, Math.abs(Math.sin(a)) * v + 0.6, (Math.random() - 0.5) * 1.5,
        0.35 + Math.random() * 0.4, 0.24, 0.6 + Math.random() * 0.4, _c.r, _c.g, _c.b, 0.75, 7, 1.2);
    }
  }
  burst(x, y, z, color, n, speed = 4, size = 0.4, life = 0.6, additive = false, grav = 6) {
    _c.set(color);
    const pool = additive ? this.add : this.normal;
    n = Math.ceil(n * this.density);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = speed * (0.3 + Math.random() * 0.7);
      pool.emit(x, y, z, Math.cos(a) * v, Math.sin(a) * v * 0.8 + speed * 0.3, (Math.random() - 0.5) * v,
        life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.6), size * 0.2, _c.r, _c.g, _c.b, additive ? 0.9 : 0.85, grav, 1.5);
    }
  }
  landing(x, y, color, power) {
    _c.set(color);
    const n = Math.ceil((8 + power * 10) * this.density);
    for (let i = 0; i < n; i++) {
      const s = Math.random() < 0.5 ? -1 : 1;
      const v = (2 + Math.random() * 4) * (0.6 + power);
      this.normal.emit(x + s * Math.random() * 0.6, y + 0.1, (Math.random() - 0.5) * 0.8, s * v, 1 + Math.random() * 2.5 * power, (Math.random() - 0.5) * 2,
        0.5 + Math.random() * 0.4, 0.3, 1.1 + Math.random() * 0.6, _c.r, _c.g, _c.b, 0.7, 5, 2.2);
    }
  }
  sparks(x, y, vx, color = 0xffd27a) {
    _c.set(color);
    const n = Math.random() < 0.7 * this.density ? 2 : 0;
    for (let i = 0; i < n; i++) {
      this.add.emit(x, y, (Math.random() - 0.5) * 0.2, vx * 0.3 - 2 - Math.random() * 5, 1 + Math.random() * 4, (Math.random() - 0.5) * 3,
        0.25 + Math.random() * 0.3, 0.16, 0.03, _c.r, _c.g, _c.b, 1, 14, 0.5);
    }
  }
  coin(x, y, color = 0xffe38a) {
    _c.set(color);
    for (let i = 0; i < Math.ceil(5 * this.density); i++) {
      const a = Math.random() * TAU, v = 1.5 + Math.random() * 2.5;
      this.add.emit(x, y, 0, Math.cos(a) * v, Math.sin(a) * v + 1, (Math.random() - 0.5) * 2, 0.3 + Math.random() * 0.25, 0.22, 0.02, _c.r, _c.g, _c.b, 1, 3, 2);
    }
    this.add.emit(x, y, 0.2, 0, 0, 0, 0.22, 0.6, 1.6, _c.r, _c.g, _c.b, 0.55);
  }
  /** Soft additive glow blob. */
  glow(x, y, z, color, size, life = 0.4, alpha = 0.6) {
    _c.set(color);
    this.add.emit(x, y, z, 0, 0, 0, life, size, size * 1.5, _c.r, _c.g, _c.b, alpha);
  }
  energy(x, y, color, rate = 1) {
    _c.set(color);
    if (Math.random() > rate * this.density) return;
    const a = Math.random() * TAU;
    this.add.emit(x + Math.cos(a) * 0.5, y + 0.4 + Math.sin(a) * 0.6, (Math.random() - 0.5) * 0.6, -3 - Math.random() * 4, (Math.random() - 0.3) * 2.5, 0,
      0.3 + Math.random() * 0.3, 0.3, 0.04, _c.r, _c.g, _c.b, 0.95, -1, 1);
  }
  smoke(x, y, z, color, size = 1, up = 1.5) {
    _c.set(color);
    this.normal.emit(x, y, z, (Math.random() - 0.5) * 0.8, up * (0.6 + Math.random() * 0.6), (Math.random() - 0.5) * 0.5,
      1.2 + Math.random() * 0.8, size * 0.6, size * 2.2, _c.r, _c.g, _c.b, 0.45, -0.3, 0.6);
  }
  debris(x, y, color, n = 10) {
    this.burst(x, y + 0.4, 0, color, n, 7, 0.34, 0.8, false, 16);
  }
  ring(x, y, z, color, r0, r1, life = 0.5) {
    let r = this.rings[0];
    for (const c of this.rings) if (c.life <= 0) { r = c; break; }
    r.life = r.max = life;
    r.r0 = r0; r.r1 = r1;
    r.mesh.position.set(x, y, z);
    r.mesh.material.color.set(color);
    r.mesh.visible = true;
  }
  /** Lightning between two points; returns the bolt polyline for extra effects. */
  bolt(a, b, color = 0xcfe6ff, width = 0.22, life = 0.28, jag = 0.22, branches = 1) {
    const B = this.bolts[this.boltI++ % this.bolts.length];
    const pts = B.fire(a.x, a.y, a.z, b.x, b.y, b.z, color, width, life, jag);
    for (let k = 0; k < branches; k++) {
      const i = 6 + Math.floor(Math.random() * (BOLT_PTS - 14));
      const B2 = this.bolts[this.boltI++ % this.bolts.length];
      const len = Math.hypot(b.x - a.x, b.y - a.y) * (0.2 + Math.random() * 0.25);
      const ang = Math.atan2(b.y - a.y, b.x - a.x) + (Math.random() - 0.5) * 1.6;
      B2.fire(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2], pts[i * 3] + Math.cos(ang) * len, pts[i * 3 + 1] + Math.sin(ang) * len, pts[i * 3 + 2],
        color, width * 0.5, life * 0.8, jag * 1.2);
    }
    return pts;
  }

  // ---- per-frame --------------------------------------------------------
  /** Feed the light trail with the board's tail position. width 0 hides it. */
  trailPoint(x, y, width, color) {
    const tr = this.trail;
    const last = tr[tr.length - 1];
    if (!last || Math.hypot(x - last.x, y - last.y) > 0.32) {
      tr.push({ x, y, w: width, age: 0 });
      if (tr.length > RIBBON_N) tr.shift();
    } else {
      last.x = x; last.y = y; last.w = width;
    }
    this.trailColor.set(color);
  }
  resetTrail() {
    this.trail.length = 0;
  }

  speedLines(dt, cx, cy, speed, on) {
    const d = this.lineData, p = this.linePos;
    for (let i = 0; i < this.lineN; i++) {
      const L = d[i];
      if (L.life <= 0) {
        if (on && Math.random() < dt * 14) {
          L.life = 0.35 + Math.random() * 0.2;
          L.x = cx + 14 + Math.random() * 24;
          L.y = cy - 7 + Math.random() * 16;
          L.z = -6 + Math.random() * 12;
          L.len = 4 + Math.random() * 7;
          L.v = speed * (0.9 + Math.random() * 0.8);
        } else {
          p[i * 6] = p[i * 6 + 3] = 0; p[i * 6 + 1] = p[i * 6 + 4] = -99999; p[i * 6 + 2] = p[i * 6 + 5] = 0;
          continue;
        }
      }
      L.life -= dt;
      L.x -= L.v * dt;
      p[i * 6] = L.x; p[i * 6 + 1] = L.y; p[i * 6 + 2] = L.z;
      p[i * 6 + 3] = L.x + L.len; p[i * 6 + 4] = L.y - L.len * 0.12; p[i * 6 + 5] = L.z;
    }
    this.lines.geometry.attributes.position.needsUpdate = true;
  }

  setShadow(x, groundY, slope, height, visible = true) {
    const s = this.shadow;
    s.visible = visible;
    if (!visible) return;
    const k = clamp(1 - height / 9, 0.25, 1);
    s.position.set(x, groundY + 0.035, 0);
    s.rotation.set(-Math.PI / 2, 0, 0);
    s.rotateY(slope);
    s.scale.set(0.95 * k, 0.42 * k, 1);
    s.material.opacity = 0.3 * k;
  }

  update(dt, cx, cy) {
    this.normal.update(dt);
    this.add.update(dt);
    this.weather.update(dt, cx, cy);
    for (const b of this.bolts) b.update(dt);
    for (const r of this.rings) {
      if (r.life <= 0) continue;
      r.life -= dt;
      if (r.life <= 0) { r.mesh.visible = false; continue; }
      const t = 1 - r.life / r.max;
      const e = 1 - Math.pow(1 - t, 3);
      r.mesh.scale.setScalar(lerp(r.r0, r.r1, e));
      r.mesh.material.opacity = (1 - t) * 0.8;
    }
    // ribbon
    const tr = this.trail, pos = this.ribPos, col = this.ribCol, c = this.trailColor;
    for (const p of tr) p.age += dt;
    const n = tr.length;
    for (let i = 0; i < RIBBON_N; i++) {
      const k = Math.min(i, n - 1);
      const o = i * 6, oc = i * 8;
      if (n < 2) {
        pos[o] = pos[o + 3] = 0; pos[o + 1] = pos[o + 4] = -99999; pos[o + 2] = pos[o + 5] = 0;
        continue;
      }
      const p = tr[k];
      const a = tr[Math.max(0, k - 1)], b = tr[Math.min(n - 1, k + 1)];
      let nx = -(b.y - a.y), ny = b.x - a.x;
      const l = Math.hypot(nx, ny) || 1;
      const f = k / (n - 1);
      const w = p.w * (0.25 + 0.75 * f) * Math.max(0, 1 - p.age * 1.1);
      nx = (nx / l) * w; ny = (ny / l) * w;
      pos[o] = p.x + nx; pos[o + 1] = p.y + ny; pos[o + 2] = 0;
      pos[o + 3] = p.x - nx; pos[o + 4] = p.y - ny; pos[o + 5] = 0;
      const al = f * f * Math.max(0, 1 - p.age * 1.2) * (p.w > 0.01 ? 1 : 0);
      col[oc] = c.r; col[oc + 1] = c.g; col[oc + 2] = c.b; col[oc + 3] = al;
      col[oc + 4] = c.r; col[oc + 5] = c.g; col[oc + 6] = c.b; col[oc + 7] = al;
    }
    this.ribbon.geometry.attributes.position.needsUpdate = true;
    this.ribbon.geometry.attributes.color.needsUpdate = true;
  }

  clear() {
    this.normal.clear();
    this.add.clear();
    this.resetTrail();
    for (const r of this.rings) { r.life = 0; r.mesh.visible = false; }
  }
}
