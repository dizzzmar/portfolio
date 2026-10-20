// TRANSICIONES ENTRE PÁGINAS · acompaña a css/transitions.css (se carga en el <head> de cada página, sin defer: necesita estar
// antes de que la página se pinte por primera vez). Si el navegador no tiene View Transitions, no hace nada.
//  · pageswap (la página que se va) y pagereveal (la que llega) ponen el nombre "work-hero" a la pieza que vuela:
//      lista Work -> proyecto: la primera miniatura de la fila pulsada  ->  la primera tarjeta de la galería
//      proyecto -> lista (Atrás): la primera tarjeta  ->  la primera miniatura de la fila de ese proyecto
//    Solo si esa pieza se ve en pantalla en ese momento (si no, volaría desde un sitio que no se ve).
//  · is-vt: la página llegó con transición. has-hero: además, una de sus piezas es la que vuela (solo esa se salta su animación de entrada).
(() => {
  if (!('onpagereveal' in window)) return;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const path = (url) => { try { return new URL(url, location.href).pathname; } catch (e) { return ''; } };
  const isHome = (p) => p === '/' || p === '/index.html';
  const slugOf = (p) => (p.match(/^\/project\/([^/]+)\/?$/) || [])[1] || '';
  const rowPiece = (slug) => document.querySelector('.work-item > a[href="/project/' + slug + '/"] .wi-slot');
  const galleryPiece = () => document.querySelector('.p-gallery .p-card');
  const onScreen = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
  const mark = (el, transition) => {
    if (!el || !onScreen(el)) return;
    el.style.viewTransitionName = 'work-hero';
    root.classList.add('has-hero');
    transition.finished.finally(() => { el.style.viewTransitionName = ''; });
  };

  addEventListener('pageswap', (e) => {
    if (!e.viewTransition || reduced) return;
    const to = path(e.activation && e.activation.entry ? e.activation.entry.url : '');
    if (isHome(location.pathname) && slugOf(to)) mark(rowPiece(slugOf(to)), e.viewTransition);
    else if (slugOf(location.pathname) && isHome(to)) mark(galleryPiece(), e.viewTransition);
  });

  addEventListener('pagereveal', (e) => {
    if (!e.viewTransition) return;
    root.classList.add('is-vt'); // se queda puesta mientras dure esta página (quitarla reiniciaría animaciones)
    if (reduced) return;
    const from = path(window.navigation && navigation.activation && navigation.activation.from ? navigation.activation.from.url : '');
    if (slugOf(location.pathname) && isHome(from)) mark(galleryPiece(), e.viewTransition);
    else if (isHome(location.pathname) && slugOf(from)) mark(rowPiece(slugOf(from)), e.viewTransition);
  });
})();
