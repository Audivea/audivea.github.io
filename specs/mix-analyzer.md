# Feature Spec: Mix Analyzer Tool (under "Lab" section)

Generated: 2026-04-07

## Overview

The Mix Analyzer is a browser-based, single-file audio analysis tool that runs entirely client-side. Users upload (or drag-and-drop) an audio file, and the tool produces a dashboard of loudness, peak, dynamics, stereo, and tonal balance metrics -- all computed using the same DSP algorithms as Audivea's Metering plugin. The tool lives under a new "Lab" top-level section on the Audivea website, designed to accommodate future web tools. It serves as both a standalone utility and a funnel toward the plugin: useful enough to attract traffic, limited enough (single-file, offline, no real-time) to leave room for the plugin's value.

## Section Naming Recommendation

**Recommended: "Lab"** -- it conveys experimentation, innovation, and technical depth. It aligns with the Audivea brand identity ("dive deeper") and sounds like a place where audio tools are tested and refined.

Alternatives considered:
- "Tools" -- functional but generic, could be confused with the plugin products
- "Workshop" -- implies craft but sounds more physical than digital
- "Studio" -- overloaded term in the audio industry, could cause confusion with DAW-related content

**Decision needed from user:** confirm "Lab" or pick an alternative. The rest of this spec uses "Lab."

## User Stories

- As a music producer, I want to upload a mixdown and see its loudness/peak/dynamics stats so I can check it before mastering or distribution.
- As a mixing engineer, I want to see tonal balance and stereo analysis so I can identify issues without opening a DAW.
- As a potential Audivea customer, I want to try Audivea's analysis algorithms in my browser so I can evaluate the quality before purchasing the plugin.

## Scope

### In Scope
- New `/lab/` section with index page and "Lab" nav link
- `/lab/mix-analyzer/` tool page with full analysis UI
- Web Worker for DSP (K-weighting, true peak, LR4 crossover band splitting, phase correlation)
- Integrated LUFS with dual-gate (absolute + relative) via histogram
- Loudness Range (LRA) via EBU TECH 3342 percentile method
- True peak via 4x cubic Lagrange interpolation
- 3-band tonal balance (200Hz/4kHz LR4 crossover with phase compensation allpass)
- Stereo analysis (balance, width, phase correlation)
- Findings engine (rule-based, 3-5 observations)
- Result dashboard with summary cards, findings, detail panels, CTA
- Responsive at 768px and 480px
- Updates to header.js, footer.js, sitemap.xml, robots.txt

### Out of Scope
- Real-time streaming analysis (this is offline, whole-file)
- Waveform or spectrogram visualization
- Audio playback
- File comparison (A/B)
- Export or sharing of results
- Server-side processing

## Technical Architecture

### New Files

1. **`/Users/freeman/Self_Git/audivea.github.io/lab/index.html`** -- Lab section index page listing available tools
2. **`/Users/freeman/Self_Git/audivea.github.io/lab/mix-analyzer/index.html`** -- Mix Analyzer tool page
3. **`/Users/freeman/Self_Git/audivea.github.io/lab/mix-analyzer/analyzer.js`** -- Main UI controller (file handling, state management, result rendering)
4. **`/Users/freeman/Self_Git/audivea.github.io/lab/mix-analyzer/worker.js`** -- Web Worker containing all DSP analysis logic

### Modified Files

5. **`/Users/freeman/Self_Git/audivea.github.io/components/header.js`** -- Add "Lab" nav link, add lab directory detection to path logic
6. **`/Users/freeman/Self_Git/audivea.github.io/components/footer.js`** -- Add "Lab" nav link, add lab directory detection to path logic
7. **`/Users/freeman/Self_Git/audivea.github.io/components/styles.css`** -- Add all Mix Analyzer and Lab styles (approx 350 lines in new sections)
8. **`/Users/freeman/Self_Git/audivea.github.io/sitemap.xml`** -- Add lab/ and lab/mix-analyzer/ entries
9. **`/Users/freeman/Self_Git/audivea.github.io/index.html`** -- Add a card for the Mix Analyzer in the "What's New" section (optional, user decision)

### Dependencies

None. All processing uses Web Audio API (`decodeAudioData`), Web Workers, and Canvas API. Zero external libraries.

---

## Detailed Design

### 1. Header/Footer Updates

**`/Users/freeman/Self_Git/audivea.github.io/components/header.js`**

The path detection logic must be updated to handle the `lab/` directory and its subdirectories (two levels deep: `lab/mix-analyzer/`).

Current `isInSubDir` only checks `articles/` and `products/`. The fix is to change the depth-detection logic to support arbitrary depth:

```js
function loadHeader() {
  const currentPath = window.location.pathname;

  const isInArticlesDir = currentPath.includes('/articles/') || currentPath.includes('/blog/');
  const isInPluginsDir = currentPath.includes('/products/');
  const isInLabDir = currentPath.includes('/lab/');
  const isAboutPage = currentPath.endsWith('/about.html') || currentPath.endsWith('/about');
  const isContactPage = currentPath.endsWith('/contact.html') || currentPath.endsWith('/contact');

  // Determine depth: lab/mix-analyzer/ is 2 levels deep, articles/ is 1 level deep
  const pathParts = currentPath.replace(/\/index\.html$/, '/').split('/').filter(Boolean);
  const siteRoot = window.location.hostname.includes('github.io') ? pathParts.shift() : null;
  const depth = pathParts.length; // 0 = root, 1 = lab/, 2 = lab/mix-analyzer/
  const prefix = depth === 0 ? './' : '../'.repeat(depth);

  const isHome = !isInArticlesDir && !isInPluginsDir && !isInLabDir && !isAboutPage && !isContactPage;

  const homePath = prefix;
  const articlesPath = prefix + 'articles/';
  const pluginsPath = prefix + 'products/';
  const labPath = prefix + 'lab/';
  const aboutPath = prefix + 'about.html';
  const contactPath = prefix + 'contact.html';

  const iconPath = prefix + 'icon.webp';

  // ... rest unchanged except add Lab link to nav-links:
  // <a href="${labPath}" class="nav-link ${isInLabDir ? 'active' : ''}">Lab</a>
}
```

The nav link order should be: Home | Products | Lab | Articles | About | Contact

The same depth logic applies to **`footer.js`** -- add `labPath` and the Lab link to `footer-nav`.

### 2. Lab Index Page

**File: `/Users/freeman/Self_Git/audivea.github.io/lab/index.html`**

Standard page following the articles/index.html pattern.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Lab — Free Audio Tools | Audivea</title>
  <meta name="description" content="Free browser-based audio tools from Audivea. Analyze your mixes, check loudness, and explore sound — no installation required.">
  <link rel="canonical" href="https://audivea.com/lab/">
  <meta property="og:title" content="Audivea Lab — Free Audio Tools">
  <meta property="og:description" content="Free browser-based audio tools. Analyze your mixes, check loudness, and explore sound.">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Audivea">
  <meta property="og:image" content="https://audivea.com/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Audivea Lab — Free Audio Tools">
  <meta name="twitter:description" content="Free browser-based audio tools. Analyze your mixes, check loudness, and explore sound.">
  <meta name="twitter:image" content="https://audivea.com/og-image.png">
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-JLL7X7X53H"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-JLL7X7X53H');
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="icon" href="../favicon.png" type="image/png">
  <link rel="stylesheet" href="../components/styles.css">
  <script src="../components/header.js"></script>
  <script src="../components/footer.js"></script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Audivea Lab",
    "description": "Free browser-based audio tools from Audivea.",
    "url": "https://audivea.com/lab/",
    "publisher": {
      "@type": "Organization",
      "name": "Audivea",
      "url": "https://audivea.com"
    }
  }
  </script>
</head>
<body>
  <div class="bg-fixed"></div>

  <div class="main-content">
    <div class="container-wide">
      <h1 class="page-title">Lab</h1>
      <p class="page-subtitle">Free browser-based audio tools. No installation, no upload — everything runs in your browser.</p>

      <div class="card-list">
        <article class="card">
          <a href="mix-analyzer/">
            <div class="card-flex">
              <div class="lab-card-icon" aria-hidden="true">
                <svg width="240" height="135" viewBox="0 0 240 135" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <!-- Simple meter bars icon rendered in CSS/SVG -->
                  <rect x="30" y="80" width="24" height="40" rx="3" fill="rgba(0,170,255,0.3)"/>
                  <rect x="66" y="50" width="24" height="70" rx="3" fill="rgba(0,170,255,0.5)"/>
                  <rect x="102" y="30" width="24" height="90" rx="3" fill="rgba(0,170,255,0.7)"/>
                  <rect x="138" y="45" width="24" height="75" rx="3" fill="rgba(0,170,255,0.5)"/>
                  <rect x="174" y="65" width="24" height="55" rx="3" fill="rgba(0,170,255,0.3)"/>
                </svg>
              </div>
              <div>
                <h2 class="card-title">Mix Analyzer</h2>
                <div class="card-meta">Audio Analysis Tool</div>
                <p class="card-excerpt">
                  Drop in an audio file and get instant feedback on loudness, peak levels, dynamics, stereo image, and tonal balance. Powered by the same algorithms as our metering plugin.
                </p>
              </div>
            </div>
          </a>
        </article>
      </div>
    </div>
  </div>
