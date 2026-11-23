'use strict';

/**
 * 邀请海报生成器
 *
 * 纯 canvas 绘制，无外部依赖、无网络请求。
 * 输出 1080×1440 竖版图片，用户可直接保存发微信 / 朋友圈 / 小红书。
 */
(() => {
  const WIDTH = 1080;
  const HEIGHT = 1440;

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function wrapText(ctx, text, maxWidth) {
    const lines = [];
    let line = '';
    for (const char of String(text)) {
      const next = line + char;
      if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line);
        line = char;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  /**
   * @param {object} options
   * @param {string} options.roomId   六位房间码
   * @param {string} options.url      完整邀请链接
   * @param {string} [options.name]   邀请人昵称
   * @param {string} [options.copy]   主文案
   */
  function draw(options) {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');

    // 背景：暖黑渐变
    const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    bg.addColorStop(0, '#14100d');
    bg.addColorStop(0.55, '#0c0a08');
    bg.addColorStop(1, '#080706');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // 顶部光晕
    const glow = ctx.createRadialGradient(WIDTH * 0.5, 120, 40, WIDTH * 0.5, 120, 720);
    glow.addColorStop(0, 'rgba(200, 88, 52, 0.34)');
    glow.addColorStop(1, 'rgba(200, 88, 52, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, 760);

    // 细边框
    ctx.strokeStyle = 'rgba(244, 236, 223, 0.16)';
    ctx.lineWidth = 2;
    roundRect(ctx, 44, 44, WIDTH - 88, HEIGHT - 88, 26);
    ctx.stroke();

    // 品牌
    ctx.fillStyle = 'rgba(214, 183, 139, 0.9)';
    ctx.font = '600 26px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('同 频 · S A M E H Z', WIDTH / 2, 132);

    // 眉标
    ctx.fillStyle = 'rgba(171, 162, 149, 0.95)';
    ctx.font = '500 24px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('A   P R I V A T E   S C R E E N I N G   F O R   T W O', WIDTH / 2, 214);

    // 主标题（衬线）
    const headline = options.headline || '今晚，一起看场电影。';
    ctx.fillStyle = '#f7f1e6';
    ctx.font = '400 78px "Songti SC", "STSong", "Noto Serif SC", serif';
    const titleLines = wrapText(ctx, headline, WIDTH - 200);
    let titleY = 356;
    for (const line of titleLines) {
      ctx.fillText(line.trim(), WIDTH / 2, titleY);
      titleY += 100;
    }

    // 副文案
    if (options.copy) {
      ctx.fillStyle = 'rgba(171, 162, 149, 0.98)';
      ctx.font = '400 28px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
      const copyLines = wrapText(ctx, options.copy, WIDTH - 220).slice(0, 3);
      let copyY = titleY + 14;
      for (const line of copyLines) {
        ctx.fillText(line.trim(), WIDTH / 2, copyY);
        copyY += 46;
      }
    }

    // 房间码卡片
    const cardW = WIDTH - 220;
    const cardX = (WIDTH - cardW) / 2;
    const cardY = 660;
    const cardH = 290;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
    roundRect(ctx, cardX, cardY, cardW, cardH, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 138, 107, 0.42)';
    ctx.lineWidth = 2;
    roundRect(ctx, cardX, cardY, cardW, cardH, 22);
    ctx.stroke();

    ctx.fillStyle = 'rgba(171, 162, 149, 0.95)';
    ctx.font = '500 22px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('房  间  码', WIDTH / 2, cardY + 62);

    ctx.fillStyle = '#ff8166';
    ctx.font = '600 92px "Cascadia Mono", Consolas, monospace';
    ctx.fillText(String(options.roomId || '------'), WIDTH / 2, cardY + 178);

    ctx.fillStyle = 'rgba(171, 162, 149, 0.9)';
    ctx.font = '400 22px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(options.hostHint || '打开网站输入房间码即可', WIDTH / 2, cardY + 236);

    // 邀请链接
    if (options.url) {
      ctx.fillStyle = 'rgba(247, 241, 230, 0.72)';
      ctx.font = '400 21px "Cascadia Mono", Consolas, monospace';
      ctx.fillText(options.url.replace(/^https?:\/\//, ''), WIDTH / 2, 1060);
    }

    // 三条卖点
    const points = options.points || ['各自放自己的片源', '原画质不压缩', '每 3 秒自动对齐'];
    ctx.fillStyle = 'rgba(143, 211, 164, 0.9)';
    ctx.font = '500 23px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(points.join('     ·     '), WIDTH / 2, 1132);

    // 邀请人
    if (options.name) {
      ctx.fillStyle = 'rgba(247, 241, 230, 0.86)';
      ctx.font = '400 26px "Songti SC", "STSong", serif';
      ctx.fillText(`—— ${options.name} 邀你赴约`, WIDTH / 2, 1216);
    }

    // 底部装饰
    ctx.fillStyle = 'rgba(171, 162, 149, 0.5)';
    ctx.font = '400 19px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('只同步进度，不搬运电影', WIDTH / 2, HEIGHT - 96);

    return canvas;
  }

  function toBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('poster-blob-failed'));
      }, 'image/png');
    });
  }

  window.SameHzPoster = { draw, toBlob, WIDTH, HEIGHT };
})();
