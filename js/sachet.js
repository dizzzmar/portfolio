// El sobre de ketchup DIZ (assets/models/diz-ketchup): versión ligera para la web (malla comprimida con meshopt y texturas webp, ~0,55 MB).
// Lo usa la ventana de contacto (js/contact-sachet.js) y cualquier otra pieza que lo necesite: se descarga una sola vez y cada uno recibe su copia.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const URL = '/assets/models/diz-ketchup/diz-ketchup-web.glb?v=20261022a';
// Medidas del modelo (metros, centrado en el origen, frontal hacia +Z)
export const SACHET = { width: 0.066, height: 0.1314, tearY: 0.043 }; // tearY: altura de la línea discontinua de "TEAR HERE"

let pending = null;
export function loadSachet() {
  if (!pending) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    pending = loader.loadAsync(URL).then((gltf) => gltf.scene);
  }
  return pending.then((scene) => scene.clone(true));
}
