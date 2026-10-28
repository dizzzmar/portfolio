# Home loading scene

Original artwork exported from `experiments/tomato-grass/scene.js`: 56 frames at 10 fps, 144×144 pixels, lossless animated WebP (55 KB). `tomato-grass-still.webp` is the first frame for reduced motion.

The loader uses these local files without needing Three.js or the tomato model first. It waits for the landing's existing `tomato-ready` marker, sky image decoding and fonts, then fades out. There is no minimum wait; a 6-second safety timeout reveals the fallback landing if WebGL or the network fails. Direct hash routes and the existing navbar-to-home flight bypass it. Without JavaScript it stays hidden.

The scene enters with a 460 ms fade and gentle upward settle. A percentage counter under the scene advances a quarter for each thing that is really ready (illustration, fonts, sky, 3D tomato). Once the landing is ready, that entrance completes, the counter reaches 100, and the white surface lifts like a curtain (700 ms) while the illustration rises with it, uncovering the landing from the bottom up. Reduced motion skips both transitions. Animations use opacity and transform only, and their elements are removed after exit.
