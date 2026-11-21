// Audio engine: mixer, reverb/delay sends, synthesised sound effects, ambience
// loops and the music player. Created lazily on the first user gesture.
import { Synth, mtof } from './synth.js';
import { MusicPlayer } from './music.js';
import { clamp } from '../core/math.js';

const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const MUSIC_GAIN = 0.46;

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.musicVol = 0.7;
    this.sfxVol = 0.9;
    this.music = new MusicPlayer(this);
    this.loops = {};
    this.muffled = false;
    this._coinChain = 0;
    this._coinT = 0;
    this._timer = 0;
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /**
   * Must be called from a user gesture (autoplay policies). Safe to call on every
   * gesture: it only acts while the sound is not running yet.
   */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC({ latencyHint: 'interactive' });
      } catch (e) {
        try { this.ctx = new AC(); } catch (e2) { return; }
      }
      this._build(this.ctx);
      this._timer = setInterval(() => this.music.tick(), 45);
    }
    const ctx = this.ctx;
    // iPhone: Web Audio is silenced by the ring/silent switch unless the page
    // asks for the "playback" category (iOS 17+) or a media element is playing
    try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (e) { /* not supported */ }
    this._keepAlive();
    if (ctx.state !== 'running') {
      ctx.resume().catch(() => {});
      // a one-sample buffer started inside the gesture really opens the output on WebKit
      try {
        const src = ctx.createBufferSource();
        src.buffer = ctx.createBuffer(1, 1, 22050);
        src.connect(ctx.destination);
        src.start(0);
      } catch (e) { /* ignore */ }
    }
  }

  /** Silent looping media element (older iPhones: keeps Web Audio audible on silent mode). */
  _keepAlive() {
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!ios || typeof Audio === 'undefined') return;
    if (!this._tag) {
      // 0.25 s of 8-bit silence at 8 kHz, built in memory
      const n = 2000, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
      const w = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
      w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
      v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
      w(36, 'data'); v.setUint32(40, n, true);
      for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
      const a = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
      a.loop = true;
      a.setAttribute('playsinline', '');
      a.setAttribute('x-webkit-airplay', 'deny');
      this._tag = a;
    }
    if (this._tag.paused && !document.hidden) this._tag.play().catch(() => {});
  }

  _build(ctx) {
    const S = (this.synth = new Synth(ctx));
    S.light = !!this.light;
    // ---- master: gentle tone shaping, tape-like saturation, glue compression
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const low = ctx.createBiquadFilter();
    low.type = 'lowshelf';
    low.frequency.value = 90;
    low.gain.value = 1.5;
    const air = ctx.createBiquadFilter();
    air.type = 'highshelf';
    air.frequency.value = 8500;
    air.gain.value = 2;
    const sat = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      curve[i] = Math.tanh(x * 1.35) / Math.tanh(1.35);
    }
    sat.curve = curve;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -11;
    comp.knee.value = 12;
    comp.ratio.value = 3;
    comp.attack.value = 0.008;
    comp.release.value = 0.25;
    this.master.connect(low).connect(air).connect(sat).connect(comp).connect(ctx.destination);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicVol * MUSIC_GAIN;
    this.musicFilter = ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 18000;
    this.musicBus.connect(this.musicFilter).connect(this.master);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxVol;
    this.sfxBus.connect(this.master);

    // ---- hall: pre-delay, convolution, a return kept out of the low end
    this.reverbIn = ctx.createGain();
    const pre = ctx.createDelay(0.1);
    pre.delayTime.value = 0.022;
    const conv = ctx.createConvolver();
    conv.buffer = S.impulse(2.8, 3.0);
    const revHp = ctx.createBiquadFilter();
    revHp.type = 'highpass';
    revHp.frequency.value = 230;
    const revLp = ctx.createBiquadFilter();
    revLp.type = 'lowpass';
    revLp.frequency.value = 7200;
    const revOut = ctx.createGain();
    revOut.gain.value = 0.5;
    this.reverbIn.connect(pre).connect(conv).connect(revHp).connect(revLp).connect(revOut).connect(this.musicFilter);

    // ---- echo: ping-pong between the two sides, darker at each bounce
    this.delayIn = ctx.createGain();
    const dl = ctx.createDelay(1.5), dr = ctx.createDelay(1.5);
    dl.delayTime.value = dr.delayTime.value = 0.4;
    const fb = ctx.createGain();
    fb.gain.value = 0.34;
    const dlp = ctx.createBiquadFilter();
    dlp.type = 'lowpass';
    dlp.frequency.value = 3000;
    const pl = S.panner(-0.8), pr = S.panner(0.8);
    this.delayIn.connect(dl);
    dl.connect(pl).connect(this.musicFilter);
    dl.connect(dr);
    dr.connect(pr).connect(this.musicFilter);
    dr.connect(dlp).connect(fb).connect(dl);
    this.delays = [dl, dr];
    this.delay = dl; // kept for callers that read it

    // sfx reverb send
    this.sfxRev = ctx.createGain();
    this.sfxRev.gain.value = 0.5;
    this.sfxRev.connect(conv);

    this._makeLoops(ctx, S);
  }

  /** Lighter instruments (fewer voices per note) for modest devices. */
  setLight(on) {
    this.light = !!on;
    if (this.synth) this.synth.light = this.light;
  }

  /** Echo time in seconds (each side of the ping-pong). */
  setDelay(seconds, at) {
    if (!this.delays) return;
    for (const d of this.delays) d.delayTime.setTargetAtTime(Math.min(1.4, seconds), at ?? this.ctx.currentTime, 0.05);
  }

  _makeLoops(ctx, S) {
    const mk = (type, freq, q) => {
      const src = ctx.createBufferSource();
      src.buffer = S.noise;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(f).connect(g).connect(this.sfxBus);
      src.start();
      return { src, f, g };
    };
    this.loops.wind = mk('bandpass', 500, 0.6);
    this.loops.grind = mk('bandpass', 3400, 4);
    this.loops.storm = mk('lowpass', 260, 0.4);
    // portal / engine hum
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), hg = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'sawtooth';
    o2.type = 'sawtooth';
    o.frequency.value = 55;
    o2.frequency.value = 55.7;
    lp.type = 'lowpass';
    lp.frequency.value = 500;
    hg.gain.value = 0;
    o.connect(lp);
    o2.connect(lp);
    lp.connect(hg).connect(this.sfxBus);
    o.start();
    o2.start();
    this.loops.hum = { g: hg, f: lp, o, o2 };
  }

  /** Smoothly set an ambience loop level (0..1) and optional filter frequency. */
  loop(name, level, freq) {
    const L = this.loops[name];
    if (!L || !this.ctx) return;
    const t = this.ctx.currentTime;
    L.g.gain.setTargetAtTime(level, t, 0.08);
    if (freq && L.f) L.f.frequency.setTargetAtTime(freq, t, 0.1);
  }
  stopLoops() {
    for (const n of Object.keys(this.loops)) this.loop(n, 0);
  }

  setVolumes(music, sfx) {
    this.musicVol = music;
    this.sfxVol = sfx;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(music * MUSIC_GAIN, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(sfx, t, 0.05);
  }

  /** Low-pass the music (pause menu, slow motion, crash). */
  muffle(on, time = 0.25) {
    this.muffled = on;
    if (!this.ctx) return;
    this.musicFilter.frequency.setTargetAtTime(on ? 520 : 18000, this.ctx.currentTime, time);
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
    if (this._tag && !this._tag.paused) this._tag.pause();
  }
  resume() {
    // 'interrupted' (iOS, after a call or an app switch) counts as stopped too
    if (this.ctx && this.ctx.state !== 'running' && this.ctx.state !== 'closed') this.ctx.resume().catch(() => {});
    if (this._tag) this._keepAlive();
  }

  // ------------------------------------------------------------------ sfx
  /** Play a named effect. o: per-effect options. */
  sfx(name, o = {}) {
    if (!this.ready) return;
    const fn = SFX[name];
    if (!fn) return;
    try {
      fn(this, this.synth, this.sfxBus, this.ctx.currentTime + 0.005, o);
    } catch (e) {
      /* a failed effect must never break the game */
    }
  }

  /** Coins play a rising pentatonic run while they are chained quickly. */
  coin() {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    if (now - this._coinT > 0.6) this._coinChain = 0;
    this._coinT = now;
    const n = PENTA[Math.min(this._coinChain++, PENTA.length - 1)];
    const S = this.synth, t = now + 0.005, f = mtof(79 + n);
    const g = S.gain(0);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    const o = S.osc('sine', f, t, t + 0.25), o2 = S.osc('triangle', f * 2, t, t + 0.25), g2 = S.gain(0.3);
    o.connect(g);
    o2.connect(g2).connect(g);
    g.connect(this.sfxBus);
  }
}

