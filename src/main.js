// Entry point: boot screen, game creation, service worker.
import './ui/styles.css';
import { Game } from './game/game.js';
import { t } from './core/i18n.js';

const boot = document.getElementById('boot');
const bar = document.getElementById('boot-bar');
const tap = document.getElementById('boot-tap');
document.getElementById('boot-sub').textContent = t('app.sub');
tap.textContent = t('boot.loading');
tap.hidden = false;

let game = null;
function fail(e) {
  console.error(e);
  tap.textContent = 'WebGL indisponible sur cet appareil / WebGL is not available on this device.';
  tap.style.animation = 'none';
}

function begin() {
  if (!game || begin.done) return;
  begin.done = true;
  boot.classList.add('gone');
  setTimeout(() => boot.remove(), 700);
  game.start();
}

requestAnimationFrame(() => {
  bar.style.transform = 'scaleX(0.35)';
  setTimeout(() => {
    try {
      game = new Game(document.getElementById('game'), document.getElementById('ui'));
      window.__b2b = game;
      game.prepare();
      bar.style.transform = 'scaleX(1)';
      tap.textContent = t('boot.tap');
      const go = (e) => {
        if (e.type === 'keydown' && !['Enter', 'Space'].includes(e.code)) return;
        boot.removeEventListener('pointerdown', go);
        window.removeEventListener('keydown', go);
        begin();
      };
      boot.addEventListener('pointerdown', go);
      window.addEventListener('keydown', go);
    } catch (e) {
      fail(e);
    }
  }, 60);
});

// Offline support (production builds only)
if (import.meta.env.PROD && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol) && document.querySelector('link[rel="manifest"]')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      const ready = () => { if (game) game.swReady = true; };
      if (reg.active) ready();
      navigator.serviceWorker.ready.then(ready).catch(() => {});
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller && game) game.onUpdate();
        });
      });
    }).catch(() => {});
  });
}
