// CONTACT · gira el tomate una vuelta entera (o pulsa «Open it for me») y se abre el programa de correo del visitante.
// El tomate 3D usa three.js (ya cargado en la web). Con «reducir movimiento» el tomate no gira solo, pero se puede arrastrar igual.
// Para cambiar la dirección o el asunto del correo, edita las dos primeras líneas.
const ADDRESS = 'hey.mariodiz@gmail.com';
const MAIL = `mailto:${ADDRESS}?subject=Hello%20from%20dizmar.xyz`;

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const spin = document.getElementById('ct-spin');
const canvas = document.getElementById('ct-canvas');
const ring = document.getElementById('ct-ring');
const meter = document.getElementById('ct-meter');
const title = document.getElementById('ct-title');
const lead = document.getElementById('ct-lead');
const openBtn = document.getElementById('ct-open');
const copyBtn = document.getElementById('ct-copy');
const address = document.getElementById('ct-address');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

let progress = 0;      // 0 → 1: una vuelta entera del tomate
let done = false;

// ---- Confirmar: salto del tomate, texto nuevo y, un momento después, se abre el correo ----
function confirm() {
  if (done) return;
  done = true;
  setProgress(1);
  spin.classList.add('is-done');
  title.textContent = title.dataset.stateDone;
  openBtn.disabled = true;
  setTimeout(() => { location.href = MAIL; }, reduced ? 200 : 900);
  // Si no se ha abierto nada (sin programa de correo), se ofrece copiar la dirección
  setTimeout(() => {
    title.textContent = 'Did your mail app open?';
    lead.textContent = lead.dataset.stateDone;
    address.hidden = false;
    copyBtn.hidden = false;
    openBtn.disabled = false;
    openBtn.textContent = 'Try again';
    done = false;
    spin.classList.remove('is-done');
    setProgress(0);
  }, 2600);
}

function setProgress(p) {
  progress = Math.min(1, Math.max(0, p));
  ring.style.strokeDashoffset = String(1 - progress);
  meter.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
}

openBtn.disabled = false;
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

// ---- El tomate 3D ----
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

  // Arrastrar: el giro sigue al dedo o al ratón y, al soltar, el tomate sigue girando un poco (inercia). Solo cuenta lo que gira el visitante.
  const PER_PX = 0.012;                  // radianes por píxel arrastrado (una vuelta ≈ 520 px)
  let dragging = false, lastX = 0, lastT = 0, vel = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; lastT = performance.now(); vel = 0;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now(), dx = e.clientX - lastX, dt = Math.max(1, now - lastT) / 1000;
    const d = dx * PER_PX;
    spinner.rotation.y += d;
    vel = vel * 0.6 + (d / dt) * 0.4;
    countTurn(Math.abs(d));
    lastX = e.clientX; lastT = now;
  });
  const release = () => { dragging = false; };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  const countTurn = (rad) => { if (!done) { setProgress(progress + rad / (Math.PI * 2)); if (progress >= 1) confirm(); } };

  // Teclado: con el tomate enfocado, las flechas lo giran
  canvas.tabIndex = 0;
  canvas.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (!k) return;
    e.preventDefault();
    vel += k * 4;
  });

  const clock = new THREE.Clock();
  (function frame() {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (!dragging) {
      const step = vel * dt;
      spinner.rotation.y += step;
      countTurn(Math.abs(step));
      vel *= Math.exp(-dt * 2.2);
      if (Math.abs(vel) < 0.05) vel = 0;
      if (!reduced && vel === 0) spinner.rotation.y += dt * 0.35; // despacito, para que se vea que se puede girar
    }
    if (!reduced) {
      spinner.rotation.x = Math.sin(t * 0.8) * 0.12;
      spinner.position.y = Math.sin(t * 1.4) * 0.03;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  })();
}
