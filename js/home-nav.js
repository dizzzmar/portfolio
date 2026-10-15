// HOME · barra de navegación: marca "Work" como activo mientras ves esa sección y oscurece los enlaces cuando pasan sobre una card blanca.
// También deja quietos los vídeos de las cards si el visitante pide menos movimiento.

// Looping project previews stay still for visitors who prefer reduced motion
if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.project-media video').forEach((v) => { v.autoplay = false; v.pause(); });
}

// ---------- Nav: current section and link contrast ----------
(() => {
  // Highlight "Work" while the work section is on screen
  const workLink = document.querySelector('[data-section="work"]');
  new IntersectionObserver(([entry]) => {
    workLink.setAttribute('aria-current', entry.isIntersecting);
  }, { rootMargin: '-50% 0px -50% 0px' }).observe(document.getElementById('work'));

  // The bar has no background, so each link checks what is behind it
  const nav = document.querySelector('.nav');
  const links = [...document.querySelectorAll('.nav-links a')];
  let queued = false;
  function contrast() {
    queued = false;
    for (const link of links) {
      const r = link.getBoundingClientRect();
      const behind = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        .find((el) => !nav.contains(el) && el.id !== 'scene');
      link.classList.toggle('on-light', !!behind && !!behind.closest('.project'));
    }
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(contrast); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  contrast();
})();
