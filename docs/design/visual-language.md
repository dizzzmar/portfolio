# Visual language: professional work and personal voice

Design direction agreed with Mario on 7 November 2026. These rules govern future implementation. This document does not claim the current pages have already migrated. It supersedes older blanket rules requiring Funnel everywhere or assigning a fixed colour to all personal pages.

## Typography follows the content

Two voices share one interface:

- **Professional — Funnel.** Funnel Display for large titles; Funnel Sans for descriptions of work, roles, services, clients, credits and project facts.
- **Personal — serif.** Personal titles, biography, values, opinions, essays and editorial introductions to collections. Use one serif family throughout this voice; regular for reading, italic for a short emphasis or quotation, bold sparingly for hierarchy.
- **Interface — Funnel Sans.** Navigation, Menu/Close/Back, buttons, filters, video controls, dates, counters and factual captions always use Funnel Sans, regardless of the page's subject or background. Existing global menu/footer display treatments may keep Funnel Display. Machine mode keeps its functional monospace.

The serif family is not selected yet. Choose it in a separate visual comparison using real About and essay text. A system serif can stand in during that comparison; do not introduce a remote font service. Once selected, use a licensed local font or a documented system stack and one shared `--font-personal` token. Do not hard-code different serif stacks per page.

Do not alternate families inside a sentence, make individual words serif for decoration, or switch family on hover. Mix the two voices in distinct content blocks. Professional and personal headings of the same rank should have comparable visual prominence, rather than identical numeric sizes forced onto different letterforms. The serif needs its own line-height and tracking; never inherit Funnel's tight negative display tracking automatically.

## Page mapping

| Surface | Editorial content | Shared interface |
|---|---|---|
| Landing | Mario Diz/site identity stays Funnel; playful tomato remains the signature | Funnel |
| Projects / client and study projects | Funnel, including case-study narrative | Funnel |
| Posters | Funnel: personal authorship does not change its role as presented design work | Funnel |
| About | Serif for Mario Diz, biography, values and personal commentary; Funnel for services, clients, roles and contact details | Funnel |
| Digital Archive | Serif for archive/collection titles and personal introductions; curated commentary and essays in serif | Funnel for category navigation, facts, counters and viewer controls |
| Room | Serif for personal editorial headings; objects/scenes retain their own artwork | Funnel for object selectors, game/music/film facts and controls |
| FAQs / Privacy | Funnel: practical information rather than personal editorial voice | Funnel |

An album title in a personal editorial heading can be serif; the same album listed as factual metadata uses Funnel. Classify by function, not by a page-wide font switch. Brand lettering inside project images, cards and artwork is content and is not restyled.

## About is the bridge

Keep the portrait and text content. Organise the page into clear blocks:

1. Name, biography and values: serif; biography is regular reading text rather than a whole bold paragraph.
2. Services, skills, client list and professional facts: Funnel.
3. Music/film commentary, if written in Mario's voice: serif. Record/film names, update dates and controls: Funnel as factual UI.
4. Menu, links and footer: the same global interface as elsewhere.

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

1. Compare serif candidates on About and one existing essay, desktop and mobile; select the family before migrating the other personal areas.
2. Establish the shared personal font token and type roles. Apply mixed roles to About while preserving its portrait and content.
3. Extend the same roles to Archive and Room. Keep factual UI in Funnel.
4. Consolidate semantic colour tokens and page briefs. Preserve project artwork, independent palettes and existing interactions.

This is a documentation change. No CSS, HTML, fonts or live pages are changed by adopting the rules in this PR.
