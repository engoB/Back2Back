// Developer preview: ?era=west&mood=1&t=20&seed=3  (bot rides for t seconds, then keeps rendering)
import * as THREE from 'three';
import { Engine } from '../core/engine.js';
import { World } from '../world/world.js';
import { Course } from '../world/course.js';
import { Player, PHYS } from '../game/player.js';
import { BotBrain } from '../game/bots.js';
import { CameraRig } from '../game/camera.js';
import { RiderRig } from '../game/rider.js';
import { RIDER_ORDER, BOARD_ORDER } from '../game/catalog.js';

const q = new URLSearchParams(location.search);
const engine = new Engine(document.getElementById('c'), q.get('q') || 'high');
const world = new World(engine.scene);
const course = new Course({ seed: +(q.get('seed') || 5), ...(q.get('calm') ? { calm: true, allow: {} } : {}) });
world.aspect = engine.aspect;
world.load(course, q.get('era') || 'present', { mood: +(q.get('mood') || 0), moodSpeed: q.get('cycle') ? 1 / 8 : 0 });
const player = new Player(course);
const bot = new BotBrain(0.8, 3);
const rig = new CameraRig(engine.camera);

const rigR = new RiderRig(q.get('rider') || 'nova', q.get('board') || 'mk1');
const dummy = rigR.root;
engine.scene.add(dummy);
// showroom: all riders side by side in a given pose
const lineup = [];
if (q.get('lineup')) {
  RIDER_ORDER.forEach((id, i) => {
    const r = new RiderRig(id, BOARD_ORDER[i]);
    r.play(q.get('pose') || 'wait');
    const x = 2 + i * 1.9;
    r.root.position.set(x, course.solidAt(x) + 0.02, 0.6);
    r.tilt.rotation.z = course.slopeAt(x);
    engine.scene.add(r.root);
    lineup.push(r);
  });
}

function sim(dt) {
  let n = Math.round(dt / PHYS.STEP);
  while (n-- > 0) {
    const cmd = bot.update(player, course, PHYS.STEP);
    player.step(PHYS.STEP, cmd.held, cmd.pressed);
    player.events.length = 0;
    if (player.crashed && player.crashT > 1.2) player.rescue('back');
  }
}
sim(+(q.get('t') || 0));
const frozen = q.get('freeze');
let last = performance.now();
window.__frames = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!frozen) sim(dt);
  dummy.position.set(player.x, player.y, 0);
  rigR.tilt.rotation.z = player.rot;
  rigR.drive(dt, player, false);
  for (const r of lineup) r.update(dt);
  const ground = course.solidAt(player.x);
  if (lineup.length) {
    const cx = 2 + 2.5 * 1.9;
    rig.shot(new THREE.Vector3(cx - 1.5, course.solidAt(cx) + 1.6, 9.5), new THREE.Vector3(cx, course.solidAt(cx) + 0.75, 0), 34);
    rig.apply(dt);
  } else rig.follow(dt, player, ground, engine.aspect);
  world.aspect = engine.aspect;
  world.update(dt, player.x, player.y);
  engine.render();
  window.__frames++;
  requestAnimationFrame(frame);
}
addEventListener('resize', () => engine.resize());
requestAnimationFrame(frame);
window.__dev = { engine, world, course, player, rig };
