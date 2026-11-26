'use strict';

/**
 * 找出 i18n 字典中从未被引用的键
 * 判定：键的中文原文在 HTML / JS 源码中完全不出现
 */

const fs = require('node:fs');

const DICT = 'public/js/i18n.js';
const SOURCES = [
  'public/index.html',
  'public/room.html',
  'public/stats.html',
  'public/reply.html',
  'public/js/room.js',
  'public/js/landing.js',
  'public/js/i18n.js',
  'public/js/poster.js',
  'server.js',
];

const dict = fs.readFileSync(DICT, 'utf8');
// 只扫描 EN 字典区间
const start = dict.indexOf('const EN = {');
const end = dict.indexOf('\n  };', start);
const body = dict.slice(start, end);

const keys = [...body.matchAll(/^\s*'((?:[^'\\]|\\.)+)':/gm)].map((m) => m[1].replace(/\\'/g, "'"));

const sources = SOURCES.filter((f) => fs.existsSync(f)).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
// 去掉字典本身，避免自匹配
const withoutDict = [
  fs.readFileSync('public/index.html', 'utf8'),
  fs.readFileSync('public/room.html', 'utf8'),
  fs.readFileSync('public/stats.html', 'utf8'),
  fs.readFileSync('public/reply.html', 'utf8'),
  fs.readFileSync('public/js/room.js', 'utf8'),
  fs.readFileSync('public/js/landing.js', 'utf8'),
  fs.readFileSync('public/js/poster.js', 'utf8'),
  fs.readFileSync('server.js', 'utf8'),
].join('\n');

const unused = keys.filter((key) => {
  // 模板键含 {var}，用去掉占位符的前缀匹配
  const probe = key.split('{')[0].replace(/\s+/g, '').slice(0, 10);
  if (probe.length < 4) return false;
  const flat = withoutDict.replace(/\s+/g, '');
  return !flat.includes(probe);
});

console.log(`字典键 ${keys.length} 个，源码中找不到对应原文的 ${unused.length} 个：`);
unused.forEach((key) => console.log('  -', key.slice(0, 70)));
