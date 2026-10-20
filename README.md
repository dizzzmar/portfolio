# dizmar — portfolio de Mario Diz

Web estática: HTML, CSS y JavaScript sencillos, **sin instalar nada ni compilar**. Lo que ves en el repositorio es exactamente lo que se publica en <https://www.dizmar.xyz> (GitHub Pages). Cuando un cambio llega a la rama `main`, la web se actualiza en un par de minutos.

## Cómo está organizado

```
index.html                 La home (el tomate gira; al pulsar Work sube al menú, aparece "Creative ___" y se entra en la lista de proyectos)
room.html                  La página "The room" (habitación 3D)
about/index.html           About (nombre grande, presentación, foto, gustos, clientes, preguntas). Estilos: css/about.css. Textos de ejemplo marcados con EDITA
404.html                   Página de "no encontrada"
machine/index.html         Modo máquina: versión ligera en texto de cada página
robots.txt · sitemap.xml · llms.txt   Para buscadores y agentes de IA
CLAUDE.md                  Reglas para Claude (seguridad: nunca publicar claves; avisar antes de acciones con riesgo)
.github/workflows/secret-scan.yml  Comprueba en cada cambio que no se suba ninguna clave (gitleaks)

project/                   Una carpeta por proyecto  →  www.dizmar.xyz/project/<nombre>/  (estilos: css/case.css, como cipher.tv)
  lexus-electrified/index.html
  soap-and-glory-vanilla/index.html

templates/                 Plantillas para copiar (no son páginas de la web)
  project-template/index.html   Página de proyecto nueva, con todo explicado (mismo diseño que Lexus y Soap & Glory)
  project-card.html             La fila de la lista Work de la home para un proyecto nuevo (8 miniaturas)

css/                       Diseño (colores, tipografías, tamaños)
  home.css · room.css · not-found.css · stamps.css
  footer.css               El pie de página, igual en todas las páginas (ver la clase del color en cada <footer>)
  nav-logo.css · nav-links.css   El tomate y los enlaces de la barra, iguales en todas las páginas
  case.css                 Común a TODAS las páginas de proyecto

js/                        Comportamiento (animaciones, tomate 3D, carrusel…)
  home-*.js · room.js · not-found-*.js
  project-stack.js         Carrusel de imágenes de los proyectos
  project-grid.js          Galería en cuadrícula infinita (hero de Soap & Glory)

assets/                    Imágenes, vídeos y modelos 3D
  images/                  cielo, grano, tomate, imagen de relleno
  models/                  tomate 3D
  room/                    modelo de la habitación, pegatina "Now playing"…
  projects/<nombre>/       las imágenes y vídeos de cada proyecto
```

Regla fácil: **textos → archivos `.html`**, **aspecto → `.css`**, **animaciones → `.js`**.

**Al cambiar un `.css` o un `.js`:** en los HTML, los enlaces llevan `?v=20261017b` al final (por ejemplo `/css/home.css?v=20261017b`). Cambia ese número (por ejemplo, a la fecha del día) en todas las páginas para que los navegadores descarguen la versión nueva en vez de usar la que tienen guardada.

## Tareas habituales

### Cambiar un texto de una fila de la lista Work de la home
Abre `index.html` y busca `work-list` (Ctrl+F). Cada proyecto es un bloque `<li class="work-item">`. Cambia el año (`wi-date`), el nombre (`wi-name`) o las etiquetas (`wi-tags`). Cada fila lleva siempre 8 miniaturas (`wi-slot`), sin huecos.

### Cambiar el texto de una página de proyecto
Abre `project/<nombre>/index.html`. Los trozos editables están marcados con comentarios (`EDITA:`): nombre, año y cliente, galería horizontal, etiquetas y texto.

### Crear un proyecto nuevo
1. Duplica `templates/project-template` y muévela a `project/<nombre-del-proyecto>/` (sin espacios ni acentos, con guiones).
2. Crea `assets/projects/<nombre-del-proyecto>/` y sube allí las imágenes (`.webp`, en dos tamaños: 800 y 1600 px de ancho) y los vídeos (`.mp4`).
3. En el nuevo `index.html`, cambia `nombre-del-proyecto` por el nombre real (Ctrl+F, "reemplazar todo") y edita los textos marcados con `EDITA:`. La plantilla trae ejemplos de película, clip en bucle e imágenes: deja los que uses y borra el resto.
4. Abre `templates/project-card.html`, copia el `<li>` y pégalo en la lista `work-list` de `index.html`, donde quieras que salga (el orden en el código = el orden en la página). Cada fila lleva siempre 8 miniaturas, sin huecos.
5. Cuando esté listo, borra la línea `<meta name="robots" content="noindex">` de la página del proyecto y añade su dirección a `sitemap.xml`.
6. Si cambias un `.css` o un `.js`, sube el número `?v=` de sus enlaces en todas las páginas.

