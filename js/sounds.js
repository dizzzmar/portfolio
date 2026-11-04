// SONIDOS · un «tic» muy suave al pasar el ratón por un enlace o botón y un «clic» al pulsarlo.
// Apagado por defecto: quien visita lo enciende con «Sound off / Sound on» en el pie grande (se acuerda la elección en este navegador).
// Detalles: solo con ratón (no en táctil); los navegadores no dejan sonar hasta el primer clic en la página, así que el «tic» suena a partir de ahí;
// volumen bajo, con un pequeño cambio de tono al azar para que no suene idéntico; los archivos son locales (assets/sounds/, Kenney, CC0).
// Sin Web Audio o sin ratón no hace nada. EDITA aquí el volumen (VOLUME) y los sonidos (SOUNDS).
(() => {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const KEY = 'dizmar-sound';
  const VOLUME = { tick: 0.22, click: 0.32 };                         // 0 a 1
  const SOUNDS = { tick: ['tick-1', 'tick-2'], click: ['click'] };    // nombres en assets/sounds/
  const HOT = 'a[href], button, summary, label, select, [role="button"]';
  const MIN_GAP = 55;                                                 // ms mínimos entre dos «tic»
  const ext = document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'm4a';

  let on = false;
  try { on = localStorage.getItem(KEY) === '1'; } catch (e) { /* storage blocked */ }
  let ctx = null, loading = null, lastTarget = null, lastTick = 0, turn = 0;
  const buffers = {};

  const awake = () => {                                               // se crea al primer gesto del visitante (antes el navegador lo bloquea)
    if (!ctx) ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  };
  const load = () => {
    if (loading) return loading;
    const names = [...SOUNDS.tick, ...SOUNDS.click];
    loading = Promise.all(names.map((n) => fetch(`/assets/sounds/${n}.${ext}`).then((r) => r.arrayBuffer()).then((b) => new Promise((ok, no) => ctx.decodeAudioData(b, ok, no))).then((buf) => { buffers[n] = buf; }))).catch(() => { loading = null; });
    return loading;
  };
  const play = (kind) => {
    if (!on || !ctx || ctx.state !== 'running') return;
    const list = SOUNDS[kind], name = kind === 'tick' ? list[turn++ % list.length] : list[0], buf = buffers[name];
    if (!buf) return;
    const src = ctx.createBufferSource(), gain = ctx.createGain();
    src.buffer = buf; src.playbackRate.value = 0.94 + Math.random() * 0.12;
    gain.gain.value = VOLUME[kind];
    src.connect(gain).connect(ctx.destination); src.start();
  };

  // Pasar por encima: un «tic» cuando el puntero entra en un enlace o botón distinto del anterior
  addEventListener('pointerover', (e) => {
    if (!on || e.pointerType !== 'mouse') return;
    const el = e.target instanceof Element ? e.target.closest(HOT) : null;
    if (el === lastTarget) return;
    lastTarget = el;
    const now = performance.now();
    if (el && !el.matches(':disabled, [aria-disabled="true"]') && now - lastTick > MIN_GAP) { lastTick = now; play('tick'); }
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { lastTarget = null; });   // al salir de la ventana, el siguiente enlace vuelve a sonar
  // Pulsar: un «clic»; además, el primer gesto despierta el audio si el sonido ya estaba encendido
  addEventListener('pointerdown', (e) => {
    if (!on || e.pointerType !== 'mouse') return;
    awake(); load();
    if (e.target instanceof Element && e.target.closest(HOT)) play('click');
  }, { passive: true, capture: true });

  // El interruptor: «Sound off / Sound on», dentro de la fila de enlaces del pie grande (solo en las páginas que lo llevan)
  const links = document.querySelector('.bf-links');
  if (links) {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'bf-sound';
    const paint = () => { button.textContent = on ? 'Sound on' : 'Sound off'; button.setAttribute('aria-pressed', String(on)); };
    paint();
    button.addEventListener('click', () => {
      on = !on;
      try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* storage blocked */ }
      paint();
      if (on) { awake(); load().then(() => play('click')); }
    });
    li.append(button); links.append(li);
  }
})();
