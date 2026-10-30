// Interactive shelf: scene, object selection, camera framing and shared effects.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { HorizontalBlurShader } from 'three/addons/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/addons/shaders/VerticalBlurShader.js';
import { createPokemonAlbum } from './room/pokemon-album.js?v=20261030collagemotion1';
import { createWiiPlayer } from './room/wii-player.js?v=20261029wii1';
import { createRoomLoading } from './room/loading.js?v=20261022p';
import { createRoomLighting } from './room/lighting.js?v=20261023a';
import { addRoomRug } from './room/rug.js?v=20261022a';

const canvas = document.getElementById('room');
const status = document.getElementById('status');
const nav = document.getElementById('object-nav');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
// Resolution: at most 1.5 pixels per CSS pixel (the room has fine pixels and is blurred in places, so 2× only costs: on an iPad
// it is almost twice the pixels for every effect). If the frames still come late, it steps down on its own (see adaptQuality).
let pixelRatio = Math.min(devicePixelRatio, 1.5);
renderer.setPixelRatio(pixelRatio);
renderer.localClippingEnabled = true; // the room is set from the bottom up while it loads (js/room/loading.js)
renderer.outputColorSpace = THREE.SRGBColorSpace;
// AgX is Blender's default view transform, so colours roll off like the Blender render
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
// Cinematic, cozy evening: very little ambient light so the shadows stay deep, a narrow warm "sunset"
// spotlight raking across the wall from the left, a cool moonlight rim from behind for contrast
// (warm/cool, like a film still), and the tomato lamp doing most of the work (added on load).
// On top: soft bloom, a vignette, a warm grade and the fine pixel treatment below.
scene.background = new THREE.Color('#0b2f04'); // verde Lincoln «de noche» (css/room.css: --night)
const reflections = new THREE.PMREMGenerator(renderer);
scene.environment = reflections.fromScene(new RoomEnvironment(renderer)).texture;
reflections.dispose();
// three 0.160 has no scene.environmentIntensity, so the reflections are dimmed per material on load
const ENV_INTENSITY = 0.04;
scene.add(new THREE.HemisphereLight(0xffd2a8, 0x1a0f0a, 0.07));
const key = new THREE.DirectionalLight(0xffb27a, 0.12);
key.position.set(-4, 5, 6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
key.shadow.radius = 4;
scene.add(key);
scene.add(key.target);
const rim = new THREE.DirectionalLight(0x7fa6ff, 0.3);
rim.position.set(4, 3, -2);
scene.add(rim);
// Warm low "sunset" beam from the left, with a soft edge: a band of light across the wall and shelf
const sunset = new THREE.SpotLight(0xff9a52, 0, 0, Math.PI / 16, 0.6, 1.4);
sunset.castShadow = true;
sunset.shadow.mapSize.set(2048, 2048);
sunset.shadow.bias = -0.0005;
sunset.shadow.radius = 5;
scene.add(sunset);
scene.add(sunset.target);
const camera = new THREE.PerspectiveCamera(35, 1, .1, 1000);
// The visitor doesn't orbit the shelf: the camera eases between an overview and a
// closer look at whichever object is hovered in the list on the left.
const view = { pos: new THREE.Vector3(), target: new THREE.Vector3(), ready: false };
const goal = { pos: new THREE.Vector3(), target: new THREE.Vector3() };

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const outline = new OutlinePass(new THREE.Vector2(1, 1), scene, camera);
outline.edgeStrength = 4;
outline.edgeGlow = 0.8;
outline.edgeThickness = 2;
outline.visibleEdgeColor.set('#ffe6c4');
outline.hiddenEdgeColor.set('#7a4a2a');
composer.addPass(outline);
// Soft glow around the brightest things (the lamp), like Blender's bloom
// High threshold: only the emissive lamp is bright enough to bloom, not the lit wall
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.4, 0.45, 2.6);
composer.addPass(bloom);
composer.addPass(new OutputPass());
// Film look after tone mapping: warm shadows/highlights and a vignette.
// The presenter below adds the selected stable pixel texture instead of moving grain.
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, vignette: { value: 0.42 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float vignette; varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(c, c * vec3(1.06, 0.98, 0.9), 0.6);                       // warm grade
      c = mix(c, c * vec3(0.92, 0.95, 1.08), (1.0 - smoothstep(0.0, 0.35, l)) * 0.35); // slightly cool deep shadows
      float d = distance(vUv, vec2(0.5));
      c *= 1.0 - vignette * smoothstep(0.35, 0.85, d);                  // vignette
      gl_FragColor = vec4(c, 1.0);
    }`,
});
composer.addPass(grade);

const horizontalBlur = new ShaderPass(HorizontalBlurShader);
const verticalBlur = new ShaderPass(VerticalBlurShader);
horizontalBlur.enabled = verticalBlur.enabled = false;
composer.addPass(horizontalBlur);
composer.addPass(verticalBlur);
// The effects render into a texture, which is then copied to the screen. While the Wii's discs are being chosen, the blurred
// room behind them doesn't change: then only the copy runs and the room isn't drawn again (bloom, outline, blur…) every frame.
composer.renderToScreen = false;
// Selected preview 03: a 480 × 480 grid at 960 × 960, i.e. 2 CSS px per cell.
// Keep the lighting at full quality and pixelate only its final image; DOM text and Wii discs stay sharp.
const ROOM_PIXEL_SIZE = 2;
const present = new FullScreenQuad(new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: null }, grid: { value: new THREE.Vector2(1, 1) } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 grid;
    varying vec2 vUv;
    // Build a 4 × 4 Bayer threshold from two nested 2 × 2 cells.
    float bayer2(vec2 p) {
      vec2 q = mod(floor(p), 2.0);
      return 2.0*q.x + 3.0*q.y - 4.0*q.x*q.y;
    }
    void main() {
      vec2 cell = floor(vUv * grid);
      vec3 c = texture2D(tDiffuse, (cell + 0.5) / grid).rgb;
      float threshold = (4.0*bayer2(cell) + bayer2(floor(cell/2.0)) + 0.5)/16.0 - 0.5;
      // 64 colour steps/channel and light dithering match the finer study's third option.
      c = floor(clamp(c + threshold*0.35/64.0, 0.0, 1.0)*64.0 + 0.5)/64.0;
      gl_FragColor = vec4(c, 1.0);
    }`,
  depthTest: false, depthWrite: false,
}));

