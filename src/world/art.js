// Vector illustration kit. Scenery is drawn like a paper-cut illustration:
// filled paths with curves and soft vertical gradients, stacked in painter's
// order, merged into one or two meshes per drawing (tinted + emissive).
import * as THREE from 'three';
import { mulberry32 } from '../core/rng.js';

const _a = new THREE.Color(), _b = new THREE.Color();

export class Art {
  constructor(seed = 1) {
    this.buf = { lit: { pos: [], col: [] }, glow: { pos: [], col: [] } };
    this.rand = mulberry32(seed);
    this.z = 0;
  }

  /** Push triangles (flat xy list) with a bottom-to-top gradient c -> c2. */
  _emit(xy, c, o = {}) {
    const out = o.glow ? this.buf.glow : this.buf.lit;
    _a.set(c);
    _b.set(o.c2 ?? c);
    let lo = Infinity, hi = -Infinity;
    for (let i = 1; i < xy.length; i += 2) {
      if (xy[i] < lo) lo = xy[i];
      if (xy[i] > hi) hi = xy[i];
    }
    const span = hi - lo || 1;
    const z = (this.z += 0.004) + (o.z || 0);
    for (let i = 0; i < xy.length; i += 2) {
      const t = (xy[i + 1] - lo) / span;
      out.pos.push(xy[i], xy[i + 1], z);
      out.col.push(_a.r + (_b.r - _a.r) * t, _a.g + (_b.g - _a.g) * t, _a.b + (_b.b - _a.b) * t);
    }
    return this;
  }

  _shape(shape, c, o) {
    const g = new THREE.ShapeGeometry(shape, o && o.seg ? o.seg : 8);
    const p = g.attributes.position, idx = g.index;
    const xy = [];
    for (let i = 0; i < idx.count; i++) {
      const k = idx.getX(i);
      xy.push(p.getX(k), p.getY(k));
    }
    g.dispose();
    return this._emit(xy, c, o);
  }

  /** SVG-like path: "M x y L x y Q cx cy x y C ax ay bx by x y Z" (absolute). */
  fill(d, c, o) {
    const s = new THREE.Shape();
    const tk = d.trim().split(/[\s,]+/);
    let i = 0;
    const n = () => parseFloat(tk[i++]);
    while (i < tk.length) {
      const cmd = tk[i++];
      if (cmd === 'M') s.moveTo(n(), n());
      else if (cmd === 'L') s.lineTo(n(), n());
      else if (cmd === 'Q') s.quadraticCurveTo(n(), n(), n(), n());
      else if (cmd === 'C') s.bezierCurveTo(n(), n(), n(), n(), n(), n());
      else if (cmd === 'Z') s.closePath();
    }
    return this._shape(s, c, o);
  }

  poly(pts, c, o) {
    const s = new THREE.Shape();
    s.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) s.lineTo(pts[i], pts[i + 1]);
    return this._shape(s, c, o);
  }

  /** Closed organic outline through the points (smooth spline). */
  blob(pts, c, o) {
    const v = [];
    for (let i = 0; i < pts.length; i += 2) v.push(new THREE.Vector2(pts[i], pts[i + 1]));
    const curve = new THREE.SplineCurve([...v, v[0], v[1]]);
    const n = v.length * 6;
    const s = new THREE.Shape();
    // sample one full loop of the closed spline
    const t0 = 0, t1 = v.length / (v.length + 1);
    for (let k = 0; k <= n; k++) {
      const p = curve.getPoint(t0 + ((t1 - t0) * k) / n);
      if (k === 0) s.moveTo(p.x, p.y);
      else s.lineTo(p.x, p.y);
    }
    return this._shape(s, c, o);
  }

  rect(x, y, w, h, c, o) {
    return this._emit([x, y, x + w, y, x + w, y + h, x, y, x + w, y + h, x, y + h], c, o);
  }

  rrect(x, y, w, h, r, c, o) {
    const s = new THREE.Shape();
    r = Math.min(r, w / 2, h / 2);
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return this._shape(s, c, o);
  }

  ellipse(cx, cy, rx, ry, c, o = {}) {
    const n = o.seg || 28, xy = [];
    const a0 = o.a0 ?? 0, a1 = o.a1 ?? Math.PI * 2;
    for (let k = 0; k < n; k++) {
      const a = a0 + ((a1 - a0) * k) / n, b = a0 + ((a1 - a0) * (k + 1)) / n;
      xy.push(cx, cy, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, cx + Math.cos(b) * rx, cy + Math.sin(b) * ry);
    }
    return this._emit(xy, c, o);
  }
  circle(cx, cy, r, c, o) {
    return this.ellipse(cx, cy, r, r, c, o);
  }

  /** Thick tapered stroke through the points (smooth): trunks, branches, fronds, wires. */
  stroke(pts, w0, w1, c, o = {}) {
    const v = [];
    for (let i = 0; i < pts.length; i += 2) v.push(new THREE.Vector2(pts[i], pts[i + 1]));
    const curve = v.length > 2 ? new THREE.SplineCurve(v) : null;
    const n = v.length > 2 ? (o.seg || v.length * 5) : 1;
    const P = [];
    for (let k = 0; k <= n; k++) P.push(curve ? curve.getPoint(k / n) : v[k]);
    const xy = [];
    const side = (k, s) => {
      const a = P[Math.max(0, k - 1)], b = P[Math.min(n, k + 1)];
      let nx = -(b.y - a.y), ny = b.x - a.x;
      const l = Math.hypot(nx, ny) || 1;
      const t = k / n;
      // optional leaf profile: fat in the middle, pointed at both ends
      const w = (o.leaf ? Math.sin(Math.PI * Math.pow(t, 0.75)) * w0 + w1 * t : w0 + (w1 - w0) * t) * 0.5 * s;
      return [P[k].x + (nx / l) * w, P[k].y + (ny / l) * w];
    };
    for (let k = 0; k < n; k++) {
      const a = side(k, 1), b = side(k, -1), c2 = side(k + 1, 1), d = side(k + 1, -1);
      xy.push(a[0], a[1], b[0], b[1], d[0], d[1], a[0], a[1], d[0], d[1], c2[0], c2[1]);
    }
    return this._emit(xy, c, o);
  }

  /** Gear outline centred on (cx, cy). */
  gear(cx, cy, R, teeth, c, o = {}) {
    const pts = [], n = teeth * 4, rIn = R * 0.78;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, rr = i % 4 === 1 || i % 4 === 2 ? R : rIn;
      pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    this.poly(pts, c, o);
    if (o.hole) this.circle(cx, cy, R * o.hole, o.holeColor ?? 0x000000, { glow: o.glowHole });
    return this;
  }

  build() {
    const mk = (b) => {
      if (!b.pos.length) return null;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
      g.computeBoundingSphere();
      g.computeBoundingBox();
      return g;
    };
    return { lit: mk(this.buf.lit), glow: mk(this.buf.glow) };
  }
}
