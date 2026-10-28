import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const CONFIG = { resolution: 224, period: 2.4, seed: 421 };
const canvas = document.querySelector('canvas');
const pause = document.querySelector('#pause');
const status = document.querySelector('#status');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reduced.matches;
let elapsed = 0;
let seed = CONFIG.seed;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const vec = (x, y, z = 0) => new THREE.Vector3(x, y, z);

function groundTexture() {
  const surface = document.createElement('canvas');
  surface.width = surface.height = 256;
  const ctx = surface.getContext('2d');
  const greens = ['#68a738', '#7fb843', '#93c455', '#549336'];
  const stones = ['#bdbba6', '#ccc8b1', '#a9a997', '#dad2b8', '#b1b09e'];
  // Concentric, staggered stone courses form a small circular paving, not a grid.
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const dx = x - 128, dy = y - 128, radius = Math.hypot(dx, dy);
    if (radius > 119 + random() * 7 || (radius > 114 && ((x + y) % 2 || random() < 0.3))) continue;
    ctx.fillStyle = greens[Math.floor(random() * greens.length)];
    if (radius < 96) {
      const ring = Math.floor(radius / 12);
      const count = Math.max(6, ring * 7);
      const a = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI) * count + (ring % 2) * 0.5;
      const seam = radius % 12 < 1.1 || a % 1 < 0.045;
      ctx.fillStyle = seam ? '#777f6a' : stones[(Math.floor(a) * 3 + ring * 7) % stones.length];
      if (!seam && random() < 0.14) ctx.fillStyle = '#9d9e89';
    }
    ctx.fillRect(x, y, 1, 1);
  }
  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  return texture;
}

