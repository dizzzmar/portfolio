// WORK · colección de proyectos (referencia: provoke.framer.website/case-studies, con el estilo de esta web).
//  · el título fijo de la izquierda es "Creative ___": su palabra cambia de tipografía (createWordCycler, js/home-intro.js);
//  · cada tarjeta se destapa de abajo arriba al entrar y se mueve a su propia velocidad al hacer scroll, con inercia;
//  · al pasar el ratón: la foto se acerca, el pie sube y aparece "View project" siguiendo al cursor (la parte visual está en css/home.css);
//  · los vídeos solo se reproducen mientras se ven; la tarjeta de Soap & Glory cambia de foto mientras se pasa el ratón.
// Todo se apaga con "reducir movimiento". Sin este script, la colección se ve completa y quieta.
(() => {
  const work = document.getElementById('work');
  if (!work) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const items = [...work.querySelectorAll('.work-item')];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // ---- Título fijo: la palabra cambia mientras el título se ve ----
  const big = work.querySelector('.work-big');
  const bigWord = work.querySelector('.wb-word');
  if (big && bigWord) createWordCycler(bigWord, { visible: false }).watch(big);

  // ---- Vídeos: solo suenan los fotogramas que se ven ----
  const videos = [...work.querySelectorAll('.work-media video')];
  videos.forEach((v) => { v.autoplay = false; v.pause(); });
  if (!reduced && videos.length) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => (e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause())));
    videos.forEach((v) => io.observe(v));
  }

  // ---- Aparecer: cada tarjeta se destapa una vez, al entrar en pantalla ----
  if (!reduced) {
    document.documentElement.classList.add('work-motion');
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    items.forEach((el) => io.observe(el));
  }

  // ---- Movimiento con inercia: la tarjeta (--dy) y su foto (--iy) van un poco por detrás del scroll ----
  // Las tarjetas "a" suben algo más despacio que la página y las "b" algo más deprisa, así se cruzan y dan profundidad.
  if (!reduced) {
    const speeds = items.map((el) => (el.classList.contains('work-b') ? -0.11 : 0.06));
    const now = items.map(() => ({ dy: 0, iy: 0 }));
    let raf = 0, last = 0;
    const frame = (t) => {
      raf = 0;
      const k = 1 - Math.exp(-(t - (last || t - 16)) / 110); // cuánto se acerca cada fotograma a su destino
      last = t;
      let moving = false;
      const vh = innerHeight;
      items.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const center = r.top - now[i].dy + r.height / 2; // posición sin el desplazamiento que ya llevamos aplicado
        const off = center - vh / 2;
        if (Math.abs(off) > vh * 1.6) return;
        const toDy = off * speeds[i];
        const toIy = clamp(off / vh, -1, 1) * -4;
        now[i].dy += (toDy - now[i].dy) * k;
        now[i].iy += (toIy - now[i].iy) * k;
        if (Math.abs(toDy - now[i].dy) > 0.05 || Math.abs(toIy - now[i].iy) > 0.01) moving = true;
        el.style.setProperty('--dy', now[i].dy.toFixed(2) + 'px');
        el.style.setProperty('--iy', now[i].iy.toFixed(3) + '%');
      });
      if (moving) raf = requestAnimationFrame(frame);
      else last = 0;
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };
    addEventListener('scroll', wake, { passive: true });
    addEventListener('resize', wake);
    wake();
  }

  // ---- Soap & Glory: mientras el ratón está encima, la foto va cambiando ----
  if (!reduced) {
    items.forEach((item) => {
      const box = item.querySelector('.work-media[data-preview-images]');
      const link = item.querySelector(':scope > a');
      if (!box || !link) return;
      const urls = box.dataset.previewImages.split(/\s+/).filter(Boolean);
      if (urls.length < 2) return;
      let layers = null, index = 0, timer = 0;
      const show = (i) => { index = i; layers.forEach((l, n) => l.classList.toggle('is-on', n === i && i > 0)); };
      const build = () => {
        layers = [box.querySelector('img'), ...urls.slice(1).map((src) => {
          const img = new Image();
          img.className = 'work-alt';
          img.alt = '';
          img.src = src;
          img.setAttribute('aria-hidden', 'true');
          box.append(img);
          return img;
        })];
      };
      link.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse') return;
        if (!layers) build();
        clearTimeout(timer);
        const next = () => { show((index + 1) % layers.length); timer = setTimeout(next, 900); };
        timer = setTimeout(next, 350);
      });
      link.addEventListener('pointerleave', () => { clearTimeout(timer); timer = setTimeout(() => layers && show(0), 250); });
    });
  }

  // ---- "View project": sigue al ratón con un poco de retraso ----
  if (fine && !reduced) {
    const pill = document.createElement('div');
    pill.className = 'work-cursor';
    pill.textContent = 'View project';
    pill.setAttribute('aria-hidden', 'true');
    document.body.append(pill);
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0, mouse = null;
    const loop = () => {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      pill.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      raf = Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3 ? requestAnimationFrame(loop) : 0;
    };
    const over = () => !!mouse && !!document.elementFromPoint(mouse.x, mouse.y)?.closest('.work-item > a');
    work.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      mouse = { x: e.clientX, y: e.clientY };
      tx = Math.min(e.clientX + 16, innerWidth - 130);
      ty = Math.min(e.clientY + 16, innerHeight - 40);
      pill.classList.toggle('is-on', over());
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    work.addEventListener('pointerleave', () => { mouse = null; pill.classList.remove('is-on'); });
    addEventListener('scroll', () => { if (mouse) pill.classList.toggle('is-on', over()); }, { passive: true });
  }

  // ---- Barra: sus enlaces se ponen blancos cuando pasan por encima de un vídeo o un panel oscuro ----
  const links = [...document.querySelectorAll('.nav-links a')];
  let queued = false;
  const contrast = () => {
    queued = false;
    for (const link of links) {
      const r = link.getBoundingClientRect();
      const behind = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        .find((el) => !el.closest('.nav') && el.id !== 'scene' && !el.classList.contains('work-cursor'));
      link.classList.toggle('on-dark', !!behind && !!behind.closest('.work-media video, .work-panel.is-dark'));
    }
  };
  const queueContrast = () => { if (!queued) { queued = true; requestAnimationFrame(contrast); } };
  addEventListener('scroll', queueContrast, { passive: true });
  addEventListener('resize', queueContrast);
  contrast();
})();
