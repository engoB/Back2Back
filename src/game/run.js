// One play session: physics stepping, items, tricks and back-to-back combos,
// the Fulgur gauge, power-ups, time jumps, story/race rules and all the
// audio-visual feedback that goes with them.
import * as THREE from 'three';
import { Course, COURSE_PRESETS } from '../world/course.js';
import { ERAS, ERA_ORDER } from '../world/eras.js';
import { Player, PHYS } from './player.js';
import { RiderRig } from './rider.js';
import { BotRider } from './bots.js';
import { rockOutcome, flipPoints, SCORE } from './rules.js';
import { combinedStats, UPGRADES, BOARDS } from './catalog.js';
import { missions } from './missions.js';
import { save } from '../core/save.js';
import { clamp, lerp, damp } from '../core/math.js';

const STEP = PHYS.STEP;
const COMBO_TIME = 2.4;
const WARP_TIME = 2.5;
const _v = new THREE.Vector3();

/** Remote rider reconstructed from network snapshots. */
class NetGhost {
  constructor() {
    this.a = null;
    this.b = null;
    this.state = { x: 0, y: 0, rot: 0, vx: 0, vy: 0, grounded: true, rail: null, crashed: false, boosting: false, airTime: 0, angVel: 0 };
    this.finished = false;
  }
  push(s, now) {
    this.a = this.b;
    this.b = { ...s, t: now };
    if (!this.a) this.a = this.b;
  }
  sample(now) {
    const a = this.a, b = this.b, st = this.state;
    if (!b) return st;
    const rt = now - 0.11;
    const span = Math.max(0.001, b.t - a.t);
    let k = (rt - a.t) / span;
    k = clamp(k, 0, 1.8);
    st.x = a.x + (b.x - a.x) * k;
    st.y = a.y + (b.y - a.y) * k;
    const prev = st.rot;
    st.rot = a.r + (b.r - a.r) * Math.min(k, 1);
    st.angVel = (st.rot - prev) * 60;
    st.vx = b.vx; st.vy = b.vy;
    const f = b.f || 0;
    st.grounded = !!(f & 1);
    st.rail = f & 2 ? {} : null;
    st.crashed = !!(f & 4);
    st.boosting = !!(f & 8);
    st.airTime = st.grounded ? 0 : 1;
    if (f & 16) st.angVel = 6;
    return st;
  }
}

export class Run {
  /**
   * ctx: { engine, world, fx, views, warp, cam, audio, hud, input, haptic, onEnd, askRevive, net }
   * opts: { mode, era, seed, course, chapter, storm, headstart, rider, board, bots, rivals, mood }
   */
  constructor(ctx, opts) {
    this.ctx = ctx;
    this.opts = opts;
    this.mode = opts.mode || 'endless';
    const d = save.data;
    this.riderId = opts.rider || d.rider;
    this.boardId = opts.board || d.board;
    this.eraId = opts.era || 'present';
    const start = ERA_ORDER.indexOf(this.eraId);
    this.eraSeq = ERA_ORDER.map((_, i) => ERA_ORDER[(start + i) % ERA_ORDER.length]);
    this.eraIndex = 0;

    let cfg;
    if (this.mode === 'race') cfg = { ...COURSE_PRESETS.race, ...opts.course, seed: opts.seed };
    else if (this.mode === 'story') cfg = { ...COURSE_PRESETS.endless, portals: null, end: 'cog', ...opts.course, seed: opts.seed ?? 1000 + (opts.chapter || 0) };
    else cfg = { ...COURSE_PRESETS.endless, seed: opts.seed ?? (Date.now() & 0xffffff), tutorial: !d.tuto.done };
    this.course = new Course(cfg);
    this.player = new Player(this.course, combinedStats(this.riderId, this.boardId));
    this.rig = new RiderRig(this.riderId, this.boardId);
    ctx.engine.scene.add(this.rig.root);
    this.trailColor = (BOARDS[this.boardId] || BOARDS.mk1).glow;

    // world
    const era = ERAS[this.eraId];
    ctx.world.load(this.course, this.eraId, { mood: opts.mood ?? Math.floor(Math.random() * era.moods.length), moodSpeed: 1 / 70 });
    ctx.views.setCourse(this.course, era);
    ctx.views.setPortalColors(ERAS[this.eraSeq[1]].accent, era.accent);
    ctx.fx.clear();
    ctx.fx.weather.set(opts.weather || era.weather, ctx.engine.q.particles);
    ctx.cam.snap = true;

    // state
    this.state = this.mode === 'race' ? 'countdown' : 'playing';
    this.time = 0;
    this.raceTime = 0;
    this.acc = 0;
    this.paused = false;
    this.collected = new Set();
    this.passed = new Set();
    this.itemCursor = 0;
    this.gapCursor = 0;
    this.score = 0;
    this.coins = 0;
    this.gauge = 0;
    this.fulgurOn = false;
    this.fulgurDur = UPGRADES.fulgur.value(d.upgrades.fulgur);
    this.magnetT = 0; this.magnetDur = UPGRADES.magnet.value(d.upgrades.magnet);
    this.doubleT = 0; this.doubleDur = UPGRADES.double.value(d.upgrades.double);
    this.combo = { pot: 0, chain: 0, timer: 0 };
    this.timeJumps = 0;
    this.crashT = 0;
    this.revived = false;
    this.slowT = 0;
    this.slowScale = 1;
    this.warpT = 0;
    this.warpSwapped = false;
    this.grindAcc = 0;
    this.fovKick = 0;
    this.sendT = 0;
    this.ended = false;
    this.tutShown = {};
    this.missionDone = new Set();
    this.missionT = 0;
    this.stats = {
      distance: 0, flips: 0, doubles: 0, coins: 0, grind: 0, gaps: 0, hops: 0, smashes: 0, bestCombo: 0, score: 0,
      timeJumps: 0, maxKmh: 0, fulgurs: 0, perfects: 0, bestFlip: 0, bestAir: 0, crashes: 0, eras: [this.eraId],
    };
    this.hudState = { score: 0, dist: 0, coins: 0, gauge: 0, fulgur: false, kmh: 0, magnet: 0, double: 0, shield: false,
      pot: 0, chain: 0, mult: 1, comboT: 0, era: this.eraId, rank: 0, total: 0, time: 0, progress: 0, storm: -1, timeMult: 1 };

    // storm (final chapter)
    this.storm = null;
    if (opts.storm) {
      this.storm = { x: opts.storm.start ?? -70, speed: opts.storm.speed ?? 15, boltT: 1 };
      this.stormMesh = makeStormMesh();
      ctx.engine.scene.add(this.stormMesh);
    }

    // rivals (race)
    this.rivals = [];
    if (this.mode === 'race') {
      const list = opts.rivals || [];
      for (const r of list) {
        const rig = new RiderRig(r.rider || 'nova', r.board || 'mk1');
        rig.setGhost(true);
        ctx.engine.scene.add(rig.root);
        const rv = { id: r.id, name: r.name, rig, finished: false, finishTime: 0, z: -0.9 - this.rivals.length * 0.5 };
        if (r.bot) rv.bot = new BotRider(this.course, { skill: r.skill, seed: r.seed, stats: combinedStats(r.rider, r.board) });
        else rv.net = new NetGhost();
        this.rivals.push(rv);
      }
      this.countT = 3.6;
      this.countN = 4;
      this.player.frozen = true;
    }
    if (opts.headstart) {
      this.player.fulgurT = 6;
      this.player.speed = 24;
      this.headstart = true;
      this.fulgurOn = true;
    }
    ctx.hud.setMode(this.mode, { length: this.course.length, chapter: opts.chapter, rivals: this.rivals.length });
    ctx.input.reset();
    this._visuals(0, 0);
  }

