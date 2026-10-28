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

// FOTO HOLOGRÁFICA · como una carta coleccionable: con ratón, la foto se inclina hacia el cursor, el brillo del fondo se desplaza
// y un reflejo de luz lo sigue; al salir vuelve a su sitio. En pantallas táctiles se mueve sola, despacio, mientras se ve.
// Con "reducir movimiento" no se hace nada (la foto se ve normal). Los estilos están en css/about.css (.holo).
(() => {
  const card = document.querySelector('[data-holo]');
  if (!card || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const inner = card.querySelector('.holo-card');
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

// TARJETA · en escritorio la página no se desplaza: lo hace la tarjeta (css/about.css). Aquí:
//  · la rueda mueve la tarjeta aunque el ratón esté sobre la foto, y el teclado (flechas, Re Pág, Espacio) la recorre desde el principio;
//  · «Back to top» sube la tarjeta en vez de la página.
(() => {
  const card = document.getElementById('about-card');
  if (!card || !matchMedia('(min-width: 761px)').matches) return;
  card.focus({ preventScroll: true });
  addEventListener('wheel', (e) => {
    if (e.defaultPrevented || e.ctrlKey || card.contains(e.target)) return;
    card.scrollBy({ top: e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? card.clientHeight : 1) });
  }, { passive: true });
  document.querySelectorAll('.site-foot a[href="#top"]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    card.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }));
})();
