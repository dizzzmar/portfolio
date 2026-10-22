# Sobre de ketchup DIZ

Modelo 3D de un sobre de ketchup rojo con marca DIZ. Los pliegues, el volumen
del relleno, los dientes del borde y las líneas del termosellado están modelados
en la geometría. El mapa de normales añade únicamente el detalle fino del laminado.
Frontal y reverso tienen gráfica propia y materiales PBR de plástico impreso
con capa brillante y metalicidad mínima. Los pliegues son asimétricos, con
marcas de presión largas en las esquinas, costuras laterales y sellos finos.
La etiqueta frontal está generada con IA, con DIZ en arco, tipografía condensada
e ilustración botánica detallada. Se aplica como textura de color; los reflejos
y pliegues los producen el material y la geometría del modelo.

## Archivos

- `diz-ketchup.glb`: modelo para la web, con todas las texturas incluidas.
- `preview.html`: visor con giro, zoom y botones para ver ambas caras. Utiliza
  la misma versión de Three.js y el mismo CDN que la habitación del portfolio.
- `preview.png` y `preview-back.png`: renders del modelo en Blender.
- `front.png`: color generado con IA, 887 × 1774 px, sRGB.
- `back.png`: color del reverso, 1024 × 2048 px, sRGB.
- `front-orm.png`, `back-orm.png`: canales R = oclusión neutra, G = rugosidad,
  B = metalicidad; espacio lineal.
- `laminate-normal.png`: normales tangentes OpenGL, espacio lineal.
- `source/diz-ketchup.blend`: modelo editable y escena de iluminación para renders.
- `source/front-ai.png`: original generado con IA, sin redimensionar.
- `source/front-ai.md`: procedencia y criterios de generación.
- `source/front.svg`: versión vectorial anterior, conservada como alternativa.
- `source/back.svg`: gráfica editable del reverso.
- `source/build.py`: generación reproducible de malla, materiales, GLB y renders.

## Incorporación a la web

```js
const { scene: sachet } = await loader.loadAsync(
  '/assets/models/diz-ketchup/diz-ketchup.glb'
);
scene.add(sachet);
```

`loader` es una instancia de `GLTFLoader`, ya utilizado en el portfolio.
El GLB está centrado en el origen, con Y hacia arriba y el frontal hacia +Z.
Usa metros: aproximadamente 0,066 m de ancho × 0,13 m de alto.
Tiene una malla cerrada, dos materiales y 93.408 triángulos. No incluye cámara,
luces ni suelo. Es un objeto estático, sin rig ni animaciones.

Para apreciar el laminado, utiliza iluminación de entorno con reflejos, como
`RoomEnvironment`, y tone mapping. El visor renderiza al interactuar; no mantiene
un bucle de animación cuando está quieto. El GLB no depende de las imágenes
sueltas ni del archivo Blender para funcionar.

## Regeneración

Con Blender 4.3 o posterior, Inkscape y la fuente DejaVu Sans instalados:

```sh
blender -b --python assets/models/diz-ketchup/source/build.py
```

Desde la raíz del repositorio, inicia un servidor estático y abre
`/assets/models/diz-ketchup/preview.html` para revisar el resultado en el navegador.
El archivo Blender conserva las texturas empaquetadas. La iluminación de las
previsualizaciones no forma parte del modelo exportado.
La regeneración utiliza `source/front-ai.png` para el frontal cuando existe;
solo recurre a `source/front.svg` cuando falta ese archivo. No requiere volver
a llamar al generador de imágenes ni conectar servicios externos.
