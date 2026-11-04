// ABOUT · el dorso de la foto: una escena isométrica en «pixel art», como «Small plays – Basketball» de shawn. (x.com/zzzzshawn).
// Es una escena 3D de verdad (three.js) dibujada a muy baja resolución y ampliada sin suavizar, así cada píxel se ve como un cuadrado.
// Una isla de césped con lomitas flota sobre el fondo blanco: el borde se deshace en píxeles sueltos, un camino de tierra la rodea y dentro hay franjas de campo segado.
// Encima trabaja un equipo al aire libre, y cada persona decide sola qué hacer a continuación (sentarse a teclear, explicar algo en la pizarra, ir a por café,
// descansar en el banco o en lo alto de una loma, estirarse, llamar por teléfono o acercarse a charlar con alguien) y busca el camino entre los muebles.
// Nunca se repite igual.
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

// ---------- Personas: cajas con articulaciones (cadera, rodilla, hombro, codo, cintura, cuello) ----------
// La ropa y el pelo cambian de una a otra (manga corta o larga, pantalón o bermuda, pelo corto, largo o moño) para que se distingan como en la referencia.
const SKINS = ['#f1c7a5', '#c98c5f', '#8d5a3b', '#5b3726', '#e8b892', '#a86f48', '#f3d0b0'];
const HAIRS = ['#2a1d16', '#4a2f1d', '#111111', '#c9a25e', '#7a3b1e', '#e8e0d0', '#1d1d1d'];
const S = 1.2;                                   // tamaño de las personas respecto a los muebles
const HIP = 0.62 * S;                            // altura de la cadera, de pie
const joint = (x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); return g; };
function person({ shirt, pants, skin, hair, style = 'short', shorts = false, sleeves = 'short', shoes = '#f2f2ee' }) {
  const p = new THREE.Group(), body = new THREE.Group();
  p.add(body); body.scale.setScalar(S);
  const M = { shirt: mat(shirt), pants: mat(pants), skin: mat(skin), hair: mat(hair), shoe: mat(shoes), eye: mat('#1a1410') };
  // Piernas: muslo y espinilla, con la rodilla en medio
  const leg = (x) => {
    const thigh = joint(x, 0.62, 0);
    const t = box(0.14, 0.32, 0.16, M.pants); t.position.y = -0.16; thigh.add(t);
    const shin = joint(0, -0.31, 0); thigh.add(shin);
    const sh = box(0.12, 0.28, 0.14, shorts ? M.skin : M.pants); sh.position.y = -0.14; shin.add(sh);
    const shoe = box(0.14, 0.07, 0.22, M.shoe); shoe.position.set(0, -0.29, 0.03); shin.add(shoe);
    thigh.shin = shin; body.add(thigh); return thigh;
  };
  p.legL = leg(-0.085); p.legR = leg(0.085);
  const hips = box(0.34, 0.14, 0.2, M.pants); hips.position.y = 0.66; body.add(hips);
  // Tronco: gira desde la cintura para inclinarse
  p.spine = joint(0, 0.7, 0); body.add(p.spine);
  const torso = box(0.38, 0.44, 0.22, M.shirt); torso.position.y = 0.24; p.spine.add(torso);
  const neck = box(0.1, 0.06, 0.1, M.skin); neck.position.y = 0.48; p.spine.add(neck);
  // Brazos: hombro y codo
  const arm = (x) => {
    const sh = joint(x, 0.43, 0);
    const up = box(0.11, 0.24, 0.12, M.shirt); up.position.y = -0.12; sh.add(up);
    const el = joint(0, -0.23, 0); sh.add(el);
    const fo = box(0.1, 0.22, 0.11, sleeves === 'long' ? M.shirt : M.skin); fo.position.y = -0.11; el.add(fo);
    const hand = box(0.09, 0.08, 0.1, M.skin); hand.position.y = -0.25; el.add(hand);
    sh.elbow = el; sh.hand = hand; p.spine.add(sh); return sh;
  };
  p.armL = arm(-0.245); p.armR = arm(0.245);
  // Cabeza: cara con ojos y el peinado
  p.head = joint(0, 0.5, 0); p.spine.add(p.head);
  const face = box(0.27, 0.27, 0.25, M.skin); face.position.y = 0.14; p.head.add(face);
  for (const x of [-0.06, 0.06]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.02), M.eye); e.position.set(x, 0.15, 0.13); p.head.add(e); }
  const cap = box(0.29, 0.08, 0.27, M.hair); cap.position.y = 0.29; p.head.add(cap);
  const back = box(0.29, style === 'long' ? 0.36 : 0.18, 0.07, M.hair); back.position.set(0, style === 'long' ? 0.1 : 0.2, -0.11); p.head.add(back);
  if (style === 'long') for (const x of [-0.135, 0.135]) { const side = box(0.04, 0.3, 0.2, M.hair); side.position.set(x, 0.14, -0.02); p.head.add(side); }
  if (style === 'bun') { const bun = box(0.13, 0.11, 0.13, M.hair); bun.position.set(0, 0.36, -0.06); p.head.add(bun); }
  if (style === 'cap') { const peak = box(0.27, 0.03, 0.14, M.shirt); peak.position.set(0, 0.27, 0.18); p.head.add(peak); cap.material = M.shirt; }
  // Lo que pueden llevar en la mano derecha (se enseña cuando hace falta)
  p.cup = box(0.08, 0.1, 0.08, mat('#e7e2d6')); p.cup.position.set(0, -0.3, 0.05); p.armR.elbow.add(p.cup);
  p.phone = box(0.03, 0.14, 0.08, mat('#15171c')); p.phone.position.set(-0.04, -0.28, 0.04); p.armR.elbow.add(p.phone);
  p.cup.visible = p.phone.visible = false;
  // Pose actual (se acerca poco a poco a la pose que toca: así los cambios de postura son suaves)
  p.pose = { tl: 0, tr: 0, kl: 0, kr: 0, al: 0, ar: 0, alz: 0, arz: 0, el: 0, er: 0, sp: 0, spy: 0, hx: 0, hy: 0, lift: 0 };
  return p;
}
function applyPose(p, pose, k) {
  const c = p.pose;
  for (const key in c) c[key] += ((pose[key] || 0) - c[key]) * k;
  p.legL.rotation.x = c.tl; p.legR.rotation.x = c.tr; p.legL.shin.rotation.x = c.kl; p.legR.shin.rotation.x = c.kr;
  p.armL.rotation.x = c.al; p.armR.rotation.x = c.ar; p.armL.rotation.z = -c.alz; p.armR.rotation.z = c.arz;
  p.armL.elbow.rotation.x = c.el; p.armR.elbow.rotation.x = c.er;
  p.spine.rotation.x = c.sp; p.spine.rotation.y = c.spy; p.head.rotation.x = c.hx; p.head.rotation.y = c.hy;
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

  // ---------- La isla, con lomas ----------
  const SIZE = 9.6, EDGE = 4.15;                 // lado de la isla y hasta dónde se puede andar
  const HILLS = [[0.9, 3.0, 0.95, 1.1], [-3.0, 2.3, 1.1, 1.2], [3.4, -0.3, 0.7, 0.85], [-0.2, -3.4, 0.55, 0.8], [1.9, 0.9, 0.3, 0.55]];   // x, z, alto, radio
  const heightAt = (x, z) => {
    let h = 0;
    for (const [hx, hz, a, r] of HILLS) h += a * Math.exp(-((x - hx) ** 2 + (z - hz) ** 2) / (r * r));
    const edge = Math.min(1, Math.max(0, (SIZE * 0.54 - Math.max(Math.abs(x), Math.abs(z))) / 0.9));   // las lomas se allanan hacia el borde
    return h * edge * edge * (3 - 2 * edge);
  };
  const groundGeo = new THREE.PlaneGeometry(SIZE * 1.12, SIZE * 1.12, 80, 80).rotateX(-Math.PI / 2);
  const gp = groundGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) gp.setY(i, heightAt(gp.getX(i), gp.getZ(i)));
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, islandMaterial()); ground.receiveShadow = true; scene.add(ground);

  // ---------- Mapa para andar: una rejilla con los muebles marcados como obstáculos ----------
  const G = 0.2, N = Math.round((EDGE * 2) / G) + 1;
  const blocked = new Uint8Array(N * N);
  const cell = (v) => Math.max(0, Math.min(N - 1, Math.round((v + EDGE) / G)));
  const at = (i) => -EDGE + i * G;
  const isBlocked = (x, z) => Math.abs(x) > EDGE || Math.abs(z) > EDGE || blocked[cell(z) * N + cell(x)];
  const block = (test) => { for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (test(at(i), at(j))) blocked[j * N + i] = 1; };
  const rect = (cx, cz, hw, hd, pad = 0.22) => block((x, z) => Math.abs(x - cx) < hw + pad && Math.abs(z - cz) < hd + pad);
  const round = (cx, cz, r) => block((x, z) => Math.hypot(x - cx, z - cz) < r);
  const segment = (ax, az, bx, bz, r) => block((x, z) => {
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - ax - dx * t, z - az - dz * t) < r;
  });

  // ---------- La oficina al aire libre ----------
  const place = (o, x, z) => { o.position.set(x, heightAt(x, z), z); scene.add(o); return o; };
  const wood = mat(null, noiseTexture(['#b98352', '#a87447', '#c38c59'], 8));
  const slots = [];                              // sitios donde se puede hacer algo: { kind, x, z, face, seat?, from?, by }
  // Cuatro mesas en bloque, con las pantallas espalda con espalda; cada una con su silla por fuera
  [[-2.3, -0.95, Math.PI], [-0.95, -0.95, Math.PI], [-2.3, -0.29, 0], [-0.95, -0.29, 0]].forEach(([x, z, r]) => {
    const d = place(desk(wood), x, z); d.rotation.y = r;
    const out = r ? -1 : 1, cz = z + out * 0.62;
    const c = place(chair(), x, cz); c.rotation.y = r; round(x, cz, 0.3);
    slots.push({ kind: 'desk', x, z: cz, face: r ? 0 : Math.PI, seat: 0.48, from: [x, cz + out * 0.55] });
  });
  rect(-1.625, -0.62, 1.35, 0.66, 0.12);
  // Pizarra con notas de colores
  const BX = 2.5, BZ = -2.5, BR = Math.PI / 6;                  // de cara a la cámara
  const board = new THREE.Group();
  const panel = box(1.6, 1.0, 0.05, mat('#f4f4ef')); panel.position.y = 1.25; board.add(panel);
  for (const x of [-0.72, 0.72]) { const leg = box(0.05, 1.75, 0.05, mat('#3b3b3b')); leg.position.set(x, 0.88, 0); board.add(leg); }
  ['#ffd23f', '#ff7fa3', '#8fd0ff', '#9fe07a', '#ffd23f', '#ff7fa3'].forEach((c, i) => { const n = box(0.18, 0.18, 0.02, mat(c)); n.position.set(-0.5 + (i % 3) * 0.32, 1.42 - Math.floor(i / 3) * 0.3, 0.035); board.add(n); });
  place(board, BX, BZ).rotation.y = BR;
  const nx = Math.sin(BR), nz = Math.cos(BR), tx = Math.cos(BR), tz = -Math.sin(BR);
  segment(BX - tx * 0.8, BZ - tz * 0.8, BX + tx * 0.8, BZ + tz * 0.8, 0.25);
  for (const side of [-0.45, 0.45]) slots.push({ kind: 'board', x: BX + nx * 0.95 + tx * side, z: BZ + nz * 0.95 + tz * side, face: Math.atan2(-nx, -nz) });
  // Banco, papelera, plantas y la mesa del café
  const bench = new THREE.Group();
  const seat = box(1.8, 0.08, 0.4, mat(null, noiseTexture(['#9b6a3f', '#8a5d36', '#a8764a'], 8))); seat.position.y = 0.42; bench.add(seat);
  for (const x of [-0.8, 0.8]) { const l = box(0.06, 0.42, 0.36, mat('#2b2b2b')); l.position.set(x, 0.21, 0); bench.add(l); }
  place(bench, -2.6, -3.2); rect(-2.6, -3.2, 0.9, 0.2, 0.15);
  for (const x of [-3.1, -2.1]) slots.push({ kind: 'bench', x, z: -3.2, face: 0, seat: 0.46, from: [x, -2.6] });
  place(box(0.38, 0.52, 0.38, mat('#2d4f9e')), -1.2, -3.5).position.y += 0.26; round(-1.2, -3.5, 0.45);
  const coffee = new THREE.Group();
  const ct = box(0.7, 0.05, 0.7, mat('#e7e2d6')); ct.position.y = 0.95; coffee.add(ct);
  const cl = box(0.08, 0.95, 0.08, mat('#3b3b3b')); cl.position.y = 0.47; coffee.add(cl);
  const urn = box(0.2, 0.3, 0.2, mat('#c0392b')); urn.position.set(-0.12, 1.13, 0); coffee.add(urn);
  place(coffee, 3.0, 2.0); round(3.0, 2.0, 0.6);
  slots.push({ kind: 'coffee', x: 2.3, z: 2.0, face: Math.PI / 2 }, { kind: 'coffee', x: 3.0, z: 1.3, face: 0 });
  for (const [x, z, s] of [[3.7, -3.7, 1], [-3.8, 3.6, 0.8], [3.6, 3.6, 0.7], [-3.8, -1.6, 0.75]]) {
    const y = heightAt(x, z);
    const pot = box(0.4 * s, 0.36 * s, 0.4 * s, mat('#b5643c')); pot.position.set(x, y + 0.18 * s, z); scene.add(pot);
    for (let k = 0; k < 4; k++) { const leaf = box(0.3 * s, 0.4 * s, 0.3 * s, mat(['#3f7a2a', '#4f9233', '#2f6420'][k % 3])); leaf.position.set(x + (rnd() - 0.5) * 0.25 * s, y + (0.55 + k * 0.18) * s, z + (rnd() - 0.5) * 0.25 * s); leaf.rotation.y = rnd() * 3; scene.add(leaf); }
    round(x, z, 0.5);
  }
  // En lo alto de las lomas: sentarse en la hierba o estirarse; y sitios sueltos para hablar por teléfono
  for (const [x, z] of HILLS.slice(0, 4)) slots.push({ kind: 'hill', x, z, face: Math.PI / 4 + (rnd() - 0.5) });
  for (const [x, z] of [[0.6, 1.4], [-3.4, 0.9], [1.4, -2.2], [3.6, 1.0], [-1.8, 2.0], [0.4, -1.9]]) slots.push({ kind: 'phone', x, z, face: rnd() * 6.28 });

  // ---------- Buscar camino (A* en la rejilla, con atajos en línea recta cuando no hay nada en medio) ----------
  const free = (x, z) => !isBlocked(x, z);
  const clear = (ax, az, bx, bz) => {
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.08);
    for (let k = 1; k < n; k++) if (isBlocked(ax + (bx - ax) * k / n, az + (bz - az) * k / n)) return false;
    return true;
  };
  function findPath(sx, sz, gx, gz) {
    const start = cell(sz) * N + cell(sx), goal = cell(gz) * N + cell(gx);
    const cost = new Float32Array(N * N).fill(Infinity), prev = new Int32Array(N * N).fill(-1), done = new Uint8Array(N * N);
    const open = [start]; cost[start] = 0;
    const h = (c) => Math.hypot(c % N - goal % N, Math.floor(c / N) - Math.floor(goal / N));
    while (open.length) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (cost[open[k]] + h(open[k]) < cost[open[bi]] + h(open[bi])) bi = k;
      const c = open.splice(bi, 1)[0];
      if (c === goal) break;
      if (done[c]) continue; done[c] = 1;
      const ci = c % N, cj = Math.floor(c / N);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= N || j >= N) continue;
        const n = j * N + i; if (blocked[n] && n !== goal) continue;
        if (di && dj && (blocked[cj * N + i] || blocked[j * N + ci])) continue;      // sin cortar esquinas
        const nc = cost[c] + (di && dj ? 1.414 : 1);
        if (nc < cost[n]) { cost[n] = nc; prev[n] = c; open.push(n); }
      }
    }
    if (prev[goal] < 0 && goal !== start) return [[gx, gz]];                        // sin camino: va directo (no debería pasar)
    const pts = []; for (let c = goal; c >= 0 && c !== start; c = prev[c]) pts.unshift([at(c % N), at(Math.floor(c / N))]);
    pts[pts.length - 1] = [gx, gz];
    const out = []; let ax = sx, az = sz;                                            // se quitan los puntos que sobran
    for (let k = 0; k < pts.length; k++) {
      if (k === pts.length - 1 || !clear(ax, az, pts[k + 1][0], pts[k + 1][1])) { out.push(pts[k]); [ax, az] = pts[k]; }
    }
    return out;
  }

  // ---------- El equipo ----------
  const LOOKS = [
    { shirt: '#c8322f', pants: '#2b3140', style: 'short' },
    { shirt: '#f2c230', pants: '#3a4a6b', style: 'long', shorts: true },
    { shirt: '#2f8f4e', pants: '#e6dcc6', style: 'bun', sleeves: 'long' },
    { shirt: '#f3f1ea', pants: '#1d1d1d', style: 'cap', shoes: '#c8322f' },
    { shirt: '#2d4f9e', pants: '#d9cdb4', style: 'short', shorts: true },
    { shirt: '#1d1d1d', pants: '#5a6a7a', style: 'long', sleeves: 'long', shoes: '#1d1d1d' },
    { shirt: '#e98a3a', pants: '#2b3140', style: 'bun' },
  ];
  const agents = LOOKS.map((look, i) => {
    const p = person({ ...look, skin: SKINS[i], hair: HAIRS[i] }); scene.add(p);
    return { p, x: 0, z: 0, yaw: 0, state: 'act', slot: null, kind: 'idle', until: 0, path: [], t0: rnd() * 10, seed: rnd() * 6.28, talk: null, talkUntil: 0, carry: null };
  });
  const WEIGHTS = { desk: 4, board: 1.6, coffee: 1.4, bench: 1, hill: 1.2, phone: 0.8, chat: 1.8 };
  const LENGTH = { desk: [9, 18], board: [6, 11], coffee: [4, 7], bench: [6, 11], hill: [6, 11], phone: [5, 9], chat: [4, 7], idle: [1, 2] };
  const span = (k) => LENGTH[k][0] + rnd() * (LENGTH[k][1] - LENGTH[k][0]);
  let t = 0;

  // Elegir qué hacer ahora: un sitio libre al azar (con peso), o ir a hablar con alguien
  function choose(a) {
    const options = [];
    for (const kind in WEIGHTS) {
      if (kind === 'chat') { if (agents.some((b) => b !== a && canTalk(b))) options.push([kind, WEIGHTS[kind]]); continue; }
      if (slots.some((s) => s.kind === kind && !s.by && s !== a.slot)) options.push([kind, WEIGHTS[kind]]);
    }
    let r = rnd() * options.reduce((n, o) => n + o[1], 0), kind = options[0][0];
    for (const [k, w] of options) { if ((r -= w) <= 0) { kind = k; break; } }
    release(a);
    if (kind === 'chat') {
      const others = agents.filter((b) => b !== a && canTalk(b)), b = others[Math.floor(rnd() * others.length)];
      const spot = talkSpot(a, b); go(a, spot[0], spot[1], { kind: 'chat', with: b });
      return;
    }
    const list = slots.filter((s) => s.kind === kind && !s.by && s !== a.slot), s = list[Math.floor(rnd() * list.length)];
    s.by = a; const target = s.from || [s.x, s.z];
    go(a, target[0], target[1], { kind, slot: s });
  }
  const canTalk = (b) => b.state === 'act' && !b.talk && b.kind !== 'chat' && b.kind !== 'phone' && b.until - t > 3;
  function talkSpot(a, b) {
    const bx = b.slot?.from ? b.slot.from[0] : b.x, bz = b.slot?.from ? b.slot.from[1] : b.z;
    for (let k = 0; k < 12; k++) {                                                   // un hueco libre a unos 70 cm de la otra persona
      const ang = Math.atan2(a.x - bx, a.z - bz) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.5;
      const x = bx + Math.sin(ang) * 0.7, z = bz + Math.cos(ang) * 0.7;
      if (free(x, z)) return [x, z];
    }
    return [bx + 0.5, bz + 0.5];
  }
  function release(a) { if (a.slot) a.slot.by = null; a.slot = null; }
  function go(a, x, z, plan) {
    a.plan = plan; if (plan.slot) a.slot = plan.slot;
    a.path = findPath(a.x, a.z, x, z); a.state = a.sitting ? 'standup' : 'walk'; a.blend = 0;
    if (a.carry === 'phone') a.carry = null;
  }
  function arrive(a) {
    const { kind, slot } = a.plan;
    a.kind = kind; a.until = t + span(kind); a.t0 = t;
    if (kind !== 'chat' && kind !== 'idle' && kind !== 'coffee') a.carry = null;   // al llegar a otro sitio deja el café
    if (kind === 'chat') {
      const b = a.plan.with;
      if (canTalk(b) || (b.state === 'act' && b.talk === null && b.kind !== 'chat')) {
        b.talk = a; b.talkUntil = Math.max(b.talkUntil, a.until); b.until = Math.max(b.until, a.until + 1);
        a.talk = b; a.faceTo = b;
      } else { a.kind = 'idle'; a.until = t + span('idle'); }
      a.state = 'act'; return;
    }
    if (slot.seat) { a.state = 'sitdown'; a.blend = 0; return; }
    a.yawTo = slot.face; a.state = 'act';
    if (kind === 'coffee') a.carry = 'cup';
    a.variant = kind === 'hill' ? (rnd() < 0.6 ? 'sit' : 'stretch') : null;
  }
  // Al empezar, cada uno ya está haciendo algo (así la primera imagen, y la escena quieta, ya cuentan la historia)
  const startKinds = ['desk', 'desk', 'board', 'board', 'coffee', 'desk', 'hill'];
  agents.forEach((a, i) => {
    const s = slots.find((x) => x.kind === startKinds[i] && !x.by); s.by = a; a.slot = s; a.plan = { kind: s.kind, slot: s };
    a.x = s.x; a.z = s.z; a.yaw = s.face; arrive(a);
    if (s.seat) { a.state = 'act'; a.sitting = true; a.yaw = s.face; }
    a.until = t + 2 + rnd() * 10;
  });
  // La última empieza charlando con alguien que teclea, para que se vea una conversación desde el primer momento
  {
    const a = agents[6]; release(a); const b = agents[5];
    const [x, z] = talkSpot(a, b); a.x = x; a.z = z; a.plan = { kind: 'chat', with: b }; arrive(a); a.yaw = Math.atan2(b.x - a.x, b.z - a.z);
  }

  // ---------- Poses ----------
  const SIT = { tl: -1.55, tr: -1.55, kl: 1.5, kr: 1.5 };
  function pose(a) {
    const ph = t * 1 + a.seed, local = t - a.t0, P = {};
    const talking = a.talk && t < a.talkUntil;
    if (a.state === 'walk') {
      const s = Math.sin(t * 9 + a.seed);
      Object.assign(P, { tl: s * 0.55, tr: -s * 0.55, kl: Math.max(0, -s) * 0.7, kr: Math.max(0, s) * 0.7, al: -s * 0.45, ar: s * 0.45, el: -0.25, er: -0.25, sp: 0.06 });
      if (a.carry === 'cup') Object.assign(P, { ar: -0.35, er: -1.3 });
      P.lift = Math.abs(Math.cos(t * 9 + a.seed)) * 0.035;
      return P;
    }
    if (a.state === 'sitdown' || a.state === 'standup' || a.sitting) Object.assign(P, SIT);
    if (a.state !== 'act') return P;
    switch (a.kind) {
      case 'desk': {
        const rest = Math.sin(local * 0.35 + a.seed) > 0.82;                         // de vez en cuando se echa hacia atrás con las manos en la nuca
        if (rest) Object.assign(P, { al: -2.6, ar: -2.6, el: -2.3, er: -2.3, alz: 0.3, arz: 0.3, sp: -0.18, hx: -0.15 });
        else Object.assign(P, { al: -0.75 + Math.sin(ph * 14) * 0.07, ar: -0.75 + Math.sin(ph * 14 + 1.6) * 0.07, el: -0.75, er: -0.75, sp: 0.12, hx: 0.15 + Math.sin(ph * 0.9) * 0.05, hy: Math.sin(ph * 0.4) * 0.25 });
        break;
      }
      case 'board': {
        const mine = a.slot === slots.find((s) => s.kind === 'board');
        const other = slots.find((s) => s.kind === 'board' && s !== a.slot).by;
        const explaining = !other || other.state !== 'act' ? true : Math.floor((t + (mine ? 0 : 4)) / 4) % 2 === 0;   // si están los dos, se turnan para explicar
        if (explaining) Object.assign(P, { ar: -2.5 + Math.sin(ph * 2.2) * 0.25, er: -0.2, arz: 0.1, al: -0.2, hy: Math.sin(ph * 0.7) * 0.45, hx: -0.1 });
        else Object.assign(P, { al: -1.1, ar: -1.1, el: -1.4, er: -1.4, alz: -0.25, arz: -0.25, hx: Math.max(0, Math.sin(ph * 3)) * 0.2 });   // brazos cruzados, asiente
        break;
      }
      case 'coffee': {
        const sip = Math.sin(local * 1.3) > 0.55;
        Object.assign(P, { ar: sip ? -1.0 : -0.35, er: sip ? -2.1 : -1.3, hx: sip ? -0.25 : 0.05, al: -0.1, hy: Math.sin(ph * 0.5) * 0.5 });
        break;
      }
      case 'bench': {
        const phone = Math.sin(local * 0.4 + a.seed) > 0;
        Object.assign(P, phone ? { ar: -0.9, er: -1.0, al: -0.8, el: -1.1, hx: 0.45, sp: 0.15 } : { al: 0.35, ar: 0.35, el: -0.1, er: -0.1, sp: -0.2, hx: -0.2, hy: Math.sin(ph * 0.3) * 0.6 });
        a.carry = phone ? 'phone' : a.carry === 'phone' ? null : a.carry;
        break;
      }
      case 'hill': {
        if (a.variant === 'sit') Object.assign(P, { tl: -1.45, tr: -1.3, kl: 0.15, kr: 0.6, al: 0.7, ar: 0.7, el: -0.2, er: -0.2, sp: -0.3, hx: -0.25, lift: -(HIP - 0.08) });
        else {
          const w = Math.sin(local * 1.4);
          Object.assign(P, { al: -2.9, ar: -2.9, el: -0.3, er: -0.3, alz: 0.15 + w * 0.2, arz: 0.15 - w * 0.2, sp: -0.05, spy: w * 0.3, hx: -0.2 });
        }
        break;
      }
      case 'phone': {
        Object.assign(P, { ar: -0.4, arz: 0.45, er: -2.5, al: -0.3 + Math.sin(ph * 1.7) * 0.4, el: -0.9, hy: Math.sin(ph * 0.6) * 0.5, hx: -0.05 });
        a.carry = 'phone';
        break;
      }
      case 'idle': Object.assign(P, { hy: Math.sin(ph * 1.2) * 0.7 }); break;
    }
    if (talking || a.kind === 'chat') {                                              // hablar con las manos
      const g = Math.sin(ph * 3.1), g2 = Math.sin(ph * 2.3 + 1);
      const talkArms = { al: -0.55 + g * 0.35, el: -1.0 + g2 * 0.3, ar: -0.45 - g2 * 0.3, er: -1.1 + g * 0.25, hx: Math.sin(ph * 4) * 0.08 };
      if (a.carry === 'cup') { talkArms.ar = -0.35; talkArms.er = -1.3; }
      Object.assign(P, a.sitting ? { al: talkArms.al, el: talkArms.el, sp: -0.05 } : talkArms);
      const b = a.talk || a.faceTo;
      if (b) {                                                                       // gira la cabeza (sentada) o el cuerpo (de pie) hacia la otra persona
        const want = Math.atan2(b.x - a.x, b.z - a.z);
        if (a.sitting) P.hy = Math.max(-1.2, Math.min(1.2, Math.atan2(Math.sin(want - a.yaw), Math.cos(want - a.yaw))));
        else a.yawTo = want;
      }
    }
    return P;
  }

  // ---------- Cada fotograma ----------
  const turnTo = (from, to, k) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k;
  function step(a, dt) {
    if (a.state === 'walk') {
      const [wx, wz] = a.path[0] || [a.x, a.z];
      const dx = wx - a.x, dz = wz - a.z, d = Math.hypot(dx, dz);
      if (d < 0.06) { a.path.shift(); if (!a.path.length) arrive(a); }
      else {
        const sp = Math.min(d, dt * 1.05);
        a.x += dx / d * sp; a.z += dz / d * sp;
        a.yaw = turnTo(a.yaw, Math.atan2(dx, dz), 1 - Math.exp(-12 * dt));
      }
    } else if (a.state === 'sitdown' || a.state === 'standup') {                     // deslizarse entre la silla y el sitio de delante
      a.blend = Math.min(1, a.blend + dt * 2.2);
      const s = a.state === 'sitdown' ? a.slot : a.lastSeat, [fx, fz] = s.from, k = a.state === 'sitdown' ? a.blend : 1 - a.blend;
      a.x = fx + (s.x - fx) * k; a.z = fz + (s.z - fz) * k;
      a.yaw = turnTo(a.yaw, s.face, 1 - Math.exp(-10 * dt));
      if (a.blend >= 1) {
        if (a.state === 'sitdown') { a.sitting = true; a.state = 'act'; a.yaw = s.face; }
        else { a.sitting = false; a.state = 'walk'; }
      }
    } else {
      if (a.yawTo !== undefined && !a.sitting) a.yaw = turnTo(a.yaw, a.yawTo, 1 - Math.exp(-6 * dt));
      if (a.talk && t >= a.talkUntil) { a.talk = null; a.faceTo = null; if (a.slot) a.yawTo = a.slot.face; }
      if (a.kind === 'chat' && a.plan.with && a.plan.with.state !== 'act') a.until = Math.min(a.until, t + 0.5);   // la otra persona se ha ido
      if (t >= a.until) { a.lastSeat = a.sitting ? a.slot : null; a.talk = null; a.faceTo = null; a.yawTo = undefined; choose(a); }
    }
    // Postura y altura: sentada en la silla o el banco, sobre la hierba, o de pie sobre la loma
    const P = pose(a);
    const seatSlot = a.state === 'standup' ? a.lastSeat : a.sitting || a.state === 'sitdown' ? a.slot : null, seatH = seatSlot?.seat ?? 0;
    const sitK = a.sitting ? 1 : a.state === 'sitdown' ? a.blend : a.state === 'standup' ? 1 - a.blend : 0;
    applyPose(a.p, P, 1 - Math.exp(-10 * dt));
    const y = heightAt(a.x, a.z), sitY = seatH ? seatH - HIP : 0;
    a.p.position.set(a.x, y + sitY * sitK + (a.sitting ? 0 : a.p.pose.lift), a.z);
    a.p.rotation.y = a.yaw;
    a.p.cup.visible = a.carry === 'cup'; a.p.phone.visible = a.carry === 'phone' && a.p.pose.er < -0.6;
  }
  // Separación suave: si dos personas se acercan demasiado al andar, se apartan un poco
  function separate() {
    for (const a of agents) for (const b of agents) {
      if (a === b || a.state !== 'walk') continue;
      const dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz);
      if (d > 0 && d < 0.45) { const nx = a.x + dx / d * 0.01, nz = a.z + dz / d * 0.01; if (free(nx, nz)) { a.x = nx; a.z = nz; } }
    }
  }
  function animate(dt) { t += dt; for (const a of agents) step(a, dt); separate(); }

  // ---------- Tamaño: la escena se dibuja a muy baja resolución y se amplía sin suavizar ----------
  let raf = 0, running = false, last = 0;
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

  function frame(now) {
    raf = 0;
    if (!running) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    animate(dt); renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  for (let k = 0; k < 30; k++) animate(0.016);                     // asienta las posturas antes del primer dibujo
  renderer.render(scene, camera);
  // ¿Cae este punto de la pantalla sobre la isla? (para cerrar la escena a pantalla completa al tocar fuera de ella)
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitAt = new THREE.Vector3();
  function onIsland(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set((clientX - r.left) / r.width * 2 - 1, -((clientY - r.top) / r.height * 2 - 1));
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(plane, hitAt)) return false;
    return Math.max(Math.abs(hitAt.x), Math.abs(hitAt.z)) < SIZE * 0.56;
  }
  return {
    onIsland,
    play() { if (still || running) return; running = true; last = 0; raf = requestAnimationFrame(frame); },
    pause() { running = false; cancelAnimationFrame(raf); raf = 0; },
    destroy() { this.pause(); ro.disconnect(); renderer.dispose(); },
  };
}
