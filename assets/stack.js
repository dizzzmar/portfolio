// Image stack: auto-advances, and can be swiped, dragged, clicked or stepped with the buttons / arrow keys.
(() => {
  const root = document.getElementById('stack');
  const deck = document.getElementById('stack-deck');
  if (!root || !deck) return;
  const cards = [...deck.querySelectorAll('.stack-card')];
  const n = cards.length;
  const ui = root.querySelector('.stack-ui');
  const count = root.querySelector('.stack-count b');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0, timer = null, busy = false, paused = false;

  const mod = (i) => ((i % n) + n) % n;
  function layout() {
    cards.forEach((c, i) => {
      const pos = mod(i - active);
      c.dataset.pos = pos < 3 ? pos : 'hidden';
      c.setAttribute('aria-hidden', pos === 0 ? 'false' : 'true');
    });
    count.textContent = active + 1;
  }

  // dir 1: the front image flies out and goes to the back. dir -1: the previous one comes back to the front.
  function go(dir, side = 1) {
    if (busy) return;
    if (dir > 0) {
      busy = true;
      const front = cards[active];
      front.style.setProperty('--out', side * 110 + '%');
      front.style.setProperty('--rot', side * 8 + 'deg');
      active = mod(active + 1);
      front.classList.add('out');
      layout();                       // the others step forward while the front one leaves
      const done = () => {
        front.classList.add('snap');
        front.classList.remove('out');
        front.dataset.pos = 'hidden';  // slip to the back, unseen
        void front.offsetWidth;
        front.classList.remove('snap');
        layout();
        busy = false;
      };
      reduced.matches ? done() : setTimeout(done, 460);
    } else {
      active = mod(active - 1);
      layout();
    }
    restart();
  }

  function restart() {
    clearInterval(timer);
    if (reduced.matches || paused) return;
    timer = setInterval(() => go(1), 4500);
  }

  // Drag / swipe
  let sx = 0, dx = 0, drag = null;
  deck.addEventListener('pointerdown', (e) => {
    if (busy || e.button > 0) return;
    drag = cards[active]; sx = e.clientX; dx = 0;
    deck.setPointerCapture(e.pointerId);
    paused = true; clearInterval(timer);
  });
  deck.addEventListener('pointermove', (e) => {
    if (!drag) return;
    dx = e.clientX - sx;
    if (Math.abs(dx) > 4) { deck.classList.add('dragging'); drag.classList.add('drag'); }
    drag.style.transform = `translateX(${dx}px) rotate(${dx / 40}deg)`;
  });
  function release() {
    if (!drag) return;
    const c = drag; drag = null;
    deck.classList.remove('dragging');
    c.classList.remove('drag');
    c.style.transform = '';
    paused = false;
    if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1, dx < 0 ? -1 : 1);
    else if (Math.abs(dx) < 5) go(1);   // a plain click steps forward
    else restart();
  }
  deck.addEventListener('pointerup', release);
  deck.addEventListener('pointercancel', () => { dx = 0; release(); });

  ui.addEventListener('click', (e) => {
    const b = e.target.closest('[data-dir]');
    if (b) go(+b.dataset.dir);
  });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
  });
  root.addEventListener('mouseenter', () => { paused = true; clearInterval(timer); });
  root.addEventListener('mouseleave', () => { paused = false; restart(); });
  root.addEventListener('focusin', () => { paused = true; clearInterval(timer); });
  root.addEventListener('focusout', () => { paused = false; restart(); });
  document.addEventListener('visibilitychange', () => document.hidden ? clearInterval(timer) : restart());
  reduced.addEventListener('change', restart);

  ui.hidden = false;
  root.classList.add('is-live');
  layout();
  restart();
})();