// Match normalized mesh names and their ancestors to the room's destinations.
// Stickers that slap on when hovering an object. Swap the image (same 1600×567 size)
// and the alt text to change them.
// The last song I played on Spotify.
const nowPlaying = {
  image: '/assets/room/now-playing-sticker.webp',
  alt: 'Now playing: Bug by Fontaines D.C. — Romance',
};
// The last film I watched: when the camera comes close to the wall poster, a new poster
// unrolls over the old one. Swap the image (about 840×1200, portrait) and the title to change it.
const lastWatched = {
  image: '/assets/room/film-poster.webp',
  title: 'Last watched: La Bola Negra',
};

const destinations = [
  // Both are outlined, but the camera looks at the collection on the lower shelf
  { label: 'Now playing', key: 'vinyls', match: /^music (vinyl collection|displayed vinyl sleeve)\b/, focus: /^music vinyl collection\b/, track: nowPlaying, href: null },
  { label: 'Pokémon collection', key: 'mimikyu', match: /^mimikyu plush root$/, href: null },
  { label: 'Last watched', key: 'volver-poster', match: /^wall upper left poster\b/, poster: lastWatched, href: null },
  // The camera frames just the tomato, not the cord that runs down to the floor
  { label: 'Tomato lamp', key: 'tomato-lamp', match: /^lamp\b/, focus: /^lamp (tomato diffuser|green calyx)\b/, href: null },
  { label: 'Plant', key: 'plant', match: /^(plants (eucalyptus|fluted vase)\b|plant1 fbx$)/, href: null },
  { label: 'Recently played', key: 'wii', match: /^wii\b/, focusMaterial: /Wii (pearl white|silver stand)/i, href: null },
];
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let meshes = [];
let down = null;
const wiiDestination = destinations.find(item => item.key === 'wii');
const wiiPlayer = createWiiPlayer({
  scene, camera, renderer,
  onOpen() {
    highlight(null);
    resize();
    focusOn(wiiDestination);
  },
  onClose({ completed }) {
    resize();
    highlight(null);
    focusOn(null);
    returnRate = completed ? 3.5 : 16;
  },
});
const pokemonAlbum = createPokemonAlbum({
  onOpen() { highlight(null); hoverEvent = null; },
  onClose() { focusOn(null); },
});
const lighting = createRoomLighting({
  scene, camera, renderer, canvas, reduced,
  onChange(dark) {
    if (lampFlicker) { lampFlicker.start = false; setLamp(dark ? 0 : 1); }
    scene.background.set(dark ? '#020c01' : '#0b2f04');
    outline.enabled = bloom.enabled = !dark;
    const button = nav.querySelector('[data-object="tomato-lamp"]');
    button?.setAttribute('aria-pressed', String(!dark));
    button?.setAttribute('aria-label', `Tomato lamp — turn lights ${dark ? 'on' : 'off'}`);
    if (dark) { highlight(null); focusOn(null); }
  },
});

// The selectable thing a mesh (or any of its parents) belongs to, or null for the rest of the room
const words = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// Cables belong to nothing: the lamp's red cord and the Wii's cable neither select nor light up their object
const isCable = (object) => /\bcord\b/.test(words(object.name)) || [].concat(object.material || []).some((material) => /cable/i.test(material.name));

