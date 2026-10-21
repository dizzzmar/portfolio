import * as THREE from 'three';

const DISC_RADIUS = 0.06;
const HUB_RADIUS = 0.0075;

function labelTexture(game, index) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const context = canvas.getContext('2d');
  context.fillStyle = ['#d8d4c9', '#aebfbe', '#b8523f'][index];
  context.fillRect(0, 0, 1024, 1024);
  context.strokeStyle = '#171917';
  context.lineWidth = 2;
  for (const radius of [468, 448, 112]) {
    context.beginPath();
    context.arc(512, 512, radius, 0, Math.PI * 2);
    context.stroke();
  }
  context.fillStyle = '#171917';
  context.textAlign = 'center';
  context.font = '500 22px Arial';
  context.fillText('DIZMAR / RECENTLY PLAYED', 512, 264);
  context.font = '700 52px Arial';
  const words = game.title.split(' ');
  const lines = [''];
  for (const word of words) {
    const last = lines.length - 1;
    const line = (lines[last] + ' ' + word).trim();
    if (context.measureText(line).width > 670) lines.push(word);
    else lines[last] = line;
  }
  lines.forEach((line, lineIndex) => context.fillText(line, 512, 690 + lineIndex * 62));
  context.font = '500 24px Arial';
  context.fillText(String(index + 1).padStart(2, '0'), 512, 365);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function faceGeometry() {
  const geometry = new THREE.RingGeometry(HUB_RADIUS, DISC_RADIUS, 128);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let index = 0; index < uv.count; index++) {
    uv.setXY(index, position.getX(index) / (DISC_RADIUS * 2) + 0.5, position.getY(index) / (DISC_RADIUS * 2) + 0.5);
  }
  return geometry;
}

export function createDisc(game, index, environment) {
  const group = new THREE.Group();
  group.name = 'recently-played-' + game.id;
  const texture = labelTexture(game, index);
  const front = new THREE.MeshPhysicalMaterial({
    map: texture, color: '#ffffff', roughness: 0.35, metalness: 0.12,
    clearcoat: 1, clearcoatRoughness: 0.2, side: THREE.FrontSide,
  });
  const silver = new THREE.MeshPhysicalMaterial({
    color: '#dadfe4', metalness: 1, roughness: 0.22, envMap: environment,
    iridescence: 1, iridescenceIOR: 1.4, iridescenceThicknessRange: [100, 400],
    clearcoat: 1, side: THREE.FrontSide,
  });
  const geometry = faceGeometry();
  const face = new THREE.Mesh(geometry, front);
  face.position.z = 0.0006;
  const back = new THREE.Mesh(geometry, silver);
  back.rotation.y = Math.PI;
  back.position.z = -0.0006;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(DISC_RADIUS, DISC_RADIUS, 0.0012, 128, 1, true), silver);
  rim.rotation.x = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.RingGeometry(HUB_RADIUS, 0.012, 96), silver);
  hub.position.z = 0.0008;
  group.add(face, back, rim, hub);

  let disposed = false;
  if (game.artwork) {
    new THREE.TextureLoader().load(game.artwork, artwork => {
      if (disposed) { artwork.dispose(); return; }
      artwork.colorSpace = THREE.SRGBColorSpace;
      front.map = artwork;
      front.needsUpdate = true;
      texture.dispose();
    });
  }

  return {
    game, group,
    setOpacity(value) {
      for (const material of [front, silver]) {
        material.transparent = value < 1;
        material.opacity = value;
      }
    },
    dispose() {
      disposed = true;
      group.removeFromParent();
      const geometries = new Set(group.children.map(child => child.geometry));
      geometries.forEach(item => item.dispose());
      front.map.dispose();
      front.dispose();
      silver.dispose();
    },
  };
}
