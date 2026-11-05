---
name: dizmar.xyz
description: Portfolio of Mario Diz, art director in Madrid. One family, two weights, a tomato at the centre.
colors:
  accent: "#0c0c0b"
  cursor: "#f83d0c"
  menu-red: "#df1f1f"
  cream: "#fff6ea"
  lincoln-green: "#125603"
  lime: "#c3f380"
  night-green: "#0b2f04"
  page-black: "#0c0c0b"
  ink: "#111111"
  white: "#ffffff"
  sky-blue: "#4f8fd8"
typography:
  display:
    fontFamily: "Funnel Display, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(56px, 9vw, 140px)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.05em"
  headline:
    fontFamily: "Funnel Display, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(40px, 5vw, 76px)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Funnel Display, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(24px, 2.8vw, 44px)"
    fontWeight: 600
    lineHeight: 1.05
  body:
    fontFamily: "Funnel Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(18px, 1.5vw + 8px, 22px)"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Funnel Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.3
  caps:
    fontFamily: "Funnel Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0.06em"
  menu-link:
    fontFamily: "Funnel Display, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(44px, 6.8vw, 112px)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.05em"
rounded:
  none: "0"
  pill: "999px"
spacing:
  margin: "24px"
  margin-mobile: "14px"
  bar-height: "64px"
components:
  button-pill:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
  nav-link:
    textColor: "{colors.white}"
    typography: "{typography.label}"
    height: "{spacing.bar-height}"
  menu-panel:
    backgroundColor: "{colors.menu-red}"
    textColor: "{colors.cream}"
  menu-link:
    textColor: "{colors.cream}"
    typography: "{typography.menu-link}"
  menu-small-link:
    textColor: "{colors.cream}"
    typography: "{typography.label}"
---

# Design System: dizmar.xyz

## Overview

**Creative North Star: "The Ripe Tomato"**

One piece of fruit at the centre and everything else arranged around it: the tomato is the logo, the 3D object on the landing page and the colour of the menu panel. The rest is deliberately plain so the fruit and the work (Lexus, Soap & Glory, Schweppes) stay the loudest things on screen. One typeface, two weights, flat colour, no shadows.

The tone is close and a little funny. Daily paths (reading, navigating) are precise and quiet; the humour lives in the rare places: the envelope you tear to write an email, the terminal, the FAQs, the cursor that bounces. Nothing explains itself with slogans or helper text; if a screen needs a label to make sense, the layout gets fixed instead.

Rejected on purpose: serif faces, more than two weights, decorative gradients and shadows, third-party fonts or embeds, and any text whose only job is to explain the interface.

**Key Characteristics:**
- One family, Funnel, in two cuts: Funnel Display for large titles only, Funnel Sans for everything that is read; text at two weights (700 orients, 400 is read) and large titles one step lighter at 600.
- Flat colour fields: black or sky for the work, Lincoln green with lime for the personal pages, tomato red for the menu.
- A 64 px bar with the tomato left and links right, the same everywhere.
- Motion is transform and opacity only, one shared ease-out, and it always has a reduced-motion path.
- Scrolling with a mouse or trackpad glides with inertia (js/smooth-scroll.js, no library): every notch sets a destination and the page eases into it on one constant curve. Touch and keyboard stay native.

## Colors

A tomato-and-garden palette: red fruit, green plant, sky above, near-black behind the work.

