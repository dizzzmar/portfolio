// ABOUT · ajusta el nombre al ancho y hace aparecer cada bloque marcado con data-reveal cuando entra en pantalla.
// Los bloques que entran juntos aparecen uno detrás de otro (75ms de diferencia).
// Sin este script (o con "reducir movimiento" activado) todo se ve directamente: ver css/about.css.

(() => {
  // El nombre grande (arriba y en el cierre) ocupa exactamente el ancho de la página
  const fit = () => document.querySelectorAll('.name, .close-name').forEach((el) => {
    el.style.fontSize = '100px';
    const box = getComputedStyle(el.parentElement);
    const room = el.parentElement.clientWidth - parseFloat(box.paddingLeft) - parseFloat(box.paddingRight);
    el.style.fontSize = (100 * room / el.offsetWidth).toFixed(2) + 'px';
  });
  fit();
  document.fonts && document.fonts.ready.then(fit);
  addEventListener('resize', fit);

  const items = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).forEach((e, i) => {
      e.target.style.setProperty('--d', i * 75 + 'ms');
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach((el) => io.observe(el));
})();
