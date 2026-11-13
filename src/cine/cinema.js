// Story sequences: animated side-on tableaux played in the game's own world.
// A small timeline engine (events + spans) drives actors, set pieces, camera
// moves, effects, music cues and subtitles. Every scene is skippable.
import * as THREE from 'three';
import { Course, COURSE_PRESETS } from '../world/course.js';
import { ERAS } from '../world/eras.js';
import { makeClockTower, makeOwl, makeGlider, makeCog, makeRift } from '../world/sets.js';
import { RiderRig } from '../game/rider.js';
import { CHAPTERS } from '../game/story.js';
import { h, icon, logo } from '../ui/dom.js';
import { t } from '../core/i18n.js';
import { ease, lerp, clamp, hexCss, TAU } from '../core/math.js';

const EMPTY = new Set();
const WHO = { nova: 0xff9a4a, ada: 0xc9a8ff, baron: 0xffcf5a, tic: 0x5fe1ff, narr: 0xffffff };
const COG_COLORS = [0xb8c2a8, 0xe8935a, 0xdfe8f0, 0xff5fc0, 0x8ff8f0, 0xffcf5a];

export class Cinema {
  constructor(game) {
    this.g = game;
    this.active = false;
    this.el = null;
  }

  // ------------------------------------------------------------ lifecycle
  play(id, done) {
    const g = this.g;
    this.id = id;
    this.done = done;
    this.t = 0;
    this.events = [];
    this.spans = [];
    this.actors = [];
    this.objects = [];
    this.tickers = [];
    this.camKeys = [];
    this.subUntil = 0;
    this.typing = null;
    this.active = true;
    this.finished = false;
    this.camState = { x: 0, y: 0, d: 30, fov: 30, roll: 0 };
    this._buildOverlay();
    const scene = SCENES[id] || SCENES.c1;
    this.duration = scene(this, id);
    this.events.sort((a, b) => a.t - b.t);
    this.ei = 0;
    g.audio.muffle(false, 0.05);
    this.update(0);
    requestAnimationFrame(() => this.el && this.el.classList.add('on'));
  }

  _buildOverlay() {
    this.sub = h('div.cine-sub');
    this.card = h('div.cine-card');
    this.fadeEl = h('div.cine-fade');
    this.el = h('div.cine', h('div.cine-vig'), h('div.cine-grain'), this.fadeEl, this.card, this.sub,
      h('button.cine-skip', { onclick: () => this.skip() }, t('cine.skip'), icon('chev')));
    this.g.uiRoot.append(this.el);
  }

  skip() {
    if (!this.active || this.finished) return;
    this.g.sfx('click');
    this._finish();
  }

  _finish() {
    if (this.finished) return;
    this.finished = true;
    const g = this.g;
    const done = this.done;
    this.done = null;
    const cleanup = () => {
      this.active = false;
      for (const a of this.actors) a.rig.dispose();
      for (const o of this.objects) o.removeFromParent();
      this.actors = [];
      this.objects = [];
      if (this.el) this.el.remove();
      this.el = null;
      g.audio.stopLoops();
      g.world.root.visible = true;
    };
    this.cleanup = cleanup;
    if (done) done();
    // the game fades to black before changing scene: remove our set pieces a beat later
    setTimeout(cleanup, 380);
  }

  // -------------------------------------------------------------- staging
  /** Load an era as a stage. Returns ground height function. */
  stage(era, mood, weather) {
    const g = this.g;
    this.era = era;
    this.course = new Course({ ...COURSE_PRESETS.stage, seed: 31 });
    g.world.load(this.course, era, { mood, moodSpeed: 0 });
    g.views.setCourse(this.course, ERAS[era]);
    g.fx.clear();
    g.fx.weather.set(weather ?? ERAS[era].weather, g.engine.q.particles);
    g.fx.setShadow(0, 0, 0, 0, false);
    return (x) => this.course.solidAt(x);
  }
  add(obj, x = 0, y = 0, z = 0) {
    obj.position.set(x, y, z);
    this.g.engine.scene.add(obj);
    this.objects.push(obj);
    return obj;
  }
  /** An actor standing on the ground at x. face: 1 looks right, -1 left. */
  actor(rider, board, x, pose = 'idle', face = 1) {
    const rig = new RiderRig(rider, board);
    rig.play(pose);
    const a = { rig, x, yOff: 0, face, ground: true, phase: 0, tilt: true, turn: pose === 'ride' || pose === 'wait' ? 0 : face * 1.0 };
    this.g.engine.scene.add(rig.root);
    this.actors.push(a);
    return a;
  }
  tick(fn) {
    this.tickers.push(fn);
  }

