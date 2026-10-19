# Interactive shelf

`shelf.glb` is the Blender export of `Personal_Interests_Shelf.blend` from the portfolio's Drive room folder. It includes embedded image textures and preserves the named mesh groups used for the blue hover outline in `/js/room.js`.

Each mesh opens its own addressable detail state. The `destinations` array in `/js/room.js` groups the main interests; add an `href` to a category when its real section exists. Keep the object names in future exports so hovering and clicking still target the right parts.

## Cómo sustituir el modelo sin romperlo

- Sube el archivo nuevo **ya con el nombre `shelf.glb`** (renómbralo en tu ordenador antes de subirlo) y elige
  sustituir el existente. **No lo renombres desde la web de GitHub:** el editor de la web trata el `.glb` como texto y
  lo deja vacío (le pasó al de octubre: quedó en 2 bytes y la habitación dejó de cargar).
- Después cambia el número `?v=` de `shelf.glb` en `js/room.js` (y el de `room.js` en `room.html`) para que los
  navegadores descarguen el modelo nuevo en vez del guardado.
- O pídeselo a Claude: él lo sube, cambia los `?v=` y comprueba que la habitación carga.