function destinationFor(object) {
  if (object.isMesh && isCable(object)) return null;
  for (let current = object; current && current !== scene; current = current.parent) {
    const name = words(current.name);
    const found = destinations.find((item) => item.match.test(name));
    if (found) return found;
  }
  return null;
}

function pick(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(meshes, false)[0];
  if (!hit) return null;
  const item = destinationFor(hit.object);
  return item ? { item, object: hit.object } : null;
}

// ---------- Bumper stickers (now playing, last watched) ----------
// A vintage bumper sticker. Hovering the record or the poster
// slaps it on; moving away peels it off from the bottom-right corner.
function stickerCard(track) {
  const el = (tag, cls, text) => Object.assign(document.createElement(tag), { className: cls, textContent: text || '' });
  const sticker = el('div', 'sticker');
  const face = el('div', 'sticker-face');
  const artwork = document.createElement('img');
  artwork.className = 'sticker-art';
  artwork.src = track.image;
  artwork.alt = track.alt;
  artwork.width = 1600;
  artwork.height = 567;
  artwork.draggable = false;
  face.append(artwork);
  sticker.append(face, el('div', 'sticker-flap'));
  return sticker;
}

const trackEl = document.getElementById('track');
let stickerState = 'off'; // off, on or peeling
let stickerTrack = null;   // which sticker is on
let stickerAnims = [];
const stopSticker = () => { stickerAnims.forEach((a) => a.cancel()); stickerAnims = []; };
function showSticker(track) {
  if (stickerState === 'on' && stickerTrack === track) return;
  stopSticker();
  stickerTrack = track;
  trackEl.replaceChildren(stickerCard(track));
  trackEl.hidden = false;
  stickerState = 'on';
  if (reduced) return;
  // Slapped on: drops in big and tilted, overshoots a little, settles
  stickerAnims = [trackEl.firstChild.animate([
    { transform: 'translateY(-1.5em) rotate(-14deg) scale(1.3)', opacity: 0 },
    { transform: 'rotate(-1deg) scale(.96)', opacity: 1, offset: .65 },
    { transform: 'rotate(-3.5deg) scale(1.01)', offset: .85 },
    { transform: 'rotate(-3deg) scale(1)' },
  ], { duration: 460, easing: 'cubic-bezier(.2,.8,.3,1)' })];
}
function hideSticker() {
  if (stickerState !== 'on') return;
  if (reduced) { trackEl.hidden = true; stickerState = 'off'; return; }
  stopSticker();
  stickerState = 'peeling';
  const sticker = trackEl.firstChild;
  const face = sticker.querySelector('.sticker-face');
  const flap = sticker.querySelector('.sticker-flap');
  const w = face.offsetWidth, h = face.offsetHeight, c = Math.round(h * .75);
  const cut = (k) => `polygon(0px 0px, ${w}px 0px, ${w}px ${h - k}px, ${w - k}px ${h}px, 0px ${h}px)`;
  // 1. the bottom-right corner lifts and folds back
  const peel = { duration: 380, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' };
  stickerAnims = [
    face.animate([{ clipPath: cut(0) }, { clipPath: cut(c) }], peel),
    flap.animate([{ width: '0px', height: '0px' }, { width: c + 'px', height: c + 'px' }], peel),
  ];
  // 2. then the whole sticker comes away
  const off = sticker.animate([
    { transform: 'rotate(-3deg)', opacity: 1 },
    { transform: 'translate(-2.5em, -3em) rotate(-16deg) scale(.92)', opacity: 0 },
  ], { duration: 320, delay: 330, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' });
  stickerAnims.push(off);
  off.onfinish = () => { stopSticker(); trackEl.hidden = true; trackEl.replaceChildren(); stickerState = 'off'; };
}

function highlight(selection) {
  outline.selectedObjects = selection
    ? meshes.filter(mesh => destinationFor(mesh)?.key === selection.item.key)
    : [];
  const track = selection?.item.track;
  if (track) showSticker(track); else hideSticker();
  for (const button of nav.querySelectorAll('button')) button.classList.toggle('active', !!selection && button.textContent === selection.item.label);
  canvas.style.cursor = selection ? 'pointer' : 'default';
  document.documentElement.classList.toggle('dot-hot', !!selection); // el punto rojo (js/cursor.js) crece sobre un objeto
}

// The camera only comes closer when hovering a NAME in the list (see the buttons below), never when hovering
// an object in the 3D room. Over an object the cursor just becomes a hand, and a click opens it.
// The hover test (a ray against the whole room) runs at most once per frame, not on every mouse event
let hoverEvent = null;
canvas.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse') return;
  hoverEvent = event;
});
function updateHover() {
  if (!hoverEvent) return;
  const event = hoverEvent;
  hoverEvent = null;
  if (lighting.dark) {
    canvas.style.cursor = 'crosshair';
    document.documentElement.classList.remove('dot-hot');
    return;
  }
  const selection = pick(event);
  canvas.style.cursor = selection ? 'pointer' : 'default';
  document.documentElement.classList.toggle('dot-hot', Boolean(selection));
}
canvas.addEventListener('pointerleave', () => {
  hoverEvent = null;
  canvas.style.cursor = 'default';
  document.documentElement.classList.remove('dot-hot');
});
canvas.addEventListener('pointerdown', event => { down = [event.clientX, event.clientY]; });
canvas.addEventListener('pointerup', event => {
  if (!down) return;
  const moved = Math.hypot(event.clientX - down[0], event.clientY - down[1]);
  down = null;
  if (moved >= 8) return;
  if (lighting.dark) { lighting.setDark(false); return; }
  const selection = pick(event);
  if (selection?.item.key === 'tomato-lamp') { openItem(selection.item); return; }
  if (selection?.item.key === 'mimikyu' && event.pointerType !== 'mouse') { openItem(selection.item); return; } // en el móvil abre directo: el zoom lo taparía el álbum
  if (selection?.item.key === 'wii') {
    wiiPlayer.open(nav.querySelector('[data-object="wii"]'));
    return;
  }
  if (event.pointerType === 'mouse') {
    if (selection) openItem(selection.item);
    else resetFocus();  // clic fuera de los objetos: vuelve a la vista general
    return;
  }
  // Touch has no hover: the first tap comes closer, a second tap on the same object opens it,
  // and a tap on the rest of the room goes back to the overview
  if (selection && focused === selection.item) { openItem(selection.item); return; }
  highlight(selection);
  focusOn(selection ? selection.item : null);
});
canvas.addEventListener('pointercancel', () => { down = null; });

// Clicking an object only keeps the camera zoomed on it. Only items with a page (href) navigate.
function openItem(item) {
  if (item.key === 'mimikyu') { pokemonAlbum.open(nav.querySelector('[data-object="mimikyu"]')); return; }
  if (item.key === 'tomato-lamp') { lighting.setDark(!lighting.dark); return; }
  if (item.key === 'wii') {
    wiiPlayer.open(nav.querySelector('[data-object="wii"]'));
    return;
  }
  if (item.href) location.href = item.href;
}

const sleeves = [];  // materials of the displayed vinyl sleeve, whose glow follows the lamp
let lampLevel = 1;   // 0 = lamp off, 1 = fully lit
// shelf-web.glb is shelf.glb made light for the web (geometry compressed with meshopt, textures as WebP of at most 1024 px):
// 4.4 MB instead of 23 MB, and about 67 MB of graphics memory instead of 150. shelf.glb stays as the source.
const roomLoader = new GLTFLoader();
roomLoader.setMeshoptDecoder(MeshoptDecoder);
roomLoader.load('/assets/room/shelf-web.glb?v=20261022a', gltf => {
  const model = gltf.scene;
  scene.add(model);
  model.updateMatrixWorld(true); // world positions are needed below to place the lamp light
  let tomato = null;
  model.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    for (const material of [].concat(object.material)) {
      material.envMapIntensity = ENV_INTENSITY;
      // Cut-out images (the fish sticker…) cast their shape, not a square, in the light beams' shadows
      if (material.transparent || material.alphaMap) material.alphaTest = material.alphaTest || 0.5;
    }
    if (/^footwear\b/.test(words(object.name))) { object.visible = false; return; }
    if (/^room\b/.test(words(object.name))) return;
    if (/^lamp tomato diffuser\b/.test(words(object.name))) {
      tomato = object;
      // Deep red, lit from inside, under a glossy lacquer coat that catches the room
      object.material = new THREE.MeshPhysicalMaterial({
        color: '#c80000',
        emissive: '#ff0000',
        emissiveIntensity: 0.22, // low on purpose: AgX desaturates bright colours, so a dimmer glow stays redder
        roughness: 0.3,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        envMapIntensity: 0.25,   // enough for gloss; more turns the red pink
      });
      object.castShadow = false; // the light sits inside it
    }
    meshes.push(object);
  });
  wiiPlayer.attach(model.getObjectByName('Wii'));
  addRoomRug(scene, renderer);
  // Aim the sunset beam at the wall from the front left, scaled to the model's size
  {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
    sunset.position.set(mid.x - size.x * 1.6, mid.y + size.y * 0.55, mid.z + size.z * 1.8);
    sunset.target.position.set(mid.x + size.x * 0.15, mid.y + size.y * 0.12, box.min.z);
    sunset.intensity = 4 * size.y * size.y; // physical falloff: brightness grows with the distance it has to travel
  }
  if (tomato) {
    const center = new THREE.Box3().setFromObject(tomato).getCenter(new THREE.Vector3());
    // The lamp lights the wall and shelf in a warm pool, like the Blender render
    const lamp = new THREE.PointLight(0xff8a45, 4.3, 0, 2);
    lamp.position.copy(center).add(new THREE.Vector3(0, .02, .12));
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(1024, 1024);
    lamp.shadow.bias = -0.002;
    lamp.shadow.radius = 6;
    scene.add(lamp);
    lampFlicker = { light: lamp, material: tomato.material, intensity: lamp.intensity, glow: tomato.material.emissiveIntensity, start: null };
    if (!reduced) setLamp(0); // starts off, then flickers on once the room is shown
  }
  // The displayed sleeve shows the cover of the last song I played. It has a glow of
  // its own, which follows the lamp (see setLamp), so while the lamp is still off the
  // cover is as dark as the rest of the room. If the file is missing, the sleeve
  // keeps its original art.
  for (const mesh of meshes) {
    if (!/^music displayed vinyl sleeve\b/.test(words(mesh.name)) || !/album/i.test(mesh.material.name)) continue;
    mesh.material = mesh.material.clone();
    sleeves.push({ material: mesh.material, base: mesh.material.emissiveIntensity });
    mesh.material.emissiveIntensity = sleeves[sleeves.length - 1].base * lampLevel;
  }
  new THREE.TextureLoader().load('/assets/room/vinyl-cover.webp', (cover) => {
    cover.colorSpace = THREE.SRGBColorSpace;
    cover.flipY = false; // glTF textures aren't flipped
    cover.anisotropy = renderer.capabilities.getMaxAnisotropy();
    for (const sleeve of sleeves) {
      sleeve.material.map = cover;
      sleeve.material.emissiveMap = cover; // the sleeve glows, so the cover is its emissive texture too
      sleeve.base = 0.45; // the old art was dark, so it glowed at 2x; a real cover would blow out
      sleeve.material.emissiveIntensity = sleeve.base * lampLevel;
      sleeve.material.needsUpdate = true;
    }
  });
  // The wall poster gets a second image and a shader that unrolls it over the first one
  // from the top (see the frame loop). uPosterReveal goes from 0 (old poster) to 1 (new one).
  const posterMesh = meshes.find((mesh) => /^wall upper left poster\b/.test(words(mesh.name)) && /poster/i.test(mesh.material.name));
  if (posterMesh) {
    new THREE.TextureLoader().load(lastWatched.image, (filmPoster) => {
      filmPoster.colorSpace = THREE.SRGBColorSpace;
      filmPoster.flipY = false; // glTF textures aren't flipped
      filmPoster.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const material = posterMesh.material = posterMesh.material.clone();
      material.envMapIntensity = ENV_INTENSITY;
      material.clippingPlanes = [loading.clip]; // clone() copies the plane; it must share the live one
      material.onBeforeCompile = (shader) => {
        shader.uniforms.uPoster2 = { value: filmPoster };
        shader.uniforms.uPosterReveal = posterReveal;
        shader.fragmentShader = shader.fragmentShader
          .replace('void main() {', 'uniform sampler2D uPoster2;\nuniform float uPosterReveal;\nvoid main() {')
          .replace('#include <map_fragment>', `#ifdef USE_MAP
  // glTF UVs start at the top of the image, so the new poster comes down from v = 0
  const float SOFT = 0.025;
  float edge = uPosterReveal * (1.0 + SOFT);
  float k = 1.0 - smoothstep(edge - SOFT, edge, vMapUv.y);
  // a soft shadow just under the unrolling edge, as if the paper still curls a little
  float curl = smoothstep(edge - SOFT * 4.0, edge, vMapUv.y) * (1.0 - smoothstep(edge, edge + SOFT * 2.0, vMapUv.y));
  vec4 posterColor = mix(texture2D(map, vMapUv), texture2D(uPoster2, vMapUv), k);
  posterColor.rgb *= 1.0 - 0.45 * curl * step(0.001, uPosterReveal) * step(uPosterReveal, 0.999);
  diffuseColor *= posterColor;
#endif`);
      };
      material.needsUpdate = true;
    });
  }
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const radius = Math.max(size.x, size.y * 1.5, size.z * 2);
  key.target.position.copy(center);
  roomFrame = { size, center };
  lighting.attach(model, bounds);
  // While it is being set, the room is cut by the loading sweep (the rug too)
  for (const root of [model, scene.getObjectByName('DIZ low-resolution rug')]) {
    root?.traverse(object => {
      if (object.isMesh) for (const material of [].concat(object.material)) material.clippingPlanes = [loading.clip];
    });
  }
  // Static geometry and lights can reuse their shadow maps between frames.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  frameRoom();
  loading.finish(bounds);
  destinations.forEach(item => {
    if (!meshes.some(mesh => destinationFor(mesh) === item)) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.object = item.key;
    button.textContent = item.label;
    if (['wii', 'mimikyu'].includes(item.key)) button.setAttribute('aria-haspopup', 'dialog');
    if (item.key === 'tomato-lamp') {
      button.setAttribute('aria-pressed', 'true');
      button.setAttribute('aria-label', 'Tomato lamp — turn lights off');
    }
    // Touching the Pokémon button opens the album at once, so the camera does not come closer (nobody would see it, and it costs a frame)
    const opensAtOnce = item.key === 'mimikyu' && matchMedia('(pointer: coarse)').matches;
    button.addEventListener('focus', () => {
      if (opensAtOnce) return;
      const mesh = meshes.find(candidate => destinationFor(candidate) === item);
      highlight({ item, object: mesh });
    });
    button.addEventListener('focus', () => { if (!opensAtOnce) focusOn(item); });
    button.addEventListener('blur', () => resetFocus());
    button.addEventListener('mouseenter', () => {
      if (opensAtOnce) return;
      const mesh = meshes.find(candidate => destinationFor(candidate) === item);
      highlight({ item, object: mesh });
      focusOn(item);
    });
    button.addEventListener('mouseleave', () => resetFocus());
    button.addEventListener('click', () => {
      openItem(item);
    });
    nav.append(button);
  });
  resize(); // the list now has its final size, so frame the room around it
  (window.requestIdleCallback || (f => setTimeout(f, 2500)))(() => pokemonAlbum.prefetch(), { timeout: 5000 }); // the album opens already loaded
}, event => loading.progress(event), () => loading.fail());

