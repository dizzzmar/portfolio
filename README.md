# dizmar — portfolio de Mario Diz

Web estática: HTML, CSS y JavaScript sencillos, **sin instalar nada ni compilar**. Lo que ves en el repositorio es exactamente lo que se publica en <https://www.dizmar.xyz> (GitHub Pages). Cuando un cambio llega a la rama `main`, la web se actualiza en un par de minutos.

## Cómo está organizado

```
index.html                 La home (tomate, papel verde con los proyectos, footer)
room.html                  La página "The room" (habitación 3D)
404.html                   Página de "no encontrada"

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
5. Cuando esté listo, borra la línea `<meta name="robots" content="noindex">` de la página del proyecto para que aparezca en buscadores.

### Cambiar o añadir imágenes
Súbelas a `assets/projects/<proyecto>/` y cambia la ruta (`src`) y la descripción (`alt`) en el HTML. Consejo: `.webp`, hasta 1600 px de ancho, y una versión de 800 px para las miniaturas (así la web carga rápido).

### Cambiar los textos de la habitación o la canción de "Now playing"
Están en `js/room.js` (objeto `nowPlaying` y lista `destinations`). La imagen de la pegatina es `assets/room/now-playing-sticker.webp`.

### Cambiar el texto de la página 404
`404.html`, el párrafo con clase `message`.

## Cosas a tener en cuenta
- Las rutas empiezan por `/` (por ejemplo `/assets/images/sky.webp`): significan "desde la raíz de la web".
- Si cambias el nombre de la carpeta de un proyecto, cambia también el enlace en la card de la home y el botón × del proyecto.
- El diseño de las páginas de proyecto es común (`css/project.css`): un cambio ahí afecta a todos los proyectos.
- Para ver cómo queda en tu ordenador, abre una terminal en esta carpeta y ejecuta `python3 -m http.server 8000`; después entra en <http://localhost:8000>. (No vale abrir el `.html` con doble clic: las rutas con `/` necesitan un servidor.)
- Los tomates 3D usan la librería [three.js](https://threejs.org), que se carga desde internet (jsDelivr).
