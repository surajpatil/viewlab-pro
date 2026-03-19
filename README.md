# ⊞ ViewLab Pro — Responsive Viewport Tester

> Test your websites across multiple device viewports simultaneously — like Responsively App, but running locally in your browser.

![Node.js](https://img.shields.io/badge/Node.js-v16%2B-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)
![Puppeteer](https://img.shields.io/badge/Puppeteer-Screenshots-40B5A4?style=flat-square&logo=puppeteer&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)

---

## ✨ Features

- 📱 **15+ Device Presets** — iPhone SE, iPhone 14, Galaxy S23, Pixel 7, iPad Mini, iPad Pro, Laptop, Desktop, 4K and more
- ⊞ **Multi-Device View** — See all viewports side by side simultaneously
- 📷 **Real Screenshots** — Takes actual screenshots using headless Chrome (Puppeteer)
- 🔄 **Scroll Sync** — Scroll all devices at the same time
- ⟳ **Per-Device Rotate** — Flip portrait ↔ landscape per device
- 🎨 **Custom Viewports** — Add any width × height
- ⊞ **Grid Overlay** — Toggle background grid for alignment
- 🌐 **Proxy Server** — Strips `X-Frame-Options` so ANY website loads in iframes
- 🖥️ **Inspector Panel** — Live device info, zoom, sync status
- 🕶️ **Dark UI** — Clean dark theme built for long sessions

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org) v16 or above
- Google Chrome installed (used for screenshots)

### Step 1 — Clone the repo
```bash
git clone https://github.com/surajpatil/viewlab-pro.git
cd viewlab-pro
```

### Step 2 — Install dependencies
```bash
npm install
npm install puppeteer
```

### Step 3 — Start the server

**Windows:**
```bash
start.bat
```
or
```bash
node proxy.js
```

**Mac / Linux:**
```bash
node proxy.js
```

### Step 4 — Open in browser
```
http://localhost:3000
```

---

## 🎯 How to Use

1. Open `http://localhost:3000`
2. Click **⚡ Load Default Devices** or select devices from toolbar
3. Enter any URL (e.g. `google.com`) in the URL bar
4. Click **▶ Load** — all devices preview simultaneously
5. Click **📷** to take real screenshots saved to `/screenshots` folder

---

## 🗂️ Project Structure

```
viewlab-pro/
├── proxy.js          # Express server + proxy + screenshot API
├── viewlab-pro.html  # Frontend UI
├── package.json
├── start.bat         # Windows one-click start
└── screenshots/      # Auto-created, stores PNG screenshots
```

---

## ⚙️ How It Works

- A local **Express proxy server** runs on port `3000`
- It strips `X-Frame-Options` and `Content-Security-Policy` headers from responses
- This allows **any website** to load inside iframes
- Screenshots are taken using **Puppeteer + your system Chrome** at exact viewport sizes
- Screenshot PNGs are saved to the `/screenshots` folder and viewable in the side panel

---

## 🛠️ Troubleshooting

| Problem | Solution |
|---|---|
| Port already in use | Edit `proxy.js` → change `PORT = 3000` to `3001` |
| Screenshot error | Make sure Google Chrome is installed |
| Site not loading | Some sites use JS-based frame detection the proxy can't bypass |
| `node_modules` missing | Run `npm install` then `npm install puppeteer` |
| Chrome not detected | Check `proxy.js` → `findChrome()` and add your Chrome path |

---

## 👨‍💻 Author

**Suraj Patil** — QA Engineer  
Built for responsive testing and QA workflows.

---

## 📄 License

ISC License — free to use and modify.
