// A fixed pool wraps around the viewport. Distance travelled never adds DOM nodes.
export function createInfiniteCardGrid({ surface, list, cards, makeCard, reduced }) {
  const tiles = [];
  const position = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  let columns = 0, rows = 0, stepX = 0, stepY = 0, layoutWidth = 0, layoutHeight = 0;
  let raf = 0, lastTime = 0, drag = null;
  const wrap = (value, length) => ((value % length) + length) % length;

  function draw() {
    for (const tile of tiles) {
      tile.x = wrap(tile.column * stepX + position.x + stepX, columns * stepX) - stepX;
      tile.y = wrap(tile.row * stepY + position.y + stepY, rows * stepY) - stepY;
      tile.item.style.transform = `translate3d(${tile.x}px, ${tile.y}px, 0)`;
    }
  }

  function frame(now) {
    const dt = Math.min((now - (lastTime || now)) / 1000, .05);
    lastTime = now;
    const ease = reduced.matches ? 1 : 1 - Math.exp(-12 * dt);
    position.x += (target.x - position.x) * ease;
    position.y += (target.y - position.y) * ease;
    const settled = Math.abs(target.x - position.x) + Math.abs(target.y - position.y) < .2;
    if (settled) Object.assign(position, target);
    draw();
    raf = settled ? 0 : requestAnimationFrame(frame);
    if (settled) lastTime = 0;
  }

  function move(x, y) {
    target.x += x;
    target.y += y;
    if (reduced.matches || drag) { Object.assign(position, target); draw(); }
    else if (!raf) raf = requestAnimationFrame(frame);
  }

  function layout() {
    if (!surface.clientWidth) return;
    const width = surface.clientWidth, height = surface.clientHeight;
    if (width === layoutWidth && height === layoutHeight) return;
    layoutWidth = width; layoutHeight = height;
    cancelAnimationFrame(raf); raf = 0; lastTime = 0;
    const cardWidth = Math.max(124, Math.min(232, width * .17));
    const gap = width < 700 ? 28 : 54;
    stepX = cardWidth + gap;
    stepY = cardWidth * 88 / 63 + gap;
    columns = Math.ceil(width / stepX) + 2;
    rows = Math.ceil(height / stepY) + 2;
    list.style.setProperty('--card-width', `${cardWidth}px`);
    list.replaceChildren(); tiles.length = 0;
    const accessible = new Set();
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const card = cards[(row * 3 + column) % cards.length];
        const item = document.createElement('li');
        item.className = 'pokemon-item';
        const element = makeCard(card);
        const duplicate = accessible.has(card.id);
        element.tabIndex = duplicate ? -1 : 0;
        if (duplicate) item.setAttribute('aria-hidden', 'true');
        accessible.add(card.id);
        item.append(element); list.append(item);
        const tile = { item, element, card, column, row, x: 0, y: 0 };
        tiles.push(tile);
        element.addEventListener('focus', () => {
          // Keyboard access brings a repeated card into view without adding another focus stop.
          if (tile.x < 0 || tile.y < 0 || tile.x + cardWidth > width || tile.y + cardWidth * 88 / 63 > height) {
            move(width / 2 - cardWidth / 2 - tile.x, height / 2 - cardWidth * 44 / 63 - tile.y);
          }
        });
      }
    }
    // Keep the numeric coordinates bounded after long sessions and viewport changes.
    position.x = target.x = wrap(target.x, columns * stepX);
    position.y = target.y = wrap(target.y, rows * stepY);
    draw();
  }

  function wheel(event) {
    if (event.ctrlKey) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? surface.clientHeight : 1;
    move(-(event.shiftKey ? event.deltaY : event.deltaX) * unit, -(event.shiftKey ? 0 : event.deltaY) * unit);
  }
  function down(event) {
    if ((event.pointerType === 'mouse' && event.button !== 0) || drag) return;
    // Keep dragging from selecting text or focusing a repeated card.
    event.preventDefault();
    cancelAnimationFrame(raf); raf = 0;
    Object.assign(target, position);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, distance: 0, time: performance.now(), vx: 0, vy: 0 };
    surface.setPointerCapture(event.pointerId);
    surface.classList.add('is-dragging');
  }
  function pointerMove(event) {
    if (!drag || drag.id !== event.pointerId) return;
    const x = event.clientX - drag.x, y = event.clientY - drag.y;
    const elapsed = Math.max(8, performance.now() - drag.time);
    drag.vx = x / elapsed; drag.vy = y / elapsed;
    drag.distance += Math.hypot(x, y);
    move(x, y);
    drag.x = event.clientX; drag.y = event.clientY; drag.time = performance.now();
  }
  function up(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const released = drag; drag = null;
    surface.classList.remove('is-dragging');
    if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
    if (event.type === 'pointercancel') return;
    if (released.distance > 6 && !reduced.matches && performance.now() - released.time < 80) {
      move(Math.max(-220, Math.min(220, released.vx * 110)), Math.max(-220, Math.min(220, released.vy * 110)));
    }
  }
  function keydown(event) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    move(event.key === 'ArrowLeft' ? stepX : event.key === 'ArrowRight' ? -stepX : 0,
      event.key === 'ArrowUp' ? stepY : event.key === 'ArrowDown' ? -stepY : 0);
  }
  surface.addEventListener('wheel', wheel, { passive: false });
  surface.addEventListener('pointerdown', down);
  surface.addEventListener('pointermove', pointerMove);
  surface.addEventListener('pointerup', up);
  surface.addEventListener('pointercancel', up);
  function lostCapture(event) { if (drag?.id === event.pointerId) up(event); }
  surface.addEventListener('lostpointercapture', lostCapture);
  surface.addEventListener('keydown', keydown);
  const observer = new ResizeObserver(layout); observer.observe(surface);
  layout();
  return {
    destroy() {
      observer.disconnect(); cancelAnimationFrame(raf);
      if (drag && surface.hasPointerCapture(drag.id)) surface.releasePointerCapture(drag.id);
      drag = null;
      surface.removeEventListener('wheel', wheel); surface.removeEventListener('pointerdown', down);
      surface.removeEventListener('pointermove', pointerMove); surface.removeEventListener('pointerup', up);
      surface.removeEventListener('pointercancel', up); surface.removeEventListener('keydown', keydown);
      surface.removeEventListener('lostpointercapture', lostCapture);
    },
  };
}
