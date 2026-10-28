// SCROLL SUAVE — la rueda del ratón y el trackpad mueven la página con inercia: cada muesca fija un destino y la página
// se desliza hasta él frenando poco a poco, siempre con la misma curva (referencia: donut-studio.com, que usa Lenis).
// Sin dependencias. Solo con ratón o trackpad: el dedo y el teclado siguen siendo los del navegador.
// Se aparta (deja la rueda al navegador o a quien ya la use) cuando:
//   · otro script ya la ha usado (preventDefault): el viaje del tomate en la portada, la galería de los proyectos;
//   · la página está bloqueada (overflow hidden: portada con el tomate, menú abierto);
//   · el ratón está sobre algo con scroll propio (la terminal, una lista larga) que aún puede moverse;
//   · se pulsa Ctrl (zoom) o el gesto es de lado.
// Con «reducir movimiento» no se instala.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const EASE = 7;          // más alto = llega antes (≈ 0,1 por fotograma a 60 fps, como Lenis)
  const root = document.documentElement;
  let target = scrollY, current = scrollY, raf = 0, last = 0, written = -1;

  const maxY = () => root.scrollHeight - innerHeight;
  const locked = () => {
    const h = getComputedStyle(root).overflowY, b = getComputedStyle(document.body).overflowY;
    return h === 'hidden' || h === 'clip' || b === 'hidden' || b === 'clip';
  };
  // ¿Hay algo bajo el ratón que se desplaza por su cuenta y aún puede ir en esa dirección?
  function ownScroller(el, dy) {
    for (; el && el !== document.body && el !== root; el = el.parentElement) {
      if (el.scrollHeight <= el.clientHeight + 1) continue;
      const oy = getComputedStyle(el).overflowY;
      if (oy !== 'auto' && oy !== 'scroll') continue;
      if (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0) return true;
    }
    return false;
  }

  function stop() { cancelAnimationFrame(raf); raf = 0; target = current = scrollY; written = -1; }
  function step(now) {
    // Si otro script (o la barra de scroll) ha movido la página mientras tanto, se le deja hacer
    if (written >= 0 && Math.abs(scrollY - written) > 2) { stop(); return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    current += (target - current) * (1 - Math.exp(-EASE * dt));
    if (Math.abs(target - current) < 0.5) current = target;
    written = Math.round(current);
    scrollTo({ top: current, behavior: 'instant' }); // instant: algunas hojas ponen scroll-behavior: smooth en <html>
    written = scrollY;
    if (current !== target) raf = requestAnimationFrame(step);
    else { raf = 0; written = -1; }
  }

  function onWheel(e) {
    if (e.defaultPrevented || e.ctrlKey || !e.cancelable) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (locked() || maxY() <= 0) return;
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    if (e.target instanceof Element && ownScroller(e.target, dy)) return;
    e.preventDefault();
    if (!raf) { current = scrollY; target = scrollY; last = performance.now(); }
    target = Math.max(0, Math.min(maxY(), target + dy));
    if (!raf) raf = requestAnimationFrame(step);
  }

  // El teclado, los enlaces de ancla o la barra mueven la página por su cuenta: el destino se pone al día
  addEventListener('scroll', () => { if (!raf) target = current = scrollY; }, { passive: true });
  addEventListener('resize', () => { target = Math.min(target, maxY()); }, { passive: true });
  // Se registra cuando ya han corrido los demás scripts (todos son defer o módulos): así su preventDefault llega antes
  const install = () => addEventListener('wheel', onWheel, { passive: false });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
  window.dizScroll = { stop }; // por si otro script necesita cortar la inercia (p. ej. antes de saltar a una sección)
})();
