// CONTACT · el enlace "Contact" de la barra (en todas las páginas: la de la portada y las verdes, y la de las fichas) abre una ventana roja que es solo el
// formulario (nombre, email y mensaje), con el email (para copiarlo o abrir la app de correo) y LinkedIn al pie. El sobre de ketchup DIZ en 3D está abajo,
// pequeño: se gira arrastrándolo y se rasga por "TEAR HERE"; al rasgarlo sale volando la tira y, un momento después, aparece otro sobre nuevo.
// El formulario se envía a FORM_ENDPOINT (Formspree, ver la página de privacidad); sin él, «Send» abre la app de correo con el mensaje ya escrito.
// Sin JavaScript, Contact sigue siendo el enlace de email de siempre; sin 3D, la ventana es igual pero sin el sobre.
const FORM_ENDPOINT = 'https://formspree.io/f/mljjpgpa'; // la dirección pública del formulario en Formspree (no es una clave secreta); vacía, «Send» abre la app de correo
const LINKEDIN = 'https://es.linkedin.com/in/mario-diaz-aguado';
const link = document.querySelector('.nav-links a[href^="mailto:"], .case-nav a[href^="mailto:"]');
if (link) {
  const email = decodeURIComponent(link.href.replace(/^mailto:/, '').split('?')[0]);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let dialog = null, stage = null, form = null;

  const el = (tag, attrs = {}, kids = []) => {
    const n = Object.assign(document.createElement(tag), attrs);
    n.append(...kids);
    return n;
  };

  function build() {
    const copy = el('button', { type: 'button', className: 'sachet-copy', textContent: 'Copy email' });
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(email); copy.textContent = 'Copied ✓'; }
      catch { copy.textContent = 'Copy email'; }
      setTimeout(() => { copy.textContent = 'Copy email'; }, 1800);
    });
    const field = (name, label, input) => { input.name = name; input.id = 'sachet-' + name; input.required = true; return el('p', { className: 'sachet-field' }, [el('label', { htmlFor: input.id, textContent: label }), input]); };
    const send = el('button', { type: 'submit', className: 'sachet-send', textContent: 'Send' });
    const status = el('p', { className: 'sachet-status', role: 'status' });
    const trap = el('input', { type: 'text', name: '_gotcha', tabIndex: -1, autocomplete: 'off', className: 'sachet-trap' }); // campo trampa contra el spam: las personas no lo ven
    trap.setAttribute('aria-hidden', 'true');
    form = el('form', { className: 'sachet-form', noValidate: false }, [
      field('name', 'Name', el('input', { type: 'text', autocomplete: 'name', maxLength: 120 })),
      field('email', 'Email', el('input', { type: 'email', autocomplete: 'email', maxLength: 200 })),
      field('message', 'Message', el('textarea', { rows: 4, maxLength: 5000 })),
      trap, el('div', { className: 'sachet-actions' }, [send, status]),
    ]);
    form.addEventListener('submit', (e) => { e.preventDefault(); submit(form, send, status); });
    const close = el('button', { type: 'button', className: 'sachet-close', textContent: 'Close ×' });
    dialog = el('dialog', { className: 'sachet' }, [
      el('h2', { className: 'sachet-title', id: 'sachet-title', textContent: 'Contact' }),
      close,
      el('canvas', { className: 'sachet-canvas', ariaHidden: 'true' }), // decorativo: el formulario y los enlaces son todo lo que hace falta
      el('div', { className: 'sachet-panel' }, [form, el('p', { className: 'sachet-direct' }, [
        el('a', { className: 'sachet-mail', href: link.href, textContent: email }), copy,
        el('a', { className: 'sachet-in', href: LINKEDIN, target: '_blank', rel: 'noopener', textContent: 'LinkedIn' }),
      ])]),
    ]);
    dialog.setAttribute('aria-labelledby', 'sachet-title');
    dialog.dataset.state = 'open';
    dialog.tabIndex = -1;
    close.addEventListener('click', closeSachet);
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); closeSachet(); }); // Esc: mismo fundido de salida
    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('sachet-open');
      stage?.stop();
    });
    document.body.append(dialog);
  }

  // Cierre con un fundido corto (0,18 s); con «reducir movimiento» se cierra al instante
  function closeSachet() {
    if (!dialog?.open) return;
    if (reduced) { dialog.close(); return; }
    dialog.classList.add('is-closing');
    setTimeout(() => { dialog.classList.remove('is-closing'); dialog.close(); }, 180);
  }

  // Envío: a Formspree si hay FORM_ENDPOINT; si no, se abre la app de correo con el mensaje ya escrito
  async function submit(f, send, status) {
    if (!f.reportValidity()) return;
    const data = Object.fromEntries(new FormData(f));
    if (data._gotcha) return; // un robot ha rellenado el campo trampa
    if (!FORM_ENDPOINT) {
      const body = `${data.message}\n\n${data.name} · ${data.email}`;
      location.href = `mailto:${email}?subject=${encodeURIComponent('Hello from dizmar.xyz')}&body=${encodeURIComponent(body)}`;
      return;
    }
    send.disabled = true; status.textContent = 'Sending…'; dialog.dataset.send = 'sending';
    try {
      const res = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, _subject: `dizmar.xyz · ${data.name}` }) });
      if (!res.ok) throw new Error(String(res.status));
      f.reset(); status.textContent = 'Sent. I’ll write back soon.'; dialog.dataset.send = 'sent';
    } catch (err) {
      status.textContent = `It didn’t go through. Write to ${email} instead.`; dialog.dataset.send = 'error';
    } finally { send.disabled = false; }
  }

  async function open() {
    if (!dialog) build();
    delete dialog.dataset.send; dialog.querySelector('.sachet-status').textContent = '';
    dialog.dataset.state = 'open';
    dialog.showModal();
    document.documentElement.classList.add('sachet-open');
    // Con ratón, el cursor ya está en el primer campo; con el dedo no, para que el teclado no tape la ventana nada más abrirla
    if (matchMedia('(pointer: fine)').matches) form.querySelector('input').focus({ preventScroll: true }); else dialog.focus({ preventScroll: true });
    try {
      if (!stage) stage = await createStage(dialog, { reduced, onOpen: () => { dialog.dataset.state = 'open'; setTimeout(() => stage?.reset(), reduced ? 0 : 1100); } });
      stage.start();
    } catch (err) {
      console.warn('Contact sachet: 3D unavailable', err); // sin el sobre, el formulario sigue igual
    }
  }

  link.addEventListener('click', (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // con modificadores, el enlace de email de siempre
    e.preventDefault();
    open();
  });
  window.dizContact = { open }; // para abrirla desde otras piezas de la web
}

