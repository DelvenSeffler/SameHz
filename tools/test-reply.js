'use strict';

/** 话术生成器回归：验证页面渲染、变体不重复、复制可用。 */

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

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 1100, height: 1200 }, locale: 'zh-CN' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  try {
    await page.goto(`${BASE}/reply`, { waitUntil: 'networkidle' });

    const cards = page.locator('.card p');
    check('renders ten variants on load', (await cards.count()) === 10, String(await cards.count()));

    const first = await cards.allInnerTexts();
    check('all variants unique', new Set(first).size === 10, String(new Set(first).size));
    check('every variant admits authorship', first.every((text) => /我(自己)?[^。]{0,10}(做|写|建|弄|折腾)/g.test(text)),
      JSON.stringify(first.filter((t) => !/我(自己)?[^。]{0,10}(做|写|建|弄|折腾)/g.test(t))));
    check('no filler openings', first.every((text) => !/^过来人说|^跟你一样的处境/.test(text)), first[0]);

    // 切换场景与风格
    await page.selectOption('#scene', 'bilibili');
    await page.selectOption('#style', 'brief');
    await page.selectOption('#platform', 'bili');
    await page.click('#generate');
    const second = await page.locator('.card p').allInnerTexts();
    check('scene switch changes output', second.join() !== first.join(), 'differs');
    check('bilibili scene mentions B站', second.some((text) => text.includes('B站')), second[0]);
    check('brief style is short', second.every((text) => text.length < 120), String(Math.max.apply(null, second.map((t) => t.length))));

    // 风格切换
    await page.selectOption('#style', 'feedback');
    await page.click('#generate');
    const third = await page.locator('.card p').allInnerTexts();
    check('feedback style mentions trying it', third.some((text) => /试用|提提意见|有没有人需要|问问/.test(text)), third[0]);

    // 诚实程度：soft 模式
    await page.selectOption('#honesty', 'soft');
    await page.click('#generate');
    const soft = await page.locator('.card p').allInnerTexts();
    check('soft mode still admits authorship', soft.every((text) => /我(自己)?[^。]{0,10}(做|写|建|弄|折腾)/g.test(text)), soft[0]);

    // 再次生成应产生新一批
    await page.click('#generate');
    const fourth = await page.locator('.card p').allInnerTexts();
    check('regenerate produces new batch', fourth.join() !== soft.join(), 'differs');

    // 复制按钮
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('.copy').first().click();
    await page.waitForFunction(() => document.querySelector('.copy').textContent.includes('已复制'), { timeout: 4000 });
    check('copy button confirms', true);

    // 所有场景都能生成
    for (const scene of ['screenShare', 'howTo', 'series', 'gift', 'tool']) {
      await page.selectOption('#scene', scene);
      await page.selectOption('#honesty', 'full');
      await page.click('#generate');
      const texts = await page.locator('.card p').allInnerTexts();
      check(`scene ${scene} generates`, texts.length === 10 && texts.every((t) => t.length > 20), String(texts.length));
    }

    await page.selectOption('#scene', 'screenShare');
    await page.selectOption('#style', 'direct');
    await page.selectOption('#platform', 'xhs');
    await page.click('#generate');
    await page.screenshot({ path: path.join(SHOTS, 'reply-tool.png'), fullPage: true });

    check('no page errors', errors.length === 0, errors.join(' | '));
    console.log(JSON.stringify({ results, errors }, null, 2));
  } catch (error) {
    await page.screenshot({ path: path.join(SHOTS, 'reply-failure.png'), fullPage: true }).catch(() => {});
    console.error(error.stack || error.message);
    console.error(JSON.stringify({ results, errors }, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
