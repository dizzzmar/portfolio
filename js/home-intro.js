// HOME · recorrido del tomate de la portada a la barra.
// Un gesto (rueda o dedo hacia abajo en la portada, flecha abajo, Espacio o pulsar Work) lanza el viaje entero y no hace falta seguir tirando:
//   0 = portada (el tomate gira en el centro con su nombre)
//   · el tomate sube en una curva al logo de la barra (js/home-tomato.js) mientras el cielo se acerca un poco (paralaje)
//   1 = tomate en la barra y la página se desbloquea para seguir bajando a Work.
// El gesto contrario hace el viaje al revés: subir arriba del todo en Work, el tomate de la barra o las flechas hacia arriba.
// Se puede invertir en pleno vuelo y el movimiento enlaza con la velocidad que llevaba (sin saltos).
// Código propio, sin librerías.

// Volver con Atrás (desde un proyecto): el navegador lo marca como "back_forward". La portada vuelve entonces
// a la posición donde estaba al salir (guardada en sessionStorage) y sin la entrada del tomate.
// Lo hacemos nosotros porque la portada bloquea el scroll al cargar y el navegador no lo restauraba.
const NAVIGATION_TYPE = performance.getEntriesByType('navigation')[0]?.type;
const BACK = NAVIGATION_TYPE === 'back_forward';
// Recargar la landing vuelve a su portada, aunque el último clic haya dejado #work en la URL.
if (NAVIGATION_TYPE === 'reload' && location.hash === '#work') {
  history.replaceState(null, '', location.pathname + location.search);
  scrollTo({ top: 0, behavior: 'instant' });
}
let SAVED_Y = 0;
try { SAVED_Y = Number(sessionStorage.getItem('dizmar-home-y')) || 0; } catch (e) { /* storage blocked */ }
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
addEventListener('pagehide', () => { try { sessionStorage.setItem('dizmar-home-y', String(scrollY)); } catch (e) { /* ignore */ } });


