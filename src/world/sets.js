// Set pieces and props with moving parts: the Great Clock of Meridian, Tic the
// clockwork owl, the Baron's glider, story cogs and sky rifts.
import * as THREE from 'three';
import { Kit, MAT } from './meshkit.js';
import { Art } from './art.js';
import { TAU } from '../core/math.js';

const PI = Math.PI;
const group = (built, glowMat) => {
  const g = new THREE.Group();
  if (built.lit) g.add(new THREE.Mesh(built.lit, MAT.lit));
  if (built.glow) g.add(new THREE.Mesh(built.glow, glowMat || MAT.glow));
  return g;
};

/**
 * The Great Clock of Meridian, drawn like the rest of the scenery: a front-facing
 * illustration (39.5 m tall, dial centred 22.1 m above its foot) with moving hands
 * and gears. group.setTime(hours) sets the displayed time.
 */
export function makeClockTower() {
  const a = new Art(41);
  const stone = 0x8a91a3, stone2 = 0xb6bece, trim = 0xa3aabb, shade = 0x6b7286, slate = 0x343d58, slate2 = 0x566290;
  const brass = 0xc89a4a, brass2 = 0xecc878, snow = 0xf3f8fd, warm = 0xffd98a, dark = 0x2a2440;
  const arch = (x, y, w, h, c, o) => a.fill(`M ${x - w} ${y} L ${x - w} ${y + h - w} Q ${x - w} ${y + h} ${x} ${y + h} Q ${x + w} ${y + h} ${x + w} ${y + h - w} L ${x + w} ${y} Z`, c, o);
  // plinth, steps
  a.rect(-4.7, -2.5, 9.4, 3.1, shade, { c2: 0x7d8496 });
  a.rect(-4.25, 0.6, 8.5, 0.5, 0x7d8496);
  // base block with corner stones and the door
  a.rect(-3.6, 1.1, 7.2, 5.2, stone, { c2: stone2 });
  for (let i = 0; i < 6; i++) {
    const w = 0.7 + (i % 2) * 0.35;
    a.rect(-3.6, 1.2 + i * 0.86, w, 0.62, trim);
    a.rect(3.6 - w, 1.2 + i * 0.86, w, 0.62, trim);
  }
  arch(0, 1.1, 1.05, 3.7, 0x5d6474);
  arch(0, 1.1, 0.82, 3.45, 0x3f2a1e, { c2: 0x5e402c });
  a.rect(-0.03, 1.1, 0.06, 3.3, 0x2a1a12);
  a.circle(0.3, 2.6, 0.07, brass2);
  for (const x of [-2.3, 2.3]) {
    arch(x, 2.2, 0.5, 2.0, 0x5d6474);
    arch(x, 2.32, 0.36, 1.76, warm, { glow: true, c2: 0xfff3c8 });
    a.rect(x - 0.025, 2.32, 0.05, 1.7, 0x5d6474);
  }
  a.circle(0, 5.45, 0.2, warm, { glow: true });
  a.rect(-3.95, 6.3, 7.9, 0.5, stone2);
  a.rrect(-4.05, 6.74, 8.1, 0.24, 0.11, snow);
  // shaft: slightly tapered, pilasters, string courses, three lit windows
  a.fill('M -2.65 7.0 L -2.45 18.7 L 2.45 18.7 L 2.65 7.0 Z', stone, { c2: stone2 });
  a.fill('M -2.65 7.0 L -2.45 18.7 L -1.95 18.7 L -2.12 7.0 Z', trim);
  a.fill('M 2.65 7.0 L 2.45 18.7 L 1.95 18.7 L 2.12 7.0 Z', trim);
  for (const y of [10.85, 14.55]) a.rect(-2.55, y, 5.1, 0.2, trim);
  for (const y of [8.1, 11.8, 15.5]) {
    arch(0, y, 0.58, 2.2, 0x5d6474);
    arch(0, y + 0.12, 0.42, 1.94, warm, { glow: true, c2: 0xfff3c8 });
    a.rect(-0.03, y + 0.12, 0.06, 1.9, 0x5d6474);
    a.rect(-0.42, y + 1.0, 0.84, 0.06, 0x5d6474);
    a.rrect(-0.74, y - 0.15, 1.48, 0.17, 0.07, snow);
  }
  // corbelled cornice under the clock stage
  a.fill('M -2.45 18.7 L -3.35 19.45 L 3.35 19.45 L 2.45 18.7 Z', trim);
  a.rrect(-3.5, 19.4, 7.0, 0.24, 0.11, snow);
  // clock stage
  a.rect(-3.15, 19.6, 6.3, 5.2, 0x79819a, { c2: 0xa8b0c2 });
  a.rect(-3.15, 19.6, 0.5, 5.2, 0x959db0);
  a.rect(2.65, 19.6, 0.5, 5.2, 0x959db0);
  a.circle(0, 22.1, 2.68, brass, { c2: brass2, seg: 56 });
  a.circle(0, 22.1, 2.4, 0x8a6a30, { seg: 56 });
  a.circle(0, 22.1, 2.3, 0xfff6dc, { glow: true, seg: 56 });
  for (let i = 0; i < 60; i++) {
    const ang = (i / 60) * TAU, big = i % 5 === 0, r0 = big ? 1.78 : 2.02, r1 = 2.16, w = big ? 0.12 : 0.035;
    if (!big && i % 5 !== 0 && i % 1 !== 0) continue;
    a.stroke([Math.cos(ang) * r0, 22.1 + Math.sin(ang) * r0, Math.cos(ang) * r1, 22.1 + Math.sin(ang) * r1], w, w, dark);
  }
  // cornice, belfry with its bell, eaves
  a.fill('M -3.15 24.8 L -3.55 25.35 L 3.55 25.35 L 3.15 24.8 Z', trim);
  a.rect(-3.05, 25.35, 6.1, 3.1, 0x424a62, { c2: 0x565f7c });
  a.fill('M -0.95 25.9 Q -0.86 27.3 -0.36 27.65 L 0.36 27.65 Q 0.86 27.3 0.95 25.9 Z', brass, { c2: brass2 });
  a.circle(0, 25.86, 0.17, 0x8a6a30);
  a.rect(-0.05, 27.6, 0.1, 0.85, 0x8a6a30);
  for (const x of [-3.05, -1.25, 0.95, 2.75]) a.rect(x, 25.35, 0.3, 3.1, stone2, { c2: 0xcfd6e2 });
  for (const x of [-2.0, 0, 2.0]) a.fill(`M ${x - 0.78} 28.45 L ${x - 0.78} 28.0 Q ${x} 27.3 ${x + 0.78} 28.0 L ${x + 0.78} 28.45 Z`, stone2);
  a.rect(-3.4, 28.45, 6.8, 0.45, stone2);
  // spire: slate with snow on the windward side, a lit dormer, the finial and its lamp
  a.fill('M -3.7 28.9 Q -1.5 31.4 -0.5 34.9 L 0 37.3 L 0.5 34.9 Q 1.5 31.4 3.7 28.9 Z', slate, { c2: slate2 });
  a.fill('M -3.7 28.9 Q -1.5 31.4 -0.5 34.9 L 0 37.3 L -0.08 35.3 Q -0.9 32.3 -2.2 30.5 Q -2.8 30.0 -3.7 28.9 Z', snow, { c2: 0xffffff });
  a.rrect(-3.85, 28.8, 7.7, 0.27, 0.12, snow);
  a.fill('M -0.55 30.0 L -0.55 31.1 L 0 31.8 L 0.55 31.1 L 0.55 30.0 Z', 0x2a3048);
  a.fill('M -0.33 30.15 L -0.33 31.0 L 0 31.42 L 0.33 31.0 L 0.33 30.15 Z', warm, { glow: true });
  a.rect(-0.05, 37.1, 0.1, 2.1, brass);
  a.circle(0, 39.5, 0.38, warm, { glow: true });
  a.circle(0, 38.2, 0.16, brass2);

  const g = group(a.build());
  // exposed gears on the flank, turning behind the shaft
  const gearOf = (R, teeth, c, c2, x, y) => {
    const ga = new Art(7);
    ga.gear(0, 0, R, teeth, c, { c2, hole: 0.3, holeColor: 0x4a5268 });
    const m = new THREE.Mesh(ga.build().lit, MAT.lit);
    m.position.set(x, y, -0.06);
    g.add(m);
    return m;
  };
  const gears = [gearOf(1.55, 12, brass, brass2, -2.75, 15.1), gearOf(0.95, 9, 0x9aa4b8, 0xc4ccdc, -2.95, 12.65)];
  // hands
  const handMat = new THREE.MeshBasicMaterial({ color: 0x1c1830, fog: false });
  const pivot = new THREE.Group();
  pivot.position.set(0, 22.1, 0.9);
  const hour = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 1.4), handMat);
  hour.geometry.translate(0, 0.52, 0);
  const minute = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 2.05), handMat);
  minute.geometry.translate(0, 0.86, 0.02);
  const hub = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), new THREE.MeshBasicMaterial({ color: 0xc89a4a, fog: false }));
  hub.position.z = 0.04;
  pivot.add(hour, minute, hub);
  g.add(pivot);
  /** Set the displayed time (hours as a float, e.g. 23.98). */
  g.setTime = (h) => {
    hour.rotation.z = -((h % 12) / 12) * TAU;
    minute.rotation.z = -(h % 1) * TAU;
    gears[0].rotation.z = h * 26;
    gears[1].rotation.z = -h * 26 * (12 / 9) + 0.2;
  };
  /** Render the whole tower in a given post-processing layer (see core/post.js). */
  g.setLayer = (layer) => g.traverse((o) => o.layers.set(layer));
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
