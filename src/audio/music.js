// Step sequencer for the procedural soundtrack. Tracks are data (see tracks.js):
// chords, patterns and melodies written in scale degrees.
import { mtof } from './synth.js';
import { TRACKS, SCALES } from './tracks.js';

const parseCache = new Map();

/** Parse one bar: drums = "x..x", notes = "0 _ 4 . 7'". Returns [{pos, dur, v}]. */
function parseBar(str, drum) {
  const key = (drum ? 'd' : 'n') + str;
  let ev = parseCache.get(key);
  if (ev) return ev;
  ev = [];
  if (drum) {
    const s = str.replace(/\s/g, '');
    for (let i = 0; i < s.length; i++) if (s[i] !== '.') ev.push({ pos: i / s.length, dur: 1 / s.length, v: s[i], i, n: s.length });
  } else {
    const toks = str.trim().split(/\s+/);
    const n = toks.length;
    let last = null;
    toks.forEach((tk, i) => {
      if (tk === '.') last = null;
      else if (tk === '_') {
        if (last) last.dur += 1 / n;
      } else {
        let oct = 0, body = tk;
        while (body.endsWith("'")) { oct++; body = body.slice(0, -1); }
        while (body.endsWith(',')) { oct--; body = body.slice(0, -1); }
        last = { pos: i / n, dur: 1 / n, v: parseInt(body, 10) + oct * 7, i, n };
        ev.push(last);
      }
    });
  }
  parseCache.set(key, ev);
  return ev;
}

class TrackVoice {
  constructor(eng, name, def, t0) {
    this.eng = eng;
    this.name = name;
    this.def = def;
    this.ctx = eng.ctx;
    this.barDur = 240 / def.bpm;
    this.scale = SCALES[def.scale || 'major'];
    this.t0 = t0;
    this.slice = 0; // quarter-bar slices scheduled so far
    this.dead = false;
    this.stopAt = Infinity;
    this.out = this.ctx.createGain();
    this.out.gain.value = 0.0001;
    this.out.connect(eng.musicBus);
    this.parts = [];
    for (const [pname, p] of Object.entries(def.parts)) {
      const g = this.ctx.createGain();
      g.gain.value = p.vol ?? 0.5;
      let head = g;
      let pump = null;
      if (p.hp) {
        // keep the low end for the bass and the kick
        const f = this.ctx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = p.hp;
        head.connect(f);
        head = f;
      }
      if (p.pump) {
        pump = this.ctx.createGain();
        head.connect(pump);
        head = pump;
      }
      if (p.pan) {
        const pn = eng.synth.panner(p.pan);
        head.connect(pn);
        head = pn;
      }
      head.connect(this.out);
      if (p.rev) {
        const s = this.ctx.createGain();
        s.gain.value = p.rev;
        head.connect(s).connect(eng.reverbIn);
      }
      if (p.del) {
        const s = this.ctx.createGain();
        s.gain.value = p.del;
        head.connect(s).connect(eng.delayIn);
      }
      this.parts.push({ name: pname, p, g, pump, level: p.vol ?? 0.5, on: true });
    }
    // transitions (cymbal swells and crashes between sections)
    this.fx = this.ctx.createGain();
    this.fx.gain.value = def.fx ?? 0.5;
    this.fx.connect(this.out);
    const fxRev = this.ctx.createGain();
    fxRev.gain.value = 0.5;
    this.fx.connect(fxRev).connect(eng.reverbIn);
    // sections
    this.sections = (def.sections || [{ bars: def.chords.length, on: 'all' }]).map((s) => ({
      bars: s.bars, on: s.on === 'all' ? null : new Set(s.on),
    }));
    this.loopFrom = def.loopFrom ?? 0;
    this.total = this.sections.reduce((a, s) => a + s.bars, 0);
    this.loopLen = this.sections.slice(this.loopFrom).reduce((a, s) => a + s.bars, 0);
    this.introLen = this.total - this.loopLen;
    if (def.delay) eng.setDelay((60 / def.bpm) * def.delay, t0);
    // bar index (within the form) at which each section starts
    this.starts = [];
    let acc = 0;
    for (const sc of this.sections) { this.starts.push(acc); acc += sc.bars; }
  }

  sectionAt(bar) {
    let b = bar;
    if (b >= this.total) b = this.introLen + ((b - this.introLen) % this.loopLen);
    for (const s of this.sections) {
      if (b < s.bars) return s;
      b -= s.bars;
    }
    return this.sections[this.sections.length - 1];
  }

