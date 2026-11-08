const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(30);
    let mimeType = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1500000 });
    const chunks = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    const stopped = new Promise((resolve) => { recorder.onstop = resolve; });
    recorder.start(200);
    const started = performance.now();
    function draw(now) {
      const elapsed = (now - started) / 1000;
      const hue = 18 + Math.sin(elapsed * 0.7) * 12;
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, `hsl(${hue}, 60%, 18%)`);
      gradient.addColorStop(0.55, '#0d0b0a');
      gradient.addColorStop(1, '#050505');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const glow = ctx.createRadialGradient(620, 200, 10, 620, 200, 320);
      glow.addColorStop(0, 'rgba(255,170,100,0.58)');
      glow.addColorStop(1, 'rgba(255,170,100,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(8,7,6,0.9)';
      ctx.beginPath();
      ctx.ellipse(470, 590, 170, 280, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(570, 610, 195, 280, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f4ecdf';
      ctx.font = '500 25px Georgia, serif';
      ctx.fillText('TÓNGPÍN  ·  TEST SCREENING', 54, 74);
      ctx.font = '400 68px Georgia, serif';
      ctx.fillText('A FILM FOR TWO', 54, 272);
      ctx.fillStyle = 'rgba(244,236,223,0.62)';
      ctx.font = '400 22px monospace';
      ctx.fillText(`00:${String(Math.floor(elapsed)).padStart(2, '0')}  ·  SYNCHRONIZED PLAYBACK`, 58, 322);
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.beginPath();
      ctx.moveTo(54, 470);
      ctx.lineTo(906, 470);
      ctx.stroke();
      ctx.fillStyle = '#ff6a4d';
      ctx.fillRect(54, 466, 852 * (elapsed / 14), 8);
      ctx.fillStyle = '#f4ecdf';
      ctx.font = '400 16px monospace';
      ctx.fillText(String(Math.floor(elapsed)).padStart(2, '0'), 880, 458);
      if (elapsed < 14) requestAnimationFrame(draw);
      else { recorder.stop(); stream.getTracks().forEach((track) => track.stop()); }
    }
    requestAnimationFrame(draw);
    await stopped;
    const blob = new Blob(chunks, { type: 'video/webm' });
    const buffer = await blob.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    return btoa(binary);
  });
  const out = path.resolve('test/sample.webm');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(base64, 'base64'));
  console.log('wrote', out, fs.statSync(out).size, 'bytes');
  await browser.close();
})();
