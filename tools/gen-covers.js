'use strict';

/**
 * 内容素材批量生成器
 *
 * 用 HTML 渲染 + 截图，批量产出可直接发布的封面图。
 * 输出：assets/covers/{slug}-{size}.png
 *
 * 用法：node tools/gen-covers.js
 */

const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.resolve('assets/covers');

const SIZES = {
  bilibili: { width: 1146, height: 717 },   // B站封面 16:10
  xiaohongshu: { width: 1080, height: 1440 }, // 小红书 3:4
};

const COVERS = [
  {
    slug: 'no-screen-share',
    kicker: '异地恋 避坑',
    title: '别再屏幕共享\n一起看电影了',
    sub: '画面糊成 PPT，对方还听不清声音',
    tag: '原画质 · 各自播自己的片源',
  },
  {
    slug: 'quality-compare',
    kicker: '真实对比',
    title: '屏幕共享 720p\nvs 原片 4K',
    sub: '同一个电影夜，两种画质',
    tag: '不压缩 · 不上传',
  },
  {
    slug: 'same-frame',
    kicker: '相距 1200 公里',
    title: '我们看的是\n同一帧',
    sub: '误差 0.01 秒，进度条严丝合缝',
    tag: '每 3 秒自动校准',
  },
  {
    slug: 'bilibili-sync',
    kicker: '新功能',
    title: 'B站视频\n也能一起看了',
    sub: '粘贴链接，两个人同步播放',
    tag: '支持 B站 / YouTube',
  },
  {
    slug: 'one-membership',
    kicker: '省钱攻略',
    title: '不用买\n两份会员',
    sub: '一个人有片源，两个人都能看',
    tag: '只看你手里的片',
  },
  {
    slug: 'midnight',
    kicker: '凌晨 1 点',
    title: '睡不着的夜里\n我们一起看了部电影',
    sub: '不同的城市，同一块银幕',
    tag: '两个人的放映室',
  },
];

