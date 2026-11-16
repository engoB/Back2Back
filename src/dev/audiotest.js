// Offline render checks for the soundtrack and effects (developer tool).
import { AudioEngine } from '../audio/audio.js';
import { TRACKS } from '../audio/tracks.js';

function stats(buf) {
  let peak = 0, sum = 0, n = 0, bad = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) {
      const a = Math.abs(d[i]);
      if (a !== a) bad++;
      if (a > peak) peak = a;
      sum += d[i] * d[i];
      n++;
    }
  }
  const out = { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / n).toFixed(4) };
  if (bad) out.nan = bad;
  if (buf.numberOfChannels === 2) {
    // stereo width: side energy over mid energy; band balance through one-pole splits
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    let mid = 0, side = 0, lo = 0, hi = 0, tot = 0, lp1 = 0, lp2 = 0;
    const sr = buf.sampleRate, k1 = 1 - Math.exp((-2 * Math.PI * 160) / sr), k2 = 1 - Math.exp((-2 * Math.PI * 3000) / sr);
    for (let i = 0; i < L.length; i++) {
      const m = (L[i] + R[i]) * 0.5, s = (L[i] - R[i]) * 0.5;
      mid += m * m; side += s * s;
      lp1 += (m - lp1) * k1; lp2 += (m - lp2) * k2;
      lo += lp1 * lp1; hi += (m - lp2) * (m - lp2); tot += m * m;
    }
    out.width = +(Math.sqrt(side / (mid || 1))).toFixed(2);
    out.low = +(lo / (tot || 1)).toFixed(2);
    out.high = +(hi / (tot || 1)).toFixed(3);
    // loudness over time (4 s windows) to see the arrangement breathe
    const w = sr * 4, env = [];
    for (let s0 = 0; s0 + w <= L.length; s0 += w) {
      let e = 0;
      for (let i = s0; i < s0 + w; i++) e += L[i] * L[i] + R[i] * R[i];
      env.push(+Math.sqrt(e / (2 * w)).toFixed(3));
    }
    out.env = env.join(' ');
  }
  return out;
}

async function renderTrack(name, seconds, intensity = 1) {
  const ctx = new OfflineAudioContext(2, 44100 * seconds, 44100);
  const A = new AudioEngine();
  A.ctx = ctx;
  A._build(ctx);
  Object.defineProperty(A, 'ready', { value: true });
  A.music.intensity = intensity;
  A.music.play(name, 0.3);
  for (const v of A.music.voices) v.schedule(seconds);
  const buf = await ctx.startRendering();
  return stats(buf);
}

async function renderSfx(name) {
  const ctx = new OfflineAudioContext(2, 44100 * 3, 44100);
  const A = new AudioEngine();
  A.ctx = ctx;
  A._build(ctx);
  Object.defineProperty(A, 'ready', { value: true });
  let err = null;
  try {
    if (name === 'coin') for (let i = 0; i < 6; i++) A.coin();
    else A.sfx(name, { n: 2, power: 0.8, near: 1, mult: 3 });
  } catch (e) { err = e.message; }
  const buf = await ctx.startRendering();
  return { ...stats(buf), err };
}

/** Quick cost / level check of a few tracks: window.audioBench(['present', 'void'], 24) */
/** Cost of each part of a track rendered alone: window.audioParts('present', 16) */
window.audioParts = async (name, seconds = 16) => {
  const def = TRACKS[name], out = {};
  const run = async (label, parts) => {
    TRACKS.__tmp = { ...def, parts, sections: [{ bars: 64, on: 'all' }], loopFrom: 0, fx: 0 };
    const t0 = performance.now();
    const st = await renderTrack('__tmp', seconds);
    out[label] = { load: +((performance.now() - t0) / (seconds * 1000)).toFixed(3), rms: st.rms, peak: st.peak };
  };
  await run('(silence)', {});
  for (const [pn, p] of Object.entries(def.parts)) await run(pn, { [pn]: p });
  delete TRACKS.__tmp;
  return out;
};

window.audioBench = async (names, seconds = 24) => {
  const out = {};
  for (const name of names) {
    const t0 = performance.now();
    const st = await renderTrack(name, seconds);
    st.ms = Math.round(performance.now() - t0);
    st.load = +(st.ms / (seconds * 1000)).toFixed(2);
    out[name] = st;
  }
  return out;
};

window.audioTest = async () => {
  const out = { tracks: {}, sfx: {}, errors: [] };
  for (const name of Object.keys(TRACKS)) {
    try { const t0 = performance.now(); out.tracks[name] = await renderTrack(name, 32); out.tracks[name].ms = Math.round(performance.now() - t0); } catch (e) { out.errors.push(name + ': ' + e.message); }
  }
  const { default: _ } = { default: 0 };
  const names = ['jump', 'land', 'flip', 'trick', 'bank', 'railOn', 'crash', 'fall', 'smash', 'boost', 'fulgur', 'fulgurEnd', 'powerup',
    'shieldBreak', 'portal', 'arrive', 'thunder', 'cog', 'gameover', 'record', 'mission', 'levelup', 'buy', 'error', 'click', 'back', 'tab',
    'start', 'count', 'go', 'finish', 'revive', 'hint', 'type', 'tick', 'bell', 'zap', 'whooshBig', 'boom', 'shatter', 'coin'];
  for (const n of names) {
    try { out.sfx[n] = await renderSfx(n); } catch (e) { out.errors.push('sfx ' + n + ': ' + e.message); }
  }
  return out;
};
