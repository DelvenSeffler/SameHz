'use strict';

/**
 * 找出 CSS 中定义、但 HTML/JS 从未引用的类名
 * 会跳过：状态类（is-*）、伪类、以及被 JS 动态拼接的常见前缀
 */

const fs = require('node:fs');
const path = require('node:path');

const CSS_FILES = ['public/css/styles.css', 'public/css/room.css'];
const SOURCE_FILES = [
  'public/index.html',
  'public/room.html',
  'public/stats.html',
  'public/reply.html',
  'public/js/room.js',
  'public/js/landing.js',
  'public/js/poster.js',
  'public/js/i18n.js',
  'server.js',
];

const sources = SOURCE_FILES
  .filter((file) => fs.existsSync(file))
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n');

const SKIP_PREFIX = ['is-', 'has-', 'pulse-', 'orb-', 'glow-', 'node-', 'figure-'];

for (const file of CSS_FILES) {
  const css = fs.readFileSync(file, 'utf8');
  const classes = new Set();
  for (const match of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) {
    classes.add(match[1]);
  }

  const unused = [];
  for (const name of classes) {
    if (SKIP_PREFIX.some((prefix) => name.startsWith(prefix))) continue;
    if (name.length < 3) continue;
    if (sources.includes(name)) continue;
    unused.push(name);
  }

  console.log(`\n${file}: 定义 ${classes.size} 个类，可疑未使用 ${unused.length} 个`);
  if (unused.length) console.log('  ' + unused.sort().join(', '));
}
