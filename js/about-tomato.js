// TOMATE 3D EN ABOUT · el tomate gira delante de la frase de valores, tapando parte de las letras (el texto sigue ahí para los lectores de pantalla).
// Es el modelo pequeño del logo (assets/models/tomato-nav.glb) y la biblioteca three.js alojada en el repositorio.
// Se carga solo cuando el bloque está a punto de verse y se dibuja a 30 fotogramas por segundo solo mientras se ve; a 1,5 de resolución como máximo.
// La imagen plana (tomato.webp) se ve mientras carga o si no hay WebGL. Con «reducir movimiento» se dibuja un solo fotograma, quieto.

const host = document.querySelector('[data-tomato3d]');
if (host) {
  const flat = host.querySelector('img');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let started = false, visible = false;

  async function start() {
    const THREE = await import('three');
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const canvas = document.createElement('canvas');
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch (e) { return; } // sin WebGL: se queda la imagen plana
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', opacity: '0', transition: 'opacity .5s ease' });
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 10);
    const VISIBLE = 2 * Math.tan(THREE.MathUtils.degToRad(35 / 2)) * 10; // altura que ve la cámara a 10 unidades
    const spinner = new THREE.Group();
    scene.add(spinner);
    const resize = () => renderer.setSize(host.clientWidth, host.clientHeight, false);
    resize();
    addEventListener('resize', resize);

    new GLTFLoader().load('/assets/models/tomato.glb', (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      model.position.sub(box.getCenter(new THREE.Vector3()));
      const holder = new THREE.Group();
      holder.add(model);
      holder.scale.setScalar((VISIBLE * 0.8) / Math.max(size.x, size.y, size.z)); // el tomate ocupa el 80 % del lienzo
      holder.position.y = -VISIBLE * 0.8 * 0.09; // el tallo sube el centro del modelo: el cuerpo queda un 9 % más abajo
      spinner.add(holder);
      spinner.rotation.x = 0.18;
      renderer.render(scene, camera);
      canvas.style.opacity = '1';
      flat.style.transition = 'opacity .5s ease';
      flat.style.opacity = '0';
      if (reduced) return;
      let last = performance.now();
      const frame = (now) => {
        requestAnimationFrame(frame);
        if (!visible || document.hidden || now - last < 33) return;
        spinner.rotation.y = now / 1000 * 0.7 + scrollY * 0.004; // gira solo y un poco más con el scroll
        last = now;
        renderer.render(scene, camera);
      };
      requestAnimationFrame(frame);
    });
  }

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (!started && (e.isIntersecting || e.boundingClientRect.top < innerHeight * 2)) { started = true; start().catch(() => {}); }
  }, { rootMargin: '700px 0px' }).observe(host);
}
