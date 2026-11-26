'use strict';

/**
 * 死代码扫描：找出定义了但从未被引用的函数
 * 用法：node tools/find-dead-code.js
 */

const fs = require('node:fs');
const path = require('node:path');

const TARGETS = [
  'public/js/room.js',
  'public/js/landing.js',
  'public/js/i18n.js',
  'public/js/config.js',
  'server.js',
  'lib/resolve.js',
  'lib/analytics.js',
];

const results = [];

for (const file of TARGETS) {
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, 'utf8');

  // 收集函数定义名
  const names = new Set();
  for (const match of source.matchAll(/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) {
    names.add(match[1]);
  }
  // 箭头函数常量
  for (const match of source.matchAll(/^\s*const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/gm)) {
    names.add(match[1]);
  }

  const dead = [];
  for (const name of names) {
    // 统计出现次数：定义算 1 次，其余为引用
    const pattern = new RegExp(`\\b${name.replace(/[$]/g, '\\$')}\\b`, 'g');
    const count = (source.match(pattern) || []).length;
    if (count <= 1) dead.push(name);
  }

  if (dead.length) results.push({ file, dead });
}

if (!results.length) {
  console.log('没有发现完全未被引用的函数。');
} else {
  for (const { file, dead } of results) {
    console.log(`${file}: ${dead.length} 个疑似未使用`);
    dead.forEach((name) => console.log(`  - ${name}`));
  }
}
