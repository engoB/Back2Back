// Original soundtrack of BACK2BACK, written as data for the step sequencer.
// One leitmotiv ("sol – do' – ti la sol") runs through every era, dressed in
// the instruments of the period.
//
// Notation
//   drums / stabs:  one character per step   x hit · o accent/open · - ghost · . rest · a b c pitches
//   notes:          space separated tokens    number = scale degree · ' octave up · , octave down · _ tie · . rest
//   rel: 'key'  degrees count from the tonic (melodies)   — default: from the chord root (bass, arps)

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};

const REST16 = '. . . . . . . . . . . . . . . .';
const HOLD16 = '0 _ _ _ _ _ _ _ _ _ _ _ _ _ _ _';

export const TRACKS = {
  // ------------------------------------------------------------------ menu
  menu: {
    bpm: 76, key: 62, scale: 'major', delay: 0.75, gain: 0.95,
    chords: [0, 4, 5, 3, 0, 4, 3, 4],
    parts: {
      tick: { type: 'drum', inst: 'wood', pat: 'a...b...a...b...', pitches: [2300, 1850], len: 0.03, vol: 0.2, rev: 0.25 },
      pad: { type: 'pad', vol: 0.55, rev: 0.5, bright: 1100 },
      bass: { type: 'bass', inst: 'sub', seq: HOLD16, oct: -2, vol: 0.5 },
      harp: { type: 'pluck', seq: '0 . 4 . 7 . 9 . 11 . 9 . 7 . 4 .', oct: -1, vol: 0.5, rev: 0.45, del: 0.2, bright: 0.55, gate: 2 },
      bell: {
        type: 'lead', inst: 'bell', rel: 'key', vol: 0.55, rev: 0.5, del: 0.3,
        seq: [
          '4 _ _ _ 7 _ _ _ 6 _ 5 _ 4 _ _ _', '2 _ _ _ 4 _ _ _ 1 _ _ _ _ _ . .',
          '4 _ _ _ 7 _ _ _ 8 _ 9 _ 8 _ _ _', '7 _ _ _ 5 _ _ _ 4 _ _ _ _ _ . .',
          '9 _ _ _ 8 _ 7 _ 9 _ _ _ 11 _ _ _', '10 _ _ _ 8 _ _ _ 6 _ _ _ _ _ . .',
          '7 _ _ _ 5 _ 7 _ 9 _ _ _ 8 _ 7 _', '8 _ _ _ _ _ _ _ 6 _ 8 _ 11 _ _ _',
        ],
      },
      strings: { type: 'lead', inst: 'strings', seq: '2 _ _ _ _ _ _ _ 4 _ _ _ _ _ _ _', vol: 0.36, rev: 0.5 },
    },
    sections: [
      { bars: 4, on: ['tick', 'pad'] },
      { bars: 8, on: ['tick', 'pad', 'harp', 'bass'] },
      { bars: 16, on: ['tick', 'pad', 'harp', 'bass', 'bell'] },
      { bars: 8, on: ['tick', 'pad', 'harp', 'bass', 'strings'] },
      { bars: 16, on: 'all' },
    ],
    loopFrom: 1,
  },

  // --------------------------------------------------------------- present
  present: {
    bpm: 100, key: 55, scale: 'major', delay: 0.75,
    chords: [0, 5, 3, 4, 0, 5, 3, 4, 5, 3, 0, 4, 5, 3, 4, 4],
    parts: {
      kick: { type: 'drum', inst: 'kick', pat: 'x.......x.x.....', vol: 0.55 },
      rim: { type: 'drum', inst: 'wood', pat: '....a.......a...', pitches: [1250], vol: 0.3, rev: 0.3 },
      hat: { type: 'drum', inst: 'hat', pat: 'x.-.x.-.x.-.x.-o', vol: 0.3 },
      shaker: { type: 'drum', inst: 'shaker', pat: '-x-x-x-x-x-x-x-x', vol: 0.3, min: 0.55 },
      bass: { type: 'bass', inst: 'sub', seq: '0 _ _ _ . . 0 . 4 _ _ _ . . 2 .', oct: -1, vol: 0.6 },
      pad: { type: 'pad', vol: 0.42, rev: 0.4, bright: 1300 },
      keys: { type: 'stab', inst: 'epiano', pat: '..x...x...x..x..', oct: 0, vol: 0.34, rev: 0.3 },
      harp: { type: 'pluck', seq: '0 4 7 9 7 4 0 4 7 9 7 4 9 7 4 7', oct: 0, vol: 0.26, rev: 0.4, del: 0.25, bright: 0.6, min: 0.3 },
      flute: {
        type: 'lead', inst: 'flute', rel: 'key', oct: 1, vol: 0.5, rev: 0.45, del: 0.25,
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
    },
    sections: [
      { bars: 4, on: ['pad', 'harp'] },
      { bars: 16, on: ['kick', 'rim', 'hat', 'shaker', 'bass', 'pad', 'keys', 'harp'] },
      { bars: 16, on: 'all' },
      { bars: 8, on: ['kick', 'hat', 'bass', 'pad', 'harp', 'shaker'] },
      { bars: 16, on: 'all' },
    ],
    loopFrom: 1,
  },

  // -------------------------------------------------------------- jurassic
  jurassic: {
    bpm: 104, key: 50, scale: 'dorian', delay: 0.75,
    chords: [0, 0, 6, 0, 3, 3, 0, 6],
    parts: {
      toms: { type: 'drum', inst: 'tom', pat: ['a..a..b.a..a.bb.', 'a..a..b.a.c.b.c.'], pitches: [82, 110, 147], vol: 0.5, rev: 0.2 },
      kick: { type: 'drum', inst: 'kick', pat: 'x.....x...x.....', deep: true, vol: 0.55 },
      shaker: { type: 'drum', inst: 'shaker', pat: 'x-x-x-x-x-x-x-x-', vol: 0.32 },
      clave: { type: 'drum', inst: 'wood', pat: 'a..a..a...a.a...', pitches: [1500], vol: 0.26, rev: 0.3 },
      bass: { type: 'bass', inst: 'sub', seq: '0 _ _ _ _ _ 0 . 0 _ _ _ 4 _ 2 .', oct: -1, vol: 0.62 },
      pad: { type: 'pad', vol: 0.36, rev: 0.4, bright: 850 },
      marimba: { type: 'lead', inst: 'marimba', seq: '0 . 4 . 7 4 . 2 . 4 7 . 4 . 2 .', oct: 1, vol: 0.42, rev: 0.35, del: 0.2 },
      flute: {
        type: 'lead', inst: 'flute', rel: 'key', oct: 1, vol: 0.5, rev: 0.5, del: 0.3,
        seq: [
          '4 _ _ _ 7 _ _ _ 6 _ 5 _ 4 _ _ _', '2 _ 4 _ 2 _ 0 _ 1 _ _ _ _ _ . .',
          '4 _ _ _ 6 _ _ _ 8 _ 7 _ 6 _ _ _', '7 _ _ _ 4 _ _ _ 2 _ _ _ _ _ . .',
          '5 _ 6 _ 8 _ 6 _ 5 _ _ _ 3 _ _ _', '5 _ _ _ 3 _ _ _ 4 _ _ _ _ _ . .',
          '7 _ 9 _ 7 _ 4 _ 7 _ _ _ 9 _ _ _', '8 _ _ _ 6 _ _ _ 8 _ _ _ _ _ . .',
        ],
      },
    },
    sections: [
      { bars: 4, on: ['toms', 'shaker', 'pad'] },
      { bars: 8, on: ['toms', 'shaker', 'pad', 'kick', 'bass', 'marimba', 'clave'] },
      { bars: 16, on: 'all' },
      { bars: 8, on: ['toms', 'kick', 'shaker', 'bass', 'marimba'] },
      { bars: 16, on: 'all' },
    ],
    loopFrom: 1,
  },

  // ------------------------------------------------------------------ west
  west: {
    bpm: 116, key: 57, scale: 'minor', delay: 0.75,
    chords: [0, 0, 5, 6, 0, 0, 3, 4],
    parts: {
      clop: { type: 'drum', inst: 'wood', pat: 'a.aba.aba.aba.ab', pitches: [540, 420], len: 0.04, vol: 0.34, rev: 0.2 },
      kick: { type: 'drum', inst: 'kick', pat: 'x.......x.......', vol: 0.5 },
      snare: { type: 'drum', inst: 'snare', pat: '....x.......x...', style: 'brush', vol: 0.4, rev: 0.25 },
      tamb: { type: 'drum', inst: 'shaker', pat: '..x...x...x...x.', vol: 0.36 },
      bass: { type: 'bass', inst: 'upright', seq: '0 . . . 4 . . . 0 . . . 4 . 2 .', oct: -1, vol: 0.75 },
      guitar: { type: 'strum', inst: 'pluck', pat: 'd..d.ud.d..d.ud.', tones: [0, 2, 4, 7, 9], oct: 0, vol: 0.3, rev: 0.3, bright: 0.45, gate: 2.5 },
      whistle: {
        type: 'lead', inst: 'whistle', rel: 'key', oct: 1, vol: 0.5, rev: 0.55, del: 0.3,
        seq: [
          '4 _ _ _ 7 _ _ _ 6 _ 5 _ 4 _ _ _', '2 _ _ _ 4 _ _ _ 0 _ _ _ _ _ . .',
          '5 _ _ _ 7 _ _ _ 9 _ 8 _ 7 _ _ _', '8 _ _ _ 6 _ _ _ 8 _ _ _ _ _ . .',
          '9 _ _ _ 7 _ 4 _ 9 _ _ _ 11 _ _ _', '11 _ 9 _ 7 _ 9 _ 7 _ _ _ _ _ . .',
          '10 _ _ _ 7 _ _ _ 5 _ 7 _ 10 _ _ _', '8 _ _ _ 6 _ _ _ 4 _ _ _ _ _ . .',
        ],
      },
      harmonica: { type: 'lead', inst: 'harmonica', seq: '. . . . . . . . 4 _ 2 _ 0 _ _ _', oct: 1, vol: 0.3, rev: 0.45 },
      bell: { type: 'lead', inst: 'bell', seq: [HOLD16, REST16, REST16, REST16], oct: -1, vol: 0.5, rev: 0.6 },
    },
    sections: [
      { bars: 4, on: ['clop', 'guitar', 'bell'] },
      { bars: 8, on: ['clop', 'guitar', 'kick', 'snare', 'bass', 'tamb', 'bell'] },
      { bars: 16, on: ['clop', 'guitar', 'kick', 'snare', 'bass', 'tamb', 'whistle', 'bell'] },
      { bars: 8, on: ['clop', 'guitar', 'bass', 'harmonica', 'tamb'] },
      { bars: 16, on: ['clop', 'guitar', 'kick', 'snare', 'bass', 'tamb', 'whistle', 'bell'] },
    ],
    loopFrom: 1,
  },

  // ---------------------------------------------------------------- chrome
  // 12 steps per bar: a rolling 12/8 shuffle
  chrome: {
    bpm: 126, key: 60, scale: 'major', delay: 0.667,
    chords: [0, 5, 3, 4, 0, 5, 3, 4, 3, 3, 0, 0, 3, 3, 4, 4],
    parts: {
      ride: { type: 'drum', inst: 'hat', pat: 'x..x.xx..x.x', vol: 0.36 },
      kick: { type: 'drum', inst: 'kick', pat: 'x.....x.....', vol: 0.5 },
      snare: { type: 'drum', inst: 'snare', pat: '...x.....x..', style: 'brush', vol: 0.45, rev: 0.25 },
      clap: { type: 'drum', inst: 'clap', pat: '...x.....x..', vol: 0.3, rev: 0.3, min: 0.55 },
      bass: { type: 'bass', inst: 'upright', seq: ['0 . . 2 . . 4 . . 5 . .', '7 . . 5 . . 4 . . 2 . .'], oct: -2, vol: 0.85 },
      piano: { type: 'stab', inst: 'epiano', pat: '.xx.xx.xx.xx', oct: 1, vol: 0.2, rev: 0.25 },
      pad: { type: 'pad', vol: 0.3, rev: 0.4, bright: 1500 },
      lead: {
        type: 'lead', inst: 'organ', rel: 'key', oct: 1, vol: 0.5, rev: 0.35, del: 0.15,
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
      { bars: 16, on: 'all' },
      { bars: 8, on: ['ride', 'kick', 'snare', 'clap', 'bass', 'piano'] },
      { bars: 16, on: 'all' },
    ],
    loopFrom: 1,
  },

  // ------------------------------------------------------------------ neon
  neon: {
    bpm: 110, key: 52, scale: 'minor', delay: 0.75,
    chords: [0, 5, 2, 6, 0, 5, 3, 4],
    parts: {
      kick: { type: 'drum', inst: 'kick', pat: 'x...x...x...x...', vol: 0.62 },
      snare: { type: 'drum', inst: 'snare', pat: '....x.......x...', style: 'gated', vol: 0.5, rev: 0.5 },
      clap: { type: 'drum', inst: 'clap', pat: '....x.......x...', vol: 0.26, rev: 0.4, min: 0.6 },
      hat: { type: 'drum', inst: 'hat', pat: 'x-x-x-x-x-x-x-xo', vol: 0.3 },
      bass: { type: 'bass', inst: 'synth', seq: "0 0 0' 0 0 0 0' 0 0 0 0' 0 0 0' 0 0'", oct: -1, vol: 0.5, gate: 0.7 },
      pad: { type: 'pad', vol: 0.46, rev: 0.45, bright: 1700, pump: 0.5 },
      arp: { type: 'arp', inst: 'saw', seq: '0 2 4 7 4 2 0 2 4 7 9 7 4 2 4 7', oct: 1, vol: 0.3, del: 0.4, rev: 0.25, min: 0.35 },
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
      { bars: 8, on: ['kick', 'hat', 'bass', 'pad', 'arp'] },
      { bars: 16, on: 'all' },
      { bars: 4, on: ['pad', 'bass', 'snare', 'arp'] },
      { bars: 16, on: 'all' },
    ],
    loopFrom: 1,
  },

  // ---------------------------------------------------------------- future
  future: {
    bpm: 124, key: 58, scale: 'major', delay: 0.75,
    chords: [3, 4, 5, 2, 3, 4, 5, 0],
    parts: {
      kick: { type: 'drum', inst: 'kick', pat: 'x.........x.....', deep: true, vol: 0.62 },
      clap: { type: 'drum', inst: 'clap', pat: '........x.......', vol: 0.42, rev: 0.45 },
      hat: { type: 'drum', inst: 'hat', pat: 'x.x.x.x.x.xxx.xo', vol: 0.26 },
      perc: { type: 'drum', inst: 'wood', pat: '...a..a....a..a.', pitches: [2600], len: 0.03, vol: 0.22, rev: 0.4, min: 0.4 },
      bass: { type: 'bass', inst: 'sub', seq: '0 _ _ _ _ _ _ _ _ _ 0 _ _ _ _ _', oct: -2, vol: 0.7 },
      pad: { type: 'pad', vol: 0.52, rev: 0.5, bright: 2300, pump: 0.6, tones: [0, 2, 4, 6] },
      bells: { type: 'lead', inst: 'bell', seq: '0 . 4 . 7 . 9 . 7 . 4 . 11 . 9 .', oct: 1, vol: 0.3, rev: 0.5, del: 0.4 },
      pluck: { type: 'arp', inst: 'square', seq: '0 4 7 4 9 4 7 4 0 4 7 4 11 4 7 4', oct: 1, vol: 0.2, del: 0.3, min: 0.45 },
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
      { bars: 16, on: 'all' },
      { bars: 8, on: ['kick', 'clap', 'hat', 'bass', 'pad', 'pluck', 'perc'] },
      { bars: 16, on: 'all' },
    ],
    loopFrom: 1,
  },

  // ------------------------------------------------------------------ void
  void: {
    bpm: 92, key: 48, scale: 'minor', delay: 0.75,
    chords: [0, 5, 3, 4, 0, 6, 5, 4],
    parts: {
      boom: { type: 'drum', inst: 'boom', pat: ['x...............', '................'], vol: 0.7, rev: 0.4 },
      timp: { type: 'drum', inst: 'tom', pat: 'a.....a.a...b.b.', pitches: [65, 87], vol: 0.55, rev: 0.3 },
      tick: { type: 'drum', inst: 'wood', pat: 'a-b-a-b-a-b-a-b-', pitches: [2400, 1900], len: 0.025, vol: 0.14 },
      snare: { type: 'drum', inst: 'snare', pat: '....x..x....x.xx', vol: 0.34, rev: 0.35, min: 0.5 },
      bass: { type: 'bass', inst: 'synth', seq: '0 _ _ _ _ _ 0 _ 0 _ _ _ _ _ 4 _', oct: -1, vol: 0.5 },
      pad: { type: 'pad', vol: 0.5, rev: 0.6, bright: 900 },
      strings: { type: 'lead', inst: 'strings', seq: '0 . 0 0 . 0 0 . 0 . 0 0 . 0 2 4', oct: 0, vol: 0.34, rev: 0.4, gate: 0.55 },
      bell: { type: 'lead', inst: 'bell', seq: [HOLD16, REST16, REST16, REST16], oct: -1, vol: 0.55, rev: 0.7 },
      brass: {
        type: 'lead', inst: 'brass', rel: 'key', oct: 1, vol: 0.55, rev: 0.5, del: 0.2,
        seq: [
          '4 _ _ _ 7 _ _ _ 6 _ 5 _ 4 _ _ _', '2 _ _ _ 5 _ _ _ 7 _ _ _ _ _ . .',
          '7 _ _ _ 5 _ 7 _ 10 _ _ _ 8 _ 7 _', '8 _ _ _ 6 _ _ _ 4 _ _ _ _ _ . .',
          '9 _ _ _ 7 _ 4 _ 9 _ _ _ 11 _ _ _', '10 _ _ _ 8 _ _ _ 6 _ 8 _ 10 _ _ _',
          '12 _ _ _ 11 _ 9 _ 7 _ _ _ 9 _ _ _', '8 _ _ _ _ _ _ _ 11 _ _ _ 13 _ _ _',
        ],
      },
    },
    sections: [
      { bars: 4, on: ['tick', 'pad', 'boom'] },
      { bars: 8, on: ['tick', 'pad', 'boom', 'timp', 'strings', 'bass'] },
      { bars: 16, on: 'all' },
      { bars: 8, on: ['tick', 'pad', 'boom', 'timp', 'strings', 'bass', 'bell'] },
      { bars: 16, on: 'all' },
    ],
    loopFrom: 1,
  },

  // ---------------------------------------------------------- cinematics
  storm: {
    bpm: 60, key: 50, scale: 'minor', delay: 0.75, gain: 1,
    chords: [0, 0, 5, 4],
    parts: {
      pad: { type: 'pad', vol: 0.62, rev: 0.6, bright: 620 },
      bass: { type: 'bass', inst: 'sub', seq: HOLD16, oct: -2, vol: 0.5 },
      tick: { type: 'drum', inst: 'wood', pat: 'a...b...a...b...', pitches: [2300, 1850], len: 0.03, vol: 0.2, rev: 0.3 },
      boom: { type: 'drum', inst: 'boom', pat: ['x...............', '................', '................', '........x.......'], vol: 0.6, rev: 0.5 },
      bell: {
        type: 'lead', inst: 'bell', rel: 'key', oct: 1, vol: 0.4, rev: 0.7, del: 0.4,
        seq: ['4 _ _ _ _ _ _ _ 7 _ _ _ _ _ _ _', REST16, '6 _ _ _ 5 _ _ _ 4 _ _ _ _ _ _ _', REST16],
      },
      strings: { type: 'lead', inst: 'strings', seq: '0 _ _ _ _ _ _ _ 2 _ _ _ _ _ _ _', oct: 0, vol: 0.3, rev: 0.6 },
    },
    sections: [{ bars: 4, on: ['pad', 'tick', 'boom', 'bass'] }, { bars: 8, on: 'all' }],
    loopFrom: 1,
  },

  victory: {
    bpm: 104, key: 62, scale: 'major', delay: 0.75,
    chords: [0, 3, 4, 0, 5, 3, 4, 0],
    parts: {
      kick: { type: 'drum', inst: 'kick', pat: 'x...x...x...x...', vol: 0.55 },
      snare: { type: 'drum', inst: 'snare', pat: '....x.......x.xx', vol: 0.4, rev: 0.3 },
      hat: { type: 'drum', inst: 'hat', pat: 'x.x.x.x.x.x.x.xo', vol: 0.26 },
      timp: { type: 'drum', inst: 'tom', pat: 'a.......a.....b.', pitches: [73, 110], vol: 0.5, rev: 0.3 },
      bass: { type: 'bass', inst: 'synth', seq: '0 _ _ _ 0 _ 4 _ 0 _ _ _ 4 _ 2 _', oct: -2, vol: 0.5 },
      pad: { type: 'pad', vol: 0.5, rev: 0.5, bright: 1800 },
      harp: { type: 'pluck', seq: '0 2 4 7 9 7 4 2 0 2 4 7 9 11 9 7', oct: 0, vol: 0.3, rev: 0.4, del: 0.2, bright: 0.6 },
      strings: { type: 'lead', inst: 'strings', seq: '4 _ _ _ _ _ _ _ 2 _ _ _ _ _ _ _', oct: 1, vol: 0.3, rev: 0.5 },
      brass: {
        type: 'lead', inst: 'brass', rel: 'key', oct: 1, vol: 0.55, rev: 0.45, del: 0.2,
        seq: [
          '4 _ _ _ 7 _ _ _ 6 _ 5 _ 4 _ _ _', '5 _ _ _ 7 _ _ _ 10 _ _ _ _ _ . .',
          '8 _ _ _ 6 _ 8 _ 11 _ _ _ 8 _ _ _', '9 _ _ _ _ _ _ _ 7 _ _ _ _ _ . .',
          '9 _ _ _ 7 _ 5 _ 9 _ _ _ 12 _ _ _', '12 _ _ _ 10 _ 7 _ 10 _ _ _ _ _ . .',
          '11 _ _ _ 8 _ _ _ 11 _ 13 _ 15 _ _ _', '14 _ _ _ _ _ _ _ _ _ _ _ . . . .',
        ],
      },
    },
    sections: [{ bars: 8, on: 'all' }, { bars: 8, on: ['kick', 'hat', 'bass', 'pad', 'harp', 'strings', 'timp'] }, { bars: 8, on: 'all' }],
    loopFrom: 0,
  },
};
