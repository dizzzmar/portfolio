// TERMINAL · una ventana de texto que se abre desde «Terminal» en la barra de arriba (todas las páginas). Escribe `help`.
// Todo va en el propio script: sin red, sin cookies, sin datos de visitantes. Los textos se escriben con textContent, nunca como HTML.
(() => {
  const nav = document.querySelector('.nav-links, .case-nav ul, nav[aria-label="Sections"] ul');
  if (!nav) return;

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
  const li = document.createElement('li');
  const open = document.createElement('a');
  open.href = '#terminal';
  open.className = 'term-open';
  open.setAttribute('aria-haspopup', 'dialog');
  open.setAttribute('aria-controls', 'term');
  open.textContent = 'Terminal';
  li.append(open);
  nav.append(li);

  // Segunda entrada: un enlace «Terminal» en el pie de página (también en móvil y en las páginas sin barra visible)
  const triggers = [open];
  let lastTrigger = open;
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
      '',
      'Machine mode is the plain-text version of the site: for people who prefer text, crawlers and AI agents.',
    ],
    ls: () => ['home/  about/  room.html  machine/  project/', '  lexus-electrified/  schweppes/  soap-and-glory-vanilla/'],
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
  function openTerm() {
    panel.hidden = false;
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
    lastTrigger.focus({ preventScroll: true });
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
