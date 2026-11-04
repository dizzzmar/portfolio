// DIGITAL ARCHIVE · índice (/archive/): una lista de colecciones y, a la derecha, una mancha orgánica (referencia: podium.global).
// Al pasar el ratón (o el foco del teclado) por una fila, el muro de esa colección aparece dentro de la mancha y se queda hasta que se elija otra fila.
// El muro es el mismo motor que el de la colección (js/room/infinite-card-grid.js): se arrastra, se mueve con la rueda y se inclina hacia el cursor.
// Pulsar una pieza (sin arrastrar) abre esa pieza en la página de la colección. La mancha respira sola y se inclina hacia el cursor.
// Solo con ratón y pantalla ancha: en el móvil no hay mancha y la lista es la de siempre. Con «reducir movimiento» la mancha queda quieta.
import { createInfiniteCardGrid } from '/js/room/infinite-card-grid.js?v=20261111archive1';

const blob = document.querySelector('.archive-blob');
const rows = [...document.querySelectorAll('.archive-row[data-items]')];
const live = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 821px)');
const motion = matchMedia('(prefers-reduced-motion: reduce)');

(function main() {
  if (!blob || !rows.length) return;
  const layers = new Map();     // fila → { layer, grid }
  let active = null;
  let started = false;

  // ---------- Mancha: máscara dibujada con WebGL (referencia: la portada de podium.global) ----------
  // Una capa del color de la página cubre el recuadro y deja ver lo de debajo (el muro) solo dentro de una forma líquida: ~14 círculos de distintos
  // tamaños que se funden entre sí (cadena diagonal, un gancho y gotas sueltas) y flotan despacio. El borde no es una línea ni un degradado: es ruido
  // (puntos que están o no están al azar). Al pasar el cursor por encima deja una estela que lo arrastra y lo hace más ancho y granulado un momento, y al elegir otra
  // fila la mancha se hincha y su borde se deshace un poco más antes de asentarse. Si el navegador no tiene WebGL no hay mancha: queda la lista.
  const canvas = document.createElement('canvas'); canvas.className = 'archive-blob-mask';
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
  if (!gl) return;
  // x, y, radio, amplitud x, amplitud y, velocidad, fase (unidades: 1 = alto de la mancha; el centro es 0, 0)
  const CIRCLES = [
    [.30, -.27, .065, .012, .014, .50, 0.0], [.21, -.18, .085, .014, .012, .42, 1.1], [.10, -.07, .110, .012, .016, .36, 2.3], [-.02, .05, .130, .016, .012, .31, 3.0],
    [-.13, .17, .105, .014, .016, .44, 4.2], [-.20, .29, .070, .016, .014, .55, 5.0], [-.31, -.06, .085, .018, .016, .38, 0.7], [-.22, -.19, .062, .014, .018, .47, 1.9],
    [-.08, -.30, .050, .020, .016, .60, 2.8], [.22, .08, .075, .020, .018, .33, 3.7], [.36, .12, .045, .030, .026, .52, 4.4], [.30, .31, .032, .030, .030, .66, 5.3],
    [-.40, -.30, .036, .026, .030, .58, 0.3], [.06, .39, .026, .030, .024, .70, 1.6],
  ];
  const COUNT = CIRCLES.length, TRAIL = 10, KNEAD = .11;           // KNEAD: lo que se funden dos círculos al acercarse
  const circles = new Float32Array(COUNT * 3), trail = new Float32Array(TRAIL * 4);
  const vertex = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }';
  const fragment = `precision highp float;
uniform vec2 uRes; uniform float uPulse; uniform float uTime; uniform vec3 uBg; uniform vec3 uC[${COUNT}]; uniform vec4 uT[${TRAIL}];
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 x){ vec2 i = floor(x), f = fract(x), u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y); }
float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.) / k; return min(a, b) - h * h * k * .25; }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; uv.y = 1. - uv.y;
  vec2 p = (uv - .5) * vec2(uRes.x / uRes.y, 1.);
  vec2 push = vec2(0.); float heat = 0.;                                   // la estela del cursor arrastra el borde, con grano
  for (int i = 0; i < ${TRAIL}; i++) { vec2 q = p - uT[i].xy; float w = exp(-dot(q, q) / .011); push += uT[i].zw * w; heat += length(uT[i].zw) * w * 14.; }
  p -= push * (.15 + .7 * noise(gl_FragCoord.xy * .55));
  float s = 1e5;
  for (int i = 0; i < ${COUNT}; i++) s = smin(s, length(p - uC[i].xy) - uC[i].z * (1. + .1 * uPulse), ${KNEAD.toFixed(3)});
  // El borde es ruido, no degradado: cada punto del borde está o no está, al azar, y la franja de puntos se ensancha donde pasa el cursor (heat)
  float band = .016 + .028 * uPulse + .05 * min(heat, 1.);
  float cover = 1. - smoothstep(-.012, band, s);           // 1 dentro, 0 fuera, intermedio en el borde
  float grain = hash(gl_FragCoord.xy + floor(uTime * 8.) * 17.31);
  float a = cover >= 1. ? 0. : (cover <= 0. ? 1. : 1. - step(grain, cover));   // dentro y fuera, sin puntos sueltos
  gl_FragColor = vec4(uBg * a, a);
}`;
  const compile = (type, src) => { const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh); return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null; };
  const vs = compile(gl.VERTEX_SHADER, vertex), fs = compile(gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  if (!vs || !fs) return;
  gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (name) => gl.getUniformLocation(program, name);
  const U = { time: u('uTime'), res: u('uRes'), pulse: u('uPulse'), bg: u('uBg'), c: u('uC'), t: u('uT') };
  const bg = (getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g) || [12, 12, 11]).slice(0, 3).map((n) => n / 255);
  gl.uniform3f(U.bg, bg[0], bg[1], bg[2]);
  blob.append(canvas); blob.classList.add('is-ready');

  const SCALE = .8;                                       // el grano se dibuja a algo menos que la resolución real
  let pulse = 0, aspect = 1, raf = 0, clock = 0, visible = true;
  const points = [];                                      // estela: { x, y, vx, vy, born }
  const place = (t) => CIRCLES.forEach(([x, y, r, ax, ay, sp, ph], i) => {
    circles[i * 3] = x + ax * Math.sin(t * .001 * sp + ph); circles[i * 3 + 1] = y + ay * Math.cos(t * .001 * sp * .83 + ph * 1.7); circles[i * 3 + 2] = r * 1.22;
  });
  const knead = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; };
  const inside = (x, y) => {                              // la misma forma, para saber si un clic cae dentro (sin estela)
    let d = 1e5;
    for (let i = 0; i < COUNT; i++) d = knead(d, Math.hypot(x - circles[i * 3], y - circles[i * 3 + 1]) - circles[i * 3 + 2] * (1 + .1 * pulse), KNEAD);
    return d < .0;
  };
  function frame(now) {
    raf = 0;
    const dt = Math.min((now - (clock || now - 16)) / 1000, .05); clock = now;
    pulse += (0 - pulse) * (1 - Math.exp(-2.6 * dt));
    place(motion.matches ? 0 : now);
    for (let i = 0; i < TRAIL; i++) {
      const pt = points[points.length - 1 - i], life = pt ? Math.max(0, 1 - (now - pt.born) / 600) : 0;
      trail[i * 4] = pt ? pt.x : 9; trail[i * 4 + 1] = pt ? pt.y : 9; trail[i * 4 + 2] = pt ? pt.vx * life * life : 0; trail[i * 4 + 3] = pt ? pt.vy * life * life : 0;
    }
    while (points.length && now - points[0].born > 600) points.shift();
    gl.uniform3fv(U.c, circles); gl.uniform4fv(U.t, trail); gl.uniform1f(U.pulse, pulse); gl.uniform1f(U.time, motion.matches ? 0 : now * .001);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!motion.matches && !document.hidden && visible) raf = requestAnimationFrame(frame); else clock = 0;
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const size = () => {
    const w = Math.max(2, Math.round(blob.clientWidth * SCALE)), h = Math.max(2, Math.round(blob.clientHeight * SCALE));
    canvas.width = w; canvas.height = h; aspect = w / h; gl.viewport(0, 0, w, h); gl.uniform2f(U.res, w, h); wake();
  };
  new ResizeObserver(size).observe(blob);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }).observe(blob);
  document.addEventListener('visibilitychange', wake);
  const toShape = (event) => { const r = blob.getBoundingClientRect(); return [((event.clientX - r.left) / r.width - .5) * aspect, (event.clientY - r.top) / r.height - .5]; };
  let last = null;
  blob.addEventListener('pointermove', (e) => {
    if (motion.matches || e.pointerType !== 'mouse') return;
    const [x, y] = toShape(e), now = performance.now();
    if (last) { const vx = Math.max(-.07, Math.min(.07, (x - last.x) * .9)), vy = Math.max(-.07, Math.min(.07, (y - last.y) * .9)); points.push({ x, y, vx, vy, born: now }); }
    last = { x, y }; wake();
  });
  blob.addEventListener('pointerenter', () => { pulse = Math.max(pulse, .5); wake(); });
  blob.addEventListener('pointerleave', () => { last = null; });
  blob.insideShape = (event) => { const [x, y] = toShape(event); return inside(x, y); };

  // ---------- Capas: cada colección tiene su muro, que se crea la primera vez que se elige ----------
  async function mount(row) {
    const base = row.dataset.items;
    const layer = document.createElement('div'); layer.className = 'archive-layer';
    const surface = document.createElement('div'); surface.className = 'archive-surface';
    const list = document.createElement('ul'); list.className = 'archive-cards';
    surface.append(list); layer.append(surface); blob.append(layer);
    const entry = { layer, grid: null }; layers.set(row, entry);
    try {
      const response = await fetch(base + 'items.json?v=20261111archive3');
      if (!response.ok) throw new Error('unavailable');
      const data = await response.json();
      if (!Array.isArray(data.items) || !data.items.length) throw new Error('empty');
      const makeCard = (item) => {
        const figure = document.createElement('figure'); figure.className = 'archive-card'; figure.dataset.card = item.id;
        const turn = document.createElement('span'); turn.className = 'archive-turn';
        const img = document.createElement('img');
        img.src = new URL(item.src, location.origin + base).href; img.alt = item.name; img.width = item.width || 640; img.height = item.height || 640;
        img.draggable = false; img.decoding = 'async';
        turn.append(img); figure.append(turn); return figure;
      };
      entry.grid = createInfiniteCardGrid({ surface, list, cards: data.items, makeCard, reduced: motion, entrance: !motion.matches, prefix: 'archive', aspect: 1, size: 1.1 });
    } catch (error) { layers.delete(row); layer.remove(); return; }
    // Pulsar una pieza (sin arrastrar) abre esa pieza en la página de la colección
    let press = null;
    surface.addEventListener('pointerdown', (e) => { press = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    surface.addEventListener('pointerup', (e) => {
      if (!press) return;
      const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y), quick = performance.now() - press.t < 600; press = null;
      if (moved > 5 || !quick) return;
      const card = document.elementFromPoint(e.clientX, e.clientY)?.closest('.archive-card');
      if (card && blob.insideShape(e)) location.href = row.getAttribute('href') + '#' + card.dataset.card;
    });
    if (active === row) layer.classList.add('is-on');
  }

  function activate(row) {
    if (active === row) return;
    active = row; pulse = 1; wake();
    rows.forEach((r) => r.classList.toggle('is-active', r === row));
    for (const [r, { layer }] of layers) layer.classList.toggle('is-on', r === row);
    if (!layers.has(row)) mount(row);
  }

  function start() {
    if (started || !live.matches) return;
    started = true;
    activate(rows[0]);                                  // al llegar, ya se ve la primera colección
    rows.forEach((row) => {
      row.addEventListener('pointerenter', () => activate(row));
      row.addEventListener('focus', () => activate(row));
    });
  }
  live.addEventListener('change', start);
  start();
})();
