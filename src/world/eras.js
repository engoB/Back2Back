// The seven worlds of FULGUR. Everything visual about an era is data:
// sky moods, lights, terrain strata, scenery species, obstacles, weather, music.

/** Mood defaults (each era mood overrides what it needs). */
const MOOD = {
  midPos: 0.42, fogNear: 70, fogFar: 520, sunSize: 0.11, glowSize: 0.55,
  sunPos: [0.45, 0.42], hemiInt: 1.0, dirInt: 0.75, dirDir: [0.5, 0.8, 0.6],
  stars: 0, glow: 0.35, cloudAmt: 1, skyStyle: 0,
};
const mood = (o) => ({ ...MOOD, ...o });

export const ERA_ORDER = ['present', 'jurassic', 'west', 'chrome', 'neon', 'future', 'void'];

export const ERAS = {
  // ---------------------------------------------------------------- present
  present: {
    id: 'present', year: null, accent: 0x6fd3ff, music: 'present',
    terrain: {
      top: 0xf3f8fd, top2: 0xdfeaf6, edge: 0xffffff,
      wall: [0xc9dcec, 0x9bb7d2, 0x6e8fb4, 0x4a6a92, 0x2e4568],
    },
    mid: { style: 'alpine', low: 0x7f9fbe, high: 0xb9cfe3, cap: 0xf6fafe, capLevel: 0.45, amp: 1 },
    layers: [
      { style: 'alpine', z: -420, H: 120, base: -60, scroll: 0.5, step: 14 },
      { style: 'alpine', z: -700, H: 170, base: -70, scroll: 0.3, step: 22 },
      { style: 'alpine', z: -1100, H: 250, base: -80, scroll: 0.16, step: 34 },
    ],
    chasm: 0x2b4d7e,
    decor: [
      { prop: 'pine', per100: 9, z: [-17, -3.2], scale: [0.75, 1.5] },
      { prop: 'pine', per100: 16, zone: 'mid', scale: [1.1, 2.2] },
      { prop: 'rockSnow', per100: 3, z: [-15, -2.5], scale: [0.6, 1.6] },
      { prop: 'rockSnow', per100: 2.2, z: [1.4, 2.8], scale: [0.25, 0.5] },
      { prop: 'chalet', per100: 0.9, z: [-16, -9], scale: [0.9, 1.15], spin: 0.5 },
      { prop: 'lamp', per100: 1.6, z: [-3.6, -2.6], scale: [1, 1] },
      { prop: 'fence', per100: 2.4, z: [-2.8, -2.2], scale: [1, 1], spin: 0 },
    ],
    obstacles: ['rockSnow', 'snowman'],
    rail: { post: 0x6b4a35, beam: 0x8a6244, glow: 0 },
    weather: 'snow', clouds: 1, creatures: ['birds'],
    moods: [
      mood({
        name: 'day', skyTop: 0x3f8fd8, skyMid: 0x9ccdf0, skyBot: 0xe9f4fb, fog: 0xdcebf6,
        sun: 0xfffbe8, sunGlow: 0xfff1c9, sunPos: [0.5, 0.55], hemiSky: 0xffffff, hemiGround: 0x9fb4d0,
        dir: 0xfff2d8, far: 0x8fb4d8, far2: 0xc3daee, cloud: 0xffffff, glow: 0.2,
      }),
      mood({
        name: 'sunset', skyTop: 0x2a3a82, skyMid: 0xe0688a, skyBot: 0xffc98a, fog: 0xf0b39a,
        sun: 0xfff0c0, sunGlow: 0xff9a5a, sunPos: [0.42, 0.12], sunSize: 0.14, hemiSky: 0xffc9b8, hemiGround: 0x7a6aa0,
        dir: 0xff9f6a, dirDir: [0.8, 0.3, 0.5], far: 0x8a5f96, far2: 0xd98fa0, cloud: 0xffb8a8, glow: 0.8, stars: 0.15,
      }),
      mood({
        name: 'night', skyTop: 0x050a22, skyMid: 0x122352, skyBot: 0x2a4c82, fog: 0x1b2d58,
        sun: 0xf4f7ff, sunGlow: 0x6f8fd8, sunPos: [-0.3, 0.62], sunSize: 0.075, glowSize: 0.3,
        hemiSky: 0x6f88c8, hemiGround: 0x1a2648, hemiInt: 0.95, dir: 0x9fb8ff, dirInt: 0.45, dirDir: [-0.4, 0.8, 0.5],
        far: 0x152650, far2: 0x223a70, cloud: 0x2a3d70, stars: 1, glow: 1,
      }),
    ],
  },

  // --------------------------------------------------------------- jurassic
  jurassic: {
    id: 'jurassic', year: -66000000, accent: 0x7de06a, music: 'jurassic',
    terrain: {
      top: 0x6dbb54, top2: 0x4f9f48, edge: 0x9be070,
      wall: [0x8a5a3a, 0x6f452d, 0x553322, 0x3c2419, 0x24150f],
    },
    mid: { style: 'hills', low: 0x2f7a4c, high: 0x57a85a, cap: 0x8fd070, capLevel: 0.75, amp: 0.8 },
    layers: [
      { style: 'jungle', z: -380, H: 95, base: -60, scroll: 0.5, step: 9 },
      { style: 'volcano', z: -700, H: 200, base: -70, scroll: 0.3, step: 20 },
      { style: 'hills', z: -1100, H: 200, base: -80, scroll: 0.16, step: 34 },
    ],
    chasm: 0xff5a1f,
    decor: [
      { prop: 'cycad', per100: 6, z: [-17, -3.4], scale: [0.8, 1.5] },
      { prop: 'fern', per100: 14, z: [-14, -2.4], scale: [0.7, 1.7] },
      { prop: 'fern', per100: 6, z: [1.3, 2.9], scale: [0.35, 0.6] },
      { prop: 'giantTree', per100: 1.4, z: [-18, -11], scale: [0.9, 1.4] },
      { prop: 'giantTree', per100: 7, zone: 'mid', scale: [1.2, 2.4] },
      { prop: 'cycad', per100: 12, zone: 'mid', scale: [1.2, 2.2] },
      { prop: 'mushroom', per100: 2.5, z: [-9, -2.6], scale: [0.6, 1.5] },
      { prop: 'ribcage', per100: 0.7, z: [-14, -6], scale: [0.9, 1.3], spin: 0.4 },
      { prop: 'sauropod', per100: 0.5, zone: 'mid', scale: [1.4, 2.2], zMax: 140, spin: 0.4 },
    ],
    obstacles: ['boulderMoss', 'eggNest'],
    rail: { post: 0x4a3526, beam: 0x6a8a3a, glow: 0, vine: true },
    weather: 'pollen', clouds: 0.7, creatures: ['pteros'],
    moods: [
      mood({
        name: 'dawn', skyTop: 0x2e8f86, skyMid: 0x9edba6, skyBot: 0xf7efb4, fog: 0xcdeab0, fogNear: 50, fogFar: 430,
        sun: 0xfffbd0, sunGlow: 0xffe890, sunPos: [0.35, 0.3], hemiSky: 0xf4ffd8, hemiGround: 0x4f7a50,
        dir: 0xfff0b0, far: 0x4f9a70, far2: 0x9fd0a0, cloud: 0xf4ffe0, glow: 0.5,
      }),
      mood({
        name: 'eruption', skyTop: 0x3a1d52, skyMid: 0xc2463c, skyBot: 0xffb347, fog: 0xd97a45, fogNear: 50, fogFar: 430,
        sun: 0xffe0a0, sunGlow: 0xff6a2a, sunPos: [0.5, 0.1], sunSize: 0.15, hemiSky: 0xffb890, hemiGround: 0x5a3a48,
        dir: 0xff8a50, dirDir: [0.8, 0.3, 0.5], far: 0x6a2f45, far2: 0xb8504a, cloud: 0x8a4a5a, glow: 1, stars: 0.1,
      }),
      mood({
        name: 'night', skyTop: 0x04101c, skyMid: 0x0d3040, skyBot: 0x1f5c56, fog: 0x12403e, fogNear: 50, fogFar: 430,
        sun: 0xe8fff4, sunGlow: 0x4fb8a0, sunPos: [-0.35, 0.6], sunSize: 0.08, glowSize: 0.3,
        hemiSky: 0x5fb8a8, hemiGround: 0x0f2a2c, hemiInt: 0.95, dir: 0x8fe0d0, dirInt: 0.4, dirDir: [-0.4, 0.8, 0.5],
        far: 0x0f3038, far2: 0x1a4a4c, cloud: 0x1f4a50, stars: 0.9, glow: 1,
      }),
    ],
  },

  // ------------------------------------------------------------------- west
  west: {
    id: 'west', year: 1874, accent: 0xffb24a, music: 'west',
    terrain: {
      top: 0xe6ac6c, top2: 0xd89858, edge: 0xf6c88a,
      wall: [0xc9764a, 0xb55f3c, 0x97472f, 0x783425, 0x55221c],
    },
    mid: { style: 'mesa', low: 0xc9824e, high: 0xd9683c, cap: 0xe89a5a, capLevel: 0.6, amp: 1.1 },
    layers: [
      { style: 'mesa', z: -420, H: 105, base: -60, scroll: 0.5, step: 10 },
      { style: 'mesa', z: -720, H: 150, base: -70, scroll: 0.3, step: 16 },
      { style: 'mesa', z: -1100, H: 190, base: -80, scroll: 0.16, step: 26 },
    ],
    chasm: 0x3f8fc8,
    decor: [
      { prop: 'saguaro', per100: 5, z: [-17, -3.2], scale: [0.8, 1.4] },
      { prop: 'saguaro', per100: 9, zone: 'mid', scale: [1.2, 2] },
      { prop: 'deadTree', per100: 1.6, z: [-15, -4], scale: [0.8, 1.3] },
      { prop: 'mesaRock', per100: 4, z: [-16, -2.6], scale: [0.5, 1.8] },
      { prop: 'mesaRock', per100: 2.4, z: [1.4, 2.8], scale: [0.25, 0.45] },
      { prop: 'tuft', per100: 9, z: [-10, 2.8], scale: [0.6, 1.3] },
      { prop: 'saloon', per100: 0.7, z: [-17, -11], scale: [0.95, 1.1], spin: 0.3 },
      { prop: 'waterTower', per100: 0.45, z: [-16, -9], scale: [0.9, 1.1] },
      { prop: 'windmill', per100: 0.4, z: [-16, -8], scale: [0.9, 1.1], anim: 'windmill' },
      { prop: 'telegraph', per100: 2.2, z: [-4.2, -3.6], scale: [1, 1], spin: 0 },
      { prop: 'skull', per100: 1.2, z: [-6, -2.4], scale: [0.7, 1.1] },
    ],
    obstacles: ['barrel', 'crateStack'],
    rail: { post: 0x5a3a26, beam: 0x7a5236, glow: 0 },
    weather: 'dust', clouds: 0.5, creatures: ['vultures'],
    moods: [
      mood({
        name: 'noon', skyTop: 0x2a94d6, skyMid: 0x9bd8ef, skyBot: 0xfbe8b8, fog: 0xf2dbac,
        sun: 0xfffbe0, sunGlow: 0xffe8a0, sunPos: [0.4, 0.6], hemiSky: 0xfff6e0, hemiGround: 0xb07850,
        dir: 0xfff0c8, dirInt: 0.85, far: 0xc87a52, far2: 0xe8b890, cloud: 0xffffff, glow: 0.15,
      }),
      mood({
        name: 'sunset', skyTop: 0x4a2a6e, skyMid: 0xf0603a, skyBot: 0xffd47a, fog: 0xf39c5c,
        sun: 0xfff2b0, sunGlow: 0xff7a2a, sunPos: [0.46, 0.1], sunSize: 0.17, hemiSky: 0xffb080, hemiGround: 0x6a3a48,
        dir: 0xff8040, dirDir: [0.8, 0.25, 0.5], far: 0x7a2c36, far2: 0xc85a40, cloud: 0xff9a70, glow: 0.9, stars: 0.12,
      }),
      mood({
        name: 'night', skyTop: 0x080d2a, skyMid: 0x262a5e, skyBot: 0x6a4a70, fog: 0x2e2a54,
        sun: 0xfff8e8, sunGlow: 0x8a7ad0, sunPos: [-0.3, 0.6], sunSize: 0.085, glowSize: 0.32,
        hemiSky: 0x8a88c8, hemiGround: 0x2a2040, hemiInt: 0.95, dir: 0xb0a8ff, dirInt: 0.42, dirDir: [-0.4, 0.8, 0.5],
        far: 0x241e48, far2: 0x40305e, cloud: 0x3a3060, stars: 1, glow: 1,
      }),
    ],
  },

  // ----------------------------------------------------------------- chrome
  chrome: {
    id: 'chrome', year: 1957, accent: 0xff8fb0, music: 'chrome',
    terrain: {
      top: 0x9bd88c, top2: 0x86c97c, edge: 0xc4f0a8,
      wall: [0xd9a37a, 0xc08860, 0x9f6c4c, 0x7c513c, 0x573729],
    },
    mid: { style: 'hills', low: 0x66b890, high: 0x9bd88c, cap: 0xd8f0a8, capLevel: 0.8, amp: 0.6 },
    layers: [
      { style: 'town', z: -400, H: 65, base: -55, scroll: 0.5, step: 6 },
      { style: 'hills', z: -700, H: 125, base: -70, scroll: 0.3, step: 22 },
      { style: 'hills', z: -1100, H: 180, base: -80, scroll: 0.16, step: 34 },
    ],
    chasm: 0x4ab8d8,
    decor: [
      { prop: 'maple', per100: 6, z: [-17, -3.4], scale: [0.8, 1.4] },
      { prop: 'maple', per100: 14, zone: 'mid', scale: [1.2, 2.2] },
      { prop: 'house50', per100: 1.2, z: [-17, -10], scale: [0.95, 1.1], spin: 0.2 },
      { prop: 'house50', per100: 3, zone: 'mid', scale: [1.4, 1.9], zMax: 90 },
      { prop: 'diner', per100: 0.4, z: [-17, -11], scale: [1, 1.1], spin: 0.1 },
      { prop: 'billboard', per100: 0.7, z: [-12, -6], scale: [0.9, 1.2], spin: 0.25 },
      { prop: 'gasPump', per100: 0.6, z: [-6, -3.4], scale: [1, 1] },
      { prop: 'lamp50', per100: 1.8, z: [-3.8, -2.8], scale: [1, 1], spin: 0 },
      { prop: 'car50', per100: 0.8, z: [-9, -4.5], scale: [1, 1], spin: 0.3 },
      { prop: 'picket', per100: 3, z: [-2.9, -2.3], scale: [1, 1], spin: 0 },
      { prop: 'tuft', per100: 8, z: [-9, 2.8], scale: [0.6, 1.2] },
    ],
    obstacles: ['hydrant', 'jukebox'],
    rail: { post: 0xd8dde4, beam: 0xff8fb0, glow: 0.4 },
    weather: 'leaves', clouds: 1, creatures: ['birds', 'ufo'],
    moods: [
      mood({
        name: 'day', skyTop: 0x3fb2c8, skyMid: 0xa6e8d8, skyBot: 0xfff3cf, fog: 0xe4f3dd,
        sun: 0xfffbe6, sunGlow: 0xfff0b8, sunPos: [0.45, 0.55], hemiSky: 0xffffff, hemiGround: 0x8ab890,
        dir: 0xfff2d0, far: 0x72c0aa, far2: 0xb4e2cf, cloud: 0xffffff, glow: 0.25,
      }),
      mood({
        name: 'sunset', skyTop: 0x6a4a9e, skyMid: 0xff8faa, skyBot: 0xffd9a0, fog: 0xffba9f,
        sun: 0xfff2c8, sunGlow: 0xff8a6a, sunPos: [0.45, 0.12], sunSize: 0.15, hemiSky: 0xffc8c0, hemiGround: 0x7a5a90,
        dir: 0xff9a70, dirDir: [0.8, 0.3, 0.5], far: 0x9a5a98, far2: 0xe090a8, cloud: 0xffb0c0, glow: 0.9, stars: 0.12,
      }),
      mood({
        name: 'night', skyTop: 0x0e1640, skyMid: 0x38387c, skyBot: 0x9a5a8c, fog: 0x3a3568,
        sun: 0xfff8f0, sunGlow: 0xb080d0, sunPos: [-0.3, 0.6], sunSize: 0.085, glowSize: 0.32,
        hemiSky: 0x9a90d8, hemiGround: 0x2a2850, hemiInt: 0.95, dir: 0xc0b0ff, dirInt: 0.42, dirDir: [-0.4, 0.8, 0.5],
        far: 0x2c2a60, far2: 0x54427c, cloud: 0x4a3f78, stars: 1, glow: 1,
      }),
    ],
  },

  // ------------------------------------------------------------------- neon
  neon: {
    id: 'neon', year: 1986, accent: 0xff3fa4, music: 'neon',
    terrain: {
      top: 0x2a1458, top2: 0x241050, edge: 0x3ff6ff, grid: 0x3ff6ff,
      wall: [0x34186a, 0x2a1258, 0x1f0c44, 0x150830, 0x0b041c],
    },
    mid: { style: 'alpine', low: 0x1c0b40, high: 0x2f1466, cap: 0x4a1f88, capLevel: 0.7, amp: 0.9, wire: 0xff3fa4 },
    layers: [
      { style: 'skyline', z: -420, H: 110, base: -60, scroll: 0.5, step: 6, windows: 0xffc94a, rim: 0xff3fa4 },
      { style: 'skyline', z: -720, H: 160, base: -70, scroll: 0.3, step: 8, windows: 0x3ff6ff, rim: 0x8a3fff },
      { style: 'alpine', z: -1100, H: 230, base: -80, scroll: 0.16, step: 34, rim: 0xff3fa4 },
    ],
    chasm: 0xff2e88,
    decor: [
      { prop: 'palmNeon', per100: 5, z: [-16, -3.4], scale: [0.9, 1.4] },
      { prop: 'palmNeon', per100: 9, zone: 'mid', scale: [1.2, 2], zMax: 110 },
      { prop: 'neonSign', per100: 1.6, z: [-13, -5], scale: [0.9, 1.4], spin: 0.2 },
      { prop: 'arcadeTower', per100: 0.5, z: [-18, -13], scale: [0.55, 0.85], spin: 0.2 },
      { prop: 'arcadeTower', per100: 5, zone: 'mid', scale: [1.6, 3.2], zMax: 150 },
      { prop: 'gridPylon', per100: 2, z: [-9, -3], scale: [0.7, 1.3] },
      { prop: 'car80', per100: 0.8, z: [-8, -4.5], scale: [1, 1], spin: 0.3 },
      { prop: 'lampNeon', per100: 2, z: [-3.8, -2.8], scale: [1, 1], spin: 0 },
    ],
    obstacles: ['barrierNeon', 'arcadeCab'],
    rail: { post: 0x1a0f3a, beam: 0xff3fa4, glow: 1 },
    weather: 'bokeh', clouds: 0, creatures: [],
    moods: [
      mood({
        name: 'synthset', skyTop: 0x160a3a, skyMid: 0x8a1f80, skyBot: 0xff5f6d, midPos: 0.38, fog: 0x7a2070, fogNear: 60, fogFar: 520,
        sun: 0xffd23f, sunGlow: 0xff2e88, sunPos: [0.35, 0.2], sunSize: 0.3, glowSize: 0.9, skyStyle: 1,
        hemiSky: 0xd070ff, hemiGround: 0x3a1a6a, hemiInt: 1.05, dir: 0xff6fb0, dirInt: 0.6, dirDir: [0.7, 0.4, 0.6],
        far: 0x2a0f58, far2: 0x58187a, cloud: 0x8a2a8a, stars: 0.7, glow: 1,
      }),
      mood({
        name: 'midnight', skyTop: 0x04020e, skyMid: 0x180c48, skyBot: 0x4a1a80, midPos: 0.38, fog: 0x2a1060, fogNear: 60, fogFar: 520,
        sun: 0x3ff6ff, sunGlow: 0x3f6fff, sunPos: [-0.25, 0.5], sunSize: 0.2, glowSize: 0.7, skyStyle: 1,
        hemiSky: 0x6f7fff, hemiGround: 0x1a0f4a, hemiInt: 1.0, dir: 0x6fd8ff, dirInt: 0.55, dirDir: [-0.4, 0.7, 0.6],
        far: 0x140838, far2: 0x2c1264, cloud: 0x2a1a6a, stars: 1, glow: 1,
      }),
    ],
  },

  // ----------------------------------------------------------------- future
  future: {
    id: 'future', year: 2187, accent: 0x3fe8d0, music: 'future',
    terrain: {
      top: 0xeef4f9, top2: 0xdde8f1, edge: 0x3fe8d0, grid: 0x8fe8e0,
      wall: [0xc8d6e4, 0xa3b6cc, 0x7d92ae, 0x5a6f8e, 0x3a4c6c],
    },
    mid: { style: 'terrace', low: 0x8fa8c4, high: 0xcfdcea, cap: 0xf4f9fd, capLevel: 0.6, amp: 0.7 },
    layers: [
      { style: 'spires', z: -420, H: 160, base: -60, scroll: 0.5, step: 6, windows: 0xfff0b0 },
      { style: 'spires', z: -720, H: 220, base: -70, scroll: 0.3, step: 8, windows: 0x9ff8f0 },
      { style: 'hills', z: -1100, H: 180, base: -80, scroll: 0.16, step: 34 },
    ],
    chasm: 0x3fe8d0,
    decor: [
      { prop: 'podTree', per100: 6, z: [-17, -3.4], scale: [0.8, 1.4] },
      { prop: 'podTree', per100: 10, zone: 'mid', scale: [1.3, 2.2], zMax: 110 },
      { prop: 'tower', per100: 0.5, z: [-18, -14], scale: [0.45, 0.7] },
      { prop: 'tower', per100: 7, zone: 'mid', scale: [1.6, 3.6] },
      { prop: 'dome', per100: 0.7, z: [-16, -9], scale: [0.9, 1.3] },
      { prop: 'holoSign', per100: 1.3, z: [-11, -5], scale: [0.9, 1.3], spin: 0.25 },
      { prop: 'antenna', per100: 1.5, z: [-8, -3], scale: [0.8, 1.3] },
      { prop: 'lampFuture', per100: 2, z: [-3.8, -2.8], scale: [1, 1], spin: 0 },
    ],
    obstacles: ['drone', 'pylon'],
    rail: { post: 0xdfe8f0, beam: 0x3fe8d0, glow: 1 },
    weather: 'motes', clouds: 0.8, creatures: ['traffic'],
    moods: [
      mood({
        name: 'day', skyTop: 0x1a66cc, skyMid: 0x7fd0f2, skyBot: 0xeafffe, fog: 0xcdeefc,
        sun: 0xffffff, sunGlow: 0xd8f8ff, sunPos: [0.5, 0.58], hemiSky: 0xffffff, hemiGround: 0x90a8c8,
        dir: 0xfffaf0, far: 0x7fa6d2, far2: 0xb8d4ee, cloud: 0xffffff, glow: 0.45,
      }),
      mood({
        name: 'dusk', skyTop: 0x1a1a5e, skyMid: 0x7a4abc, skyBot: 0xff9a7a, fog: 0xc87aa0,
        sun: 0xfff0d0, sunGlow: 0xff7a8a, sunPos: [0.42, 0.14], sunSize: 0.15, hemiSky: 0xd8a8f0, hemiGround: 0x4a4a88,
        dir: 0xff9aa0, dirDir: [0.8, 0.3, 0.5], far: 0x4a3a8c, far2: 0x9a68b0, cloud: 0xc890d0, glow: 1, stars: 0.3,
      }),
      mood({
        name: 'night', skyTop: 0x02040f, skyMid: 0x0a1a3c, skyBot: 0x103c5e, fog: 0x0e2a48,
        sun: 0xe8ffff, sunGlow: 0x3fb8d8, sunPos: [-0.3, 0.6], sunSize: 0.1, glowSize: 0.36,
        hemiSky: 0x6fa8e0, hemiGround: 0x0f2040, hemiInt: 0.95, dir: 0x8fd8ff, dirInt: 0.45, dirDir: [-0.4, 0.8, 0.5],
        far: 0x0c1c3c, far2: 0x16345a, cloud: 0x1a3458, stars: 1, glow: 1,
      }),
    ],
  },

  // ------------------------------------------------------------------- void
  void: {
    id: 'void', year: Infinity, accent: 0xffcf5a, music: 'void',
    terrain: {
      top: 0x3a3160, top2: 0x2f2852, edge: 0xffcf5a, grid: 0xffcf5a,
      wall: [0x322a58, 0x272048, 0x1c1738, 0x120f28, 0x080614],
    },
    mid: { style: 'none' },
    layers: [
      { style: 'islands', z: -330, H: 120, base: -40, scroll: 0.5, step: 8, rim: 0xffcf5a },
      { style: 'islands', z: -620, H: 160, base: -30, scroll: 0.3, step: 10, rim: 0x8a5fff },
      { style: 'islands', z: -1000, H: 205, base: -20, scroll: 0.16, step: 14 },
    ],
    chasm: 0x8a5fff,
    decor: [
      { prop: 'crystal', per100: 6, z: [-16, -3], scale: [0.6, 1.8] },
      { prop: 'crystal', per100: 3, z: [1.4, 2.8], scale: [0.2, 0.4] },
      { prop: 'hourglass', per100: 0.9, z: [-15, -7], scale: [0.9, 1.5] },
      { prop: 'brokenColumn', per100: 2.2, z: [-14, -3.4], scale: [0.8, 1.4] },
      { prop: 'clockRuin', per100: 0.8, z: [-17, -9], scale: [0.9, 1.5], spin: 0.5 },
      { prop: 'gearRuin', per100: 1.6, z: [-12, -3.6], scale: [0.7, 1.5], spin: 0.6 },
    ],
    obstacles: ['shard', 'gearHalf'],
    rail: { post: 0x4a4070, beam: 0xffcf5a, glow: 1 },
    weather: 'timedust', clouds: 0, creatures: ['gears'],
    moods: [
      mood({
        name: 'nebula', skyTop: 0x080418, skyMid: 0x3a1060, skyBot: 0x0f3a70, midPos: 0.5, fog: 0x1a1048, fogNear: 60, fogFar: 600,
        sun: 0xffe9b0, sunGlow: 0xffb040, sunPos: [0.3, 0.45], sunSize: 0.16, glowSize: 0.6, skyStyle: 2,
        hemiSky: 0xa890ff, hemiGround: 0x2a1a50, hemiInt: 1.05, dir: 0xffd890, dirInt: 0.6, dirDir: [0.5, 0.6, 0.6],
        far: 0x1c1444, far2: 0x2c1c5e, cloud: 0x3a2a70, stars: 1, glow: 1,
      }),
      mood({
        name: 'collapse', skyTop: 0x100414, skyMid: 0x60102c, skyBot: 0x3a1a70, midPos: 0.5, fog: 0x30103c, fogNear: 60, fogFar: 600,
        sun: 0xfff0d0, sunGlow: 0xff5a5a, sunPos: [0.3, 0.45], sunSize: 0.18, glowSize: 0.7, skyStyle: 2,
        hemiSky: 0xff90c0, hemiGround: 0x2a1040, hemiInt: 1.05, dir: 0xffa890, dirInt: 0.6, dirDir: [0.5, 0.6, 0.6],
        far: 0x241036, far2: 0x40184e, cloud: 0x4a2058, stars: 1, glow: 1,
      }),
    ],
  },
};

export function eraYearLabel(era, lang = 'fr') {
  const y = ERAS[era].year;
  if (y === null) return String(new Date().getFullYear());
  if (y === Infinity) return '∞';
  if (y < 0) return lang === 'fr' ? '−66 000 000' : '−66,000,000';
  return String(y);
}
