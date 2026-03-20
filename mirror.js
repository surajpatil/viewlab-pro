(function() {
  var isLeader = false;
  var ws = null;
  var lastClickTime = 0;

  function connectWS() {
    ws = new WebSocket('ws://localhost:3000');
    ws.onopen  = function() { console.log('[ViewLab] WS connected, leader='+isLeader); };
    ws.onclose = function() { setTimeout(connectWS, 1000); };
    ws.onerror = function() { setTimeout(connectWS, 2000); };
    ws.onmessage = function(ev) {
      if (isLeader) return;
      try {
        var msg = JSON.parse(ev.data);
        if (msg.type === 'navigate') {
          console.log('[ViewLab] Following ->', msg.url);
          window.location.href = 'http://localhost:3000/proxy?url=' + encodeURIComponent(msg.url);
        }
        if (msg.type === 'scroll') {
          window.scrollTo(msg.x, msg.y);
        }
      } catch(e) {}
    };
  }
  connectWS();

  // Parent sets leader status every 500ms
  window.addEventListener('message', function(ev) {
    if (!ev.data || ev.data.type !== 'setLeader') return;
    var was = isLeader;
    isLeader = ev.data.value;
    if (isLeader !== was) console.log('[ViewLab] isLeader =', isLeader);
  });

  // Leader: intercept link clicks
  document.addEventListener('click', function(ev) {
    if (!isLeader) return;
    var now = Date.now();
    if (now - lastClickTime < 400) return;
    lastClickTime = now;

    var el = ev.target;
    while (el && el.tagName !== 'A') el = el.parentElement;
    if (!el || !el.href) return;

    var href = el.href;
    if (!href || href.indexOf('javascript:') === 0 || href.indexOf('mailto:') === 0) return;
    if (href === window.location.href) return;

    ev.preventDefault();
    ev.stopPropagation();

    // Extract real URL - strip proxy wrapper
    var realUrl = href;
    var m = href.match(/\/proxy\?url=([^&\s]+)/);
    if (m) {
      realUrl = decodeURIComponent(m[1]);
    } else if (href.indexOf('http') !== 0) {
      // relative URL - resolve against original site
      var pageMatch = window.location.href.match(/\/proxy\?url=([^&\s]+)/);
      if (pageMatch) {
        try {
          var base = new URL(decodeURIComponent(pageMatch[1]));
          realUrl = base.origin + (href.indexOf('/') === 0 ? href : '/' + href);
        } catch(e) { realUrl = href; }
      }
    }

    console.log('[ViewLab] Leader click -> ', realUrl);

    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'navigate', url: realUrl }));
    }

    try { window.parent.postMessage({ type: 'urlChange', url: realUrl }, '*'); } catch(e) {}
    window.location.href = 'http://localhost:3000/proxy?url=' + encodeURIComponent(realUrl);

  }, true);

  // Leader: sync scroll
  var scrollTimer;
  window.addEventListener('scroll', function() {
    if (!isLeader) return;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function() {
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'scroll', x: window.scrollX, y: window.scrollY }));
      }
    }, 80);
  }, { passive: true });

  console.log('[ViewLab] Mirror script loaded');
})();
