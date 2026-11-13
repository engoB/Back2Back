// Offline render checks for the soundtrack and effects (developer tool).
import { AudioEngine } from '../audio/audio.js';
import { TRACKS } from '../audio/tracks.js';

function stats(buf) {
  let peak = 0, sum = 0, n = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) {
      const a = Math.abs(d[i]);
      if (a > peak) peak = a;
      sum += d[i] * d[i];
      n++;
    }
  }
  return { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / n).toFixed(4) };
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

window.audioTest = async () => {
  const out = { tracks: {}, sfx: {}, errors: [] };
  for (const name of Object.keys(TRACKS)) {
    try { out.tracks[name] = await renderTrack(name, 40); } catch (e) { out.errors.push(name + ': ' + e.message); }
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
