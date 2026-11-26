'use strict';

/**
 * 合并 CSS 中重复的媒体查询块
 *
 * 多轮迭代后同一断点被拆成了十几个碎片块，既难维护也有覆盖顺序隐患。
 * 本脚本把同一查询的所有块按原顺序合并到文件末尾一个块里，
 * 层叠结果保持不变（后出现的规则仍然靠后）。
 *
 * 用法：node tools/merge-media-queries.js [--dry]
 */

const fs = require('node:fs');
const path = require('node:path');

const TARGETS = [
  { file: 'public/css/room.css', query: '@media (max-width: 720px)' },
  { file: 'public/css/styles.css', query: '@media (max-width: 720px)' },
];

function findBlocks(css, query) {
  const blocks = [];
  let cursor = 0;
  for (;;) {
    const start = css.indexOf(query, cursor);
    if (start === -1) break;
    const braceStart = css.indexOf('{', start);
    if (braceStart === -1) break;
    let depth = 0;
    let i = braceStart;
    for (; i < css.length; i += 1) {
      if (css[i] === '{') depth += 1;
      else if (css[i] === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    blocks.push({ start, end: i + 1, body: css.slice(braceStart + 1, i) });
    cursor = i + 1;
  }
  return blocks;
}

const dry = process.argv.includes('--dry');

for (const { file, query } of TARGETS) {
  if (!fs.existsSync(file)) continue;
  const css = fs.readFileSync(file, 'utf8');
  const blocks = findBlocks(css, query);
  if (blocks.length < 2) {
    console.log(`${file}: ${blocks.length} 个块，无需合并`);
    continue;
  }

  if (dry) {
    console.log(`${file}: 将合并 ${blocks.length} 个块`);
    continue;
  }

  // 从后往前删，避免索引错位
  let without = css;
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index];
    without = without.slice(0, block.start) + without.slice(block.end);
  }
  without = without.replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '\n');

  const merged = blocks.map((block) => block.body.trim()).filter(Boolean).join('\n\n');
  const banner = `\n/* ==========================================================\n   移动端规则（由 ${blocks.length} 个碎片块合并而来）\n   ========================================================== */\n\n`;
  const output = `${without.trimEnd()}\n${banner}${query} {\n${merged}\n}\n`;

  fs.writeFileSync(file, output, 'utf8');
  console.log(`✓ ${file}: ${blocks.length} 块 → 1 块，${css.length} → ${output.length} 字符`);
}
