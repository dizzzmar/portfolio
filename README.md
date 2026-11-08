# dizmar — portfolio de Mario Diz

Web estática (HTML, CSS y JavaScript sencillos, sin instalar nada ni compilar) publicada en <https://www.dizmar.xyz> con GitHub Pages.

## Ver la web en local
```
python3 -m http.server 8000
```
Después, entra en <http://localhost:8000>. (Abrir el `.html` con doble clic no vale: las rutas empiezan por `/`.)

## Estructura
- `index.html`, `room.html`: portada y habitación 3D.
- `about/`, `faq/`, `privacy/`, `archive/`, `posters/`, `project/`: el resto de páginas, una carpeta con su `index.html` cada una.
- `css/`, `js/`: aspecto y comportamiento (sin dependencias; three.js está alojado en `assets/vendor/`).
- `assets/`: imágenes, vídeos, tipografías, modelos y sonidos.
- `templates/`: plantillas para páginas nuevas.

Al cambiar un `.css` o un `.js`, hay que subir el número `?v=` de sus enlaces en todas las páginas.

La guía de mantenimiento está en [`.claude/notes/guia.md`](.claude/notes/guia.md).

## Seguridad
Es un repositorio público: no se suben claves, contraseñas ni datos personales. Cada cambio pasa por una comprobación automática (`.github/workflows/secret-scan.yml`).
