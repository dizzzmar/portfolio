# Interactive shelf

`shelf.glb` is the Blender export of `Personal_Interests_Shelf.blend` from the portfolio's Drive room folder. It includes embedded image textures and preserves the named mesh groups used for the blue hover outline in `/js/room.js`.

The `destinations` array in `/js/room.js` groups the selectable objects. Names in the object list preview each camera position. The Wii opens Recently played; the other objects retain their existing camera interactions. Keep object names and material names in future exports so selection still targets the right parts.

## Recently played

The Wii interaction lives in `js/room/wii-player.js`, disc geometry and label textures in `js/room/disc.js`, and its overlay styles in `css/room-wii.css`. The room keeps one renderer: the shelf is blurred before the foreground discs are drawn. During insertion, the selected disc moves into the room scene so the actual console hides it as it enters the slot. The blue slot and green power light turn on after insertion completes.

Edit `assets/room/discs/games.json` to change the three titles or their artwork. Upload square disc-label artwork, ideally 1024 × 1024 WebP or PNG, to this folder. The circle and center hole are cut by the 3D geometry, so the image may have a solid background. Set `artwork` to its filename, for example:

```json
{ "id": "hades-2", "title": "Hades II", "artwork": "hades-2.webp" }
```

The other suggested filenames are `assassins-creed-shadows.webp` and `pokemon-shield.webp`. Keep `artwork: null` until a file is available; the disc then uses its generated label without requesting a missing image. Artwork stays on this site. Change the `?v=` on the games JSON fetch in `wii-player.js` and its module import in `room.js` after replacing artwork or game data.

Mouse and touch can open the Wii directly. Keyboard users can open Recently played from the object list, Tab between the discs, or use Left/Right/Home/End to select a disc before pressing Enter. Escape and Back to room cancel the interaction safely, including during insertion. Reduced-motion mode skips the spinning entrance and shortens insertion.

## Cómo sustituir el modelo sin romperlo

- Sube el archivo nuevo **ya con el nombre `shelf.glb`** (renómbralo en tu ordenador antes de subirlo) y elige
  sustituir el existente. **No lo renombres desde la web de GitHub:** el editor de la web trata el `.glb` como texto y
  lo deja vacío (le pasó al de octubre: quedó en 2 bytes y la habitación dejó de cargar).
- Después cambia el número `?v=` de `shelf.glb` en `js/room.js` (y el de `room.js` en `room.html`) para que los
  navegadores descarguen el modelo nuevo en vez del guardado.
- O pídeselo a Claude: él lo sube, cambia los `?v=` y comprueba que la habitación carga.
