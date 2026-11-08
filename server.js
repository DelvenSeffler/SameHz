'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const ROOM_TTL_MS = 6 * 60 * 60 * 1000;
const DISCONNECT_GRACE_MS = 12 * 1000;
const MAX_PARTICIPANTS = 2;
const MAX_MESSAGE_BYTES = 64 * 1024;

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rooms = new Map();
const createAttempts = new Map();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

function randomRoomId() {
  let id = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i += 1) id += ROOM_ALPHABET[bytes[i] % ROOM_ALPHABET.length];
  return id;
}

function createRoom() {
  let id = randomRoomId();
  while (rooms.has(id)) id = randomRoomId();
  const now = Date.now();
  const room = {
    id,
    createdAt: now,
    lastActive: now,
    participants: new Map(),
    state: {
      playing: false,
      position: 0,
      updatedAt: now,
      revision: 0,
      updatedBy: null,
      updatedByName: null,
    },
    duration: 0,
  };
  rooms.set(id, room);
  return room;
}

function cleanName(value) {
  const name = String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20);
  return name || '神秘影迷';
}

function cleanFileMeta(value) {
  if (!value || typeof value !== 'object') return null;
  const fingerprint = String(value.fingerprint || '').replace(/[^a-fA-F0-9]/g, '').slice(0, 32);
  if (fingerprint.length < 8) return null;
  const size = Number(value.size);
  const duration = Number(value.duration);
  const name = String(value.name || '本地视频')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .slice(0, 120);
  return {
    fingerprint: fingerprint.toUpperCase(),
    size: Number.isFinite(size) && size >= 0 ? Math.round(size) : 0,
    duration: Number.isFinite(duration) && duration > 0 ? Math.round(duration * 100) / 100 : 0,
    name: name || '本地视频',
    updatedAt: Date.now(),
  };
}

function projectPosition(room, at = Date.now()) {
  const state = room.state;
  let position = state.position;
  if (state.playing) {
    position += Math.max(0, at - state.updatedAt) / 1000;
  }
  if (room.duration > 0) position = Math.min(position, room.duration);
  return Math.max(0, Math.round(position * 1000) / 1000);
}

function participantView(participant) {
  return {
    id: participant.id,
    name: participant.name,
    online: Boolean(participant.ws && participant.ws.readyState === WebSocket.OPEN),
    joinedAt: participant.joinedAt,
    file: participant.file,
  };
}

function roomPayload(room) {
  return {
    id: room.id,
    createdAt: room.createdAt,
    duration: room.duration,
    state: room.state,
  };
}

function broadcast(room, payload, { exceptId = null } = {}) {
  let data;
  try {
    data = JSON.stringify(payload);
  } catch {
    return;
  }
  for (const participant of room.participants.values()) {
    if (participant.id === exceptId) continue;
    if (participant.ws && participant.ws.readyState === WebSocket.OPEN) {
      participant.ws.send(data);
    }
  }
}