  /** Position of a bar inside the form: { first, last } of its section. */
  edge(bar) {
    let b = bar;
    if (b >= this.total) b = this.introLen + ((b - this.introLen) % this.loopLen);
    for (let i = 0; i < this.sections.length; i++) {
      const s0 = this.starts[i], n = this.sections[i].bars;
      if (b >= s0 && b < s0 + n) return { first: b === s0, last: b === s0 + n - 1 };
    }
    return { first: false, last: false };
  }

  fade(to, time) {
    const g = this.out.gain, now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(0.0001, g.value), now);
    g.exponentialRampToValueAtTime(Math.max(0.0001, to), now + time);
  }

  stop(time) {
    this.fade(0.0001, time);
    this.stopAt = this.ctx.currentTime + time + 0.1;
  }

  setIntensity(v) {
    const now = this.ctx.currentTime;
    for (const part of this.parts) {
      const want = v >= (part.p.min ?? 0) ? part.level : 0;
      if (want !== part.cur) {
        part.cur = want;
        part.g.gain.setTargetAtTime(want, now, 0.35);
      }
    }
  }

  deg(d) {
    const s = this.scale, n = s.length;
    return s[((d % n) + n) % n] + 12 * Math.floor(d / n);
  }

  schedule(until) {
    if (this.ctx.currentTime > this.stopAt) {
      this.dead = true;
      this.out.disconnect();
      return;
    }
    const q = this.barDur / 4;
    // never try to catch up on a long pause (tab hidden): skip ahead instead
    const behind = this.ctx.currentTime - (this.t0 + this.slice * q);
    if (behind > 0.5) this.slice += Math.ceil(behind / q);
    while (this.t0 + this.slice * q < until) {
      this.scheduleSlice(Math.floor(this.slice / 4), this.slice % 4);
      this.slice++;
    }
  }

  scheduleSlice(bar, quarter) {
    const def = this.def, S = this.eng.synth, bd = this.barDur;
    const tBar = this.t0 + bar * bd;
    const sec = this.sectionAt(bar);
    const chordEntry = def.chords[bar % def.chords.length];
    const root = typeof chordEntry === 'number' ? chordEntry : chordEntry.d;
    const chordTones = typeof chordEntry === 'number' ? null : chordEntry.t;
    const lo = quarter / 4, hi = (quarter + 1) / 4;
    const swing = def.swing || 0;
    // transitions: a breath of cymbal into each new section, a soft crash on its downbeat
    if (def.fx !== 0 && bar > 0) {
      const ed = this.edge(bar);
      if (ed.last && quarter === 2) S.swell(this.fx, tBar + bd * 0.5, bd * 0.5, 1);
      if (ed.first && quarter === 0) S.crash(this.fx, tBar, 0.8);
    }
    for (const part of this.parts) {
      const p = part.p;
      if (sec.on && !sec.on.has(part.name)) continue;
      const out = part.g;
      if (part.pump && true) {
        const tb = tBar + lo * bd, g = part.pump.gain;
        g.setValueAtTime(1 - p.pump, tb);
        g.linearRampToValueAtTime(1, tb + (bd / 4) * 0.85);
      }
      if (p.type === 'pad') {
        if (quarter !== 0) continue;
        const tones = p.tones || chordTones || [0, 2, 4];
        for (const tn of tones) {
          const midi = def.key + this.deg(root + tn) + 12 * (p.oct || 0);
          if (p.inst) S.lead(out, tBar, mtof(midi), bd * 1.0, 1, p.inst);
          else S.pad(out, tBar, mtof(midi), bd * 1.02, 1, p.bright || 1200);
        }
        continue;
      }
      const src = p.seq ?? p.pat;
      const str = Array.isArray(src) ? src[bar % src.length] : src;
      if (!str) continue;
      const drum = p.type === 'drum' || p.type === 'stab' || p.type === 'strum';
      const evs = parseBar(str, drum);
      for (const e of evs) {
        if (e.pos < lo - 1e-6 || e.pos >= hi - 1e-6) continue;
        let t = tBar + e.pos * bd;
        if (swing && e.n % 4 === 0 && e.i % 2 === 1) t += swing * (bd / e.n);
        const hum = p.type === 'drum' && p.inst === 'kick' ? 0 : (Math.random() - 0.5) * 0.008;
        t += hum;
        // a little life: random touch, slightly stronger beats
        const vel = (0.9 + Math.random() * 0.16) * (e.n % 4 === 0 && e.i % (e.n / 4) === 0 ? 1.06 : 1);
        if (p.type === 'drum') {
          const ch = e.v;
          const v = (ch === '-' ? 0.45 : ch === 'o' ? 1.15 : 1) * vel;
          switch (p.inst) {
            case 'kick': S.kick(out, t, v, p.deep); break;
            case 'snare': S.snare(out, t, v, p.style); break;
            case 'hat': S.hat(out, t, v, ch === 'o', p.style === 'metal'); break;
            case 'clap': S.clap(out, t, v); break;
            case 'shaker': S.shaker(out, t, v); break;
            case 'boom': S.boom(out, t, v); break;
            case 'tom': S.tom(out, t, v, (p.pitches || [90, 120, 150])[Math.max(0, 'abc'.indexOf(ch))] || 100); break;
            case 'wood': S.wood(out, t, v, (p.pitches || [900, 700, 1200])[Math.max(0, 'abc'.indexOf(ch))] || 900, p.len || 0.05); break;
          }
          continue;
        }
        if (p.type === 'stab' || p.type === 'strum') {
          const tones = p.tones || chordTones || [0, 2, 4];
          const up = e.v === 'u';
          const list = up ? [...tones].reverse() : tones;
          list.forEach((tn, k) => {
            const midi = def.key + this.deg(root + tn) + 12 * (p.oct || 0);
            const tt = t + k * (p.type === 'strum' ? 0.013 : p.roll || 0);
            const v = vel * (up ? 0.7 : 1) * (e.v === '-' ? 0.5 : 1);
            if (p.inst === 'pluck') S.pluck(out, tt, midi, e.dur * bd * (p.gate || 1.5), v, p.bright ?? 0.5);
            else if (p.inst === 'piano') S.piano(out, tt, mtof(midi), e.dur * bd * (p.gate || 0.9), v * 0.8, false, k > 0);
            else S.lead(out, tt, mtof(midi), e.dur * bd * (p.gate || 0.9), v * 0.7, p.inst || 'epiano');
          });
          continue;
        }
        const d = p.rel === 'key' ? e.v : root + e.v;
        const midi = def.key + this.deg(d) + 12 * (p.oct || 0);
        const dur = e.dur * bd * (p.gate || 0.92);
        const f = mtof(midi);
        if (p.type === 'bass') S.bass(out, t, f, dur, vel, p.inst || 'synth');
        else if (p.type === 'arp') S.arp(out, t, f, dur, vel, p.inst || 'saw');
        else if (p.type === 'pluck') S.pluck(out, t, midi, dur, vel, p.bright ?? 0.5);
        else S.lead(out, t, f, dur, vel, p.inst || 'square');
      }
    }
  }
}

