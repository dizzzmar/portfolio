// A pre-rendered loop stays independent of WebGL and adds only 55 KB to loading.
(() => {
  const root = document.documentElement;
  if (location.hash || root.classList.contains('land-fly')) return;
  root.classList.add('home-loading');
  let finished = false;
  let observer;
  let fallback;
  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(fallback);
    observer?.disconnect();
    root.classList.add('is-revealing');
    setTimeout(() => {
      root.classList.remove('home-loading', 'is-revealing');
      document.querySelector('.home-loader')?.remove();
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 280);
  }
  // Network or WebGL failures must never trap visitors behind the loader.
  fallback = setTimeout(finish, 12000);
  addEventListener('pageshow', event => { if (event.persisted) finish(); });
  document.addEventListener('DOMContentLoaded', async () => {
    if (finished) return;
    const image = document.querySelector('.home-loader img');
    image?.addEventListener('error', finish, { once: true });
    if (image?.complete && !image.naturalWidth) return finish();
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
    await Promise.all([assets, model]);
    // Give the landing canvas a frame to paint before revealing it.
    requestAnimationFrame(() => requestAnimationFrame(finish));
  }, { once: true });
})();
