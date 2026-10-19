// HOME · el tomate 3D (three.js): gira en el centro, lleva el anillo con el nombre "MARIO DIZ"
// y viaja a la esquina superior izquierda (logo de la barra) al hacer scroll.
// Con <body data-intro="auto"> no espera al scroll: sube solo poco después de cargar, se queda en
// la barra y avisa con el evento "tomato-docked" (lo usa js/home-intro.js para sacar el texto).
// En la barra solo gira; para que pese poco, el lienzo se encoge a un recuadro alrededor del tomate
// y se dibuja a 30 fotogramas por segundo.
// Para cambiar el texto del anillo busca  fillText('MARIO DIZ' ...

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.getElementById('scene');
const hint = document.getElementById('hint');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0, 10);

// The model uses an unlit baked texture, so it needs no lights.
const pivot = new THREE.Group(); // moved around the screen
const spinner = new THREE.Group(); // rotates in place
pivot.add(spinner);
scene.add(pivot);

// ---------- Name ring ----------
// "MARIO DIZ", once, printed on an open cylinder that circles the tomato.
// It spins the opposite way; its far side shows faintly through.
function nameTexture() {
  // The canvas is as wide (relative to its height) as the ring is around,
  // so the letters keep their proportions once wrapped.
  const c = document.createElement('canvas');
  c.width = 3200;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.font = '700 92px "Helvetica Neue", Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('MARIO DIZ', c.width / 2, c.height / 2 + 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

const ringTilt = new THREE.Group(); // fixed tilt so the ring reads as an ellipse
ringTilt.rotation.set(0.32, 0, -0.12);
const ring = new THREE.Group();     // spins
ringTilt.add(ring);
pivot.add(ringTilt);

const ringTex = nameTexture();
// Radius 0.6: just outside the tomato, whose body reaches 0.47 from its axis
const ringGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.15, 128, 1, true);
const ringBack = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
  map: ringTex, side: THREE.BackSide, transparent: true, opacity: 0.35, depthWrite: false,
}));
const ringFront = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
  map: ringTex, side: THREE.FrontSide, transparent: true, depthWrite: false,
}));
ringBack.renderOrder = 0;
ringFront.renderOrder = 2;
ring.add(ringBack, ringFront);

new GLTFLoader().load('/assets/models/tomato.glb', (gltf) => {
  const model = gltf.scene;
  // Center the model and normalize it to a height of 1 unit
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  model.position.sub(box.getCenter(new THREE.Vector3()));
  const holder = new THREE.Group();
  holder.add(model);
  holder.scale.setScalar(1 / Math.max(size.x, size.y, size.z));
  holder.traverse((o) => { o.renderOrder = 1; });
  spinner.add(holder);
  // Auto intro: the trip to the nav starts a moment after the tomato appears
  introAt = clock.elapsedTime + (reduced || SKIP_INTRO ? 0 : INTRO_DELAY);
  // The 3D tomato is ready: fade it in over the flat placeholder (see .tomato-ready in home.css)
  requestAnimationFrame(() => document.documentElement.classList.add('tomato-ready'));
});

// ---------- Layout ----------
// Hero: centered and large. Docked: small, in the top-left corner.
// The canvas is as tall as the screen with the browser bars hidden (100lvh in the CSS), so
// on phones it doesn't have to be rebuilt every time Safari's bar slides in or out while
// scrolling. A hidden probe of that same height tells its size even while it's cropped.
const probe = Object.assign(document.createElement('div'), { ariaHidden: 'true' });
probe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100vh;height:100lvh;visibility:hidden;pointer-events:none';
document.body.appendChild(probe);
const hero = document.querySelector('.hero');
let width = 0, height = 0;

function resize() {
  const w = probe.offsetWidth, h = probe.offsetHeight;
  if (w === width && h === height) return; // only the browser bar moved: nothing to rebuild
  width = w;
  height = h;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (cropped) setCrop(true); else renderer.setSize(width, height, false);
}
addEventListener('resize', resize);

// World units visible per pixel at the z = 0 plane
function unitsPerPixel() {
  const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
  return visibleHeight / height;
}

// The stem puts the model's center above the body: the body sits 9% of the
// tomato's size below it. Measured from renders on desktop and phone.
const BODY_OFFSET = 0.09;
const firstNavLink = document.querySelector('.nav-links a');

function layout(progress) {
  const upp = unitsPerPixel();
  // In the hero the tomato sits in its middle and scrolls with it, as if stuck to the page
  const h = hero.getBoundingClientRect();
  const heroPx = Math.min(width, h.height) * 0.5; // tomato size in the hero
  // Docked, the tomato is the logo at the left of the nav bar
  const dockPx = width < 700 ? 36 : 44;        // tomato size when docked
  const margin = width < 700 ? 14 : 24;

  const sizePx = THREE.MathUtils.lerp(heroPx, dockPx, progress);
  // Screen position of the tomato's center, in pixels from the top-left
  const xPx = THREE.MathUtils.lerp(width / 2, margin + dockPx / 2, progress);
  // Docked, the body's center lines up with the middle of the nav links
  const r = firstNavLink.getBoundingClientRect();
  const dockY = (r.top + r.bottom) / 2 - dockPx * BODY_OFFSET;
  const yPx = THREE.MathUtils.lerp(h.top + h.height / 2, dockY, progress);

  pivot.scale.setScalar(sizePx * upp);
  pivot.position.set((xPx - width / 2) * upp, (height / 2 - yPx) * upp, 0);
}