</body>
</html>
```

The `.lab-card-icon` class replaces `.card-image` for lab tools that use SVG icons instead of photos:

```css
.lab-card-icon {
  width: 240px;
  aspect-ratio: 16 / 9;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 170, 255, 0.05);
  border-radius: 6px;
  border: 1px solid rgba(0, 170, 255, 0.1);
}
```

### 3. Mix Analyzer Page

**File: `/Users/freeman/Self_Git/audivea.github.io/lab/mix-analyzer/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Mix Analyzer — Free Audio Analysis Tool | Audivea</title>
  <meta name="description" content="Analyze your mix for free. Check loudness (LUFS), true peak, dynamics, stereo image, and tonal balance — instantly in your browser.">
  <link rel="canonical" href="https://audivea.com/lab/mix-analyzer/">
  <meta property="og:title" content="Mix Analyzer — Free Audio Analysis | Audivea">
  <meta property="og:description" content="Check loudness, true peak, dynamics, stereo image, and tonal balance — instantly in your browser.">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Audivea">
  <meta property="og:image" content="https://audivea.com/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Mix Analyzer — Free Audio Analysis | Audivea">
  <meta name="twitter:description" content="Check loudness, true peak, dynamics, stereo image, and tonal balance — instantly in your browser.">
  <meta name="twitter:image" content="https://audivea.com/og-image.png">
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-JLL7X7X53H"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-JLL7X7X53H');
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="icon" href="../../favicon.png" type="image/png">
  <link rel="stylesheet" href="../../components/styles.css">
  <script src="../../components/header.js"></script>
  <script src="../../components/footer.js"></script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Audivea Mix Analyzer",
    "description": "Free browser-based audio analysis tool. Check loudness, true peak, dynamics, stereo image, and tonal balance.",
    "url": "https://audivea.com/lab/mix-analyzer/",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Any (browser-based)",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "publisher": {
      "@type": "Organization",
      "name": "Audivea",
      "url": "https://audivea.com"
    }
  }
  </script>
</head>
<body>
  <div class="bg-fixed"></div>

  <div class="main-content">
    <div class="container-wide">

      <!-- UPLOAD STATE -->
      <div id="analyzer-upload" class="analyzer-section">
        <h1 class="page-title">Mix Analyzer</h1>
        <p class="page-subtitle">Drop in an audio file for instant feedback on loudness, dynamics, stereo image, and tonal balance.</p>

        <div id="drop-zone" class="analyzer-dropzone" role="button" tabindex="0" aria-label="Upload audio file for analysis">
          <div class="dropzone-icon" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M24 32V12"/>
              <path d="M16 20l8-8 8 8"/>
              <path d="M8 36h32"/>
            </svg>
          </div>
          <p class="dropzone-text">Drag and drop an audio file here</p>
          <p class="dropzone-subtext">or click to browse</p>
          <input type="file" id="file-input" accept="audio/*,.wav,.aiff,.aif,.mp3,.flac,.m4a,.aac" hidden>
        </div>

        <div class="analyzer-meta">
          <p class="analyzer-formats">WAV, AIFF, MP3, FLAC, AAC/M4A &mdash; up to 200 MB</p>
          <p class="analyzer-privacy">Your file never leaves your browser. All analysis runs locally.</p>
        </div>
      </div>

      <!-- PROCESSING STATE -->
      <div id="analyzer-processing" class="analyzer-section" hidden>
        <h2 class="analyzer-processing-title">Analyzing</h2>
        <p id="processing-filename" class="analyzer-processing-file"></p>
        <div class="analyzer-progress-track">
          <div id="progress-bar" class="analyzer-progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
        <p id="progress-label" class="analyzer-progress-label">Decoding audio...</p>
      </div>

      <!-- RESULT STATE -->
      <div id="analyzer-results" class="analyzer-section" hidden>

        <!-- File info bar -->
        <div id="result-file-info" class="analyzer-file-info"></div>

        <!-- Summary cards row -->
        <div id="summary-cards" class="analyzer-summary-row">
          <!-- 5 cards injected by JS -->
        </div>

        <!-- Findings section -->
        <div id="findings-section" class="analyzer-findings">
          <h2 class="analyzer-section-title">Findings</h2>
          <ul id="findings-list" class="findings-list">
            <!-- injected by JS -->
          </ul>
        </div>

        <!-- Detail panels -->
        <div id="detail-panels" class="analyzer-details">
          <!-- Loudness detail -->
          <div class="analyzer-detail-panel" id="detail-loudness">
            <h3 class="detail-panel-title">Loudness</h3>
            <div class="detail-panel-body" id="detail-loudness-body"></div>
          </div>
          <!-- Peak detail -->
          <div class="analyzer-detail-panel" id="detail-peak">
            <h3 class="detail-panel-title">Peak Safety</h3>
            <div class="detail-panel-body" id="detail-peak-body"></div>
          </div>
          <!-- Dynamics detail -->
          <div class="analyzer-detail-panel" id="detail-dynamics">
            <h3 class="detail-panel-title">Dynamics</h3>
            <div class="detail-panel-body" id="detail-dynamics-body"></div>
          </div>
          <!-- Stereo detail -->
          <div class="analyzer-detail-panel" id="detail-stereo">
            <h3 class="detail-panel-title">Stereo / Phase</h3>
            <div class="detail-panel-body" id="detail-stereo-body"></div>
          </div>
          <!-- Tonal detail -->
          <div class="analyzer-detail-panel" id="detail-tonal">
            <h3 class="detail-panel-title">Tonal Balance</h3>
            <div class="detail-panel-body" id="detail-tonal-body"></div>
          </div>
        </div>

        <!-- CTA section -->
        <div class="analyzer-cta">
          <h2 class="analyzer-cta-title">Want real-time insight in your DAW?</h2>
          <p class="analyzer-cta-text">The Audivea Metering plugin gives you all of this — live, in your session, with visual depth you can feel.</p>
          <a href="../../products/" class="hero-cta">Explore Products</a>
        </div>

        <!-- Analyze another -->
        <div class="analyzer-reset-wrap">
          <button id="analyze-another" class="analyzer-reset-btn">Analyze Another File</button>
        </div>
      </div>

      <!-- ERROR STATE -->
      <div id="analyzer-error" class="analyzer-section" hidden>
        <div class="analyzer-error-box">
          <p id="error-message" class="analyzer-error-text"></p>
          <button id="error-retry" class="analyzer-reset-btn">Try Again</button>
        </div>
      </div>

    </div>
  </div>

  <script src="analyzer.js"></script>
</body>
</html>
```

### 4. CSS (all new styles appended to `components/styles.css`)

Add the following sections to the end of `/Users/freeman/Self_Git/audivea.github.io/components/styles.css`, before the responsive media queries. Actually -- since the responsive section is at the end, add the new base styles before `@media (max-width: 768px)` and add responsive overrides inside the existing media query blocks.

**New base styles (insert before the `/* Responsive */` section, around line 920):**

```css
/* ============================================
   Lab — Card Icon (for SVG tool thumbnails)
   ============================================ */

.lab-card-icon {
  width: 240px;
  aspect-ratio: 16 / 9;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 170, 255, 0.05);
  border-radius: 6px;
  border: 1px solid rgba(0, 170, 255, 0.1);
}

/* ============================================
   Mix Analyzer
   ============================================ */

.analyzer-section {
  animation: fadeInUp 0.4s ease-out;
}

/* Drop zone */
.analyzer-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  border: 2px dashed rgba(0, 170, 255, 0.3);
  border-radius: var(--radius-panel);
  background: rgba(0, 170, 255, 0.03);
  cursor: pointer;
  transition: border-color var(--transition-speed) ease, background var(--transition-speed) ease;
  margin: 2rem 0 1.5rem;
}

.analyzer-dropzone:hover,
.analyzer-dropzone.dragover {
  border-color: var(--color-primary);
  background: rgba(0, 170, 255, 0.08);
}

.analyzer-dropzone:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.dropzone-icon {
  color: var(--color-primary);
  margin-bottom: 16px;
  opacity: 0.7;
}

.dropzone-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 4px;
}

.dropzone-subtext {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin: 0;
}

.analyzer-meta {
  text-align: center;
  margin-bottom: 2rem;
}

.analyzer-formats {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin: 0 0 4px;
}

.analyzer-privacy {
  font-size: 0.8rem;
  color: #666;
  margin: 0;
}

/* Processing state */
.analyzer-processing-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--color-primary);
  text-align: center;
  margin-bottom: 0.5rem;
}

.analyzer-processing-file {
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
  word-break: break-all;
}

.analyzer-progress-track {
  width: 100%;
  max-width: 500px;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  margin: 0 auto 1rem;
  overflow: hidden;
}

.analyzer-progress-bar {
  height: 100%;
  width: 0%;
  background: var(--color-primary);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.analyzer-progress-label {
  text-align: center;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

/* File info bar */
.analyzer-file-info {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  padding: 12px 16px;
  background: var(--color-bg-panel);
  border-radius: var(--radius-card);
  border: 1px solid var(--color-border);
  margin-bottom: 1.5rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.file-info-item {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.file-info-label {
  color: #666;
}

.file-info-value {
  color: var(--color-text);
  font-weight: 600;
}

/* Summary cards row */
.analyzer-summary-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 2rem;
}

.summary-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  padding: 16px;
  text-align: center;
  animation: fadeInUp 0.4s ease-out;
}

.summary-card-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

.summary-card-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 8px;
  line-height: 1.2;
}

.summary-card-status {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

/* Status pill colors */
.status-green {
  background: rgba(76, 175, 80, 0.15);
  color: #66bb6a;
}

.status-yellow {
  background: rgba(255, 193, 7, 0.15);
  color: #ffd54f;
}

.status-orange {
  background: rgba(255, 152, 0, 0.15);
  color: #ffb74d;
}

.status-red {
  background: rgba(244, 67, 54, 0.15);
  color: #ef5350;
}

.status-blue {
  background: rgba(0, 170, 255, 0.15);
  color: var(--color-primary);
}

/* Findings section */
.analyzer-findings {
  background: var(--color-bg-panel);
  border-radius: var(--radius-panel);
  border: 1px solid rgba(0, 170, 255, 0.2);
  padding: 24px 30px;
  margin-bottom: 2rem;
}

.analyzer-section-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-primary);
  margin: 0 0 16px;
}

