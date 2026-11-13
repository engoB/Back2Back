// Set pieces and props with moving parts: the Great Clock of Meridian, Tic the
// clockwork owl, the Baron's glider, story cogs and sky rifts.
import * as THREE from 'three';
import { Kit, MAT } from './meshkit.js';
import { TAU } from '../core/math.js';

const PI = Math.PI;
const group = (built, glowMat) => {
  const g = new THREE.Group();
  if (built.lit) g.add(new THREE.Mesh(built.lit, MAT.lit));
  if (built.glow) g.add(new THREE.Mesh(built.glow, glowMat || MAT.glow));
  return g;
};

/** The Great Clock. Returns a group with .hands = { hour, minute } and .face (glow material). */
export function makeClockTower() {
  const k = new Kit(41);
  const stone = 0x8f96a6, stone2 = 0xb4bccb, slate = 0x39425c, brass = 0xc89a4a, snow = 0xf3f8fd;
  // base
  k.box(8, 1, 8, { c: 0x6f7688 });
  k.box(7, 5, 7, { c: stone, c2: stone2, p: [0, 1, 0] });
  k.box(1.8, 3, 0.3, { c: 0x3f2a1e, p: [0, 1, 3.5] });
  k.cyl(0.9, 0.9, 0.3, 10, { c: 0x3f2a1e, p: [0, 4, 3.5], r: [PI / 2, 0, 0], mid: true });
  k.box(7.6, 0.5, 7.6, { c: stone2, p: [0, 6, 0] });
  k.box(7.9, 0.2, 7.9, { c: snow, p: [0, 6.5, 0], j: 0.02 });
  // shaft
  k.box(5, 12, 5, { c: stone, c2: stone2, p: [0, 6.5, 0] });
  for (const [x, z] of [[-2.5, 2.5], [2.5, 2.5], [-2.5, -2.5], [2.5, -2.5]]) k.box(0.7, 12, 0.7, { c: stone2, p: [x, 6.5, z] });
  for (const y of [9, 12.5, 16]) {
    k.box(0.9, 1.5, 0.12, { c: 0xffd98a, glow: true, p: [0, y, 2.52] });
    k.box(0.12, 1.5, 0.9, { c: 0xffd98a, glow: true, p: [2.52, y, 0] });
    k.box(0.12, 1.5, 0.9, { c: 0xffd98a, glow: true, p: [-2.52, y, 0] });
  }
  k.box(6.2, 0.6, 6.2, { c: stone2, p: [0, 18.5, 0] });
  k.box(6.5, 0.2, 6.5, { c: snow, p: [0, 19.1, 0], j: 0.02 });
  // clock stage
  k.box(6, 6, 6, { c: 0x7c8496, c2: 0xa5adbd, p: [0, 19.1, 0] });
  const faces = [[0, 0, 3.02, 0], [3.02, 0, 0, PI / 2], [-3.02, 0, 0, -PI / 2]];
  for (const [x, , z, ry] of faces) {
    const side = ry !== 0, sx = Math.sign(x);
    k.cyl(2.45, 2.45, 0.16, 28, { c: 0xfff6dc, glow: true, p: [x, 22.1, z], r: side ? [0, 0, PI / 2] : [PI / 2, 0, 0], mid: true, j: 0 });
    k.torus(2.5, 0.2, 5, 28, { c: brass, p: [x, 22.1, z], r: [0, ry, 0] });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU, r = 2.05;
      const tx = Math.cos(a) * r, ty = Math.sin(a) * r;
      const big = i % 3 === 0;
      const px = side ? x + sx * 0.1 : x + tx;
      const pz = side ? z - sx * tx : z + 0.1;
      k.box(big ? 0.16 : 0.09, big ? 0.5 : 0.3, 0.05, { c: 0x2a2440, p: [px, 22.1 + ty, pz], r: [0, ry, a - PI / 2], mid: true });
    }
  }
  k.box(6.6, 0.5, 6.6, { c: stone2, p: [0, 25.1, 0] });
  // belfry
  for (const [x, z] of [[-2.6, 2.6], [2.6, 2.6], [-2.6, -2.6], [2.6, -2.6]]) k.cyl(0.3, 0.36, 3, 6, { c: stone2, p: [x, 25.6, z] });
  k.cyl(1.0, 1.25, 1.5, 8, { c: brass, c2: 0xe8c070, p: [0, 26.2, 0] });
  k.box(6.6, 0.4, 6.6, { c: stone2, p: [0, 28.6, 0] });
  k.cone(4.9, 7, 4, { c: slate, c2: 0x55608a, p: [0, 29, 0], r: [0, PI / 4, 0] });
  k.cone(3.1, 4.5, 4, { c: snow, p: [0, 31.9, 0], r: [0, PI / 4, 0], j: 0.02 });
  k.cyl(0.07, 0.1, 3.6, 5, { c: brass, p: [0, 35.8, 0] });
  k.ball(0.38, 1, { c: 0xffd98a, glow: true, p: [0, 39.5, 0] });
  // exposed gears on the flank
  k.gear(1.5, 12, 0.3, { c: brass, c2: 0xe8c070, p: [-2.9, 15, 2.2], r: [0, -PI / 2, 0.3] });
  k.gear(0.9, 9, 0.3, { c: 0x9aa4b8, p: [-2.9, 13, 0.6], r: [0, -PI / 2, 0.1] });

  const g = group(k.build());
  const hands = { list: [] };
  const handMat = new THREE.MeshBasicMaterial({ color: 0x1c1830 });
  const mkHands = (x, z, ry) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 22.1, z);
    pivot.rotation.y = ry;
    const hour = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.35, 0.08), handMat);
    hour.geometry.translate(0, 0.55, 0.16);
    const minute = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.0, 0.08), handMat);
    minute.geometry.translate(0, 0.85, 0.24);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 10), new THREE.MeshBasicMaterial({ color: 0xc89a4a }));
    hub.rotation.x = PI / 2;
    hub.position.z = 0.2;
    pivot.add(hour, minute, hub);
    g.add(pivot);
    hands.list.push({ hour, minute });
  };
  mkHands(0, 3.02, 0);
  mkHands(3.02, 0, PI / 2);
  mkHands(-3.02, 0, -PI / 2);
  /** Set the displayed time (hours as a float, e.g. 23.98). */
  g.setTime = (h) => {
    for (const hd of hands.list) {
      hd.hour.rotation.z = -((h % 12) / 12) * TAU;
      hd.minute.rotation.z = -(h % 1) * TAU;
    }
  };
  g.setTime(23 + 59 / 60);
  return g;
}

