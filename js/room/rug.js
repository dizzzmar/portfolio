import * as THREE from 'three';

export function addRoomRug(scene, renderer) {
  // Portrait print laid sideways: the long edge runs under both shelf feet.
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(.77, 1.54),
    new THREE.MeshStandardMaterial({ color: '#b72429', roughness: 1, metalness: 0, envMapIntensity: .04 }),
  );
  rug.name = 'DIZ low-resolution rug';
  rug.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  rug.position.set(0, .001, .13);
  rug.receiveShadow = true;
  scene.add(rug);
  new THREE.TextureLoader().load('/assets/room/diz-rug.png?v=20261022a', texture => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    rug.material.map = texture;
    rug.material.color.set('#ffffff');
    rug.material.needsUpdate = true;
    renderer.shadowMap.needsUpdate = true;
  });
  return rug;
}
