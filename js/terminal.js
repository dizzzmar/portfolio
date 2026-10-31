// TERMINAL · una ventana de texto que se abre desde el enlace «Terminal» del pie de página (todas las páginas) o con la tecla `. Escribe `help`.
// Todo va en el propio script: sin red, sin cookies, sin datos de visitantes. Los textos se escriben con textContent, nunca como HTML.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const machine = location.pathname.startsWith('/machine');
  // Solo claves propias: «constructor», «toString»… no son comandos ni páginas
  const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  const PAGES = {
    home: '/', work: '/#work', about: '/about/', faq: '/faq/', room: '/room.html', machine: '/machine/', playground: '/playground/',
    lexus: '/project/lexus-electrified/', schweppes: '/project/schweppes/', soap: '/project/soap-and-glory-vanilla/', enmad: '/project/enmad/', posters: '/posters/',
  };
  const SECTIONS = {
    about: [
      'Mario Diz (dizmar) · art director and visual designer, Madrid, Spain.',
      'Art direction and visual design. Key visuals, AI creative, 3D and product imagery, audiovisual.',
      'Three years of experience. Background in art history. Works with the AI team at WPP Production Madrid.',
    ],
    work: [
      '2025  AUDIOVISUAL      Lexus Electrified          lexus       (Lexus Singapore)',
      '2026  AUDIOVISUAL      Schweppes                  schweppes   (AI film)',
      '2026  KEY VISUALS      Soap & Glory Vanillalicious soap       (Vanillalicious)',
      '2023  STUDIES          ENMAD                      enmad       (university project)',
      '2021  PERSONAL         Posters                    posters     (fictional work)',
      'Type `cd <name>` to open a project, for example: cd lexus',
    ],
    contact: [
      'Email     hey.mariodiz@gmail.com',
      'LinkedIn  es.linkedin.com/in/mario-diaz-aguado',
      'Based     Madrid, Spain',
    ],
  };

  // ---------- Construcción (una vez) ----------
  // Entrada: «Terminal» en la fila pequeña del menú (js/menu.js); donde no hay menú (Machine, 404), un enlace en el pie. La tecla ` la abre desde cualquier sitio.
  const triggers = [];
  let lastTrigger = null;
  const foot = document.querySelector('.site-foot, .room-foot, .wrap > footer');
  if (foot && !document.querySelector('.menu-li')) {
    const footLink = document.createElement('a');
    footLink.href = '#terminal';
    footLink.className = 'term-open term-foot';
    footLink.setAttribute('aria-haspopup', 'dialog');
    footLink.setAttribute('aria-controls', 'term');
    footLink.textContent = 'Terminal';
    if (foot.classList.contains('site-foot') || foot.children.length === 2) foot.insertBefore(footLink, foot.lastElementChild);
    else (foot.querySelector('span') || foot).append(' · ', footLink);
    triggers.push(footLink);
    lastTrigger = footLink;
  }

  const panel = document.createElement('section');
  panel.id = 'term';
  panel.className = 'term';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Terminal');
  const bar = document.createElement('div');
  bar.className = 'term-bar';
  const dots = document.createElement('span');
  dots.className = 'term-dots';
  dots.setAttribute('aria-hidden', 'true');
  dots.append(document.createElement('i'), document.createElement('i'), document.createElement('i'));
  const title = document.createElement('span');
  title.className = 'term-title';
  const titleText = machine ? 'dizmar — machine mode' : 'dizmar — terminal';
  title.textContent = titleText;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'term-close';
  close.textContent = 'Close ×';
  bar.append(dots, title, close);
  const out = document.createElement('div');
  out.className = 'term-out';
  out.setAttribute('role', 'log');
  out.setAttribute('aria-live', 'polite');
  const row = document.createElement('form');
  row.className = 'term-row';
  row.setAttribute('autocomplete', 'off');
  const prompt = document.createElement('label');
  prompt.className = 'term-prompt';
  prompt.htmlFor = 'term-input';
  const input = document.createElement('input');
  input.id = 'term-input';
  input.className = 'term-input';
  input.type = 'text';
  input.spellcheck = false;
  input.autocapitalize = 'off';
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('aria-label', 'Command');
  row.append(prompt, input);
  panel.append(bar, out, row);
  document.body.append(panel);

  // ---------- Texto que se descifra ----------
  // Las letras sueltas se mezclan y se van fijando de izquierda a derecha. Con «movimiento reducido» el texto aparece tal cual.
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?';
  const scramble = (node, text, ms = 420, delay = 0, done = null) => {
    if (reduced || !text) { node.textContent = text; if (done) done(); return; }
    node.textContent = '';
    const chars = [...text];
    const start = performance.now() + delay;
    let last = -Infinity;
    const step = (now) => {
      if (!node.isConnected && now > start + 200) return;
      const p = (now - start) / ms;
      if (p >= 1) { node.textContent = text; if (done) done(); return; }
      if (p >= 0 && now - last >= 40) {
        last = now;
        const done = Math.floor(p * chars.length);
        node.textContent = chars.map((c, i) => (i < done || /\s/.test(c) ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // ---------- Salida ----------
  const write = (lines, cls = '') => {
    lines.forEach((text, i) => {
      const p = document.createElement('div');
      p.className = 'term-line ' + cls;
      if (reduced || !text.trim() || lines.length > 40) p.textContent = text;
      else {
        // El lector de pantalla recibe el texto final de una vez; el que se descifra queda oculto para él
        const real = document.createElement('span');
        real.className = 'term-sr';
        real.textContent = text;
        const fx = document.createElement('span');
        fx.setAttribute('aria-hidden', 'true');
        p.append(real, fx);
        scramble(fx, text, 260 + Math.min(text.length * 5, 260), Math.min(i * 35, 350), () => { if (p.isConnected) p.textContent = text; }); // al acabar queda solo el texto, para poder copiarlo
      }
      out.append(p);
    });
    out.scrollTop = out.scrollHeight;
  };
  const echoCommand = (text) => {
    const p = document.createElement('div');
    p.className = 'term-line term-echo';
    const who = document.createElement('span');
    who.className = 'term-who';
    who.textContent = promptText();
    const cmd = document.createElement('span');
    cmd.textContent = ' ' + text;
    p.append(who, cmd);
    out.append(p);
  };
  const promptText = () => 'visitor@dizmar:' + (machine ? '~/machine' : '~') + '$';
  prompt.textContent = promptText();

  // ---------- Órdenes ----------
  const go = (page) => {
    write(['opening ' + page + ' …']);
    if (machine) document.documentElement.classList.add('machine-leaving'); // en el modo máquina la página se funde antes de irse (estilos en machine/index.html)
    setTimeout(() => { location.href = page; }, reduced ? 0 : 240);
  };
  const LS = () => ['home/  about/  faq/  room.html  machine/  posters/  playground/  project/', '  lexus-electrified/  schweppes/  soap-and-glory-vanilla/  enmad/'];
  let fpsBusy = false;
  const COMMANDS = {
    help: () => [
      'Commands:',
      '  help                    this list',
      '  ls                      list the pages of dizmar.xyz',
      '  cd <page>               go to a page: home, work, about, faq, room, machine, posters, playground, lexus, schweppes, soap, enmad',
      '  view human | machine    switch between the visual site and the plain-text index',
      '  about | work | contact  print that section here',
      '  whoami                  who is behind this',
      '  date                    today’s date',
      '  echo <text>             print text',
      '  guide                   every command on one screen',
      '  fps                     measure how smooth this page is on your device (5 s)',
      '  neofetch                the welcome screen again',
      '  clear                   clear this window',
      '  exit                    close the terminal (also Esc)',
      ...(window.dizRoom ? [
        '',
        'In the room:',
        '  look                    what is on the shelf',
        '  inspect <thing>         zoom to it: vinyl, poster, mimikyu, lamp, plant, wii',
        '  lights on | off         the tomato lamp (off: a flashlight follows your cursor)',
        '  play                    open the Wii and choose a disc',
        '  flicker | sunset        two little light tricks',
        '  zoom out                back to the whole room',
      ] : []),
      '',
      'Machine mode is the plain-text version of the site: for people who prefer text, crawlers and AI agents.',
      'There are a few hidden commands, too.',
    ],
    ls: () => LS(),
    whoami: () => ['visitor — a person, a crawler or an agent. Mario Diz is the one who made this.'],
    date: () => [new Date().toDateString()],
    echo: (args) => [args.join(' ')],
    about: () => SECTIONS.about,
    work: () => SECTIONS.work,
    contact: () => SECTIONS.contact,
    guide: () => { write([
      'GUIDE',
      'go       ls · cd <page> · view human|machine · exit',
      'read     about · work · contact · whoami · date',
      'screen   neofetch · fps · clear · echo <text>',
      'tomato   spin · stop · go · reverse · faster · slower · paint <color>',
      'colors   hue <0-360> · rainbow · invert · gray · sepia · reset',
      ...(window.dizRoom ? ['room     look · inspect <thing> · lights on|off · play · flicker · sunset · zoom out'] : []),
      'keys     Tab completes · ↑ ↓ history · ` opens · Esc closes',
    ], 'term-guide'); return []; },
    neofetch: () => { showSplash(); return []; },
    clear: () => { out.replaceChildren(); return []; },
    exit: () => { closeTerm(); return []; },
    sudo: () => ['permission denied: nice try.'],
    cd: (args) => {
      const target = (args[0] || '').replace(/^\.?\//, '').replace(/\/$/, '');
      if (!target || target === '~' || target === '..') return go(PAGES.home);
      if (target === 'contact') { write(SECTIONS.contact); return []; }
      if (own(PAGES, target)) return go(PAGES[target]);
      return ['cd: no such page: ' + target + '  (try: ls)'];
    },
    view: (args) => {
      const mode = (args[0] || '').toLowerCase();
      if (mode === 'human' || mode === 'visual') return go(PAGES.home);
      if (mode === 'machine' || mode === 'text') {
        if (machine) return ['you are already in machine mode.'];
        return go(PAGES.machine);
      }
      return ['usage: view human | view machine'];
    },
  };
  // ---------- Escondidos ----------
  const TOMATO = [
    '      \\|/',
    '    .-"""-.',
    '   /  ___  \\',
    '  |  (o o)  |',
    '   \\  \\_/  /',
    "    '-...-'",
  ];
  const FORTUNES = [
    'A good art director knows when to stop prompting.',
    'The first frame is never the last frame.',
    'Retouch it by hand. They will notice.',
    'Maximalism is a love language.',
    'Kerning is a form of kindness.',
    'Every default is a decision nobody made.',
  ];
  const noRoom = () => ['that one only works inside the room. try: cd room'];
  const ROOM_THINGS = {
    vinyl: 'vinyls', record: 'vinyls', music: 'vinyls', speaker: 'vinyls',
    poster: 'volver-poster', film: 'volver-poster', movie: 'volver-poster',
    mimikyu: 'mimikyu', pokemon: 'mimikyu', plush: 'mimikyu',
    lamp: 'tomato-lamp', tomato: 'tomato-lamp',
    plant: 'plant', eucalyptus: 'plant',
    wii: 'wii', console: 'wii', discs: 'wii',
  };
  const ROOM_TEXT = {
    vinyls: 'Now playing: Bug — Fontaines D.C. (Romance). The sleeve glows with the lamp.',
    'volver-poster': 'Last watched: La Bola Negra. Come close and the new poster unrolls over the old one.',
    mimikyu: 'A Mimikyu plush. It stares back. It is fine. Everything is fine.',
    'tomato-lamp': 'The tomato lamp. Click it (or type lights off) and the room goes dark; a flashlight follows your cursor.',
    plant: 'Eucalyptus in a fluted vase. It has never been watered by a terminal.',
    wii: 'The Wii, in pearl white. Three discs: Assassin’s Creed Shadows, Pokémon Shield, Hades II. Type play.',
  };
  Object.assign(COMMANDS, {
    // --- en cualquier página ---
    tomato: () => [...TOMATO, '', 'it has to be Diz.'],
    ketchup: () => {
      if (window.dizContact) { setTimeout(() => window.dizContact.open(), reduced ? 0 : 200); return ['opening the sachet … (tear along the top)']; }
      return ['out of ketchup. try the contact link.'];
    },
    // --- trucos con el tomate y con los colores de la web (escondidos: no salen en help ni en las sugerencias) ---
    spin: (args) => {
      const a = (args[0] || '').toLowerCase();
      if (a === 'reverse' || a === 'back' || a === 'backwards') return COMMANDS.reverse();
      if (a === 'stop' || a === 'off') return COMMANDS.stop();
      return COMMANDS.go();
    },
    reverse: () => artMove(() => { artDir = -artDir; return artDir < 0 ? 'the tomato spins the other way.' : 'the tomato spins the right way again.'; }),
    stop: () => artMove(() => { artPaused = true; stopArt(); return 'the tomato holds still.'; }),
    freeze: () => COMMANDS.stop(),
    go: () => artMove(() => { artPaused = false; startArt(); return 'the tomato spins.'; }),
    faster: () => artMove(() => { artSpeed = Math.min(8, artSpeed * 1.8); artPaused = false; startArt(); return 'faster … (x' + artSpeed.toFixed(1) + ')'; }),
    slower: () => artMove(() => { artSpeed = Math.max(0.15, artSpeed / 1.8); artPaused = false; startArt(); return 'slower … (x' + artSpeed.toFixed(1) + ')'; }),
    paint: (args) => {
      const name = (args[0] || '').toLowerCase();
      if (!name) return ['usage: paint <color>   (' + Object.keys(PAINTS).join(', ') + ')'];
      const set = own(PAINTS, name === 'tomato' ? 'red' : name) ? PAINTS[name === 'tomato' ? 'red' : name] : null;
      if (!set) return ['paint: no such color: ' + name + '  (' + Object.keys(PAINTS).join(', ') + ')'];
      set.forEach((c, i) => panel.style.setProperty('--art-' + i, c));
      return ['the tomato is ' + name + ' now.' + (name === 'blue' ? ' (a blue tomato. bold.)' : '')];
    },
    hue: (args) => {
      const n = args[0] === undefined ? Math.floor(Math.random() * 360) : parseInt(args[0], 10);
      if (Number.isNaN(n)) return ['usage: hue <0-360>   (no number: a random one)'];
      stopRainbow();
      look.hue = ((n % 360) + 360) % 360;
      applyLook();
      return ['the whole site, turned ' + look.hue + '°. type `reset` to undo.'];
    },
    rainbow: () => {
      if (reduced) return ['your system asks for less motion, so no rainbow. try `hue 120`.'];
      if (rainbow) return ['already a rainbow. `reset` to stop.'];
      rainbow = document.documentElement.animate(
        [{ filter: 'hue-rotate(0deg)' }, { filter: 'hue-rotate(360deg)' }],
        { duration: 9000, iterations: Infinity, easing: 'linear' });
      return ['the site is a rainbow. `reset` to stop.'];
    },
    invert: () => { look.invert = !look.invert; applyLook(); return [look.invert ? 'colors inverted.' : 'colors back.']; },
    gray: () => { look.gray = !look.gray; applyLook(); return [look.gray ? 'a black and white site, like a proof sheet.' : 'color is back.']; },
    sepia: () => { look.sepia = !look.sepia; applyLook(); return [look.sepia ? 'old photograph mode.' : 'sepia off.']; },
    reset: () => {
      stopRainbow(); look.hue = 0; look.invert = look.gray = look.sepia = false; applyLook();
      artDir = 1; artSpeed = 1; artPaused = false; startArt();
      [0, 1, 2].forEach((i) => panel.style.removeProperty('--art-' + i));
      return ['everything back to normal.'];
    },
    // Mide la fluidez de esta página en este dispositivo durante 5 s: fotogramas por segundo, el fotograma más lento, tareas largas y lienzos 3D
    fps: () => {
      if (fpsBusy) return ['already measuring …'];
      fpsBusy = true;
      const frames = [], long = [];
      let po = null;
      try { po = new PerformanceObserver((l) => l.getEntries().forEach((e) => long.push(e.duration))); po.observe({ entryTypes: ['longtask'] }); } catch (e) { /* Safari no lo tiene */ }
      const start = performance.now();
      let last = start;
      const step = (now) => {
        frames.push(now - last);
        last = now;
        if (now - start < 5000) { requestAnimationFrame(step); return; }
        po?.disconnect();
        fpsBusy = false;
        const sorted = frames.slice(1).sort((a, b) => a - b);
        const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
        const fpsNow = 1000 / avg;
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        const canvases = [...document.querySelectorAll('canvas')].filter((c) => c.width > 0).map((c) => (c.id || c.parentElement?.className || 'canvas') + ' ' + c.width + '×' + c.height + ' (' + (c.width * c.height / 1e6).toFixed(2) + ' Mpx)');
        write([
          'fps          ' + fpsNow.toFixed(1) + '   (the screen refreshes at 60; below 40 it feels rough)',
          'slowest 5%   ' + p95.toFixed(0) + ' ms or more per frame   (16 ms = smooth)',
          'worst frame  ' + sorted[sorted.length - 1].toFixed(0) + ' ms',
          'long tasks   ' + (po ? long.length + (long.length ? ' (' + Math.round(long.reduce((a, b) => a + b, 0)) + ' ms in total)' : '') : 'not available in this browser'),
          'pixel ratio  ' + devicePixelRatio + '   page ' + location.pathname,
          'canvases     ' + (canvases.length ? canvases.join(' · ') : 'none'),
          fpsNow >= 50 ? 'verdict      smooth. the tomato is relaxed.' : fpsNow >= 35 ? 'verdict      a bit rough. the tomato is sweating.' : 'verdict      rough. send these numbers to Mario.',
        ]);
        out.scrollTop = out.scrollHeight;
      };
      requestAnimationFrame(step);
      return ['measuring for 5 seconds … leave it still, or scroll the page behind to test that too.'];
    },
    heinz: () => ['we do not speak that name. it has to be Diz.'],
    fortune: () => [FORTUNES[Math.floor(Math.random() * FORTUNES.length)]],
    hello: () => ['hello, visitor.'],
    hi: () => ['hello, visitor.'],
    pwd: () => [location.pathname || '/'],
    uptime: () => ['up since the first pixel. no crashes, only retouching.'],
    coffee: () => ['brewing …  done. (it is a terminal; you still have to drink it yourself.)'],
    man: () => ['no manual entry. try: help'],
    matrix: () => ['wake up, visitor …', 'the tomato has you.'],
    ls: (args) => {
      if (args.some((a) => /^-.*a/.test(a))) return ['.  ..  .tomato  .ketchup  .secrets  about/  room.html  machine/  project/', '(try: cat .tomato)'];
      return LS();
    },
    cat: (args) => {
      const f = (args[0] || '').toLowerCase();
      if (f === '.tomato') return TOMATO;
      if (f === '.ketchup') return ['it has to be Diz.'];
      if (f === '.secrets') return ['permission denied.'];
      return [f ? 'cat: ' + f + ': no such file' : 'usage: cat <file>'];
    },
    rm: (args) => (args.some((a) => a.includes('/') || a.includes('f')) ? ['rm: refusing to delete the tomato.'] : ['rm: nothing to remove here.']),
    // --- dentro de la sala (solo si la página de la sala ha puesto window.dizRoom) ---
    look: () => (window.dizRoom ? [
      'A narrow shelf in a dark, warm room. A turntable on top, next to the tomato lamp; speakers either side of a glowing sleeve.',
      'Below: records, books, a Mimikyu plush and a Wii. On the floor, a rug with a very familiar sachet.',
      'try: inspect lamp   inspect wii   lights off',
    ] : noRoom()),
    inspect: (args) => {
      if (!window.dizRoom) return noRoom();
      const thing = (args[0] || '').toLowerCase();
      const key = own(ROOM_THINGS, thing) ? ROOM_THINGS[thing] : null;
      if (!key) return ['inspect what? vinyl, poster, mimikyu, lamp, plant or wii.'];
      window.dizRoom.focus(key);
      return [ROOM_TEXT[key]];
    },
    lights: (args) => {
      if (!window.dizRoom) return noRoom();
      const mode = (args[0] || '').toLowerCase();
      if (mode !== 'on' && mode !== 'off') return ['usage: lights on | lights off'];
      window.dizRoom.lights(mode === 'on');
      return [mode === 'off' ? 'lights off. move your cursor: you have a flashlight.' : 'lights on.'];
    },
    lamp: (args) => COMMANDS.lights(args.length ? args : ['off']),
    play: () => {
      if (!window.dizRoom) return noRoom();
      window.dizRoom.wii();
      return ['loading the Wii … pick a disc.'];
    },
    flicker: () => {
      if (!window.dizRoom) return noRoom();
      window.dizRoom.flicker();
      return ['the lamp remembers how it came on.'];
    },
    sunset: (args) => {
      if (!window.dizRoom) return noRoom();
      const mode = (args[0] || 'toggle').toLowerCase();
      window.dizRoom.sunset(mode === 'toggle' ? undefined : mode !== 'off');
      return ['the golden beam from the left: ' + (mode === 'off' ? 'off.' : mode === 'on' ? 'on.' : 'toggled.')];
    },
    zoom: () => {
      if (!window.dizRoom) return noRoom();
      window.dizRoom.reset();
      return ['back to the whole room.'];
    },
  });
  COMMANDS.machine = () => COMMANDS.view(['machine']);
  COMMANDS.human = () => COMMANDS.view(['human']);

  const run = (raw) => {
    const text = raw.trim();
    if (!text) return;
    atWelcome = false;
    echoCommand(text);
    past.push(text);
    histIndex = past.length;
    const [name, ...args] = text.split(/\s+/);
    const fn = own(COMMANDS, name.toLowerCase()) ? COMMANDS[name.toLowerCase()] : null;
    const result = fn ? fn(args) : ['command not found: ' + name + '  (type help)'];
    if (result && result.length) write(result);
    requestAnimationFrame(() => { if (!atWelcome) out.scrollTop = out.scrollHeight; }); // las sugerencias cambian la altura: vuelve al final
  };

  // ---------- Pantalla de bienvenida: tomate en ASCII + panel de datos (tipo «neofetch») ----------
  // El tomate se calcula con código: una esfera con una luz que da vueltas a su alrededor. Tres capas del mismo tamaño (sombra, tono medio, brillo)
  // le dan color sin usar una caja por letra. Si la persona prefiere menos movimiento, se queda un solo fotograma.
  const ART_W = 30, ART_H = 13, RX = 14.5, RY = 6.2;
  const BANDS = [' .:', '-=+*', '#%@'];
  const tomatoFrame = (t) => {
    const layers = [[], [], []];
    const lx = Math.cos(t) * 0.8, ly = -0.45, lz = 0.55 + 0.25 * Math.sin(t);
    const ll = Math.hypot(lx, ly, lz);
    for (let r = 0; r < ART_H; r++) {
      const rows = ['', '', ''];
      for (let c = 0; c < ART_W; c++) {
        const x = (c - (ART_W - 1) / 2) / RX, y = (r - (ART_H - 1) / 2) / RY;
        const d = x * x + y * y;
        let band = -1, ch = ' ';
        if (d <= 1) {
          const z = Math.sqrt(1 - d);
          let i = Math.pow(Math.max(0, (x * lx + y * ly + z * lz) / ll), 1.6) * 0.95 + 0.06;
          i = Math.min(0.999, Math.max(0, i));
          band = i < 0.34 ? 0 : i < 0.7 ? 1 : 2;
          const set = BANDS[band];
          const lo = [0, 0.34, 0.7][band], hi = [0.34, 0.7, 1][band];
          ch = set[Math.min(set.length - 1, Math.floor((i - lo) / (hi - lo) * set.length))];
          if (ch === ' ') ch = '.';
        }
        for (let b = 0; b < 3; b++) rows[b] += b === band ? ch : ' ';
      }
      for (let b = 0; b < 3; b++) layers[b].push(rows[b]);
    }
    return layers.map((l) => l.join('\n'));
  };
  const LEAF = [
    ['        \\  \\ | /  /        ', '         `-.\\|/.-\'         '],
    ['         \\  \\|/  /         ', '         `-.\\|/.-\'         '],
  ];
  const arts = new Set();
  // Estado de los trucos: sentido, velocidad y pausa del tomate; y el «filtro» de color de toda la web (se aplica al <html>)
  let artDir = 1, artSpeed = 1, artPaused = false, rainbow = null;
  const look = { hue: 0, invert: false, gray: false, sepia: false };
  const PAINTS = {
    red: ['#8f2a20', '#ff4434', '#ffb4a6'], green: ['#2f6b3a', '#5fbf6a', '#d2f5c8'], blue: ['#25407a', '#4f86ff', '#c8dcff'],
    gold: ['#8a6414', '#f0b429', '#fff0c0'], pink: ['#8a3a66', '#ff6fb5', '#ffd0ea'], purple: ['#4a2d86', '#9b6dff', '#e0d0ff'],
    white: ['#6f6a66', '#d8d2cc', '#ffffff'],
  };
  const applyLook = () => {
    const parts = [];
    if (look.hue) parts.push('hue-rotate(' + look.hue + 'deg)');
    if (look.invert) parts.push('invert(1) hue-rotate(180deg)');
    if (look.gray) parts.push('grayscale(1)');
    if (look.sepia) parts.push('sepia(1)');
    const root = document.documentElement;
    if (!reduced) root.style.transition = 'filter .7s ease'; // los cambios de color de la web se funden en vez de saltar
    root.style.filter = parts.join(' ');
  };
  const stopRainbow = () => { if (rainbow) { rainbow.cancel(); rainbow = null; } };
  const artMove = (fn) => {
    if (!arts.size) return ['there is no tomato on screen. type `neofetch`.'];
    if (reduced) return ['your system asks for less motion, so the tomato stays still.'];
    return [fn()];
  };
  let artTimer = 0, artT = 0.6;
  const paintArt = (art) => {
    let frame = tomatoFrame(artT);
    if (art.born != null && !reduced) {
      const k = Math.min(1, (performance.now() - art.born) / 800);
      if (k < 1) {
        let n = 0;
        frame = frame.map((layer) => [...layer].map((ch) => (ch === ' ' || ch === '\n' ? ch : art.th[n++ % art.th.length] > k ? '.:-=+*#%@'[(Math.random() * 9) | 0] : ch)).join(''));
      } else art.born = null;
    }
    art.layers.forEach((pre, i) => { pre.textContent = frame[i]; });
    const leaf = LEAF[reduced ? 0 : Math.abs(Math.floor(artT * 1.5)) % 2];
    art.leaf.textContent = leaf.join('\n');
  };
  const artTick = () => {
    artT += 0.11 * artDir * artSpeed;
    arts.forEach((art) => { if (!art.root.isConnected) arts.delete(art); else paintArt(art); });
    if (!arts.size) stopArt();
  };
  function startArt() { if (!reduced && !artPaused && !artTimer && arts.size) artTimer = setInterval(artTick, 90); }
  function stopArt() { clearInterval(artTimer); artTimer = 0; }

  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const infoBox = (name, rows) => {
    const box = el('div', 'term-box term-box-' + name.toLowerCase());
    box.append(el('span', 'term-box-name', name));
    for (const [k, v] of rows) {
      const line = el('div', 'term-kv');
      line.append(el('span', 'term-k', k), el('span', 'term-v', v));
      box.append(line);
    }
    return box;
  };
  const pad2 = (n) => String(n).padStart(2, '0');
  function showSplash() {
    const root = el('div', 'term-splash');
    root.setAttribute('aria-live', 'off');
    const artBox = el('div', 'term-art');
    artBox.setAttribute('aria-hidden', 'true');
    const leaf = el('pre', 'term-leaf');
    const stack = el('div', 'term-sphere');
    const layers = [0, 1, 2].map((i) => el('pre', 'term-layer term-layer-' + i));
    stack.append(...layers);
    artBox.append(leaf, stack);
    const art = { root, leaf, layers, born: performance.now(), th: Array.from({ length: ART_W * ART_H }, Math.random) };
    const startedAt = Date.now();
    const uptime = el('span', 'term-v', '00:00');
    const info = el('div', 'term-info');
    const who = el('div', 'term-who-line');
    who.append(el('span', 'term-who', 'visitor'), '@', el('span', 'term-who', 'dizmar.xyz'));
    const up = el('div', 'term-kv');
    up.append(el('span', 'term-k', 'Open for'), uptime);
    const session = infoBox('Session', [
      ['Mode', machine ? 'machine (plain text)' : 'human (visual)'],
      ['Page', location.pathname === '/' ? 'home' : location.pathname.replace(/^\/|\/$/g, '')],
      ['Date', new Date().toDateString()],
    ]);
    session.append(up);
    const swatch = el('div', 'term-swatch');
    swatch.setAttribute('aria-hidden', 'true');
    ['#ff4434', '#e8604f', '#c0392b', '#8f2a20', '#f4e8df', '#bfae9f', '#7d6f64', '#3a2a24'].forEach((c) => {
      const dot = el('i'); dot.style.background = c; swatch.append(dot);
    });
    info.append(
      who, el('div', 'term-rule'),
      infoBox('Profile', [['Name', 'Mario Diz'], ['Role', 'Art director · visual designer'], ['Based', 'Madrid, Spain'], ['Focus', 'Key visuals · AI · 3D · film']]),
      infoBox('Work', [['2025', 'Lexus Electrified'], ['2026', 'Schweppes'], ['2026', 'Soap & Glory']]),
      session, swatch,
    );
    root.append(artBox, info);
    out.append(root);
    if (!reduced) info.querySelectorAll('.term-v').forEach((v, i) => { if (v !== uptime) scramble(v, v.textContent, 380, 150 + i * 50); });
    arts.add(art);
    paintArt(art);
    if (!reduced) {
      const tick = () => {
        if (!root.isConnected) return;
        const s = Math.floor((Date.now() - startedAt) / 1000);
        uptime.textContent = pad2(Math.floor(s / 60)) + ':' + pad2(s % 60);
        setTimeout(tick, 1000);
      };
      tick();
    }
    startArt();
    out.scrollTop = out.scrollHeight;
  }

  // ---------- Abrir y cerrar ----------
  const past = [];
  let histIndex = 0;
  let welcomed = false;
  let atWelcome = false; // hasta el primer comando, la ventana se queda arriba para ver el tomate (también con el teclado abierto)
  // En el móvil el teclado tapa la parte de abajo de la pantalla, pero no cambia el tamaño de la página: se mide cuánto tapa (visualViewport)
  // y la ventana se sube sobre él, con una altura que quepa en lo que queda a la vista. Así la línea donde escribes nunca queda detrás del teclado.
  const vv = window.visualViewport;
  const fit = () => {
    if (!vv || panel.hidden) return;
    const covered = Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop));
    panel.style.setProperty('--kb', covered + 'px');
    panel.style.setProperty('--vvh', Math.round(vv.height) + 'px');
    if (!atWelcome) out.scrollTop = out.scrollHeight;
  };
  if (vv) { vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); }
  input.addEventListener('focus', () => { fit(); setTimeout(fit, 250); }); // el teclado tarda un momento en abrirse
  function openTerm() {
    panel.hidden = false;
    scramble(title, titleText, 420);
    fit();
    triggers.forEach((t) => t.setAttribute('aria-expanded', 'true'));
    startArt();
    if (!welcomed) {
      welcomed = true;
      showSplash();
      atWelcome = true;
      out.scrollTop = 0; // la bienvenida se lee desde arriba
    }
    input.focus({ preventScroll: true });
  }
  function closeTerm() {
    panel.hidden = true;
    stopArt();
    triggers.forEach((t) => t.setAttribute('aria-expanded', 'false'));
    if (lastTrigger) lastTrigger.focus({ preventScroll: true });
  }

  // ---------- Autocompletar y sugerencias ----------
  // · Texto fantasma tras lo que escribes (Tab o → para aceptarlo; Tab con varias opciones las lista).
  // · Botones de sugerencia sobre el campo: sirven en el móvil, donde no hay Tab. Tocar uno lo ejecuta, o lo escribe si necesita un argumento.
  // Los comandos escondidos (tomato, ketchup…) nunca se sugieren.
  const NEEDS_ARG = new Set(['cd', 'view', 'inspect', 'lights', 'sunset', 'zoom', 'echo']);
  const roomOn = () => !!window.dizRoom;
  const baseCommands = () => ['help', 'ls', 'cd', 'view', 'about', 'work', 'contact', 'whoami', 'date', 'echo', 'guide', 'fps', 'neofetch', 'clear', 'exit',
    ...(roomOn() ? ['look', 'inspect', 'lights', 'play', 'flicker', 'sunset', 'zoom'] : [])];
  const ARGS = () => ({
    cd: ['home', 'work', 'about', 'faq', 'room', 'machine', 'playground', 'lexus', 'schweppes', 'soap', 'enmad', 'contact'],
    view: ['human', 'machine'],
    inspect: ['vinyl', 'poster', 'mimikyu', 'lamp', 'plant', 'wii'],
    lights: ['on', 'off'],
    sunset: ['on', 'off'],
    zoom: ['out'],
  });
  const commonPrefix = (list) => list.reduce((a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return a.slice(0, i); });
  // Qué se puede completar con lo que hay escrito: { candidates: [texto completo de la última palabra], head: lo anterior, word: lo escrito }
  function completions(value) {
    const text = value.replace(/^\s+/, '');
    const space = text.search(/\s/);
    if (space === -1) {
      const word = text.toLowerCase();
      return { head: '', word, candidates: baseCommands().filter((c) => c.startsWith(word) && c !== word) };
    }
    const cmd = text.slice(0, space).toLowerCase();
    const rest = text.slice(space).replace(/^\s+/, '');
    const word = rest.toLowerCase();
    const all = ARGS();
    const list = own(all, cmd) ? all[cmd] : [];
    return { head: text.slice(0, space) + ' ', word, candidates: list.filter((c) => c.startsWith(word) && c !== word) };
  }
  // Sugerencias para los botones: comandos completos (o la palabra que falta si hay que escribir un argumento)
  function chipsFor(value) {
    const text = value.replace(/^\s+/, '');
    if (!text) return roomOn() ? ['look', 'lights off', 'inspect lamp', 'play', 'help'] : ['help', 'ls', 'view machine', 'about', 'work'];
    const { head, candidates, word } = completions(value);
    if (head) return candidates.slice(0, 6).map((c) => head + c);
    const out = candidates.slice(0, 6);
    return word && !out.length ? [] : out;
  }

  // Campo con texto fantasma y botones
  const field = document.createElement('div');
  field.className = 'term-field';
  const ghost = document.createElement('div');
  ghost.className = 'term-ghost';
  ghost.setAttribute('aria-hidden', 'true');
  const ghostTyped = document.createElement('span');
  const ghostRest = document.createElement('b');
  ghost.append(ghostTyped, ghostRest);
  input.after(field);
  field.append(ghost, input);
  const chips = document.createElement('div');
  chips.className = 'term-chips';
  chips.setAttribute('role', 'group');
  chips.setAttribute('aria-label', 'Suggested commands');
  panel.insertBefore(chips, row);

  const refreshSuggestions = () => {
    const { candidates, word } = completions(input.value);
    ghostTyped.textContent = input.value;
    ghostRest.textContent = input.value && candidates.length && word ? candidates[0].slice(word.length) : '';
    chips.replaceChildren();
    for (const text of chipsFor(input.value)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'term-chip';
      b.textContent = text;
      const needs = NEEDS_ARG.has(text.split(' ')[0]) && !text.includes(' ');
      b.setAttribute('aria-label', (needs ? 'Write command: ' : 'Run command: ') + text);
      b.addEventListener('pointerdown', (e) => e.preventDefault()); // el campo no pierde el foco (y el teclado del móvil sigue abierto)
      b.addEventListener('click', () => {
        if (needs) { input.value = text + ' '; input.focus({ preventScroll: true }); refreshSuggestions(); return; }
        run(text);
        input.value = '';
        input.focus({ preventScroll: true });
        refreshSuggestions();
      });
      chips.append(b);
    }
  };
  const acceptGhost = () => {
    const { candidates, word, head } = completions(input.value);
    if (!candidates.length || !word) return false;
    const done = candidates.length === 1 ? candidates[0] : commonPrefix(candidates);
    const full = head + done;
    if (full.length <= input.value.replace(/^\s+/, '').length) {
      // Nada más que completar sin ambigüedad: se muestran las opciones, como en una terminal de verdad
      write([candidates.join('   ')], 'term-options');
      return true;
    }
    input.value = full + (candidates.length === 1 && !head && NEEDS_ARG.has(done) ? ' ' : '');
    return true;
  };
  input.addEventListener('input', refreshSuggestions);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey && input.value.trim()) {
      if (acceptGhost()) { e.preventDefault(); refreshSuggestions(); }
    } else if (e.key === 'ArrowRight' && input.selectionStart === input.value.length && ghostRest.textContent) {
      e.preventDefault();
      acceptGhost();
      refreshSuggestions();
    }
  });
  row.addEventListener('submit', () => setTimeout(refreshSuggestions, 0));
  refreshSuggestions();

  triggers.forEach((t) => t.addEventListener('click', (e) => { e.preventDefault(); lastTrigger = t; panel.hidden ? openTerm() : closeTerm(); }));
  document.addEventListener('terminal:open', () => { if (panel.hidden) openTerm(); }); // la fila pequeña del menú (js/menu.js)
  close.addEventListener('click', closeTerm);
  row.addEventListener('submit', (e) => { e.preventDefault(); run(input.value); input.value = ''; });
  // El tabulador se queda dentro de la terminal mientras está abierta (Escape la cierra y devuelve el foco)
  panel.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const items = [...panel.querySelectorAll('button, input, a[href]')].filter((el) => !el.disabled && el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      histIndex = Math.max(0, histIndex - 1);
      input.value = past[histIndex] || '';
      refreshSuggestions();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      histIndex = Math.min(past.length, histIndex + 1);
      input.value = past[histIndex] || '';
      refreshSuggestions();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeTerm();
    }
  });
  // Ver la terminal (o cerrarla) con la tecla ` cuando no se está escribiendo en otro sitio
  addEventListener('keydown', (e) => {
    if (e.key !== '`' || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    if (t instanceof Element && t.closest('input, textarea, [contenteditable]')) return; // escribiendo (también en la propia terminal): el ` es una letra más
    e.preventDefault();
    panel.hidden ? openTerm() : closeTerm();
  });
})();
