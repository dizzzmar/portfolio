import * as THREE from 'three';
import { createDisc, createStudioEnvironment } from './disc.js?v=20261021wii2';

const clamp = THREE.MathUtils.clamp;
const easeOut = value => 1 - Math.pow(1 - clamp(value, 0, 1), 4);
const easeInOut = value => { const t = clamp(value, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
// Frame-rate independent easing towards a target: reaches ~63% of the way in 1/rate seconds
const damp = (current, target, rate, dt) => current + (target - current) * (1 - Math.exp(-rate * dt));
const TAU = Math.PI * 2;
const Z_AXIS = new THREE.Vector3(0, 0, 1);

// Turning a disc by dragging it: the disc follows the pointer, keeps spinning a little when let go,
// and after a moment springs back to face you (values tuned by eye against a24.raviklaassens.com)
const DRAG_START = 5;          // px the pointer must travel before a press becomes a drag (a shorter press is a click)
const DRAG_TURN = 0.011;       // radians per pixel dragged
const FRICTION = 0.89;         // share of the spin kept each 1/60 s after letting go
const MAX_SPIN = 14;           // radians per second, top spin speed
const RESET_DELAY = 900;       // ms after letting go before it turns back to face you
const SPRING = 7;              // stiffness of that return (critically damped: no wobble)
const IDLE_SPIN = 0.22;        // radians per second the discs turn on their own axis; faster on the one under the pointer
const HOVER_SPIN = 0.9;

export function createWiiPlayer({ scene, camera, renderer, onOpen, onClose }) {
  const dialog = document.getElementById('wii-player');
  const choices = dialog.querySelector('.wii-choices');
  const status = dialog.querySelector('.wii-status');
  const change = dialog.querySelector('[data-wii-change]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const foreground = new THREE.Scene();
  foreground.environment = scene.environment;
  foreground.add(new THREE.HemisphereLight(0xffffff, 0x484c61, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-2, 3, 5);
  foreground.add(key);
  const fill = new THREE.DirectionalLight(0x9dd5ff, 0.6);
  fill.position.set(3, -1, 3);
  foreground.add(fill);
  // A cool light from behind outlines the silver edge
  const rim = new THREE.DirectionalLight(0x499ff5, 0.75);
  foreground.add(rim, rim.target);
  // The discs reflect a little photo studio (bright strips), made once on first open
  let studio = null;

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
  let tiltNow = { x: 0, y: 0 };
  let lastNow = 0;
  let drag = null;
  let blockClick = false;
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
      studio ||= createStudioEnvironment(renderer);
      const disc = createDisc(game, index, studio);
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
      button.addEventListener('click', () => {
        if (blockClick) { blockClick = false; return; } // the press was a drag, not a click
        selectDisc(index);
      });
      button.addEventListener('pointerdown', event => startDrag(event, disc));
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
        choices.children[next].focus();
      });
      choices.append(button);
      disc.button = button;
      // Smoothed layout (size, height) and the turn the visitor gives it: yaw/pitch with their speeds, roll = spin on its own axis
      disc.pose = { size: 0, y: 0, ready: false };
      disc.turn = { yaw: 0, pitch: 0, yawSpeed: 0, pitchSpeed: 0, roll: index * 2.1, rollSpeed: IDLE_SPIN, released: 0, dragging: false };
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
    endDrag();
    selected = discs[index];
    selectedOrigin = selected.group.position.clone();
    selectedRotation = selected.group.quaternion.clone();
    selectedScale = selected.group.scale.x;
    setPower(false);
    for (const disc of discs) disc.button.disabled = true;
    status.textContent = 'Inserting ' + selected.game.title + '…';
    setPhase('inserting');
  }

  function startDrag(event, disc) {
    if (phase !== 'choosing' || drag) return;
    drag = { disc, id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now(), moved: false };
  }

  function moveDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    const turn = drag.disc.turn;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < DRAG_START) return;
      drag.moved = true;
      turn.dragging = true;
      drag.disc.button.setPointerCapture?.(event.pointerId);
      dialog.classList.add('is-turning');
    }
    const now = performance.now();
    const seconds = Math.max((now - drag.time) / 1000, 1 / 240);
    turn.yaw += dx * DRAG_TURN;
    turn.pitch = clamp(turn.pitch + dy * DRAG_TURN, -1.2, 1.2);
    // Speed of the last moves, smoothed, so letting go keeps the disc turning the way it was going
    turn.yawSpeed = clamp(THREE.MathUtils.lerp(turn.yawSpeed, dx * DRAG_TURN / seconds, 0.32), -MAX_SPIN, MAX_SPIN);
    turn.pitchSpeed = clamp(THREE.MathUtils.lerp(turn.pitchSpeed, dy * DRAG_TURN / seconds, 0.32), -MAX_SPIN, MAX_SPIN);
    drag.x = event.clientX;
    drag.y = event.clientY;
    drag.time = now;
  }

  function endDrag(event) {
    if (!drag || (event && event.pointerId !== drag.id)) return;
    const turn = drag.disc.turn;
    if (drag.moved) {
      blockClick = true;
      setTimeout(() => { blockClick = false; }, 0); // only the click that ends this drag is ignored
      turn.dragging = false;
      turn.released = performance.now();
      // A pause before letting go means no fling
      if (performance.now() - drag.time > 80) turn.yawSpeed = turn.pitchSpeed = 0;
      if (reduced) turn.yawSpeed = turn.pitchSpeed = 0;
    }
    dialog.classList.remove('is-turning');
    drag = null;
  }

  // Free spin after a drag, then a soft return to the nearest "facing you" angle
  function settleTurn(turn, now, dt) {
    if (turn.dragging) return;
    if (now - turn.released < RESET_DELAY) {
      const keep = Math.pow(FRICTION, dt * 60);
      turn.yaw += turn.yawSpeed * dt;
      turn.pitch = clamp(turn.pitch + turn.pitchSpeed * dt, -1.2, 1.2);
      turn.yawSpeed *= keep;
      turn.pitchSpeed *= keep;
      return;
    }
    const home = Math.round(turn.yaw / TAU) * TAU;
    if (reduced) { turn.yaw = home; turn.pitch = 0; turn.yawSpeed = turn.pitchSpeed = 0; return; }
    turn.yawSpeed += (SPRING * SPRING * (home - turn.yaw) - 2 * SPRING * turn.yawSpeed) * dt;
    turn.pitchSpeed += (SPRING * SPRING * -turn.pitch - 2 * SPRING * turn.pitchSpeed) * dt;
    turn.yaw += turn.yawSpeed * dt;
    turn.pitch += turn.pitchSpeed * dt;
  }

  function screenPosition(x, y, depth = 0.95) {
    const origin = camera.getWorldPosition(new THREE.Vector3());
    vector.set(x / innerWidth * 2 - 1, 1 - y / innerHeight * 2, 0.5).unproject(camera).sub(origin).normalize();
    const forward = camera.getWorldDirection(new THREE.Vector3());
    return origin.addScaledVector(vector, depth / vector.dot(forward));
  }

  function poseChoices(now, dt) {
    const elapsed = now - since;
    const span = Math.min(innerWidth * 0.27, 360);
    const centerY = innerHeight * 0.5;
    const diameter = Math.min(innerWidth * 0.29, innerHeight * 0.37, 360);
    const origin = slot.getWorldPosition(new THREE.Vector3());
    camera.getWorldQuaternion(cameraRotation);
    // The pointer tilts all discs a little; eased so it never jumps
    tiltNow.x = damp(tiltNow.x, tilt.x, 5, dt);
    tiltNow.y = damp(tiltNow.y, tilt.y, 5, dt);
    for (const [index, disc] of discs.entries()) {
      const centered = index === hoverIndex;
      const pose = disc.pose;
      const turn = disc.turn;
      const targetSize = diameter * (centered ? 1 : 0.84);
      const targetY = centerY + (centered ? -10 : 22);
      if (!pose.ready) { pose.size = targetSize; pose.y = targetY; pose.ready = true; }
      // Growing and lifting the disc under the pointer is eased, not instant
      pose.size = reduced ? targetSize : damp(pose.size, targetSize, 9, dt);
      pose.y = reduced ? targetY : damp(pose.y, targetY, 9, dt);
      const x = innerWidth / 2 + (index - 1) * span;
      const progress = reduced ? 1 : easeOut((elapsed - index * 110) / 1100);
      const destination = screenPosition(x, pose.y);
      disc.group.position.copy(origin).lerp(destination, progress);
      const worldPerPixel = screenPosition(x, pose.y + pose.size / 2).distanceTo(destination);
      disc.group.scale.setScalar(THREE.MathUtils.lerp(0.25, worldPerPixel / 0.06, progress));

      settleTurn(turn, now, dt);
      if (!reduced) {
        turn.rollSpeed = damp(turn.rollSpeed, centered ? HOVER_SPIN : IDLE_SPIN, 3, dt);
        turn.roll -= turn.rollSpeed * dt;
      }
      const rest = new THREE.Euler(
        -0.12 + (reduced ? 0 : Math.sin(now / 1800 + index) * 0.035) + tiltNow.y * 0.1,
        -0.35 + (index - 1) * -0.2 + tiltNow.x * 0.16 + (1 - progress) * Math.PI * 1.15,
        -0.12 + (index - 1) * -0.1,
      );
      // Order: camera, then the visitor's turn (in screen space), then the resting angle, then the spin on its own axis
      disc.group.quaternion.copy(cameraRotation)
        .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(turn.pitch, turn.yaw, 0, 'YXZ')))
        .multiply(new THREE.Quaternion().setFromEuler(rest))
        .multiply(new THREE.Quaternion().setFromAxisAngle(Z_AXIS, turn.roll));
      disc.setOpacity(progress);
      disc.button.style.left = x + 'px';
      disc.button.style.top = pose.y + 'px';
      disc.button.style.width = pose.size + 'px';
      disc.button.style.height = pose.size + 'px';
      disc.button.style.setProperty('--disc-diameter', pose.size + 'px');
    }
    // The rim light stays behind the discs whatever the room's framing
    rim.target.position.copy(slot.getWorldPosition(new THREE.Vector3()));
    rim.position.copy(rim.target.position).add(new THREE.Vector3(0, 0.5, -1.2).applyQuaternion(cameraRotation));
  }

  // One continuous move into the slot: a curve that ends lined up with the slot, so the disc slides straight in without stopping
  function insertDisc(now) {
    const duration = reduced ? 160 : 2100;
    const progress = clamp((now - since) / duration, 0, 1);
    blur = reduced ? 0 : 9 * (1 - easeInOut(progress / 0.7));
    for (const disc of discs) {
      if (disc === selected) continue;
      const fade = 1 - easeOut(progress / 0.35);
      disc.setOpacity(fade);
      disc.group.visible = fade > 0.001;
    }
    const slotPosition = slot.getWorldPosition(new THREE.Vector3());
    consoleObject.getWorldQuaternion(worldRotation);
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(worldRotation);
    const approach = slotPosition.clone().addScaledVector(normal, 0.09);
    const inside = slotPosition.clone().addScaledVector(normal, -0.09);
    const lift = new THREE.Vector3(0, 0.03, 0);
    const bend = selectedOrigin.clone().lerp(approach, 0.35).add(lift);
    slotRotation.copy(worldRotation).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2));
    const travel = easeInOut(progress);
    const u = travel, v = 1 - u;
    selected.group.position.set(0, 0, 0)
      .addScaledVector(selectedOrigin, v * v * v)
      .addScaledVector(bend, 3 * v * v * u)
      .addScaledVector(approach, 3 * v * u * u)
      .addScaledVector(inside, u * u * u);
    const turnIn = easeInOut(progress / 0.8);
    selected.group.quaternion.copy(selectedRotation).slerp(slotRotation, turnIn);
    selected.group.scale.setScalar(THREE.MathUtils.lerp(selectedScale, 1, turnIn));
    // Switch to the room's depth buffer as the disc reaches the slot: the console then hides it as it feeds inside
    const depth = vector.copy(selected.group.position).sub(slotPosition).dot(normal);
    if (depth < 0.03 && selected.group.parent !== scene) scene.add(selected.group);
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
    moveDrag(event);
  }, { passive: true });
  dialog.addEventListener('pointerup', endDrag);
  dialog.addEventListener('pointercancel', endDrag);
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
      const dt = Math.min((now - (lastNow || now)) / 1000, 0.05);
      lastNow = now;
      if (!active) return;
      if (phase === 'choosing') {
        blur = reduced ? 9 : 9 * easeOut((now - since) / 800);
        poseChoices(now, dt);
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
