// HOME · barra de navegación: marca "Work" como activo mientras ves esa sección y oscurece los enlaces cuando pasan sobre una card blanca o la tira de capacidades.
// También pausa los vídeos de las cards cuando no se ven (o siempre, si el visitante pide menos movimiento).

// Looping project previews stay still for visitors who prefer reduced motion,
// and only play while on screen (off screen they would keep decoding for nothing)
if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.project-media video').forEach((v) => { v.autoplay = false; v.pause(); });
} else {
  const videos = new IntersectionObserver((entries) => {
    for (const e of entries) e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause();
  });
  document.querySelectorAll('.project-media video').forEach((v) => videos.observe(v));
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
      link.classList.toggle('on-light', !!behind && !!behind.closest('.project, .ticker'));
    }
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(contrast); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  contrast();
})();

// ---------- Smooth scrolling, but only after the page has loaded ----------
// Arriving at /#card (back from a project) jumps straight to the card, so the page
// transition lands on it. Clicks inside the page (Work, the tomato) still glide.
addEventListener('load', () => requestAnimationFrame(() => document.documentElement.classList.add('smooth-scroll')));
