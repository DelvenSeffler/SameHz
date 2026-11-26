'use strict';

/**
 * 移动端界面回归
 *
 * 校验：
 *  - 手机尺寸下隐藏装饰性内容，首屏能直接创建房间
 *  - 原生壳（.is-native）即使宽屏也走精简布局
 *  - 触控目标尺寸达标、输入框字号不触发 iOS 缩放
 *  - 房间页在手机上一屏内能看到一键同步
 *  - App 场景的跨域请求能成功建房
 */

const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const SHOTS = path.resolve('test/screenshots');

const results = [];
function check(name, condition, detail = '') {
  results.push({ name, pass: Boolean(condition), detail });
  if (!condition) throw new Error(`${name}${detail ? ` — ${detail}` : ''}`);
}

/* 典型安卓机 */
const PHONE = { width: 390, height: 844 };

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--disable-gpu'],
  });
  const errors = [];

  try {
    /* ---------- 首页：手机布局 ---------- */
    const phone = await browser.newContext({ viewport: PHONE, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'zh-CN' });
    const page = await phone.newPage();
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

    await page.goto(BASE, { waitUntil: 'networkidle' });

    check('decorative blocks hidden on phone', !(await page.locator('.eyebrow').isVisible()), 'eyebrow visible');
    check('device mockup hidden on phone', !(await page.locator('.sync-window').isVisible()), 'sync-window visible');
    check('ticket stub hidden on phone', !(await page.locator('.ticket-stub').isVisible()), 'ticket visible');

    /* 首屏内必须能点到创建房间 */
    const formBox = await page.locator('#start-form').boundingBox();
    check('create form within first screen', formBox && formBox.y + formBox.height < PHONE.height * 2,
      formBox ? `form bottom at ${Math.round(formBox.y + formBox.height)}px` : 'no box');

    /* 触控目标尺寸 */
    const buttonSizes = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll('.primary-button, .mode-tab, .nav-cta')];
      return nodes.map((el) => Math.round(el.getBoundingClientRect().height));
    });
    check('touch targets at least 44px', buttonSizes.every((h) => h >= 44), JSON.stringify(buttonSizes));

    /* 输入框字号 >= 16px，避免 iOS 自动放大 */
    const inputFont = await page.evaluate(() => {
      const el = document.querySelector('#nickname');
      return el ? parseFloat(getComputedStyle(el).fontSize) : 0;
    });
    check('input font size prevents iOS zoom', inputFont >= 16, `${inputFont}px`);

    /* 无横向溢出 */
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check('no horizontal overflow on phone', overflow <= 1, `${overflow}px`);

    await page.screenshot({ path: path.join(SHOTS, 'mobile-landing.png'), fullPage: true });

    /* ---------- 创建房间并进入播放室 ---------- */
    await page.fill('#nickname', '手机');
    await page.tap('#submit-button');
    await page.waitForURL(/\/room\/[A-Z0-9]{6}$/, { timeout: 20000 });
    const roomId = page.url().split('/').pop();
    await page.waitForSelector('#connection-pill:not(.is-connecting)', { timeout: 20000 });
    check('room created on phone', /^[A-Z0-9]{6}$/.test(roomId), roomId);

    await page.waitForSelector('.empty-inner', { timeout: 8000 });
    const pickBox = await page.locator('#pick-button').boundingBox();
    check('pick button is touch sized', pickBox && pickBox.height >= 44, pickBox ? `${Math.round(pickBox.height)}px` : 'no box');

    const roomOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check('room page has no horizontal overflow', roomOverflow <= 1, `${roomOverflow}px`);

    await page.screenshot({ path: path.join(SHOTS, 'mobile-room.png'), fullPage: true });

    /* 一键同步按钮在手机上一屏附近可达 */
    const syncBox = await page.locator('#manual-sync').boundingBox();
    check('manual sync button is prominent', syncBox && syncBox.height >= 56, syncBox ? `${Math.round(syncBox.height)}px` : 'no box');

    /* ---------- 原生壳：宽屏也精简 ---------- */
    const nativeCtx = await browser.newContext({ viewport: { width: 1024, height: 800 }, locale: 'zh-CN' });
    const nativePage = await nativeCtx.newPage();
    await nativePage.addInitScript(() => {
      window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android' };
    });
    await nativePage.goto(BASE, { waitUntil: 'networkidle' });
    const isNative = await nativePage.evaluate(() => document.documentElement.classList.contains('is-native'));
    check('native shell flagged on html', isNative, 'class missing');
    check('native hides decorative blocks even on wide screen',
      !(await nativePage.locator('.eyebrow').isVisible()), 'eyebrow visible in native');
    const apiBase = await nativePage.evaluate(() => window.SAMEHZ && window.SAMEHZ.apiBase);
    check('native points api to public origin', apiBase === 'https://samehz.onrender.com', String(apiBase));
    await nativeCtx.close();

    /* ---------- 跨域（App 场景）能建房 ---------- */
    const corsResponse = await fetch(`${BASE}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://localhost' },
      body: JSON.stringify({ name: 'cors' }),
    });
    check('cross-origin room creation allowed',
      corsResponse.status === 201 && corsResponse.headers.get('access-control-allow-origin') === '*',
      `${corsResponse.status} acao=${corsResponse.headers.get('access-control-allow-origin')}`);

    const preflight = await fetch(`${BASE}/api/rooms`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://localhost', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
    });
    check('CORS preflight succeeds', preflight.status === 204, String(preflight.status));

    check('no page errors', errors.length === 0, errors.join(' | '));
    await phone.close();

    const failures = results.filter((item) => !item.pass);
    console.log(JSON.stringify({ roomId, results, failures: failures.length }, null, 2));
    process.exitCode = failures.length ? 1 : 0;
  } catch (error) {
    console.error(error.stack || error.message);
    console.error(JSON.stringify({ results, errors }, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