async function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(1);
  renderer.setSize(CONFIG.resolution, CONFIG.resolution, false);
  renderer.setClearColor(0xffffff);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2.7, 2.7, 2.7, -2.7, 0.1, 30);
  camera.position.set(3.4, 5.2, 8);
  camera.lookAt(0, 1.15, 0);
  scene.add(new THREE.HemisphereLight(0xfff5e4, 0x69784c, 2.2));
  const sun = new THREE.DirectionalLight(0xfff0d6, 3);
  sun.position.set(-3, 7, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(512, 512);
  Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 4, bottom: -3 });
  sun.shadow.bias = -0.002;
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 4.5), new THREE.MeshStandardMaterial({ map: groundTexture(), transparent: true, alphaTest: 0.5, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const grassVertices = [];
  for (let i = 0; i < 450; i++) {
    const a = random() * Math.PI * 2, r = 1.72 + random() * 0.31;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const h = 0.025 + random() * 0.07;
    grassVertices.push(x - 0.015, 0, z, x + 0.015, 0, z, x + 0.02, h, z);
  }
  const grassGeometry = new THREE.BufferGeometry();
  grassGeometry.setAttribute('position', new THREE.Float32BufferAttribute(grassVertices, 3));
  scene.add(new THREE.Mesh(grassGeometry, new THREE.MeshBasicMaterial({ color: 0x70a840, side: THREE.DoubleSide })));

  const material = color => new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true });
  const skin = material(0xc98d66), hair = material(0x30251f), trousers = material(0x242b2d);
  const shoes = material(0x633a24), sole = material(0x302a23), cream = material(0xeee9ce);
  const shirt = material(0xf0ead6);
  shirt.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 shirtPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nshirtPosition = position;');
    shader.fragmentShader = 'varying vec3 shirtPosition;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float stripe = step(0.46, fract((shirtPosition.y + 0.5) * 8.0));
      diffuseColor.rgb *= mix(vec3(1.0), vec3(0.035, 0.06, 0.105), stripe);`);
  };
  shirt.customProgramCacheKey = () => 'breton-stripes-v1';
  function mesh(geometry, mat, parent, position = vec(0, 0, 0), scale = vec(1, 1, 1)) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.copy(position);
    object.scale.copy(scale);
    object.castShadow = true;
    parent.add(object);
    return object;
  }
  const sphere = new THREE.SphereGeometry(1, 10, 8);
  function oval(parent, mat, position, scale) { return mesh(sphere, mat, parent, position, scale); }
  function limb(parent, mat, a, b, top, bottom = top) {
    const object = mesh(new THREE.CylinderGeometry(top, bottom, 1, 8), mat, parent);
    object.userData.length = true;
    placeLimb(object, a, b);
    return object;
  }
  const up = vec(0, 1, 0);
  function placeLimb(object, a, b) {
    object.position.copy(a).add(b).multiplyScalar(0.5);
    const direction = b.clone().sub(a);
    object.scale.y = direction.length();
    object.quaternion.setFromUnitVectors(up, direction.normalize());
  }
  const person = new THREE.Group();
  person.rotation.y = -0.14;
  scene.add(person);
  for (const side of [-1, 1]) {
    const foot = oval(person, shoes, vec(side * 0.145, 0.085, 0.06), vec(0.10, 0.075, 0.19));
    foot.rotation.y = side * -0.12;
    oval(person, sole, vec(side * 0.145, 0.034, 0.065), vec(0.10, 0.025, 0.19));
    limb(person, trousers, vec(side * 0.13, 0.93), vec(side * 0.15, 0.53, side * 0.035), 0.105, 0.085);
    limb(person, trousers, vec(side * 0.15, 0.53, side * 0.035), vec(side * 0.145, 0.13, 0), 0.085, 0.067);
  }
  oval(person, trousers, vec(0, 0.94), vec(0.255, 0.16, 0.14));
  const upperBody = new THREE.Group();
  person.add(upperBody);
  const torso = mesh(new THREE.CylinderGeometry(0.245, 0.215, 1, 10), shirt, upperBody, vec(0, 1.29), vec(1, 0.61, 0.59));
  oval(upperBody, cream, vec(0, 0.992), vec(0.224, 0.025, 0.135));
  limb(upperBody, skin, vec(0, 1.57), vec(0, 1.74), 0.064);
  const head = new THREE.Group();
  head.position.set(0, 1.87, 0);
  upperBody.add(head);
  oval(head, skin, vec(0, 0, 0.01), vec(0.133, 0.18, 0.133));
  const hairCap = oval(head, hair, vec(-0.012, 0.085, -0.025), vec(0.139, 0.12, 0.134));
  hairCap.rotation.z = -0.15;
  oval(head, hair, vec(-0.115, 0.01, -0.04), vec(0.032, 0.095, 0.095));
  oval(head, skin, vec(0, -0.015, 0.146), vec(0.032, 0.045, 0.045));
  for (const side of [-1, 1]) {
    oval(head, skin, vec(side * 0.132, -0.01), vec(0.025, 0.045, 0.025));
    oval(head, hair, vec(side * 0.05, 0.025, 0.126), vec(0.014, 0.012, 0.012));
  }
  const arms = [-1, 1].map(side => {
    const shoulder = vec(side * 0.23, 1.53, 0);
    const elbow = vec(side * 0.40, 1.22, 0.02);
    const upper = limb(upperBody, shirt, shoulder, elbow, 0.095, 0.076);
    const forearm = limb(upperBody, skin, elbow, vec(side * 0.43, 1.19, 0.35), 0.060, 0.045);
    const hand = oval(upperBody, skin, vec(side * 0.43, 1.19, 0.35), vec(0.068, 0.036, 0.085));
    return { side, shoulder, upper, forearm, hand };
  });

  // A small wicker crate gives the act a prop and a few spare tomatoes.
  const crate = new THREE.Group();
  crate.position.set(-0.98, 0, 0.20);
  crate.rotation.y = -0.2;
  scene.add(crate);
  const wicker = material(0xa7703d), wickerLight = material(0xc3945c);
  mesh(new THREE.BoxGeometry(0.50, 0.29, 0.39), wicker, crate, vec(0, 0.16));
  for (let row = 0; row < 5; row++) {
    for (const side of [-1, 1]) {
      mesh(new THREE.BoxGeometry(0.52, 0.018, 0.02), wickerLight, crate, vec(0, 0.04 + row * 0.06, side * 0.20));
      mesh(new THREE.BoxGeometry(0.02, 0.018, 0.42), wickerLight, crate, vec(side * 0.26, 0.04 + row * 0.06));
    }
  }
  const { scene: tomatoSource } = await new GLTFLoader().loadAsync('../../assets/models/tomato.glb');
  const bounds = new THREE.Box3().setFromObject(tomatoSource);
  const center = bounds.getCenter(vec(0, 0, 0));
  const tomatoSize = Math.max(...bounds.getSize(vec(0, 0, 0)).toArray());
  tomatoSource.position.sub(center);
  const tomatoTemplate = new THREE.Group();
  tomatoTemplate.add(tomatoSource);
  tomatoTemplate.scale.setScalar(0.18 / tomatoSize);
  tomatoSource.traverse(object => { if (object.isMesh) { object.castShadow = true; } });
  const tomatoes = Array.from({ length: 3 }, () => {
    const fruit = tomatoTemplate.clone(true);
    person.add(fruit);
    return fruit;
  });
  for (let i = 0; i < 4; i++) {
    const spare = tomatoTemplate.clone(true);
    spare.position.set((i % 2 - 0.5) * 0.20, 0.30, (Math.floor(i / 2) - 0.5) * 0.15);
    spare.rotation.y = i;
    crate.add(spare);
  }

  const target = new THREE.WebGLRenderTarget(CONFIG.resolution, CONFIG.resolution, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const screen = new THREE.Scene();
  const screenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  screen.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { frame: { value: target.texture } }, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 v; void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: `uniform sampler2D frame; varying vec2 v;
      void main(){gl_FragColor=texture2D(frame,v);
        #include <colorspace_fragment>
        vec2 p=mod(floor(gl_FragCoord.xy),2.0);
        float threshold=(2.0*p.x+3.0*p.y-4.0*p.x*p.y+0.5)/4.0;
        gl_FragColor.rgb=clamp(floor(gl_FragColor.rgb*23.0+threshold)/23.0,0.0,1.0);
      }`,
  })));
  function draw() {
    const t = elapsed;
    upperBody.rotation.z = Math.sin(t * Math.PI / 0.4) * 0.012;
    head.rotation.x = -0.20 + Math.sin(t * Math.PI / 0.4) * 0.025;
    head.rotation.z = Math.sin(t * Math.PI / 0.4) * 0.045;
    for (const arm of arms) {
      // A hand catches outside, scoops inward, then throws across the body.
      // The 0.18-second scoop matches each tomato's carried segment exactly.
      const phase = ((t - (arm.side > 0 ? 0.4 : 0)) % 0.8 + 0.8) % 0.8;
      const carrying = phase >= 0.62;
      const p = carrying ? (phase - 0.62) / 0.18 : phase / 0.62;
      const reach = carrying ? THREE.MathUtils.lerp(0.53, 0.33, p) : THREE.MathUtils.lerp(0.33, 0.53, p * p * (3 - 2 * p));
      const handPosition = vec(arm.side * reach, 1.22 - (carrying ? 0.045 : 0.018) * Math.sin(p * Math.PI), 0.34);
      const elbow = vec(arm.side * 0.40, 1.21 - 0.02 * Math.sin(p * Math.PI), 0.025);
      placeLimb(arm.upper, arm.shoulder, elbow);
      placeLimb(arm.forearm, elbow, handPosition);
      arm.hand.position.copy(handPosition);
    }
    // Three phase-offset parabolas create a repeating alternating cascade.
    tomatoes.forEach((fruit, i) => {
      const clock = (t + i * 0.8) % CONFIG.period;
      const side = clock < 1.2 ? -1 : 1;
      const phase = clock % 1.2;
      if (phase < 1.02) {
        const p = phase / 1.02;
        fruit.position.set(THREE.MathUtils.lerp(side * 0.33, -side * 0.53, p), 1.28 + 1.55 * 4 * p * (1 - p), 0.34);
      } else {
        const p = (phase - 1.02) / 0.18;
        fruit.position.set(-side * THREE.MathUtils.lerp(0.53, 0.33, p), 1.28 - 0.045 * Math.sin(p * Math.PI), 0.34);
      }
      fruit.rotation.set(0.2, clock * Math.PI * 4 / CONFIG.period + i, Math.sin(clock * Math.PI * 2 / CONFIG.period) * 0.2);
    });
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(screen, screenCamera);
  }
  function controls() { pause.textContent = paused ? 'Play' : 'Pause'; pause.setAttribute('aria-pressed', String(paused)); }
  pause.addEventListener('click', () => { paused = !paused; controls(); });
  reduced.addEventListener('change', () => { paused = reduced.matches; controls(); });
  controls();
  draw();
  status.hidden = true;
  document.body.dataset.ready = 'true';
  let previous = performance.now(), lastDraw = previous;
  function frame(now) {
    requestAnimationFrame(frame);
    const delta = Math.min((now - previous) / 1000, 0.1);
    previous = now;
    if (document.hidden || paused) return;
    elapsed = (elapsed + delta) % CONFIG.period;
    if (now - lastDraw < 1000 / 24) return;
    lastDraw = now;
    draw();
  }
  requestAnimationFrame(frame);
}
start().catch(error => {
  console.error('Juggler scene could not load:', error);
  status.textContent = 'The scene could not load. Please reload to try again.';
  pause.disabled = true;
});
