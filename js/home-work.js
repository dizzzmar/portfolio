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
    return { box, video, image, next, link: box.closest('a'), update, setVisible(value) { visible = value; update(); } };
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

  // El mismo fotograma de la miniatura ocupa el fondo entero; no se carga otro vídeo.
  const work = document.getElementById('work');
  const projects = previews.filter((p) => p.link);
  if (!work || !projects.length) return;
  const backdrop = document.createElement('div');
  backdrop.className = 'work-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  const frames = [0, 1].map(() => {
    const canvas = document.createElement('canvas');
    canvas.className = 'work-backdrop-frame';
    backdrop.append(canvas);
    return { canvas, context: canvas.getContext('2d', { alpha: false }) };
  });
  if (frames.some((f) => !f.context)) return;
  const cursor = document.createElement('div');
  cursor.className = 'work-cursor';
  cursor.textContent = 'View project';
  cursor.setAttribute('aria-hidden', 'true');
  document.body.append(backdrop, cursor);
  projects.forEach((p) => {
    if (p.video) {
      p.poster = new Image();
      p.poster.src = p.video.poster;
    }
  });
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let active = projects[0], frame = 0, inWork = false, raf = 0, lastPaint = 0, lastKey = '';
  let mouse = null;
  const fit = (context, source, width, height) => {
    const sw = source.videoWidth || source.naturalWidth;
    const sh = source.videoHeight || source.naturalHeight;
    if (!sw || !sh) return false;
    const scale = Math.max(width / sw, height / sh);
    context.drawImage(source, (width - sw * scale) / 2, (height - sh * scale) / 2, sw * scale, sh * scale);
    return true;
  };
  const draw = () => {
    const { canvas, context } = frames[frame];
    const width = Math.min(innerWidth, 1920), height = Math.round(width * innerHeight / innerWidth);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; lastKey = ''; }
    const source = active.video && active.video.readyState >= 2 ? active.video : active.image || active.poster;
    if (!source || !(source.videoWidth || source.naturalWidth)) return;
    const next = active.next;
    const opacity = next ? Number(getComputedStyle(next).opacity) : 0;
    const key = [frame, active.link.href, source.currentSrc || source.src, source.currentTime || 0, next?.src, opacity].join('|');
    if (key === lastKey) return;
    context.globalAlpha = 1;
    fit(context, source, width, height);
    if (next?.complete && next.naturalWidth && opacity > 0) {
      context.globalAlpha = opacity;
      fit(context, next, width, height);
      context.globalAlpha = 1;
    }
    lastKey = key;
    frames.forEach((f, i) => f.canvas.classList.toggle('is-active', i === frame));
  };
  const render = (now) => {
    raf = 0;
    if (!inWork || document.hidden) return;
    if (now - lastPaint > 33) { draw(); lastPaint = now; }
    raf = requestAnimationFrame(render);
  };
  const select = (project) => {
    if (!project || project === active) return;
    active = project;
    frame = 1 - frame;
    lastKey = '';
    projects.forEach((p) => p.link.closest('.work-item').classList.toggle('is-active', p === active));
    draw();
  };
  const updateView = () => {
    const r = work.getBoundingClientRect();
    inWork = r.top <= innerHeight * .45 && r.bottom > 0;
    document.body.classList.toggle('work-preview-on', inWork);
    backdrop.classList.toggle('is-visible', inWork);
    const hovered = mouse && fine.matches && document.elementFromPoint(mouse.x, mouse.y)?.closest('.work-item > a');
    const selected = projects.find((p) => p.link === hovered);
    const focused = projects.find((p) => p.link === document.activeElement && p.link.matches(':focus-visible'));
    document.body.classList.toggle('work-cursor-on', inWork && !!selected);
    if (focused) select(focused);
    else if (selected) select(selected);
    else if (!fine.matches && inWork) {
      const visible = projects.filter((p) => { const r = p.link.getBoundingClientRect(); return r.bottom > 64 && r.top < innerHeight; });
      if (visible.length) select(visible.reduce((a, b) => {
        const center = (p) => { const r = p.link.getBoundingClientRect(); return Math.abs(r.top + r.height / 2 - innerHeight * .4); };
        return center(a) < center(b) ? a : b;
      }));
    }
    if (inWork && !raf && !document.hidden) raf = requestAnimationFrame(render);
  };
  projects[0].link.closest('.work-item').classList.add('is-active');
  projects.forEach((p) => {
    p.link.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') select(p); });
    p.link.addEventListener('focus', () => { select(p); updateView(); });
  });
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mouse = { x: e.clientX, y: e.clientY };
    cursor.style.transform = `translate3d(${Math.min(e.clientX + 18, innerWidth - 124)}px, ${Math.min(e.clientY + 18, innerHeight - 28)}px, 0)`;
    updateView();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { mouse = null; document.body.classList.remove('work-cursor-on'); });
  addEventListener('scroll', updateView, { passive: true });
  addEventListener('resize', updateView);
  document.addEventListener('visibilitychange', updateView);
  updateView();
})();