function send(ws, payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastParticipants(room) {
  const participants = [...room.participants.values()].map(participantView);
  broadcast(room, {
    type: 'participants',
    participants,
    serverTime: Date.now(),
  });
}

function systemEvent(room, text, tone = 'neutral') {
  broadcast(room, {
    type: 'event',
    text,
    tone,
    serverTime: Date.now(),
  });
}

function refreshRoomDuration(room) {
  let duration = 0;
  for (const participant of room.participants.values()) {
    if (participant.file && participant.file.duration > duration) duration = participant.file.duration;
  }
  room.duration = Math.round(duration * 100) / 100;
}

function sanitizePosition(value) {
  const position = Number(value);
  if (!Number.isFinite(position)) return 0;
  return Math.min(24 * 60 * 60, Math.max(0, position));
}

function handleControl(room, participant, message) {
  const action = String(message.action || '');
  if (!['play', 'pause', 'seek', 'ended'].includes(action)) return;

  const now = Date.now();
  let position = sanitizePosition(message.position);
  let playing;
  if (action === 'play') playing = true;
  else if (action === 'pause' || action === 'ended') playing = false;
  else playing = Boolean(message.playing);

  if (action === 'ended' && room.duration > 0) position = room.duration;
  if (room.duration > 0) position = Math.min(position, room.duration);

  room.state = {
    playing,
    position,
    updatedAt: now,
    revision: room.state.revision + 1,
    updatedBy: participant.id,
    updatedByName: participant.name,
  };
  room.lastActive = now;

  broadcast(room, {
    type: 'state',
    state: room.state,
    actor: { id: participant.id, name: participant.name },
    action,
    serverTime: now,
  });
}

function handleFileMeta(room, participant, message) {
  const file = cleanFileMeta(message.file);
  if (!file) return;
  participant.file = file;
  refreshRoomDuration(room);
  room.lastActive = Date.now();
  broadcastParticipants(room);
  broadcast(room, {
    type: 'file-ready',
    actor: { id: participant.id, name: participant.name },
    participant: participantView(participant),
    serverTime: Date.now(),
  });
}

function handleHeartbeat(room, participant, message) {
  const now = Date.now();
  participant.lastSeen = now;
  room.lastActive = now;
  send(participant.ws, {
    type: 'sync-check',
    state: room.state,
    expectedPosition: projectPosition(room, now),
    duration: room.duration,
    serverTime: now,
    echoSentAt: Number(message.sentAt) || null,
    reported: {
      position: sanitizePosition(message.position),
      playing: Boolean(message.playing),
    },
  });
}

function handleResync(room, participant) {
  const now = Date.now();
  room.lastActive = now;
  broadcast(room, {
    type: 'force-sync',
    state: room.state,
    expectedPosition: projectPosition(room, now),
    duration: room.duration,
    actor: { id: participant.id, name: participant.name },
    serverTime: now,
  });
}

function registerSocket(ws, room, participant, name) {
  const existing = room.participants.get(participant.id);
  if (existing && existing.ws && existing.ws !== ws) {
    try {
      existing.ws.close(4001, '该身份已在另一个窗口连接');
    } catch {
      // ignore
    }
  }

  if (participant.disconnectTimer) {
    clearTimeout(participant.disconnectTimer);
    participant.disconnectTimer = null;
  }

  participant.name = name;
  participant.ws = ws;
  participant.lastSeen = Date.now();
  room.lastActive = Date.now();

  send(ws, {
    type: 'welcome',
    selfId: participant.id,
    room: roomPayload(room),
    participants: [...room.participants.values()].map(participantView),
    expectedPosition: projectPosition(room),
    serverTime: Date.now(),
  });

  broadcastParticipants(room);
  systemEvent(room, `${participant.name} 连接了放映室`, 'join');

  ws.isAlive = true;
  ws.messageCount = 0;
  ws.rateWindowStart = Date.now();

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw, isBinary) => {
    if (isBinary) return;
    if (raw.length > MAX_MESSAGE_BYTES) {
      ws.close(1009, '消息过长');
      return;
    }
    const now = Date.now();
    if (now - ws.rateWindowStart > 1000) {
      ws.rateWindowStart = now;
      ws.messageCount = 0;
    }
    ws.messageCount += 1;
    if (ws.messageCount > 40) return;

    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!message || typeof message !== 'object') return;

    if (message.type === 'control') handleControl(room, participant, message);
    else if (message.type === 'file-meta') handleFileMeta(room, participant, message);
    else if (message.type === 'heartbeat') handleHeartbeat(room, participant, message);
    else if (message.type === 'request-sync') handleResync(room, participant);
  });

  ws.on('close', () => {
    if (participant.ws !== ws) return;
    participant.ws = null;
    participant.file = null;
    refreshRoomDuration(room);
    broadcastParticipants(room);
    systemEvent(room, `${participant.name} 暂时离线了`, 'leave');

    participant.disconnectTimer = setTimeout(() => {
      if (participant.ws) return;
      room.participants.delete(participant.id);
      refreshRoomDuration(room);
      broadcastParticipants(room);
      room.lastActive = Date.now();
    }, DISCONNECT_GRACE_MS);
  });

  ws.on('error', () => {
    // Close handling is sufficient.
  });
}

function cleanupRooms() {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.participants.size === 0 && now - room.lastActive > ROOM_TTL_MS) {
      rooms.delete(room.id);
    }
  }
  for (const [ip, attempts] of createAttempts.entries()) {
    const recent = attempts.filter((time) => now - time < 60 * 1000);
    if (recent.length) createAttempts.set(ip, recent);
    else createAttempts.delete(ip);
  }
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

function parseJsonBody(req, limitBytes = 8 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('请求体过大'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('JSON 格式错误'));
      }
    });
    req.on('error', reject);
  });
}

