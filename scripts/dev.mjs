// Development: the multiplayer server (port 8787) and Vite (port 5173, proxying /ws) together.
import { spawn } from 'node:child_process';

const run = (cmd, args, env = {}) => spawn(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env }, shell: process.platform === 'win32' });
const server = run('node', ['server/server.js'], { PORT: '8787' });
const vite = run('npx', ['vite']);
const stop = () => {
  server.kill();
  vite.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
vite.on('exit', stop);
