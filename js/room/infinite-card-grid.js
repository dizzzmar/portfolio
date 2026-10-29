// Infinite card collage: a fixed pool of cards wraps around the viewport in both directions, so distance travelled never adds DOM nodes.
// Columns are staggered in height (as in the Posters collage), every card keeps its caption, and the same card never sits next to itself.
// One animation clock moves the 2D field and eases local card perspective around the cursor or finger.
// The collage, captions and arrangement stay intact. Rendering stops at rest and while the tab is hidden.
const MOTION = {
  follow: 30,      // while dragging the field stays under the hand
  glide: 9,        // after wheel or release: the same rate as the page scroll (js/smooth-scroll.js, EASE = 9)
  friction: 5,     // release velocity decays continuously
  maxSpeed: 2200, response: 16, touchRadius: 250, touchDepth: 34,
};
const STAGGER = [0, .42, .14, .6, .28, .74, .06];   // vertical offset of each column, as a fraction of a row
const CAPTION = 34, CAPTION_SMALL = 52;              // caption under each card: one line, or two on a phone (css/room-pokemon.css)
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

export function createInfiniteCardGrid({ surface, list, cards, makeCard, reduced, entrance = true }) {
  const tiles = [];
  const position = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  const velocity = { x: 0, y: 0 };
  const contact = { x: 0, y: 0, active: false, touch: false, amount: 0 };
  let columns = 0, rows = 0, stepX = 0, stepY = 0, cardWidth = 0, cardHeight = 0, caption = CAPTION;
  let width = 0, height = 0, raf = 0, lastTime = 0, drag = null, focused = null, first = entrance;
  let destroyed = false;

  function wake() {
    if (!raf && !destroyed && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function place() {
    for (const tile of tiles) {
      const x = wrap(tile.column * stepX + position.x + stepX, columns * stepX) - stepX;
      const y = wrap((tile.row + STAGGER[tile.column % STAGGER.length]) * stepY + position.y + stepY, rows * stepY) - stepY;
      if (x === tile.x && y === tile.y) continue;
      tile.x = x; tile.y = y;
      tile.item.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    }
  }

  // Depth stays local to each scan: stagger, spacing and captions never move out of their 2D layout.
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
    const rate = drag ? MOTION.follow : MOTION.glide;
    position.x = reduced.matches ? target.x : approach(position.x, target.x, rate, dt);
    position.y = reduced.matches ? target.y : approach(position.y, target.y, rate, dt);
    place();
    const posing = poseCards(dt);
    if (position.x !== target.x || position.y !== target.y || velocity.x || velocity.y || posing) wake();
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
    const focusedId = document.activeElement?.closest?.('.pokemon-card')?.dataset.card;
    width = nextWidth; height = nextHeight; focused = null;
    const small = width < 700;
    cardWidth = small ? clamp(width * .38, 118, 190) : clamp(width * .15, 150, 236);
    cardHeight = cardWidth * 88 / 63;
    const gap = small ? 18 : clamp(width * .032, 28, 56);
    caption = small ? CAPTION_SMALL : CAPTION;
    stepX = cardWidth + gap; stepY = cardHeight + caption + gap * 1.3;
    columns = Math.max(4, Math.ceil(width / stepX) + 2);
    rows = Math.max(3, Math.ceil(height / stepY) + 3);   // one more row than needed: the staggered columns start lower
    list.style.setProperty('--card-width', `${cardWidth}px`);
    list.replaceChildren(); tiles.length = 0;
    const order = arrange(cards, columns, rows);
    const accessible = new Set();
    const cx = width / 2, cy = height / 2;
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const card = order[row][column];
        const item = document.createElement('li'); item.className = 'pokemon-item';
        const element = makeCard(card);
        const duplicate = accessible.has(card.id);
        element.tabIndex = duplicate ? -1 : 0;
        if (duplicate) item.setAttribute('aria-hidden', 'true');
        accessible.add(card.id); item.append(element); list.append(item);
        const tile = { item, element, turn: element.querySelector('.pokemon-turn'), column, row, x: NaN, y: NaN, pose: { x: 0, y: 0, z: 0, rx: 0, ry: 0 } };
        tiles.push(tile);
        element.addEventListener('focus', () => {
          focused = tile;
          if (tile.x < 0 || tile.y < 0 || tile.x + cardWidth > width || tile.y + cardHeight + caption > height) {
            move(cx - cardWidth / 2 - tile.x, cy - cardHeight / 2 - tile.y);
          }
          wake();
        });
        element.addEventListener('blur', () => { if (focused === tile) focused = null; wake(); });
      }
    }
    position.x = target.x = wrap(target.x, columns * stepX);
    position.y = target.y = wrap(target.y, rows * stepY);
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
  function visibility() { if (document.hidden) settle(); }
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
  return {
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
