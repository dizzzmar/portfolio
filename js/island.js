// PLAYGROUND › ISLAND · monta el mundo isométrico de js/about-scene.js a pantalla completa. Controles (css/island.css): hora, tiempo y zoom como píldoras;
// la rueda o el pellizco acercan (también + y −, y doble clic o doble toque), arrastrar recorre la isla (también con las flechas). Solo se dibuja mientras la pestaña se ve.
// Si three.js o el WebGL no cargan, la página queda con el fondo rosa y los controles sin efecto.
const stage = document.querySelector('[data-island]');
const canvas = stage.querySelector('.scene-canvas');
const ui = document.querySelector('.scene-ui');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

import('/js/about-scene.js?v=20261203fase2').then((m) => {
  const scene = m.startScene(canvas, { still: reduced });
  scene.setFull(true);
  scene.onSky((color, dark) => {
    stage.style.backgroundColor = color; document.documentElement.style.backgroundColor = color;
    document.body.classList.toggle('scene-night', dark);
  });
  scene.play();
  document.addEventListener('visibilitychange', () => { if (document.hidden) scene.pause(); else scene.play(); });

  // ---------- Gestos ----------
  const pts = new Map();
  let downAt = 0, moved = 0, pinch = 0, lastTap = 0;
  stage.addEventListener('pointerdown', (e) => {
    stage.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { downAt = performance.now(); moved = 0; }
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); moved = 99; }
  });
  stage.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const p = pts.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) scene.zoomAt(d / pinch, (a.x + b.x) / 2, (a.y + b.y) / 2);
      pinch = d; return;
    }
    moved += Math.abs(dx) + Math.abs(dy);
    if (moved > 6) scene.panBy(dx, dy);
  });
  const up = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pts.size || moved > 6 || performance.now() - downAt > 600) return;
    if (!scene.onIsland(e.clientX, e.clientY)) return;
    if (performance.now() - lastTap < 320) { scene.zoomed ? scene.resetView() : scene.zoomBy(2, e.clientX, e.clientY); lastTap = 0; }   // doble toque: acercar o volver
    else lastTap = performance.now();
  };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', (e) => pts.delete(e.pointerId));
  stage.addEventListener('wheel', (e) => { e.preventDefault(); scene.zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); }, { passive: false });
  addEventListener('keydown', (e) => {
    if (e.target.closest?.('.scene-ui, .menu, [role="dialog"]')) return;
    const keys = { '+': () => scene.zoomBy(1), '=': () => scene.zoomBy(1), '-': () => scene.zoomBy(-1), ArrowLeft: () => scene.panBy(60, 0), ArrowRight: () => scene.panBy(-60, 0), ArrowUp: () => scene.panBy(0, 60), ArrowDown: () => scene.panBy(0, -60) };
    if (keys[e.key]) { e.preventDefault(); keys[e.key](); }
  });

  // ---------- Controles ----------
  const times = [...ui.querySelectorAll('[data-time]')], weathers = [...ui.querySelectorAll('[data-weather]')];
  const follow = ui.querySelector('[data-follow]'), auto = ui.querySelector('[data-auto]');
  scene.onChange((s) => {
    times.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.time) === s.time)));
    weathers.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.weather) === s.weather)));
    follow.setAttribute('aria-pressed', String(s.follow)); auto.setAttribute('aria-pressed', String(s.auto));
  });
  ui.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if ('time' in b.dataset) scene.setTime(Number(b.dataset.time));
    else if ('weather' in b.dataset) scene.setWeather(Number(b.dataset.weather));
    else if ('follow' in b.dataset) scene.setFollow(b.getAttribute('aria-pressed') !== 'true');
    else if ('auto' in b.dataset) scene.setAuto(b.getAttribute('aria-pressed') !== 'true');
    else if ('zoom' in b.dataset) scene.zoomBy(Number(b.dataset.zoom));
  });
}).catch(() => {});
