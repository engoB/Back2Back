// WebGL renderer, scene, camera and quality management.
import * as THREE from 'three';
import { Post } from './post.js';

// Stylised flat colours: what is authored is what is displayed.
THREE.ColorManagement.enabled = false;

/** post: null = draw straight to the screen (fastest); otherwise the full stack. */
export const QUALITY = {
  low: { ratio: 1, density: 0.6, particles: 0.5, post: null },
  medium: { ratio: 1.5, density: 0.85, particles: 0.8, post: { msaa: 2, mips: 3 } },
  high: { ratio: 2, density: 1, particles: 1, post: { msaa: 4, mips: 4 } },
};

export class Engine {
  constructor(canvas, quality = 'high') {
    this.canvas = canvas;
    this.q = QUALITY[quality] || QUALITY.high;
    this.qualityName = quality;
    // with the post stack, anti-aliasing happens in the off-screen buffers
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: !this.q.post, powerPreference: 'high-performance', stencil: false, alpha: false,
    });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.setClearColor(0x05070f, 1);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.5, 5000);
    this.camera.layers.enableAll();
    this.post = null;
    this._makePost();
    this.width = 1;
    this.height = 1;
    this.aspect = 1;
    this.resize();
  }

  _makePost() {
    if (this.post) {
      this.post.dispose();
      this.post = null;
    }
    if (!this.q.post) return;
    try {
      this.post = new Post(this.renderer, this.q.post);
    } catch (e) {
      this.post = null;
    }
  }

  /** Emissive things are brighter than white when the HDR bloom is on. */
  get hdr() {
    return this.post && this.post.hdr ? 1.9 : 1;
  }

  setQuality(name) {
    const had = !!this.q.post;
    this.q = QUALITY[name] || QUALITY.high;
    this.qualityName = name;
    if (!!this.q.post !== had || (this.post && (this.post.msaa !== this.q.post.msaa || this.post.mips !== this.q.post.mips))) this._makePost();
    this.resize();
  }

  resize() {
    const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    this.width = w;
    this.height = h;
    this.aspect = w / h;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.q.ratio));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
    if (this.post) {
      const s = this.renderer.getDrawingBufferSize(new THREE.Vector2());
      this.post.setSize(s.x, s.y);
    }
  }

  render(dt = 0.016) {
    if (this.post) {
      try {
        this.post.render(this.scene, this.camera, dt);
        return;
      } catch (e) {
        // a driver that cannot do it: fall back for good
        this.post.dispose();
        this.post = null;
        this.renderer.setRenderTarget(null);
      }
    }
    this.camera.layers.enableAll();
    this.renderer.render(this.scene, this.camera);
  }
}
