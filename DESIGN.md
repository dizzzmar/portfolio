# Guía de diseño · dizmar.xyz

Cómo se ve y se mueve la web, en un solo sitio. Si algo nuevo no cabe aquí, primero se decide aquí y luego se hace.
**Regla de oro:** no hay valores sueltos. Los tamaños de letra salen de `css/tokens.css`; si necesitas uno que no existe, se añade ahí (y aquí), no se escribe `15px` en otro archivo.

## 1. Tipografía

**Una sola letra:** Schibsted Grotesk (variable, pesos 400–800, licencia OFL), alojada en `assets/fonts/` y declarada en `css/tokens.css`: no se pide nada a terceros. Mientras carga se ve Helvetica Neue o Arial. **No hay serif.** Las únicas excepciones son `machine/` (monoespaciada, otro modo a propósito).

| Variable | Tamaño | Para qué |
| --- | --- | --- |
| `--fs-xs` | 11 px | Etiquetas en MAYÚSCULAS (con `--tracking-label`), créditos, reproductor, letra pequeña |
| `--fs-s` | 14 px | Menú, enlaces, botones, fechas, pie de página, textos secundarios |
| `--fs-m` | 16 px | Texto corrido (párrafos, privacidad, descripciones) |
| `--fs-l` | 20 px | Destacados cortos |
| `--fs-xl` | 24 px | Subtítulos |
| `--fs-2xl` | 32 px | Títulos pequeños de paneles |
| `--fs-lead` | 18 → 24 px (según pantalla) | Párrafos de entrada y frases destacadas |
| `--fs-h3` | 24 → 44 px | Títulos de sección y nombre del proyecto en su barra |
| `--fs-h2` | 40 → 76 px | Títulos grandes |
| `--fs-h1` | 56 → 140 px | Título de página (About, Privacy, FAQs) y nombres de proyecto en Work |

- **Pesos: solo dos.** 700 para lo que orienta (título de página, primer párrafo de cada página y títulos de bloque) y 400 para lo que se lee. Nada de 300 ni 600. (About, Privacy y Machine ya siguen esta regla; Work, Room y los proyectos todavía usan algún 500 y se irán igualando.) El tamaño de lectura es uno solo, `--fs-read` (18 → 22 px), para la entrada, los títulos de bloque y el texto; lo que los distingue es el peso. Lo secundario va a 14 px (`--fs-s`).
- **Interlineado:** titulares `--lh-tight` (1.05), menús y textos cortos `--lh-ui` (1.3), texto corrido `--lh-body` (1.45).
- **Espaciado de letras:** titulares apretados (−0,03 a −0,06 em), texto normal 0, etiquetas en mayúsculas `--tracking-label` (.06 em).
- **Mayúsculas:** solo en etiquetas pequeñas (`--fs-xs`).

## 2. Color

| Uso | Valor |
| --- | --- |
| Verde y lima (About, Privacy, FAQs, Machine y la sala) | `--green` `#125603` de fondo con `--lime` `#c3f380` de texto (6,98:1). Lo secundario al 80 % de opacidad (5,1:1). El cursor va en lima sobre estas páginas; el rojo daría 2,4:1. La sala usa el verde «de noche» `#0b2f04` (`--night`) de fondo, con la lista en lima al 70 % (6,4:1) y la escena 3D tal cual |
| Rojo marca (tomate, cursor, nombre de proyecto encendido en Work) | `#f83d0c` (cursor, nombre de proyecto encendido en Work) |
| Negro de página (Work, proyectos en oscuro) | `#0c0c0b` |
| Blanco | `#fff` |
| Tinta sobre claro | `#111` / `#141414` |
| Cielo | la foto `assets/images/sky.webp` (azul `#4f8fd8` de reserva) |

Texto sobre oscuro: blanco, o blanco al 70 % para lo secundario y al 60 % para lo más tenue. No añadir colores nuevos sin decidirlo aquí.

## 3. Maquetación

- **Barra de arriba:** 64 px de alto, siempre. Logo (tomate) a la izquierda a 24 px del borde (14 px en móvil), enlaces a la derecha.
- **Márgenes laterales:** 24 px (14 px en móvil) en barra y pie; el contenido usa `--margin` de su página.
- **Pie de página:** el mismo en todas: «Mario Diz, Madrid · Privacy» y «Back to top ↑».
- **Esquinas:** rectas en las imágenes de proyecto; redondas del todo (píldora) en botones.

## 4. Componentes

- **Enlace de texto** (menú, pie, privacidad, volver, «Go to film»…): sin subrayado fijo. Al pasar el ratón se dibuja una raya de 1 px que entra por el lado por el que llega el ratón y sale por el lado por el que se va (0,4 s). En un párrafo lleva además una raya tenue fija. La página actual en el menú lleva la raya completa. En táctil: subrayado normal.
- **Botón:** píldora, texto `--fs-s`, blanco con texto oscuro (o contorno blanco sobre el cielo).
- **Cursor (solo con ratón):** punto rojo de 24 px. Sobre botones, tarjetas y objetos crece ×2,5 con un pequeño rebote; sobre enlaces de texto, sobre «View project» y sobre vídeos se oculta (la raya, la etiqueta o PLAY/PAUSE hacen de indicador); sobre fondo rojo se encoge, pasa a blanco y vuelve a crecer; al desplazar se estira como una gota.

## 5. Movimiento

- Solo se animan `transform` y `opacity` (nada de animar tamaños ni sombras).
- Curva de salida de todo: `var(--ease-out)` (`cubic-bezier(0.23, 1, 0.32, 1)`, en `css/tokens.css`); no escribir otras curvas sueltas. Duraciones: interfaz 150–300 ms; subrayado 400 ms; entradas de sección hasta 700 ms.
- Con «reducir movimiento» se quita el desplazamiento y se mantienen los cambios que ayudan a entender (opacidad, color).
- Las animaciones largas (el tomate de la portada, las transiciones entre páginas) son raras; las de uso diario, casi invisibles.

## 6. Reglas de trabajo

- Nada de claves, contraseñas ni datos personales en el repositorio (ver `CLAUDE.md`).
- Sin servicios ni scripts de terceros sin decidirlo (hoy solo three.js desde jsDelivr).
- Al cambiar un `.css` o `.js`, sube el número `?v=` de su enlace en todas las páginas (ver `README.md`).
- Al añadir una página nueva: enlazar primero `css/tokens.css`, después los demás; barra y pie iguales a los del resto.