  get eraMult() {
    return 1 + 0.5 * this.timeJumps;
  }

  dispose() {
    const scene = this.ctx.engine.scene;
    this.rig.dispose();
    for (const r of this.rivals) r.rig.dispose();
    if (this.stormMesh) scene.remove(this.stormMesh);
    this.ctx.warp.stop();
    this.ctx.world.root.visible = true;
    this.ctx.views.group.visible = true;
    this.ctx.audio.stopLoops();
    this.ctx.fx.setShadow(0, 0, 0, 0, false);
  }

  setPaused(on) {
    this.paused = on;
    this.ctx.audio.muffle(on);
    if (on) this.ctx.audio.stopLoops();
  }

  // ------------------------------------------------------------------ loop
  update(dt) {
    if (this.paused) return;
    const ctx = this.ctx;
    this.time += dt;
    if (this.slowT > 0) this.slowT -= dt;
    const sdt = dt * (this.slowT > 0 ? this.slowScale : 1);

    if (this.state === 'countdown') this._countdown(dt);
    if (this.state === 'warp') this._warp(dt);
    else {
      this.acc += sdt;
      let pressed = ctx.input.consumePress();
      let held = ctx.input.held;
      if (this.state !== 'playing') pressed = held = false;
      let n = 0;
      while (this.acc >= STEP && n < 10) {
        this._step(STEP, held, pressed);
        pressed = false;
        this.acc -= STEP;
        n++;
      }
      if (n === 10) this.acc = 0;
    }
    if (this.state === 'crashed') {
      this.crashT += dt;
      if (this.crashT > (this.mode === 'race' ? 1.3 : 1.7)) this._afterCrash();
    }
    if (this.state === 'finished') {
      this.finishT += dt;
      if (this.finishT > this.finishWait && !this.ended) this._end(this.finishKind);
    }
    this._visuals(dt, sdt);
  }

  _step(dt, held, pressed) {
    const p = this.player;
    if (this.state === 'playing' || this.state === 'crashed' || this.state === 'finished') {
      const x0 = p.x;
      p.step(dt, held, pressed);
      if (this.state === 'playing') {
        const dx = Math.max(0, p.x - x0);
        this.score += dx * this.eraMult;
        if (p.x > this.stats.distance) this.stats.distance = p.x;
      }
      this._events();
      if (!p.crashed && this.state === 'playing') this._items();
      this._timers(dt);
    }
    if (this.mode === 'race' && this.state !== 'countdown') {
      this.raceTime += this.state === 'playing' || this.state === 'crashed' ? dt : 0;
      for (const r of this.rivals) {
        if (r.bot) {
          r.bot.step(dt, true);
          if (r.bot.finished && !r.finished) {
            r.finished = true;
            r.finishTime = r.bot.finishTime;
          }
        }
      }
    }
    if (this.storm && this.state === 'playing') {
      const s = this.storm;
      s.speed = Math.min(23, (this.opts.storm.speed ?? 14.5) + p.x * 0.003);
      s.x += s.speed * dt;
      // the storm never falls hopelessly behind: it stays a threat
      if (s.x < p.x - 110) s.x = p.x - 110;
      if (s.x > p.x - 1.5) p.crash('storm');
    }
  }

