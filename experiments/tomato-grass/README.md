# Tomato in the grass

Standalone motion study at `/experiments/tomato-grass/`. It uses the original low-poly tomato model, enlarged with a gentle red color boost and the existing Three.js CDN/version; the landing loader uses a pre-rendered export of this scene.

Serve the repository with `python3 -m http.server 8000` and open that path. No build step.

The visual direction borrows the fixed oblique camera, fine pixels, scattered grass edges and white space of [Shawn’s Small plays — Juggler](https://designeer.xyz/finds/zzzzshawn-2111545791819194865). No reference artwork or video is bundled.

`CONFIG` in `scene.js` controls render resolution, loop duration, jump height and deterministic grass seed. The tomato anticipates, jumps and settles; Pause and Hop again also work with keyboard/touch. Reduced motion starts with a still frame, and background tabs stop rendering. Load failures show a readable message.

The interactive study remains standalone. Its 5.6-second loop is exported to `assets/loading/tomato-grass.webp` for the home loading screen, avoiding a second WebGL scene during startup.

The shared render grid is 144×144 (roughly 100 pixels across the grass island, enlarged for a more pronounced pixel effect). A final ordered-dither pass applies the same color stepping to fruit, grass and shadow. Grass detail is sized for that grid rather than adding subpixel blades.
