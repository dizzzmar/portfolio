// FOOTER GRANDE · «DIZMAR» enorme de borde a borde cuyas piezas llegan desordenadas y se colocan según se baja (referencia: wearepanico.com, que lo hace con GSAP;
// aquí, sin librerías). Atado al scroll: con el bloque entrando en pantalla el avance va de 0 a 1 y cada pieza pasa de su desvío (x, y, giro) a su sitio.
// Solo transform, un cuadro por scroll. Al llegar al final de la página, «Go up» da un pulso. Con «reducir movimiento» no se mueve nada.
(() => {
  const foot = document.querySelector('.big-foot');
  if (!foot) return;
  const word = foot.querySelector('.bf-word');
  const up = foot.querySelector('.bf-up');

  // ---- La palabra ocupa justo todo el ancho: se mide a 100 px y se escala ----
  const fit = () => {
    const room = foot.clientWidth - parseFloat(getComputedStyle(foot).paddingLeft) - parseFloat(getComputedStyle(foot).paddingRight);
    foot.style.setProperty('--bf-size', '100px');
    word.style.justifyContent = 'flex-start';
    const natural = [...word.children].reduce((sum, s) => sum + s.getBoundingClientRect().width, 0);
    word.style.justifyContent = '';
    if (natural > 0) foot.style.setProperty('--bf-size', (100 * room / natural).toFixed(2) + 'px');
  };
  fit();
  if (document.fonts?.ready) document.fonts.ready.then(fit);
  addEventListener('resize', fit);

  // ---- «Go up» da un pulso al llegar al final de la página ----
  if (up) {
    let atBottom = false, timer = 0;
    const check = () => {
      const bottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
      if (bottom && !atBottom) { atBottom = true; up.classList.add('is-active'); clearTimeout(timer); timer = setTimeout(() => up.classList.remove('is-active'), 900); }
      else if (!bottom) atBottom = false;
    };
    addEventListener('scroll', check, { passive: true }); check();
  }

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ---- Desvíos fijos por pieza (en % de su tamaño y grados): siempre llegan igual de desordenadas ----
  const pieces = [
    ...foot.querySelectorAll('.bf-links li'), ...word.children, ...foot.querySelectorAll('.bf-up'), ...foot.querySelectorAll('.bf-legal'),
  ];
  const SCATTER = [[-40, 60, -35], [55, -45, 30], [-60, 40, 45], [35, 70, -25], [-30, -55, 40], [60, 50, -45], [-45, 65, 30], [40, -60, -40]];
  const spread = matchMedia('(max-width: 700px)').matches ? .55 : 1;
  const own = pieces.map((el, i) => {
    const [x, y, r] = SCATTER[i % SCATTER.length];
    const big = word.contains(el) ? 1.5 : 1;                 // las letras viajan más lejos
    return { el, x: x * big * spread, y: y * big * spread, r: r * spread };
  });

  let queued = false;
  const update = () => {
    queued = false;
    const rect = foot.getBoundingClientRect();
    if (rect.bottom < -50 || rect.top > innerHeight + 50) return;
    const t = Math.min(1, Math.max(0, (innerHeight - rect.top) / Math.min(rect.height, innerHeight)));
    const k = 1 - Math.pow(1 - t, 2);                        // frena al llegar (como power1.out)
    const left = 1 - k;
    for (const p of own) p.el.style.transform = left < .002 ? '' : `translate(${(p.x * left).toFixed(2)}%, ${(p.y * left).toFixed(2)}%) rotate(${(p.r * left).toFixed(2)}deg)`;
  };
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  update();
})();
