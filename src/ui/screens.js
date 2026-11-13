// Every menu screen of the game: home, pre-run sheet, story, shop, missions,
// records, options, how-to, credits, multiplayer, pause, revive and results.
import { h, icon, logo } from './dom.js';
import { fmtTime } from './hud.js';
import { t, fmtNum, lang } from '../core/i18n.js';
import { save } from '../core/save.js';
import { ERAS, ERA_ORDER } from '../world/eras.js';
import { hexCss } from '../core/math.js';
import { RIDERS, RIDER_ORDER, BOARDS, BOARD_ORDER, UPGRADES, UPGRADE_ORDER, CONSUMABLES, CONSUMABLE_ORDER, combinedStats } from '../game/catalog.js';
import { missions, rankIndex } from '../game/missions.js';
import { CHAPTERS } from '../game/story.js';

export class Menus {
  constructor(root, app) {
    this.app = app;
    this.layer = h('div.screens');
    this.modalLayer = h('div.modals');
    this.toastLayer = h('div.toasts');
    root.append(this.layer, this.modalLayer, this.toastLayer);
    this.stack = [];
    this.current = null;
    this.el = null;
    this.modal = null;
  }

  // ---- navigation -------------------------------------------------------
  show(name, params = {}, push = true) {
    if (push && this.current) this.stack.push(this.current);
    this._mount(name, params, 'fwd');
  }
  replace(name, params = {}) {
    this._mount(name, params, 'fwd');
  }
  back() {
    const prev = this.stack.pop();
    this.app.sfx('back');
    if (prev) this._mount(prev.name, prev.params, 'back');
  }
  home() {
    this.stack = [];
    this._mount('home', {}, 'back');
  }
  refresh() {
    if (this.current) this._mount(this.current.name, this.current.params, 'none');
  }
  hide() {
    this.stack = [];
    this.current = null;
    if (this.el) {
      const old = this.el;
      old.classList.add('leave');
      setTimeout(() => old.remove(), 260);
      this.el = null;
    }
    this.closeModal();
  }
  get visible() {
    return !!this.current;
  }

  _mount(name, params, dir) {
    const old = this.el;
    this.current = { name, params };
    const el = (this.el = SCREENS[name](this, params));
    el.dataset.screen = name;
    if (dir !== 'none') el.classList.add(dir === 'back' ? 'enter-back' : 'enter');
    this.layer.append(el);
    if (old) {
      if (dir === 'none') old.remove();
      else {
        old.classList.add(dir === 'back' ? 'leave-back' : 'leave');
        setTimeout(() => old.remove(), 260);
      }
    }
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('enter', 'enter-back')));
    this.app.onScreen(name, params);
  }

  // ---- small services -----------------------------------------------------
  toast(text, kind = '') {
    const el = h('div.toast.menu-toast' + (kind ? '.' + kind : ''), text);
    this.toastLayer.append(el);
    setTimeout(() => el.classList.add('out'), 1700);
    setTimeout(() => el.remove(), 2100);
  }
  openModal(el, dismissable = true) {
    this.closeModal();
    const wrap = h('div.modal-wrap', { onclick: (e) => { if (dismissable && e.target === wrap) this.closeModal(); } }, el);
    this.modalLayer.append(wrap);
    this.modal = wrap;
    requestAnimationFrame(() => wrap.classList.add('open'));
  }
  closeModal() {
    if (!this.modal) return;
    const m = this.modal;
    this.modal = null;
    m.classList.remove('open');
    setTimeout(() => m.remove(), 220);
  }
  confirm(text, yes) {
    this.openModal(h('div.sheet.small', h('p.center', text), h('div.row.gap',
      btn(t('common.cancel'), () => this.closeModal(), 'ghost'),
      btn(t('common.yes'), () => { this.closeModal(); yes(); }, 'danger'))));
  }
}

