/* CURSOR — un punto que sustituye al cursor del sistema (estilos en css/cursor.css). Solo con ratón.
   Igual que el de donut-studio.com: un punto de 16 px pegado al ratón, sin retraso, que invierte los colores de lo que tiene debajo
   (mix-blend-mode: difference) y encoge al pulsar. Sobre un proyecto (fila de Work, tarjetas de More works) se abre en una píldora «View».
   Para que vaya fino: la posición se escribe una sola vez por fotograma y lo que hay debajo solo se mira cuando cambia el elemento. */
(() => {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const root = document.documentElement;
  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  dot.setAttribute('aria-hidden', 'true');
  dot.innerHTML = '<i></i><span class="cursor-label"></span>';
  document.body.appendChild(dot);
  const label = dot.querySelector('.cursor-label');

  // Proyectos: el punto se abre en una píldora con este texto
  const VIEW = [['[data-cursor="view"]', null], ['.work-item > a', 'View project']];
  // Donde el cursor ya es otra cosa (vídeo con PLAY/PAUSE, deslizador del sobre): el punto se aparta
  const HIDE = '.player, .ct-slider';

  const set = (cls, on) => dot.classList.toggle(cls, on);
  let x = -100, y = -100, raf = 0, lastTarget = null, lastX = -1;
  const paint = () => { raf = 0; dot.style.transform = `translate3d(${x}px, ${y}px, 0)`; };

  function look(t) {
    if (t === lastTarget) return;
    lastTarget = t;
    let view = null, text = '';
    for (const [sel, fixed] of VIEW) { const el = t && t.closest(sel); if (el) { view = el; text = fixed || el.dataset.cursorLabel || 'View'; break; } }
    if (view) label.textContent = text;
    set('is-view', !!view);
    set('is-hide', !view && !!(t && t.closest(HIDE)));
  }

  function onMove(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    if (!raf) raf = requestAnimationFrame(paint);
    if (Math.abs(x - lastX) > 1 && lastX >= 0) root.classList.toggle('mouse-left', x < lastX); // de qué lado sale la raya de los enlaces (css/cursor.css)
    lastX = x;
    set('is-on', true);
    look(e.target instanceof Element ? e.target : null);
  }

  addEventListener('pointermove', onMove, { passive: true });
  // Si la página se desplaza bajo un ratón quieto, lo que hay debajo cambia: se vuelve a mirar (una vez por fotograma)
  let pending = 0;
  addEventListener('scroll', () => {
    if (pending || lastX < 0) return;
    pending = requestAnimationFrame(() => { pending = 0; lastTarget = undefined; look(document.elementFromPoint(x, y)); });
  }, { passive: true });
  addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') set('is-down', true); }, { passive: true });
  addEventListener('pointerup', () => set('is-down', false), { passive: true });
  root.addEventListener('pointerleave', () => { set('is-on', false); set('is-down', false); });

  // La sala 3D marca dot-hot sobre un objeto (js/room.js): el punto crece un poco
  new MutationObserver(() => set('is-hot', root.classList.contains('dot-hot'))).observe(root, { attributes: true, attributeFilter: ['class'] });
  // Las ventanas (dialog) viven en la capa superior del navegador: mientras hay una abierta el punto se mete dentro
  const home = () => { const d = document.querySelector('dialog[open]'); (d || document.body).appendChild(dot); };
  new MutationObserver(home).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });

  // Al cambiar de página el punto aparece donde estaba, sin esperar a que se mueva el ratón (se guarda al salir, no en cada movimiento)
  addEventListener('pagehide', () => { try { sessionStorage.setItem('dizmar-dot', x + ',' + y); } catch (_) {} });
  try {
    const p = (sessionStorage.getItem('dizmar-dot') || '').split(',').map(Number);
    if (p.length === 2 && p.every(Number.isFinite) && p[0] >= 0) { x = p[0]; y = p[1]; paint(); set('is-on', true); }
  } catch (_) {}
})();
