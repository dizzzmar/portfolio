// One input-driven animation clock: infinite translation, momentum and card perspective.
// A fixed pool wraps around the viewport; distance travelled never adds DOM nodes.
const MOTION = {
  follow: 30, glide: 10, friction: 5, response: 16,
  maxSpeed: 2200, touchRadius: 250, touchDepth: 34,
};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const wrap = (value, length) => ((value % length) + length) % length;
const approach = (value, target, rate, dt) => {
  const next = value + (target - value) * (1 - Math.exp(-rate * dt));
  return Math.abs(target - next) < .02 ? target : next;
};

export function createInfiniteCardGrid({ surface, list, cards, makeCard, reduced }) {
  const tiles = [];
  const position = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  const velocity = { x: 0, y: 0 };
  const contact = { x: 0, y: 0, active: false, touch: false, amount: 0 };
  const plane = { x: 0, y: 0 };
  let columns = 0, rows = 0, stepX = 0, stepY = 0, cardWidth = 0;
  let width = 0, height = 0, raf = 0, lastTime = 0, drag = null, focused = null;
  let destroyed = false;

  function wake() {
    if (!raf && !destroyed && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function draw(dt) {
    const calm = reduced.matches;
    contact.amount = calm ? 0 : approach(contact.amount, contact.active ? 1 : 0, 12, dt);
    const pressure = contact.touch ? contact.amount : 0;
    // A shallow view change around the point of contact, not a rotating viewport.
    const viewX = pressure * (contact.y / height * 2 - 1) * -3;
    const viewY = pressure * (contact.x / width * 2 - 1) * 4;
    plane.x = calm ? 0 : approach(plane.x, viewX, MOTION.response, dt);
    plane.y = calm ? 0 : approach(plane.y, viewY, MOTION.response, dt);
    list.style.transform = `rotateX(${plane.x.toFixed(3)}deg) rotateY(${plane.y.toFixed(3)}deg)`;
    let moving = contact.amount !== (contact.active && !calm ? 1 : 0) || plane.x !== viewX || plane.y !== viewY;
    const cardHeight = cardWidth * 88 / 63;
    const travelX = target.x - position.x, travelY = target.y - position.y;
    for (const tile of tiles) {
      tile.x = wrap(tile.column * stepX + position.x + stepX, columns * stepX) - stepX;
      tile.y = wrap(tile.row * stepY + position.y + stepY, rows * stepY) - stepY;
      const nx = (contact.x - tile.x) / cardWidth * 2 - 1;
      const ny = (contact.y - tile.y) / cardHeight * 2 - 1;
      let rx = 0, ry = 0, z = 0;
      if (!calm) {
        if (contact.touch) {
          const distance = Math.hypot(contact.x - tile.x - cardWidth / 2, contact.y - tile.y - cardHeight / 2);
          const influence = Math.exp(-Math.pow(distance / MOTION.touchRadius, 2)) * contact.amount;
          rx = (clamp(-ny, -1, 1) * 13 + clamp(travelY * .12, -6, 6)) * influence;
          ry = (clamp(nx, -1, 1) * 18 + clamp(-travelX * .12, -6, 6)) * influence;
          z = MOTION.touchDepth * influence;
        } else if (contact.active && Math.abs(nx) <= 1 && Math.abs(ny) <= 1) {
          rx = -ny * 14; ry = nx * 145;
        } else if (focused === tile) ry = 120;
      }
      const pose = tile.pose;
      pose.x = calm ? 0 : approach(pose.x, rx, MOTION.response, dt);
      pose.y = calm ? 0 : approach(pose.y, ry, MOTION.response, dt);
      pose.z = calm ? 0 : approach(pose.z, z, MOTION.response, dt);
      moving ||= pose.x !== rx || pose.y !== ry || pose.z !== z;
      tile.item.style.transform = `translate3d(${tile.x.toFixed(3)}px, ${tile.y.toFixed(3)}px, ${pose.z.toFixed(3)}px)`;
      tile.turn.style.transform = `rotateX(${pose.x.toFixed(3)}deg) rotateY(${pose.y.toFixed(3)}deg)`;
    }
    return moving;
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min((now - (lastTime || now - 1000 / 60)) / 1000, .04);
    lastTime = now;
    if (!drag && !reduced.matches) {
      const decay = Math.exp(-MOTION.friction * dt);
      // Integrating the decay preserves the same glide at 60 and 120 Hz.
      target.x += velocity.x * (1 - decay) / MOTION.friction;
      target.y += velocity.y * (1 - decay) / MOTION.friction;
      velocity.x *= decay; velocity.y *= decay;
      if (Math.abs(velocity.x) < 2) velocity.x = 0;
      if (Math.abs(velocity.y) < 2) velocity.y = 0;
    }
    const rate = drag ? MOTION.follow : MOTION.glide;
    position.x = reduced.matches ? target.x : approach(position.x, target.x, rate, dt);
    position.y = reduced.matches ? target.y : approach(position.y, target.y, rate, dt);
    const posing = draw(dt);
    if (position.x !== target.x || position.y !== target.y || velocity.x || velocity.y || posing) wake();
    else lastTime = 0;
  }

  function move(x, y) {
    target.x += x; target.y += y;
    if (reduced.matches) { Object.assign(position, target); draw(1); }
    else wake();
  }

  function layout() {
    if (!surface.clientWidth || destroyed) return;
    const nextWidth = surface.clientWidth, nextHeight = surface.clientHeight;
    if (width === nextWidth && height === nextHeight) return;
    const focusedId = focused?.element.dataset.card;
    width = nextWidth; height = nextHeight;
    focused = null;
    cardWidth = clamp(width * .17, 124, 232);
    const gap = width < 700 ? 28 : 54;
    stepX = cardWidth + gap; stepY = cardWidth * 88 / 63 + gap;
    columns = Math.ceil(width / stepX) + 2; rows = Math.ceil(height / stepY) + 2;
    list.style.setProperty('--card-width', `${cardWidth}px`);
    list.replaceChildren(); tiles.length = 0;
    const accessible = new Set();
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const card = cards[(row * 3 + column) % cards.length];
        const item = document.createElement('li'); item.className = 'pokemon-item';
        const element = makeCard(card);
        const duplicate = accessible.has(card.id);
        element.tabIndex = duplicate ? -1 : 0;
        if (duplicate) item.setAttribute('aria-hidden', 'true');
        accessible.add(card.id); item.append(element); list.append(item);
        const tile = { item, element, turn: element.querySelector('.pokemon-turn'), column, row, x: 0, y: 0, pose: { x: 0, y: 0, z: 0 } };
        tiles.push(tile);
        element.addEventListener('focus', () => {
          focused = tile;
          if (tile.x < 0 || tile.y < 0 || tile.x + cardWidth > width || tile.y + cardWidth * 88 / 63 > height) {
            move(width / 2 - cardWidth / 2 - tile.x, height / 2 - cardWidth * 44 / 63 - tile.y);
          }
          wake();
        });
        element.addEventListener('blur', () => { if (focused === tile) focused = null; wake(); });
      }
    }
    position.x = target.x = wrap(target.x, columns * stepX);
    position.y = target.y = wrap(target.y, rows * stepY);
    draw(1);
    if (focusedId) tiles.find(tile => tile.element.tabIndex === 0 && tile.element.dataset.card === focusedId)?.element.focus({ preventScroll: true });
    wake();
  }

  function setContact(event, active) {
    const rect = surface.getBoundingClientRect();
    contact.x = event.clientX - rect.left; contact.y = event.clientY - rect.top;
    contact.touch = event.pointerType !== 'mouse'; contact.active = active;
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
    velocity.x = velocity.y = 0; Object.assign(target, position);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now(), vx: 0, vy: 0 };
    setContact(event, true); surface.setPointerCapture(event.pointerId);
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
    event.preventDefault(); velocity.x = velocity.y = 0;
    contact.active = false;
    move(event.key === 'ArrowLeft' ? stepX : event.key === 'ArrowRight' ? -stepX : 0,
      event.key === 'ArrowUp' ? stepY : event.key === 'ArrowDown' ? -stepY : 0);
  }
  function settle() {
    velocity.x = velocity.y = 0; contact.active = false; contact.amount = 0;
    if (drag && surface.hasPointerCapture(drag.id)) surface.releasePointerCapture(drag.id);
    drag = null; surface.classList.remove('is-dragging');
    Object.assign(target, position); cancelAnimationFrame(raf); raf = 0; lastTime = 0;
    for (const tile of tiles) Object.assign(tile.pose, { x: 0, y: 0, z: 0 });
    plane.x = plane.y = 0; draw(0);
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
