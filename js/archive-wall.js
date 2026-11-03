// DIGITAL ARCHIVE · muro de una colección (/archive/<colección>/): las piezas cuelgan en una rejilla inclinada que se repite sin fin, como en el álbum de
// Pokémon (mismo motor: js/room/infinite-card-grid.js). Las piezas salen de assets/archive/<colección>/items.json; no llevan pie (el nombre es el texto
// alternativo de la imagen). Pulsar una pieza no abre nada. Sin JavaScript queda el título de la colección y un aviso.
import { createInfiniteCardGrid } from '/js/room/infinite-card-grid.js?v=20261111archive1';

const surface = document.querySelector('.archive-surface');
const list = surface.querySelector('.archive-cards');
const status = document.querySelector('[data-archive-status]');
const retry = document.querySelector('[data-archive-retry]');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const base = surface.dataset.base;                 // carpeta de la colección, p. ej. /assets/archive/fruit-stickers/
let grid = null;

function makeCard(item) {
  const figure = document.createElement('figure');
  figure.className = 'archive-card'; figure.dataset.card = item.id;
  const turn = document.createElement('span'); turn.className = 'archive-turn';
  const img = document.createElement('img');
  img.src = new URL(item.src, location.origin + base).href; img.alt = item.name; img.width = 640; img.height = 640;
  img.draggable = false; img.decoding = 'async';
  turn.append(img); figure.append(turn);
  return figure;
}

async function load() {
  retry.hidden = true; status.hidden = false; status.textContent = 'Loading…';
  try {
    const response = await fetch(base + 'items.json?v=20261111archive1');
    if (!response.ok) throw new Error('Collection unavailable');
    const data = await response.json();
    if (!Array.isArray(data.items) || !data.items.length) throw new Error('Empty collection');
    status.hidden = true;
    grid?.destroy();
    grid = createInfiniteCardGrid({ surface, list, cards: data.items, makeCard, reduced: motion, entrance: !motion.matches, prefix: 'archive', aspect: 1, size: 1.1 });
  } catch (error) {
    status.textContent = 'The collection could not load. Please try again.'; retry.hidden = false;
  }
}
retry.addEventListener('click', load);
load();
