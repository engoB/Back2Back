// Rider physics in the x/y plane. Shared by the local player, bots and tests,
// so it has no rendering or audio dependency: it only pushes events.
import { clamp, wrapPi, approach, damp, dampAngle, TAU } from '../core/math.js';

export const PHYS = {
  G: 19,
  JUMP: 8.6,
  MIN_SPEED: 10,
  MAX_SPEED: 25,
  DRAG: 0.0115,
  FRICTION: 0.25,
  FLIP_RATE: 6.9,
  FLIP_ACC: 36,
  FLIP_DAMP: 30,
  LAND_TOL: 0.98,
  STEP: 1 / 120,
};

export const DEFAULT_STATS = { jump: 1, flip: 1, speed: 1, boost: 1 };

export class Player {
  constructor(course, stats = DEFAULT_STATS) {
    this.course = course;
    this.stats = { ...DEFAULT_STATS, ...stats };
    this.events = [];
    this.reset(0);
  }

  reset(x = 0) {
    const c = this.course;
    this.x = x;
    this.y = c.solidAt(x);
    this.speed = 6;
    this.vx = 6;
    this.vy = 0;
    this.rot = c.slopeAt(x);
    this.angVel = 0;
    this.grounded = true;
    this.rail = null;
    this.ignoreRail = null;
    this.railCursor = 0;
    this.railDist = 0;
    this.airTime = 0;
    this.spin = 0;
    this.jumped = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.overGap = false;
    this.crashed = false;
    this.crashType = '';
    this.crashT = 0;
    this.boostT = 0;
    this.fulgurT = 0;
    this.invulnT = 0;
    this.shield = false;
    this.frozen = false;
    this.lastSafeX = x;
    this.maxAirY = 0;
    this.stompT = 0;
    this.liftCount = 0;
    this.settled = false;
    this.events.length = 0;
  }

  get boosting() {
    return this.boostT > 0 || this.fulgurT > 0;
  }
  get kmh() {
    return Math.hypot(this.vx, this.vy) * 3.6;
  }
  heightAboveGround() {
    return this.y - this.course.solidAt(this.x);
  }

  /** One fixed physics step. `pressed` is the tap edge, `held` the current hold state. */
  step(dt, held, pressed) {
    if (this.frozen) return;
    if (pressed) this.jumpBuffer = 0.15;
    else this.jumpBuffer -= dt;
    if (this.boostT > 0) this.boostT -= dt;
    if (this.fulgurT > 0) this.fulgurT -= dt;
    if (this.invulnT > 0) this.invulnT -= dt;
    if (this.stompT > 0) this.stompT -= dt;
    if (this.crashed) return this._crashStep(dt);
    if (this.rail) return this._railStep(dt, held);
    if (this.grounded) return this._groundStep(dt, held);
    return this._airStep(dt, held);
  }

  _limits() {
    const scale = 1 + 0.22 * this.course.diffAt(this.x);
    const boost = this.fulgurT > 0 ? 1.3 : this.boostT > 0 ? 1.18 : 1;
    return {
      min: PHYS.MIN_SPEED * scale,
      max: PHYS.MAX_SPEED * scale * this.stats.speed * boost,
      drag: PHYS.DRAG / (scale * scale * this.stats.speed * this.stats.speed),
    };
  }

