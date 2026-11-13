// AI riders: used for the "race against the AI" mode, to fill multiplayer rooms
// offline, for the attract mode and for automated balance tests.
import { PHYS, Player } from './player.js';
import { ROCK_SIZES, hitsRock, rockOutcome } from './rules.js';
import { wrapPi, TAU } from '../core/math.js';
import { RNG } from '../core/rng.js';

export class BotBrain {
  /** skill 0..1: reaction quality, appetite for flips. */
  constructor(skill = 0.7, seed = 1) {
    this.skill = skill;
    this.rng = new RNG(seed);
    this.held = false;
    this.itemCursor = 0;
    this.wantFlip = false;
    this.landT = 0;
    this.thinkT = 0;
    this.airPlanned = false;
    this.jumpJitter = 0;
  }

  /** Time until ballistic touchdown and the slope there. */
  static predictLanding(p, course) {
    const g = PHYS.G;
    for (let t = 0.04; t < 3.2; t += 0.04) {
      const x = p.x + p.vx * t;
      const y = p.y + p.vy * t - 0.5 * g * t * t;
      const h = course.heightAt(x);
      if (h !== null && y <= h) return { t, slope: course.slopeAt(x), x };
      if (h === null && y < course.baseAt(x) - 20) return { t, slope: 0, x, fall: true };
    }
    return { t: 3.2, slope: 0, x: p.x };
  }

  /** Returns { held, pressed } for this physics step. */
  update(p, course, dt) {
    let pressed = false;
    if (p.crashed) {
      this.held = false;
      return { held: false, pressed: false };
    }
    const items = course.items;
    while (this.itemCursor < items.length && items[this.itemCursor].x < p.x - 1) this.itemCursor++;

    if (p.rail) {
      this.held = false;
      this.airPlanned = false;
      // hop off shortly before the end for a clean exit
      if (p.rail.x2 - p.x < p.speed * 0.12 && this.rng.chance(0.5 * this.skill)) pressed = true;
      return { held: false, pressed };
    }

    if (p.grounded) {
      this.held = false;
      this.airPlanned = false;
      const v = Math.max(p.vx, 6);
      const air = (2 * PHYS.JUMP * p.stats.jump) / PHYS.G; // flat-slope hang time
      const reach = v * 0.42 + 0.6 + this.jumpJitter;
      let rockAhead = null, rockAfter = null;
      for (let k = this.itemCursor; k < items.length; k++) {
        const it = items[k];
        const d = it.x - p.x;
        if (d > v * air + 12) break;
        if (it.type !== 'rock' || d < 0.8) continue;
        if (!rockAhead) rockAhead = it;
        else if (it.x - rockAhead.x > 4 && !rockAfter) rockAfter = it;
      }
      if (rockAhead) {
        const d = rockAhead.x - p.x;
        // latest safe take-off still clears the rock; use it when an early jump would land on the next one
        let trigger = reach;
        if (rockAfter && this.skill > 0.2) {
          const landAt = p.x + v * air;
          if (Math.abs(landAt - rockAfter.x) < 5) trigger = Math.min(reach, v * 0.16 + 1.6);
        }
        if (d < trigger) pressed = true;
      }
      // chasms and lips: jump right at the edge
      if (!pressed) {
        const look = v * 0.07 + 0.45;
        const hNow = course.heightAt(p.x), hAhead = course.heightAt(p.x + look);
        if (hAhead === null) pressed = true;
        else if (hNow !== null && this.skill > 0.3 && !rockAhead) {
          const expected = hNow + Math.tan(course.slopeAt(p.x - 0.5)) * look;
          if (expected - hAhead > 0.8) pressed = true;
        }
      }
      if (pressed) this.jumpJitter = (this.rng.next() - 0.5) * (1 - this.skill) * 3;
      return { held: false, pressed };
    }

    // airborne ---------------------------------------------------------
    if (!this.airPlanned && p.airTime > 0.1) {
      this.airPlanned = true;
      const land = BotBrain.predictLanding(p, course);
      const need = 1.02 / p.stats.flip + 0.14;
      this.wantFlip = !land.fall && land.t > need && this.rng.chance(0.25 + 0.75 * this.skill);
      this.held = this.wantFlip;
    }
    if (this.held) {
      const land = BotBrain.predictLanding(p, course);
      const overshoot = (p.angVel * p.angVel) / (2 * PHYS.FLIP_DAMP) + p.angVel * 0.02;
      const remaining = wrapPi(land.slope - p.rot);
      const spun = Math.abs(p.spin);
      if (spun > Math.PI && remaining > -0.15 && remaining < overshoot + 0.12) {
        // enough air left for another one?
        const need = (TAU - 0.6) / (PHYS.FLIP_RATE * p.stats.flip) + 0.12;
        if (!(land.t > need + 0.3 && this.skill > 0.55)) this.held = false;
      }
      if (land.t < 0.1) this.held = false;
    }
    return { held: this.held, pressed: false };
  }
}

/** A complete simulated rider (physics + brain). */
export class BotRider {
  constructor(course, opts = {}) {
    this.name = opts.name || 'Bot';
    this.id = opts.id || 'bot';
    this.rider = opts.rider || 'nova';
    this.board = opts.board || 'mk1';
    this.player = new Player(course, opts.stats);
    this.brain = new BotBrain(opts.skill ?? 0.7, opts.seed ?? 1);
    this.course = course;
    this.respawnT = 0;
    this.finished = false;
    this.finishTime = 0;
    this.itemCursor = 0;
    this.time = 0;
  }

  /** Fixed-step update including obstacle hits and respawn (race rules). */
  step(dt, running = true) {
    const p = this.player, c = this.course;
    if (!running || this.finished) {
      p.events.length = 0;
      return;
    }
    this.time += dt;
    const cmd = this.brain.update(p, c, dt);
    p.step(dt, cmd.held, cmd.pressed);
    if (!p.crashed) {
      const items = c.items;
      while (this.itemCursor < items.length && items[this.itemCursor].x < p.x - 2) this.itemCursor++;
      for (let k = this.itemCursor; k < items.length; k++) {
        const it = items[k];
        if (it.x > p.x + 2) break;
        if (it.type === 'rock' && rockOutcome(p, it) === 'crash') p.crash('rock');
      }
    } else {
      this.respawnT += dt;
      if (this.respawnT > 1.5) {
        this.respawnT = 0;
        p.rescue('back');
      }
    }
    if (Number.isFinite(c.length) && p.x >= c.length && !this.finished) {
      this.finished = true;
      this.finishTime = this.time;
    }
    p.events.length = 0;
  }
}

export { ROCK_SIZES, hitsRock, rockOutcome };