/** Tic, the wind-up owl. group.flap(t) animates wings and key. */
export function makeOwl() {
  const brass = 0xc89a4a, light = 0xe8c070;
  const k = new Kit(3);
  k.ball(0.2, 1, { c: brass, c2: light, p: [0, 0, 0], s: [1, 1.15, 0.95] });
  k.ball(0.165, 1, { c: light, p: [0, 0.27, 0.02] });
  k.ball(0.065, 0, { c: 0x5fe1ff, glow: true, p: [-0.07, 0.3, 0.14] });
  k.ball(0.065, 0, { c: 0x5fe1ff, glow: true, p: [0.07, 0.3, 0.14] });
  k.cone(0.035, 0.09, 4, { c: 0xff9a2e, p: [0, 0.24, 0.17], r: [PI / 2, 0, 0] });
  k.cone(0.05, 0.12, 4, { c: brass, p: [-0.1, 0.39, 0] });
  k.cone(0.05, 0.12, 4, { c: brass, p: [0.1, 0.39, 0] });
  k.box(0.04, 0.1, 0.04, { c: 0x8a6a3a, p: [-0.07, -0.3, 0.03] });
  k.box(0.04, 0.1, 0.04, { c: 0x8a6a3a, p: [0.07, -0.3, 0.03] });
  k.gear(0.1, 8, 0.03, { c: 0xffe9a8, glow: true, p: [0, 0.02, 0.19] });
  const g = group(k.build());
  const wk = new Kit(4);
  wk.box(0.3, 0.05, 0.2, { c: brass, c2: light, p: [0.15, 0, 0], mid: true });
  wk.box(0.16, 0.04, 0.14, { c: light, p: [0.36, 0, 0], mid: true });
  const wb = wk.build();
  const wl = new THREE.Mesh(wb.lit, MAT.lit), wr = new THREE.Mesh(wb.lit, MAT.lit);
  wl.position.set(0.16, 0.08, 0);
  wr.position.set(-0.16, 0.08, 0);
  wr.scale.x = -1;
  const kk = new Kit(5);
  kk.cyl(0.02, 0.02, 0.14, 5, { c: light, p: [0, 0, -0.07], r: [PI / 2, 0, 0], mid: true });
  kk.torus(0.07, 0.02, 4, 8, { c: light, p: [0, 0, -0.17] });
  const key = new THREE.Mesh(kk.build().lit, MAT.lit);
  key.position.set(0, 0.02, -0.18);
  g.add(wl, wr, key);
  g.flap = (t, speed = 1) => {
    const a = Math.sin(t * 16 * speed) * 0.7;
    wl.rotation.z = a;
    wr.rotation.z = -a;
    key.rotation.z = t * 3;
  };
  return g;
}

