// CONTACT · el enlace "Contact" de la barra abre un sobre de ketchup DIZ en 3D. Se rasga por "TEAR HERE" (arrastrando por la tira de arriba,
// pulsándola o con el botón) y del sobre sale una tarjeta con el email. Arrastrando por el resto del sobre se gira.
// Sin JavaScript, o si el 3D no carga, Contact sigue siendo el enlace de email de siempre / la tarjeta aparece directamente.
const link = document.querySelector('.nav-links a[href^="mailto:"]');
if (link) {
  const email = decodeURIComponent(link.href.replace(/^mailto:/, '').split('?')[0]);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let dialog = null, stage = null;

  const el = (tag, attrs = {}, kids = []) => {
    const n = Object.assign(document.createElement(tag), attrs);
    n.append(...kids);
    return n;
  };

  function build() {
    const copy = el('button', { type: 'button', className: 'sachet-copy', textContent: 'Copy email' });
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(email); copy.textContent = 'Copied ✓'; }
      catch { copy.textContent = email; }
      setTimeout(() => { copy.textContent = 'Copy email'; }, 1800);
    });
    const tear = el('button', { type: 'button', className: 'sachet-tear', textContent: 'Tear it open' });
    const close = el('button', { type: 'button', className: 'sachet-close', textContent: 'Close ×' });
    dialog = el('dialog', { className: 'sachet' }, [
      el('h2', { className: 'sachet-title', id: 'sachet-title', textContent: 'Contact' }),
      close,
      el('canvas', { className: 'sachet-canvas' }),
      el('div', { className: 'sachet-hint' }, [el('p', { textContent: 'Tear along the top to say hello' }), tear]),
      el('div', { className: 'sachet-mouth' }, [
        el('div', { className: 'sachet-card' }, [
          el('p', { className: 'sachet-kicker', textContent: 'Say hello' }),
          el('a', { className: 'sachet-mail', href: link.href, textContent: email }),
          el('div', { className: 'sachet-actions' }, [el('a', { href: link.href, textContent: 'Write to me ↗' }), copy]),
        ]),
      ]),
    ]);
    dialog.setAttribute('aria-labelledby', 'sachet-title');
    dialog.dataset.state = 'closed';
    close.addEventListener('click', () => dialog.close());
    tear.addEventListener('click', () => (stage ? stage.tear() : reveal()));
    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('sachet-open');
      stage?.stop();
    });
    document.body.append(dialog);
  }

  // Sin 3D: la tarjeta sale sola en el centro
  function reveal() { dialog.dataset.state = 'open'; dialog.querySelector('.sachet-mail').focus({ preventScroll: true }); }

  async function open() {
    if (!dialog) build();
    dialog.dataset.state = 'closed';
    dialog.style.removeProperty('--mouth-y');
    dialog.showModal();
    document.documentElement.classList.add('sachet-open');
    dialog.querySelector('.sachet-tear').focus({ preventScroll: true });
    try {
      if (!stage) stage = await createStage(dialog, { reduced, onOpen: reveal });
      stage.start();
    } catch (err) {
      console.warn('Contact sachet: 3D unavailable', err);
      reveal();
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
  const s = { yaw: REST.yaw, pitch: REST.pitch, dragYaw: 0, dragPitch: 0, lift: 0, liftGoal: 0, torn: false, t0: 0, drop: 0, running: false, raf: 0, last: 0 };

  function resize() {
    const w = dialog.clientWidth, h = dialog.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // El sobre ocupa ~68% del alto de la pantalla (menos en pantallas estrechas, para que quepa a lo ancho)
    const fitH = H / 0.68, fitW = (W * 1.5) / camera.aspect;
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
  const pxPerUnit = () => dialog.clientHeight / (2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
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
  const mouth = new THREE.Vector3();
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
      // la tira sale volando hacia arriba a la derecha y se desvanece; el sobre baja un poco y se pone de frente
      const u = Math.min(1, (now - s.t0) / 900), e = 1 - Math.pow(1 - u, 3);
      stripPivot.rotation.set(-0.25 - e * 0.9, e * 0.6, 0.32 + e * 0.9);
      stripPivot.position.set(-W / 2 + e * W * 0.9, tearY + 0.002 + e * H * 0.55, e * 0.02);
      strip.mats.forEach((m) => { m.opacity = 1 - smoothstep(0.35, 1, u); });
      s.drop = e * H * 0.14;
      if (u >= 1 && dialog.dataset.state === 'tearing') { stripPivot.visible = false; onOpen(); }
    }
    holder.position.y = -H * 0.06 - s.drop;
    holder.updateMatrixWorld(true);
    body.world.copy(body.local).applyMatrix4(holder.matrixWorld);
    strip.world.copy(strip.local).applyMatrix4(strip.root.matrixWorld);
    // dónde queda la boca del sobre en pantalla: de ahí sale la tarjeta
    mouth.set(0, tearY, 0).applyMatrix4(holder.matrixWorld).project(camera);
    dialog.style.setProperty('--mouth-y', (((1 - mouth.y) / 2) * dialog.clientHeight).toFixed(1) + 'px');
    dialog.style.setProperty('--mouth-w', (W * pxPerUnit() * 0.92).toFixed(1) + 'px'); // la tarjeta, del ancho del sobre
    renderer.render(scene, camera);
    if (s.running) s.raf = requestAnimationFrame(frame);
  }
  const smoothstep = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const kick = () => { if (s.running && !s.raf) s.raf = requestAnimationFrame(frame); };

  return {
    tear,
    start() {
      // Cada vez que se abre, un sobre nuevo sin rasgar
      Object.assign(s, { yaw: REST.yaw + 0.5, pitch: REST.pitch, dragYaw: 0, dragPitch: 0, lift: 0, liftGoal: 0, torn: false, drop: 0, running: true, last: 0 });
      if (reduced) s.yaw = REST.yaw;
      stripPivot.visible = true;
      strip.mats.forEach((m) => { m.opacity = 1; m.transparent = false; });
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
