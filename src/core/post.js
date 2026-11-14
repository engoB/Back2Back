// Post-processing pipeline (the "render feature stack" of the game):
//   1. depth of field by planes — the far skylines and the middle ridges are
//      rendered apart, blurred with a true gaussian and composited behind the
//      playfield, so silhouettes in focus keep razor-sharp, anti-aliased edges;
//   2. HDR bloom — emissive things (sun, neon, windows, sparks) are brighter
//      than white in a float buffer and bleed light through a mip chain;
//   3. grading — soft highlight roll-off, a touch of contrast and saturation,
//      vignette, and dithering so gradients never band.
import * as THREE from 'three';

export const LAYER = { FG: 0, SKY: 1, FAR: 2, MID: 3 };

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const BLUR = /* glsl */ `
precision highp float;
uniform sampler2D tMap;
uniform vec2 uDir; // texel size * direction * radius
varying vec2 vUv;
void main() {
  // 9-tap gaussian folded into 5 bilinear fetches
  vec4 c = texture2D(tMap, vUv) * 0.2270270270;
  c += (texture2D(tMap, vUv + uDir * 1.3846153846) + texture2D(tMap, vUv - uDir * 1.3846153846)) * 0.3162162162;
  c += (texture2D(tMap, vUv + uDir * 3.2307692308) + texture2D(tMap, vUv - uDir * 3.2307692308)) * 0.0702702703;
  gl_FragColor = c;
}`;

const COPY = /* glsl */ `
precision highp float;
uniform sampler2D tMap;
varying vec2 vUv;
void main() { gl_FragColor = texture2D(tMap, vUv); }`;

const PREFILTER = /* glsl */ `
precision highp float;
uniform sampler2D tMap;
uniform float uThr, uKnee;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tMap, vUv).rgb;
  float br = max(c.r, max(c.g, c.b));
  gl_FragColor = vec4(c * smoothstep(uThr, uThr + uKnee, br), 1.0);
}`;

const DOWN = /* glsl */ `
precision highp float;
uniform sampler2D tMap;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tMap, vUv).rgb * 4.0;
  c += texture2D(tMap, vUv + uTexel * vec2(-1.0, -1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(1.0, -1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(-1.0, 1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  gl_FragColor = vec4(c / 8.0, 1.0);
}`;

const UP = /* glsl */ `
precision highp float;
uniform sampler2D tMap;
uniform vec2 uTexel;
uniform float uGain;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tMap, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture2D(tMap, vUv + uTexel * vec2(1.0, -1.0)).rgb
         + texture2D(tMap, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture2D(tMap, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  c += (texture2D(tMap, vUv + uTexel * vec2(-2.0, 0.0)).rgb + texture2D(tMap, vUv + uTexel * vec2(2.0, 0.0)).rgb
      + texture2D(tMap, vUv + uTexel * vec2(0.0, -2.0)).rgb + texture2D(tMap, vUv + uTexel * vec2(0.0, 2.0)).rgb) * 0.5;
  gl_FragColor = vec4(c / 6.0 * uGain, 1.0);
}`;

const FINAL = /* glsl */ `
precision highp float;
uniform sampler2D tMap, tBloom;
uniform float uBloom, uVig, uTime, uFade;
varying vec2 vUv;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main() {
  vec3 c = texture2D(tMap, vUv).rgb + texture2D(tBloom, vUv).rgb * uBloom;
  // highlights roll off softly; everything below keeps its authored colour
  vec3 x = max(c - 0.78, 0.0);
  c = min(c, vec3(0.78)) + x / (1.0 + x * 4.5);
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, 1.06);
  c = (c - 0.5) * 1.03 + 0.5;
  vec2 q = (vUv - 0.5) * vec2(1.0, 0.9);
  c *= 1.0 - uVig * smoothstep(0.32, 0.86, length(q));
  c += (hash(gl_FragCoord.xy + fract(uTime) * 71.0) - 0.5) * (1.7 / 255.0);
  gl_FragColor = vec4(c * uFade, 1.0);
}`;

