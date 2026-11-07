// DIGITAL ARCHIVE · muro de una colección (/archive/<colección>/): las piezas cuelgan en una rejilla inclinada que se repite sin fin, como en el álbum de
// Pokémon (mismo motor: js/room/infinite-card-grid.js). Las piezas salen de assets/archive/<colección>/items.json; no llevan pie (el nombre es el texto
// alternativo de la imagen). Pulsar una pieza (o Enter) abre su visor: título grande, la pieza al centro que se inclina hacia el ratón por toda la
// pantalla y sus datos abajo (referencia: nicolo-lombardi.com/archive/la-barra). La dirección lleva la pieza (#pink-lady). Sin JavaScript queda el título de la colección y un aviso.
import { createInfiniteCardGrid } from '/js/room/infinite-card-grid.js?v=20261201drift1';

const surface = document.querySelector('.archive-surface');
const list = surface.querySelector('.archive-cards');
const status = document.querySelector('[data-archive-status]');
const retry = document.querySelector('[data-archive-retry]');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const base = surface.dataset.base;                 // carpeta de la colección, p. ej. /assets/archive/fruit-stickers/
let grid = null, items = [];

function makeCard(item) {
  const figure = document.createElement('figure');
  figure.className = 'archive-card'; figure.dataset.card = item.id;
  const turn = document.createElement('span'); turn.className = 'archive-turn';
  const img = document.createElement('img');
  img.src = new URL(item.thumb || item.src, location.origin + base).href; img.alt = item.name; img.width = item.width || 640; img.height = item.height || 640;
  img.draggable = false; img.decoding = 'async';
  turn.append(img); figure.append(turn);
  return figure;
}

async function load() {
  retry.hidden = true; status.hidden = false; status.textContent = 'Loading…';
  try {
    const response = await fetch(base + 'items.json?v=20261207thumbs1');
    if (!response.ok) throw new Error('Collection unavailable');
    const data = await response.json();
    if (!Array.isArray(data.items) || !data.items.length) throw new Error('Empty collection');
    status.hidden = true;
    items = data.items;
    grid?.destroy();
    grid = createInfiniteCardGrid({ surface, list, cards: data.items, makeCard, reduced: motion, entrance: !motion.matches, prefix: 'archive', aspect: 1, size: 1.1, drift: { x: -7, y: -3.5 } });   // deriva muy lenta (unos 8 px por segundo)
    grid.pause(Boolean(current));
    if (location.hash) fromHash();                 // dirección con pieza (#pink-lady): se abre esa pieza al cargar
  } catch (error) {
    status.textContent = 'The collection could not load. Please try again.'; retry.hidden = false;
  }
}
retry.addEventListener('click', load);
load();

// ---------- Visor ----------
const viewer = document.getElementById('archive-viewer');
const nameEl = viewer.querySelector('.archive-viewer-name');
const pieceEl = viewer.querySelector('.archive-piece');
const imgEl = pieceEl.querySelector('img');
const factsEl = viewer.querySelector('.archive-facts');
const closeBtn = viewer.querySelector('[data-viewer-close]');
const TILT = { x: 16, y: 20 };                    // grados máximos hacia el ratón (arriba/abajo, izquierda/derecha)
let openedAt = 0, current = null, returnFocus = null, pushed = false, raf = 0, last = 0;
const PAIRS = [['rx', 'tx'], ['ry', 'ty'], ['gx', 'tgx'], ['gy', 'tgy'], ['gloss', 'tgloss']];   // valor actual y hacia dónde va
const tilt = { rx: 0, ry: 0, tx: 0, ty: 0, gx: 50, gy: 30, tgx: 50, tgy: 30, gloss: 0, tgloss: 0 };

function fillViewer(item) {
  nameEl.dataset.len = item.name.length > 30 ? 'xl' : item.name.length > 20 ? 'long' : '';   // los títulos largos se componen más pequeños (css/archive.css)
  nameEl.replaceChildren(...item.name.split(' ').flatMap((word, i) => {
    const mask = document.createElement('span'); mask.className = 'mask';
    const inner = document.createElement('span'); inner.style.setProperty('--i', i); inner.textContent = word; mask.append(inner);
    return i ? [' ', mask] : [mask];
  }));
  const src = new URL(item.src, location.origin + base).href;
  imgEl.src = src; imgEl.alt = item.name;
  pieceEl.style.setProperty('--piece', `url("${src}")`);
  pieceEl.style.setProperty('--ratio', ((item.width || 1) / (item.height || 1)).toFixed(3));   // cada pieza con su proporción
  factsEl.replaceChildren(...(item.facts || []).map(([label, value], i) => {
    const row = document.createElement('div'); row.style.setProperty('--i', i);
    const dt = document.createElement('dt'); dt.textContent = label;
    const dd = document.createElement('dd'); dd.textContent = value;
    row.append(dt, dd); return row;
  }));
}

