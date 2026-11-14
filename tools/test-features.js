'use strict';

/**
 * 同频 · 新功能回归：中英文切换 + 在线视频链接播放
 *
 * 运行前先启动被测服务（默认 http://localhost:3000），
 * 以及一个用于提供在线片源的静态服务（默认 http://localhost:4022）。
 */

const { chromium } = require('playwright-core');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const MEDIA_PORT = Number(process.env.MEDIA_PORT || 4022);
const SAMPLE = path.resolve('test/sample.webm');
const SHOTS = path.resolve('test/screenshots');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const results = [];

function check(name, condition, detail = '') {
  results.push({ name, pass: Boolean(condition), detail });
  if (!condition) throw new Error(`${name}${detail ? ` — ${detail}` : ''}`);
}

function startMediaServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.url !== '/sample.webm') {
        res.writeHead(404);
        res.end('nope');
        return;
      }
      const stat = fs.statSync(SAMPLE);
      res.writeHead(200, {
        'Content-Type': 'video/webm',
        'Content-Length': stat.size,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
      });
      fs.createReadStream(SAMPLE).pipe(res);
    });
    server.listen(MEDIA_PORT, () => resolve(server));
  });
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const media = await startMediaServer();
  const mediaUrl = `http://localhost:${MEDIA_PORT}/sample.webm`;

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--disable-gpu'],
  });

  const errors = [];
  const contextA = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' });
  const contextB = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'zh-CN' });
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  for (const [label, page] of [['A', pageA], ['B', pageB]]) {
    page.on('pageerror', (error) => errors.push(`${label} pageerror: ${error.message}\n${error.stack || ''}`));
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const text = message.text();
      // 第三方内嵌播放器自身的日志不算本站问题
      if (/bilibili|bili-user-fingerprint|player\.bilibili\.com|youtube\.com/i.test(text)) return;
      errors.push(`${label} console: ${text}`);
    });
  }

  try {
    /* ---------- 首页语言切换 ---------- */
    await pageA.goto(BASE, { waitUntil: 'networkidle' });
    check('default language is Chinese', (await pageA.locator('html').getAttribute('lang')) === 'zh-CN');
    check('hero starts in Chinese', (await pageA.locator('.hero h1').innerText()).includes('一起看同一帧'));

    await pageA.click('.site-nav [data-lang-toggle]');
    await sleep(150);
    const heroEn = await pageA.locator('.hero h1').innerText();
    check('hero switches to English', /same frame/i.test(heroEn), heroEn);
    check('html lang updates', (await pageA.locator('html').getAttribute('lang')) === 'en');
    check('nav CTA translated', /enter the room/i.test(await pageA.locator('.nav-cta span').innerText()));
    check('placeholder translated', /what should we call you/i.test(await pageA.locator('.field-label').first().innerText()));
    check('toggle shows 中文 in English mode', (await pageA.locator('.site-nav [data-lang-toggle]').innerText()).includes('中文'));
    await pageA.screenshot({ path: path.join(SHOTS, 'landing-en.png'), fullPage: true });

    await pageA.click('.site-nav [data-lang-toggle]');
    await sleep(150);
    check('switches back to Chinese', (await pageA.locator('.hero h1').innerText()).includes('一起看同一帧'));
    check('placeholder restored', (await pageA.locator('.field-label').first().innerText()).includes('怎么称呼你'));

    /* ---------- 创建房间（中文） ---------- */
    await pageA.fill('#nickname', '小满');
    await pageA.click('#submit-button');
    await pageA.waitForURL(/\/room\/[A-Z0-9]{6}$/, { timeout: 15000 });
    const roomId = pageA.url().split('/').pop();
    await pageA.waitForSelector('#connection-pill:not(.is-connecting)', { timeout: 15000 });
    check('room created', /^[A-Z0-9]{6}$/.test(roomId), roomId);

    await pageB.goto(`${BASE}/room/${roomId}`, { waitUntil: 'domcontentloaded' });
    await pageB.waitForSelector('#entry-overlay:not(.is-hidden)', { timeout: 8000 });
    await pageB.fill('#entry-name', '阿遥');
    await pageB.click('#entry-submit');
    await pageB.waitForSelector('#entry-overlay.is-hidden', { state: 'hidden', timeout: 8000 });
    await pageA.waitForFunction(() => document.querySelectorAll('#participant-list .participant.is-empty').length === 0, { timeout: 10000 });

    /* ---------- 链接校验 ---------- */
    await pageA.click('#url-open');
    await pageA.waitForSelector('#source-modal:not(.is-hidden)', { timeout: 5000 });
    await pageA.fill('#source-url', 'not a url');
    await pageA.click('#source-submit');
    await sleep(200);
    check('invalid link rejected', /http/i.test(await pageA.locator('#source-error').innerText()), await pageA.locator('#source-error').innerText());

    await pageA.fill('#source-url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await sleep(250);
    check('youtube link detected', /YouTube/.test(await pageA.locator('#source-platform').innerText()), await pageA.locator('#source-platform').innerText());

    await pageA.fill('#source-url', 'https://www.bilibili.com/video/BV1B7411m7LV');
    await sleep(250);
    check('bilibili link detected', /Bilibili/.test(await pageA.locator('#source-platform').innerText()), await pageA.locator('#source-platform').innerText());

    await pageA.fill('#source-url', 'https://www.netflix.com/watch/80100172');
    await sleep(250);
    const unsupported = await pageA.locator('#source-platform').innerText();
    check('unsupported DRM platform flagged', /DRM/i.test(unsupported), unsupported);

    await pageA.fill('#source-url', 'https://www.douyin.com/video/7123456789012345678');
    await sleep(250);
    const pageHint = await pageA.locator('#source-platform').innerText();
    check('non-DRM page hint mentions server parsing', /解析|stream/i.test(pageHint), pageHint);

    /* ---------- 通过链接载入片源 ---------- */
    await pageA.fill('#source-url', mediaUrl);
    await pageA.click('#source-submit');
    await pageA.waitForSelector('#stage-frame.has-video', { timeout: 25000 });
    await pageA.waitForSelector('#source-modal.is-hidden', { state: 'hidden', timeout: 8000 });
    check('A loaded online source', await pageA.evaluate(() => document.getElementById('film-state').textContent.includes('在线')), await pageA.locator('#film-state').innerText());
    check('A player src is the link', await pageA.evaluate((url) => document.getElementById('player').currentSrc.startsWith(url), mediaUrl));

    /* ---------- 对方自动载入同一条链接 ---------- */
    await pageB.waitForSelector('#stage-frame.has-video', { timeout: 25000 });
    check('B adopted the same link', await pageB.evaluate((url) => document.getElementById('player').currentSrc.startsWith(url), mediaUrl));
    await pageA.waitForFunction(() => document.getElementById('match-title').textContent.includes('匹配'), { timeout: 15000 });
    await pageB.waitForFunction(() => document.getElementById('match-title').textContent.includes('匹配'), { timeout: 15000 });
    check('online sources match', (await pageA.locator('#match-title').innerText()).includes('匹配'));

    /* ---------- 链接片源的播放同步 ---------- */
    await pageA.click('#play-button');
    await sleep(2400);
    const playback = await Promise.all([pageA, pageB].map((page) => page.evaluate(() => ({
      paused: document.getElementById('player').paused,
      time: document.getElementById('player').currentTime,
    }))));
    check('remote play follows for URL source', playback.every((item) => !item.paused), JSON.stringify(playback));
    check('URL source drift is low', Math.abs(playback[0].time - playback[1].time) < 1.2, JSON.stringify(playback));

    /* ---------- 放映室内切换语言 ---------- */
    await pageA.click('.room-nav [data-lang-toggle]');
    await sleep(400);
    check('room keeps the video after switching language', await pageA.evaluate(() => document.getElementById('stage-frame').classList.contains('has-video')));
    check('room player still has the source', await pageA.evaluate(() => document.getElementById('player').currentSrc.length > 0));
    const matchEn = await pageA.locator('#match-title').innerText();
    check('match badge translated', /match/i.test(matchEn), matchEn);
    check('room labels translated', /\(?sync/i.test(await pageA.locator('.side-panel.sync-control-panel h2').innerText()));
    const activityText = await pageA.locator('#activity-list').innerText();
    check('activity translated', /loaded|joined|started|paused|realigned/i.test(activityText), activityText.replace(/\n/g, ' | '));
    await pageA.screenshot({ path: path.join(SHOTS, 'room-en.png'), fullPage: true });

    await pageA.click('.room-nav [data-lang-toggle]');
    await sleep(400);
    check('room returns to Chinese', /匹配/.test(await pageA.locator('#match-title').innerText()), await pageA.locator('#match-title').innerText());
    check('dynamic text survives round trip', /匹配/.test(await pageA.locator('#match-title').innerText()));
    check('film state restored in Chinese', /在线/.test(await pageA.locator('#film-state').innerText()), await pageA.locator('#film-state').innerText());

    check('no browser errors', errors.length === 0, errors.join(' | '));

    /* ---------- 平台嵌入 + 一起开始倒计时 ---------- */
    await pageA.click('#replace-button');
    await pageA.waitForSelector('#source-modal:not(.is-hidden)', { timeout: 5000 });
    await pageA.fill('#source-url', 'https://www.bilibili.com/video/BV1B7411m7LV?p=1');
    await pageA.click('#source-submit');
    await pageA.waitForFunction(() => document.getElementById('embed-player').src.includes('player.bilibili.com'), { timeout: 15000 });
    check('bilibili embed loaded', true);
    check('native controls hidden for embed', await pageA.evaluate(() => document.getElementById('video-controls').classList.contains('is-hidden')));

    const togetherLabel = await pageA.locator('#manual-sync strong').innerText();
    check('manual sync becomes start together', /一起开始/.test(togetherLabel), togetherLabel);

    await pageA.click('#manual-sync');
    await pageA.waitForSelector('#countdown-card:not(.is-hidden)', { timeout: 5000 });
    check('countdown shows on initiator', /[0-9]|▶/.test(await pageA.locator('#countdown-number').innerText()), await pageA.locator('#countdown-number').innerText());
    await pageB.waitForSelector('#countdown-card:not(.is-hidden)', { timeout: 5000 });
    check('peer also sees the countdown', true);
    await sleep(4200);
    check('countdown hides itself', await pageA.evaluate(() => document.getElementById('countdown-card').classList.contains('is-hidden')));
    await pageA.screenshot({ path: path.join(SHOTS, 'room-embed.png'), fullPage: true });

    /* ---------- YouTube 适配（依赖外网，失败只记录不抛出） ---------- */
    await pageA.click('#replace-button');
    await pageA.waitForSelector('#source-modal:not(.is-hidden)', { timeout: 5000 });
    await pageA.fill('#source-url', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ');
    await pageA.click('#source-submit');
    try {
      await pageA.waitForFunction(
        () => Boolean(document.querySelector('#yt-mount iframe')) || Boolean(document.querySelector('#embed-frame iframe[src*="youtube"]')),
        { timeout: 20000 },
      );
      results.push({ name: 'youtube player mounts', pass: true, detail: '' });
      await pageA.waitForFunction(() => document.getElementById('player').classList.contains('is-hidden'), { timeout: 5000 });
      results.push({ name: 'native video hidden for youtube', pass: true, detail: '' });
      await pageA.waitForFunction(() => document.getElementById('file-size').textContent.includes('YOUTUBE'), { timeout: 20000 });
      results.push({ name: 'youtube source marked as ready', pass: true, detail: await pageA.locator('#film-subline').innerText() });
      await sleep(2500);
      await pageA.screenshot({ path: path.join(SHOTS, 'room-youtube.png'), fullPage: true });
    } catch (error) {
      results.push({ name: 'youtube player mounts', pass: false, detail: `skipped: ${error.message.split('\n')[0]}` });
    }

    /* ---------- 自动语言识别与 ?lang= 覆盖 ---------- */
    const contextEn = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
    const pageEn = await contextEn.newPage();
    await pageEn.goto(`${BASE}/room/${roomId}`, { waitUntil: 'domcontentloaded' });
    await pageEn.waitForSelector('#entry-overlay:not(.is-hidden)', { timeout: 8000 });
    check('english browser auto-detects English', (await pageEn.locator('#entry-title').innerText()).startsWith('Let'), await pageEn.locator('#entry-title').innerText());
    check('entry button translated', /take your seat/i.test(await pageEn.locator('#entry-submit').innerText()));
    await pageEn.screenshot({ path: path.join(SHOTS, 'room-entry-en.png'), fullPage: true });
    await contextEn.close();

    const pageZh = await contextB.newPage();
    await pageZh.goto(`${BASE}/?lang=zh`, { waitUntil: 'networkidle' });
    check('?lang=zh overrides browser locale', (await pageZh.locator('.hero h1').innerText()).includes('一起看同一帧'));
    await pageZh.close();

    console.log(JSON.stringify({ roomId, results, errors }, null, 2));
  } catch (error) {
    await pageA.screenshot({ path: path.join(SHOTS, 'features-failure-A.png'), fullPage: true }).catch(() => {});
    await pageB.screenshot({ path: path.join(SHOTS, 'features-failure-B.png'), fullPage: true }).catch(() => {});
    console.error(error.stack || error.message);
    console.error(JSON.stringify({ results, errors }, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
    media.close();
  }
})();