.findings-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.finding-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 0.95rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
}

.finding-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
  margin-top: 2px;
}

.finding-icon.severity-info {
  background: rgba(0, 170, 255, 0.2);
  color: var(--color-primary);
}

.finding-icon.severity-notice {
  background: rgba(255, 193, 7, 0.2);
  color: #ffd54f;
}

.finding-icon.severity-warn {
  background: rgba(255, 152, 0, 0.2);
  color: #ffb74d;
}

.finding-icon.severity-alert {
  background: rgba(244, 67, 54, 0.2);
  color: #ef5350;
}

/* Detail panels */
.analyzer-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 2rem;
}

.analyzer-detail-panel {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  padding: 20px;
}

.detail-panel-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-primary);
  margin: 0 0 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 170, 255, 0.1);
}

.detail-panel-body {
  font-size: 0.9rem;
  color: var(--color-text);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.detail-value {
  font-weight: 600;
  font-size: 0.9rem;
}

/* Tonal balance bars (Canvas rendered, but also CSS fallback) */
.tonal-bars {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  height: 80px;
  margin-top: 12px;
}

.tonal-bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.tonal-bar-track {
  width: 100%;
  height: 60px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.tonal-bar-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--color-primary);
  border-radius: 4px;
  transition: height 0.4s ease;
}

.tonal-bar-label {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.tonal-bar-pct {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text);
}

/* Stereo width indicator */
.stereo-width-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  position: relative;
  margin: 12px 0 6px;
}

.stereo-width-fill {
  position: absolute;
  top: 0;
  height: 100%;
  background: var(--color-primary);
  border-radius: 4px;
  transition: width 0.4s ease, left 0.4s ease;
}

.stereo-width-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: #666;
}

/* Phase correlation bar */
.phase-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  position: relative;
  margin: 12px 0 6px;
}

.phase-bar-fill {
  position: absolute;
  top: 0;
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease, left 0.4s ease;
}

.phase-bar-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: #666;
}

/* Detail educational text */
.detail-explainer {
  font-size: 0.8rem;
  color: #888;
  line-height: 1.5;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

/* CTA section */
.analyzer-cta {
  text-align: center;
  padding: 40px 24px;
  background: var(--color-bg-panel);
  border-radius: var(--radius-panel);
  border: 1px solid rgba(0, 170, 255, 0.2);
  margin-bottom: 1.5rem;
}

.analyzer-cta-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 0.5rem;
}

.analyzer-cta-text {
  font-size: 1rem;
  color: var(--color-text-muted);
  margin: 0 0 1.5rem;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}

/* Reset / analyze another */
.analyzer-reset-wrap {
  text-align: center;
  margin-bottom: 2rem;
}

.analyzer-reset-btn {
  padding: 12px 28px;
  background: transparent;
  color: var(--color-primary);
  font-weight: 600;
  font-size: 0.95rem;
  border: 1px solid rgba(0, 170, 255, 0.4);
  border-radius: 6px;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  transition: border-color var(--transition-speed) ease, color var(--transition-speed) ease;
}

.analyzer-reset-btn:hover {
  border-color: rgba(0, 170, 255, 0.7);
  color: #fff;
}

