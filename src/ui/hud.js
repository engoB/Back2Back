// In-game heads-up display. DOM based; text nodes are only touched when the
// displayed value actually changes.
import { h, icon } from './dom.js';
import { t, fmtNum } from '../core/i18n.js';
import { ERAS } from '../world/eras.js';
import { hexCss } from '../core/math.js';

export class Hud {
  constructor(root, onPause) {
    this.root = root;
    this.last = {};
    const el = (this.el = h('div.hud.hidden'));
    this.dist = h('b', '0');
    this.score = h('span', '0');
    this.coins = h('b', '0');
    this.eraPill = h('div.hud-era');
    this.mult = h('div.hud-mult.hidden');
    this.speed = h('div.hud-speed', h('b', '0'), h('i', 'km/h'));
    this.pauseBtn = h('button.hud-pause.ui-block', { onclick: onPause, 'aria-label': 'Pause' }, icon('pause'));
    this.powers = h('div.hud-powers');
    this.pw = {};
    for (const k of ['magnet', 'double', 'shield']) {
      const ring = h('div.pw.hidden.' + k, icon(k === 'double' ? 'x2' : k));
      this.pw[k] = ring;
      this.powers.append(ring);
    }
    // gauge
    this.gaugeFill = h('i');
    this.gauge = h('div.hud-gauge', icon('bolt'), h('div.bar', this.gaugeFill), h('span', t('hud.fulgur')));
    // combo
    this.comboMult = h('b', '×1');
    this.comboPot = h('span', '0');
    this.comboBar = h('i');
    this.combo = h('div.hud-combo.hidden', h('em', t('hud.combo')), this.comboMult, this.comboPot, h('div.bar', this.comboBar));
    this.tricks = h('div.hud-tricks');
    this.toasts = h('div.hud-toasts');
    this.hintEl = h('div.hud-hint.hidden');
    this.card = h('div.hud-card.hidden');
    this.year = h('div.hud-year.hidden');
    this.count = h('div.hud-count.hidden');
    this.crashEl = h('div.hud-crash.hidden');
    // race
    this.rankEl = h('b', '1');
    this.rankTot = h('span', '/1');
    this.timer = h('span.hud-timer', '0:00.0');
    this.track = h('div.hud-track', h('i.me'));
    this.race = h('div.hud-race.hidden', h('div.rk', this.rankEl, this.rankTot), this.timer);
    this.goal = h('div.hud-goal.hidden', icon('flag'), this.track);
    this.storm = h('div.hud-storm.hidden', icon('bolt'), h('span'));
    this.tags = h('div.hud-tags');

    el.append(
      h('div.hud-top',
        h('div.hud-left', h('div.hud-dist', this.dist, h('i', 'm')), h('div.hud-score', icon('star'), this.score)),
        h('div.hud-mid', this.eraPill, this.mult, this.race),
        h('div.hud-right', h('div.hud-coins', icon('coin'), this.coins), this.pauseBtn)),
      this.goal, this.powers, this.combo, this.tricks, this.toasts, this.hintEl, this.storm,
      h('div.hud-bottom', this.gauge, this.speed), this.card, this.year, this.count, this.crashEl, this.tags);
    root.append(el);
    this.flashEl = h('div.flash');
    root.append(this.flashEl);
    this.mode = 'endless';
    this.tagEls = new Map();
    this.yearAnim = null;
  }

  show(on) {
    this.el.classList.toggle('hidden', !on);
    if (!on) this.hint(null);
  }

  setMode(mode, info = {}) {
    this.mode = mode;
    this.last = {};
    this.race.classList.toggle('hidden', mode !== 'race');
    this.goal.classList.toggle('hidden', !(mode === 'race' || mode === 'story'));
    this.gauge.querySelector('span').textContent = t('hud.fulgur');
    this.combo.querySelector('em').textContent = t('hud.combo');
    this.tricks.textContent = '';
    this.toasts.textContent = '';
    this.combo.classList.add('hidden');
    this.card.classList.add('hidden');
    this.year.classList.add('hidden');
    this.count.classList.add('hidden');
    this.crashEl.classList.add('hidden');
    this.storm.classList.add('hidden');
    for (const e of this.tagEls.values()) e.remove();
    this.tagEls.clear();
    this.track.querySelectorAll('i.rv').forEach((e) => e.remove());
    this.trackDots = [];
    for (const k of Object.keys(this.pw)) this.pw[k].classList.add('hidden');
  }

  _set(key, value, fn) {
    if (this.last[key] === value) return;
    this.last[key] = value;
    fn(value);
  }

