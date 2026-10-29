---
name: dizmar.xyz
description: Portfolio of Mario Diz, art director in Madrid. One family, two weights, a tomato at the centre.
colors:
  accent: "#0c0c0b"
  cursor: "#f83d0c"
  menu-red: "#d03a22"
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
- **Accent** (#0c0c0b, `--accent`): near-black. The "View project" button, text selection and focus rings in Work. There is no coloured accent on text or buttons.
- **Cursor** (#f83d0c, `--cursor`): tomato red, used for the tomato itself. The cursor dot follows donut-studio.com instead: 16 px of #fff70d in `mix-blend-mode: difference` (blue on white, yellow on black), glued to the mouse with no lag, shrinking on press and opening into a "View" / "View project" pill over projects.
- **Menu Red** (#d03a22): the full-screen menu panel. A deeper tomato chosen so cream text on it reaches 4.55:1 (the brand red gives only 3.6:1).

### Secondary
- **Lincoln Green** (#125603): background of About, Privacy, FAQs and Machine, paired with Lime.
- **Lime** (#c3f380): all text and the cursor on green pages (6.98:1 on Lincoln Green). Secondary text on green runs at 80 % opacity (5.1:1).
- **Night Green** (#0b2f04): the Room only, where the 3D scene sits in a darker green; its list is lime at 70 % (6.4:1).

### Neutral
- **Cream** (#fff6ea): text on the menu panel.
- **Page Black** (#0c0c0b): Work and the project pages in dark.
- **Ink** (#111111): text on light surfaces (buttons, the sky pages).
- **White** (#ffffff): text on dark (70 % for secondary, 60 % for the quietest) and button fills.
- **Sky Blue** (#4f8fd8): fallback for the sky photograph (`assets/images/sky.webp`) behind the landing page and Contact.

### Tokens
`--accent` (#0c0c0b), `--cursor` (#f83d0c), `--menu-red` (#d03a22) and `--cream` (#fff6ea) live in `css/tokens.css`; so do the two curves, `--ease-out` for arrivals and `--ease-in-out` (`cubic-bezier(.77, 0, .175, 1)`) for moving across the screen. Do not write these values in other files.

### Named Rules
**The Green Pair Rule.** On green pages the only text colour is lime, never white or red. The red cursor would fall to 2.4:1 there, so it turns lime too.

**The No New Colours Rule.** A colour that is not in this list is decided here first, then written into `css/tokens.css`.

## Typography

**Display Font:** Funnel Display (variable, OFL licence), only for large titles: page titles, project names, the menu links, the 404 and the landing's tomato name. Its flared, decorative terminals are the point there and too busy for paragraphs.
**Body Font:** Funnel Sans (variable, OFL licence), the calmer sibling with the same bones, for running text, lists, labels and every small size. Both are self-hosted in `assets/fonts/` and preloaded; Helvetica Neue or Arial while they load.
**Label/Mono Font:** none, except Machine mode, which is monospace on purpose.

**Character:** a sharp, slightly decorative grotesk at 140 px that settles into a calm, neutral one at 14 px. Hierarchy comes from weight and size; the Display/Sans split is a size threshold (titles large enough to carry the flourishes), never decoration on small text.

### Hierarchy
- **Display** (600, 56–140 px, 1.05, −0.05 em): page titles (About, Privacy, FAQs) and project names in Work.
- **Headline** (600, 40–76 px, 1.05): large section titles.
- **Title** (600, 24–44 px, 1.05): section titles and the project name in its bar.
- **Body** (400, 16 px, 1.45, measure 34 em): all running text, lists and answers, after the reference kellauren.design (one text size; hierarchy by weight and space). The first paragraph of each page and the block headings share this size in 700. Only titles and the Contact envelope are larger.
- **Label** (400, 14 px, 1.3): bar links, buttons, footer, dates and every secondary line.
- **Caps** (400, 11 px, 0.06 em, uppercase): small labels and credits only.
- **Menu link** (600, 44–112 px from 821 px wide, 52–84 px below, 1, −0.05 em): the four big links in the menu (`--fs-menu`).

### Named Rules
**The Weights Rule.** Text has two weights: 700 orients (first paragraph, block headings) and 400 is what you read. Large titles in Funnel Display sit one step lighter, at 600 (`--fw-title`). No 300 or 500.

**The One Source Rule.** Every size comes from `css/tokens.css`. If a size is missing, add it there and here; never write `15px` in another file.

## Layout

A single column of content under a fixed bar (`--nav-h`: 64 px, 56 px up to 700 px wide). Side margins are `--bar-gutter` (24 px, 14 px up to 700 px wide) on the bar, the tomato, the footer, the menu and the Room's footer; content uses the page's own `--margin`. Reading text never exceeds 34 em. The footer is the same on every page: "Mario Diz, Madrid · Privacy" and "Back to top ↑".

A project page with a single asset (`class="is-single"` on `.p-gallery`, see `templates/project-template/`) has no strip to scroll: the asset starts on the same line as the cards of the other projects (25 % of the width), is shown whole at its own ratio and never taller than the screen leaves room for the text below, and on mobile fills the width. No progress hairline and no "Go to film" link.

The menu uses the whole viewport: on desktop the four big links sit on one row, spread edge to edge at the vertical centre; at 820 px and below they stack and drop to thumb height just above the small row, so the thumb reaches them without stretching. The small row (Machine, FAQs, Terminal, Privacy) is pinned to the bottom, two links on each side.

## Elevation & Depth

Flat. There are no shadows at rest and none are added on interaction. Depth comes from colour fields and movement: when you change page, the new page rises 12 px over the old one, which recedes (scale 0.985, 82 % brightness); the menu panel is a curtain that covers the page.

## Shapes

Straight corners on project imagery; a full pill (999 px) on buttons. The tomato logo and 3D tomato are the only organic silhouettes. No borders or boxes around content: groups are separated by space, not lines.

## Components

Close and a little funny: precise when used daily, playful where visitors do not go every day.

### Navigation
- **Bar:** 64 px high, tomato logo at the left (24 px, 14 px on mobile), links right in 14 px white at 70 %. On every page with a bar the links are replaced by one word, **Menu**.
- **Menu:** the "Menu" word, right-aligned in the bar, opens a full-screen **Menu Red** panel with cream text. The panel falls from the top like a curtain (0.6 s, `cubic-bezier(.77,0,.175,1)`); the four big links rise one by one out of a mask (0.7 s, 70 ms apart); the small row fades in last. Closing is the same animation reversed and faster. The tomato and "Close" are drawn exactly where the page's tomato and "Menu" are, so the bar appears not to move.
- **Choosing a link to another page:** the panel does not close. The big links rise out of their masks (the chosen one last), the small row fades, and the red stays over the screen while the new page loads underneath it; once loaded, the curtain lifts to reveal it (same curve as closing). Links that stay on the page (Work on the landing, Contact's envelope, Terminal) do close the panel first. With reduced motion the page simply changes.
- **Big links:** Work, About, Room, Contact. Hovering one lowers the others to 75 % opacity (still 3:1); the current page is underlined.
- **Small links:** Machine, FAQs, Terminal, Privacy in 14 px, underlined. Machine mode, which has no menu, keeps its own Human | Machine switch and a Terminal link in its footer.
- **Keyboard:** focus moves into the panel, Tab stays inside, Esc closes and focus returns to "Menu". With reduced motion the panel only fades (0.15 s).

### Project pages
The bar carries the tomato and the project name next to it, in Funnel Display at 24 px (desktop and mobile alike); the name is the back button to Work (on hover it becomes "Back to projects"). Year and client sit in the bar's columns on desktop and in one row under the bar on mobile. No big title in the page: the asset leads.

### Breadcrumbs
A single line in the bar, right of the tomato: "Home / About" (14 px, Home at 80 % opacity as a link, the current page at full strength and not a link). Only on the one-level green pages (About, FAQs, Privacy, Room); project pages already carry their name and the back button. Every page also declares a `BreadcrumbList` in JSON-LD. A new one-level page needs both the visible line and the JSON-LD.

### Text links
No fixed underline. On hover a 1 px line draws in from the side the pointer enters and leaves from the side it exits (0.4 s). In a paragraph there is also a faint permanent line. On touch it is a normal underline. The current page keeps the full line.

### Buttons
- **Shape:** a full pill (999 px).
- **Primary:** white fill, ink text, 14 px; on the sky pages, a white outline instead.
- **Hover / Focus:** a quick scale on press; the cursor dot shrinks on press. Over links and buttons it grows ×2.4 and turns 70 % opaque, and the real cursor (the hand) shows on top of it; nowhere else.
- **About:** follows the project-page composition while keeping its green/lime identity: a large Funnel Display title repeats horizontally; below it, a sticky 28% column holds the unchanged biography and contact links, while the right column starts with the holographic portrait and continues with capabilities, values, now playing and client logos. The portrait is 4:5 and capped at 620 px. The document scrolls normally; below 760 px the columns stack and the sidebar is no longer sticky. Reduced motion stops the title and portrait motion.

- **Project pages (all, css/case-layout.css):** a huge title runs sideways; below, as on donut-studio.com, a sticky left column holds the facts (14 px pairs, label soft and value at 500, like «Based in Madrid» in Work) and the text at 16 px regular; the media stack on the right, one under another, each image easing from 1.06 to 1 as it appears. Only ENMAD, which has three parts, adds an index of the parts with their counts (16–20 px at 500; the part in view underlined, like the current page in the bar) and a heading for each part. There is no rule under the running title: the change from band to body is marked by colour.
- **Palettes (css/palettes.css, `data-palette` on `<html>`):** each project can have its own bold pair of colours, as on donut-studio.com: a band (the running title, the fixed bar at the top, «More works» and the footer) in one pair and the body in another, with a third colour for the labels. Without `data-palette` the page is white with ink. Contrast is checked per palette: band title ≥ 3:1 (large text), small text on the band ≥ 4.5:1, body text and labels ≥ 4.5:1. Current palettes: Lexus (copper #ff7a3d band, deep green #0f2a22 body, cream text), Schweppes (gold #ffc61a band, brown #2a1406 body), Schweppes x The Gentlemen (the same pair inverted: brown band, gold body), Soap & Glory (pink #ff5c93 band, cream #ffe8d2 body) and ENMAD (the Studies pink #ffa2d4 with deepened red text, #8f1003 for reading at 5.1:1 and #c41a08 for large titles at 3.3:1; the dossier red #ff2711 only gives 2:1). The fixed bar at the top is solid in the band colour, so the text reads over any image passing underneath.
- **Posters (/posters/):** a collage of personal, fictional design work (posters, merch, album covers) under the same running title and fixed bar as the project pages, with a one-line notice (not commissioned by or affiliated with the artists or brands shown) and «Fictional work» always in the bar. Pieces sit in four columns (three on a tablet, two on a phone), the merch and mockups cut out so they float on the white; a few columns are inset to break the grid. Pieces with several colour versions (The 1975, Paramore, Bon Iver, Kick) switch version by themselves every 2.2 s while on screen, each starting at its own time; with reduced motion they stay still. Clicking a piece opens a full-screen viewer (a `dialog`) with every image of that mini-project: ← → or a tap on the image to move, thumbnails below, Esc or Close to leave, swipe on touch; the address keeps the place (`#the-1975/2`). In Work it has its own small «Personal» heading and one row, before Studies.
- **Studies in Work:** university projects sit under a small «Studies» heading, with the name in red; when that heading crosses the middle of the screen the whole page turns pink and every text deep red (body class studies-on), and back to white when scrolling up.
- **More works:** every project page ends on page black with a huge "More works" title running sideways without stopping and two cards for the next projects in the Work order (01, 02). Hovering a card zooms its image slowly and dims the other; the cursor reads "View". With reduced motion the title stands still.

### Cursor (mouse only)
A 24 px tomato dot. It grows over buttons, cards and objects; disappears over text links, "View project" and videos (the line, the label or PLAY/PAUSE act as the indicator); shrinks and turns white over red; stretches like a drop while scrolling. Lime on green pages.

### The Envelope (Contact)
A sky background and one phrase, "Tear top open". Tearing the top opens the mail app directly; if nothing opens within 1.4 s, the address and a "Copy email" button appear below.

### The Terminal
A dark panel opened from the menu or with the ` key, with an ASCII tomato, a scramble on its title and hidden commands. It is the clearest place for humour in the site.

### Room / Pokémon album
- A full-screen black dialog within Room uses the existing Funnel fonts and white text. An infinite two-axis grid recycles a fixed viewport-sized pool of portrait cards; mouse/touch dragging, wheel/trackpad and arrow keys move it without loading more DOM nodes. Cursor position turns each card, with the common reverse appearing toward its edges; keyboard focus also previews the reverse. Cards never open or enlarge on click. The local manifest currently contains real example cards, explicitly labelled as examples rather than Mario's collection. Reduced motion removes inertia and decorative turns; Escape or Back to room closes the album and restores focus. The covered Room does no WebGL rendering.

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
