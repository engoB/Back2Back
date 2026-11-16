// Original soundtrack of BACK2BACK, written as data for the step sequencer.
// One leitmotiv ("sol – do' – ti la sol") runs through every era, dressed in
// the instruments of the period: piano and strings on the mountain, drums and
// choir among the giants, guitar and whistle out west, doo-wop piano in the
// fifties, analogue synths in the eighties, glass and air in the future.
//
// Notation
//   drums / stabs:  one character per step   x hit · o accent/open · - ghost · . rest · a b c pitches
//   notes:          space separated tokens    number = scale degree · ' octave up · , octave down · _ tie · . rest
//   rel: 'key'      degrees count from the tonic (melodies) — default: from the chord root (bass, arps)
//   chords:         scale degree of the root, or { d: root, t: [chord tones] } for richer harmony
//   part options:   vol · pan (-1..1) · rev / del (sends) · hp (high-pass, Hz) · pump (ducking) ·
//                   min (plays from this intensity up) · oct · gate · tones · roll

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};

const REST16 = '. . . . . . . . . . . . . . . .';
const HOLD16 = '0 _ _ _ _ _ _ _ _ _ _ _ _ _ _ _';
const add9 = (d) => ({ d, t: [0, 2, 4, 8] });
const sev = (d) => ({ d, t: [0, 2, 4, 6] });

