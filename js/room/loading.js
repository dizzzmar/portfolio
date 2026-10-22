import * as THREE from 'three';

// This preview is extracted from the shelf, without its textures or materials.
export function createRoomLoading({ scene, status, reduced, onBounds }) {
  const abort = new AbortController();
  let lines = null;
  let started = performance.now();
  let finished = false;
  let ending = null;
  let received = 0;
  const caption = status.querySelector('[data-loading-label]');
  const meter = status.querySelector('[role="progressbar"]');
  const scan = { value: 0 };

  fetch('/assets/room/room-wireframe.bin?v=20261022a', { signal: abort.signal })
    .then(response => {
      if (!response.ok) throw new Error('Wireframe unavailable');
      return response.arrayBuffer();
    })
    .then(buffer => {
      if (finished) return;
      const data = new Float32Array(buffer);
      const box = new THREE.Box3(new THREE.Vector3(...data.slice(0, 3)), new THREE.Vector3(...data.slice(3, 6)));
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(data.subarray(6), 3));
      geometry.computeBoundingSphere();
      const material = new THREE.LineBasicMaterial({ color: '#659e77', transparent: true, opacity: .68, toneMapped: false });
      material.onBeforeCompile = shader => {
        shader.uniforms.uScan = scan;
        shader.vertexShader = 'varying float vHeight;\n' + shader.vertexShader
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHeight = position.y;');
        shader.fragmentShader = 'varying float vHeight; uniform float uScan;\n' + shader.fragmentShader
          .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb += vec3(.32, .65, .28) * exp(-abs(vHeight - uScan) * 15.0);');
      };
      lines = new THREE.LineSegments(geometry, material);
      lines.name = 'Room loading wireframe';
      lines.userData.top = box.max.y;
      lines.userData.bottom = box.min.y;
      scene.add(lines);
      onBounds(box);
      started = performance.now();
    })
    .catch(() => { /* The full room can load even if its preview is unavailable. */ });

  function progress(event) {
    if (finished) return;
    received = event.loaded;
    if (event.total > 0) {
      const value = Math.min(.99, event.loaded / event.total);
      meter.setAttribute('aria-valuenow', Math.round(value * 100));
      meter.style.setProperty('--room-progress', value);
      status.classList.add('has-progress');
      caption.textContent = value >= .99 ? 'Putting things in place…' : `Entering the room… ${Math.round(value * 100)}%`;
    } else {
      caption.textContent = `Entering the room… ${(received / 1048576).toFixed(1)} MB`;
    }
  }

  function dispose() {
    if (!lines) return;
    lines.removeFromParent();
    lines.geometry.dispose();
    lines.material.dispose();
    lines = null;
  }

  return {
    progress,
    finish() {
      finished = true;
      abort.abort();
      ending = performance.now();
      meter.setAttribute('aria-valuenow', '100');
      meter.style.setProperty('--room-progress', 1);
      status.classList.add('is-ready');
      document.body.dataset.roomReady = 'true';
      delete document.body.dataset.roomLoading;
      setTimeout(() => { status.hidden = true; }, reduced ? 0 : 350);
      if (reduced) dispose();
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
      if (!lines) return;
      if (ending !== null) {
        lines.material.opacity = .68 * Math.max(0, 1 - (now - ending) / 300);
        if (now - ending >= 300) dispose();
        return;
      }
      const elapsed = (now - started) / 1000;
      const count = lines.geometry.attributes.position.count;
      const reveal = reduced ? 1 : Math.min(1, elapsed / 2.6);
      lines.geometry.setDrawRange(0, Math.floor(count * reveal / 2) * 2);
      scan.value = THREE.MathUtils.lerp(lines.userData.bottom, lines.userData.top, reduced ? 1 : (elapsed / 2.6) % 1);
    },
  };
}
