// DIGITAL ARCHIVE · índice (/archive/), copia de la portada de podium.global (grabación en recent.design/i/gxi9ddp-podium).
// Con ratón y pantalla ancha, la portada ocupa la pantalla: una capa crema (WebGL) la cubre y solo deja ver, dentro de una forma líquida grande,
// el muro de la colección elegida (desenfocado y con grano). Pasar por una fila cambia lo que se ve dentro, y se queda hasta pasar por otra.
//  · Borde: nítido en reposo. El cursor, al moverse por encima, lo arrastra y lo deshace en polvo en la dirección del movimiento (~0,6 s).
//  · Dentro, la crema entra como niebla hacia las puntas de la forma (más clara cuanto más lejos del centro), como en la referencia.
//  · Zambullida: pulsar una fila (o dentro de la forma) hace crecer la forma hasta llenar la pantalla con el borde cada vez más difuso, las letras
//    se apagan al azar y se entra en la colección, que también es negra (sin la cortina de color: css/transitions.css, tipo «dive»).
// En el móvil, sin WebGL o con «reducir movimiento» no hay zambullida (con reducir movimiento la forma se queda quieta y sin polvo); en el móvil, solo la lista.
import { createInfiniteCardGrid } from '/js/room/infinite-card-grid.js?v=20261111archive1';

const index = document.querySelector('.archive-index');
const landing = document.querySelector('.archive-landing');
const blob = document.querySelector('.archive-blob');
const rows = [...document.querySelectorAll('.archive-row[data-items]')];
const live = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 821px)');
const motion = matchMedia('(prefers-reduced-motion: reduce)');

