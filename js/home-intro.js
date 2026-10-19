// HOME · texto "Creative ___" del centro de la pantalla.
// Cuando el tomate termina de subir al menú (aviso "tomato-docked" de js/home-tomato.js) aparece el texto,
// la segunda palabra va cambiando: cada cambio se descifra rápido y la palabra se queda quieta un instante para poder leerla;
// al final se para en "Designer" y vuelve a empezar.
// A partir de ahí ya se puede hacer scroll hasta los proyectos.
// Cada cambio de palabra se "descifra" desde el centro hacia fuera (letras al azar que se van fijando).
// Código propio, sin librerías.
// EDITA aquí las palabras (la primera es en la que se para):
const WORDS = ['Designer', 'Director', 'Coder', 'Enthusiast', 'Thinker', 'Technologist', 'Maximalist', 'Storyteller', 'Retoucher', '3D Artist', 'Mind', 'Nerd'];
const SCRAMBLE = 320;  // milisegundos que tarda cada palabra en descifrarse al aparecer
const SPEED = 950;     // milisegundos entre una palabra y la siguiente: tras descifrarse, la palabra se queda quieta (se lee) el resto
const BURST = 6000;    // cuánto dura cada ronda de palabras
const HOLD = 3200;     // cuánto se queda en "Designer" antes de la siguiente ronda

// Volver con Atrás (desde un proyecto): el navegador lo marca como "back_forward". La portada vuelve entonces
// a la posición donde estaba al salir (guardada en sessionStorage) y sin la entrada del tomate.
// Lo hacemos nosotros porque la portada bloquea el scroll al cargar y el navegador no lo restauraba.
const BACK = performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
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

  // ---- Descifrar desde el centro: las letras del medio se fijan primero y el resto detrás ----
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?';
  let scrambleRaf = 0;
  function setWord(text, ms = SCRAMBLE) {
    cancelAnimationFrame(scrambleRaf);
    if (reduced) { split(word, text); return; }
    split(word, text);
    const chars = [...word.children];
    const n = chars.length, mid = (n - 1) / 2;
    const start = performance.now();
    const settle = chars.map((c, i) => ({ c, final: text[i] === ' ' ? NBSP : text[i], at: n > 1 ? (Math.abs(i - mid) / mid) * 0.65 : 0 }));
    const step = (now) => {
      const p = Math.min(1, (now - start) / ms);
      let done = true;
      for (const { c, final, at } of settle) {
        if (p >= at + 0.35 || final === NBSP) c.textContent = final;
        else { c.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0]; done = false; }
      }
      if (!done) scrambleRaf = requestAnimationFrame(step);
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
    document.body.classList.remove('intro-lock');
    burst();
  }

  document.addEventListener('tomato-docked', start, { once: true });
  // Si el tomate 3D no carga (navegador sin WebGL, conexión lenta), el texto sale igual
  setTimeout(start, 6000);
  // Llegar a Work (/#work, desde el menú de un proyecto) no tiene entrada: el texto aparece y la página baja
  // hasta los proyectos con un desplazamiento suave. Volver con Atrás deja la portada donde estaba (ver arriba).
  if (location.hash === '#work') {
    start();
    requestAnimationFrame(() => document.getElementById('work').scrollIntoView({ behavior: 'smooth' }));
  } else if (BACK) {
    start();
    scrollTo({ top: SAVED_Y, behavior: 'instant' });
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
    if (!still) line.style.setProperty('--blur', (p * 10).toFixed(1) + 'px');
    document.body.classList.toggle('sky-soft', scrollY > innerHeight * 0.3);
    line.style.opacity = document.body.classList.contains('intro-on') ? String(1 - p * 0.35) : '';
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
})();

// ---------- Work: movimiento al hacer scroll ----------
// Cada proyecto sube a su propia velocidad (--dy, da profundidad), su imagen se mueve dentro del marco más despacio
// (--iy, paralaje) y se destapa de abajo arriba al entrar (clase is-in; ver css/home.css).
// Solo transform / translate / clip-path. Con "reducir movimiento" no se hace nada y todo se ve directamente.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const items = [...document.querySelectorAll('.work-item')];
  if (!items.length) return;
  document.documentElement.classList.add('work-motion');
  const speeds = items.map((_, i) => [0.09, -0.07, 0.12, -0.1, 0.06, -0.12][i % 6]);
  const io = new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).forEach((e) => { e.target.classList.add('is-in'); io.unobserve(e.target); });
  }, { rootMargin: '0px 0px -12% 0px' });
  items.forEach((el) => io.observe(el));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  let queued = false;
  function update() {
    queued = false;
    const vh = innerHeight;
    items.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const off = r.top + r.height / 2 - vh / 2;
      el.style.setProperty('--dy', (off * speeds[i]).toFixed(1) + 'px');
      el.style.setProperty('--iy', (clamp(off / vh, -1, 1) * -6).toFixed(2) + '%');
    });
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  update();
})();
