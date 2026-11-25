'use strict';

/**
 * 生成移动端应用图标与启动图所需的源图
 * 输出：
 *   assets/app-icon.png        1024x1024 应用图标
 *   assets/app-icon-foreground.png  Adaptive Icon 前景（透明背景）
 *   assets/splash.png          2732x2732 启动图
 *
 * 之后用 @capacitor/assets 生成各平台尺寸：
 *   npx capacitor-assets generate
 */

const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.resolve('assets/mobile');

const MARK = (size, { background }) => `
<svg style="width:100%;height:100%;display:block" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tri" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff8266"/>
      <stop offset="1" stop-color="#e94f35"/>
    </linearGradient>
  </defs>
  ${background ? '<rect width="512" height="512" rx="112" fill="#0b0a09"/>' : ''}
  <circle cx="256" cy="256" r="184" fill="none" stroke="#f4ecdf" stroke-opacity="${background ? 0.2 : 0.28}" stroke-width="5"/>
  <circle cx="256" cy="256" r="136" fill="none" stroke="#d8b78b" stroke-opacity="0.38" stroke-width="5" stroke-dasharray="16 40"/>
  <path d="M208 172 352 256 208 340V172Z" fill="url(#tri)"/>
</svg>`;

const SPLASH = `
<svg width="2732" height="2732" viewBox="0 0 2732 2732" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tri" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff8266"/>
      <stop offset="1" stop-color="#e94f35"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="38%" r="52%">
      <stop offset="0" stop-color="#c85834" stop-opacity="0.42"/>
      <stop offset="1" stop-color="#c85834" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="2732" height="2732" fill="#0b0a09"/>
  <rect width="2732" height="2732" fill="url(#glow)"/>
  <g transform="translate(1110 1000) scale(1)">
    <circle cx="256" cy="256" r="184" fill="none" stroke="#f4ecdf" stroke-opacity="0.22" stroke-width="6"/>
    <circle cx="256" cy="256" r="136" fill="none" stroke="#d8b78b" stroke-opacity="0.4" stroke-width="6" stroke-dasharray="16 40"/>
    <path d="M208 172 352 256 208 340V172Z" fill="url(#tri)"/>
  </g>
  <text x="1366" y="1720" text-anchor="middle" fill="#d6b78b"
        font-family="PingFang SC, Microsoft YaHei, sans-serif"
        font-size="104" font-weight="600" letter-spacing="26">同 频 观 影</text>
  <text x="1366" y="1812" text-anchor="middle" fill="#aba295"
        font-family="PingFang SC, Microsoft YaHei, sans-serif"
        font-size="48" letter-spacing="18">S A M E H Z</text>
</svg>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  const shoot = async (html, size, file, transparent = false) => {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;background:${transparent ? 'transparent' : '#0b0a09'}">${html}</body></html>`,
      { waitUntil: 'load' },
    );
    await page.evaluate(() => document.fonts.ready);
    const target = path.join(OUT, file);
    await page.screenshot({ path: target, type: 'png', omitBackground: transparent });
    console.log('✓', path.relative(process.cwd(), target));
  };

  await shoot(MARK(512, { background: true }), 1024, 'app-icon.png');
  await shoot(MARK(512, { background: false }), 1024, 'app-icon-foreground.png', true);
  await shoot(SPLASH, 2732, 'splash.png');
  await shoot(SPLASH, 2732, 'splash-dark.png');

  await browser.close();
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