(function main() {
  if (!index || !landing || !blob || !rows.length) return;

  // ---------- La forma: trazos de grosor variable y dos óvalos que se funden un poco entre sí ----------
  // Parecida a la de la referencia: un gancho que viene de un lóbulo a la izquierda, el cuerpo, un brazo a la derecha, una pierna que baja
  // y dos óvalos sueltos arriba a la derecha. Unidades: 1 = alto de la portada; 0, 0 es el centro de la forma. EDITA aquí la forma.
  // Medidas tomadas de la grabación de la referencia (en píxeles de un fotograma de 900 de alto, centro de la forma en 360, 400):
  // trazos que cambian de grosor de una punta a otra (x1, y1, grosor1, x2, y2, grosor2) y dos óvalos sueltos (x, y, radio x, radio y, giro).
  const PX = (v) => v / 900;
  const STROKES = [
    [70, 330, 46, 132, 412, 52],      // lóbulo de la izquierda
    [128, 312, 40, 250, 246, 30],     // brazo que sube hacia el gancho
    [250, 240, 32, 320, 224, 40],     // arranque del gancho
    [320, 226, 42, 418, 228, 50],     // parte alta del gancho (la más gruesa)
    [440, 252, 40, 422, 318, 27],     // baja por la derecha y se estrecha (cuello)
    [418, 326, 28, 344, 402, 52],     // cuerpo
    [384, 452, 30, 498, 478, 36],     // brazo a la derecha, con la punta redonda
    [334, 418, 50, 254, 560, 42],     // pierna
    [250, 566, 44, 222, 652, 62],     // pie, la punta más ancha
  ];
  const OVALS = [[585, 142, 98, 57, -.27], [530, 336, 47, 33, .17]];
  const SIZE = 1.22, CENTER = { x: .54, y: .52 }, KNEAD = .05, TRAIL = 12;  // tamaño, centro (fracción de la portada) y lo que se funden los trazos
  const COUNT = STROKES.length, OVAL_COUNT = OVALS.length;
  const toUnits = (v, axis) => PX(v - (axis ? 400 : 360)) * SIZE;
  const segA = new Float32Array(COUNT * 4), segR = new Float32Array(COUNT * 2), ovA = new Float32Array(OVAL_COUNT * 4), ovR = new Float32Array(OVAL_COUNT);
  STROKES.forEach(([x1, y1, r1, x2, y2, r2], i) => { segA.set([toUnits(x1, 0), toUnits(y1, 1), toUnits(x2, 0), toUnits(y2, 1)], i * 4); segR.set([PX(r1) * SIZE, PX(r2) * SIZE], i * 2); });
  OVALS.forEach(([x, y, rx, ry, turn], i) => { ovA.set([toUnits(x, 0), toUnits(y, 1), PX(rx) * SIZE, PX(ry) * SIZE], i * 4); ovR[i] = turn; });
  const trail = new Float32Array(TRAIL * 4);

  const canvas = document.createElement('canvas'); canvas.className = 'archive-blob-mask';
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
  if (!gl) return;
  const fragment = `precision highp float;
uniform vec2 uRes; uniform vec2 uCenter; uniform float uScale; uniform float uDive; uniform float uTime; uniform vec3 uBg;
uniform vec4 uS[${COUNT}]; uniform vec2 uR[${COUNT}]; uniform vec4 uO[${OVAL_COUNT}]; uniform float uA[${OVAL_COUNT}]; uniform vec4 uT[${TRAIL}];
float hash(vec2 p){ p = mod(p, 1024.); return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.) / k; return min(a, b) - h * h * k * .25; }
float seg(vec2 p, vec4 s, vec2 r){ vec2 pa = p - s.xy, ba = s.zw - s.xy; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h) - mix(r.x, r.y, h); }
float oval(vec2 p, vec4 o, float t){ vec2 q = p - o.xy; q = mat2(cos(t), sin(t), -sin(t), cos(t)) * q; return (length(q / o.zw) - 1.) * min(o.z, o.w); }
void main(){
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 p = (frag - uCenter) / uScale;
  // Estela del cursor: cada punto se desplaza al azar en la dirección del movimiento, así el borde se deshace en polvo
  vec2 push = vec2(0.);
  for (int i = 0; i < ${TRAIL}; i++) { vec2 q = p - uT[i].xy; push += uT[i].zw * exp(-dot(q, q) / .012); }
  p -= push * hash(frag) * 4.5;
  // Zambullida: la forma crece desde su centro
  float z = 1. + 9. * pow(uDive, 2.2);
  p /= z;
  float s = 1e5;
  for (int i = 0; i < ${COUNT}; i++) s = smin(s, seg(p, uS[i], uR[i]), ${KNEAD.toFixed(3)});
  for (int i = 0; i < ${OVAL_COUNT}; i++) s = smin(s, oval(p, uO[i], uA[i]), ${KNEAD.toFixed(3)});
  float band = (1.5 / uScale + .32 * smoothstep(0., .55, uDive)) / z;    // borde nítido en reposo, cada vez más difuso al zambullirse
  float edge = smoothstep(-band * .25, band, s);
  float fog = clamp(pow(.3 + 1.25 * length(p), 3.), 0., .82) * (1. - uDive);   // niebla crema hacia las puntas
  float a = mix(fog, 1., edge) * (1. - smoothstep(.78, 1., uDive));
  // Grano dentro de la forma (el contenido queda en segundo plano)
  float g = hash(frag + floor(uTime * 24.) * 17.13);
  float ga = .075 * (1. - a) * (1. - uDive);
  vec3 col = vec3(step(.5, g)) * ga + uBg * a * (1. - ga);
  gl_FragColor = vec4(col, ga + a * (1. - ga));
}`;
  const compile = (type, src) => { const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh); return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null; };
  const vs = compile(gl.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }'), fs = compile(gl.FRAGMENT_SHADER, fragment);
  if (!vs || !fs) return;
  const program = gl.createProgram();
  gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = Object.fromEntries(['uRes', 'uCenter', 'uScale', 'uDive', 'uTime', 'uBg', 'uS', 'uR', 'uO', 'uA', 'uT'].map((n) => [n, gl.getUniformLocation(program, n)]));
  const cream = getComputedStyle(document.documentElement).getPropertyValue('--cream').trim() || '#fff6ea';
  const hex = cream.replace('#', ''), full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  gl.uniform3f(U.uBg, parseInt(full.slice(0, 2), 16) / 255, parseInt(full.slice(2, 4), 16) / 255, parseInt(full.slice(4, 6), 16) / 255);
  gl.uniform4fv(U.uS, segA); gl.uniform2fv(U.uR, segR); gl.uniform4fv(U.uO, ovA); gl.uniform1fv(U.uA, ovR);

  // ---------- Bucle de dibujo ----------
  const DPR = Math.min(devicePixelRatio || 1, 1.5);
  let width = 1, height = 1, raf = 0, visible = true, dive = 0, diving = null;
  const points = [];                                       // estela: { x, y, vx, vy, born }
  function frame() {
    raf = 0;
    const now = performance.now();                       // el mismo reloj que los eventos del ratón (el de requestAnimationFrame puede ir por delante)
    for (let i = 0; i < TRAIL; i++) {
      const pt = points[points.length - 1 - i], life = pt ? Math.max(0, 1 - (now - pt.born) / 600) : 0;
      trail.set(pt ? [pt.x, pt.y, pt.vx * life * life, pt.vy * life * life] : [9, 9, 0, 0], i * 4);
    }
    while (points.length && now - points[0].born > 600) points.shift();
    if (diving) {
      const t = Math.min(1, (now - diving.start) / diving.ms);
      dive = t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;   // ease-in-out
      if (t >= 1 && !diving.done) { diving.done = true; diving.go(); }
    }
    gl.uniform4fv(U.uT, trail); gl.uniform1f(U.uDive, dive); gl.uniform1f(U.uTime, motion.matches ? 0 : now * .001);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // Sigue dibujando mientras se ve (el grano se mueve); con «reducir movimiento», solo cuando algo cambia
    if (visible && !document.hidden && (!motion.matches || points.length || (diving && !diving.done))) raf = requestAnimationFrame(frame);
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };
  function size() {
    width = blob.clientWidth; height = blob.clientHeight;
    canvas.width = Math.max(2, Math.round(width * DPR)); canvas.height = Math.max(2, Math.round(height * DPR));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform2f(U.uCenter, canvas.width * CENTER.x, canvas.height * CENTER.y);
    gl.uniform1f(U.uScale, canvas.height);
    wake();
  }

  // La misma forma en JavaScript (sin estela), para saber si el cursor está dentro
  const knead = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; };
  function inside(x, y) {
    let d = 1e5;
    for (let i = 0; i < COUNT; i++) {
      const ax = segA[i * 4], ay = segA[i * 4 + 1], bx = segA[i * 4 + 2] - ax, by = segA[i * 4 + 3] - ay, px = x - ax, py = y - ay;
      const h = Math.max(0, Math.min(1, (px * bx + py * by) / (bx * bx + by * by)));
      d = knead(d, Math.hypot(px - bx * h, py - by * h) - (segR[i * 2] + (segR[i * 2 + 1] - segR[i * 2]) * h), KNEAD);
    }
    for (let i = 0; i < OVAL_COUNT; i++) {
      const t = ovR[i], qx = x - ovA[i * 4], qy = y - ovA[i * 4 + 1], rx = ovA[i * 4 + 2], ry = ovA[i * 4 + 3];
      const ux = Math.cos(t) * qx - Math.sin(t) * qy, uy = Math.sin(t) * qx + Math.cos(t) * qy;   // el mismo giro que el shader (mat2 por columnas)
      d = knead(d, (Math.hypot(ux / rx, uy / ry) - 1) * Math.min(rx, ry), KNEAD);
    }
    return d < 0;
  }
  const toShape = (e) => { const r = blob.getBoundingClientRect(); return [(e.clientX - r.left - r.width * CENTER.x) / r.height, (e.clientY - r.top - r.height * CENTER.y) / r.height]; };

  // ---------- Capas: cada colección tiene su muro, que se crea la primera vez que se elige ----------
  const layers = new Map();
  let active = null;
  async function mount(row) {
    const base = row.dataset.items;
    const layer = document.createElement('div'); layer.className = 'archive-layer';
    const surface = document.createElement('div'); surface.className = 'archive-surface';
    const list = document.createElement('ul'); list.className = 'archive-cards';
    surface.append(list); layer.append(surface); blob.prepend(layer);
    layers.set(row, layer);
    if (active === row) layer.classList.add('is-on');
    try {
      const response = await fetch(base + 'items.json?v=20261111archive3');
      if (!response.ok) throw new Error('unavailable');
      const data = await response.json();
      if (!Array.isArray(data.items) || !data.items.length) throw new Error('empty');
      const makeCard = (item) => {
        const figure = document.createElement('figure'); figure.className = 'archive-card'; figure.dataset.card = item.id;
        const turn = document.createElement('span'); turn.className = 'archive-turn';
        const img = document.createElement('img');
        img.src = new URL(item.src, location.origin + base).href; img.alt = ''; img.width = item.width || 640; img.height = item.height || 640;
        img.draggable = false; img.decoding = 'async';
        turn.append(img); figure.append(turn); return figure;
      };
      createInfiniteCardGrid({ surface, list, cards: data.items, makeCard, reduced: motion, entrance: false, prefix: 'archive', aspect: 1, size: 1.1 });
      surface.inert = true;                                // solo se mira: ni foco ni arrastre
    } catch (error) { layers.delete(row); layer.remove(); }
  }
  function activate(row) {
    if (active === row || diving) return;
    active = row;
    rows.forEach((r) => r.classList.toggle('is-active', r === row));
    for (const [r, layer] of layers) layer.classList.toggle('is-on', r === row);
    if (!layers.has(row)) mount(row);
  }

  // ---------- Zambullida ----------
  function scatterLetters() {                              // cada letra se apaga a su tiempo, al azar
    landing.querySelectorAll('.archive-heading, .archive-sub, .archive-name').forEach((el) => {
      if (el.dataset.split) return;
      el.dataset.split = '1';
      if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), texts = [];
      while (walker.nextNode()) texts.push(walker.currentNode);
      texts.forEach((node) => {
        const frag = document.createDocumentFragment();
        for (const ch of node.textContent) {
          const span = document.createElement('span'); span.className = 'dive-char'; span.setAttribute('aria-hidden', 'true');
          span.style.setProperty('--d', (Math.random() * .45).toFixed(2) + 's'); span.textContent = ch; frag.append(span);
        }
        node.replaceWith(frag);
      });
    });
  }
  function diveInto(href) {
    if (diving) return;
    const row = rows.find((r) => r.getAttribute('href') === href);
    if (row) activate(row);
    scatterLetters();
    void landing.offsetWidth;
    index.classList.add('is-diving');
    try { sessionStorage.setItem('dizmar-dive', String(Date.now())); } catch (e) { /* storage blocked */ }
    diving = { start: performance.now(), ms: 1500, done: false, go: () => location.assign(href) };
    wake();
  }
  // Al volver con «atrás» (la página sale de la caché del navegador), la portada vuelve a su estado de reposo
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    diving = null; dive = 0; index.classList.remove('is-diving'); wake();
  });

  // ---------- Arranque (solo con ratón y pantalla ancha) ----------
  let started = false, last = null;
  function start() {
    if (started || !live.matches) return;
    started = true;
    index.classList.add('is-live');
    blob.append(canvas); blob.classList.add('is-ready');
    new ResizeObserver(size).observe(blob);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }).observe(blob);
    document.addEventListener('visibilitychange', wake);
    activate(rows[0]);                                     // al llegar, ya se ve la primera colección
    rows.forEach((row) => {
      row.addEventListener('pointerenter', () => activate(row));
      row.addEventListener('focus', () => activate(row));
      row.addEventListener('click', (e) => {
        if (motion.matches || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   // abrir en pestaña nueva, etc.: lo normal
        e.preventDefault(); diveInto(row.getAttribute('href'));
      });
    });
    // El cursor: deja estela al moverse y, dentro de la forma, la forma se puede pulsar (se entra en la colección que se ve)
    landing.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const [x, y] = toShape(e), now = performance.now();
      blob.classList.toggle('is-inside', inside(x, y) && !e.target.closest('a, button'));
      if (!motion.matches && last) {
        const vx = Math.max(-.05, Math.min(.05, x - last.x)), vy = Math.max(-.05, Math.min(.05, y - last.y));
        if (vx || vy) points.push({ x, y, vx, vy, born: now });
      }
      last = { x, y }; wake();
    });
    landing.addEventListener('pointerleave', () => { last = null; blob.classList.remove('is-inside'); });
    blob.addEventListener('click', (e) => {
      if (!active || !blob.classList.contains('is-inside')) return;
      if (motion.matches) location.assign(active.getAttribute('href')); else diveInto(active.getAttribute('href'));
    });
  }
  live.addEventListener('change', start);
  start();
})();
