// CARGA EN MOSAICO · las imágenes dentro de un <span class="px"> empiezan como un mosaico de unos 10 píxeles de ancho (va incrustado en el HTML, en --lq) y, cuando la imagen
// real ya ha llegado y está a la vista, se afinan por pasos (6, 12, 24, 48, 96, 192 píxeles de ancho, ~90 ms cada paso) hasta quedar nítidas. Referencia: locomotive.ca/en/agency.
// Cómo se usa: <span class="px" style="--lq: url(...mosaico...)"><img src="..." alt="..." width="..." height="..."></span>. Los estilos están en css/about.css (.px).
// Para que no haya parpadeo, la página pone la clase «fx» en <html> dentro de <head> (solo si hay IntersectionObserver y no se pidió «reducir movimiento»);
// sin esa clase, o sin este script, la imagen se ve normal y de golpe.
(() => {
  const root = document.documentElement;
  const boxes = [...document.querySelectorAll('.px')];
  if (!boxes.length) return;
  const reveal = (box) => { box.classList.add('is-loaded'); box.querySelector('canvas')?.remove(); };
  if (!root.classList.contains('fx') || !('IntersectionObserver' in window)) { boxes.forEach((b) => b.classList.add('is-loaded')); return; }

  const STEPS = [6, 12, 24, 48, 96, 192], GAP = 90;
  const run = async (box) => {
    const img = box.querySelector('img');
    try { await (img.decode ? img.decode() : Promise.resolve()); } catch (e) { reveal(box); return; }   // si la imagen falla, se muestra tal cual
    const W = box.clientWidth, H = box.clientHeight;
    if (!W || !H || !img.naturalWidth) { reveal(box); return; }
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) { reveal(box); return; }
    box.append(canvas);
    // El recorte «cover» con la misma posición que la imagen (object-position)
    const pos = getComputedStyle(img).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
    const fx = Number.isFinite(pos[0]) ? pos[0] : 0.5, fy = Number.isFinite(pos[1]) ? pos[1] : 0.5;
    const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const sw = W / scale, sh = H / scale, sx = (img.naturalWidth - sw) * fx, sy = (img.naturalHeight - sh) * fy;
    const small = document.createElement('canvas'), sctx = small.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    for (const step of STEPS) {
      small.width = step; small.height = Math.max(1, Math.round(step * H / W));
      sctx.drawImage(img, sx, sy, sw, sh, 0, 0, small.width, small.height);
      ctx.drawImage(small, 0, 0, small.width, small.height, 0, 0, W, H);
      await new Promise((ok) => setTimeout(ok, GAP));
    }
    reveal(box);
  };

  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target); run(e.target);
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  boxes.forEach((box) => {
    const img = box.querySelector('img');
    if (img) img.loading = 'eager';                      // empieza a bajarse ya; el mosaico se afina cuando la imagen se ve
    io.observe(box);
  });
})();