  _countdown(dt) {
    this.countT -= dt;
    const n = Math.ceil(this.countT);
    if (n !== this.countN) {
      this.countN = n;
      if (n > 0 && n <= 3) {
        this.ctx.hud.countdown(n);
        this.ctx.audio.sfx('count');
      } else if (n <= 0) {
        this.ctx.hud.countdown(0);
        this.ctx.audio.sfx('go');
        this.player.frozen = false;
        this.player.speed = 9;
        this.state = 'playing';
        this.ctx.haptic(30);
      }
    }
  }

  // ---------------------------------------------------------------- events
  _trick(key, points, n = 1) {
    const mult = this.fulgurOn ? 2 : 1;
    const pts = Math.round(points * mult);
    const c = this.combo;
    c.pot += pts;
    c.chain++;
    c.timer = COMBO_TIME;
    if (c.chain > this.stats.bestCombo) this.stats.bestCombo = c.chain;
    if (!this.fulgurOn) this.gauge = Math.min(1, this.gauge + points / 1050);
    this.ctx.hud.trick(key, pts, n, c.chain);
  }

  _events() {
    const p = this.player, ctx = this.ctx, A = ctx.audio, fx = ctx.fx, era = ERAS[this.eraId];
    for (const e of p.events) {
      switch (e.type) {
        case 'jump':
          A.sfx('jump');
          fx.landing(p.x, p.y, era.terrain.top, 0.2);
          break;
        case 'land': {
          const power = clamp(e.impact / 14, 0.15, 1);
          A.sfx('land', { power });
          fx.landing(p.x, p.y, era.terrain.top, power);
          this.rig.kickSquash(power);
          if (e.impact > 9) ctx.cam.addShake(0.18 + power * 0.2);
          if (e.airTime > this.stats.bestAir) this.stats.bestAir = e.airTime;
          if (e.flips > 0) {
            this.stats.flips += e.flips;
            if (e.flips >= 2) this.stats.doubles++;
            if (e.flips > this.stats.bestFlip) this.stats.bestFlip = e.flips;
            this._trick(e.flips === 1 ? 'trick.flip1' : e.flips === 2 ? 'trick.flip2' : 'trick.flip3', flipPoints(e.flips), e.flips);
            if (e.perfect) {
              this.stats.perfects++;
              this._trick('trick.perfect', SCORE.perfect);
              fx.ring(p.x, p.y + 0.4, 0.5, 0xffffff, 0.6, 4.5, 0.45);
              this.slowT = 0.12;
              this.slowScale = 0.45;
            }
            A.sfx('trick', { n: e.flips });
            A.sfx('boost');
            fx.ring(p.x, p.y + 0.3, 0.4, this.trailColor, 0.5, 3.4, 0.4);
            ctx.haptic(e.flips > 1 ? [20, 30, 30] : 20);
            this.fovKick = 1;
          } else if (e.airTime > 1.7) {
            this._trick('trick.bigair', SCORE.bigAir);
            ctx.haptic(12);
          } else ctx.haptic(8);
          break;
        }
        case 'railOn':
          A.sfx('railOn');
          this.grindAcc = 0;
          this.combo.timer = COMBO_TIME;
          if (e.flips > 0) {
            this.stats.flips += e.flips;
            this._trick(e.flips === 1 ? 'trick.flip1' : 'trick.flip2', flipPoints(e.flips), e.flips);
            A.sfx('trick', { n: e.flips });
          }
          this.combo.chain++;
          ctx.haptic(15);
          this._hintDone('rail');
          break;
        case 'grind':
          this.grindAcc += e.dist;
          this.stats.grind += e.dist;
          this.combo.pot += e.dist * SCORE.grindPerM * (this.fulgurOn ? 2 : 1);
          this.combo.timer = COMBO_TIME;
          if (!this.fulgurOn) this.gauge = Math.min(1, this.gauge + (e.dist * SCORE.grindPerM) / 1050);
          fx.sparks(p.x - 0.3, p.y + 0.05, p.vx, era.rail.glow ? era.rail.beam : 0xffd27a);
          break;
        case 'railOff':
          ctx.hud.trick('trick.grind', Math.round(e.dist * SCORE.grindPerM), Math.round(e.dist), this.combo.chain);
          break;
        case 'shieldBreak':
          A.sfx('shieldBreak');
          fx.ring(p.x, p.y + 0.8, 0.5, 0x7fc8ff, 0.8, 5, 0.5);
          fx.burst(p.x, p.y + 0.8, 0, 0x9fd8ff, 16, 7, 0.4, 0.6, true, 2);
          ctx.hud.toast('toast.shield', null, 'power');
          ctx.haptic([30, 40, 30]);
          break;
        case 'tumble':
          fx.landing(p.x, p.y, era.terrain.top, 0.5);
          break;
        case 'crash':
          this._crash(e.cause);
          break;
      }
    }
    p.events.length = 0;
  }

  _crash(cause) {
    const p = this.player, ctx = this.ctx, era = ERAS[this.eraId];
    this.state = 'crashed';
    this.crashT = 0;
    this.stats.crashes++;
    this.combo.pot = 0;
    this.combo.chain = 0;
    this.combo.timer = 0;
    this.fulgurOn = false;
    ctx.audio.sfx(cause === 'fall' ? 'fall' : 'crash');
    ctx.audio.loop('grind', 0);
    ctx.fx.burst(p.x, p.y + 0.6, 0, era.terrain.top, 22, 8, 0.5, 0.8);
    ctx.fx.burst(p.x, p.y + 0.6, 0, 0xffffff, 10, 9, 0.3, 0.4, true, 4);
    ctx.cam.addShake(0.65);
    ctx.haptic([60, 40, 80]);
    this.slowT = 0.5;
    this.slowScale = 0.35;
    if (this.mode !== 'race') ctx.audio.muffle(true, 0.1);
    ctx.hud.crash(cause);
  }

