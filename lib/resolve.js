'use strict';

/**
 * 在线视频解析（方案 A：只解析，不代理）
 *
 * 目标：给一个视频网页地址，尽量找出可以被浏览器直接播放的流地址。
 * 不下载、不转码、不代理：只返回 URL，让浏览器自己去拉。
 */

const { execFile } = require('node:child_process');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/122.0.0.0 Safari/537.36';

const RESOLVE_TIMEOUT_MS = 20000;
const MAX_HTML_BYTES = 2 * 1024 * 1024;

const MEDIA_URL_RE =
  /https?:\/\/[^\s"'<>\\]+?\.(?:m3u8|mp4|webm|m4v|mov|mpd)(?:\?[^\s"'<>\\]*)?/gi;

const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 200;

const ytDlpState = { disabled: false, checked: false };

/* ---------------- Bilibili html5 直链（免代理，浏览器可直接播放） ---------------- */

const BILI_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/122.0.0.0 Safari/537.36';

let biliCookie = null;
let biliCookieAt = 0;
const BILI_COOKIE_TTL_MS = 12 * 60 * 60 * 1000;

async function ensureBiliCookie() {
  if (biliCookie && Date.now() - biliCookieAt < BILI_COOKIE_TTL_MS) return biliCookie;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch('https://api.bilibili.com/x/frontend/finger/spi', {
      headers: { 'User-Agent': BILI_UA, Referer: 'https://www.bilibili.com/' },
      signal: controller.signal,
    });
    const data = await response.json();
    if (data && data.data && data.data.b_3) {
      biliCookie = `buvid3=${data.data.b_3}; buvid4=${data.data.b_4 || ''}`;
      biliCookieAt = Date.now();
      return biliCookie;
    }
  } catch {
    // fall through
  } finally {
    clearTimeout(timer);
  }
  return biliCookie || '';
}

function parseBiliTarget(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\.|^m\./i, '').toLowerCase();
  if (host !== 'bilibili.com' && host !== 'b23.tv') return null;

  const bv = parsed.pathname.match(/\/(BV[0-9A-Za-z]{8,})/);
  const av = parsed.pathname.match(/\/av(\d+)/i);
  const queryBv = parsed.searchParams.get('bvid');
  const page = Number(parsed.searchParams.get('p')) || 1;
  if (bv) return { id: bv[1], kind: 'bvid', page };
  if (av) return { id: `av${av[1]}`, kind: 'aid', page };
  if (queryBv) return { id: queryBv, kind: 'bvid', page };
  return { redirect: true, url };
}

