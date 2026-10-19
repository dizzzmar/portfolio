// WORK · lista de proyectos (referencia: 13322566869.com/works, con el estilo de esta web).
//  · la cabecera tiene "Creative ___": su palabra se descifra con la animación de la portada (createWordCycler, js/home-intro.js);
//  · cada fila aparece una vez al entrar: la línea se dibuja, el nombre sube desde su máscara y las miniaturas se destapan una a una;
//  · al hacer scroll la tira de miniaturas se desplaza un poco de lado, con inercia (la fila se mueve distinto que la página);
//  · al pasar el ratón: se encienden los textos, suben las miniaturas y aparece "View project" siguiendo al cursor (la parte visual está en css/home.css);
//  · los vídeos de las miniaturas solo se reproducen mientras se ven.
// Todo se apaga con "reducir movimiento". Sin este script, la lista se ve completa y quieta.
(() => {
  const work = document.getElementById('work');
  if (!work) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const rows = [...work.querySelectorAll('.work-item')];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // ---- Cabecera: palabra cambiante ----
  const top = work.querySelector('.work-top');
  const word = work.querySelector('.wb-word');
  if (top && word) createWordCycler(word, { visible: false }).watch(top);

  // ---- Miniaturas: cada una sabe su posición (--i) para destaparse en cadena ----
  rows.forEach((row) => row.querySelectorAll('.wi-slot').forEach((slot, i) => slot.style.setProperty('--i', i)));

  // ---- Vídeos: solo se reproducen mientras se ven ----
  const videos = [...work.querySelectorAll('.wi-slot video')];
  videos.forEach((v) => { v.autoplay = false; v.pause(); });
  if (!reduced && videos.length) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => (e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause())));
    videos.forEach((v) => io.observe(v));
  }

  // ---- Aparecer: cada fila entra una sola vez ----
  if (!reduced) {
    document.documentElement.classList.add('work-motion');
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    rows.forEach((row) => io.observe(row));
  }

  // ---- Móvil: la fila del centro de la pantalla se enciende (no hay ratón para hacerlo) ----
  if (!fine) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('is-hot', e.isIntersecting)), { rootMargin: '-42% 0px -42% 0px' });
    rows.forEach((row) => io.observe(row));
  }

  // ---- Inercia: la tira de cada fila se desplaza de lado (--dx) algo por detrás del scroll ----
  if (!reduced && matchMedia('(min-width: 761px)').matches) {
    const strips = rows.map((row) => row.querySelector('.wi-strip'));
    const now = rows.map(() => 0);
    let raf = 0, last = 0;
    const frame = (t) => {
      raf = 0;
      const k = 1 - Math.exp(-(t - (last || t - 16)) / 120);
      last = t;
      let moving = false;
      const vh = innerHeight;
      rows.forEach((row, i) => {
        const r = row.getBoundingClientRect();
        const off = r.top + r.height / 2 - vh / 2;
        if (Math.abs(off) > vh * 1.6) return;
        const to = clamp(off * -0.07, -70, 70) * (i % 2 ? -1 : 1); // las filas pares van hacia un lado y las impares hacia el otro
        now[i] += (to - now[i]) * k;
        if (Math.abs(to - now[i]) > 0.05) moving = true;
        strips[i].style.setProperty('--dx', now[i].toFixed(2) + 'px');
      });
      if (moving) raf = requestAnimationFrame(frame);
      else last = 0;
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };
    addEventListener('scroll', wake, { passive: true });
    addEventListener('resize', wake);
    wake();
  }

  // ---- "View project": sigue al ratón con un poco de retraso ----
  if (fine && !reduced) {
    const pill = document.createElement('div');
    pill.className = 'work-cursor';
    pill.textContent = 'View project';
    pill.setAttribute('aria-hidden', 'true');
    document.body.append(pill);
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0, mouse = null;
    const loop = () => {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      pill.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      raf = Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3 ? requestAnimationFrame(loop) : 0;
    };
    const over = () => !!mouse && !!document.elementFromPoint(mouse.x, mouse.y)?.closest('.work-item > a');
    work.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      mouse = { x: e.clientX, y: e.clientY };
      tx = Math.min(e.clientX + 16, innerWidth - 130);
      ty = Math.min(e.clientY + 16, innerHeight - 40);
      pill.classList.toggle('is-on', over());
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    work.addEventListener('pointerleave', () => { mouse = null; pill.classList.remove('is-on'); });
    addEventListener('scroll', () => { if (mouse) pill.classList.toggle('is-on', over()); }, { passive: true });
  }
})();
