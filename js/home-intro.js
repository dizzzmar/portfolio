// HOME · texto "Creative ___" del centro de la pantalla y recorrido del tomate.
// Un gesto (rueda o dedo hacia abajo en la portada, flecha abajo, Espacio o pulsar Work) lanza el viaje entero y no hace falta seguir tirando:
//   0 = portada (el tomate gira en el centro, sin texto)
//   · el tomate sale del centro y rodea el texto "Creative ___", que va apareciendo letra a letra; pasa por detrás de él (js/home-tomato.js)
//     y sube al logo de la barra, mientras el cielo se acerca un poco (paralaje)
//   1 = tomato en la barra, texto visible y la página se desbloquea para seguir bajando a Work.
// El gesto contrario hace el viaje al revés: subir arriba del todo en Work, el tomate de la barra o las flechas hacia arriba.
// Se puede invertir en pleno vuelo y el movimiento enlaza con la velocidad que llevaba (sin saltos).
// La segunda palabra va cambiando: cada cambio se descifra rápido y la palabra se queda quieta un instante para poder leerla;
// al final se para en "Designer" y vuelve a empezar.
// Antes de cambiar, la palabra actual se mezcla; después la siguiente se descifra de izquierda a derecha.
// Código propio, sin librerías.
// EDITA aquí las palabras (la primera es en la que se para):
const WORDS = ['Designer', 'Director', 'Coder', 'Enthusiast', 'Thinker', 'Technologist', 'Maximalist', 'Storyteller', 'Retoucher', '3D Artist', 'Mind', 'Nerd'];
const SCRAMBLE = 480;  // milisegundos que tarda cada palabra en descifrarse al aparecer
const SPEED = 950;     // milisegundos entre una palabra y la siguiente: tras descifrarse, la palabra se queda quieta (se lee) el resto
const BURST = 6000;    // cuánto dura cada ronda de palabras
const HOLD = 3200;     // cuánto se queda en "Designer" antes de la siguiente ronda
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

// ---- Letras sueltas: cada palabra se pinta como una fila de <span> (uno por letra) ----
const NBSP = ' ';
function splitLetters(el, text) {
  el.textContent = '';
  let i = 0;
  for (const ch of text) {
    const c = document.createElement('span');
    c.className = 'ch';
    c.style.setProperty('--i', String(i++));
    c.textContent = ch === ' ' ? NBSP : ch;
    el.append(c);
  }
}

// ---- Palabra cambiante: se mezcla la actual y se descifra la siguiente ----
// La usan la portada (aquí) y el título fijo de Work (js/home-work.js). Cada una corre solo mientras se ve (watch).
function createWordCycler(word, { visible = true } = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?';
  let timer = 0, scrambleRaf = 0, shown = visible;

  function setWord(text, ms = SCRAMBLE) {
    cancelAnimationFrame(scrambleRaf);
    if (reduced) { splitLetters(word, text); return; }
    const previous = word.textContent.replaceAll(NBSP, ' ');
    if (previous === text) { splitLetters(word, text); return; }
    const start = performance.now();
    const mixDuration = ms * 0.35;
    let revealing = false, lastFrame = -Infinity;
    let chars = [...word.children];
    if (!chars.length) { splitLetters(word, previous); chars = [...word.children]; }
    const step = (now) => {
      const elapsed = now - start;
      if (elapsed >= ms) { splitLetters(word, text); return; }
      // Limitar el ruido a 25 fps mantiene las letras legibles entre cambios.
      if (now - lastFrame >= 40) {
        lastFrame = now;
        if (elapsed >= mixDuration && !revealing) {
          splitLetters(word, text);
          chars = [...word.children];
          revealing = true;
        }
        const progress = revealing ? (elapsed - mixDuration) / (ms - mixDuration) : 0;
        const source = revealing ? text : previous;
        chars.forEach((c, i) => {
          const final = source[i] === ' ' ? NBSP : source[i];
          c.textContent = final === NBSP || (revealing && i < Math.floor(progress * chars.length))
            ? final
            : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        });
      }
      scrambleRaf = requestAnimationFrame(step);
    };
    scrambleRaf = requestAnimationFrame(step);
  }

  function burst() {
    clearTimeout(timer);
    if (!shown || reduced) { setWord(WORDS[0], 450); return; }
    const end = performance.now() + BURST;
    let i = 1;
    const tick = () => {
      if (performance.now() >= end) {
        setWord(WORDS[0], 450);
        timer = setTimeout(burst, HOLD);
        return;
      }
      setWord(WORDS[i % WORDS.length]);
      i += 1;
      timer = setTimeout(tick, SPEED);
    };
    tick();
  }

  function stop() { clearTimeout(timer); setWord(WORDS[0]); }

  // La ráfaga solo corre mientras la palabra se ve (y, si se indica, mientras active() sea verdadero)
  function watch(target, active = () => true) {
    new IntersectionObserver(([e]) => {
      shown = e.isIntersecting && !document.hidden;
      if (active()) shown ? burst() : stop();
    }).observe(target);
  }

  return { setWord, burst, stop, watch };
}

