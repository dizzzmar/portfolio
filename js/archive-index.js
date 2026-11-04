// DIGITAL ARCHIVE · índice (/archive/): una lista de colecciones y, a la derecha, una mancha orgánica (referencia: podium.global).
// Al pasar el ratón (o el foco del teclado) por una fila, el muro de esa colección aparece dentro de la mancha y se queda hasta que se elija otra fila.
// El muro es el mismo motor que el de la colección (js/room/infinite-card-grid.js): se arrastra, se mueve con la rueda y se inclina hacia el cursor.
// Pulsar una pieza (sin arrastrar) abre esa pieza en la página de la colección. La mancha respira sola y se inclina hacia el cursor.
// Solo con ratón y pantalla ancha: en el móvil no hay mancha y la lista es la de siempre. Con «reducir movimiento» la mancha queda quieta.
import { createInfiniteCardGrid } from '/js/room/infinite-card-grid.js?v=20261111archive1';

const blob = document.querySelector('.archive-blob');
const rows = [...document.querySelectorAll('.archive-row[data-items]')];
const live = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 821px)');
const motion = matchMedia('(prefers-reduced-motion: reduce)');

if (blob && rows.length) {
  const layers = new Map();     // fila → { layer, grid }
  let active = null;
  let started = false;

  // ---------- Contorno: curva cerrada suave por 9 puntos que respiran ----------
  const N = 9, shape = { w: 0, h: 0 }, lean = { a: 0, k: 0, ta: 0, tk: 0 };
  let pulse = 0, raf = 0, clock = 0;
  const radius = (angle, t) => {
    let r = .72 + .1 * Math.sin(angle * 2 + t * .00042) + .07 * Math.sin(angle * 3 - t * .00057 + 1.3) + .05 * Math.sin(angle * 5 + t * .0003 + .4);
    r += lean.k * .07 * Math.max(0, Math.cos(angle - lean.a));             // se abulta hacia el cursor
    return r * (1 + pulse * .05);
  };
  function outline(t) {
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2, r = radius(a, t);
      pts.push([shape.w / 2 + Math.cos(a) * r * shape.w / 2, shape.h / 2 + Math.sin(a) * r * shape.h / 2]);
    }
    const at = (i) => pts[(i + N) % N];
    let d = `M${at(0)[0].toFixed(1)} ${at(0)[1].toFixed(1)}`;
    for (let i = 0; i < N; i++) {      // Catmull-Rom cerrada convertida a curvas de Bézier
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d + 'Z';
  }
  function draw(now) {
    raf = 0;
    const dt = Math.min((now - (clock || now - 16)) / 1000, .05); clock = now;
    const k = 1 - Math.exp(-5 * dt);
    lean.a += Math.atan2(Math.sin(lean.ta - lean.a), Math.cos(lean.ta - lean.a)) * k; lean.k += (lean.tk - lean.k) * k;
    pulse += (0 - pulse) * (1 - Math.exp(-3 * dt));
    blob.style.clipPath = `path("${outline(now)}")`;
    if (!motion.matches && !document.hidden && visible) raf = requestAnimationFrame(draw); else clock = 0;
  }
  let visible = true;
  const wake = () => { if (!raf) raf = requestAnimationFrame(draw); };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }).observe(blob);
  document.addEventListener('visibilitychange', wake);
  new ResizeObserver(() => { shape.w = blob.clientWidth; shape.h = blob.clientHeight; wake(); }).observe(blob);
  addEventListener('pointermove', (e) => {
    if (motion.matches) return;
    const r = blob.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    lean.ta = Math.atan2(dy, dx); lean.tk = Math.min(1, Math.hypot(dx, dy) / (r.width * .9)); wake();
  }, { passive: true });

  // ---------- Capas: cada colección tiene su muro, que se crea la primera vez que se elige ----------
  async function mount(row) {
    const base = row.dataset.items;
    const layer = document.createElement('div'); layer.className = 'archive-layer';
    const surface = document.createElement('div'); surface.className = 'archive-surface';
    const list = document.createElement('ul'); list.className = 'archive-cards';
    surface.append(list); layer.append(surface); blob.append(layer);
    const entry = { layer, grid: null }; layers.set(row, entry);
    try {
      const response = await fetch(base + 'items.json?v=20261111archive3');
      if (!response.ok) throw new Error('unavailable');
      const data = await response.json();
      if (!Array.isArray(data.items) || !data.items.length) throw new Error('empty');
      const makeCard = (item) => {
        const figure = document.createElement('figure'); figure.className = 'archive-card'; figure.dataset.card = item.id;
        const turn = document.createElement('span'); turn.className = 'archive-turn';
        const img = document.createElement('img');
        img.src = new URL(item.src, location.origin + base).href; img.alt = item.name; img.width = item.width || 640; img.height = item.height || 640;
        img.draggable = false; img.decoding = 'async';
        turn.append(img); figure.append(turn); return figure;
      };
      entry.grid = createInfiniteCardGrid({ surface, list, cards: data.items, makeCard, reduced: motion, entrance: !motion.matches, prefix: 'archive', aspect: 1, size: 1.1 });
    } catch (error) { layers.delete(row); layer.remove(); return; }
    // Pulsar una pieza (sin arrastrar) abre esa pieza en la página de la colección
    let press = null;
    surface.addEventListener('pointerdown', (e) => { press = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    surface.addEventListener('pointerup', (e) => {
      if (!press) return;
      const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y), quick = performance.now() - press.t < 600; press = null;
      if (moved > 5 || !quick) return;
      const card = document.elementFromPoint(e.clientX, e.clientY)?.closest('.archive-card');
      if (card) location.href = row.getAttribute('href') + '#' + card.dataset.card;
    });
    if (active === row) layer.classList.add('is-on');
  }

  function activate(row) {
    if (active === row) return;
    active = row; pulse = 1; wake();
    rows.forEach((r) => r.classList.toggle('is-active', r === row));
    for (const [r, { layer }] of layers) layer.classList.toggle('is-on', r === row);
    if (!layers.has(row)) mount(row);
  }

  function start() {
    if (started || !live.matches) return;
    started = true; blob.classList.add('is-ready');
    activate(rows[0]);                                  // al llegar, ya se ve la primera colección
    rows.forEach((row) => {
      row.addEventListener('pointerenter', () => activate(row));
      row.addEventListener('focus', () => activate(row));
    });
  }
  live.addEventListener('change', start);
  start();
}
