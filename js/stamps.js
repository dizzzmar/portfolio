// STAMPS · el álbum de sellos (stamps/index.html):
//  · al pulsar un sello, se ve en grande en una ventana;
//  · "Send your stamp" abre el formulario de Tally. El formulario solo se carga al pulsar el botón: quien solo mira el
//    álbum no se conecta a Tally. Mientras no haya formulario, la ventana dice "coming soon".

// EDITA: el código del formulario de Tally, lo que va después de tally.so/r/ (por ejemplo 'abc123'). Vacío = todavía no hay.
const TALLY_FORM_ID = '';

(() => {
  const stamps = [...document.querySelectorAll('.album .stamp')];
  stamps.forEach((stamp, i) => stamp.style.setProperty('--i', i)); // para que aparezcan uno tras otro

  // Cerrar las ventanas: botón Close, tecla Esc (la pone el navegador) o pulsar fuera
  document.querySelectorAll('.st-dialog').forEach((dialog) => {
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
    });
  });

  // Un sello en grande
  const viewer = document.getElementById('st-viewer');
  const slot = viewer.querySelector('.st-viewer-slot');
  stamps.forEach((stamp) => stamp.addEventListener('click', () => {
    const big = stamp.cloneNode(true);
    big.tabIndex = -1;
    big.removeAttribute('type');
    big.style.removeProperty('--i');
    slot.replaceChildren(big);
    viewer.setAttribute('aria-label', 'Stamp by ' + stamp.querySelector('.stamp-name').textContent);
    viewer.showModal();
  }));

  // El formulario de Tally (se crea la primera vez que se pulsa el botón)
  const form = document.getElementById('st-form');
  document.getElementById('st-send').addEventListener('click', () => {
    const box = form.querySelector('.st-form-slot');
    if (TALLY_FORM_ID && !box.querySelector('iframe')) {
      const frame = document.createElement('iframe');
      frame.title = 'Send your stamp';
      frame.src = 'https://tally.so/embed/' + encodeURIComponent(TALLY_FORM_ID) + '?hideTitle=1&transparentBackground=1&alignLeft=1';
      box.replaceChildren(frame);
    }
    form.showModal();
  });
})();
