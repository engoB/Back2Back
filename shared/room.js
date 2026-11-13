// Multiplayer room logic, independent of the transport (used by the Node
// WebSocket server and by the tests). The server never simulates the game: it
// groups riders, picks the course seed and relays their state.

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LENGTHS = [1000, 1500, 2500];
const ERAS = ['random', 'present', 'jurassic', 'west', 'chrome', 'neon', 'future', 'void'];
const ID_RE = /^[a-z0-9]{1,16}$/;

const cleanName = (s) => String(s ?? '').replace(/[^\p{L}\p{N} _.\-·']/gu, '').trim().slice(0, 14) || 'Rider';
const cleanId = (s, def) => (ID_RE.test(String(s ?? '')) ? String(s) : def);

export class Lobby {
  constructor(opts = {}) {
    this.maxPlayers = opts.maxPlayers ?? 4;
    this.maxRooms = opts.maxRooms ?? 500;
    this.now = opts.now ?? (() => Date.now());
    this.random = opts.random ?? Math.random;
    this.rooms = new Map();
    this.peers = new Set();
    this.nextId = 1;
  }

  /** Register a connection. `send(obj)` delivers a message to that client. */
  connect(send) {
    const peer = new Peer(this, 'p' + this.nextId++, send);
    this.peers.add(peer);
    peer.send({ t: 'welcome', id: peer.id });
    return peer;
  }

  _code() {
    for (let tries = 0; tries < 50; tries++) {
      let c = '';
      for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(this.random() * CODE_CHARS.length)];
      if (!this.rooms.has(c)) return c;
    }
    return null;
  }

  createRoom(peer, pub) {
    if (this.rooms.size >= this.maxRooms) return peer.send({ t: 'err', code: 'full' });
    const code = this._code();
    if (!code) return peer.send({ t: 'err', code: 'full' });
    const room = new Room(this, code, !!pub);
    this.rooms.set(code, room);
    room.add(peer);
  }

  joinRoom(peer, code) {
    const room = this.rooms.get(String(code || '').toUpperCase());
    if (!room) return peer.send({ t: 'err', code: 'none' });
    if (room.phase !== 'lobby') return peer.send({ t: 'err', code: 'started' });
    if (room.players.size >= this.maxPlayers) return peer.send({ t: 'err', code: 'full' });
    room.add(peer);
  }

  quickMatch(peer) {
    for (const room of this.rooms.values()) {
      if (room.pub && room.phase === 'lobby' && room.players.size < this.maxPlayers) return room.add(peer);
    }
    this.createRoom(peer, true);
  }

  /** Periodic housekeeping (race timeouts). */
  tick() {
    const now = this.now();
    for (const room of this.rooms.values()) room.tick(now);
  }
}

class Peer {
  constructor(lobby, id, send) {
    this.lobby = lobby;
    this.id = id;
    this._send = send;
    this.name = 'Rider';
    this.rider = 'nova';
    this.board = 'mk1';
    this.room = null;
    this.ready = false;
    this.finished = false;
    this.time = 0;
    this.stateCount = 0;
    this.stateWindow = 0;
  }

  send(m) {
    try {
      this._send(m);
    } catch (e) {
      /* a broken socket is cleaned up by close() */
    }
  }

  /** Handle one decoded message from the client. */
  receive(m) {
    if (!m || typeof m !== 'object') return;
    const L = this.lobby, room = this.room;
    switch (m.t) {
      case 'hello':
        this.name = cleanName(m.name);
        this.rider = cleanId(m.rider, 'nova');
        this.board = cleanId(m.board, 'mk1');
        if (room) room.broadcastRoom();
        break;
      case 'create':
        if (room) room.remove(this);
        L.createRoom(this, m.pub);
        break;
      case 'join':
        if (room) room.remove(this);
        L.joinRoom(this, m.code);
        break;
      case 'quick':
        if (room) room.remove(this);
        L.quickMatch(this);
        break;
      case 'leave':
        if (room) room.remove(this);
        this.send({ t: 'room', room: null });
        break;
      case 'ready':
        if (room && room.phase === 'lobby') {
          this.ready = !!m.v;
          room.broadcastRoom();
        }
        break;
      case 'set':
        if (room && room.host === this.id && room.phase === 'lobby' && m.s && typeof m.s === 'object') {
          if (LENGTHS.includes(m.s.length)) room.settings.length = m.s.length;
          if (ERAS.includes(m.s.era)) room.settings.era = m.s.era;
          room.broadcastRoom();
        }
        break;
      case 'start':
        if (room && room.host === this.id && room.phase === 'lobby') room.start();
        break;
      case 's': {
        if (!room || room.phase !== 'race' || this.finished) return;
        // flood guard: at most 30 snapshots per second
        const now = L.now();
        if (now - this.stateWindow > 1000) {
          this.stateWindow = now;
          this.stateCount = 0;
        }
        if (++this.stateCount > 30) return;
        const d = m.d;
        if (!d || typeof d !== 'object') return;
        const out = { x: +d.x || 0, y: +d.y || 0, r: +d.r || 0, vx: +d.vx || 0, vy: +d.vy || 0, f: d.f | 0 };
        room.relay(this, { t: 's', id: this.id, d: out });
        break;
      }
      case 'fin':
        if (room && room.phase === 'race' && !this.finished) room.finish(this, +m.time || 0);
        break;
      case 'ping':
        this.send({ t: 'pong', n: m.n });
        break;
    }
  }

  close() {
    if (this.room) this.room.remove(this);
    this.lobby.peers.delete(this);
  }
}

class Room {
  constructor(lobby, code, pub) {
    this.lobby = lobby;
    this.code = code;
    this.pub = pub;
    this.players = new Map();
    this.host = null;
    this.phase = 'lobby';
    this.settings = { length: 1500, era: 'random' };
    this.seed = 0;
    this.deadline = 0;
  }

  info() {
    return {
      code: this.code, host: this.host, pub: this.pub, phase: this.phase, settings: { ...this.settings },
      players: [...this.players.values()].map((p) => ({ id: p.id, name: p.name, rider: p.rider, board: p.board, ready: p.ready })),
    };
  }
  broadcast(m) {
    for (const p of this.players.values()) p.send(m);
  }
  broadcastRoom() {
    this.broadcast({ t: 'room', room: this.info() });
  }
  relay(from, m) {
    for (const p of this.players.values()) if (p !== from) p.send(m);
  }

  add(peer) {
    peer.room = this;
    peer.ready = false;
    peer.finished = false;
    this.players.set(peer.id, peer);
    if (!this.host) this.host = peer.id;
    this.relay(peer, { t: 'joined', name: peer.name });
    this.broadcastRoom();
  }

  remove(peer) {
    if (!this.players.delete(peer.id)) return;
    peer.room = null;
    if (this.players.size === 0) {
      this.lobby.rooms.delete(this.code);
      return;
    }
    if (this.host === peer.id) this.host = this.players.keys().next().value;
    if (this.phase === 'race') {
      this.broadcast({ t: 'left', id: peer.id, name: peer.name });
      this._maybeEnd();
    }
    this.broadcastRoom();
  }

  start() {
    this.phase = 'race';
    this.seed = 1 + Math.floor(this.lobby.random() * 0xfffffe);
    this.deadline = 0;
    for (const p of this.players.values()) {
      p.finished = false;
      p.time = 0;
      p.ready = false;
    }
    const info = this.info();
    this.broadcast({ t: 'go', seed: this.seed, length: this.settings.length, era: this.settings.era, players: info.players });
    this.broadcastRoom();
  }

  finish(peer, time) {
    peer.finished = true;
    peer.time = Math.max(0, Math.min(time, 3600));
    this.relay(peer, { t: 'fin', id: peer.id, time: peer.time });
    // the others get 90 seconds to reach the line
    if (!this.deadline) this.deadline = this.lobby.now() + 90000;
    this._maybeEnd();
  }

  _maybeEnd() {
    if (this.phase !== 'race') return;
    const all = [...this.players.values()];
    if (all.length && all.every((p) => p.finished)) this._end();
  }

  tick(now) {
    if (this.phase === 'race' && this.deadline && now > this.deadline) this._end();
  }

  _end() {
    const list = [...this.players.values()]
      .map((p) => ({ id: p.id, name: p.name, time: p.finished ? p.time : null }))
      .sort((a, b) => (a.time === null) - (b.time === null) || a.time - b.time);
    this.phase = 'lobby';
    this.deadline = 0;
    this.broadcast({ t: 'results', list });
    this.broadcastRoom();
  }
}
