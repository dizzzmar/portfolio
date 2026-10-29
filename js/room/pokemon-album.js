import { createInfiniteCardGrid } from './infinite-card-grid.js?v=20261030collage1';

// A finite DOM pool keeps the Room's WebGL renderer asleep. Cards are a scan plus a caption; clicking one opens nothing.
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'; // var(--ease-out), the site's curve for arrivals and exits

export function createPokemonAlbum({ onOpen, onClose }) {
  const dialog = document.getElementById('pokemon-album');
  const surface = dialog.querySelector('.pokemon-surface');
  const list = dialog.querySelector('.pokemon-cards');
  const status = dialog.querySelector('[data-album-status]');
  const retry = dialog.querySelector('[data-album-retry]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let returnFocus = null;
  let request = null, data = null, grid = null, closing = false, closeRequest = 0;

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
    const figure = document.createElement('figure');
    figure.className = 'pokemon-card'; figure.dataset.card = card.id;
    const turn = document.createElement('span'); turn.className = 'pokemon-turn';
    const img = image(card.front); img.alt = `${card.name}${card.example ? ' (example card)' : ''}`;
    turn.append(img);
    const caption = document.createElement('figcaption'); caption.className = 'pokemon-cap';
    const name = document.createElement('span'); name.textContent = card.name; caption.append(name);
    if (card.set) { const set = document.createElement('span'); set.textContent = card.set; caption.append(set); }
    figure.append(turn, caption);
    return figure;
  }

  function mountGrid() {
    grid?.destroy();
    grid = data.cards.length ? createInfiniteCardGrid({ surface, list, cards: data.cards, makeCard, reduced: motion, entrance: !motion.matches }) : null;
  }

  async function load() {
    request?.abort();
    const controller = new AbortController(); request = controller;
    retry.hidden = true; status.hidden = false; status.textContent = 'Loading cards…';
    try {
      const response = await fetch('/assets/room/cards/cards.json?v=20261030cards1', { signal: controller.signal });
      if (!response.ok) throw new Error('Card list unavailable');
      const raw = await response.json();
      if (!Array.isArray(raw.cards)) throw new Error('Invalid card list');
      const ids = new Set();
      const cards = raw.cards.map(card => {
        if (!card.id || !card.name || ids.has(card.id)) throw new Error('Invalid card');
        ids.add(card.id); return { ...card, front: localImage(card.front) };
      });
      const next = { cards };
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
    if (!motion.matches) await dialog.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: EASE_OUT }).finished;
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
      dialog.showModal(); dialog.focus({ preventScroll: true }); document.body.classList.add('pokemon-open'); onOpen();
      if (!motion.matches) dialog.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: EASE_OUT });
      if (data) mountGrid(); else load();
    },
  };
}
