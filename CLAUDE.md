# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Audivea is an independent audio software company. This repository is the company website — a static site hosted on GitHub Pages at `www.audivea.com`. No frameworks, no build step; files are served as-is.

## Tech Stack

- **Vanilla HTML/CSS/JS** — no frameworks, bundlers, or transpilers
- **GitHub Pages** hosting (push to `main` to deploy)
- **Google Fonts**: Manrope (400, 600, 700)
- **Playwright** (dev dependency) for screenshot-based visual testing

## Development

Serve locally:
```bash
python3 -m http.server 8080
```

Run Playwright tests:
```bash
npx playwright test
```

No build, lint, or compile commands exist. Edit files and refresh.

Regenerate the Arcoline screenshots (`support/manual-img/`, `og-metering.png`) from full-window plugin captures:
```bash
python3 tools/build-shots.py [capture-dir]   # see the script's docstring for the expected captures
```

## Architecture

### Shared Components (JS-injected)
`components/header.js` and `components/footer.js` build the navigation and footer on `DOMContentLoaded` and attach them to `<body>` directly — there are **no placeholder elements**. `header.js` creates a `<header class="site">` and calls `document.body.insertBefore(header, document.body.firstChild)`; `footer.js` creates a `<footer>` and calls `document.body.appendChild(footer)`. Don't add `<div id="header">`/`<div id="footer">` stubs; a plain HTML comment marks the spot for readers.

Both are **path-aware** — they derive the page's directory depth from `window.location.pathname` (and drop the repo segment on `*.github.io`) to build the `../` prefix for every link, so the same script works at any depth.

`components/bg-wave.js` is the third shared script: it draws the animated cyan waves into a `<canvas>` inside `.bg-fixed`, falling back to the static `BK.webp` when JS, canvas, or motion is unavailable. It is path-agnostic and must load after the other two.

Every content page must include `<script>` tags for all three. The one exception is `products/metering.html`, a meta-refresh redirect stub preserving an old indexed URL.

### Single Global Stylesheet
`components/styles.css` is the sole stylesheet (~2500 lines). It uses CSS custom properties defined in `:root` for theming:
- Primary: `#00aaff` (cyan), with `--color-primary-light` and `--color-primary-dark` variants
- Card backgrounds: `rgba(18, 18, 30, 0.8)` — dark translucent panels
- Border: `rgba(0, 170, 255, 0.15)`
- Content widths: 750px (narrow), 1000px (wide), 1200px (page max)

### Page Structure
The `<head>` carries the SEO block (see below), the Google tag, the Manrope preconnect/stylesheet, `components/styles.css`, and the three component scripts. The `<body>` is then just:
```html
<body>
  <div class="bg-fixed"></div>   <!-- Background: bg-wave.js canvas over BK.webp -->
  <!-- Header injected by header.js -->

  <section class="band first">   <!-- `first`: 118px top padding, no top border -->
    <div class="wrap">...</div>
  </section>
  <section class="band">...</section>

  <!-- Footer injected by footer.js -->
</body>
```
Sections are `<section class="band">` wrapping `<div class="wrap">` — the site does **not** use `<main>`. Every interior page opens with `band first`; the homepage is the one exception, opening with `<section class="hero">` instead. The header and footer are absent from the source; the comments are only signposts.

### Routing
Static file-based — no SPA routing. Pages live at:
- Root: `index.html`, `about.html`, `contact.html`
- Sections: `products/`, `articles/` (each with `index.html`)
- Future tools: `tools/[tool-name]/` (per implement agent convention)

### SEO
Every page has: canonical URL, meta description, Open Graph tags, Twitter cards, and Schema.org JSON-LD structured data. `sitemap.xml` and `robots.txt` are maintained at root.

## Design System Conventions

- **Desktop-first** responsive design (not mobile-first)
- Breakpoints: `768px`, `480px`
- Class naming: descriptive, scoped by component (`.nav-`, `.hero-`, `.article-`, `.card-`, `.form-`)
- Semantic HTML: `<section>`, `<article>`, `<nav>`, `<header>`, `<footer>` (no `<main>` — see Page Structure)
- Images: WebP format, lazy loading on cards (`loading="lazy"`)
- Transitions: `0.2s ease` (via `--transition-speed`)
- Focus states: `2px solid var(--color-primary)` outline

## Related Projects

The Metering plugin (JUCE/C++) lives at `/Users/freeman/Self_Git/Metering`. Reference its `Source/DSP/MeteringMath.h` for DSP algorithms when building web audio tools (LUFS, true peak, K-weighting, etc.).

## Custom Agents

- **spec** (`.claude/agents/spec.md`): Designs implementation-ready feature specs with exact file paths, CSS values, and code structures. Use for planning new features.
- **implement** (`.claude/agents/implement.md`): Builds features from specs. Follows the order: CSS first, HTML, JS, responsive, polish.

## Key Constraints

- No external JS libraries — vanilla only (Web Audio API, Canvas for audio/visualization)
- No `!important` in CSS unless overriding third-party
- No `console.log` in production code
- All processing must be client-side (no server/backend)
- Preserve the dark theme + cyan accent brand identity