  // ------------------------------------------------------------- timeline
  at(time, fn) {
    this.events.push({ t: time, fn });
  }
  span(t0, t1, fn, e = 'linear') {
    this.spans.push({ t0, t1, fn, e: ease[e] || ease.linear, done: false });
  }
  /** Camera key: side-on shot centred on (x, y) from distance d. */
  cam(time, x, y, d, e = 'inOutSine', fov = 30, roll = 0) {
    this.camKeys.push({ t: time, x, y, d, fov, roll, e: ease[e] || ease.inOutSine });
  }
  say(time, dur, who, key) {
    this.at(time, () => this._say(who, key, dur));
  }
  cardAt(time, dur, small, big, subText, useLogo = false) {
    this.at(time, () => {
      const c = this.card;
      c.textContent = '';
      if (small) c.append(h('small', small));
      if (useLogo) c.append(logo());
      else if (big) c.append(h('b', big));
      if (subText) c.append(h('span', subText));
      c.classList.add('on');
    });
    this.at(time + dur, () => this.card.classList.remove('on'));
  }
  sfx(time, name, o) {
    this.at(time, () => this.g.audio.sfx(name, o));
  }
  music(time, name, fade = 1.5) {
    this.at(time, () => this.g.audio.music.play(name, fade));
  }
  flash(time, color = '#ffffff', a = 0.9, dur = 0.5) {
    this.at(time, () => {
      this.g.hud.flash(color, a, dur);
      this.g.world.flash = Math.max(this.g.world.flash, a);
    });
  }
  /** Fade to/from black over the picture (below letterbox and subtitles). */
  fade(t0, t1, from, to) {
    this.span(t0, t1, (k) => { this.fadeEl.style.opacity = lerp(from, to, k); });
  }
  bolt(time, a, b, color = 0xdfe9ff, width = 0.35, thunder = 0.8) {
    this.at(time, () => {
      const g = this.g;
      g.fx.bolt(typeof a === 'function' ? a() : a, typeof b === 'function' ? b() : b, color, width, 0.32, 0.18, 2);
      g.world.flash = Math.max(g.world.flash, 0.8);
      g.hud.flash('#dfe9ff', 0.35, 0.3);
      if (thunder) g.audio.sfx('thunder', { near: thunder });
      g.cam.addShake(0.25);
    });
  }

  _say(who, key, dur) {
    const text = t(key);
    this.sub.textContent = '';
    this.sub.className = 'cine-sub' + (who === 'narr' ? ' narr' : '');
    this.sub.style.setProperty('--c', hexCss(WHO[who] || 0xffffff));
    const name = t('who.' + who);
    const span = h('span');
    if (name) this.sub.append(h('b', name));
    this.sub.append(span);
    this.typing = { span, text, i: 0, acc: 0 };
    this.subUntil = this.t + dur;
  }

