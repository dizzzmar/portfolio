import * as THREE from 'three';

// A fixed low-resolution frame gives every surface the same pixel scale.
const CONFIG = { resolution: 300, cycle: 5.6, jumpHeight: 0.72, seed: 71 };
const canvas = document.querySelector('canvas');
const status = document.querySelector('#status');
const pause = document.querySelector('#pause');
const hop = document.querySelector('#hop');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reducedMotion.matches;
let elapsed = 0;
let seed = CONFIG.seed;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}

function grassTexture() {
  const surface = document.createElement('canvas');
  surface.width = surface.height = 256;
  const ctx = surface.getContext('2d');
  const palette = ['#419c25', '#54b72d', '#72c73b', '#318622', '#8bd348', '#237324'];
  // Correlated patches and scattered edge pixels avoid a perfectly cut-out disc.
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const dx = (x - 128) / 119, dy = (y - 128) / 116;
      const angle = Math.atan2(dy, dx);
      const edge = 0.94 + 0.025 * Math.sin(angle * 7) + 0.018 * Math.cos(angle * 11);
      const distance = Math.hypot(dx, dy);
      if (distance > edge + random() * 0.065 || (distance > edge - 0.05 && random() < 0.35)) continue;
      const patch = Math.sin(x * 0.06 + Math.sin(y * 0.04)) * Math.cos(y * 0.07);
      const index = Math.max(0, Math.min(5, Math.floor(2 + patch * 1.8 + random() * 2 - 1)));
      ctx.fillStyle = palette[index];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  return texture;
}