export const TRACKS = {
  // ------------------------------------------------------------------ menu
  // "Meridian" — felt piano, strings and a celesta under the Great Clock
  menu: {
    bpm: 76, key: 62, scale: 'major', delay: 0.75, gain: 0.95, fx: 0.25,
    chords: [add9(0), sev(4), sev(5), add9(3), add9(0), sev(4), add9(3), sev(4)],
    parts: {
      tick: { type: 'drum', inst: 'wood', pat: 'a...b...a...b...', pitches: [2300, 1850], len: 0.03, vol: 0.16, rev: 0.25, pan: 0.25 },
      piano: {
        type: 'lead', inst: 'felt', oct: -1, vol: 0.62, rev: 0.45, del: 0.12, gate: 2.6, pan: -0.12,
        seq: ['0 . 4 . 7 . 8 . 9 . 8 . 7 . 4 .', '0 . 4 . 6 . 7 . 9 . 7 . 6 . 4 .'],
      },
      pad: { type: 'pad', vol: 0.5, rev: 0.5, bright: 1000, hp: 110 },
      bass: { type: 'bass', inst: 'sub', seq: HOLD16, oct: -2, vol: 0.5 },
      bell: {
        type: 'lead', inst: 'celesta', rel: 'key', oct: 1, vol: 0.5, rev: 0.55, del: 0.3, pan: 0.18,
        seq: [
          '4 _ _ _ 7 _ _ _ 6 _ 5 _ 4 _ _ _', '2 _ _ _ 4 _ _ _ 1 _ _ _ _ _ . .',
          '4 _ _ _ 7 _ _ _ 8 _ 9 _ 8 _ _ _', '7 _ _ _ 5 _ _ _ 4 _ _ _ _ _ . .',
          '9 _ _ _ 8 _ 7 _ 9 _ _ _ 11 _ _ _', '10 _ _ _ 8 _ _ _ 6 _ _ _ _ _ . .',
          '7 _ _ _ 5 _ 7 _ 9 _ _ _ 8 _ 7 _', '8 _ _ _ _ _ _ _ 6 _ 8 _ 11 _ _ _',
        ],
      },
      strings: { type: 'pad', inst: 'ens', tones: [2, 4, 7], oct: 0, vol: 0.3, rev: 0.55, hp: 180 },
      choir: { type: 'pad', inst: 'choirOo', tones: [0, 4], oct: 0, vol: 0.2, rev: 0.6, hp: 150 },
    },
    sections: [
      { bars: 4, on: ['tick', 'piano'] },
      { bars: 8, on: ['tick', 'piano', 'pad', 'bass'] },
      { bars: 16, on: ['tick', 'piano', 'pad', 'bass', 'bell'] },
      { bars: 8, on: ['tick', 'piano', 'bass', 'strings'] },
      { bars: 16, on: ['tick', 'piano', 'bass', 'bell', 'strings', 'choir'] },
    ],
    loopFrom: 1,
  },

  // --------------------------------------------------------------- present
  // "First Tracks" — piano-led, strings underneath, a flute carrying the theme
  present: {
    bpm: 100, key: 55, scale: 'major', delay: 0.75,
    chords: [add9(0), sev(5), add9(3), 4, add9(0), sev(5), add9(3), 4, sev(5), add9(3), add9(0), 4, sev(5), add9(3), 4, 4],
    parts: {
      kick: { type: 'drum', inst: 'kick', pat: 'x.......x.x.....', vol: 0.5 },
      rim: { type: 'drum', inst: 'wood', pat: '....a.......a...', pitches: [1250], vol: 0.26, rev: 0.3, pan: -0.15 },
      hat: { type: 'drum', inst: 'hat', pat: 'x.-.x.-.x.-.x.-o', vol: 0.2, pan: 0.3 },
      shaker: { type: 'drum', inst: 'shaker', pat: '-x-x-x-x-x-x-x-x', vol: 0.24, min: 0.55, pan: -0.35 },
      bass: { type: 'bass', inst: 'sub', seq: '0 _ _ _ . . 0 . 4 _ _ _ . . 2 .', oct: -1, vol: 0.58 },
      piano: {
        type: 'lead', inst: 'piano', oct: 0, vol: 0.5, rev: 0.35, del: 0.1, gate: 2.2, pan: -0.15,
        seq: ['0 . 4 . 7 . 4 . 8 . 7 . 4 . 7 .', '0 . 4 . 7 . 4 . 9 . 7 . 4 . 2 .'],
      },
      left: { type: 'stab', inst: 'piano', pat: 'x.......x.......', tones: [0, 4, 7], oct: -1, vol: 0.34, rev: 0.3, roll: 0.014, gate: 3, pan: -0.1 },
      strings: { type: 'pad', inst: 'ens', tones: [0, 2, 4], oct: 0, vol: 0.26, rev: 0.5, hp: 170 },
      pad: { type: 'pad', vol: 0.3, rev: 0.4, bright: 1100, hp: 110 },
      flute: {
        type: 'lead', inst: 'flute', rel: 'key', oct: 1, vol: 0.46, rev: 0.45, del: 0.25, pan: 0.12,
        seq: [
          '4 _ _ _ 7 _ _ _ 6 _ 5 _ 4 _ _ _', '2 _ _ _ 4 _ _ _ 2 _ _ _ _ _ . .',
          '4 _ _ _ 7 _ _ _ 8 _ 9 _ 8 _ _ _', '7 _ _ _ 5 _ _ _ 4 _ _ _ _ _ . .',
          '9 _ _ _ 8 _ 7 _ 9 _ _ _ 11 _ _ _', '9 _ _ _ 7 _ _ _ 5 _ _ _ _ _ . .',
          '7 _ _ _ 5 _ 7 _ 9 _ _ _ 8 _ 7 _', '8 _ _ _ _ _ _ _ 6 _ 8 _ 11 _ _ _',
          '9 _ 7 _ 5 _ 7 _ 9 _ _ _ _ _ . .', '9 _ 7 _ 5 _ 7 _ 8 _ _ _ _ _ . .',
          '7 _ 4 _ 2 _ 4 _ 7 _ _ _ 9 _ _ _', '8 _ _ _ 6 _ _ _ 4 _ _ _ _ _ . .',
          '9 _ 7 _ 5 _ 7 _ 11 _ _ _ _ _ . .', '12 _ 11 _ 9 _ 7 _ 9 _ _ _ _ _ . .',
          '8 _ _ _ 6 _ _ _ 8 _ 9 _ 10 _ 11 _', '11 _ _ _ _ _ _ _ _ _ _ _ . . . .',
        ],
      },
      celesta: {
        type: 'lead', inst: 'celesta', rel: 'key', oct: 2, vol: 0.3, rev: 0.5, del: 0.35, pan: 0.3, min: 0.35,
        seq: [REST16, '. . . . . . . . . . 4 . 7 . 9 .', REST16, '. . . . . . . . . . 9 . 7 . 4 .'],
      },
    },
    sections: [
      { bars: 4, on: ['piano', 'pad'] },
      { bars: 16, on: ['kick', 'rim', 'hat', 'shaker', 'bass', 'piano', 'left', 'pad', 'celesta'] },
      { bars: 16, on: ['kick', 'rim', 'hat', 'shaker', 'bass', 'piano', 'left', 'strings', 'flute'] },
      { bars: 8, on: ['piano', 'left', 'strings', 'bass', 'celesta', 'shaker'] },
      { bars: 16, on: ['kick', 'rim', 'hat', 'shaker', 'bass', 'piano', 'left', 'strings', 'flute', 'celesta'] },
    ],
    loopFrom: 1,
  },

  // -------------------------------------------------------------- jurassic
  // "Fern Valley" — skin drums, marimba, a low choir and a breathy flute
  jurassic: {
    bpm: 104, key: 50, scale: 'dorian', delay: 0.75,
    chords: [0, 0, 6, 0, 3, 3, 0, 6],
    parts: {
      toms: { type: 'drum', inst: 'tom', pat: ['a..a..b.a..a.bb.', 'a..a..b.a.c.b.c.'], pitches: [82, 110, 147], vol: 0.5, rev: 0.25, pan: -0.1 },
      kick: { type: 'drum', inst: 'kick', pat: 'x.....x...x.....', deep: true, vol: 0.55 },
      shaker: { type: 'drum', inst: 'shaker', pat: 'x-x-x-x-x-x-x-x-', vol: 0.28, pan: 0.4 },
      clave: { type: 'drum', inst: 'wood', pat: 'a..a..a...a.a...', pitches: [1500], vol: 0.22, rev: 0.3, pan: -0.4 },
      log: { type: 'drum', inst: 'wood', pat: 'a...b..a..b.a.b.', pitches: [330, 262], len: 0.09, vol: 0.34, rev: 0.25, pan: 0.2, min: 0.4 },
      bass: { type: 'bass', inst: 'sub', seq: '0 _ _ _ _ _ 0 . 0 _ _ _ 4 _ 2 .', oct: -1, vol: 0.62 },
      choir: { type: 'pad', inst: 'choir', tones: [0, 4], oct: 0, vol: 0.3, rev: 0.55, hp: 140 },
      pad: { type: 'pad', vol: 0.3, rev: 0.4, bright: 800, hp: 100 },
      marimba: { type: 'lead', inst: 'marimba', seq: '0 . 4 . 7 4 . 2 . 4 7 . 4 . 2 .', oct: 1, vol: 0.4, rev: 0.35, del: 0.2, pan: -0.25 },
      strings: { type: 'lead', inst: 'stac', seq: '0 . 0 0 . 0 . 0 0 . 0 0 . 0 . 4', oct: 0, vol: 0.26, rev: 0.3, min: 0.5, pan: 0.15 },
      flute: {
        type: 'lead', inst: 'flute', rel: 'key', oct: 1, vol: 0.5, rev: 0.5, del: 0.3,
        seq: [
          '4 _ _ _ 7 _ _ _ 6 _ 5 _ 4 _ _ _', '2 _ 4 _ 2 _ 0 _ 1 _ _ _ _ _ . .',
          '4 _ _ _ 6 _ _ _ 8 _ 7 _ 6 _ _ _', '7 _ _ _ 4 _ _ _ 2 _ _ _ _ _ . .',
          '5 _ 6 _ 8 _ 6 _ 5 _ _ _ 3 _ _ _', '5 _ _ _ 3 _ _ _ 4 _ _ _ _ _ . .',
          '7 _ 9 _ 7 _ 4 _ 7 _ _ _ 9 _ _ _', '8 _ _ _ 6 _ _ _ 8 _ _ _ _ _ . .',
          '11 _ _ _ 9 _ 7 _ 9 _ _ _ 7 _ _ _', '8 _ 7 _ 6 _ 4 _ 6 _ _ _ _ _ . .',
          '11 _ _ _ 9 _ 7 _ 11 _ _ _ 13 _ _ _', '12 _ _ _ 10 _ _ _ 9 _ _ _ _ _ . .',
          '10 _ 8 _ 7 _ 5 _ 7 _ _ _ 5 _ _ _', '7 _ _ _ 5 _ _ _ 4 _ _ _ _ _ . .',
          '7 _ 9 _ 11 _ 9 _ 7 _ _ _ 9 _ 11 _', '11 _ _ _ _ _ _ _ _ _ _ _ . . . .',
        ],
      },
    },
    sections: [
      { bars: 4, on: ['toms', 'shaker', 'pad'] },
      { bars: 8, on: ['toms', 'shaker', 'pad', 'kick', 'bass', 'marimba', 'clave', 'log'] },
      { bars: 16, on: ['toms', 'kick', 'shaker', 'clave', 'log', 'bass', 'pad', 'marimba', 'strings', 'flute'] },
      { bars: 8, on: ['toms', 'kick', 'shaker', 'bass', 'marimba', 'choir', 'log'] },
      { bars: 16, on: ['toms', 'kick', 'shaker', 'clave', 'log', 'bass', 'choir', 'marimba', 'strings', 'flute'] },
    ],
    loopFrom: 1,
  },

  // ------------------------------------------------------------------ west
  // "Red Canyon" — strummed guitar, a whistler, a tolling bell, trumpet at dusk
  west: {
    bpm: 116, key: 57, scale: 'minor', delay: 0.75,
    chords: [0, 0, 5, 6, 0, 0, 3, 4],
    parts: {
      clop: { type: 'drum', inst: 'wood', pat: 'a.aba.aba.aba.ab', pitches: [540, 420], len: 0.04, vol: 0.3, rev: 0.2, pan: 0.25 },
      kick: { type: 'drum', inst: 'kick', pat: 'x.......x.......', vol: 0.5 },
      snare: { type: 'drum', inst: 'snare', pat: '....x.......x...', style: 'brush', vol: 0.4, rev: 0.25 },
      tamb: { type: 'drum', inst: 'shaker', pat: '..x...x...x...x.', vol: 0.32, pan: -0.3 },
      bass: { type: 'bass', inst: 'upright', seq: '0 . . . 4 . . . 0 . . . 4 . 2 .', oct: -1, vol: 0.75 },
      guitar: { type: 'strum', inst: 'pluck', pat: 'd..d.ud.d..d.ud.', tones: [0, 2, 4, 7, 9], oct: 0, vol: 0.3, rev: 0.3, bright: 0.45, gate: 2.5, pan: -0.3 },
      strings: { type: 'pad', inst: 'ens', tones: [0, 2, 4], oct: 0, vol: 0.24, rev: 0.5, hp: 170 },
      choir: { type: 'pad', inst: 'choir', tones: [0, 4], oct: 0, vol: 0.22, rev: 0.6, hp: 150, min: 0.45 },
      whistle: {
        type: 'lead', inst: 'whistle', rel: 'key', oct: 1, vol: 0.5, rev: 0.55, del: 0.3,
        seq: [
          '4 _ _ _ 7 _ _ _ 6 _ 5 _ 4 _ _ _', '2 _ _ _ 4 _ _ _ 0 _ _ _ _ _ . .',
          '5 _ _ _ 7 _ _ _ 9 _ 8 _ 7 _ _ _', '8 _ _ _ 6 _ _ _ 8 _ _ _ _ _ . .',
          '9 _ _ _ 7 _ 4 _ 9 _ _ _ 11 _ _ _', '11 _ 9 _ 7 _ 9 _ 7 _ _ _ _ _ . .',
          '10 _ _ _ 7 _ _ _ 5 _ 7 _ 10 _ _ _', '8 _ _ _ 6 _ _ _ 4 _ _ _ _ _ . .',
        ],
      },
      trumpet: {
        type: 'lead', inst: 'brass', rel: 'key', oct: 1, vol: 0.4, rev: 0.55, del: 0.2, pan: 0.2,
        seq: [
          '. . . . . . . . . . . . 4 _ 7 _', '9 _ _ _ 7 _ _ _ 4 _ _ _ _ _ . .',
          '. . . . . . . . . . . . 7 _ 9 _', '11 _ _ _ 9 _ _ _ 8 _ _ _ _ _ . .',
          '. . . . . . . . . . . . 4 _ 7 _', '11 _ _ _ 9 _ 7 _ 9 _ _ _ _ _ . .',
          '12 _ _ _ 10 _ _ _ 7 _ 10 _ 12 _ _ _', '11 _ _ _ _ _ _ _ 8 _ _ _ _ _ . .',
        ],
      },
      harmonica: { type: 'lead', inst: 'harmonica', seq: '. . . . . . . . 4 _ 2 _ 0 _ _ _', oct: 1, vol: 0.3, rev: 0.45, pan: 0.3 },
      bell: { type: 'lead', inst: 'bell', seq: [HOLD16, REST16, REST16, REST16], oct: -1, vol: 0.5, rev: 0.6 },
    },
    sections: [
      { bars: 4, on: ['clop', 'guitar', 'bell'] },
      { bars: 8, on: ['clop', 'guitar', 'kick', 'snare', 'bass', 'tamb', 'bell'] },
      { bars: 16, on: ['clop', 'guitar', 'kick', 'snare', 'bass', 'tamb', 'whistle', 'bell', 'strings'] },
      { bars: 8, on: ['clop', 'guitar', 'bass', 'harmonica', 'tamb', 'strings'] },
      { bars: 16, on: ['clop', 'guitar', 'kick', 'snare', 'bass', 'tamb', 'trumpet', 'whistle', 'bell', 'choir'] },
    ],
    loopFrom: 1,
  },

  // ---------------------------------------------------------------- chrome
  // "Chrome Fins" — 12 steps per bar: a rolling 12/8 shuffle, doo-wop piano and voices
  chrome: {
    bpm: 126, key: 60, scale: 'major', delay: 0.667,
    chords: [0, 5, 3, 4, 0, 5, 3, 4, 3, 3, 0, 0, 3, 3, 4, 4],
    parts: {
      ride: { type: 'drum', inst: 'hat', pat: 'x..x.xx..x.x', vol: 0.3, pan: 0.3 },
      kick: { type: 'drum', inst: 'kick', pat: 'x.....x.....', vol: 0.5 },
      snare: { type: 'drum', inst: 'snare', pat: '...x.....x..', style: 'brush', vol: 0.45, rev: 0.25 },
      clap: { type: 'drum', inst: 'clap', pat: '...x.....x..', vol: 0.28, rev: 0.3, min: 0.55, pan: -0.2 },
      bass: { type: 'bass', inst: 'upright', seq: ['0 . . 2 . . 4 . . 5 . .', '7 . . 5 . . 4 . . 2 . .'], oct: -2, vol: 0.85 },
      piano: { type: 'stab', inst: 'piano', pat: '.xx.xx.xx.xx', oct: 1, vol: 0.3, rev: 0.25, pan: -0.25, gate: 0.8 },
      voices: { type: 'pad', inst: 'choirOo', tones: [0, 4], oct: 0, vol: 0.28, rev: 0.45, hp: 160 },
      pad: { type: 'pad', vol: 0.22, rev: 0.4, bright: 1400, hp: 120 },
      lead: {
        type: 'lead', inst: 'organ', rel: 'key', oct: 1, vol: 0.5, rev: 0.35, del: 0.15, pan: 0.1,
        seq: [
          '4 _ _ 7 _ _ 6 _ 5 4 _ _', '2 _ _ 4 _ _ 2 _ _ _ . .',
          '5 _ _ 7 _ _ 9 _ 8 7 _ _', '8 _ _ 6 _ _ 4 _ _ _ . .',
          '9 _ _ 9 _ 8 7 _ _ 9 _ _', '7 _ _ 5 _ _ 7 _ 9 7 _ _',
          '10 _ _ 9 _ _ 7 _ _ 5 _ _', '8 _ _ _ _ _ 6 _ 8 11 _ _',
          '12 _ _ 10 _ _ 9 _ 10 12 _ _', '12 _ _ _ _ _ 10 _ _ _ . .',
          '11 _ _ 9 _ _ 7 _ 9 11 _ _', '11 _ _ _ _ _ 9 _ _ _ . .',
          '12 _ _ 10 _ _ 9 _ 10 12 _ _', '14 _ _ 12 _ _ 10 _ _ _ . .',
          '13 _ _ 11 _ _ 8 _ 11 13 _ _', '11 _ _ 10 _ _ 8 _ _ 6 _ _',
        ],
      },
    },
    sections: [
      { bars: 4, on: ['piano', 'bass', 'ride'] },
      { bars: 8, on: ['ride', 'kick', 'snare', 'bass', 'piano', 'pad'] },
      { bars: 16, on: ['ride', 'kick', 'snare', 'clap', 'bass', 'piano', 'pad', 'lead'] },
      { bars: 8, on: ['ride', 'kick', 'snare', 'clap', 'bass', 'piano', 'voices'] },
      { bars: 16, on: ['ride', 'kick', 'snare', 'clap', 'bass', 'piano', 'voices', 'lead'] },
    ],
    loopFrom: 1,
  },

  // ------------------------------------------------------------------ neon
  // "Neon Nights" — gated snare, pumping pads, arpeggios bouncing left and right
  neon: {
    bpm: 110, key: 52, scale: 'minor', delay: 0.75,
    chords: [sev(0), 5, 2, 6, sev(0), 5, sev(3), 4],
    parts: {
      kick: { type: 'drum', inst: 'kick', pat: 'x...x...x...x...', vol: 0.62 },
      snare: { type: 'drum', inst: 'snare', pat: '....x.......x...', style: 'gated', vol: 0.5, rev: 0.5 },
      clap: { type: 'drum', inst: 'clap', pat: '....x.......x...', vol: 0.24, rev: 0.4, min: 0.6 },
      hat: { type: 'drum', inst: 'hat', style: 'metal', pat: 'x-x-x-x-x-x-x-xo', vol: 0.3, pan: 0.25 },
      toms: { type: 'drum', inst: 'tom', pat: ['................', '................', '................', '..........a.b.cc'], pitches: [150, 115, 85], vol: 0.45, rev: 0.4, pan: -0.2 },
      bass: { type: 'bass', inst: 'synth', seq: "0 0 0' 0 0 0 0' 0 0 0 0' 0 0 0' 0 0'", oct: -1, vol: 0.5, gate: 0.7 },
      pad: { type: 'pad', vol: 0.5, rev: 0.45, bright: 1700, pump: 0.5, hp: 140 },
      arp: { type: 'arp', inst: 'saw', seq: '0 2 4 7 4 2 0 2 4 7 9 7 4 2 4 7', oct: 1, vol: 0.28, del: 0.4, rev: 0.25, min: 0.35, pan: 0.35 },
      arp2: { type: 'arp', inst: 'square', seq: '7 . 4 . 9 . 4 . 7 . 4 . 11 . 9 .', oct: 2, vol: 0.14, del: 0.45, rev: 0.3, min: 0.5, pan: -0.4 },
      lead: {
        type: 'lead', inst: 'saw', rel: 'key', oct: 1, vol: 0.5, rev: 0.4, del: 0.35,
        seq: [
          '4 _ _ _ 7 _ _ _ 6 _ 5 _ 4 _ _ _', '2 _ _ _ 4 _ _ _ 7 _ _ _ _ _ . .',
          '6 _ _ _ 8 _ _ _ 9 _ 8 _ 6 _ _ _', '8 _ _ _ 10 _ _ _ 8 _ _ _ 6 _ . .',
          '11 _ _ _ 9 _ 7 _ 11 _ _ _ 14 _ _ _', '12 _ _ _ 11 _ 9 _ 7 _ _ _ _ _ . .',
          '10 _ _ _ 9 _ 7 _ 5 _ 7 _ 9 _ _ _', '8 _ _ _ 6 _ _ _ 8 _ 10 _ 11 _ _ _',
        ],
      },
    },
    sections: [
      { bars: 4, on: ['pad', 'arp'] },
      { bars: 8, on: ['kick', 'hat', 'bass', 'pad', 'arp', 'toms'] },
      { bars: 16, on: 'all' },
      { bars: 4, on: ['pad', 'bass', 'snare', 'arp', 'arp2', 'toms'] },
      { bars: 16, on: 'all' },
    ],
    loopFrom: 1,
  },

  // ---------------------------------------------------------------- future
  // "Skyline 2187" — glass bells, breathing pads, voices in the clouds
  future: {
    bpm: 124, key: 58, scale: 'major', delay: 0.75,
    chords: [sev(3), add9(4), sev(5), sev(2), sev(3), add9(4), sev(5), add9(0)],
    parts: {
      kick: { type: 'drum', inst: 'kick', pat: 'x.........x.....', deep: true, vol: 0.62 },
      clap: { type: 'drum', inst: 'clap', pat: '........x.......', vol: 0.42, rev: 0.45 },
      hat: { type: 'drum', inst: 'hat', style: 'metal', pat: 'x.x.x.x.x.xxx.xo', vol: 0.24, pan: 0.3 },
      perc: { type: 'drum', inst: 'wood', pat: '...a..a....a..a.', pitches: [2600], len: 0.03, vol: 0.2, rev: 0.4, min: 0.4, pan: -0.35 },
      bass: { type: 'bass', inst: 'sub', seq: '0 _ _ _ _ _ _ _ _ _ 0 _ _ _ _ _', oct: -2, vol: 0.7 },
      pad: { type: 'pad', vol: 0.5, rev: 0.5, bright: 2300, pump: 0.6, hp: 140 },
      voices: { type: 'pad', inst: 'choirOo', tones: [0, 4], oct: 1, vol: 0.2, rev: 0.6, hp: 200, min: 0.3 },
      bells: { type: 'lead', inst: 'celesta', seq: '0 . 4 . 7 . 9 . 7 . 4 . 11 . 9 .', oct: 1, vol: 0.34, rev: 0.5, del: 0.4, pan: -0.25 },
      pluck: { type: 'arp', inst: 'square', seq: '0 4 7 4 9 4 7 4 0 4 7 4 11 4 7 4', oct: 1, vol: 0.18, del: 0.3, min: 0.45, pan: 0.35 },
      lead: {
        type: 'lead', inst: 'saw', rel: 'key', oct: 1, vol: 0.42, rev: 0.5, del: 0.4,
        seq: [
          '7 _ _ _ 5 _ _ _ 9 _ _ _ 7 _ _ _', '8 _ _ _ 6 _ _ _ 11 _ _ _ _ _ . .',
          '9 _ _ _ 7 _ 9 _ 12 _ _ _ 11 _ _ _', '11 _ _ _ 9 _ _ _ 6 _ _ _ _ _ . .',
          '7 _ _ _ 10 _ _ _ 12 _ _ _ 14 _ _ _', '13 _ _ _ 11 _ _ _ 8 _ _ _ _ _ . .',
          '12 _ _ _ 11 _ 9 _ 7 _ 9 _ 11 _ _ _', '9 _ _ _ _ _ _ _ 7 _ _ _ _ _ . .',
        ],
      },
    },
    sections: [
      { bars: 4, on: ['pad', 'bells'] },
      { bars: 8, on: ['kick', 'hat', 'bass', 'pad', 'bells', 'perc'] },
      { bars: 16, on: ['kick', 'clap', 'hat', 'perc', 'bass', 'pad', 'bells', 'pluck', 'lead'] },
      { bars: 8, on: ['kick', 'clap', 'hat', 'bass', 'pad', 'pluck', 'perc', 'voices'] },
      { bars: 16, on: 'all' },
    ],
    loopFrom: 1,
  },

  // ------------------------------------------------------------------ void
  // "The End of Time" — tolling bell, string ostinato, choir and brass over deep drums
  void: {
    bpm: 92, key: 48, scale: 'minor', delay: 0.75,
    chords: [0, 5, 3, 4, 0, 6, 5, 4],
    parts: {
      boom: { type: 'drum', inst: 'boom', pat: ['x...............', '................'], vol: 0.7, rev: 0.4 },
      timp: { type: 'drum', inst: 'tom', pat: 'a.....a.a...b.b.', pitches: [65, 87], vol: 0.55, rev: 0.3, pan: -0.15 },
      tick: { type: 'drum', inst: 'wood', pat: 'a-b-a-b-a-b-a-b-', pitches: [2400, 1900], len: 0.025, vol: 0.13, pan: 0.3 },
      snare: { type: 'drum', inst: 'snare', pat: '....x..x....x.xx', vol: 0.32, rev: 0.35, min: 0.5 },
      bass: { type: 'bass', inst: 'synth', seq: '0 _ _ _ _ _ 0 _ 0 _ _ _ _ _ 4 _', oct: -1, vol: 0.5 },
      low: { type: 'lead', inst: 'piano', seq: [HOLD16, REST16], oct: -2, vol: 0.5, rev: 0.5, gate: 1 },
      pad: { type: 'pad', vol: 0.42, rev: 0.6, bright: 850, hp: 100 },
      choir: { type: 'pad', inst: 'choir', oct: 0, vol: 0.3, rev: 0.65, hp: 140, min: 0.3 },
      strings: { type: 'lead', inst: 'stac', seq: '0 . 0 0 . 0 0 . 0 . 0 0 . 0 2 4', oct: 0, vol: 0.36, rev: 0.4, pan: -0.2 },
      bell: { type: 'lead', inst: 'bell', seq: [HOLD16, REST16, REST16, REST16], oct: -1, vol: 0.55, rev: 0.7 },
      brass: {
        type: 'lead', inst: 'brass', rel: 'key', oct: 1, vol: 0.52, rev: 0.5, del: 0.2, pan: 0.1,
        seq: [
          '4 _ _ _ 7 _ _ _ 6 _ 5 _ 4 _ _ _', '2 _ _ _ 5 _ _ _ 7 _ _ _ _ _ . .',
          '7 _ _ _ 5 _ 7 _ 10 _ _ _ 8 _ 7 _', '8 _ _ _ 6 _ _ _ 4 _ _ _ _ _ . .',
          '9 _ _ _ 7 _ 4 _ 9 _ _ _ 11 _ _ _', '10 _ _ _ 8 _ _ _ 6 _ 8 _ 10 _ _ _',
          '12 _ _ _ 11 _ 9 _ 7 _ _ _ 9 _ _ _', '8 _ _ _ _ _ _ _ 11 _ _ _ 13 _ _ _',
        ],
      },
    },
    sections: [
      { bars: 4, on: ['tick', 'pad', 'boom', 'low'] },
      { bars: 8, on: ['tick', 'pad', 'boom', 'timp', 'strings', 'bass', 'low'] },
      { bars: 16, on: ['boom', 'timp', 'tick', 'snare', 'bass', 'low', 'pad', 'strings', 'bell', 'brass'] },
      { bars: 8, on: ['tick', 'boom', 'timp', 'strings', 'bass', 'bell', 'choir', 'low'] },
      { bars: 16, on: ['boom', 'timp', 'tick', 'snare', 'bass', 'low', 'choir', 'strings', 'bell', 'brass'] },
    ],
    loopFrom: 1,
  },

  // ---------------------------------------------------------- cinematics
  storm: {
    bpm: 60, key: 50, scale: 'minor', delay: 0.75, gain: 1, fx: 0.3,
    chords: [0, 0, 5, 4],
    parts: {
      pad: { type: 'pad', vol: 0.55, rev: 0.6, bright: 620, hp: 90 },
      bass: { type: 'bass', inst: 'sub', seq: HOLD16, oct: -2, vol: 0.5 },
      tick: { type: 'drum', inst: 'wood', pat: 'a...b...a...b...', pitches: [2300, 1850], len: 0.03, vol: 0.2, rev: 0.3, pan: 0.25 },
      boom: { type: 'drum', inst: 'boom', pat: ['x...............', '................', '................', '........x.......'], vol: 0.6, rev: 0.5 },
      bell: {
        type: 'lead', inst: 'bell', rel: 'key', oct: 1, vol: 0.4, rev: 0.7, del: 0.4,
        seq: ['4 _ _ _ _ _ _ _ 7 _ _ _ _ _ _ _', REST16, '6 _ _ _ 5 _ _ _ 4 _ _ _ _ _ _ _', REST16],
      },
      strings: { type: 'pad', inst: 'ens', tones: [0, 2], oct: 0, vol: 0.3, rev: 0.6, hp: 160 },
      choir: { type: 'pad', inst: 'choirOo', tones: [0, 4], oct: 0, vol: 0.2, rev: 0.7, hp: 140 },
    },
    sections: [{ bars: 4, on: ['pad', 'tick', 'boom', 'bass'] }, { bars: 8, on: ['tick', 'boom', 'bass', 'bell', 'strings', 'choir'] }],
    loopFrom: 1,
  },

  victory: {
    bpm: 104, key: 62, scale: 'major', delay: 0.75,
    chords: [0, 3, 4, 0, 5, 3, 4, 0],
    parts: {
      kick: { type: 'drum', inst: 'kick', pat: 'x...x...x...x...', vol: 0.55 },
      snare: { type: 'drum', inst: 'snare', pat: '....x.......x.xx', vol: 0.4, rev: 0.3 },
      hat: { type: 'drum', inst: 'hat', pat: 'x.x.x.x.x.x.x.xo', vol: 0.22, pan: 0.3 },
      timp: { type: 'drum', inst: 'tom', pat: 'a.......a.....b.', pitches: [73, 110], vol: 0.5, rev: 0.3, pan: -0.15 },
      bass: { type: 'bass', inst: 'synth', seq: '0 _ _ _ 0 _ 4 _ 0 _ _ _ 4 _ 2 _', oct: -2, vol: 0.5 },
      pad: { type: 'pad', vol: 0.36, rev: 0.5, bright: 1800, hp: 120 },
      piano: { type: 'stab', inst: 'piano', pat: 'x...x.x...x.x...', tones: [0, 2, 4, 7], oct: 0, vol: 0.32, rev: 0.35, roll: 0.012, gate: 1.6, pan: -0.2 },
      harp: { type: 'pluck', seq: '0 2 4 7 9 7 4 2 0 2 4 7 9 11 9 7', oct: 0, vol: 0.28, rev: 0.4, del: 0.2, bright: 0.6, pan: 0.3 },
      strings: { type: 'pad', inst: 'ens', tones: [0, 2, 4], oct: 1, vol: 0.26, rev: 0.5, hp: 200 },
      choir: { type: 'pad', inst: 'choir', tones: [0, 4], oct: 0, vol: 0.24, rev: 0.6, hp: 150 },
      brass: {
        type: 'lead', inst: 'brass', rel: 'key', oct: 1, vol: 0.52, rev: 0.45, del: 0.2,
        seq: [
          '4 _ _ _ 7 _ _ _ 6 _ 5 _ 4 _ _ _', '5 _ _ _ 7 _ _ _ 10 _ _ _ _ _ . .',
          '8 _ _ _ 6 _ 8 _ 11 _ _ _ 8 _ _ _', '9 _ _ _ _ _ _ _ 7 _ _ _ _ _ . .',
          '9 _ _ _ 7 _ 5 _ 9 _ _ _ 12 _ _ _', '12 _ _ _ 10 _ 7 _ 10 _ _ _ _ _ . .',
          '11 _ _ _ 8 _ _ _ 11 _ 13 _ 15 _ _ _', '14 _ _ _ _ _ _ _ _ _ _ _ . . . .',
        ],
      },
    },
    sections: [
      { bars: 8, on: ['kick', 'snare', 'hat', 'timp', 'bass', 'piano', 'harp', 'strings', 'brass'] },
      { bars: 8, on: ['kick', 'hat', 'bass', 'pad', 'harp', 'timp', 'piano'] },
      { bars: 8, on: ['kick', 'snare', 'hat', 'timp', 'bass', 'piano', 'harp', 'strings', 'choir', 'brass'] },
    ],
    loopFrom: 0,
  },
};
