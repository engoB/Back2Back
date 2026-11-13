// The time tunnel: a streaking vortex the rider surfs through between eras.
import * as THREE from 'three';
import { Kit } from '../world/meshkit.js';
import { TAU } from '../core/math.js';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = /* glsl */ `
precision highp float;
uniform float uTime, uMix, uFade;
uniform vec3 uA, uB;
varying vec2 vUv;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
void main() {
  float u = vUv.x, v = vUv.y, t = uTime;
  float streak = smoothstep(0.62, 1.0, vn(vec2(u * 64.0, v * 5.0 + t * 5.0)));
  float flow = vn(vec2(u * 12.0 + sin(v * 3.0 + t) * 0.5, v * 3.0 + t * 2.6));
  float rings = smoothstep(0.9, 1.0, sin(v * 60.0 + t * 34.0));
  float spiral = 0.5 + 0.5 * sin(u * 6.2832 * 3.0 + v * 26.0 + t * 7.0);
  vec3 base = mix(uA, uB, clamp(uMix + 0.3 * sin(u * 12.566 + t * 2.0 + v * 9.0), 0.0, 1.0));
  vec3 col = base * (0.1 + 0.55 * flow + 0.35 * spiral) + vec3(1.0) * streak * 1.1 + base * rings * 0.8;
  gl_FragColor = vec4(col * uFade, 1.0);
}`;

export class Warp {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.uniforms = {
      uTime: { value: 0 }, uMix: { value: 0 }, uFade: { value: 1 },
      uA: { value: new THREE.Color(0x6fd3ff) }, uB: { value: new THREE.Color(0xff8ad8) },
    };
    const geo = new THREE.CylinderGeometry(13, 13, 900, 48, 1, true);
    geo.rotateZ(Math.PI / 2);
    this.tunnel = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide, fog: false,
    }));
    this.tunnel.frustumCulled = false;
    this.group.add(this.tunnel);

    this.glow = new THREE.Mesh(new THREE.CircleGeometry(60, 32), new THREE.MeshBasicMaterial({
      color: 0xffffff, fog: false, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.glow.rotation.y = -Math.PI / 2;
    this.glow.position.x = 380;
    this.group.add(this.glow);

    // clockwork debris rushing past
    const k = new Kit(9);
    k.gear(1, 10, 0.25, { c: 0xffe9a8, c2: 0xffffff, glow: true });
    const g = k.build().glow;
    this.N = 44;
    this.gears = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }), this.N);
    this.gears.frustumCulled = false;
    this.group.add(this.gears);
    this.data = [];
    for (let i = 0; i < this.N; i++) {
      this.data.push({
        a: Math.random() * TAU, r: 4.5 + Math.random() * 7, x: Math.random() * 400 - 60, s: 0.3 + Math.random() * 1.1,
        v: 90 + Math.random() * 110, spin: (Math.random() - 0.5) * 8,
      });
    }
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this.time = 0;
  }

  start(x, y, colorA, colorB) {
    this.group.position.set(x, y + 1.2, 0);
    this.uniforms.uA.value.set(colorA);
    this.uniforms.uB.value.set(colorB);
    this.uniforms.uMix.value = 0;
    this.group.visible = true;
    this.time = 0;
  }

  /** k: 0..1 progress through the tunnel. */
  update(dt, k) {
    if (!this.group.visible) return;
    this.time += dt;
    this.uniforms.uTime.value = this.time;
    this.uniforms.uMix.value = k;
    for (let i = 0; i < this.N; i++) {
      const d = this.data[i];
      d.x -= d.v * dt;
      if (d.x < -70) {
        d.x = 320 + Math.random() * 80;
        d.a = Math.random() * TAU;
      }
      this._e.set(d.spin * this.time, d.a, d.spin * this.time * 0.7);
      this._m.compose(this._p.set(d.x, Math.cos(d.a) * d.r, Math.sin(d.a) * d.r), this._q.setFromEuler(this._e), this._s.setScalar(d.s));
      this.gears.setMatrixAt(i, this._m);
    }
    this.gears.instanceMatrix.needsUpdate = true;
  }

  stop() {
    this.group.visible = false;
  }
}
