// Riders, boards, upgrades and consumables: shared by gameplay, shop and multiplayer.

export const RIDERS = {
  nova: {
    id: 'nova', price: 0, scale: 1, bulk: 1,
    jacket: 0xff7a2a, pants: 0x27365c, skin: 0xf2c9a0, hair: 0x7a3520, boots: 0x1c2030, glove: 0x27365c, accent: 0x3fe0ff,
    hair3d: 'ponytail', head: 'goggles',
    stats: { jump: 1, flip: 1, speed: 1, boost: 1 },
  },
  tobias: {
    id: 'tobias', price: 1500, scale: 1.07, bulk: 1.22,
    jacket: 0x3f9a5a, pants: 0x33343c, skin: 0xb9825c, hair: 0x15151a, boots: 0x1a1a1e, glove: 0xe8d8b0, accent: 0xffd23f,
    hair3d: 'none', head: 'beanie',
    stats: { jump: 0.95, flip: 0.9, speed: 1.1, boost: 1.05 },
  },
  ada: {
    id: 'ada', price: 3000, scale: 0.97, bulk: 1,
    jacket: 0x6a4a9e, pants: 0x4a3a2e, skin: 0xe9c4a6, hair: 0xdcdce6, boots: 0x3a2a22, glove: 0x8a6a3a, accent: 0xffcf5a,
    hair3d: 'bun', head: 'goggles', coat: 0x5a3f8a, pack: 0xc89a4a,
    stats: { jump: 1.12, flip: 0.93, speed: 0.97, boost: 1.15 },
  },
  rouage: {
    id: 'rouage', price: 5000, scale: 0.9, bulk: 1.05, robot: true,
    jacket: 0xc89a4a, pants: 0x8a6a3a, skin: 0xd8b060, hair: 0xc89a4a, boots: 0x5a4a3a, glove: 0xd8b060, accent: 0x3ff6ff,
    hair3d: 'none', head: 'robot',
    stats: { jump: 1.0, flip: 1.16, speed: 0.96, boost: 1 },
  },
  elea: {
    id: 'elea', price: 8000, scale: 1.02, bulk: 0.95,
    jacket: 0xeaf4f8, pants: 0x2a4a5e, skin: 0x8a5a44, hair: 0x1a1020, boots: 0xeaf4f8, glove: 0x3fe8d0, accent: 0x3fe8d0,
    hair3d: 'none', head: 'helmet',
    stats: { jump: 1.05, flip: 1.12, speed: 1.06, boost: 1.1 },
  },
  baron: {
    id: 'baron', price: 0, story: true, scale: 1.1, bulk: 1,
    jacket: 0x1c1626, pants: 0x14101c, skin: 0xd8c8c0, hair: 0x2a2a30, boots: 0x0c0a12, glove: 0xf0f0f0, accent: 0xffcf5a,
    hair3d: 'none', head: 'tophat', coat: 0x241a34,
    stats: { jump: 1.1, flip: 1.1, speed: 1.08, boost: 1.15 },
  },
};
export const RIDER_ORDER = ['nova', 'tobias', 'ada', 'rouage', 'elea', 'baron'];

export const BOARDS = {
  mk1: { id: 'mk1', price: 0, deck: 0x8a5a34, trim: 0xc89a4a, glow: 0x6fd3ff, stats: {} },
  eclair: { id: 'eclair', price: 1200, deck: 0xffd23f, trim: 0x2a2a3a, glow: 0xfff2a0, stats: { boost: 1.25 } },
  fossile: { id: 'fossile', price: 2500, deck: 0xd8d0b8, trim: 0x6a8a3a, glow: 0x9be070, stats: { jump: 1.08 } },
  neon86: { id: 'neon86', price: 4000, deck: 0x1a1030, trim: 0xff3fa4, glow: 0xff3fa4, stats: { flip: 1.1 } },
  helix: { id: 'helix', price: 6000, deck: 0xe8f4f8, trim: 0x3fe8d0, glow: 0x3fe8d0, stats: { speed: 1.06, jump: 1.04 } },
  paradoxe: { id: 'paradoxe', price: 0, story: true, deck: 0x2a2440, trim: 0xffcf5a, glow: 0xffcf5a, stats: { jump: 1.05, flip: 1.06, speed: 1.05, boost: 1.1 } },
};
export const BOARD_ORDER = ['mk1', 'eclair', 'fossile', 'neon86', 'helix', 'paradoxe'];

/** Permanent upgrades (levels 0..5). value(level) is the gameplay number. */
export const UPGRADES = {
  magnet: { costs: [300, 700, 1500, 3000, 6000], value: (l) => 6 + l * 1.6 },
  shield: { costs: [300, 700, 1500, 3000, 6000], value: (l) => 8 + l * 2.4 },
  double: { costs: [300, 700, 1500, 3000, 6000], value: (l) => 7 + l * 1.6 },
  fulgur: { costs: [400, 900, 1800, 3500, 7000], value: (l) => 5 + l * 0.9 },
};
export const UPGRADE_ORDER = ['fulgur', 'magnet', 'shield', 'double'];

/** Consumables used at the start of a run or on a crash. */
export const CONSUMABLES = {
  headstart: { price: 250, max: 9 },
  revive: { price: 400, max: 9 },
};
export const CONSUMABLE_ORDER = ['headstart', 'revive'];

export function combinedStats(riderId, boardId) {
  const r = (RIDERS[riderId] || RIDERS.nova).stats;
  const b = (BOARDS[boardId] || BOARDS.mk1).stats;
  return {
    jump: r.jump * (b.jump || 1),
    flip: r.flip * (b.flip || 1),
    speed: r.speed * (b.speed || 1),
    boost: r.boost * (b.boost || 1),
  };
}
