// TODA LA WEB · píldora HUMAN | MACHINE y aviso de conexión lenta.
// - La píldora (abajo a la derecha; en la habitación, arriba a la derecha) lleva al modo máquina:
//   /machine/, la versión en texto de toda la web, que carga al instante.
// - Si la conexión es lenta (o el visitante tiene activado el ahorro de datos), o la página tarda
//   más de 5 segundos en cargar, aparece un aviso que le sugiere el modo máquina. Decide él.
// Se añade con una línea en cada página: <script src="/js/mode-switch.js" defer></script>

(() => {
  const css = `
  .mode-switch { position: fixed; z-index: 30; right: 16px; bottom: 16px; display: flex; align-items: center; gap: 8px; flex-direction: column; align-items: flex-end; font: 11px/1 ui-monospace, "SF Mono", Menlo, Consolas, monospace; letter-spacing: .04em; text-transform: uppercase; }
  .mode-switch.top { bottom: auto; top: calc(var(--nav-h, 64px) + 12px); flex-direction: column-reverse; }
  .mode-pill { display: flex; padding: 3px; border-radius: 999px; background: #e9efe4; box-shadow: 0 6px 20px rgba(0, 25, 10, .3); }
  .mode-pill a, .mode-pill span { padding: 6px 11px 5px; border-radius: 999px; color: #2c4e37; text-decoration: none; }
  .mode-pill span { background: #2c4e37; color: #e9efe4; }
  .mode-pill a:hover { background: rgba(44, 78, 55, .14); }
  .mode-pill a:focus-visible, .mode-hint a:focus-visible, .mode-hint button:focus-visible { outline: 2px solid #2c4e37; outline-offset: 2px; }
  .mode-hint { display: flex; align-items: center; gap: 10px; max-width: min(320px, calc(100vw - 32px)); padding: 10px 12px; border-radius: 14px; background: #2c4e37; color: #e9efe4; line-height: 1.4; box-shadow: 0 10px 30px rgba(0, 25, 10, .35); }
  .mode-hint a { color: #e9efe4; text-underline-offset: 3px; white-space: nowrap; }
  .mode-hint button { flex: none; width: 22px; height: 22px; border: 0; border-radius: 50%; background: rgba(233, 239, 228, .15); color: #e9efe4; font: inherit; font-size: 13px; cursor: pointer; }
  .mode-hint[hidden] { display: none; }
  @media (prefers-reduced-motion: no-preference) { .mode-hint { animation: mode-hint-in .35s cubic-bezier(.2, .8, .2, 1); } }
  @keyframes mode-hint-in { from { opacity: 0; transform: translateY(8px); } }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const box = document.createElement('div');
  box.className = 'mode-switch' + (location.pathname.startsWith('/room') ? ' top' : '');
  box.innerHTML =
    '<div class="mode-hint" role="status" hidden><span>Slow connection? <a href="/machine/">Try the light version →</a></span>' +
    '<button type="button" aria-label="Dismiss">×</button></div>' +
    '<nav class="mode-pill" aria-label="View mode"><span aria-current="page">Human</span><a href="/machine/">Machine</a></nav>';
  document.body.appendChild(box);

  // ---------- Slow connection hint ----------
  const hint = box.querySelector('.mode-hint');
  const KEY = 'dizmar-slow-hint-dismissed';
  let dismissed = false;
  try { dismissed = sessionStorage.getItem(KEY) === '1'; } catch (e) { /* storage blocked: just show it */ }
  const show = () => { if (!dismissed) hint.hidden = false; };
  hint.querySelector('button').addEventListener('click', () => {
    hint.hidden = true;
    dismissed = true;
    try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* ignore */ }
  });

  // Chrome and Android tell us the connection type; Safari doesn't, so a slow load also counts
  const net = navigator.connection;
  if (net && (net.saveData || /(^|-)2g$|^3g$/.test(net.effectiveType || ''))) show();
  if (document.readyState !== 'complete') {
    const timer = setTimeout(show, 5000);
    addEventListener('load', () => clearTimeout(timer), { once: true });
  }
})();