/* Error state */
.analyzer-error-box {
  text-align: center;
  padding: 40px 24px;
  background: var(--color-bg-panel);
  border-radius: var(--radius-panel);
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.analyzer-error-text {
  font-size: 1.05rem;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 1.5rem;
  line-height: 1.6;
}
```

**Responsive additions inside the existing `@media (max-width: 768px)` block:**

```css
  .analyzer-summary-row {
    grid-template-columns: repeat(3, 1fr);
  }

  .analyzer-details {
    grid-template-columns: 1fr;
  }

  .analyzer-dropzone {
    padding: 36px 20px;
  }

  .summary-card-value {
    font-size: 1.3rem;
  }

  .lab-card-icon {
    width: 100%;
    max-width: 400px;
    margin-bottom: 1rem;
  }
```

**Responsive additions inside the existing `@media (max-width: 480px)` block:**

```css
  .analyzer-summary-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .summary-card-value {
    font-size: 1.1rem;
  }

  .analyzer-cta-title {
    font-size: 1.2rem;
  }

  .analyzer-findings {
    padding: 20px 16px;
  }
```

### 5. Main UI Controller

**File: `/Users/freeman/Self_Git/audivea.github.io/lab/mix-analyzer/analyzer.js`**

This file handles: file input/drag-drop, AudioContext decoding, Worker communication, progress updates, result rendering.

```js
(function () {
  'use strict';

  // --- Constants ---
  const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB
  const MAX_DURATION_SEC = 20 * 60; // 20 minutes

  // --- DOM refs ---
  const uploadSection = document.getElementById('analyzer-upload');
  const processingSection = document.getElementById('analyzer-processing');
  const resultsSection = document.getElementById('analyzer-results');
  const errorSection = document.getElementById('analyzer-error');
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const processingFilename = document.getElementById('processing-filename');
  const progressBar = document.getElementById('progress-bar');
  const progressLabel = document.getElementById('progress-label');
  const summaryCards = document.getElementById('summary-cards');
  const findingsList = document.getElementById('findings-list');
  const errorMessage = document.getElementById('error-message');
  const analyzeAnother = document.getElementById('analyze-another');
  const errorRetry = document.getElementById('error-retry');

  let worker = null;

  // --- State management ---
  function showSection(section) {
    [uploadSection, processingSection, resultsSection, errorSection].forEach(
      s => s.hidden = true
    );
    section.hidden = false;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // --- File handling ---
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });

  analyzeAnother.addEventListener('click', resetToUpload);
  errorRetry.addEventListener('click', resetToUpload);

  function resetToUpload() {
    fileInput.value = '';
    if (worker) { worker.terminate(); worker = null; }
    showSection(uploadSection);
  }

  function handleFile(file) {
    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      showError('This file is too large. The Mix Analyzer supports files up to 200 MB.');
      return;
    }

    // Validate type (basic check — decodeAudioData will catch unsupported formats)
    const validTypes = ['audio/wav', 'audio/wave', 'audio/x-wav', 'audio/aiff',
      'audio/x-aiff', 'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/x-flac',
      'audio/aac', 'audio/mp4', 'audio/x-m4a', 'audio/m4a'];
    const validExtensions = ['.wav', '.aiff', '.aif', '.mp3', '.flac', '.m4a', '.aac'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
      showError('This file format is not supported. Please use WAV, AIFF, MP3, FLAC, or AAC/M4A.');
      return;
    }

    // Show processing
    processingFilename.textContent = file.name;
    setProgress(0, 'Reading file...');
    showSection(processingSection);

    // Read file and decode
    const reader = new FileReader();
    reader.onload = function () {
      setProgress(10, 'Decoding audio...');
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtx.decodeAudioData(reader.result).then(function (audioBuffer) {
        audioCtx.close();

        // Validate duration
        if (audioBuffer.duration > MAX_DURATION_SEC) {
          showError('This file is longer than 20 minutes. Please use a shorter file.');
          return;
        }

        setProgress(25, 'Analyzing...');
        runAnalysis(audioBuffer, file.name);
      }).catch(function () {
        showError('Unable to decode this audio file. It may be corrupted or in an unsupported format.');
      });
    };
    reader.onerror = function () {
      showError('Unable to read the file. Please try again.');
    };
    reader.readAsArrayBuffer(file);
  }

  function setProgress(pct, label) {
    progressBar.style.width = pct + '%';
    progressBar.setAttribute('aria-valuenow', pct);
    if (label) progressLabel.textContent = label;
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    showSection(errorSection);
  }

  // --- Analysis via Worker ---
  function runAnalysis(audioBuffer, fileName) {
    // Extract channel data as transferable Float32Arrays
    const channels = [];
    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      channels.push(audioBuffer.getChannelData(ch).slice()); // copy for transfer
    }

    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    const numChannels = audioBuffer.numberOfChannels;

    // Determine format from filename extension
    const ext = fileName.split('.').pop().toLowerCase();
    const formatMap = { wav: 'WAV', aiff: 'AIFF', aif: 'AIFF', mp3: 'MP3',
      flac: 'FLAC', m4a: 'AAC/M4A', aac: 'AAC/M4A' };
    const format = formatMap[ext] || ext.toUpperCase();

    worker = new Worker('worker.js');

    worker.onmessage = function (e) {
      const msg = e.data;
      if (msg.type === 'progress') {
        // Worker reports progress from 25-95%
        setProgress(25 + msg.pct * 0.7, msg.label || 'Analyzing...');
      } else if (msg.type === 'result') {
        setProgress(100, 'Done');
        msg.result.file = {
          name: fileName,
          durationSec: duration,
          sampleRate: sampleRate,
          channels: numChannels,
          format: format
        };
        renderResults(msg.result);
        showSection(resultsSection);
        worker.terminate();
        worker = null;
      } else if (msg.type === 'error') {
        showError(msg.message || 'An error occurred during analysis.');
        worker.terminate();
        worker = null;
      }
    };

    worker.onerror = function () {
      showError('An unexpected error occurred during analysis.');
      worker.terminate();
      worker = null;
    };

    // Transfer channel buffers to worker (zero-copy)
    const transferables = channels.map(ch => ch.buffer);
    worker.postMessage({
      channels: channels,
      sampleRate: sampleRate,
      numChannels: numChannels
    }, transferables);
  }

  // --- Result rendering ---
  function renderResults(result) {
    renderFileInfo(result.file);
    renderSummaryCards(result);
    renderFindings(result.findings);
    renderDetailLoudness(result);
    renderDetailPeak(result);
    renderDetailDynamics(result);
    renderDetailStereo(result);
    renderDetailTonal(result);
  }

  function renderFileInfo(file) {
    const dur = formatDuration(file.durationSec);
    const sr = (file.sampleRate / 1000).toFixed(1) + ' kHz';
    const ch = file.channels === 1 ? 'Mono' : file.channels === 2 ? 'Stereo' : file.channels + 'ch';
    document.getElementById('result-file-info').innerHTML =
      infoItem('File', file.name) +
      infoItem('Duration', dur) +
      infoItem('Sample Rate', sr) +
      infoItem('Channels', ch) +
      infoItem('Format', file.format);
  }

  function infoItem(label, value) {
    return '<span class="file-info-item"><span class="file-info-label">' + label +
      ':</span> <span class="file-info-value">' + value + '</span></span>';
  }

  function formatDuration(sec) {
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function renderSummaryCards(result) {
    var html = '';
    html += summaryCard('Loudness', fmtDb(result.loudness.integrated) + ' LUFS',
      result.loudness.status, statusColor(result.loudness.status));
    html += summaryCard('Peak', fmtDb(result.peak.truePeakDb) + ' dBTP',
      result.peak.clipRisk, peakStatusColor(result.peak.clipRisk));
    html += summaryCard('Dynamics', fmtDb(result.dynamics.crestDb) + ' dB',
      result.dynamics.status, dynamicsStatusColor(result.dynamics.status));
    html += summaryCard('Stereo', fmtCorrelation(result.stereo.correlation),
      result.stereo.status, stereoStatusColor(result.stereo.status));
    html += summaryCard('Tonal', result.tonal.tiltLabel,
      bandSummary(result.tonal), 'status-blue');
    summaryCards.innerHTML = html;
  }

  function summaryCard(label, value, status, colorClass) {
    return '<div class="summary-card">' +
      '<div class="summary-card-label">' + label + '</div>' +
      '<div class="summary-card-value">' + value + '</div>' +
      '<span class="summary-card-status ' + colorClass + '">' + status + '</span>' +
      '</div>';
  }

  function fmtDb(val) {
    if (val <= -100) return '-inf';
    return (val >= 0 ? '+' : '') + val.toFixed(1);
  }

  function fmtCorrelation(val) {
    return (val >= 0 ? '+' : '') + val.toFixed(2);
  }

  function bandSummary(tonal) {
    return tonal.low + '% / ' + tonal.mid + '% / ' + tonal.high + '%';
  }

  // Status color mapping
  function statusColor(status) {
    var map = { 'Low': 'status-yellow', 'Balanced': 'status-green',
      'Loud': 'status-orange', 'Very Loud': 'status-red' };
    return map[status] || 'status-blue';
  }

  function peakStatusColor(status) {
    var map = { 'Safe': 'status-green', 'Close to Limit': 'status-yellow',
      'Clipping Risk': 'status-red' };
    return map[status] || 'status-blue';
  }

  function dynamicsStatusColor(status) {
    var map = { 'Open': 'status-blue', 'Balanced': 'status-green',
      'Dense': 'status-orange', 'Crushed': 'status-red' };
    return map[status] || 'status-blue';
  }

  function stereoStatusColor(status) {
    var map = { 'Mono': 'status-blue', 'Narrow': 'status-yellow',
      'Balanced': 'status-green', 'Wide': 'status-green',
      'Very Wide': 'status-orange' };
    return map[status] || 'status-blue';
  }

  function renderFindings(findings) {
    var html = '';
    findings.forEach(function (f) {
      var severityClass = 'severity-' + f.severity;
      var icon = f.severity === 'info' ? 'i' : f.severity === 'notice' ? '!' : f.severity === 'warn' ? '!' : '!!';
      html += '<li class="finding-item">' +
        '<span class="finding-icon ' + severityClass + '" aria-hidden="true">' + icon + '</span>' +
        '<span>' + f.message + '</span></li>';
    });
    findingsList.innerHTML = html;
  }

  function renderDetailLoudness(result) {
    var body = document.getElementById('detail-loudness-body');
    var html = detailRow('Integrated LUFS', fmtDb(result.loudness.integrated) + ' LUFS');
    html += detailRow('Loudness Range (LRA)', result.loudness.range.toFixed(1) + ' LU');
    html += detailRow('Status', result.loudness.status);
    html += '<p class="detail-explainer">Integrated LUFS measures the overall perceived loudness of the entire file per ITU-R BS.1770-4. Loudness Range indicates the variation between quiet and loud passages.</p>';
    body.innerHTML = html;
  }

  function renderDetailPeak(result) {
    var body = document.getElementById('detail-peak-body');
    var html = detailRow('Sample Peak', fmtDb(result.peak.samplePeakDb) + ' dBFS');
    html += detailRow('True Peak', fmtDb(result.peak.truePeakDb) + ' dBTP');
    html += detailRow('Clip Risk', result.peak.clipRisk);
    html += '<p class="detail-explainer">True peak uses 4x oversampled interpolation to detect inter-sample peaks that exceed 0 dBFS. Most streaming platforms require true peak below -1.0 dBTP.</p>';
    body.innerHTML = html;
  }

  function renderDetailDynamics(result) {
    var body = document.getElementById('detail-dynamics-body');
    var html = detailRow('RMS Level', fmtDb(result.dynamics.rmsDb) + ' dBFS');
    html += detailRow('Crest Factor', result.dynamics.crestDb.toFixed(1) + ' dB');
    html += detailRow('Status', result.dynamics.status);
    html += '<p class="detail-explainer">Crest factor is the difference between peak and RMS levels. Higher values indicate more dynamic range. A healthy mix typically has 8-14 dB of crest factor.</p>';
    body.innerHTML = html;
  }

  function renderDetailStereo(result) {
    var body = document.getElementById('detail-stereo-body');
    var isMono = result.file && result.file.channels === 1;
    if (isMono) {
      body.innerHTML = '<p style="color:var(--color-text-muted);font-size:0.9rem;">Stereo analysis is not available for mono files.</p>';
      return;
    }
    var html = detailRow('L/R Balance', formatBalance(result.stereo.balance));
    html += detailRow('Phase Correlation', fmtCorrelation(result.stereo.correlation));
    html += detailRow('Stereo Width', result.stereo.status);
    if (result.stereo.monoWarning) {
      html += '<p style="color:#ffb74d;font-size:0.85rem;margin-top:8px;">Phase correlation is low. This mix may lose energy or clarity when summed to mono.</p>';
    }
    // Phase correlation bar
    html += '<div class="phase-bar"><div class="phase-bar-fill" style="' + phaseBarStyle(result.stereo.correlation) + '"></div></div>';
    html += '<div class="phase-bar-labels"><span>-1</span><span>0</span><span>+1</span></div>';
    html += '<p class="detail-explainer">Phase correlation of +1 means identical L/R (mono), 0 means uncorrelated, -1 means fully inverted. Values below +0.3 may cause mono compatibility issues.</p>';
    body.innerHTML = html;
  }

  function phaseBarStyle(corr) {
    // Map correlation -1..+1 to 0%..100% of bar width
    // The fill extends from center (50%) toward the correlation value
    var center = 50;
    var pos = (corr + 1) / 2 * 100; // -1->0%, 0->50%, +1->100%
    var left, width;
    if (pos >= center) {
      left = center;
      width = pos - center;
    } else {
      left = pos;
      width = center - pos;
    }
    var color = corr >= 0.3 ? 'var(--color-primary)' : corr >= 0 ? '#ffd54f' : '#ef5350';
    return 'left:' + left + '%;width:' + width + '%;background:' + color;
  }

  function formatBalance(bal) {
    if (Math.abs(bal) < 0.01) return 'Centered';
    var pct = Math.abs(bal * 100).toFixed(0);
    return pct + '% ' + (bal < 0 ? 'Left' : 'Right');
  }

  function renderDetailTonal(result) {
    var body = document.getElementById('detail-tonal-body');
    var html = '<div class="tonal-bars">';
    html += tonalBar('Low', result.tonal.low, '< 200 Hz');
    html += tonalBar('Mid', result.tonal.mid, '200 Hz - 4 kHz');
    html += tonalBar('High', result.tonal.high, '> 4 kHz');
    html += '</div>';
    html += detailRow('Tilt', result.tonal.tiltLabel);
    html += '<p class="detail-explainer">Energy distribution across three bands using Linkwitz-Riley crossovers at 200 Hz and 4 kHz, with K-weighting applied per band. Percentages represent each band\'s contribution to total perceived loudness.</p>';
    body.innerHTML = html;
  }

  function tonalBar(label, pct, sublabel) {
    var height = Math.max(5, pct); // min 5% visible
    return '<div class="tonal-bar-group">' +
      '<div class="tonal-bar-pct">' + pct + '%</div>' +
      '<div class="tonal-bar-track"><div class="tonal-bar-fill" style="height:' + height + '%"></div></div>' +
      '<div class="tonal-bar-label">' + label + '</div>' +
      '</div>';
  }

  function detailRow(label, value) {
    return '<div class="detail-row"><span class="detail-label">' + label +
      '</span><span class="detail-value">' + value + '</span></div>';
  }

})();
```

### 6. Web Worker (DSP Engine)

**File: `/Users/freeman/Self_Git/audivea.github.io/lab/mix-analyzer/worker.js`**

This is the heaviest file. It contains direct ports of the algorithms from MeteringMath.h, MultiBandSplitter.h, and PluginProcessor.cpp.

```js
'use strict';