// ---------- Framing ----------
// The free area for the room: right of the left column on desktop; between the
// title and the object list on narrow screens. The camera keeps its three-quarter
// angle and stands just far enough back for the room to fill that area.
let roomFrame = null;
function freeArea() {
  const width = innerWidth, height = innerHeight;
  if (wiiPlayer.active) return { left: 24, top: 100, right: 24, bottom: 100 };
  const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 64;
  // En escritorio la columna de texto (título y lista) ocupa la izquierda y la habitación el resto; en móvil la habitación queda entre el título y la lista
  const panel = innerWidth > 900 ? document.querySelector('.intro').getBoundingClientRect().right + 24 : 0;
  if (panel) return { left: panel, top: navH, right: 0, bottom: 24 };
  const intro = document.querySelector('.intro-head').getBoundingClientRect();
  const list = document.getElementById('object-nav').getBoundingClientRect();
  return { left: 0, top: intro.bottom + 8, right: 0, bottom: list.height ? height - list.top + 8 : 24 };
}
const VIEW_DIR = new THREE.Vector3(-0.29, 0.1, 0.95).normalize(); // three-quarter, from front left, a little above
// Closest distance (along VIEW_DIR) at which a box's 8 corners land inside the
// free area, scaled by `share` (1 = fill it, 0.5 = half of it), with a 6% margin.
function fitDistance(center, half, share) {
  const area = freeArea();
  const w = innerWidth - area.left - area.right, h = innerHeight - area.top - area.bottom;
  const probe = new THREE.PerspectiveCamera(camera.fov, innerWidth / innerHeight, 0.01, 1000);
  const limX = (w / innerWidth) * 0.94 * share, limY = (h / innerHeight) * 0.94 * share;
  const corner = new THREE.Vector3();
  const fits = (d) => {
    probe.position.copy(center).addScaledVector(VIEW_DIR, d);
    probe.lookAt(center);
    probe.updateMatrixWorld();
    for (let i = 0; i < 8; i++) {
      corner.set(i & 1 ? half.x : -half.x, i & 2 ? half.y : -half.y, i & 4 ? half.z : -half.z).add(center).project(probe);
      if (corner.z > 1 || Math.abs(corner.x) > limX || Math.abs(corner.y) > limY) return false;
    }
    return true;
  };
  let lo = half.length() * 0.2, hi = half.length() * 60;
  for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
  return hi;
}