/** The Baron's glider: a black, bat-winged time sled. */
export function makeGlider() {
  const k = new Kit(8);
  const black = 0x15111f, edge = 0x2a2140, gold = 0xffcf5a;
  k.box(3.4, 0.22, 0.9, { c: black, c2: edge, p: [0, 0, 0] });
  k.cone(0.45, 1.6, 4, { c: black, p: [1.7, 0.11, 0], r: [0, PI / 4, -PI / 2], s: [1, 1, 0.45] });
  for (const s of [-1, 1]) {
    k.tris([-0.6, 0.15, s * 0.4, 1.0, 0.15, s * 0.4, -1.8, 0.5, s * 3.6, -0.6, 0.15, s * 0.4, -1.8, 0.5, s * 3.6, -1.9, 0.2, s * 1.2], { c: black });
    k.tris([-0.6, 0.15, s * 0.4, -1.8, 0.5, s * 3.6, 1.0, 0.15, s * 0.4, -0.6, 0.15, s * 0.4, -1.9, 0.2, s * 1.2, -1.8, 0.5, s * 3.6], { c: edge });
    k.box(2.6, 0.04, 0.05, { c: gold, glow: true, p: [-0.4, 0.33, s * 2], r: [0, s * 0.92, 0], mid: true });
  }
  k.cyl(0.2, 0.05, 0.4, 6, { c: gold, glow: true, p: [-1.6, 0.2, 0] });
  k.cyl(0.05, 0.2, 0.4, 6, { c: gold, glow: true, p: [-1.6, 0.6, 0] });
  k.box(0.9, 0.05, 0.7, { c: gold, glow: true, p: [0, -0.05, 0] });
  return group(k.build());
}

const cogCache = new Map();
/** A story cog tinted with the era colour. */
export function makeCog(color = 0xffcf5a) {
  let b = cogCache.get(color);
  if (!b) {
    const k = new Kit(21);
    k.gear(1, 12, 0.24, { c: color, c2: 0xffffff, hole: 0.4 });
    k.gear(0.42, 8, 0.3, { c: 0xfff6dc, glow: true, hole: 0.3 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      k.box(0.1, 0.42, 0.15, { c: color, p: [Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0], r: [0, 0, a - PI / 2], mid: true });
    }
    b = k.build();
    cogCache.set(color, b);
  }
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
  const g = new THREE.Group();
  g.add(new THREE.Mesh(b.lit, mat), new THREE.Mesh(b.glow, mat));
  return g;
}

const RIFT_FRAG = /* glsl */ `
precision highp float;
uniform float uTime, uPower;
uniform vec3 uA, uB;
varying vec2 vUv;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p), a = atan(p.y, p.x);
  float n = vn(vec2(a * 3.0 + r * 6.0 - uTime * 2.5, r * 5.0 - uTime));
  float jag = 0.86 + 0.14 * vn(vec2(a * 5.0, uTime * 1.5));
  float m = smoothstep(jag, jag - 0.3, r);
  vec3 col = mix(uA, uB, 0.5 + 0.5 * sin(a * 4.0 + r * 10.0 - uTime * 5.0)) * (0.4 + n) + vec3(1.0) * exp(-r * r * 6.0) * 1.4;
  gl_FragColor = vec4(col * uPower, m * uPower);
}`;
/** A tear in the sky (additive swirling disc). mesh.material.uniforms.{uTime,uPower}. */
export function makeRift(colorA = 0x6fd3ff, colorB = 0xff8ad8, radius = 6) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 40), new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPower: { value: 1 }, uA: { value: new THREE.Color(colorA) }, uB: { value: new THREE.Color(colorB) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: RIFT_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
  }));
  m.renderOrder = 27;
  return m;
}
