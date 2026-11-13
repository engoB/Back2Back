// Gameplay rules shared by the local run, the AI riders and the tests.
export const ROCK_SIZES = [
  { hw: 0.62, h: 0.8 },
  { hw: 0.78, h: 1.1 },
];

export function hitsRock(p, it) {
  const s = ROCK_SIZES[it.size] || ROCK_SIZES[0];
  return Math.abs(p.x - it.x) < s.hw + 0.28 && p.y - it.y < s.h;
}

/** 'none' | 'crash' | 'smash' — a rider coming down from a big air crushes the rock. */
export function rockOutcome(p, it) {
  if (!hitsRock(p, it)) return 'none';
  if (p.boosting || p.stompT > 0 || p.invulnT > 0) return 'smash';
  if (!p.grounded && !p.rail && p.airTime > 1.25 && p.vy < 0) return 'smash';
  return 'crash';
}

/** Points for n chained backflips. */
export const flipPoints = (n) => (100 * n * (n + 1)) / 2;
export const SCORE = { grindPerM: 12, gap: 80, hop: 40, smash: 60, stomp: 60, bigAir: 50, perfect: 50, coin: 10, portal: 250, cog: 1000 };