  // --------------------------------------------------------------- update
  update(dt) {
    if (!this.active || this.finished) return;
    const g = this.g, e = g.engine;
    this.t += dt;
    const T = this.t;
    while (this.ei < this.events.length && this.events[this.ei].t <= T) this.events[this.ei++].fn();
    for (const s of this.spans) {
      if (T < s.t0 || s.done) continue;
      const k = clamp((T - s.t0) / Math.max(1e-4, s.t1 - s.t0), 0, 1);
      s.fn(s.e(k), dt);
      if (k >= 1) s.done = true;
    }
    for (const fn of this.tickers) fn(dt, T);

    // subtitles (typewriter)
    const ty = this.typing;
    if (ty && ty.i < ty.text.length) {
      ty.acc += dt * 46;
      const n = Math.floor(ty.acc);
      if (n > 0) {
        ty.acc -= n;
        ty.i = Math.min(ty.text.length, ty.i + n);
        ty.span.textContent = ty.text.slice(0, ty.i);
        if (ty.i % 3 === 0) g.audio.sfx('type');
      }
    }
    if (this.subUntil && T > this.subUntil) {
      this.sub.textContent = '';
      this.subUntil = 0;
      this.typing = null;
    }

    // camera
    const K = this.camKeys, c = this.camState;
    if (K.length) {
      let i = 0;
      while (i < K.length - 1 && K[i + 1].t <= T) i++;
      const a = K[i], b = K[Math.min(i + 1, K.length - 1)];
      const k = b === a ? 0 : b.e(clamp((T - a.t) / (b.t - a.t), 0, 1));
      c.x = lerp(a.x, b.x, k); c.y = lerp(a.y, b.y, k); c.d = lerp(a.d, b.d, k);
      c.fov = lerp(a.fov, b.fov, k); c.roll = lerp(a.roll, b.roll, k);
    }
    const portrait = clamp((1.25 - e.aspect) / 0.65, 0, 1);
    const d = c.d * lerp(1, 1.75, portrait);
    g.cam.shot(_p.set(c.x, c.y + d * 0.03, d), _l.set(c.x, c.y, 0), c.fov, c.roll);
    g.cam.apply(dt);

    // actors
    for (const a of this.actors) {
      const gy = this.course.solidAt(a.x);
      a.rig.root.position.set(a.x, (a.ground ? gy : a.y ?? gy) + a.yOff + 0.03, a.z ?? 0);
      a.rig.root.rotation.y = a.turn;
      a.rig.tilt.rotation.z = a.tilt && a.ground ? this.course.slopeAt(a.x) : a.rot ?? 0;
      a.rig.setTint(g.world.tint);
      a.rig.update(dt);
    }
    g.fx.setViewport(e.height, e.camera.fov);
    g.world.aspect = e.aspect;
    g.world.update(dt, c.x, c.y);
    g.views.update(dt, c.x, EMPTY, null);
    g.fx.update(dt, c.x, c.y);
    if (T >= this.duration) this._finish();
  }
}
const _p = new THREE.Vector3(), _l = new THREE.Vector3();

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------
function owlNear(C, actor, dx = -0.9, dy = 1.9) {
  const owl = C.add(makeOwl());
  owl.scale.setScalar(1.25);
  C.tick((dt, T) => {
    const gy = C.course.solidAt(actor.x);
    owl.position.set(actor.x + dx + Math.sin(T * 1.3) * 0.25, gy + actor.yOff + dy + Math.sin(T * 2.4) * 0.14, 0.5);
    owl.rotation.y = 0.5 + Math.sin(T * 0.7) * 0.4;
    owl.flap(T);
  });
  return owl;
}

/** Sparks rising around a point. */
function sparkle(C, x, y, color, rate = 12) {
  return (dt) => {
    if (Math.random() < dt * rate) C.g.fx.energy(x() + (Math.random() - 0.5) * 2, y() - 1 + Math.random() * 2.4, color, 1);
  };
}

