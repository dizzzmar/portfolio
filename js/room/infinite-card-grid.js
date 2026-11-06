// Infinite card collage: a fixed pool of cards wraps around the viewport in both directions, so distance travelled never adds DOM nodes.
// The layout is the archive-wall one of nicolo-lombardi.com/archive/la-barra: a skewed lattice, so every row climbs to the right and
// each row is shifted sideways against the one above. Cards stand upright, centred on their lattice point, with wide gaps and no captions.
// The same card never sits next to itself. One animation clock moves the field and eases local card perspective around the cursor
// or finger. Rendering stops at rest and while the tab is hidden.
const MOTION = {
  follow: 30,      // while dragging the field stays under the hand
  glide: 9,        // after wheel or release: the same rate as the page scroll (js/smooth-scroll.js, EASE = 9)
  friction: 5,     // release velocity decays continuously
  maxSpeed: 2200, response: 16, touchRadius: 250, touchDepth: 34,
};
// Lattice, in card widths (measured on the reference at 1440 px: card ≈ 165 wide, steps of (252, -58) along a row and (73, 325) between rows).
const ROW_STEP = { x: 1.53, y: -.35 };      // from one card to the next in a row: right and slightly up
const COLUMN_STEP = { x: .44, y: 1.41 };    // from a row to the next: down and a little to the right (y in card heights)
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const wrap = (value, length) => ((value % length) + length) % length;
const approach = (value, target, rate, dt) => {
  const next = value + (target - value) * (1 - Math.exp(-rate * dt));
  return Math.abs(target - next) < .02 ? target : next;
};

// Fills the columns × rows torus so a card never sits next to itself (left, above, diagonals, across the seams where the
// field wraps) and, when there are enough cards, not two places away either.
function arrange(cards, columns, rows) {
  const grid = [], lastUsed = new Map(cards.map((card, i) => [card.id, -1 - i]));
  const at = (r, c) => grid[r]?.[(c + columns) % columns];
  let turn = 0;
  for (let row = 0; row < rows; row++) {
    grid.push([]);
    for (let column = 0; column < columns; column++) {
      const touching = new Set(), close = new Set();
      const add = (set, cell) => { if (cell) set.add(cell.id); };
      add(touching, at(row, column - 1)); add(touching, at(row - 1, column - 1)); add(touching, at(row - 1, column)); add(touching, at(row - 1, column + 1));
      add(close, at(row, column - 2)); add(close, at(row - 2, column)); add(close, at(row - 1, column - 2)); add(close, at(row - 1, column + 2));
      if (column === columns - 1) { add(touching, at(row, 0)); add(touching, at(row - 1, 0)); }      // the seam where a row wraps
      if (column === columns - 2) add(close, at(row, 0));
      if (row === rows - 1) for (let c = column - 1; c <= column + 1; c++) add(touching, at(0, c));    // the seam where a column wraps
      if (row === rows - 2) add(close, at(0, column));
      const free = cards.filter(card => !touching.has(card.id) && !close.has(card.id));
      const pool = free.length ? free : cards.filter(card => !touching.has(card.id));
      const pick = (pool.length ? pool : cards).reduce((x, y) => (lastUsed.get(x.id) <= lastUsed.get(y.id) ? x : y));
      lastUsed.set(pick.id, turn++);
      grid[row].push(pick);
    }
  }
  return grid;
}

