// WORK · lista de proyectos (referencia: 13322566869.com/works, con el estilo de esta web).
//  · cada fila aparece una vez al entrar: la línea se dibuja, el nombre sube desde su máscara y las miniaturas se destapan una a una;
//  · al hacer scroll la tira de miniaturas se desplaza un poco de lado, con inercia (la fila se mueve distinto que la página);
//  · al pasar el ratón: se encienden los textos, suben las miniaturas y "View project" hace de cursor (la parte visual está en css/home.css);
//  · los vídeos de las miniaturas solo se reproducen mientras se ven.
// Todo se apaga con "reducir movimiento". Sin este script, la lista se ve completa y quieta.
(() => {
  const work = document.getElementById('work');
  if (!work) return;
  // La hora de Madrid bajo "Based in Madrid" (sea cual sea la zona del visitante), puesta al minuto
  const clock = document.querySelector('[data-madrid-time]');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
    const tick = () => {
      const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
      clock.textContent = `${parts.hour}:${parts.minute} ${parts.timeZoneName}`;
      setTimeout(tick, 60000 - (Date.now() % 60000) + 50);
    };
    tick();
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const rows = [...work.querySelectorAll('.work-item')];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // ---- Miniaturas: cada una sabe su posición (--i) para destaparse en cadena ----
  rows.forEach((row) => row.querySelectorAll('.wi-slot').forEach((slot, i) => slot.style.setProperty('--i', i)));

  // ---- Vídeos: solo se reproducen mientras se ven ----
  const videos = [...work.querySelectorAll('.wi-slot video')];
  videos.forEach((v) => { v.autoplay = false; v.pause(); });
  if (!reduced && videos.length) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => (e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause())));
    videos.forEach((v) => io.observe(v));
  }

  // ---- Volver desde un proyecto: la lista llega con un fundido corto, la fila de ese proyecto se enciende un momento
  //      y la lista no repite su entrada (js/case.js guarda el proyecto al salir) ----
  const cameBack = () => { try { return !!sessionStorage.getItem('dizmar-from'); } catch (e) { return false; } };
  const arrive = () => {
    let from = null;
    try { from = sessionStorage.getItem('dizmar-from'); sessionStorage.removeItem('dizmar-from'); } catch (e) { /* storage blocked */ }
    const row = rows.find((r) => r.querySelector('a')?.getAttribute('href') === from);
    if (!row) return;
    // Con transición de página (is-vt) la lista se está fundiendo: la fila se enciende cuando termina
    const settle = document.documentElement.classList.contains('is-vt') ? 300 : 0;
    work.classList.add('arriving');
    setTimeout(() => row.classList.add('is-back'), settle);
    setTimeout(() => work.classList.remove('arriving'), 600);
    setTimeout(() => row.classList.remove('is-back'), settle + 1600);
  };
  addEventListener('pageshow', (e) => { if (e.persisted) arrive(); });

  // ---- Aparecer: cada fila entra una sola vez ----
  if (!reduced && !cameBack()) {
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

  // ---- Inercia: la tira de cada fila se desplaza de lado algo por detrás del scroll (se escribe directamente en la tira: una variable CSS se heredaría a todas sus miniaturas) ----
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
        strips[i].style.translate = now[i].toFixed(2) + 'px 0';
      });
      if (moving) raf = requestAnimationFrame(frame);
      else last = 0;
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };
    addEventListener('scroll', wake, { passive: true });
    addEventListener('resize', wake);
    wake();
  }

  // ---- "View project": es el propio cursor sobre una fila (sin retraso: se escribe en cada movimiento del ratón) ----
  if (fine && !reduced) {
    document.documentElement.classList.add('has-pill');
    const pill = document.createElement('div');
    pill.className = 'work-cursor';
    pill.textContent = 'View project';
    pill.setAttribute('aria-hidden', 'true');
    document.body.append(pill);
    let mouse = null;
    const over = () => !!mouse && !!document.elementFromPoint(mouse.x, mouse.y)?.closest('.work-item > a');
    // En la ventana entera (no solo en la sección): así, al entrar en una fila la etiqueta ya está donde está el ratón y no llega desde donde se quedó
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      mouse = { x: e.clientX, y: e.clientY };
      // Posición con la propiedad "translate" (no "transform"): así el crecimiento de "scale" se hace desde el centro de la etiqueta y no desde la esquina de la pantalla
      pill.style.translate = `calc(${e.clientX}px - 50%) calc(${e.clientY}px - 50%)`;
      pill.classList.toggle('is-on', over());
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { mouse = null; pill.classList.remove('is-on'); });
    addEventListener('scroll', () => { if (mouse) pill.classList.toggle('is-on', over()); }, { passive: true });
  }
  arrive();
})();
