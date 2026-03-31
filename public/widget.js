/**
 * ORQO Widget Loader — v1
 * Usage: <script src="https://dashboard.orqo.io/widget.js" data-key="orqo_xxx" data-agent-id="..." data-agent-token="..." async></script>
 */
(function () {
  'use strict';

  // ── Read API key from script tag ─────────────────────────────────────────
  var scripts = document.querySelectorAll('script[data-key]');
  var scriptTag = scripts[scripts.length - 1];
  var apiKey = scriptTag ? scriptTag.getAttribute('data-key') : '';
  var scriptAgentId = scriptTag ? (scriptTag.getAttribute('data-agent-id') || '') : '';
  var scriptAgentToken = scriptTag ? (scriptTag.getAttribute('data-agent-token') || '') : '';
  if (!apiKey) { console.warn('[ORQO] data-key not set'); return; }

  var API_BASE = 'https://dashboard.orqo.io';

  // ── CSS ──────────────────────────────────────────────────────────────────
  var css = `
:root { --orqo-acc:#2CB978; --orqo-g00:#060908; --orqo-g01:#0B100D; --orqo-g02:#111812; --orqo-g06:#B4C4BC; --orqo-g07:#E9EDE9; --orqo-g08:#F5F5F2; }
#orqo-w { position:fixed; bottom:2rem; right:2rem; z-index:2147483647; display:flex; flex-direction:column; align-items:flex-end; gap:1rem; pointer-events:none; font-family:system-ui,sans-serif; }
#orqo-w *,#orqo-w *::before,#orqo-w *::after { box-sizing:border-box; margin:0; padding:0; }
#orqo-btn { pointer-events:auto; width:56px; height:56px; border-radius:50%; background:var(--orqo-acc); border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 20px rgba(0,0,0,0.35); transition:transform 0.2s; }
#orqo-btn:hover { transform:scale(1.07); }
#orqo-btn svg { color:#fff; }
#orqo-win { pointer-events:auto; width:370px; height:680px; background:var(--orqo-g01); border:1px solid rgba(233,237,233,0.08); border-radius:18px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 24px 56px rgba(0,0,0,0.6); transform-origin:bottom right; transition:transform 0.28s cubic-bezier(0.34,1.56,0.64,1),opacity 0.2s; }
#orqo-win.o-hide { transform:scale(0.88) translateY(14px); opacity:0; pointer-events:none; }
.o-hd { background:var(--orqo-g02); padding:14px 16px; display:flex; align-items:center; gap:10px; border-bottom:1px solid rgba(233,237,233,0.05); flex-shrink:0; }
.o-hd-av { width:34px; height:34px; border-radius:50%; background:var(--orqo-acc); display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0; }
.o-hd-av img { width:100%; height:100%; object-fit:cover; }
.o-hd-name { font-weight:700; font-size:14px; color:var(--orqo-g08); }
.o-hd-status { font-size:11px; color:var(--orqo-acc); }
.o-hd-close { margin-left:auto; background:none; border:none; cursor:pointer; color:var(--orqo-g06); padding:4px; border-radius:6px; display:flex; align-items:center; justify-content:center; }
.o-hd-close:hover { background:rgba(255,255,255,0.06); }
.o-msgs { flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:10px; }
.o-bub { max-width:82%; padding:9px 13px; border-radius:14px; font-size:13.5px; line-height:1.55; }
.o-bub.bot { background:var(--orqo-g02); color:var(--orqo-g07); border-radius:14px 14px 14px 4px; }
.o-bub.usr { background:var(--orqo-acc); color:#fff; margin-left:auto; border-radius:14px 14px 4px 14px; }
.o-inp-area { padding:10px 12px 14px; border-top:1px solid rgba(233,237,233,0.05); background:var(--orqo-g01); flex-shrink:0; }
.o-inp-box { background:var(--orqo-g02); border:1.5px solid rgba(233,237,233,0.08); border-radius:12px; display:flex; align-items:center; gap:6px; padding:6px 8px 6px 12px; }
.o-inp-box:focus-within { border-color:var(--orqo-acc); }
.o-ta { flex:1; background:none; border:none; outline:none; color:var(--orqo-g07); font-size:13px; font-family:inherit; resize:none; min-height:32px; max-height:80px; line-height:1.5; }
.o-ta::placeholder { color:rgba(233,237,233,0.2); }
.o-send { width:34px; height:34px; border-radius:8px; background:var(--orqo-acc); border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.o-send svg { color:#fff; }
.o-pb { text-align:center; padding:5px 0 8px; font-size:10px; color:rgba(233,237,233,0.25); flex-shrink:0; }
.o-pb a { color:inherit; text-decoration:none; }
.o-pb a:hover { color:var(--orqo-acc); }
`;

  function injectCSS(str) {
    var style = document.createElement('style');
    style.textContent = str;
    document.head.appendChild(style);
  }

  // ── HTML ─────────────────────────────────────────────────────────────────
  function buildWidget(cfg) {
    var acc = cfg.accentColor || '#2CB978';
    var title = cfg.title || 'ORQO';
    var subtitle = cfg.subtitle || 'Asistente IA';
    var placeholder = cfg.placeholder || '¿En qué te puedo ayudar?';
    var showBranding = cfg.showBranding !== false;

    var PHOTO_MAP = {
      w1:'https://randomuser.me/api/portraits/women/44.jpg',
      w2:'https://randomuser.me/api/portraits/women/65.jpg',
      w3:'https://randomuser.me/api/portraits/women/90.jpg',
      w4:'https://randomuser.me/api/portraits/women/29.jpg',
      m1:'https://randomuser.me/api/portraits/men/32.jpg',
      m2:'https://randomuser.me/api/portraits/men/43.jpg',
      m3:'https://randomuser.me/api/portraits/men/75.jpg',
      m4:'https://randomuser.me/api/portraits/men/91.jpg',
    };

    var avatarHtml = '';
    if (cfg.iconMode === 'photo' && cfg.agentPhoto) {
      var photoUrl = PHOTO_MAP[cfg.agentPhoto] || cfg.agentPhoto;
      avatarHtml = '<img src="' + photoUrl + '" alt="" />';
    } else {
      avatarHtml = '<svg width="18" height="18" viewBox="0 0 72 72" fill="none"><path d="M52 59.5 A30 30 0 1 1 59.5 52" stroke="#fff" stroke-width="4.5" stroke-linecap="round" fill="none"/><line x1="59.5" y1="52" x2="66" y2="58" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/><circle cx="66" cy="58" r="5" fill="#fff"/></svg>';
    }

    var triggerInner = '';
    if (cfg.iconMode === 'photo' && cfg.agentPhoto) {
      var tPhotoUrl = PHOTO_MAP[cfg.agentPhoto] || cfg.agentPhoto;
      triggerInner = '<img src="' + tPhotoUrl + '" style="width:56px;height:56px;border-radius:50%;object-fit:cover;" alt="" />';
    } else {
      triggerInner = '<svg width="26" height="26" viewBox="0 0 72 72" fill="none"><path d="M52 59.5 A30 30 0 1 1 59.5 52" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" fill="none"/><line x1="59.5" y1="52" x2="66" y2="58" stroke="' + acc + '" stroke-width="4.5" stroke-linecap="round"/><circle cx="66" cy="58" r="5.5" fill="' + acc + '"/></svg>';
    }

    var brandHtml = showBranding
      ? '<div class="o-pb">powered by <a href="https://orqo.io" target="_blank" rel="noopener">orqo.io</a></div>'
      : '';

    var welcomeMsg = cfg.title
      ? '¡Hola! Soy ' + cfg.title + '. ¿En qué puedo ayudarte hoy?'
      : '¡Hola! ¿En qué puedo ayudarte hoy?';

    return '<div id="orqo-w">' +
      '<div id="orqo-win" class="o-hide">' +
        '<div class="o-hd">' +
          '<div class="o-hd-av">' + avatarHtml + '</div>' +
          '<div><div class="o-hd-name">' + esc(title) + '</div><div class="o-hd-status">● En línea</div></div>' +
          '<button class="o-hd-close" id="orqo-close" title="Cerrar"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>' +
        '</div>' +
        '<div class="o-msgs" id="orqo-msgs">' +
          '<div class="o-bub bot">' + esc(welcomeMsg) + '</div>' +
        '</div>' +
        '<div class="o-inp-area">' +
          '<div class="o-inp-box">' +
            '<textarea class="o-ta" id="orqo-ta" placeholder="' + esc(placeholder) + '" rows="1"></textarea>' +
            '<button class="o-send" id="orqo-send"><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 13V3M4 7l4-4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
          '</div>' +
        '</div>' +
        brandHtml +
      '</div>' +
      '<button id="orqo-btn">' + triggerInner + '</button>' +
    '</div>';
  }

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Position ─────────────────────────────────────────────────────────────
  function applyPosition(el, winEl, pos) {
    var isTop = pos.includes('top');
    var isLeft = pos.includes('left');
    var isCenter = pos.includes('center');
    el.style.bottom = isTop ? 'auto' : '2rem';
    el.style.top = isTop ? '2rem' : 'auto';
    el.style.right = (isLeft || isCenter) ? 'auto' : '2rem';
    el.style.left = isLeft ? '2rem' : isCenter ? '50%' : 'auto';
    el.style.alignItems = isLeft ? 'flex-start' : isCenter ? 'center' : 'flex-end';
    el.style.transform = isCenter ? 'translateX(-50%)' : '';
    if (winEl) {
      var vO = isTop ? 'top' : 'bottom';
      var hO = isLeft ? 'left' : isCenter ? 'center' : 'right';
      winEl.style.transformOrigin = vO + ' ' + hO;
    }
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  function boot(cfg) {
    injectCSS(css.replace(/var\(--orqo-acc\)/g, cfg.accentColor || '#2CB978'));

    var wrap = document.createElement('div');
    wrap.innerHTML = buildWidget(cfg);
    document.body.appendChild(wrap.firstChild);

    var widgetEl = document.getElementById('orqo-w');
    var winEl = document.getElementById('orqo-win');
    var btn = document.getElementById('orqo-btn');
    var closeBtn = document.getElementById('orqo-close');
    var ta = document.getElementById('orqo-ta');
    var sendBtn = document.getElementById('orqo-send');
    var msgs = document.getElementById('orqo-msgs');

    var mode = String(cfg.themeMode || 'auto').toLowerCase();
    if (mode === 'auto') {
      mode = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
    }
    if (mode === 'light') {
      var lightSurface = cfg.lightSurface || '#FFFFFF';
      widgetEl.style.setProperty('--orqo-g00', cfg.lightBg || '#F4F7F4');
      widgetEl.style.setProperty('--orqo-g01', lightSurface);
      widgetEl.style.setProperty('--orqo-g02', '#EDF2ED');
      widgetEl.style.setProperty('--orqo-g06', '#527060');
      widgetEl.style.setProperty('--orqo-g07', '#152018');
      widgetEl.style.setProperty('--orqo-g08', '#0B130D');
      // Keep the original light-mode personality from landing: dark-to-light hero gradient.
      winEl.style.background = 'linear-gradient(180deg, #0D1A12 0%, #152018 230px, ' + lightSurface + ' 310px, ' + lightSurface + ' 100%)';
      msgs.style.background = 'transparent';
    } else {
      widgetEl.style.setProperty('--orqo-g00', cfg.darkBg || '#060908');
      widgetEl.style.setProperty('--orqo-g01', cfg.darkSurface || '#0B100D');
      widgetEl.style.setProperty('--orqo-g02', '#111812');
      winEl.style.background = cfg.darkSurface || '#0B100D';
      msgs.style.background = '';
    }

    if (cfg.position && cfg.position !== 'bottom-right') {
      applyPosition(widgetEl, winEl, cfg.position);
    }

    var open = false;
    var remoteLoaded = false;
    function toggle() {
      open = !open;
      winEl.classList.toggle('o-hide', !open);
      if (open && !remoteLoaded) { remoteLoaded = true; loadRemote(); }
    }
    btn.addEventListener('click', toggle);
    closeBtn.addEventListener('click', function() { open = false; winEl.classList.add('o-hide'); });

    function autoResize() {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 80) + 'px';
    }
    ta.addEventListener('input', autoResize);
    ta.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
    });
    sendBtn.addEventListener('click', sendMsg);

    // ── Conversation storage ───────────────────────────────────────────────
    var LS_VISITOR = 'orqo_visitor_id';
    var LS_CONV    = 'orqo_conv_' + (cfg.agentId || 'default');
    var convId     = null;
    var history    = [];
    var syncing    = false;

    // Get or create persistent visitor ID
    function getVisitorId() {
      var id = localStorage.getItem(LS_VISITOR);
      if (!id) {
        id = 'v_' + Math.random().toString(36).slice(2) + '_' + Date.now();
        localStorage.setItem(LS_VISITOR, id);
      }
      return id;
    }
    var visitorId = getVisitorId();

    // Load conversation from localStorage
    function loadLocal() {
      try {
        var raw = localStorage.getItem(LS_CONV);
        if (raw) {
          var saved = JSON.parse(raw);
          history = saved.messages || [];
          convId  = saved.convId || null;
          // Re-render saved messages (skip welcome bubble already shown)
          history.forEach(function(m) {
            addBub(m.role === 'user' ? 'usr' : 'bot', m.content);
          });
        }
      } catch(e) {}
    }

    // Save conversation to localStorage
    function saveLocal() {
      try {
        localStorage.setItem(LS_CONV, JSON.stringify({ messages: history, convId: convId, ts: Date.now() }));
      } catch(e) {}
    }

    // Sync a single message to API (fire and forget)
    function syncMessage(role, content) {
      if (syncing) return;
      syncing = true;
      fetch(API_BASE + '/api/widget/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: visitorId, agentId: cfg.agentId || 'default', role: role, content: content }),
      }).then(function(r) { return r.json(); }).then(function(d) {
        if (d.convId) { convId = d.convId; saveLocal(); }
      }).catch(function() {
        // API failed — message is already in localStorage, will sync later
      }).finally(function() { syncing = false; });
    }

    // Load history from API on open
    function loadRemote() {
      fetch(API_BASE + '/api/widget/conversations?visitorId=' + encodeURIComponent(visitorId) + '&agentId=' + encodeURIComponent(cfg.agentId || 'default'), { cache: 'no-store' })
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (d.messages && d.messages.length > history.length) {
            // Remote has more messages — use remote version
            history = d.messages;
            convId  = d.convId;
            saveLocal();
            // Clear current display and re-render
            msgs.innerHTML = '';
            history.forEach(function(m) {
              addBub(m.role === 'user' ? 'usr' : 'bot', m.content);
            });
          }
        }).catch(function() {});
    }

    // Load local history immediately, then try remote
    loadLocal();
    loadRemote();

    function sendMsg() {
      var text = ta.value.trim();
      if (!text) return;
      ta.value = '';
      autoResize();

      // Add user message
      addBub('usr', text);
      history.push({ role: 'user', content: text, ts: Date.now() });
      saveLocal();
      syncMessage('user', text);

      // Real AI reply from ORQO backend
      fetch(API_BASE + '/api/widget/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: apiKey,
          visitorId: visitorId,
          agentId: cfg.agentId || scriptAgentId || 'default',
          agentToken: cfg.agentToken || scriptAgentToken || '',
          message: text,
          history: history.slice(-12).map(function(m) {
            return { role: m.role === 'user' ? 'user' : 'assistant', content: m.content };
          }),
        }),
      })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        var agentReply = (d && d.reply) ? d.reply : 'No pude generar una respuesta en este momento. Intenta de nuevo.';
        addBub('bot', agentReply);
        history.push({ role: 'agent', content: agentReply, ts: Date.now() });
        saveLocal();
        syncMessage('agent', agentReply);
      })
      .catch(function() {
        var fallback = 'No pude conectar con el motor de IA ahora mismo. Intenta nuevamente en unos segundos.';
        addBub('bot', fallback);
        history.push({ role: 'agent', content: fallback, ts: Date.now() });
        saveLocal();
        syncMessage('agent', fallback);
      });
    }

    function addBub(role, text) {
      var d = document.createElement('div');
      d.className = 'o-bub ' + role;
      d.textContent = text;
      msgs.appendChild(d);
      msgs.scrollTop = msgs.scrollHeight;
    }
  }

  // ── Fetch config & launch ─────────────────────────────────────────────────
  var cfgUrl = API_BASE + '/api/public/widget?key=' + encodeURIComponent(apiKey);
  if (scriptAgentId) cfgUrl += '&agentId=' + encodeURIComponent(scriptAgentId);
  if (scriptAgentToken) cfgUrl += '&agentToken=' + encodeURIComponent(scriptAgentToken);
  fetch(cfgUrl, { cache: 'no-store' })
    .then(function(r) { return r.ok ? r.json() : { active: false }; })
    .then(function(cfg) {
      if (cfg.active === false) return;
      if (!cfg.agentId && scriptAgentId) cfg.agentId = scriptAgentId;
      if (!cfg.agentToken && scriptAgentToken) cfg.agentToken = scriptAgentToken;
      boot(cfg);
    })
    .catch(function() { /* silently fail */ });

})();