async function followBiliRedirect(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': BILI_UA },
      signal: controller.signal,
    });
    return response.url || url;
  } catch {
    return url;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveBilibili(url) {
  let target = parseBiliTarget(url);
  if (!target) return null;
  if (target.redirect) {
    target = parseBiliTarget(await followBiliRedirect(target.url));
    if (!target || target.redirect) return null;
  }

  const cookie = await ensureBiliCookie();
  const headers = {
    'User-Agent': BILI_UA,
    Referer: 'https://www.bilibili.com/',
    ...(cookie ? { Cookie: cookie } : {}),
  };

  const idQuery = target.kind === 'bvid' ? `bvid=${target.id}` : `aid=${target.id.replace('av', '')}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const viewResponse = await fetch(
      `https://api.bilibili.com/x/web-interface/view?${idQuery}`,
      { headers, signal: controller.signal },
    );
    const view = await viewResponse.json();
    if (!view || view.code !== 0 || !view.data) return null;

    const pages = Array.isArray(view.data.pages) ? view.data.pages : [];
    const page = Math.min(Math.max(1, target.page), Math.max(1, pages.length));
    const cid = pages.length ? pages[page - 1].cid : view.data.cid;
    const title = pages.length > 1
      ? `${view.data.title} P${page}:${pages[page - 1].part || ''}`
      : view.data.title;

    const playResponse = await fetch(
      `https://api.bilibili.com/x/player/playurl?${idQuery}&cid=${cid}&qn=64&platform=html5&high_quality=1`,
      { headers, signal: controller.signal },
    );
    const play = await playResponse.json();
    if (!play || play.code !== 0 || !play.data || !Array.isArray(play.data.durl) || !play.data.durl.length) {
      return null;
    }

    const stream = play.data.durl[0];
    if (!/^https?:\/\//i.test(stream.url || '')) return null;

    return {
      ok: true,
      streams: [{
        url: stream.url,
        protocol: 'https',
        ext: 'mp4',
        height: 720,
        needsHeaders: false,
        live: false,
        via: 'bilibili-html5',
      }],
      title: String(title || '').slice(0, 120),
      thumbnail: String(view.data.pic || ''),
      note: '',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function getCached(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function setCached(key, value) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
}

function runYtDlp(url, timeout = RESOLVE_TIMEOUT_MS) {
  if (ytDlpState.disabled) return Promise.resolve(null);

  const run = new Promise((resolve) => {
    const args = [
      '-J',
      '--no-warnings',
      '--no-playlist',
      '--no-progress',
      '--socket-timeout', '15',
      '--retries', '1',
      url,
    ];
    const attempt = (bin) => new Promise((done) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        done(value);
      };
      let child;
      try {
        child = execFile(bin, args, { timeout, maxBuffer: 24 * 1024 * 1024, windowsHide: true }, (error, stdout) => {
          if (error) {
            // 二进制不存在或无法执行时，后续请求直接跳过 yt-dlp
            if (error.code === 'ENOENT' || error.code === 'EPERM' || error.code === 'EACCES') {
              ytDlpState.disabled = true;
            }
            finish(null);
            return;
          }
          if (!stdout) {
            finish(null);
            return;
          }
          try {
            finish(JSON.parse(stdout));
          } catch {
            finish(null);
          }
        });
      } catch {
        finish(null);
        return;
      }
      child.on('error', () => finish(null));
    });

    (async () => {
      const info = (await attempt('yt-dlp')) || (await attempt('yt-dlp.exe'));
      resolve(info);
    })();
  });

  // 兜底：无论子进程发生什么，都不能让请求永久挂起
  let guardTimer;
  const guard = new Promise((resolve) => {
    guardTimer = setTimeout(() => resolve(null), timeout + 3000);
  });
  return Promise.race([run, guard]).finally(() => clearTimeout(guardTimer));
}

function usableProtocol(protocol) {
  const value = String(protocol || 'https').toLowerCase();
  return value === 'https' || value === 'http' || value === 'm3u8_native' || value === 'm3u8';
}

function scoreFormat(format) {
  const hasVideo = format.vcodec && format.vcodec !== 'none';
  const hasAudio = format.acodec && format.acodec !== 'none';
  const height = Number(format.height) || 0;
  const tbr = Number(format.tbr) || 0;
  let score = height * 1000 + tbr;
  if (hasVideo && hasAudio) score += 5_000_000;
  if (/m3u8/i.test(String(format.protocol || ''))) score += 1_000;
  return score;
}

/** 从 yt-dlp 的元数据里挑一个浏览器能直接播的地址（优先音视频合一的渐进流）。 */
function pickFromInfo(info) {
  if (!info || typeof info !== 'object') return null;

  const formats = Array.isArray(info.formats) ? info.formats : [];
  const candidates = formats
    .filter((format) => format && typeof format.url === 'string' && /^https?:\/\//i.test(format.url))
    .filter((format) => usableProtocol(format.protocol))
    .filter((format) => format.vcodec !== 'none' || format.acodec !== 'none');

  const progressive = candidates.filter(
    (format) => format.vcodec && format.vcodec !== 'none' && format.acodec && format.acodec !== 'none',
  );
  const pool = progressive.length ? progressive : candidates;
  pool.sort((a, b) => scoreFormat(b) - scoreFormat(a));
  const best = pool[0];

  const direct = typeof info.url === 'string' && /^https?:\/\//i.test(info.url) ? info.url : '';
  const streamUrl = best ? best.url : direct;
  if (!streamUrl) return null;

  const headers = (best && best.http_headers) || info.http_headers || null;
  const headerKeys = headers ? Object.keys(headers) : [];
  const needsHeaders = headerKeys.some((key) => /referer|origin|cookie/i.test(key));

  return {
    url: streamUrl,
    protocol: (best && best.protocol) || 'https',
    ext: (best && best.ext) || 'mp4',
    height: (best && Number(best.height)) || 0,
    needsHeaders,
    live: Boolean(info.is_live),
    via: 'yt-dlp',
  };
}

function decodeLoose(text) {
  return String(text || '')
    .replace(/\\u002F/gi, '/')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&')
    .replace(/\\u0026/gi, '&');
}

function absolutize(candidate, baseUrl) {
  try {
    return new URL(candidate, baseUrl).href;
  } catch {
    return null;
  }
}

function extractCandidates(html, baseUrl) {
  // JSON 里常见 \u002F、\/ 转义的斜杠，先还原再匹配，否则正则看不到完整 URL
  const text = decodeLoose(html);
  const found = [];
  const push = (raw) => {
    if (!raw) return;
    const cleaned = decodeLoose(String(raw)).trim().replace(/^["']|["']$/g, '');
    if (!cleaned || /^data:/i.test(cleaned) || /^blob:/i.test(cleaned)) return;
    const absolute = absolutize(cleaned, baseUrl);
    if (!absolute || !/^https?:\/\//i.test(absolute)) return;
    if (!/\.(m3u8|mp4|webm|m4v|mov|mpd)(\?|#|$)/i.test(absolute)) return;
    found.push(absolute);
  };

  const metaRe = /(?:property|name)=["'](?:og:video(?::url|:secure_url)?|twitter:player:stream)["'][^>]*content=["']([^"']+)["']/gi;
  let match;
  while ((match = metaRe.exec(text))) push(match[1]);

  const metaReReversed = /content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:video(?::url|:secure_url)?|twitter:player:stream)["']/gi;
  while ((match = metaReReversed.exec(text))) push(match[1]);

  const sourceRe = /<(?:video|source)[^>]+src=["']([^"']+)["']/gi;
  while ((match = sourceRe.exec(text))) push(match[1]);

  const jsonLdRe = /"contentUrl"\s*:\s*"([^"]+)"/gi;
  while ((match = jsonLdRe.exec(text))) push(match[1]);

  const loose = text.match(MEDIA_URL_RE) || [];
  for (const item of loose) push(item);

  const seen = new Set();
  const unique = [];
  for (const item of found) {
    if (seen.has(item)) continue;
    seen.add(item);
    unique.push(item);
  }

  // m3u8 优先（通常是完整清晰度的播放列表），其次 mp4/webm
  unique.sort((a, b) => {
    const rank = (url) => (/\.m3u8(\?|#|$)/i.test(url) ? 0 : /\.mp4(\?|#|$)/i.test(url) ? 1 : 2);
    return rank(a) - rank(b);
  });

  return unique;
}

async function resolveGeneric(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RESOLVE_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });
    if (!response.ok) return null;

    const type = String(response.headers.get('content-type') || '').toLowerCase();
    if (type.startsWith('video/')) {
      return {
        streams: [{
          url: response.url || url,
          protocol: 'https',
          ext: 'mp4',
          needsHeaders: false,
          live: false,
          via: 'direct-response',
        }],
        title: '',
        thumbnail: '',
      };
    }
    if (!type.includes('html') && !type.includes('text/plain') && type) return null;

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_HTML_BYTES) return null;
    const html = Buffer.from(buffer).toString('utf8');

    const titleMatch =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const thumbMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);

    const candidates = extractCandidates(html, response.url || url);
    if (!candidates.length) return null;

    return {
      streams: candidates.slice(0, 4).map((candidate) => ({
        url: candidate,
        protocol: /\.m3u8/i.test(candidate) ? 'm3u8_native' : 'https',
        ext: /\.m3u8/i.test(candidate) ? 'm3u8' : 'mp4',
        needsHeaders: false,
        live: false,
        via: 'html',
      })),
      title: titleMatch ? decodeLoose(titleMatch[1]).slice(0, 120).trim() : '',
      thumbnail: thumbMatch ? thumbMatch[1] : '',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 解析一个页面地址。
 * @returns {Promise<{ok:boolean, streams?:Array, title?:string, thumbnail?:string, error?:string}>}
 */
async function resolvePage(url) {
  const cached = getCached(url);
  if (cached) return cached;

  // Bilibili：html5 接口可拿免 Referer 的 mp4 直链，浏览器可直接完整同步播放
  const fromBili = await resolveBilibili(url);
  if (fromBili) {
    setCached(url, fromBili);
    return fromBili;
  }

  const fromYtDlp = pickFromInfo(await runYtDlp(url));
  if (fromYtDlp) {
    const result = {
      ok: true,
      streams: [fromYtDlp],
      title: '',
      thumbnail: '',
      note: fromYtDlp.needsHeaders ? 'needs-headers' : '',
    };
    setCached(url, result);
    return result;
  }

  const generic = await resolveGeneric(url);
  if (generic && generic.streams.length) {
    const result = {
      ok: true,
      streams: generic.streams,
      title: generic.title,
      thumbnail: generic.thumbnail,
      note: '',
    };
    setCached(url, result);
    return result;
  }

  return {
    ok: false,
    error: 'unsupported',
    errorText: '没能在页面里找到可直接播放的视频地址。这个网站可能需要登录、加密或使用了本站无法解析的技术。',
  };
}

function clearResolveCache() {
  cache.clear();
}

module.exports = { resolvePage, clearResolveCache, extractCandidates };
