// CONTACT · arrastra el tomate rojo hasta el final de la regla (o pulsa «Open it for me») y se abre el programa de correo del visitante.
// La regla es un «slider magnificado»: las marcas cercanas al tirador crecen como un bulto que lo acompaña, y al soltar sin llegar al final vuelve con rebote.
// El tomate 3D (three.js, ya cargado en la web) da una vuelta entera mientras se arrastra el tirador de principio a fin.
// Para cambiar la dirección o el asunto del correo, edita las dos primeras líneas.
const ADDRESS = 'hey.mariodiz@gmail.com';
const MAIL = `mailto:${ADDRESS}?subject=Hello%20from%20dizmar.xyz`;

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const spin = document.getElementById('ct-spin');
const canvas = document.getElementById('ct-canvas');
const slider = document.getElementById('ct-slider');
const ticksEl = document.getElementById('ct-ticks');
const thumb = document.getElementById('ct-thumb');
const title = document.getElementById('ct-title');
const lead = document.getElementById('ct-lead');
const openBtn = document.getElementById('ct-open');
const copyBtn = document.getElementById('ct-copy');
const address = document.getElementById('ct-address');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Cada texto nuevo se «escribe» (js/contact-type.js); si ese script no está, se pone sin más
const write = (el, text, opts) => (window.ctType ? window.ctType(el, text, opts) : (el.textContent = text));

let prog = 0;          // 0 → 1: posición del tirador (la lee también el tomate 3D)
let done = false;

// ---- Confirmar: salto del tomate, texto nuevo y, un momento después, se abre el correo ----
function confirm() {
  if (done) return;
  done = true;
  target = travel;                 // el tirador se queda al final
  spin.classList.add('is-done');
  write(title, title.dataset.stateDone);
  openBtn.hidden = true;
  setTimeout(() => { location.href = MAIL; }, reduced ? 200 : 900);
  // Si no se ha abierto nada (sin programa de correo), se ofrece copiar la dirección o volver a intentarlo
  setTimeout(() => {
    const end = write(title, 'Did your mail app open?');
    write(lead, lead.dataset.stateDone, { delay: Math.max(0, end - 300) });
    address.hidden = false;
    copyBtn.hidden = false;
    openBtn.hidden = false;
    openBtn.textContent = 'Try again';
    done = false;
    spin.classList.remove('is-done');
    target = 0; wake();            // el tirador vuelve al principio
  }, 2600);
}
openBtn.addEventListener('click', confirm);
copyBtn.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(ADDRESS); copyBtn.textContent = 'Copied ✓'; }
  catch { // sin permiso para el portapapeles: se selecciona la dirección para copiarla a mano
    const r = document.createRange(); r.selectNodeContents(address);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    copyBtn.textContent = 'Press Ctrl/Cmd + C';
  }
  setTimeout(() => { copyBtn.textContent = 'Copy address'; }, 2200);
});

// ---- La regla de marcas ----
const TICKS = 41, SIGMA = 52, AMP = 2.4, CUT = 7;   // marcas, ancho del bulto (px), cuánto crecen (×) las más cercanas al tirador y hueco libre alrededor de este (px)
for (let i = 0; i < TICKS; i++) ticksEl.append(document.createElement('span'));
const ticks = [...ticksEl.children];
let tickX = [], travel = 0, r = 16;        // centro de cada marca, recorrido del tirador (px) y radio del tirador
function measure() {
  r = thumb.offsetWidth / 2;
  travel = Math.max(1, slider.clientWidth - 2 * r);
  const left = slider.getBoundingClientRect().left;
  tickX = ticks.map((t) => { const b = t.getBoundingClientRect(); return b.left - left + b.width / 2 - r; }); // relativo al recorrido (0 = principio)
}
new ResizeObserver(measure).observe(slider);
measure();

