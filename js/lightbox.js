// PÁGINAS DE PROYECTO · al pulsar una imagen (o uno de los vídeos pequeños de la cabecera) se abre en grande.
// Es un <dialog> propio: Esc o un toque fuera lo cierra, las flechas (o deslizar el dedo) pasan a la anterior y a la siguiente.
// Las imágenes se abren con su versión más grande (la mayor del srcset); los vídeos, con los controles del navegador (reproducir, volumen, pantalla completa).
(() => {
  const sources = [...document.querySelectorAll('.st-item > img, .st-video > video')];
  if (!sources.length || !HTMLDialogElement.prototype.showModal) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const big = (img) => {   // la candidata más ancha del srcset (si no hay, la propia imagen)
    const list = (img.getAttribute('srcset') || '').split(',').map((s) => s.trim().split(/\s+/)).filter((p) => p[0]);
    list.sort((a, b) => parseInt(b[1] || 0, 10) - parseInt(a[1] || 0, 10));
    return list.length ? list[0][0] : img.currentSrc || img.src;
  };

  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.setAttribute('aria-label', 'Enlarged media');
  dialog.innerHTML = `
    <div class="lb-stage"></div>
    <button class="lb-btn lb-close" type="button" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button>
    <button class="lb-btn lb-prev" type="button" aria-label="Previous"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4l-8 8 8 8"/></svg></button>
    <button class="lb-btn lb-next" type="button" aria-label="Next"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4l8 8-8 8"/></svg></button>`;
  document.body.append(dialog);
  const stage = dialog.querySelector('.lb-stage');
  const prev = dialog.querySelector('.lb-prev');
  const next = dialog.querySelector('.lb-next');
  let index = 0, opener = null;

  const show = (i) => {
    index = (i + sources.length) % sources.length;
    const el = sources[index];
    stage.replaceChildren();
    let node;
    if (el.tagName === 'VIDEO') {
      node = document.createElement('video');
      node.src = el.currentSrc || el.src;
      if (el.poster) node.poster = el.poster;
      Object.assign(node, { controls: true, autoplay: true, loop: true, playsInline: true });
      node.setAttribute('aria-label', el.getAttribute('aria-label') || 'Video');
    } else {
      node = document.createElement('img');
      node.src = big(el);
      node.alt = el.alt || '';
      node.decoding = 'async';
    }
    node.className = 'lb-media';
    stage.append(node);
    // Precarga de la siguiente imagen, para que el cambio sea inmediato
    const n = sources[(index + 1) % sources.length];
    if (n.tagName === 'IMG') new Image().src = big(n);
    prev.hidden = next.hidden = sources.length < 2;
  };

  const open = (i, from) => {
    opener = from;
    show(i);
    dialog.showModal();
    document.documentElement.classList.add('lb-open');
  };
  const close = () => dialog.close();
  dialog.addEventListener('close', () => {
    stage.replaceChildren();   // para el vídeo, si lo había
    document.documentElement.classList.remove('lb-open');
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  });

  // Un toque en el fondo o en la imagen cierra; en el vídeo no (sus controles son suyos)
  dialog.addEventListener('click', (e) => {
    if (e.target.closest('.lb-prev')) show(index - 1);
    else if (e.target.closest('.lb-next')) show(index + 1);
    else if (e.target.closest('.lb-close') || e.target === dialog || e.target === stage || e.target.tagName === 'IMG') close();
  });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
  });
  // Deslizar el dedo a un lado pasa a la anterior o a la siguiente
  let startX = null, startY = 0;
  stage.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX, dy = e.changedTouches[0].clientY - startY;
    startX = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { show(dx < 0 ? index + 1 : index - 1); dialog.dataset.swiped = '1'; setTimeout(() => delete dialog.dataset.swiped, 400); }
  });
  stage.addEventListener('click', (e) => { if (dialog.dataset.swiped) e.stopPropagation(); }, true);

  sources.forEach((el, i) => {
    el.classList.add('lb-source');
    el.addEventListener('click', () => open(i, el));
    // Con el teclado: las imágenes no se enfocan solas
    if (el.tagName === 'IMG') {
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      if (!el.alt) el.setAttribute('aria-label', 'Enlarge image');
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i, el); } });
    }
  });
})();
