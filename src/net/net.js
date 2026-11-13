// Multiplayer client (WebSocket). The server only matches riders into rooms and
// relays their state: every client simulates the same seeded course locally.
import { save } from '../core/save.js';

export class NetClient {
  constructor() {
    this.ws = null;
    this.state = 'off'; // off | connecting | online | error
    this.id = null;
    this.room = null;
    this.url = '';
    this.onUI = null; // (event, data) for the menus
    this.onGame = null; // (event, data) for the running race
    this._retry = 0;
  }

  _emit(ev, data) {
    if (this.onUI) this.onUI(ev, data);
  }

  defaultUrl() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}/ws`;
  }

  /** Open the connection (idempotent). custom: optional ws(s):// address. */
  connect(custom) {
    let url = (custom || '').trim() || this.defaultUrl();
    if (/^https?:/i.test(url)) url = url.replace(/^http/i, 'ws');
    if (!/^wss?:/i.test(url)) url = 'wss://' + url;
    if (this.ws && this.url === url && (this.state === 'online' || this.state === 'connecting')) return;
    this.close();
    this.url = url;
    this.state = 'connecting';
    this._emit('state');
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      this.state = 'error';
      this._emit('state');
      return;
    }
    this.ws = ws;
    const timeout = setTimeout(() => {
      if (this.ws === ws && this.state === 'connecting') {
        this.state = 'error';
        this._emit('state');
        try { ws.close(); } catch (e) { /* ignore */ }
      }
    }, 6000);
    ws.onopen = () => {
      if (this.ws !== ws) return;
      clearTimeout(timeout);
      this.state = 'online';
      this.send({ t: 'hello', name: save.data.name, rider: save.data.rider, board: save.data.board });
      this._emit('state');
    };
    ws.onmessage = (e) => {
      if (this.ws !== ws) return;
      let m;
      try { m = JSON.parse(e.data); } catch (err) { return; }
      this._message(m);
    };
    ws.onclose = ws.onerror = () => {
      if (this.ws !== ws) return;
      clearTimeout(timeout);
      this.ws = null;
      const was = this.state;
      this.state = was === 'online' ? 'off' : 'error';
      if (this.room) {
        this.room = null;
        this._emit('room');
      }
      this._emit('state');
      if (this.onGame) this.onGame('lost');
    };
  }

  close() {
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      try { ws.close(); } catch (e) { /* ignore */ }
    }
    this.room = null;
    this.state = 'off';
  }

  send(m) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(m));
  }

  _message(m) {
    switch (m.t) {
      case 'welcome': this.id = m.id; break;
      case 'room':
        this.room = m.room;
        this._emit('room');
        break;
      case 'err': this._emit('error', m.code); break;
      case 'joined': this._emit('joined', m.name); break;
      case 'go': if (this.onStart) this.onStart(m); break;
      case 's': if (this.onGame) this.onGame('state', m); break;
      case 'fin': if (this.onGame) this.onGame('finish', m); break;
      case 'left': if (this.onGame) this.onGame('left', m); break;
      case 'results': if (this.onGame) this.onGame('results', m); break;
    }
  }

  // lobby actions ---------------------------------------------------------
  hello() { this.send({ t: 'hello', name: save.data.name, rider: save.data.rider, board: save.data.board }); }
  create(pub) { this.hello(); this.send({ t: 'create', pub }); }
  join(code) { this.hello(); this.send({ t: 'join', code }); }
  quick() { this.hello(); this.send({ t: 'quick' }); }
  leave() { this.send({ t: 'leave' }); this.room = null; }
  setReady(v) { this.send({ t: 'ready', v }); }
  setSettings(s) { this.send({ t: 'set', s }); }
  start() { this.send({ t: 'start' }); }
  // race ------------------------------------------------------------------
  sendState(d) { this.send({ t: 's', d }); }
  sendFinish(time, score) { this.send({ t: 'fin', time, score }); }
}
