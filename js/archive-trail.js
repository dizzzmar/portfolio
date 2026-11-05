// DIGITAL ARCHIVE y POSTERS · estela de píxeles que sigue al cursor (índice y muros de colección, en blanco sobre fondo oscuro; Posters, en tinta oscura sobre fondo claro: <body data-trail="ink">). El motor es js/pixel-trail.js (de React Bits, en JavaScript puro).
// Un solo lienzo fijo a pantalla completa, por encima del contenido y por debajo de la barra y del visor de piezas, sin recibir clics.
// Solo con ratón; con «reducir movimiento», con ahorro de datos o sin WebGL2 no se crea nada. EDITA los valores de abajo para cambiar su carácter.
import { createPixelTrail } from '/js/pixel-trail.js?v=20261121trail1';

const fine = matchMedia('(hover: hover) and (pointer: fine)');
const calm = matchMedia('(prefers-reduced-motion: reduce)');
if (fine.matches && !calm.matches && !navigator.connection?.saveData) {
  const host = document.createElement('div');
  host.className = 'archive-trail';
  host.setAttribute('aria-hidden', 'true');
  document.body.append(host);
  const trail = createPixelTrail(host, {
    gridSize: 240, trailSize: 0.1, maxAge: 1000, interpolate: 5,   // gridSize: cuántos puntos caben a lo ancho (más = puntos más pequeños)
    color: document.body.dataset.trail === 'ink' ? '#0c0c0b' : '#ffffff', shape: 'circle', gap: 0.5, decay: 'dither', shine: 0, glow: 0, gooeyFilter: false,
  });
  if (!trail) host.remove();
}