// ============================================================
// DSP Constants (ported from MeteringMath.h)
// ============================================================
var PI = 3.14159265358979323846;
var ABSOLUTE_GATE_LUFS = -70.0;
var LUFS_HIST_BINS = 256;
var LUFS_HIST_MIN = -70.0;
var LUFS_HIST_MAX = 5.0;
var LUFS_HIST_BIN_WIDTH = (LUFS_HIST_MAX - LUFS_HIST_MIN) / LUFS_HIST_BINS;

// ============================================================
// K-Weighting Filter (ported from MeteringMath.h)
// Two-stage IIR: pre-filter (high shelf) + RLB (high-pass)
// Direct Form II Transposed
// ============================================================
function KWeightingFilter() {
  this.preB = [0, 0, 0];
  this.preA = [0, 0, 0];
  this.rlbB = [0, 0, 0];
  this.rlbA = [0, 0, 0];
  this.preState = [0, 0];
  this.rlbState = [0, 0];
}

KWeightingFilter.prototype.initFor48kHz = function () {
  this.preB[0] = 1.53512485958697;
  this.preB[1] = -2.69169618940638;
  this.preB[2] = 1.19839281085285;
  this.preA[0] = 1.0;
  this.preA[1] = -1.69065929318241;
  this.preA[2] = 0.73248077421585;
  this.rlbB[0] = 1.0;
  this.rlbB[1] = -2.0;
  this.rlbB[2] = 1.0;
  this.rlbA[0] = 1.0;
  this.rlbA[1] = -1.99004745483398;
  this.rlbA[2] = 0.99007225036621;
};

KWeightingFilter.prototype.initForSampleRate = function (sampleRate) {
  if (Math.abs(sampleRate - 48000) < 1) {
    this.initFor48kHz();
    return;
  }
  // Stage 1: Pre-filter (high shelf)
  var preF0 = 1681.974450955533;
  var preGain = 3.999843853973347;
  var preQ = 0.7071752369554196;

  var A = Math.pow(10, preGain / 40);
  var w0 = 2 * PI * preF0 / sampleRate;
  var cosw = Math.cos(w0);
  var sinw = Math.sin(w0);
  var alpha = sinw / (2 * preQ);
  var twoSqrtAalpha = 2 * Math.sqrt(A) * alpha;

  var b0 = A * ((A + 1) + (A - 1) * cosw + twoSqrtAalpha);
  var b1 = -2 * A * ((A - 1) + (A + 1) * cosw);
  var b2 = A * ((A + 1) + (A - 1) * cosw - twoSqrtAalpha);
  var a0 = (A + 1) - (A - 1) * cosw + twoSqrtAalpha;
  var a1 = 2 * ((A - 1) - (A + 1) * cosw);
  var a2 = (A + 1) - (A - 1) * cosw - twoSqrtAalpha;

  this.preB[0] = b0 / a0; this.preB[1] = b1 / a0; this.preB[2] = b2 / a0;
  this.preA[0] = 1.0; this.preA[1] = a1 / a0; this.preA[2] = a2 / a0;

  // Stage 2: RLB high-pass
  var rlbF0 = 38.13547087602444;
  var rlbQ = 0.5003270373238773;

  w0 = 2 * PI * rlbF0 / sampleRate;
  cosw = Math.cos(w0);
  sinw = Math.sin(w0);
  alpha = sinw / (2 * rlbQ);

  b0 = (1 + cosw) / 2; b1 = -(1 + cosw); b2 = (1 + cosw) / 2;
  a0 = 1 + alpha; a1 = -2 * cosw; a2 = 1 - alpha;

  this.rlbB[0] = b0 / a0; this.rlbB[1] = b1 / a0; this.rlbB[2] = b2 / a0;
  this.rlbA[0] = 1.0; this.rlbA[1] = a1 / a0; this.rlbA[2] = a2 / a0;
};

KWeightingFilter.prototype.process = function (sample) {
  var y = this.preB[0] * sample + this.preState[0];
  this.preState[0] = this.preB[1] * sample - this.preA[1] * y + this.preState[1];
  this.preState[1] = this.preB[2] * sample - this.preA[2] * y;

  var z = this.rlbB[0] * y + this.rlbState[0];
  this.rlbState[0] = this.rlbB[1] * y - this.rlbA[1] * z + this.rlbState[1];
  this.rlbState[1] = this.rlbB[2] * y - this.rlbA[2] * z;

  return z;
};

KWeightingFilter.prototype.reset = function () {
  this.preState[0] = this.preState[1] = 0;
  this.rlbState[0] = this.rlbState[1] = 0;
};

// ============================================================
// LR4 Filter (ported from MultiBandSplitter.h)
// Two cascaded 2nd-order Butterworth biquads
// ============================================================
function LR4Filter() {
  this.b1 = [0, 0, 0]; this.a1 = [0, 0, 0];
  this.b2 = [0, 0, 0]; this.a2 = [0, 0, 0];
  this.s1 = [0, 0];
  this.s2 = [0, 0];
}

LR4Filter.prototype.reset = function () {
  this.s1[0] = this.s1[1] = 0;
  this.s2[0] = this.s2[1] = 0;
};

LR4Filter.prototype.setLowpass = function (freq, sampleRate) {
  this._computeButterworth(freq, sampleRate, true);
};

LR4Filter.prototype.setHighpass = function (freq, sampleRate) {
  this._computeButterworth(freq, sampleRate, false);
};

LR4Filter.prototype.process = function (sample) {
  // Stage 1
  var y1 = this.b1[0] * sample + this.s1[0];
  this.s1[0] = this.b1[1] * sample - this.a1[1] * y1 + this.s1[1];
  this.s1[1] = this.b1[2] * sample - this.a1[2] * y1;
  // Stage 2
  var y2 = this.b2[0] * y1 + this.s2[0];
  this.s2[0] = this.b2[1] * y1 - this.a2[1] * y2 + this.s2[1];
  this.s2[1] = this.b2[2] * y1 - this.a2[2] * y2;
  return y2;
};

LR4Filter.prototype._computeButterworth = function (freq, sampleRate, lowpass) {
  var w0 = 2 * PI * freq / sampleRate;
  var cosw = Math.cos(w0);
  var sinw = Math.sin(w0);
  var alpha = sinw / (2 * 0.7071067811865476); // Q = sqrt(2)/2

  var b0, b1v, b2v, a0, a1v, a2v;
  if (lowpass) {
    b0 = (1 - cosw) / 2;
    b1v = 1 - cosw;
    b2v = (1 - cosw) / 2;
  } else {
    b0 = (1 + cosw) / 2;
    b1v = -(1 + cosw);
    b2v = (1 + cosw) / 2;
  }
  a0 = 1 + alpha;
  a1v = -2 * cosw;
  a2v = 1 - alpha;

  this.b1[0] = this.b2[0] = b0 / a0;
  this.b1[1] = this.b2[1] = b1v / a0;
  this.b1[2] = this.b2[2] = b2v / a0;
  this.a1[0] = this.a2[0] = 1.0;
  this.a1[1] = this.a2[1] = a1v / a0;
  this.a1[2] = this.a2[2] = a2v / a0;
};

// ============================================================
// Cubic Lagrange Interpolation (ported from PluginProcessor.h)
// 4-point interpolation for true peak detection
// ============================================================
function cubicInterpolate(y0, y1, y2, y3, t) {
  var a = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;
  var b = y0 - 2.5 * y1 + 2.0 * y2 - 0.5 * y3;
  var c = -0.5 * y0 + 0.5 * y2;
  var d = y1;
  return ((a * t + b) * t + c) * t + d;
}

// ============================================================
// Utility functions (ported from MeteringMath.h)
// ============================================================
function meanSquareToLUFS(meanSquare) {
  return -0.691 + 10 * Math.log10(Math.max(1e-10, meanSquare));
}

function lufsToHistBin(lufs) {
  var bin = Math.floor((lufs - LUFS_HIST_MIN) / LUFS_HIST_BIN_WIDTH);
  return Math.max(0, Math.min(LUFS_HIST_BINS - 1, bin));
}

function gainToDb(gain) {
  if (gain <= 0) return -100;
  return 20 * Math.log10(gain);
}

// Largest-remainder rounding (ported from MeteringMath.h)
function roundToHundred(contributions) {
  var scaled = contributions.map(function (c) { return c * 100; });
  var truncated = scaled.map(function (s) { return Math.floor(s); });
  var sum = truncated.reduce(function (a, b) { return a + b; }, 0);
  var remainder = 100 - sum;
  var fractional = scaled.map(function (s, i) { return s - truncated[i]; });

  for (var r = 0; r < remainder; r++) {
    var maxIdx = 0;
    for (var i = 1; i < 3; i++) {
      if (fractional[i] > fractional[maxIdx]) maxIdx = i;
    }
    truncated[maxIdx]++;
    fractional[maxIdx] = -1;
  }
  return truncated;
}

