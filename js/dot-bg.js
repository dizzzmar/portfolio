// FONDO DE PUNTOS · pone el campo de puntos (js/dot-field.js, de React Bits en JavaScript puro) detrás de la página: lente que sigue al cursor, onda lenta y centelleos.
// Se activa con atributos en <body>:
//   data-dot-bg="white"  puntos blancos (páginas oscuras: muros del Digital Archive, Playground)
//   data-dot-bg="ink"    puntos de tinta oscura (páginas claras: Posters)
//   data-dot-z="0"       capa del fondo (por defecto -1: detrás del contenido; las páginas con <html> pintado, como el archivo, usan 0 y el contenido va después en el HTML)
// Un solo lienzo fijo a pantalla completa que no recibe clics. Sin WebGL2 o con ahorro de datos no se crea nada (la página queda como estaba).
// EDITA los valores de LOOKS para cambiar el carácter: tamaño y hueco de los puntos, radio de la lente, opacidad base, onda y centelleo.
import { createDotField } from '/js/dot-field.js?v=20261121dots1';

const LOOKS = {
  white: { gradientFrom: '#ffffff', gradientTo: '#ffffff', glowColor: '#ffffff', baseOpacity: 0.45 },
  ink: { gradientFrom: '#0c0c0b', gradientTo: '#0c0c0b', glowColor: '#0c0c0b', baseOpacity: 0.4, lightMode: true },
};
const COMMON = { dotRadius: 0.5, dotSpacing: 11, cursorRadius: 130, bulgeStrength: 0.6, glowRadius: 160, glowIntensity: 0, waveAmplitude: 7.5, speed: 1.05, sparkle: true };

const look = LOOKS[document.body.dataset.dotBg];
if (look && !navigator.connection?.saveData) {
  const host = document.createElement('div');
  host.className = 'dot-bg';
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = `position:fixed;inset:0;z-index:${document.body.dataset.dotZ ?? -1};pointer-events:none`;
  document.body.prepend(host);
  if (!createDotField(host, { ...COMMON, ...look })) host.remove();
}
