// HOME · el papel verde con agujeros: dibuja la máscara con formas recortadas, deja que el visitante haga más agujeros
// con un clic y reparte trozos caídos en el footer. No hace falta tocarlo para editar textos.

// ---------- Collage: green paper with punched holes ----------
(() => {
  const work = document.getElementById('work');
  const paper = document.getElementById('paper');
  const fallen = document.getElementById('fallen');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PAPER = '#2c4e37';

  // Small seeded random so the layout is the same on every visit
  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Shapes in a 100 x 100 box, as SVG markup
  function star(points, inner) {
    const pts = [];
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 ? inner : 50;
      const a = (Math.PI * i) / points - Math.PI / 2;
      pts.push((50 + r * Math.cos(a)).toFixed(1) + ',' + (50 + r * Math.sin(a)).toFixed(1));
    }
    return `<polygon points="${pts.join(' ')}"/>`;
  }
  const flower = () => {
    let c = '<circle cx="50" cy="50" r="26"/>';
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * i) / 3;
      c += `<circle cx="${(50 + 26 * Math.cos(a)).toFixed(1)}" cy="${(50 + 26 * Math.sin(a)).toFixed(1)}" r="22"/>`;
    }
    return c;
  };
  const SHAPES = [
    () => star(5, 21),                                  // star
    () => star(4, 13),                                  // sparkle
    () => star(8, 30),                                  // burst
    () => '<path d="M50 90C22 68 2 50 10 28 18 8 42 8 50 27 58 8 82 8 90 28 98 50 78 68 50 90Z"/>', // heart
    () => '<polygon points="62,0 18,56 44,56 32,100 84,38 57,38 72,0"/>', // lightning bolt
    () => '<circle cx="50" cy="50" r="46"/>',            // circle
    flower,
  ];

  let holes = [];      // built-in holes: { x (0-1), y (px), size, rot, shape }
  let punched = [];    // holes the visitor punched, same format

  function layoutHoles(w, h) {
    const rand = rng(11);
    const list = [];
    const bands = innerWidth < 700 ? [[24, 150], [h - 170, h - 30]] : [[30, 180], [h - 200, h - 40]];
    const perBand = Math.max(5, Math.round(w / 110));
    for (const [top, bottom] of bands) {
      for (let i = 0; i < perBand; i++) {
        const size = 36 + rand() * 60;
        list.push({
          x: (i + 0.15 + rand() * 0.7) / perBand,
          y: top + rand() * (bottom - top),
          size,
          rot: rand() * 360,
          shape: Math.floor(rand() * SHAPES.length),
        });
      }
    }
    return list;
  }

  function holeMarkup(hole, w) {
    const s = hole.size / 100;
    const x = hole.x * w - hole.size / 2;
    const y = hole.y - hole.size / 2;
    return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${hole.rot.toFixed(0)} ${hole.size / 2} ${hole.size / 2}) scale(${s.toFixed(3)})">${SHAPES[hole.shape]()}</g>`;
  }

  function render() {
    const w = Math.round(work.offsetWidth);
    const h = Math.round(work.offsetHeight);
    if (!holes.length || holes.h !== h || holes.w !== w) {
      holes = layoutHoles(w, h);
      holes.w = w; holes.h = h;
    }
    const radius = innerWidth < 700 ? 20 : 28;
    const cut = [...holes, ...punched].map((hole) => holeMarkup(hole, w)).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">` +
      `<rect width="${w}" height="${h}" rx="${radius}" fill="#fff"/><g fill="#000">${cut}</g></mask></defs>` +
      `<rect width="${w}" height="${h}" mask="url(#m)"/></svg>`;
    const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    paper.style.webkitMaskImage = url;
    paper.style.maskImage = url;
  }

  function shapeSvg(shape, size, rot) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" style="transform: rotate(${rot}deg)"><g fill="${PAPER}">${SHAPES[shape]()}</g></svg>`;
  }

  // Click the paper (not a project) to punch a new hole; the piece falls away
  work.addEventListener('click', (e) => {
    if (e.target.closest('.project, a, button')) return;
    const rect = work.getBoundingClientRect();
    const hole = {
      x: (e.clientX - rect.left) / rect.width,
      y: e.clientY - rect.top,
      size: 40 + Math.random() * 30,
      rot: Math.random() * 360,
      shape: Math.floor(Math.random() * SHAPES.length),
    };
    punched.push(hole);
    render();
    if (reduced) return;

    const piece = document.createElement('div');
    piece.className = 'piece';
    piece.innerHTML = shapeSvg(hole.shape, hole.size, hole.rot);
    piece.style.left = e.clientX - hole.size / 2 + 'px';
    piece.style.top = e.clientY - hole.size / 2 + 'px';
    document.body.appendChild(piece);
    const drift = (Math.random() - 0.5) * 240;
    piece.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg)' },
        { transform: `translate(${drift}px, ${innerHeight}px) rotate(${(Math.random() - 0.5) * 720}deg)` },
      ],
      { duration: 1600 + Math.random() * 600, easing: 'cubic-bezier(.45,0,.8,.6)' }
    ).onfinish = () => piece.remove();
  });

  // A few pieces already lying on the sky in the footer
  const rand = rng(23);
  for (let i = 0; i < 9; i++) {
    const size = 26 + rand() * 34;
    const el = document.createElement('div');
    el.innerHTML = shapeSvg(Math.floor(rand() * SHAPES.length), size, Math.round(rand() * 360));
    const svg = el.firstChild;
    svg.style.left = 4 + rand() * 88 + '%';
    svg.style.top = 8 + rand() * 60 + '%';
    fallen.appendChild(svg);
  }

  new ResizeObserver(render).observe(work);
  render();
})();
