// Fast checks that need no browser:  npm test
//  - the course generator is deterministic and stays rideable
//  - the physics lets an AI rider travel a long way
//  - the multiplayer room logic matches, relays and ranks correctly
//  - the soundtrack data is well formed and both languages are complete
import assert from 'node:assert/strict';
import { Course } from '../src/world/course.js';
import { Player, PHYS } from '../src/game/player.js';
import { BotBrain } from '../src/game/bots.js';
import { rockOutcome } from '../src/game/rules.js';
import { Lobby } from '../shared/room.js';
import { TRACKS } from '../src/audio/tracks.js';

let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log('  ✓ ' + name);
};

test('course: same seed, same course', () => {
  const a = new Course({ seed: 42 }), b = new Course({ seed: 42 }), c = new Course({ seed: 43 });
  a.ensure(4000); b.ensure(4000); c.ensure(4000);
  assert.equal(a.items.length, b.items.length);
  assert.ok(a.ys.every((v, i) => Object.is(v, b.ys[i])));
  assert.notEqual(a.heightAt(2000), c.heightAt(2000));
  for (let i = 1; i < a.items.length; i++) assert.ok(a.items[i].x >= a.items[i - 1].x, 'items sorted');
});

test('course: finite courses end with their goal', () => {
  const c = new Course({ seed: 5, length: 1200, end: 'cog', portals: null });
  c.ensure(1500);
  const goal = c.items.find((i) => i.type === 'cog');
  assert.ok(goal && Math.abs(goal.x - 1200) < 1);
  assert.ok(!c.items.some((i) => i.x > 1200 && i.type !== 'coin'));
});

test('physics: a skilled AI rider goes far', () => {
  let total = 0;
  for (let seed = 1; seed <= 8; seed++) {
    const course = new Course({ seed });
    const p = new Player(course);
    const brain = new BotBrain(0.8, seed);
    let cursor = 0;
    for (let t = 0; t < 120 && !p.crashed; t += PHYS.STEP) {
      const cmd = brain.update(p, course, PHYS.STEP);
      p.step(PHYS.STEP, cmd.held, cmd.pressed);
      while (cursor < course.items.length && course.items[cursor].x < p.x - 2) cursor++;
      for (let k = cursor; k < course.items.length && course.items[k].x < p.x + 2; k++) {
        const it = course.items[k];
        if (it.type === 'rock' && rockOutcome(p, it) === 'crash') p.crash('rock');
      }
      p.events.length = 0;
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), 'finite position');
    }
    total += p.x;
  }
  assert.ok(total / 8 > 900, `average distance ${Math.round(total / 8)} m`);
});

test('physics: no input does not crash on the first slope', () => {
  const course = new Course({ seed: 3 });
  const p = new Player(course);
  for (let t = 0; t < 6; t += PHYS.STEP) p.step(PHYS.STEP, false, false);
  assert.ok(!p.crashed && p.x > 40);
});

test('multiplayer: rooms, relay and results', () => {
  let now = 0;
  const lobby = new Lobby({ now: () => now, random: () => 0.37 });
  const inbox = { a: [], b: [], c: [] };
  const a = lobby.connect((m) => inbox.a.push(m));
  const b = lobby.connect((m) => inbox.b.push(m));
  const c = lobby.connect((m) => inbox.c.push(m));
  a.receive({ t: 'hello', name: 'Ada <script>', rider: 'ada', board: 'mk1' });
  a.receive({ t: 'create', pub: false });
  const code = a.room.code;
  assert.equal(code.length, 4);
  b.receive({ t: 'hello', name: 'Bob', rider: '../../x', board: 'eclair' });
  b.receive({ t: 'join', code: code.toLowerCase() });
  assert.equal(a.room.players.size, 2);
  assert.equal(b.rider, 'nova', 'invalid ids are replaced');
  assert.ok(!a.name.includes('<'), 'names are sanitised');
  c.receive({ t: 'join', code: 'ZZZZ' });
  assert.deepEqual(inbox.c.at(-1), { t: 'err', code: 'none' });
  b.receive({ t: 'start' });
  assert.equal(a.room.phase, 'lobby', 'only the host starts');
  a.receive({ t: 'set', s: { length: 2500, era: 'neon' } });
  a.receive({ t: 'set', s: { length: 99, era: 'mars' } });
  assert.deepEqual(a.room.settings, { length: 2500, era: 'neon' });
  a.receive({ t: 'start' });
  const go = inbox.b.find((m) => m.t === 'go');
  assert.ok(go && go.seed > 0 && go.length === 2500 && go.players.length === 2);
  c.receive({ t: 'join', code });
  assert.deepEqual(inbox.c.at(-1), { t: 'err', code: 'started' });
  a.receive({ t: 's', d: { x: 12.5, y: -3, r: 0.1, vx: 14, vy: 0, f: 1, evil: 'x' } });
  const rel = inbox.b.at(-1);
  assert.equal(rel.t, 's');
  assert.equal(rel.id, a.id);
  assert.equal(rel.d.evil, undefined);
  for (let i = 0; i < 100; i++) a.receive({ t: 's', d: { x: i } });
  assert.ok(inbox.b.filter((m) => m.t === 's').length <= 31, 'flood guard');
  b.receive({ t: 'fin', time: 61.2 });
  now += 100000;
  lobby.tick();
  const res = inbox.a.find((m) => m.t === 'results');
  assert.ok(res && res.list[0].name === 'Bob' && res.list[1].time === null);
  assert.equal(a.room.phase, 'lobby');
  a.close();
  assert.equal(b.room.host, b.id, 'host migrates');
  b.close();
  assert.equal(lobby.rooms.size, 0);
  // quick match pairs strangers in a public room
  const d = lobby.connect(() => {}), e = lobby.connect(() => {});
  d.receive({ t: 'quick' });
  e.receive({ t: 'quick' });
  assert.equal(d.room, e.room);
});

test('soundtrack: every bar has 12 or 16 steps and known parts', () => {
  for (const [name, tr] of Object.entries(TRACKS)) {
    for (const [pn, p] of Object.entries(tr.parts)) {
      const src = p.seq ?? p.pat;
      if (!src) continue;
      const drum = p.type === 'drum' || p.type === 'stab' || p.type === 'strum';
      for (const s of Array.isArray(src) ? src : [src]) {
        const n = drum ? s.replace(/\s/g, '').length : s.trim().split(/\s+/).length;
        assert.ok(n === 12 || n === 16, `${name}.${pn}: ${n} steps`);
      }
    }
    for (const sec of tr.sections || []) if (sec.on !== 'all') for (const pn of sec.on) assert.ok(tr.parts[pn], `${name}: unknown part ${pn}`);
  }
});

// i18n needs localStorage-free import: the save store falls back to memory
globalThis.navigator ??= { language: 'fr' };
const { missingKeys } = await import('../src/core/i18n.js');
test('i18n: French and English are complete', () => {
  assert.deepEqual(missingKeys(), []);
});

console.log(`\n${passed} tests passed`);
