// STUDIES · el índice de la izquierda (project/enmad): marca la parte que se está viendo (aria-current) y, al pulsar, baja hasta ella.
// Sin este script el índice sigue funcionando como enlaces normales a cada parte.
(() => {
  const links = [...document.querySelectorAll('.st-index a[href^="#"]')];
  const parts = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if (!parts.length || !('IntersectionObserver' in window)) return;
  const mark = (id) => links.forEach((a) => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + id));
  // La parte «actual» es la que cruza una línea a un tercio de la pantalla
  const io = new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).forEach((e) => mark(e.target.id));
  }, { rootMargin: '-33% 0px -66% 0px' });
  parts.forEach((p) => io.observe(p));
  mark(parts[0].id);
})();
