# Tomato juggler — independent motion study

Open `/experiments/tomato-juggler/` from the repository's static server. This study is separate from the landing and does not replace its current loader.

An original procedural low-poly figure with simplified features based on Mario’s About portrait and its green patterned sweater juggles three instances of the portfolio's tomato model. The circular paving, grass edge, open aluminium laptop and figure are generated locally. The composition takes direction from [Shawn's Small plays — Juggler](https://designeer.xyz/finds/zzzzshawn-2111545791819194865); no reference frames, video or character assets are bundled.

The 2.4-second cascade uses staggered parabolas, alternating throws and a 0.18-second catch-to-throw scoop. Hand positions share the fruit timing. The body, head and fruit rotations close at the loop boundary. Pause supports mouse, keyboard and touch; reduced motion starts with a still frame. Hidden tabs stop drawing. A failed model load shows an error instead of a blank canvas.

`CONFIG` in `scene.js` controls pixel resolution, loop period and procedural seed. Three.js is served from the repository's existing local vendor directory. No build step or new visitor service is needed.

The character receives cast shadows as well as casting them, with lower ambient illumination to keep the trouser legs readable. Low swept hair and broad sweater patches reference the About portrait.

The laptop is scaled to 90% and angled slightly toward the viewer so the animated screen remains legible. A local Canvas texture draws two windows opening, moving and closing with a cursor over a 7.2-second loop. It shares the scene pause, reduced-motion and hidden-tab behavior.

The reference-focused art pass uses a higher oblique camera, a slimmer figure, muted meadow greens, grey paving with clear joints, sparse short grass and a shared 192-pixel grid with restrained ordered dithering.