// Lo usan el álbum de Pokémon (cartas 63 × 88, clases «pokemon-…») y el archivo digital (pegatinas cuadradas, clases «archive-…»):
// `prefix` da los nombres de las clases (<prefix>-item, <prefix>-card, <prefix>-turn), `aspect` es alto / ancho de cada pieza y `size` la escala de su tamaño.
export function createInfiniteCardGrid({ surface, list, cards, makeCard, reduced, entrance = true, prefix = 'pokemon', aspect = 88 / 63, size = 1, drift = null }) {
  const tiles = [];
  const position = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  const velocity = { x: 0, y: 0 };
  const contact = { x: 0, y: 0, active: false, touch: false, amount: 0 };
  let columns = 0, rows = 0, stepX = 0, stepY = 0, cardWidth = 0, cardHeight = 0;
  let A = { x: 0, y: 0 }, B = { x: 0, y: 0 }, det = 1, uLow = 0, vLow = 0;   // lattice vectors, their determinant and the wrap origin
  let width = 0, height = 0, raf = 0, lastTime = 0, drag = null, focused = null, first = entrance;
  let destroyed = false, paused = false;   // drift: { x, y } en px/s, un vaivén lento de toda la rejilla cuando nadie la toca (solo si se pide; el álbum de Pokémon no lo usa)

  function wake() {
    if (!raf && !destroyed && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function place() {
    for (const tile of tiles) {
      // Cell coordinates (u along a row, v between rows) of the field's shift, wrapped so the pool always covers the screen.
      const u = uLow + wrap(tile.column + (B.y * position.x - B.x * position.y) / det - uLow, columns);
      const v = vLow + wrap(tile.row + (A.x * position.y - A.y * position.x) / det - vLow, rows);
      const x = width / 2 + u * A.x + v * B.x - cardWidth / 2;
      const y = height / 2 + u * A.y + v * B.y - cardHeight / 2;
      if (x === tile.x && y === tile.y) continue;
      tile.x = x; tile.y = y;
      tile.item.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    }
  }

  // Depth stays local to each scan: the lattice and its spacing never move out of their 2D layout.
  function poseCards(dt) {
    const calm = reduced.matches;
    contact.amount = calm ? 0 : approach(contact.amount, contact.active ? 1 : 0, 12, dt);
    let moving = contact.amount !== (contact.active && !calm ? 1 : 0);
    const nearby = contact.touch || Boolean(drag);
    const travelX = target.x - position.x, travelY = target.y - position.y;
    for (const tile of tiles) {
      const nx = (contact.x - tile.x) / cardWidth * 2 - 1;
      const ny = (contact.y - tile.y) / cardHeight * 2 - 1;
      let rx = 0, ry = 0, z = 0, x = 0, y = 0;
      if (!calm && nearby) {
        const distance = Math.hypot(contact.x - tile.x - cardWidth / 2, contact.y - tile.y - cardHeight / 2);
        const influence = Math.exp(-Math.pow(distance / MOTION.touchRadius, 2)) * contact.amount;
        rx = (clamp(-ny, -1, 1) * 13 + clamp(travelY * .12, -6, 6)) * influence;
        ry = (clamp(nx, -1, 1) * 18 + clamp(-travelX * .12, -6, 6)) * influence;
        z = MOTION.touchDepth * influence;
        x = clamp(-nx, -1, 1) * 5 * influence;
        y = clamp(-ny, -1, 1) * 7 * influence;
      } else if (!calm && contact.active && Math.abs(nx) <= 1 && Math.abs(ny) <= 1) {
        rx = -ny * 10; ry = nx * 14; z = 22; y = -5;
      } else if (!calm && focused === tile) { rx = -3; ry = 6; z = 18; y = -5; }
      const pose = tile.pose;
      for (const [key, value] of Object.entries({ x, y, z, rx, ry })) {
        pose[key] = calm ? 0 : approach(pose[key], value, MOTION.response, dt);
        moving ||= pose[key] !== value;
      }
      const transform = Object.values(pose).every(value => value === 0) ? '' :
        `translate3d(${pose.x.toFixed(3)}px, ${pose.y.toFixed(3)}px, ${pose.z.toFixed(3)}px) rotateX(${pose.rx.toFixed(3)}deg) rotateY(${pose.ry.toFixed(3)}deg)`;
      if (tile.turn.style.transform !== transform) tile.turn.style.transform = transform;
    }
    return moving;
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min((now - (lastTime || now - 1000 / 60)) / 1000, .04);
    lastTime = now;
    if (!drag && !reduced.matches) {
      const decay = Math.exp(-MOTION.friction * dt);
      // Integrating the decay keeps the same glide at 60 and 120 Hz.
      target.x += velocity.x * (1 - decay) / MOTION.friction;
      target.y += velocity.y * (1 - decay) / MOTION.friction;
      velocity.x *= decay; velocity.y *= decay;
      if (Math.abs(velocity.x) < 2) velocity.x = 0;
      if (Math.abs(velocity.y) < 2) velocity.y = 0;
    }
    const drifting = Boolean(drift) && !drag && !paused && !reduced.matches;
    if (drifting) { target.x += drift.x * dt; target.y += drift.y * dt; }
    const rate = drag ? MOTION.follow : MOTION.glide;
    position.x = reduced.matches ? target.x : approach(position.x, target.x, rate, dt);
    position.y = reduced.matches ? target.y : approach(position.y, target.y, rate, dt);
    place();
    const posing = poseCards(dt);
    if (position.x !== target.x || position.y !== target.y || velocity.x || velocity.y || posing || drifting) wake();
    else lastTime = 0;
  }

  function move(x, y) {
    target.x += x; target.y += y;
    if (reduced.matches) { Object.assign(position, target); place(); poseCards(1); }
    else wake();
  }

  function setContact(event, active) {
    const rect = surface.getBoundingClientRect();
    contact.x = event.clientX - rect.left; contact.y = event.clientY - rect.top;
    contact.touch = event.pointerType !== 'mouse'; contact.active = active;
  }

  function layout() {
    if (!surface.clientWidth || destroyed) return;
    const nextWidth = surface.clientWidth, nextHeight = surface.clientHeight;
    if (width === nextWidth && height === nextHeight) return;
    const focusedId = document.activeElement?.closest?.(`.${prefix}-card`)?.dataset.card;
    width = nextWidth; height = nextHeight; focused = null;
    const small = width < 700;
    cardWidth = small ? clamp(width * .34, 100, 150) : clamp(width * .115, 120, 190);
    cardWidth *= size;
    cardHeight = cardWidth * aspect;
    A = { x: ROW_STEP.x * cardWidth, y: ROW_STEP.y * cardWidth }; B = { x: COLUMN_STEP.x * cardWidth, y: COLUMN_STEP.y * cardHeight };
    det = A.x * B.y - B.x * A.y; stepX = A.x; stepY = B.y;
    // How many cells the pool needs: the screen's four corners, in cell coordinates, plus a whole cell of margin on every side
    // (the cards that wrap round are always a full cell outside the screen, so they never pop in view).
    const us = [], vs = [];
    for (const [px, py] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const dx = px * width / 2, dy = py * height / 2;
      us.push((B.y * dx - B.x * dy) / det); vs.push((A.x * dy - A.y * dx) / det);
    }
    uLow = Math.min(...us) - 1; vLow = Math.min(...vs) - 1;
    columns = Math.ceil(Math.max(...us) - Math.min(...us)) + 3; rows = Math.ceil(Math.max(...vs) - Math.min(...vs)) + 3;
    list.style.setProperty('--card-width', `${cardWidth}px`);
    list.replaceChildren(); tiles.length = 0;
    const order = arrange(cards, columns, rows);
    const accessible = new Set();
    const cx = width / 2, cy = height / 2;
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const card = order[row][column];
        const item = document.createElement('li'); item.className = `${prefix}-item`;
        const element = makeCard(card);
        const duplicate = accessible.has(card.id);
        element.tabIndex = duplicate ? -1 : 0;
        if (duplicate) item.setAttribute('aria-hidden', 'true');
        accessible.add(card.id); item.append(element); list.append(item);
        const tile = { item, element, turn: element.querySelector(`.${prefix}-turn`), column, row, x: NaN, y: NaN, pose: { x: 0, y: 0, z: 0, rx: 0, ry: 0 } };
        tiles.push(tile);
        element.addEventListener('focus', () => {
          focused = tile;
          if (tile.x < 0 || tile.y < 0 || tile.x + cardWidth > width || tile.y + cardHeight > height) {
            move(cx - cardWidth / 2 - tile.x, cy - cardHeight / 2 - tile.y);
          }
          wake();
        });
        element.addEventListener('blur', () => { if (focused === tile) focused = null; wake(); });
      }
    }
    place(); poseCards(1);
    // Entrance on opening: the cards rise into place from the centre outward; after a resize they are simply there.
    for (const tile of tiles) {
      if (first) {
        const d = Math.hypot(tile.x + cardWidth / 2 - cx, tile.y + cardHeight / 2 - cy);
        tile.element.style.transitionDelay = `${Math.min(420, d / Math.max(width, height) * 520).toFixed(0)}ms`;
      } else tile.element.classList.add('is-in');
    }
    if (first) {
      first = false;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        for (const tile of tiles) tile.element.classList.add('is-in');
        setTimeout(() => tiles.forEach(t => { t.element.style.transitionDelay = ''; }), 1300);
      }));
    }
    if (focusedId) tiles.find(t => t.element.tabIndex === 0 && t.element.dataset.card === focusedId)?.element.focus({ preventScroll: true });
  }

  function wheel(event) {
    if (event.ctrlKey) return;
    event.preventDefault(); velocity.x = velocity.y = 0;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
    move(-(event.shiftKey ? event.deltaY : event.deltaX) * unit, -(event.shiftKey ? 0 : event.deltaY) * unit);
  }
  function down(event) {
    if ((event.pointerType === 'mouse' && event.button !== 0) || drag) return;
    event.preventDefault();
    setContact(event, true);
    velocity.x = velocity.y = 0; Object.assign(target, position);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now(), vx: 0, vy: 0 };
    surface.setPointerCapture(event.pointerId);
    surface.classList.add('is-dragging'); wake();
  }
  function pointerMove(event) {
    if (drag && drag.id !== event.pointerId) return;
    setContact(event, true);
    if (drag) {
      const x = event.clientX - drag.x, y = event.clientY - drag.y;
      const dt = Math.max(.004, (performance.now() - drag.time) / 1000);
      const blend = 1 - Math.exp(-22 * dt);
      drag.vx += (clamp(x / dt, -MOTION.maxSpeed, MOTION.maxSpeed) - drag.vx) * blend;
      drag.vy += (clamp(y / dt, -MOTION.maxSpeed, MOTION.maxSpeed) - drag.vy) * blend;
      move(x, y);
      drag.x = event.clientX; drag.y = event.clientY; drag.time = performance.now();
    }
    wake();
  }
  function leave() { if (!drag) { contact.active = false; wake(); } }
  function up(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const released = drag; drag = null;
    contact.active = event.pointerType === 'mouse' && event.type === 'pointerup';
    surface.classList.remove('is-dragging');
    if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
    if (event.type === 'pointerup' && !reduced.matches && performance.now() - released.time < 90) {
      velocity.x = released.vx; velocity.y = released.vy;
    }
    wake();
  }
  function keydown(event) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); velocity.x = velocity.y = 0; contact.active = false;
    move(event.key === 'ArrowLeft' ? stepX : event.key === 'ArrowRight' ? -stepX : 0,
      event.key === 'ArrowUp' ? stepY : event.key === 'ArrowDown' ? -stepY : 0);
  }
  function settle() {
    velocity.x = velocity.y = 0; contact.active = false; contact.amount = 0;
    if (drag && surface.hasPointerCapture(drag.id)) surface.releasePointerCapture(drag.id);
    drag = null; surface.classList.remove('is-dragging');
    Object.assign(target, position); cancelAnimationFrame(raf); raf = 0; lastTime = 0;
    for (const tile of tiles) {
      Object.assign(tile.pose, { x: 0, y: 0, z: 0, rx: 0, ry: 0 });
      tile.turn.style.transform = '';
    }
    place();
  }
  function visibility() { if (document.hidden) settle(); else wake(); }
  function preferences() { if (reduced.matches) settle(); else wake(); }
  surface.addEventListener('wheel', wheel, { passive: false });
  surface.addEventListener('pointerdown', down);
  surface.addEventListener('pointermove', pointerMove);
  surface.addEventListener('pointerleave', leave);
  surface.addEventListener('pointerup', up);
  surface.addEventListener('pointercancel', up);
  surface.addEventListener('lostpointercapture', up);
  surface.addEventListener('keydown', keydown);
  document.addEventListener('visibilitychange', visibility);
  reduced.addEventListener('change', preferences);
  const observer = new ResizeObserver(layout); observer.observe(surface); layout();
  wake();
  return {
    pause(value) { paused = Boolean(value); if (!paused) wake(); },   // el visor abierto tapa la rejilla: que no siga moviéndose por debajo
    destroy() {
      destroyed = true; observer.disconnect(); settle();
      surface.removeEventListener('wheel', wheel); surface.removeEventListener('pointerdown', down);
      surface.removeEventListener('pointermove', pointerMove); surface.removeEventListener('pointerleave', leave);
      surface.removeEventListener('pointerup', up); surface.removeEventListener('pointercancel', up);
      surface.removeEventListener('lostpointercapture', up); surface.removeEventListener('keydown', keydown);
      document.removeEventListener('visibilitychange', visibility); reduced.removeEventListener('change', preferences);
    },
  };
}
