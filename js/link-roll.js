// LINK ROLL · al pasar el ratón por un enlace de texto, sus letras suben una a una y la palabra se vuelve a escribir desde abajo
// (como los enlaces de donut-studio.com). El movimiento está en css/link-roll.css; este script solo parte el texto en letras.
//  · El texto del enlace no cambia (textContent sigue igual) y el enlace conserva su nombre accesible (aria-label con el mismo texto).
//  · Se salta lo que no es solo texto: tarjetas de proyecto, miniaturas, logos, nombres que ya tienen su propio efecto y los controles de los reproductores.
//  · Sin efecto con "reducir movimiento". Los enlaces que se crean después (el panel del menú) se preparan en cuanto aparecen.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const SKIP = '.work-item, .pz-tile, .mw-card, .case-back, .case-logo, .nav-logo, .menu-logo, .pz-set, .client-list, .pg-btn, .player, .sachet-in, [data-cursor], [data-no-roll]';
  const segment = window.Intl && Intl.Segmenter ? ((s) => [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)].map((x) => x.segment)) : (s) => Array.from(s);

  function prepare(a) {
    if (a.dataset.roll || a.closest(SKIP)) return;
    // Solo texto; o un único <span> con solo texto (los enlaces grandes del menú llevan su texto en un span que hace de máscara)
    const host = a.children.length === 1 && a.children[0].tagName === 'SPAN' && !a.children[0].children.length ? a.children[0] : a;
    if (host.children.length || [...host.childNodes].some((n) => n.nodeType !== 3)) return;
    const text = host.textContent;
    if (!text.trim() || text.length > 48) return;
    a.dataset.roll = '';
    if (!a.hasAttribute('aria-label') && !a.getAttribute('aria-labelledby')) a.setAttribute('aria-label', text.replace(/\s+/g, ' ').trim());
    const roll = document.createElement('span');
    roll.className = 'roll'; roll.setAttribute('aria-hidden', 'true');
    segment(text).forEach((letter, i) => {
      const s = document.createElement('span');
      s.textContent = letter; s.style.setProperty('--i', i);
      roll.append(s);
    });
    host.replaceChildren(roll);
  }
  const run = (root) => root.querySelectorAll('a[href]').forEach(prepare);

  const start = () => {
    run(document);
    let queued = false;
    new MutationObserver(() => {
      if (queued) return; queued = true;
      requestAnimationFrame(() => { queued = false; run(document); });
    }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