  update(s) {
    this._set('dist', Math.floor(s.dist), (v) => (this.dist.textContent = fmtNum(v)));
    this._set('score', Math.floor(s.score / 10) * 10, (v) => (this.score.textContent = fmtNum(v)));
    this._set('coins', s.coins, (v) => {
      this.coins.textContent = fmtNum(v);
      this.coins.parentNode.classList.remove('pop');
      void this.coins.offsetWidth;
      this.coins.parentNode.classList.add('pop');
    });
    this._set('kmh', Math.round(s.kmh / 2) * 2, (v) => (this.speed.firstChild.textContent = v));
    this._set('era', s.era, (v) => {
      this.eraPill.textContent = t('era.' + v + '.y');
      this.eraPill.style.setProperty('--c', hexCss(ERAS[v].accent));
    });
    this._set('tm', s.timeMult, (v) => {
      this.mult.classList.toggle('hidden', v <= 1);
      this.mult.textContent = '×' + v.toFixed(1).replace('.0', '');
    });
    this._set('g', Math.round(s.gauge * 100), (v) => (this.gaugeFill.style.transform = `scaleX(${v / 100})`));
    this._set('f', s.fulgur, (v) => this.gauge.classList.toggle('on', v));
    this._set('full', s.gauge >= 0.999 && !s.fulgur, (v) => this.gauge.classList.toggle('full', v));
    // powers
    this._pw('magnet', s.magnet);
    this._pw('double', s.double);
    this._set('sh', s.shield, (v) => this.pw.shield.classList.toggle('hidden', !v));
    // combo
    this._set('ch', s.chain, (v) => {
      this.combo.classList.toggle('hidden', v < 1);
      this.comboMult.textContent = '×' + s.mult.toFixed(1).replace('.0', '');
      this.combo.classList.remove('bump');
      void this.combo.offsetWidth;
      this.combo.classList.add('bump');
    });
    if (s.chain > 0) {
      this._set('pot', Math.round(s.pot / 5) * 5, (v) => (this.comboPot.textContent = '+' + fmtNum(v)));
      this._set('ct', Math.round(s.comboT * 50), (v) => (this.comboBar.style.transform = `scaleX(${v / 50})`));
    }
    if (this.mode === 'race') {
      this._set('rank', s.rank, (v) => (this.rankEl.textContent = v));
      this._set('tot', s.total, (v) => (this.rankTot.textContent = '/' + v));
      this._set('time', Math.floor(s.time * 10), (v) => (this.timer.textContent = fmtTime(v / 10)));
      const rivals = s.rivals || [];
      for (let i = 0; i < rivals.length; i++) {
        const r = rivals[i];
        let tag = this.tagEls.get(r.id);
        if (!tag) {
          tag = h('div.tag', r.name);
          this.tags.append(tag);
          this.tagEls.set(r.id, tag);
          const dot = h('i.rv');
          this.track.append(dot);
          tag._dot = dot;
        }
        tag.style.display = r.vis ? '' : 'none';
        if (r.vis) tag.style.transform = `translate(${r.px | 0}px, ${r.py | 0}px) translate(-50%, -100%)`;
        tag._dot.style.left = (r.progress || 0) * 100 + '%';
      }
      if (this.tagEls.size > rivals.length) {
        for (const [id, tag] of this.tagEls) {
          if (!rivals.find((r) => r.id === id)) {
            tag._dot.remove();
            tag.remove();
            this.tagEls.delete(id);
          }
        }
      }
    }
    if (this.mode !== 'endless') this._set('pr', Math.round(s.progress * 500), (v) => (this.track.firstChild.style.left = v / 5 + '%'));
    this._set('storm', s.storm < 0 ? -1 : Math.round(s.storm), (v) => {
      this.storm.classList.toggle('hidden', v < 0);
      if (v >= 0) {
        this.storm.lastChild.textContent = `${t('hud.storm')} ${v} m`;
        this.storm.classList.toggle('near', v < 35);
      }
    });
    if (this.yearAnim) this._yearTick();
  }

  _pw(k, frac) {
    const on = frac > 0;
    this._set('pw' + k, on ? Math.ceil(frac * 40) : 0, (v) => {
      this.pw[k].classList.toggle('hidden', !on);
      this.pw[k].style.setProperty('--p', v / 40);
    });
  }

  trick(key, points, n = 1, chain = 1) {
    const el = h('div.trick', h('b', t(key, { n })), h('i', '+' + fmtNum(points)));
    if (key === 'trick.flip2' || key === 'trick.flip3' || key === 'trick.perfect') el.classList.add('big');
    this.tricks.prepend(el);
    while (this.tricks.children.length > 4) this.tricks.lastChild.remove();
    setTimeout(() => el.remove(), 1500);
  }

