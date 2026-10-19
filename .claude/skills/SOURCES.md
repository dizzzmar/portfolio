# Origen de las skills de terceros

Todas se han copiado al repositorio (carpeta `.claude/skills/`, que no se publica en la web) tras revisar su código
(18-19 oct 2026): sin claves, sin envío de datos y sin instrucciones ocultas. Las licencias están en `licenses/`.

| Skills | Autor y repositorio | Versión copiada | Licencia |
| --- | --- | --- | --- |
| `design-taste-frontend` | Leon Lin · github.com/Leonxlnx/taste-skill | ver `design-taste-frontend/SOURCE.md` | MIT |
| `emil-design-eng`, `animate`, `review-animations`, `improve-animations`, `find-animation-opportunities`, `animation-performance`, `animation-vocabulary`, `apple-design`, `break-ui`, `prototype` | Emil Kowalski · github.com/emilkowalski/skills | commit `2d22863` (11-10-2026) | MIT |
| `threejs-*` (13 skills) | CloudAI-X · github.com/CloudAI-X/threejs-skills | commit `0e18186` (19-10-2026) | ver licencia |
| `motion-design` | LottieFiles · github.com/LottieFiles/motion-design-skill | commit `f9a8a04` (18-05-2026) | ver licencia |
| `impeccable` | Paul Bakaus · github.com/pbakaus/impeccable | commit `0665bd8` (19-10-2026), v4.6.0 | Apache 2.0 |

## Lo que NO se ha copiado (a propósito)

- **Emil Kowalski:** `animate-expo`, `write-swift`, `mobile-native`, `pick-ui-library`, `ask-sonner` (móvil nativo, Swift, Expo y librerías de apps; no encajan en una web estática).
- **Impeccable:** solo la guía (`SKILL.md` y `reference/`). **No** se han copiado el lanzador `scripts/impeccable`, los
  *hooks* ni los agentes, porque el lanzador **descarga un programa ejecutable desde GitHub Releases** (lo verifica con un
  checksum publicado en el mismo sitio) y los hooks lo ejecutarían en cada edición. Sin él, el paso "Setup" de la skill
  falla y se puede ignorar; la guía de diseño funciona igual. Para activarlo hay que pedírselo a Mario (ver CLAUDE.md:
  código de terceros).

Para actualizar cualquiera, vuelve a revisar el código nuevo antes de sustituir la carpeta.
