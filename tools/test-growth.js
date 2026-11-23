'use strict';

/**
 * 增长能力回归：埋点、漏斗看板、邀请海报
 */

const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const SHOTS = path.resolve('test/screenshots');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const results = [];

function check(name, condition, detail = '') {
  results.push({ name, pass: Boolean(condition), detail });
  if (!condition) throw new Error(`${name}${detail ? ` — ${detail}` : ''}`);
}

async function stats() {
  const response = await fetch(`${BASE}/api/stats`, {
    headers: process.env.STATS_TOKEN ? { 'x-stats-token': process.env.STATS_TOKEN } : {},
  });
  return response.json();
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const before = await stats();

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--disable-gpu'],
  });
  const errors = [];
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN', acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

  try {
    /* ---------- 创建房间触发埋点 ---------- */
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.fill('#nickname', '增长测试');
    await page.click('#submit-button');
    await page.waitForURL(/\/room\/[A-Z0-9]{6}$/, { timeout: 15000 });
    const roomId = page.url().split('/').pop();
    await page.waitForSelector('#connection-pill:not(.is-connecting)', { timeout: 15000 });

    const afterCreate = await stats();
    check('room_created tracked', (afterCreate.events.room_created || 0) > (before.events.room_created || 0),
      `${before.events.room_created} -> ${afterCreate.events.room_created}`);
    check('funnel created increments', afterCreate.funnel.created > before.funnel.created,
      `${before.funnel.created} -> ${afterCreate.funnel.created}`);

    /* ---------- 邀请弹窗 + 海报生成 ---------- */
    await page.click('#invite-button');
    await page.waitForSelector('#invite-modal:not(.is-hidden)', { timeout: 5000 });
    check('poster button visible', await page.isVisible('#dialog-poster'));

    const downloadPromise = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
    await page.click('#dialog-poster');
    const download = await downloadPromise;
    if (download) {
      const target = path.join(SHOTS, 'invite-poster.png');
      await download.saveAs(target);
      const size = fs.statSync(target).size;
      check('poster downloaded', size > 20000, `${size} bytes`);
    } else {
      // 移动端会走系统分享，桌面端应有下载
      check('poster downloaded', false, 'no download event');
    }

    await sleep(600);
    const afterPoster = await stats();
    check('share tracked', (afterPoster.events.invite_shared || 0) > (before.events.invite_shared || 0),
      JSON.stringify(afterPoster.events));

    /* ---------- 看板页面 ---------- */
    await page.goto(`${BASE}/stats`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => {
      const el = document.getElementById('created');
      return el && el.textContent !== '—';
    }, { timeout: 10000 });
    const shown = await page.locator('#created').innerText();
    check('dashboard renders counters', Number(shown) >= 1, shown);
    await page.screenshot({ path: path.join(SHOTS, 'stats-dashboard.png'), fullPage: true });

    check('no page errors', errors.length === 0, errors.join(' | '));
    console.log(JSON.stringify({ roomId, results, errors }, null, 2));
  } catch (error) {
    await page.screenshot({ path: path.join(SHOTS, 'growth-failure.png'), fullPage: true }).catch(() => {});
    console.error(error.stack || error.message);
    console.error(JSON.stringify({ results, errors }, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