let overview = null;
let focused = null;
let returnRate = 16;
let returning = false;  // true al alejarse: la vuelta es más rápida que el acercamiento
const focusViews = new Map();
function frameRoom() {
  if (!roomFrame) return;
  const { size, center } = roomFrame;
  const dist = fitDistance(center, size.clone().multiplyScalar(0.5), 1);
  overview = { target: center.clone(), pos: center.clone().addScaledVector(VIEW_DIR, dist), dist };
  focusViews.clear();
  focusOn(focused);
  if (!view.ready) { view.pos.copy(goal.pos); view.target.copy(goal.target); view.ready = true; }
}

// A closer look: aim most of the way at the object and come 70% of the way in
// towards a framing where it fills 60% of the free area. Closer, not a close-up.
// Back to the overview at once (the camera eases back faster than it comes in)
function resetFocus() {
  highlight(null);
  focusOn(null);
  if (nav.contains(document.activeElement)) document.activeElement.blur();
}

function focusOn(item) {
  if (pokemonAlbum.active) return;
  if (lighting.dark && item && !(item === wiiDestination && wiiPlayer.active)) return;
  if (wiiPlayer.active && item !== wiiDestination) return;
  returnRate = 16;
  focused = item;
  returning = !item;
  if (!overview) return;
  if (!item) { goal.pos.copy(overview.pos); goal.target.copy(overview.target); return; }
  if (!focusViews.has(item)) {
    const box = new THREE.Box3();
    for (const mesh of meshes) {
      if (!mesh.visible || destinationFor(mesh) !== item) continue;
      if (item.focus && !item.focus.test(words(mesh.name))) continue;
      if (item.focusMaterial && ![].concat(mesh.material).some(material => item.focusMaterial.test(material.name))) continue;
      box.expandByObject(mesh);
    }
    const center = box.getCenter(new THREE.Vector3());
    const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    const closeWii = item.key === 'wii' && wiiPlayer.active;
    const target = closeWii ? center : overview.target.clone().lerp(center, 0.8);
    const dist = closeWii ? fitDistance(center, half, 0.66) : THREE.MathUtils.lerp(overview.dist, fitDistance(center, half, 0.6), 0.7);
    focusViews.set(item, { target, pos: target.clone().addScaledVector(VIEW_DIR, dist) });
  }
  const v = focusViews.get(item);
  goal.pos.copy(v.pos);
  goal.target.copy(v.target);
}

