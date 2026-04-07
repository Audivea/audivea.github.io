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

## Architecture

### Shared Components (JS-injected)
`components/header.js` and `components/footer.js` dynamically inject navigation and footer HTML into every page on `DOMContentLoaded`. Both are **path-aware** — they detect the page's directory depth and adjust relative links accordingly. Every HTML page must include `<script>` tags for both.

### Single Global Stylesheet
`components/styles.css` is the sole stylesheet (~1080 lines). It uses CSS custom properties defined in `:root` for theming:
- Primary: `#00aaff` (cyan), with `--color-primary-light` and `--color-primary-dark` variants
- Card backgrounds: `rgba(18, 18, 30, 0.8)` — dark translucent panels
- Border: `rgba(0, 170, 255, 0.15)`
- Content widths: 750px (narrow), 1000px (wide), 1200px (page max)

### Page Structure
Every page follows this pattern:
```html
<div class="bg-fixed"></div>  <!-- Fixed background image -->
<div id="header"></div>       <!-- Injected by header.js -->
<main>...</main>
<div id="footer"></div>       <!-- Injected by footer.js -->
```

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
- Semantic HTML: `<main>`, `<section>`, `<article>`, `<nav>`
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