  _groundStep(dt, held) {
    const c = this.course, P = PHYS;
    const slope = c.slopeAt(this.x);
    const sin = Math.sin(slope), cos = Math.cos(slope);
    const lim = this._limits();
    let s = this.speed;
    let acc = -P.G * sin * 0.92 - lim.drag * s * s - P.FRICTION;
    if (this.fulgurT > 0) acc += 12;
    else if (this.boostT > 0) acc += 7;
    s += acc * dt;
    if (s < lim.min) s = approach(s, lim.min, 9 * dt);
    s = Math.min(s, lim.max);
    this.speed = s;
    this.vx = s * cos;
    this.vy = s * sin;
    this.lastSlope = slope;

    if (this.jumpBuffer > 0) {
      this._jump(1);
      return this._airStep(dt, held);
    }
    const nx = this.x + s * cos * dt;
    const gNext = c.heightAt(nx);
    const ballY = this.y + s * sin * dt - 0.5 * P.G * dt * dt;
    // leave the ground at an edge or a lip, or when a crest falls away faster than gravity
    // allows — and then only if it lasts (no flicker on gentle rollers)
    let lift = gNext === null || gNext < ballY - 0.2;
    if (!lift) {
      const curv = c.curvatureAt(this.x);
      if (curv > 0 && s * s * curv > P.G * cos * 1.15) lift = ++this.liftCount >= 4;
      else this.liftCount = 0;
    }
    if (lift) {
      this.liftCount = 0;
      this.grounded = false;
      this.airTime = 0;
      this.spin = 0;
      this.jumped = false;
      this.coyote = 0.11;
      this.maxAirY = this.y;
      this.events.push({ type: 'launch' });
      return this._airStep(dt, held);
    }
    this.x = nx;
    this.y = gNext;
    this.rot = dampAngle(this.rot, slope, 18, dt);
    this.angVel = 0;
    if (!c.isGap(nx + 3) && !c.isGap(nx + 9)) this.lastSafeX = nx;
  }

  _jump(power) {
    this.vy += PHYS.JUMP * this.stats.jump * power;
    this.grounded = false;
    this.rail = null;
    this.airTime = 0;
    this.spin = 0;
    this.jumped = true;
    this.jumpBuffer = 0;
    this.coyote = 0;
    this.maxAirY = this.y;
    this.events.push({ type: 'jump' });
  }

  _airStep(dt, held) {
    const c = this.course, P = PHYS;
    this.airTime += dt;
    this.coyote -= dt;
    if (this.jumpBuffer > 0 && this.coyote > 0 && !this.jumped) this._jump(1);

    const px = this.x, py = this.y;
    this.vy -= P.G * dt;
    const vmax = this._limits().max * 1.12;
    if (this.vx > vmax) this.vx = approach(this.vx, vmax, 6 * dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y > this.maxAirY) this.maxAirY = this.y;

    // rotation: hold to backflip
    const want = held && this.airTime > 0.09;
    if (want) this.angVel = approach(this.angVel, P.FLIP_RATE * this.stats.flip, P.FLIP_ACC * dt);
    else this.angVel = approach(this.angVel, 0, P.FLIP_DAMP * dt);
    this.rot += this.angVel * dt;
    this.spin += this.angVel * dt;

    const g = c.heightAt(this.x);
    if (!want && g !== null) {
      // gentle self-levelling when nearly aligned with the ground below
      const d = wrapPi(c.slopeAt(this.x) - this.rot);
      if (Math.abs(d) < 0.7) this.rot += d * (1 - Math.exp(-(this.y - g < 0.6 ? 12 : 3.5) * dt));
    }

    // rails
    if (this.vy < 3) {
      const rails = c.rails;
      while (this.railCursor < rails.length && rails[this.railCursor].x2 < this.x - 1) this.railCursor++;
      for (let k = this.railCursor; k < rails.length && k < this.railCursor + 2; k++) {
        const r = rails[k];
        if (r === this.ignoreRail || this.x < r.x1 - 0.4 || this.x > r.x2 - 1.2) continue;
        const m = (r.y2 - r.y1) / (r.x2 - r.x1);
        const ry = r.y1 + (this.x - r.x1) * m, pry = r.y1 + (px - r.x1) * m;
        if (py >= pry - 0.2 && this.y <= ry + 0.12) {
          const ang = Math.atan(m);
          if (Math.abs(wrapPi(this.rot - ang)) < 1.15) {
            this._attachRail(r, ry, ang);
            return;
          }
        }
      }
    }

    if (g === null) {
      this.overGap = true;
      // below the rim there is no way back: the fall starts right away
      if (this.y < c.baseAt(this.x) - 1.4) this.crash('fall');
      return;
    }
    if (this.overGap) {
      if (this.y < g - 0.8) return this.crash('wall');
      if (this.y < g) this.y = g;
      this.overGap = false;
    }
    if (this.y <= g) this._land(g);
  }

