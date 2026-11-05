// ABOUT · el dorso de la foto: un pequeño mundo isométrico en «pixel art» (referencia: el juego de granja de x.com/daniildesigns).
// Es una escena 3D de verdad (three.js) dibujada a muy baja resolución y ampliada sin suavizar, así cada píxel se ve como un cuadrado.
// Una isla flotante con volumen: acantilados con capas de tierra, una terraza alta con escaleras de piedra, una casa con chimenea, un cobertizo
// de leña, un huerto, un estanque con patos que cae en cascada por el borde, un puente, una hoguera y la oficina al aire libre de antes.
// Tres personas viven ahí y deciden solas qué hacer según lo que les apetece (trabajar, charlar, el huerto, pescar, leña, abejas, hoguera,
// mirar las estrellas...), la hora y el tiempo: de noche se van a dormir a casa y, si llueve, sacan el paraguas o se resguardan.
// Cada una tiene su carácter, recuerda lo que acaba de hacer y no lo repite: nunca pasa lo mismo dos veces.
// La hora es la de Madrid (con su amanecer y su atardecer de hoy); a pantalla completa un panel (js/about.js) cambia la hora y el tiempo,
// y la escena se puede acercar (rueda o pellizco) y recorrer arrastrando.
// Se carga solo al dar la vuelta a la foto (js/about.js) y solo dibuja mientras se ve. Con «reducir movimiento», la escena queda quieta.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Cada «píxel» de la escena mide entre 1,5 y 3 píxeles de pantalla: unos 260 de ancho en la tarjeta y unos 560 a pantalla completa.
const PIXEL_MIN = 1.5, PIXEL_MAX = 3, WIDE_CARD = 260, WIDE_FULL = 560;
const seeded = (seed) => { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };
const rnd = seeded(7);                           // el mundo (árboles, flores, piedras) es siempre el mismo
const rand = Math.random;                        // lo que hacen las personas, no: cada visita es distinta
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, k) => a + (b - a) * k;
const pick = (a) => a[Math.floor(rand() * a.length)];

// ---------- El mundo, en metros (la isla mide 14 × 14; la cámara mira desde la esquina +x +z) ----------
const H = 7;                                                         // media isla
const TERR = { x1: -1.6, z1: -2.6, h: 1.6 };                         // terraza alta: x < -1,6 y z < -2,6
const STAIRS = { x0: -3.55, x1: -2.65, zTop: -2.6, zBot: -1.0 };     // 8 escalones de 20 cm
const POND = { x: 4.55, z: -4.3, r: 1.5, y: -0.18 };                 // estanque; el agua sale por un arroyo hasta el borde (+x)
const STREAM = { x0: 5.7, z: -4.3, w: 0.42 };
const BRIDGE = { x0: 6.0, x1: 6.85, z0: -5.05, z1: -3.55, y: 0.24 };
const HOUSE = { x0: -0.4, x1: 2.6, z0: -6.2, z1: -3.8, wall: 2.2 };
const SHED = { x0: -6.85, x1: -5.25, z0: -2.55, z1: -1.35 };
const BEDS = [[-0.25, 0.95, -2.65, -1.75], [1.55, 2.75, -2.65, -1.75]]; // huerto: x0, x1, z0, z1
const FIRE = { x: 3.8, z: 2.3 };
const HILLS = [[-5.4, 4.7, 0.6, 1.15], [1.7, 5.9, 0.5, 0.95], [5.0, 0.4, 0.28, 0.8]];   // x, z, alto, radio

const onTerrace = (x, z) => x < TERR.x1 && z < TERR.z1;
const onStairs = (x, z) => x >= STAIRS.x0 && x <= STAIRS.x1 && z <= STAIRS.zBot && z >= STAIRS.zTop;
const onBridge = (x, z) => x >= BRIDGE.x0 && x <= BRIDGE.x1 && z >= BRIDGE.z0 && z <= BRIDGE.z1;
const pondDist = (x, z) => Math.hypot(x - POND.x, z - POND.z);
const inStream = (x, z) => x > STREAM.x0 - 0.3 && Math.abs(z - STREAM.z) < STREAM.w;
function heightAt(x, z) {
  if (onBridge(x, z)) return BRIDGE.y + 0.12 * Math.cos(((z - (BRIDGE.z0 + BRIDGE.z1) / 2) / (BRIDGE.z1 - BRIDGE.z0)) * Math.PI);
  if (onStairs(x, z)) return clamp((STAIRS.zBot - z) / (STAIRS.zBot - STAIRS.zTop), 0, 1) * TERR.h;
  if (onTerrace(x, z)) return TERR.h;
  let h = 0;
  for (const [hx, hz, a, r] of HILLS) h += a * Math.exp(-((x - hx) ** 2 + (z - hz) ** 2) / (r * r));
  const edge = smooth(0, 0.9, H - Math.max(Math.abs(x), Math.abs(z)));
  h *= edge;
  const pd = pondDist(x, z);                                          // el estanque y el arroyo, hundidos
  if (pd < POND.r + 0.35) h = Math.min(h, -0.62 * smooth(POND.r + 0.35, POND.r - 0.5, pd));
  if (x > STREAM.x0 - 0.6) { const d = Math.abs(z - STREAM.z); if (d < STREAM.w + 0.25) h = Math.min(h, -0.42 * smooth(STREAM.w + 0.25, STREAM.w - 0.1, d)); }
  return h;
}

// ---------- Texturas pintadas píxel a píxel (sin imágenes externas) ----------
function canvasTexture(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
const noiseTex = (colors, size = 16) => canvasTexture(size, size, (g) => {
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { g.fillStyle = colors[Math.floor(rnd() * colors.length)]; g.fillRect(x, y, 1, 1); }
}, true);
const shade = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };

// El caminito de losas: de la puerta al huerto, a la hoguera, a la oficina, a las escaleras y al puente
const PATHS = [
  [[1.1, -3.5], [1.25, -1.2], [2.6, 0.6], [3.3, 1.5]],
  [[1.25, -1.2], [-0.6, 0.0], [-2.6, 0.5], [-3.1, -0.9]],
  [[-0.6, 0.0], [-1.6, 1.0]],
  [[2.6, 0.6], [4.6, -1.6], [6.2, -2.7], [6.4, -3.5]],
];
function pathDist(x, z) {
  let best = 9;
  for (const line of PATHS) for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i], [bx, bz] = line[i + 1], dx = bx - ax, dz = bz - az;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
// El suelo entero en una textura: hierba con matas oscuras y brillos, tierra gastada bajo el camino y bajo la hoguera, flores sueltas
function groundTexture(T = 512) {
  const GRASS = ['#5d8f2e', '#669a33', '#548429', '#6fa53a', '#4d7a26', '#77ad41'];
  const DARK = ['#3c6420', '#355a1c', '#43702a'];
  const DIRT = ['#9c7a4f', '#8a6a44', '#a98656', '#7d5e3c'];
  const FLOW = ['#f2f0e6', '#ffd23f', '#ff7a6b', '#c9a2ff', '#ff9fd0', '#8fd0ff'];
  return canvasTexture(T, T, (g) => {
    const px = (c, x, y) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const wx = -H + (x + 0.5) / T * 2 * H, wz = -H + (y + 0.5) / T * 2 * H;
      const patch = Math.sin(wx * 0.9 + Math.sin(wz * 0.7) * 2) + Math.cos(wz * 1.1 - wx * 0.4);  // manchas de hierba más clara y más oscura
      let col = GRASS[Math.floor(rnd() * 3) + (patch > 0.6 ? 3 : patch < -0.7 ? 0 : 1)] || GRASS[2];
      const pd = pathDist(wx, wz), fd = Math.hypot(wx - FIRE.x, wz - FIRE.z);
      if (pd < 0.34 + rnd() * 0.1 || fd < 1.05 + rnd() * 0.15) col = DIRT[Math.floor(rnd() * DIRT.length)];
      else if (rnd() < 0.05) col = '#9fcf5c';
      px(col, x, y);
    }
    for (let k = 0; k < T * 14; k++) {                                  // matas: dos o tres píxeles oscuros en vertical
      const x = Math.floor(rnd() * T), y = Math.floor(rnd() * T);
      const wx = -H + x / T * 2 * H, wz = -H + y / T * 2 * H;
      if (pathDist(wx, wz) < 0.45) continue;
      const c = DARK[Math.floor(rnd() * DARK.length)];
      px(c, x, y); px(c, x, y + 1); if (rnd() < 0.5) px(c, x + 1, y - 1);
    }
    for (let k = 0; k < 900; k++) {                                     // flores sueltas por todas partes, más en la terraza
      const x = Math.floor(rnd() * T), y = Math.floor(rnd() * T);
      const wx = -H + x / T * 2 * H, wz = -H + y / T * 2 * H;
      if (pathDist(wx, wz) < 0.5 || (!onTerrace(wx, wz) && rnd() < 0.5)) continue;
      px(FLOW[Math.floor(rnd() * FLOW.length)], x, y);
    }
  });
}
// Capas de tierra del acantilado: labio de hierba arriba con flecos que cuelgan, tierra, roca y tierra oscura abajo
function cliffTexture(heightUnits) {
  const W = 64, Hh = Math.round(18 * heightUnits);
  return canvasTexture(W, Hh, (g) => {
    const BANDS = [['#7a5634', '#6b4a2c', '#86603a'], ['#5e4128', '#6a4a2e', '#553a23'], ['#7d7468', '#6e665b', '#8a8174'], ['#4a3422', '#3f2c1d', '#553b27']];
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      const band = clamp(Math.floor((y + Math.sin(x * 0.4) * 2 + rnd() * 2) / (Hh / BANDS.length)), 0, BANDS.length - 1);
      g.fillStyle = BANDS[band][Math.floor(rnd() * 3)]; g.fillRect(x, y, 1, 1);
    }
    for (let x = 0; x < W; x++) {                                       // el labio de hierba, con flecos de largo distinto
      const fr = 3 + Math.floor(rnd() * 4) + (rnd() < 0.15 ? 4 : 0);
      for (let y = 0; y < fr; y++) { g.fillStyle = ['#5d8f2e', '#4d7a26', '#6fa53a'][Math.floor(rnd() * 3)]; g.fillRect(x, y, 1, 1); }
    }
    for (let k = 0; k < W * 1.5; k++) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * Hh), 1, 2); }  // grietas
  }, true);
}
const roofTex = () => canvasTexture(32, 32, (g) => {                   // tejas: hileras alternas
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const row = Math.floor(y / 4), edge = y % 4 === 3 || (x + row * 3) % 6 === 0;
    g.fillStyle = edge ? '#6e2b1c' : ['#a8462c', '#b5532f', '#9b3f28', '#bf5c36'][Math.floor(rnd() * 4)]; g.fillRect(x, y, 1, 1);
  }
}, true);
const plankTex = (base) => canvasTexture(16, 16, (g) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const seam = x % 4 === 3;
    g.fillStyle = seam ? shade(base, 0.62) : shade(base, 0.86 + rnd() * 0.24); g.fillRect(x, y, 1, 1);
  }
}, true);
const waterTex = (streaks) => canvasTexture(32, 32, (g) => {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    g.fillStyle = ['#3f8fb5', '#4a9cc0', '#3786ad', '#55a7c8'][Math.floor(rnd() * 4)]; g.fillRect(x, y, 1, 1);
  }
  for (let k = 0; k < (streaks ? 60 : 14); k++) {
    const x = Math.floor(rnd() * 32), y = Math.floor(rnd() * 32), l = streaks ? 3 + Math.floor(rnd() * 6) : 2 + Math.floor(rnd() * 3);
    g.fillStyle = rnd() < 0.5 ? '#bfe6f2' : '#8fcfe6';
    if (streaks) g.fillRect(x, y, 1, l); else g.fillRect(x, y, l, 1);
  }
}, true);

// ---------- Materiales y piezas ----------
const MATS = new Map();
const mat = (color, opts = {}) => {
  const key = color + JSON.stringify(opts);
  if (!MATS.has(key)) MATS.set(key, new THREE.MeshLambertMaterial({ color, ...opts }));
  return MATS.get(key);
};
const mapMat = (map, opts = {}) => new THREE.MeshLambertMaterial({ map, ...opts });
const box = (w, h, d, material) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.castShadow = true; m.receiveShadow = true; return m; };

// ---------- Vóxeles: volúmenes hechos de cubitos, como píxeles con fondo (copas de árbol, pinos, arbustos, nubes) ----------
// Solo se dibujan las caras que se ven (las de dentro se quitan) y cada cubito lleva su color: arriba más claro, abajo más oscuro.
const FACES = [
  { n: [-1, 0, 0], c: [[0, 1, 0], [0, 0, 0], [0, 1, 1], [0, 0, 1]], k: 0.92 }, { n: [1, 0, 0], c: [[1, 1, 1], [1, 0, 1], [1, 1, 0], [1, 0, 0]], k: 0.92 },
  { n: [0, -1, 0], c: [[1, 0, 1], [0, 0, 1], [1, 0, 0], [0, 0, 0]], k: 0.7 }, { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [0, 1, 0], [1, 1, 0]], k: 1.12 },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [1, 1, 0], [0, 1, 0]], k: 0.92 }, { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]], k: 1 },
];
function voxels(cells, v) {                         // cells: Map «i,j,k» → color; v: lado del cubito
  const pos = [], nor = [], col = [], c = new THREE.Color();
  for (const [key, hex] of cells) {
    const [i, j, k] = key.split(',').map(Number);
    for (const f of FACES) {
      if (cells.has(`${i + f.n[0]},${j + f.n[1]},${k + f.n[2]}`)) continue;
      c.set(hex).multiplyScalar(f.k);
      for (const q of [0, 1, 2, 2, 1, 3]) { const p = f.c[q]; pos.push((i + p[0]) * v, (j + p[1]) * v, (k + p[2]) * v); nor.push(...f.n); col.push(c.r, c.g, c.b); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}
// Una masa redondeada: la unión de varias esferas (x, y, z, radio), con el borde algo irregular; el color lo decide paint(altura 0..1, al azar)
function blob(spheres, v, paint, { flat = -Infinity, rough = 0.18 } = {}) {
  const cells = new Map();
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, y, z, r] of spheres) { x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); y0 = Math.min(y0, y - r); y1 = Math.max(y1, y + r); z0 = Math.min(z0, z - r); z1 = Math.max(z1, z + r); }
  for (let i = Math.floor(x0 / v); i <= Math.ceil(x1 / v); i++) for (let j = Math.floor(y0 / v); j <= Math.ceil(y1 / v); j++) for (let k = Math.floor(z0 / v); k <= Math.ceil(z1 / v); k++) {
    const px = (i + 0.5) * v, py = (j + 0.5) * v, pz = (k + 0.5) * v;
    if (py < flat) continue;
    if (spheres.some(([x, y, z, r]) => Math.hypot(px - x, (py - y) * 1.15, pz - z) < r * (1 - rough * rnd()))) cells.set(`${i},${j},${k}`, paint((py - y0) / (y1 - y0 || 1), rnd()));
  }
  return voxels(cells, v);
}
const VOX = new THREE.MeshLambertMaterial({ vertexColors: true });
const LEAF = (h, r) => (r < 0.08 ? '#86c652' : r < 0.2 ? '#2f6420' : h > 0.7 ? ['#5fa83b', '#6fb544', '#4f9233'][Math.floor(r * 30) % 3] : h > 0.35 ? ['#4f9233', '#3f7a2a', '#5fa83b'][Math.floor(r * 30) % 3] : ['#3f7a2a', '#2f6420', '#355e22'][Math.floor(r * 30) % 3]);
const PINE_LEAF = (h, r) => (r < 0.1 ? '#4f8a3e' : r < 0.25 ? '#1f4520' : ['#2f5e2a', '#3a6e31', '#2a5426'][Math.floor(r * 30) % 3]);

