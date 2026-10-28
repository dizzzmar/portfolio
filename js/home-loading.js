// Only the animation: a pre-rendered loop of the tomato on the grass, on green. It stays independent of WebGL and adds only 155 KB to loading.
(() => {
  const root = document.documentElement;
  if (location.hash || root.classList.contains('land-fly')) return;
  root.classList.add('home-loading');
  let finished = false;
  let observer;
  let fallback;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let entrance = Promise.resolve();
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
    // The green surface lifts like a curtain, uncovering the landing from the bottom up.
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
      if (finished) return;
      const picture = image.parentElement;
      if (reduced.matches || !picture.animate) {
        picture.style.opacity = '1';
        return;
      }
      entrance = picture.animate([
        { opacity: 0, transform: 'translateY(14px) scale(0.96)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
      ], { duration: 460, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }).finished.catch(() => {});
    }).catch(finish);
    const sky = new Image();
    sky.src = '/assets/images/sky.webp';
    const assets = Promise.allSettled([document.fonts.ready, sky.decode()]);
    const model = new Promise(resolve => {
      if (root.classList.contains('tomato-ready')) return resolve();
      observer = new MutationObserver(() => {
        if (root.classList.contains('tomato-ready')) resolve();
      });
      observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    });
    await Promise.all([assets, model, imageReady]);
    // Give the landing canvas a frame to paint before revealing it.
    requestAnimationFrame(() => requestAnimationFrame(finish));
  }, { once: true });
})();
