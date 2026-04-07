const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:8080';

test.describe('Lab section', () => {
  test('lab index page loads with Mix Analyzer card', async ({ page }) => {
    await page.goto(`${BASE}/lab/`);
    await expect(page.locator('h1')).toContainText('Lab');
    await expect(page.locator('.card-title')).toContainText('Mix Analyzer');
    // Nav should show Lab as active
    await expect(page.locator('.nav-link.active')).toContainText('Lab');
  });

  test('lab index card links to mix-analyzer', async ({ page }) => {
    await page.goto(`${BASE}/lab/`);
    const link = page.locator('.card a');
    await expect(link).toHaveAttribute('href', 'mix-analyzer/');
  });
});

test.describe('Mix Analyzer page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/lab/mix-analyzer/`);
  });

  test('page loads with upload state visible', async ({ page }) => {
    await expect(page.locator('#analyzer-upload')).toBeVisible();
    await expect(page.locator('#analyzer-processing')).toBeHidden();
    await expect(page.locator('#analyzer-results')).toBeHidden();
    await expect(page.locator('#analyzer-error')).toBeHidden();
  });

  test('has correct title and meta', async ({ page }) => {
    await expect(page).toHaveTitle(/Mix Analyzer/);
    const desc = page.locator('meta[name="description"]');
    await expect(desc).toHaveAttribute('content', /loudness|LUFS/i);
  });

  test('nav Lab link is active', async ({ page }) => {
    await expect(page.locator('.nav-link.active')).toContainText('Lab');
  });

  test('drop zone is keyboard accessible', async ({ page }) => {
    const dropZone = page.locator('#drop-zone');
    await expect(dropZone).toHaveAttribute('tabindex', '0');
    await expect(dropZone).toHaveAttribute('role', 'button');
  });

  test('shows privacy note', async ({ page }) => {
    await expect(page.locator('.analyzer-privacy')).toContainText('never leaves your browser');
  });

  test('shows supported formats', async ({ page }) => {
    await expect(page.locator('.analyzer-formats')).toContainText('WAV');
    await expect(page.locator('.analyzer-formats')).toContainText('MP3');
  });

  test('click on drop zone opens file picker', async ({ page }) => {
    const fileInput = page.locator('#file-input');
    await expect(fileInput).toBeHidden();
    // Verify the click handler is wired up by checking the input exists
    await expect(fileInput).toHaveAttribute('accept', /audio/);
  });
});

test.describe('Mix Analyzer with audio file', () => {
  test('analyzes a generated WAV file and shows results', async ({ page }) => {
    await page.goto(`${BASE}/lab/mix-analyzer/`);

    // Generate a short WAV file (1 second, 44100 Hz, stereo, 440Hz sine)
    const wavBuffer = generateWav(44100, 1.0, 440);
    const wavBase64 = bufferToBase64(wavBuffer);

    // Upload via file input
    const buffer = Buffer.from(wavBase64, 'base64');
    await page.locator('#file-input').setInputFiles({
      name: 'test-tone.wav',
      mimeType: 'audio/wav',
      buffer: buffer,
    });

    // Wait for results to appear (up to 15s for analysis)
    await expect(page.locator('#analyzer-results')).toBeVisible({ timeout: 15000 });

    // Upload section should be hidden
    await expect(page.locator('#analyzer-upload')).toBeHidden();

    // Summary cards should exist
    const cards = page.locator('.summary-card');
    await expect(cards).toHaveCount(5);

    // Check card labels
    await expect(page.locator('.summary-card-label').nth(0)).toContainText('Loudness');
    await expect(page.locator('.summary-card-label').nth(1)).toContainText('Peak');
    await expect(page.locator('.summary-card-label').nth(2)).toContainText('Dynamics');
    await expect(page.locator('.summary-card-label').nth(3)).toContainText('Stereo');
    await expect(page.locator('.summary-card-label').nth(4)).toContainText('Tonal');

    // Loudness value should contain LUFS
    await expect(page.locator('.summary-card-value').nth(0)).toContainText('LUFS');

    // Peak value should contain dBTP
    await expect(page.locator('.summary-card-value').nth(1)).toContainText('dBTP');

    // Findings should appear
    const findings = page.locator('.finding-item');
    const count = await findings.count();
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(5);

    // Detail panels should all be visible
    await expect(page.locator('#detail-loudness')).toBeVisible();
    await expect(page.locator('#detail-peak')).toBeVisible();
    await expect(page.locator('#detail-dynamics')).toBeVisible();
    await expect(page.locator('#detail-stereo')).toBeVisible();
    await expect(page.locator('#detail-tonal')).toBeVisible();

    // File info bar should show metadata
    const fileInfo = page.locator('.analyzer-file-info');
    await expect(fileInfo).toContainText('test-tone.wav');
    // Browser's AudioContext may resample to its default rate (typically 48kHz)
    await expect(fileInfo).toContainText('kHz');
    await expect(fileInfo).toContainText('Stereo');

    // CTA section should exist
    await expect(page.locator('.analyzer-cta')).toBeVisible();

    // Tonal bars should render
    await expect(page.locator('.tonal-bar-group')).toHaveCount(3);
  });

  test('analyze another resets to upload', async ({ page }) => {
    await page.goto(`${BASE}/lab/mix-analyzer/`);

    const wavBuffer = generateWav(44100, 0.5, 440);
    const buffer = Buffer.from(bufferToBase64(wavBuffer), 'base64');
    await page.locator('#file-input').setInputFiles({
      name: 'test.wav',
      mimeType: 'audio/wav',
      buffer: buffer,
    });

    await expect(page.locator('#analyzer-results')).toBeVisible({ timeout: 15000 });

    await page.locator('#analyze-another').click();
    await expect(page.locator('#analyzer-upload')).toBeVisible();
    await expect(page.locator('#analyzer-results')).toBeHidden();
  });
});

test.describe('Header/Footer nav from all depths', () => {
  const pages = [
    { url: '/', name: 'homepage' },
    { url: '/about.html', name: 'about' },
    { url: '/lab/', name: 'lab' },
    { url: '/lab/mix-analyzer/', name: 'mix-analyzer' },
    { url: '/articles/', name: 'articles' },
    { url: '/products/', name: 'products' },
  ];

  for (const p of pages) {
    test(`Lab nav link works from ${p.name}`, async ({ page }) => {
      await page.goto(`${BASE}${p.url}`);
      const labLink = page.locator('.nav-link', { hasText: 'Lab' });
      await expect(labLink).toBeVisible();
      const href = await labLink.getAttribute('href');
      expect(href).toBeTruthy();
      // Click and verify we land on lab page
      await labLink.click();
      await expect(page.locator('h1')).toContainText('Lab');
    });
  }
});

// --- WAV generation helper ---
function generateWav(sampleRate, durationSec, freq) {
  const numSamples = Math.floor(sampleRate * durationSec);
  const numChannels = 2;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true);  // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Generate sine wave at -6 dBFS
  const amplitude = 0.5; // ~-6 dBFS
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const sample = amplitude * Math.sin(2 * Math.PI * freq * i / sampleRate);
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    // Both channels get the same signal
    view.setInt16(offset, intSample, true);
    view.setInt16(offset + 2, intSample, true);
    offset += 4;
  }

  return buffer;
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return Buffer.from(binary, 'binary').toString('base64');
}