// ---------------------------------------------------------------------------
// building blocks
// ---------------------------------------------------------------------------
let appRef = null;
function btn(label, onclick, cls = '', ic = null, sub = null) {
  return h('button.btn' + (cls ? '.' + cls.split(' ').join('.') : ''), {
    onclick: (e) => {
      if (appRef) appRef.sfx(cls.includes('primary') ? 'start' : 'click');
      onclick(e);
    },
  }, ic ? icon(ic) : null, sub ? h('span.lbl', h('b', label), h('small', sub)) : h('span.lbl', label));
}
function wallet() {
  const el = h('div.wallet', icon('coin'), h('b', fmtNum(save.data.coins)));
  el.dataset.wallet = '1';
  return el;
}
function frame(m, title, body, opts = {}) {
  appRef = m.app;
  return h('div.screen' + (opts.cls ? '.' + opts.cls : ''),
    h('header.bar',
      opts.noBack ? h('span') : h('button.icon-btn', { onclick: () => (opts.onBack ? opts.onBack() : m.back()), 'aria-label': t('common.back') }, icon('back')),
      h('h2', title),
      opts.right || wallet()),
    h('div.body' + (opts.bodyCls ? '.' + opts.bodyCls : ''), body));
}
function bar(frac, cls = '') {
  return h('div.pbar' + (cls ? '.' + cls : ''), h('i', { style: { transform: `scaleX(${Math.max(0, Math.min(1, frac))})` } }));
}
function missionRows(stats) {
  return missions.slots().map((s) => {
    const cur = stats ? missions.live(s, stats) : s.progress;
    const done = s.done || cur >= s.target;
    return h('div.mission' + (done ? '.done' : ''),
      h('div.chk', done ? icon('check') : null),
      h('div.grow', h('span', t('mis.' + s.id, { n: fmtNum(s.target) })), bar(cur / s.target)),
      h('small', done ? '' : `${fmtNum(Math.min(cur, s.target))}/${fmtNum(s.target)}`));
  });
}
function eraStyle(id) {
  const m = ERAS[id].moods[0];
  return { background: `linear-gradient(180deg, ${hexCss(m.skyTop)} 0%, ${hexCss(m.skyMid)} 55%, ${hexCss(m.skyBot)} 100%)` };
}

