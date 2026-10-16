// PÁGINAS DE PROYECTO · galería en cuadrícula infinita (#grid-hero): va dentro del cuadrado redondeado,
// se desplaza sola muy despacio y se puede arrastrar en cualquier dirección (con inercia).
// Las imágenes se repiten para llenar la cuadrícula. Basta con poner las <figure> dentro de
// <section class="grid-hero" id="grid-hero"> (ver project/soap-and-glory-vanilla).

(() => {
  const root = document.getElementById('grid-hero');
  if (!root) return;
  const sources = [...root.querySelectorAll('.grid-source img')].map((img) => ({
    src: img.currentSrc || img.src,
    srcset: img.getAttribute('srcset') || '',
    alt: img.alt,
  }));
  const n = sources.length;
  if (!n) return;

  const plane = document.createElement('div');
  plane.className = 'grid-plane';
  plane.setAttribute('aria-hidden', 'true');
  root.prepend(plane);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mod = (a, b) => ((a % b) + b) % b;
  const DRIFT_X = -0.22, DRIFT_Y = -0.14;   // auto-desplazamiento (px por frame)

  let cells = [], cols = 0, rows = 0, size = 0, gap = 0, step = 0;
  let ox = 0, oy = 0, vx = 0, vy = 0;
  let dragging = false, visible = true, raf = 0;

  function build() {
    const w = root.clientWidth, h = root.clientHeight;
    gap = w < 640 ? 8 : 12;
    size = Math.round(w * (w < 640 ? 0.42 : 0.3));
    step = size + gap;
    cols = Math.ceil(w / step) + 2;
    rows = Math.ceil(h / step) + 2;
    plane.style.setProperty('--cell', size + 'px');
    plane.textContent = '';
    cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const fig = document.createElement('figure');
        fig.className = 'grid-cell';
        const img = document.createElement('img');
        img.decoding = 'async';
        img.draggable = false;
        img.sizes = size + 'px';
        fig.style.setProperty('--d', ((r + c) * 45) + 'ms');
        fig.append(img);
        plane.append(fig);
        cells.push({ fig, img, c, r, idx: -1 });
      }
    }
    render();
  }

  function render() {
    const W = cols * step, H = rows * step;
    // Columnas alternas desplazadas media celda: queda menos "tablero" y más mosaico
    for (const cell of cells) {
      const rawX = cell.c * step + ox;
      const lc = cell.c - Math.floor(rawX / W) * cols;              // columna "real" (no se repite)
      const shift = mod(lc, 2) ? step / 2 : 0;
      const rawY = cell.r * step + oy + shift;
      const lr = cell.r - Math.floor(rawY / H) * rows;
      const x = mod(rawX, W) - step;
      const y = mod(rawY, H) - step;
      cell.fig.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      const idx = mod(lc + lr * 2, n);                               // vecinas siempre distintas
      if (idx !== cell.idx) {
        const s = sources[idx];
        cell.idx = idx;
        if (s.srcset) cell.img.srcset = s.srcset;
        cell.img.src = s.src;
        cell.img.alt = '';
      }
    }
  }

  function tick() {
    raf = 0;
    if (!dragging) {
      vx *= 0.94; vy *= 0.94;
      if (Math.abs(vx) < 0.01) vx = 0;
      if (Math.abs(vy) < 0.01) vy = 0;
      const drift = reduced.matches ? 0 : 1;
      ox += vx + DRIFT_X * drift;
      oy += vy + DRIFT_Y * drift;
    }
    render();
    if (visible && (!reduced.matches || dragging || vx || vy)) raf = requestAnimationFrame(tick);
  }
  const start = () => { if (!raf && visible) raf = requestAnimationFrame(tick); };

  // Arrastrar (ratón y dedo). En móvil el gesto vertical sigue haciendo scroll de la página.
  let px = 0, py = 0, lastT = 0, moved = 0;
  root.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || e.target.closest('a, button')) return;
    dragging = true; moved = 0;
    px = e.clientX; py = e.clientY; lastT = performance.now();
    vx = vy = 0;
    root.setPointerCapture(e.pointerId);
    root.classList.add('dragging');
    start();
  });
  root.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - px, dy = e.clientY - py;
    const now = performance.now(), dt = Math.max(1, now - lastT);
    px = e.clientX; py = e.clientY; lastT = now;
    ox += dx; oy += dy; moved += Math.abs(dx) + Math.abs(dy);
    vx = (dx / dt) * 16; vy = (dy / dt) * 16;
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    root.classList.remove('dragging');
    if (performance.now() - lastT > 80) vx = vy = 0;               // soltó quieto: sin inercia
    start();
  };
  root.addEventListener('pointerup', release);
  root.addEventListener('pointercancel', release);
  root.addEventListener('lostpointercapture', release);

  // Flechas del teclado
  root.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: [12, 0], ArrowRight: [-12, 0], ArrowUp: [0, 12], ArrowDown: [0, -12] }[e.key];
    if (!k) return;
    e.preventDefault();
    vx = k[0]; vy = k[1];
    start();
  });

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visible ? start() : (cancelAnimationFrame(raf), raf = 0);
  }).observe(root);
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    visible ? start() : (cancelAnimationFrame(raf), raf = 0);
  });
  reduced.addEventListener('change', start);

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 150);
  });

  root.classList.add('is-live');   // antes de medir: el cuadrado ya no lleva la cuadrícula de reserva
  build();
  requestAnimationFrame(() => root.classList.add('is-in'));
  start();
})();
