// DIGITAL ARCHIVE · estela de píxeles blancos que sigue al cursor (índice y muros de colección). El motor es js/pixel-trail.js (de React Bits, en JavaScript puro).
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
    gridSize: 120, trailSize: 0.1, maxAge: 500, interpolate: 5,
    color: '#ffffff', shape: 'circle', gap: 0.55, decay: 'dither', shine: 0, glow: 0, gooeyFilter: false,
  });
  if (!trail) host.remove();
}
