/* RASTRO DE CELDAS — al mover el ratón por una zona vacía, aparecen celdas cuadradas de color (a veces con un símbolo dentro)
   que siguen al cursor, se mantienen un instante y se desvanecen. Efecto visto en fiddle.digital, hecho aquí desde cero:
   los símbolos son formas sencillas dibujadas en este archivo (cruz, aspa, aro, flecha, destello y un tomate).
   Solo con ratón y sin "reducir movimiento". "Zona vacía" = donde no hay texto, enlaces, imágenes ni vídeo (ver AVOID).
   Configuración en <body>:
     data-trail="light"   celdas oscuras (fondo claro: cielo, página blanca)   ·   data-trail="dark"  celdas crema (fondo negro)
     data-trail-box="x,y,w,h"   rectángulo extra que se evita, en fracciones de la ventana (el tomate de la portada, la estantería de la sala)
     data-trail-only="intro-lock"   solo mientras el <body> tenga esa clase (la portada, antes de bajar a Work)
   Los colores y el tamaño de las celdas están en css/pixel-trail.css. */
(() => {
  const body = document.body;
  if (!body.dataset.trail) return;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* Lo que cuenta como "contenido": las celdas no aparecen debajo de esto */
  const AVOID = 'a, button, h1, h2, h3, h4, p, li, img, video, figure, .p-card, [data-trail-avoid]';
  const LIFE = 650;       // ms que se mantiene una celda antes de empezar a desvanecerse
  const FADE = 320;       // ms que tarda en desvanecerse (debe coincidir con css/pixel-trail.css)
  const PAD = 6;          // margen alrededor del contenido donde tampoco aparecen celdas
  const SYMBOL_CHANCE = .55;
  const BLOB_CHANCE = .45; // probabilidad de que la celda arrastre a una vecina (da el contorno escalonado)

  /* Símbolos propios, 24×24. El color lo da la celda (--pt-ink); el tomate lleva los suyos. */
  const S = (inner) => `<svg viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
  const SYMBOLS = [
    S('<path d="M10.8 4h2.4v6.8H20v2.4h-6.8V20h-2.4v-6.8H4v-2.4h6.8z" fill="currentColor"/>'),
    S('<path d="M10.8 4h2.4v6.8H20v2.4h-6.8V20h-2.4v-6.8H4v-2.4h6.8z" fill="currentColor" transform="rotate(45 12 12)"/>'),
    S('<circle cx="12" cy="12" r="6.2" fill="none" stroke="currentColor" stroke-width="2.4"/>'),
    S('<path d="M9 5.5 15.5 12 9 18.5" fill="none" stroke="currentColor" stroke-width="2.4"/>'),
    S('<g stroke="currentColor" stroke-width="1.6" stroke-linecap="square"><path d="M12 2.5v19M2.5 12h19M5.3 5.3l13.4 13.4M18.7 5.3 5.3 18.7"/></g>'),
    S('<circle cx="12" cy="13.6" r="6.4" fill="#f83d0c"/><path d="m12 7.4-2.6-2.7 2.6.9 2.6-.9z" fill="#6fae3c" stroke="#6fae3c" stroke-width="1.2" stroke-linejoin="round"/>'),
  ];

  const layer = document.createElement('div');
  layer.className = 'pt-layer';
  layer.setAttribute('aria-hidden', 'true');
  body.appendChild(layer);

  let cell = 72, cols = 0, boxes = [], boxesAt = -1e9;
  const live = new Map(); // "col,row" -> { el, t1, t2 }

  const measure = () => {
    cell = Math.round(Math.min(84, Math.max(52, innerWidth * .05)));
    cols = Math.ceil(innerWidth / cell);
    layer.style.setProperty('--pt-cell', cell + 'px');
    boxesAt = -1e9;
  };
  measure();
  addEventListener('resize', measure, { passive: true });

  /* Rectángulos ocupados, en píxeles de la ventana. Se recalculan como mucho cada 250 ms (la página puede desplazarse) */
  const getBoxes = (now) => {
    if (now - boxesAt < 250) return boxes;
    boxesAt = now;
    boxes = [];
    document.querySelectorAll(AVOID).forEach((el) => {
      if (el.closest('.sr-only')) return;
      const st = getComputedStyle(el);
      if (st.visibility === 'hidden' || st.opacity === '0') return; // lo invisible no cuenta (p. ej. el texto "Creative Designer" antes de aparecer)
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight) return;
      boxes.push([r.left - PAD, r.top - PAD, r.right + PAD, r.bottom + PAD]);
    });
    const fixed = (body.dataset.trailBox || '').split(',').map(parseFloat);
    if (fixed.length === 4 && fixed.every((v) => !isNaN(v))) {
      boxes.push([fixed[0] * innerWidth, fixed[1] * innerHeight, (fixed[0] + fixed[2]) * innerWidth, (fixed[1] + fixed[3]) * innerHeight]);
    }
    return boxes;
  };

  const free = (col, row, now) => {
    const x0 = col * cell, y0 = row * cell, x1 = x0 + cell, y1 = y0 + cell;
    return !getBoxes(now).some((b) => x0 < b[2] && x1 > b[0] && y0 < b[3] && y1 > b[1]);
  };

  const kill = (key) => {
    const c = live.get(key);
    if (!c) return;
    clearTimeout(c.t1); clearTimeout(c.t2);
    c.el.remove();
    live.delete(key);
  };

  const light = (col, row, now) => {
    if (col < 0 || row < 0 || col >= cols || row * cell >= innerHeight) return;
    const key = col + ',' + row;
    if (!free(col, row, now)) return;
    let c = live.get(key);
    if (c) { // ya encendida: se renueva su vida
      clearTimeout(c.t1); clearTimeout(c.t2);
      c.el.classList.remove('is-out');
    } else {
      const el = document.createElement('i');
      el.className = 'pt-cell';
      el.style.left = col * cell + 'px';
      el.style.top = row * cell + 'px';
      if (Math.random() < SYMBOL_CHANCE) el.innerHTML = SYMBOLS[(Math.random() * SYMBOLS.length) | 0];
      layer.appendChild(el);
      c = { el };
      live.set(key, c);
    }
    c.t1 = setTimeout(() => {
      c.el.classList.add('is-out');
      c.t2 = setTimeout(() => kill(key), FADE);
    }, LIFE);
  };

  let last = null, want = null, raf = 0;
  const frame = () => {
    raf = 0;
    if (!want) return;
    if (body.dataset.trailOnly && !body.classList.contains(body.dataset.trailOnly)) { want = null; last = null; return; }
    const now = performance.now();
    const col = Math.floor(want.x / cell), row = Math.floor(want.y / cell);
    if (!last || last.col !== col || last.row !== row) {
      // si el ratón va rápido, se rellena el camino celda a celda para que no queden saltos
      const from = last || { col, row };
      const steps = Math.min(14, Math.max(Math.abs(col - from.col), Math.abs(row - from.row)));
      for (let i = 1; i <= steps; i++) {
        const c = Math.round(from.col + (col - from.col) * i / steps), r = Math.round(from.row + (row - from.row) * i / steps);
        light(c, r, now);
        if (Math.random() < BLOB_CHANCE) {
          const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][(Math.random() * 4) | 0];
          light(c + d[0], r + d[1], now);
        }
      }
      if (!steps) light(col, row, now);
      last = { col, row };
    }
    want = null;
  };

  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    want = { x: e.clientX, y: e.clientY };
    if (!raf) raf = requestAnimationFrame(frame);
  }, { passive: true });
  document.addEventListener('mouseleave', () => { last = null; want = null; });
})();
