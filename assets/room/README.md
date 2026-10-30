# Interactive shelf

The web loads `shelf-web.glb`: the same file made light with `gltf-transform` (geometry compressed with meshopt, textures as WebP of at most 1024 px; 4.4 MB instead of 23 MB). After replacing `shelf.glb`, regenerate it with `gltf-transform resize shelf.glb a.glb --width 1024 --height 1024 && gltf-transform webp a.glb b.glb --quality 88 && gltf-transform meshopt b.glb shelf-web.glb`.

`shelf.glb` is the Blender export of `Personal_Interests_Shelf.blend` from the portfolio's Drive room folder. It includes embedded image textures and preserves the named mesh groups used for the blue hover outline in `/js/room.js`.

The `destinations` array in `/js/room.js` groups the selectable objects. Names in the object list preview each camera position. The Wii opens Recently played; the other objects retain their existing camera interactions. Keep object names and material names in future exports so selection still targets the right parts.

## Alfombra, carga y linterna

`js/room/rug.js` coloca la gráfica plana del sobre DIZ bajo la estantería. La
textura local `diz-rug.png` tiene 128 × 256 píxeles y filtro de vecino más
cercano para conservar el aspecto pixelado. Es un plano que recibe las sombras
de los objetos, sin cargar el modelo 3D del sobre.

`js/room/loading.js` muestra `room-wireframe.bin` mientras se descarga y prepara
el GLB completo. Contiene líneas extraídas de la misma habitación, sin texturas;
aparecen de abajo arriba con un barrido verde. La animación se hace siempre, también
si la habitación ya está en la caché: mientras se descarga, las líneas van apareciendo
poco a poco (al ritmo de la descarga); cuando ya está lista, terminan deprisa y una línea
verde sube «montando» la habitación de verdad, que aparece por debajo de ella mientras
las líneas de encima desaparecen. El porcentaje corresponde a los bytes descargados cuando
el servidor informa del tamaño. Sin ese dato se muestra el volumen recibido. Con movimiento
reducido no hay animación: la habitación aparece directamente.

Al sustituir `shelf.glb`, regenera la vista previa desde la raíz del repositorio:

```sh
blender -b --python scripts/build-room-wireframe.py
```

`js/room/lighting.js` gestiona la linterna. Un clic o toque en Tomato lamp apaga
las luces, reflejos de entorno y emisiones de la habitación. El cursor o un
arrastre táctil orienta un foco cálido desde la cámara, con sombras. Otro clic
sin arrastrar, el botón Turn lights on, Escape o volver a activar el botón de
la lámpara restauran la iluminación. La lista permite hacerlo también con teclado.
Este modo conserva el estado de encendido de la Wii.

## Recently played

The Wii interaction lives in `js/room/wii-player.js`, disc geometry and label textures in `js/room/disc.js`, and its overlay styles in `css/room-wii.css`. The room keeps one renderer: the shelf is blurred before the foreground discs are drawn. During insertion, the selected disc moves into the room scene so the actual console hides it as it enters the slot. The blue slot and green power light turn on after insertion completes.

Edit `assets/room/discs/games.json` to change the three titles or their artwork. Upload square disc-label artwork, ideally 1024 × 1024 WebP or PNG, to this folder. The circle and center hole are cut by the 3D geometry, so the image may have a solid background. Set `artwork` to its filename, for example:

```json
{ "id": "hades-2", "title": "Hades II", "artwork": "hades-2.webp" }
```

The other suggested filenames are `assassins-creed-shadows.webp` and `pokemon-shield.webp`. Keep `artwork: null` until a file is available; the disc then uses its generated label without requesting a missing image. Artwork stays on this site. Change the `?v=` on the games JSON fetch in `wii-player.js` and its module import in `room.js` after replacing artwork or game data.

Each disc is built in layers like a real CD: the printed label (or artwork) on the front, a clear plastic hub around the hole, a thin mirror band, a silver edge and a silver back with rainbow fans. They reflect a small studio painted in code (`createStudioEnvironment` in `disc.js`); its bright strips are what draw the streaks on the gloss. Drag a disc (mouse or finger) to turn it and see the back: it keeps spinning a little when let go and springs back to face you after a moment. A short press still inserts it. The tuning values (drag speed, friction, return spring, idle spin) are named constants at the top of `wii-player.js`.

Mouse and touch can open the Wii directly. Keyboard users can open Recently played from the object list, Tab between the discs, or use Left/Right/Home/End to select a disc before pressing Enter. Escape and Back to room cancel the interaction safely, including during insertion. Reduced-motion mode skips the spinning entrance and shortens insertion.

## Cómo sustituir el modelo sin romperlo

- Sube el archivo nuevo **ya con el nombre `shelf.glb`** (renómbralo en tu ordenador antes de subirlo) y elige
  sustituir el existente. **No lo renombres desde la web de GitHub:** el editor de la web trata el `.glb` como texto y
  lo deja vacío (le pasó al de octubre: quedó en 2 bytes y la habitación dejó de cargar).
- Después cambia el número `?v=` de `shelf.glb` en `js/room.js` (y el de `room.js` en `room.html`) para que los
  navegadores descarguen el modelo nuevo en vez del guardado.
- O pídeselo a Claude: él lo sube, cambia los `?v=` y comprueba que la habitación carga.