// Un cuadro de animación a la vez: la pieza persigue el ratón con suavidad y vuelve al centro al soltar o al salir
function frame(now) {
  raf = 0;
  const dt = Math.min((now - (last || now - 16)) / 1000, .05); last = now;
  const k = 1 - Math.exp(-9 * dt);
  for (const [key, to] of PAIRS) tilt[key] += (tilt[to] - tilt[key]) * k;
  pieceEl.style.setProperty('--rx', tilt.rx.toFixed(2) + 'deg'); pieceEl.style.setProperty('--ry', tilt.ry.toFixed(2) + 'deg');
  pieceEl.style.setProperty('--gx', tilt.gx.toFixed(1) + '%'); pieceEl.style.setProperty('--gy', tilt.gy.toFixed(1) + '%'); pieceEl.style.setProperty('--gloss', tilt.gloss.toFixed(3));
  if (PAIRS.some(([key, to]) => Math.abs(tilt[to] - tilt[key]) > .02)) raf = requestAnimationFrame(frame); else last = 0;
}
const wake = () => { if (!raf && current && !motion.matches) raf = requestAnimationFrame(frame); };
function aim(event) {
  if (!current || motion.matches) return;
  const r = viewer.getBoundingClientRect();
  const nx = Math.max(-1, Math.min(1, (event.clientX - r.left) / r.width * 2 - 1));    // toda la pantalla cuenta, no solo la pieza
  const ny = Math.max(-1, Math.min(1, (event.clientY - r.top) / r.height * 2 - 1));
  tilt.ty = nx * TILT.y; tilt.tx = -ny * TILT.x;
  const p = pieceEl.getBoundingClientRect();
  tilt.tgx = Math.max(0, Math.min(100, (event.clientX - p.left) / p.width * 100)); tilt.tgy = Math.max(0, Math.min(100, (event.clientY - p.top) / p.height * 100));
  tilt.tgloss = 1; wake();
}
function rest() { tilt.tx = tilt.ty = 0; tilt.tgx = 50; tilt.tgy = 30; tilt.tgloss = 0; wake(); }
viewer.addEventListener('pointermove', aim);
viewer.addEventListener('pointerdown', aim);
viewer.addEventListener('pointerleave', rest);
viewer.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') rest(); });
// Pulsar fuera de la pieza (el fondo, el título, los datos) cierra el visor; arrastrar para inclinarla con el dedo no cuenta como pulsar
let tap = null;
viewer.addEventListener('pointerdown', (e) => { tap = { x: e.clientX, y: e.clientY }; });
viewer.addEventListener('click', (e) => {
  const moved = tap ? Math.hypot(e.clientX - tap.x, e.clientY - tap.y) : 0; tap = null;
  if (!current || moved > 8 || performance.now() - openedAt < 300) return;
  if (e.target.closest('.archive-piece, [data-viewer-close]')) return;
  close();
});

function show(item) {
  current = item; fillViewer(item);
  viewer.hidden = false; void viewer.offsetWidth;
  viewer.classList.add('is-open'); document.body.classList.add('archive-viewing');
  surface.inert = true; document.querySelector('.nav')?.setAttribute('inert', '');
  grid?.pause(true); openedAt = performance.now();
  viewer.focus({ preventScroll: true }); rest(); wake();   // el foco entra en el visor, no en «Close»: así no se dibuja un aro al abrir con el ratón
}
function hide() {
  if (!current) return;
  current = null; grid?.pause(false);
  viewer.classList.remove('is-open'); document.body.classList.remove('archive-viewing');
  surface.inert = false; document.querySelector('.nav')?.removeAttribute('inert');
  setTimeout(() => { if (!current) viewer.hidden = true; }, motion.matches ? 220 : 520);
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
}
function open(id, card, byKey = false) {
  const item = items.find((x) => x.id === id); if (!item) return;
  returnFocus = byKey ? card : null;   // el foco solo vuelve a la pieza si se abrió con el teclado: con el ratón dejaría un aro blanco alrededor al cerrar
  if (location.hash !== '#' + id) { history.pushState(null, '', '#' + id); pushed = true; }
  show(item);
}
function close() {
  if (!current) return;
  if (pushed && location.hash) { pushed = false; history.back(); return; }   // el evento popstate lo cierra
  history.replaceState(null, '', location.pathname + location.search); hide();
}
function fromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) { hide(); return; }
  const item = items.find((x) => x.id === id);
  if (item) { if (!current || current.id !== id) show(item); } else hide();
}
addEventListener('popstate', fromHash);
closeBtn.addEventListener('click', close);
addEventListener('keydown', (e) => { if (e.key === 'Escape' && current) { e.preventDefault(); close(); } });
viewer.addEventListener('keydown', (e) => {                       // el foco se queda dentro del visor
  if (e.key === 'Tab') { e.preventDefault(); closeBtn.focus(); }
});

// Pulsar una pieza (sin arrastrar) la abre. El motor del muro captura el puntero al arrastrar, así que se busca la pieza por las coordenadas.
let press = null;
surface.addEventListener('pointerdown', (e) => { press = { x: e.clientX, y: e.clientY, t: performance.now(), touch: e.pointerType !== 'mouse' }; });
surface.addEventListener('pointerup', (e) => {
  if (!press) return;
  const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y), quick = performance.now() - press.t < 600;
  const limit = press.touch ? 12 : 5; press = null;
  if (moved > limit || !quick) return;
  const card = document.elementFromPoint(e.clientX, e.clientY)?.closest('.archive-card');
  if (card) open(card.dataset.card, card, false);
});
surface.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest?.('.archive-card'); if (!card) return;
  e.preventDefault(); open(card.dataset.card, card, true);
});
