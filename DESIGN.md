# Guía de diseño · dizmar.xyz

Cómo se ve y se mueve la web, en un solo sitio. Si algo nuevo no cabe aquí, primero se decide aquí y luego se hace.
**Regla de oro:** no hay valores sueltos. Los tamaños de letra salen de `css/tokens.css`; si necesitas uno que no existe, se añade ahí (y aquí), no se escribe `15px` en otro archivo.

## 1. Tipografía

**Una sola letra:** Helvetica Neue (en Apple) o Arial (en el resto). Es la del sistema: no se descarga nada y no se envía ningún dato a terceros. **No hay serif.** Las únicas excepciones son `machine/` (otro modo, a propósito) y el texto de las miniaturas de los sellos, que se escala con el propio sello.

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
| `--fs-h1` | 56 → 140 px | Título de página (About, Privacy, Stamps) y nombres de proyecto en Work |

- **Pesos:** 400 (normal) para menú y textos de apoyo, 500 para texto de interfaz con énfasis, 700 para titulares y textos destacados. Nada de 300 ni 600.
- **Interlineado:** titulares `--lh-tight` (1.05), menús y textos cortos `--lh-ui` (1.3), texto corrido `--lh-body` (1.45).
- **Espaciado de letras:** titulares apretados (−0,03 a −0,06 em), texto normal 0, etiquetas en mayúsculas `--tracking-label` (.06 em).
- **Mayúsculas:** solo en etiquetas pequeñas (`--fs-xs`).

## 2. Color

| Uso | Valor |
| --- | --- |
| Rojo marca (tomate, cursor, fondo de About) | `#f83d0c` (cursor, nombre de proyecto encendido en Work) · `#d03a22` (fondo de About: más profundo para que el texto crema llegue a 4,5:1; con `#f04a30` eran 3,4:1) |
| Negro de página (Work, Privacy, proyectos en oscuro) | `#0c0c0b` |
| Blanco | `#fff` |
| Tinta sobre claro | `#111` / `#141414` |
| Papel (sellos) | `#fbfaf6` |
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
- **Sellos (Stamps):** papel troquelado con el texto escalado al tamaño del sello (`cqmin`); es la única parte con tamaños propios.

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
