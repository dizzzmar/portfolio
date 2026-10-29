# Pokémon collection

Temporary, original vector placeholders; they do not represent Mario's actual collection.

Edit `cards.json` to replace them with local scans of the cards Mario owns:

- `back`: shared reverse image, relative to this directory.
- `cards`: ordered list of `{ "id": "unique-id", "name": "Card name", "front": "scan.webp" }`.
- Remove `placeholder: true` once an entry has its real artwork.

Use the card's full portrait crop (approximately 63:88), ideally at least 630 × 880 px. All images must be on the same origin; no remote requests are made by the gallery. An empty list shows an honest empty state. The current shared reverse is also provisional, not an official Pokémon back.
