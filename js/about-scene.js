// ABOUT · el dorso de la foto: una escena isométrica en «pixel art», como «Small plays – Basketball» de shawn. (x.com/zzzzshawn).
// Es una escena 3D de verdad (three.js) dibujada a muy baja resolución y ampliada sin suavizar, así cada píxel se ve como un cuadrado.
// Una isla de césped flota sobre el fondo blanco: el borde se deshace en píxeles sueltos, un camino de tierra la rodea y dentro hay franjas de campo segado. Encima, un equipo trabajando al aire libre:
// tres personas tecleando en sus mesas, dos hablando frente a una pizarra y otra que va de mesa en mesa con un café y se para a charlar.
// Se carga solo al dar la vuelta a la foto (js/about.js) y solo dibuja mientras se ve. Con «reducir movimiento», la escena queda quieta.
import * as THREE from 'three';

const PIXELS_WIDE = 196;           // ancho de la escena en «píxeles» gordos (menos = más gordos)
const BG = 0xffffff;               // fondo blanco, como la referencia
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();   // azar repetible: la escena es siempre la misma

// ---------- Texturas de ruido (cada píxel un color), como el asfalto y la hierba de la referencia ----------
function noiseTexture(colors, size = 32, stripes = 0) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let i = Math.floor(rnd() * colors.length);
    if (stripes && Math.floor(x / stripes) % 2) i = Math.min(colors.length - 1, i + 1);   // franjas de césped segado
    g.fillStyle = colors[i]; g.fillRect(x, y, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
// El suelo de la isla en una sola textura (1 texel ≈ 1 píxel de pantalla): césped por fuera con el borde «deshilachado» en píxeles sueltos,
// un camino de tierra alrededor y el campo segado por dentro. Los píxeles del borde son transparentes al azar (alphaTest), como el contorno de la referencia.
function islandMaterial(N = 144) {
  const c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d');
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const GRASS = ['#5f8f2c', '#6e9e35', '#4f7d25', '#7fae41', '#3f6a1f', '#6a9a32'];
  const FIELD = [['#6c9c33', '#76a63a', '#629130', '#80af44'], ['#5d8c2b', '#689832', '#557f28', '#71a039']];
  const DIRT = ['#8b6a47', '#7a5b3c', '#9a7752', '#6e5136'];
  const FRAY = N * 0.055, PATH = N * 0.1, PATHW = 2.2;            // ancho del borde roto, dónde va el camino y su grosor (en texels)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.min(x, y, N - 1 - x, N - 1 - y);
    if (d < FRAY && rnd() > (d / FRAY) ** 1.6) continue;          // píxel suelto o hueco: cada vez más huecos hacia fuera
    let col;
    if (Math.abs(d - PATH) < PATHW) col = pick(DIRT);
    else if (d < PATH) col = pick(GRASS);
    else col = pick(FIELD[Math.floor((x + y) / 9) % 2]);           // franjas en diagonal, como un césped recién cortado
    if (rnd() < 0.04) col = '#a8c86a';                              // brillos sueltos
    g.fillStyle = col; g.fillRect(x, y, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.5 });
}
const mat = (color, map) => new THREE.MeshLambertMaterial(map ? { map } : { color });
const box = (w, h, d, material) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.castShadow = true; m.receiveShadow = true; return m; };

// ---------- Personas: cajas pequeñas con piernas y brazos que giran desde la cadera y el hombro ----------
const SKINS = ['#f1c7a5', '#c98c5f', '#8d5a3b', '#5b3726', '#e8b892'];
const HAIRS = ['#2a1d16', '#4a2f1d', '#111111', '#c9a25e', '#7a3b1e'];
function person({ shirt, pants = '#2b3140', skin = SKINS[0], hair = HAIRS[0] }) {
  const p = new THREE.Group();
  const limb = (w, h, d, color) => { const g = new THREE.Group(); const m = box(w, h, d, mat(color)); m.position.y = -h / 2; g.add(m); return g; };
  p.legL = limb(0.13, 0.62, 0.15, pants); p.legL.position.set(-0.08, 0.66, 0);
  p.legR = limb(0.13, 0.62, 0.15, pants); p.legR.position.set(0.08, 0.66, 0);
  for (const leg of [p.legL, p.legR]) { const shoe = box(0.14, 0.07, 0.2, mat('#f2f2ee')); shoe.position.set(0, -0.62, 0.03); leg.add(shoe); }
  const torso = box(0.34, 0.5, 0.2, mat(shirt)); torso.position.y = 0.93;
  p.armL = limb(0.1, 0.48, 0.1, shirt); p.armL.position.set(-0.22, 1.16, 0);
  p.armR = limb(0.1, 0.48, 0.1, shirt); p.armR.position.set(0.22, 1.16, 0);
  for (const arm of [p.armL, p.armR]) { const hand = box(0.09, 0.09, 0.09, mat(skin)); hand.position.y = -0.5; arm.add(hand); }
  p.head = new THREE.Group(); p.head.position.y = 1.2;
  const face = box(0.22, 0.24, 0.22, mat(skin)); face.position.y = 0.12;
  const hairCap = box(0.24, 0.08, 0.24, mat(hair)); hairCap.position.y = 0.27;
  const hairBack = box(0.24, 0.14, 0.06, mat(hair)); hairBack.position.set(0, 0.18, -0.1);
  p.head.add(face, hairCap, hairBack);
  p.add(p.legL, p.legR, torso, p.armL, p.armR, p.head);
  return p;
}

