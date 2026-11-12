// Tiny procedural modelling kit: every asset of the game is built in code from
// coloured low-poly primitives merged into one or two draw calls.
import * as THREE from 'three';
import { mulberry32 } from '../core/rng.js';

const _m = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _v = new THREE.Vector3();
const _ca = new THREE.Color();
const _cb = new THREE.Color();

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
const geoCache = new Map();
function cached(key, make) {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    if (g.index) g = g.toNonIndexed();
    geoCache.set(key, g);
  }
  return g;
}

/**
 * Options for every primitive:
 *  c    colour (hex)           c2   colour at the top (vertical gradient)
 *  p    [x, y, z] base point    r    [rx, ry, rz] euler rotation (radians)
 *  s    scale (number or [x, y, z])
 *  glow unlit/emissive bucket   j    per-face brightness jitter (default 0.07)
 *  mid  true: geometry is centred on p instead of standing on it
 */
export class Kit {
  constructor(seed = 1) {
    this.buf = { lit: { pos: [], col: [] }, glow: { pos: [], col: [] } };
    this.rand = mulberry32(seed);
    this.jitter = 0.07;
  }

  add(geo, o = {}, baseOffset = 0) {
    const pos = geo.attributes.position;
    const p = o.p || [0, 0, 0], r = o.r || [0, 0, 0];
    const s = o.s === undefined ? [1, 1, 1] : typeof o.s === 'number' ? [o.s, o.s, o.s] : o.s;
    _e.set(r[0], r[1], r[2]);
    _q.setFromEuler(_e);
    _m.compose(_p.set(p[0], p[1], p[2]), _q, _s.set(s[0], s[1], s[2]));
    if (baseOffset && !o.mid) {
      _m2.makeTranslation(0, baseOffset, 0);
      _m.multiply(_m2);
    }
    if (o.pre) _m.multiply(o.pre);
    const out = o.glow ? this.buf.glow : this.buf.lit;
    _ca.set(o.c ?? 0xffffff);
    const grad = o.c2 !== undefined;
    if (grad) _cb.set(o.c2);
    let minY = Infinity, maxY = -Infinity;
    if (grad) {
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    const jit = o.j ?? (o.glow ? 0 : this.jitter);
    for (let i = 0; i < pos.count; i += 3) {
      const f = 1 + (this.rand() - 0.5) * 2 * jit;
      for (let k = 0; k < 3; k++) {
        _v.fromBufferAttribute(pos, i + k);
        let cr = _ca.r, cg = _ca.g, cb = _ca.b;
        if (grad) {
          const t = (_v.y - minY) / (maxY - minY || 1);
          cr += (_cb.r - cr) * t;
          cg += (_cb.g - cg) * t;
          cb += (_cb.b - cb) * t;
        }
        _v.applyMatrix4(_m);
        out.pos.push(_v.x, _v.y, _v.z);
        out.col.push(cr * f, cg * f, cb * f);
      }
    }
    return this;
  }

  box(w, h, d, o = {}) {
    _m2.makeScale(w, h, d);
    return this.add(UNIT_BOX, { ...o, pre: _m2.clone() }, h / 2);
  }
  /** Cylinder / frustum standing on its base. */
  cyl(rTop, rBot, h, seg = 6, o = {}) {
    const g = cached(`c${rBot === 0 ? 'inv' : (rTop / rBot).toFixed(4)}|${seg}`, () =>
      new THREE.CylinderGeometry(rBot === 0 ? 1 : rTop / rBot, rBot === 0 ? 0 : 1, 1, seg, 1));
    const k = rBot === 0 ? rTop : rBot;
    _m2.makeScale(k, h, k);
    return this.add(g, { ...o, pre: _m2.clone() }, h / 2);
  }
  cone(r, h, seg = 6, o = {}) {
    const g = cached(`k${seg}`, () => new THREE.ConeGeometry(1, 1, seg, 1));
    _m2.makeScale(r, h, r);
    return this.add(g, { ...o, pre: _m2.clone() }, h / 2);
  }
  /** Faceted blob (icosahedron), centred on p. */
  ball(r, detail = 0, o = {}) {
    const g = cached(`b${detail}`, () => new THREE.IcosahedronGeometry(1, detail));
    return this.add(g, { ...o, s: mulScale(o.s, r), mid: true });
  }
  /** Octahedron crystal standing on its tip. */
  gem(r, h, o = {}) {
    const g = cached('gem', () => new THREE.OctahedronGeometry(1, 0));
    _m2.makeScale(r, h / 2, r);
    return this.add(g, { ...o, pre: _m2.clone() }, h / 2);
  }
  torus(R, r, segR = 5, segT = 12, o = {}) {
    const g = cached(`t${(r / R).toFixed(3)}|${segR}|${segT}|${o.arc || 0}`, () =>
      new THREE.TorusGeometry(1, r / R, segR, segT, o.arc || Math.PI * 2));
    return this.add(g, { ...o, s: mulScale(o.s, R), mid: true });
  }
  /** Flat disc / n-gon lying in the XZ plane. */
  disc(r, seg = 8, o = {}) {
    return this.cyl(r, r, 0.02, seg, o);
  }
  /** Gear wheel in the XY plane, centred on p. */
  gear(R, teeth, thick, o = {}) {
    const g = cached(`g${teeth}|${(thick / R).toFixed(3)}|${o.hole ?? 0.35}`, () => makeGear(1, teeth, thick / R, o.hole ?? 0.35));
    return this.add(g, { ...o, s: mulScale(o.s, R), mid: true });
  }
  /** Raw triangles: flat array of xyz in local space. */
  tris(arr, o = {}) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    return this.add(g, { ...o, mid: true });
  }

  build() {
    const mk = (b) => {
      if (!b.pos.length) return null;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
      g.computeVertexNormals();
      g.computeBoundingSphere();
      g.computeBoundingBox();
      return g;
    };
    return { lit: mk(this.buf.lit), glow: mk(this.buf.glow) };
  }
}

function mulScale(s, k) {
  if (s === undefined) return k;
  if (typeof s === 'number') return s * k;
  return [s[0] * k, s[1] * k, s[2] * k];
}

function makeGear(R, teeth, thick, hole) {
  const shape = new THREE.Shape();
  const n = teeth * 4;
  const rIn = R * 0.78;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const tooth = i % 4 === 1 || i % 4 === 2;
    const rr = tooth ? R : rIn;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  if (hole > 0) {
    const h = new THREE.Path();
    h.absarc(0, 0, R * hole, 0, Math.PI * 2, true);
    shape.holes.push(h);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 8 });
  g.translate(0, 0, -thick / 2);
  return g;
}

// Shared materials --------------------------------------------------------
export const MAT = {
  lit: new THREE.MeshLambertMaterial({ vertexColors: true }),
  litDouble: new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
  glow: new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }),
  glowAdd: new THREE.MeshBasicMaterial({
    vertexColors: true, fog: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }),
};

/** Group holding the lit and glow meshes of a built kit. */
export function meshFromKit(built, opts = {}) {
  const g = new THREE.Group();
  if (built.lit) g.add(new THREE.Mesh(built.lit, opts.double ? MAT.litDouble : MAT.lit));
  if (built.glow) g.add(new THREE.Mesh(built.glow, opts.add ? MAT.glowAdd : MAT.glow));
  return g;
}
