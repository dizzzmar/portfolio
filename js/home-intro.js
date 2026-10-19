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
  document.querySelector('.nav-links a[href="#work"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (workRequested || document.body.classList.contains('work-engaged')) {
      if (!document.body.classList.contains('work-entering')) document.getElementById('work').scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' });
      return;
    }
    workRequested = true;
    document.body.classList.add('work-engaged', 'work-entering');
    history.replaceState(null, '', '#work');
    document.dispatchEvent(new Event('work-requested'));
    // También funciona si WebGL o la librería 3D no están disponibles.
    dockFallback = setTimeout(revealWork, 1300);
    if (reduced) revealWork();
  });

  document.addEventListener('tomato-docked', revealWork);
  // Atrás restaura la posición exacta, incluso si la URL conserva #work.
  // Los enlaces explícitos a Work entran directamente en la lista, sin deslizar la landing.
  if (BACK && SAVED_Y > 0) {
    document.body.classList.add('work-engaged');
    start();
    unlock();
    // Se repite al terminar de cargar: hasta entonces la altura de la página aún cambia y el salto se vería
    const restore = () => scrollTo({ top: SAVED_Y, behavior: 'instant' });
    restore();
    addEventListener('load', restore, { once: true });
  } else if (location.hash === '#work') {
    document.body.classList.add('work-engaged');
    start();
    unlock();
    requestAnimationFrame(() => document.getElementById('work').scrollIntoView({ behavior: 'instant' }));
  }

  // La ráfaga solo corre mientras el texto se ve
  cycler.watch(word.parentElement, () => started);
})();

// ---------- Al bajar, "Creative ___" y el cielo se desenfocan (los proyectos pasan por encima) ----------
(() => {
  const line = document.querySelector('.intro-line');
  if (!line) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let queued = false;
  const update = () => {
    queued = false;
    const p = Math.min(1, Math.max(0, scrollY / innerHeight));
    const light = Math.min(1, Math.max(0, (p - 0.32) / 0.58));
    const easedLight = light * light * (3 - 2 * light);
    document.body.style.setProperty('--light-progress', easedLight.toFixed(3));
    document.body.classList.toggle('light-on', light > 0.55);
    if (!still) line.style.setProperty('--blur', (p * 10).toFixed(1) + 'px');
    document.body.classList.toggle('sky-soft', scrollY > innerHeight * 0.3);
    // Al llegar a Work, el "Creative ___" del centro desaparece: la palabra sigue en el título fijo de la izquierda
    const work = document.getElementById('work');
    const workOn = !!work && work.getBoundingClientRect().top < innerHeight * 0.5;
    document.body.classList.toggle('work-on', workOn);
    line.style.opacity = workOn ? '0' : document.body.classList.contains('intro-on') ? String(1 - p * 0.35) : '';
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
})();
