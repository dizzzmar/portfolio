import * as THREE from 'three';

// Loading the room: the wireframe (lines extracted from the shelf, without textures) draws itself from the bottom up and then
// the real room is "set" over it: a green line sweeps upwards, the room appears below it and the lines above it vanish.
// It always plays, also when the room is already in the browser's cache. While the room is still downloading the lines
// appear slowly (following the download); once it is ready they finish quickly and the room is set.
// The room's materials are cut with `clip` (see clipRoom) while it is being set; afterwards the plane is moved out of the way
// instead of removed, so no shader has to recompile at the end.
const DRAW_SLOW = 6;    // s for the whole wireframe while the room is still downloading (or faster, following the download)
const DRAW_FAST = 0.7;  // s to finish the remaining lines once the room has loaded
const BUILD = 0.9;      // s for the sweep that sets the real room
const OUT_OF_THE_WAY = 1e6;

export function createRoomLoading({ scene, status, reduced, onBounds, onShown }) {
  const abort = new AbortController();
  let lines = null;
  let wireMissing = false;
  let finished = false;   // the room has loaded
  let shown = false;      // the room is fully set
  let downloaded = 0;     // 0..1 of the room's download, when the server tells the size
  let drawn = 0;          // 0..1 of the wireframe drawn
  let build = -1;         // -1 = not started; then 0..1 of the sweep
  let bottom = 0, top = 1;
  let last = performance.now();
  const caption = status.querySelector('[data-loading-label]');
  const meter = status.querySelector('[role="progressbar"]');
  const scan = { value: 0 };
  const cut = { value: -OUT_OF_THE_WAY };
  // Keeps what is below the sweep: plane normal down, constant = height of the sweep
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), reduced ? OUT_OF_THE_WAY : -OUT_OF_THE_WAY);

  fetch('/assets/room/room-wireframe.bin?v=20261022a', { signal: abort.signal })
    .then(response => {
      if (!response.ok) throw new Error('Wireframe unavailable');
      return response.arrayBuffer();
    })
    .then(buffer => {
      if (shown) return;
      const data = new Float32Array(buffer);
      const box = new THREE.Box3(new THREE.Vector3(...data.slice(0, 3)), new THREE.Vector3(...data.slice(3, 6)));
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(data.subarray(6), 3));
      geometry.computeBoundingSphere();
      const material = new THREE.LineBasicMaterial({ color: '#659e77', transparent: true, opacity: .68, toneMapped: false });
      material.onBeforeCompile = shader => {
        shader.uniforms.uScan = scan;
        shader.uniforms.uCut = cut;
        shader.vertexShader = 'varying float vHeight;\n' + shader.vertexShader
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHeight = position.y;');
        shader.fragmentShader = 'varying float vHeight; uniform float uScan; uniform float uCut;\n' + shader.fragmentShader
          .replace('#include <color_fragment>', '#include <color_fragment>\nif (vHeight < uCut) discard; // already replaced by the real room\ndiffuseColor.rgb += vec3(.32, .65, .28) * exp(-abs(vHeight - uScan) * 15.0);');
      };
      lines = new THREE.LineSegments(geometry, material);
      lines.name = 'Room loading wireframe';
      lines.frustumCulled = false;
      bottom = box.min.y;
      top = box.max.y;
      lines.geometry.setDrawRange(0, 0);
      scene.add(lines);
      onBounds(box);
    })
    .catch(() => { wireMissing = true; /* The full room can load even if its preview is unavailable. */ });

  function progress(event) {
    if (finished) return;
    if (event.total > 0) {
      downloaded = Math.min(.99, event.loaded / event.total);
      meter.setAttribute('aria-valuenow', Math.round(downloaded * 100));
      meter.style.setProperty('--room-progress', downloaded);
      status.classList.add('has-progress');
      caption.textContent = downloaded >= .99 ? 'Putting things in place…' : `Entering the room… ${Math.round(downloaded * 100)}%`;
    } else {
      caption.textContent = `Entering the room… ${(event.loaded / 1048576).toFixed(1)} MB`;
    }
  }

  function dispose() {
    if (!lines) return;
    lines.removeFromParent();
    lines.geometry.dispose();
    lines.material.dispose();
    lines = null;
  }

  function show() {
    shown = true;
    clip.constant = OUT_OF_THE_WAY;
    dispose();
    abort.abort();
    status.classList.add('is-ready');
    document.body.dataset.roomReady = 'true';
    delete document.body.dataset.roomLoading;
    if (reduced) status.hidden = true;
    onShown();
  }

  return {
    // Every material of the room is cut by this plane while it is being set (assign it before the first render)
    clip,
    get busy() { return !shown; },
    progress,
    finish(box) {
      finished = true;
      if (box) { bottom = Math.min(bottom, box.min.y); top = Math.max(top, box.max.y); }
      meter.setAttribute('aria-valuenow', '100');
      meter.style.setProperty('--room-progress', 1);
      caption.textContent = 'Putting things in place…';
      if (reduced) show();
    },
    fail() {
      finished = true;
      abort.abort();
      dispose();
      delete document.body.dataset.roomLoading;
      status.classList.remove('has-progress');
      status.replaceChildren('The room couldn’t load. ');
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = 'Try again';
      retry.onclick = () => location.reload();
      status.append(retry);
    },
    update(now) {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (shown || reduced) return;
      // 1. The lines draw themselves: slowly (or with the download) while loading, quickly once the room is ready
      if (build < 0) {
        const goal = finished ? 1 : Math.min(.95, Math.max(downloaded, drawn + dt / DRAW_SLOW));
        drawn = finished ? Math.min(1, drawn + dt / DRAW_FAST) : Math.max(drawn, goal);
        if (lines) {
          const count = lines.geometry.attributes.position.count;
          lines.geometry.setDrawRange(0, Math.floor(count * drawn / 2) * 2);
          scan.value = THREE.MathUtils.lerp(bottom, top, (now / 2600) % 1);
        }
        if (finished && (drawn >= 1 || wireMissing || !lines)) {
          build = 0;
          status.classList.add('is-ready'); // the caption leaves as the room starts being set, so it doesn't sit over it
          setTimeout(() => { status.hidden = true; }, 350);
        }
        return;
      }
      // 2. The room is set from the bottom up behind a green line; the lines it passes disappear
      build = Math.min(1, build + dt / BUILD);
      const e = build < .5 ? 2 * build * build : 1 - Math.pow(-2 * build + 2, 2) / 2;
      const height = THREE.MathUtils.lerp(bottom - .02, top + .02, e);
      clip.constant = height;
      cut.value = height;
      scan.value = height;
      if (build >= 1) show();
    },
  };
}
