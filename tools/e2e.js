const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:3000';
const SAMPLE = path.resolve('test/sample.webm');
const SHOTS = path.resolve('test/screenshots');

const results = [];
function check(name, condition, detail = '') {
  results.push({ name, pass: Boolean(condition), detail });
  if (!condition) throw new Error(`${name}${detail ? ` — ${detail}` : ''}`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
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
      if (message.type() === 'error') errors.push(`${label} console: ${message.text()}`);
    });
  }

  try {
    // Landing page
    await pageA.goto(BASE, { waitUntil: 'networkidle' });
    await pageA.screenshot({ path: path.join(SHOTS, 'landing.png'), fullPage: true });
    const heroTitle = await pageA.locator('.hero h1').innerText();
    check('landing hero renders', heroTitle.includes('一起看同一帧'), heroTitle);

    // Create room
    await pageA.fill('#nickname', '小满');
    await pageA.click('#submit-button');
    await pageA.waitForURL(/\/room\/[A-Z0-9]{6}$/, { timeout: 10000 });
    const roomId = pageA.url().split('/').pop();
    check('room created', /^[A-Z0-9]{6}$/.test(roomId), roomId);
    await pageA.waitForSelector('#connection-pill:not(.is-connecting)', { timeout: 10000 });
    check('A connected', (await pageA.locator('#connection-text').innerText()) === '已连接');
    check('A sees empty seat', (await pageA.locator('#participant-list .participant').count()) === 2);

    // Guest entry
    await pageB.goto(`${BASE}/room/${roomId}`, { waitUntil: 'domcontentloaded' });
    await pageB.waitForSelector('#entry-overlay:not(.is-hidden)', { timeout: 5000 });
    await pageB.screenshot({ path: path.join(SHOTS, 'room-entry.png'), fullPage: true });
    await pageB.fill('#entry-name', '阿遥');
    await pageB.click('#entry-submit');
    await pageB.waitForSelector('#entry-overlay.is-hidden', { state: 'hidden', timeout: 5000 });
    await pageA.waitForFunction(() => document.querySelectorAll('#participant-list .participant').length === 2 && document.querySelectorAll('#participant-list .participant.is-empty').length === 0, { timeout: 10000 });
    check('both participants joined', (await pageA.locator('#seat-count').innerText()).trim() === '2 / 2');

    // Load the same local file on both sides
    await pageA.locator('#file-input').setInputFiles(SAMPLE);
    await pageB.locator('#file-input').setInputFiles(SAMPLE);
    await pageA.waitForSelector('.stage-frame.has-video', { timeout: 20000 });
    await pageB.waitForSelector('.stage-frame.has-video', { timeout: 20000 });
    await pageA.waitForFunction(() => document.getElementById('match-title').textContent.includes('匹配'), { timeout: 10000 });
    await pageB.waitForFunction(() => document.getElementById('match-title').textContent.includes('匹配'), { timeout: 10000 });
    check('files match', (await pageA.locator('#match-title').innerText()).includes('匹配'));

    const durations = await Promise.all([pageA, pageB].map((page) => page.evaluate(() => document.getElementById('player').duration)));
    check('video metadata loaded', durations.every((duration) => Number.isFinite(duration) && duration > 5), JSON.stringify(durations));
    const initialVolumes = await Promise.all([pageA, pageB].map((page) => page.evaluate(() => document.getElementById('player').volume)));
    check('default audio volume is audible', initialVolumes.every((volume) => volume > 0.5), JSON.stringify(initialVolumes));

    // Play from A, B should follow
    await pageA.click('#play-button');
    await sleep(2600);
    const playback = await Promise.all([pageA, pageB].map((page) => page.evaluate(() => ({
      paused: document.getElementById('player').paused,
      time: document.getElementById('player').currentTime,
    }))));
    check('remote play follows', playback.every((item) => !item.paused), JSON.stringify(playback));
    check('playback drift is low', Math.abs(playback[0].time - playback[1].time) < 1.0, JSON.stringify(playback));

    // Pause from A, B should pause
    await pageA.click('#play-button');
    await sleep(1200);
    const paused = await Promise.all([pageA, pageB].map((page) => page.evaluate(() => document.getElementById('player').paused)));
    check('remote pause follows', paused.every(Boolean), JSON.stringify(paused));

    // Remote seek should follow too
    await pageA.click('#play-button');
    await sleep(1000);
    await pageA.click('#back-button');
    await sleep(1300);
    const seeked = await Promise.all([pageA, pageB].map((page) => page.evaluate(() => ({
      paused: document.getElementById('player').paused,
      time: document.getElementById('player').currentTime,
    }))));
    check('remote seek follows', Math.abs(seeked[0].time - seeked[1].time) < 1.0, JSON.stringify(seeked));

    // Auto-correct a simulated 4 second drift on B
    await sleep(400);
    await pageB.evaluate(() => { document.getElementById('player').currentTime += 4; });
    await sleep(5200);
    const corrected = await Promise.all([pageA, pageB].map((page) => page.evaluate(() => ({
      paused: document.getElementById('player').paused,
      time: document.getElementById('player').currentTime,
    }))));
    check('auto calibration reduces drift', Math.abs(corrected[0].time - corrected[1].time) < 1.2, JSON.stringify(corrected));

    // Manual sync after a new 3 second offset on B
    await pageB.evaluate(() => { document.getElementById('player').currentTime += 3; });
    await pageA.click('#inline-sync');
    await sleep(1500);
    const manual = await Promise.all([pageA, pageB].map((page) => page.evaluate(() => ({
      paused: document.getElementById('player').paused,
      time: document.getElementById('player').currentTime,
    }))));
    check('manual sync aligns both players', Math.abs(manual[0].time - manual[1].time) < 0.8, JSON.stringify(manual));
    check('activity log records actions', (await pageA.locator('#activity-list .activity-item').count()) >= 3);

    // Pause for a composed screenshot with controls visible
    await pageA.click('#play-button');
    await sleep(900);
    await pageA.screenshot({ path: path.join(SHOTS, 'room-desktop.png'), fullPage: true });

    // Mobile landing shot
    const contextC = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'zh-CN', isMobile: true, hasTouch: true });
    const pageC = await contextC.newPage();
    await pageC.goto(BASE, { waitUntil: 'networkidle' });
    await pageC.screenshot({ path: path.join(SHOTS, 'landing-mobile.png'), fullPage: true });
    await contextC.close();

    // Mobile room shot from A
    await pageA.setViewportSize({ width: 390, height: 844 });
    await sleep(800);
    await pageA.screenshot({ path: path.join(SHOTS, 'room-mobile.png'), fullPage: true });

    check('no browser errors', errors.length === 0, errors.join(' | '));

    console.log(JSON.stringify({ roomId, results, errors }, null, 2));
  } catch (error) {
    await pageA.screenshot({ path: path.join(SHOTS, 'failure-A.png'), fullPage: true }).catch(() => {});
    await pageB.screenshot({ path: path.join(SHOTS, 'failure-B.png'), fullPage: true }).catch(() => {});
    console.error(error.stack || error.message);
    console.error(JSON.stringify({ results, errors }, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
