// ABOUT · hace aparecer cada bloque marcado con data-reveal cuando entra en pantalla.
// Los bloques que entran juntos aparecen uno detrás de otro (75ms de diferencia).
// Sin este script (o con "reducir movimiento" activado) todo se ve directamente: ver css/about.css.

(() => {
  const items = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).forEach((e, i) => {
      e.target.style.setProperty('--d', i * 75 + 'ms');
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach((el) => io.observe(el));
})();

// FOTO HOLOGRÁFICA · como una carta coleccionable: con ratón, la carta (por las dos caras) se inclina hacia el cursor, el brillo del fondo se desplaza
// y un reflejo de luz lo sigue; al salir vuelve a su sitio. En pantallas táctiles se mueve sola, despacio, mientras se ve.
// Con "reducir movimiento" no se hace nada (la foto se ve normal). Los estilos están en css/about.css (.holo).
(() => {
  const card = document.querySelector('[data-holo]');
  if (!card || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const inner = card.querySelector('.tilt') || card.querySelector('.holo-card');   // la carta entera: foto y dorso
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  let x = 0.5, y = 0.5, o = 0, tx = 0.5, ty = 0.5, to = 0, raf = 0, visible = false;
  const paint = (t) => {
    raf = 0;
    if (!fine) { // táctil: un vaivén lento, como si la carta se moviera en la mano
      const s = t / 1000;
      tx = 0.5 + Math.sin(s * 0.7) * 0.3;
      ty = 0.5 + Math.sin(s * 0.9 + 1) * 0.25;
      to = 0.7;
    }
    x += (tx - x) * 0.12; y += (ty - y) * 0.12; o += (to - o) * 0.12;
    inner.style.setProperty('--rx', ((0.5 - y) * 16).toFixed(2) + 'deg');
    inner.style.setProperty('--ry', ((x - 0.5) * 20).toFixed(2) + 'deg');
    inner.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
    inner.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    inner.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
    inner.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
    inner.style.setProperty('--o', o.toFixed(3));
    inner.style.setProperty('--sx', ((0.5 - x) * 20).toFixed(1) + 'px');
    inner.style.setProperty('--sy', ((0.5 - y) * 16).toFixed(1) + 'px');
    const moving = Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(to - o) > 0.002;
    if ((fine && moving) || (!fine && visible)) raf = requestAnimationFrame(paint);
  };
  const wake = () => { if (!raf) raf = requestAnimationFrame(paint); };
  if (fine) {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      tx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      ty = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      to = 1;
      wake();
    });
    card.addEventListener('pointerleave', () => { tx = 0.5; ty = 0.5; to = 0; wake(); });
  } else {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }).observe(card);
  }
})();

