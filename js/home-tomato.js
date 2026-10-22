// HOME · el tomate 3D (three.js): gira en el centro, lleva el anillo con el nombre "MARIO DIZ"
// Con <body data-intro="work"> su posición la manda el viaje de js/home-intro.js (window.homeJourney.j, de 0 a 1), que sigue a la rueda y al dedo:
//   el tomate sale del centro, rodea el texto "Creative ___", pasa por detrás de él y sube al logo de la barra; al volver, lo hace al revés.
// Para que pase "por detrás" del texto, el lienzo cambia de capa (debajo del texto mientras lo cruza, encima del resto).
// En la barra solo gira; para que pese poco, el lienzo se encoge a un recuadro alrededor del tomate
// y se dibuja a 30 fotogramas por segundo.
// Para cambiar el texto del anillo busca  fillText('MARIO DIZ' ...

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.getElementById('scene');
const hint = document.getElementById('hint');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Llegada desde el tomate de otra página (js/transitions.js pone land-fly): empieza en la barra y vuela al centro
const FLY_FROM_NAV = document.documentElement.classList.contains('land-fly') && !reduced;

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

const tintMaterials = []; // los materiales del tomate: se oscurecen un poco al pasar por detrás del texto (da profundidad)
let tintNow = 1;
function setTint(v) {
  if (Math.abs(v - tintNow) < 0.004) return;
  tintNow = v;
  for (const m of tintMaterials) m.color.setScalar(v);
}

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
  holder.traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((m) => { if (m && m.color && !tintMaterials.includes(m)) tintMaterials.push(m); }); });
  // Auto intro: the trip to the nav starts a moment after the tomato appears
  if (!CLICK_INTRO) introAt = clock.elapsedTime + (reduced || skipIntro ? 0 : INTRO_DELAY);
  // The 3D tomato is ready: fade it in over the flat placeholder (see .tomato-ready in home.css)
  requestAnimationFrame(() => document.documentElement.classList.add('tomato-ready'));
  // Desde otra página: el tomate ya está en la barra; tras un momento sale volando hacia el centro de la portada
  if (FLY_FROM_NAV) setTimeout(() => { skipIntro = false; introAt = Infinity; announced = false; document.documentElement.classList.remove('land-fly'); if (CLICK_INTRO) window.homeJourney?.go(0); }, 350);
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
  measureText();
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

