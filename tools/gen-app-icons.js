'use strict';

/**
 * 应用图标与启动图（正式版）
 *
 * 设计取自参考图：暖色同心圆环 + 点状虚线环 + 中心珊瑚实心圆 + 白色播放键。
 * 输出：
 *   assets/icon.png                1024 通用图标（系统裁圆角）
 *   assets/icon-foreground.png     Android 自适应前景（收进安全区）
 *   assets/icon-background.png     Android 自适应背景
 *   assets/splash.png / -dark.png  启动图
 *
 * 生成平台资源：npx capacitor-assets generate
 */

const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.resolve('assets');

const C = 256;

const DEFS = `
  <defs>
    <linearGradient id="disc" x1=".2" y1=".1" x2=".9" y2="1">
      <stop offset="0" stop-color="#ff9678"/>
      <stop offset=".5" stop-color="#ff6a4d"/>
      <stop offset="1" stop-color="#e24326"/>
    </linearGradient>
    <linearGradient id="ringOuter" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#b08a62" stop-opacity=".95"/>
      <stop offset="1" stop-color="#6a4f36" stop-opacity=".75"/>
    </linearGradient>
    <radialGradient id="bg" cx="50%" cy="44%" r="72%">
      <stop offset="0" stop-color="#131110"/>
      <stop offset=".7" stop-color="#0a0908"/>
      <stop offset="1" stop-color="#050404"/>
    </radialGradient>
    <radialGradient id="warm" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ff6a4d" stop-opacity=".18"/>
      <stop offset="1" stop-color="#ff6a4d" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

/**
 * 图标主体。scale 用于把内容收进 Android 自适应图标安全区。
 */
function mark({ scale = 1, withGlow = true } = {}) {
  const tri = 116;         // 播放键高度
  const half = tri / 2;
  const w = tri * 0.84;
  const x = C - w * 0.36;
  const y = C - half;
  return `
  <g transform="translate(${C} ${C}) scale(${scale}) translate(${-C} ${-C})">
    ${withGlow ? `<circle cx="${C}" cy="${C}" r="176" fill="url(#warm)"/>` : ''}
    <circle cx="${C}" cy="${C}" r="218" fill="none" stroke="url(#ringOuter)" stroke-width="8"/>
    <circle cx="${C}" cy="${C}" r="178" fill="none" stroke="#ff8f72" stroke-opacity=".42" stroke-width="7"
            stroke-linecap="round" stroke-dasharray="3 14"/>
    <circle cx="${C}" cy="${C}" r="128" fill="url(#disc)"/>
    <path d="M${x} ${y} L${x + w} ${C} L${x} ${y + tri} Z"
          fill="#fffaf6" stroke="#fffaf6" stroke-width="11" stroke-linejoin="round"/>
  </g>`;
}

const iconSvg = ({ background = true, scale = 1 } = {}) => `
  <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">
    ${DEFS}
    ${background ? '<rect width="512" height="512" fill="url(#bg)"/>' : ''}
    ${mark({ scale })}
  </svg>`;

const splashSvg = () => `
  <svg viewBox="0 0 2732 2732" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">
    ${DEFS}
    <rect width="2732" height="2732" fill="url(#bg)"/>
    <g transform="translate(1366 1150) scale(2.15) translate(-256 -256)">
      ${mark({ withGlow: true })}
    </g>
    <text x="1366" y="1800" text-anchor="middle" fill="#f7f1e6"
          font-family="PingFang SC, Microsoft YaHei, sans-serif"
          font-size="116" font-weight="600" letter-spacing="28">同 频 观 影</text>
    <text x="1366" y="1898" text-anchor="middle" fill="#9a9185"
          font-family="PingFang SC, Microsoft YaHei, sans-serif"
          font-size="50" letter-spacing="20">S A M E H Z</text>
  </svg>`;

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

  // 通用图标：满幅
  await shoot(iconSvg({ background: true }), 1024, 'icon.png');
  // Android 自适应前景：内容收进中间 66%，透明底
  await shoot(iconSvg({ background: false, scale: 0.78 }), 1024, 'icon-foreground.png', true);
  // Android 自适应背景
  await shoot(`<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
      ${DEFS}<rect width="512" height="512" fill="url(#bg)"/></svg>`, 1024, 'icon-background.png');
  // 启动图
  await shoot(splashSvg(), 2732, 'splash.png');
  await shoot(splashSvg(), 2732, 'splash-dark.png');

  await browser.close();

  /*
   * Capacitor 的素材生成器会给自适应图标的两层各套一个 <inset>，
   * 等于在安全区之上再缩一次，桌面上看起来就是「图标很小」。
   * 这里把生成的 XML 改回纯粹的两层引用，让前景按 66% 安全区直接呈现。
   */
  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;
  for (const file of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
    const target = path.join('android', 'app', 'src', 'main', 'res', 'mipmap-anydpi-v26', file);
    if (fs.existsSync(target)) {
      fs.writeFileSync(target, adaptiveXml, 'utf8');
      console.log('✓ patched', target);
    }
  }
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
