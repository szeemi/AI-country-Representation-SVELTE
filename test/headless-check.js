const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  try {
    if (!fs.existsSync('tmp')) fs.mkdirSync('tmp');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    const url = process.env.URL || 'http://localhost:5174/';
    console.log('visiting', url);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'tmp/page-before.png', fullPage: true });

    const heroClass = await page.$eval('.hero', el => el.className);
    const overlayZ = await page.$eval('.hero-overlay', el => window.getComputedStyle(el).zIndex);
    const captionInfo = await page.$eval('.hero-caption', el => {
      const r = el.getBoundingClientRect();
      return { top: r.top, marginTop: getComputedStyle(el).marginTop };
    });

    console.log('BEFORE_SCROLL', { heroClass, overlayZ, captionInfo });

    // Scroll down to reveal wrapper area (slightly past hero)
    await page.evaluate(() => { window.scrollTo({ top: window.innerHeight * 1.1, behavior: 'instant' }); });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'tmp/page-after.png', fullPage: true });

    const heroHidden = await page.$eval('.hero', el => el.classList.contains('hero--hidden'));
    const flourishPresent = await page.$eval('#my-wrapper', el => {
      return !!(el.querySelector('iframe') || el.querySelector('script[src*="flo.uri"]') || el.querySelector('.flourish-iframe'));
    });

    console.log('AFTER_SCROLL', { heroHidden, flourishPresent });

    await browser.close();
    console.log('screenshots: tmp/page-before.png tmp/page-after.png');
  } catch (err) {
    console.error('ERROR', err);
    process.exit(1);
  }
})();
