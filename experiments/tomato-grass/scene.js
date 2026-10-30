import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// A fixed low-resolution frame gives every surface the same pixel scale.
const CONFIG = { resolution: 144, cycle: 5.6, jumpHeight: 0.72, seed: 71 };
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
  surface.width = surface.height = 128;
  const ctx = surface.getContext('2d');
  const palette = ['#419c25', '#54b72d', '#72c73b', '#318622', '#8bd348', '#237324'];
  // Correlated patches and scattered edge pixels avoid a perfectly cut-out disc.
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const dx = (x - 64) / 59.5, dy = (y - 64) / 58;
      const angle = Math.atan2(dy, dx);
      const edge = 0.94 + 0.025 * Math.sin(angle * 7) + 0.018 * Math.cos(angle * 11);
      const distance = Math.hypot(dx, dy);
      if (distance > edge + random() * 0.065 || (distance > edge - 0.05 && random() < 0.35)) continue;
      const patch = Math.sin(x * 0.12 + Math.sin(y * 0.08)) * Math.cos(y * 0.14);
      const index = Math.max(0, Math.min(5, Math.floor(2 + patch * 1.8 + random() * 0.8 - 0.4)));
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
  // Render the whole diorama on one deliberately chunky pixel grid, then
  // apply the same ordered color dithering everywhere.
  const target = new THREE.WebGLRenderTarget(CONFIG.resolution, CONFIG.resolution, {
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
  });
  const pixelScene = new THREE.Scene();
  const pixelCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const pixelMaterial = new THREE.ShaderMaterial({
    uniforms: { frame: { value: target.texture } },
    vertexShader: `varying vec2 uvPosition;
      void main() { uvPosition = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `uniform sampler2D frame; varying vec2 uvPosition;
      float bayer(vec2 point) {
        vec2 p = mod(floor(point), 4.0);
        vec2 low = mod(p, 2.0), high = floor(p / 2.0);
        float a = 2.0 * low.x + 3.0 * low.y - 4.0 * low.x * low.y;
        float b = 2.0 * high.x + 3.0 * high.y - 4.0 * high.x * high.y;
        return (4.0 * a + b + 0.5) / 16.0;
      }
      void main() {
        gl_FragColor = texture2D(frame, uvPosition);
        #include <colorspace_fragment>
        float threshold = bayer(gl_FragCoord.xy);
        gl_FragColor.rgb = clamp(floor(gl_FragColor.rgb * 23.0 + threshold) / 23.0, 0.0, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  pixelScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), pixelMaterial));
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
  for (let i = 0; i < 1250; i++) {
    const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * 1.82;
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    if (radius < 0.7) continue;
    const height = 0.07 + random() ** 2 * 0.23;
    const width = 0.025 + random() * 0.032;
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
        const shade = 0.82 + (j < 2 ? t : next) * 0.18;
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

  const { scene: model } = await new GLTFLoader().loadAsync('../../assets/models/tomato.glb');
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  model.position.set(-center.x, -box.min.y, -center.z);
  model.traverse(object => {
    if (!object.isMesh) return;
    // Enrich only the red skin, preserving the original leaves and pale highlights.
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (material.map) {
        // Sample the baked facets crisply, matching the grass texture and canvas grid.
        material.map.magFilter = THREE.NearestFilter;
        material.map.minFilter = THREE.NearestFilter;
        material.map.generateMipmaps = false;
        material.map.needsUpdate = true;
      }
      material.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
          #include <map_fragment>
          float redSkin = smoothstep(0.04, 0.24, diffuseColor.r - max(diffuseColor.g, diffuseColor.b));
          vec3 richerRed = diffuseColor.rgb * vec3(1.13, 0.84, 0.86);
          diffuseColor.rgb = mix(diffuseColor.rgb, richerRed, redSkin);
        `);
      };
      material.customProgramCacheKey = () => 'tomato-gentle-red-v1';
    }
  });
  const normalized = new THREE.Group();
  normalized.add(model);
  normalized.scale.setScalar(1.54 / Math.max(size.x, size.y, size.z));
  const tomato = new THREE.Group();
  tomato.add(normalized);
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
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(pixelScene, pixelCamera);
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
