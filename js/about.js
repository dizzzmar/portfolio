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

// LA FOTO SE DA LA VUELTA · al pulsarla (es un botón: también con Enter o Espacio) la tarjeta gira y por detrás aparece la escena isométrica en pixel art
// (js/about-scene.js). Pulsando la ilustración (la isla) la carta crece hasta llenar la pantalla sobre fondo rosa; pulsando fuera de la isla vuelve a su sitio
// (o con Escape). En la carta, pulsar fuera de la isla la gira otra vez hacia la foto. Igual en el ordenador y en el móvil.
// Con el teclado: Enter gira la foto, Enter en el dorso la abre a pantalla completa y Escape va deshaciendo (cierra la pantalla completa, luego gira a la foto).
// La escena (y three.js) se piden la primera vez que el ratón se acerca a la foto o al girarla, y solo se dibuja mientras se ve.
(() => {
  const card = document.querySelector('[data-holo]');
  const btn = card && card.querySelector('.flip-btn');
  if (!btn) return;
  const back = card.querySelector('.scene-back'), canvas = card.querySelector('.scene-canvas');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const URL_SCENE = '/js/about-scene.js?v=20261105full1';
  let scene = null, loading = null, flipped = false, inView = true, full = false, home = null;
  const ensure = () => loading || (loading = import(URL_SCENE).then((m) => (scene = m.startScene(canvas, { still: reduced }))).catch(() => null));
  card.addEventListener('pointerenter', () => { import(URL_SCENE).catch(() => {}); }, { once: true });   // se adelanta la descarga
  const root = document.documentElement;
  const label = () => {
    btn.setAttribute('aria-pressed', String(flipped));
    btn.setAttribute('aria-label', full ? 'Close the full-screen scene' : flipped ? 'Open the scene full screen' : 'Turn the photo over');
    card.dataset.cursorLabel = full ? 'Close' : flipped ? 'Open' : 'Flip';
  };
  // Pantalla completa: la carta pasa a «fixed» con sus medidas de ahora y crece hasta la ventana (y al revés al cerrar)
  const place = (r) => Object.assign(card.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  function grow() {
    home = card.getBoundingClientRect(); full = true;
    root.classList.add('scene-full'); place(home); card.classList.add('is-full');
    void card.offsetWidth;
    place({ left: 0, top: 0, width: innerWidth, height: innerHeight }); label();
  }
  function shrink() {
    full = false; place(home); label();
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
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !flipped) return;
    if (full) shrink(); else turn(false);
    btn.focus();
  });
  addEventListener('resize', () => { if (full) place({ left: 0, top: 0, width: innerWidth, height: innerHeight }); });
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (!scene) return; if (inView && flipped) scene.play(); else scene.pause(); }).observe(card);
})();
