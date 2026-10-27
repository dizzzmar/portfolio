// PANTALLA DE CARGA · quita la cortina verde de la portada cuando el tomate 3D está listo (css/loader.css lleva el diseño y la animación).
// El script del <head> de index.html decide si hay cortina (primera visita de la sesión, sin venir de otra página de la web ni con #work, y sin «reducir movimiento»).
// Se enseña como mínimo 1,3 s (para que se vea la animación) y como máximo 7 s (por si el 3D tarda); mientras está puesta, la rueda, el dedo y el teclado no mueven la portada.
(() => {
  const root = document.documentElement;
  const el = document.querySelector('.loader');
  if (!el || !root.classList.contains('is-loading')) return;
  const MIN = 1300, MAX = 7000, READY = 650, LIFT = 1000; // ms: tiempo mínimo · tope · pausa con el aro cerrado · duración de la subida
  const t0 = performance.now();
  let done = false;
  try { sessionStorage.setItem('dizmar-loaded', '1'); } catch (e) { /* sin almacenamiento: se repetirá en la siguiente visita */ }

  const block = (e) => { if (e.type === 'keydown' && !['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) return; e.stopImmediatePropagation(); e.preventDefault(); };
  const events = ['wheel', 'touchmove', 'keydown'];
  events.forEach((t) => addEventListener(t, block, { capture: true, passive: false }));

  const finish = () => {
    if (done) return;
    done = true;
    setTimeout(() => {
      el.classList.add('is-ready');                                   // el aro se cierra y el tomate salta
      setTimeout(() => {
        el.classList.add('is-leaving');                               // la cortina sube
        setTimeout(() => {
          events.forEach((t) => removeEventListener(t, block, { capture: true }));
          root.classList.remove('is-loading');
          el.remove();
        }, LIFT);
      }, READY);
    }, Math.max(0, MIN - (performance.now() - t0)));
  };

  if (root.classList.contains('tomato-ready')) finish();
  else {
    const mo = new MutationObserver(() => { if (root.classList.contains('tomato-ready')) { mo.disconnect(); finish(); } });
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
  }
  setTimeout(finish, MAX);
})();
