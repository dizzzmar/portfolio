# Tomato in the grass

Standalone motion study at `/experiments/tomato-grass/`. It uses a smooth procedural tomato and the existing Three.js CDN/version; it is not connected to the landing or navigation.

Serve the repository with `python3 -m http.server 8000` and open that path. No build step.

The visual direction borrows the fixed oblique camera, fine pixels, scattered grass edges and white space of [Shawn’s Small plays — Juggler](https://designeer.xyz/finds/zzzzshawn-2111545791819194865). No reference artwork or video is bundled.

`CONFIG` in `scene.js` controls render resolution, loop duration, jump height and deterministic grass seed. The tomato anticipates, jumps and settles; Pause and Hop again also work with keyboard/touch. Reduced motion starts with a still frame, and background tabs stop rendering. Load failures show a readable message.

Placement and final motion are pending review. This study does not modify the live portfolio pages.
