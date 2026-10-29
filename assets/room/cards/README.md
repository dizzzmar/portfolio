# Pokémon example cards

These eight real cards demonstrate the gallery. They are **examples**, not a claim about Mario's own collection. The UI marks them “Example cards”.

## Sources

- Fronts: TCGdex asset archive, individual original URLs recorded in `cards.json`. Base Set (Charizard, Blastoise, Venusaur, Pikachu), Evolving Skies (Umbreon VMAX, Rayquaza VMAX), Fusion Strike (Gengar VMAX, Mew V).
- Shared international reverse: https://tcg.pokemon.com/assets/img/global/tcg-card-back-2x.jpg
- Card artwork and marks belong to their respective rights holders (Pokémon / Nintendo / Creatures / GAME FREAK and credited illustrators).
- Downloaded 2026-10-29, converted to local WebP at up to 660 px wide. The gallery makes no visitor requests to these sources.
- Original geometric `*-placeholder.svg` assets remain available for use while curating the real collection.

## Replacing the examples

Edit `cards.json`:

- `back`: shared reverse image, relative to this directory.
- `cards`: ordered entries `{ "id": "unique-id", "name": "Card name", "front": "scan.webp" }`.
- Remove `example: true` when replacing an entry with a card Mario owns. `source` is provenance only, never fetched by the gallery.

Use a complete portrait crop, approximately 63:88, ideally at least 630 × 880 px. Images must be local to the same origin. An empty list shows an empty state; loading failures offer a retry.

## Interaction

The infinite gallery recycles a viewport-sized pool of DOM cards; it does not append content while scrolling. Mouse/touch dragging, trackpad/wheel and arrow keys move it in both directions. Hover turns the card according to the cursor position, revealing the common reverse toward its edges. Keyboard focus offers a reverse preview too. Clicking/tapping a card does nothing; there is no enlarged viewer or zoom. Escape returns to the Room. Reduced motion removes inertia and the decorative hover/focus turn.