// ---------- Personas: cajas con articulaciones (cadera, rodilla, hombro, codo, cintura, cuello) ----------
const S = 1.2, HIP = 0.62 * S;
const joint = (x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); return g; };
function person({ shirt, pants, skin, hair, style = 'short', shorts = false, sleeves = 'short', shoes = '#f2f2ee', brolly }) {
  const p = new THREE.Group(), body = new THREE.Group();
  p.rotation.order = 'YXZ';                                           // girar y, si hace falta, tumbarse
  p.add(body); body.scale.setScalar(S);
  const M = { shirt: mat(shirt), pants: mat(pants), skin: mat(skin), hair: mat(hair), shoe: mat(shoes), eye: mat('#1a1410') };
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
  p.spine = joint(0, 0.7, 0); body.add(p.spine);
  const torso = box(0.38, 0.44, 0.22, M.shirt); torso.position.y = 0.24; p.spine.add(torso);
  const neck = box(0.1, 0.06, 0.1, M.skin); neck.position.y = 0.48; p.spine.add(neck);
  const arm = (x) => {
    const sh = joint(x, 0.43, 0);
    const up = box(0.11, 0.24, 0.12, M.shirt); up.position.y = -0.12; sh.add(up);
    const el = joint(0, -0.23, 0); sh.add(el);
    const fo = box(0.1, 0.22, 0.11, sleeves === 'long' ? M.shirt : M.skin); fo.position.y = -0.11; el.add(fo);
    const hand = box(0.09, 0.08, 0.1, M.skin); hand.position.y = -0.25; el.add(hand);
    sh.elbow = el; p.spine.add(sh); return sh;
  };
  p.armL = arm(-0.245); p.armR = arm(0.245);
  p.head = joint(0, 0.5, 0); p.spine.add(p.head);
  const face = box(0.27, 0.27, 0.25, M.skin); face.position.y = 0.14; p.head.add(face);
  for (const x of [-0.06, 0.06]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.02), M.eye); e.position.set(x, 0.15, 0.13); p.head.add(e); }
  const cap = box(0.29, 0.08, 0.27, M.hair); cap.position.y = 0.29; p.head.add(cap);
  const back = box(0.29, style === 'long' ? 0.36 : 0.18, 0.07, M.hair); back.position.set(0, style === 'long' ? 0.1 : 0.2, -0.11); p.head.add(back);
  if (style === 'long') for (const x of [-0.135, 0.135]) { const side = box(0.04, 0.3, 0.2, M.hair); side.position.set(x, 0.14, -0.02); p.head.add(side); }
  if (style === 'cap') { const peak = box(0.27, 0.03, 0.14, M.shirt); peak.position.set(0, 0.27, 0.18); p.head.add(peak); cap.material = M.shirt; }
  // Lo que pueden llevar: en la mano derecha (taza, móvil, hacha, palo de la hoguera), delante del pecho (libro, tronco) o en el cuerpo (caña, regadera, paraguas)
  const hold = (m, x, y, z, parent = p.armR.elbow) => { m.position.set(x, y, z); m.visible = false; parent.add(m); return m; };
  p.props = {
    cup: hold(box(0.08, 0.1, 0.08, mat('#e7e2d6')), 0, -0.3, 0.05),
    phone: hold(box(0.03, 0.14, 0.08, mat('#15171c')), -0.04, -0.28, 0.04),
    axe: (() => { const g = new THREE.Group(); const h = box(0.04, 0.6, 0.04, mat('#8a5a32')); h.position.y = -0.1; g.add(h); const b = box(0.04, 0.14, 0.16, mat('#9aa3ad')); b.position.set(0, -0.36, 0.07); g.add(b); g.rotation.x = Math.PI; return hold(g, 0, -0.26, 0.03); })(),
    stick: (() => { const g = new THREE.Group(); const s = box(0.025, 0.025, 0.7, mat('#7a5530')); s.position.z = 0.35; g.add(s); const m = box(0.07, 0.07, 0.07, mat('#fff4e0')); m.position.z = 0.7; g.add(m); g.rotation.x = 0.9; return hold(g, 0, -0.26, 0.03); })(),
    book: hold(box(0.26, 0.2, 0.05, mat(['#c8322f', '#2d4f9e', '#f2c230'][Math.floor(rnd() * 3)])), 0, 0.16, 0.24, p.spine),
    log: hold(box(0.5, 0.16, 0.16, mat('#8a5a32')), 0, 0.12, 0.26, p.spine),
    rod: (() => { const g = new THREE.Group(); const r = box(0.03, 0.03, 1.7, mat('#5a3d22')); r.position.z = 0.85; g.add(r); const line = box(0.012, 1.25, 0.012, mat('#e8e8e8')); line.position.set(0, -0.62, 1.7); line.rotation.x = 0.55; g.add(line); g.line = line; g.rotation.x = -0.55; return hold(g, 0.24, 0.98, 0.18); })(),
    can: (() => { const g = new THREE.Group(); const b = box(0.2, 0.18, 0.13, mat('#4f8f5a')); g.add(b); const s = box(0.04, 0.04, 0.22, mat('#4f8f5a')); s.position.set(0, 0.05, 0.16); s.rotation.x = -0.6; g.add(s); return hold(g, 0.26, 0.62, 0.26); })(),
    brolly: (() => { const g = new THREE.Group(); const s = box(0.03, 1.0, 0.03, mat('#2b2b2b')); s.position.y = -0.5; g.add(s); const m = mat(brolly); const lo = box(1.0, 0.1, 1.0, m); lo.position.y = 0.02; g.add(lo); const hi = box(0.6, 0.1, 0.6, m); hi.position.y = 0.12; g.add(hi); return hold(g, 0.16, 2.12, 0.08); })(),
  };
  p.add(p.props.rod, p.props.can, p.props.brolly);
  p.pose = { tl: 0, tr: 0, kl: 0, kr: 0, al: 0, ar: 0, alz: 0, arz: 0, el: 0, er: 0, sp: 0, spy: 0, hx: 0, hy: 0, lift: 0, lie: 0 };
  return p;
}
function applyPose(p, pose, k) {
  const c = p.pose;
  for (const key in c) c[key] += ((pose[key] || 0) - c[key]) * k;
  p.legL.rotation.x = c.tl; p.legR.rotation.x = c.tr; p.legL.shin.rotation.x = c.kl; p.legR.shin.rotation.x = c.kr;
  p.armL.rotation.x = c.al; p.armR.rotation.x = c.ar; p.armL.rotation.z = -c.alz; p.armR.rotation.z = c.arz;
  p.armL.elbow.rotation.x = c.el; p.armR.elbow.rotation.x = c.er;
  p.spine.rotation.x = c.sp; p.spine.rotation.y = c.spy; p.head.rotation.x = c.hx; p.head.rotation.y = c.hy;
  p.rotation.x = -Math.PI / 2 * c.lie;
}

// ---------- La hora: amanecer y atardecer de hoy en Madrid ----------
function madridNow() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
  const v = (t) => Number(parts.find((p) => p.type === t)?.value || 0);
  return v('hour') + v('minute') / 60 + v('second') / 3600;
}
function sunTimes() {
  const now = new Date(), start = Date.UTC(now.getUTCFullYear(), 0, 0), n = Math.floor((now - start) / 864e5);
  const decl = 23.44 * Math.PI / 180 * Math.sin(2 * Math.PI * (284 + n) / 365), lat = 40.42 * Math.PI / 180;
  const half = Math.acos(clamp(-Math.tan(lat) * Math.tan(decl), -1, 1)) * 12 / Math.PI;   // medio día de luz, en horas
  const utcNoon = 12 + 3.7 / 15;
  const offset = (madridNow() - (now.getUTCHours() + now.getUTCMinutes() / 60) + 24 + 12) % 24 - 12;  // +1 en invierno, +2 en verano
  const noon = utcNoon + Math.round(offset);
  return { rise: noon - half - 0.25, set: noon + half + 0.25, noon };
}
export const TIMES = ['Morning', 'Daytime', 'Sunset', 'Night'];
export const WEATHERS = ['Clear skies', 'Cloudy', 'Gentle rain'];