const SCENES = {
  // --------------------------------------------------------------- prologue
  prologue(C) {
    const g = C.g, fx = g.fx;
    const y = C.stage('present', 2, 'storm');
    const tx = 0, ty = y(tx) - 2;
    const tower = C.add(makeClockTower(), tx, ty, -7);
    tower.rotation.y = 0.12;
    const face = { x: tx, y: ty + 22.1, z: -3.6 };
    let clockT = 23 + 59 / 60, spin = 0;
    C.tick((dt) => {
      clockT += dt * (spin ? 7 : 0.0006);
      tower.setTime(clockT);
    });
    // the Baron on his glider
    const glider = C.add(makeGlider(), -70, ty + 30, -3);
    const baron = C.actor('baron', 'paradoxe', 0, 'menace', 1);
    baron.ground = false;
    baron.tilt = false;
    baron.z = -3;
    C.tick((dt, T) => {
      baron.x = glider.position.x - 0.2;
      baron.y = glider.position.y + 0.25 + Math.sin(T * 2) * 0.1;
      glider.position.y += Math.sin(T * 2) * 0.004;
      glider.rotation.z = Math.sin(T * 1.4) * 0.06;
    });
    // heroes, further down the slope
    const hx = 46;
    const ada = C.actor('ada', 'mk1', hx - 1.3, 'idle', 1);
    const nova = C.actor('nova', 'mk1', hx + 1.3, 'idle', -1);
    owlNear(C, nova, 0.9, 2.0);
    // the Fulgur
    const boardRig = new RiderRig('nova', 'mk1');
    const board = boardRig.boardG;
    boardRig.tilt.remove(board);
    C.add(board, hx, y(hx) + 0.9, 0.4).visible = false;

    g.audio.music.play('storm', 2.5);
    g.audio.loop('storm', 0.4, 240);
    g.audio.loop('wind', 0.2, 500);
    C.fade(0, 2.4, 1, 0);
    C.cardAt(0.6, 4.2, null, t('c.p.card'));
    for (let i = 1; i < 16; i++) C.sfx(i, 'tick', { alt: i % 2 });
    C.cam(0, 6, ty + 9, 62, 'inOutSine');
    C.cam(5.2, 4, ty + 11, 54);
    C.cam(10.5, 0.5, ty + 21, 24);
    C.cam(15, -3, ty + 24, 36);
    C.cam(19.3, -2, ty + 24, 34);
    C.cam(23.6, 2, ty + 27, 60, 'outCubic');
    C.cam(24.6, 2, ty + 27, 60);
    C.cam(24.61, hx, y(hx) + 1.5, 10.5);
    C.cam(35, hx + 0.2, y(hx) + 1.5, 9.4);
    C.cam(42.4, hx + 0.6, y(hx) + 1.5, 10);
    C.cam(46.6, hx + 12, y(hx + 12) + 2.2, 17, 'inCubic');
    C.bolt(3.4, { x: -30, y: ty + 70, z: -40 }, { x: -24, y: ty + 12, z: -40 }, 0xbfd0ff, 0.5, 0.35);
    C.bolt(8.6, { x: 34, y: ty + 70, z: -30 }, { x: 30, y: ty + 10, z: -30 }, 0xbfd0ff, 0.5, 0.4);
    C.say(5.6, 4.8, 'narr', 'c.p.n1');
    C.say(11, 3.6, 'narr', 'c.p.n2');
    C.span(11.5, 15.5, (k) => { glider.position.x = lerp(-70, -9, k); glider.position.y = ty + lerp(34, 25.5, k); }, 'outCubic');
    C.sfx(11.6, 'whooshBig');
    C.say(15.2, 3.6, 'baron', 'c.p.b1');
    C.tick((dt, T) => {
      if (T > 16 && T < 19.3 && Math.random() < dt * 30) fx.energy(glider.position.x + 1.6, glider.position.y + 0.4, 0xffcf5a, 1);
    });
    const gun = () => ({ x: glider.position.x + 1.7, y: glider.position.y + 0.3, z: -3 });
    C.bolt(17.6, gun, face, 0xffe9a8, 0.3, 0.7);
    C.bolt(18.3, gun, face, 0xffe9a8, 0.36, 0.8);
    C.bolt(18.9, gun, face, 0xffe9a8, 0.42, 0.9);
    // the clock shatters: five cogs fly into rifts across the sky
    C.flash(19.3, '#fff6d8', 1, 0.9);
    C.sfx(19.3, 'shatter');
    C.sfx(19.35, 'boom');
    C.at(19.3, () => {
      spin = 1;
      g.cam.addShake(0.9);
      fx.burst(face.x, face.y, face.z, 0xffe9a8, 60, 16, 0.6, 1.4, true, 3);
      fx.ring(face.x, face.y, face.z, 0xfff0c0, 1, 26, 1);
    });
    const rifts = [];
    for (let i = 0; i < 5; i++) {
      const a = -0.5 + i * 0.52;
      const rx = tx + Math.cos(a + Math.PI / 2) * 30 * (i % 2 ? 1 : 0.8), ry = ty + 30 + Math.sin(a + Math.PI / 2) * 9 + (i % 2) * 4;
      const era = CHAPTERS[i].era;
      const rift = C.add(makeRift(ERAS[era].accent, 0xffffff, 4.2), rx, ry, -12);
      rift.scale.setScalar(0.001);
      const cog = C.add(makeCog(COG_COLORS[i]), face.x, face.y, face.z);
      cog.visible = false;
      rifts.push(rift);
      const t0 = 19.35 + i * 0.12;
      C.at(t0, () => { cog.visible = true; });
      C.span(19.5 + i * 0.1, 20.4 + i * 0.1, (k) => rift.scale.setScalar(Math.max(0.001, k)), 'outBack');
      C.span(t0, t0 + 2.6, (k) => {
        const arc = Math.sin(k * Math.PI) * 6;
        cog.position.set(lerp(face.x, rx, k), lerp(face.y, ry, k) + arc, lerp(face.z, -11.5, k));
        cog.rotation.z += 0.3;
        cog.scale.setScalar(lerp(1.5, 0.5, k));
        if (Math.random() < 0.5) fx.glow(cog.position.x, cog.position.y, cog.position.z, COG_COLORS[i], 2.2, 0.35, 0.4);
      }, 'inOutQuad');
      C.at(t0 + 2.6, () => {
        cog.visible = false;
        fx.ring(rx, ry, -12, ERAS[era].accent, 1, 9, 0.6);
        g.audio.sfx('zap');
      });
      C.span(22.6 + i * 0.1, 23.4 + i * 0.1, (k) => rift.scale.setScalar(Math.max(0.001, 1 - k)), 'inCubic');
    }
    C.tick((dt, T) => { for (const r of rifts) r.material.uniforms.uTime.value = T; });
    C.span(20.5, 24.4, (k) => { glider.position.x = lerp(-9, 90, k); glider.position.y = ty + lerp(25.5, 46, k); }, 'inCubic');
    C.at(21.5, () => { spin = 0; });
    C.fade(24.2, 24.6, 0, 1);
    C.fade(24.62, 25.3, 1, 0);
    C.at(24.6, () => { g.audio.loop('storm', 0.18, 200); });
    // Ada and Nova
    C.at(25.2, () => { ada.rig.play('talk'); nova.rig.play('fear'); });
    C.say(25.3, 4.3, 'ada', 'c.p.a1');
    C.at(29.4, () => nova.rig.play('idle'));
    C.say(29.8, 4.6, 'ada', 'c.p.a2');
    C.at(34.5, () => { ada.rig.play('idle'); nova.rig.play('talk'); });
    C.say(34.7, 3.2, 'nova', 'c.p.v1');
    C.at(38, () => { nova.rig.play('idle'); ada.rig.play('offer'); board.visible = true; g.audio.sfx('powerup'); });
    C.span(38, 39.4, (k) => { board.position.y = y(hx) + lerp(0.7, 1.25, k); board.rotation.z = Math.sin(k * 6) * 0.08; }, 'outBack');
    C.tick(sparkle(C, () => board.position.x, () => board.position.y + 0.6, 0x6fd3ff, 0));
    C.tick((dt, T) => {
      if (board.visible && Math.random() < dt * 14) fx.energy(board.position.x + (Math.random() - 0.5) * 1.4, board.position.y, 0x6fd3ff, 1);
      if (board.visible) board.position.y += Math.sin(T * 3) * 0.0015;
    });
    C.say(38.2, 3.4, 'ada', 'c.p.a3');
    C.at(41.7, () => ada.rig.play('talk'));
    C.say(41.8, 4.2, 'ada', 'c.p.a4');
    C.say(46.1, 1.6, 'tic', 'c.p.t1');
    // Nova takes off
    C.at(46.4, () => {
      board.visible = false;
      ada.rig.play('cheer');
      nova.rig.play('ride');
      nova.turn = 0;
      nova.x = hx + 0.4;
      g.audio.sfx('start');
      g.audio.music.play('victory', 0.8);
    });
    C.say(47.9, 2.4, 'nova', 'c.p.v2');
    const rift = C.add(makeRift(ERAS.jurassic.accent, 0x6fd3ff, 4.5), hx + 34, y(hx + 34) + 4, 0);
    rift.rotation.y = -0.9;
    rift.scale.setScalar(0.001);
    C.tick((dt, T) => { rift.material.uniforms.uTime.value = T; });
    C.span(47.4, 48.4, (k) => rift.scale.setScalar(Math.max(0.001, k)), 'outBack');
    C.sfx(47.4, 'portal');
    C.cam(50.4, hx + 26, y(hx + 26) + 2.6, 20, 'inOutSine');
    C.at(48.4, () => nova.rig.play('boost'));
    C.span(47.2, 50.5, (k, dt) => {
      nova.x = hx + 0.4 + k * k * 34;
      nova.rig.speedHint = 8 + k * 22;
      fx.trailPoint(nova.x - 0.75, y(nova.x) + 0.1, 0.3, 0x6fd3ff);
      fx.spray(nova.x, y(nova.x), 10 + k * 16, 0xffffff, 0);
    });
    C.flash(50.45, '#ffffff', 1, 1.6);
    C.sfx(50.4, 'arrive');
    C.at(50.5, () => { nova.rig.root.visible = false; rift.visible = false; fx.resetTrail(); });
    C.fade(50.5, 50.9, 0, 1);
    C.cardAt(51, 3.6, null, null, t('app.sub'), true);
    return 55;
  },

  // ------------------------------------------------------ chapter endings
  c1: (C) => retrieval(C, 1, [['nova', 'c.1.v1', 3.4], ['tic', 'c.1.t1', 1.6], ['nova', 'c.1.v2', 3.2], ['baron', 'c.1.b1', 3.2]]),
  c2: (C) => retrieval(C, 2, [['nova', 'c.2.v1', 3.6], ['baron', 'c.2.b1', 4.2], ['nova', 'c.2.v2', 2.8]]),
  c3: (C) => retrieval(C, 3, [['nova', 'c.3.v1', 3.4], ['ada', 'c.3.a1', 5], ['tic', 'c.3.t1', 1.8]]),
  c4: (C) => retrieval(C, 4, [['nova', 'c.4.v1', 3.6], ['baron', 'c.4.b1', 3.4], ['nova', 'c.4.v2', 2.8]]),
  c5: (C) => retrieval(C, 5, [['nova', 'c.5.v1', 3.6], ['ada', 'c.5.a1', 3.8], ['nova', 'c.5.v2', 3]]),

  // ------------------------------------------------------------------ finale
  c6(C) {
    const g = C.g, fx = g.fx;
    let y = C.stage('void', 1, 'timedust');
    const nova = C.actor('nova', save_board(), -6, 'ride', 1);
    nova.turn = 0;
    owlNear(C, nova, -1.1, 2.1);
    const glider = C.add(makeGlider(), 9, y(9) + 4.2, 0);
    glider.rotation.y = Math.PI;
    const baron = C.actor('baron', 'paradoxe', 9, 'menace', -1);
    baron.ground = false;
    baron.tilt = false;
    const hand = C.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xffe9a8, fog: false })), 9, 0, 0.4);
    C.tick((dt, T) => {
      glider.position.y = y(9) + 4.2 + Math.sin(T * 1.6) * 0.3;
      baron.x = glider.position.x + 0.2;
      baron.y = glider.position.y + 0.25;
      hand.position.set(glider.position.x - 0.5, glider.position.y + 2.6, 0.4);
      hand.rotation.z = 0.4 + Math.sin(T * 2) * 0.1;
      if (hand.visible && Math.random() < dt * 20) fx.glow(hand.position.x, hand.position.y + (Math.random() - 0.5) * 3, 0.4, 0xffcf5a, 1.4, 0.4, 0.35);
    });
    g.audio.music.play('void', 1.5);
    g.audio.loop('storm', 0.3, 200);
    C.fade(0, 1.6, 1, 0);
    C.cam(0, 2, y(2) + 3.4, 21);
    C.cam(6, 6, y(6) + 4, 14);
    C.cam(11, -3, y(-3) + 1.8, 11);
    C.cam(15.4, -4, y(-4) + 1.8, 9.5);
    C.cam(17.4, 6, y(6) + 3, 22, 'inCubic');
    C.say(1.4, 5.6, 'baron', 'c.6.b1');
    C.bolt(4, { x: 20, y: y(0) + 50, z: -30 }, { x: 18, y: y(18) + 2, z: -30 }, 0xd8b8ff, 0.5, 0.5);
    C.at(7.4, () => baron.rig.play('idle'));
    C.say(7.6, 5, 'nova', 'c.6.v1');
    C.at(13, () => { nova.rig.play('boost'); g.audio.sfx('fulgur'); fx.ring(nova.x, y(nova.x) + 1, 0.5, 0xfff2a0, 1, 9, 0.7); });
    C.say(13.2, 2.6, 'nova', 'c.6.v2');
    C.tick((dt, T) => {
      if (T > 13 && T < 17.5) {
        fx.energy(nova.x, y(nova.x), 0xfff2a0, 1);
        if (Math.random() < dt * 7) fx.bolt({ x: nova.x - 3 + Math.random() * 6, y: y(nova.x) + 6 + Math.random() * 4, z: 0 }, { x: nova.x, y: y(nova.x) + 0.8, z: 0 }, 0xfff6c0, 0.09, 0.16, 0.3, 0);
      }
    });
    C.sfx(15.9, 'boost');
    C.span(16, 17.5, (k) => {
      nova.x = -6 + k * k * 30;
      nova.ground = k < 0.35;
      nova.y = lerp(y(nova.x), glider.position.y + 1.6, clamp((k - 0.35) / 0.4, 0, 1));
      nova.rig.speedHint = 30;
      fx.trailPoint(nova.x - 0.75, (nova.ground ? y(nova.x) : nova.y) + 0.1, 0.5, 0xfff2a0);
    });
    C.flash(17.4, '#ffffff', 1, 2.4);
    C.sfx(17.4, 'shatter');
    C.sfx(17.45, 'boom');
    C.fade(17.45, 17.9, 0, 1);
    // dawn over Meridian: the cogs come home
    let tower, cogs = [], clockT = 11.2;
    C.at(18, () => {
      nova.rig.root.visible = false;
      baron.rig.root.visible = false;
      glider.visible = false;
      hand.visible = false;
      fx.resetTrail();
      y = C.stage('present', 2, 'snow');
      g.world.moodSpeed = 0;
      g.audio.stopLoops();
      g.audio.music.play('victory', 2.5);
      const ty = y(0) - 2;
      tower = C.add(makeClockTower(), 0, ty, -7);
      tower.rotation.y = 0.12;
      tower.setTime(clockT);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        const cog = C.add(makeCog(COG_COLORS[i]), Math.cos(a) * 34, ty + 26 + Math.sin(a) * 16, -10);
        cog.userData.from = cog.position.clone();
        cogs.push(cog);
      }
      const ada = C.actor('ada', 'mk1', 18.7, 'cheer', 1);
      const n2 = C.actor('nova', save_board(), 21.3, 'idle', -1);
      owlNear(C, n2, 0.9, 2.0);
      C.heroes = { ada, nova: n2 };
    });
    C.fade(18.2, 20.2, 1, 0);
    C.cam(18, 0, y(0) + 20, 46);
    C.cam(18.01, 2, y(0) + 19, 60);
    C.cam(26, 0, y(0) + 20, 30);
    C.cam(30, 0, y(0) + 20, 30);
    C.cam(30.01, 20, y(20) + 1.5, 10.5);
    C.cam(37.5, 20, y(20) + 1.6, 9.6);
    C.cam(37.51, 8, y(8) + 12, 52);
    C.cam(46, 8, y(8) + 14, 70);
    C.span(19, 25, (k) => {
      if (!tower) return;
      const ty = tower.position.y + 22.1;
      cogs.forEach((cog, i) => {
        const kk = clamp(k * 1.6 - i * 0.1, 0, 1);
        const f = cog.userData.from;
        cog.position.set(lerp(f.x, 0, kk), lerp(f.y, ty, kk), lerp(f.z, -3.6, kk));
        cog.rotation.z += 0.2;
        cog.scale.setScalar(lerp(1.6, 0.3, kk));
        if (kk >= 1 && cog.visible) {
          cog.visible = false;
          fx.ring(0, ty, -3.6, COG_COLORS[i], 1, 8, 0.5);
          g.audio.sfx('zap');
        } else if (cog.visible && Math.random() < 0.4) fx.glow(cog.position.x, cog.position.y, cog.position.z, COG_COLORS[i], 2, 0.3, 0.4);
      });
    });
    C.span(22, 26, (k) => { clockT = lerp(11.2, 12, k); if (tower) tower.setTime(clockT); }, 'outCubic');
    C.at(26, () => { g.audio.sfx('bell', { midi: 50 }); g.world.flash = 0.5; fx.ring(0, tower.position.y + 22.1, -3.6, 0xfff0c0, 1, 20, 1.2); });
    C.sfx(27.6, 'bell', { midi: 50 });
    C.sfx(29.2, 'bell', { midi: 50 });
    C.say(26.2, 4.2, 'narr', 'c.6.n1');
    C.span(24, 44, (k) => { g.world.moodPos = lerp(2, 3, k); }, 'inOutSine');
    C.at(30.2, () => { C.heroes.ada.rig.play('talk'); });
    C.say(30.4, 3.2, 'ada', 'c.6.a1');
    C.at(33.8, () => { C.heroes.ada.rig.play('idle'); C.heroes.nova.rig.play('talk'); });
    C.say(34, 3.4, 'nova', 'c.6.v3');
    C.at(37.4, () => C.heroes.nova.rig.play('cheer'));
    C.cardAt(39.5, 6, null, t('c.6.end'), t('c.6.thanks'));
    C.fade(45, 46.5, 0, 1);
    return 47;
  },
};