function resize() {
  const width = innerWidth, height = innerHeight;
  renderer.setSize(width, height, false);
  present.material.uniforms.grid.value.set(Math.max(1, Math.round(width / ROOM_PIXEL_SIZE)), Math.max(1, Math.round(height / ROOM_PIXEL_SIZE)));
  composer.setSize(width, height);
  bloom.setSize(width, height);
  camera.aspect = width / height;
  // Shift the picture so the room is centred in the free area, not the whole screen
  const area = freeArea();
  const dx = (area.left - area.right) / 2, dy = (area.top - area.bottom) / 2;
  if (dx || dy) camera.setViewOffset(width, height, -dx, -dy, width, height);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  frameRoom();
}
addEventListener('resize', resize);
resize();
const loading = createRoomLoading({
  scene, status, reduced,
  onShown() {},
  onBounds(box) {
    roomFrame = { size: box.getSize(new THREE.Vector3()), center: box.getCenter(new THREE.Vector3()) };
    resize();
  },
});
// ---------- Lamp flicker on load ----------
// Brightness keyframes [seconds, 0..1]: sputters a few times, then stays on
const FLICKER = [[0, 0], [0.25, 0], [0.3, 0.9], [0.36, 0.05], [0.5, 0.05], [0.55, 0.6], [0.6, 0.15],
  [0.68, 1], [0.74, 0.3], [0.9, 0.3], [0.95, 0.95], [1.02, 0.55], [1.12, 1], [1.6, 1]];
