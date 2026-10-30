// 404 · animación de entrada: el tomate llega volando desde donde estaba en la página anterior.

// Entrance: runs before the first paint so nothing flashes in its final place.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const slot = document.getElementById('zero');
  let from = null;
  try {
    from = JSON.parse(sessionStorage.getItem('tomato-from'));
    sessionStorage.removeItem('tomato-from');
  } catch (e) {}
  if (from && Date.now() - from.t < 5000) {
    // Start exactly where (and as big as) the tomato was on the page we came from
    const r = slot.getBoundingClientRect();
    slot.style.setProperty('--from-x', from.x - (r.left + r.width / 2) + 'px');
    slot.style.setProperty('--from-y', from.y - (r.top + r.height / 2) + 'px');
    slot.style.setProperty('--from-s', from.size / r.height);
    slot.style.setProperty('--from-o', 1);
  }
  document.documentElement.classList.add('play');
})();