(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Llegada desde el tomate de otra página (js/transitions.js pone land-fly): el tomate empieza en la barra y vuela al centro
  const FLY_FROM_NAV = document.documentElement.classList.contains('land-fly') && !reduced;
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const smooth = (v) => v * v * (3 - 2 * v);

  // ---- El viaje ----
  // j es lo que se ve (de 0 a 1) y target adonde tiene que llegar. Al deslizar (rueda, dedo, flechas) el target avanza lo que avanzas tú, y j lo sigue
  // con un amortiguador crítico: sin tirones, sin rebotes, y si te paras el tomate se queda donde esté (no vuelve ni sigue solo).
  // Los botones (Work, el tomate de la barra, Inicio/Fin) lanzan el viaje entero con una curva de Hermite que empieza con la velocidad que llevaba.
  // Todo va por tiempo real, no por fotogramas: en un móvil lento dura lo mismo, solo se ve con menos pasos.
  const J = window.homeJourney = { j: 0, target: 0, v: 0, simple: false, q: 0, zoom: 0 };
  const FULL = 1.8, FULL_SIMPLE = 1.4; // segundos del viaje completo (el simple es el vuelo directo de otra página)
  const COMMIT = 0.12; // fracción del viaje a partir de la cual se completa solo: una muesca de la rueda o un deslizamiento corto del dedo
  const SMOOTH = 0.32; // segundos que tarda j en alcanzar al target al deslizar (más = más suave y lento)
  let raf = 0, anim = null, last = 0;
  // Sin pantalla intermedia: la página empieza a bajar sola a la lista de Work cuando el tomate aún está volando (a partir de SCROLL_AT del viaje) y las dos cosas
  // terminan a la vez; así nunca hay un momento con solo el cielo. El cielo se acerca y se funde en blanco por el camino.
  const SCROLL_AT = 0.3;
  let wantWork = false, scrolling = false;
  const workEl = document.getElementById('work');
  let scrollToken = 0;
  // Baja o sube la página con una curva suave (650 ms) mientras el viaje del tomate sigue; si el visitante da marcha atrás (keep() falso), se para
  function animateScroll(y1, keep) {
    const y0 = scrollY, token = ++scrollToken;
    if (reduced || Math.abs(y1 - y0) < 4) { scrollTo(0, y1); return; }
    const dur = 1450, t0 = performance.now();
    scrolling = true; // mientras se mueve, la página no está bloqueada aunque el tomate aún vuele
    document.body.classList.remove('intro-lock');
    const step = (now) => {
      if (token !== scrollToken) return; // otra animación ha tomado el relevo
      const u = Math.min(1, (now - t0) / dur);
      scrollTo(0, y0 + (y1 - y0) * (1 - Math.cos(Math.PI * u)) / 2); // seno suave: arranca y frena sin el tirón central de una curva cúbica
      if (u < 1 && keep()) { requestAnimationFrame(step); return; }
      scrolling = false;
      apply();
    };
    requestAnimationFrame(step);
  }
  const scrollToWork = () => { if (workEl) animateScroll(workEl.offsetTop, () => J.target >= 1); };
  // Volver a la portada desde Work: el tomate vuela de vuelta y la página sube a la vez (un solo gesto, sin tener que subir toda la página)
  function backToLanding() {
    wantWork = false;
    if (location.hash) history.replaceState(null, '', location.pathname + location.search); // la portada no debe seguir marcada como #work
    go(0);
    animateScroll(0, () => J.target <= 0);
  }
  function scrub(d) { // d = fracción del viaje que se avanza (negativa = hacia atrás)
    anim = null;
    J.target = clamp01(J.target + d);
    wantWork = d > 0 && J.target >= 1;
    // Un gesto corto basta: pasado COMMIT el viaje se completa solo (o se deshace solo)
    if (d > 0 && J.target >= COMMIT && J.target < 1) { go(1); return; }
    if (d < 0 && J.target <= 1 - COMMIT && J.target > 0) { go(0); return; }
    if (reduced) { J.j = J.target; J.v = 0; apply(); return; }
    kick();
  }
  function go(t) {
    t = clamp01(t);
    J.target = t;
    wantWork = t >= 1;
    if (reduced) { J.j = t; J.v = 0; anim = null; apply(); return; }
    const dist = Math.abs(t - J.j);
    if (dist < 0.0005) { J.j = t; J.v = 0; anim = null; apply(); return; }
    const dur = Math.max(0.7, Math.min(J.simple ? FULL_SIMPLE : FULL, (J.simple ? FULL_SIMPLE : FULL) * Math.pow(dist, 0.8)));
    anim = { p0: J.j, p1: t, m0: J.v * dur, dur, t0: performance.now() };
    kick();
  }
  function tick(now) {
    raf = 0;
    if (anim) {
      const u = Math.min(1, (now - anim.t0) / (anim.dur * 1000)), u2 = u * u, u3 = u2 * u;
      // Hermite cúbico: arranca con la velocidad inicial m0 y llega a p1 parado
      J.j = clamp01((2 * u3 - 3 * u2 + 1) * anim.p0 + (u3 - 2 * u2 + u) * anim.m0 + (-2 * u3 + 3 * u2) * anim.p1);
      J.v = ((6 * u2 - 6 * u) * anim.p0 + (3 * u2 - 4 * u + 1) * anim.m0 + (-6 * u2 + 6 * u) * anim.p1) / anim.dur;
      if (u >= 1) { J.j = anim.p1; J.v = 0; anim = null; }
    }
    else if (Math.abs(J.j - J.target) > 0.0002 || Math.abs(J.v) > 0.002) {
      // Amortiguador crítico (SmoothDamp): se acerca al target sin pasarse y frenando solo
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      const om = 2 / SMOOTH, x = om * dt, ex = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
      const ch = J.j - J.target, tmp = (J.v + om * ch) * dt;
      J.v = (J.v - om * tmp) * ex;
      J.j = clamp01(J.target + (ch + tmp) * ex);
    } else { J.j = J.target; J.v = 0; }
    last = now;
    apply();
    if (anim || Math.abs(J.j - J.target) > 0.0002 || Math.abs(J.v) > 0.002) raf = requestAnimationFrame(tick);
  }
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  J.go = go;

  // El cielo se acerca con el viaje y con el scroll (zoom lo pone el segundo bloque de este archivo)
  const sky = document.querySelector('.sky');
  J.paintSky = () => {
    if (sky) sky.style.scale = (1 + (J.zoom || 0) * 1.5 + (reduced || J.simple ? 0 : 0.07 * smooth(clamp01(J.j)))).toFixed(3);
  };
  function apply() {
    const body = document.body;
    if (J.simple && J.j <= 0.001 && J.target <= 0.001) J.simple = false; // el tomate ya llegó al centro: el próximo viaje es el completo
    // La página solo baja cuando el viaje está completo; hasta entonces la portada queda quieta
    // Bloqueada hasta que el viaje termina; salvo si la página ya está bajando (o ya bajó) a Work con el tomate todavía volando: bloquearla ahí la devolvería arriba del todo
    const locked = !(J.j >= 0.999 && J.target >= 1) && !scrolling && !(J.target >= 1 && scrollY > 4);
    body.classList.toggle('intro-lock', locked);
    if (workEl) workEl.inert = locked && J.target <= 0; // en la portada, el tabulador no entra en una lista que aún no se ve
    body.classList.toggle('work-engaged', J.j > 0.001 || J.target > 0);
    if (J.j > 0.02 || J.target > 0) hintDone = true; // quien ya ha empezado el viaje no necesita la pista
    hint?.classList.toggle('is-on', hintReady && !hintDone && !J.hold);
    J.paintSky();
    if (wantWork && J.j >= SCROLL_AT && J.target >= 1) { wantWork = false; scrollToWork(); }
  }

  // ---- La pista de la portada ----
  // Sin ella, quien llega no sabe que hay que deslizar. Aparece si pasan unos segundos sin que nadie haya movido nada, y desaparece en cuanto empieza el
  // viaje. También es un botón: pulsarla (o con teclado) hace el viaje entero, que es el camino visible para quien no usa rueda ni dedo.
  const hint = document.getElementById('hint');
  let hintReady = false, hintDone = false;
  if (hint) {
    if (matchMedia('(pointer: coarse)').matches) hint.firstChild.textContent = 'Swipe up';
    hint.addEventListener('click', () => { if (!J.simple) go(1); });
    addEventListener('load', () => setTimeout(() => { hintReady = true; apply(); }, 3500), { once: true });
  }

  // ---- Rueda, dedo y teclado ----
  // Cada paso que deslizas avanza el viaje un poco (abajo: hacia Work · arriba: de vuelta a la portada) y si te paras, se queda donde esté.
  // En la portada vale cualquier gesto; ya en Work, solo subir estando arriba del todo.
  const locked = () => document.body.classList.contains('intro-lock');
  const menuOpen = () => document.documentElement.classList.contains('menu-open'); // con el menú abierto la portada no se mueve (js/menu.js)
  const atTop = () => scrollY <= 1;
  // Cuánto equivale al viaje entero: rueda 700 px, dedo ≈ 35 % de la pantalla; como el viaje se completa solo al llegar al 12 % (COMMIT), basta una muesca de
  // la rueda (≈ 85 px) o un deslizamiento corto del dedo (≈ 35 px). Un golpe rápido de dedo (flick) lo completa del todo, como la inercia de un scroll normal.
  const WHEEL_PX = 700;
  const touchPx = () => Math.max(260, innerHeight * 0.35);
  const FLICK = 0.6; // px por milisegundo
  let upAcc = 0, upAt = 0;
  const atWorkTop = () => !!workEl && J.target >= 1 && !scrolling && J.j >= 0.999 && scrollY <= workEl.offsetTop + 2;
  function drag(dy, perJourney) { // dy > 0 = hacia abajo
    if (J.simple || J.hold || !dy) return; // hold: el visitante está girando el sobre escondido (js/home-sachet-egg.js)
    if (dy > 0) { if (J.target < 1 && locked()) scrub(dy / perJourney); }
    else if (J.target > 0 && (locked() || atTop())) scrub(dy / perJourney);
    else if (atWorkTop()) { // arriba del todo de la lista de Work: un gesto hacia arriba vuelve a la portada
      const now = performance.now();
      upAcc = now - upAt > 600 ? -dy : upAcc - dy;
      upAt = now;
      if (upAcc >= perJourney * COMMIT) { upAcc = 0; backToLanding(); }
    }
  }
  addEventListener('wheel', (e) => {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || menuOpen()) return;
    if (e.target instanceof Element && e.target.closest('.term')) return; // la terminal se desplaza sola, no mueve la portada
    drag(e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY, WHEEL_PX);
  }, { passive: true });
  let touchY = null, samples = [];
  addEventListener('touchstart', (e) => {
    touchY = menuOpen() || (e.target instanceof Element && e.target.closest('.term')) ? null : e.touches[0].clientY;
    samples = [];
  }, { passive: true });
  addEventListener('touchmove', (e) => {
    if (touchY === null) return;
    const y = e.touches[0].clientY;
    samples.push({ t: performance.now(), y });
    if (samples.length > 6) samples.shift();
    drag(touchY - y, touchPx()); // el dedo arrastra el viaje: el tomate sigue al dedo
    touchY = y;
  }, { passive: true });
  addEventListener('touchend', () => {
    const a = samples[0], b = samples[samples.length - 1];
    touchY = null;
    samples = [];
    if (!a || !b || b.t - a.t < 16 || J.simple || J.hold || reduced) return;
    const v = (a.y - b.y) / (b.t - a.t); // > 0: el dedo sube (hacia Work)
    if (v > FLICK && J.target < 1 && locked()) go(1);
    else if (v < -FLICK && J.target > 0 && (locked() || atTop())) go(0);
    else if (v < -FLICK && atWorkTop()) backToLanding();
  }, { passive: true });
  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || J.simple || J.hold || menuOpen()) return;
    if (e.target instanceof Element && e.target.closest('.term')) return; // escribir en la terminal no mueve la portada
    const onControl = e.target instanceof Element && e.target.closest('a, button, input, select, textarea');
    const down = { ArrowDown: 1, PageDown: 1, ' ': 1, End: 1 }[e.key]; // cualquier tecla de bajar lanza el viaje entero
    const up = { ArrowUp: 1, PageUp: 1, Home: 1 }[e.key];
    if (down) {
      if (locked() && !(e.key === ' ' && onControl)) { e.preventDefault(); go(1); }
    } else if (up) {
      if ((locked() || atTop()) && J.target > 0) { e.preventDefault(); go(0); }
      else if (atWorkTop()) { e.preventDefault(); backToLanding(); }
    }
  });

  // Pulsar Work hace el viaje entero; si ya estás en la lista, baja hasta ella.
  document.querySelector('.nav-links a[href="#work"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    history.replaceState(null, '', '#work');
    if (J.target < 1 || locked()) { go(1); return; }
    document.getElementById('work').scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' });
  });

  // Pulsar el tomate de la barra lleva a la portada: la página sube sola y, arriba, el viaje se deshace al revés.
  const goLanding = () => {
    history.replaceState(null, '', location.pathname + location.search);
    if (scrollY < 2) { go(0); return; }
    backToLanding(); // el viaje y la subida a la vez
  };
  document.querySelector('.nav-logo')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (J.j > 0.001 || J.target > 0) goLanding(); // si ya está en la portada, no hay nada que hacer
  });

  // Atrás restaura la posición exacta, incluso si la URL conserva #work.
  // Los enlaces explícitos a Work entran directamente en la lista, sin viaje.
  if (BACK && SAVED_Y > 0) {
    J.j = J.target = 1;
    // Se repite al terminar de cargar: hasta entonces la altura de la página aún cambia y el salto se vería
    const restore = () => scrollTo({ top: SAVED_Y, behavior: 'instant' });
    apply();
    restore();
    addEventListener('load', restore, { once: true });
  } else if (location.hash === '#work') {
    J.j = J.target = 1;
    apply();
    requestAnimationFrame(() => document.getElementById('work').scrollIntoView({ behavior: 'instant' }));
  } else if (FLY_FROM_NAV) {
    // Desde otra página: el tomate empieza en la barra y vuela al centro cuando el 3D está listo (js/home-tomato.js llama a go(0))
    J.j = 1; J.target = 0; J.simple = true;
    apply();
    setTimeout(() => { if (J.simple && J.j === 1) go(0); }, 2500); // por si el 3D no llega a cargar
  } else apply();

})();

