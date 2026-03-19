# ViewLab Pro — Responsive Viewport Tester
## Setup & Run (3 steps)

### Prerequisites
- [Node.js](https://nodejs.org) installed (v16 or above)

---

### Step 1 — Install dependencies
Open this folder in terminal / command prompt and run:
```
npm install
```

### Step 2 — Start the proxy server
**Windows:**
```
start.bat
```
Or manually:
```
node proxy.js
```

**Mac / Linux:**
```
node proxy.js
```

### Step 3 — Open in browser
Go to: **http://localhost:3000**

---

## How it works
- A local Express proxy server runs on port 3000
- It strips `X-Frame-Options` and `Content-Security-Policy` headers from all proxied responses
- This allows ANY website to load inside iframes in the tester

## Usage
1. Enter any URL (e.g. `google.com`) in the URL bar
2. Select devices from toolbar or side panel
3. Click **Load** — all devices will show the website!

## Troubleshooting
- **Port in use?** Edit `proxy.js` and change `PORT = 3000` to another port like `3001`
- **Site not loading?** Some sites use JavaScript-based frame detection — the proxy can't bypass that
- **HTTPS errors?** The proxy handles HTTP and HTTPS automatically
