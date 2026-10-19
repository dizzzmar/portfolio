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
// Cada palabra nueva cambia de tipografía (la anterior no se repite). Las fuentes están en /assets/fonts (licencia SIL OFL)
const FONTS = [
  { family: '"Jacquard 12"', weight: 400 },
  { family: '"Jacquard 24"', weight: 400 },
  { family: '"Rubik Glitch"', weight: 400 },
  { family: '"Rubik Wet Paint"', weight: 400 },
  { family: '"Rubik Distressed"', weight: 400 },
  { family: '"Rubik Moonrocks"', weight: 400 },
  { family: '"Bungee Shade"', weight: 400, size: 0.8 }, // es muy ancha: con "Technologist" se saldría del móvil
  { family: '"Helvetica Neue", Arial, sans-serif', weight: 700 },
];

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
  const word = document.querySelector('.intro-word');
  const first = document.querySelector('.intro-line > span:first-child');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let started = false, timer = 0, visible = true;

  // ---- Letras sueltas: cada palabra se pinta como una fila de <span> (uno por letra) ----
  const NBSP = '\u00a0';
  function split(el, text) {
    el.textContent = '';
    for (const ch of text) {
      const c = document.createElement('span');
      c.className = 'ch';
      c.textContent = ch === ' ' ? NBSP : ch;
      el.append(c);
    }
  }
  split(first, first.textContent.trim());

  // ---- Mezclar la palabra actual antes de revelar la siguiente ----
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?';
  let scrambleRaf = 0;

  // ---- Tipografía nueva para cada palabra: se cambia justo cuando aparece la palabra nueva ----
  let lastFont = -1;
  function setFont() {
    let i;
    do { i = (Math.random() * FONTS.length) | 0; } while (i === lastFont);
    lastFont = i;
    word.style.fontFamily = FONTS[i].family;
    word.style.fontWeight = FONTS[i].weight;
    word.style.fontSize = (FONTS[i].size ?? 1) + 'em';
  }

  function setWord(text, ms = SCRAMBLE) {
    cancelAnimationFrame(scrambleRaf);
    if (reduced) { split(word, text); setFont(); return; }
    const previous = word.textContent.replaceAll(NBSP, ' ');
    if (previous === text) { split(word, text); return; }
    const start = performance.now();
    const mixDuration = ms * 0.35;
    let revealing = false, lastFrame = -Infinity;
    let chars = [...word.children];
    if (!chars.length) { split(word, previous); chars = [...word.children]; }
    const step = (now) => {
      const elapsed = now - start;
      if (elapsed >= ms) { if (!revealing) setFont(); split(word, text); return; }
      // Limitar el ruido a 25 fps mantiene las letras legibles entre cambios.
      if (now - lastFrame >= 40) {
        lastFrame = now;
        if (elapsed >= mixDuration && !revealing) {
          setFont();
          split(word, text);
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
    if (!visible || reduced) { setWord(WORDS[0], 450); return; }
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

  function start() {
    if (started) return;
    started = true;
    document.body.classList.add('intro-on');
    burst();
  }

  // Work inicia el viaje del tomate, muestra Creative y después entra en la lista.
  const unlock = () => document.body.classList.remove('intro-lock');
  let workRequested = false, workRevealed = false, dockFallback = 0;
  const revealWork = () => {
    if (!workRequested || workRevealed) return;
    workRevealed = true;
    clearTimeout(dockFallback);
    start();
    setTimeout(() => {
      unlock();
      document.body.classList.remove('work-entering');
      document.getElementById('work').scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' });
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
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting && !document.hidden;
    if (started) visible ? burst() : (clearTimeout(timer), setWord(WORDS[0]));
  }).observe(word.parentElement);

  // Los vídeos de los proyectos quedan quietos si el visitante pide menos movimiento
  if (reduced) document.querySelectorAll('.work-media video').forEach((v) => { v.autoplay = false; v.pause(); });
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
    line.style.opacity = document.body.classList.contains('intro-on') ? String(1 - p * 0.35) : '';
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
})();

// ---------- Work: entrada de las filas en ambas direcciones ----------
// La lista mantiene su alineación y cada fila aparece al entrar en pantalla.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const items = [...document.querySelectorAll('.work-item')];
  if (!items.length) return;
  document.documentElement.classList.add('work-motion');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add('is-in');
      else {
        e.target.classList.toggle('is-above', e.boundingClientRect.bottom <= 0);
        e.target.classList.remove('is-in');
      }
    });
  }, { threshold: 0 });
  items.forEach((el) => io.observe(el));
})();
