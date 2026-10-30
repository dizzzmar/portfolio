// POSTERS — el collage y el visor (estilos en css/posters.css).
// Cada pieza del collage es un enlace #nombre; al abrirlo, el visor (<dialog>) enseña todas las imágenes de ese mini-proyecto.
// Las piezas con varias versiones de color (is-cycle) van cambiando de una a otra solas, solo mientras se ven en pantalla.
// La dirección guarda dónde estás (#nombre o #nombre/2), así que se puede compartir y el botón «atrás» cierra el visor.
(() => {
  const root = document.documentElement;
  const dlg = document.querySelector('.pz-viewer');
  const items = [...document.querySelectorAll('.pz-item')];
  if (!dlg || !items.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Datos de cada mini-proyecto, leídos del HTML (los enlaces de .pz-set llevan la imagen grande) ----------
  const projects = {};
  items.forEach((li) => {
    const set = li.querySelector('.pz-set');
    projects[li.id] = {
      title: set.dataset.title,
      images: [...set.querySelectorAll('a')].map((a) => ({ src: a.getAttribute('href'), tile: a.dataset.tile, w: +a.dataset.w, h: +a.dataset.h, alt: a.textContent.trim(), cut: a.dataset.cut === '1' })),
      tile: li.querySelector('.pz-tile'),
    };
  });

  // ---------- Aparición de las piezas ----------
  root.classList.add('pz-ready');
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  items.forEach((li, i) => { li.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(li); });

  // ---------- Cambio de color de las piezas con varias versiones ----------
  if (!reduced) {
    const cyc = [...document.querySelectorAll('.pz-tile.is-cycle')];
    const timers = new Map();
    const step = (tile) => {
      const imgs = [...tile.querySelectorAll('.pz-frame img')];
      const cur = imgs.findIndex((im) => im.classList.contains('is-on'));
      imgs[cur].classList.remove('is-on');
      imgs[(cur + 1) % imgs.length].classList.add('is-on');
    };
    const cio = new IntersectionObserver((es) => es.forEach((e) => {
      const t = e.target;
      if (e.isIntersecting && !timers.has(t)) {
        // cada pieza arranca con su propio retraso, para que no cambien todas a la vez
        const start = setTimeout(() => timers.set(t, setInterval(() => { if (!dlg.open) step(t); }, 2200)), 600 + Math.random() * 1800);
        timers.set(t, start);
      } else if (!e.isIntersecting && timers.has(t)) { clearTimeout(timers.get(t)); clearInterval(timers.get(t)); timers.delete(t); }
    }), { threshold: 0.2 });
    cyc.forEach((t) => cio.observe(t));
  }

  // ---------- Visor ----------
  const $ = (s) => dlg.querySelector(s);
  const img = $('.pzv-img'), title = $('.pzv-title'), count = $('.pzv-count'), thumbs = $('.pzv-thumbs');
  let cur = null, idx = 0, opener = null, pushed = false;

  const hashFor = () => '#' + cur + (idx ? '/' + (idx + 1) : '');
  function show(i, replace = true) {
    const p = projects[cur]; if (!p) return;
    idx = (i + p.images.length) % p.images.length;
    const it = p.images[idx];
    // primero la miniatura (ya está en caché) y, cuando llega la grande, se cambia
    img.alt = it.alt; img.width = it.w; img.height = it.h;
    img.src = it.tile;
    const big = new Image(); big.src = it.src;
    const want = it.src;
    (big.decode ? big.decode() : Promise.resolve()).catch(() => {}).then(() => { if (p.images[idx].src === want) img.src = want; });
    count.textContent = (idx + 1) + ' / ' + p.images.length;
    [...thumbs.children].forEach((b, k) => b.setAttribute('aria-current', k === idx ? 'true' : 'false'));
    const cb = thumbs.children[idx]; if (cb && cb.scrollIntoView) cb.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    if (replace) history.replaceState(null, '', hashFor());
    // la siguiente, ya descargada
    if (p.images.length > 1) { const n = new Image(); n.src = p.images[(idx + 1) % p.images.length].src; }
  }
  function open(slug, i = 0) {
    const p = projects[slug]; if (!p) return;
    cur = slug;
    title.textContent = p.title;
    dlg.classList.toggle('is-single', p.images.length < 2);
    thumbs.replaceChildren(...p.images.map((it, k) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pzv-th'; b.setAttribute('aria-label', 'Image ' + (k + 1));
      const t = document.createElement('img'); t.src = it.tile; t.alt = ''; t.width = it.w; t.height = it.h; b.append(t);
      b.addEventListener('click', () => show(k)); return b;
    }));
    // al abrir desde el collage se empieza por la versión que se estaba viendo
    if (i === 0 && p.tile.classList.contains('is-cycle')) { const on = [...p.tile.querySelectorAll('.pz-frame img')].findIndex((im) => im.classList.contains('is-on')); if (on > 0) i = on; }
    if (!dlg.open) { dlg.showModal(); root.classList.add('pz-open'); dlg.focus({ preventScroll: true }); } // el foco en el visor, no en la flecha de atrás
    show(i, false);
    history.replaceState(null, '', hashFor());
  }
  function close(fromHash) {
    if (!dlg.open) return;
    dlg.close(); root.classList.remove('pz-open');
    if (!fromHash) history.replaceState(null, '', location.pathname + location.search);
    if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    cur = null;
  }

  // El enlace del collage (#nombre) abre el visor; también al cargar la página con la dirección ya puesta
  function route() {
    const m = location.hash.match(/^#([\w-]+)(?:\/(\d+))?$/);
    if (m && projects[m[1]]) { open(m[1], m[2] ? Math.max(0, +m[2] - 1) : 0); }
    else if (dlg.open) close(true);
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('.pz-tile'); if (!a) return;
    e.preventDefault(); opener = a;
    open(a.getAttribute('href').slice(1));
  });
  addEventListener('hashchange', route);
  if (location.hash) route();

  $('.pzv-close').addEventListener('click', () => close());
  $('.pzv-prev').addEventListener('click', () => show(idx - 1));
  $('.pzv-next').addEventListener('click', () => show(idx + 1));
  img.addEventListener('click', () => { if (projects[cur].images.length > 1) show(idx + 1); });
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });                       // Esc
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx - 1); }
  });
  // Con el dedo: deslizar a un lado cambia de imagen
  let x0 = null;
  dlg.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') x0 = e.clientX; });
  dlg.addEventListener('pointerup', (e) => {
    if (x0 === null) return; const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 50 && projects[cur] && projects[cur].images.length > 1) show(idx + (dx < 0 ? 1 : -1));
  });
})();
