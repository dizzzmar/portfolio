// HOME · sorpresa escondida: tres clics seguidos al tomate grande de la portada (lo detecta js/home-tomato.js) y el tomate sale volando hacia arriba
// mientras un sobre de ketchup DIZ cae y ocupa su sitio, en el centro. El sobre se gira arrastrándolo; para quitarlo hay que tirarlo hacia abajo
// (o pulsar Esc): el sobre se cae por abajo y el tomate vuelve cayendo desde arriba hasta su sitio. Mientras tanto el viaje (rueda, dedo…) está parado.
// Va en la misma escena 3D que el tomate (mismo lienzo y cámara); este módulo solo se descarga cuando alguien encuentra la sorpresa.
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadSachet, SACHET } from '/js/sachet.js?v=20261022a';

export function createEgg({ THREE, scene, renderer, view, reduced, tomato }) {
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
  const s = { phase: 'off', x: 0, y: 0, vy: 0, dragY: 0, rz: 0, vz: 0, ry: 0, vry: 0, rx: 0, size: 0, drag: null, timer: 0 };
  const hold = (on) => { if (window.homeJourney) window.homeJourney.hold = on; };

  const box = () => ({ w: s.size * (SACHET.width / SACHET.height), h: s.size });
  const sizeOf = (v) => Math.max(170, v.heroPx * 1.3); // algo más alto que el tomate al que sustituye
  const restY = (v) => v.cy;

  async function drop() {
    await ready;
    if (s.phase !== 'off') return;
    s.phase = 'waiting';
    hold(true);
    document.documentElement.classList.add('egg-on');
    tomato.swapOut(); // el tomate sale volando hacia arriba…
    s.timer = setTimeout(() => { // …y el sobre entra por el mismo hueco
      const v = view();
      s.size = sizeOf(v);
      s.x = v.cx;
      s.y = reduced ? restY(v) : -s.size;
      s.vy = 0; s.dragY = 0;
      s.rz = reduced ? -0.08 : 0.5; s.vz = reduced ? 0 : -1.6;
      s.ry = reduced ? -0.3 : 0; s.vry = reduced ? 0 : 4;
      s.rx = 0;
      s.phase = reduced ? 'resting' : 'falling';
      holder.visible = true;
    }, reduced ? 0 : 230);
  }

  // Al tirarlo (o Esc) el sobre se cae por abajo; cuando sale de la pantalla, el tomate vuelve cayendo desde arriba
  function throwAway(speed = 700) {
    if (s.phase !== 'resting' && s.phase !== 'falling') return;
    s.phase = 'leaving';
    s.vy = reduced ? 3000 : Math.max(speed, 700);
    s.vz = (s.rz > -0.1 ? 1 : -1) * 2.2;
    endDrag(false);
  }
  // El viaje ha empezado por otro camino (pulsar Work…): sin ceremonias, el tomate vuelve a su sitio
  function cancel() {
    clearTimeout(s.timer);
    s.phase = 'off';
    holder.visible = false;
    endDrag(false);
    document.documentElement.classList.remove('egg-on', 'egg-hover');
    tomato.restore();
  }

  // ---- Girar arrastrando; tirar hacia abajo para quitarlo (el lienzo no recibe clics: se mira si el dedo/ratón cae dentro del sobre) ----
  const inside = (e) => {
    if (s.phase !== 'resting' && s.phase !== 'falling') return false;
    const { w, h } = box();
    return Math.abs(e.clientX - s.x) < w * 0.7 && Math.abs(e.clientY - s.y) < h * 0.58;
  };
  function endDrag(release = true) {
    if (!s.drag) return;
    const d = s.drag;
    s.drag = null;
    document.documentElement.classList.remove('egg-grab');
    if (!release || s.phase === 'leaving') return;
    // Tirado hacia abajo: suficiente recorrido, o un buen golpe de muñeca. Si no, vuelve a su sitio
    if (s.dragY > s.size * 0.28 || (d.vy > 900 && s.dragY > 40)) throwAway(d.vy);
  }
  addEventListener('pointerdown', (e) => {
    if (!inside(e)) return;
    e.preventDefault(); // ni selecciona texto ni cuenta como gesto del viaje
    s.drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), vy: 0 };
    s.vry = 0;
    document.documentElement.classList.add('egg-grab');
  }, { capture: true });
  addEventListener('pointermove', (e) => {
    if (!s.drag) {
      document.documentElement.classList.toggle('egg-hover', e.pointerType === 'mouse' && inside(e));
      return;
    }
    const now = performance.now(), dt = Math.max(0.008, (now - s.drag.t) / 1000);
    const dx = e.clientX - s.drag.lx, dy = e.clientY - s.drag.ly;
    s.ry += dx * 0.012;
    s.vry = (dx * 0.012) / dt; // al soltar sigue girando con esa velocidad
    s.rx = THREE.MathUtils.clamp(s.rx + dy * 0.003, -0.5, 0.5);
    const total = e.clientY - s.drag.y;
    s.dragY = total >= 0 ? total : total * 0.25; // hacia abajo sigue al dedo; hacia arriba se resiste
    s.drag.vy += ((dy / dt) - s.drag.vy) * 0.5;
    s.drag.lx = e.clientX; s.drag.ly = e.clientY; s.drag.t = now;
  });
  addEventListener('pointerup', () => endDrag());
  addEventListener('pointercancel', () => endDrag());
  addEventListener('keydown', (e) => { if (e.key === 'Escape') throwAway(); });

  function update(dt, journey) {
    if (s.phase === 'off') return;
    const v = view();
    if (journey && (journey.j > 0.02 || journey.target > 0)) { cancel(); return; }
    if (s.phase === 'waiting') return;
    if (s.phase === 'falling' || s.phase === 'leaving') {
      s.vy += GRAVITY * dt;
      s.y += s.vy * dt;
      if (s.phase === 'falling' && s.y >= restY(v)) {
        s.y = restY(v);
        s.vy = -s.vy * 0.32;
        s.vz *= -0.5;
        if (Math.abs(s.vy) < 150) { s.vy = 0; s.phase = 'resting'; }
      }
      if (s.phase === 'leaving' && s.y > v.height + s.size) {
        s.phase = 'off';
        holder.visible = false;
        document.documentElement.classList.remove('egg-on', 'egg-hover');
        tomato.fallBack(); // el tomate cae desde arriba hasta su sitio
        return;
      }
    }
    if (s.phase === 'resting') {
      s.x += (v.cx - s.x) * Math.min(1, dt * 6); // si cambia el tamaño de la ventana
      s.y = restY(v) + s.dragY;
      if (!s.drag) s.dragY += (0 - s.dragY) * Math.min(1, dt * 12); // si no se ha tirado, vuelve a su sitio
      // se asienta: ligeramente inclinado, y el giro se frena poco a poco
      s.vz += (-0.08 - s.rz) * 40 * dt - s.vz * 8 * dt;
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
