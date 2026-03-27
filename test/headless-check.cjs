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
    const heroRect = await page.$eval('.hero', el => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, height: r.height };
    });
    const heroComputed = await page.$eval('.hero', el => {
      const s = window.getComputedStyle(el);
      return { position: s.position, top: s.top, zIndex: s.zIndex };
    });
    const overlayRect = await page.$eval('.hero-overlay', el => {
      const r = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      return { top: r.top, zIndex: s.zIndex, marginTop: s.marginTop };
    });
    const captionInfo = await page.$eval('.hero-caption', el => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return { top: r.top, bottom: r.bottom, marginTop: s.marginTop, zIndex: s.zIndex };
    });
    const wrapperRect = await page.$eval('#my-wrapper', el => {
      const r = el.getBoundingClientRect();
      return { top: r.top, height: r.height };
    });

    // detect flourish iframe/script if present
    const flourishInfo = await page.$eval('#my-wrapper', el => {
      const iframe = el.querySelector('iframe');
      const script = el.querySelector('script[src*="flourish"]') || el.querySelector('script[src*="flo.uri"]');
      const found = !!iframe || !!script;
      const rect = iframe ? iframe.getBoundingClientRect() : null;
      return { found, iframeRect: rect };
    });

    console.log('BEFORE_SCROLL', { heroClass, heroRect, heroComputed, overlayRect, captionInfo, wrapperRect, flourishInfo });

    // Scroll down to push hero well past the viewport
    await page.evaluate(() => { window.scrollTo({ top: window.innerHeight * 2, behavior: 'instant' }); });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'tmp/page-after.png', fullPage: true });

    const heroHidden = await page.$eval('.hero', el => el.classList.contains('hero--hidden'));
    const flourishPresent = await page.$eval('#my-wrapper', el => {
      const iframe = el.querySelector('iframe');
      const script = el.querySelector('script[src*="flourish"]') || el.querySelector('script[src*="flo.uri"]');
      return { iframe: !!iframe, script: !!script };
    });

    const wrapperRectAfter = await page.$eval('#my-wrapper', el => {
      const r = el.getBoundingClientRect();
      return { top: r.top, height: r.height };
    });

    const overlayRectAfter = await page.$eval('.hero-overlay', el => {
      const r = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      const hasFixed = el.classList.contains('hero-overlay--fixed');
      return { top: r.top, hasFixedClass: hasFixed, position: s.position, fixedTop: s.top };
    });

    console.log('AFTER_SCROLL', { heroHidden, flourishPresent, wrapperRectAfter, overlayRectAfter });

    await browser.close();
    console.log('screenshots: tmp/page-before.png tmp/page-after.png');
  } catch (err) {
    console.error('ERROR', err);
    process.exit(1);
  }
})();
