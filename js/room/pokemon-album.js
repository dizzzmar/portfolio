// DOM cards keep the album independent of the Room's WebGL renderer.
export function createPokemonAlbum({ onOpen, onClose }) {
  const dialog = document.getElementById('pokemon-album');
  const grid = dialog.querySelector('.pokemon-cards');
  const status = dialog.querySelector('[data-album-status]');
  const retry = dialog.querySelector('[data-album-retry]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let returnFocus = null;
  let request = null;
  let populated = false;
  let closing = false;

  function localImage(path) {
    if (typeof path !== 'string' || !path.trim()) throw new Error('Missing card image');
    const url = new URL(path, location.origin + '/assets/room/cards/');
    if (url.origin !== location.origin) throw new Error('Card images must be local');
    return url.href;
  }

  function makeCard(card, back, index) {
    const item = document.createElement('li');
    item.className = 'pokemon-item';
    item.style.setProperty('--rest', `${[-5, 4, -3, 5, -4, 3][index % 6]}deg`);
    item.style.setProperty('--delay', `${index % 6 * 0.06}s`);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pokemon-card';
    button.dataset.card = card.id;
    button.setAttribute('aria-label', `Turn over ${card.name}${card.placeholder ? ' (placeholder)' : ''}`);
    button.setAttribute('aria-pressed', 'false');
    const tilt = document.createElement('span');
    tilt.className = 'pokemon-tilt';
    const turn = document.createElement('span');
    turn.className = 'pokemon-turn';
    for (const [side, src] of [['front', card.front], ['back', back]]) {
      const face = document.createElement('span');
      face.className = `pokemon-face pokemon-${side}`;
      face.setAttribute('aria-hidden', 'true');
      const image = document.createElement('img');
      image.src = src;
      image.alt = '';
      image.width = 630;
      image.height = 880;
      image.loading = index < 3 ? 'eager' : 'lazy';
      image.draggable = false;
      image.addEventListener('error', () => {
        face.replaceChildren();
        face.textContent = `${side === 'front' ? card.name : 'Reverse'} — image unavailable`;
      }, { once: true });
      face.append(image);
      if (side === 'front' && card.placeholder) {
        const label = document.createElement('span');
        label.className = 'pokemon-placeholder';
        label.textContent = `${card.name} · Placeholder`;
        face.append(label);
      }
      turn.append(face);
    }
    tilt.append(turn);
    button.append(tilt);
    button.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || motion.matches) return;
      const rect = button.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
      tilt.style.transform = `rotateX(${-y * 10}deg) rotateY(${x * 14}deg)`;
    });
    const reset = () => { tilt.style.transform = ''; };
    button.addEventListener('pointerleave', reset);
    button.addEventListener('blur', reset);
    button.addEventListener('click', () => {
      const flipped = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(flipped));
    });
    item.append(button);
    return item;
  }

  async function load() {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    retry.hidden = true;
    status.hidden = false;
    status.textContent = 'Loading cards…';
    try {
      const response = await fetch('/assets/room/cards/cards.json?v=20261029album1', { signal: controller.signal });
      if (!response.ok) throw new Error('Card list unavailable');
      const data = await response.json();
      if (!Array.isArray(data.cards)) throw new Error('Invalid card list');
      const ids = new Set();
      const back = data.cards.length ? localImage(data.back) : null;
      const cards = data.cards.map(card => {
        if (!card.id || !card.name || ids.has(card.id)) throw new Error('Invalid card');
        ids.add(card.id);
        return { ...card, front: localImage(card.front) };
      });
      if (!dialog.open || controller.signal.aborted) return;
      grid.replaceChildren(...cards.map((card, index) => makeCard(card, back, index)));
      populated = true;
      status.textContent = cards.length ? '' : 'No cards added yet.';
      status.hidden = Boolean(cards.length);
    } catch (error) {
      if (controller.signal.aborted) return;
      status.textContent = 'The cards could not load. Please try again.';
      retry.hidden = false;
    } finally {
      if (request === controller) request = null;
    }
  }

  function finishClose() {
    closing = false;
    request?.abort();
    document.body.classList.remove('pokemon-open');
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    onClose();
  }

  async function close() {
    if (!dialog.open || closing) return;
    closing = true;
    if (!motion.matches) {
      await dialog.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-out' }).finished;
    }
    dialog.close();
  }

  dialog.querySelector('[data-album-close]').addEventListener('click', close);
  retry.addEventListener('click', load);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', finishClose);
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const buttons = [...dialog.querySelectorAll('button:not(:disabled)')].filter(button => button.offsetWidth > 0);
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  return {
    get active() { return dialog.open; },
    open(trigger) {
      if (dialog.open || closing) return;
      returnFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
      dialog.showModal();
      dialog.scrollTop = 0;
      document.body.classList.add('pokemon-open');
      onOpen();
      if (!motion.matches) dialog.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 320, easing: 'cubic-bezier(.23,1,.32,1)' });
      if (!populated) load();
    },
  };
}
