# dizmar — portfolio de Mario Diz

Web estática: HTML, CSS y JavaScript sencillos, **sin instalar nada ni compilar**. Lo que ves en el repositorio es exactamente lo que se publica en <https://www.dizmar.xyz> (GitHub Pages). Cuando un cambio llega a la rama `main`, la web se actualiza en un par de minutos.

## Página temporal "We're cooking"

Mientras la web está en obras, todas las páginas mandan a `/cooking/` (lo hace `js/gate.js`, que va en el `<head>` de cada página).
- **Ver la web de verdad** en tu móvil u ordenador: abre una vez `www.dizmar.xyz/?preview` (ese navegador lo recuerda). Para volver a ver la página temporal: `www.dizmar.xyz/?nopreview`.
- **Quitarla** cuando la web esté lista: borra la línea `<script src="/js/gate.js…">` de cada página (o pídeselo a Claude).
- No es una contraseña: el código del repositorio es público. Solo evita que los visitantes vean la web a medias.

## Cómo está organizado

```
index.html                 La home (tomate, papel verde con los proyectos, footer)
room.html                  La página "The room" (habitación 3D)
about/index.html           About (nombre grande, presentación, foto, gustos, clientes, preguntas). Estilos: css/about.css. Textos de ejemplo marcados con EDITA
404.html                   Página de "no encontrada"
machine/index.html         Modo máquina: toda la web en texto (oculto por ahora, ver abajo)
robots.txt · sitemap.xml · llms.txt   Para buscadores y agentes de IA
CLAUDE.md                  Reglas para Claude (seguridad: nunca publicar claves; avisar antes de acciones con riesgo)
.github/workflows/secret-scan.yml  Comprueba en cada cambio que no se suba ninguna clave (gitleaks)

project/                   Una carpeta por proyecto  →  www.dizmar.xyz/project/<nombre>/
  lexus-electrified/index.html
  soap-and-glory-vanilla/index.html

templates/                 Plantillas para copiar (no son páginas de la web)
  project-template/index.html   Página de proyecto nueva, con todo explicado
  project-card.html             La card de la home para un proyecto nuevo

css/                       Diseño (colores, tipografías, tamaños)
  home.css · room.css · not-found.css
  project.css              Común a TODAS las páginas de proyecto

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

### Cambiar un texto de una card de la home
Abre `index.html` y busca la sección **LISTA DE PROYECTOS** (Ctrl+F). Cada proyecto tiene su bloque con un comentario encima. Cambia la marca (`project-brand`), el nombre (`<h2>`), las etiquetas (`<li>`) o el año.

### Cambiar el texto de una página de proyecto
Abre `project/<nombre>/index.html`. Los trozos editables están marcados con comentarios (`EDITA:`) y cada bloque está numerado: imagen principal, cabecera y texto, galería, enlaces.

### Crear un proyecto nuevo
1. Duplica `templates/project-template` y muévela a `project/<nombre-del-proyecto>/`.
2. Crea `assets/projects/<nombre-del-proyecto>/` y sube allí las imágenes (mejor `.webp`).
3. Edita los textos marcados con `EDITA:` en el nuevo `index.html`.
4. Copia `templates/project-card.html` dentro de la lista de proyectos de `index.html` y edítala.
   Para la animación al abrir y cerrar el proyecto, la imagen de la card y la imagen principal de la página del proyecto deben llevar el mismo `style="view-transition-name: nombre-del-proyecto"`.
5. Cuando esté listo, borra la línea `<meta name="robots" content="noindex">` de la página del proyecto para que aparezca en buscadores.

### Cambiar o añadir imágenes
Súbelas a `assets/projects/<proyecto>/` y cambia la ruta (`src`) y la descripción (`alt`) en el HTML. Consejo: `.webp`, hasta 1600 px de ancho, y una versión de 800 px para las miniaturas (así la web carga rápido).

### Cambiar los textos de la habitación o la canción de "Now playing"
Están en `js/room.js` (objetos `nowPlaying` y `lastWatched`, y lista `destinations`). La imagen de la pegatina es `assets/room/now-playing-sticker.webp`; el póster de la última película vista, que aparece al acercarse al póster de la pared, es `assets/room/film-poster.webp` (vertical, unos 840×1200).

### Modo máquina (oculto por ahora)
`machine/index.html` es una versión en texto de toda la web, ligera para conexiones lentas. Ahora mismo está **oculta**: no hay enlaces a ella, no está en `sitemap.xml` y lleva `noindex`. Para volver a activarla:
1. Añade antes de `</body>` en cada página (home, proyectos, room, 404 y la plantilla): `<script src="/js/mode-switch.js" defer></script>` (pone la píldora HUMAN | MACHINE y el aviso de conexión lenta).
2. Borra la línea `noindex` de `machine/index.html` y añade `/machine/` a `sitemap.xml`.
3. Revisa que sus textos sigan al día con la web.

### Cambiar el texto de la página 404
`404.html`, el párrafo con clase `message`.

## Cosas a tener en cuenta
- Las rutas empiezan por `/` (por ejemplo `/assets/images/sky.webp`): significan "desde la raíz de la web".
- Si cambias el nombre de la carpeta de un proyecto, cambia también el enlace en la card de la home y la flecha "← Back" del proyecto.
- El diseño de las páginas de proyecto es común (`css/project.css`): un cambio ahí afecta a todos los proyectos.
- Para ver cómo queda en tu ordenador, abre una terminal en esta carpeta y ejecuta `python3 -m http.server 8000`; después entra en <http://localhost:8000>. (No vale abrir el `.html` con doble clic: las rutas con `/` necesitan un servidor.)
- Los tomates 3D usan la librería [three.js](https://threejs.org), que se carga desde internet (jsDelivr).
