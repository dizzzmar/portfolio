// LOADER · la pantalla de carga de la portada (estilos y explicación de los pasos: css/loader.css).
// Solo corre si un script del <head> puso la clase ld-on (primera vez de la visita, sin #work, sin volver atrás, sin «reducir movimiento»).
// Mientras tanto, la silueta del tomate se llena de rojo según avanza la carga REAL: HTML, cielo, todo el resto y el tomate 3D.
// Para cambiar la duración mínima del llenado, cambia MIN_FILL.
(() => {
  const root = document.documentElement;
  const loader = document.getElementById('loader');
  const fill = document.getElementById('ld-fill');
  if (!root.classList.contains('ld-on') || !loader || !fill) { loader?.remove(); return; }

  const MIN_FILL = 1100;    // ms: aunque todo cargue al instante, el llenado se ve entero
  const GIVE_UP = 9000;     // ms: si algo no llega (sin WebGL, red lenta), se abre igualmente
  const start = performance.now();
  const steps = { dom: false, sky: false, load: false, tomato: false };
  let shown = 0, last = start, finished = false;

  // Mientras dura la carga no se puede empezar a desplazar la portada
  const block = (e) => { if (!finished) { e.stopImmediatePropagation(); if (e.cancelable) e.preventDefault(); } };
  ['wheel', 'touchstart', 'touchmove'].forEach((t) => addEventListener(t, block, { capture: true, passive: false }));
  addEventListener('keydown', (e) => { if (!finished && [' ', 'ArrowDown', 'PageDown', 'End'].includes(e.key)) block(e); }, true);

  // ---- Qué ha llegado ----
  const sky = new Image();
  sky.src = '/assets/images/sky.webp';
  (sky.decode ? sky.decode() : Promise.resolve()).catch(() => {}).then(() => { steps.sky = true; });
  const onDom = () => { steps.dom = true; };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', onDom) : onDom();
  const onLoad = () => { steps.load = true; };
  document.readyState === 'complete' ? onLoad() : addEventListener('load', onLoad);
  // El tomate 3D avisa con la clase tomato-ready (js/home-tomato.js)
  const watch = new MutationObserver(() => { if (root.classList.contains('tomato-ready')) { steps.tomato = true; watch.disconnect(); } });
  root.classList.contains('tomato-ready') ? (steps.tomato = true) : watch.observe(root, { attributes: true, attributeFilter: ['class'] });

  const target = () => 0.08 + (steps.dom ? 0.22 : 0) + (steps.sky ? 0.25 : 0) + (steps.load ? 0.2 : 0) + (steps.tomato ? 0.25 : 0);

  // ---- El llenado: sube la superficie roja (solo transform, nada de repintar) ----
  function frame(now) {
    if (finished) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const elapsed = now - start;
    const goal = Math.min(target(), elapsed / MIN_FILL);          // ni más rápido que la carga ni que el tiempo mínimo
    shown += (goal - shown) * Math.min(1, dt * 7);
    fill.style.transform = `translateY(${(112 - 122 * shown).toFixed(2)}%)`;
    if ((shown > 0.995 && steps.tomato) || elapsed > GIVE_UP) return finish();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---- Final: aparece el 3D y gira sobre Z, el blanco se funde sobre el cielo y entra el menú ----
  function finish() {
    finished = true;
    fill.style.transform = 'translateY(-10%)';
    root.classList.add('ld-swap');
    document.dispatchEvent(new Event('loader-swap'));              // js/home-tomato.js: el giro sobre el eje Z
    setTimeout(() => root.classList.add('ld-reveal'), 600);        // el cielo aparece cuando el tomate ya va asentándose
    setTimeout(() => root.classList.add('ld-nav'), 1000);          // el menú entra con el cielo ya a medias
    setTimeout(() => {
      loader.remove();
      root.classList.remove('ld-on', 'ld-swap', 'ld-reveal');
      ['wheel', 'touchstart', 'touchmove'].forEach((t) => removeEventListener(t, block, { capture: true }));
      setTimeout(() => root.classList.remove('ld-nav'), 1200);
      try { sessionStorage.setItem('dizmar-loaded', '1'); } catch (e) { /* storage blocked */ }
    }, 600 + 1500);
  }
})();
