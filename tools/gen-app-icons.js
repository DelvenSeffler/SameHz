'use strict';

/**
 * 生成移动端应用图标与启动图
 *
 * 设计：两个圆环相叠，交集处放播放三角 —— 两个人、同一部片。
 * 输出：
 *   assets/icon.png                iOS / 通用图标（1024，圆角由系统裁切）
 *   assets/icon-foreground.png     Android 自适应图标前景（内容收进安全区）
 *   assets/icon-background.png     Android 自适应图标背景（纯色）
 *   assets/splash.png / -dark.png  启动图（2732）
 */

const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.resolve('assets');

const DEFS = `
  <defs>
    <linearGradient id="ringA" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffe6d9"/>
      <stop offset="1" stop-color="#ffb49c"/>
    </linearGradient>
    <linearGradient id="ringB" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffd9a8"/>
      <stop offset="1" stop-color="#e8a86b"/>
    </linearGradient>
    <linearGradient id="play" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0" stop-color="#ff9270"/>
      <stop offset="0.55" stop-color="#ff6a4d"/>
      <stop offset="1" stop-color="#e34126"/>
    </linearGradient>
    <radialGradient id="halo" cx="50%" cy="46%" r="46%">
      <stop offset="0" stop-color="#ff7d5c" stop-opacity="0.28"/>
      <stop offset="0.65" stop-color="#ff7d5c" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#ff7d5c" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="9"/>
    </filter>
  </defs>`;

/**
 * @param {object} o
 * @param {boolean} o.background  是否绘制底色
 * @param {number}  o.scale       内容缩放（自适应图标需收进安全区）
 */
function icon({ background = true, scale = 1 } = {}) {
  const cx = 256;
  const cy = 256;
  return `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">
  ${DEFS}
  ${background ? `
  <rect width="512" height="512" fill="#0b0a09"/>
  <rect width="512" height="512" fill="url(#halo)"/>` : ''}
  <g transform="translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})">
    <!-- 两个相交的圆环：两个人 -->
    <circle cx="196" cy="256" r="104" fill="none" stroke="url(#ringA)" stroke-opacity="0.95" stroke-width="17"/>
    <circle cx="316" cy="256" r="104" fill="none" stroke="url(#ringB)" stroke-opacity="0.95" stroke-width="17"/>
    <!-- 交集处的柔光 -->
    <ellipse cx="256" cy="256" rx="58" ry="82" fill="#ff6a4d" opacity="0.3" filter="url(#soft)"/>
    <!-- 播放键 -->
    <path d="M218 210 L300 256 L218 302 Z" fill="url(#play)" stroke-linejoin="round"/>
  </g>
</svg>`;
}

function splash() {
  return `<svg viewBox="0 0 2732 2732" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">
  ${DEFS}
  <rect width="2732" height="2732" fill="#0b0a09"/>
  <rect width="2732" height="2732" fill="url(#halo)"/>
  <g transform="translate(1366 1180) scale(1.55) translate(-256 -256)">
    <circle cx="196" cy="256" r="104" fill="none" stroke="url(#ringA)" stroke-opacity="0.95" stroke-width="17"/>
    <circle cx="316" cy="256" r="104" fill="none" stroke="url(#ringB)" stroke-opacity="0.95" stroke-width="17"/>
    <ellipse cx="256" cy="256" rx="58" ry="82" fill="#ff6a4d" opacity="0.3" filter="url(#soft)"/>
    <path d="M218 210 L300 256 L218 302 Z" fill="url(#play)" stroke-linejoin="round"/>
  </g>
  <text x="1366" y="1780" text-anchor="middle" fill="#f7f1e6"
        font-family="PingFang SC, Microsoft YaHei, sans-serif"
        font-size="118" font-weight="600" letter-spacing="30">同 频 观 影</text>
  <text x="1366" y="1880" text-anchor="middle" fill="#aba295"
        font-family="PingFang SC, Microsoft YaHei, sans-serif"
        font-size="52" letter-spacing="20">S A M E H Z</text>
</svg>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  const shoot = async (markup, size, file, transparent = false) => {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;background:${transparent ? 'transparent' : '#0b0a09'}">${markup}</body></html>`,
      { waitUntil: 'load' },
    );
    await page.evaluate(() => document.fonts.ready);
    const target = path.join(OUT, file);
    await page.screenshot({ path: target, type: 'png', omitBackground: transparent });
    console.log('✓', path.relative(process.cwd(), target));
  };

  // iOS 与通用图标：满幅、带底
  await shoot(icon({ background: true }), 1024, 'icon.png');
  // Android 自适应前景：内容收进 66% 安全区、透明底
  await shoot(icon({ background: false, scale: 0.66 }), 1024, 'icon-foreground.png', true);
  // Android 自适应背景：纯深色
  await shoot('<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%"><rect width="512" height="512" fill="#0b0a09"/><rect width="512" height="512" fill="url(#h)"/><defs><radialGradient id="h" cx="50%" cy="46%" r="48%"><stop offset="0" stop-color="#1d1512"/><stop offset="1" stop-color="#0b0a09"/></radialGradient></defs></svg>', 1024, 'icon-background.png');
  await shoot(splash(), 2732, 'splash.png');
  await shoot(splash(), 2732, 'splash-dark.png');

  await browser.close();
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
