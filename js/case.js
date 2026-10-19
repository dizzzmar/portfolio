// PÁGINAS DE PROYECTO · hace aparecer cada bloque marcado con data-reveal al entrar en pantalla
// y deja quietos los vídeos si el visitante pide menos movimiento.
// Los vídeos con data-player llevan una barra de reproducción propia (como en cipher.tv).
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

// ---------- Movimiento al hacer scroll ----------
// Solo transform / translate / clip-path (baratos para el navegador) y solo si el visitante no pide menos movimiento:
//  · portada y fotos: la imagen se mueve dentro de su marco más despacio que la página (paralaje) y la portada
//    hace un zoom suave hacia atrás al bajar;
// La galería mantiene sus columnas alineadas sin desplazar cada foto por separado.
// Los marcos y su proporción están en css/case.css (.px); sin JS o con "reducir movimiento" todo queda quieto.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const frames = [...document.querySelectorAll('.case-cover, .case-wide:not(.vertical) figure')];
  const cover = document.querySelector('.case-cover');
  frames.forEach((f) => f.classList.add('px'));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  let queued = false;
  function update() {
    queued = false;
    const vh = innerHeight;
    for (const f of frames) {
      const r = f.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      const p = clamp((r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2), -1, 1); // -1 abajo del todo · 1 arriba del todo
      f.style.setProperty('--py', (p * -r.height * 0.07).toFixed(1) + 'px');
      if (f === cover) f.style.setProperty('--ps', (1 + clamp(scrollY / vh, 0, 1) * -0.06 + 0.08).toFixed(4));
    }
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  update();
})();

// ---------- Barra y lados en blanco mientras hay una imagen por detrás ----------
// Número y título de los lados: cada uno comprueba qué hay justo detrás de él (una foto, un vídeo o el fondo)
// y se pone blanco sobre las imágenes y oscuro sobre el fondo. La barra, solo cuando la portada pasa por debajo.
(() => {
  const cover = document.querySelector('.case-cover');
  const sides = [...document.querySelectorAll('.case-side')];
  const navH = () => document.querySelector('.case-nav').offsetHeight;
  let queued = false;
  const check = () => {
    queued = false;
    for (const side of sides) {
      const r = side.getBoundingClientRect();
      const under = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      side.classList.toggle('on-img', under.some((el) => el.closest('.px, .case-wide figure, .case-embed .instagram-media, video')));
    }
    if (cover) {
      const r = cover.getBoundingClientRect();
      document.body.classList.toggle('over-cover-nav', r.top < navH() / 2 && r.bottom > navH() / 2);
    }
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(check); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  check();
})();

// ---------- Barra de reproducción propia ----------
// Línea de progreso abajo (se puede pulsar para saltar), PLAY / PAUSE con el tiempo en el centro,
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

    // La rueda recorre la película; al llegar a los extremos vuelve a desplazar la página.
    video.addEventListener('wheel', (e) => {
      if (e.ctrlKey || !e.cancelable || !Number.isFinite(video.duration) || !video.duration || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? video.clientHeight : 1);
      const next = Math.max(0, Math.min(video.duration, video.currentTime + delta * 0.01));
      if (Math.abs(next - video.currentTime) < 0.01) return;
      e.preventDefault();
      video.pause();
      video.currentTime = next;
      paint();
    }, { passive: false });
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
  const back = document.querySelector('.case-back');
  if (!back || history.length < 2 || !document.referrer.startsWith(location.origin + '/')) return;
  back.addEventListener('click', (e) => { e.preventDefault(); history.back(); });
})();