function save_board() {
  return 'mk1';
}

/** Shared staging for the five "Nova finds a Cog" endings. */
function retrieval(C, n, lines) {
  const g = C.g, fx = g.fx;
  const ch = CHAPTERS[n - 1], era = ERAS[ch.era];
  const y = C.stage(ch.era, ch.mood);
  const color = COG_COLORS[n - 1];
  const cx = 5, cy = () => y(cx) + 2.6;
  const cog = C.add(makeCog(color), cx, cy(), 0.2);
  cog.scale.setScalar(1.3);
  let held = false;
  const nova = C.actor('nova', 'mk1', -22, 'ride', 1);
  nova.turn = 0;
  owlNear(C, nova, -1.1, 2.1);
  C.tick((dt, T) => {
    if (!held) {
      cog.position.y = cy() + Math.sin(T * 1.6) * 0.25;
      cog.rotation.z = T * 1.1;
      cog.rotation.y = Math.sin(T * 0.8) * 0.5;
    }
    if (cog.visible && Math.random() < dt * 14) fx.energy(cog.position.x + (Math.random() - 0.5) * 2, cog.position.y - 1 + Math.random() * 2, era.accent, 1);
  });
  g.audio.music.play('victory', 1.5);
  g.audio.loop('wind', 0.1, 500);
  C.fade(0, 1.2, 1, 0);
  C.cardAt(0.3, 2.6, t('story.ch', { n }), t('cog.' + n));
  C.cam(0, cx + 1, y(cx) + 3.2, 22);
  C.cam(3.2, cx - 1.5, y(cx) + 2.2, 13);
  // Nova slides in and stops under the cog
  C.span(0.4, 3.4, (k) => {
    nova.x = lerp(-22, cx - 2.4, k);
    nova.rig.speedHint = 20 * (1 - k);
    if (k < 0.96) {
      fx.spray(nova.x, y(nova.x), 16 * (1 - k), era.terrain.fill[0], 0);
      fx.trailPoint(nova.x - 0.75, y(nova.x) + 0.1, 0.2 * (1 - k), 0x6fd3ff);
    }
  }, 'outCubic');
  C.at(3.4, () => nova.rig.play('reach'));
  C.span(3.7, 4.5, (k) => {
    held = true;
    cog.position.x = lerp(cx, nova.x + 0.5, k);
    cog.position.y = lerp(cy(), y(nova.x) + 1.5, k);
    cog.scale.setScalar(lerp(1.3, 0.12, k));
    cog.rotation.z += 0.5;
  }, 'inQuad');
  C.at(4.5, () => {
    cog.visible = false;
    g.audio.sfx('cog');
    fx.ring(nova.x + 0.4, y(nova.x) + 1.4, 0.5, color, 0.5, 7, 0.7);
    fx.burst(nova.x + 0.4, y(nova.x) + 1.4, 0.3, 0xffe9a8, 26, 8, 0.4, 0.9, true, 1);
    g.hud.flash('#fff6d8', 0.5, 0.5);
    nova.rig.play('cheer');
  });
  let tt = 5.4;
  let baronShown = false;
  for (const [who, key, dur] of lines) {
    const at = tt;
    C.say(at, dur, who, key);
    if (who === 'nova') {
      C.at(at, () => nova.rig.play('wait'));
    } else if (who === 'baron' && !baronShown) {
      baronShown = true;
      // his glider crosses the sky, far away
      const glider = C.add(makeGlider(), 60, y(cx) + 17, -26);
      glider.rotation.y = Math.PI;
      glider.scale.setScalar(1.6);
      C.span(at - 0.4, at + dur + 1.5, (k) => { glider.position.x = lerp(52, -50, k); glider.position.y = y(cx) + 17 + Math.sin(k * 5) * 1.5; });
      C.bolt(at + 0.3, { x: cx + 26, y: y(cx) + 48, z: -40 }, { x: cx + 22, y: y(cx + 22) + 4, z: -40 }, 0xd8b8ff, 0.45, 0.5);
      C.at(at, () => nova.rig.play('fear'));
    } else if (who === 'ada') {
      C.sfx(at, 'hint');
    }
    tt += dur + 0.35;
  }
  // onwards: a rift opens and Nova dives in
  const rx = cx + 17;
  const next = CHAPTERS[n] ? ERAS[CHAPTERS[n].era].accent : 0xffcf5a;
  const rift = C.add(makeRift(next, era.accent, 4.4), rx, y(rx) + 4, 0);
  rift.rotation.y = -0.9;
  rift.scale.setScalar(0.001);
  C.tick((dt, T) => { rift.material.uniforms.uTime.value = T; });
  C.span(tt, tt + 0.9, (k) => rift.scale.setScalar(Math.max(0.001, k)), 'outBack');
  C.sfx(tt, 'portal');
  C.cam(tt, cx - 1.5, y(cx) + 2.2, 12.5);
  C.cam(tt + 2.6, cx + 9, y(cx + 9) + 2.6, 19, 'inOutSine');
  C.at(tt + 0.5, () => { nova.rig.play('boost'); g.audio.sfx('start'); });
  const x0 = cx - 2.4;
  C.span(tt + 0.6, tt + 2.7, (k) => {
    nova.x = x0 + k * k * (rx - x0);
    nova.rig.speedHint = 8 + 24 * k;
    fx.trailPoint(nova.x - 0.75, y(nova.x) + 0.1, 0.34, 0x6fd3ff);
    fx.spray(nova.x, y(nova.x), 8 + 16 * k, era.terrain.fill[0], 0);
  });
  C.flash(tt + 2.65, '#ffffff', 1, 1.2);
  C.sfx(tt + 2.6, 'arrive');
  C.at(tt + 2.7, () => { nova.rig.root.visible = false; fx.resetTrail(); });
  C.fade(tt + 2.7, tt + 3.3, 0, 1);
  return tt + 3.6;
}
