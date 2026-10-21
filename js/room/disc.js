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
  // Back: concentric data tracks. Thickness bands make the rainbow rings; roughness grooves catch the light.
  const tracks = canvasTexture(1024, (context, size) => {
    const center = size / 2;
    for (let radius = center; radius > 0; radius -= 1) {
      const wave = 0.5 + 0.5 * Math.sin(radius * 0.09) * Math.cos(radius * 0.013);
      const level = Math.round(70 + wave * 150 + (Math.random() - 0.5) * 18);
      context.fillStyle = `rgb(${level} ${level} ${level})`;
      context.beginPath();
      context.arc(center, center, radius, 0, Math.PI * 2);
      context.fill();
    }
  });
  const grooves = canvasTexture(1024, (context, size) => {
    const center = size / 2;
    for (let radius = center; radius > 0; radius -= 1.5) {
      const level = Math.round(120 + Math.random() * 80);
      context.fillStyle = `rgb(${level} ${level} ${level})`;
      context.beginPath();
      context.arc(center, center, radius, 0, Math.PI * 2);
      context.fill();
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

export function createDisc(game, index, environment) {
  const group = new THREE.Group();
  group.name = 'recently-played-' + game.id;
  const { grain, tracks, grooves } = sharedTextures();
  const texture = labelTexture(game, index);

  // Every material stays transparent from the start, so fading never recompiles a shader
  const label = new THREE.MeshPhysicalMaterial({
    map: texture, roughness: 0.42, roughnessMap: grain, metalness: 0.18,
    clearcoat: 0.8, clearcoatRoughness: 0.14, envMapIntensity: 1.1, transparent: true,
  });
  const back = new THREE.MeshPhysicalMaterial({
    color: '#1a1e2a', metalness: 1, roughness: 0.23, roughnessMap: grooves, envMap: environment, envMapIntensity: 1.5,
    clearcoat: 0.34, clearcoatRoughness: 0.06,
    iridescence: 1, iridescenceIOR: 1.86, iridescenceThicknessRange: [140, 900], iridescenceThicknessMap: tracks,
    transparent: true,
  });
  const mirror = new THREE.MeshPhysicalMaterial({
    color: '#dfe3e8', metalness: 0.85, roughness: 0.26, clearcoat: 0.7, clearcoatRoughness: 0.12,
    envMapIntensity: 1.45, side: THREE.DoubleSide, transparent: true,
  });
  const edge = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', metalness: 0.55, roughness: 0.06, clearcoat: 0.7, clearcoatRoughness: 0.05,
    envMapIntensity: 1.8, side: THREE.DoubleSide, transparent: true,
  });
  // Clear polycarbonate: see-through, glossy, a touch frosted at the lip of the hole
  const plastic = new THREE.MeshPhysicalMaterial({
    color: '#eef3f6', metalness: 0, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.04,
    envMapIntensity: 1.3, transparent: true, opacity: 0.34, depthWrite: false, side: THREE.DoubleSide,
  });
  const frost = new THREE.MeshPhysicalMaterial({
    color: '#eef0f5', metalness: 0, roughness: 0.6, clearcoat: 0.4, clearcoatRoughness: 0.3,
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