export class Post {
  constructor(renderer, opts = {}) {
    this.r = renderer;
    this.msaa = opts.msaa ?? 4;
    this.mips = opts.mips ?? 4;
    this.bloom = opts.bloom ?? 0.75;
    this.farBlur = opts.farBlur ?? 1;
    this.midBlur = opts.midBlur ?? 0.5;
    const ext = renderer.extensions;
    this.hdr = renderer.capabilities.isWebGL2 && (ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float'));
    this.type = this.hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    const mk = (frag, uniforms, extra = {}) => new THREE.ShaderMaterial({
      uniforms, vertexShader: VERT, fragmentShader: frag, depthTest: false, depthWrite: false, ...extra,
    });
    this.mBlur = mk(BLUR, { tMap: { value: null }, uDir: { value: new THREE.Vector2() } });
    // premultiplied "over" compositing of a blurred plane
    this.mOver = mk(COPY, { tMap: { value: null } }, {
      transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });
    this.mPre = mk(PREFILTER, { tMap: { value: null }, uThr: { value: this.hdr ? 0.95 : 0.8 }, uKnee: { value: 0.6 } });
    this.mDown = mk(DOWN, { tMap: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.mUp = mk(UP, { tMap: { value: null }, uTexel: { value: new THREE.Vector2() }, uGain: { value: 1 } }, {
      transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    });
    this.mFinal = mk(FINAL, {
      tMap: { value: null }, tBloom: { value: null }, uBloom: { value: this.bloom }, uVig: { value: 0.34 }, uTime: { value: 0 }, uFade: { value: 1 },
    });
    this.rt = null;
    this.w = 0;
    this.h = 0;
    this.time = 0;
    this._clear = new THREE.Color();
  }

  _target(w, h, o = {}) {
    const t = new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
      type: o.type ?? THREE.UnsignedByteType, depthBuffer: !!o.depth, samples: o.samples || 0,
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false,
    });
    t.texture.colorSpace = THREE.NoColorSpace;
    return t;
  }

  setSize(w, h) {
    if (w === this.w && h === this.h) return;
    this.dispose();
    this.w = w;
    this.h = h;
    const hw = Math.ceil(w / 2), hh = Math.ceil(h / 2);
    this.rt = {
      main: this._target(w, h, { type: this.type, depth: true, samples: this.msaa }),
      far: this._target(hw, hh, { depth: true }),
      mid: this._target(hw, hh, { depth: true }),
      tmp: this._target(hw, hh),
      b: [],
    };
    let bw = hw, bh = hh;
    for (let i = 0; i < this.mips; i++) {
      this.rt.b.push(this._target(bw, bh, { type: this.type }));
      bw = Math.max(2, Math.ceil(bw / 2));
      bh = Math.max(2, Math.ceil(bh / 2));
    }
  }

  dispose() {
    if (!this.rt) return;
    for (const k of ['main', 'far', 'mid', 'tmp']) this.rt[k].dispose();
    for (const t of this.rt.b) t.dispose();
    this.rt = null;
    this.w = this.h = 0;
  }

  _pass(mat, target) {
    this.quad.material = mat;
    this.r.setRenderTarget(target);
    this.r.render(this.scene, this.cam);
  }

  _blur(rt, radius, times = 1) {
    const u = this.mBlur.uniforms, T = this.rt;
    for (let i = 0; i < times; i++) {
      u.tMap.value = rt.texture;
      u.uDir.value.set(radius / rt.width, 0);
      this._pass(this.mBlur, T.tmp);
      u.tMap.value = T.tmp.texture;
      u.uDir.value.set(0, radius / rt.height);
      this._pass(this.mBlur, rt);
    }
  }

  render(scene, camera, dt = 0.016) {
    const r = this.r, T = this.rt;
    if (!T) return;
    this.time += dt;
    const mask = camera.layers.mask;
    r.getClearColor(this._clear);
    const alpha = r.getClearAlpha();
    const auto = r.autoClear;
    r.autoClear = true;

    // --- far and middle planes, blurred (transparent where empty)
    r.setClearColor(0x000000, 0);
    camera.layers.set(LAYER.FAR);
    r.setRenderTarget(T.far);
    r.render(scene, camera);
    this._blur(T.far, 1.25 * this.farBlur, 2);
    camera.layers.set(LAYER.MID);
    r.setRenderTarget(T.mid);
    r.render(scene, camera);
    this._blur(T.mid, 0.95 * this.midBlur, 1);

    // --- main view: sky, the blurred planes, then the playfield in focus
    r.setClearColor(this._clear, 1);
    camera.layers.set(LAYER.SKY);
    r.setRenderTarget(T.main);
    r.render(scene, camera);
    r.autoClear = false;
    this.mOver.uniforms.tMap.value = T.far.texture;
    this._pass(this.mOver, T.main);
    this.mOver.uniforms.tMap.value = T.mid.texture;
    this._pass(this.mOver, T.main);
    camera.layers.set(LAYER.FG);
    r.setRenderTarget(T.main);
    r.clearDepth();
    r.render(scene, camera);
    r.autoClear = true;

    // --- bloom
    this.mPre.uniforms.tMap.value = T.main.texture;
    this._pass(this.mPre, T.b[0]);
    for (let i = 1; i < T.b.length; i++) {
      this.mDown.uniforms.tMap.value = T.b[i - 1].texture;
      this.mDown.uniforms.uTexel.value.set(1 / T.b[i - 1].width, 1 / T.b[i - 1].height);
      this._pass(this.mDown, T.b[i]);
    }
    r.autoClear = false;
    for (let i = T.b.length - 1; i > 0; i--) {
      this.mUp.uniforms.tMap.value = T.b[i].texture;
      this.mUp.uniforms.uTexel.value.set(1 / T.b[i].width, 1 / T.b[i].height);
      this.mUp.uniforms.uGain.value = 1;
      this._pass(this.mUp, T.b[i - 1]);
    }
    r.autoClear = true;

    // --- grade and present
    const F = this.mFinal.uniforms;
    F.tMap.value = T.main.texture;
    F.tBloom.value = T.b[0].texture;
    F.uBloom.value = this.bloom / Math.max(1, T.b.length - 1) * 1.6;
    F.uTime.value = this.time;
    this._pass(this.mFinal, null);

    camera.layers.mask = mask;
    r.autoClear = auto;
    r.setClearColor(this._clear, alpha);
  }
}
