// Rasterises public/icons/favicon.svg into the PNG icons of the PWA.
// Needs Playwright (npx playwright install chromium) — the PNGs are committed,
// so this only has to run when the icon design changes.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  ({ chromium } = require('/opt/node-tools/node_modules/playwright'));
}
const dir = path.resolve('public/icons');
const svg = fs.readFileSync(path.join(dir, 'favicon.svg'), 'utf8');
const square = svg.replace('rx="112"', 'rx="0"');
const targets = [
  ['icon-192.png', 192, svg, 0],
  ['icon-512.png', 512, svg, 0],
  ['apple-touch-icon.png', 180, square, 0],
  ['maskable-512.png', 512, square, 0.1], // safe zone: artwork shrunk inside a full-bleed background
];
const browser = await chromium.launch();
for (const [name, size, src, pad] of targets) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  const inner = Math.round(size * (1 - pad * 2));
  await page.setContent(`<body style="margin:0;background:${pad ? '#0f1740' : 'transparent'};display:grid;place-items:center;width:${size}px;height:${size}px">
    <div style="width:${inner}px;height:${inner}px">${src.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body>`);
  await page.screenshot({ path: path.join(dir, name), omitBackground: !pad });
  await page.close();
  console.log(name);
}
await browser.close();
