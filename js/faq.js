// FAQS · abrir y cerrar con fluidez en todos los navegadores (css/faq.css).
// Sin este script las preguntas siguen siendo <details> normales (con la animación de altura de Chrome y Edge). Con él, todo se anima igual en todos:
//   · al pulsar una pregunta, su respuesta crece de 0 a su altura (0,32 s) mientras se funde y sube 8 px (con 50 ms de retraso, para que aparezca cuando ya hay hueco);
//   · la que estaba abierta se cierra a la vez (0,22 s) y se funde enseguida: la lista no da un salto, una sube mientras la otra baja;
//   · si se pulsa a mitad de una animación, la nueva parte desde la altura exacta en la que estaba (no vuelve a empezar de cero);
//   · una sola curva de salida fuerte (la de --ease-out); solo se animan la altura de la respuesta, su opacidad y su desplazamiento;
//   · con «reducir movimiento» no se anima la altura: se abre y se cierra de golpe, con el fundido corto del CSS.
(() => {
  const items = [...document.querySelectorAll('.faq-item')];
  if (!items.length || !('animate' in Element.prototype)) return;
  document.documentElement.classList.add('faq-js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
  const OPEN_MS = 320, CLOSE_MS = 220;
  const runs = new WeakMap();                                         // las animaciones en curso de cada pregunta

  const stop = (item) => { (runs.get(item) || []).forEach((a) => a.cancel()); runs.delete(item); };
  const parts = (item) => ({ summary: item.querySelector('summary'), answer: item.querySelector('.faq-a') });

  function open(item) {
    const { answer } = parts(item);
    const from = item.open ? answer.offsetHeight : 0;                 // si estaba cerrándose, parte de donde esté
    const faded = item.open ? parseFloat(getComputedStyle(answer).opacity) : 0;
    stop(item);
    item.classList.remove('is-closing'); item.classList.add('is-open'); item.open = true;
    if (reduced.matches) return;
    const to = answer.scrollHeight;
    answer.style.overflow = 'hidden';
    const h = answer.animate({ height: [from + 'px', to + 'px'] }, { duration: OPEN_MS, easing: EASE });
    const f = answer.animate({ opacity: [faded, 1], transform: ['translateY(' + (-8 * (1 - faded)) + 'px)', 'none'] }, { duration: OPEN_MS - 60, delay: from ? 0 : 50, easing: EASE, fill: 'backwards' });
    runs.set(item, [h, f]);
    h.onfinish = () => { answer.style.overflow = ''; runs.delete(item); };
    h.oncancel = () => { answer.style.overflow = ''; };
  }

  function close(item) {
    if (!item.open) return;
    const { answer } = parts(item);
    const from = answer.offsetHeight, faded = parseFloat(getComputedStyle(answer).opacity);
    stop(item);
    item.classList.remove('is-open'); item.classList.add('is-closing');
    if (reduced.matches) { item.open = false; item.classList.remove('is-closing'); return; }
    answer.style.overflow = 'hidden';
    const h = answer.animate({ height: [from + 'px', '0px'] }, { duration: CLOSE_MS, easing: EASE, fill: 'forwards' });
    const f = answer.animate({ opacity: [faded, 0], transform: ['none', 'translateY(-8px)'] }, { duration: 120, easing: 'ease-out', fill: 'forwards' });
    runs.set(item, [h, f]);
    h.onfinish = () => { item.open = false; item.classList.remove('is-closing'); answer.style.overflow = ''; stop(item); };
  }

  for (const item of items) {
    parts(item).summary.addEventListener('click', (e) => {
      e.preventDefault();                                             // lo abrimos y cerramos nosotros, para poder animarlo
      if (item.classList.contains('is-open')) { close(item); return; }
      items.forEach((other) => { if (other !== item) close(other); }); // una sola abierta a la vez
      open(item);
    });
  }
})();
