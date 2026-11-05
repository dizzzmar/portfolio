// TRANSICIONES ENTRE PÁGINAS · acompaña a css/transitions.css (se carga en el <head> de cada página, sin defer: necesita estar
// antes de que la página se pinte por primera vez). Si el navegador no tiene View Transitions, esa parte no hace nada.
//  · is-vt: la página llegó con transición (las animaciones de entrada de cada página se mantienen igual). La transición es la misma para todas
//    las páginas (hojas apiladas, css/transitions.css); solo cambia el sentido: adelante o atrás.
//  · Pulsar el tomate de la barra en cualquier página lleva a la portada y el tomate vuelve volando desde la barra hasta el centro:
//    aquí se deja la marca (sessionStorage) y la portada, al cargar, pone la clase land-fly; js/home-tomato.js hace el vuelo.
(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isHome = (p) => p === '/' || p === '/index.html';

  // ---- El tomate de la barra: de cualquier página a la portada (con o sin View Transitions) ----
  const KEY = 'dizmar-land-fly';
  if (isHome(location.pathname)) {
    try {
      const at = Number(sessionStorage.getItem(KEY));
      sessionStorage.removeItem(KEY);
      if (at && Date.now() - at < 5000 && !reduced && !location.hash) root.classList.add('land-fly');
    } catch (e) { /* storage blocked */ }
  } else {
    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || !(e.target instanceof Element) || !e.target.closest('.nav-logo, .case-logo')) return;
      try { sessionStorage.setItem(KEY, String(Date.now())); } catch (err) { /* storage blocked */ }
    }, true);
  }

  // ---- View Transitions ----
  if (!('onpagereveal' in window)) return;
  // Sentido del paso: «atrás» si es el botón atrás del navegador (la entrada de historial es anterior) o si se llega a la portada (la capa de abajo);
  // «adelante» en cualquier otro caso. Se marca con un «tipo» de transición (css/transitions.css lo usa para animar al revés).
  const goingBack = (a, toPath, fromPath) => {
    if (!a) return false;
    if (a.navigationType === 'traverse') return a.entry.index < a.from.index;
    return isHome(toPath) && !isHome(fromPath);
  };
  addEventListener('pageswap', (e) => {
    if (!e.viewTransition || !e.activation) return;
    const a = e.activation;
    e.viewTransition.types.add(goingBack(a, new URL(a.entry.url).pathname, location.pathname) ? 'back' : 'forward');
  });
  addEventListener('pagereveal', (e) => {
    if (!e.viewTransition) return;
    root.classList.add('is-vt'); // se queda puesta mientras dure esta página (quitarla reiniciaría animaciones)
    const a = window.navigation && navigation.activation;
    let fromPath = '/';
    try { fromPath = new URL(a.from.url).pathname; } catch (err) { /* sin historial: se trata como adelante */ }
    e.viewTransition.types.add(goingBack(a, location.pathname, fromPath) ? 'back' : 'forward');
  });
})();
