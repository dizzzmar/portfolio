// HOME · texto "Creative ___" del centro de la pantalla y recorrido del tomate.
// El viaje (window.homeJourney.j, de 0 a 1) sigue a la rueda y al dedo mientras estás en la portada y se puede frenar, invertir y deshacer:
//   0 = portada (el tomate gira en el centro, sin texto)
//   · el tomate sale del centro y rodea el texto "Creative ___", que aparece detrás; pasa por detrás de él (js/home-tomato.js) y sube al logo de la barra
//   1 = tomate en la barra, texto visible y la página se desbloquea para seguir bajando a Work.
// Al volver arriba del todo y seguir subiendo, el viaje se deshace al revés: el tomate baja, pasa por detrás del texto y vuelve al centro.
// Pulsar Work (o las flechas / Espacio) hace el viaje entero; pulsar el tomate de la barra lo deshace.
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
  for (const ch of text) {
    const c = document.createElement('span');
    c.className = 'ch';
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
  const cycler = createWordCycler(word);

  // ---- El viaje ----
  // j es lo que se ve; target, adonde va. Con la rueda o el dedo (fast) j sigue a target casi pegado; al pulsar Work, una tecla o al soltar
  // a medias, el viaje se hace solo, con salida suave, velocidad tope y frenada: nunca se queda a medias y se puede invertir en pleno vuelo.
  const J = window.homeJourney = { j: 0, target: 0, v: 0, fast: false, simple: false, q: 0, workOn: false, dx: 0 };
  let raf = 0, last = 0;
  function tick(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    if (reduced) { J.j = J.target; J.v = 0; } else {
      const vmax = J.fast ? 5 : 0.78, acc = J.fast ? 40 : 3.6, rate = J.fast ? 12 : 6;
      const want = Math.max(-vmax, Math.min(vmax, (J.target - J.j) * rate));
      J.v += Math.max(-acc * dt, Math.min(acc * dt, want - J.v));
      J.j = clamp01(J.j + J.v * dt);
      if (Math.abs(J.target - J.j) < 0.004 && Math.abs(J.v) < 0.05) { J.j = J.target; J.v = 0; } // la cola final es imperceptible: se remata
    }
    apply();
    if (J.j !== J.target || J.v) raf = requestAnimationFrame(tick);
  }
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  const go = (t) => {
    J.fast = false; J.target = clamp01(t);
    J.v = Math.max(-0.78, Math.min(0.78, J.v)); // al pasar de seguir la rueda a terminar solo, no se arrastra la velocidad de antes: no se pasa de largo
    kick();
  };
  J.go = go;

  const revealOf = () => (J.simple ? 0 : reduced ? (J.j > 0.5 ? 1 : 0) : smooth(clamp01((J.j - 0.06) / 0.22)));
  // El texto: aparece mientras el tomate sale del centro, se deja rodear y se desplaza un poco al revés que él (paralaje); después sigue al scroll
  J.paintLine = () => {
    const reveal = revealOf();
    const scroll = reduced ? 0 : -(J.q || 0) * 48;
    const rise = reduced ? 0 : (1 - reveal) * 24;
    const drift = reduced ? 0 : -(J.dx || 0) * 16;
    const fade = J.workOn ? 0 : reveal * (1 - smooth(clamp01((J.q || 0) / 0.5)));
    line.style.opacity = fade.toFixed(3);
    line.style.translate = reduced ? '' : drift.toFixed(1) + 'px ' + (rise + scroll).toFixed(1) + 'px';
    line.style.scale = reduced ? '' : (0.965 + 0.035 * reveal).toFixed(4);
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
    J.paintLine();
  }

  // ---- Rueda, dedo y teclado ----
  // Se aplican en la portada (viaje sin terminar) y, ya en Work, solo al subir estando arriba del todo.
  const dist = () => Math.max(380, innerHeight * 0.62); // píxeles de rueda o dedo para un viaje entero
  const locked = () => document.body.classList.contains('intro-lock');
  const atTop = () => scrollY <= 1;
  let settleTimer = 0;
  const armSettle = () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => { if (J.target > 0 && J.target < 1) go(J.target > 0.4 ? 1 : 0); }, 240);
  };
  function scrub(dy) {
    if (J.simple) return;
    if (!locked() && !(atTop() && dy < 0)) return;
    J.fast = true;
    J.target = clamp01(J.target + dy / dist());
    kick();
    armSettle();
  }
  addEventListener('wheel', (e) => {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    scrub(e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY);
  }, { passive: true });
  let touchY = null;
  addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchmove', (e) => {
    if (touchY === null) return;
    const y = e.touches[0].clientY;
    scrub(touchY - y);
    touchY = y;
  }, { passive: true });
  addEventListener('touchend', () => { touchY = null; armSettle(); }, { passive: true });
  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || J.simple) return;
    const onControl = e.target instanceof Element && e.target.closest('a, button, input, select, textarea');
    if (['ArrowDown', 'PageDown', 'End', ' '].includes(e.key)) {
      if (locked() && !(e.key === ' ' && onControl)) { e.preventDefault(); go(1); }
    } else if (['ArrowUp', 'PageUp', 'Home'].includes(e.key)) {
      if ((locked() || atTop()) && J.target > 0) { e.preventDefault(); go(0); }
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
    clearTimeout(settleTimer);
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
    sky.style.scale = (1 + zoom * 1.5).toFixed(3);
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
