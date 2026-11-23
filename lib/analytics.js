'use strict';

/**
 * 轻量埋点与漏斗统计
 *
 * 无数据库依赖：内存聚合 + 定时落盘到 data/stats-YYYY-MM-DD.json。
 * 只记录“行为计数”和“房间级漏斗状态”，不记录任何用户内容。
 */

const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = process.env.STATS_DIR || path.join(__dirname, '..', 'data');
const FLUSH_MS = 30 * 1000;
const PLAY_DEEP_SECONDS = 600; // 播放超过 10 分钟视为“真正用起来”

const today = () => new Date().toISOString().slice(0, 10);

let counts = new Map();
let funnel = new Map();
let day = today();

function bump(key, amount = 1) {
  const current = counts.get(key) || 0;
  counts.set(key, current + amount);
}

function roomState(roomId) {
  let entry = funnel.get(roomId);
  if (!entry) {
    entry = { created: Date.now(), joined: 0, sourced: 0, played: false, activated: false, platforms: new Set() };
    funnel.set(roomId, entry);
  }
  return entry;
}

/** 记录一个事件。meta.platform 用于统计片源分布。 */
function track(event, meta = {}) {
  bump(event);
  if (meta.platform) bump(`${event}:${meta.platform}`);
}

/** 房间创建：漏斗入口。roomId 由调用方提供。 */
function trackRoomCreated(roomId) {
  track('room_created');
  if (roomId) roomState(roomId);
  return roomId;
}

/** 有人入座。 */
function trackJoin(roomId) {
  const entry = roomState(roomId);
  entry.joined += 1;
  if (entry.joined >= 2) bump('room_two_seats');
}

/** 载入片源。 */
function trackSource(roomId, platform) {
  const entry = roomState(roomId);
  entry.sourced += 1;
  if (platform) entry.platforms.add(platform);
  bump('source_ready');
  if (platform) bump(`source_ready:${platform}`);
  if (entry.sourced >= 2) bump('room_both_sources');
}

/** 开始播放。 */
function trackPlay(roomId) {
  const entry = roomState(roomId);
  if (!entry.played) {
    entry.played = true;
    bump('room_played');
  }
}

/** 深度播放（北极星指标：真正一起看了）。 */
function trackProgress(roomId, position) {
  const entry = roomState(roomId);
  if (entry.activated) return;
  if (!entry.played) {
    entry.played = true;
    bump('room_played');
  }
  if (position >= PLAY_DEEP_SECONDS) {
    entry.activated = true;
    bump('room_activated');
  }
}

function snapshot() {
  const events = Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1]));
  const rooms = [...funnel.values()];
  const platforms = {};
  for (const room of rooms) {
    for (const platform of room.platforms) {
      platforms[platform] = (platforms[platform] || 0) + 1;
    }
  }

  const created = rooms.length;
  const twoSeats = rooms.filter((room) => room.joined >= 2).length;
  const bothSources = rooms.filter((room) => room.sourced >= 2).length;
  const played = rooms.filter((room) => room.played).length;
  const activated = rooms.filter((room) => room.activated).length;

  const pct = (value, base) => (base > 0 ? Math.round((value / base) * 1000) / 10 : 0);

  return {
    day,
    generatedAt: Date.now(),
    events,
    platforms,
    funnel: {
      created,
      twoSeats,
      bothSources,
      played,
      activated,
      seatRate: pct(twoSeats, created),
      sourceRate: pct(bothSources, twoSeats),
      playRate: pct(played, bothSources),
      activationRate: pct(activated, played),
      overallActivation: pct(activated, created),
    },
  };
}

function filePath(forDay = day) {
  return path.join(DATA_DIR, `stats-${forDay}.json`);
}

function flush() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(filePath(), JSON.stringify(snapshot(), null, 2), 'utf8');
  } catch {
    // 统计失败不能影响服务
  }
}

function rollDay() {
  const now = today();
  if (now === day) return;
  flush();
  day = now;
  counts = new Map();
  funnel = new Map();
}

const timer = setInterval(() => {
  rollDay();
  flush();
}, FLUSH_MS);
timer.unref();

process.on('exit', flush);

module.exports = {
  track,
  trackRoomCreated,
  trackJoin,
  trackSource,
  trackPlay,
  trackProgress,
  snapshot,
  flush,
};
