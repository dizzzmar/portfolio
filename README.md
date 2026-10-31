# dizmar — portfolio de Mario Diz

Web estática: HTML, CSS y JavaScript sencillos, **sin instalar nada ni compilar**. Lo que ves en el repositorio es exactamente lo que se publica en <https://www.dizmar.xyz> (GitHub Pages). Cuando un cambio llega a la rama `main`, la web se actualiza en un par de minutos.

## Cómo está organizado

```
index.html · room.html · 404.html      Home (el tomate gira con su nombre y baja a la lista Work), The room (habitación 3D) y «no encontrada»
about/ · faq/ · privacy/               About, FAQs y Privacidad (cada una, un index.html)
playground/                            Playground: index.html (portada) y las dos herramientas, plant-lab/ y brush-lab/ (cada una, un index.html); el dibujo se hace en el navegador
posters/index.html                     Collage de trabajos personales y ficticios; cada pieza abre un visor con todo su mini-proyecto (js/posters.js)
machine/index.html                     Modo máquina: toda la web en texto (oculto por ahora, ver abajo)
project/<nombre>/index.html            Una ficha por proyecto → www.dizmar.xyz/project/<nombre>/
                                       (lexus-electrified · schweppes · schweppes-the-gentlemen · soap-and-glory-vanilla · enmad)
templates/                             Plantillas para copiar (no son páginas de la web)
  project-template/index.html          Ficha de proyecto nueva, con todo explicado
  project-card.html                    La fila de la lista Work de la home para un proyecto nuevo (8 miniaturas)
experiments/                           Estudios sueltos (tomato-grass, tomato-juggler); no forman parte de la web
scripts/                               Utilidades de Blender para generar archivos de la habitación
robots.txt · sitemap.xml · llms.txt    Para buscadores y agentes de IA
CNAME · favicon.ico · apple-touch-icon.png
CLAUDE.md · PRODUCT.md · DESIGN.md     Reglas para Claude, contexto del producto y sistema de diseño
.github/workflows/secret-scan.yml      Comprueba en cada cambio que no se suba ninguna clave (gitleaks)

css/                                   Aspecto. Un archivo por zona; los comunes se cargan en todas las páginas
  tokens.css · typography.css          Colores, tamaños y tipografías; estilos de texto compartidos
  nav-logo.css · nav-links.css · menu.css · footer.css · cursor.css · transitions.css   Piezas comunes: tomate y enlaces de la barra, panel «Menu», pie, cursor y transiciones entre páginas
  home.css · home-loading.css          La home y su pantalla de carga
  case.css · case-layout.css · palettes.css   Fichas de proyecto y posters: base (cabecera fija, reproductor, More works), estructura (título que avanza, columna fija, partes) y colores propios de cada proyecto
  posters.css · playground.css · about.css · faq.css · privacy.css · not-found.css · contact-sachet.css · terminal.css
  room.css · room-wii.css · room-pokemon.css   La habitación, la Wii y la «Pokémon collection»

js/                                    Comportamiento (sin dependencias ni compilación)
  home-*.js                            La home: tomate 3D, introducción, lista Work y pantalla de carga
  playground/                          Plant Lab y Brush Lab: motor del pincel y del papel (engine.js), la planta (plant-engine.js), formas de prueba, controles comunes (lab-kit.js) y un script por página
  case.js · case-index.js · posters.js Fichas (aparición, reproductor, volver, índice de ENMAD) y visor de posters
  room.js · room/                      La habitación 3D; room/ agrupa la Wii, la «Pokémon collection», la iluminación y la carga
  menu.js · cursor.js · smooth-scroll.js · transitions.js · terminal.js · nav-tomato.js · contact-sachet.js · sachet.js   Comunes a casi todas las páginas
  about.js · not-found-*.js · mode-switch.js   Páginas sueltas; mode-switch.js es la píldora HUMAN | MACHINE, aparcada (ver «Modo máquina»)

assets/                                Imágenes, vídeos y modelos 3D
  fonts/ · images/ · brands/ · loading/   Tipografías, imágenes comunes, logos de clientes y animaciones de la pantalla de carga
  models/                              Tomate 3D y sobre DIZ (diz-ketchup/), con sus fuentes
  room/                                Habitación (shelf-web.glb es la que se carga; shelf.glb es la fuente), cartas Pokémon, discos de la Wii…
  projects/<nombre>/                   Imágenes y vídeos de cada proyecto
  posters/<proyecto>/                  Imágenes del collage de posters (miniatura de 720 px y vista grande)
  vendor/three/                        three.js alojado en el propio repositorio
```

Regla fácil: **textos → archivos `.html`**, **aspecto → `.css`**, **animaciones → `.js`**.

**Al cambiar un `.css` o un `.js`:** en los HTML, los enlaces llevan `?v=20261017b` al final (por ejemplo `/css/home.css?v=20261017b`). Cambia ese número (por ejemplo, a la fecha del día) en todas las páginas para que los navegadores descarguen la versión nueva en vez de usar la que tienen guardada.

## Tareas habituales

### Cambiar un texto de una fila de la lista Work de la home
Abre `index.html` y busca `work-list` (Ctrl+F). Cada proyecto es un bloque `<li class="work-item">`. Cambia el año (`wi-date`), el nombre (`wi-name`) o las etiquetas (`wi-tags`). Cada fila lleva siempre 8 miniaturas (`wi-slot`), sin huecos.

### Cambiar el texto de una página de proyecto
Abre `project/<nombre>/index.html`. Los trozos editables están marcados con comentarios (`EDITA:`): nombre, año y cliente, datos de la columna izquierda, texto y las imágenes o vídeos de cada parte.

