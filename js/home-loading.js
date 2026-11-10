// Only the animation: a pre-rendered loop of the tomato on the grass, on pink. It stays independent of WebGL and adds only 155 KB to loading.
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
    // The pink surface lifts like a curtain, uncovering the landing from the bottom up.
    const exit = loader.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }],
      { duration: 700, delay: 140, easing: 'cubic-bezier(0.77, 0, 0.175, 1)', fill: 'forwards' });
    await exit.finished.catch(() => {});
    remove();
  }
  // El primer scroll hacía que el cielo desapareciera un fotograma (se veía el color liso de fondo): el navegador tenía que preparar la foto al tamaño ampliado en
  // pleno movimiento. Aquí, con el cargador tapándolo todo, se amplía el cielo al máximo (y se enseña la capa desenfocada) unos fotogramas y se devuelve a su sitio.
  function warmSky() {
    const sky = document.querySelector('.sky'), soft = document.querySelector('.sky-soft');
    if (!sky || !soft) return Promise.resolve();
    const before = [sky.style.scale, soft.style.opacity];
    sky.style.scale = '2.8';
    soft.style.opacity = '1';
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => {
      sky.style.scale = before[0];
      soft.style.opacity = before[1];
      resolve();
    }))));
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
    const skySoft = new Image();   // el cielo ya desenfocado (css/home.css): se descodifica también antes de enseñar la portada
    skySoft.src = '/assets/images/sky-soft.webp';
    const assets = Promise.allSettled([document.fonts.ready, sky.decode(), skySoft.decode()]);
    const model = new Promise(resolve => {
      if (root.classList.contains('tomato-ready')) return resolve();
      observer = new MutationObserver(() => {
        if (root.classList.contains('tomato-ready')) resolve();
      });
      observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    });
    await Promise.all([assets, model, imageReady]);
    await warmSky();
    // Give the landing canvas a frame to paint before revealing it.
    requestAnimationFrame(() => requestAnimationFrame(finish));
  }, { once: true });
})();
