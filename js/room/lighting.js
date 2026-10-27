import * as THREE from 'three';

export function createRoomLighting({ scene, camera, renderer, canvas, reduced, onChange }) {
  const beam = new THREE.SpotLight(0xffc38a, 0, 0, Math.PI / 26, .8, 2);
  beam.name = 'Cursor flashlight';
  beam.castShadow = true;
  beam.shadow.mapSize.set(512, 512);
  beam.shadow.bias = -.0004;
  beam.shadow.normalBias = .008;
  beam.visible = false;
  scene.add(beam, beam.target);
  const ray = new THREE.Raycaster();
  const cursor = new THREE.Vector2();
  const target = new THREE.Vector3();
  const oldTarget = new THREE.Vector3();
  const oldCamera = new THREE.Vector3();
  const materials = new Map();
  const lights = new Map();
  let objects = [];
  let dark = false;
  let darkened = false; // the lights and materials of the room have been collected (see update)
  let inside = false;
  let pointerDirty = true;
  let power = 100;
  let center = new THREE.Vector3();

  function trackPointer(event) {
    const rect = canvas.getBoundingClientRect();
    cursor.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    inside = true;
    pointerDirty = true;
  }
  canvas.addEventListener('pointermove', trackPointer);
  canvas.addEventListener('pointerdown', trackPointer);
  canvas.addEventListener('pointerleave', () => { inside = false; beam.visible = false; });

  function setDark(value) {
    if (dark === value) return;
    dark = value;
    document.body.classList.toggle('room-dark', dark);
    if (!dark) {
      for (const [light, visible] of lights) light.visible = visible;
      for (const [material, state] of materials) {
        material.envMapIntensity = state.environment;
        material.emissiveIntensity = state.emission;
        if (state.color) material.color.copy(state.color);
      }
      lights.clear();
      materials.clear();
      darkened = false;
      beam.visible = false;
    }
    renderer.shadowMap.needsUpdate = true;
    onChange(dark);
  }
  addEventListener('keydown', event => {
    if (event.key === 'Escape' && dark) setDark(false);
  });

  return {
    get dark() { return dark; },
    setDark,
    attach(model, box) {
      objects = [];
      model.traverse(object => { if (object.isMesh && object.visible) objects.push(object); });
      const rug = scene.getObjectByName('DIZ low-resolution rug');
      if (rug) objects.push(rug);
      center = box.getCenter(new THREE.Vector3());
      power = 16 * box.getSize(new THREE.Vector3()).y ** 2;
    },
    update(dt) {
      if (!dark) return;
      // The lights and materials to switch off are collected once when the room goes dark (walking the whole scene every
      // frame was costly); each frame only keeps them off. Visibility and intensity are kept apart so the Wii can keep its own
      // power state without leaving a light on in the dark room.
      if (!darkened) {
        darkened = true;
        scene.traverse(object => {
          if (object.isLight && object !== beam && !lights.has(object)) lights.set(object, object.visible);
          if (!object.isMesh) return;
          for (const material of [].concat(object.material)) {
            if (materials.has(material)) continue;
            materials.set(material, {
              environment: material.envMapIntensity,
              emission: material.emissiveIntensity,
              color: material.isMeshBasicMaterial ? material.color.clone() : null,
            });
          }
        });
      }
      for (const light of lights.keys()) light.visible = false;
      for (const [material, state] of materials) {
        // A game may power the console on while its background is dark.
        if (material.emissiveIntensity > 0) state.emission = material.emissiveIntensity;
        if (material.envMapIntensity !== undefined) material.envMapIntensity = 0;
        if (material.emissiveIntensity !== undefined) material.emissiveIntensity = 0;
        if (material.isMeshBasicMaterial) material.color.setScalar(0);
      }
      beam.visible = inside;
      if (!inside) return;
      if (pointerDirty || oldCamera.distanceToSquared(camera.position) > .000001) {
        ray.setFromCamera(cursor, camera);
        const hit = ray.intersectObjects(objects, false)[0];
        if (hit) target.copy(hit.point);
        else {
          const distance = camera.position.distanceTo(center);
          ray.ray.at(distance, target);
        }
        pointerDirty = false;
      }
      beam.position.copy(camera.position);
      const ease = reduced ? 1 : 1 - Math.exp(-dt * 22);
      beam.target.position.lerp(target, ease);
      beam.intensity = power;
      beam.target.updateMatrixWorld();
      if (oldTarget.distanceToSquared(beam.target.position) > .000001 || oldCamera.distanceToSquared(camera.position) > .000001) {
        renderer.shadowMap.needsUpdate = true;
        oldTarget.copy(beam.target.position);
        oldCamera.copy(camera.position);
      }
    },
  };
}
