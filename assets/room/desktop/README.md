# Desktop diorama

Second Room diorama, prepared independently for review before horizontal room navigation is added. The existing shelf remains the first scene.

- `desktop.blend`: editable named props, packed walnut texture, camera and warm lighting rig.
- `desktop.glb`: static meshes grouped by material, separate `Monitor_Screen` mesh with 0–1 UVs, six embedded punctual practical lights. Blender Z-up converts to glTF Y-up on export.
- `preview.png`: transparent Blender reference render.
- `/experiments/desktop/`: local Three.js preview with drag, touch, arrow-key rotation, zoom and reset. Uses the selected two-CSS-pixel shelf density. Draws on demand.

Two walls only: the front-facing back wall and right return. The model uses metres; the foundation is 2.65 × 2.02 m, walls 3.30 m tall. Props use simple bevelled silhouettes, low-resolution packed wood grain and restrained materials. Artwork is original geometric linework inspired by the supplied composition, not a reproduction of its prints.

## Regenerate

From the repository root:

```sh
blender -b --python scripts/build-desktop-diorama.py
```

The saved Blender file retains all individual props. The web export joins static meshes by material to reduce draw calls; never merge `Monitor_Screen`, whose material is `MONITOR_SCREEN_REPLACE_ME`. Replace that surface with future image/video content.

Mushroom bulb, desk task spotlight, under-shelf lighting and three orange wall-wash sources are positioned in the model and exported using `KHR_lights_punctual`. Soft studio area lights are Blender-only; the preview adds hemisphere and directional fill. Browser lighting is an approximation of the Blender render (no baked indirect illumination). The preview rescales Blender’s exported photometric intensity for the room renderer, with a stronger orange wall wash. Embedded lights do not each request shadow maps; one fill light casts shadows. Check performance on a physical mobile before integrating the multi-diorama room.

## Scene refinement

Matte enamel and worn cognac materials, thinner floor edge, Nothing Headphone (1)-inspired shells resting on a stand, and a SKÅDIS-style slotted board with hooks, overlapping cards, tape, a storage pocket and hanging cable. Loose papers, glasses, magazines and a keyboard cable add everyday detail. These are simplified modelled interpretations, not manufacturer CAD. Keyboard: Keychron K3 Max-inspired low-profile 75% ANSI layout, staggered keys, function row, navigation column, arrow cluster and orange Escape key.
