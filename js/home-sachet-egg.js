// HOME · sorpresa escondida: tres clics seguidos al tomate grande de la portada (lo detecta js/home-tomato.js) y cae un sobre de ketchup DIZ
// que rebota junto al tomate y se gira arrastrándolo. En cuanto empieza el viaje (rueda, dedo…) o se pulsa Esc, se cae por abajo y desaparece.
// Va en la misma escena 3D que el tomate (mismo lienzo y cámara); este módulo solo se descarga cuando alguien encuentra la sorpresa.
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadSachet, SACHET } from '/js/sachet.js?v=20261022a';

export function createEgg({ THREE, scene, renderer, view, reduced }) {
  // El tomate no usa luces (textura horneada); el sobre sí: reflejos de entorno y una luz suave, que no afectan al tomate
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const light = new THREE.DirectionalLight(0xfff1e0, 0.8);
  light.position.set(-3, 4, 8);
  scene.add(light);

  const holder = new THREE.Group();
  holder.visible = false;
  scene.add(holder);
  let model = null;
  const ready = loadSachet().then((m) => {
    m.traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((mat) => { mat.envMapIntensity = 0.45; }); });
    holder.add(m);
    model = m;
  });

  const GRAVITY = 2800; // px/s²
  const s = { phase: 'off', x: 0, y: 0, vy: 0, rz: 0, vz: 0, ry: 0, vry: 0, rx: 0, size: 0, drag: null };

  const box = () => ({ w: s.size * (SACHET.width / SACHET.height), h: s.size });
  // Cae a la derecha del tomate; en pantallas estrechas no cabe al lado, así que cae debajo, un poco a la derecha
  const narrow = (v) => v.width < 700;
  const floorY = (v) => v.cy + v.heroPx * (narrow(v) ? 0.95 : 0.36);
  const restX = (v) => v.cx + (narrow(v) ? v.heroPx * 0.4 : Math.min(v.heroPx * 0.78, v.width * 0.3));

  async function drop() {
    await ready;
    const v = view();
    s.size = Math.max(150, v.heroPx * 0.62);
    s.x = restX(v);
    s.y = reduced ? floorY(v) : -s.size;
    s.vy = 0;
    s.rz = reduced ? -0.1 : 0.9; s.vz = reduced ? 0 : -2.2;
    s.ry = reduced ? -0.3 : 0; s.vry = reduced ? 0 : 5;
    s.rx = 0;
    s.phase = reduced ? 'resting' : 'falling';
    holder.visible = true;
  }

  function leave() {
    if (s.phase === 'off' || s.phase === 'leaving') return;
    s.phase = 'leaving';
    s.vy = reduced ? 0 : -500; // un saltito y se cae
    s.vz = 2.5;
    endDrag();
  }

  // ---- Girar arrastrando (el lienzo no recibe clics: se mira si el dedo/ratón cae dentro del sobre) ----
  const inside = (e) => {
    if (s.phase !== 'resting' && s.phase !== 'falling') return false;
    const { w, h } = box();
    return Math.abs(e.clientX - s.x) < w * 0.6 && Math.abs(e.clientY - s.y) < h * 0.55;
  };
  function endDrag() {
    if (!s.drag) return;
    s.drag = null;
    if (window.homeJourney) window.homeJourney.hold = false;
    document.documentElement.classList.remove('egg-grab');
  }
  addEventListener('pointerdown', (e) => {
    if (!inside(e)) return;
    e.preventDefault(); // ni selecciona texto ni cuenta como gesto del viaje
    s.drag = { x: e.clientX, y: e.clientY, t: performance.now() };
    s.vry = 0;
    if (window.homeJourney) window.homeJourney.hold = true;
    document.documentElement.classList.add('egg-grab');
  }, { capture: true });
  addEventListener('pointermove', (e) => {
    if (!s.drag) {
      document.documentElement.classList.toggle('egg-hover', e.pointerType === 'mouse' && inside(e));
      return;
    }
    const now = performance.now(), dt = Math.max(0.008, (now - s.drag.t) / 1000);
    const dx = e.clientX - s.drag.x, dy = e.clientY - s.drag.y;
    s.ry += dx * 0.012;
    s.vry = (dx * 0.012) / dt; // al soltar sigue girando con esa velocidad
    s.rx = THREE.MathUtils.clamp(s.rx + dy * 0.006, -0.7, 0.7);
    s.drag = { x: e.clientX, y: e.clientY, t: now };
  });
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', endDrag);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') leave(); });

  function update(dt, journey) {
    if (s.phase === 'off') return;
    const v = view();
    if (journey && (journey.j > 0.02 || journey.target > 0) && s.phase !== 'leaving') leave();
    if (s.phase === 'falling' || s.phase === 'leaving') {
      s.vy += GRAVITY * dt;
      s.y += s.vy * dt;
      if (s.phase === 'falling' && s.y >= floorY(v)) {
        s.y = floorY(v);
        s.vy = -s.vy * 0.42;
        s.vz *= -0.5;
        if (Math.abs(s.vy) < 140) { s.vy = 0; s.phase = 'resting'; }
      }
      if (s.phase === 'leaving' && s.y > v.height + s.size) { s.phase = 'off'; holder.visible = false; return; }
    }
    if (s.phase === 'resting') {
      s.y = floorY(v);
      s.x += (restX(v) - s.x) * Math.min(1, dt * 6); // si cambia el tamaño de la ventana
      // se asienta: ligeramente inclinado, y el giro se frena poco a poco
      s.vz += (-0.1 - s.rz) * 40 * dt - s.vz * 8 * dt;
      if (!s.drag) s.rx += (0 - s.rx) * Math.min(1, dt * 5);
    }
    s.rz += s.vz * dt;
    if (!s.drag) {
      s.ry += s.vry * dt;
      s.vry *= Math.exp(-dt * 2.2);
      if (Math.abs(s.vry) < 0.05 && s.phase === 'resting') s.ry += (Math.round(s.ry / (Math.PI * 2)) * Math.PI * 2 - 0.3 - s.ry) * Math.min(1, dt * 2); // acaba mirando de frente
    }
    const upp = v.upp;
    holder.position.set((s.x - v.width / 2) * upp, (v.height / 2 - s.y) * upp, 0);
    holder.rotation.set(s.rx, s.ry, s.rz, 'ZXY');
    holder.scale.setScalar((s.size * upp) / SACHET.height);
  }

  return { drop, update, active: () => s.phase !== 'off' };
}