function html(cover, size) {
  const scale = size.height / 717;
  const base = Math.round(46 * scale + 18);
  return `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${size.width}px; height: ${size.height}px; overflow: hidden; }
  body {
    display: flex; flex-direction: column; justify-content: center;
    padding: 0 ${Math.round(size.width * 0.075)}px;
    background:
      radial-gradient(ellipse 70% 60% at 12% 0%, rgba(198, 88, 52, 0.42), transparent 62%),
      radial-gradient(ellipse 55% 55% at 100% 100%, rgba(120, 42, 26, 0.34), transparent 68%),
      #0b0a09;
    font-family: "PingFang SC", "Microsoft YaHei", -apple-system, sans-serif;
    color: #f7f1e6;
    position: relative;
  }
  .kicker {
    align-self: flex-start;
    margin-bottom: ${Math.round(base * 0.5)}px;
    padding: ${Math.round(base * 0.16)}px ${Math.round(base * 0.34)}px;
    border: 1px solid rgba(255, 138, 107, 0.55);
    border-radius: 100px;
    color: #ff8a6b;
    font-size: ${Math.round(base * 0.46)}px;
    font-weight: 600;
    letter-spacing: 0.06em;
  }
  h1 {
    font-family: "Songti SC", "STSong", "Noto Serif SC", serif;
    font-size: ${Math.round(base * 1.14)}px;
    font-weight: 500;
    line-height: 1.24;
    letter-spacing: -0.01em;
    white-space: pre-line;
  }
  h1 em { font-style: normal; color: #ff8166; }
  .sub {
    margin-top: ${Math.round(base * 0.42)}px;
    color: #aba295;
    font-size: ${Math.round(base * 0.44)}px;
    line-height: 1.5;
  }
  .tag {
    margin-top: ${Math.round(base * 0.62)}px;
    padding-top: ${Math.round(base * 0.3)}px;
    border-top: 1px solid rgba(244, 236, 223, 0.16);
    color: #8fd3a4;
    font-size: ${Math.round(base * 0.4)}px;
    font-weight: 600;
    letter-spacing: 0.03em;
  }
  .brand {
    position: absolute;
    right: ${Math.round(size.width * 0.075)}px;
    bottom: ${Math.round(size.height * 0.055)}px;
    color: rgba(214, 183, 139, 0.85);
    font-size: ${Math.round(base * 0.38)}px;
    font-weight: 600;
    letter-spacing: 0.16em;
  }
  .dot {
    position: absolute;
    top: ${Math.round(size.height * 0.08)}px;
    right: ${Math.round(size.width * 0.075)}px;
    width: ${Math.round(base * 0.24)}px;
    height: ${Math.round(base * 0.24)}px;
    border-radius: 50%;
    background: #ff6a4d;
    box-shadow: 0 0 0 ${Math.round(base * 0.14)}px rgba(255, 106, 77, 0.18);
  }
</style></head>
<body>
  <span class="dot"></span>
  <span class="kicker">${cover.kicker}</span>
  <h1>${cover.title.replace(/\n/g, '<br>')}</h1>
  <p class="sub">${cover.sub}</p>
  <p class="tag">${cover.tag}</p>
  <span class="brand">同 频 · SAMEHZ</span>
</body></html>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  const written = [];

  try {
    // 社交分享图（Open Graph / Twitter Card）
    const ogSize = { width: 1200, height: 630 };
    const ogHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1200px; height: 630px; overflow: hidden; }
      body {
        display: flex; align-items: center; gap: 54px;
        padding: 0 70px;
        background:
          radial-gradient(ellipse 70% 80% at 8% 0%, rgba(198, 88, 52, 0.4), transparent 62%),
          radial-gradient(ellipse 60% 70% at 100% 100%, rgba(120, 42, 26, 0.3), transparent 66%),
          #0b0a09;
        font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
        color: #f7f1e6;
      }
      .left { flex: 1; }
      .brand {
        display: flex; align-items: center; gap: 12px;
        margin-bottom: 26px;
        color: #d6b78b; font-size: 21px; font-weight: 600; letter-spacing: 0.18em;
      }
      .brand i { width: 34px; height: 34px; border-radius: 50%; background: #ff6a4d; opacity: .9; }
      h1 {
        font-family: "Songti SC", "STSong", serif;
        font-size: 62px; font-weight: 500; line-height: 1.24; letter-spacing: -0.015em;
      }
      h1 em { font-style: normal; color: #ff8166; }
      p { margin-top: 22px; color: #aba295; font-size: 22px; line-height: 1.6; }
      .tags { display: flex; gap: 10px; margin-top: 30px; }
      .tags span {
        padding: 8px 16px; border: 1px solid rgba(143, 211, 164, .4);
        border-radius: 100px; color: #8fd3a4; font-size: 17px; font-weight: 600;
      }
      .right { width: 300px; display: flex; flex-direction: column; gap: 14px; }
      .screen {
        height: 150px; border-radius: 12px;
        border: 1px solid rgba(244, 236, 223, .2);
        background: linear-gradient(140deg, rgba(196, 120, 62, .5), rgba(28, 20, 16, .9));
        display: flex; align-items: center; justify-content: center;
        color: rgba(247, 241, 230, .82); font-size: 15px; letter-spacing: .18em;
      }
      .row { display: flex; align-items: center; gap: 10px; color: #aba295; font-size: 15px; }
      .row b { color: #ff8166; font-variant-numeric: tabular-nums; }
    </style></head><body>
      <div class="left">
        <div class="brand"><i></i>同 频 · S A M E H Z</div>
        <h1>异地恋一起看电影<br><em>进度同步到同一帧</em></h1>
        <p>各自放自己的片源，只同步播放进度。原画质、不上传、免费。</p>
        <div class="tags"><span>免费</span><span>无需注册</span><span>支持 B站</span></div>
      </div>
      <div class="right">
        <div class="screen">你的屏幕</div>
        <div class="row">误差 <b>0.01s</b> · 自动校准</div>
        <div class="screen">TA 的屏幕</div>
      </div>
    </body></html>`;
    await page.setViewportSize(ogSize);
    await page.setContent(ogHtml, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const ogPath = path.resolve('public/img/og-cover.png');
    fs.mkdirSync(path.dirname(ogPath), { recursive: true });
    await page.screenshot({ path: ogPath, type: 'png' });
    written.push(ogPath);
    console.log('✓', path.relative(process.cwd(), ogPath));

    for (const cover of COVERS) {
      for (const [name, size] of Object.entries(SIZES)) {
        await page.setViewportSize(size);
        await page.setContent(html(cover, size), { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        const file = path.join(OUT, `${cover.slug}-${name}.png`);
        await page.screenshot({ path: file, type: 'png' });
        written.push(file);
        console.log('✓', path.relative(process.cwd(), file));
      }
    }
    console.log(`\n共生成 ${written.length} 张图片`);
    console.log('配文可在 assets/covers/captions.md 里取用。');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
