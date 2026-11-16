// Synthesised instruments (Web Audio). Every sound of the game is generated:
// no sample files. Each function schedules one note at time `t` into `out`.
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
/**
 * Filter sweeps and vibratos are computed once per audio block instead of once
 * per sample: inaudible, and several times cheaper for the processor.
 */
const krate = (param) => {
  try { param.automationRate = 'k-rate'; } catch (e) { /* older engines keep audio rate */ }
};
const lerp = (a, b, t) => a + (b - a) * t;

// Harmonic recipes of the piano, by register (bass strings are far richer than the top ones)
const PIANO_PARTIALS = [
  [1, 0.62, 0.5, 0.34, 0.3, 0.2, 0.18, 0.12, 0.1, 0.09, 0.07, 0.06, 0.05, 0.04, 0.035, 0.03, 0.025, 0.02],
  [1, 0.5, 0.33, 0.2, 0.13, 0.1, 0.06, 0.05, 0.035, 0.025, 0.018, 0.012],
  [1, 0.36, 0.16, 0.08, 0.04, 0.02, 0.01],
];
// Vowel formants of the choir: [frequency, Q, level]
const VOWELS = {
  ah: [[760, 5, 1], [1180, 6, 0.6], [2850, 9, 0.25]],
  oo: [[340, 5, 1], [760, 6, 0.4], [2500, 8, 0.12]],
};

export class Synth {
  constructor(ctx) {
    this.ctx = ctx;
    this.noise = this._noiseBuffer(2);
    this.ks = new Map();
    this.waves = new Map();
    this.light = false; // fewer voices per note on modest devices
  }