### Crear un proyecto nuevo
1. Duplica `templates/project-template` y muévela a `project/<nombre-del-proyecto>/` (sin espacios ni acentos, con guiones).
2. Crea `assets/projects/<nombre-del-proyecto>/` y sube allí las imágenes (`.webp`, en dos tamaños: 800 y 1600 px de ancho) y los vídeos (`.mp4`).
3. En el nuevo `index.html`, cambia `nombre-del-proyecto` por el nombre real (Ctrl+F, "reemplazar todo") y edita los textos marcados con `EDITA:`. La plantilla trae ejemplos de película, clip en bucle e imágenes: deja los que uses y borra el resto.
   Colores propios (opcional): añade `data-palette="nombre"` a `<html>` y define esa paleta en `css/palettes.css` (hay cinco de ejemplo; comprueba el contraste). Sin él, la ficha es blanca.
4. Abre `templates/project-card.html`, copia el `<li>` y pégalo en la lista `work-list` de `index.html`, donde quieras que salga (el orden en el código = el orden en la página). Cada fila lleva siempre 8 miniaturas, sin huecos.
5. Cuando esté listo, borra la línea `<meta name="robots" content="noindex">` de la página del proyecto y añade su dirección a `sitemap.xml`.
6. Si cambias un `.css` o un `.js`, sube el número `?v=` de sus enlaces en todas las páginas.

### Cambiar o añadir imágenes
Súbelas a `assets/projects/<proyecto>/` y cambia la ruta (`src`) y la descripción (`alt`) en el HTML. Consejo: `.webp`, hasta 1600 px de ancho, y una versión de 800 px para las miniaturas (así la web carga rápido).

### Cambiar los textos de la habitación o la canción de "Now playing"
Están en `js/room.js` (objetos `nowPlaying` y `lastWatched`, y lista `destinations`). La imagen de la pegatina es `assets/room/now-playing-sticker.webp`; el póster de la última película vista, que aparece al acercarse al póster de la pared, es `assets/room/film-poster.webp` (vertical, unos 840×1200).

Los tres juegos de Recently played están en `assets/room/discs/games.json`. Las carátulas se suben a esa misma carpeta y se indica su nombre en `artwork`; mientras sea `null`, se ve un disco con una etiqueta provisional. La animación de la Wii está separada en `js/room/wii-player.js`. Más detalles en `assets/room/README.md`.

### Modo máquina (oculto por ahora)
`machine/index.html` es una versión en texto de toda la web, ligera para conexiones lentas. Ahora mismo está **oculta**: no hay enlaces a ella, no está en `sitemap.xml` y lleva `noindex`. Para volver a activarla:
1. Añade antes de `</body>` en cada página (home, proyectos, room, 404 y la plantilla): `<script src="/js/mode-switch.js" defer></script>` (pone la píldora HUMAN | MACHINE y el aviso de conexión lenta).
2. Borra la línea `noindex` de `machine/index.html` y añade `/machine/` a `sitemap.xml`.
3. Revisa que sus textos sigan al día con la web.

### Buscadores (Google): qué tiene que llevar cada página
Cada página pública lleva en su `<head>`: `<title>`, `<meta name="description">`, `<link rel="canonical">` (con la dirección completa y la barra final, por ejemplo `https://www.dizmar.xyz/about/`), las etiquetas `og:` y `twitter:card` (lo que se ve al compartir el enlace) y, en las páginas de proyecto, los datos estructurados (`application/ld+json`). Además:
- Toda página nueva se añade a `sitemap.xml` (y se resume en `llms.txt`).
- Una página en borrador lleva `<meta name="robots" content="noindex">` y NO está en el sitemap (hoy: `machine/`; las plantillas están además bloqueadas en `robots.txt`). Al publicarla, se borra esa línea y se añade al sitemap.
- Los enlaces del menú llevan la barra final (`/about/`) para no pasar por una redirección.
- Google no se entera solo: hay que dar de alta la web en Google Search Console y enviar `https://www.dizmar.xyz/sitemap.xml` (con tu cuenta de Google, en search.google.com/search-console).

### Cambiar el correo de «Contact»
«Contact» del menú es un enlace `mailto:` directo: al pulsarlo se abre el programa de correo del visitante con la dirección y el asunto ya puestos. No hay página intermedia. La dirección está en el menú de todas las páginas (y en la de Privacy y About). Para cambiarla, busca `mailto:hey.mariodiz@gmail.com` y cámbiala en todos los archivos.

### Cambiar el texto de la página 404
`404.html`, el párrafo con clase `message`.

## Cosas a tener en cuenta
- Las rutas empiezan por `/` (por ejemplo `/assets/images/sky.webp`): significan "desde la raíz de la web".
- Si cambias el nombre de la carpeta de un proyecto, cambia también el enlace en la card de la home y la flecha "← Back" del proyecto.
- El diseño de las páginas de proyecto es común (`css/case.css`): un cambio ahí afecta a todos los proyectos.
- Para ver cómo queda en tu ordenador, abre una terminal en esta carpeta y ejecuta `python3 -m http.server 8000`; después entra en <http://localhost:8000>. (No vale abrir el `.html` con doble clic: las rutas con `/` necesitan un servidor.)
- Los tomates 3D usan la librería [three.js](https://threejs.org) (licencia MIT), alojada en `assets/vendor/three/` (no se pide a ningún tercero). Para actualizarla: copiar la misma versión desde npm (`three@x.y.z`) a esa carpeta, con los archivos de `examples/jsm` que se importan, y cambiar los `importmap` de las páginas.