// ---------- Muebles ----------
function desk(material) {
  const g = new THREE.Group();
  const top = box(1.3, 0.06, 0.66, material); top.position.y = 0.74; g.add(top);
  for (const [x, z] of [[-0.58, -0.27], [0.58, -0.27], [-0.58, 0.27], [0.58, 0.27]]) { const leg = box(0.05, 0.74, 0.05, mat('#3b3b3b')); leg.position.set(x, 0.37, z); g.add(leg); }
  const base = box(0.4, 0.025, 0.28, mat('#30343c')); base.position.set(0, 0.785, 0.08); g.add(base);           // portátil
  const screen = box(0.4, 0.26, 0.02, mat('#30343c')); screen.position.set(0, 0.92, -0.06); screen.rotation.x = -0.2; g.add(screen);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.2), new THREE.MeshBasicMaterial({ color: '#8fd0ff' })); glow.position.set(0, 0.92, -0.045); glow.rotation.x = -0.2; g.add(glow);
  const mug = box(0.07, 0.09, 0.07, mat('#e7e2d6')); mug.position.set(0.45, 0.82, 0.15); g.add(mug);
  return g;
}
function chair() {
  const g = new THREE.Group();
  const seat = box(0.42, 0.06, 0.42, mat('#2f3a52')); seat.position.y = 0.45; g.add(seat);
  const back = box(0.42, 0.42, 0.06, mat('#2f3a52')); back.position.set(0, 0.7, 0.2); g.add(back);
  const post = box(0.05, 0.42, 0.05, mat('#333333')); post.position.y = 0.21; g.add(post);
  return g;
}

