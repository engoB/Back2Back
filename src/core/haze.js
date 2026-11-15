// Atmospheric perspective of the paper-theatre world. Haze does not depend on
// the distance to the camera but on the depth behind the plane of play (z = 0):
// the rider and the track stay perfectly clean, and each plane of scenery melts
// a little more into the colour of the air, whatever the zoom.
export const HAZE = { uHazeL: { value: 89 } };

/** Haze amount (0..1) at a given depth behind the plane of play. */
export function hazeAt(depth) {
  return depth <= 0 ? 0 : 1 - Math.exp(-Math.pow(depth / HAZE.uHazeL.value, 0.75));
}

export const HAZE_VERT = /* glsl */ `
#ifdef USE_FOG
  vec4 hzP = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    hzP = instanceMatrix * hzP;
  #endif
  vFogDepth = -(modelMatrix * hzP).z;
#endif`;
export const HAZE_FRAG = /* glsl */ `
#ifdef USE_FOG
  float hz = 1.0 - exp(-pow(max(vFogDepth, 0.0) / uHazeL, 0.75));
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, hz);
#endif`;

/** Patch a built-in material so that its fog becomes the depth haze. */
export function hazed(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uHazeL = HAZE.uHazeL;
    sh.vertexShader = sh.vertexShader.replace('#include <fog_vertex>', HAZE_VERT);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <fog_pars_fragment>', '#include <fog_pars_fragment>\nuniform float uHazeL;')
      .replace('#include <fog_fragment>', HAZE_FRAG);
  };
  mat.customProgramCacheKey = () => 'haze';
  return mat;
}