// ---------------------------------------------------------------------------
// screens
// ---------------------------------------------------------------------------
const SCREENS = {
  // ------------------------------------------------------------------ home
  home(m) {
    appRef = m.app;
    const d = save.data, lvl = d.missions.level;
    const tile = (key, ic, screen, badge) => h('button.tile', { onclick: () => { m.app.sfx('click'); m.show(screen); } },
      icon(ic), h('span', t(key)), badge ? h('i.badge', badge) : null);
    const nextStory = Math.min(d.story.unlocked + 1, CHAPTERS.length);
    return h('div.screen.home',
      h('div.home-top',
        h('button.rank', { onclick: () => { m.app.sfx('click'); m.show('missions'); } },
          h('b', lvl), h('span', h('small', t('common.level', { n: lvl })), t('rank.' + rankIndex(lvl)))),
        wallet()),
      h('div.home-logo', logo(), h('p.sub', t('app.sub'))),
      h('div.home-main',
        h('button.btn.primary.hero', { onclick: () => { m.app.sfx('click'); m.show('ready'); } },
          icon('play'), h('span.lbl', h('b', t('menu.play')), h('small', d.stats.bestScore ? `${t('menu.best')} : ${fmtNum(d.stats.bestScore)}` : t('menu.play.sub')))),
        h('div.tiles',
          tile('menu.story', 'book', 'story', d.story.done.length < CHAPTERS.length ? `${d.story.done.length}/${CHAPTERS.length}` : null),
          tile('menu.multi', 'users', 'multi'),
          tile('menu.shop', 'cart', 'shop'),
          tile('menu.missions', 'list', 'missions'),
          tile('menu.records', 'trophy', 'records'),
          tile('menu.options', 'gear', 'options'))),
      h('div.home-foot',
        m.app.canInstall() ? btn(t('menu.install'), () => m.app.install(), 'ghost small', 'download') : h('span.dim', m.app.offlineReady() ? t('menu.offline') : ''),
        h('span.dim', 'v' + m.app.version)));
  },

  // ----------------------------------------------------------------- ready
  ready(m) {
    const d = save.data;
    let head = false;
    const headBtn = h('button.toggle-row' + (d.items.headstart > 0 ? '' : '.disabled'), {
      onclick: () => {
        if (d.items.headstart <= 0) return;
        head = !head;
        headBtn.classList.toggle('on', head);
        m.app.sfx('tab');
      },
    }, icon('rocket'), h('span.grow', h('b', t('ready.head')), h('small', d.items.headstart > 0 ? `${t('ready.head.sub')} · ×${d.items.headstart}` : t('ready.none'))), h('i.switch'));
    return frame(m, t('ready.title'), [
      h('div.sheet-space'),
      h('div.card',
        h('h3', t('ready.missions')), ...missionRows(),
        headBtn,
        btn(t('ready.go'), () => m.app.startEndless({ headstart: head }), 'primary big', 'play')),
    ], { cls: 'bottom' });
  },

  // ----------------------------------------------------------------- story
  story(m) {
    const d = save.data;
    const cards = [h('div.chapter.pro',
      h('div.thumb', { style: eraStyle('present') }, h('b', t('era.present.y'))),
      h('div.grow', h('small', t('story.prologue')), h('h3', t('story.prologue.t')), h('p', t('c.p.card'))),
      btn(t('story.watch'), () => m.app.playCinematic('prologue'), 'ghost small', 'play'))];
    for (const c of CHAPTERS) {
      const open = c.n <= d.story.unlocked + 1, done = d.story.done.includes(c.n);
      cards.push(h('div.chapter' + (open ? '' : '.locked') + (done ? '.done' : ''),
        h('div.thumb', { style: eraStyle(c.era) }, h('b', t('era.' + c.era + '.y')), done ? h('i.ok', icon('check')) : null),
        h('div.grow',
          h('small', t('story.ch', { n: c.n }) + ' · ' + t('cog.' + c.n)),
          h('h3', t('era.' + c.era)),
          h('p', open ? t('ch.' + c.n) : t('common.locked')),
          open ? h('p.dim', t('story.goal', { n: fmtNum(c.course.length) }) + (done ? '' : ' · ' + t('story.reward', { n: c.reward }))) : null),
        open
          ? h('div.col.gap', btn(t('common.play'), () => m.app.startChapter(c.n), 'primary small', 'play'),
            done ? btn(t('story.watch'), () => m.app.playCinematic('c' + c.n), 'ghost small') : null)
          : icon('lock', 'big dim')));
    }
    if (d.story.done.length >= CHAPTERS.length) cards.push(h('p.center.gold', t('story.done')));
    return frame(m, t('story.title'), h('div.list', cards));
  },

  // ------------------------------------------------------------------ shop
  shop(m, params) {
    const d = save.data;
    const tab = params.tab || 'riders';
    const tabs = h('div.tabs', ['riders', 'boards', 'upgrades', 'items'].map((k) =>
      h('button' + (k === tab ? '.on' : ''), { onclick: () => { m.app.sfx('tab'); m.replace('shop', { tab: k }); } }, t('shop.' + k))));
    let content;
    const buy = (price, apply) => {
      if (!save.spend(price)) {
        m.app.sfx('error');
        m.toast(t('toast.poor'), 'bad');
        return;
      }
      apply();
      save.touch();
      m.app.sfx('buy');
      m.toast(t('toast.bought'), 'good');
      m.refresh();
    };
    if (tab === 'riders' || tab === 'boards') {
      const isR = tab === 'riders';
      const order = isR ? RIDER_ORDER : BOARD_ORDER, defs = isR ? RIDERS : BOARDS;
      const owned = isR ? d.owned.riders : d.owned.boards;
      const sel = params.sel || (isR ? d.rider : d.board);
      const cards = order.map((id) => {
        const def = defs[id];
        const has = owned.includes(id), equipped = (isR ? d.rider : d.board) === id;
        const st = isR ? combinedStats(id, d.board) : combinedStats(d.rider, id);
        const base = combinedStats(isR ? id : d.rider, isR ? d.board : id);
        const statRow = (k) => h('div.stat', h('span', t('stat.' + k)), bar((base[k] - 0.8) / 0.55, 'thin'));
        let action;
        if (equipped) action = h('div.pill.on', icon('check'), t('shop.equipped'));
        else if (has) action = btn(t('shop.equip'), () => {
          if (isR) d.rider = id; else d.board = id;
          save.touch();
          m.toast(t('toast.equipped'), 'good');
          m.replace('shop', { tab, sel: id });
        }, 'primary small');
        else if (def.story && d.story.done.length < CHAPTERS.length) action = h('div.pill', icon('lock'), t('shop.story'));
        else action = btn(fmtNum(def.price), () => buy(def.price, () => {
          owned.push(id);
          if (isR) d.rider = id; else d.board = id;
        }), 'gold small', 'coin');
        return h('div.item-card' + (id === sel ? '.sel' : ''), {
          onclick: (e) => {
            if (e.target.closest('button')) return;
            m.app.sfx('tab');
            m.replace('shop', { tab, sel: id });
          },
        },
          h('div.swatch', { style: { background: hexCss(isR ? def.jacket : def.deck), boxShadow: `inset 0 -10px 0 ${hexCss(isR ? def.pants : def.trim)}` } },
            isR ? null : h('i', { style: { background: hexCss(def.glow) } })),
          h('h3', t((isR ? 'rider.' : 'board.') + id)),
          h('p', t((isR ? 'rider.' : 'board.') + id + '.d')),
          h('div.stats', ['jump', 'flip', 'speed', 'boost'].map(statRow)),
          action);
      });
      content = h('div.carousel', cards);
      m.app.preview(isR ? sel : d.rider, isR ? d.board : sel);
      setTimeout(() => {
        const s = content.querySelector('.sel');
        if (s && s.scrollIntoView) s.scrollIntoView({ inline: 'center', block: 'nearest' });
      }, 30);
    } else if (tab === 'upgrades') {
      m.app.preview(d.rider, d.board);
      content = h('div.list.narrow', UPGRADE_ORDER.map((id) => {
        const U = UPGRADES[id], lvl = d.upgrades[id] || 0, max = lvl >= U.costs.length;
        const icn = { fulgur: 'bolt', magnet: 'magnet', shield: 'shield', double: 'x2' }[id];
        return h('div.upg',
          h('div.round.' + id, icon(icn)),
          h('div.grow', h('h3', t('up.' + id)), h('p', t('up.' + id + '.d', { n: U.value(lvl).toFixed(1).replace('.0', '') })
            + (max ? '' : ` → ${U.value(lvl + 1).toFixed(1).replace('.0', '')} s`)),
          h('div.pips', U.costs.map((_, i) => h('i' + (i < lvl ? '.on' : ''))))),
          max ? h('div.pill.on', t('shop.max')) : btn(fmtNum(U.costs[lvl]), () => buy(U.costs[lvl], () => { d.upgrades[id] = lvl + 1; }), 'gold small', 'coin'));
      }));
    } else {
      m.app.preview(d.rider, d.board);
      content = h('div.list.narrow', CONSUMABLE_ORDER.map((id) => {
        const C = CONSUMABLES[id], n = d.items[id] || 0;
        return h('div.upg',
          h('div.round.' + id, icon(id === 'revive' ? 'heart' : 'rocket')),
          h('div.grow', h('h3', t('item.' + id)), h('p', t('item.' + id + '.d')), h('small.dim', t('shop.owned', { n }))),
          n >= C.max ? h('div.pill.on', t('shop.max')) : btn(fmtNum(C.price), () => buy(C.price, () => { d.items[id] = n + 1; }), 'gold small', 'coin'));
      }));
    }
    return frame(m, t('shop.title'), [h('div.sheet-space.tall'), h('div.card.shop-card', tabs, content)], { cls: 'bottom shop' });
  },

  // -------------------------------------------------------------- missions
  missions(m) {
    const lvl = save.data.missions.level;
    return frame(m, t('mis.title'), h('div.list.narrow',
      h('div.card.center',
        h('div.big-rank', h('b', lvl)),
        h('h3', t('rank.' + rankIndex(lvl))),
        h('p.dim', t('mis.info', { n: fmtNum(missions.reward(lvl)) }))),
      h('div.card', ...missionRows())));
  },

  // --------------------------------------------------------------- records
  records(m) {
    const S = save.data.stats, b = save.data.board10;
    const cell = (k, v) => h('div.cell', h('b', v), h('span', t(k)));
    return frame(m, t('rec.title'), h('div.list.narrow',
      h('div.card.grid2',
        cell('rec.best', fmtNum(S.bestScore)), cell('rec.bestDist', fmtNum(S.bestDist) + ' m'),
        cell('rec.runs', fmtNum(S.runs)), cell('rec.total', t('rec.km', { n: (S.totalDist / 1000).toFixed(1) })),
        cell('rec.flips', fmtNum(S.flips)), cell('rec.combo', '×' + S.bestCombo),
        cell('rec.grind', fmtNum(S.grind) + ' m'), cell('rec.jumps', fmtNum(S.timeJumps)),
        cell('rec.eras', `${S.eras.length}/${ERA_ORDER.length}`), cell('rec.time', t('rec.min', { n: Math.round(S.playTime / 60) })),
        cell('rec.races', fmtNum(S.races)), cell('rec.wins', fmtNum(S.wins))),
      h('div.card', h('h3', t('rec.top')),
        b.length ? h('ol.top10', b.map((e, i) => h('li', h('i', i + 1), h('b', fmtNum(e.score)), h('span', fmtNum(e.dist) + ' m'),
          h('small', new Date(e.date).toLocaleDateString(lang() === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })))))
          : h('p.dim.center', t('rec.empty')))));
  },

  // --------------------------------------------------------------- options
  options(m, params) {
    const S = save.data.settings, app = m.app;
    const slider = (key, ic) => h('label.opt', icon(ic), h('span', t('opt.' + key)), h('input', {
      type: 'range', min: 0, max: 100, value: Math.round(S[key] * 100),
      oninput: (e) => { S[key] = e.target.value / 100; app.applySettings(); },
      onchange: () => { save.touch(); if (key === 'sfx') app.sfx('click'); },
    }));
    const toggle = (key) => {
      const el = h('button.toggle-row' + (S[key] ? '.on' : ''), {
        onclick: () => {
          S[key] = !S[key];
          el.classList.toggle('on', S[key]);
          save.touch();
          app.applySettings();
          app.sfx('tab');
          if (key === 'haptics' && S[key]) app.haptic(30);
        },
      }, h('span.grow', t('opt.' + key)), h('i.switch'));
      return el;
    };
    const seg = (key, values, labels, after) => h('div.seg', values.map((v, i) => h('button' + (S[key] === v ? '.on' : ''), {
      onclick: () => {
        S[key] = v;
        save.touch();
        app.sfx('tab');
        if (after) after();
        m.refresh();
      },
    }, labels[i])));
    const name = h('input.text', {
      type: 'text', maxLength: 14, value: save.data.name, 'aria-label': t('opt.name'),
      onchange: (e) => { save.data.name = e.target.value.trim().slice(0, 14) || save.data.name; save.touch(); },
    });
    const inGame = params.inGame;
    return frame(m, t('opt.title'), h('div.list.narrow',
      h('div.card', slider('music', 'music'), slider('sfx', 'volume')),
      h('div.card',
        h('div.opt', icon('globe'), h('span', t('opt.lang')), seg('lang', ['fr', 'en'], ['Français', 'English'], () => app.applySettings())),
        h('div.opt.wrap', icon('star'), h('span', t('opt.quality')),
          seg('quality', ['auto', 'low', 'medium', 'high'], ['auto', 'low', 'medium', 'high'].map((k) => t('opt.q.' + k)), () => app.applySettings(true))),
        toggle('haptics'), toggle('shake'), toggle('fps')),
      inGame ? null : h('div.card', h('label.opt', icon('users'), h('span', t('opt.name')), name)),
      inGame ? null : h('div.card.col.gap',
        btn(t('opt.how'), () => m.show('how'), 'ghost', 'info'),
        btn(t('opt.fullscreen'), () => app.fullscreen(), 'ghost', 'expand'),
        app.canInstall() ? btn(t('opt.install'), () => app.install(), 'ghost', 'download') : null,
        btn(t('opt.credits'), () => m.show('credits'), 'ghost', 'heart'),
        btn(t('opt.reset'), () => m.confirm(t('opt.reset.q'), () => { save.reset(); app.applySettings(); m.home(); }), 'danger', 'restart'))),
      { onBack: inGame ? () => m.back() : null });
  },

  how(m) {
    const row = (n, ic) => h('div.how', h('div.round', icon(ic)), h('p', t('how.' + n)));
    return frame(m, t('how.title'), h('div.list.narrow', h('div.card',
      row(1, 'play'), row(2, 'restart'), row(3, 'bolt'), row(4, 'chev'), row(5, 'star'), row(6, 'hourglass'))));
  },

  credits(m) {
    return frame(m, t('cred.title'), h('div.list.narrow', h('div.card.center', logo(true), h('p.pre', t('cred.txt')), h('p.dim', 'v' + m.app.version))));
  },

  // ----------------------------------------------------------- multiplayer
  multi(m) {
    const app = m.app, net = app.net, d = save.data;
    const status = h('p.status');
    const setStatus = () => {
      status.className = 'status ' + net.state;
      status.textContent = '';
      status.append(icon('wifi'), net.state === 'online' ? t('mp.online') : net.state === 'connecting' ? t('mp.connecting') : t('mp.offline'));
      online.forEach((b) => b.classList.toggle('disabled', net.state !== 'online'));
    };
    const code = h('input.text.code', { type: 'text', maxLength: 4, placeholder: 'ABCD', 'aria-label': t('mp.code'), autocapitalize: 'characters',
      oninput: (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); } });
    const guard = (fn) => () => { if (net.state === 'online') fn(); else app.sfx('error'); };
    const online = [
      btn(t('mp.quick'), guard(() => net.quick()), 'primary', 'bolt', t('mp.quick.sub')),
      btn(t('mp.create'), guard(() => net.create(false)), '', 'users', t('mp.create.sub')),
      btn(t('mp.join'), guard(() => { if (code.value.length === 4) net.join(code.value); else app.sfx('error'); }), 'small'),
    ];
    const server = h('input.text', { type: 'text', placeholder: t('mp.server.ph'), value: d.server || '', 'aria-label': t('mp.server'),
      onchange: (e) => { d.server = e.target.value.trim(); save.touch(); net.connect(d.server); } });
    net.onUI = (ev, data) => {
      if (ev === 'state') setStatus();
      else if (ev === 'room' && net.room && m.current && m.current.name === 'multi') m.show('lobby');
      else if (ev === 'error') m.toast(t('mp.err.' + data) === 'mp.err.' + data ? String(data) : t('mp.err.' + data), 'bad');
    };
    net.connect(d.server);
    setTimeout(setStatus, 0);
    // offline race settings
    let rivals = 3, length = 1500, era = 'random';
    const segOf = (values, labels, get, set) => {
      const el = h('div.seg', values.map((v, i) => h('button' + (get() === v ? '.on' : ''), {
        onclick: (e) => { set(v); app.sfx('tab'); [...el.children].forEach((c) => c.classList.remove('on')); e.currentTarget.classList.add('on'); },
      }, labels[i])));
      return el;
    };
    return frame(m, t('mp.title'), h('div.list.narrow',
      h('div.card.col.gap', status, online[0], online[1], h('div.row.gap', code, online[2])),
      h('div.card.col.gap',
        h('h3', t('mp.ai')),
        h('div.opt', h('span', t('mp.rivals')), segOf([1, 2, 3], ['1', '2', '3'], () => rivals, (v) => (rivals = v))),
        h('div.opt', h('span', t('mp.length')), segOf([1000, 1500, 2500], ['1 km', '1,5 km', '2,5 km'], () => length, (v) => (length = v))),
        btn(t('mp.ai'), () => app.startRaceAI({ rivals, length, era }), 'gold', 'robot', t('mp.ai.sub'))),
      h('details.card', h('summary', t('mp.server')), server)),
      { onBack: () => { net.onUI = null; m.back(); } });
  },

  lobby(m) {
    const app = m.app, net = app.net;
    const listEl = h('div.players'), actions = h('div.col.gap'), settings = h('div.col.gap');
    const render = () => {
      const room = net.room;
      if (!room) return;
      const me = room.players.find((p) => p.id === net.id);
      const host = room.host === net.id;
      listEl.textContent = '';
      for (const p of room.players) {
        listEl.append(h('div.player' + (p.ready ? '.ready' : ''),
          h('div.swatch.sm', { style: { background: hexCss((RIDERS[p.rider] || RIDERS.nova).jacket) } }),
          h('span.grow', p.name, p.id === net.id ? h('small', ` (${t('mp.you')})`) : null),
          p.id === room.host ? h('i.badge', t('mp.host')) : null,
          h('small', p.ready ? t('mp.ready') : t('mp.notready'))));
      }
      settings.textContent = '';
      const seg = (key, values, labels) => h('div.seg', values.map((v, i) => h('button' + (room.settings[key] === v ? '.on' : '') + (host ? '' : '.disabled'), {
        onclick: () => { if (host) { app.sfx('tab'); net.setSettings({ [key]: v }); } },
      }, labels[i])));
      settings.append(
        h('div.opt', h('span', t('mp.length')), seg('length', [1000, 1500, 2500], ['1 km', '1,5 km', '2,5 km'])),
        h('div.opt.wrap', h('span', t('mp.era')), seg('era', ['random', ...ERA_ORDER], [t('mp.random'), ...ERA_ORDER.map((e) => t('era.' + e + '.y'))])));
      actions.textContent = '';
      actions.append(
        btn(me && me.ready ? t('mp.notready') : t('mp.ready'), () => net.setReady(!(me && me.ready)), me && me.ready ? 'ghost' : 'primary', 'check'),
        host ? btn(t('mp.start'), () => net.start(), 'gold' + (room.players.every((p) => p.ready || p.id === net.id) ? '' : ' disabled'), 'flag') : h('p.dim.center', t('mp.wait')));
    };
    net.onUI = (ev, data) => {
      if (ev === 'room') {
        if (!net.room) m.back();
        else render();
      } else if (ev === 'state' && net.state !== 'online') {
        m.toast(t('mp.err.lost'), 'bad');
        m.back();
      } else if (ev === 'error') m.toast(t('mp.err.' + data), 'bad');
      else if (ev === 'joined') m.toast(t('mp.joined', { name: data }));
    };
    const codeTxt = net.room ? net.room.code : '----';
    const share = () => {
      const text = t('mp.share.txt', { code: codeTxt });
      if (navigator.share) navigator.share({ title: 'BACK2BACK', text }).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(codeTxt).then(() => m.toast(t('toast.copied'), 'good')).catch(() => {});
    };
    setTimeout(render, 0);
    return frame(m, t('mp.room'), h('div.list.narrow',
      h('div.card.center', h('small.dim', t('mp.code')), h('div.room-code', codeTxt), btn(t('mp.share'), share, 'ghost small', 'share')),
      h('div.card', h('h3', t('mp.players')), listEl),
      h('div.card', settings),
      actions),
      { onBack: () => { net.leave(); net.onUI = null; m.back(); }, right: h('span') });
  },

  // ----------------------------------------------------------------- pause
  pause(m, params) {
    const app = m.app;
    return h('div.screen.dim-bg.center-col',
      h('div.sheet',
        h('h2', t('pause.title')),
        params.stats && params.mode !== 'race' ? h('div.col', ...missionRows(params.stats)) : null,
        btn(t('pause.resume'), () => app.resume(), 'primary big', 'play'),
        h('div.row.gap',
          btn(t('pause.restart'), () => app.restart(), 'ghost', 'restart'),
          btn(t('menu.options'), () => m.show('options', { inGame: true }), 'ghost', 'gear')),
        btn(t('pause.quit'), () => app.quit(), 'danger', 'home')));
  },

  // --------------------------------------------------------------- results
  results(m, { summary: s }) {
    const app = m.app;
    appRef = app;
    const stat = (k, v, ic) => h('div.cell', ic ? icon(ic) : null, h('b', v), h('span', t(k)));
    const blocks = [];
    let title = t('res.title'), cls = '';
    if (s.mode === 'story') {
      title = s.success ? t('res.chapter') : t('res.chapter.fail');
      cls = s.success ? 'win' : '';
    } else if (s.mode === 'race') {
      title = s.place === 1 ? t('res.race.win') : t('res.race.place', { n: s.place });
      cls = s.place === 1 ? 'win' : '';
    }
    const scoreEl = h('div.big-score', '0');
    blocks.push(h('div.card.center.' + (cls || 'plain'),
      s.newBest ? h('div.ribbon', icon('star'), t('res.new')) : null,
      s.mode === 'story' && s.success ? h('div.ribbon', icon('gear'), t('cog.' + s.chapter)) : null,
      h('small.dim', s.mode === 'race' ? t('res.race.title') : t('res.score')),
      s.mode === 'race' ? h('div.big-score', fmtTime(s.raceTime || 0)) : scoreEl,
      s.rank && s.mode === 'endless' ? h('small.dim', t('res.rank', { n: s.rank })) : null));
    if (s.mode === 'race' && s.standings) {
      blocks.push(h('div.card', h('ol.top10', s.standings.map((r, i) => h('li' + (r.me ? '.me' : ''), h('i', i + 1), h('b', r.name),
        h('span', r.finished ? fmtTime(r.time) : t('res.dnf')))))));
      if (s.bonus) blocks.push(h('p.center.gold', t('res.reward', { n: s.bonus })));
    } else {
      blocks.push(h('div.card.grid3',
        stat('res.dist', fmtNum(s.distance) + ' m'), stat('res.coins', '+' + fmtNum(s.coins), 'coin'), stat('res.flips', fmtNum(s.flips)),
        stat('res.combo', '×' + s.bestCombo), stat('res.jumps', s.timeJumps), stat('res.speed', s.maxKmh + ' km/h')));
    }
    if (s.missions) {
      const mi = s.missions;
      if (mi.completed.length || mi.levelUp) {
        blocks.push(h('div.card',
          h('h3', t('res.missions')),
          mi.completed.map((c) => h('div.mission.done', h('div.chk', icon('check')), h('span.grow', t('mis.' + c.id, { n: fmtNum(c.target) })))),
          mi.levelUp ? h('div.levelup', icon('star'), h('b', t('res.levelup')), h('span', t('rank.' + rankIndex(mi.level)) + ' · ' + t('res.reward', { n: mi.reward }))) : null));
      }
    }
    if (s.mode === 'story' && s.success && s.reward) blocks.push(h('p.center.gold', t('res.reward', { n: s.reward })));
    const actions = [];
    if (s.mode === 'endless') {
      actions.push(btn(t('res.again'), () => app.startEndless({}), 'primary big', 'restart'));
      actions.push(h('div.row.gap', btn(t('res.shop'), () => { app.toMenu(); m.show('shop'); }, 'ghost', 'cart'), btn(t('res.menu'), () => app.toMenu(), 'ghost', 'home')));
    } else if (s.mode === 'story') {
      if (s.success) actions.push(btn(t('res.continue'), () => app.afterChapter(s.chapter), 'primary big', 'chev'));
      else actions.push(btn(t('res.retry'), () => app.startChapter(s.chapter), 'primary big', 'restart'));
      actions.push(btn(t('res.menu'), () => app.toMenu('story'), 'ghost', 'home'));
    } else {
      actions.push(btn(t('res.rematch'), () => app.rematch(), 'primary big', 'restart'));
      actions.push(btn(t('res.menu'), () => app.toMenu('multi'), 'ghost', 'home'));
    }
    // score count-up
    if (s.mode !== 'race') {
      const t0 = performance.now();
      const tick = () => {
        const k = Math.min(1, (performance.now() - t0) / 900);
        scoreEl.textContent = fmtNum(s.score * (1 - Math.pow(1 - k, 3)));
        if (k < 1 && scoreEl.isConnected) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      setTimeout(() => { if (!scoreEl.isConnected) scoreEl.textContent = fmtNum(s.score); }, 0);
    }
    return h('div.screen.dim-bg.results',
      h('header.bar', h('span'), h('h2', title), wallet()),
      h('div.body', h('div.list.narrow', blocks, h('div.col.gap', actions))));
  },
};

/** Revive prompt with a draining ring. Calls cb(true|false). */
export function reviveModal(m, count, cb) {
  let done = false;
  const finish = (yes) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    m.closeModal();
    cb(yes);
  };
  const timer = setTimeout(() => finish(false), 4500);
  m.openModal(h('div.sheet.small.center',
    h('div.revive-ring', icon('heart')),
    h('h2', t('revive.title')),
    btn(t('revive.use', { n: count }), () => finish(true), 'primary big', 'heart'),
    btn(t('revive.no'), () => finish(false), 'ghost')), false);
}

/** Daily gift popup. */
export function dailyModal(m, day, amount, cb) {
  m.openModal(h('div.sheet.small.center',
    h('div.gift', icon('coin')),
    h('h2', t('menu.daily')),
    h('p', t('menu.daily.txt', { n: day, c: fmtNum(amount) })),
    btn(t('menu.daily.get'), () => { m.closeModal(); cb(); }, 'primary big')), false);
}
