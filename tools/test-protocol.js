const WebSocket = require('ws');

function waitFor(ws, type, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${type}`)), timeout);
    const onMessage = (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.type === type) {
        clearTimeout(timer);
        ws.off('message', onMessage);
        resolve(message);
      }
    };
    ws.on('message', onMessage);
  });
}

(async () => {
  const create = await fetch('http://localhost:3000/api/rooms', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'A' }),
  }).then((response) => response.json());
  const room = create.roomId;
  const a = new WebSocket(`ws://localhost:3000/ws?room=${room}&clientId=aaaaaaaa-1111&name=${encodeURIComponent('小满')}`);
  const welcomeA = await waitFor(a, 'welcome');
  if (welcomeA.selfId !== 'aaaaaaaa-1111') throw new Error('wrong self id');
  const b = new WebSocket(`ws://localhost:3000/ws?room=${room}&clientId=bbbbbbbb-2222&name=${encodeURIComponent('阿遥')}`);
  const welcomeB = await waitFor(b, 'welcome');
  if (welcomeB.participants.length !== 2) throw new Error('participant count wrong');

  const aState = waitFor(a, 'state');
  a.send(JSON.stringify({ type: 'control', action: 'play', position: 12.5, playing: true }));
  const state = await aState;
  if (state.state.position !== 12.5 || !state.state.playing) throw new Error('state not applied');
  if (state.actor.name !== '小满') throw new Error('actor missing');

  b.send(JSON.stringify({ type: 'file-meta', file: { fingerprint: 'AABBCCDDEEFF0011', size: 1000, duration: 14, name: 'test.webm' } }));
  const participants = await waitFor(a, 'participants');
  const bMeta = participants.participants.find((p) => p.id === 'bbbbbbbb-2222');
  if (!bMeta || bMeta.file.fingerprint !== 'AABBCCDDEEFF0011') throw new Error('file meta missing');

  const checkA = waitFor(a, 'sync-check');
  a.send(JSON.stringify({ type: 'heartbeat', position: 13, playing: true, sentAt: Date.now() }));
  const check = await checkA;
  if (!check.expectedPosition || check.expectedPosition < 12.5) throw new Error('expected position wrong');

  const forceA = waitFor(a, 'force-sync');
  const forceB = waitFor(b, 'force-sync');
  a.send(JSON.stringify({ type: 'request-sync' }));
  await Promise.all([forceA, forceB]);

  const third = new WebSocket(`ws://localhost:3000/ws?room=${room}&clientId=cccccccc-3333&name=${encodeURIComponent('第三人')}`);
  const closed = await new Promise((resolve) => third.on('close', (code, reason) => resolve({ code, reason: reason.toString() })));
  if (closed.code !== 4003) throw new Error(`expected 4003, got ${closed.code}`);

  console.log(JSON.stringify({ room, welcome: welcomeA.selfId, state: state.state, bFile: bMeta.file.name, expected: check.expectedPosition, closeCode: closed.code }, null, 2));
  a.close();
  b.close();
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
