// PÁGINAS DE PROYECTO · aparición de los bloques con data-reveal, galería horizontal y reproductor propio.
// La galería se recorre con la rueda del ratón o el trackpad mientras está entera en pantalla, esté el cursor donde esté; al llegar a un extremo, tras una pausa, la página vuelve a desplazarse.
// Con el dedo no se interviene: la página se desplaza sola. Además, se puede arrastrar con el ratón, con el dedo o con las flechas del teclado. Sin script, la tira se desliza de forma nativa.
// Arrastrando con el ratón, con el dedo o con las flechas del teclado. Sin script, la tira se desliza de forma nativa.
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

// ---------- Galería horizontal ----------
(() => {
  const track = document.querySelector('.p-track');
  if (!track) return;
  const bar = document.querySelector('.p-progress i');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  track.querySelectorAll('.p-card').forEach((card, i) => card.style.setProperty('--i', i));

  const max = () => Math.max(0, track.scrollWidth - track.clientWidth);
  let target = track.scrollLeft, raf = 0, dragging = false;
  const paint = () => { if (bar) bar.style.transform = `scaleX(${max() ? track.scrollLeft / max() : 0})`; };
  // Llega a su destino con inercia: cada fotograma recorre una parte de lo que falta
  const step = () => {
    raf = 0;
    const d = target - track.scrollLeft;
    if (Math.abs(d) < 0.5) { track.scrollLeft = target; return; }
    track.scrollLeft += d * 0.14;
    raf = requestAnimationFrame(step);
  };
  const goTo = (x) => {
    target = Math.max(0, Math.min(max(), x));
    if (reduced) track.scrollLeft = target;
    else if (!raf) raf = requestAnimationFrame(step);
  };
  // Si algo más mueve la tira (el dedo, el teclado), el destino se sincroniza
  track.addEventListener('scroll', () => { if (!raf && !dragging) target = track.scrollLeft; paint(); }, { passive: true });
  addEventListener('resize', paint);
  paint();

  // Rueda (ratón y trackpad): mientras la galería está entera en pantalla, la rueda la recorre esté el cursor donde esté.
  // Al llegar a un extremo, la página vuelve a desplazarse; la inercia del trackpad que aún llega no la mueve de golpe (pausa de 300 ms).
  let lastUsed = 0;
  const gallery = document.querySelector('.p-gallery');
  if (gallery && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    addEventListener('wheel', (e) => {
      if (e.defaultPrevented || e.ctrlKey || !e.cancelable || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const r = gallery.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight) return; // la galería no está entera en pantalla: se desplaza la página
      const down = e.deltaY > 0;
      if ((down && target >= max() - 1) || (!down && target <= 0)) {
        if (performance.now() - lastUsed < 300) e.preventDefault();
        return;
      }
      lastUsed = performance.now();
      e.preventDefault();
      goTo(target + e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1));
    }, { passive: false });
  }

  // Arrastrar con el ratón (con el dedo ya funciona de forma nativa)
  let startX = 0, startLeft = 0, moved = false;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('.player-bar, .player-toggle')) return;
    dragging = true;
    moved = false;
    startX = e.clientX;
    startLeft = track.scrollLeft;
    track.setPointerCapture(e.pointerId);
  });
  track.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    if (Math.abs(e.clientX - startX) > 4) { moved = true; track.classList.add('is-dragging'); }
    track.scrollLeft = startLeft - (e.clientX - startX);
    target = track.scrollLeft;
  });
  const stop = () => { dragging = false; track.classList.remove('is-dragging'); };
  track.addEventListener('pointerup', stop);
  track.addEventListener('pointercancel', stop);
  track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true); // arrastrar no cuenta como pulsar

  // Flechas del teclado
  track.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (!k || e.target !== track) return;
    e.preventDefault();
    goTo(target + k * track.clientWidth * 0.6);
  });

  // "Go to film": la tira se desliza hasta la película (y, si hace falta, la página sube hasta la galería)
  document.querySelectorAll('[data-go-film]').forEach((link) => link.addEventListener('click', (e) => {
    const film = track.querySelector('#film');
    if (!film) return;
    e.preventDefault();
    goTo(film.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft));
    track.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
  }));
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
      const k = { ArrowLeft: -5, ArrowRight: 5 }[e.key];
      if (k && video.duration) { e.preventDefault(); video.currentTime = Math.min(video.duration, Math.max(0, video.currentTime + k)); }
    });
  });
})();

// ---------- Atrás: vuelve a la portada exactamente donde estaba ----------
// Si se llegó desde la web, usa el historial (js/home-intro.js guarda y restaura la posición).
// Si no (por ejemplo, abriendo el proyecto directamente), el enlace lleva a /#work como siempre.
(() => {
  if (history.length < 2 || !document.referrer.startsWith(location.origin + '/')) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.case-back').forEach((back) => back.addEventListener('click', (e) => {
    e.preventDefault();
    // La portada sabe de qué proyecto llegamos (js/home-work.js) para encender su fila al volver
    try { sessionStorage.setItem('dizmar-from', location.pathname); } catch (err) { /* storage blocked */ }
    // Con View Transitions (css/transitions.css) la vuelta se anima sola: la primera tarjeta se encoge hasta su miniatura. Sin ellas, se despide aquí
    if (reduced || 'onpageswap' in window) { history.back(); return; }
    // Antes de volver, el proyecto se despide (css/case.css, clase is-leaving) y después se vuelve atrás
    document.body.classList.add('is-leaving');
    setTimeout(() => history.back(), 300);
  }));
})();

// ---------- El nombre del proyecto se mezcla y pasa a "Back to projects" al pasar el ratón ----------
// Mismo efecto de letras al azar que "Creative ___" de la portada: las letras se van fijando de izquierda a derecha.
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
