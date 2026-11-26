'use strict';

/**
 * 按用户参考图优化图标：同心圆环 + 中心珊瑚实心圆 + 白色播放键
 * 三个微调变体，输出对比图，并把选中版写入 assets/icon*.png
 */

const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.resolve('assets');
const VAR_DIR = path.join(OUT, 'icon-variants');

const C = 256;

const G = `
  <defs>
    <linearGradient id="disc" x1=".2" y1=".1" x2=".9" y2="1">
      <stop offset="0" stop-color="#ff9070"/>
      <stop offset=".5" stop-color="#ff6a4d"/>
      <stop offset="1" stop-color="#e8472a"/>
    </linearGradient>
    <linearGradient id="ringOuter" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#a9855f" stop-opacity=".95"/>
      <stop offset="1" stop-color="#6d5238" stop-opacity=".8"/>
    </linearGradient>
    <radialGradient id="bg" cx="50%" cy="45%" r="72%">
      <stop offset="0" stop-color="#121010"/>
      <stop offset=".7" stop-color="#0a0908"/>
      <stop offset="1" stop-color="#050404"/>
    </radialGradient>
    <radialGradient id="warm" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ff6a4d" stop-opacity=".16"/>
      <stop offset="1" stop-color="#ff6a4d" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

const BG = `<rect width="512" height="512" fill="url(#bg)"/>`;

/** 中心实心圆 + 白色圆角播放键 */
const coreDisc = (r = 96, triHeight = 78) => {
  const half = triHeight / 2;
  const w = triHeight * 0.84;
  const x = C - w * 0.36;
  const y = C - half;
  return `
    <circle cx="${C}" cy="${C}" r="${r}" fill="url(#disc)"/>
    <path d="M${x} ${y} L${x + w} ${C} L${x} ${y + triHeight} Z"
      fill="#fffaf6" stroke="#fffaf6" stroke-width="9" stroke-linejoin="round"/>`;
};

const VARIANTS = [
  {
    id: 'a',
    name: 'A · 融合（三层同环）',
    note: '外实线环 + 点状虚线环 + 珊瑚实心圆',
    body: `${BG}
      <circle cx="${C}" cy="${C}" r="196" fill="none" stroke="url(#ringOuter)" stroke-width="7"/>
      <circle cx="${C}" cy="${C}" r="158" fill="none" stroke="#ff8f72" stroke-opacity=".45" stroke-width="6"
              stroke-linecap="round" stroke-dasharray="3 15"/>
      <circle cx="${C}" cy="${C}" r="150" fill="url(#warm)"/>
      ${coreDisc(96, 78)}`,
  },
  {
    id: 'b',
    name: 'B · 简洁（双层）',
    note: '只留外实线环，圆更大，最干净',
    body: `${BG}
      <circle cx="${C}" cy="${C}" r="196" fill="none" stroke="url(#ringOuter)" stroke-width="7"/>
      <circle cx="${C}" cy="${C}" r="160" fill="url(#warm)"/>
      ${coreDisc(112, 90)}`,
  },
  {
    id: 'c',
    name: 'C · 品牌（点环 + 三角）',
    note: '贴近原 logo：外环 + 点环 + 珊瑚播放键，无实心圆',
    body: `${BG}
      <circle cx="${C}" cy="${C}" r="192" fill="none" stroke="#c8603f" stroke-opacity=".55" stroke-width="7"/>
      <circle cx="${C}" cy="${C}" r="152" fill="none" stroke="#d8b78b" stroke-opacity=".32" stroke-width="6"
              stroke-linecap="round" stroke-dasharray="2 14"/>
      <path d="M204 168 L352 ${C} L204 344 Z" fill="url(#disc)" stroke="url(#disc)"
            stroke-width="16" stroke-linejoin="round"/>`,
  },
];

function svgOf(variant) {
  return `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">${G}${variant.body}</svg>`;
}

(async () => {
  fs.mkdirSync(VAR_DIR, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  for (const variant of VARIANTS) {
    await page.setViewportSize({ width: 1024, height: 1024 });
    await page.setContent(
      `<!doctype html><html><body style="margin:0;width:1024px;height:1024px;background:#0b0a09">${svgOf(variant)}</body></html>`,
      { waitUntil: 'load' },
    );
    await page.screenshot({ path: path.join(VAR_DIR, `opt-${variant.id}.png`), type: 'png' });
    console.log('✓', `opt-${variant.id}.png`, variant.name);
  }

  const cards = VARIANTS.map((variant) => `
    <figure>
      <div class="icon">${svgOf(variant)}</div>
      <div class="row">
        <div class="mini">${svgOf(variant)}</div>
        <div class="tiny">${svgOf(variant)}</div>
      </div>
      <figcaption><b>${variant.id.toUpperCase()}</b> ${variant.name}<em>${variant.note}</em></figcaption>
    </figure>`).join('');

  await page.setViewportSize({ width: 1080, height: 720 });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#080706;padding:34px 30px;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
    h1{color:#f7f1e6;font-size:19px;font-weight:600;margin-bottom:5px}
    p{color:#aba295;font-size:13px;margin-bottom:26px}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:26px}
    figure{display:flex;flex-direction:column;align-items:center;gap:12px}
    .icon{width:100%;aspect-ratio:1;border-radius:23%;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,.6)}
    .row{display:flex;align-items:center;gap:12px}
    .mini{width:52px;height:52px;border-radius:23%;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,.5)}
    .tiny{width:30px;height:30px;border-radius:23%;overflow:hidden;box-shadow:0 3px 8px rgba(0,0,0,.5)}
    figcaption{color:#e2dacc;font-size:12.5px;text-align:center;line-height:1.5}
    figcaption b{color:#ff8166;font-weight:700;margin-right:4px}
    figcaption em{display:block;color:#8f877b;font-style:normal;font-size:11.5px;margin-top:2px}
  </style></head><body>
    <h1>同频观影 · 图标按参考图优化</h1>
    <p>下面一排是 52px 与 30px 的实际桌面尺寸</p>
    <div class="grid">${cards}</div>
  </body></html>`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(VAR_DIR, 'opt-sheet.png'), type: 'png', fullPage: true });
  console.log('✓ opt-sheet.png');

  await browser.close();
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
