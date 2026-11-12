// Side-on follow camera with a slight 3/4 angle, speed/air zoom and shake.
// Also drives free shots for cinematics and menus.
import * as THREE from 'three';
import { clamp, damp, lerp, DEG } from '../core/math.js';
import { noise1 } from '../core/rng.js';

const _dir = new THREE.Vector3();

export class CameraRig {
  constructor(camera) {
    this.cam = camera;
    this.look = new THREE.Vector3();
    this.pos = new THREE.Vector3(0, 5, 40);
    this.width = 34;
    this.trauma = 0;
    this.shakeEnabled = true;
    this.t = 0;
    this.yaw = 0.2;
    this.pitch = 0.1;
    this.fov = 32;
    this.roll = 0;
    this.snap = true;
  }

  addShake(a) {
    this.trauma = Math.min(1, this.trauma + a);
  }

  /** Gameplay framing. p: {x, y, vx, vy}, ground: solid height under the rider. */
  follow(dt, p, ground, aspect, opts = {}) {
    this.t += dt;
    const portrait = clamp((1.25 - aspect) / 0.65, 0, 1);
    const vFov = lerp(30, 47, portrait);
    const speed = Math.hypot(p.vx, p.vy);
    const air = Math.max(0, p.y - ground);
    const wTarget = lerp(36, 26, portrait) + clamp((speed - 14) * 0.55, 0, 10) + clamp(air * 0.95, 0, 15) + (opts.extra || 0);
    this.width = this.snap ? wTarget : damp(this.width, wTarget, 2.2, dt);
    const hFov = 2 * Math.atan(Math.tan((vFov * DEG) / 2) * aspect);
    const dist = this.width / 2 / Math.tan(hFov / 2);
    const anchor = lerp(0.3, 0.27, portrait);
    const lead = this.width * (0.5 - anchor);
    const visH = 2 * dist * Math.tan((vFov * DEG) / 2);
    const tx = p.x + lead;
    // keep both the rider and the ground below in frame
    const ty = lerp(p.y, ground, 0.5) + visH * lerp(0.1, 0.15, portrait) + clamp(air * 0.1, 0, 3);
    if (this.snap) this.look.set(tx, ty, 0);
    else {
      this.look.x = damp(this.look.x, tx, 9, dt);
      this.look.y = damp(this.look.y, ty, 5.5, dt);
      this.look.z = 0;
    }
    const yaw = lerp(0.2, 0.13, portrait), pitch = lerp(0.045, 0.06, portrait);
    this.yaw = this.snap ? yaw : damp(this.yaw, yaw, 3, dt);
    this.pitch = this.snap ? pitch : damp(this.pitch, pitch, 3, dt);
    _dir.set(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    this.pos.copy(this.look).addScaledVector(_dir, dist);
    this.fov = this.snap ? vFov : damp(this.fov, vFov, 4, dt);
    this.roll = damp(this.roll, 0, 4, dt);
    this.snap = false;
    this.apply(dt);
  }

  /** Free shot (cinematics): explicit position, target and field of view. */
  shot(pos, look, fov, roll = 0) {
    this.pos.copy(pos);
    this.look.copy(look);
    this.fov = fov;
    this.roll = roll;
  }

  apply(dt = 0) {
    const cam = this.cam;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    cam.position.copy(this.pos);
    let lx = this.look.x, ly = this.look.y;
    if (this.trauma > 0 && this.shakeEnabled) {
      const s = this.trauma * this.trauma;
      const t = this.t * 31;
      cam.position.x += noise1(t, 1) * s * 0.9;
      cam.position.y += noise1(t, 2) * s * 0.9;
      lx += noise1(t, 3) * s * 0.5;
      ly += noise1(t, 4) * s * 0.5;
    }
    if (cam.fov !== this.fov) {
      cam.fov = this.fov;
      cam.updateProjectionMatrix();
    }
    cam.up.set(Math.sin(this.roll), Math.cos(this.roll), 0);
    cam.lookAt(lx, ly, this.look.z);
  }
}