// helpers for effect recipes -------------------------------------------------
function sweep(S, out, t, type, f0, f1, dur, vol, curve = 'exp') {
  const o = S.osc(type, f0, t, t + dur + 0.05), g = S.gain(0);
  if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  else o.frequency.linearRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.2));
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(out);
  return o;
}
function whoosh(S, out, t, f0, f1, dur, vol, q = 1.2) {
  const n = S.noiseSrc(t, dur + 0.05), bp = S.filter('bandpass', f0, q), g = S.gain(0);
  bp.frequency.setValueAtTime(f0, t);
  bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol * 2.6, t + dur * 0.35);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  n.connect(bp).connect(g).connect(out);
}
function blip(S, out, t, midi, dur = 0.12, vol = 0.2, type = 'sine') {
  const o = S.osc(type, mtof(midi), t, t + dur + 0.05), g = S.gain(0);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(out);
}
function chord(S, out, t, midis, dur, vol, kind = 'bell') {
  for (const m of midis) S.lead(out, t, mtof(m), dur, vol, kind);
}

const SFX = {
  jump(A, S, out, t) {
    whoosh(S, out, t, 500, 2600, 0.2, 0.2);
    sweep(S, out, t, 'sine', 240, 520, 0.14, 0.2);
  },
  land(A, S, out, t, o) {
    const p = clamp(o.power ?? 0.5, 0.1, 1);
    S.tom(out, t, 0.35 + p * 0.5, 62);
    whoosh(S, out, t, 1800, 300, 0.22, 0.12 + p * 0.16, 0.6);
  },
  flip(A, S, out, t) {
    whoosh(S, out, t, 400, 1500, 0.3, 0.13, 2);
  },
  trick(A, S, out, t, o) {
    const n = Math.min(o.n ?? 1, 4);
    const base = 72 + n * 2;
    blip(S, out, t, base, 0.16, 0.16, 'triangle');
    blip(S, out, t + 0.07, base + 4, 0.16, 0.16, 'triangle');
    blip(S, out, t + 0.14, base + 7, 0.26, 0.18, 'triangle');
    if (n > 1) blip(S, A.sfxRev, t + 0.21, base + 12, 0.4, 0.2, 'triangle');
  },
  bank(A, S, out, t, o) {
    const n = clamp(o.mult ?? 1, 1, 6);
    chord(S, out, t, [72, 76, 79, 84].map((m) => m + Math.floor(n)), 0.5, 0.16);
    chord(S, A.sfxRev, t, [84 + Math.floor(n)], 0.6, 0.2);
  },
  railOn(A, S, out, t) {
    S.wood(out, t, 0.7, 1900, 0.09);
    whoosh(S, out, t, 5000, 2500, 0.12, 0.2, 3);
  },
  crash(A, S, out, t) {
    S.tom(out, t, 1, 55);
    whoosh(S, out, t, 2400, 150, 0.5, 0.42, 0.5);
    sweep(S, out, t + 0.03, 'sawtooth', 330, 60, 0.45, 0.16);
    S.snare(out, t + 0.01, 0.7);
  },
  fall(A, S, out, t) {
    sweep(S, out, t, 'sine', 700, 90, 1.0, 0.2);
    whoosh(S, out, t, 1200, 200, 0.9, 0.2, 0.7);
  },
  smash(A, S, out, t) {
    S.snare(out, t, 0.8);
    S.tom(out, t, 0.7, 90);
    whoosh(S, out, t, 3000, 600, 0.25, 0.3, 0.7);
  },
  boost(A, S, out, t) {
    whoosh(S, out, t, 300, 4200, 0.45, 0.24, 1.5);
    sweep(S, out, t, 'sawtooth', 110, 440, 0.4, 0.07);
  },
  fulgur(A, S, out, t) {
    SFX.thunder(A, S, out, t, { near: 1 });
    sweep(S, out, t, 'sawtooth', 80, 880, 0.6, 0.12);
    chord(S, out, t + 0.1, [62, 69, 74, 78, 81], 1.2, 0.2);
    chord(S, A.sfxRev, t + 0.1, [86, 90], 1.4, 0.2);
  },
  fulgurEnd(A, S, out, t) {
    sweep(S, out, t, 'sawtooth', 660, 110, 0.5, 0.1);
    whoosh(S, out, t, 3000, 300, 0.5, 0.14, 1);
  },
  powerup(A, S, out, t) {
    for (let i = 0; i < 4; i++) blip(S, out, t + i * 0.055, 72 + [0, 4, 7, 12][i], 0.18, 0.17, 'triangle');
    chord(S, A.sfxRev, t + 0.2, [84, 88], 0.6, 0.14);
  },
  shieldBreak(A, S, out, t) {
    for (let i = 0; i < 5; i++) blip(S, out, t + i * 0.035, 96 - i * 5, 0.12, 0.14, 'triangle');
    whoosh(S, out, t, 6000, 1500, 0.35, 0.22, 2);
  },
  portal(A, S, out, t) {
    whoosh(S, out, t, 200, 5000, 0.9, 0.3, 0.8);
    sweep(S, out, t, 'sawtooth', 55, 1760, 1.1, 0.12);
    chord(S, out, t + 0.2, [57, 64, 69, 73, 76, 81], 2.2, 0.16);
    S.boom(A.sfxRev, t + 0.05, 0.9);
    S.boom(out, t + 0.05, 0.7);
  },
  arrive(A, S, out, t) {
    whoosh(S, out, t, 5000, 250, 0.7, 0.3, 0.8);
    S.boom(out, t, 0.8);
    chord(S, A.sfxRev, t + 0.05, [69, 76, 81, 85], 1.6, 0.18);
  },
  thunder(A, S, out, t, o) {
    const near = o.near ?? 0.6;
    const n = S.noiseSrc(t, 2.6, 0.6), lp = S.filter('lowpass', 900 * near + 160, 0.5), g = S.gain(0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.5 * near + 0.14, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.12 * near + 0.03, t + 0.4);
    g.gain.linearRampToValueAtTime(0.16 * near + 0.05, t + 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
    lp.frequency.exponentialRampToValueAtTime(120, t + 2.2);
    n.connect(lp).connect(g);
    g.connect(out);
    g.connect(A.sfxRev);
    if (near > 0.7) whoosh(S, out, t, 7000, 1200, 0.16, 0.34, 0.5);
  },
  cog(A, S, out, t) {
    const notes = [62, 66, 69, 74, 78, 81, 86];
    notes.forEach((m, i) => S.lead(i % 2 ? A.sfxRev : out, t + i * 0.09, mtof(m), 0.9, 0.24, 'bell'));
    S.boom(out, t, 0.5);
    chord(S, out, t + 0.7, [62, 69, 74, 78], 2, 0.2, 'brass');
  },
  gameover(A, S, out, t) {
    [69, 65, 62, 57].forEach((m, i) => S.lead(out, t + i * 0.22, mtof(m), 0.5, 0.22, 'epiano'));
    chord(S, A.sfxRev, t + 0.9, [45, 52, 57], 1.6, 0.16, 'strings');
  },
  record(A, S, out, t) {
    [72, 76, 79, 84, 88].forEach((m, i) => S.lead(out, t + i * 0.1, mtof(m), 0.5, 0.2, 'bell'));
    chord(S, out, t + 0.5, [72, 76, 79, 84], 1.2, 0.16, 'brass');
  },
  mission(A, S, out, t) {
    [74, 78, 81].forEach((m, i) => blip(S, out, t + i * 0.09, m, 0.22, 0.18, 'triangle'));
    chord(S, A.sfxRev, t + 0.27, [86], 0.7, 0.2);
  },
  levelup(A, S, out, t) {
    [62, 66, 69, 74, 78, 81].forEach((m, i) => S.lead(out, t + i * 0.07, mtof(m), 0.6, 0.2, 'bell'));
    chord(S, out, t + 0.45, [62, 69, 74, 78], 1.4, 0.18, 'brass');
  },
  buy(A, S, out, t) {
    [79, 84, 88, 91].forEach((m, i) => blip(S, out, t + i * 0.06, m, 0.2, 0.16, 'triangle'));
    S.wood(out, t, 0.5, 3000, 0.04);
  },
  error(A, S, out, t) {
    sweep(S, out, t, 'square', 160, 110, 0.18, 0.1);
    sweep(S, out, t + 0.12, 'square', 130, 90, 0.2, 0.1);
  },
  click(A, S, out, t) {
    S.wood(out, t, 1, 1700, 0.04);
    blip(S, out, t, 84, 0.07, 0.14);
  },
  back(A, S, out, t) {
    S.wood(out, t, 0.9, 1200, 0.045);
    blip(S, out, t, 76, 0.08, 0.12);
  },
  tab(A, S, out, t) {
    S.wood(out, t, 0.8, 2400, 0.03);
  },
  start(A, S, out, t) {
    whoosh(S, out, t, 400, 3000, 0.35, 0.16);
    [62, 69, 74].forEach((m, i) => blip(S, out, t + i * 0.07, m + 12, 0.22, 0.16, 'triangle'));
  },
  count(A, S, out, t) {
    blip(S, out, t, 69, 0.2, 0.3, 'triangle');
    blip(S, out, t, 81, 0.2, 0.12, 'square');
  },
  go(A, S, out, t) {
    blip(S, out, t, 81, 0.5, 0.3, 'triangle');
    blip(S, out, t, 93, 0.5, 0.12, 'square');
    chord(S, A.sfxRev, t, [81, 85, 88], 0.6, 0.14);
  },
  finish(A, S, out, t) {
    SFX.record(A, S, out, t);
    S.boom(out, t, 0.5);
  },
  revive(A, S, out, t) {
    whoosh(S, out, t, 300, 4000, 0.5, 0.2);
    [69, 73, 76, 81].forEach((m, i) => blip(S, out, t + i * 0.06, m, 0.25, 0.16, 'triangle'));
  },
  hint(A, S, out, t) {
    blip(S, out, t, 88, 0.14, 0.12);
    blip(S, out, t + 0.1, 93, 0.2, 0.12);
  },
  type(A, S, out, t) {
    S.wood(out, t, 0.5, 2600 + Math.random() * 500, 0.02);
  },
  tick(A, S, out, t, o) {
    S.wood(out, t, 0.5, o.alt ? 1850 : 2300, 0.03);
  },
  bell(A, S, out, t, o) {
    S.lead(out, t, mtof(o.midi ?? 50), 3, 0.5, 'bell');
    S.lead(A.sfxRev, t, mtof((o.midi ?? 50) + 12), 3, 0.3, 'bell');
  },
  zap(A, S, out, t) {
    whoosh(S, out, t, 6000, 2000, 0.12, 0.2, 4);
    sweep(S, out, t, 'sawtooth', 1400, 200, 0.12, 0.07);
  },
  whooshBig(A, S, out, t) {
    whoosh(S, out, t, 200, 3000, 1.0, 0.3, 0.8);
  },
  boom(A, S, out, t) {
    S.boom(out, t, 0.9);
    S.boom(A.sfxRev, t, 0.6);
  },
  shatter(A, S, out, t) {
    for (let i = 0; i < 9; i++) blip(S, i % 2 ? A.sfxRev : out, t + i * 0.03 + Math.random() * 0.02, 84 + Math.floor(Math.random() * 20), 0.25, 0.12, 'triangle');
    whoosh(S, out, t, 8000, 1000, 0.5, 0.3, 0.6);
    S.boom(out, t, 0.8);
  },
};