// ---------- Al bajar: el cielo se acerca (las nubes crecen y se desenfocan) y se funde en blanco ----------
// Todo sigue el scroll hasta llegar a Work. Al subir, se deshace exactamente al revés.
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const work = document.getElementById('work');
  const sky = document.querySelector('.sky');
  const skySoft = document.querySelector('.sky-soft');
  const fadeEl = document.querySelector('.fade');
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const smooth = (v) => v * v * (3 - 2 * v);
  let queued = false;
  const update = () => {
    queued = false;
    // Mientras la página carga y se restaura la posición (Atrás o #work), se usa la posición de destino: así no hay un destello de la portada
    const loading = document.readyState !== 'complete';
    const y = loading && BACK && SAVED_Y > 0 ? SAVED_Y : loading && location.hash === '#work' && work ? work.offsetTop : scrollY;
    const q = clamp01(y / Math.max(1, work ? work.offsetTop : innerHeight)); // 0 en la portada, 1 al llegar a Work
    const zoom = still ? 0 : smooth(clamp01(q / 0.85));  // el cielo se acerca; las nubes se agrandan y se difuminan
    const fade = smooth(clamp01((q - 0.3) / 0.65));       // al atravesarlas, todo se funde en blanco (a lo largo de casi todo el recorrido, sin un golpe de blanco)
    // Se escribe directamente en cada elemento (nada de variables CSS en body: se heredan y recalcularían toda la página)
    window.homeJourney.zoom = zoom; // el cielo lo pinta window.homeJourney.paintSky (suma este zoom y el del viaje)
    skySoft.style.opacity = zoom.toFixed(3);
    fadeEl.style.opacity = fade.toFixed(3);
    document.body.classList.toggle('light-on', fade > 0.5); // el menú y los textos pasan a oscuro cuando el fondo ya es claro
    document.body.classList.toggle('white-on', fade > 0.999); // la página ya es del todo blanca: ahora sí la barra se mezcla con "difference" (si fuera antes, el blanco de la sección taparía el cielo)
    // Al llegar a Work se marca work-on (el CSS lo usa para la barra y el pie)
    const workOn = !!work && work.offsetTop - y < innerHeight * 0.5;
    document.body.classList.toggle('work-on', workOn);
    const J = window.homeJourney;
    J.q = q;
    J.paintSky();
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  addEventListener('load', update);
  update();
})();
