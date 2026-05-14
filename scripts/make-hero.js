#!/usr/bin/env node
/**
 * Render an article hero from image-templates/<slug>.html
 * to articles/<slug>.webp (1080×1080).
 *
 * Usage:
 *   npm run hero -- <article-slug>
 *   node scripts/make-hero.js <article-slug>
 *
 * Example:
 *   npm run hero -- true-peak-vs-sample-peak
 *   → reads  image-templates/true-peak-vs-sample-peak.html
 *   → writes articles/true-peak-vs-sample-peak.webp
 *
 * To scaffold a new article hero, copy image-templates/_scaffold.html
 * to image-templates/<slug>.html and edit the SVG inside.
 */

const { chromium } = require('playwright');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function main() {
  const slug = process.argv[2];

  if (!slug) {
    console.error('Usage: npm run hero -- <article-slug>');
    process.exit(1);
  }

  const repoRoot = path.resolve(__dirname, '..');
  const templatePath = path.join(repoRoot, 'image-templates', `${slug}.html`);
  const outPath = path.join(repoRoot, 'articles', `${slug}.webp`);

  if (!fs.existsSync(templatePath)) {
    console.error(`Template missing: ${path.relative(repoRoot, templatePath)}`);
    console.error(`Hint: copy image-templates/_scaffold.html to image-templates/${slug}.html and edit.`);
    process.exit(1);
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1080 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(`file://${templatePath}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const pngBuffer = await page.screenshot({ type: 'png', omitBackground: false });
  await browser.close();

  await sharp(pngBuffer)
    .resize(1080, 1080)
    .webp({ quality: 90 })
    .toFile(outPath);

  console.log(`Wrote ${path.relative(repoRoot, outPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