export class MusicPlayer {
  constructor(eng) {
    this.eng = eng;
    this.voices = [];
    this.current = null;
    this.intensity = 0.5;
    this.wanted = null;
  }

  /** Crossfade to a track by name (no-op when it is already playing). */
  play(name, fade = 1.6) {
    this.wanted = name;
    if (!this.eng.ctx) return;
    if (this.current && this.current.name === name && !this.current.dead && this.current.stopAt === Infinity) return;
    const def = TRACKS[name];
    if (this.current) this.current.stop(fade);
    this.current = null;
    if (!def) return;
    let v;
    try {
      v = new TrackVoice(this.eng, name, def, this.eng.ctx.currentTime + 0.1);
    } catch (e) {
      console.warn('music unavailable', e);
      return;
    }
    v.fade(def.gain ?? 1, Math.max(0.3, fade * 0.7));
    v.setIntensity(this.intensity);
    this.voices.push(v);
    this.current = v;
  }

  stop(fade = 1.2) {
    this.wanted = null;
    if (this.current) this.current.stop(fade);
    this.current = null;
  }

  setIntensity(v) {
    this.intensity = v;
    if (this.current) this.current.setIntensity(v);
  }

  tick() {
    const ctx = this.eng.ctx;
    if (!ctx || ctx.state !== 'running') return;
    if (!this.current && this.wanted) this.play(this.wanted, 0.5);
    const until = ctx.currentTime + 0.24;
    for (const v of this.voices) {
      try { v.schedule(until); } catch (e) { v.dead = true; }
    }
    this.voices = this.voices.filter((v) => !v.dead);
  }
}
