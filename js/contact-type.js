// CONTACT · texto que se «escribe» solo: las letras aparecen de izquierda a derecha y, justo delante, unas pocas se mezclan antes de fijarse
// (la misma idea del «Creative ___» de la portada). Es un script aparte y sin librerías: si algo falla, el texto simplemente se ve entero.
// Uso: window.ctType(elemento, 'texto nuevo', { delay: 200 }) → devuelve cuánto dura (ms).
(() => {
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const AHEAD = 5;                 // letras mezcladas por delante de la última fijada
  const running = new WeakMap();   // elemento → su animación en curso (para cancelarla si llega otro texto)

  function ctType(el, text, { delay = 0, ms } = {}) {
    cancelAnimationFrame(running.get(el));
    if (reduced || !text) { el.textContent = text; return 0; }
    const total = ms || Math.min(1100, 300 + text.length * 26);

    // Se construye el texto letra a letra (palabras que no se parten) y se fija el ancho de cada letra, para que la frase no cambie de forma al mezclarse
    el.textContent = '';
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    el.append(sr);
    const chars = [];
    text.split(' ').forEach((word, wi, words) => {
      const w = document.createElement('span');
      w.className = 'ct-w';
      w.setAttribute('aria-hidden', 'true');
      for (const ch of word) {
        const c = document.createElement('span');
        c.className = 'ct-c';
        c.textContent = ch;
        w.append(c);
        chars.push({ node: c, ch });
      }
      el.append(w);
      if (wi < words.length - 1) el.append(' ');
    });
    const widths = chars.map(({ node }) => node.getBoundingClientRect().width);
    chars.forEach(({ node }, i) => { node.style.width = widths[i] + 'px'; node.style.visibility = 'hidden'; });

    const start = performance.now() + delay;
    let last = -Infinity;
    const step = (now) => {
      if (now - start >= total) { el.textContent = text; return; }
      if (now - last >= 40) {
        last = now;
        const n = Math.max(0, Math.floor(((now - start) / total) * (chars.length + AHEAD)));
        chars.forEach(({ node, ch }, i) => {
          if (i < n - AHEAD) { node.textContent = ch; node.style.visibility = ''; }
          else if (i < n) { node.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0]; node.style.visibility = ''; }
          else node.style.visibility = 'hidden';
        });
      }
      running.set(el, requestAnimationFrame(step));
    };
    running.set(el, requestAnimationFrame(step));
    return delay + total;
  }
  window.ctType = ctType;

  // Al entrar en la página, el título y luego la frase de debajo se escriben
  const h1 = document.getElementById('ct-title'), lead = document.getElementById('ct-lead');
  if (h1 && lead) {
    const end = ctType(h1, h1.textContent, { delay: 150 });
    ctType(lead, lead.textContent, { delay: Math.max(0, end - 350) });
  }
})();
