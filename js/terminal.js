// TERMINAL · una ventana de texto que se abre desde el enlace «Terminal» del pie de página (todas las páginas) o con la tecla `. Escribe `help`.
// Todo va en el propio script: sin red, sin cookies, sin datos de visitantes. Los textos se escriben con textContent, nunca como HTML.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const machine = location.pathname.startsWith('/machine');
  const PAGES = {
    home: '/', work: '/#work', about: '/about/', room: '/room.html', machine: '/machine/',
    lexus: '/project/lexus-electrified/', schweppes: '/project/schweppes/', soap: '/project/soap-and-glory-vanilla/',
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
      'Type `cd <name>` to open a project, for example: cd lexus',
    ],
    contact: [
      'Email     hey.mariodiz@gmail.com',
      'LinkedIn  es.linkedin.com/in/mario-diaz-aguado',
      'Based     Madrid, Spain',
    ],
  };

  // ---------- Construcción (una vez) ----------
  // Entrada: un enlace «Terminal» en el pie de página (también en móvil y en las páginas de proyecto). La tecla ` la abre desde cualquier sitio.
  const triggers = [];
  let lastTrigger = null;
  const foot = document.querySelector('.site-foot, .room-foot, .wrap > footer');
  if (foot) {
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
  panel.setAttribute('aria-label', 'Terminal');
  const bar = document.createElement('div');
  bar.className = 'term-bar';
  const dots = document.createElement('span');
  dots.className = 'term-dots';
  dots.setAttribute('aria-hidden', 'true');
  dots.append(document.createElement('i'), document.createElement('i'), document.createElement('i'));
  const title = document.createElement('span');
  title.className = 'term-title';
  title.textContent = machine ? 'dizmar — machine mode' : 'dizmar — terminal';
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

  const hint = document.createElement('p');
  hint.className = 'term-hint';
  hint.textContent = machine
    ? 'Machine mode: the plain-text index. `view human` opens the visual site.'
    : 'Tip: `view machine` opens the plain-text version of this site.';

  // ---------- Salida ----------
  const write = (lines, cls = '') => {
    for (const text of lines) {
      const p = document.createElement('div');
      p.className = 'term-line ' + cls;
      p.textContent = text;
      out.append(p);
    }
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
    setTimeout(() => { location.href = page; }, reduced ? 0 : 240);
  };
  const LS = () => ['home/  about/  room.html  machine/  project/', '  lexus-electrified/  schweppes/  soap-and-glory-vanilla/'];
  const COMMANDS = {
    help: () => [
      'Commands:',
      '  help                    this list',
      '  ls                      list the pages of dizmar.xyz',
      '  cd <page>               go to a page: home, work, about, room, machine, lexus, schweppes, soap',
      '  view human | machine    switch between the visual site and the plain-text index',
      '  about | work | contact  print that section here',
      '  whoami                  who is behind this',
      '  date                    today’s date',
      '  echo <text>             print text',
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
    clear: () => { out.replaceChildren(); return []; },
    exit: () => { closeTerm(); return []; },
    sudo: () => ['permission denied: nice try.'],
    cd: (args) => {
      const target = (args[0] || '').replace(/^\.?\//, '').replace(/\/$/, '');
      if (!target || target === '~' || target === '..') return go(PAGES.home);
      if (target === 'contact') { write(SECTIONS.contact); return []; }
      if (PAGES[target]) return go(PAGES[target]);
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
      const key = ROOM_THINGS[(args[0] || '').toLowerCase()];
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
    echoCommand(text);
    past.push(text);
    histIndex = past.length;
    const [name, ...args] = text.split(/\s+/);
    const fn = COMMANDS[name.toLowerCase()];
    const result = fn ? fn(args) : ['command not found: ' + name + '  (type help)'];
    if (result && result.length) write(result);
  };

  // ---------- Abrir y cerrar ----------
  const past = [];
  let histIndex = 0;
  let welcomed = false;
  // En el móvil el teclado tapa la parte de abajo de la pantalla, pero no cambia el tamaño de la página: se mide cuánto tapa (visualViewport)
  // y la ventana se sube sobre él, con una altura que quepa en lo que queda a la vista. Así la línea donde escribes nunca queda detrás del teclado.
  const vv = window.visualViewport;
  const fit = () => {
    if (!vv || panel.hidden) return;
    const covered = Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop));
    panel.style.setProperty('--kb', covered + 'px');
    panel.style.setProperty('--vvh', Math.round(vv.height) + 'px');
    out.scrollTop = out.scrollHeight;
  };
  if (vv) { vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); }
  input.addEventListener('focus', () => { fit(); setTimeout(fit, 250); }); // el teclado tarda un momento en abrirse
  function openTerm() {
    panel.hidden = false;
    fit();
    triggers.forEach((t) => t.setAttribute('aria-expanded', 'true'));
    if (!welcomed) {
      welcomed = true;
      write(['dizmar.xyz terminal · type `help` to start.']);
      out.append(hint.cloneNode(true));
    }
    input.focus({ preventScroll: true });
  }
  function closeTerm() {
    panel.hidden = true;
    triggers.forEach((t) => t.setAttribute('aria-expanded', 'false'));
    if (lastTrigger) lastTrigger.focus({ preventScroll: true });
  }

  triggers.forEach((t) => t.addEventListener('click', (e) => { e.preventDefault(); lastTrigger = t; panel.hidden ? openTerm() : closeTerm(); }));
  close.addEventListener('click', closeTerm);
  row.addEventListener('submit', (e) => { e.preventDefault(); run(input.value); input.value = ''; });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      histIndex = Math.max(0, histIndex - 1);
      input.value = past[histIndex] || '';
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      histIndex = Math.min(past.length, histIndex + 1);
      input.value = past[histIndex] || '';
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeTerm();
    }
  });
  // Ver la terminal (o cerrarla) con la tecla ` cuando no se está escribiendo en otro sitio
  addEventListener('keydown', (e) => {
    if (e.key !== '`' || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    if (t instanceof Element && t.closest('input, textarea, [contenteditable]') && t !== input) return;
    e.preventDefault();
    panel.hidden ? openTerm() : closeTerm();
  });
})();