async function handleApi(req, res, pathname) {
  if (req.method === 'POST' && pathname === '/api/rooms') {
    const ip = String(req.socket.remoteAddress || 'unknown');
    const now = Date.now();
    const attempts = (createAttempts.get(ip) || []).filter((time) => now - time < 60 * 1000);
    if (attempts.length >= 12) {
      sendJson(res, 429, { error: '创建得太频繁了，请稍后再试' });
      return true;
    }
    attempts.push(now);
    createAttempts.set(ip, attempts);

    let body = {};
    try {
      body = await parseJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: error.message });
      return true;
    }
    const room = createRoom();
    sendJson(res, 201, {
      roomId: room.id,
      roomUrl: `/room/${room.id}`,
      name: cleanName(body.name),
    });
    return true;
  }

  const roomMatch = pathname.match(/^\/api\/rooms\/([A-Za-z0-9]{6})$/);
  if (req.method === 'GET' && roomMatch) {
    const room = rooms.get(roomMatch[1].toUpperCase());
    if (!room) {
      sendJson(res, 404, { exists: false, error: '房间不存在或已结束' });
      return true;
    }
    sendJson(res, 200, {
      exists: true,
      roomId: room.id,
      participants: room.participants.size,
      capacity: MAX_PARTICIPANTS,
      online: [...room.participants.values()].filter(
        (participant) => participant.ws && participant.ws.readyState === WebSocket.OPEN,
      ).length,
    });
    return true;
  }

  return false;
}

function safeStaticPath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const relative = decoded.replace(/^\/+/, '');
  const absolute = path.resolve(PUBLIC_DIR, relative);
  if (!absolute.startsWith(PUBLIC_DIR + path.sep) && absolute !== PUBLIC_DIR) return null;
  return absolute;
}

function serveFile(req, res, filePath) {
  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 · 这里没有放映中的电影');
      return;
    }
    const extension = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extension] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Cache-Control': extension === '.html' ? 'no-store' : 'public, max-age=60',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(filePath)
      .on('error', () => res.destroy())
      .pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  let pathname;
  try {
    pathname = new URL(req.url, 'http://localhost').pathname;
  } catch {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }

  if (pathname === '/health') {
    sendJson(res, 200, { ok: true, rooms: rooms.size, uptime: process.uptime() });
    return;
  }

  if (pathname.startsWith('/api/')) {
    try {
      const handled = await handleApi(req, res, pathname);
      if (!handled) sendJson(res, 404, { error: '接口不存在' });
    } catch (error) {
      console.error('[api]', error);
      if (!res.headersSent) sendJson(res, 500, { error: '服务器开小差了' });
    }
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end('Method Not Allowed');
    return;
  }

  if (pathname === '/') {
    serveFile(req, res, path.join(PUBLIC_DIR, 'index.html'));
    return;
  }

  if (/^\/room\/[A-Za-z0-9]{6}\/?$/.test(pathname)) {
    serveFile(req, res, path.join(PUBLIC_DIR, 'room.html'));
    return;
  }

  const filePath = safeStaticPath(pathname);
  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  serveFile(req, res, filePath);
});

const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });

server.on('upgrade', (req, socket, head) => {
  let url;
  try {
    url = new URL(req.url, 'http://localhost');
  } catch {
    socket.destroy();
    return;
  }
  if (url.pathname !== '/ws') {
    socket.destroy();
    return;
  }

  const roomId = String(url.searchParams.get('room') || '').toUpperCase();
  const room = rooms.get(roomId);
  const name = cleanName(url.searchParams.get('name'));
  let clientId = String(url.searchParams.get('clientId') || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  if (clientId.length < 8) clientId = crypto.randomUUID();

  wss.handleUpgrade(req, socket, head, (ws) => {
    if (!room) {
      ws.close(4004, '房间不存在或已结束');
      return;
    }

    let participant = room.participants.get(clientId);
    if (!participant) {
      if (room.participants.size >= MAX_PARTICIPANTS) {
        ws.close(4003, '放映室已满');
        return;
      }
      participant = {
        id: clientId,
        name,
        ws: null,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        file: null,
        disconnectTimer: null,
      };
      room.participants.set(clientId, participant);
    }

    registerSocket(ws, room, participant, name);
  });
});

const heartbeatTimer = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch {
      // ignore
    }
  }
}, 30 * 1000);

const cleanupTimer = setInterval(cleanupRooms, 60 * 1000);

function shutdown() {
  clearInterval(heartbeatTimer);
  clearInterval(cleanupTimer);
  for (const room of rooms.values()) {
    for (const participant of room.participants.values()) {
      if (participant.disconnectTimer) clearTimeout(participant.disconnectTimer);
      if (participant.ws) {
        try {
          participant.ws.close(1001, '服务器正在重启');
        } catch {
          // ignore
        }
      }
    }
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2500).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('uncaughtException', (error) => console.error('[uncaught]', error));
process.on('unhandledRejection', (error) => console.error('[unhandled]', error));

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  ┌───────────────────────────────────────────┐');
  console.log('  │  同频 · 私人同步放映室                    │');
  console.log('  └───────────────────────────────────────────┘');
  console.log(`  本机访问   http://localhost:${PORT}`);
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        console.log(`  局域网访问 http://${entry.address}:${PORT}`);
      }
    }
  }
  console.log('');
});
