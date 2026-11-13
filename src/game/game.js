// The conductor: owns the engine, world, audio, UI and network, and moves the
// game between its states (hub menu, run, cinematic).
import * as THREE from 'three';
import { Engine } from '../core/engine.js';
import { Input } from '../core/input.js';
import { save } from '../core/save.js';
import { t } from '../core/i18n.js';
import { World } from '../world/world.js';
import { ItemViews } from '../world/items.js';
import { Course, COURSE_PRESETS } from '../world/course.js';
import { ERAS, ERA_ORDER } from '../world/eras.js';
import { makeClockTower } from '../world/sets.js';
import { Fx } from './vfx.js';
import { Warp } from './warp.js';
import { CameraRig } from './camera.js';
import { RiderRig } from './rider.js';
import { Run } from './run.js';
import { CHAPTERS, chapter } from './story.js';
import { RIDER_ORDER, BOARD_ORDER } from './catalog.js';
import { AudioEngine } from '../audio/audio.js';
import { Hud } from '../ui/hud.js';
import { Menus, reviveModal, dailyModal } from '../ui/screens.js';
import { h } from '../ui/dom.js';
import { NetClient } from '../net/net.js';
import { Cinema } from '../cine/cinema.js';
import { damp, lerp, clamp } from '../core/math.js';

export const VERSION = '1.0.0';
const BOT_NAMES = ['Zéphyr', 'Minuit', 'Tic-Tac', 'Écho', 'Comète', 'Paradoxe', 'Rétro', 'Quartz'];

function pickQuality() {
  const q = save.data.settings.quality;
  if (q !== 'auto') return q;
  const small = Math.min(window.innerWidth, window.innerHeight) < 520;
  const cores = navigator.hardwareConcurrency || 4;
  if (small && cores <= 4) return 'medium';
  return 'high';
}

/** Menu backdrop: the rider waiting on the ridge under the Great Clock. */
class Hub {
  constructor(game) {
    this.g = game;
    this.course = new Course({ ...COURSE_PRESETS.menu, seed: 7 });
    this.rig = null;
    this.tower = makeClockTower();
    this.view = 'menu';
    this.t = 0;
    this.spin = 0;
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.first = true;
    this.active = false;
  }
  enter() {
    const g = this.g, d = save.data;
    this.active = true;
    g.world.load(this.course, 'present', { mood: this.mood ?? 1, moodSpeed: 1 / 50 });
    g.views.setCourse(this.course, ERAS.present);
    g.fx.clear();
    g.fx.weather.set('snow', g.engine.q.particles);
    this.rig = new RiderRig(d.rider, d.board);
    this.rig.play('wait');
    g.engine.scene.add(this.rig.root);
    const y = this.course.solidAt(0);
    this.rig.root.position.set(0, y + 0.03, 0);
    this.rig.tilt.rotation.z = this.course.slopeAt(0);
    const tx = -10;
    this.tower.scale.setScalar(0.8);
    this.tower.position.set(tx, g.world.groundY(tx) - 2.2, -9);
    this.tower.rotation.y = 0.25;
    g.engine.scene.add(this.tower);
    this.first = true;
  }
  leave() {
    if (!this.active) return;
    this.active = false;
    this.mood = this.g.world.moodPos;
    if (this.rig) this.rig.dispose();
    this.rig = null;
    this.g.engine.scene.remove(this.tower);
    this.g.fx.setShadow(0, 0, 0, 0, false);
  }
  setRider(rider, board) {
    if (this.rig) this.rig.set(rider, board);
  }
  update(dt) {
    const g = this.g, e = g.engine;
    this.t += dt;
    const y = this.course.solidAt(0);
    const portrait = clamp((1.25 - e.aspect) / 0.65, 0, 1);
    let px, py, pz, lx, ly, fov;
    const sway = Math.sin(this.t * 0.16);
    if (this.view === 'shop') {
      this.spin += dt * 0.6;
      px = lerp(1.9, 0, portrait); py = y + lerp(1.1, -0.7, portrait); pz = lerp(6.8, 12.7, portrait);
      lx = px; ly = y + lerp(0.95, -1.0, portrait); fov = 30;
    } else {
      this.spin = damp(this.spin, 0, 4, dt);
      px = lerp(3.6, 0.3, portrait) + sway * 1.2; py = y + lerp(2.6, 2.8, portrait); pz = lerp(17, 21, portrait);
      lx = px; ly = y + lerp(2.1, 1.6, portrait); fov = lerp(30, 40, portrait);
    }
    if (this.first) {
      this.pos.set(px, py, pz);
      this.look.set(lx, ly, 0);
      this.first = false;
    } else {
      const k = 1 - Math.exp(-3 * dt);
      this.pos.x += (px - this.pos.x) * k; this.pos.y += (py - this.pos.y) * k; this.pos.z += (pz - this.pos.z) * k;
      this.look.x += (lx - this.look.x) * k; this.look.y += (ly - this.look.y) * k;
    }
    g.cam.shot(this.pos, this.look, damp(g.cam.fov, fov, 3, dt));
    g.cam.apply(dt);
    this.rig.root.rotation.y = this.spin;
    this.rig.setTint(g.world.tint);
    this.rig.update(dt);
    this.tower.setTime(23.96 + ((this.t * 0.002) % 0.04));
    g.fx.setViewport(e.height, e.camera.fov);
    g.fx.setShadow(0, y, this.course.slopeAt(0), 0, true);
    g.world.aspect = e.aspect;
    g.world.update(dt, 0, y);
    g.views.update(dt, 0, EMPTY, null);
    g.fx.update(dt, 0, y);
  }
}
const EMPTY = new Set();