  _countFlips() {
    return Math.floor((Math.abs(this.spin) + PHYS.LAND_TOL * 0.85) / TAU);
  }

  _land(g) {
    const c = this.course;
    const slope = c.slopeAt(this.x);
    const lim = this._limits();
    this.y = g;
    const proj = this.vx * Math.cos(slope) + this.vy * Math.sin(slope);
    if (this.airTime < 0.13 && Math.abs(this.spin) < 0.6) {
      // tiny hop over a terrain facet: stay glued, no event
      this.grounded = true;
      this.speed = Math.max(proj, this.speed * 0.98);
      return;
    }
    const diff = Math.abs(wrapPi(this.rot - slope));
    if (diff > PHYS.LAND_TOL) {
      if (this.fulgurT > 0) {
        this.rot = slope;
      } else {
        this.crash('bail');
        if (this.crashed) return;
      }
    }
    const flips = this._countFlips();
    const total = Math.hypot(this.vx, this.vy);
    this.speed = Math.max(proj, total * 0.74, lim.min * 0.9);
    this.grounded = true;
    this.angVel = 0;
    const ev = {
      type: 'land', flips, airTime: this.airTime, perfect: diff < 0.22 && flips > 0,
      impact: Math.max(0, -(this.vy * Math.cos(slope) - this.vx * Math.sin(slope))),
      height: this.maxAirY - g,
    };
    this.spin = 0;
    this.jumped = false;
    this.ignoreRail = null;
    // landing from a real jump crushes whatever is right under the board
    if (ev.airTime > 0.5) this.stompT = 0.3;
    if (flips > 0) this.boostT = Math.max(this.boostT, (1.3 + 0.55 * flips) * this.stats.boost);
    this.events.push(ev);
  }

  _attachRail(r, ry, ang) {
    const flips = this._countFlips();
    this.rail = r;
    this.y = ry;
    this.grounded = false;
    this.speed = Math.max(Math.hypot(this.vx, this.vy) * 0.95, this._limits().min);
    this.railDist = 0;
    this.spin = 0;
    this.angVel = 0;
    this.overGap = false;
    if (flips > 0) this.boostT = Math.max(this.boostT, (1.0 + 0.4 * flips) * this.stats.boost);
    this.events.push({ type: 'railOn', flips, airTime: this.airTime });
  }

  _railStep(dt, held) {
    const P = PHYS, r = this.rail;
    const ang = Math.atan2(r.y2 - r.y1, r.x2 - r.x1);
    const lim = this._limits();
    let s = this.speed;
    s += (-P.G * Math.sin(ang) * 0.9 + 3.2 - lim.drag * s * s) * dt;
    s = clamp(s, lim.min, lim.max);
    this.speed = s;
    this.vx = s * Math.cos(ang);
    this.vy = s * Math.sin(ang);
    const step = s * dt;
    this.x += this.vx * dt;
    this.y = r.y1 + ((this.x - r.x1) * (r.y2 - r.y1)) / (r.x2 - r.x1);
    this.rot = dampAngle(this.rot, ang, 20, dt);
    this.railDist += step;
    this.events.push({ type: 'grind', dist: step });
    const jump = this.jumpBuffer > 0;
    if (jump || this.x >= r.x2) {
      this.ignoreRail = r;
      this.events.push({ type: 'railOff', dist: this.railDist, jumped: jump });
      if (jump) {
        this._jump(0.96);
      } else {
        this.rail = null;
        this.vy += 1.6;
        this.airTime = 0;
        this.spin = 0;
        this.jumped = false;
        this.coyote = 0.1;
        this.maxAirY = this.y;
      }
    }
  }

