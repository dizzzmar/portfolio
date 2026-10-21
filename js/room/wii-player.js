import * as THREE from 'three';
import { createDisc } from './disc.js?v=20261021wii1';

const clamp = THREE.MathUtils.clamp;
const easeOut = value => 1 - Math.pow(1 - clamp(value, 0, 1), 3);
const smooth = value => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };

export function createWiiPlayer({ scene, camera, renderer, onOpen, onClose }) {
  const dialog = document.getElementById('wii-player');
  const choices = dialog.querySelector('.wii-choices');
  const status = dialog.querySelector('.wii-status');
  const change = dialog.querySelector('[data-wii-change]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const foreground = new THREE.Scene();
  foreground.environment = scene.environment;
  foreground.add(new THREE.HemisphereLight(0xffffff, 0x484c61, 2.8));
  const key = new THREE.DirectionalLight(0xffffff, 3);
  key.position.set(-2, 3, 5);
  foreground.add(key);
  const fill = new THREE.DirectionalLight(0x9dd5ff, 2);
  fill.position.set(3, -1, 3);
  foreground.add(fill);

  let consoleObject = null;
  let consoleBounds = null;
  let slot = null;
  let slotMaterial = null;
  let powerLight = null;
  let powerIndicator = null;
  let slotLights = null;
  let games = null;
  let loading = null;
  let active = false;
  let phase = 'closed';
  let since = 0;
  let discs = [];
  let selected = null;
  let loadedGame = null;
  let selectedOrigin = null;
  let selectedRotation = null;
  let selectedScale = 1;
  let hoverIndex = 1;
  let tilt = { x: 0, y: 0 };
  let blur = 0;
  let requestId = 0;
  let returnFocus = null;
  const vector = new THREE.Vector3();
  const worldRotation = new THREE.Quaternion();
  const cameraRotation = new THREE.Quaternion();
  const slotRotation = new THREE.Quaternion();

  function setPhase(next) {
    phase = next;
    since = performance.now();
    dialog.dataset.state = next;
  }

  function setPower(on) {
    if (!slotMaterial) return;
    slotMaterial.color.set(on ? '#1583dd' : '#0e1720');
    slotMaterial.emissive.set(on ? '#138bff' : '#000000');
    slotMaterial.emissiveIntensity = on ? 3 : 0;
    powerLight.intensity = on ? 0.12 : 0;
    powerIndicator.visible = on;
    slotLights.visible = on;
  }

  function clearDiscs() {
    discs.forEach(disc => disc.dispose());
    discs = [];
    selected = null;
    choices.replaceChildren();
  }

  async function loadGames() {
    if (games) return games;
    if (!loading) {
      loading = fetch('/assets/room/discs/games.json?v=20261021wii1')
        .then(response => {
          if (!response.ok) throw new Error('Game list unavailable');
          return response.json();
        })
        .then(items => {
          if (!Array.isArray(items) || items.length !== 3 || items.some(item => !item.id || !item.title)) throw new Error('Invalid game list');
          games = items.map(item => {
            const artwork = item.artwork ? new URL(item.artwork, location.origin + '/assets/room/discs/') : null;
            return { ...item, artwork: artwork?.origin === location.origin ? artwork.href : null };
          });
          return games;
        })
        .finally(() => { loading = null; });
    }
    return loading;
  }

  function showChoices() {
    clearDiscs();
    discs = games.map((game, index) => {
      const disc = createDisc(game, index, scene.environment);
      foreground.add(disc.group);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'wii-choice';
      button.setAttribute('aria-label', 'Insert ' + game.title);
      button.dataset.game = game.id;
      const number = document.createElement('span');
      number.className = 'wii-disc-number';
      number.textContent = String(index + 1).padStart(2, '0');
      const title = document.createElement('span');
      title.className = 'wii-disc-title';
      title.textContent = game.title;
      button.append(number, title);
      button.addEventListener('pointerenter', () => { hoverIndex = index; });
      button.addEventListener('focus', () => { hoverIndex = index; });
      button.addEventListener('click', () => selectDisc(index));
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
        choices.children[next].focus();
      });
      choices.append(button);
      disc.button = button;
      return disc;
    });
    status.textContent = 'Select a disc.';
    change.hidden = true;
    hoverIndex = 1;
    setPhase('choosing');
  }

  async function open(trigger) {
    if (!consoleObject || active) return;
    active = true;
    returnFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
    dialog.showModal();
    document.body.classList.add('wii-open');
    setPhase('loading');
    status.textContent = 'Loading recently played…';
    onOpen();
    const request = ++requestId;
    try {
      await loadGames();
      if (active && request === requestId) showChoices();
    } catch (_) {
      if (!active || request !== requestId) return;
      status.textContent = 'The discs could not load. Please try again.';
      change.hidden = false;
      change.textContent = 'Try again';
      setPhase('error');
    }
  }

  function close() {
    if (!active) return;
    active = false;
    requestId++;
    blur = 0;
    clearDiscs();
    setPower(Boolean(loadedGame));
    setPhase('closed');
    document.body.classList.remove('wii-open');
    if (dialog.open) dialog.close();
    if (returnFocus?.isConnected && returnFocus !== document.body) returnFocus.focus({ preventScroll: true });
    onClose();
  }

  function selectDisc(index) {
    if (phase !== 'choosing') return;
    selected = discs[index];
    selectedOrigin = selected.group.position.clone();
    selectedRotation = selected.group.quaternion.clone();
    selectedScale = selected.group.scale.x;
    setPower(false);
    for (const disc of discs) disc.button.disabled = true;
    status.textContent = 'Inserting ' + selected.game.title + '…';
    setPhase('inserting');
  }

  function screenPosition(x, y, depth = 0.95) {
    const origin = camera.getWorldPosition(new THREE.Vector3());
    vector.set(x / innerWidth * 2 - 1, 1 - y / innerHeight * 2, 0.5).unproject(camera).sub(origin).normalize();
    const forward = camera.getWorldDirection(new THREE.Vector3());
    return origin.addScaledVector(vector, depth / vector.dot(forward));
  }

  function poseChoices(now) {
    const elapsed = now - since;
    const span = Math.min(innerWidth * 0.27, 360);
    const centerY = innerHeight * 0.5;
    const diameter = Math.min(innerWidth * 0.29, innerHeight * 0.37, 360);
    const origin = slot.getWorldPosition(new THREE.Vector3());
    camera.getWorldQuaternion(cameraRotation);
    for (const [index, disc] of discs.entries()) {
      const centered = index === hoverIndex;
      const size = diameter * (centered ? 1 : 0.84);
      const x = innerWidth / 2 + (index - 1) * span;
      const y = centerY + (centered ? -10 : 22);
      const progress = reduced ? 1 : easeOut((elapsed - index * 110) / 950);
      const destination = screenPosition(x, y);
      disc.group.position.copy(origin).lerp(destination, progress);
      const worldPerPixel = screenPosition(x, y + size / 2).distanceTo(destination);
      disc.group.scale.setScalar(THREE.MathUtils.lerp(0.25, worldPerPixel / 0.06, progress));
      const angle = new THREE.Euler(
        -0.12 + (reduced ? 0 : Math.sin(now / 1800 + index) * 0.035) + tilt.y * 0.1,
        -0.35 + (index - 1) * -0.2 + tilt.x * 0.16 + (1 - progress) * Math.PI * 1.15,
        -0.12 + (index - 1) * -0.1,
      );
      disc.group.quaternion.copy(cameraRotation).multiply(new THREE.Quaternion().setFromEuler(angle));
      disc.setOpacity(progress);
      disc.button.style.left = x + 'px';
      disc.button.style.top = y + 'px';
      disc.button.style.width = size + 'px';
      disc.button.style.height = size + 'px';
      disc.button.style.setProperty('--disc-diameter', size + 'px');
    }
  }

  function insertDisc(now) {
    const duration = reduced ? 160 : 2400;
    const progress = clamp((now - since) / duration, 0, 1);
    blur = reduced ? 0 : 9 * (1 - smooth(progress / 0.65));
    for (const disc of discs) {
      if (disc === selected) continue;
      const fade = 1 - easeOut(progress / 0.3);
      disc.setOpacity(fade);
      disc.group.visible = fade > 0;
    }
    const slotPosition = slot.getWorldPosition(new THREE.Vector3());
    consoleObject.getWorldQuaternion(worldRotation);
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(worldRotation);
    const approach = slotPosition.clone().addScaledVector(normal, 0.09);
    const inside = slotPosition.clone().addScaledVector(normal, -0.09);
    slotRotation.copy(worldRotation).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2));
    const travel = smooth(progress / 0.7);
    selected.group.position.copy(selectedOrigin).lerp(approach, travel);
    if (progress > 0.7) selected.group.position.copy(approach).lerp(inside, smooth((progress - 0.7) / 0.3));
    selected.group.quaternion.copy(selectedRotation).slerp(slotRotation, travel);
    selected.group.scale.setScalar(THREE.MathUtils.lerp(selectedScale, 1, travel));
    // Switch to the room's depth buffer before the disc reaches the real slot.
    // The console then occludes the disc as it feeds inside.
    if (progress >= 0.68 && selected.group.parent !== scene) scene.add(selected.group);
    if (progress < 1) return;
    loadedGame = selected.game;
    clearDiscs();
    setPower(true);
    status.textContent = loadedGame.title + ' · Now playing';
    change.textContent = 'Change disc';
    change.hidden = false;
    setPhase('playing');
    change.focus({ preventScroll: true });
  }

  dialog.querySelector('[data-wii-close]').addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', close);
  dialog.addEventListener('pointermove', event => {
    tilt = reduced ? { x: 0, y: 0 } : { x: event.clientX / innerWidth * 2 - 1, y: event.clientY / innerHeight * 2 - 1 };
  }, { passive: true });
  change.addEventListener('click', () => {
    if (games) showChoices();
    else { close(); open(returnFocus); }
  });
  addEventListener('pagehide', close);

  return {
    get active() { return active; },
    get blur() { return blur; },
    get bounds() { return consoleBounds; },
    open, close,
    attach(object) {
      if (!object) return;
      consoleObject = object;
      consoleBounds = new THREE.Box3();
      object.traverse(mesh => {
        if (!mesh.isMesh) return;
        if (/Wii (pearl white|silver stand)/i.test(mesh.material.name)) consoleBounds.expandByObject(mesh);
        if (/Wii slot blue/i.test(mesh.material.name)) {
          mesh.material = mesh.material.clone();
          slotMaterial = mesh.material;
          const center = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
          slot = new THREE.Object3D();
          slot.position.copy(object.worldToLocal(center));
          object.add(slot);
        }
      });
      if (!slot) { consoleObject = null; return; }
      powerLight = new THREE.PointLight(0x158bff, 0, 0.4, 2);
      powerLight.position.copy(slot.position).add(new THREE.Vector3(0, 0, 0.025));
      powerIndicator = new THREE.Mesh(new THREE.SphereGeometry(0.002, 12, 8), new THREE.MeshBasicMaterial({ color: '#8cffa4', toneMapped: false }));
      powerIndicator.position.set(-0.013, 0.242, 0.0805);
      powerIndicator.name = 'wii-power-led';
      slotLights = new THREE.Group();
      slotLights.name = 'wii-slot-lights';
      const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color('#168dff').multiplyScalar(3), toneMapped: false });
      const edge = new THREE.BoxGeometry(0.001, 0.172, 0.002);
      for (const offset of [-0.0017, 0.0017]) {
        const light = new THREE.Mesh(edge, glow);
        light.position.copy(slot.position).add(new THREE.Vector3(offset, 0, 0.003));
        slotLights.add(light);
      }
      object.add(powerLight, powerIndicator, slotLights);
      setPower(false);
    },
    update(now) {
      if (!active) return;
      if (phase === 'choosing') {
        blur = reduced ? 9 : 9 * easeOut((now - since) / 700);
        poseChoices(now);
      } else if (phase === 'inserting') insertDisc(now);
    },
    render() {
      if (!active || !discs.length) return;
      const autoClear = renderer.autoClear;
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(foreground, camera);
      renderer.autoClear = autoClear;
    },
  };
}
