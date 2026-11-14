// Full-screen procedural sky: three-stop gradient, sun/moon with halo, stars,
// a striped retro sun for the neon era and a nebula for the end of time.
import * as THREE from 'three';
import { LAYER } from '../core/post.js';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}`;

const FRAG = /* glsl */ `
precision highp float;
uniform vec3 uTop, uMid, uBot, uSun, uGlow;
uniform vec2 uSunPos;
uniform float uSunSize, uGlowSize, uStars, uTime, uAspect, uMidPos, uStyle, uScroll, uFlash, uHorizon, uBoost;
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.02; a *= 0.5; }
  return s;
}

void main() {
  float y = clamp(vUv.y + uHorizon, 0.0, 1.0);
  vec3 col = y < uMidPos
    ? mix(uBot, uMid, smoothstep(0.0, uMidPos, y))
    : mix(uMid, uTop, smoothstep(uMidPos, 1.0, y));
  vec2 p = vUv * 2.0 - 1.0;
  p.y += uHorizon * 2.0;
  p.x *= uAspect;
  vec2 sp = uSunPos;
  sp.x *= max(uAspect, 0.7);
  float d = length(p - sp);

  if (uStyle > 1.5) {
    vec2 q = p * 1.2 + vec2(uScroll * 0.015, 0.0);
    float n = fbm(q * 1.6 + fbm(q * 2.1 + uTime * 0.015) * 1.4);
    col += uGlow * pow(n, 3.0) * 1.1;
    col += vec3(0.30, 0.16, 0.85) * pow(fbm(q * 2.4 + 7.3), 4.0) * 1.6;
    col += vec3(0.05, 0.45, 0.55) * pow(fbm(q * 1.1 - 3.1), 5.0) * 1.4;
  }

  if (uStars > 0.01) {
    vec2 g = (p + vec2(uScroll * 0.006, 0.0)) * 34.0;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float h = hash(id);
    if (h > 0.9) {
      vec2 o = vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5;
      float s = smoothstep(0.035 + 0.07 * fract(h * 37.0), 0.0, length(f - o * 0.7));
      float tw = 0.6 + 0.4 * sin(uTime * (1.5 + h * 4.0) + h * 40.0);
      col += s * tw * uStars * smoothstep(0.08, 0.55, y) * vec3(1.0, 0.97, 0.9);
    }
  }

  col += uGlow * exp(-d * d / (uGlowSize * uGlowSize)) * 0.5;
  col += uGlow * exp(-d * 9.0 / uGlowSize) * 0.25;

  float disc = smoothstep(uSunSize, uSunSize - 0.008, d);
  vec3 sunCol = uSun;
  if (uStyle > 0.5 && uStyle < 1.5) {
    float ny = (p.y - sp.y) / uSunSize;
    sunCol = mix(uGlow, uSun, smoothstep(-1.0, 0.7, ny));
    float band = fract((ny * 0.5 + 0.5) * 8.0 - uTime * 0.06);
    float cut = step(ny, 0.2) * step(band, 0.14 + 0.38 * (0.2 - ny));
    disc *= 1.0 - cut;
  }
  col = mix(col, sunCol * uBoost, disc);
  col += uFlash;
  gl_FragColor = vec4(col, 1.0);
}`;

export class Sky {
  constructor() {
    this.uniforms = {
      uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uBot: { value: new THREE.Color() },
      uSun: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() },
      uSunPos: { value: new THREE.Vector2(0.4, 0.4) },
      uSunSize: { value: 0.1 }, uGlowSize: { value: 0.5 }, uStars: { value: 0 }, uTime: { value: 0 },
      uAspect: { value: 1 }, uMidPos: { value: 0.4 }, uStyle: { value: 0 }, uScroll: { value: 0 },
      uFlash: { value: 0 }, uHorizon: { value: 0 }, uBoost: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
    this.mesh.layers.set(LAYER.SKY);
  }

  /** `m` is a blended mood (THREE.Color fields + numbers). */
  apply(m, time, aspect, scroll) {
    const u = this.uniforms;
    u.uTop.value.copy(m.skyTop);
    u.uMid.value.copy(m.skyMid);
    u.uBot.value.copy(m.skyBot);
    u.uSun.value.copy(m.sun);
    u.uGlow.value.copy(m.sunGlow);
    u.uSunPos.value.set(m.sunPos[0], m.sunPos[1]);
    u.uSunSize.value = m.sunSize;
    u.uGlowSize.value = m.glowSize;
    u.uStars.value = m.stars;
    u.uMidPos.value = m.midPos;
    u.uStyle.value = m.skyStyle;
    u.uTime.value = time;
    u.uAspect.value = aspect;
    u.uScroll.value = scroll;
  }
}