  _afterCrash() {
    const p = this.player, ctx = this.ctx;
    if (this.mode === 'race') {
      p.rescue('back');
      this.state = 'playing';
      ctx.fx.resetTrail();
      ctx.audio.sfx('revive');
      return;
    }
    if (!this.revived && save.data.items.revive > 0 && !this.asking) {
      this.asking = true;
      this.paused = true;
      ctx.askRevive(save.data.items.revive, (yes) => {
        this.asking = false;
        this.paused = false;
        if (yes) {
          save.data.items.revive--;
          save.touch();
          this.revived = true;
          this._revive();
        } else this._end('crash');
      });
      return;
    }
    if (!this.asking) this._end('crash');
  }

  _revive() {
    const p = this.player, ctx = this.ctx;
    p.rescue(p.crashType === 'fall' || p.crashType === 'wall' ? 'ahead' : 'back');
    p.invulnT = 3;
    p.boostT = 2;
    if (this.storm) this.storm.x = p.x - 90;
    this.state = 'playing';
    this.crashT = 0;
    ctx.audio.muffle(false);
    ctx.audio.sfx('revive');
    ctx.fx.ring(p.x, p.y + 0.8, 0.5, 0xffffff, 0.8, 6, 0.6);
    ctx.fx.resetTrail();
    ctx.cam.snap = true;
  }

  // ----------------------------------------------------------------- items
  _items() {
    const p = this.player, ctx = this.ctx, items = this.course.items, fx = ctx.fx, A = ctx.audio;
    const py = p.y + 0.8;
    const magnet = this.magnetT > 0 || this.fulgurOn;
    const reach = magnet ? 6.5 : 1.3;
    while (this.itemCursor < items.length && items[this.itemCursor].x < p.x - 4) this.itemCursor++;
    for (let k = this.itemCursor; k < items.length; k++) {
      const it = items[k];
      if (it.x > p.x + reach + 1) break;
      if (this.collected.has(it.id)) continue;
      switch (it.type) {
        case 'coin': {
          const d = Math.hypot(it.x - p.x, it.y - py);
          if (d < reach) {
            this.collected.add(it.id);
            const gain = this.doubleT > 0 ? 2 : 1;
            this.coins += gain;
            this.stats.coins += gain;
            this.score += SCORE.coin * this.eraMult;
            A.coin();
            if (d > 1.5) ctx.views.fly(it, p);
            else {
              ctx.views.remove(it);
              fx.coin(it.x, it.y);
            }
            if (!this.fulgurOn) this.gauge = Math.min(1, this.gauge + 0.004);
          }
          break;
        }
        case 'rock': {
          const out = rockOutcome(p, it);
          if (out === 'smash' || (out === 'crash' && !p.crash('rock'))) {
            this.collected.add(it.id);
            ctx.views.remove(it);
            fx.debris(it.x, it.y, ERAS[this.eraId].terrain.wall[1], 14);
            fx.burst(it.x, it.y + 0.5, 0, 0xffffff, 6, 6, 0.3, 0.3, true, 3);
            A.sfx('smash');
            ctx.cam.addShake(0.3);
            ctx.haptic(25);
            this.stats.smashes++;
            this._trick(p.stompT > 0 || !p.grounded ? 'trick.stomp' : 'trick.smash', SCORE.smash);
          } else if (out === 'none' && p.x > it.x + 1.3 && !this.passed.has(it.id)) {
            this.passed.add(it.id);
            if (!p.grounded && !p.rail) {
              this.stats.hops++;
              this._trick('trick.hop', SCORE.hop);
              this._hintDone('jump');
            }
          }
          if (it.tut && p.x > it.x - 17 && p.x < it.x - 6) this._hint(it.tut);
          break;
        }
        case 'power':
          if (Math.hypot(it.x - p.x, it.y - py) < 1.7) {
            this.collected.add(it.id);
            ctx.views.remove(it);
            this._power(it.kind, it);
          }
          break;
        case 'portal':
          if (p.x >= it.x) {
            this.collected.add(it.id);
            this._beginWarp();
            return;
          }
          break;
        case 'cog':
          if (p.x >= it.x - 0.6) {
            this.collected.add(it.id);
            ctx.views.remove(it);
            this._finish('cog');
            return;
          }
          break;
        case 'finish':
          if (p.x >= it.x) {
            this.collected.add(it.id);
            this._finish('race');
            return;
          }
          break;
        case 'hint':
          if (p.x >= it.x) {
            this.collected.add(it.id);
            this._hint(it.tut);
          }
          break;
      }
    }
    // chasms cleared
    const gaps = this.course.gaps;
    while (this.gapCursor < gaps.length && p.x > gaps[this.gapCursor].x2 + 0.6) {
      this.gapCursor++;
      this.stats.gaps++;
      this._trick('trick.gap', SCORE.gap);
    }
  }

