// HOME · texto "Creative ___" del centro de la pantalla.
// Cuando el tomate termina de subir al menú (aviso "tomato-docked" de js/home-tomato.js) aparece el texto,
// la segunda palabra cambia muy rápido durante un momento, se queda en "Designer" y vuelve a empezar.
// A partir de ahí ya se puede hacer scroll hasta los proyectos.
// EDITA aquí las palabras (la primera es en la que se para):
const WORDS = ['Designer', 'Director', 'Coder', 'Enthusiast', 'Thinker', 'Technologist', 'Maximalist', 'Storyteller', 'Retoucher', '3D Artist', 'Mind', 'Nerd'];
const SPEED = 75;      // milisegundos que se ve cada palabra mientras pasan
const BURST = 2600;    // cuánto dura cada ráfaga de palabras
const HOLD = 2800;     // cuánto se queda en "Designer" antes de la siguiente ráfaga

(() => {
  const word = document.querySelector('.intro-word');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let started = false, timer = 0, visible = true;

  function burst() {
    clearTimeout(timer);
    if (!visible || reduced) { word.textContent = WORDS[0]; return; }
    const end = performance.now() + BURST;
    let i = 1;
    const tick = () => {
      if (performance.now() >= end) {
        word.textContent = WORDS[0];
        timer = setTimeout(burst, HOLD);
        return;
      }
      word.textContent = WORDS[i % WORDS.length];
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
  // Al volver de un proyecto (/#work) no hay entrada: el texto y el scroll van directos a los proyectos
  if (location.hash === '#work') {
    start();
    requestAnimationFrame(() => document.getElementById('work').scrollIntoView());
  }

  // La ráfaga solo corre mientras el texto se ve
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting && !document.hidden;
    if (started) visible ? burst() : (clearTimeout(timer), word.textContent = WORDS[0]);
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
