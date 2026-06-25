const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const outputDir = path.join(__dirname, '..', '..', 'demo-screenshots');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const testFile = '/Users/freeman/Library/CloudStorage/GoogleDrive-wsxcvfre@gmail.com/My Drive/Positive Grid/Signals/LARUKU/05 DIVE TO BLUE.wav';

  // --- Desktop screenshots (1280x900) ---
  const browser = await chromium.launch();
  const desktopCtx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2
  });
  const page = await desktopCtx.newPage();

  // 1. Upload page
  await page.goto('http://localhost:8080/lab/mix-analyzer/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outputDir, '01-upload.png') });
  console.log('Saved 01-upload.png');

  // 2. Analyze file
  await page.locator('input[type="file"]').setInputFiles(testFile);
  await page.waitForSelector('#analyzer-results:not([hidden])', { timeout: 120000 });
  await page.waitForTimeout(1000);

  // Rename the file display to "Your Mix.wav" for demo purposes
  await page.evaluate(() => {
    const info = document.getElementById('result-file-info');
    if (info) info.innerHTML = info.innerHTML.replace(/05 DIVE TO BLUE\.wav/, 'Your Mix.wav');
  });
  await page.waitForTimeout(200);

  // 3. Results viewport (overview + findings)
  await page.screenshot({ path: path.join(outputDir, '02-results-top.png') });
  console.log('Saved 02-results-top.png');

  // 4. Full page
  await page.screenshot({ path: path.join(outputDir, '03-results-full.png'), fullPage: true });
  console.log('Saved 03-results-full.png');

  // 5. Summary cards only
  await page.locator('.analyzer-overview-panel').screenshot({
    path: path.join(outputDir, '04-summary-cards.png')
  });
  console.log('Saved 04-summary-cards.png');

  // 6. Findings only
  await page.locator('.analyzer-findings').screenshot({
    path: path.join(outputDir, '05-findings.png')
  });
  console.log('Saved 05-findings.png');

  await desktopCtx.close();

  // --- Instagram 4:5 (1080x1350) using narrower viewport ---
  const igCtx = await browser.newContext({
    viewport: { width: 1080, height: 1350 },
    deviceScaleFactor: 2
  });
  const igPage = await igCtx.newPage();
  await igPage.goto('http://localhost:8080/lab/mix-analyzer/', { waitUntil: 'networkidle' });
  await igPage.locator('input[type="file"]').setInputFiles(testFile);
  await igPage.waitForSelector('#analyzer-results:not([hidden])', { timeout: 120000 });
  await igPage.waitForTimeout(1000);

  // Rename file for demo
  await igPage.evaluate(() => {
    const info = document.getElementById('result-file-info');
    if (info) info.innerHTML = info.innerHTML.replace(/05 DIVE TO BLUE\.wav/, 'Your Mix.wav');
  });
  await igPage.waitForTimeout(200);

  await igPage.screenshot({
    path: path.join(outputDir, '06-instagram-4x5.png')
  });
  console.log('Saved 06-instagram-4x5.png');

  // --- Instagram story 9:16 (1080x1920) ---
  const storyCtx = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 2
  });
  const storyPage = await storyCtx.newPage();
  await storyPage.goto('http://localhost:8080/lab/mix-analyzer/', { waitUntil: 'networkidle' });
  await storyPage.locator('input[type="file"]').setInputFiles(testFile);
  await storyPage.waitForSelector('#analyzer-results:not([hidden])', { timeout: 120000 });
  await storyPage.waitForTimeout(1000);

  await storyPage.evaluate(() => {
    const info = document.getElementById('result-file-info');
    if (info) info.innerHTML = info.innerHTML.replace(/05 DIVE TO BLUE\.wav/, 'Your Mix.wav');
  });
  await storyPage.waitForTimeout(200);

  await storyPage.screenshot({
    path: path.join(outputDir, '07-instagram-story.png')
  });
  console.log('Saved 07-instagram-story.png');

  await browser.close();
  console.log('\nAll screenshots saved to demo-screenshots/');
})();
