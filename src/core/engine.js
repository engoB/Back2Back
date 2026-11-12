// WebGL renderer, scene, camera and quality management.
import * as THREE from 'three';

// Stylised flat colours: what is authored is what is displayed.
THREE.ColorManagement.enabled = false;

export const QUALITY = {
  low: { ratio: 1, density: 0.55, particles: 0.5, antialias: false },
  medium: { ratio: 1.5, density: 0.8, particles: 0.8, antialias: true },
  high: { ratio: 2, density: 1, particles: 1, antialias: true },
};

export class Engine {
  constructor(canvas, quality = 'high') {
    this.canvas = canvas;
    this.q = QUALITY[quality] || QUALITY.high;
    this.qualityName = quality;
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: this.q.antialias, powerPreference: 'high-performance', stencil: false, alpha: false,
    });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.setClearColor(0x05070f, 1);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.5, 5000);
    this.width = 1;
    this.height = 1;
    this.aspect = 1;
    this.resize();
  }

  setQuality(name) {
    this.q = QUALITY[name] || QUALITY.high;
    this.qualityName = name;
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
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