// ---- Física del tirador: un muelle hacia su objetivo (con rebote al volver; sin rebote con «reducir movimiento») ----
let pos = 0, vel = 0, target = 0, dragging = false, raf = 0, last = 0;
function wake() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } }
function step(now) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now;
  const follow = dragging || inside;
  const k = follow ? 900 : 220, zeta = reduced ? 1 : follow ? 0.9 : 0.5;         // siguiendo al ratón o al dedo va casi pegado; al soltarlo, vuelve con rebote
  vel += (k * (target - pos) - 2 * zeta * Math.sqrt(k) * vel) * dt;
  pos += vel * dt;
  pos = Math.min(travel * 1.02, Math.max(-travel * 0.02, pos));                   // un pequeño pasillo para el rebote
  prog = Math.min(1, Math.max(0, pos / travel));
  thumb.style.transform = `translateX(${pos.toFixed(2)}px)`;
  thumb.setAttribute('aria-valuenow', String(Math.round(prog * 100)));
  const c = pos;                                                                  // centro del tirador, en coordenadas del recorrido
  for (let i = 0; i < ticks.length; i++) {
    const dx = tickX[i] - c, d = dx / SIGMA, g = Math.exp(-d * d), s = 1 + AMP * g;
    ticks[i].style.transform = g > 0.004 ? `scaleY(${s.toFixed(3)})` : '';
    ticks[i].style.opacity = (0.4 + 0.6 * g).toFixed(2);
    // Las marcas se cortan alrededor del tirador: no lo tocan, dejan un hueco redondo (radio del tirador + CUT px)
    const hole = Math.sqrt(Math.max(0, (r + CUT) * (r + CUT) - dx * dx)) / s;     // medio alto del corte, en px de la marca sin estirar
    const mask = hole > 0 ? `linear-gradient(#000 calc(50% - ${hole.toFixed(2)}px), transparent calc(50% - ${hole.toFixed(2)}px) calc(50% + ${hole.toFixed(2)}px), #000 calc(50% + ${hole.toFixed(2)}px))` : '';
    ticks[i].style.maskImage = ticks[i].style.webkitMaskImage = mask;
  }
  if (!done && dragging && pos >= travel * 0.985) { dragging = false; confirm(); }
  if (dragging || inside || Math.abs(target - pos) > 0.3 || Math.abs(vel) > 2) raf = requestAnimationFrame(step); else raf = 0;
}

// CON RATÓN el tirador ES el cursor: al entrar en la zona de la regla, el punto rojo entra en la barra (css/cursor.js lo esconde ahí)
// y el tirador lo sigue de lado a lado, con las marcas creciendo a su paso. Para confirmar se mantiene pulsado y se arrastra hasta el final;
// si se suelta antes, el tirador sigue al ratón y, al salir de la zona, vuelve al principio.
// CON DEDO no hay cursor: se agarra el propio tirador y se arrastra.
let grab = 0, inside = false;
const xOf = (e) => Math.min(travel, Math.max(0, e.clientX - slider.getBoundingClientRect().left - r));
const isMouse = (e) => e.pointerType === 'mouse';
slider.addEventListener('pointerenter', (e) => { if (!isMouse(e) || done) return; inside = true; target = xOf(e); wake(); });
slider.addEventListener('pointerleave', (e) => { if (!isMouse(e) || dragging) return; inside = false; if (!done) target = 0; wake(); });
slider.addEventListener('pointerdown', (e) => {
  if (done) return;
  if (!isMouse(e) && e.target !== thumb) return;                     // con el dedo, solo agarrando el tirador
  dragging = true;
  try { slider.setPointerCapture(e.pointerId); } catch { /* sin puntero activo: no pasa nada */ }
  grab = isMouse(e) ? 0 : e.clientX - slider.getBoundingClientRect().left - r - pos;
  target = Math.min(travel, Math.max(0, xOf(e) - grab)); wake();
});
slider.addEventListener('pointermove', (e) => {
  if (done || !(dragging || (isMouse(e) && inside))) return;
  target = Math.min(travel, Math.max(0, xOf(e) - grab));
  wake();
});
const release = (e) => {
  if (!dragging) return;
  dragging = false;
  if (!done) { const rect = slider.getBoundingClientRect(); inside = isMouse(e) && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom; if (!inside) target = 0; }
  wake();
};
slider.addEventListener('pointerup', release);
slider.addEventListener('pointercancel', release);
// Teclado: flechas mueven el tirador un 10 %, Inicio lo devuelve y Fin confirma
thumb.addEventListener('keydown', (e) => {
  if (done) return;
  const step10 = travel * 0.1;
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') target = Math.min(travel, target + step10);
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') target = Math.max(0, target - step10);
  else if (e.key === 'Home') target = 0;
  else if (e.key === 'End') target = travel;
  else return;
  e.preventDefault(); wake();
  if (target >= travel * 0.985) setTimeout(confirm, reduced ? 0 : 250);
});

// ---- El tomate 3D: una vuelta entera de principio a fin del tirador, y girando despacio mientras espera ----
const renderer = (() => {
  try { return new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch { return null; }
})();
if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.z = 0.7 / Math.tan(THREE.MathUtils.degToRad(15)); // un tomate de 1 unidad llena el lienzo
  const spinner = new THREE.Group();
  scene.add(spinner);

  new GLTFLoader().load('/assets/models/tomato.glb', (gltf) => {
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    model.position.sub(box.getCenter(new THREE.Vector3()));
    const holder = new THREE.Group();
    holder.add(model);
    holder.scale.setScalar(1 / Math.max(size.x, size.y, size.z));
    spinner.add(holder);
    spin.classList.add('is-ready');
  });

  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(spin);
  resize();

  const clock = new THREE.Clock();
  let idle = 0;
  (function frame() {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (!reduced) idle += dt * 0.35;
    spinner.rotation.y = idle + prog * Math.PI * 2;
    if (!reduced) {
      spinner.rotation.x = Math.sin(t * 0.8) * 0.12;
      spinner.position.y = Math.sin(t * 1.4) * 0.03;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  })();
}