let lampFlicker = null;
function setLamp(level) {
  lampLevel = level;
  lampFlicker.light.intensity = lampFlicker.intensity * level;
  lampFlicker.material.emissiveIntensity = lampFlicker.glow * level;
  for (const sleeve of sleeves) sleeve.material.emissiveIntensity = sleeve.base * level;
}
function flickerLevel(t) {
  for (let i = 1; i < FLICKER.length; i++) {
    const [t1, v1] = FLICKER[i];
    if (t <= t1) {
      const [t0, v0] = FLICKER[i - 1];
      const base = v0 + (v1 - v0) * ((t - t0) / (t1 - t0));
      return Math.max(0, Math.min(1, base + (Math.random() - 0.5) * 0.12 * base)); // a little buzz
    }
  }
  return 1;
}

// ---------- Last watched poster ----------
// Once the camera has settled close to the poster, the new one unrolls; moving away rolls it back.
const posterReveal = { value: 0 };
let posterSince = null; // when the camera started looking at the poster
let posterLast = null;
function updatePoster(now) {
  // Real elapsed time (not the 50ms-capped frame step), so it takes 0.9s even on a slow machine
  const dt = posterLast === null ? 0 : Math.min((now - posterLast) / 1000, 0.25);
  posterLast = now;
  const looking = focused && focused.poster;
  posterSince = looking ? (posterSince ?? now) : null;
  const target = looking && now - posterSince > 550 ? 1 : 0; // wait for the camera to arrive
  const speed = target ? 1 / 0.9 : 1 / 0.5;                    // unrolls in 0.9s, rolls back in 0.5s
  const step = reduced ? 1 : dt * speed;
  posterReveal.value = target > posterReveal.value ? Math.min(1, posterReveal.value + step) : Math.max(0, posterReveal.value - step);
}

