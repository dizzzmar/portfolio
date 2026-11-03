// PROJECTS · lista de proyectos: título fijo a la izquierda y proyectos a la derecha (la parte visual está en css/home.css).
//  · cada proyecto aparece una vez al entrar: el marco de la imagen se abre de arriba abajo y debajo sube su texto;
//  · al pasar el ratón: se enciende el texto, la imagen se acerca un poco y "View project" hace de cursor;
//  · los vídeos solo se reproducen mientras se ven;
//  · la barra de arriba lleva «Creative ___»: la segunda palabra cambia sola mientras se ve.
// Todo se apaga con "reducir movimiento". Sin este script, la lista se ve completa y quieta.
(() => {
  const work = document.getElementById('work');
  if (!work) return;
  // La hora de Madrid bajo "Based in Madrid" (sea cual sea la zona del visitante), puesta al minuto
  const clock = document.querySelector('[data-madrid-time]');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
    const tick = () => {
      const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
      clock.textContent = `${parts.hour}:${parts.minute} ${parts.timeZoneName}`;
      setTimeout(tick, 60000 - (Date.now() % 60000) + 50);
    };
    tick();
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // ---- Barra de arriba: «Creative ___» con la segunda palabra cambiante ----
  // Cada cambio mezcla la palabra actual y descifra la siguiente (de izquierda a derecha); tras unos segundos vuelve a «Designer» y descansa.
  // Corre solo mientras la barra se ve y la pestaña está abierta; con «reducir movimiento» se queda quieta en «Designer».
  // EDITA aquí las palabras (la primera es en la que se para):
  const WORDS = ['Designer', 'Director', 'Coder', 'Enthusiast', 'Thinker', 'Technologist', 'Maximalist', 'Storyteller', 'Retoucher', '3D Artist', 'Mind', 'Nerd'];
  const wordEl = document.querySelector('.work-top .wb-word');
  const topBar = document.querySelector('.work-top');
  if (wordEl && topBar && !reduced) {
    const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?';
    const SCRAMBLE = 700, SPEED = 1700, BURST = 6000, HOLD = 3200; // ms: descifrado · entre palabras · cada ronda · descanso en «Designer»
    let timer = 0, raf = 0, shown = false;
    const setWord = (text, ms = SCRAMBLE) => {
      cancelAnimationFrame(raf);
      const previous = wordEl.textContent;
      if (previous === text) return;
      const start = performance.now(), mix = ms * 0.35;
      let last = -Infinity;
      const step = (now) => {
        const t = now - start;
        if (t >= ms) { wordEl.textContent = text; return; }
        if (now - last >= 40) { // 25 fps: las letras se leen entre cambios
          last = now;
          const revealing = t >= mix, source = revealing ? text : previous, done = revealing ? Math.floor(((t - mix) / (ms - mix)) * source.length) : 0;
          wordEl.textContent = [...source].map((c, i) => (c === ' ' || i < done ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const stop = () => { clearTimeout(timer); setWord(WORDS[0], 450); };
    const burst = () => {
      clearTimeout(timer);
      if (!shown) return;
      const end = performance.now() + BURST;
      let i = 1;
      const tick = () => {
        if (!shown) return;
        if (performance.now() >= end) { setWord(WORDS[0], 450); timer = setTimeout(burst, HOLD); return; }
        setWord(WORDS[i++ % WORDS.length]);
        timer = setTimeout(tick, SPEED);
      };
      tick();
    };
    const update = (visible) => { const was = shown; shown = visible && !document.hidden; if (shown && !was) burst(); else if (!shown && was) stop(); };
    let inView = false;
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; update(inView); }).observe(topBar);
    document.addEventListener('visibilitychange', () => update(inView));
  }
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const rows = [...work.querySelectorAll('.work-item')];
  
  // ---- Vídeos: solo se reproducen mientras se ven ----
  const videos = [...work.querySelectorAll('.wi-tile video')];
  videos.forEach((v) => { v.autoplay = false; v.pause(); });
  if (!reduced && videos.length) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => (e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause())));
    videos.forEach((v) => io.observe(v));
  }

  // ---- Volver desde un proyecto: la lista llega con un fundido corto, la fila de ese proyecto se enciende un momento
  //      y la lista no repite su entrada (js/case.js guarda el proyecto al salir) ----
  const returned = (() => { try { return !!sessionStorage.getItem('dizmar-from'); } catch (e) { return false; } })();
  const arrive = () => {
    let from = null;
    try { from = sessionStorage.getItem('dizmar-from'); sessionStorage.removeItem('dizmar-from'); } catch (e) { /* storage blocked */ }
    const row = rows.find((r) => r.querySelector('a')?.getAttribute('href') === from);
    if (!row) return;
    // Con transición de página (is-vt) la lista se está fundiendo: la fila se enciende cuando termina
    const settle = document.documentElement.classList.contains('is-vt') ? 300 : 0;
    work.classList.add('arriving');
    setTimeout(() => row.classList.add('is-back'), settle);
    setTimeout(() => work.classList.remove('arriving'), 600);
    setTimeout(() => row.classList.remove('is-back'), settle + 1600);
  };
  addEventListener('pageshow', (e) => { if (e.persisted) arrive(); });
  if (returned) arrive(); // volver sin caché del navegador (iPhone, recarga completa): la fila también se enciende

  // ---- Aparecer: cada fila entra una sola vez ----
  if (!reduced && !returned) {
    document.documentElement.classList.add('work-motion');
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    rows.forEach((row) => io.observe(row));
  }

  // ---- Móvil: la fila del centro de la pantalla se enciende (no hay ratón para hacerlo) ----
  if (!fine) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('is-hot', e.isIntersecting)), { rootMargin: '-42% 0px -42% 0px' });
    rows.forEach((row) => io.observe(row));
  }

  // «View project» sobre una fila lo dibuja el propio cursor (js/cursor.js)
  // Studies: al pasar el título «Studies» por la mitad de la pantalla, la página se tiñe de rosa y los textos de rojo (css/home.css, studies-on)
  const studies = document.getElementById('studies');
  if (studies) {
    let queued = false;
    const tint = () => { queued = false; document.body.classList.toggle('studies-on', studies.getBoundingClientRect().top < innerHeight * .55); };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(tint); } }, { passive: true });
    addEventListener('resize', tint);
    tint();
  }
  arrive();
})();