### Primary
- **Accent** (#0c0c0b, `--accent`): near-black. The "View project" button, text selection and focus rings in Projects. There is no coloured accent on text or buttons.
- **Cursor** (#f83d0c, `--cursor`): tomato red, used for the tomato itself. The cursor dot follows donut-studio.com instead: 16 px of #fff70d in `mix-blend-mode: difference` (blue on white, yellow on black), glued to the mouse with no lag, shrinking on press and opening into a "View" / "View project" pill over projects.
- **Menu Red** (#df1f1f): the full-screen menu panel, the bars of the Contact form, the page curtain and the big footer. A vivid pure red (the reference site's #ff1a1f is brighter but gives cream text only 3.6:1); this is the brightest red that keeps cream text at 4.51:1 (WCAG AA for small text).

### Secondary
- **Lincoln Green** (#125603): background of About, Privacy, FAQs and Machine, paired with Lime.
- **Lime** (#c3f380): all text and the cursor on green pages (6.98:1 on Lincoln Green). Secondary text on green runs at 80 % opacity (5.1:1).
- **Night Green** (#0b2f04): the Room only, where the 3D scene sits in a darker green; its list is lime at 70 % (6.4:1).

### Neutral
- **Cream** (#fff6ea): text on the menu panel.
- **Page Black** (#0c0c0b): the project pages in dark.
- **Ink** (#111111): text on light surfaces (buttons, the sky pages).
- **White** (#ffffff): text on dark (70 % for secondary, 60 % for the quietest) and button fills.
- **Sky Blue** (#4f8fd8): fallback for the sky photograph (`assets/images/sky.webp`) behind the landing page and Contact.

### Tokens
`--accent` (#0c0c0b), `--cursor` (#f83d0c), `--menu-red` (#df1f1f) and `--cream` (#fff6ea) live in `css/tokens.css`; so do the two curves, `--ease-out` for arrivals and `--ease-in-out` (`cubic-bezier(.77, 0, .175, 1)`) for moving across the screen. Do not write these values in other files.

### Named Rules
**The Green Pair Rule.** On green pages the only text colour is lime, never white or red. The red cursor would fall to 2.4:1 there, so it turns lime too.

**The No New Colours Rule.** A colour that is not in this list is decided here first, then written into `css/tokens.css`.

## Typography

**Display Font:** Funnel Display (variable, OFL licence), only for large titles: page titles, project names, the menu links, the 404 and the landing's tomato name. Its flared, decorative terminals are the point there and too busy for paragraphs.
**Body Font:** Funnel Sans (variable, OFL licence), the calmer sibling with the same bones, for running text, lists, labels and every small size. Both are self-hosted in `assets/fonts/` and preloaded; Helvetica Neue or Arial while they load.
**Label/Mono Font:** none, except Machine mode, which is monospace on purpose.

**Character:** a sharp, slightly decorative grotesk at 140 px that settles into a calm, neutral one at 14 px. Hierarchy comes from weight and size; the Display/Sans split is a size threshold (titles large enough to carry the flourishes), never decoration on small text.

### Hierarchy
- **Display** (600, 56–140 px, 1.05, −0.05 em): page titles (About, Privacy, FAQs) and the «Selected projects» title.
- **Headline** (600, 40–76 px, 1.05): large section titles.
- **Title** (600, 24–44 px, 1.05): section titles and the project name in its bar.
- **Body** (400, 16 px, 1.45, measure 34 em): all running text, lists and answers, after the reference kellauren.design (one text size; hierarchy by weight and space). The first paragraph of each page and the block headings share this size in 700. Only titles and the Contact envelope are larger.
- **Label** (400, 14 px, 1.3): bar links, buttons, footer, dates and every secondary line.
- **Caps** (400, 11 px, 0.06 em, uppercase): small labels and credits only.
- **Menu link** (700, 30–64 px from 821 px wide, 52–84 px below, 1, −0.045 em; −0.035 em below 1100 px): the five big links in the menu (`--fs-menu`). Cream on red gets one step more weight than the 600 titles so it does not look thinner. **Digital Archive** is half that size (600, `max(18px, 0.5 × --fs-menu)`, 24 px on a phone), on its own line under Projects, inside the same centred block.

### Named Rules
**The Weights Rule.** Text has two weights: 700 orients (first paragraph, block headings) and 400 is what you read. Large titles in Funnel Display sit one step lighter, at 600 (`--fw-title`). No 300 or 500.

**The One Source Rule.** Every size comes from `css/tokens.css`. If a size is missing, add it there and here; never write `15px` in another file.

## Layout

A single column of content under a fixed bar (`--nav-h`: 64 px, 56 px up to 700 px wide). Side margins are `--bar-gutter` (24 px, 14 px up to 700 px wide) on the bar, the tomato, the footer, the menu and the Room's footer; content uses the page's own `--margin`. Reading text never exceeds 34 em. The footer is the same on every page and in the menu: "Mario Diz, Madrid · FAQs · Privacy" on the left and, on pages that scroll, "Back to top ↑" on the right (Room does not scroll, so it has only the left text). Only its colour changes with the page. There are no other footer links: Terminal opens with the ` key and Machine mode is reached through `<link rel="alternate">` in every page's head, `llms.txt` and the sitemap.

A project page with a single asset (`class="is-single"` on `.p-gallery`, see `templates/project-template/`) has no strip to scroll: the asset starts on the same line as the cards of the other projects (25 % of the width), is shown whole at its own ratio and never taller than the screen leaves room for the text below, and on mobile fills the width. No progress hairline and no "Go to film" link.

The menu uses the whole viewport: on desktop the five big links sit on one row, spread edge to edge at the vertical centre, small with wide gaps between them (`--fs-menu` is `clamp(30px, 3.4vw, 64px)`: about 130 px between words at 1440 px, 60 px at 830 px); at 820 px and below they stack and drop to thumb height just above the footer line, so the thumb reaches them without stretching. The footer line (the same text as the page footer) is pinned to the bottom left.

## Elevation & Depth

Flat. There are no shadows at rest and none are added on interaction. Depth comes from colour fields and movement: when you change page, the new page rises 12 px over the old one, which recedes (scale 0.985, 82 % brightness); the menu panel is a curtain that covers the page.

## Shapes

Straight corners on project imagery; a full pill (999 px) on buttons. The tomato logo and 3D tomato are the only organic silhouettes. No borders or boxes around content: groups are separated by space, not lines.

## Components

Close and a little funny: precise when used daily, playful where visitors do not go every day. This is the summary; the full detail of each area is in `docs/design/` (read only the one you are working on, and add new per-page detail there, never here):

- **Bar and menu** (`docs/design/chrome.md`): 64 px bar, tomato left, one word «Menu» right, always `mix-blend-mode: difference` with no background (the tomato sits outside `<nav>`); the menu is a full-screen Menu Red curtain with the five big links plus Digital Archive; a flat colour curtain (`--curtain`) between pages; keyboard and reduced-motion paths for all of it.
- **Text links, buttons, cursor, sounds, footer** (`docs/design/chrome.md`): links roll letter by letter on hover (no underline; plain underline on touch); buttons are a 999 px pill; the cursor is a 16 px dot in difference blend (mouse only); link sounds are on by default with a switch in the big footer; the big DIZMAR footer is the only footer on pages that scroll.
- **Projects and project pages** (`docs/design/projects.md`): two-column pages (sticky facts left, media right), per-project palettes, Posters, Studies, More works.
- **About** (`docs/design/about.md`): green page, sticky holographic portrait that flips to a pixel-art isometric scene (full screen on pink).
- **Plant Lab and Playground** (`docs/design/playground.md`): the node sandbox in a typographic-poster look, and the dot field.
- **Digital Archive** (`docs/design/archive.md`): black, endless walls without text, piece viewer, white pixel trail.
- **Contact** (`docs/design/contact.md`): mustard window, a conversation in red bars (message → name → email → send), and the DIZ sachet.
- **The Room** (`docs/design/room.md`): 3D shelf rendering and the Pokémon album.

### Buttons
- **Shape:** a full pill (999 px).
- **Primary:** white fill, ink text, 14 px; on the sky pages, a white outline instead.
- **Hover / Focus:** a quick scale on press; the cursor dot shrinks on press. Over links and buttons it grows ×2.4 and turns 70 % opaque, and the real cursor (the hand) shows on top of it; nowhere else.

### The Terminal
A dark panel opened with the ` key from any page (no visible link: it is a wink for whoever looks for it), with an ASCII tomato, a scramble on its title and hidden commands. It is the clearest place for humour in the site.

## Do's and Don'ts

### Do:
- **Do** use only Funnel (Display for large titles via `--font-display`, Sans for the rest via `--font-ui`) at 400 and 700 (large titles at 600), sizes from `css/tokens.css`.
- **Do** animate only `transform` and `opacity`, with `var(--ease-out)` (`cubic-bezier(0.23, 1, 0.32, 1)`) for arrivals; UI 150–300 ms, underline 400 ms, section entrances up to 700 ms, the menu up to 0.7 s because it is a deliberate moment.
- **Do** give every animation a reduced-motion path that keeps opacity and colour changes.
- **Do** keep text on Lincoln Green in Lime, and check any new pair for 4.5:1 (3:1 for large text).
- **Do** choose, between options, the one that improves visitors, maintainers and agents together (meaningful HTML, real links, `machine/`, `llms.txt` and `sitemap.xml` up to date).
- **Do** link `css/tokens.css` first on every page, then the rest; bar and footer identical to the other pages. A new page also needs the `li.menu-li` button and `has-menu` in the head script.
- **Do** bump the `?v=` number of any changed `.css` or `.js` on every page.

### Don't:
- **Don't** add slogans, helper text or secondary labels; fix the layout instead. Only legal text, screen-reader names and informative errors or loading states stay.
- **Don't** use a serif, a third weight, shadows, gradients or borders to separate content.
- **Don't** add third-party code, fonts, embeds or analytics without deciding it first (today none: three.js is self-hosted in `assets/vendor/three/`), and never put keys, passwords or personal data in the repository (see `CLAUDE.md`).
- **Don't** animate sizes, margins or shadows.