// ============================================================
// Main Analysis Pipeline
// ============================================================
self.onmessage = function (e) {
  try {
    var data = e.data;
    var channels = data.channels;
    var sampleRate = data.sampleRate;
    var numChannels = data.numChannels;
    var totalSamples = channels[0].length;
    var isStereo = numChannels >= 2;

    var left = channels[0];
    var right = isStereo ? channels[1] : null;

    // Results accumulator
    var result = {};

    // ---------------------------------------------------
    // Pass 1: Sample peak + True peak + RMS + Phase correlation + L/R balance
    // ---------------------------------------------------
    self.postMessage({ type: 'progress', pct: 0, label: 'Measuring peaks and dynamics...' });

    var samplePeak = 0;
    var truePeak = 0;
    var sumSquared = 0; // for RMS (full-bandwidth, unweighted)

    // True peak history buffers (per channel)
    var histL = [0, 0, 0];
    var histR = [0, 0, 0];

    // Phase correlation accumulators (Pearson)
    var sumL = 0, sumR = 0, sumLL = 0, sumRR = 0, sumLR = 0;

    // L/R balance: sum of abs values per channel
    var sumAbsL = 0, sumAbsR = 0;

    for (var i = 0; i < totalSamples; i++) {
      var sL = left[i];
      var sR = isStereo ? right[i] : sL;

      // Sample peak (max across channels)
      var absL = Math.abs(sL);
      var absR = Math.abs(sR);
      if (absL > samplePeak) samplePeak = absL;
      if (absR > samplePeak) samplePeak = absR;

      // RMS (average of L+R energy)
      sumSquared += sL * sL;
      if (isStereo) sumSquared += sR * sR;

      // True peak: 4x cubic Lagrange interpolation (ported from PluginProcessor.cpp)
      var tpL = absL;
      var tpR = absR;
      for (var k = 1; k <= 3; k++) {
        var t = k * 0.25;
        var interpL = Math.abs(cubicInterpolate(histL[0], histL[1], histL[2], sL, t));
        var interpR = Math.abs(cubicInterpolate(histR[0], histR[1], histR[2], sR, t));
        if (interpL > tpL) tpL = interpL;
        if (interpR > tpR) tpR = interpR;
      }
      if (tpL > truePeak) truePeak = tpL;
      if (tpR > truePeak) truePeak = tpR;

      // Shift true peak history
      histL[0] = histL[1]; histL[1] = histL[2]; histL[2] = sL;
      histR[0] = histR[1]; histR[1] = histR[2]; histR[2] = sR;

      // Phase correlation accumulators
      if (isStereo) {
        sumL += sL; sumR += sR;
        sumLL += sL * sL; sumRR += sR * sR;
        sumLR += sL * sR;
        sumAbsL += absL; sumAbsR += absR;
      }

      // Report progress every ~5%
      if (i % Math.floor(totalSamples / 20) === 0) {
        self.postMessage({ type: 'progress', pct: (i / totalSamples) * 30 });
      }
    }

    // Compute peak results
    var samplePeakDb = gainToDb(samplePeak);
    var truePeakDb = gainToDb(truePeak);

    // RMS
    var rmsChannelCount = isStereo ? 2 : 1;
    var rmsLinear = Math.sqrt(sumSquared / (totalSamples * rmsChannelCount));
    var rmsDb = gainToDb(rmsLinear);

    // Crest factor
    var crestDb = samplePeakDb - rmsDb;

    // Phase correlation (Pearson coefficient, same as MeteringMath.h)
    var correlation = 0;
    if (isStereo) {
      var n = totalSamples;
      var num = n * sumLR - sumL * sumR;
      var denL = n * sumLL - sumL * sumL;
      var denR = n * sumRR - sumR * sumR;
      if (denL > 0 && denR > 0) {
        correlation = num / Math.sqrt(denL * denR);
        correlation = Math.max(-1, Math.min(1, correlation));
      }
    }

    // L/R balance: -1 = full left, +1 = full right, 0 = centered
    var balance = 0;
    if (isStereo && (sumAbsL + sumAbsR) > 0) {
      balance = (sumAbsR - sumAbsL) / (sumAbsR + sumAbsL);
    }

    // ---------------------------------------------------
    // Pass 2: K-weighted LUFS (integrated + LRA) + Tonal balance (3-band)
    // ---------------------------------------------------
    self.postMessage({ type: 'progress', pct: 30, label: 'Computing loudness and tonal balance...' });

    // Initialize K-weighting filters (for integrated LUFS)
    var kwFilterL = new KWeightingFilter();
    var kwFilterR = new KWeightingFilter();
    kwFilterL.initForSampleRate(sampleRate);
    kwFilterR.initForSampleRate(sampleRate);

    // 3-band crossover filters (per channel)
    var CROSSOVER_LOW = 200;
    var CROSSOVER_HIGH = 4000;

    var xover1LP_L = new LR4Filter(); xover1LP_L.setLowpass(CROSSOVER_LOW, sampleRate);
    var xover1HP_L = new LR4Filter(); xover1HP_L.setHighpass(CROSSOVER_LOW, sampleRate);
    var xover2LP_L = new LR4Filter(); xover2LP_L.setLowpass(CROSSOVER_HIGH, sampleRate);
    var xover2HP_L = new LR4Filter(); xover2HP_L.setHighpass(CROSSOVER_HIGH, sampleRate);
    // Phase compensation allpass for Low band (LP + HP at crossover 2 frequency)
    var allpassLP_L = new LR4Filter(); allpassLP_L.setLowpass(CROSSOVER_HIGH, sampleRate);
    var allpassHP_L = new LR4Filter(); allpassHP_L.setHighpass(CROSSOVER_HIGH, sampleRate);

    var xover1LP_R, xover1HP_R, xover2LP_R, xover2HP_R, allpassLP_R, allpassHP_R;
    if (isStereo) {
      xover1LP_R = new LR4Filter(); xover1LP_R.setLowpass(CROSSOVER_LOW, sampleRate);
      xover1HP_R = new LR4Filter(); xover1HP_R.setHighpass(CROSSOVER_LOW, sampleRate);
      xover2LP_R = new LR4Filter(); xover2LP_R.setLowpass(CROSSOVER_HIGH, sampleRate);
      xover2HP_R = new LR4Filter(); xover2HP_R.setHighpass(CROSSOVER_HIGH, sampleRate);
      allpassLP_R = new LR4Filter(); allpassLP_R.setLowpass(CROSSOVER_HIGH, sampleRate);
      allpassHP_R = new LR4Filter(); allpassHP_R.setHighpass(CROSSOVER_HIGH, sampleRate);
    }

    // Per-band K-weighting filters (3 bands x 2 channels)
    var bandKW_L = [new KWeightingFilter(), new KWeightingFilter(), new KWeightingFilter()];
    var bandKW_R = [new KWeightingFilter(), new KWeightingFilter(), new KWeightingFilter()];
    for (var b = 0; b < 3; b++) {
      bandKW_L[b].initForSampleRate(sampleRate);
      bandKW_R[b].initForSampleRate(sampleRate);
    }

    // LUFS block accumulation (100ms blocks per ITU-R BS.1770-4)
    var samplesPerBlock = Math.floor(sampleRate * 0.1); // 100ms
    var blockSampleCount = 0;
    var kwSumL = 0, kwSumR = 0;
    var bandSumL = [0, 0, 0], bandSumR = [0, 0, 0];

    // Momentary LUFS ring buffer (4 blocks = 400ms)
    var momentaryBuffer = [];

    // Short-term LUFS ring buffer (30 blocks = 3s) for LRA
    var shortTermBuffer = [];

    // Integrated LUFS histogram (same as plugin)
    var integratedHist = new Int32Array(LUFS_HIST_BINS);
    var integratedCount = 0;
    var ungatedLinearSum = 0;

    // LRA histogram (populated with short-term LUFS values per EBU TECH 3342)
    var lraHist = new Int32Array(LUFS_HIST_BINS);
    var lraBlockCount = 0;
    var lraUngatedLinearSum = 0;

    // Band energy accumulators (integrated over whole file)
    var bandIntegratedSum = [0, 0, 0];

    for (var i = 0; i < totalSamples; i++) {
      var sL = left[i];
      var sR = isStereo ? right[i] : sL;

      // K-weight the full-band signal for LUFS
      var kwL = kwFilterL.process(sL);
      var kwR = kwFilterR.process(sR);
      kwSumL += kwL * kwL;
      kwSumR += kwR * kwR;

      // 3-band crossover (same topology as MultiBandSplitter.h)
      var lowL = xover1LP_L.process(sL);
      var upperL = xover1HP_L.process(sL);
      // Phase-compensate low band
      var apLPL = allpassLP_L.process(lowL);
      var apHPL = allpassHP_L.process(lowL);
      lowL = apLPL + apHPL;
      var midL = xover2LP_L.process(upperL);
      var highL = xover2HP_L.process(upperL);

      var lowR, midR, highR;
      if (isStereo) {
        lowR = xover1LP_R.process(sR);
        var upperR = xover1HP_R.process(sR);
        var apLPR = allpassLP_R.process(lowR);
        var apHPR = allpassHP_R.process(lowR);
        lowR = apLPR + apHPR;
        midR = xover2LP_R.process(upperR);
        highR = xover2HP_R.process(upperR);
      } else {
        lowR = lowL; midR = midL; highR = highL;
      }

      // K-weight each band and accumulate
      var bandsL = [lowL, midL, highL];
      var bandsR = [lowR, midR, highR];
      for (var b = 0; b < 3; b++) {
        var bkwL = bandKW_L[b].process(bandsL[b]);
        var bkwR = bandKW_R[b].process(bandsR[b]);
        bandSumL[b] += bkwL * bkwL;
        bandSumR[b] += bkwR * bkwR;
      }

      blockSampleCount++;

      // Commit block on 100ms boundary
      if (blockSampleCount >= samplesPerBlock) {
        var meanSq = (kwSumL + kwSumR) / blockSampleCount;
        var blockLufs = meanSquareToLUFS(meanSq);

        // Momentary: power-mean of last 4 blocks (400ms)
        momentaryBuffer.push(blockLufs);
        if (momentaryBuffer.length > 4) momentaryBuffer.shift();

        var momentaryLufs = calculateLUFSFromBlocks(momentaryBuffer);

        // Short-term: power-mean of last 30 blocks (3s)
        shortTermBuffer.push(blockLufs);
        if (shortTermBuffer.length > 30) shortTermBuffer.shift();

        if (shortTermBuffer.length >= 10) { // need at least 1s of data
          var stLufs = calculateLUFSFromBlocks(shortTermBuffer);
          // LRA histogram: populated with short-term LUFS (EBU TECH 3342)
          if (stLufs > ABSOLUTE_GATE_LUFS) {
            var lraBin = lufsToHistBin(stLufs);
            lraHist[lraBin]++;
            lraBlockCount++;
            lraUngatedLinearSum += Math.pow(10, stLufs * 0.1);
          }
        }

        // Integrated histogram with absolute gate
        if (blockLufs > ABSOLUTE_GATE_LUFS) {
          var bin = lufsToHistBin(blockLufs);
          integratedHist[bin]++;
          integratedCount++;
          ungatedLinearSum += Math.pow(10, blockLufs * 0.1);
        }

        // Band integrated energy
        for (var b = 0; b < 3; b++) {
          var bMeanSq = (bandSumL[b] + bandSumR[b]) / blockSampleCount;
          if (bMeanSq > 1e-14) bandIntegratedSum[b] += bMeanSq;
          bandSumL[b] = 0; bandSumR[b] = 0;
        }

        kwSumL = 0; kwSumR = 0;
        blockSampleCount = 0;
      }

      // Report progress
      if (i % Math.floor(totalSamples / 20) === 0) {
        self.postMessage({ type: 'progress', pct: 30 + (i / totalSamples) * 65 });
      }
    }

    // Handle final partial block
    if (blockSampleCount > 0) {
      var meanSq = (kwSumL + kwSumR) / blockSampleCount;
      var blockLufs = meanSquareToLUFS(meanSq);
      if (blockLufs > ABSOLUTE_GATE_LUFS) {
        var bin = lufsToHistBin(blockLufs);
        integratedHist[bin]++;
        integratedCount++;
        ungatedLinearSum += Math.pow(10, blockLufs * 0.1);
      }
      for (var b = 0; b < 3; b++) {
        var bMeanSq = (bandSumL[b] + bandSumR[b]) / blockSampleCount;
        if (bMeanSq > 1e-14) bandIntegratedSum[b] += bMeanSq;
      }
    }

    // ---------------------------------------------------
    // Compute Integrated LUFS (dual-gated per ITU-R BS.1770-4)
    // ---------------------------------------------------
    var integratedLUFS = -100;
    if (integratedCount > 0) {
      // Step 1: ungated mean
      var ungatedMean = 10 * Math.log10(ungatedLinearSum / integratedCount);
      // Step 2: relative gate at -10 LU below ungated mean
      var relativeGate = ungatedMean - 10;
      var relativeGateBin = lufsToHistBin(relativeGate);

      // Step 3: compute gated mean above relative gate
      var gatedSum = 0, gatedCount = 0;
      for (var b = relativeGateBin; b < LUFS_HIST_BINS; b++) {
        if (integratedHist[b] > 0) {
          var binCenter = LUFS_HIST_MIN + (b + 0.5) * LUFS_HIST_BIN_WIDTH;
          var linearPower = Math.pow(10, binCenter * 0.1);
          gatedSum += linearPower * integratedHist[b];
          gatedCount += integratedHist[b];
        }
      }
      if (gatedCount > 0) {
        integratedLUFS = 10 * Math.log10(gatedSum / gatedCount);
      }
    }

    // ---------------------------------------------------
    // Compute LRA (EBU TECH 3342 percentile method)
    // ---------------------------------------------------
    var lra = 0;
    if (lraBlockCount > 0) {
      var lraUngatedMean = 10 * Math.log10(lraUngatedLinearSum / lraBlockCount);
      var lraRelativeGate = lraUngatedMean - 20;
      var lraGateStartBin = lufsToHistBin(lraRelativeGate);

      var gatedTotal = 0;
      for (var b = lraGateStartBin; b < LUFS_HIST_BINS; b++) {
        gatedTotal += lraHist[b];
      }

      if (gatedTotal >= 2) {
        var target10 = Math.floor(gatedTotal * 0.10) + 1;
        var target95 = Math.floor(gatedTotal * 0.95) + 1;
        var p10 = LUFS_HIST_MIN;
        var p95 = LUFS_HIST_MAX;

        var cumulative = 0;
        for (var b = lraGateStartBin; b < LUFS_HIST_BINS; b++) {
          cumulative += lraHist[b];
          var binCenter = LUFS_HIST_MIN + (b + 0.5) * LUFS_HIST_BIN_WIDTH;
          if (cumulative >= target10 && p10 === LUFS_HIST_MIN) p10 = binCenter;
          if (cumulative >= target95) { p95 = binCenter; break; }
        }
        lra = Math.max(0, p95 - p10);
      }
    }

    // ---------------------------------------------------
    // Compute tonal balance percentages
    // ---------------------------------------------------
    var bandTotal = bandIntegratedSum[0] + bandIntegratedSum[1] + bandIntegratedSum[2];
    var bandContributions = [0, 0, 0];
    if (bandTotal > 0) {
      for (var b = 0; b < 3; b++) {
        bandContributions[b] = bandIntegratedSum[b] / bandTotal;
      }
    } else {
      bandContributions = [1 / 3, 1 / 3, 1 / 3];
    }
    var bandPct = roundToHundred(bandContributions);

    // ---------------------------------------------------
    // Compute stereo width (based on correlation)
    // width = 0 (mono) to 1 (fully decorrelated)
    // ---------------------------------------------------
    var stereoWidth = isStereo ? Math.max(0, 1 - correlation) / 2 : 0;
    // Clamp to 0-1 range for display; 0=mono, 0.5=balanced, 1=wide/inverted
    stereoWidth = Math.min(1, stereoWidth);

    // ---------------------------------------------------
    // Classify results
    // ---------------------------------------------------

    // Loudness status
    var loudnessStatus;
    if (integratedLUFS <= -100) loudnessStatus = 'Low';
    else if (integratedLUFS < -16) loudnessStatus = 'Low';
    else if (integratedLUFS < -10) loudnessStatus = 'Balanced';
    else if (integratedLUFS < -6) loudnessStatus = 'Loud';
    else loudnessStatus = 'Very Loud';

    // Peak clip risk
    var clipRisk;
    if (truePeakDb < -1.0) clipRisk = 'Safe';
    else if (truePeakDb < 0.0) clipRisk = 'Close to Limit';
    else clipRisk = 'Clipping Risk';

    // Dynamics status
    var dynamicsStatus;
    if (crestDb > 14) dynamicsStatus = 'Open';
    else if (crestDb > 8) dynamicsStatus = 'Balanced';
    else if (crestDb > 4) dynamicsStatus = 'Dense';
    else dynamicsStatus = 'Crushed';

    // Stereo status
    var stereoStatus;
    if (!isStereo) stereoStatus = 'Mono';
    else if (correlation > 0.85) stereoStatus = 'Narrow';
    else if (correlation > 0.5) stereoStatus = 'Balanced';
    else if (correlation > 0.15) stereoStatus = 'Wide';
    else stereoStatus = 'Very Wide';

    // Mono compatibility warning
    var monoWarning = isStereo && correlation < 0.3;

    // Tonal tilt label
    var tiltLabel;
    if (bandPct[0] >= bandPct[2] + 15) tiltLabel = 'Warm';
    else if (bandPct[2] >= bandPct[0] + 15) tiltLabel = 'Bright';
    else tiltLabel = 'Balanced';

    // ---------------------------------------------------
    // Findings engine
    // ---------------------------------------------------
    var findings = [];

    // Loudness findings
    if (integratedLUFS > -6) {
      findings.push({ message: 'The integrated loudness is very high at ' + integratedLUFS.toFixed(1) + ' LUFS. Most streaming platforms will apply significant loudness normalization.', severity: 'alert' });
    } else if (integratedLUFS > -10) {
      findings.push({ message: 'The loudness is on the high side at ' + integratedLUFS.toFixed(1) + ' LUFS. Streaming platforms may turn this down.', severity: 'notice' });
    } else if (integratedLUFS < -20 && integratedLUFS > -100) {
      findings.push({ message: 'The loudness is quite low at ' + integratedLUFS.toFixed(1) + ' LUFS. This may sound quiet compared to other material.', severity: 'notice' });
    } else if (integratedLUFS > -100) {
      findings.push({ message: 'The loudness sits at ' + integratedLUFS.toFixed(1) + ' LUFS, which is in a comfortable range for streaming.', severity: 'info' });
    }

    // Peak findings
    if (truePeakDb >= 0) {
      findings.push({ message: 'True peak reaches ' + truePeakDb.toFixed(1) + ' dBTP. This will likely clip on playback. Consider reducing the output level.', severity: 'alert' });
    } else if (truePeakDb > -1) {
      findings.push({ message: 'True peak is at ' + truePeakDb.toFixed(1) + ' dBTP, which is close to the limit. Most platforms require -1.0 dBTP or lower.', severity: 'warn' });
    }

    // Dynamics findings
    if (crestDb < 4) {
      findings.push({ message: 'The dynamics are heavily compressed with a crest factor of ' + crestDb.toFixed(1) + ' dB. The mix may sound fatiguing over time.', severity: 'warn' });
    } else if (crestDb > 18) {
      findings.push({ message: 'The dynamic range is very wide at ' + crestDb.toFixed(1) + ' dB crest factor. Some passages may feel too quiet relative to peaks.', severity: 'notice' });
    }

    // Stereo findings
    if (monoWarning) {
      findings.push({ message: 'Phase correlation is low (' + correlation.toFixed(2) + '). This mix may lose energy or clarity when summed to mono.', severity: 'warn' });
    }
    if (isStereo && Math.abs(balance) > 0.1) {
      var side = balance < 0 ? 'left' : 'right';
      findings.push({ message: 'The stereo balance leans ' + side + ' by about ' + Math.abs(balance * 100).toFixed(0) + '%.', severity: 'notice' });
    }

    // Tonal findings
    if (bandPct[2] >= bandPct[0] + 20) {
      findings.push({ message: 'The tonal balance leans bright, with the high band carrying ' + bandPct[2] + '% of the energy.', severity: 'notice' });
    } else if (bandPct[0] >= bandPct[2] + 20) {
      findings.push({ message: 'The tonal balance leans warm, with the low band carrying ' + bandPct[0] + '% of the energy.', severity: 'notice' });
    } else {
      findings.push({ message: 'The tonal balance is fairly even across the frequency range.', severity: 'info' });
    }

    // LRA finding
    if (lra > 15) {
      findings.push({ message: 'The loudness range is very wide at ' + lra.toFixed(1) + ' LU, indicating large differences between quiet and loud sections.', severity: 'notice' });
    }

    // Cap at 5 findings, prioritize by severity
    var severityOrder = { alert: 0, warn: 1, notice: 2, info: 3 };
    findings.sort(function (a, b) {
      return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
    });
    findings = findings.slice(0, 5);

    // ---------------------------------------------------
    // Assemble result
    // ---------------------------------------------------
    self.postMessage({
      type: 'result',
      result: {
        loudness: {
          integrated: integratedLUFS,
          range: lra,
          status: loudnessStatus
        },
        peak: {
          samplePeakDb: samplePeakDb,
          truePeakDb: truePeakDb,
          clipRisk: clipRisk
        },
        dynamics: {
          rmsDb: rmsDb,
          crestDb: crestDb,
          status: dynamicsStatus
        },
        stereo: {
          balance: balance,
          width: stereoWidth,
          correlation: correlation,
          status: stereoStatus,
          monoWarning: monoWarning
        },
        tonal: {
          low: bandPct[0],
          mid: bandPct[1],
          high: bandPct[2],
          tiltLabel: tiltLabel
        },
        findings: findings
      }
    });

  } catch (err) {
    self.postMessage({ type: 'error', message: 'Analysis failed: ' + err.message });
  }
};