  bank(total, mult, chain) {
    const el = h('div.trick.bank', h('b', t('hud.banked', { m: mult.toFixed(1).replace('.0', '') })), h('i', '+' + fmtNum(total)));
    this.tricks.prepend(el);
    setTimeout(() => el.remove(), 1900);
  }

  toast(key, params, kind = 'info') {
    let text = t(key, params);
    if (key === 'toast.mission' && params) text = t('toast.mission') + ' — ' + t('mis.' + params.id, { n: fmtNum(params.target) });
    const ic = kind === 'mission' ? 'check' : kind === 'fulgur' ? 'bolt' : kind === 'power' ? 'star' : 'info';
    const el = h('div.toast.' + kind, icon(ic), h('span', text));
    this.toasts.append(el);
    while (this.toasts.children.length > 3) this.toasts.firstChild.remove();
    setTimeout(() => el.classList.add('out'), kind === 'mission' ? 2600 : 1700);
    setTimeout(() => el.remove(), kind === 'mission' ? 3000 : 2100);
  }

  hint(key) {
    clearTimeout(this._hintT);
    if (!key) {
      this.hintEl.classList.add('hidden');
      return;
    }
    this.hintEl.textContent = '';
    this.hintEl.append(h('div.tap', h('i'), h('i')), h('span', t(key)));
    this.hintEl.classList.remove('hidden');
    this._hintT = setTimeout(() => this.hintEl.classList.add('hidden'), 5200);
  }

  crash(cause) {
    this.crashEl.textContent = t('hud.crash.' + cause);
    this.crashEl.classList.remove('hidden');
    clearTimeout(this._crashT);
    this._crashT = setTimeout(() => this.crashEl.classList.add('hidden'), 1500);
  }

  eraCard(eraId, mult) {
    const c = this.card;
    c.textContent = '';
    c.style.setProperty('--c', hexCss(ERAS[eraId].accent));
    c.append(h('small', t('hud.jump')), h('b', t('era.' + eraId + '.y')), h('span', t('era.' + eraId)),
      mult > 1 ? h('em', t('hud.mult', { m: mult.toFixed(1).replace('.0', '') })) : null);
    c.classList.remove('hidden');
    c.classList.remove('play');
    void c.offsetWidth;
    c.classList.add('play');
    clearTimeout(this._cardT);
    this._cardT = setTimeout(() => c.classList.add('hidden'), 3000);
    this.year.classList.add('hidden');
    this.yearAnim = null;
  }

  /** Spinning year counter shown inside the time tunnel. */
  yearRoll(fromEra, toEra, dur) {
    const yr = (e) => (ERAS[e].year === null ? new Date().getFullYear() : ERAS[e].year);
    this.yearAnim = { a: yr(fromEra), b: yr(toEra), t0: performance.now(), dur: dur * 1000, to: toEra };
    this.year.classList.remove('hidden');
    this.year.style.setProperty('--c', hexCss(ERAS[toEra].accent));
  }
  _yearTick() {
    const A = this.yearAnim;
    const k = Math.min(1, (performance.now() - A.t0) / A.dur);
    let txt;
    if (k >= 1) txt = t('era.' + A.to + '.y');
    else if (!Number.isFinite(A.a) || !Number.isFinite(A.b)) {
      txt = '';
      for (let i = 0; i < 6; i++) txt += Math.floor(Math.random() * 10);
    } else {
      const e = 1 - Math.pow(1 - k, 3);
      const v = Math.round(A.a + (A.b - A.a) * e);
      txt = (v < 0 ? '−' : '') + fmtNum(Math.abs(v)).replace(/\s/g, v > -10000 && v < 10000 ? '' : ' ');
    }
    if (txt !== this.year.textContent) this.year.textContent = txt;
  }

  countdown(n) {
    const c = this.count;
    c.textContent = n > 0 ? String(n) : t('hud.go');
    c.classList.remove('hidden');
    c.classList.remove('play');
    void c.offsetWidth;
    c.classList.add('play');
    clearTimeout(this._countT);
    this._countT = setTimeout(() => c.classList.add('hidden'), 900);
  }

  flash(color, alpha, dur) {
    const f = this.flashEl;
    f.style.transition = 'none';
    f.style.background = color;
    f.style.opacity = alpha;
    void f.offsetWidth;
    f.style.transition = `opacity ${dur}s ease-out`;
    f.style.opacity = 0;
  }
}

export function fmtTime(s) {
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1);
}
