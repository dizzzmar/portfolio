// ABOUT · la barra de arriba descifra la palabra de "Creative ___" (como en la portada y en Work), el nombre del cierre
// ocupa exactamente el ancho de la página y cada bloque aparece una vez al entrar en pantalla.
// Sin este script (o con "reducir movimiento") todo se ve directamente: ver css/about.css.

// ---------- "Creative ___": la palabra se mezcla y se descifra de izquierda a derecha, se queda quieta para leerla ----------
(() => {
  const WORDS = ['Designer', 'Director', 'Coder', 'Enthusiast', 'Thinker', 'Technologist', 'Maximalist', 'Storyteller', 'Retoucher', '3D Artist', 'Mind', 'Nerd'];
  const SCRAMBLE = 480, SPEED = 950, BURST = 6000, HOLD = 3200; // las mismas medidas que en la portada
  const word = document.querySelector('.wb-word');
  if (!word) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NBSP = ' ';
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?';
  let timer = 0, raf = 0, shown = false;

  const split = (text) => {
    word.textContent = '';
    for (const ch of text) {
      const c = document.createElement('span');
      c.className = 'ch';
      c.textContent = ch === ' ' ? NBSP : ch;
      word.append(c);
    }
  };
  function setWord(text, ms = SCRAMBLE) {
    cancelAnimationFrame(raf);
    if (reduced) { split(text); return; }
    const previous = word.textContent.replaceAll(NBSP, ' ');
    if (previous === text) { split(text); return; }
    const start = performance.now();
    const mix = ms * 0.35;
    let revealing = false, last = -Infinity;
    let chars = [...word.children];
    if (!chars.length) { split(previous); chars = [...word.children]; }
    const step = (now) => {
      const elapsed = now - start;
      if (elapsed >= ms) { split(text); return; }
      if (now - last >= 40) {
        last = now;
        if (elapsed >= mix && !revealing) { split(text); chars = [...word.children]; revealing = true; }
        const progress = revealing ? (elapsed - mix) / (ms - mix) : 0;
        const source = revealing ? text : previous;
        chars.forEach((c, i) => {
          const final = source[i] === ' ' ? NBSP : source[i];
          c.textContent = final === NBSP || (revealing && i < Math.floor(progress * chars.length)) ? final : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        });
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  function burst() {
    clearTimeout(timer);
    if (!shown || reduced) { setWord(WORDS[0], 450); return; }
    const end = performance.now() + BURST;
    let i = 1;
    const tick = () => {
      if (performance.now() >= end) { setWord(WORDS[0], 450); timer = setTimeout(burst, HOLD); return; }
      setWord(WORDS[i % WORDS.length]);
      i += 1;
      timer = setTimeout(tick, SPEED);
    };
    tick();
  }
  // Solo corre mientras la barra se ve
  new IntersectionObserver(([e]) => {
    shown = e.isIntersecting && !document.hidden;
    if (shown) burst(); else { clearTimeout(timer); setWord(WORDS[0]); }
  }).observe(word.closest('.about-top'));
})();

// ---------- El nombre del cierre ocupa exactamente el ancho de la página ----------
(() => {
  const fit = () => document.querySelectorAll('.close-name').forEach((el) => {
    el.style.fontSize = '100px';
    const box = getComputedStyle(el.parentElement);
    const room = el.parentElement.clientWidth - parseFloat(box.paddingLeft) - parseFloat(box.paddingRight);
    el.style.fontSize = (100 * room / el.offsetWidth).toFixed(2) + 'px';
  });
  fit();
  document.fonts && document.fonts.ready.then(fit);
  addEventListener('resize', fit);
})();

// ---------- Aparecer: cada bloque entra una sola vez ----------
(() => {
  const items = document.querySelectorAll('.intro, .ab-row, .close');
  if (!('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
  items.forEach((el) => io.observe(el));
})();