// ---------- El viaje: del centro, rodeando el texto "Creative ___", por detrás de él y hasta el logo de la barra ----------
// j = 0 portada · 1 en la barra. Es una función pura de j (sin estado): la rueda lo mueve hacia delante y hacia atrás y el tomate siempre
// está donde toca. Tres tramos:
//   A  sale del centro hacia el punto de abajo de una elipse que rodea el texto (el tomate pasa por delante),
//   B  la recorre media vuelta: abajo → derecha → arriba. Al pasar por la derecha se mete detrás del texto y se hace más pequeño y oscuro,
//   C  desde arriba, aún detrás, sigue hacia la izquierda, sale por el lado del texto, vuelve a ponerse delante y sube al logo.
const lineEl = document.querySelector('.intro-line');
const lineFirst = lineEl && lineEl.querySelector(':scope > span:first-child');
let textW = 0, textH = 0; // tamaño estimado del bloque de texto (lo que el tomate debe rodear)
function measureText() {
  if (!lineFirst) return;
  textW = lineFirst.offsetWidth * 1.3; // la palabra de abajo cambia de longitud: se deja holgura
  textH = lineFirst.offsetHeight * 2;
}
document.fonts?.ready.then(measureText);
const J_STEP = 0.16, J_ORBIT = 0.62; // fin del tramo A y fin del B
const lerp = THREE.MathUtils.lerp;
const smooth01 = (v) => { const t = THREE.MathUtils.clamp(v, 0, 1); return t * t * (3 - 2 * t); };
let behindNow = false;
function setBehind(on) {
  if (on === behindNow) return;
  behindNow = on;
  canvas.style.zIndex = on ? '0' : ''; // 0: debajo del texto (z-index 1), encima del cielo; vacío: el valor del CSS (encima de todo, también de la barra)
}
function journeyLayout(j, J) {
  const upp = unitsPerPixel();
  const h = hero.getBoundingClientRect();
  const cx = width / 2, cy = h.top + h.height / 2;
  const heroPx = Math.min(width, h.height) * 0.5;
  const dockPx = width < 700 ? 36 : 44;
  const margin = width < 700 ? 14 : 24;
  const r = firstNavLink.getBoundingClientRect();
  const dockX = margin + dockPx / 2;
  const dockY = (r.top + r.bottom) / 2 - dockPx * BODY_OFFSET;
  let x, y, size, tint = 1, behind = false;
  if (reduced || J.simple) { // sin órbita: vuelo directo del centro a la barra
    const e = ease(j);
    x = lerp(cx, dockX, e); y = lerp(cy, dockY, e); size = lerp(heroPx, dockPx, e);
  } else {
    if (!textW) measureText();
    // Tamaño y radios de la órbita: el tomate cabe a los lados del texto y la pasada de atrás cruza su parte de arriba
    let orbitPx = Math.min(width, h.height) * 0.3;
    orbitPx = Math.min(orbitPx, Math.max(70, 2 * (width / 2 - textW / 2 - 10)));
    let rx = textW / 2 + orbitPx * 0.5 + 14;
    rx = Math.max(Math.min(rx, width / 2 - orbitPx * 0.55 - 4), width * 0.18);
    const ry = Math.max(textH * 0.3, orbitPx * 0.4); // poco alto: la pasada de atrás cruza por detrás de las letras, no por encima
    const at = (phi) => ({ x: cx + rx * Math.sin(phi), y: cy + ry * Math.cos(phi), s: orbitPx * (0.84 + 0.22 * Math.cos(phi)) });
    if (j < J_STEP) {
      const o = at(0), t = smooth01(j / J_STEP);
      x = lerp(cx, o.x, t); y = lerp(cy, o.y, t); size = lerp(heroPx, o.s, t);
    } else if (j < J_ORBIT) {
      const t = (j - J_STEP) / (J_ORBIT - J_STEP);
      const phi = Math.PI * (0.65 * t + 0.35 * smooth01(t));
      const o = at(phi);
      x = o.x; y = o.y; size = o.s;
      behind = phi > Math.PI / 2;
      tint = 0.72 + 0.28 * (Math.cos(phi) + 1) / 2;
    } else {
      // Curva desde arriba del texto (yendo hacia la izquierda) hasta el logo
      const t = (j - J_ORBIT) / (1 - J_ORBIT);
      const o = at(Math.PI);
      const u = 1 - Math.pow(1 - t, 2.2);
      const px = cx - (cx - dockX) * 0.62, py = o.y; // punto de control: sigue hacia la izquierda antes de subir
      x = (1 - u) * (1 - u) * o.x + 2 * (1 - u) * u * px + u * u * dockX;
      y = (1 - u) * (1 - u) * o.y + 2 * (1 - u) * u * py + u * u * dockY;
      size = lerp(o.s, dockPx, smooth01(t));
      // Detrás mientras se solape con el texto; en cuanto lo deja de cruzar, vuelve a ponerse delante
      behind = Math.abs(x - cx) < textW / 2 + size / 2 && Math.abs(y - cy) < textH / 2 + size / 2;
      tint = lerp(0.72, 1, smooth01(t * 1.4));
    }
    J.dx = THREE.MathUtils.clamp((x - cx) / Math.max(1, rx), -1, 1); // para el paralaje del texto
  }
  setBehind(behind);
  setTint(tint);
  pivot.scale.setScalar(size * upp);
  pivot.position.set((x - width / 2) * upp, (height / 2 - y) * upp, 0);
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
const CLICK_INTRO = document.body.dataset.intro === 'work';
const AUTO = document.body.dataset.intro === 'auto' || CLICK_INTRO;
const INTRO_DELAY = 1.2;  // seconds the big tomato spins in the middle before flying up
const AUTO_TIME = 1.1;    // a slower, showier trip than the scroll one
let introAt = Infinity;   // set when the model has loaded
// Arriving at /#work or coming back with Atrás from a project: the tomato is already in the nav, no intro
let skipIntro = AUTO && (location.hash === '#work' || document.body.classList.contains('work-engaged')); // mutable: al volver a la portada, el viaje se ve
if (skipIntro) introAt = 0;
let announced = false;
if (AUTO) { docked = false; shown = 0; }
if (FLY_FROM_NAV && AUTO) { skipIntro = true; introAt = 0; shown = 1; announced = true; } // empieza acoplado en la barra

// Docked, the 44px tomato only needs 30 frames per second; its slow spin looks the same
const DOCKED_FPS = 30;
let lastDraw = 0;

function frame(now) {
  requestAnimationFrame(frame);
  if (cropped && now - lastDraw < 1000 / DOCKED_FPS - 2) return;
  lastDraw = now;
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  const heroH = hero.offsetHeight;
  const journey = CLICK_INTRO ? window.homeJourney : null;
  if (CLICK_INTRO) {
    // El viaje lo manda js/home-intro.js: aquí solo se coloca el tomate donde toca (sin viaje, se queda en el centro de la portada)
    shown = journey ? journey.j : 0;
    journeyLayout(shown, journey || { simple: false, dx: 0 });
  } else {
    // Past the threshold the tomato goes straight to the nav in one move (and back above it).
    // It never parks halfway.
    if (AUTO) {
      docked = t >= introAt;
    } else if (!docked && scrollY > heroH * DOCK_AT) docked = true;
    else if (docked && scrollY < heroH * UNDOCK_AT) docked = false;
    const target = docked ? 1 : 0;
    const step = AUTO ? (reduced || skipIntro ? 1 : dt / AUTO_TIME) : (reduced || !userMoved ? 1 : dt / DOCK_TIME);
    shown = target > shown ? Math.min(target, shown + step) : Math.max(target, shown - step);
    layout(ease(shown));
  }

  // Docked and settled: draw only the small box around the tomato
  if ((shown >= 0.999) !== cropped) setCrop(shown >= 0.999);
  if (AUTO && !CLICK_INTRO && shown >= 1 && !announced) { announced = true; document.dispatchEvent(new Event('tomato-docked')); }

  // Keep spinning, with a gentle flying wobble
  spinner.rotation.y += dt * (reduced ? 0.3 : 0.9);
  ring.rotation.y -= dt * (reduced ? 0.2 : 0.55);

  // The ring floats on its own rhythm and fades out as the tomato docks in the nav
  const ringOpacity = CLICK_INTRO ? 1 - smooth01(shown / 0.3) : Math.max(0, 1 - ease(shown) * 1.6);
  ringFront.material.opacity = ringOpacity;
  ringBack.material.opacity = ringOpacity * 0.35;
  ringTilt.visible = ringOpacity > 0.01;
  if (!reduced) ringTilt.position.y = Math.sin(t * 1.1 + 1.3) * 0.05;
  if (!reduced) {
    // Wobble while flying; settle down when docked so it stays level with the links
    const calm = CLICK_INTRO ? 1 - smooth01((shown - 0.7) / 0.3) : 1 - ease(shown);
    spinner.rotation.x = Math.sin(t * 0.8) * 0.18 * calm;
    spinner.rotation.z = Math.sin(t * 0.6) * 0.12 * calm;
    spinner.position.y = Math.sin(t * 1.4) * 0.06 * calm;
  }

  const hintOpacity = shown > 0.05 ? '0' : '0.85';
  if (hint.style.opacity !== hintOpacity) hint.style.opacity = hintOpacity;
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
