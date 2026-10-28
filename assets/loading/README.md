# Home loading scene

The juggler is exported from `experiments/tomato-juggler/scene.js`: 72 frames at 10 fps, 192×192 pixels, lossless animated WebP with a transparent background (155 KB). `tomato-juggler-still.webp` is a representative frame for reduced motion.

The loader uses these local files without needing Three.js or the tomato model first. It waits for the landing's existing `tomato-ready` marker, sky image decoding and fonts, then fades out. There is no minimum wait; a 6-second safety timeout reveals the fallback landing if WebGL or the network fails. Direct hash routes and the existing navbar-to-home flight bypass it. Without JavaScript it stays hidden.

The loader is only the animation: a green screen (`--green`) with the animation in the middle; no text and no counter. The scene enters with a 460 ms fade and a gentle upward settle. Once the landing is ready, that entrance completes and the green surface lifts like a curtain (700 ms) while the illustration rises with it, uncovering the landing from the bottom up. Reduced motion skips both transitions. The animations use opacity, transform and clip-path only, and their elements are removed after exit.
