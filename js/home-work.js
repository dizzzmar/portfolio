// WORK · previews en vídeo o secuencias de imágenes del propio proyecto.
// Solo se animan mientras están visibles; se pueden pausar y respetan reducir movimiento.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const button = document.querySelector('.work-preview-toggle');
  let paused = false;
  const previews = [...document.querySelectorAll('.work-media')].map((box) => {
    const video = box.querySelector('video');
    const sources = (box.dataset.previewImages || '').split(/\s+/).filter(Boolean);
    const image = box.querySelector('img');
    let next, index = 0, timer = 0, generation = 0, running = false, visible = false;
    if (image && sources.length > 1) {
      next = document.createElement('img');
      next.className = 'preview-next';
      next.alt = '';
      next.setAttribute('aria-hidden', 'true');
      next.width = image.width;
      next.height = image.height;
      box.append(next);
    }
    const cycle = async () => {
      const ticket = generation;
      const target = (index + 1) % sources.length;
      const preload = new Image();
      preload.src = sources[target];
      try { await preload.decode(); } catch { /* Keep the current image on a failed download. */ }
      if (!running || ticket !== generation) return;
      if (preload.naturalWidth) {
        next.src = sources[target];
        next.classList.add('is-active');
        timer = setTimeout(() => {
          image.src = sources[target];
          index = target;
          next.classList.remove('is-active');
          timer = setTimeout(cycle, 850);
        }, 240);
      } else timer = setTimeout(cycle, 2000);
    };
    const update = () => {
      const shouldRun = visible && !paused && !reduced.matches && !document.hidden;
      if (shouldRun === running) return;
      running = shouldRun;
      generation++;
      clearTimeout(timer);
      if (video) {
        video.autoplay = false;
        if (running) video.play().catch(() => {});
        else video.pause();
      }
      if (next) {
        next.classList.remove('is-active');
        if (running) timer = setTimeout(cycle, 850);
      }
    };
    if (video) { video.autoplay = false; video.pause(); }
    return { box, update, setVisible(value) { visible = value; update(); } };
  });
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => previews.find((p) => p.box === entry.target)?.setVisible(entry.isIntersecting));
  });
  previews.forEach((p) => observer.observe(p.box));
  const updateAll = () => {
    if (button) {
      button.hidden = reduced.matches;
      button.textContent = paused ? 'Play previews' : 'Pause previews';
      button.setAttribute('aria-pressed', String(paused));
    }
    previews.forEach((p) => p.update());
  };
  button?.addEventListener('click', () => { paused = !paused; updateAll(); });
  document.addEventListener('visibilitychange', updateAll);
  reduced.addEventListener('change', updateAll);
  updateAll();
})();