export class Game {
  constructor(canvas, uiRoot) {
    this.version = VERSION;
    this.quality = pickQuality();
    this.engine = new Engine(canvas, this.quality);
    this.world = new World(this.engine.scene);
    this.world.density = this.engine.q.density;
    this.fx = new Fx(this.engine.scene, this.engine.q.particles);
    this.views = new ItemViews(this.engine.scene, this.fx);
    this.warp = new Warp(this.engine.scene);
    this.cam = new CameraRig(this.engine.camera);
    this.audio = new AudioEngine();
    this.input = new Input(canvas);
    this.net = new NetClient();
    this.uiRoot = uiRoot;
    this.hud = new Hud(uiRoot, () => this.pause());
    this.menus = new Menus(uiRoot, this);
    this.fadeEl = h('div.fade.on');
    this.fpsEl = h('div.fps.hidden');
    uiRoot.append(this.fadeEl, this.fpsEl);
    this.hub = new Hub(this);
    this.cinema = new Cinema(this);
    this.state = 'boot';
    this.run = null;
    this.lastRun = null;
    this.installEvt = null;
    this.swReady = false;
    this.wake = null;
    this.frame = { n: 0, acc: 0, slow: 0, shown: 0 };

    this.input.onAny = () => this.audio.unlock();
    this.input.onPause = () => {
      if (this.state === 'cine') this.cinema.skip();
      else if (this.run && this.run.paused && !this.run.asking) this.resume();
      else this.pause();
    };
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
        this.audio.suspend();
        save.flush();
      } else this.audio.resume();
    });
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installEvt = e;
      if (this.menus.current && this.menus.current.name === 'home') this.menus.refresh();
    });
    window.addEventListener('appinstalled', () => {
      this.installEvt = null;
      this.menus.toast(t('toast.installed'), 'good');
    });
    this.net.onStart = (m) => this.startRaceOnline(m);
    this.applySettings();
    this._last = performance.now();
    this._loop = this._loop.bind(this);
  }

  /** Build the menu scene behind the boot screen (compiles shaders). */
  prepare() {
    this.hub.enter();
    this.hub.update(0.016);
    this.engine.render();
  }

  /** A new version has been installed by the service worker. */
  onUpdate() {
    const el = h('button.toast.menu-toast.good', { onclick: () => location.reload(), style: { pointerEvents: 'auto' } }, `${t('menu.update')} — ${t('menu.update.do')}`);
    this.menus.toastLayer.append(el);
  }

  /** Called once the boot screen has been tapped. */
  start() {
    this.audio.unlock();
    this.state = 'menu';
    if (!this.hub.active) this.hub.enter();
    this.audio.music.play('menu', 2);
    this.menus.home();
    this._fade(false);
    requestAnimationFrame(this._loop);
    const first = !save.data.story.seen.prologue;
    if (first) {
      // first launch: the story opens the game
      setTimeout(() => this.playCinematic('prologue', () => this._daily()), 600);
    } else setTimeout(() => this._daily(), 900);
  }

  // ---------------------------------------------------------------- frame
  _loop(now) {
    requestAnimationFrame(this._loop);
    const raw = (now - this._last) / 1000;
    this._last = now;
    const dt = Math.min(0.05, Math.max(0, raw));
    this.input.poll();
    if (this.state === 'menu') this.hub.update(dt);
    else if (this.state === 'run' && this.run) {
      if (this.run.paused) this._idle(dt);
      else this.run.update(dt);
    } else if (this.state === 'cine') this.cinema.update(dt);
    this.engine.render();
    this._perf(raw);
  }

  /** Keep the paused scene alive (weather, sky) without advancing the run. */
  _idle(dt) {
    const p = this.run.player;
    this.world.update(dt * 0.2, p.x, p.y);
    this.fx.weather.update(dt * 0.3, p.x, p.y);
  }

  _perf(raw) {
    const f = this.frame;
    f.n++;
    f.acc += raw;
    if (f.acc >= 1) {
      const fps = f.n / f.acc;
      if (save.data.settings.fps) this.fpsEl.textContent = `${fps.toFixed(0)} fps · ${this.quality}`;
      // automatic quality: step down when the device struggles during a run
      if (save.data.settings.quality === 'auto' && this.state === 'run' && this.run && !this.run.paused) {
        f.slow = fps < 40 ? f.slow + 1 : 0;
        if (f.slow >= 3) {
          f.slow = 0;
          const next = this.quality === 'high' ? 'medium' : this.quality === 'medium' ? 'low' : null;
          if (next) this._setQuality(next);
        }
      }
      f.n = 0;
      f.acc = 0;
    }
  }

  _setQuality(q) {
    this.quality = q;
    this.engine.setQuality(q);
    this.world.density = this.engine.q.density;
    this.fx.density = this.engine.q.particles;
  }

  resize() {
    this.engine.resize();
  }

  _fade(on) {
    this.fadeEl.classList.toggle('on', on);
    return new Promise((r) => setTimeout(r, on ? 360 : 60));
  }

  // ------------------------------------------------------------- services
  sfx(name, o) {
    this.audio.unlock();
    this.audio.sfx(name, o);
  }
  haptic(p) {
    if (save.data.settings.haptics && navigator.vibrate) {
      try { navigator.vibrate(p); } catch (e) { /* unsupported */ }
    }
  }
  applySettings(qualityChanged) {
    const s = save.data.settings;
    this.audio.setVolumes(s.music, s.sfx);
    this.cam.shakeEnabled = s.shake;
    this.fpsEl.classList.toggle('hidden', !s.fps);
    document.documentElement.lang = s.lang;
    if (qualityChanged) {
      const q = pickQuality();
      const aa = this.engine.q.antialias;
      this._setQuality(q);
      if (this.engine.q.antialias !== aa) this.menus.toast(t('opt.reload'));
    }
  }
  canInstall() {
    return !!this.installEvt;
  }
  offlineReady() {
    return this.swReady;
  }
  async install() {
    if (!this.installEvt) return;
    this.installEvt.prompt();
    try { await this.installEvt.userChoice; } catch (e) { /* dismissed */ }
    this.installEvt = null;
    this.menus.refresh();
  }
  fullscreen() {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  }
  async _wake(on) {
    try {
      if (on && navigator.wakeLock && !this.wake) this.wake = await navigator.wakeLock.request('screen');
      else if (!on && this.wake) {
        await this.wake.release();
        this.wake = null;
      }
    } catch (e) {
      this.wake = null;
    }
  }
  /** Shop preview on the hub rider. */
  preview(rider, board) {
    if (this.hub.active) this.hub.setRider(rider, board);
  }
  /** Menus tell us which screen is up: the hub camera follows. */
  onScreen(name) {
    this.hub.view = name === 'shop' ? 'shop' : 'menu';
    if (this.hub.active && name !== 'shop') this.hub.setRider(save.data.rider, save.data.board);
  }

  _daily() {
    if (this.state !== 'menu') return;
    const d = save.data.daily;
    const today = new Date().toISOString().slice(0, 10);
    if (d.last === today) return;
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    d.streak = d.last === y ? Math.min(d.streak + 1, 7) : 1;
    d.last = today;
    const amount = 100 + 50 * (d.streak - 1);
    save.touch();
    dailyModal(this.menus, d.streak, amount, () => {
      save.addCoins(amount);
      this.sfx('buy');
      this.menus.refresh();
    });
  }

  // ------------------------------------------------------------ run flow
  async _beginRun(opts) {
    await this._fade(true);
    this.menus.hide();
    this._teardown();
    this.state = 'run';
    this.lastRun = opts;
    this.run = new Run({
      engine: this.engine, world: this.world, fx: this.fx, views: this.views, warp: this.warp, cam: this.cam, audio: this.audio,
      hud: this.hud, input: this.input, net: opts.online ? this.net : null,
      haptic: (p) => this.haptic(p),
      onEnd: (s) => this._onRunEnd(s),
      askRevive: (n, cb) => reviveModal(this.menus, n, (yes) => { if (yes) this.sfx('revive'); cb(yes); }),
    }, opts);
    this.hud.show(true);
    this.audio.muffle(false, 0.05);
    this.audio.music.play(ERAS[this.run.eraId].music, 1.2);
    if (opts.card !== false) this.hud.eraCard(this.run.eraId, 1);
    this.input.enabled = true;
    this._wake(true);
    await this._fade(false);
  }

  _teardown() {
    if (this.run) {
      this.run.dispose();
      this.run = null;
    }
    this.hub.leave();
    this.hud.show(false);
    this.net.onGame = null;
  }

  startEndless({ headstart } = {}) {
    if (headstart && save.data.items.headstart > 0) {
      save.data.items.headstart--;
      save.touch();
    } else headstart = false;
    const visited = save.data.stats.eras;
    return this._beginRun({ mode: 'endless', era: 'present', headstart, visited });
  }

  startChapter(n) {
    const c = chapter(n);
    if (!c) return;
    return this._beginRun({
      mode: 'story', chapter: n, era: c.era, mood: c.mood, storm: c.storm,
      course: { ...c.course, tutorial: n === 1 && !save.data.tuto.done },
    });
  }

  startRaceAI({ rivals = 3, length = 1500, era = 'random' } = {}) {
    const eraId = era === 'random' ? ERA_ORDER[Math.floor(Math.random() * (ERA_ORDER.length - 1))] : era;
    const seed = (Date.now() & 0xffffff) + 1;
    const names = [...BOT_NAMES].sort(() => Math.random() - 0.5);
    const list = [];
    for (let i = 0; i < rivals; i++) {
      list.push({
        id: 'bot' + i, name: `${names[i]} · ${t('mp.bot')}`, bot: true, skill: 0.22 + Math.random() * 0.5, seed: seed + i * 31,
        rider: RIDER_ORDER[1 + Math.floor(Math.random() * 4)], board: BOARD_ORDER[Math.floor(Math.random() * 5)],
      });
    }
    return this._beginRun({ mode: 'race', era: eraId, seed, course: { length }, rivals: list, raceAI: { rivals, length, era } });
  }

  startRaceOnline(m) {
    const list = m.players.filter((p) => p.id !== this.net.id).map((p) => ({ id: p.id, name: p.name, rider: p.rider, board: p.board }));
    const eraId = m.era === 'random' || !ERAS[m.era] ? ERA_ORDER[m.seed % (ERA_ORDER.length - 1)] : m.era;
    this._beginRun({ mode: 'race', era: eraId, seed: m.seed, course: { length: m.length }, rivals: list, online: true }).then(() => {
      this.net.onGame = (ev, data) => {
        const run = this.run;
        if (!run) return;
        if (ev === 'state') run.netState(data.id, data.d);
        else if (ev === 'finish') run.netFinish(data.id, data.time);
        else if (ev === 'left') {
          run.netLeave(data.id);
          this.hud.toast('mp.left', { name: data.name });
        } else if (ev === 'lost') this.hud.toast('mp.err.lost', null, 'info');
      };
    });
  }

  rematch() {
    const o = this.lastRun;
    if (o && o.raceAI) return this.startRaceAI(o.raceAI);
    return this.toMenu(this.net.room ? 'lobby' : 'multi');
  }

  restart() {
    const o = this.lastRun;
    if (!o) return this.toMenu();
    if (o.mode === 'endless') return this.startEndless({});
    if (o.mode === 'story') return this.startChapter(o.chapter);
    if (o.raceAI) return this.startRaceAI(o.raceAI);
    return this.toMenu('multi');
  }

  pause() {
    const r = this.run;
    if (this.state !== 'run' || !r || r.paused || r.ended || r.state === 'warp' || r.state === 'countdown') return;
    r.setPaused(true);
    this.input.reset();
    this.menus.show('pause', { stats: r.stats, mode: r.mode }, false);
  }
  resume() {
    const r = this.run;
    if (!r || !r.paused) return;
    this.menus.hide();
    this.input.reset();
    r.setPaused(false);
  }
  quit() {
    const r = this.run;
    if (r && !r.ended && r.mode !== 'race' && r.stats.distance > 150) {
      this.menus.hide();
      r.paused = false;
      r.abandon();
      return;
    }
    if (r && r.mode === 'race' && this.net.room) this.net.leave();
    this.toMenu();
  }

  async toMenu(screen) {
    await this._fade(true);
    this.menus.hide();
    this._teardown();
    this._wake(false);
    this.state = 'menu';
    this.hub.enter();
    this.audio.muffle(false, 0.05);
    this.audio.stopLoops();
    this.audio.music.play('menu', 1.5);
    this.menus.home();
    if (screen) this.menus.show(screen);
    await this._fade(false);
  }

  _onRunEnd(summary) {
    this.input.reset();
    this._wake(false);
    if (summary.mode === 'story' && summary.success) {
      const n = summary.chapter, d = save.data, c = chapter(n);
      const firstTime = !d.story.done.includes(n);
      if (firstTime) {
        d.story.done.push(n);
        d.story.unlocked = Math.max(d.story.unlocked, n);
        d.coins += c.reward;
        summary.reward = c.reward;
        if (d.story.done.length >= CHAPTERS.length) {
          if (!d.owned.riders.includes('baron')) d.owned.riders.push('baron');
          if (!d.owned.boards.includes('paradoxe')) d.owned.boards.push('paradoxe');
        }
        save.touch();
      }
      this.audio.sfx('record');
      // the Cog's own little scene, then the results
      setTimeout(() => this.playCinematic('c' + n, () => this._showResults(summary), true), 250);
      return;
    }
    this.audio.sfx(summary.newBest ? 'record' : summary.mode === 'race' ? 'finish' : 'gameover');
    this._showResults(summary);
  }

  _showResults(summary) {
    this.hud.show(false);
    this.menus.stack = [];
    this.menus.show('results', { summary }, false);
  }

  afterChapter(n) {
    this.toMenu('story');
  }

  // ---------------------------------------------------------- cinematics
  /** Play a story sequence. keepRun: return to the frozen run scene afterwards. */
  async playCinematic(id, done, keepRun = false) {
    if (this.state === 'cine') return;
    const prev = this.state;
    await this._fade(true);
    this.menus.hide();
    this.hud.show(false);
    if (this.run) {
      this.run.dispose();
      this.run = null;
    }
    this.hub.leave();
    this.state = 'cine';
    this.input.enabled = false;
    save.data.story.seen[id] = true;
    save.touch();
    this.cinema.play(id, async () => {
      await this._fade(true);
      this.input.enabled = true;
      this.state = 'menu';
      this.hub.enter();
      this.audio.muffle(false, 0.05);
      this.audio.stopLoops();
      this.audio.music.play('menu', 1.5);
      if (done) done();
      if (!this.menus.visible) {
        this.menus.home();
        if (!done && prev === 'menu') this.menus.show('story');
      }
      await this._fade(false);
    });
    await this._fade(false);
  }
}
