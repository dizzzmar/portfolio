import * as THREE from 'three';
import { GLTFLoader } from '../../assets/vendor/three/examples/jsm/loaders/GLTFLoader.js';
const canvas = document.querySelector('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.AgXToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#002300');
const camera = new THREE.OrthographicCamera();
const target = new THREE.Vector3(0, 1.62, -.15);
let angle = -.42, elevation = .28, zoom = 4.5, dragging = null;
scene.add(new THREE.HemisphereLight(0xffe0b8, 0x302217, 1.1));
const key = new THREE.DirectionalLight(0xffdbc0, 2);
key.position.set(-3, 5, 4); key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -3, right: 3, top: 4, bottom: -2, near: .1, far: 15 });
key.shadow.normalBias = .025;
scene.add(key);
function render() {
  const aspect = innerWidth / innerHeight;
  const height = aspect < 1 ? zoom / aspect : zoom;
  Object.assign(camera, { left: -height * aspect / 2, right: height * aspect / 2, top: height / 2, bottom: -height / 2, near: .1, far: 40 });
  camera.position.set(Math.sin(angle) * 8, 1.62 + Math.sin(elevation) * 8, Math.cos(angle) * 8);
  camera.lookAt(target); camera.updateProjectionMatrix();
  renderer.render(scene, camera);
}
function resize() {
  // Same two-CSS-pixel grid as the selected shelf treatment.
  renderer.setSize(Math.ceil(innerWidth / 2), Math.ceil(innerHeight / 2), false);
  canvas.style.imageRendering = 'pixelated';
  render();
}
new GLTFLoader().load('../../assets/room/desktop/desktop.glb', ({ scene: model }) => {
  model.traverse(object => {
    if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; }
    // Keep practical lights local, without six additional shadow-map passes.
    if (object.isLight) { object.intensity *= object.name.includes('amber') ? .004 : .0015; object.distance = 2.5; object.decay = 2; }
  });
  scene.add(model); document.querySelector('#status').hidden = true;
  document.body.dataset.ready = 'true'; resize();
}, undefined, () => { document.querySelector('#status').textContent = 'The desktop could not load. Please refresh.'; });
canvas.addEventListener('pointerdown', e => { dragging = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => {
  if (!dragging) return;
  angle = THREE.MathUtils.clamp(angle + (e.clientX - dragging.x) * .005, -1.1, .35);
  elevation = THREE.MathUtils.clamp(elevation + (e.clientY - dragging.y) * .004, .08, .65);
  dragging = { x: e.clientX, y: e.clientY }; render();
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, () => { dragging = null; });
canvas.addEventListener('wheel', e => { e.preventDefault(); zoom = THREE.MathUtils.clamp(zoom + e.deltaY * .003, 3.2, 6.5); render(); }, { passive: false });
canvas.addEventListener('keydown', e => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', '='].includes(e.key)) return;
  e.preventDefault();
  if (e.key === 'ArrowLeft') angle -= .06;
  if (e.key === 'ArrowRight') angle += .06;
  if (e.key === 'ArrowUp') elevation += .04;
  if (e.key === 'ArrowDown') elevation -= .04;
  if (e.key === '+' || e.key === '=') zoom -= .15;
  if (e.key === '-') zoom += .15;
  angle = THREE.MathUtils.clamp(angle, -1.1, .35); elevation = THREE.MathUtils.clamp(elevation, .08, .65); zoom = THREE.MathUtils.clamp(zoom, 3.2, 6.5); render();
});
document.querySelector('#reset').addEventListener('click', () => { angle = -.42; elevation = .28; zoom = 4.5; render(); });
addEventListener('resize', resize); resize();
