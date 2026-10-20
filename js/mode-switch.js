// Shared view switch. Runs in the head, before images, video and WebGL.
(() => {
  const KEY = 'dizmar-view';
  const machine = location.pathname.startsWith('/machine/');
  const params = new URLSearchParams(location.search);
  function safePage(value) {
    try {
      const url = new URL(value || '/', location.origin);
      if (url.origin === location.origin && !url.pathname.startsWith('/machine')) return url.pathname + url.hash;
    } catch (_) { /* Invalid paths return home. */ }
    return '/';
  }
  let page = machine ? safePage(params.get('page')) : location.pathname + location.hash;
  const machineURL = path => '/machine/?page=' + encodeURIComponent(safePage(path));
  const humanURL = path => {
    const url = new URL(safePage(path), location.origin);
    url.searchParams.set('view', 'human');
    return url.pathname + url.search + url.hash;
  };
  let choice = '';
  try { choice = localStorage.getItem(KEY) || ''; } catch (_) { /* Private browsing. */ }
  if (!machine && params.get('view') === 'human') {
    choice = 'human';
    try { localStorage.setItem(KEY, choice); } catch (_) { /* Storage optional. */ }
    params.delete('view');
    history.replaceState(null, '', location.pathname + (params.size ? '?' + params : '') + location.hash);
  }
  const connection = navigator.connection;
  const slow = () => connection && (connection.saveData || /^(slow-2g|2g|3g)$/.test(connection.effectiveType) ||
    (connection.downlink > 0 && connection.downlink < 0.8));
  let switching = false;
  function switchAutomatically(reason) {
    if (machine || choice === 'human' || switching) return;
    switching = true;
    location.replace(machineURL(location.pathname + location.hash) + '&reason=' + reason);
  }
  if (!machine) {
    if (choice === 'machine') switchAutomatically('preference');
    else if (slow()) switchAutomatically('connection');
    // Safari has no Network Information API: a page still loading after eight
    // seconds gets the same lightweight fallback. A manual Human choice wins.
    if (!switching && choice !== 'human' && document.readyState !== 'complete') {
      const timeout = setTimeout(() => switchAutomatically('loading'), Math.max(0, 8000 - performance.now()));
      addEventListener('load', () => clearTimeout(timeout), { once: true });
      if (performance.getEntriesByType('navigation')[0]?.responseStart > 4000) switchAutomatically('connection');
    }
    connection?.addEventListener?.('change', () => { if (slow()) switchAutomatically('connection'); });
  }
  window.dizmarView = { page, machineURL, humanURL };
  function mount() {
    const style = document.createElement('style');
    style.textContent = `
      .view-switch{position:fixed;z-index:1000;bottom:max(16px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);display:flex;padding:3px;border:1px solid #c52020;border-radius:999px;background:#fff;color:#c52020;font:11px/1.2 ui-monospace,SFMono-Regular,Consolas,monospace;text-transform:uppercase;letter-spacing:.03em}
      .view-switch a{display:flex;align-items:center;justify-content:center;min-height:32px;padding:0 14px;border-radius:999px;color:inherit;text-decoration:none;cursor:pointer}
      .view-switch a[aria-current="true"]{background:#c52020;color:#fff}
      .view-switch a:hover{background:#ffecec;color:#c52020}
      .view-switch a:focus-visible{outline:2px solid #c52020;outline-offset:4px}
      @media(pointer:coarse){.view-switch a{min-height:40px}}
    `;
    document.head.append(style);
    const nav = document.createElement('nav');
    nav.className = 'view-switch';
    nav.setAttribute('aria-label', 'View mode');
    for (const [label, active] of [['Human', !machine], ['Machine', machine]]) {
      const link = document.createElement('a');
      link.textContent = label;
      link.href = label === 'Machine' ? machineURL(page) : humanURL(page);
      if (active) link.setAttribute('aria-current', 'true');
      link.addEventListener('click', () => {
        try { localStorage.setItem(KEY, label.toLowerCase()); } catch (_) { /* Storage optional. */ }
      });
      nav.append(link);
    }
    document.body.append(nav);
    // Work changes the hash without reloading the landing.
    const refresh = () => {
      if (machine) return;
      page = location.pathname + location.hash;
      nav.querySelector('a:last-child').href = machineURL(page);
    };
    addEventListener('hashchange', refresh);
    document.addEventListener('work-requested', () => {
      page = '/#work';
      nav.querySelector('a:last-child').href = machineURL(page);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
