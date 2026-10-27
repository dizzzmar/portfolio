# Home loading scene

Original artwork exported from `experiments/tomato-grass/scene.js`: 56 frames at 10 fps, 144×144 pixels, lossless animated WebP (55 KB). `tomato-grass-still.webp` is the first frame for reduced motion.

The loader uses these local files without needing Three.js or the tomato model first. It waits for the landing's existing `tomato-ready` marker, sky image decoding and fonts, then fades out. There is no minimum wait; a 12-second safety timeout reveals the fallback landing if WebGL or the network fails. Direct hash routes and the existing navbar-to-home flight bypass it. Without JavaScript it stays hidden.
