const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');
const { createProxyMiddleware } = require('http-proxy-middleware');
const zlib = require('zlib');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3000;

server.setMaxListeners(100);
process.setMaxListeners(100);

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR);

app.use(cors());
app.use(express.json());
app.use('/screenshots', express.static(SCREENSHOT_DIR));

// ── Serve mirror script as static file ──
app.get('/mirror.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.sendFile(path.join(__dirname, 'mirror.js'));
});

// ── WebSocket hub ──
const clients = new Set();
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('WS connected, total:', clients.size);
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      clients.forEach(c => {
        if (c !== ws && c.readyState === 1) c.send(JSON.stringify(msg));
      });
      if (msg.type === 'navigate') console.log('Mirror navigate ->', msg.url);
      if (msg.type === 'scroll') console.log('Mirror scroll -> x:'+msg.x+' y:'+msg.y);
    } catch(e) {}
  });
  ws.on('close', () => { clients.delete(ws); console.log('WS disconnected, total:', clients.size); });
});

// ── Serve main UI ──
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'viewlab-pro.html')));

// ── Proxy with script injection ──
const INJECT_TAG = '<script src="http://localhost:3000/mirror.js"></script>';

app.use('/proxy', (req, res) => {
  let target = req.query.url;
  if (!target) return res.status(400).send('Missing ?url=');
  if (!/^https?:\/\//i.test(target)) target = 'https://' + target;

  const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    selfHandleResponse: true,
    on: {
      proxyRes(proxyRes, req, res) {
        delete proxyRes.headers['x-frame-options'];
        delete proxyRes.headers['X-Frame-Options'];
        delete proxyRes.headers['content-security-policy'];
        delete proxyRes.headers['Content-Security-Policy'];
        res.setHeader('Access-Control-Allow-Origin', '*');

        const ct = proxyRes.headers['content-type'] || '';
        const enc = proxyRes.headers['content-encoding'] || '';

        if (!ct.includes('text/html')) {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res);
          return;
        }

        let chunks = [];
        proxyRes.on('data', c => chunks.push(c));
        proxyRes.on('end', () => {
          const buf = Buffer.concat(chunks);
          const done = (decoded) => {
            let html = decoded.toString('utf-8');
            if (html.includes('</body>')) {
              html = html.replace(/<\/body>/i, INJECT_TAG + '</body>');
            } else {
              html += INJECT_TAG;
            }
            const out = Buffer.from(html, 'utf-8');
            const headers = Object.assign({}, proxyRes.headers);
            delete headers['content-encoding'];
            headers['content-length'] = out.length;
            headers['content-type'] = 'text/html; charset=utf-8';
            res.writeHead(proxyRes.statusCode, headers);
            res.end(out);
          };

          if (enc.includes('gzip')) {
            zlib.gunzip(buf, (err, d) => done(err ? buf : d));
          } else if (enc.includes('br')) {
            zlib.brotliDecompress(buf, (err, d) => done(err ? buf : d));
          } else if (enc.includes('deflate')) {
            zlib.inflate(buf, (err, d) => done(err ? buf : d));
          } else {
            done(buf);
          }
        });
      },
      error(err, req, res) {
        console.error('Proxy error:', err.message, '| url:', req.query && req.query.url);
        try { res.status(500).send('Proxy error: ' + err.message); } catch(e) {}
      }
    },
    pathRewrite: { '^/proxy': '' },
  });

  proxy(req, res, (err) => { if (err) res.status(500).send('Failed: ' + err.message); });
});

// ── Screenshots ──
function findChrome() {
  const list = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    (process.env.LOCALAPPDATA || '') + '\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
  ];
  for (const p of list) { try { if (fs.existsSync(p)) return p; } catch(e) {} }
  return null;
}

app.post('/screenshot', async (req, res) => {
  const { url, width, height, deviceName } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url' });
  let puppeteer;
  try { puppeteer = require('puppeteer'); } catch(e) { return res.status(500).json({ error: 'npm install puppeteer' }); }
  const executablePath = findChrome();
  if (!executablePath) return res.status(500).json({ error: 'Chrome not found' });
  let browser;
  try {
    browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-web-security'] });
    const page = await browser.newPage();
    await page.setViewport({ width: parseInt(width)||375, height: parseInt(height)||812 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    const safe = (deviceName||'device').replace(/[^a-z0-9]/gi,'_');
    const filename = safe+'_'+width+'x'+height+'_'+Date.now()+'.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename) });
    await browser.close();
    res.json({ success:true, filename, url:'http://localhost:'+PORT+'/screenshots/'+filename });
  } catch(err) {
    if (browser) await browser.close().catch(()=>{});
    res.status(500).json({ error: err.message });
  }
});

app.get('/screenshots-list', (req, res) => {
  try {
    const files = fs.readdirSync(SCREENSHOT_DIR).filter(f=>f.endsWith('.png'))
      .sort((a,b)=>fs.statSync(path.join(SCREENSHOT_DIR,b)).mtime-fs.statSync(path.join(SCREENSHOT_DIR,a)).mtime)
      .map(f=>({ filename:f, url:'http://localhost:'+PORT+'/screenshots/'+f, time:fs.statSync(path.join(SCREENSHOT_DIR,f)).mtime }));
    res.json(files);
  } catch(e) { res.json([]); }
});

app.delete('/screenshots/:filename', (req, res) => {
  const fp = path.join(SCREENSHOT_DIR, req.params.filename);
  if (fs.existsSync(fp)) { fs.unlinkSync(fp); res.json({success:true}); }
  else res.status(404).json({error:'Not found'});
});

server.listen(PORT, () => {
  console.log('\n✅  ViewLab running at http://localhost:'+PORT);
  console.log('📁  Screenshots: '+SCREENSHOT_DIR);
  console.log('🌐  Chrome: '+(findChrome()||'❌ Not found')+'\n');
});
