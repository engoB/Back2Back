// Missions: three goals at a time; clearing all three raises the rider's rank.
import { save } from '../core/save.js';
import { mulberry32 } from '../core/rng.js';

/** kind 'run' = best in a single run, 'total' = accumulated over several runs. */
export const MISSION_TEMPLATES = [
  { id: 'dist', kind: 'run', stat: 'distance', base: 600, step: 250, round: 50 },
  { id: 'distT', kind: 'total', stat: 'distance', base: 2500, step: 1200, round: 100 },
  { id: 'flips', kind: 'run', stat: 'flips', base: 2, step: 1 },
  { id: 'flipsT', kind: 'total', stat: 'flips', base: 8, step: 5 },
  { id: 'double', kind: 'run', stat: 'doubles', base: 1, step: 0.34 },
  { id: 'coins', kind: 'run', stat: 'coins', base: 40, step: 20, round: 5 },
  { id: 'coinsT', kind: 'total', stat: 'coins', base: 200, step: 120, round: 10 },
  { id: 'grind', kind: 'run', stat: 'grind', base: 40, step: 25, round: 5 },
  { id: 'grindT', kind: 'total', stat: 'grind', base: 150, step: 90, round: 10 },
  { id: 'gaps', kind: 'run', stat: 'gaps', base: 2, step: 0.8 },
  { id: 'hops', kind: 'run', stat: 'hops', base: 3, step: 1 },
  { id: 'smash', kind: 'total', stat: 'smashes', base: 3, step: 2 },
  { id: 'combo', kind: 'run', stat: 'bestCombo', base: 2, step: 0.4 },
  { id: 'score', kind: 'run', stat: 'score', base: 3000, step: 2500, round: 500 },
  { id: 'jumps', kind: 'run', stat: 'timeJumps', base: 1, step: 0.34 },
  { id: 'speed', kind: 'run', stat: 'maxKmh', base: 85, step: 4, round: 5 },
  { id: 'fulgur', kind: 'total', stat: 'fulgurs', base: 2, step: 1 },
  { id: 'perfect', kind: 'total', stat: 'perfects', base: 3, step: 2 },
];
const BY_ID = Object.fromEntries(MISSION_TEMPLATES.map((t) => [t.id, t]));

export const RANKS = [1, 3, 6, 10, 15, 20, 30]; // level thresholds for rank titles

export function rankIndex(level) {
  let r = 0;
  for (let i = 0; i < RANKS.length; i++) if (level >= RANKS[i]) r = i;
  return r;
}

function targetFor(t, level) {
  let v = t.base + t.step * (level - 1);
  const r = t.round || 1;
  v = Math.round(v / r) * r;
  return Math.max(1, Math.floor(v));
}

function generate(level) {
  const rnd = mulberry32(level * 7919 + 13);
  const pool = MISSION_TEMPLATES.filter((t) => !(level < 3 && (t.id === 'double' || t.id === 'jumps' || t.id === 'combo')));
  const picks = [];
  const usedStats = new Set();
  let guard = 0;
  while (picks.length < 3 && guard++ < 200) {
    const t = pool[Math.floor(rnd() * pool.length)];
    if (usedStats.has(t.stat)) continue;
    usedStats.add(t.stat);
    picks.push({ id: t.id, target: targetFor(t, level), progress: 0, done: false });
  }
  return picks;
}

export const missions = {
  /** Current three missions (created on first use). */
  slots() {
    const m = save.data.missions;
    if (!m.slots || m.slots.length !== 3) {
      m.slots = generate(m.level);
      save.touch();
    }
    return m.slots;
  },
  template(id) {
    return BY_ID[id];
  },
  reward(level) {
    return 150 + 50 * level;
  },
  /** Progress including the run in flight (for the HUD / pause screen). */
  live(slot, stats) {
    const t = BY_ID[slot.id];
    if (!t) return slot.progress;
    const v = stats[t.stat] || 0;
    return t.kind === 'run' ? Math.max(slot.progress, v) : slot.progress + v;
  },
  /** Slots that the current run has just completed (not yet banked). */
  newlyDone(stats, already) {
    const out = [];
    for (const s of this.slots()) {
      if (s.done || already.has(s.id)) continue;
      if (this.live(s, stats) >= s.target) out.push(s);
    }
    return out;
  },
  /**
   * Bank a finished run. Returns { completed: [slots], levelUp: bool, reward, level }.
   */
  commit(stats) {
    const m = save.data.missions;
    const completed = [];
    for (const s of this.slots()) {
      if (s.done) continue;
      s.progress = this.live(s, stats);
      if (s.progress >= s.target) {
        s.done = true;
        s.progress = s.target;
        completed.push({ ...s });
      }
    }
    let levelUp = false, reward = 0;
    if (m.slots.every((s) => s.done)) {
      levelUp = true;
      reward = this.reward(m.level);
      m.level++;
      m.slots = generate(m.level);
      save.data.coins += reward;
    }
    save.touch();
    return { completed, levelUp, reward, level: m.level };
  },
};
