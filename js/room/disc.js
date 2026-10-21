import * as THREE from 'three';

// A game disc built like a real CD, in layers (real CD: 120 mm across, 15 mm hole, clear hub, mirror band, printed label):
// printed label on the front, a clear plastic hub around the hole, a thin mirror band, a silver edge and an iridescent back.
// Sizes are in metres of the room. Shared textures (grain, grooves) are made once and reused by every disc.
const DISC_RADIUS = 0.06;
const HOLE_RADIUS = 0.0075;
const HUB_RADIUS = 0.0165;
const BAND_RADIUS = 0.0215;
const THICKNESS = 0.0012;
const LABEL_COLORS = ['#d8d4c9', '#aebfbe', '#b8523f'];
const INK = '#171917';

let shared = null;

// Planar UVs across the whole disc, so a ring samples the right part of a square texture
function ring(inner, outer, segments = 160) {
  const geometry = new THREE.RingGeometry(inner, outer, segments, 1);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let index = 0; index < uv.count; index++) {
    uv.setXY(index, position.getX(index) / (DISC_RADIUS * 2) + 0.5, position.getY(index) / (DISC_RADIUS * 2) + 0.5);
  }
  return geometry;
}

function canvasTexture(size, draw, colorSpace = THREE.NoColorSpace) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = colorSpace;
  texture.anisotropy = 8;
  return texture;
}