  /** Returns true when the crash really happened (no shield saved the rider). */
  crash(type) {
    if (this.crashed) return true;
    if (this.invulnT > 0 && type !== 'fall' && type !== 'wall' && type !== 'storm') return false;
    if (this.shield && type !== 'storm') {
      this.shield = false;
      this.invulnT = 1.6;
      this.events.push({ type: 'shieldBreak', cause: type });
      if (type === 'fall' || type === 'wall') this.rescue();
      else if (type === 'bail') this.rot = this.course.slopeAt(this.x);
      return false;
    }
    this.crashed = true;
    this.crashType = type;
    this.crashT = 0;
    this.settled = false;
    this.rail = null;
    this.boostT = 0;
    this.fulgurT = 0;
    this.angVel = type === 'fall' ? 3 : -9 - Math.random() * 4;
    if (type === 'rock' || type === 'wall') {
      this.vx *= 0.35;
      this.vy = Math.abs(this.vy) * 0.2 + 5;
      this.grounded = false;
    } else if (type === 'bail') {
      this.vx *= 0.75;
      this.vy = 3.5;
      this.grounded = false;
    }
    this.events.push({ type: 'crash', cause: type });
    return true;
  }

  _crashStep(dt) {
    const c = this.course, P = PHYS;
    this.crashT += dt;
    this.vy -= P.G * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const g = c.heightAt(this.x);
    if (g === null || this.crashType === 'fall' || this.y > g) {
      // in the air (or dropping into a chasm): keep spinning
      this.rot += this.angVel * dt;
      if (g === null || this.crashType === 'fall') {
        this.vx *= Math.exp(-1.4 * dt);
        this.angVel = damp(this.angVel, 2.5, 2, dt);
      }
      return;
    }
    const slope = c.slopeAt(this.x), tx = Math.cos(slope), ty = Math.sin(slope);
    let vt = this.vx * tx + this.vy * ty; // along the slope
    const vn = -this.vx * ty + this.vy * tx; // into the ground when negative
    this.y = g;
    let bounce = 0;
    if (vn < -2.4) {
      bounce = -vn * 0.3;
      this.events.push({ type: 'tumble', power: Math.min(1, -vn / 11) });
    }
    // the snow grabs harder and harder: a short slide, then rest
    vt *= Math.exp(-(2.2 + this.crashT * 2.6) * dt);
    if (Math.abs(vt) < 0.6 && bounce === 0) vt = 0;
    this.vx = vt * tx - bounce * ty;
    this.vy = vt * ty + bounce * tx;
    if (Math.abs(vt) > 1.6) {
      // roll with the slide
      this.angVel = damp(this.angVel, -vt / 0.55, 9, dt);
      this.rot += this.angVel * dt;
      this.settled = false;
    } else {
      // lie down along the slope, head first
      let target = slope - Math.PI / 2;
      target += Math.round((this.rot - target) / TAU) * TAU;
      this.rot = dampAngle(this.rot, target, 7, dt);
      this.angVel = 0;
      if (!this.settled && bounce === 0) {
        this.settled = true;
        this.events.push({ type: 'settle' });
      }
    }
  }

  /** Put the rider back on solid ground (shield rescue, race respawn, revive). */
  rescue(mode = 'ahead') {
    const c = this.course;
    let x = mode === 'ahead' ? this.x : Math.min(this.x, this.lastSafeX);
    if (mode === 'ahead') {
      let guard = 0;
      while ((c.isGap(x) || c.isGap(x + 1.5)) && guard++ < 200) x += 0.5;
      x += 1.5;
    } else {
      let guard = 0;
      while ((c.isGap(x) || c.isGap(x - 2) || c.isGap(x + 6)) && guard++ < 400) x -= 0.5;
    }
    this.x = x;
    this.y = c.solidAt(x);
    this.grounded = true;
    this.rail = null;
    this.crashed = false;
    this.crashType = '';
    this.settled = false;
    this.overGap = false;
    this.rot = c.slopeAt(x);
    this.angVel = 0;
    this.spin = 0;
    this.airTime = 0;
    this.speed = Math.max(this._limits().min, mode === 'ahead' ? this.speed : 0);
    this.vx = this.speed;
    this.vy = 0;
    this.invulnT = Math.max(this.invulnT, 2);
    this.lastSafeX = x;
  }
}
