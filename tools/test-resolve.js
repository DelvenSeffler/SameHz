'use strict';

/**
 * 网页视频解析回归测试（方案 A）
 *
 * 启动一个本地静态站，模拟几种常见页面结构，验证解析器能否找出直链：
 *  - <meta property="og:video">
 *  - <video><source src>
 *  - JSON-LD contentUrl
 *  - 页面里裸奔的 m3u8（含转义斜杠）
 *  - 没有任何视频的页面
 */

const http = require('node:http');
const path = require('node:path');

const PORT = Number(process.env.PORT || 4023);
const BASE = `http://localhost:${PORT}`;

const results = [];
function check(name, condition, detail = '') {
  results.push({ name, pass: Boolean(condition), detail });
}

const pages = {
  '/og': `<!doctype html><html><head>
    <title>测试页 A</title>
    <meta property="og:title" content="一部测试电影">
    <meta property="og:video" content="/media/og-video.mp4">
    </head><body>hi</body></html>`,

  '/tag': `<!doctype html><html><head><title>测试页 B</title></head>
    <body><video controls><source src="${BASE}/media/tag-video.m3u8" type="application/x-mpegURL"></video></body></html>`,

  '/jsonld': `<!doctype html><html><head><title>测试页 C</title></head><body>
    <script type="application/ld+json">
    {"@type":"Movie","name":"JSON-LD 电影","contentUrl":"${BASE}/media/ld-video.mp4"}
    </script></body></html>`,

  '/escaped': `<!doctype html><html><head><title>测试页 D</title></head><body>
    <script>window.__INIT__={"src":"https:\\u002F\\u002Fcdn.example.com\\u002Fhls\\u002Fmaster.m3u8"};</script>
    </body></html>`,

  '/empty': `<!doctype html><html><head><title>没有视频</title></head><body><p>nothing here</p></body></html>`,

  '/media/og-video.mp4': 'VIDEO',
  '/media/tag-video.m3u8': '#EXTM3U',
  '/media/ld-video.mp4': 'VIDEO',
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = req.url.split('?')[0];
      const body = pages[url];
      if (body === undefined) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      if (url.startsWith('/media/')) {
        res.writeHead(200, { 'Content-Type': 'video/mp4' });
        res.end(body);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function resolve(url) {
  const response = await fetch(`${process.env.BASE_URL || 'http://localhost:3000'}/api/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

(async () => {
  const media = await startServer();
  try {
    const og = await resolve(`${BASE}/og`);
    check('og:video 能被解析', og.status === 200 && og.data && og.data.ok, JSON.stringify(og.data));
    check('og:video 返回绝对地址', Boolean(og.data && og.data.streams && og.data.streams[0].url.startsWith('http')), og.data && og.data.streams && og.data.streams[0].url);
    check('og:title 被用作标题', Boolean(og.data && og.data.title === '一部测试电影'), og.data && og.data.title);

    const tag = await resolve(`${BASE}/tag`);
    check('<source> 能被解析', tag.status === 200 && tag.data && tag.data.ok, JSON.stringify(tag.data));
    check('m3u8 优先', Boolean(tag.data && /\.m3u8/.test(tag.data.streams[0].url)), tag.data && tag.data.streams[0].url);

    const ld = await resolve(`${BASE}/jsonld`);
    check('JSON-LD contentUrl 能被解析', ld.status === 200 && ld.data && ld.data.ok, JSON.stringify(ld.data));

    const escaped = await resolve(`${BASE}/escaped`);
    check('转义斜杠 m3u8 能被还原', Boolean(escaped.data && escaped.data.ok && escaped.data.streams[0].url.includes('cdn.example.com/hls/master.m3u8')), JSON.stringify(escaped.data));

    const empty = await resolve(`${BASE}/empty`);
    check('无视频页面给出明确失败', empty.status === 422 && empty.data && empty.data.ok === false, JSON.stringify(empty.data));

    const bad = await resolve('about:blank');
    check('非 http 链接被拒绝', bad.status === 400, String(bad.status));

    const missing = await fetch(`${process.env.BASE_URL || 'http://localhost:3000'}/api/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'not-a-url' }),
    });
    check('非法链接被拒绝', missing.status === 400, String(missing.status));

    const failures = results.filter((item) => !item.pass);
    console.log(JSON.stringify({ results, failures: failures.length }, null, 2));
    process.exitCode = failures.length ? 1 : 0;
  } finally {
    media.close();
  }
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