export function startScene(canvas, { still = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(BG, 1);
  const scene = new THREE.Scene();

  // Cámara isométrica (vista 2:1 del pixel art: 30° de elevación, 45° de giro)
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  const R = 30, EL = Math.PI / 6, AZ = Math.PI / 4;
  camera.position.set(R * Math.cos(EL) * Math.sin(AZ), R * Math.sin(EL), R * Math.cos(EL) * Math.cos(AZ));
  camera.lookAt(0, 0.4, 0);

  // Luz: el sol arriba a la izquierda de la imagen, sombras largas hacia abajo a la derecha, como en la referencia
  scene.add(new THREE.HemisphereLight(0xeef3ff, 0x3d4a2c, 0.75));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.8);
  sun.position.set(-9, 6.5, 2.5); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
  sun.shadow.radius = 1.5; sun.shadow.bias = -0.0015;
  scene.add(sun);

  // ---------- La isla ----------
  const SIZE = 9.6;
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(SIZE * 1.12, SIZE * 1.12).rotateX(-Math.PI / 2), islandMaterial()));
  scene.children.at(-1).receiveShadow = true;

  // ---------- La oficina al aire libre ----------
  const wood = mat(null, noiseTexture(['#b98352', '#a87447', '#c38c59'], 8));
  const desks = [[-2.2, -1.4, 0], [-0.7, -1.4, 0], [-2.2, 0.3, Math.PI], [-0.7, 0.3, Math.PI]];
  const seats = [];
  desks.forEach(([x, z, r]) => {
    const d = desk(wood); d.position.set(x, 0, z); d.rotation.y = r; scene.add(d);
    const c = chair(); c.position.set(x, 0, z + (r ? -0.62 : 0.62)); c.rotation.y = r; scene.add(c);
    seats.push({ x, z: z + (r ? -0.55 : 0.55), r: r + Math.PI });
  });
  // Pizarra con notas de colores
  const board = new THREE.Group();
  const panel = box(1.6, 1.0, 0.05, mat('#f4f4ef')); panel.position.y = 1.25; board.add(panel);
  for (const x of [-0.72, 0.72]) { const leg = box(0.05, 1.75, 0.05, mat('#3b3b3b')); leg.position.set(x, 0.88, 0); board.add(leg); }
  ['#ffd23f', '#ff7fa3', '#8fd0ff', '#9fe07a', '#ffd23f', '#ff7fa3'].forEach((c, i) => { const n = box(0.18, 0.18, 0.02, mat(c)); n.position.set(-0.5 + (i % 3) * 0.32, 1.42 - Math.floor(i / 3) * 0.3, 0.035); board.add(n); });
  board.position.set(2.6, 0, -2.6); board.rotation.y = -Math.PI / 5; scene.add(board);
  // Banco, papelera, plantas y una mesa con café
  const bench = new THREE.Group();
  const seat = box(1.8, 0.08, 0.4, mat(null, noiseTexture(['#9b6a3f', '#8a5d36', '#a8764a'], 8))); seat.position.y = 0.42; bench.add(seat);
  for (const x of [-0.8, 0.8]) { const l = box(0.06, 0.42, 0.36, mat('#2b2b2b')); l.position.set(x, 0.21, 0); bench.add(l); }
  bench.position.set(-2.9, 0, -3.6); scene.add(bench);
  const bin = box(0.38, 0.52, 0.38, mat('#2d4f9e')); bin.position.set(-1.5, 0.26, -3.9); scene.add(bin);
  const coffee = new THREE.Group();
  const ct = box(0.7, 0.05, 0.7, mat('#e7e2d6')); ct.position.y = 0.95; coffee.add(ct);
  const cl = box(0.08, 0.95, 0.08, mat('#3b3b3b')); cl.position.y = 0.47; coffee.add(cl);
  const urn = box(0.2, 0.3, 0.2, mat('#c0392b')); urn.position.set(-0.12, 1.13, 0); coffee.add(urn);
  coffee.position.set(2.9, 0, 2.1); scene.add(coffee);
  for (const [x, z, s] of [[3.8, -3.8, 1], [-3.9, 3.5, 0.8], [3.7, 3.7, 0.7]]) {
    const pot = box(0.4 * s, 0.36 * s, 0.4 * s, mat('#b5643c')); pot.position.set(x, 0.18 * s, z); scene.add(pot);
    for (let k = 0; k < 4; k++) { const leaf = box(0.3 * s, 0.4 * s, 0.3 * s, mat(['#3f7a2a', '#4f9233', '#2f6420'][k % 3])); leaf.position.set(x + (rnd() - 0.5) * 0.25 * s, (0.55 + k * 0.18) * s, z + (rnd() - 0.5) * 0.25 * s); leaf.rotation.y = rnd() * 3; scene.add(leaf); }
  }

  // ---------- El equipo ----------
  const people = [];
  const SHIRTS = ['#c8322f', '#f2c230', '#2f8f4e', '#f3f1ea', '#2d4f9e', '#1d1d1d'];
  // Tres personas sentadas tecleando
  [0, 1, 3].forEach((s, i) => {
    const p = person({ shirt: SHIRTS[i], skin: SKINS[i + 1], hair: HAIRS[i] });
    const { x, z, r } = seats[s]; p.position.set(x, -0.2, z); p.rotation.y = r;
    p.legL.rotation.x = p.legR.rotation.x = -Math.PI / 2; p.armL.rotation.x = p.armR.rotation.x = -1.15;
    p.role = 'type'; p.phase = rnd() * 6; scene.add(p); people.push(p);
  });
  // Dos frente a la pizarra
  const bx = 2.6, bz = -2.6;
  const a = person({ shirt: SHIRTS[3], skin: SKINS[0], hair: HAIRS[3] }); a.position.set(bx - 0.4, 0, bz + 1.1); a.lookAt(bx, 0, bz);
  const b = person({ shirt: SHIRTS[4], skin: SKINS[3], hair: HAIRS[2] }); b.position.set(bx + 0.7, 0, bz + 1.0); b.lookAt(bx - 0.2, 0, bz + 0.6);
  a.role = 'point'; b.role = 'listen'; a.phase = 0; b.phase = 1.3; scene.add(a, b); people.push(a, b);
  // Una que pasea con un café, se para en las mesas y en la pizarra a hablar
  const w = person({ shirt: SHIRTS[5], skin: SKINS[2], hair: HAIRS[4] });
  const cup = box(0.07, 0.09, 0.07, mat('#e7e2d6')); cup.position.set(0, -0.52, 0.04); w.armR.add(cup);
  w.role = 'walk'; scene.add(w); people.push(w);
  const route = [[2.6, 1.5, 0], [0.4, -0.55, 3.5], [-1.5, 1.5, 3], [1.9, -1.2, 3.5], [2.6, 1.5, 2.5]];   // x, z, segundos parado
  let leg = 0, stop = 0; w.position.set(route[0][0], 0, route[0][1]);

  // ---------- Tamaño: la escena se dibuja a muy baja resolución y se amplía sin suavizar ----------
  let raf = 0, running = false, last = 0, t = 0;
  function size() {
    const W = canvas.clientWidth || 300, H = canvas.clientHeight || 375;
    const px = Math.max(1.25, W / PIXELS_WIDE);                    // el mismo dibujo en cualquier tamaño de tarjeta: ~196 píxeles de ancho
    renderer.setSize(Math.round(W / px), Math.round(H / px), false);
    const aspect = W / H, view = SIZE * 1.12 * Math.SQRT2 / (2 * Math.min(1, aspect)) * 1.06;   // la isla entera cabe con un margen alrededor
    Object.assign(camera, { left: -view * aspect, right: view * aspect, top: view, bottom: -view });
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(() => { size(); renderer.render(scene, camera); }); ro.observe(canvas);
  size();

  function animate(dt) {
    t += dt;
    for (const p of people) {
      const ph = t * 1 + p.phase;
      if (p.role === 'type') { p.armL.rotation.x = -1.15 + Math.sin(ph * 14) * 0.08; p.armR.rotation.x = -1.15 + Math.sin(ph * 14 + 1.6) * 0.08; p.head.rotation.y = Math.sin(ph * 0.5) * 0.25; p.head.rotation.x = 0.12 + Math.sin(ph * 0.9) * 0.05; }
      if (p.role === 'point') { p.armR.rotation.x = -2.2 + Math.sin(ph * 2) * 0.25; p.armL.rotation.z = Math.sin(ph * 1.5) * 0.15; p.head.rotation.y = Math.sin(ph * 0.6) * 0.5; }
      if (p.role === 'listen') { p.head.rotation.x = Math.max(0, Math.sin(ph * 3)) * 0.18; p.armL.rotation.x = -0.4 + Math.sin(ph * 0.8) * 0.1; p.armR.rotation.x = -0.4; }
    }
    // El paseante: anda hasta el siguiente punto, se para a hablar (gesticula) y sigue
    const [tx, tz, wait] = route[(leg + 1) % route.length];
    const dx = tx - w.position.x, dz = tz - w.position.z, dist = Math.hypot(dx, dz);
    if (stop > 0) {
      stop -= dt;
      w.legL.rotation.x = w.legR.rotation.x = 0;
      w.armL.rotation.x = -0.5 + Math.sin(t * 3) * 0.35; w.armR.rotation.x = -0.9;   // habla con las manos, el café en la otra
      w.head.rotation.x = Math.sin(t * 2.4) * 0.08;
      if (stop <= 0) leg = (leg + 1) % route.length;
    } else if (dist < 0.05) {
      stop = wait;
    } else {
      const sp = Math.min(dist, dt * 1.1);
      w.position.x += dx / dist * sp; w.position.z += dz / dist * sp;
      w.rotation.y = Math.atan2(dx, dz);
      const s = Math.sin(t * 9);
      w.legL.rotation.x = s * 0.6; w.legR.rotation.x = -s * 0.6; w.armL.rotation.x = -s * 0.45; w.armR.rotation.x = -0.9;
      w.position.y = Math.abs(Math.cos(t * 9)) * 0.03;
    }
  }
  function frame(now) {
    raf = 0;
    if (!running) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    animate(dt); renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  animate(0.016); renderer.render(scene, camera);
  return {
    play() { if (still || running) return; running = true; last = 0; raf = requestAnimationFrame(frame); },
    pause() { running = false; cancelAnimationFrame(raf); raf = 0; },
    destroy() { this.pause(); ro.disconnect(); renderer.dispose(); },
  };
}