  _power(kind, it) {
    const ctx = this.ctx, p = this.player;
    ctx.audio.sfx('powerup');
    ctx.fx.ring(it.x, it.y, 0.3, 0xffffff, 0.4, 3, 0.4);
    ctx.fx.burst(it.x, it.y, 0, 0xffffff, 10, 5, 0.3, 0.4, true, 1);
    ctx.haptic(18);
    if (kind === 'magnet') this.magnetT = this.magnetDur;
    else if (kind === 'double') this.doubleT = this.doubleDur;
    else if (kind === 'shield') p.shield = true;
    else if (kind === 'charge') this.gauge = Math.min(1, this.gauge + 0.5);
    ctx.hud.toast('power.' + kind, null, 'power');
  }

  _hint(key) {
    if (!key || this.tutShown[key] || save.data.tuto[key]) return;
    this.tutShown[key] = true;
    this.ctx.hud.hint('tut.' + key);
    this.ctx.audio.sfx('hint');
  }
  _hintDone(key) {
    if (!save.data.tuto[key] && this.tutShown[key]) {
      save.data.tuto[key] = true;
      if (save.data.tuto.jump && save.data.tuto.rail) save.data.tuto.done = true;
      save.touch();
      this.ctx.hud.hint(null);
    }
  }

  _timers(dt) {
    const p = this.player, c = this.combo, ctx = this.ctx;
    if (this.magnetT > 0) this.magnetT -= dt;
    if (this.doubleT > 0) this.doubleT -= dt;
    // back-to-back combo: the clock only runs while riding on the ground
    if (c.chain > 0 && p.grounded && !p.rail && this.state === 'playing') {
      c.timer -= dt;
      if (c.timer <= 0) {
        const mult = Math.min(5, 1 + 0.5 * (c.chain - 1));
        const total = Math.round(c.pot * mult * this.eraMult);
        this.score += total;
        if (c.chain > 1) {
          ctx.hud.bank(total, mult, c.chain);
          ctx.audio.sfx('bank', { mult });
        }
        c.pot = 0;
        c.chain = 0;
      }
    }
    // Fulgur
    if (!this.fulgurOn && this.gauge >= 1 && this.state === 'playing' && !p.crashed) {
      this.fulgurOn = true;
      p.fulgurT = this.fulgurDur;
      this.stats.fulgurs++;
      ctx.audio.sfx('fulgur');
      ctx.hud.toast('toast.fulgur', null, 'fulgur');
      ctx.hud.flash('#ffffff', 0.55, 0.35);
      ctx.fx.ring(p.x, p.y + 0.8, 0.6, 0xfff2a0, 1, 9, 0.6);
      ctx.world.flash = 1;
      ctx.cam.addShake(0.45);
      ctx.haptic([40, 30, 60]);
      const top = { x: p.x + 6, y: p.y + 38, z: -4 };
      ctx.fx.bolt(top, { x: p.x, y: p.y + 0.8, z: 0 }, 0xfff6c0, 0.4, 0.35, 0.2, 2);
    } else if (this.fulgurOn && p.fulgurT <= 0) {
      this.fulgurOn = false;
      this.headstart = false;
      this.gauge = 0;
      ctx.audio.sfx('fulgurEnd');
    }
    if (this.fulgurOn) this.gauge = clamp(p.fulgurT / (this.headstart ? 6 : this.fulgurDur), 0, 1);
    const kmh = p.kmh;
    if (kmh > this.stats.maxKmh) this.stats.maxKmh = kmh;
    this.stats.score = this.score;
    this.stats.timeJumps = this.timeJumps;
    // missions completed during the run
    this.missionT -= dt;
    if (this.missionT <= 0 && this.mode !== 'race') {
      this.missionT = 0.5;
      for (const s of missions.newlyDone(this.stats, this.missionDone)) {
        this.missionDone.add(s.id);
        ctx.hud.toast('toast.mission', { id: s.id, target: s.target }, 'mission');
        ctx.audio.sfx('mission');
      }
    }
  }

  // ------------------------------------------------------------- time jump
  _beginWarp() {
    const p = this.player, ctx = this.ctx;
    this.state = 'warp';
    this.warpT = 0;
    this.warpSwapped = false;
    p.frozen = true;
    this.timeJumps++;
    this.nextEra = this.eraSeq[(this.eraIndex + 1) % this.eraSeq.length];
    ctx.audio.sfx('portal');
    ctx.audio.loop('grind', 0);
    ctx.hud.flash('#ffffff', 1, 0.3);
    ctx.haptic([30, 30, 30, 30, 80]);
    ctx.warp.start(p.x, p.y, ERAS[this.eraId].accent, ERAS[this.nextEra].accent);
    ctx.world.root.visible = false;
    ctx.views.group.visible = false;
    ctx.fx.weather.set('none');
    ctx.fx.clear();
    ctx.fx.setShadow(0, 0, 0, 0, false);
    ctx.hud.yearRoll(this.eraId, this.nextEra, WARP_TIME - 0.4);
    ctx.input.reset();
  }

