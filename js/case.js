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
