// HOME · texto "Creative ___" del centro de la pantalla.
// Cuando el tomate termina de subir al menú (aviso "tomato-docked" de js/home-tomato.js) aparece el texto,
// la segunda palabra va cambiando: cada cambio se descifra rápido y la palabra se queda quieta un instante para poder leerla;
// al final se para en "Designer" y vuelve a empezar.
// Solo se inicia al pulsar Work; la landing se queda con el tomate girando.
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
  let started = false;
  splitLetters(first, first.textContent.trim());
  const cycler = createWordCycler(word);

  function start() {
    if (started) return;
    started = true;
    document.body.classList.add('intro-on');
    cycler.burst();
    // Cuando termina la entrada del texto, pasa a seguir el scroll sin transición
    setTimeout(() => line.classList.add('is-live'), reduced ? 0 : 700);
  }

  // Work inicia el viaje del tomate, muestra Creative y después entra en la lista.
  const unlock = () => document.body.classList.remove('intro-lock');
  let workRequested = false, workRevealed = false, dockFallback = 0;
  const revealWork = () => {
    if (!workRequested || workRevealed) return;
    workRevealed = true;
    clearTimeout(dockFallback);
    start();
    // La página no baja sola: se desbloquea y el visitante hace scroll hasta los proyectos
    setTimeout(() => {
      unlock();
      document.body.classList.remove('work-entering');
    }, reduced ? 0 : 650);
  };
  // Pulsar Work, o bajar con la rueda o el dedo en la portada, inicia el mismo viaje del tomate
  const startWork = () => {
    workRequested = true;
    document.body.classList.add('work-engaged', 'work-entering');
    history.replaceState(null, '', '#work');
    document.dispatchEvent(new Event('work-requested'));
    // También funciona si WebGL o la librería 3D no están disponibles.
    dockFallback = setTimeout(revealWork, 1300);
    if (reduced) revealWork();
  };
  document.querySelector('.nav-links a[href="#work"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (workRequested || document.body.classList.contains('work-engaged')) {
      if (!document.body.classList.contains('work-entering')) document.getElementById('work').scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' });
      return;
    }
    startWork();
  });
  // Con la landing bloqueada, bajar la rueda o deslizar el dedo hacia arriba la inicia. Después estos oyentes no hacen nada.
  let touchY = 0;
  const goDown = () => {
    if (workRequested || !document.body.classList.contains('intro-lock')) return;
    startWork();
  };
  addEventListener('wheel', (e) => { if (e.deltaY > 0 && !e.ctrlKey) goDown(); }, { passive: true });
  addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchmove', (e) => { if (touchY - e.touches[0].clientY > 12) goDown(); }, { passive: true });

  // Pulsar el tomate de la barra lleva a la portada: el tomate vuelve volando al centro (js/home-tomato.js), el texto grande se apaga,
  // la página sube sola y la portada queda bloqueada otra vez hasta que el visitante vuelva a empezar (Work, rueda o dedo).
  const goLanding = () => {
    clearTimeout(dockFallback);
    document.dispatchEvent(new Event('landing-requested'));
    line.classList.remove('is-live');
    document.body.classList.remove('intro-on', 'work-engaged', 'work-entering');
    cycler.stop();
    started = false; workRequested = false; workRevealed = false;
    history.replaceState(null, '', location.pathname + location.search);
    const relock = () => { document.body.classList.add('intro-lock'); scrollTo({ top: 0, behavior: 'instant' }); };
    if (scrollY < 2) { relock(); return; }
    scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' });
    let done = false;
    const finish = () => { if (done) return; done = true; removeEventListener('scroll', check); clearTimeout(timer); relock(); };
    const check = () => { if (scrollY < 2) finish(); };
    const timer = setTimeout(finish, 1200); // si algo impide llegar arriba, se bloquea igualmente
    addEventListener('scroll', check, { passive: true });
  };
  document.querySelector('.nav-logo')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!document.body.classList.contains('intro-lock')) goLanding(); // si ya está en la portada, no hay nada que hacer
  });

  document.addEventListener('tomato-docked', revealWork);
  // Atrás restaura la posición exacta, incluso si la URL conserva #work.
  // Los enlaces explícitos a Work entran directamente en la lista, sin deslizar la landing.
  if (BACK && SAVED_Y > 0) {
    document.body.classList.add('work-engaged');
    line.classList.add('is-live'); // sin entrada animada: el texto ya está donde toca (o escondido) desde el primer fotograma
    start();
    unlock();
    // Se repite al terminar de cargar: hasta entonces la altura de la página aún cambia y el salto se vería
    const restore = () => scrollTo({ top: SAVED_Y, behavior: 'instant' });
    restore();
    addEventListener('load', restore, { once: true });
  } else if (location.hash === '#work') {
    document.body.classList.add('work-engaged');
    line.classList.add('is-live');
    start();
    unlock();
    requestAnimationFrame(() => document.getElementById('work').scrollIntoView({ behavior: 'instant' }));
  }

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
    // El "Creative ___" sube según avanza el scroll
    line.style.translate = still ? '' : `0 ${(-q * 48).toFixed(1)}px`;
    // Al llegar a Work, el "Creative ___" del centro desaparece: la palabra sigue en el título fijo de la izquierda
    const workOn = !!work && work.offsetTop - y < innerHeight * 0.5;
    document.body.classList.toggle('work-on', workOn);
    line.style.opacity = workOn ? '0' : document.body.classList.contains('intro-on') ? String(1 - smooth(clamp01(q / 0.5))) : '';
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  addEventListener('load', update);
  update();
})();
