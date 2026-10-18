# Instrucciones para Claude en este repositorio

Web estática y **pública** (GitHub Pages, www.dizmar.xyz): todo lo que se sube al repositorio, incluido el historial de commits, lo puede ver cualquiera.

## Seguridad: nunca publicar secretos
- Nunca escribas en el código, en los commits ni en las descripciones de PR claves de API, tokens, contraseñas, credenciales, claves privadas ni archivos `.env`. Tampoco "temporalmente": aunque se borren después, quedan en el historial.
- Si una tarea necesita una clave (un servicio, un formulario, analytics…), detente y explícale al usuario las opciones seguras (secretos de GitHub Actions, un servicio que no exponga la clave en el navegador, etc.) antes de escribir nada. Recuerda que en una web estática todo lo que llega al navegador es público.
- Antes de cada commit, revisa el diff (`git diff --cached`) buscando cualquier cosa parecida a un secreto o un dato personal que no debería estar.
- Si encuentras un secreto ya publicado, avisa al usuario de inmediato: hay que revocarlo/cambiarlo en el servicio (borrarlo del repo no basta).
- La comprobación automática `.github/workflows/secret-scan.yml` (gitleaks) revisa cada push y PR; si falla, no fusiones hasta entender por qué.

## Avisar antes de cualquier acción con riesgo
Explica el riesgo en una frase y pide confirmación antes de:
- **Publicar:** fusionar en `main` (la web se actualiza en unos minutos para todo el mundo). Hazlo solo cuando el usuario lo pida en ese momento.
- **Acciones difíciles de deshacer:** borrar archivos, ramas o historial; `git push --force`; reescribir commits.
- **Cambiar la configuración** del repositorio, de GitHub Pages o del dominio.
- **Añadir código o servicios de terceros:** scripts de CDN, embeds (Instagram, YouTube…), fuentes externas, analytics, formularios. Indica qué datos de los visitantes recibe ese tercero.
- **Datos personales:** publicar emails, teléfonos, direcciones, enlaces privados (por ejemplo, archivos de Google Drive) o fotos de otras personas.
Si algo es seguro y reversible (cambios de diseño en una rama, PRs sin fusionar), no hace falta preguntar.

## Convenciones del proyecto
- Explica los cambios al usuario en español y sin jerga técnica.
- Trabaja en una rama y abre una PR; enseña capturas de escritorio y móvil cuando cambie algo visual.
- Al cambiar un `.css` o un `.js`, actualiza el número `?v=` de sus enlaces en todas las páginas (ver README).
