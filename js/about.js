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

// TIRAS DE FORMAS · se desplazan de lado al hacer scroll (cada una en su sentido: data-dir) (la variable --drift que lee css/about.css) mientras se ve en pantalla.
// Con "reducir movimiento" se queda quieta. Solo escribe una variable por fotograma.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('[data-band]').forEach((band) => {
  const track = band.querySelector('.band-track');
  const dir = Number(band.dataset.dir) || 1;
  let queued = false, visible = false;
  const update = () => {
    queued = false;
    const r = band.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height))); // 0 al entrar por abajo, 1 al salir por arriba
    track.style.setProperty('--drift', (-p * innerWidth * 0.3 * dir).toFixed(1) + 'px'); // dir -1: se mueve al revés
  };
  const wake = () => { if (visible && !queued) { queued = true; requestAnimationFrame(update); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; wake(); }).observe(band);
  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', wake);
  });
})();

// BLOQUE VERDE · mientras el ratón está encima, el punto del cursor pasa a lima (clase on-deep en body; ver css/about.css).
(() => {
  const deep = document.querySelector('[data-deep]');
  if (!deep || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  deep.addEventListener('pointerenter', () => document.body.classList.add('on-deep'));
  deep.addEventListener('pointerleave', () => document.body.classList.remove('on-deep'));
})();
