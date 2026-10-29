import { createInfiniteCardGrid } from './infinite-card-grid.js?v=20261029album2';

// A finite DOM pool and CSS perspective keep the Room's WebGL renderer asleep.
export function createPokemonAlbum({ onOpen, onClose }) {
  const dialog = document.getElementById('pokemon-album');
  const surface = dialog.querySelector('.pokemon-surface');
  const list = dialog.querySelector('.pokemon-cards');
  const status = dialog.querySelector('[data-album-status]');
  const retry = dialog.querySelector('[data-album-retry]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let returnFocus = null;
  let request = null, data = null, grid = null, closing = false, closeRequest = 0;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function localImage(path) {
    if (typeof path !== 'string' || !path.trim()) throw new Error('Missing card image');
    const url = new URL(path, location.origin + '/assets/room/cards/');
    if (url.origin !== location.origin) throw new Error('Card images must be local');
    return url.href;
  }

  function image(src) {
    const img = document.createElement('img');
    img.src = src; img.alt = ''; img.width = 630; img.height = 880;
    img.draggable = false; img.decoding = 'async';
    img.addEventListener('error', () => {
      const message = document.createElement('span');
      message.className = 'pokemon-image-error'; message.textContent = 'Image unavailable';
      img.replaceWith(message);
    }, { once: true });
    return img;
  }

  function makeCard(card) {
    const cardElement = document.createElement('div');
    cardElement.className = 'pokemon-card'; cardElement.dataset.card = card.id;
    cardElement.setAttribute('role', 'img');
    cardElement.setAttribute('aria-label', `${card.name}${card.example ? ' (example card)' : ''}`);
    const turn = document.createElement('span'); turn.className = 'pokemon-turn';
    for (const [side, src] of [['front', card.front], ['back', data.back]]) {
      const face = document.createElement('span');
      face.className = `pokemon-face pokemon-${side}`; face.setAttribute('aria-hidden', 'true');
      face.append(image(src)); turn.append(face);
    }
    cardElement.append(turn);
    cardElement.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || motion.matches || event.buttons) return;
      const rect = cardElement.getBoundingClientRect();
      const x = clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1);
      const y = clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1);
      // The hit area stays flat: the outer edges reveal the common reverse without chasing a moving card.
      turn.style.transform = `rotateX(${-y * 14}deg) rotateY(${x * 145}deg)`;
    });
    const reset = () => { turn.style.transform = ''; };
    cardElement.addEventListener('pointerleave', reset);
    cardElement.addEventListener('focus', () => {
      if (!motion.matches) turn.style.transform = 'rotateY(120deg)';
    });
    cardElement.addEventListener('blur', reset);
    return cardElement;
  }

  function mountGrid() {
    grid?.destroy();
    grid = data.cards.length ? createInfiniteCardGrid({ surface, list, cards: data.cards, makeCard, reduced: motion }) : null;
  }

  async function load() {
    request?.abort();
    const controller = new AbortController(); request = controller;
    retry.hidden = true; status.hidden = false; status.textContent = 'Loading cards…';
    try {
      const response = await fetch('/assets/room/cards/cards.json?v=20261029album2', { signal: controller.signal });
      if (!response.ok) throw new Error('Card list unavailable');
      const raw = await response.json();
      if (!Array.isArray(raw.cards)) throw new Error('Invalid card list');
      const ids = new Set();
      const cards = raw.cards.map(card => {
        if (!card.id || !card.name || ids.has(card.id)) throw new Error('Invalid card');
        ids.add(card.id); return { ...card, front: localImage(card.front) };
      });
      const next = { back: cards.length ? localImage(raw.back) : null, cards };
      if (!dialog.open || controller.signal.aborted) return;
      data = next; mountGrid();
      dialog.querySelector('[data-example-label]').hidden = !cards.some(card => card.example);
      status.textContent = cards.length ? '' : 'No cards added yet.'; status.hidden = Boolean(cards.length);
    } catch (error) {
      if (controller.signal.aborted) return;
      status.textContent = 'The cards could not load. Please try again.'; retry.hidden = false;
    } finally { if (request === controller) request = null; }
  }

  function finishClose() {
    closeRequest++; closing = false; request?.abort();
    grid?.destroy(); grid = null;
    document.body.classList.remove('pokemon-open');
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    onClose();
  }
  async function close() {
    if (!dialog.open || closing) return;
    closing = true;
    const token = ++closeRequest;
    if (!motion.matches) await dialog.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-out' }).finished;
    if (token === closeRequest && closing && dialog.open) dialog.close();
  }
  dialog.querySelector('[data-album-close]').addEventListener('click', close);
  retry.addEventListener('click', load);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', finishClose);
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const buttons = [...dialog.querySelectorAll('button:not(:disabled), [tabindex="0"]')].filter(button => button.offsetWidth && !button.closest('[hidden], [inert]'));
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  return {
    get active() { return dialog.open; },
    open(trigger) {
      if (dialog.open || closing) return;
      returnFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
      dialog.showModal(); document.body.classList.add('pokemon-open'); onOpen();
      if (!motion.matches) dialog.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
      if (data) mountGrid(); else load();
    },
  };
}
