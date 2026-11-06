// TEXT PRESSURE · el efecto «TextPressure» de React Bits (codepen.io/JuanFuentes/full/rgXKGQ) en JavaScript puro, SOLO con el eje de peso.
// Al pasar el ratón por una entrada de los menús del Digital Archive y del Playground, cada letra engorda según lo cerca que esté del cursor
// (la que está debajo, al máximo; las lejanas, más finas) y sigue al cursor con un poco de inercia. Al salir, todo vuelve al peso de siempre.
// Funnel solo tiene el eje de peso (300–800): el ancho y la inclinación del original necesitan otra fuente y no se usan.
// Marca una fila con data-pressure; el texto con el efecto es el de su .archive-name (el recuento «(2)» no se toca).
// Solo con ratón; con «reducir movimiento» no se crea nada. Para lectores de pantalla el texto sigue entero (y las letras sueltas se ocultan).
// EDITA los valores de abajo para cambiar el carácter.
const FAR = 320, NEAR = 800;      // peso de la letra más lejana y de la que está bajo el cursor (el de reposo es el de la página, 600)
const RADIUS = 0.6;               // hasta dónde llega el tirón del cursor, como fracción del ancho del texto
const SMOOTHING = 0.35;           // de 0 (instantáneo) a 1 (muy flotante): lo suave que siguen las letras al cursor

const fine = matchMedia('(hover: hover) and (pointer: fine)');
const calm = matchMedia('(prefers-reduced-motion: reduce)');
const clamp01 = (v) => Math.min(1, Math.max(0, v));

function setup(row) {
  const name = row.querySelector('.archive-name');
  const node = name && [...name.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
  if (!node) return;
  const label = node.textContent.trim();
  let box = null, spans = [], rest = 600;
  const cursor = { x: 0, y: 0 }, mouse = { x: 0, y: 0 };
  let over = false, engage = 0, raf = 0, last = 0;

  // Las letras se crean la primera vez que el ratón entra (hasta entonces, la fila es exactamente la de siempre)
  function build() {
    if (box) return;
    rest = Number(getComputedStyle(name).fontWeight) || 600;
    const hidden = document.createElement('span');
    hidden.className = 'archive-hidden'; hidden.textContent = label;     // el texto entero, para lectores de pantalla y para buscar
    box = document.createElement('span');
    box.setAttribute('aria-hidden', 'true');
    for (const ch of Array.from(label)) {
      const s = document.createElement('span');
      s.textContent = ch; if (ch === ' ') s.style.whiteSpace = 'pre';
      box.append(s); spans.push(s);
    }
    node.replaceWith(hidden, box);
  }
  function clear() { spans.forEach((s) => { s.style.fontVariationSettings = ''; }); }

  function tick(now) {
    raf = 0;
    const dt = last ? Math.min(now - last, 64) : 16; last = now;
    const lag = 1000 * SMOOTHING * SMOOTHING, follow = lag > 1 ? 1 - Math.exp(-dt / lag) : 1;
    mouse.x += (cursor.x - mouse.x) * follow; mouse.y += (cursor.y - mouse.y) * follow;
    const goal = over ? 1 : 0;
    engage += (goal - engage) * (1 - Math.exp(-dt / 170));
    if (Math.abs(goal - engage) < 0.004) engage = goal;

    const reach = Math.max(box.getBoundingClientRect().width * RADIUS, 1);
    for (const s of spans) {
      const r = s.getBoundingClientRect(), p = clamp01(1 - Math.hypot(mouse.x - (r.x + r.width / 2), mouse.y - (r.y + r.height / 2)) / reach);
      const w = rest + (FAR + (NEAR - FAR) * p - rest) * engage;
      s.style.fontVariationSettings = `'wght' ${Math.round(w)}`;
    }
    if (over || engage > 0) raf = requestAnimationFrame(tick);
    else { clear(); last = 0; }
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };

  row.addEventListener('pointerenter', (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    build(); over = true; cursor.x = mouse.x = e.clientX; cursor.y = mouse.y = e.clientY; wake();
  });
  row.addEventListener('pointermove', (e) => { cursor.x = e.clientX; cursor.y = e.clientY; if (over) wake(); });
  row.addEventListener('pointerleave', () => { over = false; wake(); });
}

if (fine.matches && !calm.matches) document.querySelectorAll('[data-pressure]').forEach(setup);
