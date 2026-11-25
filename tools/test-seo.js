'use strict';

/** SEO / GEO 基础设施回归：结构化数据、meta、robots、sitemap、llms.txt、FAQ 可见性。 */

const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const SHOTS = path.resolve('test/screenshots');

const results = [];
function check(name, condition, detail = '') {
  results.push({ name, pass: Boolean(condition), detail });
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  try {
    /* ---------- robots.txt ---------- */
    const robots = await fetch(`${BASE}/robots.txt`).then((r) => r.text());
    check('robots allows root', /Allow: \/$/m.test(robots), robots.slice(0, 60));
    check('robots blocks room pages', /Disallow: \/room\//.test(robots));
    check('robots references sitemap', /Sitemap: .+\/sitemap\.xml/.test(robots));
    check('robots allows AI crawlers', /GPTBot/.test(robots) && /PerplexityBot/.test(robots), '');

    /* ---------- sitemap.xml ---------- */
    const sitemapResponse = await fetch(`${BASE}/sitemap.xml`);
    const sitemap = await sitemapResponse.text();
    check('sitemap content type is xml', String(sitemapResponse.headers.get('content-type')).includes('xml'));
    check('sitemap has urlset', sitemap.includes('<urlset'));
    check('sitemap lists home', sitemap.includes('<loc>') && /<loc>[^<]+\/<\/loc>/.test(sitemap));
    check('sitemap has hreflang', sitemap.includes('hreflang="en"'));

    /* ---------- llms.txt ---------- */
    const llms = await fetch(`${BASE}/llms.txt`).then((r) => r.text());
    check('llms.txt has title', llms.startsWith('# 同频 SameHz'), llms.slice(0, 30));
    check('llms.txt has summary', llms.includes('> '), '');
    check('llms.txt states free', /免费/.test(llms));
    check('llms.txt lists sources', /B站/.test(llms) && /YouTube/.test(llms));
    check('llms.txt lists limits', /DRM/.test(llms));

    /* ---------- 首页 meta 与结构化数据 ---------- */
    await page.goto(BASE, { waitUntil: 'networkidle' });

    const title = await page.title();
    check('title contains core keyword', /异地恋一起看电影/.test(title), title);
    check('title contains brand', /同频|SameHz/.test(title), title);

    const description = await page.locator('meta[name="description"]').getAttribute('content');
    check('description is substantial', description.length > 80 && description.length < 300, String(description.length));
    check('description contains keyword', /异地恋/.test(description));

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    check('canonical present', /^https?:\/\//.test(canonical || ''), canonical);

    const robotsMeta = await page.locator('meta[name="robots"]').getAttribute('content');
    check('home is indexable', /index/.test(robotsMeta || ''), robotsMeta);

    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    check('og:image present', /og-cover\.png$/.test(ogImage || ''), ogImage);
    // 社交平台要求绝对地址，因此校验本地对应文件是否随站点发布
    const ogLocal = path.resolve('public/img/og-cover.png');
    const ogExists = fs.existsSync(ogLocal) && fs.statSync(ogLocal).size > 10000;
    check('og:image file ships with site', ogExists, ogExists ? `${fs.statSync(ogLocal).size} bytes` : 'missing');
    check('og:image is absolute url', /^https?:\/\//.test(ogImage || ''), ogImage);

    const hasHreflang = await page.locator('link[rel="alternate"][hreflang="en"]').count();
    check('hreflang en present', hasHreflang > 0, String(hasHreflang));

    const ldRaw = await page.locator('script[type="application/ld+json"]').first().textContent();
    let ld = null;
    try { ld = JSON.parse(ldRaw); } catch { ld = null; }
    check('JSON-LD parses', Boolean(ld), ld ? 'ok' : 'unparseable');

    const graph = ld && Array.isArray(ld['@graph']) ? ld['@graph'] : [];
    const types = graph.map((node) => node['@type']);
    check('JSON-LD has WebSite', types.includes('WebSite'), types.join(','));
    check('JSON-LD has WebApplication', types.includes('WebApplication'), types.join(','));
    check('JSON-LD has FAQPage', types.includes('FAQPage'), types.join(','));

    const app = graph.find((node) => node['@type'] === 'WebApplication');
    check('app is free', app && app.offers && app.offers.price === '0', app && JSON.stringify(app.offers));
    check('app has feature list', app && Array.isArray(app.featureList) && app.featureList.length >= 6,
      app && String(app.featureList && app.featureList.length));

    const faq = graph.find((node) => node['@type'] === 'FAQPage');
    check('FAQ has 6 questions', faq && faq.mainEntity.length === 6, faq && String(faq.mainEntity.length));

    /* ---------- FAQ 可见内容必须与结构化数据一致 ---------- */
    const visibleQuestions = await page.locator('.faq-item dt').allInnerTexts();
    const structuredQuestions = (faq ? faq.mainEntity : []).map((item) => item.name);
    check('visible FAQ matches structured data',
      visibleQuestions.length === structuredQuestions.length &&
      visibleQuestions.every((text, index) => text.trim() === structuredQuestions[index].trim()),
      JSON.stringify({ visible: visibleQuestions.length, structured: structuredQuestions.length }));

    check('comparison table rendered', (await page.locator('.compare-table tbody tr').count()) === 3,
      String(await page.locator('.compare-table tbody tr').count()));

    const h1Count = await page.locator('h1').count();
    check('exactly one h1', h1Count === 1, String(h1Count));

    await page.locator('#faq').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(SHOTS, 'landing-faq.png'), fullPage: true });

    /* ---------- 房间页必须 noindex ---------- */
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.fill('#nickname', 'SEO');
    await page.click('#submit-button');
    await page.waitForURL(/\/room\/[A-Z0-9]{6}$/, { timeout: 15000 });
    const roomRobots = await page.locator('meta[name="robots"]').getAttribute('content');
    check('room page is noindex', /noindex/.test(roomRobots || ''), roomRobots);

    check('no page errors', errors.length === 0, errors.join(' | '));

    const failures = results.filter((item) => !item.pass);
    console.log(JSON.stringify({ results, failures: failures.length }, null, 2));
    process.exitCode = failures.length ? 1 : 0;
  } catch (error) {
    await page.screenshot({ path: path.join(SHOTS, 'seo-failure.png'), fullPage: true }).catch(() => {});
    console.error(error.stack || error.message);
    console.error(JSON.stringify({ results }, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
