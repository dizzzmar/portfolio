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