  _warp(dt) {
    const p = this.player, ctx = this.ctx;
    this.warpT += dt;
    const k = clamp(this.warpT / WARP_TIME, 0, 1);
    ctx.warp.update(dt, k);
    if (!this.warpSwapped && this.warpT > 0.7) {
      this.warpSwapped = true;
      this.eraIndex = (this.eraIndex + 1) % this.eraSeq.length;
      this.eraId = this.nextEra;
      const era = ERAS[this.eraId];
      ctx.world.setEra(this.eraId, { mood: Math.floor(Math.random() * era.moods.length), moodSpeed: 1 / 70 });
      ctx.views.setEra(era, ERAS[this.eraSeq[(this.eraIndex + 1) % this.eraSeq.length]].accent, era.accent);
      ctx.audio.music.play(era.music, 1.4);
      if (!this.stats.eras.includes(this.eraId)) this.stats.eras.push(this.eraId);
    }
    if (this.warpT >= WARP_TIME) {
      const era = ERAS[this.eraId];
      ctx.warp.stop();
      ctx.world.root.visible = true;
      ctx.views.group.visible = true;
      ctx.fx.weather.set(era.weather, ctx.engine.q.particles);
      ctx.hud.flash('#ffffff', 1, 0.45);
      ctx.audio.sfx('arrive');
      ctx.world.flash = 1;
      p.frozen = false;
      p.boostT = Math.max(p.boostT, 1.5);
      this.state = 'playing';
      this.score += SCORE.portal * this.timeJumps;
      ctx.hud.eraCard(this.eraId, this.eraMult);
      ctx.cam.snap = true;
      ctx.fx.resetTrail();
      ctx.fx.ring(p.x, p.y + 1, 0.5, era.accent, 1, 10, 0.7);
      ctx.haptic(40);
    }
  }

  // ---------------------------------------------------------------- ending
  _finish(kind) {
    const p = this.player, ctx = this.ctx;
    if (this.state === 'finished') return;
    this.state = 'finished';
    this.finishKind = kind;
    this.finishT = 0;
    this.finishWait = kind === 'cog' ? 2.2 : 2.6;
    if (kind === 'cog') {
      this.score += SCORE.cog;
      ctx.audio.sfx('cog');
      ctx.hud.flash('#fff6d0', 0.8, 0.6);
      ctx.fx.ring(p.x, p.y + 2, 0.5, ERAS[this.eraId].accent, 1, 14, 0.9);
      ctx.fx.burst(p.x, p.y + 2.4, 0, 0xffe9a8, 40, 12, 0.5, 1.2, true, 2);
      this.slowT = 1.2;
      this.slowScale = 0.3;
      ctx.haptic([40, 40, 40, 40, 120]);
      p.fulgurT = 0;
      p.boostT = 0;
    } else {
      this.finishTime = this.raceTime;
      ctx.audio.sfx('finish');
      ctx.hud.flash('#ffffff', 0.6, 0.4);
      ctx.haptic([40, 40, 120]);
      if (ctx.net) ctx.net.sendFinish(this.raceTime, Math.round(this.score));
    }
  }

  /** Bank everything and hand the summary to the game. */
  _end(kind) {
    if (this.ended) return;
    this.ended = true;
    const d = save.data, st = this.stats, ctx = this.ctx;
    this.state = 'over';
    ctx.audio.muffle(false);
    ctx.audio.stopLoops();
    // pending combo is lost on a crash, banked on a clean finish
    if (kind !== 'crash' && this.combo.pot > 0) this.score += Math.round(this.combo.pot * Math.min(5, 1 + 0.5 * (this.combo.chain - 1)) * this.eraMult);
    const score = Math.round(this.score), dist = Math.round(st.distance);
    st.score = score;
    const summary = {
      mode: this.mode, kind, score, distance: dist, coins: this.coins, flips: st.flips, bestCombo: st.bestCombo, grind: Math.round(st.grind),
      timeJumps: this.timeJumps, eras: st.eras.slice(), maxKmh: Math.round(st.maxKmh), time: this.time, chapter: this.opts.chapter,
      success: kind === 'cog' || kind === 'race', raceTime: this.finishTime || this.raceTime,
    };
    // wallet + lifetime stats
    d.coins += this.coins;
    const S = d.stats;
    S.runs++;
    S.totalDist += dist;
    S.flips += st.flips;
    S.coins += this.coins;
    S.grind += Math.round(st.grind);
    S.timeJumps += this.timeJumps;
    S.crashes += st.crashes;
    S.playTime += Math.round(this.time);
    S.smashes += st.smashes;
    S.gaps += st.gaps;
    S.bestFlip = Math.max(S.bestFlip, st.bestFlip);
    S.bestCombo = Math.max(S.bestCombo, st.bestCombo);
    for (const e of st.eras) if (!S.eras.includes(e)) S.eras.push(e);
    if (this.mode === 'endless') {
      summary.newBest = score > S.bestScore;
      S.bestScore = Math.max(S.bestScore, score);
      S.bestDist = Math.max(S.bestDist, dist);
      summary.rank = save.record({ score, dist, date: Date.now(), rider: this.riderId, jumps: this.timeJumps });
    }
    if (this.mode === 'race') {
      S.races++;
      const order = this.standings();
      summary.standings = order;
      summary.place = order.findIndex((o) => o.me) + 1;
      if (summary.place === 1) {
        S.wins++;
        const bonus = 60 + 30 * this.rivals.length;
        d.coins += bonus;
        summary.bonus = bonus;
      }
    } else {
      summary.missions = missions.commit(st);
    }
    save.touch();
    save.flush();
    ctx.onEnd(summary);
  }

  /** Give up from the pause menu. */
  abandon() {
    if (!this.ended) this._end('crash');
  }

  /** Race standings: finished first (by time), then by distance. */
  standings() {
    const list = [{ name: save.data.name, me: true, x: this.player.x, finished: this.state === 'finished' || this.ended, time: this.finishTime || 0 }];
    for (const r of this.rivals) {
      const x = r.bot ? r.bot.player.x : r.net.state.x;
      list.push({ name: r.name, me: false, x, finished: r.finished, time: r.finishTime });
    }
    list.sort((a, b) => (a.finished && b.finished ? a.time - b.time : a.finished ? -1 : b.finished ? 1 : b.x - a.x));
    return list;
  }

