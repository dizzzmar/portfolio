// 404 · el tomate 3D que hace de 0 (three.js).

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const slot = document.getElementById('zero');
const canvas = document.getElementById('tomato');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

// The canvas spans 1.4x the slot; frame the camera so a 1-unit tomato fills the slot
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
camera.position.z = 0.7 / Math.tan(THREE.MathUtils.degToRad(15));

const spinner = new THREE.Group();
scene.add(spinner);

new GLTFLoader().load('/assets/models/tomato.glb', (gltf) => {
  const model = gltf.scene;
  // Center the model and normalize it to 1 unit (the model is unlit, so no lights)
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  model.position.sub(box.getCenter(new THREE.Vector3()));
  const holder = new THREE.Group();
  holder.add(model);
  holder.scale.setScalar(1 / Math.max(size.x, size.y, size.z));
  spinner.add(holder);
  slot.classList.add('ready');
});

function resize() {
  const { width, height } = canvas.getBoundingClientRect();
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(slot);
resize();

const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  spinner.rotation.y += dt * (reduced ? 0.3 : 0.9);
  if (!reduced) {
    spinner.rotation.x = Math.sin(t * 0.8) * 0.15;
    spinner.rotation.z = Math.sin(t * 0.6) * 0.1;
    spinner.position.y = Math.sin(t * 1.4) * 0.04;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
