const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR);

app.use(cors());
app.use(express.json());
app.use('/screenshots', express.static(SCREENSHOT_DIR));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'viewlab-pro.html'));
});

// Common Chrome paths on Windows, Mac, Linux
function findChrome() {
  const candidates = [
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    // Windows - Edge (fallback)
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    // Mac
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p; } catch(e) {}
  }
  return null;
}

// SCREENSHOT
app.post('/screenshot', async (req, res) => {
  const { url, width, height, deviceName } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url' });

  let puppeteer;
  try { puppeteer = require('puppeteer'); } catch(e) {
    return res.status(500).json({ error: 'Puppeteer not found. Run: npm install puppeteer' });
  }

  const executablePath = findChrome();
  if (!executablePath) {
    return res.status(500).json({ error: 'Chrome not found on this machine. Please install Google Chrome.' });
  }

  console.log('Using Chrome at:', executablePath);

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--disable-features=IsolateOrigins,site-per-process']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: parseInt(width) || 375, height: parseInt(height) || 812 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });

    const safe = (deviceName || 'device').replace(/[^a-z0-9]/gi, '_');
    const filename = `${safe}_${width}x${height}_${Date.now()}.png`;
    const filepath = path.join(SCREENSHOT_DIR, filename);

    await page.screenshot({ path: filepath, fullPage: false });
    await browser.close();

    console.log('📷 Screenshot saved:', filename);
    res.json({ success: true, filename, url: `http://localhost:${PORT}/screenshots/${filename}`, localPath: filepath });

  } catch(err) {
    if (browser) await browser.close().catch(() => {});
    console.error('Screenshot error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// LIST
app.get('/screenshots-list', (req, res) => {
  try {
    const files = fs.readdirSync(SCREENSHOT_DIR)
      .filter(f => f.endsWith('.png'))
      .sort((a, b) => fs.statSync(path.join(SCREENSHOT_DIR, b)).mtime - fs.statSync(path.join(SCREENSHOT_DIR, a)).mtime)
      .map(f => ({
        filename: f,
        url: `http://localhost:${PORT}/screenshots/${f}`,
        time: fs.statSync(path.join(SCREENSHOT_DIR, f)).mtime
      }));
    res.json(files);
  } catch(e) { res.json([]); }
});

// DELETE
app.delete('/screenshots/:filename', (req, res) => {
  const fp = path.join(SCREENSHOT_DIR, req.params.filename);
  if (fs.existsSync(fp)) { fs.unlinkSync(fp); res.json({ success: true }); }
  else res.status(404).json({ error: 'Not found' });
});

// PROXY
app.use('/proxy', (req, res) => {
  let target = req.query.url;
  if (!target) return res.status(400).send('Missing ?url=');
  if (!/^https?:\/\//i.test(target)) target = 'https://' + target;

  const proxy = createProxyMiddleware({
    target, changeOrigin: true, selfHandleResponse: true,
    on: {
      proxyRes(proxyRes, req, res) {
        delete proxyRes.headers['x-frame-options'];
        delete proxyRes.headers['content-security-policy'];
        delete proxyRes.headers['X-Frame-Options'];
        delete proxyRes.headers['Content-Security-Policy'];
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      },
      error(err, req, res) { res.status(500).send('Proxy error: ' + err.message); }
    },
    pathRewrite: { '^/proxy': '' },
  });

  proxy(req, res, (err) => { if (err) res.status(500).send('Failed: ' + err.message); });
});

app.listen(PORT, () => {
  const chrome = findChrome();
  console.log(`\n✅  ViewLab running at http://localhost:${PORT}`);
  console.log(`📁  Screenshots folder: ${SCREENSHOT_DIR}`);
  console.log(`🌐  Chrome detected: ${chrome || '❌ NOT FOUND - install Google Chrome'}\n`);
});