  /** Network: snapshot of a remote rider. */
  netState(id, s) {
    const r = this.rivals.find((q) => q.id === id);
    if (r && r.net) r.net.push(s, performance.now() / 1000);
  }
  netFinish(id, time) {
    const r = this.rivals.find((q) => q.id === id);
    if (r) {
      r.finished = true;
      r.finishTime = time;
    }
  }
  netLeave(id) {
    const i = this.rivals.findIndex((q) => q.id === id);
    if (i >= 0) {
      this.rivals[i].rig.dispose();
      this.rivals.splice(i, 1);
    }
  }

  // --------------------------------------------------------------- visuals
  _visuals(dt, sdt) {
    const p = this.player, ctx = this.ctx, fx = ctx.fx, A = ctx.audio, course = this.course, era = ERAS[this.eraId];
    const engine = ctx.engine;
    const speed = Math.hypot(p.vx, p.vy);
    const ground = course.solidAt(p.x);
    const warp = this.state === 'warp';

    // rider
    const rig = this.rig;
    rig.setTint(ctx.world.tint);
    rig.root.position.set(p.x, p.y + 0.03, 0);
    if (warp) {
      rig.tilt.rotation.z = Math.sin(this.time * 2.2) * 0.22 + 0.12;
      rig.tilt.rotation.x = Math.sin(this.time * 1.3) * 0.5;
      rig.root.position.y = p.y + 1.2 + Math.sin(this.time * 3) * 0.3;
      rig.play('boost');
      rig.speedHint = 26;
      rig.update(dt);
    } else {
      rig.tilt.rotation.x = 0;
      rig.tilt.rotation.z = p.rot;
      rig.drive(sdt || dt, p, false);
    }
    rig.root.visible = !(p.invulnT > 0 && !p.crashed && Math.floor(this.time * 14) % 2 === 0);

    // particles / trail
    if (!warp) {
      const boosting = p.boosting && !p.crashed;
      if (p.grounded && !p.crashed && this.state !== 'countdown') fx.spray(p.x, p.y, speed, era.terrain.top, p.rot);
      const cs = Math.cos(p.rot), sn = Math.sin(p.rot);
      const tw = p.crashed ? 0 : this.fulgurOn ? 0.5 : boosting ? 0.34 : 0.1;
      fx.trailPoint(p.x - cs * 0.75, p.y + 0.06 - sn * 0.75, tw, this.fulgurOn ? 0xfff2a0 : this.trailColor);
      if (this.fulgurOn && !p.crashed) {
        fx.energy(p.x, p.y, 0xfff2a0, 0.9);
        if (Math.random() < dt * 5) {
          fx.bolt({ x: p.x - 2 - Math.random() * 3, y: p.y + 0.2, z: (Math.random() - 0.5) * 2 }, { x: p.x + 0.4, y: p.y + 0.8 + Math.random(), z: 0 }, 0xfff6c0, 0.07, 0.14, 0.3, 0);
        }
      } else if (boosting) fx.energy(p.x, p.y, this.trailColor, 0.5);
      if (p.shield && Math.random() < dt * 10) fx.glow(p.x, p.y + 0.8, 0.3, 0x5fb0ff, 2.4, 0.3, 0.16);
      fx.speedLines(dt, p.x, p.y, speed + 20, boosting && speed > 20);
      fx.setShadow(p.x, ground, course.slopeAt(p.x), Math.max(0, p.y - ground), !p.crashed || p.crashType !== 'fall');
    } else fx.speedLines(dt, p.x, p.y, 120, true);

    // rivals
    const now = performance.now() / 1000;
    for (const r of this.rivals) {
      const s = r.bot ? r.bot.player : r.net.sample(now);
      r.rig.setTint(ctx.world.tint);
      r.rig.root.position.set(s.x, s.y + 0.03, r.z);
      r.rig.tilt.rotation.z = s.rot;
      r.rig.drive(dt, s, false);
      r.sx = s.x; r.sy = s.y;
    }

    // storm wall
    if (this.storm) {
      const s = this.storm;
      this.stormMesh.position.set(s.x - 80, ground + 10, 6);
      this.stormMesh.material.uniforms.uTime.value = this.time;
      s.boltT -= dt;
      if (s.boltT <= 0 && s.x > p.x - 90) {
        s.boltT = 0.3 + Math.random() * 0.9;
        const bx = s.x - 4 - Math.random() * 18;
        fx.bolt({ x: bx, y: ground + 34, z: 2 }, { x: bx + (Math.random() - 0.5) * 8, y: course.solidAt(bx) + 0.5, z: (Math.random() - 0.5) * 6 }, 0xd8b8ff, 0.3, 0.26, 0.2, 1);
        if (Math.random() < 0.5) {
          A.sfx('thunder', { near: clamp(1 - (p.x - s.x) / 90, 0.2, 1) });
          ctx.world.flash = Math.max(ctx.world.flash, 0.5);
        }
      }
      A.loop('storm', clamp(1 - (p.x - s.x) / 80, 0, 1) * 0.5);
    }

    // camera
    this.fovKick = damp(this.fovKick, p.boosting ? 0.6 : 0, 3, dt);
    if (warp) {
      const t = this.warpT;
      const cx = p.x - 10 + Math.sin(t * 1.4) * 0.6, cy = p.y + 3 + Math.sin(t * 1.9) * 0.5;
      ctx.cam.shot(_v.set(cx, cy, 4.5 + Math.sin(t * 0.9) * 1.5), new THREE.Vector3(p.x + 40, p.y + 1.6, 0), 62, Math.sin(t * 1.1) * 0.18);
      ctx.cam.apply(dt);
    } else {
      const fy = Math.max(p.y, ground - 6);
      ctx.cam.follow(dt, { x: p.x, y: fy, vx: p.vx, vy: p.vy }, ground, engine.aspect, { extra: this.fovKick * 5 + (this.storm ? 6 : 0) });
    }
    fx.setViewport(engine.height, engine.camera.fov);

    // world & items
    ctx.world.aspect = engine.aspect;
    ctx.world.update(dt, p.x, p.y);
    if (!warp) ctx.views.update(dt, p.x, this.collected, p);
    fx.update(dt, p.x, Math.max(p.y, ground - 6));

    // audio ambience
    if (this.state === 'playing' || this.state === 'finished') {
      A.loop('wind', clamp((speed - 6) / 30, 0, 1) * 0.22 + (p.grounded ? 0 : 0.05), 300 + speed * 26);
      A.loop('grind', p.rail ? 0.16 : 0, 3400);
      A.loop('hum', this.fulgurOn ? 0.1 : 0, 500);
      A.music.setIntensity(clamp(0.35 + (speed - 12) / 30 + (this.fulgurOn ? 0.5 : 0) + this.combo.chain * 0.08, 0.2, 1));
    } else if (this.state === 'crashed') {
      A.loop('wind', 0.03, 300);
      A.loop('hum', 0);
    } else if (warp) {
      A.loop('wind', 0.25, 1400);
      A.loop('hum', 0.14, 900);
    }

    // network
    if (ctx.net && this.mode === 'race') {
      this.sendT -= dt;
      if (this.sendT <= 0) {
        this.sendT = 1 / 12;
        ctx.net.sendState({
          x: +p.x.toFixed(2), y: +p.y.toFixed(2), r: +p.rot.toFixed(2), vx: +p.vx.toFixed(1), vy: +p.vy.toFixed(1),
          f: (p.grounded ? 1 : 0) | (p.rail ? 2 : 0) | (p.crashed ? 4 : 0) | (p.boosting ? 8 : 0) | (Math.abs(p.angVel) > 1.6 ? 16 : 0),
        });
      }
    }

    // HUD
    const h = this.hudState, c = this.combo;
    h.score = this.score;
    h.dist = Math.max(0, this.stats.distance);
    h.coins = this.coins;
    h.gauge = this.gauge;
    h.fulgur = this.fulgurOn;
    h.kmh = p.kmh;
    h.magnet = this.magnetT > 0 ? this.magnetT / this.magnetDur : 0;
    h.double = this.doubleT > 0 ? this.doubleT / this.doubleDur : 0;
    h.shield = p.shield;
    h.pot = c.pot;
    h.chain = c.chain;
    h.mult = Math.min(5, 1 + 0.5 * Math.max(0, c.chain - 1));
    h.comboT = c.chain > 0 ? clamp(c.timer / COMBO_TIME, 0, 1) : 0;
    h.era = this.eraId;
    h.timeMult = this.eraMult;
    h.time = this.raceTime;
    h.progress = Number.isFinite(course.length) ? clamp(p.x / course.length, 0, 1) : 0;
    if (this.mode === 'race') {
      let rank = 1;
      for (const r of this.rivals) if ((r.sx || 0) > p.x || r.finished) rank++;
      h.rank = this.state === 'finished' || this.ended ? (this.place || rank) : rank;
      h.total = this.rivals.length + 1;
      h.rivals = this.rivals;
      // name tags
      for (const r of this.rivals) {
        _v.set(r.sx || 0, (r.sy || 0) + 2.3, r.z).project(engine.camera);
        r.px = (_v.x * 0.5 + 0.5) * engine.width;
        r.py = (-_v.y * 0.5 + 0.5) * engine.height;
        r.vis = _v.z < 1 && Math.abs(_v.x) < 1.1 && Math.abs(_v.y) < 1.1;
        r.progress = Number.isFinite(course.length) ? clamp((r.sx || 0) / course.length, 0, 1) : 0;
      }
    }
    h.storm = this.storm ? Math.max(0, p.x - this.storm.x) : -1;
    h.state = this.state;
    ctx.hud.update(h);
  }
}

function makeStormMesh() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    transparent: true, depthWrite: false, depthTest: false, fog: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `precision highp float; uniform float uTime; varying vec2 vUv;
      float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
      void main(){
        float n = vn(vec2(vUv.x*5.0 - uTime*0.6, vUv.y*7.0 + uTime*0.25)) * 0.6 + vn(vec2(vUv.x*13.0 - uTime*1.1, vUv.y*17.0)) * 0.4;
        float edge = smoothstep(1.0, 0.72 + n*0.22, vUv.x);
        vec3 col = mix(vec3(0.03,0.01,0.08), vec3(0.32,0.1,0.5), n*n) + vec3(0.9,0.6,1.0) * smoothstep(0.9, 1.0, vUv.x + n*0.16) * 0.5;
        gl_FragColor = vec4(col, edge * 0.96);
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), mat);
  m.renderOrder = 60;
  m.frustumCulled = false;
  return m;
}
