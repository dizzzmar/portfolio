// MENÚ · el botón «Menu» de la barra (todas las páginas con barra) abre un panel a pantalla completa con los enlaces grandes de arriba y una fila pequeña abajo.
// Estilos y animación (entrada y salida iguales, una al revés de la otra): css/menu.css. Referencia: pesqueradiez.com.
// Los enlaces del panel salen de los de la barra de cada página, y los que tienen un comportamiento propio (Work en la portada, el sobre de Contact, la terminal)
// lo mantienen: el panel se cierra y se pulsa el enlace original.
(() => {
  const root = document.documentElement;
  const list = document.querySelector('.nav-links') || document.querySelector('.case-nav ul');
  const toggle = list && list.querySelector('.menu-toggle');
  if (!toggle) { root.classList.remove('has-menu'); return; } // sin botón en la página: se queda la barra de siempre
  window.__menuReady = true;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CLOSE_MS = reduced ? 150 : 750;

  const el = (tag, attrs = {}, kids = []) => { const n = Object.assign(document.createElement(tag), attrs); n.append(...kids); return n; };
  const originals = [...list.querySelectorAll('li:not(.menu-li) a')];
  const find = (label) => originals.find((a) => a.textContent.trim() === label);

  // Enlaces grandes (en este orden) y fila pequeña
  const big = ['Work', 'About', 'Room', 'Contact'].map(find).filter(Boolean);
  const small = [
    { label: 'Playground', href: '/playground/' },
    { label: 'Machine', href: '/machine/' },
    { label: 'FAQs', href: '/faq/' },
    { label: 'Terminal', action: 'terminal', href: '#terminal' },
    { label: 'Privacy', href: '/privacy/' },
  ];

  const current = location.pathname.replace(/index\.html$/, '');
  const items = big.map((orig, i) => {
    const a = el('a', { href: orig.getAttribute('href') }, [el('span', { textContent: orig.textContent.trim() })]);
    a.style.setProperty('--i', i);
    a._orig = orig;
    if (orig.getAttribute('aria-current') === 'page') a.setAttribute('aria-current', 'page');
    return el('li', { className: 'menu-item' }, [a]);
  });
  const smallLinks = small.map((s) => {
    const a = el('a', { href: s.href, textContent: s.label });
    if (s.action) a.dataset.action = s.action;
    if (s.href === current) a.setAttribute('aria-current', 'page');
    return el('li', {}, [a]);
  });

  const logoImg = el('img', { src: '/assets/images/tomato.webp', alt: '', width: 44, height: 47 });
  const logo = el('a', { className: 'menu-logo', href: '/' }, [logoImg]);
  logo.setAttribute('aria-label', 'Home');
  const close = el('button', { type: 'button', className: 'menu-close' }, [el('span', { textContent: 'Close' })]);
  const panel = el('div', { className: 'menu', id: 'menu' }, [
    logo, close,
    el('nav', { ariaLabel: 'Menu' }, [el('ul', { className: 'menu-items' }, items)]),
    el('ul', { className: 'menu-small' }, [
      el('li', {}, [el('ul', {}, smallLinks.slice(0, 2))]),
      el('li', {}, [el('ul', {}, smallLinks.slice(2))]),
    ]),
  ]);
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Menu');
  panel.dataset.open = 'false';
  panel.tabIndex = -1;
  panel.inert = true;
  document.body.append(panel);

  // El tomate y «Close» van exactamente donde están el tomate y «Menu» de la página, midiendo en el momento de abrir
  const place = () => {
    const b = toggle.getBoundingClientRect();
    panel.style.setProperty('--btn-right', Math.max(0, root.clientWidth - b.right) + 'px');
    panel.style.setProperty('--btn-top', b.top + 'px');
    panel.style.setProperty('--btn-h', b.height + 'px');
    const l = document.querySelector('.nav-logo, .case-logo');
    if (l) {
      const r = l.getBoundingClientRect();
      if (r.width > 4) {
        panel.style.setProperty('--logo-x', r.left + 'px');
        panel.style.setProperty('--logo-y', r.top + 'px');
        panel.style.setProperty('--logo-w', r.width + 'px');
        panel.style.setProperty('--logo-h', r.height + 'px');
      }
    }
  };

  let isOpen = false, closeTimer = 0;
  const focusables = () => [close, logo, ...panel.querySelectorAll('.menu-item a, .menu-small a')];
  function open() {
    if (isOpen) return;
    isOpen = true;
    clearTimeout(closeTimer);
    place();
    panel.inert = false;
    root.classList.add('menu-open');
    toggle.setAttribute('aria-expanded', 'true');
    // un fotograma después, para que la transición parta del estado cerrado
    requestAnimationFrame(() => requestAnimationFrame(() => { panel.dataset.open = 'true'; }));
    setTimeout(() => panel.focus({ preventScroll: true }), reduced ? 0 : 300); // el foco entra en el panel, no en un enlace: así no se dibuja un aro en el primero (en iPhone salía una raya bajo «Work»)
  }
  function shut(returnFocus = true) {
    if (!isOpen) return;
    isOpen = false;
    panel.dataset.open = 'false';
    toggle.setAttribute('aria-expanded', 'false');
    closeTimer = setTimeout(() => { panel.inert = true; root.classList.remove('menu-open'); }, CLOSE_MS);
    if (returnFocus) toggle.focus({ preventScroll: true });
  }

  toggle.addEventListener('click', (e) => { e.preventDefault(); isOpen ? shut() : open(); });
  toggle.addEventListener('keydown', (e) => { if (e.key === ' ') { e.preventDefault(); isOpen ? shut() : open(); } }); // un enlace con role=button también se activa con la barra espaciadora
  // Al volver con «atrás» la página puede salir de la memoria con el panel abierto: se cierra sin animación
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    isOpen = false;
    clearTimeout(closeTimer);
    delete panel.dataset.leaving;
    panel.style.transition = 'none';
    panel.dataset.open = 'false';
    panel.inert = true;
    root.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    requestAnimationFrame(() => { panel.style.transition = ''; });
  });
  close.addEventListener('click', () => shut());
  addEventListener('resize', () => { if (isOpen) place(); });
  document.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); shut(); return; }
    if (e.key === 'Tab') { // el foco no sale del panel
      const f = focusables(), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, true);

  // Pulsar un enlace del panel. Los de otra página navegan sin más (la transición entre páginas se encarga del resto); los que se quedan en la
  // misma página o tienen un comportamiento propio (Work en la portada, el sobre de Contact, la terminal) cierran el panel y pulsan el enlace original.
  panel.addEventListener('click', (e) => {
    const a = e.target instanceof Element && e.target.closest('a');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const after = (fn) => { e.preventDefault(); shut(false); setTimeout(fn, reduced ? 0 : 420); };
    if (a.dataset.action === 'terminal') { after(() => document.dispatchEvent(new Event('terminal:open'))); return; }
    const orig = a._orig;
    const url = new URL(orig ? orig.href : a.href, location.href);
    const samePage = url.protocol === 'mailto:' || (url.origin === location.origin && url.pathname.replace(/index\.html$/, '') === current);
    if (samePage && orig) { after(() => orig.click()); return; }
    if (samePage) { e.preventDefault(); shut(false); return; } // por ejemplo FAQs estando en FAQs: solo se cierra
    // Otra página: el panel NO se cierra. Los textos salen hacia arriba (el que has elegido, el último), el rojo se queda llenando la pantalla y la página
    // nueva nace tapada por ese mismo rojo; cuando ha cargado, la cortina sube y la descubre (como en la referencia). Con «reducir movimiento», sin esto.
    if (reduced || !a.href) return;
    e.preventDefault();
    if (panel.dataset.leaving) return;
    a.closest('.menu-item')?.style.setProperty('--leave', '1');
    panel.dataset.leaving = 'true';
    try { sessionStorage.setItem('dizmar-menu-arrive', String(Date.now())); } catch (err) { /* sin esto la página nueva simplemente aparece */ }
    setTimeout(() => { location.href = a.href; }, 560);
  });

  // Llegada desde el menú: la página nace tapada de rojo (script del <head> + css/menu.css) y, ya cargada, la cortina sube
  if (root.classList.contains('menu-arriving')) {
    try { sessionStorage.removeItem('dizmar-menu-arrive'); } catch (err) { /* nada */ }
    let lifted = false;
    const lift = () => {
      if (lifted) return;
      lifted = true;
      root.classList.add('menu-arriving-out');
      setTimeout(() => root.classList.remove('menu-arriving', 'menu-arriving-out'), 750);
    };
    if (document.readyState === 'complete') setTimeout(lift, 150);
    else { addEventListener('load', () => setTimeout(lift, 150), { once: true }); setTimeout(lift, 2200); }
  }
})();