function sharedTextures() {
  if (shared) return shared;
  // Front: a little paper grain and a few hairline scratches in the gloss
  const grain = canvasTexture(512, (context, size) => {
    const image = context.createImageData(size, size);
    for (let index = 0; index < image.data.length; index += 4) {
      const value = 200 + Math.random() * 55;
      image.data[index] = image.data[index + 1] = image.data[index + 2] = value;
      image.data[index + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    context.strokeStyle = 'rgb(255 255 255 / 70%)';
    context.lineWidth = 0.6;
    for (let index = 0; index < 26; index++) {
      const radius = size * (0.2 + Math.random() * 0.28);
      const start = Math.random() * Math.PI * 2;
      context.beginPath();
      context.arc(size / 2, size / 2, radius, start, start + 0.2 + Math.random() * 0.5);
      context.stroke();
    }
  });
  // Back: a real CD throws rainbow fans that turn with the light. The thickness map sweeps round the disc (two fans),
  // with a faint ripple along the radius; fine concentric grooves in the roughness catch the light.
  const tracks = canvasTexture(1024, (context, size) => {
    const center = size / 2;
    const fan = context.createConicGradient(0, center, center);
    for (let stop = 0; stop <= 8; stop++) {
      const level = Math.round(110 + 110 * (0.5 + 0.5 * Math.cos(stop / 8 * Math.PI * 4)));
      fan.addColorStop(stop / 8, `rgb(${level} ${level} ${level})`);
    }
    context.fillStyle = fan;
    context.fillRect(0, 0, size, size);
    context.globalAlpha = 0.18;
    for (let radius = center; radius > 0; radius -= 6) {
      context.strokeStyle = radius % 12 ? '#000' : '#fff';
      context.lineWidth = 3;
      context.beginPath();
      context.arc(center, center, radius, 0, Math.PI * 2);
      context.stroke();
    }
  });
  const grooves = canvasTexture(1024, (context, size) => {
    const center = size / 2;
    context.fillStyle = 'rgb(150 150 150)';
    context.fillRect(0, 0, size, size);
    for (let radius = center; radius > 0; radius -= 2) {
      const level = Math.round(130 + Math.random() * 40);
      context.strokeStyle = `rgb(${level} ${level} ${level})`;
      context.lineWidth = 1;
      context.beginPath();
      context.arc(center, center, radius, 0, Math.PI * 2);
      context.stroke();
    }
  });
  shared = { grain, tracks, grooves };
  return shared;
}

// The printed face: a full-bleed colour field with the title set large, the number, fine rules
// and a line of small type running round the rim, like the print on a real disc.
function labelTexture(game, index) {
  const font = getComputedStyle(document.documentElement).getPropertyValue('--font-ui').trim() || 'Arial, sans-serif';
  return canvasTexture(1024, (context, size) => {
    const center = size / 2;
    const base = new THREE.Color(LABEL_COLORS[index % LABEL_COLORS.length]);
    const light = base.clone().offsetHSL(0, 0, 0.06).getStyle();
    const dark = base.clone().offsetHSL(0, 0, -0.07).getStyle();
    const field = context.createRadialGradient(center * 0.7, center * 0.6, 40, center, center, center);
    field.addColorStop(0, light);
    field.addColorStop(1, dark);
    context.fillStyle = field;
    context.fillRect(0, 0, size, size);

    context.strokeStyle = INK;
    context.fillStyle = INK;
    context.lineWidth = 1.5;
    for (const radius of [494, 476, 196]) {
      context.beginPath();
      context.arc(center, center, radius, 0, Math.PI * 2);
      context.stroke();
    }

    // Small type round the rim
    const rim = `DIZMAR  ·  RECENTLY PLAYED  ·  ${String(index + 1).padStart(2, '0')}  ·  `;
    context.font = `500 17px ${font}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    let angle = -Math.PI / 2;
    for (let lap = 0; lap < 2; lap++) {
      for (const letter of rim) {
        context.save();
        context.translate(center + Math.cos(angle) * 456, center + Math.sin(angle) * 456);
        context.rotate(angle + Math.PI / 2);
        context.fillText(letter, 0, 0);
        context.restore();
        angle += (context.measureText(letter).width + 1.5) / 456;
      }
    }

    // Number above the hole, title below it
    context.font = `400 112px ${font}`;
    context.fillText(String(index + 1).padStart(2, '0'), center, 300);
    context.font = `700 58px ${font}`;
    const words = game.title.split(' ');
    const lines = [''];
    for (const word of words) {
      const last = lines.length - 1;
      const line = (lines[last] + ' ' + word).trim();
      if (context.measureText(line).width > 560) lines.push(word);
      else lines[last] = line;
    }
    lines.forEach((line, lineIndex) => context.fillText(line, center, 700 + lineIndex * 64 - (lines.length - 1) * 32));
  }, THREE.SRGBColorSpace);
}

// A small photo studio to reflect: dark walls, a long bright softbox overhead, a dimmer one low and warm, and two tall
// strips at the sides. The discs' gloss picks these up as the clean streaks of a real CD as they turn.
export function createStudioEnvironment(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  const wall = context.createLinearGradient(0, 0, 0, 512);
  wall.addColorStop(0, '#9a9ca3');
  wall.addColorStop(0.45, '#5d5f66');
  wall.addColorStop(1, '#2a2a2e');
  context.fillStyle = wall;
  context.fillRect(0, 0, 1024, 512);
  const softbox = (x, y, width, height, color, blur) => {
    context.filter = `blur(${blur}px)`;
    context.fillStyle = color;
    context.fillRect(x, y, width, height);
    context.filter = 'none';
  };
  // Latitude in the image: the top edge is straight up, the middle the horizon. The discs face the camera,
  // so what they reflect sits a little above the horizon behind it: that is where the brightest strips go.
  softbox(0, 168, 1024, 20, '#ffffff', 5);        // long strip ~30° up, all the way round
  softbox(0, 214, 1024, 12, '#fff4e6', 4);        // a thinner one ~15° up, slightly warm
  softbox(0, 60, 1024, 40, '#c4c4c4', 14);        // big soft light overhead (not boosted: it lights, it doesn't streak)
  softbox(0, 318, 1024, 16, '#ffcf9e', 10);       // warm bounce from below
  softbox(230, 80, 40, 260, '#f4f8ff', 8);        // tall strips at the sides
  softbox(740, 80, 40, 260, '#dfeaff', 8);
  // A canvas only holds 0–1, but a real softbox is many times brighter than the walls: that is what makes a streak
  // show on a glossy print (the varnish only reflects ~4%). So the picture becomes a float image and the lights get a boost.
  const { data } = context.getImageData(0, 0, 1024, 512);
  const pixels = new Float32Array(1024 * 512 * 4);
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 1024; x++) {
      const from = (y * 1024 + x) * 4;
      const to = ((511 - y) * 1024 + x) * 4; // float images start at the bottom row
      let peak = 0;
      for (let channel = 0; channel < 3; channel++) {
        const value = Math.pow(data[from + channel] / 255, 2.2);
        pixels[to + channel] = value;
        peak = Math.max(peak, value);
      }
      const boost = 1 + 9 * THREE.MathUtils.smoothstep(peak, 0.7, 0.95);
      for (let channel = 0; channel < 3; channel++) pixels[to + channel] *= boost;
      pixels[to + 3] = 1;
    }
  }
  const texture = new THREE.DataTexture(pixels, 1024, 512, THREE.RGBAFormat, THREE.FloatType);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.LinearSRGBColorSpace;
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  const generator = new THREE.PMREMGenerator(renderer);
  const target = generator.fromEquirectangular(texture);
  texture.dispose();
  generator.dispose();
  return target.texture;
}

export function createDisc(game, index, environment) {
  const group = new THREE.Group();
  group.name = 'recently-played-' + game.id;
  const { grain, tracks, grooves } = sharedTextures();
  const texture = labelTexture(game, index);

  // Every material stays transparent from the start, so fading never recompiles a shader
  const label = new THREE.MeshPhysicalMaterial({
    map: texture, roughness: 0.4, roughnessMap: grain, metalness: 0.08, envMap: environment,
    clearcoat: 0.85, clearcoatRoughness: 0.05, envMapIntensity: 0.75, transparent: true,
  });
  const back = new THREE.MeshPhysicalMaterial({
    color: '#c4c9d1', metalness: 1, roughness: 0.18, roughnessMap: grooves, envMap: environment, envMapIntensity: 1.3,
    clearcoat: 0.34, clearcoatRoughness: 0.06,
    iridescence: 1, iridescenceIOR: 1.86, iridescenceThicknessRange: [140, 900], iridescenceThicknessMap: tracks,
    transparent: true,
  });
  const mirror = new THREE.MeshPhysicalMaterial({
    color: '#e6e9ee', metalness: 1, roughness: 0.12, clearcoat: 0.7, clearcoatRoughness: 0.08, envMap: environment,
    envMapIntensity: 1.45, side: THREE.DoubleSide, transparent: true,
  });
  const edge = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', metalness: 0.55, roughness: 0.06, clearcoat: 0.7, clearcoatRoughness: 0.05, envMap: environment,
    envMapIntensity: 1.8, side: THREE.DoubleSide, transparent: true,
  });
  // Clear polycarbonate: see-through, glossy, a touch frosted at the lip of the hole
  const plastic = new THREE.MeshPhysicalMaterial({
    color: '#eef3f6', metalness: 0, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03, envMap: environment,
    envMapIntensity: 1.5, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide,
  });
  const frost = new THREE.MeshPhysicalMaterial({
    color: '#eef0f5', metalness: 0, roughness: 0.6, clearcoat: 0.4, clearcoatRoughness: 0.3, envMap: environment,
    envMapIntensity: 0.9, transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide,
  });
  const materials = [label, back, mirror, edge, plastic, frost];
  const baseOpacity = materials.map(material => material.opacity);

  const half = THICKNESS / 2;
  const face = new THREE.Mesh(ring(BAND_RADIUS, DISC_RADIUS), label);
  face.position.z = half;
  const backFace = new THREE.Mesh(ring(BAND_RADIUS, DISC_RADIUS), back);
  backFace.rotation.y = Math.PI;
  backFace.position.z = -half;
  const band = new THREE.Mesh(ring(HUB_RADIUS, BAND_RADIUS, 128), mirror);
  const hubFront = new THREE.Mesh(ring(HOLE_RADIUS + 0.0012, HUB_RADIUS, 96), plastic);
  hubFront.position.z = half;
  const hubBack = hubFront.clone();
  hubBack.position.z = -half;
  const lip = new THREE.Mesh(ring(HOLE_RADIUS, HOLE_RADIUS + 0.0012, 96), frost);
  lip.position.z = half;
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(HOLE_RADIUS, HOLE_RADIUS, THICKNESS, 96, 1, true), frost);
  hole.rotation.x = Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(DISC_RADIUS, DISC_RADIUS, THICKNESS, 160, 1, true), edge);
  rim.rotation.x = Math.PI / 2;
  // See-through parts draw after the solid ones
  for (const mesh of [hubFront, hubBack, lip, hole]) mesh.renderOrder = 1;
  group.add(face, backFace, band, hubFront, hubBack, lip, hole, rim);

  let disposed = false;
  if (game.artwork) {
    new THREE.TextureLoader().load(game.artwork, artwork => {
      if (disposed) { artwork.dispose(); return; }
      artwork.colorSpace = THREE.SRGBColorSpace;
      artwork.anisotropy = 8;
      label.map = artwork;
      label.needsUpdate = true;
      texture.dispose();
    });
  }

  return {
    game, group,
    setOpacity(value) {
      materials.forEach((material, materialIndex) => { material.opacity = baseOpacity[materialIndex] * value; });
    },
    dispose() {
      disposed = true;
      group.removeFromParent();
      const geometries = new Set(group.children.map(child => child.geometry));
      geometries.forEach(item => item.dispose());
      label.map.dispose();
      materials.forEach(material => material.dispose());
    },
  };
}
