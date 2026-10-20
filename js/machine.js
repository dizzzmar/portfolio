// Text-only mirrors: no images, videos, WebGL or font downloads.
(() => {
  const view = window.dizmarView;
  if (!view) return;
  const routes = {
    '/': ['home', 'Machine-readable index'],
    '/#work': ['work', 'Selected work'],
    '/about/': ['about', 'About'],
    '/contact/': ['contact', 'Contact'],
    '/room.html': ['room', 'The room'],
    '/stamps/': ['stamps', 'Stamps'],
    '/privacy/': ['privacy', 'Privacy'],
    '/project/lexus-electrified/': ['lexus', 'Lexus — Electrified'],
    '/project/soap-and-glory-vanilla/': ['soap', 'Soap & Glory — Vanillalicious'],
    '/project/schweppes/': ['schweppes', 'Schweppes'],
  };
  const normalized = view.page.replace(/\/index\.html(?=#|$)/, '/');
  const [key, title] = routes[normalized] || routes[normalized.split('#')[0]] || ['missing', 'Page not found'];
  document.title = title + ' — Machine view · dizmar';
  document.getElementById('machine-title').textContent = title;
  for (const section of document.querySelectorAll('[data-page]')) {
    section.hidden = !section.dataset.page.split(' ').includes(key);
  }
  for (const link of document.querySelectorAll('[data-route]')) {
    if (link.dataset.route === normalized || (['lexus', 'soap', 'schweppes'].includes(key) && link.dataset.route === '/#work')) link.setAttribute('aria-current', 'page');
  }
  document.getElementById('human-page').href = view.humanURL(view.page);
  const reason = new URLSearchParams(location.search).get('reason');
  if (reason === 'connection' || reason === 'loading') {
    const notice = document.getElementById('machine-notice');
    notice.textContent = 'Slow connection detected. Text view is on. Choose Human below to return to the full experience.';
    notice.hidden = false;
  }
})();
