'use strict';

/**
 * 修正 Android 自适应图标 XML
 *
 * Capacitor 的素材生成器会给 background / foreground 各套一层 <inset>，
 * 等于在 66% 安全区之上再缩一次，桌面图标看起来就明显偏小。
 * 这里改回纯粹的两层引用。
 *
 * 用法：在 capacitor-assets generate 之后执行（npm run icons 已串好顺序）。
 */

const fs = require('node:fs');
const path = require('node:path');

const XML = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;

const DIR = path.join('android', 'app', 'src', 'main', 'res', 'mipmap-anydpi-v26');
let changed = 0;

for (const file of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
  const target = path.join(DIR, file);
  if (!fs.existsSync(target)) {
    console.log('skip (missing):', target);
    continue;
  }
  const current = fs.readFileSync(target, 'utf8');
  if (current.includes('<inset')) {
    fs.writeFileSync(target, XML, 'utf8');
    console.log('✓ patched', target);
    changed += 1;
  } else {
    console.log('✓ already clean', target);
  }
}

if (!changed) console.log('没有需要修正的 inset 层。');
