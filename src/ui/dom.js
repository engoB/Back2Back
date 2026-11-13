// Tiny DOM helpers and the inline SVG icon set (drawn for this game).

/** h('div.card', { onclick }, child, 'text') */
export function h(sel, attrs, ...kids) {
  const [tag, ...cls] = sel.split('.');
  const el = document.createElement(tag || 'div');
  if (cls.length) el.className = cls.join(' ');
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
    kids.unshift(attrs);
    attrs = null;
  }
  if (attrs) {
    for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v === undefined || v === null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'class') el.className += ' ' + v;
      else if (k in el && k !== 'list') el[k] = v;
      else el.setAttribute(k, v);
    }
  }
  append(el, kids);
  return el;
}
function append(el, kids) {
  for (const k of kids) {
    if (k === null || k === undefined || k === false) continue;
    if (Array.isArray(k)) append(el, k);
    else el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

const P = {
  play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/>',
  pause: '<rect x="5" y="4" width="5" height="16" rx="1.5"/><rect x="14" y="4" width="5" height="16" rx="1.5"/>',
  bolt: '<path d="M13.5 2 4 13.5h6L9 22l10-12h-6.2z"/>',
  coin: '<path d="M12 2.5l1.4 2.2 2.5-.6.6 2.5 2.5.6-.6 2.5L20.6 11l-1.4 1.7 1 2.4-2.3 1.1-.2 2.6-2.6-.2-1.3 2.3L12 19.6l-1.8 1.3-1.3-2.3-2.6.2-.2-2.6-2.3-1.1 1-2.4L3.4 11l2.2-1.3L5 7.2l2.5-.6.6-2.5 2.5.6z"/><circle cx="12" cy="12" r="3.2" fill="#0b1026" opacity=".35"/>',
  cart: '<path d="M3 4h2.2l2.3 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L20.8 8H7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="19.5" r="1.6"/><circle cx="17" cy="19.5" r="1.6"/>',
  trophy: '<path d="M7 3h10v4a5 5 0 0 1-10 0z"/><path d="M7 5H4a3 3 0 0 0 3.6 3M17 5h3a3 3 0 0 1-3.6 3" fill="none" stroke="currentColor" stroke-width="2"/><rect x="10.5" y="12" width="3" height="4"/><rect x="7.5" y="16" width="9" height="3.5" rx="1"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M3.5 6l1.2 1.2L7 4.8M3.5 12l1.2 1.2L7 10.8M3.5 18l1.2 1.2L7 16.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  gear: '<path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6zm8.3 5.4.1-1.6-.1-1.6 2-1.5-2-3.5-2.3 1a8 8 0 0 0-2.8-1.6L14.800 2h-4l-.4 2.800a8 8 0 0 0-2.8 1.600l-2.300-1-2 3.500 2 1.500L3.600 12l.1 1.600-2 1.500 2 3.500 2.300-1a8 8 0 0 0 2.800 1.600l.4 2.800h4l.4-2.800a8 8 0 0 0 2.800-1.600l2.300 1 2-3.500z" fill-rule="evenodd"/>',
  users: '<circle cx="9" cy="8" r="3.6"/><path d="M2 20a7 7 0 0 1 14 0z"/><circle cx="17.5" cy="9" r="2.8" opacity=".7"/><path d="M15.500 14.200A6 6 0 0 1 23 20h-5a9 9 0 0 0-2.500-5.800z" opacity=".7"/>',
  book: '<path d="M4 4.500A2.500 2.500 0 0 1 6.500 2H20v17H6.500A2.500 2.500 0 0 0 4 21.500z"/><path d="M4 21.500A2.500 2.500 0 0 1 6.500 19H20v3H6.500" opacity=".55"/><path d="M8 7h8M8 11h6" stroke="#0b1026" stroke-width="1.600" opacity=".5" stroke-linecap="round"/>',
  back: '<path d="M14.500 5 8 12l6.500 7" fill="none" stroke="currentColor" stroke-width="2.800" stroke-linecap="round" stroke-linejoin="round"/>',
  close: '<path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.800" stroke-linecap="round"/>',
  check: '<path d="M4.500 12.500 10 18l9.500-11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  lock: '<rect x="5" y="10.500" width="14" height="10" rx="2.200"/><path d="M8 10.500V8a4 4 0 0 1 8 0v2.500" fill="none" stroke="currentColor" stroke-width="2.200"/>',
  magnet: '<path d="M5 3h4.500v9a2.500 2.500 0 0 0 5 0V3H19v9a7 7 0 0 1-14 0z"/><path d="M5 3h4.500v3.500H5zM14.500 3H19v3.500h-4.500z" fill="#fff"/>',
  shield: '<path d="M12 2 4 5v6.500c0 5 3.400 8.700 8 10.500 4.600-1.800 8-5.500 8-10.500V5z"/>',
  x2: '<text x="12" y="17" text-anchor="middle" font-size="13" font-weight="900" font-family="system-ui,sans-serif">×2</text>',
  share: '<circle cx="18" cy="5" r="2.800"/><circle cx="6" cy="12" r="2.800"/><circle cx="18" cy="19" r="2.800"/><path d="M8.500 10.700l7-4.200M8.500 13.300l7 4.200" stroke="currentColor" stroke-width="2"/>',
  home: '<path d="M3 11.500 12 3l9 8.500V21h-6v-6H9v6H3z"/>',
  restart: '<path d="M4.500 12a7.500 7.500 0 1 0 2.400-5.500" fill="none" stroke="currentColor" stroke-width="2.600" stroke-linecap="round"/><path d="M3.500 3.500v5h5z"/>',
  volume: '<path d="M3 9.500h4l5-4.500v14l-5-4.500H3z"/><path d="M15.500 8.500a5 5 0 0 1 0 7M18 6a8.500 8.500 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  music: '<path d="M9 18V5l11-2.500v13" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linejoin="round"/><circle cx="6.500" cy="18" r="3"/><circle cx="17.500" cy="15.500" r="3"/>',
  star: '<path d="M12 2.500l2.900 6 6.600.900-4.800 4.600 1.200 6.500L12 17.400 6.100 20.500l1.200-6.500L2.500 9.400l6.600-.900z"/>',
  clock: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.400"/><path d="M12 6.500V12l3.800 2.300" fill="none" stroke="currentColor" stroke-width="2.400" stroke-linecap="round"/>',
  flag: '<path d="M5 21V3" stroke="currentColor" stroke-width="2.600" stroke-linecap="round"/><path d="M6.500 4h12l-2.500 4 2.500 4h-12z"/>',
  wifi: '<path d="M2.500 9a14 14 0 0 1 19 0M5.800 12.600a9.300 9.300 0 0 1 12.400 0M9 16a4.600 4.600 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="2.400" stroke-linecap="round"/><circle cx="12" cy="19.300" r="1.600"/>',
  download: '<path d="M12 3v11M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.600" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 19.500h16" stroke="currentColor" stroke-width="2.600" stroke-linecap="round"/>',
  heart: '<path d="M12 21C5 15.500 2.500 12.300 2.500 8.600A5.100 5.100 0 0 1 12 6a5.100 5.100 0 0 1 9.500 2.600c0 3.700-2.500 6.900-9.500 12.400z"/>',
  rocket: '<path d="M14 3c4 .500 6.500 3 7 7l-6 6-5-5z"/><path d="M10 11l-5 1 3-4zM13 14l-1 5 4-3z" opacity=".8"/><path d="M6.500 15.500c-2 .500-3 2.500-3 5 2.500 0 4.500-1 5-3z" opacity=".7"/>',
  chev: '<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.800" stroke-linecap="round" stroke-linejoin="round"/>',
  robot: '<rect x="4.500" y="8" width="15" height="11" rx="3"/><circle cx="9" cy="13" r="1.800" fill="#0b1026"/><circle cx="15" cy="13" r="1.800" fill="#0b1026"/><path d="M12 8V4" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="3.500" r="1.600"/>',
  info: '<circle cx="12" cy="12" r="9.500" fill="none" stroke="currentColor" stroke-width="2.200"/><path d="M12 11v6" stroke="currentColor" stroke-width="2.600" stroke-linecap="round"/><circle cx="12" cy="7.400" r="1.500"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.600" stroke-linecap="round" stroke-linejoin="round"/>',
  globe: '<circle cx="12" cy="12" r="9.300" fill="none" stroke="currentColor" stroke-width="2.200"/><path d="M3 12h18M12 2.700c3 3.300 3 15.300 0 18.600M12 2.700c-3 3.300-3 15.300 0 18.600" fill="none" stroke="currentColor" stroke-width="1.800"/>',
  hourglass: '<path d="M6 2.500h12M6 21.500h12" stroke="currentColor" stroke-width="2.600" stroke-linecap="round"/><path d="M7.500 3c0 5 4.500 6 4.500 9s-4.500 4-4.500 9h9c0-5-4.500-6-4.500-9s4.500-4 4.500-9z"/>',
  copy: '<rect x="8.500" y="8.500" width="12" height="12" rx="2.400"/><path d="M5.500 15.500h-1a1.500 1.500 0 0 1-1.500-1.500V5a2 2 0 0 1 2-2h9a1.500 1.500 0 0 1 1.500 1.500v1" fill="none" stroke="currentColor" stroke-width="2.200"/>',
};

export function icon(name, cls = '') {
  const s = document.createElement('span');
  s.className = 'ico ' + cls;
  s.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${P[name] || ''}</svg>`;
  return s;
}

/** The game logo: BACK 2 KCAB (the second word mirrored: back to back). */
export function logo(small = false) {
  return h('div.logo' + (small ? '.small' : ''), { 'aria-label': 'BACK2BACK' },
    h('span.logo-w', 'BACK'),
    h('span.logo-2', h('i', '2'), icon('bolt')),
    h('span.logo-w.flip', 'BACK'));
}
