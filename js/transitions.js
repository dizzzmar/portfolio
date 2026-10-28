// TRANSICIONES ENTRE PÁGINAS · acompaña a css/transitions.css (se carga en el <head> de cada página, sin defer: necesita estar
// antes de que la página se pinte por primera vez). Si el navegador no tiene View Transitions, esa parte no hace nada.
//  · is-vt: la página llegó con transición (las animaciones de entrada de cada página se mantienen igual).
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
  // Hacia About (o desde About) la transición es otra: la página nueva se desliza desde la derecha sobre la anterior, que se desenfoca
  // y se apaga (css/transitions.css). Se marca con un «tipo» de transición antes de salir y al llegar.
  const isAbout = (p) => /^\/about\/?$/.test(p);
  addEventListener('pageswap', (e) => {
    if (!e.viewTransition || !e.activation) return;
    const to = new URL(e.activation.entry.url).pathname;
    if (isAbout(to)) e.viewTransition.types.add('to-about');
    else if (isAbout(location.pathname)) e.viewTransition.types.add('from-about');
  });
  addEventListener('pagereveal', (e) => {
    if (!e.viewTransition) return;
    root.classList.add('is-vt'); // se queda puesta mientras dure esta página (quitarla reiniciaría animaciones)
    if (isAbout(location.pathname)) { e.viewTransition.types.add('to-about'); root.classList.add('vt-about'); }
    else if (document.referrer && isAbout(new URL(document.referrer).pathname)) e.viewTransition.types.add('from-about');
  });
})();
