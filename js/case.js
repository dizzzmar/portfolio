// PÁGINAS DE PROYECTO · aparición de los bloques con data-reveal, reproductor propio y botón de volver.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) document.querySelectorAll('video[autoplay]').forEach((v) => { v.autoplay = false; v.pause(); });

  const items = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).forEach((e) => { e.target.classList.add('is-in'); io.unobserve(e.target); });
  }, { rootMargin: '0px 0px -10% 0px' });
  items.forEach((el) => io.observe(el));
})();

// ---------- Barra de reproducción propia ----------
// Línea de progreso abajo (se puede pulsar para saltar), PLAY / PAUSE junto al cursor,
// y SOUND : ON/OFF y FULL SCREEN a la derecha. Sin script, el vídeo conserva los controles del navegador.
(() => {
  const fmt = (t) => {
    t = Math.max(0, Math.floor(t || 0));
    return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  };
  document.querySelectorAll('video[data-player]').forEach((video) => {
    const box = video.parentElement;
    video.controls = false;
    box.classList.add('player');
    box.insertAdjacentHTML('beforeend', `
      <button class="player-toggle" type="button"><span class="player-state">Pause</span><span class="player-time">00:00 / 00:00</span></button>
      <div class="player-bar">
        <div class="player-track" role="slider" tabindex="0" aria-label="Video position" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>
        <button class="player-sound" type="button">Sound : off</button>
        <button class="player-full" type="button">Full screen</button>
      </div>`);
    const state = box.querySelector('.player-state');
    const time = box.querySelector('.player-time');
    const track = box.querySelector('.player-track');
    const fill = track.querySelector('i');
    const sound = box.querySelector('.player-sound');

    const paint = () => {
      const d = video.duration || 0;
      const p = d ? video.currentTime / d : 0;
      fill.style.transform = `scaleX(${p})`;
      track.setAttribute('aria-valuenow', Math.round(p * 100));
      time.textContent = fmt(video.currentTime) + ' / ' + fmt(d);
      state.textContent = video.paused ? 'Play' : 'Pause';
      sound.textContent = 'Sound : ' + (video.muted ? 'off' : 'on');
      box.classList.toggle('is-paused', video.paused);
    };
    ['timeupdate', 'loadedmetadata', 'play', 'pause', 'volumechange'].forEach((e) => video.addEventListener(e, paint));
    paint();

    const toggle = () => (video.paused ? video.play().catch(() => {}) : video.pause());
    box.querySelector('.player-toggle').addEventListener('click', toggle);
    video.addEventListener('click', toggle);
    // En ordenador, el texto sigue al cursor y desaparece al salir del vídeo.
    const pointer = (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = box.getBoundingClientRect();
      const button = box.querySelector('.player-toggle');
      const x = Math.max(8, Math.min(r.width - button.offsetWidth - 8, e.clientX - r.left + 16));
      const y = Math.max(8, Math.min(r.height - button.offsetHeight - 44, e.clientY - r.top + 16));
      box.style.setProperty('--pointer-x', x + 'px');
      box.style.setProperty('--pointer-y', y + 'px');
      box.classList.add('pointer-inside');
    };
    video.addEventListener('pointerenter', pointer);
    video.addEventListener('pointermove', pointer);
    video.addEventListener('pointerleave', () => box.classList.remove('pointer-inside'));

    sound.addEventListener('click', () => { video.muted = !video.muted; if (!video.muted && video.paused) video.play().catch(() => {}); });
    box.querySelector('.player-full').addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (box.requestFullscreen) box.requestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen(); // iPhone
    });
    const seek = (x) => {
      const r = track.getBoundingClientRect();
      if (video.duration) video.currentTime = Math.min(1, Math.max(0, (x - r.left) / r.width)) * video.duration;
    };
    track.addEventListener('pointerdown', (e) => {
      seek(e.clientX);
      track.setPointerCapture(e.pointerId);
      const move = (ev) => seek(ev.clientX);
      track.addEventListener('pointermove', move);
      track.addEventListener('pointerup', () => track.removeEventListener('pointermove', move), { once: true });
    });
    track.addEventListener('keydown', (e) => {
      if (!video.duration) return;
      const k = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5 }[e.key];
      if (k) { e.preventDefault(); video.currentTime = Math.min(video.duration, Math.max(0, video.currentTime + k)); }
      else if (e.key === 'Home') { e.preventDefault(); video.currentTime = 0; }
      else if (e.key === 'End') { e.preventDefault(); video.currentTime = video.duration; }
    });
  });
})();

// ---------- Atrás: vuelve a la lista de Work, justo en este proyecto ----------
// Siempre se guarda el proyecto del que se sale: la portada (js/home-intro.js) coloca la lista con su fila a la vista y js/home-work.js la enciende.
// Si se llegó desde la portada, se usa además el historial, que devuelve la posición exacta y permite la animación de vuelta.
// Si no (se abrió el proyecto directamente, o desde About o el menú), el enlace lleva a /#work y la portada hace el resto.
(() => {
  const from = document.referrer.startsWith(location.origin + '/') ? new URL(document.referrer).pathname : '';
  const viaHistory = history.length >= 2 && from === '/'; // desde otro proyecto o desde About, «atrás» devolvería a donde no se prometía
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let leaving = false;
  document.querySelectorAll('.case-back').forEach((back) => back.addEventListener('click', (e) => {
    try { sessionStorage.setItem('dizmar-from', location.pathname); } catch (err) { /* storage blocked */ }
    if (!viaHistory) return; // el enlace sigue su camino (/#work)
    e.preventDefault();
    if (leaving) return; // un doble clic no debe retroceder dos veces
    leaving = true;
    // Con View Transitions (css/transitions.css) la vuelta se anima sola: la primera tarjeta se encoge hasta su miniatura. Sin ellas, se despide aquí
    if (reduced || 'onpageswap' in window) { history.back(); return; }
    // Antes de volver, el proyecto se despide (css/case.css, clase is-leaving) y después se vuelve atrás
    document.body.classList.add('is-leaving');
    setTimeout(() => history.back(), 220);
  }));
})();

// ---------- El nombre del proyecto se mezcla y pasa a "Back to projects" al pasar el ratón ----------
// Efecto de letras al azar: las letras se van fijando de izquierda a derecha.
(() => {
  const link = document.querySelector('.case-name .case-back');
  const label = link && link.querySelector('.cb-text');
  if (!label) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const original = label.textContent;
  const back = 'Back to projects';
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?';
  let raf = 0, goal = original;
  const scramble = (text, ms = 560) => {
    if (text === goal) return;
    goal = text;
    cancelAnimationFrame(raf);
    if (reduced) { label.textContent = text; return; }
    const start = performance.now();
    let last = -Infinity;
    const step = (now) => {
      const p = Math.min(1, (now - start) / ms);
      if (p >= 1) { label.textContent = text; return; }
      if (now - last >= 35) {
        last = now;
        const fixed = Math.floor(p * text.length * 1.2);
        label.textContent = [...text].map((ch, i) => (ch === ' ' || i < fixed ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };
  link.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') scramble(back); });
  link.addEventListener('pointerleave', () => scramble(original));
  link.addEventListener('focus', () => { if (link.matches(':focus-visible')) scramble(back); });
  link.addEventListener('blur', () => scramble(original));
})();
