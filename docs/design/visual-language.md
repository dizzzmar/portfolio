# Visual language: professional work and personal voice

Design direction agreed with Mario on 7 November 2026. These rules govern future implementation. This document does not claim the current pages have already migrated. It supersedes older blanket rules requiring Funnel everywhere or assigning a fixed colour to all personal pages.

## Typography follows the content

Two voices share one interface:

- **Professional — Funnel.** Funnel Display for large titles; Funnel Sans for descriptions of work, roles, services, clients, credits and project facts.
- **Think pieces — Source Serif 4.** Only the Think pieces index and its essays use serif editorial titles and reading text. Regular 400 for reading, 600 for headlines, true italic for emphasis. All other sections use Funnel, including About, the main Digital Archive, collection viewers and Room. This scoped rule supersedes the broader professional/personal split for now.
- **Interface — Funnel Sans.** Navigation, Menu/Close/Back, buttons, filters, video controls, dates, counters and factual captions always use Funnel Sans, regardless of the page's subject or background. Existing global menu/footer display treatments may keep Funnel Display. Machine mode keeps its functional monospace.

**Selected family: Source Serif 4**, chosen after comparing it with Instrument Serif, Literata and Lora on real content. It supports optical sizing for both text and display. On implementation, host the licensed regular and italic fonts locally, use one shared `--font-personal` token and enable `font-optical-sizing: auto`. Do not introduce a remote font service or hard-code different serif stacks per page. The selection is confirmed for Think pieces only; no wider migration is planned.

Do not alternate families inside a sentence, make individual words serif for decoration, or switch family on hover. Mix the two voices in distinct content blocks. Professional and personal headings of the same rank should have comparable visual prominence, rather than identical numeric sizes forced onto different letterforms. The serif needs its own line-height and tracking; never inherit Funnel's tight negative display tracking automatically.

## Page mapping

| Surface | Editorial content | Shared interface |
|---|---|---|
| Landing | Mario Diz/site identity stays Funnel; playful tomato remains the signature | Funnel |
| Projects / client and study projects | Funnel, including case-study narrative | Funnel |
| Posters | Funnel: personal authorship does not change its role as presented design work | Funnel |
| About | Funnel throughout, including Mario Diz, biography and values; deliberate exception after visual review | Funnel |
| Digital Archive and collections | Funnel, including titles and introductions | Funnel |
| Think pieces index and essays | Source Serif 4 for editorial headings and text | Funnel for navigation, dates, captions and controls |
| Room | Funnel throughout; objects/scenes retain their own artwork | Funnel |
| FAQs / Privacy | Funnel: practical information rather than personal editorial voice | Funnel |

Only editorial text inside Think pieces uses serif; album titles and other collections stay Funnel. Brand lettering inside project images, cards and artwork is content and is not restyled.

## About stays sans serif

Mario rejected the serif trial on About and asked to keep that page sans serif. Keep Funnel for the name, biography, values, services, music/film blocks and client list, as well as its navigation. Preserve the portrait and text. The closed Instrument Serif trial (#399) must not be merged or used as the migration base. The serif exception is confined to Think pieces; do not reintroduce a serif on About.

Do not change the biography's meaning or switch between first and third person as a side effect of styling. Any copy rewrite is a separate decision.

## Colour is free, with rules

Colours may differ by section, collection or project, and may evolve. A font voice does not imply a colour: personal is not always green; professional is not always white or black.

- Give each surface a documented foreground/background pair, a secondary text treatment and a visible focus treatment. Use semantic theme tokens, rather than scattered literal colours.
- One deliberate pair per surface or chapter. Background changes within a page follow a content boundary or purposeful interaction; do not randomise colours while someone is reading.
- Derive project palettes from the work. Personal palettes may draw from the collection or subject. The tomato, shared navigation and type roles maintain recognition across these changes.
- Check the full pair, including secondary text, links, focus, hover and controls: at least 4.5:1 for small text and 3:1 for large text and essential graphical controls. Do not rely on difference blending to guarantee contrast.
- A change of palette does not introduce a different button shape, spacing system, font role or menu behaviour. Global menu/footer retain their existing shared red theme until a separate redesign is agreed.
- The current green/lime pairing remains valid, but is a theme rather than the mandatory colour of personal content. Document new palettes before implementing them.

## Shared structure and motion

All voices share the navigation anchors, spacing grid, responsive margins, control styles, keyboard behaviour, motion curves and reduced-motion support. Serif does not require extra ornament; Funnel does not prohibit playful motion. Use larger expressive effects where the artifact is the subject (landing, Room, galleries) and quieter transitions around reading. Pixelation belongs to imagery and 3D scenes, not reading text or navigation.

## Implementation order

1. Use the selected Source Serif 4 family with shared personal type tokens, regular and italic styles, and optical sizing. Fine-tune reading and headline metrics on the existing Archive essay.
2. Keep Source Serif 4 confined to Think pieces. Archive, Room and About stay Funnel.
3. Consolidate semantic colour tokens and page briefs. Preserve project artwork, independent palettes and existing interactions.

This is a documentation change. No CSS, HTML, fonts or live pages are changed by adopting the rules in this PR.
