// PÁGINA TEMPORAL "WE'RE COOKING" · mientras la web está en obras, cada página manda a /cooking/.
// Para verla de verdad en tu móvil u ordenador abre una vez www.dizmar.xyz/?preview
// (se recuerda en ese navegador); www.dizmar.xyz/?nopreview la vuelve a tapar.
// Ojo: no es una contraseña, solo evita que los visitantes vean la web a medias.
// Se carga lo primero en el <head> de cada página: <script src="/js/gate.js?v=..."></script>
(() => {
  const KEY = 'dizmar-preview';
  let ok = false;
  try {
    const q = new URLSearchParams(location.search);
    if (q.has('preview')) localStorage.setItem(KEY, '1');
    if (q.has('nopreview')) localStorage.removeItem(KEY);
    ok = localStorage.getItem(KEY) === '1';
  } catch (e) { /* sin almacenamiento: se tapa */ }
  if (!ok) location.replace('/cooking/');
})();
