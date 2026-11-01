// Renders og.html to ../public/og.png (1200×630). Needs Playwright with
// Chromium installed: not a dependency of the app.
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto('file://' + path.join(__dirname, 'og.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, '..', 'public', 'og.png') });
  await browser.close();
})();