// Helper: calculate LUFS from array of block values
function calculateLUFSFromBlocks(blocks) {
  var sum = 0, valid = 0;
  for (var i = 0; i < blocks.length; i++) {
    if (blocks[i] > -100) {
      sum += Math.pow(10, blocks[i] * 0.1);
      valid++;
    }
  }
  if (valid === 0) return -100;
  return 10 * Math.log10(sum / valid);
}
```

### 7. Sitemap Update

Add these entries to `/Users/freeman/Self_Git/audivea.github.io/sitemap.xml` before the closing `</urlset>`:

```xml
  <url>
    <loc>https://audivea.com/lab/</loc>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://audivea.com/lab/mix-analyzer/</loc>
    <priority>0.9</priority>
  </url>
```

---

## Data Flow

1. User drops/selects file on `dropZone`
2. `analyzer.js` validates file size and extension
3. `FileReader.readAsArrayBuffer()` loads file into memory
4. `AudioContext.decodeAudioData()` decodes to `AudioBuffer` (main thread)
5. Channel data is copied and transferred (zero-copy via `Transferable`) to `worker.js`
6. Worker runs two passes:
   - Pass 1: sample peak, true peak, RMS, phase correlation, L/R balance (single loop)
   - Pass 2: K-weighted LUFS (100ms blocks, dual-gated histogram), LRA (short-term histogram), 3-band tonal balance (LR4 crossover + per-band K-weighting)
7. Worker classifies results and runs findings engine
8. Worker posts `{ type: 'result', result: {...} }` back to main thread
9. `analyzer.js` renders the results dashboard

## Error Handling

| Error | Message | Trigger |
|-------|---------|---------|
| File too large | "This file is too large. The Mix Analyzer supports files up to 200 MB." | `file.size > 200MB` |
| Bad format | "This file format is not supported. Please use WAV, AIFF, MP3, FLAC, or AAC/M4A." | MIME + extension check fails |
| Decode failure | "Unable to decode this audio file. It may be corrupted or in an unsupported format." | `decodeAudioData` rejects |
| File read error | "Unable to read the file. Please try again." | `FileReader.onerror` |
| Too long | "This file is longer than 20 minutes. Please use a shorter file." | `audioBuffer.duration > 1200` |
| Worker crash | "An unexpected error occurred during analysis." | `worker.onerror` |
| DSP error | "Analysis failed: [error]" | try/catch in worker |

All error states show a retry button that resets to the upload state.

## Performance Considerations

- **Memory**: a 10-minute stereo 48kHz file is ~230MB of Float32 data. The channel data is transferred (not copied) to the worker, so peak memory is roughly 2x the decoded audio (one copy during decode, one in the worker). After analysis, the worker terminates and the channel data is garbage-collected.
- **Processing time**: two passes over the audio data. On a modern machine, expect ~2-5 seconds for a 5-minute song. The progress bar provides feedback.
- **File size limit**: 200MB cap prevents browser tab OOM on very large files.
- **Duration limit**: 20 minutes prevents excessive processing time.
- **No Canvas**: the spec uses pure CSS for visualizations (meter bars, tonal bars, phase bar), avoiding Canvas overhead. Canvas can be added later for more complex visualizations.

## Accessibility

- Drop zone has `role="button"`, `tabindex="0"`, and `aria-label`
- Drop zone responds to Enter/Space key for keyboard activation
- Progress bar has `role="progressbar"` with `aria-valuenow`/`aria-valuemin`/`aria-valuemax`
- Finding severity icons have `aria-hidden="true"` (redundant with text)
- All interactive elements have focus-visible outlines via the existing global rule
- Status pills use visible text, not just color
- File info, findings, and detail panels use semantic HTML (lists, headings)
- Hidden sections use the `hidden` attribute (not `display:none` via CSS class) for screen reader compatibility

## Implementation Order

1. **Phase 1: Foundation**
   - Create `/lab/` and `/lab/mix-analyzer/` directories
   - Create `lab/index.html` with Lab listing page
   - Create `lab/mix-analyzer/index.html` with all four state sections (upload, processing, results, error)
   - Update `header.js` and `footer.js` with Lab link and depth-aware path logic
   - Add all new CSS to `components/styles.css`
   - Update `sitemap.xml`

2. **Phase 2: Core DSP Worker**
   - Create `worker.js` with all ported DSP: K-weighting, LR4 crossover, true peak interpolation, LUFS histogram, LRA computation, phase correlation
   - Test with a known reference file (e.g., EBU test tone) to validate LUFS accuracy

3. **Phase 3: UI Controller**
   - Create `analyzer.js` with file handling, AudioContext decoding, Worker communication, progress updates
   - Implement all result rendering functions
   - Wire up "Analyze Another" and error retry flows

4. **Phase 4: Polish and Responsive**
   - Add responsive breakpoints for 768px and 480px
   - Test drag-and-drop on desktop and file picker on mobile
   - Test with various file formats and edge cases (mono files, very short files, silence)
   - Verify all transitions and animations work smoothly

---

## Key Files Referenced

- `/Users/freeman/Self_Git/audivea.github.io/components/styles.css` -- existing design tokens and patterns
- `/Users/freeman/Self_Git/audivea.github.io/components/header.js` -- path-aware nav injection (needs Lab link + depth fix)
- `/Users/freeman/Self_Git/audivea.github.io/components/footer.js` -- path-aware footer injection (needs Lab link + depth fix)
- `/Users/freeman/Self_Git/audivea.github.io/index.html` -- homepage structure pattern
- `/Users/freeman/Self_Git/audivea.github.io/articles/index.html` -- section index pattern to follow
- `/Users/freeman/Self_Git/audivea.github.io/sitemap.xml` -- needs new entries
- `/Users/freeman/Self_Git/Metering/Source/DSP/MeteringMath.h` -- K-weighting filter (lines 104-199), LUFS calculation (lines 77-99), phase correlation (lines 48-72), histogram constants (lines 224-273)
- `/Users/freeman/Self_Git/Metering/Source/DSP/MultiBandSplitter.h` -- LR4 filter (lines 26-101), 3-band crossover topology with phase compensation allpass (lines 113-215)
- `/Users/freeman/Self_Git/Metering/Source/PluginProcessor.h` -- cubicInterpolate function (lines 259-266), true peak history buffers (lines 253-257)
- `/Users/freeman/Self_Git/Metering/Source/PluginProcessor.cpp` -- true peak detection loop (lines 469-533), LRA histogram computation (lines 963-1045), integrated LUFS dual-gating (lines 972-1011)