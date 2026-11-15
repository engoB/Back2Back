// Soft toon shading for characters: two-tone light with a warm rim on the lit
// side, tinted by the ambient mood. The environment uniforms are shared by
// every material and updated once per frame by the World.
import * as THREE from 'three';
import { HAZE, HAZE_VERT, HAZE_FRAG } from '../core/haze.js';

export const ENV = {
  tint: { value: new THREE.Color(1, 1, 1) },
  light: { value: new THREE.Vector3(0.45, 0.6, 0.66).normalize() },
  rim: { value: new THREE.Color(1, 0.95, 0.82) },
};

const VERT = /* glsl */ `
#include <fog_pars_vertex>
varying vec3 vN;
varying vec3 vV;
void main() {
  vec3 transformed = position;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
  ${HAZE_VERT}
}`;
const FRAG = /* glsl */ `
#include <fog_pars_fragment>
uniform vec3 uColor, uTint, uRim, uLight;
uniform float uOpacity, uGlow, uHazeL;
varying vec3 vN;
varying vec3 vV;
void main() {
  vec3 n = normalize(vN);
  float d = dot(n, uLight) * 0.5 + 0.5;
  float band = smoothstep(0.36, 0.6, d);
  vec3 col = uColor * mix(0.7, 1.05, band);
  col = mix(col * uTint, uColor, uGlow);
  float fres = pow(1.0 - max(dot(n, normalize(vV)), 0.0), 2.6);
  col += uRim * fres * 0.5 * smoothstep(0.25, 0.8, d) * (1.0 - uGlow);
  gl_FragColor = vec4(col, uOpacity);
  ${HAZE_FRAG}
}`;

/** opts: { glow: unlit emissive, ghost: translucent, double: two-sided } */
export function toonMat(color, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uColor: { value: new THREE.Color(color) },
      uTint: ENV.tint, uLight: ENV.light, uRim: ENV.rim, uHazeL: HAZE.uHazeL,
      uOpacity: { value: opts.ghost ? 0.5 : 1 }, uGlow: { value: opts.glow ? 1 : 0 },
    },
    vertexShader: VERT, fragmentShader: FRAG, fog: !opts.glow,
    transparent: !!opts.ghost, depthWrite: !opts.ghost, side: opts.double ? THREE.DoubleSide : THREE.FrontSide,
  });
}