async function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  renderer.setSize(CONFIG.resolution, CONFIG.resolution, false);
  renderer.setPixelRatio(1);
  renderer.setClearColor(0xffffff);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2.65, 2.65, 2.65, -2.65, 0.1, 30);
  camera.position.set(4, 5.5, 7);
  camera.lookAt(0, 0.35, 0);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 4.1), new THREE.MeshBasicMaterial({ map: grassTexture(), transparent: true, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Curved, tapered blades grow in small clumps, with a clear space for the fruit.
  const vertices = [], colors = [];
  const greens = [0x23852b, 0x3aa522, 0x65c431, 0x88d442, 0x1b702b];
  for (let i = 0; i < 3100; i++) {
    const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * 1.82;
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    if (radius < 0.7) continue;
    const height = 0.09 + random() ** 2 * 0.30;
    const width = 0.012 + random() * 0.025;
    const direction = random() * Math.PI * 2;
    const lean = 0.03 + random() * 0.12;
    const color = new THREE.Color(greens[Math.floor(random() * greens.length)]);
    function edge(t, side) {
      return [x + Math.cos(direction) * lean * t * t + Math.sin(direction) * width * (1 - t) * side,
        0.005 + height * t, z + Math.sin(direction) * lean * t * t + Math.cos(direction) * width * (1 - t) * side];
    }
    for (let segment = 0; segment < 3; segment++) {
      const t = segment / 3, next = (segment + 1) / 3;
      vertices.push(...edge(t, -1), ...edge(t, 1), ...edge(next, -1),
        ...edge(t, 1), ...edge(next, 1), ...edge(next, -1));
      for (let j = 0; j < 6; j++) {
        const shade = 0.72 + (j < 2 ? t : next) * 0.28;
        colors.push(color.r * shade, color.g * shade, color.b * shade);
      }
    }
  }
  const grassGeometry = new THREE.BufferGeometry();
  grassGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  grassGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  scene.add(new THREE.Mesh(grassGeometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));

  // Dappled contact shadow: crisp pixels like the reference, no blurry CSS filter.
  const shadowSurface = document.createElement('canvas');
  shadowSurface.width = shadowSurface.height = 64;
  const ctx = shadowSurface.getContext('2d');
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const radius = Math.hypot((x - 32) / 30, (y - 32) / 28);
    if (random() < (1 - radius) * 1.35) {
      ctx.fillStyle = '#354023'; ctx.fillRect(x, y, 1, 1);
    }
  }
  const shadowTexture = new THREE.CanvasTexture(shadowSurface);
  shadowTexture.magFilter = THREE.NearestFilter;
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 1.55), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: 0.65, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0.12, 0.012, 0.08);
  scene.add(shadow);

  // Smooth fruit geometry keeps the tomato rounded even in the pixel render.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x638944, 2.1));
  const sunlight = new THREE.DirectionalLight(0xfff4de, 3.0);
  sunlight.position.set(-3, 6, 5);
  scene.add(sunlight);
  const tomato = new THREE.Group();
  const bodyGeometry = new THREE.SphereGeometry(0.77, 96, 64);
  const positions = bodyGeometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const angle = Math.atan2(z, x);
    const lobes = 1 + Math.cos(angle * 5) * 0.025 * (0.5 + Math.abs(y));
    const depression = y > 0 ? 0.10 * Math.exp(-(x * x + z * z) / 0.075) : 0;
    positions.setXYZ(i, x * lobes, y * 0.86 + 0.66 - depression, z * lobes);
  }
  bodyGeometry.computeVertexNormals();
  const skin = new THREE.MeshPhysicalMaterial({ color: 0xe51409, roughness: 0.29, metalness: 0, clearcoat: 0.32, clearcoatRoughness: 0.25 });
  tomato.add(new THREE.Mesh(bodyGeometry, skin));
  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x267f17, roughness: 0.8, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI * 2 / 6 + 0.2;
    const leafVertices = [], leafIndices = [];
    for (let j = 0; j <= 12; j++) {
      const t = j / 12, distance = t * (0.43 + (i % 2) * 0.08);
      const width = Math.sin(Math.PI * t) * 0.09;
      const y = 1.22 + Math.sin(t * Math.PI) * 0.09 - t * t * 0.16;
      for (const side of [-1, 1]) leafVertices.push(Math.cos(angle) * distance + Math.sin(angle) * width * side,
        y - width * 0.25, Math.sin(angle) * distance - Math.cos(angle) * width * side);
      if (j < 12) { const k = j * 2; leafIndices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const leaf = new THREE.BufferGeometry();
    leaf.setAttribute('position', new THREE.Float32BufferAttribute(leafVertices, 3));
    leaf.setIndex(leafIndices);
    leaf.computeVertexNormals();
    tomato.add(new THREE.Mesh(leaf, leafMaterial));
  }
  const stemCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 1.19, 0), new THREE.Vector3(0.02, 1.36, 0), new THREE.Vector3(0.10, 1.48, -0.03)]);
  tomato.add(new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 16, 0.035, 8, false), leafMaterial));
  scene.add(tomato);
  status.hidden = true;
  document.body.dataset.ready = 'true';

  function draw() {
    const phase = elapsed % CONFIG.cycle;
    let height = 0, squash = 1;
    if (phase > 1.6 && phase < 1.9) {
      squash = 1 - 0.13 * Math.sin((phase - 1.6) / 0.3 * Math.PI / 2);
    } else if (phase >= 1.9 && phase < 2.8) {
      const p = (phase - 1.9) / 0.9;
      height = CONFIG.jumpHeight * 4 * p * (1 - p);
      squash = 1 + 0.1 * Math.sin(Math.PI * p);
    } else if (phase >= 2.8 && phase < 3.5) {
      const p = (phase - 2.8) / 0.7;
      squash = 1 - 0.13 * Math.cos(p * Math.PI * 3) * (1 - p) ** 2;
    }
    tomato.position.y = 0.015 + height;
    tomato.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    tomato.rotation.y = 0.25 + Math.sin(elapsed * Math.PI * 2 / CONFIG.cycle) * 0.16;
    tomato.rotation.z = Math.sin(elapsed * Math.PI * 2 / CONFIG.cycle) * 0.035;
    shadow.scale.setScalar(1 + height * 0.4);
    shadow.material.opacity = 0.65 - height * 0.35;
    renderer.render(scene, camera);
  }
  function syncControls() {
    pause.textContent = paused ? 'Play' : 'Pause';
    pause.setAttribute('aria-pressed', String(paused));
  }
  pause.addEventListener('click', () => { paused = !paused; syncControls(); });
  hop.addEventListener('click', () => { elapsed = 1.6; paused = false; syncControls(); });
  reducedMotion.addEventListener('change', () => {
    paused = reducedMotion.matches;
    if (paused) { elapsed = 0; draw(); }
    syncControls();
  });
  syncControls();
  draw();
  let previous = performance.now(), lastDraw = previous;
  function frame(now) {
    requestAnimationFrame(frame);
    const delta = Math.min((now - previous) / 1000, 0.1);
    previous = now;
    if (document.hidden || paused) return;
    elapsed += delta;
    if (now - lastDraw < 1000 / 24) return;
    lastDraw = now;
    draw();
  }
  requestAnimationFrame(frame);
}
start().catch(error => {
  console.error('Tomato study could not load:', error);
  status.textContent = 'The scene could not load. Please reload to try again.';
  pause.disabled = hop.disabled = true;
});
