# Tráiler de lanzamiento de dizmar.xyz

Vídeo de 24,5 s (1920×1080, 30 fps) hecho con [Remotion](https://www.remotion.dev): React que se convierte en MP4.
Sigue la estructura del showreel "Branding agency showreel" (@jacksonfall, MotionVideo): revelado de marca → aplicaciones en cortes de un pulso → corte seco, con un estilo de movimiento distinto en cada bloque. El contenido son los assets de la web (carpeta `../assets`, enlazada en `public/assets`).

No forma parte de la web: aquí solo está el código fuente del vídeo.

## Cómo generarlo

```bash
cd trailer
npm install
npm run music     # crea public/music.wav (música original sintetizada, 120 BPM; necesita python3 + numpy)
npm run studio    # vista previa en el navegador, con línea de tiempo
npm run render    # crea out/dizmar-launch-trailer.mp4
```

## Dónde se cambia cada cosa

- `src/Trailer.tsx` — el orden y la duración de cada plano (lista `SHOTS`, en fotogramas; 15 fotogramas = 1 pulso).
- `src/scenes.tsx` — cada escena: textos, imágenes y animación.
- `src/lib.tsx` — colores, letra y curvas (los de `DESIGN.md`).
- `music/make_music.py` — la música (batería, bajo, acordes, golpes). Si cambias los cortes, mantén los golpes en los mismos pulsos.

Licencia de Remotion: gratis para personas y empresas de hasta 3 empleados; empresas más grandes necesitan licencia.
