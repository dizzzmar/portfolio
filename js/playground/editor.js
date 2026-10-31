// PLAYGROUND · editor de nodos, sin dependencias. Un lienzo que se desplaza y se acerca, nodos que se arrastran por su título y cables que se tiran
// de un puerto de salida a uno de entrada (con ratón, con el dedo, o pulsando un puerto y luego el otro, también con teclado).
// El editor no sabe nada de plantas: cada tipo de nodo (nodes.js) trae su interfaz y su función evaluate(entradas) → salidas, y los nodos sumidero
// (la hoja) dibujan cuando reciben algo nuevo. Los estilos están en css/sandbox.css.
const SVG = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, kids = []) => { const n = Object.assign(document.createElement(tag), attrs); n.append(...kids); return n; };
const svg = (tag, attrs = {}) => { const n = document.createElementNS(SVG, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
const K_MIN = 0.3, K_MAX = 1.6;
const CONTROLS = 'input, select, textarea, button, a, label, .pg-pick, .pg-medium, .pg-ink, [contenteditable]';
const TAP = (e) => (e.pointerType === 'mouse' ? 5 : 12); // movimiento por debajo del cual un toque en un puerto es un toque y no un arrastre (el dedo tiembla más que el ratón)

export function createEditor(root, { types, wheel = 'page', onReset, fullHref } = {}) {
  const nodes = [], edges = [];
  let seq = 0, tx = 0, ty = 0, k = 1, z = 1, touched = false;

  // ---------- Estructura ----------
  const viewport = el('div', { className: 'pgn-viewport' });
  const world = el('div', { className: 'pgn-world' });
  const wires = svg('svg', { class: 'pgn-wires', 'aria-hidden': 'true' }), handles = svg('svg', { class: 'pgn-wires', 'aria-hidden': 'true' }); // los botones de quitar cable van en una capa propia, sobre todos los cables
  world.append(wires, handles);
  viewport.append(world);

  const menu = el('div', { className: 'pgn-menu', hidden: true });
  const groups = {};
  Object.entries(types).forEach(([id, t]) => {
    (groups[t.group] = groups[t.group] || []).push([id, t]);
  });
  Object.entries(groups).forEach(([name, list]) => {
    const g = el('div', { className: 'pgn-menu-group' }, [el('p', { textContent: name })]);
    list.forEach(([id, t]) => {
      const b = el('button', { type: 'button', textContent: t.title });
      b.addEventListener('click', () => { menu.hidden = true; addAtCenter(id); });
      g.append(b);
    });
    menu.append(g);
  });
  const btn = (text, label, fn, html) => { const b = el('button', { type: 'button', className: 'pg-btn' }); if (html) b.innerHTML = html; else b.textContent = text; if (label) b.setAttribute('aria-label', label); b.addEventListener('click', fn); return b; };
  const addBtn = btn('Add node', '', () => { menu.hidden = !menu.hidden; addBtn.setAttribute('aria-expanded', String(!menu.hidden)); });
  addBtn.setAttribute('aria-haspopup', 'true'); addBtn.setAttribute('aria-expanded', 'false');
  const bar = el('div', { className: 'pgn-bar' }, [addBtn, btn('Fit', 'Fit the whole graph in view', () => fit()), btn('Reset', 'Reset to the starting graph', () => onReset && onReset()), ...(fullHref ? [el('a', { className: 'pg-btn', href: fullHref, textContent: 'Full screen' })] : []), menu]);
  const zoom = el('div', { className: 'pgn-zoom' }, [btn('', 'Zoom out', () => zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, 1 / 1.25), '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false"><path d="M2 7h10" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'), btn('', 'Zoom in', () => zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, 1.25), '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false"><path d="M2 7h10M7 2v10" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>')]);
  zoom.querySelectorAll('button').forEach((b) => b.classList.add('is-icon'));
  root.append(viewport, bar, zoom);
  document.addEventListener('pointerdown', (e) => { if (!menu.hidden && !menu.contains(e.target) && e.target !== addBtn) { menu.hidden = true; addBtn.setAttribute('aria-expanded', 'false'); } });
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pending) { pending = null; unmark(); return; } // Esc suelta el puerto elegido
    if (e.key === 'Escape' && !menu.hidden) { menu.hidden = true; addBtn.setAttribute('aria-expanded', 'false'); addBtn.focus(); } });

  // ---------- Vista: desplazar y acercar ----------
  const applyView = () => {
    world.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
    viewport.style.setProperty('--gx', tx + 'px'); viewport.style.setProperty('--gy', ty + 'px'); viewport.style.setProperty('--gs', 24 * k + 'px'); // la cuadrícula acompaña al lienzo
  };
  function zoomAt(cx, cy, f) {
    const nk = Math.min(K_MAX, Math.max(K_MIN, k * f)), r = nk / k;
    tx = cx - (cx - tx) * r; ty = cy - (cy - ty) * r; k = nk; touched = true; applyView();
  }
  const toWorld = (clientX, clientY) => { const r = viewport.getBoundingClientRect(); return { x: (clientX - r.left - tx) / k, y: (clientY - r.top - ty) / k }; };
  function fit() {
    if (!nodes.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    nodes.forEach((n) => { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + n.el.offsetWidth); y1 = Math.max(y1, n.y + n.el.offsetHeight); });
    const pad = 48, w = viewport.clientWidth, h = viewport.clientHeight;
    k = Math.min(1, Math.max(K_MIN, Math.min((w - pad * 2) / (x1 - x0), (h - pad * 2) / (y1 - y0))));
    tx = (w - (x1 - x0) * k) / 2 - x0 * k; ty = (h - (y1 - y0) * k) / 2 - y0 * k;
    touched = false; applyView();
  }
  function focusAt(wx, wy, scale = 0.8) {
    const w = viewport.clientWidth, h = viewport.clientHeight;
    k = scale; tx = w / 2 - wx * k; ty = h / 2 - wy * k; touched = true; applyView();
  }
  function focusOn(node, scale = 0.8) {
    const w = viewport.clientWidth, h = viewport.clientHeight;
    k = scale; tx = w / 2 - (node.x + node.el.offsetWidth / 2) * k; ty = h / 2 - (node.y + node.el.offsetHeight / 2) * k; touched = true; applyView();
  }

  // Rueda: acercar con Ctrl/Cmd (o pellizco del trackpad). Con wheel: 'pan' la rueda también desplaza el lienzo; con 'page' deja pasar el scroll de la página.
  viewport.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); const r = viewport.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.01)); return; }
    if (wheel === 'pan' && !e.target.closest('select')) { e.preventDefault(); tx -= e.deltaX; ty -= e.deltaY; touched = true; applyView(); }
  }, { passive: false });

  // ---------- Punteros: desplazar, pellizcar, arrastrar nodos y tirar cables ----------
  const pointers = new Map();
  let pan = null, pinch = null, drag = null, link = null, pending = null, suppressClick = false;
  viewport.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) { // pellizco: cancela cualquier arrastre
      pan = null; drag = null; cancelLink();
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      return;
    }
    const t = e.target;
    const startPan = () => { pan = { x: e.clientX, y: e.clientY, tx, ty }; viewport.setPointerCapture(e.pointerId); viewport.classList.add('is-panning'); };
    if (e.pointerType === 'mouse' && e.button === 1) { e.preventDefault(); startPan(); return; } // botón central: desplaza en cualquier sitio
    if (t.closest('.pgn-port')) { startLink(e, t.closest('.pgn-port')); return; }
    if (t.closest('.pgn-x, .pgn-wire-x')) return;
    const head = t.closest('.pgn-head');
    if (head) { startDrag(e, nodes.find((n) => n.el === head.parentElement)); return; }
    const nodeEl = t.closest('.pgn-node');
    if (nodeEl) {
      front(nodes.find((m) => m.el === nodeEl));
      // Los controles son de quien los toca; el resto de la hoja (textos, la lista de rasgos, el papel) desplaza el lienzo, igual que el fondo:
      // en el móvil las hojas ocupan casi toda la pantalla y, si no, no habría dónde poner el dedo para moverse
      if (t.closest(CONTROLS)) return;
    }
    if (e.button === 0 || e.pointerType !== 'mouse') startPan();
  });
  viewport.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, r = viewport.getBoundingClientRect();
      tx += cx - pinch.cx; ty += cy - pinch.cy;
      zoomAt(cx - r.left, cy - r.top, d / pinch.d);
      pinch = { d, cx, cy }; return;
    }
    if (pan) { tx = pan.tx + e.clientX - pan.x; ty = pan.ty + e.clientY - pan.y; touched = true; applyView(); }
    if (drag) {
      const dx = (e.clientX - drag.x) / k, dy = (e.clientY - drag.y) / k;
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 3) drag.moved = true;
      drag.node.x = drag.nx + dx; drag.node.y = drag.ny + dy; place(drag.node); drawWires();
    }
    if (link) { link.moved = link.moved || Math.hypot(e.clientX - link.sx, e.clientY - link.sy) > TAP(e); if (link.moved) drawTemp(e.clientX, e.clientY); }
  });
  const end = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pan) { pan = null; viewport.classList.remove('is-panning'); }
    if (drag) { drag = null; }
    if (link) { if (e.type === 'pointercancel') cancelLink(); else finishLink(e); } // si el sistema cancela el gesto, el cable no se suelta donde haya quedado el dedo
  };
  viewport.addEventListener('pointerup', end);
  viewport.addEventListener('pointercancel', end);

  function startDrag(e, node) {
    if (e.target.closest('button')) return;
    front(node);
    drag = { node, x: e.clientX, y: e.clientY, nx: node.x, ny: node.y };
    viewport.setPointerCapture(e.pointerId);
  }
  function front(node) { node.el.style.zIndex = ++z; }
  const place = (n) => { n.el.style.left = n.x + 'px'; n.el.style.top = n.y + 'px'; };

  // ---------- Cables ----------
  const portOf = (elem) => { for (const n of nodes) for (const dir of ['in', 'out']) for (const id in n.ports[dir]) if (n.ports[dir][id].el === elem) return { node: n, dir, id, type: n.ports[dir][id].type, el: elem }; return null; };
  function center(elem) { const r = elem.getBoundingClientRect(), v = viewport.getBoundingClientRect(); return { x: (r.left + r.width / 2 - v.left - tx) / k, y: (r.top + r.height / 2 - v.top - ty) / k }; }
  const curve = (a, b) => { const dx = Math.max(48, Math.abs(b.x - a.x) / 2); return `M${a.x} ${a.y} C${a.x + dx} ${a.y} ${b.x - dx} ${b.y} ${b.x} ${b.y}`; };

  let drawing = 0;
  function drawWires() {
    if (drawing) return;
    drawing = requestAnimationFrame(() => {
      drawing = 0;
      edges.forEach((ed) => {
        const a = center(ed.from.node.ports.out[ed.from.port].el), b = center(ed.to.node.ports.in[ed.to.port].el);
        ed.path.setAttribute('d', curve(a, b)); ed.hit.setAttribute('d', curve(a, b));
        // El botón de quitar el cable va a 36 px de su puerto de entrada, en el hueco entre nodos (el centro del cable suele quedar bajo un nodo)
        const dx = Math.max(48, Math.abs(b.x - a.x) / 2), P = (t, c1, c2, v0, v3) => (1 - t) ** 3 * v0 + 3 * (1 - t) ** 2 * t * c1 + 3 * (1 - t) * t * t * c2 + t ** 3 * v3;
        let lo = 0.5, hi = 1;
        for (let n = 0; n < 18; n++) { const m = (lo + hi) / 2; if (P(m, a.x + dx, b.x - dx, a.x, b.x) < b.x - 36) lo = m; else hi = m; }
        const t = (lo + hi) / 2, hx = P(t, a.x + dx, b.x - dx, a.x, b.x), hy = P(t, a.y, b.y, a.y, b.y);
        ed.x.setAttribute('transform', `translate(${hx} ${hy})`);
      });
    });
  }
  let temp = null;
  function drawTemp(cx, cy) {
    if (!link) return;
    if (!temp) { temp = svg('path', { class: 'pgn-wire is-temp' }); wires.append(temp); }
    const from = center(link.port.el), to = toWorld(cx, cy);
    temp.setAttribute('d', link.port.dir === 'out' ? curve(from, to) : curve(to, from));
  }
  function mark(port) {
    root.classList.add('is-linking');
    nodes.forEach((n) => ['in', 'out'].forEach((dir) => { for (const id in n.ports[dir]) {
      const p = n.ports[dir][id], ok = dir !== port.dir && p.type === port.type && n !== port.node && !(port.dir === 'out' ? reaches(n, port.node) : reaches(port.node, n));
      p.el.classList.toggle('is-target', ok);
    } }));
  }
  function unmark() { root.classList.remove('is-linking'); nodes.forEach((n) => ['in', 'out'].forEach((d) => { for (const id in n.ports[d]) n.ports[d][id].el.classList.remove('is-target', 'is-pending'); })); }
  function reaches(from, to) { // ¿sale algún cable de «from» que llegue a «to»? (evita ciclos)
    const seen = new Set(), go = (n) => { if (n === to) return true; if (seen.has(n)) return false; seen.add(n); return edges.some((e) => e.from.node === n && go(e.to.node)); };
    return go(from);
  }
  function startLink(e, elem) {
    const port = portOf(elem); if (!port) return;
    // Tirar de una entrada que ya tiene cable lo desconecta y sigue desde su origen
    let source = port;
    if (port.dir === 'in') {
      const ed = edges.find((x) => x.to.node === port.node && x.to.port === port.id);
      if (ed) { const from = ed.from.node.ports.out[ed.from.port]; source = { node: ed.from.node, dir: 'out', id: ed.from.port, type: from.type, el: from.el }; link = { port: source, pressed: elem, sx: e.clientX, sy: e.clientY, moved: false, detach: ed }; }
    }
    if (!link) link = { port: source, pressed: elem, sx: e.clientX, sy: e.clientY, moved: false };
    viewport.setPointerCapture(e.pointerId);
    mark(link.port);
  }
  function cancelLink() { link = null; if (temp) { temp.remove(); temp = null; } if (!pending) unmark(); }
  function finishLink(e) {
    const l = link; link = null; if (temp) { temp.remove(); temp = null; }
    if (!l.moved) { unmark(); portClick(l.pressed); return; } // fue un toque (con la captura del puntero el clic ya no llega al puerto)
    suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
    const target = document.elementFromPoint(e.clientX, e.clientY), tp = target && target.closest ? target.closest('.pgn-port') : null;
    unmark();
    const port = tp && portOf(tp);
    if (l.detach) disconnectEdge(l.detach);
    if (port) connectPorts(l.port, port);
    changed(false);
  }
  function connectPorts(a, b) {
    const [o, i] = a.dir === 'out' ? [a, b] : [b, a];
    if (o.dir !== 'out' || i.dir !== 'in' || o.type !== i.type || o.node === i.node || reaches(i.node, o.node)) return false;
    connect(o.node.id, o.id, i.node.id, i.id); return true;
  }

  function connect(fromId, fromPort, toId, toPort) {
    const from = nodes.find((n) => n.id === fromId), to = nodes.find((n) => n.id === toId);
    if (!from || !to) return null;
    const old = edges.find((ed) => ed.to.node === to && ed.to.port === toPort); if (old) disconnectEdge(old);
    const path = svg('path', { class: 'pgn-wire' }), hit = svg('path', { class: 'pgn-hit' });
    const x = svg('g', { class: 'pgn-wire-x' });
    x.append(svg('circle', { r: 10 }), svg('path', { d: 'M-3.5 -3.5 L3.5 3.5 M3.5 -3.5 L-3.5 3.5' }));
    const g = svg('g', { class: 'pgn-edge' }); g.append(hit, path);
    g.addEventListener('pointerenter', () => x.classList.add('is-hover')); g.addEventListener('pointerleave', () => x.classList.remove('is-hover'));
    const ed = { from: { node: from, port: fromPort }, to: { node: to, port: toPort }, path, hit, x, g };
    x.addEventListener('click', () => { disconnectEdge(ed); changed(false); });
    wires.append(g); handles.append(x); edges.push(ed);
    from.ports.out[fromPort].el.classList.add('is-linked'); to.ports.in[toPort].el.classList.add('is-linked');
    drawWires(); changed(false); return ed;
  }
  function disconnectEdge(ed) {
    const i = edges.indexOf(ed); if (i < 0) return;
    edges.splice(i, 1); ed.g.remove(); ed.x.remove();
    const still = (n, dir, id) => edges.some((e) => (dir === 'out' ? e.from : e.to).node === n && (dir === 'out' ? e.from : e.to).port === id);
    if (!still(ed.from.node, 'out', ed.from.port)) ed.from.node.ports.out[ed.from.port].el.classList.remove('is-linked');
    if (!still(ed.to.node, 'in', ed.to.port)) ed.to.node.ports.in[ed.to.port].el.classList.remove('is-linked');
  }

  // Tocar o pulsar un puerto y luego otro compatible los conecta (táctil y teclado); Supr/Retroceso en un puerto quita sus cables
  function portClick(elem) {
    if (suppressClick) return;
    const port = portOf(elem); if (!port) return;
    if (!pending) { pending = port; elem.classList.add('is-pending'); mark(port); return; }
    const p = pending; pending = null; unmark();
    if (p.el !== elem) { if (connectPorts(p, port)) changed(false); }
  }
  root.addEventListener('pointerdown', (e) => { if (pending && !e.target.closest('.pgn-port')) { pending = null; unmark(); } }, true);

  // ---------- Nodos ----------
  function addNode(type, { x = 0, y = 0, params, id } = {}) {
    const t = types[type]; if (!t) return null;
    const node = { id: id || 'n' + (++seq), type, x, y, params: { ...(t.params ? t.params() : {}), ...(params || {}) }, ports: { in: {}, out: {} } };
    const head = el('div', { className: 'pgn-head' }, [el('span', { className: 'pgn-title', textContent: t.title })]);
    const close = el('button', { type: 'button', className: 'pgn-x', innerHTML: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M2 2l8 8M10 2l-8 8" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>' });
    close.setAttribute('aria-label', 'Remove ' + t.title);
    close.addEventListener('click', () => removeNode(node));
    head.append(close);
    const io = el('div', { className: 'pgn-io' });
    const makePort = (dir, p) => {
      const b = el('button', { type: 'button', className: 'pgn-port' });
      b.setAttribute('aria-label', `${dir === 'in' ? 'Input' : 'Output'} ${p.label || p.id} of ${t.title}`);
      b.addEventListener('click', (e) => { if (e.detail === 0) portClick(b); }); // teclado; el ratón y el dedo se resuelven al soltar el puntero
      b.addEventListener('keydown', (e) => { if (e.key === 'Delete' || e.key === 'Backspace') { edges.filter((ed) => (dir === 'in' ? ed.to : ed.from).node === node && (dir === 'in' ? ed.to : ed.from).port === p.id).forEach(disconnectEdge); changed(false); } });
      node.ports[dir][p.id] = { el: b, type: p.type };
      return el('div', { className: 'pgn-row is-' + dir }, [b, el('span', { textContent: p.label || p.id })]);
    };
    (t.inputs || []).forEach((p) => io.append(makePort('in', p)));
    (t.outputs || []).forEach((p) => io.append(makePort('out', p)));
    const body = el('div', { className: 'pgn-body' });
    node.el = el('div', { className: 'pgn-node' }, [head, ...(io.children.length ? [io] : []), body]);
    node.el.dataset.type = type;
    node.el.classList.add('is-new'); node.el.addEventListener('animationend', () => node.el.classList.remove('is-new'), { once: true });
    if (t.wide) node.el.classList.add('is-wide');
    node.el.style.zIndex = ++z;
    world.append(node.el);
    node.impl = t.create(node, body, api) || {};
    place(node); nodes.push(node);
    if ('ResizeObserver' in window) { node.ro = new ResizeObserver(drawWires); node.ro.observe(node.el); }
    drawWires(); changed(false);
    return node;
  }
  function removeNode(node) {
    edges.filter((e) => e.from.node === node || e.to.node === node).forEach(disconnectEdge);
    node.impl.destroy && node.impl.destroy();
    node.ro && node.ro.disconnect();
    node.el.remove(); nodes.splice(nodes.indexOf(node), 1); changed(false);
  }
  function addAtCenter(type) {
    const p = toWorld(viewport.getBoundingClientRect().left + viewport.clientWidth / 2, viewport.getBoundingClientRect().top + viewport.clientHeight / 2);
    const n = addNode(type, { x: p.x - 120 + (nodes.length % 5) * 18, y: p.y - 80 + (nodes.length % 5) * 18 });
    if (n) { front(n); const first = n.el.querySelector('input,button.pg-medium,select'); first && first.focus({ preventScroll: true }); }
  }
  function clear() { [...nodes].forEach(removeNode); touched = false; }

  // ---------- Evaluación: se calcula cada nodo una vez, tirando de sus entradas; los sumideros dibujan ----------
  let queued = 0, preview = false;
  function changed(isPreview = false) {
    preview = queued ? preview && isPreview : isPreview;
    if (queued) return;
    queued = requestAnimationFrame(() => { queued = 0; evaluate(preview); });
  }
  function evaluate(isPreview) {
    const memo = new Map();
    const run = (node) => {
      if (memo.has(node)) return memo.get(node);
      memo.set(node, {}); // protege de ciclos
      const inputs = {};
      for (const id in node.ports.in) {
        const ed = edges.find((e) => e.to.node === node && e.to.port === id);
        if (ed) inputs[id] = run(ed.from.node)[ed.from.port];
      }
      const out = (node.impl.evaluate && node.impl.evaluate(inputs)) || {};
      memo.set(node, out);
      node.impl.update && node.impl.update(inputs, out, isPreview);
      return out;
    };
    nodes.forEach(run);
  }
  const api = { changed, preview: () => preview };

  const ro = 'ResizeObserver' in window ? new ResizeObserver(() => { if (!touched) fit(); }) : null;
  ro && ro.observe(viewport);
  applyView();
  return { addNode, connect, clear, fit, focusOn, focusAt, move(node, x, y) { node.x = x; node.y = y; place(node); drawWires(); }, changed, nodes, edges, viewport, get touched() { return touched; }, get scale() { return k; } };
}