// ---------- Terminal (js/terminal.js) ----------
// La terminal de la web (enlace «Terminal» del pie, o la tecla `) puede mover la sala: encender y apagar la luz, acercar la cámara a un objeto, abrir la Wii…
// Solo se expone esto, nada más; terminal.js lo usa con `look`, `inspect`, `lights`, `play`, `flicker`, `sunset` y `zoom out`.
window.dizRoom = {
  lights(on) { if (lighting.dark === on) lighting.setDark(!on); },
  focus(key) {
    const item = destinations.find((d) => d.key === key);
    if (!item || lighting.dark || wiiPlayer.active) return false;
    highlight({ item, object: meshes.find((m) => destinationFor(m) === item) });
    focusOn(item);
    return true;
  },
  reset() { if (!wiiPlayer.active) resetFocus(); },
  wii() { if (!lighting.dark) wiiPlayer.open(nav.querySelector('[data-object="wii"]')); },
  flicker() { if (lampFlicker && !lighting.dark && !reduced) lampFlicker.start = null; },
  sunset(on) { sunset.visible = on === undefined ? !sunset.visible : on; renderer.shadowMap.needsUpdate = true; },
};

let lastFrame = performance.now();
function frame() {
  const now = performance.now();
  // Advance at most 50ms per frame, so a slow first frame (shaders, shadows)
  // doesn't skip the flicker: it just plays a little slower.
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  const cameraStep = wiiPlayer.active ? Math.min((now - lastFrame) / 1000, 0.25) : dt;
  lastFrame = now;
  // The opaque album covers the whole scene. Keep the clock current, but do no GPU work.
  if (pokemonAlbum.active || document.hidden) { requestAnimationFrame(frame); return; }
  if (lampFlicker && !lighting.dark && !reduced && lampFlicker.start !== false && !loading.busy) {
    lampFlicker.t = lampFlicker.start === null ? 0 : lampFlicker.t + dt;
    lampFlicker.start = true;
    setLamp(flickerLevel(lampFlicker.t));
    if (lampFlicker.t > FLICKER[FLICKER.length - 1][0]) { setLamp(1); lampFlicker.start = false; }
  } else if (lampFlicker && !lighting.dark && !reduced && lampFlicker.start === false) {
    // Once on, the lamp breathes very slightly, like a warm bulb
    const t = now / 1000;
    setLamp(1 + Math.sin(t * 1.3) * 0.025 + Math.sin(t * 3.7) * 0.012);
  }
  updatePoster(now);
  // Ease the camera towards its goal (overview or a focused object)
  // Rate per second of the ease: the camera reaches 90% of the way in ln(10)/rate seconds (acercarse ≈0.3 s, alejarse ≈0.14 s)
  const ease = reduced ? 1 : 1 - Math.exp(-cameraStep * (returning ? returnRate : 8));
  view.pos.lerp(goal.pos, ease);
  view.target.lerp(goal.target, ease);
  camera.position.copy(view.pos);
  camera.lookAt(view.target);
  camera.updateMatrixWorld();
  wiiPlayer.update(now);
  lighting.update(cameraStep);
  loading.update(now);
  updateHover();
  horizontalBlur.enabled = verticalBlur.enabled = wiiPlayer.blur > 0.01;
  horizontalBlur.uniforms.h.value = wiiPlayer.blur / (innerWidth * 3);
  verticalBlur.uniforms.v.value = wiiPlayer.blur / (innerHeight * 3);
  // Behind the discs, once the blur and the camera have settled, the last picture of the room is reused
  const settled = view.pos.distanceToSquared(goal.pos) < 1e-8 && view.target.distanceToSquared(goal.target) < 1e-8;
  const still = wiiPlayer.active && wiiPlayer.blur >= 8.99 && settled && !lighting.dark;
  frozenFrames = still ? frozenFrames + 1 : 0;
  if (frozenFrames < 3) composer.render(); // a couple of frames more, so the last one is complete
  present.material.uniforms.tDiffuse.value = composer.readBuffer.texture;
  renderer.setRenderTarget(null);
  present.render(renderer);
  wiiPlayer.render();
  adaptQuality(now);
  requestAnimationFrame(frame);
}

// ---------- Adaptive resolution ----------
// If the frames keep coming late (on average slower than ~40 fps for a second), the resolution steps down a notch, down to 1×.
// It never steps back up during the visit, so it doesn't swing back and forth.
let frozenFrames = 0;
let slowSince = null, sample = [];
function adaptQuality(now) {
  if (document.hidden || loading.busy || pixelRatio <= 1) return;
  sample.push(now);
  if (sample.length < 30) return;
  const average = (sample[sample.length - 1] - sample[0]) / (sample.length - 1);
  sample = [];
  if (average < 25) { slowSince = null; return; }
  if (slowSince === null) { slowSince = now; return; }
  if (now - slowSince < 1000) return;
  slowSince = null;
  pixelRatio = Math.max(1, pixelRatio - 0.25);
  renderer.setPixelRatio(pixelRatio);
  composer.setPixelRatio(pixelRatio);
  resize();
}
requestAnimationFrame(frame);
