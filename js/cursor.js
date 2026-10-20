/* CURSOR — el punto rojo que sustituye al cursor del sistema (estilos en css/cursor.css). Solo con ratón.
   Sigue al ratón sin retraso (se escribe en cada movimiento); el resto son clases que cambian lo que ve el visitante:
   is-hot (enlace o botón: crece), is-hide (otro cursor ocupa su sitio), to-white / to-red (sobre lo rojo: encoge, cambia de color y vuelve a crecer). */
(() => {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const root = document.documentElement;
  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  dot.setAttribute('aria-hidden', 'true');
  dot.innerHTML = '<i><b></b></i>';
  document.body.appendChild(dot);

  const HOT = 'a, button, summary, label, select, [role="button"], [data-cursor="hot"]';
  const HIDE = '.work-item, .player, dialog.st-form';
  const RED = '.nav-logo, [data-cursor="red"]';
  let white = false, shown = false, swapTimer = 0;

  const set = (cls, on) => dot.classList.toggle(cls, on);
  const move = (x, y) => { dot.style.transform = `translate3d(${x}px, ${y}px, 0)`; };

  // El tomate de la portada es 3D (un lienzo a pantalla completa): se detecta por la zona que ocupa
  const placeholder = document.querySelector('.tomato-placeholder');
  function overHomeTomato(x, y) {
    if (!placeholder || document.body.classList.contains('work-engaged')) return false;
    const r = placeholder.getBoundingClientRect();
    const dx = (x - (r.left + r.width / 2)) / (r.width * .42), dy = (y - (r.top + r.height / 2)) / (r.height * .42);
    return dx * dx + dy * dy < 1;
  }

  // Cualquier fondo rojo: se mira el primer color de fondo con cuerpo que haya bajo el ratón (el del propio elemento o el de sus padres)
  let lastEl = null, lastRed = false;
  function onRedBackground(t) {
    if (t === lastEl) return lastRed;
    lastEl = t; lastRed = false;
    for (let el = t; el && el !== document.documentElement; el = el.parentElement) {
      const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
      if (m && (m.length < 4 || +m[3] > .6)) { const [r, g, b] = m.map(Number); lastRed = r > 170 && g < 110 && b < 110 && r - Math.max(g, b) > 90; break; }
    }
    return lastRed;
  }

  function update(e) {
    move(e.clientX, e.clientY);
    if (!shown) { shown = true; set('is-on', true); }
    const t = e.target instanceof Element ? e.target : null;
    const formOpen = !!document.querySelector('dialog.st-form[open]');
    set('is-hide', formOpen || !!(t && t.closest(HIDE)));
    set('is-hot', root.classList.contains('dot-hot') || !!(t && t.closest(HOT)));
    const nowWhite = !!(t && (t.closest(RED) || onRedBackground(t))) || overHomeTomato(e.clientX, e.clientY);
    // El cambio de color espera 90 ms a confirmarse: al cruzar el borde blanco de un sello el punto no se reinicia a cada paso
    if (nowWhite !== white) {
      clearTimeout(swapTimer);
      swapTimer = setTimeout(() => { white = nowWhite; set('to-white', white); set('to-red', !white); }, 90);
    } else clearTimeout(swapTimer);
    try { sessionStorage.setItem('dizmar-dot', e.clientX + ',' + e.clientY); } catch (_) {}
  }

  // Las ventanas (dialog) viven en la capa superior del navegador, por encima de todo: mientras hay una abierta el punto se mete dentro
  const home = () => { const d = document.querySelector('dialog[open]'); (d || document.body).appendChild(dot); };
  new MutationObserver(home).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });

  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') update(e); }, { passive: true });
  addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') set('is-down', true); }, { passive: true });
  addEventListener('pointerup', () => set('is-down', false), { passive: true });
  root.addEventListener('pointerleave', () => { shown = false; set('is-on', false); set('is-down', false); });

  // Al cambiar de página el punto aparece donde estaba, sin esperar a que se mueva el ratón
  try {
    const p = (sessionStorage.getItem('dizmar-dot') || '').split(',').map(Number);
    if (p.length === 2 && p.every(Number.isFinite)) { move(p[0], p[1]); shown = true; set('is-on', true); }
  } catch (_) {}
})();
