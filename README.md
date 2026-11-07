# dizmar — portfolio de Mario Diz

Web estática: HTML, CSS y JavaScript sencillos, **sin instalar nada ni compilar**. Lo que ves en el repositorio es exactamente lo que se publica en <https://www.dizmar.xyz> (GitHub Pages). Cuando un cambio llega a la rama `main`, la web se actualiza en un par de minutos.

## Cómo está organizado

```
index.html · room.html · 404.html      Home (el tomate gira con su nombre y baja a la lista Projects), The room (habitación 3D) y «no encontrada»
about/ · faq/ · privacy/               About, FAQs y Privacidad (cada una, un index.html)
playground/index.html                  Playground: el menú de experimentos (mismo diseño que el índice del Digital Archive). El sandbox de nodos (Plant Lab y Brush Lab) a pantalla completa está en playground/plant-lab/index.html; el dibujo se hace en el navegador
playground/island/index.html             Island: el mundo isométrico en pixel art a pantalla completa (js/island.js + css/island.css, escena en js/about-scene.js)
posters/index.html                     Collage de trabajos personales y ficticios; cada pieza abre un visor con todo su mini-proyecto (js/posters.js)
js/sounds.js · assets/sounds/   Sonidos de los enlaces (tic al pasar, clic al pulsar; encendidos por defecto, se apagan con «Sound on» en el pie grande; salvo en machine/, suena en todas las páginas). Son de Kenney (CC0, ver assets/sounds/CREDITS.txt); el volumen y los archivos se editan arriba de sounds.js
js/dot-field.js · js/dot-bg.js   Fondo de puntos (motor de React Bits en JavaScript puro + montaje): Posters y Playground; se activa con data-dot-bg="white|ink" en <body> y los valores se editan arriba de dot-bg.js
js/pixel-trail.js · js/archive-trail.js   Estela de píxeles blancos del Digital Archive (motor de React Bits en JavaScript puro + montaje; los valores se editan arriba de archive-trail.js)
archive/think-pieces/                  Ensayos del Digital Archive (blanco, serifa y rojo; css/essays.css): un índice y una carpeta por ensayo (ahora, solo «una-oda-a-la-nostalgia»)
archive/index.html · archive/<colección>/index.html   Digital Archive: el índice de colecciones y el muro de cada colección (ahora fruit-stickers y fave-album-covers); piezas en assets/archive/<colección>/items.json
machine/index.html                     Modo máquina: toda la web en texto (oculto por ahora, ver abajo)
project/<nombre>/index.html            Una ficha por proyecto → www.dizmar.xyz/project/<nombre>/
                                       (lexus-electrified · schweppes · schweppes-the-gentlemen · soap-and-glory-vanilla · enmad · plant-lab, que lleva el sandbox dentro)
templates/                             Plantillas para copiar (no son páginas de la web)
  project-template/index.html          Ficha de proyecto nueva, con todo explicado
  project-card.html                    La fila de la lista Projects de la home para un proyecto nuevo (imagen o vídeo grande)
experiments/                           Estudios sueltos (tomato-grass, tomato-juggler); no forman parte de la web
scripts/                               Utilidades de Blender para generar archivos de la habitación
robots.txt · sitemap.xml · llms.txt    Para buscadores y agentes de IA
CNAME · favicon.ico · apple-touch-icon.png
CLAUDE.md · PRODUCT.md · DESIGN.md     Reglas para Claude, contexto del producto y sistema de diseño
docs/design/                            Detalle del diseño por zona (chrome, projects, about, playground, archive, contact, room); DESIGN.md solo lleva el sistema
.github/workflows/secret-scan.yml      Comprueba en cada cambio que no se suba ninguna clave (gitleaks)

css/                                   Aspecto. Un archivo por zona; los comunes se cargan en todas las páginas
  tokens.css · typography.css          Colores, tamaños y tipografías; estilos de texto compartidos
  nav-logo.css · nav-links.css · menu.css · footer.css · cursor.css · transitions.css   Piezas comunes: tomate y enlaces de la barra, panel «Menu», pie, cursor y transiciones entre páginas
  home.css · home-loading.css          La home y su pantalla de carga
  case.css · case-layout.css · palettes.css   Fichas de proyecto y posters: base (cabecera fija, reproductor, More works), estructura (título que avanza, columna fija, partes) y colores propios de cada proyecto
  posters.css · sandbox.css · about.css · faq.css · privacy.css · not-found.css · contact-sachet.css · terminal.css
  room.css · room-wii.css · room-pokemon.css   La habitación, la Wii y la «Pokémon collection»

js/                                    Comportamiento (sin dependencias ni compilación)
  home-*.js                            La home: tomate 3D, introducción, lista Projects y pantalla de carga
  big-foot.js                          El footer grande, el único de la web («DIZMAR» enorme cuyas piezas se recomponen con el scroll; estilos en css/big-foot.css; su bloque HTML es el mismo en cada página)
  playground/                          El sandbox de nodos: motor del pincel y del papel (engine.js), la planta (plant-engine.js), dibujo de la hoja (render.js), editor genérico (editor.js), tipos de nodo (nodes.js), grafo inicial (sandbox.js) y mount.js, que lo monta en cada página
  case.js · case-index.js · posters.js Fichas (aparición, reproductor, volver, índice de ENMAD) y visor de posters
  room.js · room/                      La habitación 3D; room/ agrupa la Wii, la «Pokémon collection», la iluminación y la carga
  menu.js · link-roll.js · cursor.js · smooth-scroll.js · transitions.js · terminal.js · nav-tomato.js · contact-sachet.js · sachet.js   Comunes a casi todas las páginas
  about.js · about-scene.js + island.js (la isla en pixel art de /playground/island/, three.js) · pixel-load.js (carga en mosaico: .px) · not-found-*.js · mode-switch.js   Páginas sueltas; mode-switch.js es la píldora HUMAN | MACHINE, aparcada (ver «Modo máquina»)

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

### Cambiar un texto de una fila de la lista Projects de la home
Abre `index.html` y busca `work-list` (Ctrl+F). Cada proyecto es un bloque `<li class="work-item">`. Cambia el año (`wi-date`), el nombre (`wi-name`) o las etiquetas (`wi-tags`). Cada fila lleva una imagen o un vídeo grande (`wi-tile`), o tres piezas verticales en fila con `--cols: 3`. La página tiene dos columnas: el título «Projects» fijo a la izquierda y los proyectos a la derecha. Al cambiar el recuento de proyectos, actualiza el `(7)` del título.

### Cambiar el texto de una página de proyecto
Abre `project/<nombre>/index.html`. Los trozos editables están marcados con comentarios (`EDITA:`): nombre, año y cliente, datos de la columna izquierda, texto y las imágenes o vídeos de cada parte.

### Añadir piezas o una colección al Digital Archive
Cada pieza del archivo es un `.webp` recortado a su forma, con fondo transparente (lado largo de ~1000 px), en `assets/archive/<colección>/`. Para añadir una pegatina: sube el `.webp` a `assets/archive/fruit-stickers/` y añade su bloque a `items.json` (`id` es la dirección de la pieza, `name` el texto alternativo y el título del visor, `src` el archivo, `width` y `height` sus medidas y `facts` las filas de datos del visor, p. ej. `[["Country", "Spain"], ["Location", "Madrid"]]`; sin `facts` no se dibuja ninguna fila); luego actualiza el recuento de `archive/index.html`. Una colección nueva: copia `archive/fruit-stickers/` a `archive/<nombre>/` (ya lleva el botón «Back» al índice), cambia el título, las migas, `data-base` y los textos, crea `assets/archive/<nombre>/items.json`, añade su fila en `archive/index.html` y su dirección en `sitemap.xml`, `llms.txt` y `machine/index.html`.

### Crear un proyecto nuevo
1. Duplica `templates/project-template` y muévela a `project/<nombre-del-proyecto>/` (sin espacios ni acentos, con guiones).
2. Crea `assets/projects/<nombre-del-proyecto>/` y sube allí las imágenes (`.webp`, en dos tamaños: 800 y 1600 px de ancho) y los vídeos (`.mp4`).
3. En el nuevo `index.html`, cambia `nombre-del-proyecto` por el nombre real (Ctrl+F, "reemplazar todo") y edita los textos marcados con `EDITA:`. La plantilla trae ejemplos de película, clip en bucle e imágenes: deja los que uses y borra el resto.
   Colores propios (opcional): añade `data-palette="nombre"` a `<html>` y define esa paleta en `css/palettes.css` (hay cinco de ejemplo; comprueba el contraste). Sin él, la ficha es blanca.
4. Abre `templates/project-card.html`, copia el `<li>` y pégalo en la lista `work-list` de `index.html`, donde quieras que salga (el orden en el código = el orden en la página), y actualiza el `(7)` del título.
5. Cuando esté listo, borra la línea `<meta name="robots" content="noindex">` de la página del proyecto y añade su dirección a `sitemap.xml`.
6. Si cambias un `.css` o un `.js`, sube el número `?v=` de sus enlaces en todas las páginas.

### Cambiar o añadir imágenes
Súbelas a `assets/projects/<proyecto>/` y cambia la ruta (`src`) y la descripción (`alt`) en el HTML. Consejo: `.webp`, hasta 1600 px de ancho, y una versión de 800 px para las miniaturas (así la web carga rápido).

### Cambiar los textos de la habitación o la canción de "Now playing"
En la página About, la tarjeta «Now playing» / «Last watched» lleva al lado de cada título la fecha «Updated Nov 6»: es texto a mano en `about/index.html` (`np-date`), cámbiala cuando cambies el disco o la película.

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
«Contact» del menú es un enlace `mailto:` directo: al pulsarlo se abre el programa de correo del visitante con la dirección y el asunto ya puestos. No hay página intermedia. La dirección está en el menú de todas las páginas (y en la de Privacy y About). Para cambiarla, busca `mailto:contact@dizmar.xyz` y cámbiala en todos los archivos.

### Cambiar el texto de la página 404
`404.html`, el párrafo con clase `message`.

## Cosas a tener en cuenta
- Las rutas empiezan por `/` (por ejemplo `/assets/images/sky.webp`): significan "desde la raíz de la web".
- Si cambias el nombre de la carpeta de un proyecto, cambia también el enlace en la card de la home y la flecha "← Back" del proyecto.
- El diseño de las páginas de proyecto es común (`css/case.css`): un cambio ahí afecta a todos los proyectos.
- Para ver cómo queda en tu ordenador, abre una terminal en esta carpeta y ejecuta `python3 -m http.server 8000`; después entra en <http://localhost:8000>. (No vale abrir el `.html` con doble clic: las rutas con `/` necesitan un servidor.)
- Los tomates 3D usan la librería [three.js](https://threejs.org) (licencia MIT), alojada en `assets/vendor/three/` (no se pide a ningún tercero). Para actualizarla: copiar la misma versión desde npm (`three@x.y.z`) a esa carpeta, con los archivos de `examples/jsm` que se importan, y cambiar los `importmap` de las páginas.