// ---------- Small canvas while docked ----------
// In the nav the tomato is only 44px, so the canvas shrinks to a box around it
// instead of redrawing the whole screen every frame. The camera's view offset
// renders exactly that part of the full-screen picture, so it looks the same.
let cropped = false;
function setCrop(on) {
  if (on) {
    const dockPx = width < 700 ? 36 : 44;
    const margin = width < 700 ? 14 : 24;
    const r = firstNavLink.getBoundingClientRect();
    const box = Math.ceil(dockPx * 2);
    const left = Math.round(margin + dockPx / 2 - box / 2);
    const top = Math.round((r.top + r.bottom) / 2 - dockPx * BODY_OFFSET - box / 2);
    Object.assign(canvas.style, { inset: 'auto', left: left + 'px', top: top + 'px', width: box + 'px', height: box + 'px' });
    renderer.setSize(box, box, false);
    camera.setViewOffset(width, height, left, top, box, box);
  } else {
    Object.assign(canvas.style, { inset: '', left: '', top: '', width: '', height: '' });
    camera.clearViewOffset();
    renderer.setSize(width, height, false);
  }
  cropped = on;
}
resize();

// ---------- Animation ----------
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// It flies to the nav once about a third of the hero has scrolled away, and back when the
// visitor scrolls above that. Two thresholds, so it doesn't bounce back and forth if the
// page stops right at the edge.
const DOCK_AT = 0.35, UNDOCK_AT = 0.25; // share of the hero's height scrolled away
let docked = scrollY > hero.offsetHeight * 0.3;
let shown = docked ? 1 : 0; // 0 = big in the hero, 1 = docked in the nav

// The tomato only flies when the visitor scrolls. If the page moves on its own before
// they touch anything (coming back to a card, the back button restoring the position),
// it just appears where it belongs.
let userMoved = false;
for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown']) {
  addEventListener(type, () => { userMoved = true; }, { once: true, passive: true, capture: true });
}
const DOCK_TIME = 0.7; // seconds for the trip between the two
const clock = new THREE.Clock();

// Auto intro (data-intro="auto"): the tomato flies up on its own and stays in the nav
const AUTO = document.body.dataset.intro === 'auto';
const INTRO_DELAY = 1.2;  // seconds the big tomato spins in the middle before flying up
const AUTO_TIME = 1.1;    // a slower, showier trip than the scroll one
let introAt = Infinity;   // set when the model has loaded
// Arriving at /#work (the Back button of a project): the tomato is already in the nav, no intro
const SKIP_INTRO = AUTO && location.hash === '#work';
if (SKIP_INTRO) introAt = 0;
let announced = false;
if (AUTO) { docked = false; shown = 0; }

// Docked, the 44px tomato only needs 30 frames per second; its slow spin looks the same
const DOCKED_FPS = 30;
let lastDraw = 0;

function frame(now) {
  requestAnimationFrame(frame);
  if (cropped && now - lastDraw < 1000 / DOCKED_FPS - 2) return;
  lastDraw = now;
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // Past the threshold the tomato goes straight to the nav in one move (and back above it).
  // It never parks halfway.
  const heroH = hero.offsetHeight;
  if (AUTO) {
    docked = t >= introAt;
  } else if (!docked && scrollY > heroH * DOCK_AT) docked = true;
  else if (docked && scrollY < heroH * UNDOCK_AT) docked = false;
  const target = docked ? 1 : 0;
  const step = AUTO ? (reduced || SKIP_INTRO ? 1 : dt / AUTO_TIME) : (reduced || !userMoved ? 1 : dt / DOCK_TIME);
  shown = target > shown ? Math.min(target, shown + step) : Math.max(target, shown - step);
  layout(ease(shown));

  // Docked and settled: draw only the small box around the tomato
  if ((shown >= 1) !== cropped) setCrop(shown >= 1);
  if (AUTO && shown >= 1 && !announced) { announced = true; document.dispatchEvent(new Event('tomato-docked')); }

  // Keep spinning, with a gentle flying wobble
  spinner.rotation.y += dt * (reduced ? 0.3 : 0.9);
  ring.rotation.y -= dt * (reduced ? 0.2 : 0.55);

  // The ring floats on its own rhythm and fades out as the tomato docks in the nav
  const ringOpacity = Math.max(0, 1 - ease(shown) * 1.6);
  ringFront.material.opacity = ringOpacity;
  ringBack.material.opacity = ringOpacity * 0.35;
  ringTilt.visible = ringOpacity > 0.01;
  if (!reduced) ringTilt.position.y = Math.sin(t * 1.1 + 1.3) * 0.05;
  if (!reduced) {
    // Wobble while flying; settle down when docked so it stays level with the links
    const calm = 1 - ease(shown);
    spinner.rotation.x = Math.sin(t * 0.8) * 0.18 * calm;
    spinner.rotation.z = Math.sin(t * 0.6) * 0.12 * calm;
    spinner.position.y = Math.sin(t * 1.4) * 0.06 * calm;
  }

  const hintOpacity = shown > 0.05 ? '0' : '0.85';
  if (hint.style.opacity !== hintOpacity) hint.style.opacity = hintOpacity;
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
