'use strict';

/**
 * 生成 10 个图标方案（第二版：统一构图语言，主体更突出）
 *   assets/icon-variants/v1..v10.png
 *   assets/icon-variants/sheet.png
 */

const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.resolve('assets/icon-variants');

const C = 256;

const G = `
  <defs>
    <linearGradient id="coral" x1=".1" y1="0" x2=".9" y2="1">
      <stop offset="0" stop-color="#ffa184"/><stop offset=".5" stop-color="#ff6a4d"/><stop offset="1" stop-color="#df3d20"/>
    </linearGradient>
    <linearGradient id="cream" x1="0" y1="0" x2=".6" y2="1">
      <stop offset="0" stop-color="#fffaf3"/><stop offset="1" stop-color="#e6c7a4"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f6dcb8"/><stop offset="1" stop-color="#c8965e"/>
    </linearGradient>
    <linearGradient id="ringA" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff0e6"/><stop offset="1" stop-color="#ff9f80"/>
    </linearGradient>
    <radialGradient id="bg" cx="50%" cy="34%" r="76%">
      <stop offset="0" stop-color="#191210"/><stop offset=".62" stop-color="#0c0a08"/><stop offset="1" stop-color="#060505"/>
    </radialGradient>
    <radialGradient id="halo" cx="50%" cy="48%" r="50%">
      <stop offset="0" stop-color="#ff6a4d" stop-opacity=".26"/><stop offset="1" stop-color="#ff6a4d" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter>
  </defs>`;

const BG = `<rect width="512" height="512" fill="url(#bg)"/>`;

/** 圆角播放三角，居中于 (cx, cy)，height 为总高 */
const play = (cx, cy, height, fill = 'url(#coral)', round = 13) => {
  const half = height / 2;
  const w = height * 0.86;
  const x = cx - w * 0.36;
  const y = cy - half;
  return `<path d="M${x} ${y} L${x + w} ${cy} L${x} ${y + height} Z"
    fill="${fill}" stroke="${fill}" stroke-width="${round}" stroke-linejoin="round"/>`;
};

const VARIANTS = [
  {
    id: 'v1',
    name: '双环 · 播放',
    body: `${BG}
      <circle cx="196" cy="${C}" r="104" fill="none" stroke="url(#ringA)" stroke-width="22"/>
      <circle cx="316" cy="${C}" r="104" fill="none" stroke="url(#gold)" stroke-width="22"/>
      ${play(C, C, 116)}`,
  },
  {
    id: 'v2',
    name: '实心交集',
    body: `${BG}
      <circle cx="200" cy="${C}" r="100" fill="url(#ringA)" opacity=".95"/>
      <circle cx="312" cy="${C}" r="100" fill="url(#gold)" opacity=".95"/>
      ${play(C, C, 108, '#0b0a09')}`,
  },
  {
    id: 'v3',
    name: '双屏叠影',
    body: `${BG}
      <rect x="158" y="146" width="196" height="228" rx="30" fill="#141010" stroke="url(#gold)" stroke-opacity=".8" stroke-width="13" transform="rotate(-9 256 256)"/>
      <rect x="188" y="138" width="200" height="236" rx="32" fill="#0e0b0a" stroke="url(#ringA)" stroke-width="13"/>
      ${play(288, C, 104)}`,
  },
  {
    id: 'v4',
    name: '胶片',
    body: `${BG}
      <rect x="146" y="104" width="220" height="304" rx="34" fill="none" stroke="url(#cream)" stroke-opacity=".85" stroke-width="13"/>
      <g fill="url(#cream)" opacity=".55">
        ${[128, 180, 232, 284, 336].map((y) => `<rect x="162" y="${y}" width="16" height="20" rx="5"/><rect x="334" y="${y}" width="16" height="20" rx="5"/>`).join('')}
      </g>
      ${play(C, C, 118)}`,
  },
  {
    id: 'v5',
    name: '声波同心',
    body: `${BG}
      <circle cx="${C}" cy="${C}" r="182" fill="none" stroke="url(#gold)" stroke-opacity=".24" stroke-width="11"/>
      <circle cx="${C}" cy="${C}" r="132" fill="none" stroke="url(#ringA)" stroke-opacity=".55" stroke-width="17"/>
      <circle cx="${C}" cy="${C}" r="86" fill="url(#coral)"/>
      ${play(C, C, 76, '#fff6ee')}`,
  },
  {
    id: 'v6',
    name: '两点相连',
    body: `${BG}
      <circle cx="132" cy="${C}" r="52" fill="url(#ringA)"/>
      <circle cx="380" cy="${C}" r="52" fill="url(#gold)"/>
      <circle cx="${C}" cy="${C}" r="96" fill="#0e0b0a"/>
      <circle cx="${C}" cy="${C}" r="96" fill="none" stroke="url(#coral)" stroke-width="17"/>
      ${play(C, C, 104)}`,
  },
  {
    id: 'v7',
    name: '票根',
    body: `${BG}
      <path d="M118 172 h276 a22 22 0 0 1 22 22 v40 a28 28 0 0 0 0 56 v40 a22 22 0 0 1 -22 22 h-276 a22 22 0 0 1 -22 -22 v-40 a28 28 0 0 0 0 -56 v-40 a22 22 0 0 1 22 -22 z"
            fill="none" stroke="url(#cream)" stroke-opacity=".9" stroke-width="13"/>
      <line x1="344" y1="192" x2="344" y2="320" stroke="url(#cream)" stroke-opacity=".42" stroke-width="9" stroke-dasharray="15 13"/>
      ${play(248, C, 112)}`,
  },
  {
    id: 'v8',
    name: '无限',
    body: `${BG}
      <path d="M256 256 C256 202 322 170 356 202 C390 234 390 278 356 310 C322 342 256 310 256 256 C256 202 190 170 156 202 C122 234 122 278 156 310 C190 342 256 310 256 256"
            fill="none" stroke="url(#coral)" stroke-width="24" stroke-linecap="round"/>
      <circle cx="${C}" cy="${C}" r="56" fill="#0b0a09"/>
      ${play(C, C, 92, 'url(#coral)')}`,
  },
  {
    id: 'v9',
    name: '合拢',
    body: `${BG}
      <path d="M96 ${C} L176 202 L176 310 Z" fill="url(#ringA)"/>
      <path d="M416 ${C} L336 202 L336 310 Z" fill="url(#gold)"/>
      <rect x="200" y="188" width="112" height="136" rx="30" fill="url(#coral)"/>
      ${play(C, C, 84, '#fff6ee')}`,
  },
  {
    id: 'v10',
    name: '极简光键',
    body: `${BG}
      <circle cx="${C}" cy="${C}" r="152" fill="url(#coral)" opacity=".2" filter="url(#soft)"/>
      <circle cx="${C}" cy="${C}" r="140" fill="none" stroke="url(#ringA)" stroke-opacity=".28" stroke-width="8"/>
      ${play(C, C, 210)}`,
  },
];

