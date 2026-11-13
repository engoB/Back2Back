// The seven worlds of BACK2BACK. Everything visual about an era is data:
// sky moods, the track gradient, the ridges stacked behind it, scenery
// species, obstacles, weather and music. Shapes are flat silhouettes tinted by
// the mood; `hemiSky`/`dir` describe that ambient tint.

/** Mood defaults (each era mood overrides what it needs). */
const MOOD = {
  midPos: 0.42, fogNear: 40, fogFar: 300, sunSize: 0.11, glowSize: 0.55,
  sunPos: [0.45, 0.42], hemiInt: 1.0, dirInt: 0.75, dirDir: [0.5, 0.8, 0.6],
  stars: 0, glow: 0.35, cloudAmt: 1, skyStyle: 0,
};
const mood = (o) => ({ ...MOOD, ...o });

export const ERA_ORDER = ['present', 'jurassic', 'west', 'chrome', 'neon', 'future', 'void'];

export const ERAS = {
  // ---------------------------------------------------------------- present
  present: {
    id: 'present', year: null, accent: 0x6fd3ff, music: 'present',
    terrain: { edge: 0xffffff, fill: [0xf8fbff, 0xe1ebf7, 0xbfd2ea, 0x9ab5d8, 0x7f9ec8] },
    ridges: [
      { style: 'roll', z: -12, base: -2.6, amp: 3.6, wave: 80, color: 0xd3e0f1, fade: 30 },
      { style: 'roll', z: -40, base: 1.5, amp: 9, wave: 150, color: 0xbccfe8, fade: 50 },
      { style: 'alpine', z: -110, base: -10, amp: 38, color: 0xa9c0df, fade: 70, step: 4 },
    ],
    layers: [
      { style: 'alpine', z: -420, H: 120, base: -60, scroll: 0.5, step: 14 },
      { style: 'alpine', z: -700, H: 170, base: -70, scroll: 0.3, step: 22 },
      { style: 'alpine', z: -1100, H: 250, base: -80, scroll: 0.16, step: 34 },
    ],
    decor: [
      { prop: 'pine', per100: 7, z: [-4.5, -1.4], scale: [0.7, 1.4] },
      { prop: 'pine', per100: 10, ridge: 0, scale: [0.9, 1.6] },
      { prop: 'pine', per100: 12, ridge: 1, scale: [1.4, 2.4] },
      { prop: 'rockSnow', per100: 2.5, z: [-3, -1.2], scale: [0.6, 1.4] },
      { prop: 'chalet', per100: 0.9, ridge: 0, scale: [0.9, 1.15], spin: 0.25 },
      { prop: 'chalet', per100: 0.45, z: [-8, -5.5], scale: [0.9, 1.1], spin: 0.25 },
      { prop: 'lamp', per100: 1.5, z: [-1.6, -1.2], scale: [1, 1], spin: 0 },
      { prop: 'fence', per100: 2.2, z: [-1.5, -1.1], scale: [1, 1], spin: 0 },
    ],
    chasm: 0x2b4d7e,
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
    terrain: { edge: 0xc4f284, fill: [0x74c25a, 0x52a24e, 0x3d8048, 0x2c6042, 0x1f4a3a] },
    ridges: [
      { style: 'jungle', z: -12, base: -7, amp: 9, color: 0x4a9a4c, fade: 26, step: 2 },
      { style: 'roll', z: -40, base: 3, amp: 10, wave: 140, color: 0x3f8a58, fade: 50 },
      { style: 'hills', z: -110, base: -20, amp: 44, color: 0x4f9a72, fade: 70 },
    ],
    layers: [
      { style: 'jungle', z: -380, H: 95, base: -60, scroll: 0.5, step: 9 },
      { style: 'volcano', z: -700, H: 200, base: -70, scroll: 0.3, step: 20 },
      { style: 'hills', z: -1100, H: 200, base: -80, scroll: 0.16, step: 34 },
    ],
    decor: [
      { prop: 'fern', per100: 12, z: [-3, -1.2], scale: [0.7, 1.6] },
      { prop: 'cycad', per100: 5, z: [-5, -1.6], scale: [0.8, 1.5] },
      { prop: 'cycad', per100: 8, ridge: 0, scale: [1, 1.8] },
      { prop: 'giantTree', per100: 1.5, z: [-8, -5], scale: [0.9, 1.4] },
      { prop: 'giantTree', per100: 5, ridge: 0, scale: [1, 1.6] },
      { prop: 'giantTree', per100: 6, ridge: 1, scale: [1.6, 2.6] },
      { prop: 'mushroom', per100: 2.5, z: [-3, -1.3], scale: [0.6, 1.5] },
      { prop: 'ribcage', per100: 0.6, z: [-6, -4], scale: [0.9, 1.3], spin: 0.3 },
      { prop: 'sauropod', per100: 0.35, ridge: 1, scale: [1.6, 2.4], spin: 0.25 },
    ],
    chasm: 0xff5a1f,
    obstacles: ['boulderMoss', 'eggNest'],
    rail: { post: 0x4a3526, beam: 0x6a8a3a, glow: 0, vine: true },
    weather: 'pollen', clouds: 0.7, creatures: ['pteros'],
    moods: [
      mood({
        name: 'dawn', skyTop: 0x2e8f86, skyMid: 0x9edba6, skyBot: 0xf7efb4, fog: 0xcdeab0,
        sun: 0xfffbd0, sunGlow: 0xffe890, sunPos: [0.35, 0.3], hemiSky: 0xf4ffd8, hemiGround: 0x4f7a50,
        dir: 0xfff0b0, far: 0x4f9a70, far2: 0x9fd0a0, cloud: 0xf4ffe0, glow: 0.5,
      }),
      mood({
        name: 'eruption', skyTop: 0x3a1d52, skyMid: 0xc2463c, skyBot: 0xffb347, fog: 0xd97a45,
        sun: 0xffe0a0, sunGlow: 0xff6a2a, sunPos: [0.5, 0.1], sunSize: 0.15, hemiSky: 0xffb890, hemiGround: 0x5a3a48,
        dir: 0xff8a50, dirDir: [0.8, 0.3, 0.5], far: 0x6a2f45, far2: 0xb8504a, cloud: 0x8a4a5a, glow: 1, stars: 0.1,
      }),
      mood({
        name: 'night', skyTop: 0x04101c, skyMid: 0x0d3040, skyBot: 0x1f5c56, fog: 0x12403e,
        sun: 0xe8fff4, sunGlow: 0x4fb8a0, sunPos: [-0.35, 0.6], sunSize: 0.08, glowSize: 0.3,
        hemiSky: 0x5fb8a8, hemiGround: 0x0f2a2c, hemiInt: 0.95, dir: 0x8fe0d0, dirInt: 0.4, dirDir: [-0.4, 0.8, 0.5],
        far: 0x0f3038, far2: 0x1a4a4c, cloud: 0x1f4a50, stars: 0.9, glow: 1,
      }),
    ],
  },

  // ------------------------------------------------------------------- west
  west: {
    id: 'west', year: 1874, accent: 0xffb24a, music: 'west',
    terrain: { edge: 0xffdca6, fill: [0xe8b070, 0xd48e56, 0xb96a42, 0x984e36, 0x763a2c] },
    ridges: [
      { style: 'roll', z: -12, base: -2.6, amp: 3, wave: 90, color: 0xdc965c, fade: 30 },
      { style: 'mesa', z: -42, base: -8, amp: 22, color: 0xd07c4c, fade: 36, step: 3 },
      { style: 'mesa', z: -110, base: -14, amp: 40, color: 0xc97250, fade: 60, step: 4 },
    ],
    layers: [
      { style: 'mesa', z: -420, H: 105, base: -60, scroll: 0.5, step: 10 },
      { style: 'mesa', z: -720, H: 150, base: -70, scroll: 0.3, step: 16 },
      { style: 'mesa', z: -1100, H: 190, base: -80, scroll: 0.16, step: 26 },
    ],
    decor: [
      { prop: 'saguaro', per100: 4, z: [-5, -1.5], scale: [0.8, 1.4] },
      { prop: 'saguaro', per100: 6, ridge: 0, scale: [1, 1.6] },
      { prop: 'deadTree', per100: 1.4, z: [-5, -2], scale: [0.8, 1.3] },
      { prop: 'mesaRock', per100: 3.5, z: [-3, -1.2], scale: [0.5, 1.6] },
      { prop: 'tuft', per100: 9, z: [-2.5, -1.1], scale: [0.6, 1.3] },
      { prop: 'saloon', per100: 0.6, ridge: 0, scale: [0.95, 1.1], spin: 0.15 },
      { prop: 'saloon', per100: 0.3, z: [-8, -6], scale: [0.95, 1.1], spin: 0.15 },
      { prop: 'waterTower', per100: 0.4, ridge: 0, scale: [0.9, 1.1] },
      { prop: 'windmill', per100: 0.35, ridge: 0, scale: [0.9, 1.1], anim: 'windmill', spin: 0.2 },
      { prop: 'telegraph', per100: 2, z: [-2, -1.6], scale: [1, 1], spin: 0 },
      { prop: 'skull', per100: 1, z: [-2.5, -1.2], scale: [0.7, 1.1] },
    ],
    chasm: 0x3f8fc8,
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
    terrain: { edge: 0xdcf8bc, fill: [0x9fdc90, 0x7fc882, 0x62ac7a, 0x4a8e70, 0x387264] },
    ridges: [
      { style: 'roll', z: -12, base: -2.6, amp: 3.6, wave: 85, color: 0x8cd088, fade: 30 },
      { style: 'roll', z: -40, base: 2, amp: 9, wave: 150, color: 0x7ac090, fade: 50 },
      { style: 'town', z: -110, base: -16, amp: 34, color: 0x76c4ae, fade: 60 },
    ],
    layers: [
      { style: 'town', z: -400, H: 65, base: -55, scroll: 0.5, step: 6 },
      { style: 'hills', z: -700, H: 125, base: -70, scroll: 0.3, step: 22 },
      { style: 'hills', z: -1100, H: 180, base: -80, scroll: 0.16, step: 34 },
    ],
    decor: [
      { prop: 'maple', per100: 5, z: [-5, -1.6], scale: [0.8, 1.4] },
      { prop: 'maple', per100: 8, ridge: 0, scale: [1, 1.6] },
      { prop: 'maple', per100: 10, ridge: 1, scale: [1.6, 2.4] },
      { prop: 'house50', per100: 1, ridge: 0, scale: [0.95, 1.1], spin: 0.15 },
      { prop: 'house50', per100: 0.45, z: [-8, -6], scale: [0.95, 1.1], spin: 0.15 },
      { prop: 'house50', per100: 2, ridge: 1, scale: [1.6, 2.2], spin: 0.15 },
      { prop: 'diner', per100: 0.35, ridge: 0, scale: [1, 1.1], spin: 0.1 },
      { prop: 'billboard', per100: 0.6, z: [-6, -3], scale: [0.9, 1.2], spin: 0.15 },
      { prop: 'gasPump', per100: 0.5, z: [-2.5, -1.6], scale: [1, 1], spin: 0.2 },
      { prop: 'lamp50', per100: 1.6, z: [-1.8, -1.3], scale: [1, 1], spin: 0 },
      { prop: 'car50', per100: 0.7, z: [-3.5, -2], scale: [1, 1], spin: 0.1 },
      { prop: 'picket', per100: 2.6, z: [-1.5, -1.1], scale: [1, 1], spin: 0 },
      { prop: 'tuft', per100: 8, z: [-2.5, -1.1], scale: [0.6, 1.2] },
    ],
    chasm: 0x4ab8d8,
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
    terrain: { edge: 0x3ff6ff, fill: [0x2c155c, 0x241052, 0x1c0c46, 0x15083a, 0x0e052a], grid: 0x3ff6ff, gridAlpha: 0.55 },
    ridges: [
      { style: 'roll', z: -12, base: -2.6, amp: 3, wave: 90, color: 0x2a1262, fade: 30, rim: 0xff3fa4, rimAmt: 0.9, rimW: 0.5 },
      { style: 'skyline', z: -45, base: -10, amp: 30, color: 0x1f0d4c, fade: 50, windows: 0xffc94a, winSize: [2.2, 3], rim: 0xff3fa4, rimAmt: 0.7, rimW: 0.5 },
      { style: 'alpine', z: -110, base: -12, amp: 40, color: 0x2c1060, fade: 70, step: 4, rim: 0xff3fa4, rimAmt: 0.8, rimW: 0.9 },
    ],
    layers: [
      { style: 'skyline', z: -420, H: 110, base: -60, scroll: 0.5, step: 6, windows: 0xffc94a, rim: 0xff3fa4, rimAmt: 1 },
      { style: 'skyline', z: -720, H: 160, base: -70, scroll: 0.3, step: 8, windows: 0x3ff6ff, rim: 0x8a3fff, rimAmt: 1 },
      { style: 'alpine', z: -1100, H: 230, base: -80, scroll: 0.16, step: 34, rim: 0xff3fa4, rimAmt: 1 },
    ],
    decor: [
      { prop: 'palmNeon', per100: 4, z: [-5, -1.6], scale: [0.9, 1.4] },
      { prop: 'palmNeon', per100: 6, ridge: 0, scale: [1, 1.6] },
      { prop: 'neonSign', per100: 1.4, z: [-6, -3], scale: [0.9, 1.4], spin: 0.15 },
      { prop: 'arcadeTower', per100: 1, ridge: 0, scale: [0.7, 1.1], spin: 0.1 },
      { prop: 'gridPylon', per100: 1.6, z: [-4, -2], scale: [0.7, 1.3] },
      { prop: 'car80', per100: 0.7, z: [-3.5, -2], scale: [1, 1], spin: 0.1 },
      { prop: 'lampNeon', per100: 1.8, z: [-1.8, -1.3], scale: [1, 1], spin: 0 },
    ],
    chasm: 0xff2e88,
    obstacles: ['barrierNeon', 'arcadeCab'],
    rail: { post: 0x1a0f3a, beam: 0xff3fa4, glow: 1 },
    weather: 'bokeh', clouds: 0, creatures: [],
    moods: [
      mood({
        name: 'synthset', skyTop: 0x160a3a, skyMid: 0x8a1f80, skyBot: 0xff5f6d, midPos: 0.38, fog: 0x7a2070,
        sun: 0xffd23f, sunGlow: 0xff2e88, sunPos: [0.35, 0.2], sunSize: 0.3, glowSize: 0.9, skyStyle: 1,
        hemiSky: 0xd070ff, hemiGround: 0x3a1a6a, hemiInt: 1.05, dir: 0xff6fb0, dirInt: 0.6, dirDir: [0.7, 0.4, 0.6],
        far: 0x2a0f58, far2: 0x58187a, cloud: 0x8a2a8a, stars: 0.7, glow: 1,
      }),
      mood({
        name: 'midnight', skyTop: 0x04020e, skyMid: 0x180c48, skyBot: 0x4a1a80, midPos: 0.38, fog: 0x2a1060,
        sun: 0x3ff6ff, sunGlow: 0x3f6fff, sunPos: [-0.25, 0.5], sunSize: 0.2, glowSize: 0.7, skyStyle: 1,
        hemiSky: 0x6f7fff, hemiGround: 0x1a0f4a, hemiInt: 1.0, dir: 0x6fd8ff, dirInt: 0.55, dirDir: [-0.4, 0.7, 0.6],
        far: 0x140838, far2: 0x2c1264, cloud: 0x2a1a6a, stars: 1, glow: 1,
      }),
    ],
  },

  // ----------------------------------------------------------------- future
  future: {
    id: 'future', year: 2187, accent: 0x3fe8d0, music: 'future',
    terrain: { edge: 0xffffff, fill: [0xeff5fa, 0xd8e3ee, 0xb8c9dc, 0x98adc8, 0x7d96b6], grid: 0x6fded4, gridAlpha: 0.3 },
    ridges: [
      { style: 'roll', z: -12, base: -2.6, amp: 3, wave: 90, color: 0xdde8f2, fade: 30 },
      { style: 'spires', z: -45, base: -10, amp: 34, color: 0xc6d6e8, fade: 50, windows: 0xfff0b0, winSize: [2.2, 3] },
      { style: 'spires', z: -110, base: -14, amp: 52, color: 0xacc6e2, fade: 70, windows: 0x9ff8f0, winSize: [3.2, 4.2] },
    ],
    layers: [
      { style: 'spires', z: -420, H: 160, base: -60, scroll: 0.5, step: 6, windows: 0xfff0b0 },
      { style: 'spires', z: -720, H: 220, base: -70, scroll: 0.3, step: 8, windows: 0x9ff8f0 },
      { style: 'hills', z: -1100, H: 180, base: -80, scroll: 0.16, step: 34 },
    ],
    decor: [
      { prop: 'podTree', per100: 5, z: [-5, -1.6], scale: [0.8, 1.4] },
      { prop: 'podTree', per100: 7, ridge: 0, scale: [1, 1.6] },
      { prop: 'tower', per100: 1, ridge: 0, scale: [0.5, 0.8] },
      { prop: 'dome', per100: 0.6, ridge: 0, scale: [0.9, 1.3] },
      { prop: 'holoSign', per100: 1.2, z: [-6, -3], scale: [0.9, 1.3], spin: 0.15 },
      { prop: 'antenna', per100: 1.4, z: [-5, -2], scale: [0.8, 1.3] },
      { prop: 'lampFuture', per100: 1.8, z: [-1.8, -1.3], scale: [1, 1], spin: 0 },
    ],
    chasm: 0x3fe8d0,
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
    terrain: { edge: 0xffcf5a, fill: [0x3c3364, 0x302856, 0x241e46, 0x1a1538, 0x110d2a], grid: 0xffcf5a, gridAlpha: 0.3 },
    ridges: [
      { style: 'roll', z: -12, base: -7, amp: 4, wave: 70, color: 0x2e2756, fade: 30, rim: 0xffcf5a, rimAmt: 0.35, rimW: 0.4 },
      { style: 'islands', z: -45, base: 6, amp: 40, color: 0x2a2150, fade: 40, rim: 0xffcf5a, rimAmt: 0.6, rimW: 0.8 },
      { style: 'islands', z: -110, base: 14, amp: 80, color: 0x241a4a, fade: 60, rim: 0x8a5fff, rimAmt: 0.7, rimW: 1.4 },
    ],
    layers: [
      { style: 'islands', z: -330, H: 120, base: -40, scroll: 0.5, step: 8, rim: 0xffcf5a, rimAmt: 1 },
      { style: 'islands', z: -620, H: 160, base: -30, scroll: 0.3, step: 10, rim: 0x8a5fff, rimAmt: 1 },
      { style: 'islands', z: -1000, H: 205, base: -20, scroll: 0.16, step: 14 },
    ],
    decor: [
      { prop: 'crystal', per100: 5, z: [-4, -1.3], scale: [0.6, 1.8] },
      { prop: 'crystal', per100: 4, ridge: 0, scale: [1, 2.4] },
      { prop: 'hourglass', per100: 0.8, z: [-7, -4], scale: [0.9, 1.5] },
      { prop: 'brokenColumn', per100: 2, z: [-5, -1.6], scale: [0.8, 1.4] },
      { prop: 'clockRuin', per100: 0.7, z: [-8, -5], scale: [0.9, 1.5], spin: 0.4 },
      { prop: 'gearRuin', per100: 1.4, z: [-4, -1.6], scale: [0.7, 1.5], spin: 0.5 },
    ],
    chasm: 0x8a5fff,
    obstacles: ['shard', 'gearHalf'],
    rail: { post: 0x4a4070, beam: 0xffcf5a, glow: 1 },
    weather: 'timedust', clouds: 0, creatures: ['gears'],
    moods: [
      mood({
        name: 'nebula', skyTop: 0x080418, skyMid: 0x3a1060, skyBot: 0x0f3a70, midPos: 0.5, fog: 0x1a1048,
        sun: 0xffe9b0, sunGlow: 0xffb040, sunPos: [0.3, 0.45], sunSize: 0.16, glowSize: 0.6, skyStyle: 2,
        hemiSky: 0xa890ff, hemiGround: 0x2a1a50, hemiInt: 1.05, dir: 0xffd890, dirInt: 0.6, dirDir: [0.5, 0.6, 0.6],
        far: 0x1c1444, far2: 0x2c1c5e, cloud: 0x3a2a70, stars: 1, glow: 1,
      }),
      mood({
        name: 'collapse', skyTop: 0x100414, skyMid: 0x60102c, skyBot: 0x3a1a70, midPos: 0.5, fog: 0x30103c,
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