### Cambiar o añadir imágenes
Súbelas a `assets/projects/<proyecto>/` y cambia la ruta (`src`) y la descripción (`alt`) en el HTML. Consejo: `.webp`, hasta 1600 px de ancho, y una versión de 800 px para las miniaturas (así la web carga rápido).

### Cambiar los textos de la habitación o la canción de "Now playing"
Están en `js/room.js` (objetos `nowPlaying` y `lastWatched`, y lista `destinations`). La imagen de la pegatina es `assets/room/now-playing-sticker.webp`; el póster de la última película vista, que aparece al acercarse al póster de la pared, es `assets/room/film-poster.webp` (vertical, unos 840×1200).

### Modo máquina
El selector HUMAN | MACHINE está en todas las páginas, incluida la landing. Mantiene la página actual: por ejemplo, `/machine/?page=%2Fproject%2Flexus-electrified%2F` muestra la ficha de Lexus. El contenido está en `machine/index.html`, las correspondencias de páginas en `js/machine.js` y el diseño blanco y rojo en `css/machine.css`. Al editar proyectos o la habitación, actualiza también sus textos aquí. Los archivos multimedia son enlaces; no se descargan hasta abrirlos. Conserva `noindex` para evitar duplicar el contenido de las páginas principales en buscadores.

`js/mode-switch.js` se carga al principio del `<head>`, antes de recursos pesados. Cambia automáticamente a texto con ahorro de datos, conexiones 2G/3G o menos de 0,8 Mbps. Si el navegador no informa de la conexión, una página que sigue cargando a los ocho segundos también activa la vista ligera. La elección manual se recuerda en `localStorage` (`dizmar-view`); Human evita el cambio automático. El enlace `?view=human` permite volver a la página completa incluso en una conexión lenta.

### Tipos del título Creative
La palabra cambiante alterna Jacquard 12, Rubik Glitch y Bungee Shade en `js/home-intro.js`. Son fuentes libres alojadas en `assets/fonts/`, con sus licencias OFL; no envían peticiones a Google. Sus reglas están en `css/creative-fonts.css`.

### Buscadores (Google): qué tiene que llevar cada página
Cada página pública lleva en su `<head>`: `<title>`, `<meta name="description">`, `<link rel="canonical">` (con la dirección completa y la barra final, por ejemplo `https://www.dizmar.xyz/about/`), las etiquetas `og:` y `twitter:card` (lo que se ve al compartir el enlace) y, en las páginas de proyecto, los datos estructurados (`application/ld+json`). Además:
- Toda página nueva se añade a `sitemap.xml` (y se resume en `llms.txt`).
- Una página en borrador lleva `<meta name="robots" content="noindex">` y NO está en el sitemap (hoy: Stamps y `machine/`; las plantillas están además bloqueadas en `robots.txt`). Al publicarla, se borra esa línea y se añade al sitemap.
- Los enlaces del menú llevan la barra final (`/about/`) para no pasar por una redirección.
- Google no se entera solo: hay que dar de alta la web en Google Search Console y enviar `https://www.dizmar.xyz/sitemap.xml` (con tu cuenta de Google, en search.google.com/search-console).

### Cambiar el correo de «Contact»
«Contact» del menú lleva a `/contact/`, una página de confirmación: el visitante arrastra el tirador rojo de una regla de marcas hasta el final (o pulsa el enlace «Open it for me») y se abre su programa de correo. La dirección y el asunto están en las dos primeras líneas de `js/contact.js` (y la dirección escrita en `contact/index.html` y en la página de Privacy).

### Cambiar el texto de la página 404
`404.html`, el párrafo con clase `message`.

## Cosas a tener en cuenta
- Las rutas empiezan por `/` (por ejemplo `/assets/images/sky.webp`): significan "desde la raíz de la web".
- Si cambias el nombre de la carpeta de un proyecto, cambia también el enlace en la card de la home y la flecha "← Back" del proyecto.
- El diseño de las páginas de proyecto es común (`css/case.css`): un cambio ahí afecta a todos los proyectos.
- Para ver cómo queda en tu ordenador, abre una terminal en esta carpeta y ejecuta `python3 -m http.server 8000`; después entra en <http://localhost:8000>. (No vale abrir el `.html` con doble clic: las rutas con `/` necesitan un servidor.)
- Los tomates 3D usan la librería [three.js](https://threejs.org), que se carga desde internet (jsDelivr).
