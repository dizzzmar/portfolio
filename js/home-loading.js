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
  const paintPct = () => { const el = document.querySelector('.hl-pct'); if (el) el.textContent = Math.round(shown); }; // the script runs in <head>: look it up when painting
  function tickPct() {
    const goal = finished ? 100 : done * 25;
    shown += (goal - shown) * (reduced.matches ? 1 : 0.12);
    if (Math.abs(goal - shown) < 0.5) shown = goal;
    paintPct();
    counting = shown < goal ? requestAnimationFrame(tickPct) : 0;
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
    loader.querySelector('p').animate([{ opacity: 1 }, { opacity: 0 }],
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
      const label = document.querySelector('.home-loader p');
      if (reduced.matches || !picture.animate) {
        picture.style.opacity = label.style.opacity = '1';
        return;
      }
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