  _noiseBuffer(sec) {
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  /** Generated hall impulse: decorrelated stereo tail that darkens as it decays, a few early reflections. */
  impulse(sec = 3.2, decay = 3.2) {
    const ctx = this.ctx, sr = ctx.sampleRate, n = Math.floor(sr * sec);
    const b = ctx.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let lp = 0, lp2 = 0;
      const onset = Math.floor(sr * 0.012);
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const w = Math.random() * 2 - 1;
        const k = 0.75 - 0.68 * Math.pow(t, 0.6); // high frequencies die first
        lp += (w - lp) * k;
        lp2 += (lp - lp2) * (0.9 - 0.4 * t);
        d[i] = lp2 * Math.pow(1 - t, decay) * (i < onset ? i / onset : 1) * 1.6;
      }
      // early reflections, different on each side
      for (let k = 0; k < 7; k++) {
        const at = Math.floor(sr * (0.011 + k * 0.0093 + (ch ? 0.0037 : 0) + Math.random() * 0.004));
        const amp = 0.5 * Math.pow(0.72, k) * (Math.random() < 0.5 ? -1 : 1);
        for (let j = 0; j < 24 && at + j < n; j++) d[at + j] += amp * (1 - j / 24);
      }
    }
    return b;
  }

  // ---- helpers ---------------------------------------------------------
  gain(v = 1) {
    const g = this.ctx.createGain();
    g.gain.value = v;
    return g;
  }
  osc(type, freq, t, stop, detune = 0) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    krate(o.detune);
    o.start(t);
    o.stop(stop);
    return o;
  }
  /** Stereo placement (-1 left, 1 right). */
  panner(v) {
    const ctx = this.ctx;
    if (!ctx.createStereoPanner) return this.gain(1);
    const p = ctx.createStereoPanner();
    p.pan.value = v;
    return p;
  }
  /** Cached periodic wave from a list of harmonic amplitudes. */
  wave(key, amps) {
    let w = this.waves.get(key);
    if (!w) {
      const re = new Float32Array(amps.length + 1), im = new Float32Array(amps.length + 1);
      for (let i = 0; i < amps.length; i++) im[i + 1] = amps[i];
      w = this.ctx.createPeriodicWave(re, im);
      this.waves.set(key, w);
    }
    return w;
  }
  filter(type, freq, q = 0.7) {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    krate(f.frequency);
    return f;
  }
  noiseSrc(t, dur, rate = 1) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.playbackRate.value = rate;
    s.loop = true;
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur);
    return s;
  }
  /** ADSR on an AudioParam (gain). */
  adsr(p, t, a, d, s, r, dur, peak) {
    const hold = Math.max(a + d, dur);
    p.setValueAtTime(0.0001, t);
    p.linearRampToValueAtTime(peak, t + a);
    p.exponentialRampToValueAtTime(Math.max(0.0001, peak * s), t + a + d);
    p.setValueAtTime(Math.max(0.0001, peak * s), t + hold);
    p.exponentialRampToValueAtTime(0.0001, t + hold + r);
    return t + hold + r + 0.02;
  }
  vibrato(target, t, stop, rate, depth, delay = 0.12) {
    const l = this.osc('sine', rate, t, stop);
    const g = this.gain(0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(depth, t + delay + 0.15);
    l.connect(g).connect(target);
  }

  // ---- drums -------------------------------------------------------------
  kick(out, t, v = 1, deep = false) {
    const stop = t + 0.5;
    const o = this.osc('sine', 150, t, stop);
    o.frequency.setValueAtTime(deep ? 120 : 165, t);
    o.frequency.exponentialRampToValueAtTime(deep ? 38 : 46, t + 0.11);
    const g = this.gain(0);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (deep ? 0.45 : 0.3));
    o.connect(g).connect(out);
    const n = this.noiseSrc(t, 0.03), ng = this.gain(0), hp = this.filter('highpass', 1800);
    ng.gain.setValueAtTime(v * 0.3, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
    n.connect(hp).connect(ng).connect(out);
  }
  snare(out, t, v = 1, style = 'std') {
    const len = style === 'gated' ? 0.24 : style === 'brush' ? 0.13 : 0.17;
    const n = this.noiseSrc(t, len + 0.05), g = this.gain(0);
    const bp = this.filter(style === 'brush' ? 'highpass' : 'bandpass', style === 'brush' ? 3200 : 1900, 0.7);
    g.gain.setValueAtTime(v * (style === 'brush' ? 0.5 : 0.75), t);
    if (style === 'gated') {
      g.gain.setValueAtTime(v * 0.6, t + len - 0.03);
      g.gain.linearRampToValueAtTime(0.0001, t + len);
    } else g.gain.exponentialRampToValueAtTime(0.001, t + len);
    n.connect(bp).connect(g).connect(out);
    if (style !== 'brush') {
      const o = this.osc('triangle', 200, t, t + 0.15), og = this.gain(0);
      o.frequency.exponentialRampToValueAtTime(140, t + 0.1);
      og.gain.setValueAtTime(v * 0.5, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
      o.connect(og).connect(out);
    }
  }
  hat(out, t, v = 1, open = false, metal = false) {
    const len = open ? (metal ? 0.3 : 0.24) : metal ? 0.055 : 0.045;
    const g = this.gain(0);
    g.gain.setValueAtTime(v * (metal ? 0.5 : 0.42), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    if (metal) {
      // six detuned squares (the classic drum-machine cymbal), rendered once and replayed
      const src = this.ctx.createBufferSource();
      src.buffer = this._metal();
      src.start(t, Math.random() * 0.05);
      src.stop(t + len + 0.02);
      src.connect(g).connect(out);
    } else {
      const n = this.noiseSrc(t, len + 0.02, 1.4), hp = this.filter('highpass', 7800);
      n.connect(hp).connect(g).connect(out);
    }
  }
  _metal() {
    if (this.metalBuf) return this.metalBuf;
    const ctx = this.ctx, sr = ctx.sampleRate, n = Math.floor(sr * 0.45);
    const b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    const fr = [267, 396, 480, 680, 702, 1040];
    let hp1 = 0, hp2 = 0, prev = 0, prev2 = 0;
    const k = Math.exp((-2 * Math.PI * 7000) / sr);
    for (let i = 0; i < n; i++) {
      let x = 0;
      for (const f of fr) x += (((i * f) / sr) % 1) < 0.5 ? 1 : -1;
      // two one-pole high-pass stages keep only the shimmer
      hp1 = k * (hp1 + x - prev); prev = x;
      hp2 = k * (hp2 + hp1 - prev2); prev2 = hp1;
      d[i] = hp2 * 0.22;
    }
    return (this.metalBuf = b);
  }
  /** Rising breath of noise that leads into a downbeat. */
  swell(out, t, dur, v = 1) {
    const n = this.noiseSrc(t, dur + 0.15, 1.2), g = this.gain(0), hp = this.filter('highpass', 2000);
    hp.frequency.setValueAtTime(1600, t);
    hp.frequency.exponentialRampToValueAtTime(6800, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v * 0.2, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
    n.connect(hp).connect(g).connect(out);
  }
  /** Soft crash cymbal on a downbeat. */
  crash(out, t, v = 1) {
    const n = this.noiseSrc(t, 2.4, 1.3), g = this.gain(0), hp = this.filter('highpass', 4200), pk = this.filter('peaking', 8000, 0.8);
    pk.gain.value = 5;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v * 0.26, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    n.connect(hp).connect(pk).connect(g).connect(out);
  }
  clap(out, t, v = 1) {
    for (let i = 0; i < 3; i++) {
      const tt = t + i * 0.012;
      const n = this.noiseSrc(tt, 0.12), g = this.gain(0), bp = this.filter('bandpass', 1300, 1.1);
      g.gain.setValueAtTime(v * 0.5, tt);
      g.gain.exponentialRampToValueAtTime(0.001, tt + (i === 2 ? 0.14 : 0.02));
      n.connect(bp).connect(g).connect(out);
    }
  }
  tom(out, t, v = 1, f = 110) {
    const o = this.osc('sine', f, t, t + 0.4), g = this.gain(0);
    o.frequency.setValueAtTime(f * 1.5, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.75, t + 0.16);
    g.gain.setValueAtTime(v * 0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    o.connect(g).connect(out);
    const n = this.noiseSrc(t, 0.04), ng = this.gain(0), bp = this.filter('bandpass', f * 6, 1);
    ng.gain.setValueAtTime(v * 0.2, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    n.connect(bp).connect(ng).connect(out);
  }
  /** Wood block / clock tick / rim: a short resonant click. */
  wood(out, t, v = 1, f = 880, len = 0.05) {
    const o = this.osc('triangle', f, t, t + len + 0.03), g = this.gain(0), bp = this.filter('bandpass', f, 6);
    g.gain.setValueAtTime(v * 0.7, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(bp).connect(g).connect(out);
  }
  shaker(out, t, v = 1) {
    const n = this.noiseSrc(t, 0.09, 1.3), g = this.gain(0), hp = this.filter('highpass', 5200);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v * 0.3, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
    n.connect(hp).connect(g).connect(out);
  }
  /** Deep cinematic hit. */
  boom(out, t, v = 1) {
    const o = this.osc('sine', 80, t, t + 2.2), g = this.gain(0);
    o.frequency.setValueAtTime(95, t);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.6);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2);
    o.connect(g).connect(out);
    const n = this.noiseSrc(t, 1.2, 0.5), ng = this.gain(0), lp = this.filter('lowpass', 420);
    ng.gain.setValueAtTime(v * 0.55, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
    n.connect(lp).connect(ng).connect(out);
  }

  // ---- acoustic colours ---------------------------------------------------
  /**
   * Grand piano: two slightly detuned strings per note, a tone that mellows as it
   * rings, the thump of the hammer, a damper on release. felt = softer, closer.
   */
  piano(out, t, f, dur, v = 1, felt = false, chord = false) {
    const midi = Math.round(69 + 12 * Math.log2(f / 440));
    const reg = clamp((midi - 36) / 60, 0, 1);
    const wave = this.wave('pno' + (midi < 48 ? 0 : midi < 67 ? 1 : 2), PIANO_PARTIALS[midi < 48 ? 0 : midi < 67 ? 1 : 2]);
    const tail = lerp(4.6, 1.3, reg), a = felt ? 0.012 : 0.004, rel = felt ? 0.32 : 0.22;
    const hold = Math.max(0.06, dur);
    const peak = v * (felt ? 0.44 : 0.5) * lerp(1.1, 0.8, reg);
    const env = this.gain(0), damper = this.gain(1);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(peak, t + a);
    env.gain.exponentialRampToValueAtTime(peak * 0.42, t + a + 0.22);
    env.gain.exponentialRampToValueAtTime(peak * 0.002, t + a + tail);
    damper.gain.setValueAtTime(1, t + hold);
    damper.gain.exponentialRampToValueAtTime(0.0001, t + hold + rel);
    const end = Math.min(t + a + tail, t + hold + rel) + 0.03;
    const lp = this.filter('lowpass', 2000, 0.4);
    const top = Math.min(15000, f * (felt ? 4.5 : 9) * (0.55 + 0.6 * Math.min(1.2, v)));
    lp.frequency.setValueAtTime(top, t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(f * 1.6, top * 0.22), t + 0.9);
    // inside a chord one string per note is enough: the notes detune each other
    for (const d of this.light || chord ? [0] : [-2.4, 2.6]) {
      const o = this.ctx.createOscillator();
      o.setPeriodicWave(wave);
      o.frequency.value = f;
      o.detune.value = d;
      o.start(t);
      o.stop(end);
      o.connect(lp);
    }
    lp.connect(env).connect(damper).connect(out);
    if (chord) return;
    const n = this.noiseSrc(t, 0.06), ng = this.gain(0), bp = this.filter('bandpass', felt ? 900 : 2400, 0.8);
    ng.gain.setValueAtTime(peak * (felt ? 0.22 : 0.11), t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + (felt ? 0.045 : 0.025));
    n.connect(bp).connect(ng).connect(damper);
  }

  /** String section: bowed swell spread across the stereo field. o: { attack, release, bright } */
  ens(out, t, f, dur, v = 1, o = {}) {
    const att = o.attack ?? 0.22, rel = o.release ?? 0.7, bright = o.bright ?? 2600;
    const hold = Math.max(att + 0.04, dur), end = t + hold + rel + 0.05, peak = v * 0.26;
    const g = this.gain(0), lp = this.filter('lowpass', bright, 0.4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + att);
    g.gain.setValueAtTime(peak, t + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + hold + rel);
    lp.frequency.setValueAtTime(bright * 0.5, t);
    lp.frequency.linearRampToValueAtTime(bright, t + att * 1.5);
    let lg = null;
    if (att > 0.1 && !this.light) {
      // a slow, shared vibrato once the note has settled
      const lfo = this.osc('sine', 5 + Math.random() * 0.7, t, end);
      lg = this.gain(0);
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(7, t + att + 0.25);
      lfo.connect(lg);
    }
    const voices = this.light ? [[-0.6, -9], [0.6, 8]] : [[-0.75, -13], [0.75, 11], [0, -3]];
    for (const [pan, det] of voices) {
      const os = this.osc('sawtooth', f, t, end, det), pn = this.panner(pan);
      if (lg) lg.connect(os.detune);
      os.connect(pn).connect(lp);
    }
    lp.connect(g).connect(out);
  }

  /** Wordless choir: two voices per side shaped by vowel formants ("ah" or "oo"). */
  choir(out, t, f, dur, v = 1, vowel = 'ah') {
    const F = (VOWELS[vowel] || VOWELS.ah).slice(0, this.light ? 2 : 3);
    const att = 0.32, rel = 0.9, hold = Math.max(att + 0.05, dur), end = t + hold + rel + 0.05, peak = v * 0.9;
    const g = this.gain(0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + att);
    g.gain.setValueAtTime(peak, t + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + hold + rel);
    const lfo = this.osc('sine', 4.7 + Math.random() * 0.8, t, end), lg = this.gain(0);
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(9, t + 0.6);
    lfo.connect(lg);
    for (const [pan, det] of [[-0.6, -9], [0.6, 8]]) {
      const src = this.osc('sawtooth', f, t, end, det), pn = this.panner(pan);
      lg.connect(src.detune);
      for (const [fr, q, lvl] of F) {
        const bp = this.filter('bandpass', fr, q), bg = this.gain(lvl);
        src.connect(bp).connect(bg).connect(pn);
      }
      pn.connect(g);
    }
    const n = this.noiseSrc(t, hold + rel), ng = this.gain(0.03), nb = this.filter('bandpass', F[1][0], 2);
    n.connect(nb).connect(ng).connect(g);
    g.connect(out);
  }

  // ---- pitched -----------------------------------------------------------
  bass(out, t, f, dur, v = 1, kind = 'synth') {
    const g = this.gain(0);
    let end;
    if (kind === 'sub') {
      end = this.adsr(g.gain, t, 0.02, 0.1, 0.85, 0.12, dur, v * 0.9);
      this.osc('sine', f, t, end).connect(g);
      const tri = this.osc('triangle', f * 2, t, end), tg = this.gain(0.18);
      tri.connect(tg).connect(g);
      g.connect(out);
    } else if (kind === 'upright') {
      end = this.adsr(g.gain, t, 0.006, 0.28, 0.25, 0.1, Math.min(dur, 0.4), v);
      const lp = this.filter('lowpass', 900, 0.8);
      this.osc('triangle', f, t, end).connect(lp);
      const s = this.osc('sawtooth', f, t, end), sg = this.gain(0.22);
      s.connect(sg).connect(lp);
      lp.connect(g).connect(out);
    } else {
      end = this.adsr(g.gain, t, 0.005, 0.12, 0.7, 0.07, dur, v * 0.75);
      const lp = this.filter('lowpass', f * 6, 5);
      lp.frequency.setValueAtTime(Math.min(4200, f * 9), t);
      lp.frequency.exponentialRampToValueAtTime(Math.max(160, f * 2.2), t + 0.16);
      this.osc('sawtooth', f, t, end, -6).connect(lp);
      this.osc('square', f, t, end, 6).connect(lp);
      const sub = this.osc('sine', f / 2, t, end), sg = this.gain(0.5);
      sub.connect(sg).connect(g);
      lp.connect(g).connect(out);
    }
  }

  lead(out, t, f, dur, v = 1, kind = 'square') {
    switch (kind) {
      case 'piano': return this.piano(out, t, f, dur, v);
      case 'felt': return this.piano(out, t, f, dur, v, true);
      case 'ens': return this.ens(out, t, f, dur, v);
      case 'stac': return this.ens(out, t, f, dur, v * 1.25, { attack: 0.025, release: 0.14, bright: 3200 });
      case 'choir': return this.choir(out, t, f, dur, v, 'ah');
      case 'choirOo': return this.choir(out, t, f, dur, v, 'oo');
    }
    const g = this.gain(0);
    let end;
    switch (kind) {
      case 'celesta': {
        end = this.adsr(g.gain, t, 0.002, 0.7, 0.06, 0.7, Math.min(dur, 0.5), v * 0.42);
        const c = this.osc('sine', f, t, end), m = this.osc('sine', f * 4, t, end), mg = this.gain(0);
        mg.gain.setValueAtTime(f * 1.6, t);
        mg.gain.exponentialRampToValueAtTime(1, t + 0.35);
        m.connect(mg).connect(c.frequency);
        const tri = this.osc('triangle', f * 2, t, end), tg = this.gain(0.12);
        c.connect(g); tri.connect(tg).connect(g);
        break;
      }
      case 'saw': {
        end = this.adsr(g.gain, t, 0.012, 0.1, 0.7, 0.16, dur, v * 0.42);
        const lp = this.filter('lowpass', 3200, 1.5);
        lp.frequency.setValueAtTime(4800, t);
        lp.frequency.exponentialRampToValueAtTime(1800, t + 0.25);
        const a = this.osc('sawtooth', f, t, end, -8), b = this.osc('sawtooth', f, t, end, 8);
        a.connect(lp); b.connect(lp);
        this.vibrato(a.detune, t, end, 5.4, 10);
        this.vibrato(b.detune, t, end, 5.4, 10);
        lp.connect(g);
        break;
      }
      case 'flute': {
        end = this.adsr(g.gain, t, 0.05, 0.08, 0.85, 0.14, dur, v * 0.55);
        const o = this.osc('sine', f, t, end), o2 = this.osc('triangle', f * 2, t, end), g2 = this.gain(0.12);
        this.vibrato(o.detune, t, end, 5, 12, 0.2);
        o.connect(g); o2.connect(g2).connect(g);
        const n = this.noiseSrc(t, Math.min(0.12, dur)), ng = this.gain(0.12), bp = this.filter('bandpass', f * 2, 2);
        ng.gain.setValueAtTime(0.14, t);
        ng.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        n.connect(bp).connect(ng).connect(g);
        break;
      }
      case 'whistle': {
        end = this.adsr(g.gain, t, 0.04, 0.06, 0.9, 0.12, dur, v * 0.5);
        const o = this.osc('sine', f, t, end);
        o.detune.setValueAtTime(-45, t);
        o.detune.linearRampToValueAtTime(0, t + 0.07);
        this.vibrato(o.detune, t, end, 6, 20, 0.16);
        o.connect(g);
        const n = this.noiseSrc(t, dur + 0.1), ng = this.gain(0.035), bp = this.filter('bandpass', f, 12);
        n.connect(bp).connect(ng).connect(g);
        break;
      }
      case 'bell': {
        end = this.adsr(g.gain, t, 0.003, 0.5, 0.12, 0.9, Math.min(dur, 0.6), v * 0.5);
        const c = this.osc('sine', f, t, end), m = this.osc('sine', f * 3.51, t, end), mg = this.gain(0);
        mg.gain.setValueAtTime(f * 2.4, t);
        mg.gain.exponentialRampToValueAtTime(1, t + 0.5);
        m.connect(mg).connect(c.frequency);
        c.connect(g);
        break;
      }
      case 'epiano': {
        end = this.adsr(g.gain, t, 0.004, 0.45, 0.2, 0.3, Math.min(dur, 0.7), v * 0.55);
        const c = this.osc('sine', f, t, end), m = this.osc('sine', f * 2, t, end), mg = this.gain(0);
        mg.gain.setValueAtTime(f * 1.3, t);
        mg.gain.exponentialRampToValueAtTime(f * 0.1, t + 0.3);
        m.connect(mg).connect(c.frequency);
        c.connect(g);
        break;
      }
      case 'marimba': {
        end = this.adsr(g.gain, t, 0.002, 0.2, 0.05, 0.12, 0.2, v * 0.7);
        const c = this.osc('sine', f, t, end), h = this.osc('sine', f * 4, t, end), hg = this.gain(0);
        hg.gain.setValueAtTime(0.4, t);
        hg.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        c.connect(g); h.connect(hg).connect(g);
        break;
      }
      case 'harmonica': {
        end = this.adsr(g.gain, t, 0.035, 0.1, 0.8, 0.12, dur, v * 0.3);
        const bp = this.filter('bandpass', 1900, 1.2);
        const a = this.osc('sawtooth', f, t, end), b = this.osc('square', f, t, end, 7);
        this.vibrato(a.detune, t, end, 5.5, 14, 0.1);
        a.connect(bp); b.connect(bp);
        bp.connect(g);
        break;
      }
      case 'organ': {
        end = this.adsr(g.gain, t, 0.008, 0.05, 0.9, 0.06, dur, v * 0.26);
        for (const [mult, lvl] of [[1, 1], [2, 0.5], [3, 0.3], [4, 0.14]]) {
          const o = this.osc('sine', f * mult, t, end), og = this.gain(lvl);
          o.connect(og).connect(g);
        }
        break;
      }
      case 'strings': {
        end = this.adsr(g.gain, t, 0.09, 0.2, 0.8, 0.3, dur, v * 0.3);
        const lp = this.filter('lowpass', 2400, 0.6);
        for (const d of [-11, 0, 12]) this.osc('sawtooth', f, t, end, d).connect(lp);
        lp.connect(g);
        break;
      }
      case 'brass': {
        end = this.adsr(g.gain, t, 0.03, 0.12, 0.75, 0.14, dur, v * 0.34);
        const lp = this.filter('lowpass', 900, 1.2);
        lp.frequency.setValueAtTime(500, t);
        lp.frequency.linearRampToValueAtTime(2600, t + 0.07);
        lp.frequency.exponentialRampToValueAtTime(1400, t + 0.4);
        for (const d of [-6, 6]) this.osc('sawtooth', f, t, end, d).connect(lp);
        lp.connect(g);
        break;
      }
      default: {
        // square / chip lead
        end = this.adsr(g.gain, t, 0.008, 0.08, 0.65, 0.12, dur, v * 0.24);
        const lp = this.filter('lowpass', 3000, 0.8);
        const o = this.osc('square', f, t, end);
        this.vibrato(o.detune, t, end, 5.6, 9, 0.18);
        o.connect(lp).connect(g);
      }
    }
    g.connect(out);
  }

  /** Warm stereo pad: a detuned saw on each side over a sine foundation, the filter opening slowly. */
  pad(out, t, f, dur, v = 1, bright = 1200) {
    const att = 0.45, rel = 1.1, hold = Math.max(att + 0.1, dur), end = t + hold + rel + 0.05, peak = v * 0.15;
    const g = this.gain(0), lp = this.filter('lowpass', bright, 0.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + att);
    g.gain.setValueAtTime(peak, t + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + hold + rel);
    // movement without a modulator per note
    lp.frequency.setValueAtTime(bright * 0.6, t);
    lp.frequency.linearRampToValueAtTime(bright * 1.15, t + hold * 0.6);
    lp.frequency.linearRampToValueAtTime(bright * 0.8, t + hold + rel);
    for (const [pan, det] of [[-0.8, -9], [0.8, 8]]) {
      const pn = this.panner(pan);
      this.osc('sawtooth', f, t, end, det).connect(pn).connect(lp);
    }
    if (!this.light) this.osc('sine', f * 0.5, t, end).connect(lp);
    lp.connect(g).connect(out);
  }

  arp(out, t, f, dur, v = 1, kind = 'saw') {
    const g = this.gain(0);
    const end = this.adsr(g.gain, t, 0.003, 0.11, 0.12, 0.08, Math.min(dur, 0.14), v * 0.3);
    const lp = this.filter('lowpass', 2600, 3);
    lp.frequency.setValueAtTime(4600, t);
    lp.frequency.exponentialRampToValueAtTime(700, t + 0.13);
    this.osc(kind === 'square' ? 'square' : 'sawtooth', f, t, end).connect(lp);
    lp.connect(g).connect(out);
  }

  /** Plucked string (Karplus-Strong), cached per pitch. */
  pluck(out, t, midi, dur, v = 1, bright = 0.5) {
    const key = midi + '|' + bright;
    let buf = this.ks.get(key);
    if (!buf) {
      const ctx = this.ctx, sr = ctx.sampleRate, len = Math.floor(sr * 1.7);
      const N = Math.max(2, Math.round(sr / mtof(midi)));
      buf = ctx.createBuffer(1, len, sr);
      const d = buf.getChannelData(0);
      let prev = 0;
      for (let i = 0; i < N; i++) {
        prev += bright * (Math.random() * 2 - 1 - prev);
        d[i] = prev * (1.2 + (1 - bright));
      }
      const damp = 0.9965 - Math.max(0, midi - 60) * 0.00012;
      for (let i = N; i < len; i++) d[i] = (d[i - N] + d[i - N + 1]) * 0.5 * damp;
      this.ks.set(key, buf);
    }
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    const g = this.gain(0);
    const hold = Math.max(0.08, dur);
    g.gain.setValueAtTime(v * 0.6, t);
    g.gain.setValueAtTime(v * 0.6, t + hold);
    g.gain.exponentialRampToValueAtTime(0.001, t + hold + 0.5);
    s.connect(g).connect(out);
    s.start(t);
    s.stop(t + hold + 0.55);
  }
}