export function startScene(canvas, { still = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const SUN = sunTimes();

  // Cámara isométrica (vista 2:1 del pixel art: 30° de elevación, 45° de giro); a pantalla completa se acerca y se desplaza
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 140);
  const R = 50, EL = Math.PI / 6, AZ = Math.PI / 4;
  const OFFSET = new THREE.Vector3(R * Math.cos(EL) * Math.sin(AZ), R * Math.sin(EL), R * Math.cos(EL) * Math.cos(AZ));
  const LOOK = new THREE.Vector3(0, -0.6, 0), pan = new THREE.Vector3(), panTo = new THREE.Vector3();
  let zoom = 1, zoomTo = 1;
  const placeCamera = () => { camera.position.copy(LOOK).add(pan).add(OFFSET); camera.lookAt(LOOK.clone().add(pan)); camera.zoom = zoom; camera.updateProjectionMatrix(); };

  // Luz: sol (o luna) con sombras largas, cielo y suelo; y cuatro luces cálidas que se encienden de noche
  const hemi = new THREE.HemisphereLight(0xeef3ff, 0x3d4a2c, 0.75); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.8);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 });
  sun.shadow.bias = -0.0012; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const warm = (x, y, z, dist) => { const l = new THREE.PointLight(0xffb45a, 0, dist, 1.6); l.position.set(x, y, z); scene.add(l); return l; };
  const lights = { house: warm(1.1, 1.4, -3.1, 5), lampA: warm(1.0, 1.9, -0.4, 4.5), lampB: warm(5.6, 1.9, -1.9, 4.5), fire: warm(FIRE.x, 0.7, FIRE.z, 6) };

  // ---------- Lo que no se mueve se junta en pocas piezas (menos trabajo para el móvil) ----------
  const statics = new Map();
  const keep = (mesh) => {                                            // un objeto colocado ya en su sitio del mundo
    mesh.updateMatrixWorld(true);
    mesh.traverse((m) => {
      if (!m.isMesh) return;
      const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrixWorld);
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
      if (!statics.has(m.material)) statics.set(m.material, { list: [], cast: m.castShadow });
      statics.get(m.material).list.push(g);
    });
  };
  const add = (o) => { scene.add(o); return o; };
  const at = (o, x, z, y = heightAt(x, z), ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };
  const B = (w, h, d, material, x, y, z, ry = 0) => { const m = box(w, h, d, material); m.position.set(x, y, z); m.rotation.y = ry; keep(m); return m; };

  // ---------- La isla: suelo, acantilados con capas y rocas que cuelgan ----------
  const groundTex = groundTexture();
  const groundMat = mapMat(groundTex);
  const groundGeo = new THREE.PlaneGeometry(2 * H, 2 * H, 140, 140).rotateX(-Math.PI / 2);
  const gp = groundGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = gp.getZ(i); gp.setY(i, onTerrace(x, z) || onStairs(x, z) || onBridge(x, z) ? 0 : heightAt(x, z)); }
  groundGeo.computeVertexNormals();
  const ground = add(new THREE.Mesh(groundGeo, groundMat)); ground.receiveShadow = true;
  const DEPTH = 3.2;
  const cliff = (len, hgt) => { const t = cliffTexture(hgt); t.repeat.set(len / 3.5, 1); return mapMat(t); };
  const sideMats = (w, d, hgt) => [cliff(d, hgt), cliff(d, hgt), mat('#5d8f2e'), mat('#2e2018'), cliff(w, hgt), cliff(w, hgt)];
  { const base = new THREE.Mesh(new THREE.BoxGeometry(2 * H, DEPTH, 2 * H), sideMats(2 * H, 2 * H, DEPTH)); base.position.y = -DEPTH / 2 - 0.02; base.receiveShadow = true; add(base); }
  // Bajo la isla, bloques de roca escalonados: así flota y tiene volumen por debajo
  for (const [x, z, w, d, hh, below] of [[0, 0, 11, 11, 1.4, 0], [-1, 0.5, 8, 8.5, 1.3, 1.4], [-1.5, 1, 5, 5.5, 1.2, 2.7], [1.8, -1.5, 4.5, 4, 1.4, 1.4], [-2, 1.2, 2.4, 2.6, 1.1, 3.9], [2.2, -1.8, 2, 1.8, 1.0, 2.8]]) {
    const y0 = -DEPTH - below;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), sideMats(w, d, hh).map((mm, i) => (i === 2 ? mat('#4a3422') : mm)));
    m.position.set(x, y0 - hh / 2, z); add(m);
  }
  // La terraza alta: un bloque con las mismas capas, encima su propio césped
  const TW = TERR.x1 + H, TD = TERR.z1 + H;
  { const t = new THREE.Mesh(new THREE.BoxGeometry(TW, TERR.h + 0.02, TD), sideMats(TW, TD, TERR.h)); t.position.set(-H + TW / 2, TERR.h / 2 - 0.01, -H + TD / 2); t.castShadow = t.receiveShadow = true; add(t);
    const top = new THREE.PlaneGeometry(TW, TD, 1, 1).rotateX(-Math.PI / 2); top.translate(-H + TW / 2, TERR.h + 0.005, -H + TD / 2);
    const uv = top.attributes.uv, pos = top.attributes.position;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + H) / (2 * H), (H - pos.getZ(i)) / (2 * H));
    const tm = new THREE.Mesh(top, groundMat); tm.receiveShadow = true; add(tm); }
  // Escaleras de piedra hasta la terraza
  const stone = mapMat(noiseTex(['#a9a39a', '#9a948b', '#b6b0a6', '#8d877e'], 8));
  for (let i = 0; i < 8; i++) B(STAIRS.x1 - STAIRS.x0, 0.2 * (i + 1), 0.2, stone, (STAIRS.x0 + STAIRS.x1) / 2, 0.1 * (i + 1), STAIRS.zBot - 0.1 - 0.2 * i);
  // Valla de madera en el borde de la terraza (con hueco para las escaleras)
  const fenceWood = mat('#8a5a32');
  const fence = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 0.9)), ry = Math.atan2(bx - ax, bz - az);
    for (let i = 0; i <= n; i++) { const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n; B(0.1, 0.62, 0.1, fenceWood, x, heightAt(x, z) + 0.31, z); }
    for (const y of [0.26, 0.5]) B(0.05, 0.06, len, fenceWood, (ax + bx) / 2, heightAt((ax + bx) / 2, (az + bz) / 2) + y, (az + bz) / 2, ry);
  };
  fence(-6.75, TERR.z1 - 0.12, STAIRS.x0 - 0.05, TERR.z1 - 0.12);
  fence(STAIRS.x1 + 0.05, TERR.z1 - 0.12, TERR.x1 - 0.12, TERR.z1 - 0.12);
  fence(TERR.x1 - 0.12, TERR.z1 - 0.12, TERR.x1 - 0.12, -6.75);

  // ---------- Agua: estanque, arroyo, cascada que cae por el acantilado ----------
  const pondTex = waterTex(false), streamTex = waterTex(true), fallTex = waterTex(true);
  streamTex.repeat.set(2, 1); fallTex.repeat.set(1, 3);
  const waterMat = new THREE.MeshLambertMaterial({ map: pondTex, transparent: true, opacity: 0.92 });
  { const w = new THREE.Mesh(new THREE.CircleGeometry(POND.r + 0.08, 28).rotateX(-Math.PI / 2), waterMat); w.position.set(POND.x, POND.y, POND.z); w.receiveShadow = true; add(w); }
  { const s = new THREE.Mesh(new THREE.PlaneGeometry(H - STREAM.x0 + 0.5, STREAM.w * 2 + 0.1).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: streamTex })); s.position.set((STREAM.x0 - 0.5 + H) / 2, POND.y - 0.01, STREAM.z); s.receiveShadow = true; add(s); }
  const fallMat = new THREE.MeshLambertMaterial({ map: fallTex, transparent: true, alphaMap: canvasTexture(4, 32, (g) => { const gr = g.createLinearGradient(0, 0, 0, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(0.7, '#ccc'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, 4, 32); }) });
  { const f = new THREE.Mesh(new THREE.PlaneGeometry(STREAM.w * 2, 6.2), fallMat); f.rotation.y = Math.PI / 2; f.position.set(H + 0.03, POND.y - 3.1, STREAM.z); add(f);
    const foam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, STREAM.w * 2 + 0.1), mat('#e8f6fb')); foam.position.set(H - 0.05, POND.y, STREAM.z); add(foam); }
  for (let k = 0; k < 26; k++) {                                       // piedras en la orilla
    const a = k / 26 * Math.PI * 2, r = POND.r + 0.12 + rnd() * 0.15, x = POND.x + Math.cos(a) * r, z = POND.z + Math.sin(a) * r;
    if (inStream(x, z)) continue;
    const s = 0.14 + rnd() * 0.14; B(s * 1.4, s, s * 1.2, stone, x, -0.04, z, rnd() < 0.5 ? 0 : Math.PI / 2);
  }
  // Puente de madera sobre el arroyo
  const plank = mapMat(plankTex('#9c6a3c'));
  for (let i = 0; i < 9; i++) { const z = BRIDGE.z0 + 0.09 + i * (BRIDGE.z1 - BRIDGE.z0 - 0.18) / 8; B(BRIDGE.x1 - BRIDGE.x0, 0.07, 0.16, plank, (BRIDGE.x0 + BRIDGE.x1) / 2, heightAt(6.4, z) - 0.04, z); }
  for (const x of [BRIDGE.x0 + 0.04, BRIDGE.x1 - 0.04]) {
    for (const z of [BRIDGE.z0, (BRIDGE.z0 + BRIDGE.z1) / 2, BRIDGE.z1]) B(0.08, 0.7, 0.08, fenceWood, x, heightAt(6.4, z) + 0.3, z);
    B(0.06, 0.06, BRIDGE.z1 - BRIDGE.z0, fenceWood, x, BRIDGE.y + 0.62, (BRIDGE.z0 + BRIDGE.z1) / 2);
  }

  // ---------- La casa: paredes de cal con entramado, tejado de tejas, chimenea, ventanas que se encienden ----------
  const plaster = mapMat(noiseTex(['#efe6d2', '#e6dcc6', '#f4ecdb'], 8)), beam = mat('#5b3b24');
  const hx = (HOUSE.x0 + HOUSE.x1) / 2, hz = (HOUSE.z0 + HOUSE.z1) / 2, hw = HOUSE.x1 - HOUSE.x0, hd = HOUSE.z1 - HOUSE.z0, W = HOUSE.wall;
  B(hw + 0.2, 0.3, hd + 0.2, stone, hx, 0.13, hz);                              // zócalo de piedra
  B(hw, W, hd, plaster, hx, W / 2 + 0.25, hz);
  for (const [x, z] of [[HOUSE.x0, HOUSE.z1], [HOUSE.x1, HOUSE.z1], [HOUSE.x1, HOUSE.z0], [HOUSE.x0, HOUSE.z0]]) B(0.14, W, 0.14, beam, x, W / 2 + 0.25, z);
  B(hw + 0.06, 0.12, 0.06, beam, hx, 1.3, HOUSE.z1 + 0.02); B(0.06, 0.12, hd + 0.06, beam, HOUSE.x1 + 0.02, 1.3, hz);
  const roof = mapMat(roofTex()), RISE = 1.35, overhang = 0.35;
  const slope = Math.hypot(hd / 2 + overhang, RISE), ang = Math.atan2(RISE, hd / 2 + overhang);
  for (const s of [1, -1]) {
    const m = box(hw + 0.7, 0.14, slope, roof); m.position.set(hx, W + 0.25 + RISE / 2, hz + s * (hd / 4 + overhang / 2)); m.rotation.x = s * ang; keep(m);
  }
  const gable = new THREE.Shape([new THREE.Vector2(-hd / 2, 0), new THREE.Vector2(hd / 2, 0), new THREE.Vector2(0, RISE)]);   // el hastial triangular a cada lado
  for (const x of [HOUSE.x0, HOUSE.x1]) { const g = new THREE.Mesh(new THREE.ShapeGeometry(gable), plaster); g.rotation.y = Math.PI / 2; g.position.set(x + (x > hx ? 0.001 : -0.001), W + 0.25, hz); g.material.side = THREE.DoubleSide; keep(g); }
  B(0.42, 1.6, 0.42, stone, HOUSE.x0 + 0.55, W + 1.3, HOUSE.z0 + 0.65);       // chimenea
  B(0.62, 1.55, 0.08, mapMat(plankTex('#6e4325')), 1.1, 0.25 + 0.78, HOUSE.z1 + 0.03);   // puerta
  B(0.05, 0.05, 0.05, mat('#e1b44a'), 1.3, 1.0, HOUSE.z1 + 0.08);
  const windowMat = new THREE.MeshBasicMaterial({ color: '#2a3442' });
  const win = (x, y, z, ry) => { const g = new THREE.Group(); const f = box(0.62, 0.62, 0.06, beam); g.add(f); const p = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.07), windowMat); g.add(p); const bar = box(0.04, 0.48, 0.08, beam); g.add(bar); const sill = box(0.7, 0.06, 0.16, beam); sill.position.set(0, -0.33, 0.05); g.add(sill); g.position.set(x, y, z); g.rotation.y = ry; keep(g); };
  win(0.15, 1.45, HOUSE.z1 + 0.02, 0); win(2.05, 1.45, HOUSE.z1 + 0.02, 0); win(HOUSE.x1 + 0.02, 1.45, hz, Math.PI / 2);
  for (const x of [0.15, 2.05]) for (let k = 0; k < 5; k++) B(0.1, 0.1, 0.1, mat(['#ff7a6b', '#ffd23f', '#f2f0e6'][k % 3]), x - 0.25 + k * 0.12, 1.17, HOUSE.z1 + 0.14);   // flores en las jardineras
  // Banco del porche, farol y leña junto a la puerta
  B(1.0, 0.08, 0.34, plank, 2.15, 0.44, HOUSE.z1 + 0.32); for (const x of [1.72, 2.58]) B(0.06, 0.42, 0.3, beam, x, 0.21, HOUSE.z1 + 0.32);
  for (let k = 0; k < 6; k++) B(0.5, 0.15, 0.15, mat(k % 2 ? '#8a5a32' : '#7a4d2a'), -0.05 + (k % 2) * 0.05, 0.08 + Math.floor(k / 2) * 0.15, HOUSE.z1 + 0.25 + (k % 3) * 0.02, Math.PI / 2);
  B(0.5, 0.75, 0.5, mapMat(plankTex('#7b5230')), 3.0, 0.38, -3.3);           // barril de agua para la regadera
  B(0.52, 0.04, 0.52, mat('#3f8fb5'), 3.0, 0.76, -3.3);

  // ---------- Cobertizo de leña contra la terraza ----------
  const sx = (SHED.x0 + SHED.x1) / 2, sz = (SHED.z0 + SHED.z1) / 2;
  for (const [x, z] of [[SHED.x0 + 0.08, SHED.z1 - 0.08], [SHED.x1 - 0.08, SHED.z1 - 0.08]]) B(0.12, 1.75, 0.12, beam, x, 0.88, z);
  { const r = box(SHED.x1 - SHED.x0 + 0.4, 0.12, SHED.z1 - SHED.z0 + 0.5, roof); r.position.set(sx, 1.85, sz + 0.05); r.rotation.x = 0.28; keep(r); }
  for (let row = 0; row < 4; row++) for (let k = 0; k < 6; k++) B(0.22, 0.2, 0.7, mat(['#8a5a32', '#7a4d2a', '#96643a'][(row + k) % 3]), SHED.x0 + 0.25 + k * 0.23, 0.11 + row * 0.2, SHED.z0 + 0.45);
  B(0.42, 0.42, 0.42, mat('#7a4d2a'), -4.7, 0.21, -0.85);                       // tocón para partir leña
  B(0.36, 0.04, 0.36, mat('#c49a6c'), -4.7, 0.43, -0.85);

  // ---------- Huerto: dos bancales con filas de verduras ----------
  const soil = mapMat(noiseTex(['#5a3e28', '#4d3422', '#664730'], 8));
  for (const [x0, x1, z0, z1] of BEDS) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    B(w, 0.28, d, plank, cx, 0.14, cz); B(w - 0.12, 0.04, d - 0.12, soil, cx, 0.29, cz);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) {
      const x = x0 + 0.2 + k * (w - 0.4) / 3, z = z0 + 0.22 + r * (d - 0.44) / 2, kind = (r + (x0 > 0 ? 1 : 0)) % 3;
      if (kind === 0) { B(0.16, 0.16, 0.16, mat('#4f9233'), x, 0.4, z); B(0.12, 0.1, 0.12, mat('#e2532d'), x, 0.5, z); }        // tomates
      else if (kind === 1) { B(0.22, 0.12, 0.22, mat('#6fb544'), x, 0.36, z, 0.6); }                                              // lechugas
      else { B(0.06, 0.2, 0.06, mat('#5aa33a'), x, 0.42, z); B(0.08, 0.06, 0.08, mat('#f08a24'), x, 0.31, z); }                  // zanahorias
    }
  }

  // ---------- Hoguera, troncos para sentarse, farolas ----------
  for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; B(0.18, 0.14, 0.16, stone, FIRE.x + Math.cos(a) * 0.42, 0.07, FIRE.z + Math.sin(a) * 0.42, a); }
  for (const a of [0.3, 0.3 + Math.PI * 0.62, 0.3 + Math.PI * 1.3]) B(0.8, 0.3, 0.28, mat('#7a4d2a'), FIRE.x + Math.cos(a) * 1.2, 0.15, FIRE.z + Math.sin(a) * 1.2, -a + Math.PI / 2);
  for (const [x, z] of [[1.0, -0.4], [5.6, -1.9]]) {
    B(0.08, 1.8, 0.08, mat('#2b2b2b'), x, 0.9, z); B(0.26, 0.04, 0.26, mat('#2b2b2b'), x, 1.98, z);
  }
  const lampGlass = new THREE.MeshBasicMaterial({ color: '#3b3b3b' });
  for (const [x, z] of [[1.0, -0.4], [5.6, -1.9]]) { const g = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.18), lampGlass); g.position.set(x, 1.86, z); add(g); }
  const flames = new THREE.Group(); flames.position.set(FIRE.x, 0.08, FIRE.z); add(flames);
  for (let k = 0; k < 3; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.16 - k * 0.04, 0.3, 0.16 - k * 0.04), new THREE.MeshBasicMaterial({ color: ['#ff6a1a', '#ffa62b', '#ffe066'][k] })); f.position.y = 0.15 + k * 0.05; flames.add(f); }
  for (let k = 0; k < 4; k++) B(0.5, 0.08, 0.08, mat('#3b2a1c'), FIRE.x, 0.06, FIRE.z, k * 0.8);

  // ---------- La oficina al aire libre ----------
  const wood = mapMat(noiseTex(['#b98352', '#a87447', '#c38c59'], 8));
  const slots = [];                                    // sitios donde hacer algo: { kind, x, z, face, seat?, from?, by }
  const desk = (x, z, r) => {
    const g = new THREE.Group();
    const top = box(1.3, 0.06, 0.66, wood); top.position.y = 0.74; g.add(top);
    for (const [lx, lz] of [[-0.58, -0.27], [0.58, -0.27], [-0.58, 0.27], [0.58, 0.27]]) { const l = box(0.05, 0.74, 0.05, mat('#3b3b3b')); l.position.set(lx, 0.37, lz); g.add(l); }
    const base = box(0.4, 0.025, 0.28, mat('#30343c')); base.position.set(0, 0.785, 0.08); g.add(base);
    const scr = box(0.4, 0.26, 0.02, mat('#30343c')); scr.position.set(0, 0.92, -0.06); scr.rotation.x = -0.2; g.add(scr);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.2), new THREE.MeshBasicMaterial({ color: '#8fd0ff' })); glow.position.set(0, 0.92, -0.045); glow.rotation.x = -0.2; g.add(glow);
    const mug = box(0.07, 0.09, 0.07, mat('#e7e2d6')); mug.position.set(0.45, 0.82, 0.15); g.add(mug);
    keep(at(g, x, z, heightAt(x, z), r));
  };
  const chair = (x, z, r) => {
    const g = new THREE.Group();
    const seat = box(0.42, 0.06, 0.42, mat('#2f3a52')); seat.position.y = 0.45; g.add(seat);
    const back = box(0.42, 0.42, 0.06, mat('#2f3a52')); back.position.set(0, 0.7, 0.2); g.add(back);
    const post = box(0.05, 0.42, 0.05, mat('#333333')); post.position.y = 0.21; g.add(post);
    keep(at(g, x, z, heightAt(x, z), r));
  };
  const DX = -3.9;
  [[2.0, Math.PI], [2.66, 0]].forEach(([z, r]) => {
    desk(DX, z, r);
    const out = r ? -1 : 1, cz = z + out * 0.62;
    chair(DX, cz, r);
    slots.push({ kind: 'desk', x: DX, z: cz, face: r ? 0 : Math.PI, seat: 0.48, from: [DX, cz + out * 0.55] });
  });
  // Pizarra con notas de colores
  const BX = -1.5, BZ = 4.8, BR = Math.PI / 5;
  { const g = new THREE.Group();
    const p = box(1.6, 1.0, 0.05, mat('#f4f4ef')); p.position.y = 1.25; g.add(p);
    for (const x of [-0.72, 0.72]) { const l = box(0.05, 1.75, 0.05, mat('#3b3b3b')); l.position.set(x, 0.88, 0); g.add(l); }
    ['#ffd23f', '#ff7fa3', '#8fd0ff', '#9fe07a', '#ffd23f', '#ff7fa3'].forEach((c, i) => { const n = box(0.18, 0.18, 0.02, mat(c)); n.position.set(-0.5 + (i % 3) * 0.32, 1.42 - Math.floor(i / 3) * 0.3, 0.035); g.add(n); });
    keep(at(g, BX, BZ, heightAt(BX, BZ), BR)); }
  const bnx = Math.sin(BR), bnz = Math.cos(BR), btx = Math.cos(BR), btz = -Math.sin(BR);
  for (const side of [-0.45, 0.45]) slots.push({ kind: 'board', x: BX + bnx * 0.95 + btx * side, z: BZ + bnz * 0.95 + btz * side, face: Math.atan2(-bnx, -bnz) });
  // Mesa del café
  { const g = new THREE.Group();
    const t = box(0.7, 0.05, 0.7, mat('#e7e2d6')); t.position.y = 0.95; g.add(t);
    const l = box(0.08, 0.95, 0.08, mat('#3b3b3b')); l.position.y = 0.47; g.add(l);
    const urn = box(0.2, 0.3, 0.2, mat('#c0392b')); urn.position.set(-0.12, 1.13, 0); g.add(urn);
    keep(at(g, -1.7, 1.75)); }
  slots.push({ kind: 'coffee', x: -2.4, z: 1.75, face: Math.PI / 2 }, { kind: 'coffee', x: -1.7, z: 2.45, face: Math.PI });
  // Bancos: uno junto a la oficina y otro arriba, mirando la isla
  const bench = (x, z, ry) => {
    const g = new THREE.Group();
    const seat = box(1.6, 0.08, 0.4, plank); seat.position.y = 0.42; g.add(seat);
    const back = box(1.6, 0.36, 0.06, plank); back.position.set(0, 0.68, -0.2); g.add(back);
    for (const bx of [-0.7, 0.7]) { const l = box(0.06, 0.42, 0.36, mat('#2b2b2b')); l.position.set(bx, 0.21, 0); g.add(l); }
    keep(at(g, x, z, heightAt(x, z), ry));
  };
  bench(-6.0, 0.6, Math.PI / 2);
  for (const z of [0.25, 0.95]) slots.push({ kind: 'read', x: -6.0, z, face: Math.PI / 2, seat: 0.46, from: [-5.35, z] });
  bench(-4.4, -6.3, 0);
  for (const x of [-4.8, -4.0]) slots.push({ kind: 'lookout', x, z: -6.3, face: 0, seat: 0.46, from: [x, -5.7] });
  // Colmenas en la terraza
  for (const [x, z] of [[-6.2, -4.7], [-5.5, -5.5]]) {
    B(0.5, 0.12, 0.5, mat('#6b4a2c'), x, TERR.h + 0.06, z);
    for (let k = 0; k < 3; k++) B(0.46, 0.2, 0.46, mat(k % 2 ? '#f2d58a' : '#e8c46a'), x, TERR.h + 0.22 + k * 0.2, z);
    B(0.56, 0.08, 0.56, mat('#9b4a2c'), x, TERR.h + 0.86, z);
  }
  slots.push({ kind: 'hives', x: -5.3, z: -4.3, face: Math.atan2(-0.6, -0.3) }, { kind: 'hives', x: -4.7, z: -5.3, face: -Math.PI / 2 });

  // ---------- Árboles con volumen (copas de cubitos, como en pixel art; nada de facetas), pinos, arbustos, rocas, setas y flores ----------
  const trunkMat = mat('#6b4528');
  const trees = [];                                    // { x, z, r, sway: grupo que se mece }
  const V = 0.2;                                        // lado del cubito: unos 4-5 píxeles a pantalla completa
  function tree(x, z, s, kind = 'oak') {
    const y = heightAt(x, z), sway = new THREE.Group(); sway.position.set(x, y, z); add(sway);
    let crown;
    if (kind === 'pine') {
      const t = box(0.22 * s, 1.0 * s, 0.22 * s, trunkMat); t.position.y = 0.5 * s; sway.add(t);
      const cells = new Map(), Hh = Math.round(3.4 * s / V), R = 1.15 * s / V, tier = Math.max(3, Math.round(0.6 * s / V));
      for (let j = 0; j < Hh; j++) {                                 // pisos que se estrechan hacia arriba, con el borde en escalón
        const step = 1 - (j % tier) / tier * 0.45, r = R * (1 - j / Hh) * step + 0.6;
        for (let i = -Math.ceil(R); i <= Math.ceil(R); i++) for (let k = -Math.ceil(R); k <= Math.ceil(R); k++) if (Math.hypot(i, k) < r - rnd() * 0.5) cells.set(`${i},${j},${k}`, PINE_LEAF(j / Hh, rnd()));
      }
      crown = new THREE.Mesh(voxels(cells, V), VOX); crown.position.set(-V / 2, 0.85 * s, -V / 2);
    } else {
      const t = box(0.28 * s, 1.5 * s, 0.28 * s, trunkMat); t.position.y = 0.75 * s; sway.add(t);
      for (const [rx, rz, ry] of [[-0.3, 0.1, 0], [0.35, -0.1, Math.PI / 2], [0, 0.32, 0]]) { const r = box(0.12 * s, 0.1 * s, 0.4 * s, trunkMat); r.position.set(rx * s, 0.05, rz * s); r.rotation.y = ry; sway.add(r); }
      const n = kind === 'round' ? 3 : 6, spheres = [];
      for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2 + rnd(), rr = (kind === 'round' ? 0.25 : 0.55) * s;
        spheres.push([Math.cos(a) * rr, (1.75 + rnd() * 0.5) * s, Math.sin(a) * rr, (kind === 'round' ? 0.62 : 0.78) * s * (0.85 + rnd() * 0.3)]);
      }
      spheres.push([0, (kind === 'round' ? 2.3 : 2.45) * s, 0, (kind === 'round' ? 0.6 : 0.8) * s]);
      crown = new THREE.Mesh(blob(spheres, V, LEAF), VOX);
    }
    crown.castShadow = crown.receiveShadow = true; sway.add(crown);
    trees.push({ x, z, r: (kind === 'pine' ? 0.25 : 0.32) * s, sway, s, phase: rnd() * 6 });
  }
  [[-6.2, -6.2, 1.25, 'oak'], [-2.3, -6.4, 0.95, 'oak'], [-3.4, -4.6, 0.7, 'round'], [3.7, -6.5, 1.05, 'oak'], [6.4, -6.4, 1.0, 'pine'], [6.35, -0.7, 0.95, 'oak'],
   [6.2, 4.6, 1.25, 'oak'], [4.4, 6.35, 0.85, 'pine'], [-6.3, 6.2, 1.0, 'pine'], [-6.45, 3.0, 0.9, 'oak'], [-0.8, 6.4, 0.85, 'oak'], [-0.2, 3.1, 0.62, 'round'], [0.9, 3.7, 0.58, 'round'],
   [5.9, 2.7, 0.65, 'round'], [2.9, 6.5, 0.6, 'round'], [-5.6, -6.6, 0.8, 'pine']]
    .forEach(([x, z, s, k]) => tree(x, z, s, k));
  // Arbustos (con alguna flor encima), rocas, setas
  const BLOOM = ['#ff7a6b', '#ffd23f', '#f2f0e6', '#c9a2ff', '#ff9fd0'];
  for (const [x, z, s] of [[-2.4, 6.5, 0.5], [3.5, 4.8, 0.45], [6.5, 1.6, 0.4], [-6.5, 1.6, 0.4], [-2.1, -3.4, 0.45], [-6.6, -3.4, 0.4], [3.4, -2.2, 0.35], [0.3, 1.5, 0.35]]) {
    const y = heightAt(x, z), bloom = BLOOM[Math.floor(rnd() * BLOOM.length)];
    const spheres = [0, 1, 2].map(() => [(rnd() - 0.5) * s, s * 0.45, (rnd() - 0.5) * s, s * (0.7 + rnd() * 0.4)]);
    const m = new THREE.Mesh(blob(spheres, V * 0.8, (h, r) => (h > 0.75 && r < 0.12 ? bloom : LEAF(h, r)), { flat: 0 }), VOX);
    m.position.set(x, y - 0.02, z); m.castShadow = m.receiveShadow = true; keep(m);
  }
  for (const [x, z, s] of [[-4.8, 6.6, 0.4], [2.2, -0.2, 0.25], [5.3, 5.6, 0.3], [-2.8, -5.3, 0.35], [6.6, 3.6, 0.3], [-0.6, -1.0, 0.2]]) { const y = heightAt(x, z); B(s * 1.5, s, s * 1.2, stone, x, y + s / 2 - 0.05, z, rnd() < 0.5 ? 0 : Math.PI / 2); B(s * 0.8, s * 0.5, s * 0.7, stone, x + s * 0.3, y + s * 1.1 - 0.05, z - s * 0.1); }
  for (const [x, z] of [[-5.9, -6.0], [-6.0, 2.5], [5.9, 4.2], [-1.0, 6.0], [3.4, -6.0]]) { const y = heightAt(x, z); B(0.04, 0.1, 0.04, mat('#f2ead8'), x, y + 0.05, z); B(0.14, 0.06, 0.14, mat('#c8322f'), x, y + 0.12, z); }
  // Flores con volumen (instancias: miles de piezas en una sola llamada)
  {
    const FC = ['#f2f0e6', '#ffd23f', '#ff7a6b', '#c9a2ff', '#ff9fd0', '#e2532d'];
    const n = 900, flower = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), new THREE.MeshLambertMaterial(), n), stems = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.16, 0.03), mat('#3f7a2a'), n);
    const m4 = new THREE.Matrix4(); let k = 0;
    const PATCHES = [[-4.5, -3.6, 1.2], [-6.0, -3.3, 0.8], [-2.6, -5.0, 0.9], [-5.6, 2.0, 1.0], [1.0, 5.2, 1.0], [4.9, 4.3, 1.1], [5.5, -0.8, 0.8], [-2.9, 3.6, 0.6], [2.6, -2.9, 0.5], [-1.3, -1.8, 0.4], [6.0, -5.9, 0.6]];
    while (k < n) {
      const [px, pz, pr] = PATCHES[k % PATCHES.length], a = rnd() * 6.28, r = Math.sqrt(rnd()) * pr, x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r;
      if (pathDist(x, z) < 0.45 || pondDist(x, z) < POND.r + 0.3 || onStairs(x, z) || Math.abs(x) > H - 0.2 || Math.abs(z) > H - 0.2) { m4.makeScale(0, 0, 0); flower.setMatrixAt(k, m4); stems.setMatrixAt(k, m4); k++; continue; }
      const y = heightAt(x, z), h = 0.08 + rnd() * 0.1;
      m4.makeTranslation(x, y + h, z); flower.setMatrixAt(k, m4); flower.setColorAt(k, new THREE.Color(FC[Math.floor(rnd() * FC.length)]));
      m4.makeTranslation(x, y + h / 2, z); stems.setMatrixAt(k, m4); k++;
    }
    flower.castShadow = true; add(flower); add(stems);
  }

  // ---------- Juntar lo estático ----------
  for (const [material, { list }] of statics) {
    const merged = new THREE.Mesh(mergeGeometries(list, false), material);
    merged.castShadow = merged.receiveShadow = true; add(merged);
    list.forEach((g) => g.dispose());
  }

  // ---------- Mapa para andar: rejilla de 20 cm con lo que estorba marcado ----------
  const G = 0.2, EDGE = H - 0.32, N = Math.round((EDGE * 2) / G) + 1;
  const blocked = new Uint8Array(N * N);
  const cell = (v) => clamp(Math.round((v + EDGE) / G), 0, N - 1);
  const cx = (i) => -EDGE + i * G;
  const isBlocked = (x, z) => Math.abs(x) > EDGE || Math.abs(z) > EDGE || blocked[cell(z) * N + cell(x)];
  const block = (test) => { for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (test(cx(i), cx(j))) blocked[j * N + i] = 1; };
  const rect = (x0, x1, z0, z1, pad = 0.2) => block((x, z) => x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad);
  const round = (x0, z0, r) => block((x, z) => Math.hypot(x - x0, z - z0) < r);
  block((x, z) => (pondDist(x, z) < POND.r + 0.25 || inStream(x, z)) && !onBridge(x, z));
  block((x, z) => {                                                   // el borde de la terraza, menos las escaleras
    const nearEdge = (Math.abs(z - TERR.z1) < 0.3 && x < TERR.x1 + 0.3) || (Math.abs(x - TERR.x1) < 0.3 && z < TERR.z1 + 0.3);
    const stairs = x > STAIRS.x0 + 0.08 && x < STAIRS.x1 - 0.08 && z > STAIRS.zTop - 0.4 && z < STAIRS.zBot + 0.4;
    const stairSide = z > STAIRS.zTop && z < STAIRS.zBot && x > STAIRS.x0 - 0.3 && x < STAIRS.x1 + 0.3 && !stairs;
    return (nearEdge && !stairs) || stairSide;
  });
  block((x, z) => x > BRIDGE.x0 - 0.3 && x < BRIDGE.x1 + 0.3 && z > BRIDGE.z0 - 0.05 && z < BRIDGE.z1 + 0.05 && !(x > BRIDGE.x0 + 0.12 && x < BRIDGE.x1 - 0.12));
  rect(HOUSE.x0, HOUSE.x1, HOUSE.z0, HOUSE.z1, 0.25); rect(SHED.x0, SHED.x1, SHED.z0, SHED.z0 + 0.7, 0.15);
  round(-4.7, -0.85, 0.35); round(3.0, -3.3, 0.4);
  for (const [x0, x1, z0, z1] of BEDS) rect(x0, x1, z0, z1, 0.14);
  rect(DX - 0.65, DX + 0.65, 1.67, 2.99, 0.12); round(DX, 1.38, 0.28); round(DX, 3.28, 0.28);
  block((x, z) => { const t = clamp((x - BX) * btx + (z - BZ) * btz, -0.8, 0.8); return Math.hypot(x - BX - btx * t, z - BZ - btz * t) < 0.25; });
  round(-1.7, 1.75, 0.5); rect(-6.25, -5.75, -0.2, 1.4, 0.05); rect(-5.2, -3.6, -6.55, -6.1, 0.1);
  round(FIRE.x, FIRE.z, 0.65);
  for (const a of [0.3, 0.3 + Math.PI * 0.62, 0.3 + Math.PI * 1.3]) round(FIRE.x + Math.cos(a) * 1.2, FIRE.z + Math.sin(a) * 1.2, 0.3);
  round(1.0, -0.4, 0.2); round(5.6, -1.9, 0.2); round(-6.2, -4.7, 0.42); round(-5.5, -5.5, 0.42);
  for (const t of trees) round(t.x, t.z, t.r + 0.15);
  const free = (x, z) => !isBlocked(x, z);
  const offPath = new Uint8Array(N * N); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) offPath[j * N + i] = pathDist(cx(i), cx(j)) < 0.35 ? 0 : 1;

  // Buscar camino: A* con un montículo (rápido aunque el mapa sea grande) y atajos en línea recta cuando no hay nada en medio
  const clearLine = (ax, az, bx, bz) => {
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.08);
    for (let k = 1; k < n; k++) if (isBlocked(ax + (bx - ax) * k / n, az + (bz - az) * k / n)) return false;
    return true;
  };
  const cost = new Float32Array(N * N), prev = new Int32Array(N * N), done = new Uint8Array(N * N);
  function findPath(sx, sz, gx, gz) {
    const start = cell(sz) * N + cell(sx), goal = cell(gz) * N + cell(gx);
    cost.fill(Infinity); prev.fill(-1); done.fill(0);
    const heap = [], push = (c, f) => { heap.push([f, c]); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top[1]; };
    const h = (c) => Math.hypot(c % N - goal % N, Math.floor(c / N) - Math.floor(goal / N));
    cost[start] = 0; push(start, h(start));
    while (heap.length) {
      const c = pop();
      if (c === goal) break;
      if (done[c]) continue; done[c] = 1;
      const ci = c % N, cj = Math.floor(c / N);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= N || j >= N) continue;
        const n = j * N + i; if (blocked[n] && n !== goal) continue;
        if (di && dj && (blocked[cj * N + i] || blocked[j * N + ci])) continue;
        const nc = cost[c] + (di && dj ? 1.414 : 1) + offPath[n] * 0.35;   // prefieren ir por el camino de losas
        if (nc < cost[n]) { cost[n] = nc; prev[n] = c; push(n, nc + h(n)); }
      }
    }
    if (prev[goal] < 0 && goal !== start) return [[gx, gz]];
    const pts = []; for (let c = goal; c >= 0 && c !== start; c = prev[c]) pts.unshift([cx(c % N), cx(Math.floor(c / N))]);
    pts[pts.length - 1] = [gx, gz];
    const out = []; let ax = sx, az = sz;
    for (let k = 0; k < pts.length; k++) if (k === pts.length - 1 || !clearLine(ax, az, pts[k + 1][0], pts[k + 1][1]) || Math.abs(heightAt(ax, az) - heightAt(pts[k + 1][0], pts[k + 1][1])) > 0.5) { out.push(pts[k]); [ax, az] = pts[k]; }
    return out;
  }

  // ---------- Más sitios donde hacer cosas ----------
  slots.push({ kind: 'garden', x: 0.35, z: -1.4, face: Math.PI }, { kind: 'garden', x: 2.15, z: -1.4, face: Math.PI }, { kind: 'garden', x: 0.35, z: -3.0, face: 0 }, { kind: 'garden', x: 2.15, z: -3.0, face: 0 });
  slots.push({ kind: 'chop', x: -4.7, z: -0.3, face: Math.PI });
  slots.push({ kind: 'fish', x: 6.4, z: -4.3, face: -Math.PI / 2, y: BRIDGE.y + 0.12 }, { kind: 'fish', x: 5.4, z: -5.9, face: Math.atan2(POND.x - 5.4, POND.z + 5.9) });
  slots.push({ kind: 'ducks', x: 3.3, z: -2.75, face: Math.atan2(POND.x - 3.3, POND.z + 2.75) }, { kind: 'ducks', x: 4.6, z: -2.45, face: Math.PI });
  for (const a of [0.3, 0.3 + Math.PI * 0.62, 0.3 + Math.PI * 1.3]) {
    const x = FIRE.x + Math.cos(a) * 1.2, z = FIRE.z + Math.sin(a) * 1.2;
    slots.push({ kind: 'campfire', x, z, face: Math.atan2(FIRE.x - x, FIRE.z - z), seat: 0.36, from: [FIRE.x + Math.cos(a) * 1.7, FIRE.z + Math.sin(a) * 1.7] });
  }
  slots.push({ kind: 'stargaze', x: -4.4, z: -3.5, face: 0.4 }, { kind: 'stargaze', x: -2.6, z: -3.9, face: -0.3 });
  slots.push({ kind: 'porch', x: 1.95, z: HOUSE.z1 + 0.32, face: 0, seat: 0.46, from: [1.95, HOUSE.z1 + 0.9] }, { kind: 'porch', x: 2.4, z: HOUSE.z1 + 0.32, face: 0, seat: 0.46, from: [2.4, HOUSE.z1 + 0.9] });
  slots.push({ kind: 'shelter', x: -6.25, z: -1.65, face: 0.3 }, { kind: 'shelter', x: -5.75, z: -1.55, face: -0.2 });
  for (const [x, z] of HILLS) slots.push({ kind: 'hill', x, z, face: Math.PI / 4 + (rnd() - 0.5) });
  slots.push({ kind: 'tree', x: -6.0, z: 3.4, face: 0.9 }, { kind: 'tree', x: 5.75, z: 4.25, face: -2.4 }, { kind: 'tree', x: -0.6, z: 5.95, face: Math.PI });
  for (const [x, z, f] of [[-6.5, 1.8, -Math.PI / 2], [2.5, 6.55, 0], [6.55, 2.0, Math.PI / 2], [-4.8, -6.6, Math.PI], [6.5, -2.9, Math.PI / 2], [-2.4, 6.5, 0.2], [-2.2, -3.0, 0.6]]) slots.push({ kind: 'view', x, z, face: f });
  for (const [x, z] of [[0.3, 1.0], [-3.3, 0.9], [2.0, 2.0], [5.1, -2.6], [-0.9, 4.3], [-5.0, 3.3]]) slots.push({ kind: 'phone', x, z, face: rand() * 6.28 });
  const DOOR = { x: 1.1, z: HOUSE.z1 + 0.35 };
  slots.forEach((s) => { s.y = s.y ?? heightAt(s.x, s.z); });

  // ---------- Animales: un gato y dos patos ----------
  const cat = (() => {
    const g = new THREE.Group(), o = mat('#e08a3c'), w = mat('#f6e6d2');
    const body = box(0.18, 0.16, 0.42, o); body.position.y = 0.2; g.add(body);
    const head = new THREE.Group(); head.position.set(0, 0.32, 0.25); g.add(head);
    head.add(box(0.18, 0.15, 0.16, o)); for (const x of [-0.06, 0.06]) { const e = box(0.05, 0.07, 0.04, o); e.position.set(x, 0.1, 0); head.add(e); }
    const muzzle = box(0.08, 0.05, 0.03, w); muzzle.position.set(0, -0.03, 0.08); head.add(muzzle);
    const legs = [[-0.06, 0.15], [0.06, 0.15], [-0.06, -0.15], [0.06, -0.15]].map(([x, z]) => { const l = box(0.05, 0.13, 0.05, o); l.position.set(x, 0.07, z); g.add(l); return l; });
    const tail = box(0.04, 0.04, 0.3, o); tail.position.set(0, 0.3, -0.32); tail.rotation.x = 0.7; g.add(tail);
    add(g);
    return { g, body, head, legs, tail, x: 2.6, z: 1.2, yaw: 0, path: [], state: 'sit', until: 3, target: null };
  })();
  const ducks = [0, 1].map((i) => {
    const g = new THREE.Group(), b = box(0.24, 0.14, 0.34, mat(i ? '#f6f2e8' : '#8a6a44')); b.position.y = 0.06; g.add(b);
    const n = box(0.1, 0.14, 0.1, mat(i ? '#f6f2e8' : '#2f6a3e')); n.position.set(0, 0.16, 0.14); g.add(n);
    const bill = box(0.06, 0.04, 0.08, mat('#f2a12b')); bill.position.set(0, 0.17, 0.22); g.add(bill);
    add(g);
    return { g, a: i * 3, r: 0.6 + i * 0.35, dir: i ? 1 : -1, x: POND.x, z: POND.z, yaw: 0 };
  });

  // ---------- Cielo: nubes con volumen que pasan, lluvia, luciérnagas, mariposas, abejas, humo, Zzz ----------
  const cloudMat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#ffffff', emissiveIntensity: 0.3 });
  const CLOUD = (h, r) => (h < 0.3 ? (r < 0.5 ? '#dfe4f0' : '#e8ecf6') : h > 0.75 && r < 0.3 ? '#ffffff' : r < 0.15 ? '#f0f3fa' : '#fbfcff');
  const clouds = Array.from({ length: 7 }, (_, i) => {
    const n = 4 + Math.floor(rnd() * 3), spheres = [];                 // una fila de bultos, el del medio más alto, y otra fila detrás
    for (let k = 0; k < n; k++) { const mid = 1 - Math.abs(k - (n - 1) / 2) / n; spheres.push([(k - (n - 1) / 2) * 0.75 + (rnd() - 0.5) * 0.3, 0.15 + mid * 0.55 + rnd() * 0.2, (rnd() - 0.5) * 0.5, 0.5 + mid * 0.45 + rnd() * 0.2]); }
    for (let k = 0; k < n - 2; k++) spheres.push([(k - (n - 3) / 2) * 0.8, 0.3 + rnd() * 0.3, -0.6 + rnd() * 0.2, 0.55 + rnd() * 0.2]);
    const m = new THREE.Mesh(blob(spheres, 0.25, CLOUD, { flat: 0, rough: 0.08 }), cloudMat); m.castShadow = true;
    const g = new THREE.Group(); g.add(m);
    g.position.set(-16 + i * 5 + rnd() * 2, 7 + rnd() * 1.5, -8 + rnd() * 16); g.scale.setScalar(0.001); add(g);
    return { g, speed: 0.25 + rnd() * 0.15, size: 1.2 + rnd() * 0.7, k: 0 };
  });
  const RAIN_N = 700, rainGeo = new THREE.BufferGeometry(), rainPos = new Float32Array(RAIN_N * 6);
  const rainDrops = Array.from({ length: RAIN_N }, () => ({ x: (rnd() - 0.5) * 24, y: rnd() * 18 - 4, z: (rnd() - 0.5) * 24 }));
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.LineBasicMaterial({ color: '#cfe3f2', transparent: true, opacity: 0 });
  const rain = new THREE.LineSegments(rainGeo, rainMat); rain.frustumCulled = false; add(rain);
  const FLY_N = 46, flyGeo = new THREE.BufferGeometry(), flyPos = new Float32Array(FLY_N * 3), flyCol = new Float32Array(FLY_N * 3);
  const flies = Array.from({ length: FLY_N }, () => { let x, z; do { x = (rnd() - 0.5) * 12.5; z = (rnd() - 0.5) * 12.5; } while (pondDist(x, z) < POND.r); return { x, z, y: 0.4 + rnd() * 1.4, p: rnd() * 6.28, sp: 0.3 + rnd() * 0.5 }; });
  flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPos, 3)); flyGeo.setAttribute('color', new THREE.BufferAttribute(flyCol, 3));
  const fireflies = new THREE.Points(flyGeo, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0 })); fireflies.frustumCulled = false; add(fireflies);
  const BEE_N = 12, beeGeo = new THREE.BufferGeometry(), beePos = new Float32Array(BEE_N * 3);
  beeGeo.setAttribute('position', new THREE.BufferAttribute(beePos, 3));
  const bees = new THREE.Points(beeGeo, new THREE.PointsMaterial({ size: 1.5, sizeAttenuation: false, color: '#ffd23f', transparent: true, opacity: 1 })); bees.frustumCulled = false; add(bees);
  const butterflies = Array.from({ length: 5 }, (_, i) => {
    const g = new THREE.Group(), c = mat(['#ffffff', '#ffd23f', '#ff9fd0', '#8fd0ff', '#ffffff'][i], { side: THREE.DoubleSide });
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.1), c), r = l.clone(); l.position.x = -0.06; r.position.x = 0.06;
    const wl = new THREE.Group(), wr = new THREE.Group(); wl.add(l); wr.add(r); g.add(wl, wr); add(g);
    const home = [[-4.5, -3.6], [-5.6, 2.0], [1.0, 5.2], [4.9, 4.3], [-2.6, -5.0]][i];
    return { g, wl, wr, home, p: rnd() * 10 };
  });
  const SMOKE_N = 16, smokeMats = [], smoke = Array.from({ length: SMOKE_N }, () => { const m = new THREE.MeshLambertMaterial({ color: '#d8d4cc', transparent: true, opacity: 0 }); smokeMats.push(m); const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), m); add(b); return { b, m, life: 1, x: 0, y: 0, z: 0, src: 'chimney' }; });
  let smokeTimer = 0;
  const zTex = canvasTexture(8, 8, (g) => { g.fillStyle = '#fff'; g.fillRect(1, 1, 6, 1); g.fillRect(5, 2, 1, 1); g.fillRect(4, 3, 1, 1); g.fillRect(3, 4, 1, 1); g.fillRect(2, 5, 1, 1); g.fillRect(1, 6, 6, 1); });
  const zzz = Array.from({ length: 3 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: zTex, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); s.scale.setScalar(0.32); add(s); return { s, t: i / 3 }; });
  const ripples = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#d8f0f8', transparent: true, opacity: 0 })); add(m); return { m, life: 1 }; });
  const ripple = (x, z) => { const r = ripples.find((q) => q.life >= 1) || ripples[0]; r.life = 0; r.m.position.set(x, POND.y + 0.01, z); };

  // ---------- Las tres personas: cada una con su carácter ----------
  const NEEDS = ['energy', 'social', 'focus', 'fun', 'nature', 'food'];
  // Qué da cada actividad, cuánto dura, cuándo apetece (hora y tiempo)
  const night = (h) => h >= SUN.set + 0.6 || h < SUN.rise - 0.4;
  const evening = (h) => h >= SUN.set - 1.2 || h < 1;
  const daylight = (h) => h >= SUN.rise && h < SUN.set + 0.3;
  const ACT = {
    desk:     { len: [12, 24], give: { focus: 0.7 },                 when: (h, w) => (daylight(h) && !w.rain ? 1 : 0) },
    board:    { len: [8, 14],  give: { focus: 0.4, social: 0.3 },    when: (h, w) => (daylight(h) && !w.rain ? 1 : 0) },
    coffee:   { len: [6, 10],  give: { food: 0.5, social: 0.1 },     when: (h, w) => (h < 17 && h > SUN.rise - 1 ? (h < 11 ? 1.8 : 1) : 0.2) * (w.rain ? 0.3 : 1) },
    read:     { len: [10, 18], give: { fun: 0.3, energy: 0.2 },      when: (h, w) => (daylight(h) && !w.rain ? 1 : 0) },
    hill:     { len: [8, 14],  give: { nature: 0.4, fun: 0.2 },      when: (h, w) => (daylight(h) && !w.rain ? 1 : 0) },
    garden:   { len: [9, 15],  give: { nature: 0.6, food: 0.2 },     when: (h, w) => (daylight(h) ? (h < 11 || h > SUN.set - 2.5 ? 1.6 : 0.8) : 0) * (w.rain ? 0.15 : 1) },
    chop:     { len: [8, 14],  give: { focus: 0.3, fun: 0.2 },       when: (h, w) => (daylight(h) ? 1 : 0) * (w.rain ? 0.3 : 1) },
    hives:    { len: [6, 10],  give: { nature: 0.4, fun: 0.3 },      when: (h, w) => (daylight(h) && !w.rain ? (w.cloud > 0.5 ? 0.5 : 1) : 0) },
    fish:     { len: [16, 28], give: { fun: 0.6, nature: 0.3 },      when: (h, w) => (night(h) ? 0.15 : evening(h) || h < 10 ? 1.5 : 1) * (w.rain ? 0.5 : 1) },
    lookout:  { len: [8, 14],  give: { nature: 0.4, energy: 0.1 },   when: (h, w) => (w.rain ? 0 : evening(h) && !night(h) ? 3 : daylight(h) ? 0.8 : 0.3) },
    ducks:    { len: [6, 10],  give: { fun: 0.4, nature: 0.2 },      when: (h, w) => (daylight(h) ? 1 : 0) * (w.rain ? 0.2 : 1) },
    campfire: { len: [16, 28], give: { social: 0.5, fun: 0.4 },      when: (h, w) => (w.rain ? 0 : evening(h) ? 3 : 0) },
    stargaze: { len: [16, 26], give: { fun: 0.5, nature: 0.4 },      when: (h, w) => (night(h) && w.cloud < 0.4 ? 2.5 : 0) },
    porch:    { len: [10, 18], give: { energy: 0.3, social: 0.1 },   when: (h, w) => (w.rain ? 2.2 : evening(h) ? 0.8 : 0.2) },
    shelter:  { len: [8, 14],  give: { nature: 0.2 },                when: (h, w) => (w.rain ? 1.6 : 0) },
    home:     { len: [14, 26], give: { energy: 0.4, food: 0.4 },     when: (h, w) => (w.rain ? 1.4 : 0.15) },
    tree:     { len: [10, 18], give: { energy: 0.3, nature: 0.3 },   when: (h, w) => (daylight(h) && !w.rain ? 1 : 0) },
    view:     { len: [5, 9],   give: { nature: 0.3, fun: 0.1 },      when: (h, w) => (w.rain ? 0.2 : 1) },
    phone:    { len: [5, 10],  give: { social: 0.4 },                when: () => 1 },
    chat:     { len: [5, 9],   give: { social: 0.6, fun: 0.1 },      when: (h, w) => (w.rain ? 0.3 : 1) },
    cat:      { len: [4, 7],   give: { fun: 0.4 },                   when: () => 1 },
  };
  const DAY_WORK = new Set(['desk', 'board']);
  const LOOKS = [
    { shirt: '#c8322f', pants: '#2b3140', style: 'short', skin: '#8d5a3b', hair: '#111111', brolly: '#ffd23f',
      likes: { desk: 1.7, board: 1.3, coffee: 1.5, chop: 1.4, fish: 0.8, garden: 0.6, stargaze: 0.6, hives: 0.6 }, owl: 0.2, bed: 23.0, wake: 6.9 },
    { shirt: '#f2c230', pants: '#3a4a6b', style: 'long', shorts: true, skin: '#f1c7a5', hair: '#4a2f1d', brolly: '#c8322f',
      likes: { garden: 1.9, hives: 1.7, ducks: 1.5, lookout: 1.3, tree: 1.3, read: 1.2, desk: 0.8, chop: 0.6 }, owl: 0.15, bed: 22.6, wake: 7.2 },
    { shirt: '#f3f1ea', pants: '#1d1d1d', style: 'cap', sleeves: 'long', shoes: '#c8322f', skin: '#5b3726', hair: '#111111', brolly: '#2d4f9e',
      likes: { chat: 1.8, phone: 1.4, campfire: 1.7, stargaze: 1.8, fish: 1.5, cat: 1.6, view: 1.3, desk: 0.9 }, owl: 0.65, bed: 23.7, wake: 7.9 },
  ];
  const agents = LOOKS.map((look, i) => {
    const p = person(look); add(p);
    const needs = {}; NEEDS.forEach((n) => { needs[n] = 0.4 + rand() * 0.5; });
    return { i, p, look, needs, history: [], x: 0, z: 0, yaw: 0, state: 'act', slot: null, kind: 'idle', until: 0, path: [], t0: 0, seed: rand() * 6.28,
      talk: null, talkUntil: 0, carry: null, inside: false, asleep: false, owl: false, bed: look.bed + rand() * 0.5, wake: look.wake + rand() * 0.8 };
  });
  let t = 0;

  // ---------- Hora y tiempo ----------
  const state = { follow: true, preset: 1, weather: 0, auto: true, hour: madridNow() };
  const presetHour = (i) => [SUN.rise + 1.1, Math.max(13.2, SUN.noon - 0.3), SUN.set - 0.25, 23.6][i];
  const phaseOf = (h) => (night(h) ? 3 : h < SUN.rise + 3 ? 0 : h < SUN.set - 1.4 ? 1 : h < SUN.set + 0.6 ? 2 : 3);
  const logicHour = () => (state.follow ? state.hour : presetHour(state.preset));
  let shownHour = logicHour();                                       // la luz se acerca poco a poco a la hora elegida
  const sky = { cloud: 0, rain: 0 };
  const skyTarget = () => [{ cloud: 0.15, rain: 0 }, { cloud: 0.85, rain: 0 }, { cloud: 1, rain: 1 }][state.weather];
  let weatherClock = 120 + rand() * 120;
  const weatherNow = () => ({ rain: sky.rain > 0.35 || state.weather === 2, cloud: sky.cloud });
  const asleepTime = (a, h) => { const bed = a.bed >= 24 ? a.bed - 24 : a.bed; return a.bed < 24 ? (h >= bed || h < a.wake) : (h >= bed && h < a.wake); };

  // ---------- Decidir qué hacer ----------
  const span = (k) => ACT[k].len[0] + rand() * (ACT[k].len[1] - ACT[k].len[0]);
  const canTalk = (b) => b.state === 'act' && !b.inside && !b.talk && b.kind !== 'chat' && b.kind !== 'phone' && b.kind !== 'stargaze' && b.until - t > 3;
  function score(a, kind, h, w) {
    const A = ACT[kind]; let s = A.when(h, w); if (!s) return 0;
    let need = 0.15; for (const n in A.give) need += A.give[n] * (1 - a.needs[n]);
    const last = a.history.lastIndexOf(kind), ago = last < 0 ? 99 : a.history.length - 1 - last;
    const novelty = ago === 0 ? 0.04 : ago < 3 ? 0.3 : ago < 6 ? 0.7 : 1;   // lo que acaba de hacer, casi nunca
    if (DAY_WORK.has(kind) && a.needs.focus > 0.8) s *= 0.4;
    return s * need * (a.look.likes[kind] || 1) * novelty * (0.6 + rand() * 0.8);
  }
  function choose(a) {
    const h = logicHour(), w = weatherNow();
    release(a);
    if (a.next) { const n = a.next; a.next = null; go(a, n.x, n.z, n); return; }
    if (asleepTime(a, h) && !a.owl) { goHome(a, true); return; }
    const options = [];
    for (const kind in ACT) {
      if (a.owl && !['campfire', 'stargaze', 'lookout', 'view', 'cat', 'porch', 'fish'].includes(kind)) continue;
      if (kind === 'chat') { if (agents.some((b) => b !== a && canTalk(b))) options.push([kind, score(a, kind, h, w)]); continue; }
      if (kind === 'cat') { if (cat.state !== 'walk' && !cat.petted) options.push([kind, score(a, kind, h, w) * 0.6]); continue; }
      if (kind === 'home') { options.push([kind, score(a, kind, h, w)]); continue; }
      if (slots.some((s) => s.kind === kind && !s.by)) options.push([kind, score(a, kind, h, w)]);
    }
    const total = options.reduce((n, o) => n + o[1], 0);
    let kind = 'view';
    if (total > 0) { let r = rand() * total; for (const [k, s] of options) { if ((r -= s) <= 0) { kind = k; break; } } }
    a.history.push(kind); if (a.history.length > 8) a.history.shift();
    if (kind === 'home') { goHome(a, false); return; }
    if (kind === 'chat') {
      const others = agents.filter((b) => b !== a && canTalk(b)), b = pick(others);
      const spot = talkSpot(b.slot?.from ? b.slot.from[0] : b.x, b.slot?.from ? b.slot.from[1] : b.z, a);
      go(a, spot[0], spot[1], { kind: 'chat', with: b }); return;
    }
    if (kind === 'cat') { cat.petted = a; cat.state = 'sit'; cat.until = t + 30; const spot = talkSpot(cat.x, cat.z, a, 0.45); go(a, spot[0], spot[1], { kind: 'cat' }); return; }
    const list = slots.filter((s) => s.kind === kind && !s.by), s = pick(list);
    if (!s) { a.kind = 'idle'; a.state = 'act'; a.until = t + 1.5; return; }
    s.by = a; const target = s.from || [s.x, s.z];
    go(a, target[0], target[1], { kind, slot: s });
  }
  function talkSpot(bx, bz, a, dist = 0.7) {
    for (let k = 0; k < 12; k++) {
      const ang = Math.atan2(a.x - bx, a.z - bz) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.5;
      const x = bx + Math.sin(ang) * dist, z = bz + Math.cos(ang) * dist;
      if (free(x, z)) return [x, z];
    }
    return [bx + 0.5, bz + 0.5];
  }
  function release(a) { if (a.slot) a.slot.by = null; a.slot = null; if (cat.petted === a) cat.petted = null; }
  function go(a, x, z, plan) {
    a.plan = plan; if (plan.slot) a.slot = plan.slot;
    if (a.inside) { a.inside = false; a.asleep = false; a.p.visible = true; a.x = DOOR.x; a.z = DOOR.z; a.yaw = 0; }
    a.path = findPath(a.x, a.z, x, z); a.state = a.sitting ? 'standup' : 'walk'; a.blend = 0;
    if (a.carry && a.carry !== 'log') a.carry = null;
  }
  function goHome(a, sleep) { go(a, DOOR.x, DOOR.z, { kind: 'home', sleep }); }
  function arrive(a) {
    const { kind, slot } = a.plan;
    a.kind = kind; a.until = t + (ACT[kind] ? span(kind) : 2); a.t0 = t; a.variant = null;
    if (kind === 'deliver') { a.carry = null; a.state = 'act'; a.yawTo = Math.PI; a.until = t + 1.5; return; }
    if (kind === 'home') {                                             // entra en casa: de noche a dormir, de día a leer o a comer algo
      a.inside = true; a.p.visible = false; a.state = 'act'; a.carry = null;
      a.asleep = a.plan.sleep; a.until = a.plan.sleep ? Infinity : t + span('home');
      return;
    }
    if (kind === 'chat') {
      const b = a.plan.with;
      if (b.state === 'act' && !b.inside && !b.talk && b.kind !== 'chat') {
        b.talk = a; b.talkUntil = Math.max(b.talkUntil, a.until); b.until = Math.max(b.until, a.until + 1);
        a.talk = b; a.faceTo = b; a.wave = t;
      } else { a.kind = 'view'; a.until = t + 2; }
      a.state = 'act'; return;
    }
    if (kind === 'cat') { a.faceTo = cat; a.state = 'act'; return; }
    if (slot && slot.seat) { a.state = 'sitdown'; a.blend = 0; return; }
    a.yawTo = slot ? slot.face : a.yaw; a.state = 'act';
    if (kind === 'coffee') a.carry = 'cup';
    if (kind === 'hill') a.variant = pick(['sit', 'stretch', 'yoga', 'sit']);
    if (kind === 'garden') a.variant = !weatherNow().rain && (logicHour() < 11 || logicHour() > SUN.set - 2.5 || rand() < 0.4) ? 'water' : 'tend';
    if (kind === 'tree') a.variant = rand() < 0.5 ? 'read' : 'doze';
    if (kind === 'fish') a.bite = t + 4 + rand() * 6;
    if (kind === 'chop') { a.next = rand() < 0.6 ? { kind: 'deliver', x: 0.2, z: HOUSE.z1 + 0.65, carry: 'log' } : null; }
  }

  // Al empezar, cada uno ya está haciendo algo que encaja con la hora (así la primera imagen ya cuenta la historia)
  function settleAtStart() {
    const h = logicHour(), w = weatherNow();
    agents.forEach((a, i) => {
      release(a); a.state = 'act'; a.sitting = false; a.talk = null; a.carry = null; a.next = null;
      if (asleepTime(a, h)) { a.x = DOOR.x; a.z = DOOR.z; a.plan = { kind: 'home', sleep: true }; arrive(a); return; }
      a.inside = false; a.asleep = false; a.p.visible = true;
      const order = w.rain ? ['porch', 'shelter', 'home'] : evening(h) ? ['campfire', 'campfire', 'lookout'] : h < 11 ? ['coffee', 'garden', 'desk'] : ['desk', 'garden', 'board'];
      const kind = order[i];
      if (kind === 'home') { a.x = DOOR.x; a.z = DOOR.z; a.plan = { kind: 'home', sleep: false }; arrive(a); return; }
      const s = slots.find((x) => x.kind === kind && !x.by) || slots.find((x) => x.kind === 'view' && !x.by);
      s.by = a; a.slot = s; a.plan = { kind: s.kind, slot: s }; a.x = s.x; a.z = s.z; a.yaw = s.face; arrive(a);
      if (s.seat) { a.state = 'act'; a.sitting = true; a.yaw = s.face; }
      a.history.push(s.kind); a.until = t + 3 + rand() * 9;
    });
  }

  // ---------- Posturas ----------
  const SIT = { tl: -1.55, tr: -1.55, kl: 1.5, kr: 1.5 };
  const GROUND_SIT = { tl: -1.45, tr: -1.3, kl: 0.15, kr: 0.6, lift: -(HIP - 0.08) };
  const CROUCH = { tl: -1.9, tr: -1.6, kl: 2.3, kr: 2.0, sp: 0.45, lift: -(HIP * 0.5) };
  function pose(a) {
    const ph = t + a.seed, local = t - a.t0, P = {};
    const talking = a.talk && t < a.talkUntil;
    if (a.state === 'walk') {
      const s = Math.sin(t * 9 + a.seed);
      Object.assign(P, { tl: s * 0.55, tr: -s * 0.55, kl: Math.max(0, -s) * 0.7, kr: Math.max(0, s) * 0.7, al: -s * 0.45, ar: s * 0.45, el: -0.25, er: -0.25, sp: 0.06 });
      if (a.carry === 'cup') Object.assign(P, { ar: -0.35, er: -1.3 });
      if (a.carry === 'log') Object.assign(P, { al: -1.1, ar: -1.1, el: -0.9, er: -0.9 });
      P.lift = Math.abs(Math.cos(t * 9 + a.seed)) * 0.035;
      return P;
    }
    if (a.state === 'sitdown' || a.state === 'standup' || a.sitting) Object.assign(P, SIT);
    if (a.state !== 'act') return P;
    switch (a.kind) {
      case 'desk': {
        const rest = Math.sin(local * 0.35 + a.seed) > 0.82;
        if (rest) Object.assign(P, { al: -2.6, ar: -2.6, el: -2.3, er: -2.3, alz: 0.3, arz: 0.3, sp: -0.18, hx: -0.15 });
        else Object.assign(P, { al: -0.75 + Math.sin(ph * 14) * 0.07, ar: -0.75 + Math.sin(ph * 14 + 1.6) * 0.07, el: -0.75, er: -0.75, sp: 0.12, hx: 0.15 + Math.sin(ph * 0.9) * 0.05, hy: Math.sin(ph * 0.4) * 0.25 });
        break;
      }
      case 'board': {
        const mine = a.slot === slots.find((s) => s.kind === 'board');
        const other = slots.find((s) => s.kind === 'board' && s !== a.slot).by;
        const explaining = !other || other.state !== 'act' ? true : Math.floor((t + (mine ? 0 : 4)) / 4) % 2 === 0;
        if (explaining) Object.assign(P, { ar: -2.5 + Math.sin(ph * 2.2) * 0.25, er: -0.2, arz: 0.1, al: -0.2, hy: Math.sin(ph * 0.7) * 0.45, hx: -0.1 });
        else Object.assign(P, { al: -1.1, ar: -1.1, el: -1.4, er: -1.4, alz: -0.25, arz: -0.25, hx: Math.max(0, Math.sin(ph * 3)) * 0.2 });
        break;
      }
      case 'coffee': { const sip = Math.sin(local * 1.3) > 0.55; Object.assign(P, { ar: sip ? -1.0 : -0.35, er: sip ? -2.1 : -1.3, hx: sip ? -0.25 : 0.05, al: -0.1, hy: Math.sin(ph * 0.5) * 0.5 }); break; }
      case 'read': case 'porch': case 'lookout': {
        const phone = a.kind === 'read' ? Math.sin(local * 0.3 + a.seed) > 0.4 : false;
        if (a.kind === 'read' && !phone) { Object.assign(P, { al: -1.0, ar: -1.0, el: -1.2, er: -1.2, hx: 0.45, sp: 0.1 }); a.carry = 'book'; }
        else if (phone) { Object.assign(P, { ar: -0.9, er: -1.0, al: -0.8, el: -1.1, hx: 0.45, sp: 0.15 }); a.carry = 'phone'; }
        else Object.assign(P, { al: 0.35, ar: 0.35, el: -0.1, er: -0.1, sp: -0.2, hx: -0.15 + Math.sin(ph * 0.2) * 0.1, hy: Math.sin(ph * 0.3) * 0.6 });
        break;
      }
      case 'hill': {
        if (a.variant === 'sit') Object.assign(P, GROUND_SIT, { al: 0.7, ar: 0.7, el: -0.2, er: -0.2, sp: -0.3, hx: -0.25, hy: Math.sin(ph * 0.25) * 0.5 });
        else if (a.variant === 'yoga') { const w = Math.sin(local * 0.8) * 0.06; Object.assign(P, { al: -3.0, ar: -3.0, el: -0.1, er: -0.1, alz: -0.1, arz: -0.1, tl: -0.7, kl: 1.6, lift: 0.02, spy: w, hx: -0.15 }); }
        else { const w = Math.sin(local * 1.4); Object.assign(P, { al: -2.9, ar: -2.9, el: -0.3, er: -0.3, alz: 0.15 + w * 0.2, arz: 0.15 - w * 0.2, sp: -0.05, spy: w * 0.3, hx: -0.2 }); }
        break;
      }
      case 'phone': { Object.assign(P, { ar: -0.4, arz: 0.45, er: -2.5, al: -0.3 + Math.sin(ph * 1.7) * 0.4, el: -0.9, hy: Math.sin(ph * 0.6) * 0.5, hx: -0.05 }); a.carry = 'phone'; break; }
      case 'garden': {
        if (a.variant === 'water') { Object.assign(P, { ar: -1.15, er: -0.25, al: -0.2, sp: 0.15, hx: 0.35, hy: Math.sin(ph * 0.6) * 0.3 }); a.carry = 'can'; }
        else { const dig = Math.sin(ph * 5); Object.assign(P, CROUCH, { ar: -1.0 + dig * 0.25, er: -0.3, al: -0.8, el: -0.5, hx: 0.4 }); }
        break;
      }
      case 'chop': {
        const c = (local * 0.7) % 1, up = c < 0.6 ? smooth(0, 0.6, c) : 1 - smooth(0.6, 0.72, c);
        Object.assign(P, { ar: -0.5 - up * 2.5, al: -0.5 - up * 2.4, er: -0.2, el: -0.3, sp: 0.35 - up * 0.45, hx: 0.3 }); a.carry = 'axe';
        break;
      }
      case 'deliver': Object.assign(P, CROUCH, { al: -0.8, ar: -0.8 }); break;
      case 'hives': Object.assign(P, { alz: -0.35, arz: -0.35, al: -0.3, ar: -0.3, el: -1.2, er: -1.2, hx: -0.2 + Math.sin(ph * 1.5) * 0.25, hy: Math.sin(ph * 0.9) * 0.7 }); break;
      case 'fish': {
        const tug = a.bite && t > a.bite && t < a.bite + 1.6;
        Object.assign(P, { ar: tug ? -1.6 : -0.9, er: -0.5, al: tug ? -1.5 : -0.8, el: -0.7, sp: tug ? -0.2 : 0.05, hx: 0.2 });
        if (a.bite && t > a.bite + 1.6) { a.bite = t + 6 + rand() * 9; ripple(a.x + Math.sin(a.yaw) * 1.7, a.z + Math.cos(a.yaw) * 1.7); }
        a.carry = 'rod'; break;
      }
      case 'ducks': { const toss = Math.sin(local * 2.2) > 0.7; Object.assign(P, { ar: toss ? -1.4 : -0.3, er: -0.3, al: -0.6, el: -1.2, hx: 0.3 }); break; }
      case 'campfire': {
        const roast = Math.sin(local * 0.25 + a.seed) > 0;
        Object.assign(P, roast ? { ar: -1.0, er: -0.3, al: -0.5, el: -1.0, hx: 0.15 } : { al: -1.2, ar: -1.2, el: -0.25, er: -0.25, sp: 0.15, hx: 0.1 });
        a.carry = roast ? 'stick' : null; break;
      }
      case 'stargaze': Object.assign(P, { lie: 1, al: -2.8, ar: -2.8, el: -2.3, er: -2.3, tl: -0.05, kl: 0.2, kr: 0.6, lift: 0.14, hy: Math.sin(ph * 0.2) * 0.4 }); break;
      case 'shelter': Object.assign(P, { al: -1.1, ar: -1.1, el: -1.4, er: -1.4, alz: -0.25, arz: -0.25, hx: -0.1, hy: Math.sin(ph * 0.4) * 0.6 }); break;
      case 'tree': Object.assign(P, GROUND_SIT, a.variant === 'read' ? { al: -1.0, ar: -1.0, el: -1.2, er: -1.2, hx: 0.45, sp: -0.15 } : { al: 0.4, ar: 0.4, sp: -0.35, hx: 0.35 + Math.sin(ph * 0.5) * 0.04 }); a.carry = a.variant === 'read' ? 'book' : null; break;
      case 'view': Object.assign(P, { alz: -0.35, arz: -0.35, al: -0.3, ar: -0.3, el: -1.2, er: -1.2, hy: Math.sin(ph * 0.5) * 0.8, hx: -0.05 }); break;
      case 'cat': { const pet = Math.sin(local * 3); Object.assign(P, CROUCH, { ar: -0.7 + pet * 0.15, er: -0.2, al: -0.3, hx: 0.5 }); break; }
      case 'idle': Object.assign(P, { hy: Math.sin(ph * 1.2) * 0.7 }); break;
    }
    if (talking || a.kind === 'chat') {
      const g = Math.sin(ph * 3.1), g2 = Math.sin(ph * 2.3 + 1);
      const arms = { al: -0.55 + g * 0.35, el: -1.0 + g2 * 0.3, ar: -0.45 - g2 * 0.3, er: -1.1 + g * 0.25, hx: Math.sin(ph * 4) * 0.08 };
      if (a.wave && t - a.wave < 1.2) Object.assign(arms, { ar: -2.9, er: -0.2, arz: 0.3 + Math.sin(t * 14) * 0.25 });   // saluda al llegar
      if (a.carry === 'cup') { arms.ar = -0.35; arms.er = -1.3; }
      if (a.kind !== 'stargaze' && a.kind !== 'tree') Object.assign(P, a.sitting ? { al: arms.al, el: arms.el, sp: -0.05 } : arms);
      const b = a.talk || a.faceTo;
      if (b) {
        const want = Math.atan2(b.x - a.x, b.z - a.z);
        if (a.sitting) P.hy = clamp(Math.atan2(Math.sin(want - a.yaw), Math.cos(want - a.yaw)), -1.2, 1.2);
        else a.yawTo = want;
      }
    }
    if (a.kind === 'cat' && a.faceTo) a.yawTo = Math.atan2(cat.x - a.x, cat.z - a.z);
    return P;
  }

  // ---------- Cada fotograma: personas ----------
  const turnTo = (from, to, k) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k;
  const roofed = (x, z) => (x > SHED.x0 - 0.1 && x < SHED.x1 + 0.1 && z > SHED.z0 && z < SHED.z1 + 0.3) || (x > HOUSE.x0 - 0.3 && x < HOUSE.x1 + 0.3 && z > HOUSE.z1 && z < HOUSE.z1 + 0.6);
  function step(a, dt) {
    for (const n of NEEDS) a.needs[n] = clamp(a.needs[n] - dt * (n === 'energy' ? 0.002 : n === 'focus' && night(logicHour()) ? 0 : 0.008), 0, 1);
    if (a.inside) {
      if (a.state === 'act' && ACT[a.kind]) for (const n in ACT.home.give) a.needs[n] = clamp(a.needs[n] + ACT.home.give[n] * dt / 15, 0, 1);
      const h = logicHour();
      if (a.asleep && !asleepTime(a, h) && !a.owl) { a.asleep = false; a.until = t + rand() * 5; }   // se despierta: sale en un rato
      if (!a.asleep && !a.owl && asleepTime(a, h)) { a.asleep = true; a.until = Infinity; }         // estaba en casa y se hace tarde: a dormir
      if (!a.asleep && t >= a.until) { a.history.push('home'); choose(a); a.stretchAt = t; }
      return;
    }
    if (a.state === 'walk') {
      const [wx, wz] = a.path[0] || [a.x, a.z];
      const dx = wx - a.x, dz = wz - a.z, d = Math.hypot(dx, dz);
      if (d < 0.06) { a.path.shift(); if (!a.path.length) arrive(a); }
      else {
        const sp = Math.min(d, dt * (weatherNow().rain ? 1.25 : 1.05));
        a.x += dx / d * sp; a.z += dz / d * sp;
        a.yaw = turnTo(a.yaw, Math.atan2(dx, dz), 1 - Math.exp(-12 * dt));
      }
      if (a.plan.carry) a.carry = a.plan.carry;
    } else if (a.state === 'sitdown' || a.state === 'standup') {
      a.blend = Math.min(1, a.blend + dt * 2.2);
      const s = a.state === 'sitdown' ? a.slot : a.lastSeat, [fx, fz] = s.from, k = a.state === 'sitdown' ? a.blend : 1 - a.blend;
      a.x = fx + (s.x - fx) * k; a.z = fz + (s.z - fz) * k;
      a.yaw = turnTo(a.yaw, s.face, 1 - Math.exp(-10 * dt));
      if (a.blend >= 1) { if (a.state === 'sitdown') { a.sitting = true; a.state = 'act'; a.yaw = s.face; } else { a.sitting = false; a.state = 'walk'; } }
    } else {
      if (ACT[a.kind]) for (const n in ACT[a.kind].give) a.needs[n] = clamp(a.needs[n] + ACT[a.kind].give[n] * dt / 12, 0, 1);
      if (a.yawTo !== undefined && !a.sitting) a.yaw = turnTo(a.yaw, a.yawTo, 1 - Math.exp(-6 * dt));
      if (a.talk && t >= a.talkUntil) { a.talk = null; a.faceTo = null; if (a.slot) a.yawTo = a.slot.face; }
      if (a.kind === 'chat' && a.plan.with && (a.plan.with.state !== 'act' || a.plan.with.inside)) a.until = Math.min(a.until, t + 0.5);
      const h = logicHour(), w = weatherNow();
      if (!a.owl && asleepTime(a, h) && a.kind !== 'home' && a.until - t > 4 + a.i * 2) a.until = t + 1 + a.i * 2.5;   // es hora de dormir: lo dejan (no todos a la vez)
      if (w.rain && ACT[a.kind] && !ACT[a.kind].when(h, w) && a.until - t > 2) a.until = t + 0.5 + rand() * 2;      // empieza a llover: se van a resguardar
      if (t >= a.until) { a.lastSeat = a.sitting ? a.slot : null; a.talk = null; a.faceTo = null; a.yawTo = undefined; if (a.owl && a.owlUntil < t) { a.owl = false; } choose(a); }
    }
    const P = pose(a);
    if (a.stretchAt && t - a.stretchAt < 2.5 && a.state === 'walk') Object.assign(P, { al: -2.9, ar: -2.9, el: -0.3, er: -0.3, hx: -0.3 });  // bosteza y se estira al salir
    const brolly = sky.rain > 0.3 && !roofed(a.x, a.z) && !a.sitting && a.kind !== 'stargaze';
    if (brolly) Object.assign(P, { al: -0.9, el: -1.5, alz: 0.1 });
    const seatSlot = a.state === 'standup' ? a.lastSeat : a.sitting || a.state === 'sitdown' ? a.slot : null, seatH = seatSlot?.seat ?? 0;
    const sitK = a.sitting ? 1 : a.state === 'sitdown' ? a.blend : a.state === 'standup' ? 1 - a.blend : 0;
    applyPose(a.p, P, 1 - Math.exp(-10 * dt));
    const y = a.slot?.y !== undefined && a.state === 'act' && a.slot.kind === 'fish' ? a.slot.y : heightAt(a.x, a.z), sitY = seatH ? seatH - HIP : 0;
    a.p.position.set(a.x, y + sitY * sitK + (a.sitting ? 0 : a.p.pose.lift), a.z);
    a.p.rotation.y = a.yaw;
    const pr = a.p.props;
    pr.cup.visible = a.carry === 'cup'; pr.phone.visible = a.carry === 'phone' && a.p.pose.er < -0.6; pr.book.visible = a.carry === 'book';
    pr.axe.visible = a.carry === 'axe'; pr.stick.visible = a.carry === 'stick' && a.state === 'act'; pr.log.visible = a.carry === 'log';
    pr.rod.visible = a.carry === 'rod' && a.state === 'act'; pr.can.visible = a.carry === 'can';
    pr.can.rotation.x = a.kind === 'garden' && a.state === 'act' ? 0.5 + Math.sin(t * 2) * 0.1 : 0;
    pr.brolly.visible = brolly;
    if (pr.rod.visible) pr.rod.line.scale.y = a.bite && t > a.bite && t < a.bite + 1.6 ? 0.8 : 1;
  }
  function separate() {
    for (const a of agents) for (const b of agents) {
      if (a === b || a.state !== 'walk' || a.inside || b.inside) continue;
      const dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz);
      if (d > 0 && d < 0.45) { const nx = a.x + dx / d * 0.01, nz = a.z + dz / d * 0.01; if (free(nx, nz)) { a.x = nx; a.z = nz; } }
    }
  }
  // De noche, cuando ya duermen todos, a veces alguien no puede dormir y sale un rato (la hoguera, las estrellas, el estanque)
  let owlClock = 40 + rand() * 50;
  function nightOwl(dt) {
    const h = logicHour();
    if (!agents.every((a) => a.inside && a.asleep)) return;
    owlClock -= dt; if (owlClock > 0) return;
    owlClock = 60 + rand() * 80;
    const a = agents.reduce((best, x) => (rand() * x.look.owl > rand() * best.look.owl ? x : best), agents[2]);
    if (!asleepTime(a, h) || rand() > 0.85) return;
    a.owl = true; a.owlUntil = t + 25 + rand() * 25; a.asleep = false; a.until = t;
  }

  // ---------- Animales y ambiente ----------
  const CAT_SPOTS = [[2.6, 1.2], [-5.4, 4.0], [4.6, 3.2], [-0.4, -0.6], [2.4, -3.3], [-2.5, 2.6], [5.6, -2.6]];
  function stepCat(dt) {
    const h = logicHour();
    if (cat.state === 'walk') {
      const [wx, wz] = cat.path[0] || [cat.x, cat.z];
      const dx = wx - cat.x, dz = wz - cat.z, d = Math.hypot(dx, dz);
      if (d < 0.05) { cat.path.shift(); if (!cat.path.length) { cat.state = night(h) || rand() < 0.35 ? 'sleep' : 'sit'; cat.until = t + 8 + rand() * 14; } }
      else { const sp = Math.min(d, dt * 0.85); cat.x += dx / d * sp; cat.z += dz / d * sp; cat.yaw = turnTo(cat.yaw, Math.atan2(dx, dz), 1 - Math.exp(-10 * dt)); }
    } else if (t > cat.until && !cat.petted) {
      const friend = rand() < 0.4 ? pick(agents.filter((a) => !a.inside)) : null;    // a veces va detrás de alguien
      const [x, z] = night(h) ? [DOOR.x + 0.5, DOOR.z + 0.25] : friend ? talkSpot(friend.x, friend.z, cat, 0.55) : pick(CAT_SPOTS);
      cat.path = findPath(cat.x, cat.z, x, z); cat.state = 'walk';
    }
    const walk = cat.state === 'walk', s = Math.sin(t * 12);
    cat.legs.forEach((l, i) => { l.rotation.x = walk ? s * (i % 2 ? 0.6 : -0.6) * (i < 2 ? 1 : -1) : 0; l.visible = cat.state !== 'sleep'; });
    cat.body.scale.y = cat.state === 'sleep' ? 0.7 : 1; cat.body.position.y = cat.state === 'sleep' ? 0.08 : cat.state === 'sit' ? 0.16 : 0.2;
    cat.body.rotation.x = cat.state === 'sit' ? -0.35 : 0;
    cat.head.position.set(0, cat.state === 'sleep' ? 0.12 : cat.state === 'sit' ? 0.4 : 0.32, cat.state === 'sleep' ? 0.2 : 0.25);
    cat.tail.rotation.x = cat.state === 'sleep' ? 1.5 : 0.7 + Math.sin(t * 2) * 0.25; cat.tail.position.y = cat.state === 'sleep' ? 0.1 : 0.3;
    cat.g.position.set(cat.x, heightAt(cat.x, cat.z), cat.z); cat.g.rotation.y = cat.yaw;
  }
  function stepDucks(dt) {
    const feeder = agents.find((a) => a.kind === 'ducks' && a.state === 'act' && !a.inside);
    ducks.forEach((d, i) => {
      let tx, tz;
      if (feeder) { tx = POND.x + (feeder.x - POND.x) * 0.55 + (i - 0.5) * 0.3; tz = POND.z + (feeder.z - POND.z) * 0.55; }
      else { d.a += dt * 0.25 * d.dir; tx = POND.x + Math.cos(d.a) * d.r; tz = POND.z + Math.sin(d.a) * d.r * 0.85; }
      const dx = tx - d.x, dz = tz - d.z, dist = Math.hypot(dx, dz);
      if (dist > 0.02) { const sp = Math.min(dist, dt * 0.35); d.x += dx / dist * sp; d.z += dz / dist * sp; d.yaw = turnTo(d.yaw, Math.atan2(dx, dz), 1 - Math.exp(-4 * dt)); }
      d.g.position.set(d.x, POND.y + Math.sin(t * 2 + i) * 0.015, d.z); d.g.rotation.y = d.yaw;
      if (rand() < dt * 0.05) ripple(d.x, d.z);
    });
  }
  function stepAmbient(dt, h) {
    const nightK = 1 - smooth(-0.25, 0.05, sunElevation(h)), dayClear = (1 - nightK) * (1 - sky.rain);
    // Agua y cascada
    pondTex.offset.x = (t * 0.01) % 1; pondTex.offset.y = Math.sin(t * 0.2) * 0.02;
    streamTex.offset.x = (-t * 0.25) % 1; fallTex.offset.y = (t * 0.9) % 1;
    // Árboles: se mecen un poco, más con lluvia
    for (const tr of trees) { const w = 0.012 + sky.rain * 0.025; tr.sway.rotation.z = Math.sin(t * 0.9 + tr.phase) * w; tr.sway.rotation.x = Math.cos(t * 0.7 + tr.phase) * w * 0.6; }
    // Nubes: entran y salen según el tiempo, cruzan despacio y dan sombra
    const want = Math.round(sky.cloud * clouds.length);
    clouds.forEach((c, i) => {
      c.k = lerp(c.k, i < want ? 1 : 0, 1 - Math.exp(-0.6 * dt));
      c.g.position.x += dt * c.speed * (1 + sky.rain); if (c.g.position.x > 17) { c.g.position.x = -17; c.g.position.z = -8 + rnd() * 16; }
      c.g.scale.setScalar(Math.max(0.001, c.k * c.size));
    });
    cloudMat.color.set('#ffffff').lerp(new THREE.Color('#7f8aa0'), sky.rain * 0.85).multiplyScalar(lerp(1, 0.35, nightK)); cloudMat.emissiveIntensity = lerp(0.3, 0.05, Math.max(nightK, sky.rain * 0.7));
    // Lluvia
    rainMat.opacity = sky.rain * 0.55; rain.visible = sky.rain > 0.02;
    if (rain.visible) {
      for (let k = 0; k < RAIN_N; k++) {
        const d = rainDrops[k]; d.y -= dt * 13; d.x += dt * 2.2;
        if (d.y < -4) { d.y = 14; d.x = (rand() - 0.5) * 24; d.z = (rand() - 0.5) * 24; if (rand() < 0.04) { const rx = POND.x + (rand() - 0.5) * 2.2, rz = POND.z + (rand() - 0.5) * 2.2; if (pondDist(rx, rz) < POND.r) ripple(rx, rz); } }
        rainPos.set([d.x, d.y, d.z, d.x - 0.06, d.y + 0.38, d.z], k * 6);
      }
      rainGeo.attributes.position.needsUpdate = true;
    }
    ripples.forEach((r) => { if (r.life < 1) { r.life = Math.min(1, r.life + dt * 0.8); r.m.scale.setScalar(0.08 + r.life * 0.35); r.m.material.opacity = (1 - r.life) * 0.7; } });
    // Luciérnagas de noche, abejas y mariposas de día
    fireflies.material.opacity = nightK * (1 - sky.rain * 0.8); fireflies.visible = fireflies.material.opacity > 0.02;
    if (fireflies.visible) flies.forEach((f, k) => {
      const x = f.x + Math.sin(t * f.sp + f.p) * 0.6, z = f.z + Math.cos(t * f.sp * 0.8 + f.p) * 0.6, y = heightAt(f.x, f.z) + f.y + Math.sin(t * 1.3 + f.p) * 0.25;
      flyPos.set([x, y, z], k * 3); const b = 0.4 + 0.6 * Math.max(0, Math.sin(t * 2.2 + f.p * 3)); flyCol.set([0.85 * b, 1 * b, 0.45 * b], k * 3);
    });
    flyGeo.attributes.position.needsUpdate = flyGeo.attributes.color.needsUpdate = true;
    bees.visible = dayClear > 0.5;
    if (bees.visible) for (let k = 0; k < BEE_N; k++) { const hx = k % 2 ? -6.2 : -5.5, hz = k % 2 ? -4.7 : -5.5, a = t * (1.5 + k * 0.13) + k; beePos.set([hx + Math.cos(a) * (0.4 + (k % 3) * 0.2), TERR.h + 0.9 + Math.sin(a * 1.7) * 0.3, hz + Math.sin(a) * (0.4 + (k % 3) * 0.2)], k * 3); }
    beeGeo.attributes.position.needsUpdate = true;
    butterflies.forEach((b, i) => {
      b.g.visible = dayClear > 0.5;
      if (!b.g.visible) return;
      b.p += dt; const [hx2, hz2] = b.home;
      const x = hx2 + Math.sin(b.p * 0.5 + i) * 1.1, z = hz2 + Math.cos(b.p * 0.37 + i * 2) * 1.1, y = heightAt(x, z) + 0.5 + Math.sin(b.p * 1.3) * 0.25;
      b.g.position.set(x, y, z); b.g.rotation.y = b.p * 0.5 + i;
      const f = Math.sin(b.p * 18) * 1.1; b.wl.rotation.y = f; b.wr.rotation.y = -f;
    });
    // Humo de la chimenea (si hay alguien en casa, por la mañana o de noche) y de la hoguera
    const home = agents.some((a) => a.inside), fireOn = fireLit(h);
    smokeTimer -= dt;
    if (smokeTimer < 0) {
      const src = (home || nightK > 0.5 || h < 10) ? (fireOn && rand() < 0.5 ? 'fire' : 'chimney') : fireOn ? 'fire' : null;
      smokeTimer = 0.45;
      const s = smoke.find((q) => q.life >= 1);
      if (src && s) { s.life = 0; s.src = src; [s.x, s.y, s.z] = src === 'chimney' ? [HOUSE.x0 + 0.55, W + 2.15, HOUSE.z0 + 0.65] : [FIRE.x, 0.6, FIRE.z]; }
    }
    smoke.forEach((s) => {
      if (s.life >= 1) { s.m.opacity = 0; return; }
      s.life = Math.min(1, s.life + dt * 0.22);
      s.b.position.set(s.x + s.life * 1.2 + Math.sin(s.life * 6) * 0.1, s.y + s.life * 2.4, s.z - s.life * 0.3);
      s.b.scale.setScalar(0.6 + s.life * 1.8); s.m.opacity = (1 - s.life) * 0.55 * (s.src === 'fire' ? 0.7 : 1);
      s.m.color.set(nightK > 0.5 ? '#7d7a86' : '#d8d4cc');
    });
    // Hoguera: llamas que bailan
    flames.visible = fireOn;
    flames.children.forEach((f, k) => { f.scale.set(1, 0.7 + Math.abs(Math.sin(t * (7 + k * 2.3) + k)) * 0.8, 1); f.rotation.y = t * (1 + k); });
    // Zzz por la ventana cuando duermen
    const sleeping = agents.some((a) => a.inside && a.asleep);
    zzz.forEach((z) => { z.t = (z.t + dt * 0.18) % 1; z.s.position.set(2.05 + z.t * 0.5, 1.7 + z.t * 1.3, HOUSE.z1 + 0.3); z.s.material.opacity = sleeping ? Math.sin(z.t * Math.PI) * 0.9 : 0; z.s.scale.setScalar(0.18 + z.t * 0.2); });
  }
  const fireLit = (h) => sky.rain < 0.4 && (evening(h) || agents.some((a) => a.kind === 'campfire' && a.state === 'act' && !a.inside));

  // ---------- Luz según la hora y el tiempo ----------
  function sunElevation(h) {                                         // de -1 (medianoche) a 1 (mediodía), 0 al amanecer y al atardecer
    if (h >= SUN.rise && h <= SUN.set) return Math.sin(Math.PI * (h - SUN.rise) / (SUN.set - SUN.rise));
    const nightLen = 24 - (SUN.set - SUN.rise), into = ((h - SUN.set) + 24) % 24;
    return -Math.sin(Math.PI * into / nightLen);
  }
  const C = (hex) => new THREE.Color(hex);
  const LOOK_NIGHT = { sun: C('#8fa6ff'), si: 0.55, sky: C('#3b4775'), grd: C('#141a10'), hi: 0.6, card: C('#1c2030'), full: C('#251c35') };
  const LOOK_DAWN = { sun: C('#ffc29e'), si: 1.5, sky: C('#f4c4d6'), grd: C('#4a4a2c'), hi: 0.65, card: C('#fff3ec'), full: C('#ffbcd9') };
  const LOOK_DUSK = { sun: C('#ff8442'), si: 1.8, sky: C('#ffae8c'), grd: C('#4a3420'), hi: 0.6, card: C('#ffeee2'), full: C('#ff9eb6') };
  const LOOK_DAY = { sun: C('#fff0d8'), si: 2.8, sky: C('#eef3ff'), grd: C('#3d4a2c'), hi: 0.75, card: C('#ffffff'), full: C('#ffa2d4') };
  const GREY = { card: C('#e9e7ec'), full: C('#d39ab9'), cardN: C('#171a24'), fullN: C('#1d1828') };
  const mixLook = (a, b, k) => ({ sun: a.sun.clone().lerp(b.sun, k), si: lerp(a.si, b.si, k), sky: a.sky.clone().lerp(b.sky, k), grd: a.grd.clone().lerp(b.grd, k), hi: lerp(a.hi, b.hi, k), card: a.card.clone().lerp(b.card, k), full: a.full.clone().lerp(b.full, k) });
  let isFull = false, onSky = null, lastBg = '';
  const lit = { house: 0, lamps: 0, fire: 0 };
  function applyLight(h, dt) {
    const e = sunElevation(h), twilight = h < 12 ? LOOK_DAWN : LOOK_DUSK;
    const L = e < 0.05 ? mixLook(LOOK_NIGHT, twilight, smooth(-0.28, 0.05, e)) : mixLook(twilight, LOOK_DAY, smooth(0.05, 0.42, e));
    const grey = sky.cloud * 0.35 + sky.rain * 0.35, nightK = 1 - smooth(-0.25, 0.05, e);
    sun.color.copy(L.sun); sun.intensity = L.si * (1 - 0.45 * sky.cloud) * (1 - 0.45 * sky.rain);
    hemi.color.copy(L.sky).lerp(C('#9aa3b5'), grey * (1 - nightK)); hemi.groundColor.copy(L.grd); hemi.intensity = L.hi * (1 + 0.25 * sky.cloud);
    // El sol recorre el cielo de este a oeste (sombras largas al amanecer y al atardecer); de noche, la luna
    if (e > -0.05) {
      const k = clamp((h - SUN.rise) / (SUN.set - SUN.rise), 0, 1), az = Math.atan2(-9, 2.5) + lerp(-1.1, 1.1, k);
      sun.position.set(Math.sin(az) * 10, 1.6 + Math.max(0.06, e) * 10, Math.cos(az) * 10);
    } else sun.position.set(6, 12, -4);
    sun.target.position.set(0, 0, 0);
    // Luces cálidas: casa (si hay alguien y no es pleno día), farolas (de noche), hoguera
    const someoneHome = agents.some((a) => a.inside), awakeHome = agents.some((a) => a.inside && !a.asleep);
    const want = { house: someoneHome ? (awakeHome ? 1 : nightK > 0.5 ? 0.35 : 0) * (nightK > 0.2 || sky.rain > 0.3 ? 1 : 0.3) : nightK > 0.4 && !agents.every((a) => a.asleep) ? 0.5 : 0, lamps: nightK > 0.35 ? 1 : 0, fire: fireLit(h) ? 1 : 0 };
    for (const k in lit) lit[k] = lerp(lit[k], want[k], 1 - Math.exp(-2 * dt));
    lights.house.intensity = lit.house * 3.2; lights.lampA.intensity = lights.lampB.intensity = lit.lamps * 2.6;
    lights.fire.intensity = lit.fire * (3 + Math.sin(t * 11) * 0.5 + Math.sin(t * 17) * 0.3);
    windowMat.color.set('#2a3442').lerp(C('#ffcf73'), clamp(lit.house * 1.2, 0, 1));
    lampGlass.color.set('#3b3b3b').lerp(C('#ffe39a'), lit.lamps);
    // Fondo (lo pinta el CSS): blanco en la tarjeta y rosa a pantalla completa de día; se tiñe al amanecer y al atardecer y se apaga de noche
    const bg = (isFull ? L.full : L.card).clone().lerp(isFull ? (nightK > 0.5 ? GREY.fullN : GREY.full) : (nightK > 0.5 ? GREY.cardN : GREY.card), grey);
    const hex = '#' + bg.getHexString();
    if (hex !== lastBg) { lastBg = hex; onSky && onSky(hex, nightK > 0.5); }
    groundMat.color.setScalar(1 - sky.rain * 0.15);
  }

  // ---------- Bucle ----------
  let clock = 0;
  function animate(dt) {
    t += dt; clock += dt;
    if (clock > 1) { clock = 0; if (state.follow) state.hour = madridNow(); }
    if (state.auto) { weatherClock -= dt; if (weatherClock < 0) { weatherClock = 100 + rand() * 160; const r = rand(), cur = state.weather; state.weather = cur === 0 ? (r < 0.6 ? 1 : r < 0.75 ? 2 : 0) : cur === 1 ? (r < 0.45 ? 0 : r < 0.85 ? 2 : 1) : (r < 0.7 ? 1 : 0); notify(); } }
    const target = skyTarget(); sky.cloud = lerp(sky.cloud, target.cloud, 1 - Math.exp(-0.5 * dt)); sky.rain = lerp(sky.rain, target.rain, 1 - Math.exp(-0.4 * dt));
    const goal = logicHour(); let diff = ((goal - shownHour + 36) % 24) - 12;   // la luz da la vuelta por el camino corto
    shownHour = (shownHour + diff * (1 - Math.exp(-1.6 * dt)) + 24) % 24; if (Math.abs(diff) < 0.01) shownHour = goal;
    for (const a of agents) step(a, dt);
    separate(); nightOwl(dt); stepCat(dt); stepDucks(dt);
    stepAmbient(dt, shownHour); applyLight(shownHour, dt);
    zoom = lerp(zoom, zoomTo, 1 - Math.exp(-12 * dt)); pan.lerp(panTo, 1 - Math.exp(-12 * dt)); placeCamera();
  }

  // ---------- Tamaño: la escena se dibuja a muy baja resolución y se amplía sin suavizar ----------
  let raf = 0, running = false, last = 0;
  let viewH = 10, cssW = 300, cssH = 375;
  function size() {
    cssW = canvas.clientWidth || 300; cssH = canvas.clientHeight || 375;
    const px = clamp(cssW / (isFull ? WIDE_FULL : WIDE_CARD), PIXEL_MIN, PIXEL_MAX);
    renderer.setSize(Math.round(cssW / px), Math.round(cssH / px), false);
    const aspect = cssW / cssH, diag = 2 * H * Math.SQRT2;
    viewH = Math.max(diag * 1.04 / (2 * aspect), (diag * 0.5 * 0.5 + 5.4) * 1.04);   // cabe la isla entera, con los árboles y las rocas de debajo
    Object.assign(camera, { left: -viewH * aspect, right: viewH * aspect, top: viewH, bottom: -viewH });
    placeCamera();
  }
  const ro = new ResizeObserver(() => { size(); renderer.render(scene, camera); }); ro.observe(canvas);

  function frame(now) {
    raf = 0;
    if (!running) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    animate(dt); renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  const renderOnce = () => {
    if (running) return;
    shownHour = logicHour(); const tg = skyTarget(); sky.cloud = tg.cloud; sky.rain = tg.rain; zoom = zoomTo; pan.copy(panTo);
    animate(0.016); applyLight(shownHour, 10); placeCamera(); renderer.render(scene, camera);
  };

  settleAtStart();
  shownHour = logicHour();
  { const tg = skyTarget(); sky.cloud = tg.cloud; sky.rain = tg.rain; }
  size();
  for (let k = 0; k < 40; k++) animate(0.016);
  applyLight(shownHour, 10);
  renderer.render(scene, camera);

  // ---------- Panel y gestos (los usa js/about.js) ----------
  const listeners = new Set();
  function notify() { const s = getState(); listeners.forEach((f) => f(s)); }
  function getState() { return { follow: state.follow, time: state.follow ? phaseOf(state.hour) : state.preset, weather: state.weather, auto: state.auto, night: phaseOf(logicHour()) === 3 }; }
  setInterval(() => { if (state.follow) { const before = phaseOf(state.hour); state.hour = madridNow(); if (phaseOf(state.hour) !== before) notify(); } }, 30000);
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitAt = new THREE.Vector3();
  function onIsland(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set((clientX - r.left) / r.width * 2 - 1, -((clientY - r.top) / r.height * 2 - 1));
    ray.setFromCamera(ndc, camera);
    for (const y of [0, TERR.h, -1.6, -DEPTH]) {                    // el suelo, la terraza y el acantilado cuentan como isla
      plane.constant = -y;
      if (ray.ray.intersectPlane(plane, hitAt) && Math.max(Math.abs(hitAt.x), Math.abs(hitAt.z)) < H * 1.02) { plane.constant = 0; return true; }
    }
    plane.constant = 0; return false;
  }
  // Acercar hacia un punto de la pantalla (rueda, pellizco o doble clic) y desplazar arrastrando, sin salirse de la isla
  const ZMIN = 1, ZMAX = 4.5;
  const right = new THREE.Vector3(Math.cos(AZ), 0, -Math.sin(AZ)), up = new THREE.Vector3().crossVectors(OFFSET.clone().normalize(), right);
  function clampPan(v) { const lim = 7.5 * (1 - 1 / zoomTo); const r = v.dot(right), u = v.dot(up); v.copy(right).multiplyScalar(clamp(r, -lim * 1.4, lim * 1.4)).addScaledVector(up, clamp(u, -lim, lim)); return v; }
  function zoomAt(factor, clientX, clientY) {
    const before = zoomTo; zoomTo = clamp(zoomTo * factor, ZMIN, ZMAX);
    if (clientX !== undefined) {
      const r = canvas.getBoundingClientRect(), nx = (clientX - r.left) / r.width * 2 - 1, ny = -((clientY - r.top) / r.height * 2 - 1);
      const wx = nx * viewH * (cssW / cssH), wy = ny * viewH;                    // el punto, en unidades de la vista
      const k = 1 / before - 1 / zoomTo;
      panTo.addScaledVector(right, wx * k).addScaledVector(up, wy * k);
    }
    clampPan(panTo); renderOnce();
  }
  function panBy(dxPx, dyPx) {
    const perPx = (2 * viewH / zoom) / cssH;
    panTo.addScaledVector(right, -dxPx * perPx).addScaledVector(up, dyPx * perPx);
    clampPan(panTo); pan.copy(panTo); renderOnce();
  }
  function resetView() { zoomTo = 1; panTo.set(0, 0, 0); renderOnce(); }

  return {
    onIsland,
    // Qué hace cada persona ahora mismo (para comprobar la escena; no se muestra)
    stats() { return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }; },
    describe() { return agents.map((a) => ({ kind: a.inside ? (a.asleep ? 'sleep' : 'home') : a.kind, state: a.state, x: +a.x.toFixed(2), z: +a.z.toFixed(2), owl: a.owl })); },
    zoomAt, panBy, resetView, get zoomed() { return zoomTo > 1.02; },
    setFull(on) {
      isFull = on; size(); if (!on) resetView(); lastBg = '';
      const s = on ? 2048 : 1024;                                     // sombras más finas solo a pantalla completa (en la tarjeta no se notan y pesan)
      if (sun.shadow.mapSize.x !== s) { sun.shadow.mapSize.set(s, s); sun.shadow.map?.dispose(); sun.shadow.map = null; }
      renderOnce();
    },
    onSky(f) { onSky = f; lastBg = ''; applyLight(shownHour, 1); },
    onChange(f) { listeners.add(f); f(getState()); },
    setTime(i) { state.follow = false; state.preset = (i + 4) % 4; notify(); renderOnce(); },
    setFollow(on) { state.follow = on; if (on) state.hour = madridNow(); else state.preset = phaseOf(state.hour); notify(); renderOnce(); },
    setWeather(i) { state.weather = (i + 3) % 3; state.auto = false; weatherClock = 100 + rand() * 160; notify(); renderOnce(); },
    setAuto(on) { state.auto = on; weatherClock = 60 + rand() * 120; notify(); },
    play() { if (still || running) return; running = true; last = 0; raf = requestAnimationFrame(frame); },
    pause() { running = false; cancelAnimationFrame(raf); raf = 0; },
    destroy() { this.pause(); ro.disconnect(); renderer.dispose(); },
  };
}