// LA FOTO SE DA LA VUELTA · al pulsarla (es un botón: también con Enter o Espacio) la tarjeta gira y por detrás aparece el pequeño mundo isométrico en pixel art
// (js/about-scene.js). Pulsando la ilustración (la isla) la carta crece hasta llenar la pantalla; pulsando fuera de la isla vuelve a su sitio (o con Escape).
// En la carta, pulsar fuera de la isla la gira otra vez hacia la foto. Igual en el ordenador y en el móvil.
// A pantalla completa: unas píldoras cambian la hora del día y el tiempo, otras acercan o alejan, «Close» cierra, la rueda o el pellizco acercan (también + y −, y doble clic) y arrastrando se recorre la isla
// (también con las flechas). El fondo lo pone la escena: blanco o rosa de día, teñido al amanecer y al atardecer, oscuro de noche.
// Con el teclado: Enter gira la foto, Enter en el dorso la abre a pantalla completa y Escape va deshaciendo (cierra la pantalla completa, luego gira a la foto).
// La escena (y three.js) se piden la primera vez que el ratón se acerca a la foto o al girarla, y solo se dibuja mientras se ve.
(() => {
  const card = document.querySelector('[data-holo]');
  const btn = card && card.querySelector('.flip-btn');
  if (!btn) return;
  const back = card.querySelector('.scene-back'), canvas = card.querySelector('.scene-canvas');
  const ui = document.querySelector('.scene-ui');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const URL_SCENE = '/js/about-scene.js?v=20261127world3';
  let scene = null, loading = null, flipped = false, inView = true, full = false, home = null;
  const ensure = () => loading || (loading = import(URL_SCENE).then((m) => {
    scene = m.startScene(canvas, { still: reduced });
    scene.onSky((color, dark) => { back.style.backgroundColor = color; card.classList.toggle('scene-night', dark); });
    if (ui) wireControls();
    return scene;
  }).catch(() => null));
  // La escena se monta antes de girar la foto (al acercar el ratón, o en un rato libre en pantallas táctiles), para que el giro vaya fluido
  card.addEventListener('pointerenter', () => { ensure(); }, { once: true });
  if (!matchMedia('(hover: hover)').matches) {
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1200));
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); idle(() => ensure(), { timeout: 2500 }); } });
    io.observe(card);
  }
  const root = document.documentElement;
  const label = () => {
    btn.setAttribute('aria-pressed', String(flipped));
    btn.setAttribute('aria-label', full ? 'Close the full-screen scene' : flipped ? 'Open the scene full screen' : 'Turn the photo over');
    card.dataset.cursorLabel = full ? 'Close' : flipped ? 'Open' : 'Flip';
  };
  const showControls = () => { if (ui) ui.hidden = !full; };
  // Pantalla completa: la carta pasa a «fixed» con sus medidas de ahora y crece hasta la ventana (y al revés al cerrar)
  const place = (r) => Object.assign(card.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  function grow() {
    home = card.getBoundingClientRect(); full = true;
    root.classList.add('scene-full'); place(home); card.classList.add('is-full');
    void card.offsetWidth;
    place({ left: 0, top: 0, width: innerWidth, height: innerHeight }); label();
    if (scene) scene.setFull(true);
    showControls();
  }
  function shrink() {
    full = false; place(home); label(); showControls();
    if (scene) scene.setFull(false);
    const done = () => { if (full) return; card.classList.remove('is-full'); root.classList.remove('scene-full'); card.removeAttribute('style'); };
    if (reduced) done(); else setTimeout(done, 520);
  }
  function turn(on) {
    flipped = on; label();
    card.classList.toggle('is-flipped', flipped);
    back.setAttribute('aria-hidden', String(!flipped));
    if (flipped) ensure().then((s) => { if (flipped && inView) s && s.play(); });
    else setTimeout(() => { if (!flipped && scene) scene.pause(); }, reduced ? 0 : 900);   // deja de dibujar cuando ya no se ve
  }
  btn.addEventListener('click', (e) => {
    const keyboard = !e.detail;                                   // Enter o Espacio: no hay punto de la pantalla
    const island = !keyboard && scene && scene.onIsland(e.clientX, e.clientY);
    if (!flipped) turn(true);
    else if (full) { if (keyboard || !island) shrink(); }
    else if (keyboard || island) grow();
    else turn(false);
  });

  // ---------- Gestos a pantalla completa (el botón deja pasar el puntero: css/about.css) ----------
  const pts = new Map();
  let downAt = 0, moved = 0, pinch = 0, lastTap = 0;
  back.addEventListener('pointerdown', (e) => {
    if (!full || !scene) return;
    back.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { downAt = performance.now(); moved = 0; }
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); moved = 99; }
  });
  back.addEventListener('pointermove', (e) => {
    if (!full || !scene) return;
    if (!pts.has(e.pointerId)) { if (e.pointerType === 'mouse') card.dataset.cursorLabel = scene.onIsland(e.clientX, e.clientY) ? (scene.zoomed ? 'Drag' : 'Zoom') : 'Close'; return; }
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
    if (pts.size || !full || !scene) return;
    if (moved > 6 || performance.now() - downAt > 600) return;
    const island = scene.onIsland(e.clientX, e.clientY);
    if (!island) { shrink(); return; }
    if (performance.now() - lastTap < 320) { scene.zoomed ? scene.resetView() : scene.zoomBy(2, e.clientX, e.clientY); lastTap = 0; }   // doble toque: acercar o volver
    else lastTap = performance.now();
  };
  back.addEventListener('pointerup', up); back.addEventListener('pointercancel', (e) => pts.delete(e.pointerId));
  back.addEventListener('wheel', (e) => { if (!full || !scene) return; e.preventDefault(); scene.zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); }, { passive: false });

  addEventListener('keydown', (e) => {
    if (!flipped) return;
    if (e.key === 'Escape') { if (full) shrink(); else turn(false); btn.focus(); return; }
    if (!full || !scene || e.target.closest?.('.scene-ui')) return;
    const keys = { '+': () => scene.zoomBy(1), '=': () => scene.zoomBy(1), '-': () => scene.zoomBy(-1), ArrowLeft: () => scene.panBy(60, 0), ArrowRight: () => scene.panBy(-60, 0), ArrowUp: () => scene.panBy(0, 60), ArrowDown: () => scene.panBy(0, -60) };
    if (keys[e.key]) { e.preventDefault(); keys[e.key](); }
  });
  addEventListener('resize', () => { if (full) place({ left: 0, top: 0, width: innerWidth, height: innerHeight }); });
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (!scene) return; if (inView && flipped) scene.play(); else scene.pause(); }).observe(card);

  // ---------- Controles: hora, tiempo, zoom y cerrar (css/about.css, .scene-ui) ----------
  function wireControls() {
    const times = [...ui.querySelectorAll('[data-time]')], weathers = [...ui.querySelectorAll('[data-weather]')];
    const follow = ui.querySelector('[data-follow]'), auto = ui.querySelector('[data-auto]');
    scene.onChange((s) => {
      times.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.time) === s.time)));
      weathers.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.weather) === s.weather)));
      follow.setAttribute('aria-pressed', String(s.follow)); auto.setAttribute('aria-pressed', String(s.auto));
    });
    ui.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.classList.contains('sui-close')) { shrink(); btn.focus(); return; }
      if ('time' in b.dataset) scene.setTime(Number(b.dataset.time));
      else if ('weather' in b.dataset) scene.setWeather(Number(b.dataset.weather));
      else if ('follow' in b.dataset) scene.setFollow(b.getAttribute('aria-pressed') !== 'true');
      else if ('auto' in b.dataset) scene.setAuto(b.getAttribute('aria-pressed') !== 'true');
      else if ('zoom' in b.dataset) scene.zoomBy(Number(b.dataset.zoom));
    });
  }
})();