function svgOf(variant) {
  return `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">
    ${G}${variant.body}</svg>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  for (const variant of VARIANTS) {
    await page.setViewportSize({ width: 1024, height: 1024 });
    await page.setContent(
      `<!doctype html><html><body style="margin:0;width:1024px;height:1024px;background:#0b0a09">${svgOf(variant)}</body></html>`,
      { waitUntil: 'load' },
    );
    await page.screenshot({ path: path.join(OUT, `${variant.id}.png`), type: 'png' });
    console.log('✓', `${variant.id}.png`, variant.name);
  }

  // 拼版：大图 + 小尺寸预览（模拟桌面图标）
  const cards = VARIANTS.map((variant) => `
    <figure>
      <div class="icon">${svgOf(variant)}</div>
      <div class="small">${svgOf(variant)}</div>
      <figcaption><b>${variant.id.toUpperCase()}</b> ${variant.name}</figcaption>
    </figure>`).join('');

  await page.setViewportSize({ width: 1240, height: 1020 });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#080706;padding:34px 30px 40px;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
    h1{color:#f7f1e6;font-size:19px;font-weight:600;margin-bottom:5px}
    p{color:#aba295;font-size:13px;margin-bottom:24px}
    .grid{display:grid;grid-template-columns:repeat(5,1fr);gap:24px 20px}
    figure{display:flex;flex-direction:column;align-items:center;gap:8px}
    .icon{width:100%;aspect-ratio:1;border-radius:23%;overflow:hidden;box-shadow:0 10px 26px rgba(0,0,0,.55)}
    .small{width:34px;height:34px;border-radius:23%;overflow:hidden;margin-top:2px;box-shadow:0 3px 8px rgba(0,0,0,.5)}
    figcaption{color:#aba295;font-size:11.5px;text-align:center}
    figcaption b{color:#ff8166;font-weight:700}
  </style></head><body>
    <h1>同频观影 · 图标方案（第二版）</h1>
    <p>下面那个小图标是实际桌面尺寸，能看清才说明可用</p>
    <div class="grid">${cards}</div>
  </body></html>`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(OUT, 'sheet.png'), type: 'png', fullPage: true });
  console.log('✓ sheet.png');

  await browser.close();
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
