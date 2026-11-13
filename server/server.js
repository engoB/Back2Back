// BACK2BACK server: serves the built game (dist/) and hosts the multiplayer
// rooms over WebSocket on /ws.   Usage:  npm run build && npm start
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { Lobby } from '../shared/room.js';

const PORT = Number(process.env.PORT) || 8787;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.map': 'application/json',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: lobby.rooms.size, players: lobby.peers.size }));
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end();
    return;
  }
  let rel;
  try {
    rel = decodeURIComponent(url.pathname);
  } catch (e) {
    res.writeHead(400).end();
    return;
  }
  if (rel.endsWith('/')) rel += 'index.html';
  let file = path.join(ROOT, rel);
  // never serve anything outside dist/
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) file = path.join(ROOT, 'index.html');
    fs.readFile(file, (e2, data) => {
      if (e2) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('BACK2BACK: lancez "npm run build" avant "npm start".');
        return;
      }
      const ext = path.extname(file);
      const hashed = /assets\//.test(file);
      res.writeHead(200, {
        'content-type': TYPES[ext] || 'application/octet-stream',
        'cache-control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  });
});

const lobby = new Lobby();
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 2048 });
wss.on('connection', (ws) => {
  const peer = lobby.connect((m) => {
    if (ws.readyState === 1) ws.send(JSON.stringify(m));
  });
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (data) => {
    let m;
    try { m = JSON.parse(data.toString()); } catch (e) { return; }
    peer.receive(m);
  });
  ws.on('close', () => peer.close());
  ws.on('error', () => peer.close());
});

// drop dead connections, end races that time out
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
  lobby.tick();
}, 15000);
setInterval(() => lobby.tick(), 2000);

server.listen(PORT, () => {
  console.log(`BACK2BACK — http://localhost:${PORT}  (WebSocket: /ws)`);
});