// ---------- El sobre en 3D ----------
async function createStage(dialog, { reduced, onOpen }) {
  const THREE = await import('three');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const { loadSachet, SACHET } = await import('/js/sachet.js?v=20261022a');

  const canvas = dialog.querySelector('.sachet-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // AgX dejaba el rojo del sobre rosado
  renderer.toneMappingExposure = 1;
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const key = new THREE.DirectionalLight(0xfff1e0, 1.6);
  key.position.set(-0.4, 0.6, 1);
  scene.add(key);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 10);

  const model = await loadSachet();
  const { width: W, height: H, tearY } = SACHET;
  // Dos copias del mismo sobre, cada una con su plano de corte: el cuerpo (por debajo de la línea) y la tira que se arranca (por encima)
  const cut = (root, keepAbove) => {
    const local = new THREE.Plane(new THREE.Vector3(0, keepAbove ? 1 : -1, 0), keepAbove ? -tearY : tearY);
    const world = new THREE.Plane();
    const mats = [];
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.material = [].concat(o.material).map((m) => { const c = m.clone(); c.clippingPlanes = [world]; c.clipShadows = true; mats.push(c); return c; });
      if (o.material.length === 1) o.material = o.material[0];
    });
    return { root, local, world, mats };
  };
  const holder = new THREE.Group();   // el sobre entero: se gira al arrastrar y se mece un poco
  scene.add(holder);
  const body = cut(model, false);
  holder.add(body.root);
  const stripPivot = new THREE.Group(); // la tira gira desde su extremo izquierdo (el lado que sigue pegado)
  stripPivot.position.set(-W / 2, tearY, 0);
  holder.add(stripPivot);
  const strip = cut(model.clone(true), true);
  strip.root.position.set(W / 2, -tearY, 0);
  stripPivot.add(strip.root);
  const bodyMeshes = [];
  body.root.traverse((o) => o.isMesh && bodyMeshes.push(o));
  const stripMeshes = [];
  strip.root.traverse((o) => o.isMesh && stripMeshes.push(o));

  // Estado: rest = reposo (ligeramente de tres cuartos), drag = giro del usuario, tear 0..1 = cuánto se ha levantado la tira
  const REST = { yaw: -0.32, pitch: 0.06 };
  const s = { yaw: REST.yaw, pitch: REST.pitch, dragYaw: 0, dragPitch: 0, lift: 0, liftGoal: 0, torn: false, t0: 0, running: false, raf: 0, last: 0 };

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // El sobre ocupa ~84 % del alto de su caja (que es pequeña, abajo) y, si la caja es estrecha, cabe a lo ancho
    const fitH = H / 0.84, fitW = (W * 1.3) / camera.aspect;
    const span = Math.max(fitH, fitW);
    camera.position.set(0, 0, span / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  // ---- Arrastrar: por la tira de arriba se rasga; por el resto se gira ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let drag = null;
  const hitAt = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(s.torn ? bodyMeshes : [...bodyMeshes, ...stripMeshes], false)[0];
    if (!hit) return null;
    return holder.worldToLocal(hit.point.clone());
  };
  const pxPerUnit = () => canvas.clientHeight / (2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  canvas.addEventListener('pointerdown', (e) => {
    if (s.torn) return;
    const p = hitAt(e);
    if (!p) return;
    const onStrip = p.y > tearY - 0.01;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, onStrip, moved: 0, yaw: s.dragYaw, pitch: s.dragPitch };
    canvas.setPointerCapture(e.pointerId);
    dialog.classList.add(onStrip ? 'is-tearing' : 'is-turning');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) {
      if (e.pointerType === 'mouse' && !s.torn) { const p = hitAt(e); canvas.style.cursor = p ? (p.y > tearY - 0.01 ? 'ew-resize' : 'grab') : ''; }
      return;
    }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    if (drag.onStrip) {
      // Rasgar: de derecha a izquierda (o al revés), lo que mide el sobre en pantalla rasga la tira entera
      s.liftGoal = Math.min(1, Math.abs(dx) / (W * pxPerUnit() * 0.9));
      if (s.liftGoal >= 1) { finishDrag(); tear(); }
    } else {
      s.dragYaw = drag.yaw + dx * 0.008;
      s.dragPitch = THREE.MathUtils.clamp(drag.pitch + dy * 0.005, -0.6, 0.6);
    }
  });
  function finishDrag() {
    if (!drag) return;
    try { canvas.releasePointerCapture(drag.id); } catch {}
    dialog.classList.remove('is-tearing', 'is-turning');
    const d = drag;
    drag = null;
    if (s.torn) return;
    if (d.onStrip && (d.moved < 8 || s.liftGoal > 0.55)) { tear(); return; } // un toque en la tira, o más de media tira: se rasga del todo
    s.liftGoal = 0; // si no, la tira vuelve a su sitio
    s.dragYaw = 0; s.dragPitch = 0; // y el sobre vuelve a su postura
  }
  canvas.addEventListener('pointerup', finishDrag);
  canvas.addEventListener('pointercancel', finishDrag);

  function tear() {
    if (s.torn) return;
    s.torn = true;
    s.t0 = performance.now();
    s.dragYaw = 0; s.dragPitch = 0;
    dialog.dataset.state = 'tearing';
    canvas.style.cursor = '';
    stripMeshes.forEach((m) => [].concat(m.material).forEach((mat) => { mat.transparent = true; }));
    if (reduced) { s.t0 -= 5000; }
    kick();
  }

  // ---- Bucle (solo mientras la ventana está abierta y algo se mueve) ----
  function frame(now) {
    s.raf = 0;
    const dt = Math.min(0.05, (now - (s.last || now)) / 1000);
    s.last = now;
    const k = 1 - Math.exp(-dt * 10);
    // postura: reposo + giro del usuario + un leve vaivén
    const sway = reduced || s.torn ? 0 : Math.sin(now / 1400) * 0.06;
    const yawGoal = s.torn ? 0 : REST.yaw + s.dragYaw + sway;
    const pitchGoal = s.torn ? 0 : REST.pitch + s.dragPitch;
    s.yaw += (yawGoal - s.yaw) * k;
    s.pitch += (pitchGoal - s.pitch) * k;
    holder.rotation.set(s.pitch, s.yaw, 0);
    if (!s.torn) {
      s.lift += (s.liftGoal - s.lift) * (1 - Math.exp(-dt * 16));
      stripPivot.rotation.set(-s.lift * 0.25, 0, s.lift * 0.32);
      stripPivot.position.set(-W / 2, tearY + s.lift * 0.002, 0);
    } else {
      // la tira sale volando hacia arriba a la derecha y se desvanece
      const u = Math.min(1, (now - s.t0) / 900), e = 1 - Math.pow(1 - u, 3);
      stripPivot.rotation.set(-0.25 - e * 0.9, e * 0.6, 0.32 + e * 0.9);
      stripPivot.position.set(-W / 2 + e * W * 0.9, tearY + 0.002 + e * H * 0.55, e * 0.02);
      strip.mats.forEach((m) => { m.opacity = 1 - smoothstep(0.35, 1, u); });
      if (u >= 1 && dialog.dataset.state === 'tearing') { stripPivot.visible = false; onOpen(); }
    }
    holder.position.y = -H * 0.06;
    holder.updateMatrixWorld(true);
    body.world.copy(body.local).applyMatrix4(holder.matrixWorld);
    strip.world.copy(strip.local).applyMatrix4(strip.root.matrixWorld);
    renderer.render(scene, camera);
    if (s.running) s.raf = requestAnimationFrame(frame);
  }
  const smoothstep = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const kick = () => { if (s.running && !s.raf) s.raf = requestAnimationFrame(frame); };

  // Un sobre nuevo sin rasgar (al abrir la ventana y un momento después de rasgar el anterior)
  function fresh() {
    Object.assign(s, { yaw: REST.yaw + 0.5, pitch: REST.pitch, dragYaw: 0, dragPitch: 0, lift: 0, liftGoal: 0, torn: false, last: 0 });
    if (reduced) s.yaw = REST.yaw;
    stripPivot.visible = true;
    strip.mats.forEach((m) => { m.opacity = 1; m.transparent = false; });
    kick();
  }

  return {
    tear,
    reset: fresh,
    start() {
      s.running = true;
      fresh();
      resize();
      addEventListener('resize', resize);
      kick();
    },
    stop() {
      s.running = false;
      if (s.raf) cancelAnimationFrame(s.raf);
      s.raf = 0;
      removeEventListener('resize', resize);
    },
  };
}
