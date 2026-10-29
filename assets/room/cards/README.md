# Pokémon cards

The 35 cards of Mario's collection that make the best gallery: full arts, ex and VMAX, holos and the prettiest illustrations. Each is the **official scan of that card**, not a photo of Mario's own copy, so every card looks clean and the same. The collection itself is larger; these were chosen by eye.

## Sources

- Japanese-era cards (Scarlet & Violet and Mega series): official card images from https://scrydex.com (`images.scrydex.com/pokemon/<set>_ja-<number>/large`). The exact address of each is recorded as `source` in `cards.json`.
- Cards from 2021–22 (Sword & Shield): the English card with the same illustration, from the TCGdex asset archive (`assets.tcgdex.net`). Korean, Chinese and Spanish copies show the same artwork as these, only the text language differs.
- Card artwork and marks belong to their respective rights holders (Pokémon / Nintendo / Creatures / GAME FREAK and credited illustrators). Converted to local WebP at 520 px wide. The gallery makes no visitor requests to any of these sources.
- `set` is the English name of the expansion the scan comes from. For the 2021–22 cards that is the English expansion, which can differ from the one printed on the Japanese or Korean copy (for example Fusion Strike for a Fusion Arts card).

## Adding or replacing cards

Edit `cards.json`:

- `cards`: ordered entries `{ "id": "unique-id", "name": "Card name", "set": "Expansion", "front": "scan.webp", "source": "where the scan came from" }`. `set` is the caption's second line (optional); `source` is provenance only, never fetched by the gallery.
- Use a complete portrait crop, approximately 63:88, at least 520 px wide. Images must be local to the same origin. An empty list shows an empty state; loading failures offer a retry.
- Change the `?v=` of `cards.json` in `js/room/pokemon-album.js` and of the files that import it, so browsers fetch the new list.

## Interaction

The infinite gallery is a collage on black: staggered columns, each card with its caption (name and expansion, from `name` and `set` in `cards.json`). A viewport-sized pool of DOM cards is recycled; it does not append content while scrolling, and the arrangement keeps the same card from sitting next to itself. Mouse/touch dragging, trackpad/wheel and arrow keys move it in both directions with the site's scroll feel; release velocity decays gradually. Cards move only in 2D; the card under the mouse lifts and leans toward the cursor. Clicking/tapping a card never opens an enlarged viewer or zoom. Escape or «Close» returns to the Room. Reduced motion removes inertia, the lean and the entrance rise. Rendering stops at rest and while the tab is hidden.
