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
  const HIDE = '.work-item, .player, .nav-links a, .case-nav a, .site-foot a, .case-back, .case-film-link, .pv-back a, .pv-row p a, .contact-row a, .ct-link, .np-more, .now-playing, .ct-slider'; // sitios con otro aviso del enlace: la fila, el vídeo, la raya del subrayado
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

  let lastX = -1;
  let pos = null; // última posición del ratón
  function update(e) {
    pos = { x: e.clientX, y: e.clientY };
    move(e.clientX, e.clientY);
    if (Math.abs(e.clientX - lastX) > 1 && lastX >= 0) root.classList.toggle('mouse-left', e.clientX < lastX); // hacia dónde va el ratón: de ahí sale la raya del enlace
    lastX = e.clientX;
    if (!shown) { shown = true; set('is-on', true); }
    const t = e.target instanceof Element ? e.target : null;
    set('is-hide', !!(t && t.closest(HIDE)));
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

  // Al desplazar con rueda o trackpad, el punto se vuelve una gota: más largo hacia donde se desplaza, con la parte delantera redonda y llena
  // y la trasera más fina (nunca una punta), con una pequeña ondulación; al parar vuelve a ser un círculo
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const blob = dot.firstChild, shape = blob.firstChild; // "i" se estira y gira; "b" cambia de forma (y de color, con su propia animación)
    let energy = 0, shown = 0, angle = 0, target = 0, raf = 0, lastWheel = 0, lastY = scrollY, last = 0;
    const kick = (dx, dy) => {
      const m = Math.hypot(dx, dy);
      if (!m) return;
      energy = Math.min(1, energy + m / 350);
      if (m > 3) target = Math.atan2(dy, dx);
      if (!raf) { last = performance.now(); angle = target; raf = requestAnimationFrame(tick); }
    };
    const tick = (now) => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      energy *= Math.exp(-dt * 7);
      shown += (energy - shown) * .3;
      if (shown < .01 && energy < .01) {
        blob.style.scale = ''; blob.style.rotate = ''; shape.style.borderRadius = '';
        shown = energy = 0; raf = 0; return;
      }
      const turn = Math.atan2(Math.sin(target - angle), Math.cos(target - angle)); // el giro más corto: al invertir el sentido la gota no da un salto
      angle += turn * .25;
      const wob = Math.sin(now / 90) * 5 * shown;                                  // ondulación suave, solo mientras se mueve
      blob.style.rotate = angle + 'rad';
      blob.style.scale = `${1 + .5 * shown} ${1 / (1 + .22 * shown)}`;
      const back = 50 + 10 * shown + wob, front = 50 - 14 * shown - wob;          // radios horizontales: delante más abierto y lleno, atrás más cerrado
      shape.style.borderRadius = `${back}% ${front}% ${front}% ${back}% / ${50 + wob}% ${50 - wob}% ${50 + wob}% ${50 - wob}%`;
      raf = requestAnimationFrame(tick);
    };
    addEventListener('wheel', e => { lastWheel = performance.now(); kick(e.deltaX, e.deltaY); }, { passive: true });
    addEventListener('scroll', () => { // desplazamientos sin rueda (teclado, barra, enlaces): la rueda ya cuenta los suyos
      const dy = scrollY - lastY; lastY = scrollY;
      if (performance.now() - lastWheel > 150) kick(0, Math.max(-60, Math.min(60, dy)));
    }, { passive: true });
  }

  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') update(e); }, { passive: true });
  // Si la página se mueve bajo un ratón quieto (desplazar con la rueda, tecla o barra), lo que hay debajo cambia sin que el ratón se mueva:
  // se vuelve a mirar en cada desplazamiento para que el punto reaccione igual que la etiqueta "View project"
  let pending = 0;
  addEventListener('scroll', () => {
    if (!pos || pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      update({ clientX: pos.x, clientY: pos.y, target: document.elementFromPoint(pos.x, pos.y) });
    });
  }, { passive: true });
  addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') set('is-down', true); }, { passive: true });
  addEventListener('pointerup', () => set('is-down', false), { passive: true });
  root.addEventListener('pointerleave', () => { shown = false; set('is-on', false); set('is-down', false); });

  // Al cambiar de página el punto aparece donde estaba, sin esperar a que se mueva el ratón
  try {
    const p = (sessionStorage.getItem('dizmar-dot') || '').split(',').map(Number);
    if (p.length === 2 && p.every(Number.isFinite)) { pos = { x: p[0], y: p[1] }; move(p[0], p[1]); shown = true; set('is-on', true); }
  } catch (_) {}
})();
