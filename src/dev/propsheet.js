// Developer contact sheet: every scenery drawing of an era, each one fitted to a cell.
import * as THREE from 'three';
import { ERAS } from '../world/eras.js';
import { getProp, propVariants } from '../world/props.js';
import { MAT } from '../world/meshkit.js';

export function showPropSheet(eraId, canvas) {
  const era = ERAS[eraId];
  const names = [...new Set([...era.decor.map((d) => d.prop), ...era.obstacles, ...(eraId === 'west' ? ['windmillFan'] : [])])];
  const cells = [];
  for (const n of names) for (let v = 0; v < Math.min(2, propVariants(n)); v++) cells.push([n, v]);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  THREE.ColorManagement.enabled = false;
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const W = innerWidth, H = innerHeight;
  renderer.setSize(W, H);
  const mood = era.moods[+(new URLSearchParams(location.search).get('mood') || 0)];
  renderer.setClearColor(new THREE.Color(mood.fog));
  const scene = new THREE.Scene();
  const cols = Math.ceil(Math.sqrt(cells.length * (W / H)));
  const rows = Math.ceil(cells.length / cols);
  const cam = new THREE.OrthographicCamera(0, cols, rows, 0, -10, 10);
  cells.forEach(([n, v], i) => {
    const b = getProp(n, v);
    const g = new THREE.Group();
    if (b.lit) g.add(new THREE.Mesh(b.lit, MAT.lit));
    if (b.glow) g.add(new THREE.Mesh(b.glow, MAT.glow));
    const box = new THREE.Box3();
    if (b.lit) box.union(b.lit.boundingBox);
    if (b.glow) box.union(b.glow.boundingBox);
    const w = box.max.x - box.min.x, h = box.max.y - Math.min(0, box.min.y);
    const sc = Math.min(0.86 / w, 0.8 / h);
    const cx = (i % cols) + 0.5, cy = rows - 1 - Math.floor(i / cols) + 0.12;
    g.scale.setScalar(sc);
    g.position.set(cx - ((box.max.x + box.min.x) / 2) * sc, cy - Math.min(0, box.min.y) * sc, 0);
    scene.add(g);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.006), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
    line.position.set(cx, cy, -1);
    scene.add(line);
  });
  console.log('PROPS ' + cells.map((c) => c.join('#')).join(' '));
  renderer.render(scene, cam);
  window.__frames = 1;
}
