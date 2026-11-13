import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/** Emits dist/sw.js with the list of built files to precache (offline play). */
function serviceWorker() {
  let outDir = 'dist';
  return {
    name: 'back2back-sw',
    apply: 'build',
    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir);
    },
    closeBundle() {
      if (!fs.existsSync(outDir)) return;
      const files = [];
      (function walk(dir) {
        for (const f of fs.readdirSync(dir)) {
          const p = path.join(dir, f);
          if (fs.statSync(p).isDirectory()) walk(p);
          else files.push(path.relative(outDir, p).split(path.sep).join('/'));
        }
      })(outDir);
      const list = files.filter((f) => f !== 'sw.js' && !f.endsWith('.map') && f !== 'dev.html' && f !== 'dev-audio.html');
      const hash = createHash('sha1');
      for (const f of list) hash.update(f).update(fs.readFileSync(path.join(outDir, f)));
      const tpl = fs.readFileSync(path.resolve('src/sw.template.js'), 'utf8');
      const precache = ['./', ...list.filter((f) => f !== 'index.html')];
      fs.writeFileSync(path.join(outDir, 'sw.js'),
        tpl.replace('__VERSION__', hash.digest('hex').slice(0, 12)).replace('__PRECACHE__', JSON.stringify(precache)));
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [serviceWorker()],
  build: { target: 'es2020', chunkSizeWarningLimit: 1600 },
  server: { host: true, port: 5173, proxy: { '/ws': { target: 'ws://localhost:8787', ws: true } } },
});
