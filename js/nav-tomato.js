// TOMATE 3D EN EL LOGO · el tomate de la barra gira en todas las páginas (como en la portada, cuando sube al menú).
// Se coloca encima del logo (.nav-logo o .case-logo). La imagen plana sigue debajo: se ve mientras carga
// o si el navegador no tiene WebGL. three.js se carga cuando el navegador está libre, para no retrasar la página.
// Es el mismo modelo (assets/models/tomato.glb) y la misma biblioteca (three.js desde jsDelivr) que usa la portada.
// Para ahorrar batería, el lienzo es un cuadrado pequeño alrededor del tomate y se dibuja a 30 fotogramas por segundo.

const logo = document.querySelector('.nav-logo, .case-logo');
const flat = logo && logo.querySelector('img');

async function start() {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (e) {
    return; // sin WebGL: se queda la imagen plana
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Altura del cuadro de la cámara a 10 unidades, con 35 grados de apertura (igual que la portada)
  const VISIBLE = 2 * Math.tan(THREE.MathUtils.degToRad(35 / 2)) * 10;
  const BODY_OFFSET = 0.09; // el tallo sube el centro del modelo: el cuerpo queda un 9 % por debajo
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  const pivot = new THREE.Group();
  const spinner = new THREE.Group();
  pivot.add(spinner);
  scene.add(pivot);

  // Tamaño del tomate = el del logo; el lienzo es el doble, para que quepa al girar.
  // Se dibuja con la misma cámara que la portada (la de la pantalla entera, recortada a este cuadrado), así el tomate
  // sale igual de grande y con la misma perspectiva que cuando se acopla al menú de la portada.
  const fit = () => {
    const size = Math.round(Math.min(logo.offsetWidth, logo.offsetHeight)) || 40;
    const box = size * 2;
    renderer.setSize(box, box, false);
    Object.assign(canvas.style, {
      position: 'absolute', left: '50%', top: `calc(50% - ${(size * BODY_OFFSET).toFixed(1)}px)`,
      width: box + 'px', height: box + 'px', transform: 'translate(-50%, -50%)',
      pointerEvents: 'none', opacity: canvas.style.opacity || '0', transition: 'opacity .4s ease',
    });
    const width = innerWidth, height = innerHeight;
    const r = canvas.getBoundingClientRect();
    const upp = VISIBLE / height; // unidades del mundo por píxel
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    camera.setViewOffset(width, height, r.left, r.top, box, box);
    pivot.scale.setScalar(size * upp);
    pivot.position.set((r.left + box / 2 - width / 2) * upp, (height / 2 - (r.top + box / 2)) * upp, 0);
  };

  if (getComputedStyle(logo).position === 'static') logo.style.position = 'relative';
  logo.style.overflow = 'visible';
  logo.appendChild(canvas);
  fit();
  addEventListener('resize', fit);

  new GLTFLoader().load('/assets/models/tomato.glb', (gltf) => {
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    model.position.sub(box.getCenter(new THREE.Vector3()));
    const holder = new THREE.Group();
    holder.add(model);
    holder.scale.setScalar(1 / Math.max(size.x, size.y, size.z));
    spinner.add(holder);
    renderer.render(scene, camera);
    // El 3D sustituye a la imagen plana con un fundido
    canvas.style.opacity = '1';
    flat.style.transition = 'opacity .4s ease';
    flat.style.opacity = '0';

    let last = performance.now();
    const frame = (now) => {
      requestAnimationFrame(frame);
      if (document.hidden || now - last < 33) return;
      spinner.rotation.y += ((now - last) / 1000) * (reduced ? 0.3 : 0.9);
      last = now;
      renderer.render(scene, camera);
    };
    requestAnimationFrame(frame);
  });
}

if (logo && flat) {
  (window.requestIdleCallback || ((fn) => setTimeout(fn, 600)))(() => start().catch(() => {}), { timeout: 2500 });
}
