// A pre-rendered loop stays independent of WebGL and adds only 55 KB to loading.
(() => {
  const root = document.documentElement;
  if (location.hash || root.classList.contains('land-fly')) return;
  root.classList.add('home-loading');
  let finished = false;
  let observer;
  let fallback;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let entrance = Promise.resolve();
  // Real progress: four things must be ready (illustration, fonts, sky, 3D tomato); each adds a quarter to the counter.
  let done = 0, shown = 0, counting = 0;
  const paintPct = () => { // the script runs in <head>: look elements up when painting
    const el = document.querySelector('.hl-pct');
    if (el) el.textContent = Math.round(shown);
    const rows = document.querySelectorAll('.hl-steps li');
    const on = Math.min(rows.length - 1, Math.floor(shown / 100 * rows.length));
    rows.forEach((row, i) => row.classList.toggle('is-on', i === on));
  };
  function tickPct() {
    const goal = finished ? 100 : done * 25;
    shown += (goal - shown) * (reduced.matches ? 1 : 0.12);
    if (Math.abs(goal - shown) < 0.5) shown = goal;
    paintPct();
    counting = shown < goal ? requestAnimationFrame(tickPct) : 0;
  }
  // Typed note: letters appear one by one, the newest few as random glyphs that settle (like the reference loader)
  const NOTE = '// Hang tight. The tomato is ripening.';
  function typeNote(instant) {
    const out = document.querySelector('.hl-type');
    if (!out) return;
    if (instant) { out.textContent = NOTE; return; }
    const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?';
    const t0 = performance.now(), PER = 55;
    const frame = (now) => {
      const n = Math.min(NOTE.length, Math.floor((now - t0) / PER));
      let text = NOTE.slice(0, Math.max(0, n - 3));
      for (let i = Math.max(0, n - 3); i < n; i++) text += NOTE[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      out.textContent = text;
      if (n < NOTE.length) requestAnimationFrame(frame); else out.textContent = NOTE;
    };
    requestAnimationFrame(frame);
  }
  const step = () => { done++; if (!counting) counting = requestAnimationFrame(tickPct); };
  function remove() {
    root.classList.remove('home-loading', 'is-revealing');
    document.querySelector('.home-loader')?.remove();
  }
  async function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(fallback);
    observer?.disconnect();
    if (!reduced.matches) await entrance;
    root.classList.add('is-revealing');
    const loader = document.querySelector('.home-loader');
    if (!loader || reduced.matches || !loader.animate) return remove();
    const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
    loader.querySelector('picture').animate([
      { opacity: 1, transform: 'translateY(0) scale(1)' },
      { opacity: 1, transform: 'translateY(-10vh) scale(1.06)', offset: 0.5 },
      { opacity: 0, transform: 'translateY(-34vh) scale(1.06)' },
    ], { duration: 700, delay: 140, easing: ease, fill: 'forwards' });
    loader.querySelector('.hl-ui').animate([{ opacity: 1 }, { opacity: 0 }],
      { duration: 180, fill: 'forwards' });
    // The white surface lifts like a curtain, uncovering the landing from the bottom up.
    shown = 100; paintPct();
    const exit = loader.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }],
      { duration: 700, delay: 140, easing: 'cubic-bezier(0.77, 0, 0.175, 1)', fill: 'forwards' });
    await exit.finished.catch(() => {});
    remove();
  }
  // Network or WebGL failures must never trap visitors behind the loader.
  fallback = setTimeout(finish, 6000);
  addEventListener('pageshow', event => { if (event.persisted) finish(); });
  document.addEventListener('DOMContentLoaded', async () => {
    if (finished) return;
    const image = document.querySelector('.home-loader img');
    image?.addEventListener('error', finish, { once: true });
    if (image?.complete && !image.naturalWidth) return finish();
    const imageReady = image.decode().then(() => {
      step();
      if (finished) return;
      const picture = image.parentElement;
      const label = document.querySelector('.hl-ui');
      if (reduced.matches || !picture.animate) {
        picture.style.opacity = label.style.opacity = '1';
        typeNote(true);
        return;
      }
      typeNote(false);
      entrance = picture.animate([
        { opacity: 0, transform: 'translateY(14px) scale(0.96)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
      ], { duration: 460, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }).finished.catch(() => {});
      label.animate([{ opacity: 0 }, { opacity: 1 }],
        { duration: 300, delay: 100, fill: 'forwards', easing: 'ease-out' });
    }).catch(finish);
    const sky = new Image();
    sky.src = '/assets/images/sky.webp';
    const assets = Promise.allSettled([document.fonts.ready.then(step), sky.decode().then(step)]);
    const model = new Promise(resolve => {
      if (root.classList.contains('tomato-ready')) { step(); return resolve(); }
      observer = new MutationObserver(() => {
        if (root.classList.contains('tomato-ready')) { step(); resolve(); }
      });
      observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    });
    await Promise.all([assets, model, imageReady]);
    // Give the landing canvas a frame to paint before revealing it.
    requestAnimationFrame(() => requestAnimationFrame(finish));
  }, { once: true });
})();
