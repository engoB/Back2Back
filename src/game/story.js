// Story mode: six chapters, one era each, a Cog to bring home every time.
const ALL = { rocks: 1, gaps: 1, rails: 1, drops: 1, power: 1, kickers: 1, bumps: 1 };

export const CHAPTERS = [
  { n: 1, era: 'jurassic', mood: 0, reward: 400,
    course: { length: 1300, diff: [0, 0.25], diffSpan: 1300, allow: { ...ALL, gaps: 0 } } },
  { n: 2, era: 'west', mood: 1, reward: 500, course: { length: 1700, diff: [0.15, 0.4], diffSpan: 1700, allow: ALL } },
  { n: 3, era: 'chrome', mood: 0, reward: 600, course: { length: 2000, diff: [0.25, 0.5], diffSpan: 2000, allow: ALL } },
  { n: 4, era: 'neon', mood: 0, reward: 700, course: { length: 2300, diff: [0.35, 0.65], diffSpan: 2300, allow: ALL } },
  { n: 5, era: 'future', mood: 1, reward: 800, course: { length: 2600, diff: [0.45, 0.8], diffSpan: 2600, allow: ALL } },
  { n: 6, era: 'void', mood: 0, reward: 1500, storm: { start: -90, speed: 14.5 },
    course: { length: 3000, diff: [0.5, 0.9], diffSpan: 3000, allow: { ...ALL, power: 1 } } },
];

export const chapter = (n) => CHAPTERS[n - 1];