(() => {
  const word = document.querySelector('.intro-word');
  const line = document.querySelector('.intro-line');
  const first = document.querySelector('.intro-line > span:first-child');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Llegada desde el tomate de otra página (js/transitions.js pone land-fly): el tomate empieza en la barra y vuela al centro
  const FLY_FROM_NAV = document.documentElement.classList.contains('land-fly') && !reduced;
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const smooth = (v) => v * v * (3 - 2 * v);
  let started = false;
  splitLetters(first, first.textContent.trim());
  splitLetters(word, word.textContent.trim()); // las dos palabras ya en letras sueltas: el CSS las oculta y las muestra una a una
  const cycler = createWordCycler(word);

  // ---- El viaje ----
  // j es lo que se ve (de 0 a 1) y target adonde tiene que llegar. Al deslizar (rueda, dedo, flechas) el target avanza lo que avanzas tú, y j lo sigue
  // con un amortiguador crítico: sin tirones, sin rebotes, y si te paras el tomate se queda donde esté (no vuelve ni sigue solo).
  // Los botones (Work, el tomate de la barra, Inicio/Fin) lanzan el viaje entero con una curva de Hermite que empieza con la velocidad que llevaba.
  // Todo va por tiempo real, no por fotogramas: en un móvil lento dura lo mismo, solo se ve con menos pasos.
  const J = window.homeJourney = { j: 0, target: 0, v: 0, simple: false, q: 0, zoom: 0, workOn: false, dx: 0 };
  const FULL = 2.5, FULL_SIMPLE = 1.2; // segundos del viaje completo (el simple es el vuelo directo de otra página)
  const SMOOTH = 0.32; // segundos que tarda j en alcanzar al target al deslizar (más = más suave y lento)
  let raf = 0, anim = null, last = 0;
  function scrub(d) { // d = fracción del viaje que se avanza (negativa = hacia atrás)
    anim = null;
    J.target = clamp01(J.target + d);
    if (reduced) { J.j = J.target; J.v = 0; apply(); return; }
    kick();
  }
  function go(t) {
    t = clamp01(t);
    J.target = t;
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

  const revealOf = () => (J.simple ? 0 : reduced ? (J.j > 0.5 ? 1 : 0) : smooth(clamp01((J.j - 0.06) / 0.4)));
  // El texto: cada letra aparece subiendo, una tras otra, mientras el tomate sale del centro (--r lo recorre; el CSS pone el escalonado);
  // el bloque se desplaza un poco al revés que el tomate (paralaje) y después sigue al scroll. El cielo se acerca con el viaje y con el scroll.
  const sky = document.querySelector('.sky');
  J.paintLine = () => {
    const reveal = revealOf();
    const scroll = reduced ? 0 : -(J.q || 0) * 48;
    const drift = reduced ? 0 : -(J.dx || 0) * 16;
    const fade = J.workOn ? 0 : (1 - smooth(clamp01((J.q || 0) / 0.5)));
    line.style.setProperty('--r', reveal.toFixed(3));
    line.style.opacity = fade.toFixed(3);
    line.style.translate = reduced ? '' : drift.toFixed(1) + 'px ' + scroll.toFixed(1) + 'px';
    line.style.scale = reduced ? '' : (0.97 + 0.03 * reveal).toFixed(4);
    if (sky) sky.style.scale = (1 + (J.zoom || 0) * 1.5 + (reduced || J.simple ? 0 : 0.07 * smooth(clamp01(J.j)))).toFixed(3);
  };
  function startText() {
    if (started) return;
    started = true;
    document.body.classList.add('intro-on');
    cycler.burst();
  }
  function stopText() {
    if (!started) return;
    started = false;
    document.body.classList.remove('intro-on');
    cycler.stop();
  }
  function apply() {
    const body = document.body;
    if (J.simple && J.j <= 0.001 && J.target <= 0.001) J.simple = false; // el tomate ya llegó al centro: el próximo viaje es el completo
    // La página solo baja cuando el viaje está completo; hasta entonces la portada queda quieta
    body.classList.toggle('intro-lock', !(J.j >= 0.999 && J.target >= 1));
    body.classList.toggle('work-engaged', J.j > 0.001 || J.target > 0);
    if (revealOf() > 0.02) startText(); else if (J.j < 0.02) stopText();
    if (J.j > 0.02 || J.target > 0) hintDone = true; // quien ya ha empezado el viaje no necesita la pista
    hint?.classList.toggle('is-on', hintReady && !hintDone && !J.hold);
    J.paintLine();
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
  const atTop = () => scrollY <= 1;
  // Cuánto hay que deslizar para el viaje entero: rueda ≈ 1.600 px (unas 16 muescas), dedo ≈ 40 % de la pantalla (un deslizamiento normal).
  // Además, un golpe rápido de dedo (flick) lo completa del todo, como la inercia de un scroll normal.
  const WHEEL_PX = 1600;
  const touchPx = () => Math.max(300, innerHeight * 0.4);
  const FLICK = 0.6; // px por milisegundo
  function drag(dy, perJourney) { // dy > 0 = hacia abajo
    if (J.simple || J.hold || !dy) return; // hold: el visitante está girando el sobre escondido (js/home-sachet-egg.js)
    if (dy > 0) { if (J.target < 1 && locked()) scrub(dy / perJourney); }
    else if (J.target > 0 && (locked() || atTop())) scrub(dy / perJourney);
  }
  addEventListener('wheel', (e) => {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (e.target instanceof Element && e.target.closest('.term')) return; // la terminal se desplaza sola, no mueve la portada
    drag(e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY, WHEEL_PX);
  }, { passive: true });
  let touchY = null, samples = [];
  addEventListener('touchstart', (e) => {
    touchY = e.target instanceof Element && e.target.closest('.term') ? null : e.touches[0].clientY;
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
  }, { passive: true });
  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || J.simple || J.hold) return;
    if (e.target instanceof Element && e.target.closest('.term')) return; // escribir en la terminal no mueve la portada
    const onControl = e.target instanceof Element && e.target.closest('a, button, input, select, textarea');
    const down = { ArrowDown: 0.1, PageDown: 0.3, ' ': 0.3, End: 1 }[e.key];
    const up = { ArrowUp: 0.1, PageUp: 0.3, Home: 1 }[e.key];
    if (down) {
      if (locked() && !(e.key === ' ' && onControl)) { e.preventDefault(); if (down >= 1) go(1); else scrub(down); }
    } else if (up) {
      if ((locked() || atTop()) && J.target > 0) { e.preventDefault(); if (up >= 1) go(0); else scrub(-up); }
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
    scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' });
    let done = false;
    const finish = () => { if (done) return; done = true; removeEventListener('scroll', check); clearTimeout(timer); go(0); };
    const check = () => { if (scrollY < 2) finish(); };
    const timer = setTimeout(finish, 1200); // si algo impide llegar arriba, el viaje se deshace igualmente
    addEventListener('scroll', check, { passive: true });
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

  // La ráfaga solo corre mientras el texto se ve
  cycler.watch(word.parentElement, () => started);
})();

// ---------- Al bajar: el cielo se acerca (las nubes crecen y se desenfocan), se funde en blanco y "Creative ___" sube ----------
// Todo sigue el scroll hasta llegar a Work. Al subir, se deshace exactamente al revés.
(() => {
  const line = document.querySelector('.intro-line');
  if (!line) return;
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
    // Mientras la página carga y se restaura la posición (Atrás o #work), se usa la posición de destino: así no hay un destello del texto grande
    const loading = document.readyState !== 'complete';
    const y = loading && BACK && SAVED_Y > 0 ? SAVED_Y : loading && location.hash === '#work' && work ? work.offsetTop : scrollY;
    const q = clamp01(y / Math.max(1, work ? work.offsetTop : innerHeight)); // 0 en la portada, 1 al llegar a Work
    const zoom = still ? 0 : smooth(clamp01(q / 0.85));  // el cielo se acerca; las nubes se agrandan y se difuminan
    const fade = smooth(clamp01((q - 0.5) / 0.45));       // al atravesarlas, todo se funde en blanco
    // Se escribe directamente en cada elemento (nada de variables CSS en body: se heredan y recalcularían toda la página)
    window.homeJourney.zoom = zoom; // el cielo lo pinta window.homeJourney.paintLine (suma este zoom y el del viaje)
    skySoft.style.opacity = zoom.toFixed(3);
    fadeEl.style.opacity = fade.toFixed(3);
    document.body.classList.toggle('light-on', fade > 0.5); // el menú y los textos pasan a oscuro cuando el fondo ya es claro
    document.body.classList.toggle('white-on', fade > 0.999); // la página ya es del todo blanca: ahora sí la barra se mezcla con "difference" (si fuera antes, el blanco de la sección taparía el cielo)
    // Al llegar a Work, el "Creative ___" del centro desaparece: la palabra sigue en el título fijo de la izquierda
    const workOn = !!work && work.offsetTop - y < innerHeight * 0.5;
    document.body.classList.toggle('work-on', workOn);
    // El texto sube con el scroll y se apaga; lo pinta window.homeJourney (también lo mueven la aparición y el paralaje del viaje)
    const J = window.homeJourney;
    J.q = q; J.workOn = workOn;
    J.paintLine();
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  addEventListener('load', update);
  update();
})();
