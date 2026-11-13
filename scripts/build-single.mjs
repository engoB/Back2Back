// Packs the production build into one self-contained HTML file (dist-single/index.html):
// handy to share the game as a single document or to host it where only one file is allowed.
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"[^>]*>/g, (m, href) =>
  `<style>${fs.readFileSync(path.join(dist, href), 'utf8')}</style>`);
html = html.replace(/<script type="module"[^>]*src="\.\/([^"]+)"[^>]*><\/script>/g, (m, src) => {
  const js = fs.readFileSync(path.join(dist, src), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script type="module">${js}</script>`;
});
html = html.replace(/<link rel="modulepreload"[^>]*>/g, '');
html = html.replace(/<link rel="manifest"[^>]*>/, '').replace(/<link rel="apple-touch-icon"[^>]*>/, '');
const icon = fs.readFileSync(path.join(dist, 'icons/favicon.svg'), 'utf8');
html = html.replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(icon)}">`);
fs.mkdirSync('dist-single', { recursive: true });
fs.writeFileSync('dist-single/index.html', html);
console.log('dist-single/index.html', (html.length / 1024).toFixed(0) + ' KiB');
