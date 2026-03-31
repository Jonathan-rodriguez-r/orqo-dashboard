/*
 * ORQO Web Widget (Full Experience - parity with landing index)
 */
(function () {
  'use strict';

  var scripts = document.querySelectorAll('script[data-key]');
  var scriptTag = scripts[scripts.length - 1];
  var apiKey = scriptTag ? (scriptTag.getAttribute('data-key') || '').trim() : '';
  var scriptAgentId = scriptTag ? (scriptTag.getAttribute('data-agent-id') || '').trim() : '';
  var scriptAgentToken = scriptTag ? (scriptTag.getAttribute('data-agent-token') || '').trim() : '';

  if (!apiKey) {
    console.warn('[ORQO] data-key not set');
    return;
  }

  var API_BASE = 'https://dashboard.orqo.io';
  try {
    if (scriptTag && scriptTag.src) {
      var srcUrl = new URL(scriptTag.src, window.location.href);
      API_BASE = srcUrl.origin || API_BASE;
    }
  } catch (_) {}

  function ensureFont(href) {
    var exists = Array.prototype.some.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) {
      return String(l.getAttribute('href') || '').indexOf(href) >= 0;
    });
    if (!exists) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  }

  ensureFont('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Figtree:wght@300;400;500;600&family=DM+Mono:wght@300;400&display=swap');

  var style = document.createElement('style');
  style.id = 'orqo-widget-style';
  style.textContent = "#orqo-widget {\n  --g00:#060908;\n  --g01:#0B100D;\n  --g02:#111812;\n  --g03:#1D2920;\n  --g04:#2E4038;\n  --g05:#7A9488;\n  --g06:#B4C4BC;\n  --g07:#E9EDE9;\n  --g08:#F5F5F2;\n  --acc:#2CB978;\n  --acc-g:rgba(44,185,120,0.10);\n  --f-disp:'Syne',sans-serif;\n  --f-body:'Figtree',sans-serif;\n  --f-mono:'DM Mono',monospace;\n  font-family: var(--f-body);\n}\n/* ══ WIDGET (embed) ══ */\r\n#orqo-widget {\r\n  position: fixed; bottom: 2rem; right: 2rem;\r\n  display: flex; flex-direction: column; align-items: flex-end; gap: 1rem;\r\n  z-index: 9999;\r\n  pointer-events: none; /* el contenedor no bloquea clicks */\r\n}\r\n#orqo-window, #orqo-trigger { pointer-events: auto; }\r\n#orqo-trigger {\r\n  width: 58px; height: 58px; border-radius: 50%;\r\n  background: var(--g02);\r\n  border: 1px solid rgba(44,185,120,0.3);\r\n  cursor: pointer; outline: none;\r\n  display: flex; align-items: center; justify-content: center;\r\n  box-shadow: 0 4px 24px rgba(0,0,0,0.55), 0 0 0 0 rgba(44,185,120,0.3);\r\n  transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), border-color 0.2s, box-shadow 0.2s;\r\n  position: relative;\r\n}\r\n#orqo-trigger:hover {\r\n  transform: scale(1.08);\r\n  border-color: rgba(44,185,120,0.55);\r\n  box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(44,185,120,0.14);\r\n}\r\n#orqo-trigger.open { transform: rotate(90deg) scale(0.9); }\r\n.t-pulse {\r\n  position: absolute; inset: -4px; border-radius: 50%;\r\n  border: 1px solid rgba(44,185,120,0.25);\r\n  animation: tPulse 3s ease-out infinite;\r\n}\r\n.t-pulse.p2 { animation-delay: 1.5s; }\r\n@keyframes tPulse {\r\n  0%   { transform: scale(1); opacity: 0.7; }\r\n  100% { transform: scale(1.6); opacity: 0; }\r\n}\r\n.t-badge {\r\n  position: absolute; top: 1px; right: 1px;\r\n  width: 16px; height: 16px; border-radius: 50%;\r\n  background: var(--acc); border: 2px solid var(--g00);\r\n  font-family: var(--f-mono); font-size: 0.44rem; font-weight: 600;\r\n  color: var(--g00);\r\n  display: flex; align-items: center; justify-content: center;\r\n}\r\n#orqo-window {\r\n  width: 385px; height: 714px;\r\n  background: var(--g01);\r\n  border: 1px solid rgba(233,237,233,0.08);\r\n  border-radius: 20px; overflow: hidden;\r\n  display: flex; flex-direction: column;\r\n  box-shadow: 0 28px 64px rgba(0,0,0,0.65), 0 0 0 1px rgba(44,185,120,0.04);\r\n  transform-origin: bottom right;\r\n  transition:\r\n    width 0.38s cubic-bezier(0.4,0,0.2,1),\r\n    height 0.38s cubic-bezier(0.4,0,0.2,1),\r\n    transform 0.32s cubic-bezier(0.34,1.56,0.64,1),\r\n    opacity 0.25s ease,\r\n    border-radius 0.38s ease;\r\n}\r\n#orqo-window.w-hidden {\r\n  transform: scale(0.88) translateY(16px);\r\n  opacity: 0; pointer-events: none;\r\n}\r\n#orqo-window.w-max {\r\n  width: min(740px, 94vw);\r\n  height: min(88vh, 860px);\r\n  border-radius: 16px;\r\n}\r\n@media (max-width: 768px) {\r\n  #orqo-widget { right: 1rem; bottom: 1.25rem; }\r\n  #orqo-window {\r\n    position: fixed !important;\r\n    inset: 0 !important;\r\n    width: 100% !important;\r\n    height: 100dvh !important;\r\n    max-height: 100dvh !important;\r\n    border-radius: 0 !important;\r\n  }\r\n  /* Trigger oculto cuando el widget está abierto */\r\n  #orqo-trigger.open { opacity: 0 !important; pointer-events: none !important; }\r\n  /* En móvil fullscreen, w-max no cambia dimensiones */\r\n  #orqo-window.w-max {\r\n    width: 100% !important;\r\n    height: 100dvh !important;\r\n    border-radius: 0 !important;\r\n  }\r\n}\r\n.w-header {\r\n  display: flex; align-items: center; justify-content: space-between;\r\n  padding: 0.9rem 1.1rem;\r\n  background: var(--g02);\r\n  border-bottom: 1px solid rgba(233,237,233,0.06);\r\n  flex-shrink: 0;\r\n}\r\n.w-hd-left { display: flex; align-items: center; gap: 0.55rem; }\r\n.w-brand {\r\n  font-family: var(--f-disp); font-weight: 800;\r\n  font-size: 0.95rem; letter-spacing: -0.04em; color: var(--g08);\r\n}\r\n.w-online {\r\n  display: flex; align-items: center; gap: 0.3rem;\r\n  font-family: var(--f-body); font-size: 0.72rem; font-weight: 700;\r\n  letter-spacing: 0.04em; text-transform: uppercase;\r\n  color: var(--g05); opacity: 0.9;\r\n}\r\n.w-online-dot {\r\n  width: 5px; height: 5px; border-radius: 50%;\r\n  background: var(--acc);\r\n  animation: onlinePulse 2s ease-in-out infinite;\r\n}\r\n@keyframes onlinePulse {\r\n  0%, 100% { opacity: 1; }\r\n  50%       { opacity: 0.35; }\r\n}\r\n.w-hd-right { display: flex; align-items: center; gap: 0.2rem; }\r\n.w-hbtn {\r\n  width: 28px; height: 28px; border-radius: 7px;\r\n  border: none; background: transparent; cursor: pointer;\r\n  display: flex; align-items: center; justify-content: center;\r\n  color: rgba(233,237,233,0.28);\r\n  transition: background 0.15s, color 0.15s;\r\n}\r\n.w-hbtn:hover { background: rgba(233,237,233,0.07); color: rgba(233,237,233,0.7); }\r\n.w-backbar {\r\n  display: none; align-items: center; gap: 0.5rem;\r\n  padding: 0.55rem 1.1rem;\r\n  background: var(--g02);\r\n  border-bottom: 1px solid rgba(233,237,233,0.04);\r\n  flex-shrink: 0;\r\n}\r\n.w-backbar.vis { display: flex; }\r\n.w-back-btn {\r\n  display: flex; align-items: center; gap: 0.35rem;\r\n  background: none; border: none; cursor: pointer;\r\n  font-family: var(--f-body); font-size: 0.78rem;\r\n  color: var(--g05); transition: color 0.15s; padding: 0;\r\n}\r\n.w-back-btn:hover { color: var(--acc); }\r\n.w-backbar-title {\r\n  font-family: var(--f-body); font-size: 0.8rem;\r\n  color: var(--g07); font-weight: 500;\r\n  margin-left: 0.15rem;\r\n}\r\n.w-body { flex: 1; overflow: hidden; position: relative; }\r\n.w-screen {\r\n  position: absolute; inset: 0;\r\n  overflow-y: auto; overflow-x: hidden;\r\n  opacity: 0; transform: translateX(18px);\r\n  transition: opacity 0.22s ease, transform 0.22s ease;\r\n  pointer-events: none;\r\n}\r\n.w-screen.active { opacity: 1; transform: translateX(0); pointer-events: all; }\r\n.w-screen::-webkit-scrollbar { width: 3px; }\r\n.w-screen::-webkit-scrollbar-track { background: transparent; }\r\n.w-screen::-webkit-scrollbar-thumb { background: var(--g03); border-radius: 3px; }\r\n.w-tabs {\r\n  display: flex;\r\n  border-top: 1px solid rgba(233,237,233,0.06);\r\n  background: var(--g02); flex-shrink: 0;\r\n}\r\n.w-tab {\r\n  flex: 1; padding: 0.84rem 0 0.68rem;\r\n  background: none; border: none; cursor: pointer;\r\n  display: flex; flex-direction: column; align-items: center; gap: 0.3rem;\r\n  color: rgba(233,237,233,0.22);\r\n  transition: color 0.18s;\r\n  position: relative;\r\n}\r\n.w-tab svg { width: 20px; height: 20px; }\r\n.w-tab:hover { color: rgba(233,237,233,0.5); }\r\n.w-tab.active { color: var(--acc); }\r\n.w-tab.active::before {\r\n  content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%);\r\n  width: 22px; height: 2px; border-radius: 0 0 3px 3px; background: var(--acc);\r\n}\r\n.tab-lbl { font-family: var(--f-body); font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }\r\n/* Active tab: icon fills with green, stroke matches */\r\n.w-tab.active svg path,\r\n.w-tab.active svg circle:not([fill=\"none\"]) { fill: currentColor; }\r\n.w-tab.active svg rect { fill: currentColor; }\r\n.tab-dot {\r\n  position: absolute; top: 0.55rem; right: calc(50% - 16px);\r\n  width: 7px; height: 7px; border-radius: 50%;\r\n  background: var(--acc); border: 1.5px solid var(--g02);\r\n}\r\n/* ══ HOME SCREEN GRADIENT (scrolls with content via local attachment) ══ */\r\n#screen-home {\r\n  background: linear-gradient(180deg,\r\n    #2E4535 0%, #1E2D20 250px, var(--g01) 330px, var(--g01) 100%);\r\n  background-attachment: local;\r\n}\r\n#orqo-widget[data-theme=\"light\"] #screen-home {\r\n  background: linear-gradient(180deg,\r\n    #0D1A12 0%, #152018 230px, var(--g01) 310px, var(--g01) 100%);\r\n  background-attachment: local;\r\n}\r\n/* Other screens need solid bg */\r\n#screen-chat, #screen-messages, #screen-disclaimer, #screen-help, #screen-article {\r\n  background: var(--g01);\r\n}\r\n/* Light mode: text on dark hero bg */\r\n#orqo-widget[data-theme=\"light\"] #screen-home .h-title { color: #E9EDE9; }\r\n#orqo-widget[data-theme=\"light\"] #screen-home .h-sub { color: rgba(233,237,233,0.6); }\r\n#orqo-widget[data-theme=\"light\"] #screen-home .h-iso-ring {\r\n  background: rgba(44,185,120,0.25);\r\n  border-color: rgba(44,185,120,0.45);\r\n}\r\n#orqo-widget[data-theme=\"light\"] #screen-home .h-iso-ring::before { border-color: rgba(44,185,120,0.12); }\r\n.h-hero { padding: 2rem 1.5rem 1.25rem; text-align: center; }\r\n.h-iso-ring {\r\n  width: 62px; height: 62px; border-radius: 50%;\r\n  background: var(--acc-g); border: 1px solid rgba(44,185,120,0.2);\r\n  display: flex; align-items: center; justify-content: center;\r\n  margin: 0 auto 1.1rem; position: relative;\r\n}\r\n.h-iso-ring::before {\r\n  content: ''; position: absolute; inset: -7px; border-radius: 50%;\r\n  border: 1px solid rgba(44,185,120,0.08);\r\n}\r\n.h-title { font-family: var(--f-disp); font-weight: 800; font-size: 2.1rem; letter-spacing: -0.04em; color: var(--g08); margin-bottom: 0.45rem; line-height: 1.05; }\r\n.h-sub { font-family: var(--f-body); font-size: 1.05rem; color: var(--g06); line-height: 1.5; }\r\n.h-actions { padding: 0 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.45rem; }\r\n.h-action {\r\n  display: flex; align-items: center; gap: 0.7rem;\r\n  padding: 0.8rem 0.9rem;\r\n  background: var(--g02); border: 1px solid rgba(233,237,233,0.06);\r\n  border-radius: 11px; cursor: pointer;\r\n  transition: border-color 0.2s, background 0.2s; text-align: left; width: 100%;\r\n}\r\n.h-action:hover { border-color: rgba(44,185,120,0.25); background: rgba(44,185,120,0.04); }\r\n.h-action-ico {\r\n  width: 42px; height: 42px; border-radius: 11px;\r\n  background: var(--acc-g); border: 1px solid rgba(44,185,120,0.15);\r\n  display: flex; align-items: center; justify-content: center; flex-shrink: 0;\r\n}\r\n.h-action-ico svg { width: 20px; height: 20px; }\r\n.h-action-name { font-family: var(--f-body); font-size: 1rem; color: var(--g07); font-weight: 600; }\r\n.h-action-desc { font-family: var(--f-body); font-size: 0.82rem; color: rgba(233,237,233,0.38); margin-top: 0.15rem; }\r\n.h-arrow { margin-left: auto; color: rgba(233,237,233,0.18); flex-shrink: 0; }\r\n.h-divider { height: 1px; background: rgba(233,237,233,0.05); margin: 0 1.5rem; }\r\n.h-section-lbl { font-family: var(--f-body); font-size: 0.85rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--g06); opacity: 1; padding: 1.1rem 1.5rem 0.55rem; }\r\n.h-recent { padding: 0 0.9rem 1.5rem; }\r\n.h-conv {\r\n  display: flex; align-items: center; gap: 0.65rem;\r\n  padding: 0.75rem 0.7rem; border-radius: 10px; cursor: pointer;\r\n  transition: background 0.15s; margin-bottom: 2px;\r\n}\r\n.h-conv:hover { background: rgba(233,237,233,0.04); }\r\n.h-conv-ico { width: 30px; height: 30px; border-radius: 8px; background: var(--acc-g); border: 1px solid rgba(44,185,120,0.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }\r\n.h-conv-name { font-family: var(--f-body); font-size: 0.95rem; color: var(--g07); font-weight: 700; margin-bottom: 0.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\r\n.h-conv-preview { font-family: var(--f-body); font-size: 0.82rem; color: rgba(233,237,233,0.45); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\r\n.h-conv-time { font-family: var(--f-mono); font-size: 0.44rem; color: rgba(233,237,233,0.18); flex-shrink: 0; margin-left: auto; }\r\n.h-empty { padding: 1.5rem 1.5rem 2rem; text-align: center; font-family: var(--f-body); font-size: 1rem; color: rgba(233,237,233,0.45); }\r\n.m-head { display: flex; align-items: center; justify-content: space-between; padding: 1.4rem 1.4rem 0.9rem; }\r\n.m-title { font-family: var(--f-disp); font-weight: 700; font-size: 1rem; letter-spacing: -0.03em; color: var(--g08); }\r\n.m-new { display: flex; align-items: center; gap: 0.35rem; padding: 0.42rem 0.85rem; background: var(--acc); color: var(--g00); border: none; border-radius: 6px; cursor: pointer; font-family: var(--f-body); font-size: 0.75rem; font-weight: 600; transition: opacity 0.2s; }\r\n.m-new:hover { opacity: 0.85; }\r\n.m-token-bar { margin: 0 1.4rem 1.1rem; padding: 0.85rem 1rem; background: var(--g02); border: 1px solid rgba(233,237,233,0.06); border-radius: 11px; }\r\n.m-tok-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }\r\n.m-tok-lbl { font-family: var(--f-body); font-size: 0.9rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--g06); opacity: 1; }\r\n.m-tok-val { font-family: var(--f-mono); font-size: 1rem; font-weight: 700; color: var(--acc); }\r\n.m-tok-track { height: 3px; background: rgba(233,237,233,0.06); border-radius: 3px; overflow: hidden; }\r\n.m-tok-fill { height: 100%; background: var(--acc); border-radius: 3px; transition: width 0.5s ease; }\r\n.m-list { padding: 0 1rem 1.5rem; }\r\n.m-empty { padding: 3rem 1.5rem; text-align: center; font-family: var(--f-body); font-size: 1rem; color: rgba(233,237,233,0.55); }\r\n.m-item { display: flex; align-items: flex-start; gap: 0.7rem; padding: 0.85rem 0.7rem; border-radius: 10px; cursor: pointer; transition: background 0.15s; margin-bottom: 2px; }\r\n.m-item:hover { background: rgba(233,237,233,0.04); }\r\n.m-item-ico { width: 34px; height: 34px; border-radius: 9px; background: var(--acc-g); border: 1px solid rgba(44,185,120,0.13); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }\r\n.m-item-title { font-family: var(--f-body); font-size: 0.81rem; color: var(--g07); font-weight: 500; margin-bottom: 0.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\r\n.m-item-prev { font-family: var(--f-body); font-size: 0.7rem; color: rgba(233,237,233,0.32); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\r\n.m-item-time { font-family: var(--f-mono); font-size: 0.44rem; color: rgba(233,237,233,0.18); flex-shrink: 0; margin-top: 0.15rem; }\r\n.d-wrap { padding: 1.75rem 1.5rem; display: flex; flex-direction: column; min-height: 100%; }\r\n.d-ico { display: flex; justify-content: center; margin-bottom: 1.3rem; }\r\n.d-ico-ring { width: 54px; height: 54px; border-radius: 50%; background: var(--acc-g); border: 1px solid rgba(44,185,120,0.25); display: flex; align-items: center; justify-content: center; }\r\n.d-title { font-family: var(--f-disp); font-weight: 700; font-size: 1rem; letter-spacing: -0.02em; color: var(--g08); text-align: center; margin-bottom: 0.4rem; }\r\n.d-sub { font-family: var(--f-body); font-size: 0.78rem; color: var(--g05); text-align: center; line-height: 1.65; margin-bottom: 1.4rem; }\r\n.d-token-box { background: var(--g02); border: 1px solid rgba(233,237,233,0.07); border-radius: 12px; padding: 1rem; margin-bottom: 1.1rem; }\r\n.d-tok-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 0.6rem; }\r\n.d-tok-lbl { font-family: var(--f-body); font-size: 0.9rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--g06); opacity: 1; }\r\n.d-tok-num { font-family: var(--f-disp); font-weight: 800; font-size: 1.5rem; color: var(--acc); line-height: 1; }\r\n.d-tok-of { font-family: var(--f-mono); font-size: 0.5rem; color: rgba(233,237,233,0.25); display: block; margin-top: 0.15rem; }\r\n.d-tok-track { height: 3px; background: rgba(233,237,233,0.06); border-radius: 3px; overflow: hidden; }\r\n.d-tok-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, var(--acc), #4ade80); transition: width 0.5s ease; }\r\n.d-disclaimer { background: var(--g02); border: 1px solid rgba(233,237,233,0.05); border-radius: 12px; padding: 0.9rem 1rem; font-family: var(--f-body); font-size: 0.72rem; color: rgba(233,237,233,0.38); line-height: 1.75; margin-bottom: 1.3rem; max-height: 110px; overflow-y: auto; }\r\n.d-disclaimer strong { color: rgba(233,237,233,0.58); font-weight: 500; }\r\n.d-accept { width: 100%; padding: 0.88rem; background: var(--acc); color: var(--g00); border: none; border-radius: 11px; cursor: pointer; font-family: var(--f-body); font-weight: 600; font-size: 0.88rem; display: flex; align-items: center; justify-content: center; gap: 0.45rem; transition: opacity 0.2s, transform 0.18s; }\r\n.d-accept:hover { opacity: 0.88; transform: translateY(-1px); }\r\n.d-decline { padding: 0.88rem 1rem; background: transparent; color: var(--g05); border: 1.5px solid rgba(233,237,233,0.12); border-radius: 11px; cursor: pointer; font-family: var(--f-body); font-weight: 500; font-size: 0.88rem; display: flex; align-items: center; justify-content: center; gap: 0.45rem; transition: border-color 0.2s, color 0.2s; white-space: nowrap; }\r\n.d-decline:hover { border-color: rgba(233,237,233,0.28); color: var(--g07); }\r\n#orqo-widget[data-theme=\"light\"] .d-decline { border-color: var(--g03); color: var(--g05); }\r\n#orqo-widget[data-theme=\"light\"] .d-decline:hover { border-color: var(--g04); color: var(--g07); }\r\n.d-sugg { margin-top: 1.5rem; }\r\n.d-sugg-lbl { font-family: var(--f-mono); font-size: 0.5rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--g05); opacity: 0.45; margin-bottom: 0.7rem; }\r\n.d-chips { display: flex; flex-wrap: wrap; gap: 0.45rem; }\r\n.d-chip { padding: 0.42rem 0.82rem; background: var(--g02); border: 1px solid rgba(233,237,233,0.08); border-radius: 100px; cursor: pointer; font-family: var(--f-body); font-size: 0.73rem; color: var(--g06); transition: border-color 0.2s, color 0.2s; }\r\n.d-chip:hover { border-color: rgba(44,185,120,0.3); color: var(--acc); }\r\n#screen-chat { display: flex; flex-direction: column; }\r\n.chat-msgs { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 1rem 1.25rem 1rem 1rem; display: flex; flex-direction: column; gap: 0.7rem; }\r\n.chat-msgs::-webkit-scrollbar { width: 3px; }\r\n.chat-msgs::-webkit-scrollbar-thumb { background: var(--g03); border-radius: 3px; }\r\n.bub-wrap { display: flex; align-items: flex-end; gap: 0.45rem; animation: bubIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both; }\r\n@keyframes bubIn { from { opacity: 0; transform: translateY(10px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }\r\n.bub-wrap.user { flex-direction: row-reverse; }\r\n.bub-av { width: 24px; height: 24px; border-radius: 7px; background: var(--acc-g); border: 1px solid rgba(44,185,120,0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }\r\n.bub { max-width: 78%; padding: 0.75rem 1rem; font-family: var(--f-body); font-size: 0.95rem; line-height: 1.6; border-radius: 14px; }\r\n.bub-wrap.bot .bub { background: var(--g02); border: 1px solid rgba(233,237,233,0.06); color: var(--g07); border-bottom-left-radius: 4px; }\r\n.bub-wrap.user .bub { background: var(--acc); color: var(--g00); font-weight: 500; border-bottom-right-radius: 4px; margin-right: 0.5rem; }\r\n.bub-time { font-family: var(--f-mono); font-size: 0.6rem; font-weight: 700; color: rgba(233,237,233,0.55); padding: 0 0.2rem; }\r\n.bub-wrap.user .bub-time { text-align: right; }\r\n.typing-dots { display: flex; gap: 3px; align-items: center; }\r\n.typing-dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(233,237,233,0.35); animation: tDot 1.2s ease-in-out infinite; }\r\n.typing-dot:nth-child(2) { animation-delay: 0.18s; }\r\n.typing-dot:nth-child(3) { animation-delay: 0.36s; }\r\n@keyframes tDot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.35; } 30% { transform: translateY(-5px); opacity: 1; } }\r\n.chat-input-area { padding: 0.7rem 0.9rem 0.9rem; border-top: 1px solid rgba(233,237,233,0.05); background: var(--g01); flex-shrink: 0; }\r\n.chat-box { background: var(--g02); border: 1.5px solid rgba(233,237,233,0.08); border-radius: 14px; overflow: hidden; transition: border-color 0.2s, box-shadow 0.2s; }\r\n.chat-box:focus-within { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.09); }\r\n.chat-ta { width: 100%; background: transparent; border: none; outline: none; padding: 0.78rem 1rem 0.35rem; font-family: var(--f-body); font-size: 0.81rem; color: var(--g07); resize: none; min-height: 38px; max-height: 96px; line-height: 1.5; }\r\n.chat-ta::placeholder { color: rgba(233,237,233,0.18); }\r\n.chat-actions { display: flex; align-items: center; gap: 0.15rem; padding: 0.25rem 0.45rem; }\r\n.chat-att { width: 38px; height: 38px; border-radius: 9px; background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: rgba(233,237,233,0.35); transition: background 0.15s, color 0.15s; }\r\n.chat-att svg { width: 19px; height: 19px; }\r\n.chat-att:hover { background: rgba(233,237,233,0.06); color: rgba(233,237,233,0.7); }\r\n.chat-gif { display: none; }\r\n.chat-send { margin-left: auto; width: 36px; height: 36px; border-radius: 10px; background: var(--acc); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--g00); transition: opacity 0.2s, transform 0.15s; }\r\n.chat-send:hover { opacity: 0.85; transform: scale(1.06); }\r\n.chat-send:disabled { opacity: 0.28; transform: none; cursor: default; background: var(--g04); }\r\n.help-head { padding: 1.4rem 1.4rem 0.9rem; }\r\n.help-title { font-family: var(--f-disp); font-weight: 700; font-size: 1.2rem; letter-spacing: -0.02em; color: var(--g08); margin-bottom: 0.9rem; }\r\n.help-search-box { display: flex; align-items: center; gap: 0.55rem; background: var(--g02); border: 1.5px solid rgba(233,237,233,0.08); border-radius: 10px; padding: 0.62rem 0.85rem; transition: border-color 0.2s; }\r\n.help-search-box:focus-within { border-color: rgba(44,185,120,0.35); }\r\n.help-search-inp { background: none; border: none; outline: none; font-family: var(--f-body); font-size: 0.8rem; color: var(--g07); flex: 1; }\r\n.help-search-inp::placeholder { color: rgba(233,237,233,0.18); }\r\n.help-cats { padding: 0 1.1rem 0.5rem; }\r\n.help-sec-lbl { font-family: var(--f-body); font-size: 1rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--g07); opacity: 1; margin-bottom: 0.75rem; }\r\n.help-cat { display: flex; align-items: center; gap: 0.7rem; padding: 0.78rem 0.65rem; border-radius: 10px; cursor: pointer; transition: background 0.15s; margin-bottom: 2px; }\r\n.help-cat:hover { background: rgba(233,237,233,0.04); }\r\n.help-cat-ico { width: 30px; height: 30px; border-radius: 8px; background: var(--g02); border: 1px solid rgba(233,237,233,0.06); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }\r\n.help-cat-name { font-family: var(--f-body); font-size: 0.95rem; color: var(--g07); font-weight: 500; }\r\n.help-cat-count { font-family: var(--f-mono); font-size: 0.65rem; color: var(--g06); opacity: 0.9; margin-left: auto; letter-spacing: 0.04em; }\r\n.help-divider { height: 1px; background: rgba(233,237,233,0.05); margin: 0.5rem 1.4rem; }\r\n.help-arts { padding: 0.8rem 1.1rem 1.5rem; }\r\n.help-art { display: flex; align-items: center; justify-content: space-between; padding: 0.72rem 0; border-bottom: 1px solid rgba(233,237,233,0.04); cursor: pointer; }\r\n.help-art:last-child { border-bottom: none; }\r\n.help-art:hover .help-art-name { color: var(--acc); }\r\n.help-art-name { font-family: var(--f-body); font-size: 0.92rem; color: rgba(233,237,233,0.65); transition: color 0.15s; }\r\n/* ══ HOME POPULAR ARTICLES ══ */\r\n.h-pop-arts { padding: 0 0.9rem 1.8rem; }\r\n.h-pop-art {\r\n  display: flex; align-items: center; justify-content: space-between;\r\n  padding: 0.75rem 0.5rem; border-bottom: 1px solid rgba(233,237,233,0.05);\r\n  cursor: pointer; gap: 0.6rem;\r\n}\r\n.h-pop-art:last-child { border-bottom: none; }\r\n.h-pop-art:hover .h-pop-art-name { color: var(--acc); }\r\n.h-pop-art-ico {\r\n  width: 28px; height: 28px; border-radius: 7px;\r\n  background: rgba(44,185,120,0.1); border: 1px solid rgba(44,185,120,0.12);\r\n  display: flex; align-items: center; justify-content: center; flex-shrink: 0;\r\n}\r\n.h-pop-art-name { font-family: var(--f-body); font-size: 0.9rem; color: rgba(233,237,233,0.65); transition: color 0.15s; flex: 1; line-height: 1.4; }\r\n#orqo-widget[data-theme=\"light\"] .h-pop-art-name { color: var(--g06); }\r\n#orqo-widget[data-theme=\"light\"] .h-pop-art { border-bottom-color: var(--g03); }\r\n\r\n/* ══ ARTICLE VIEW ══ */\r\n.art-view { padding: 1.4rem 1.4rem 2rem; }\r\n.art-view .help-title { margin-bottom: 0.35rem; font-size: 1.3rem; }\r\n.art-date { font-family: var(--f-mono); font-size: 0.6rem; color: var(--g05); opacity: 0.65; letter-spacing: 0.08em; margin-bottom: 1.3rem; }\r\n.art-body { font-family: var(--f-body); font-size: 0.92rem; color: var(--g06); line-height: 1.85; }\r\n.art-body h3 { font-family: var(--f-disp); font-size: 1.05rem; color: var(--g08); font-weight: 700; margin: 1.4rem 0 0.6rem; letter-spacing: -0.02em; }\r\n.art-body p { margin-bottom: 0.85rem; }\r\n.art-body ul, .art-body ol { padding-left: 1.3rem; margin-bottom: 0.85rem; }\r\n.art-body li { margin-bottom: 0.3rem; }\r\n.art-body strong { color: var(--g07); font-weight: 600; }\r\n.art-note { background: var(--g02); border: 1px solid rgba(233,237,233,0.08); border-left: 3px solid var(--acc); border-radius: 8px; padding: 0.75rem 1rem; margin: 0.9rem 0; font-size: 0.75rem; color: var(--g06); line-height: 1.7; }\r\n#orqo-widget[data-theme=\"light\"] .art-date { color: var(--g05); opacity: 1; }\r\n#orqo-widget[data-theme=\"light\"] .art-body { color: var(--g06); }\r\n#orqo-widget[data-theme=\"light\"] .art-body h3 { color: var(--g08); }\r\n#orqo-widget[data-theme=\"light\"] .art-body strong { color: var(--g07); }\r\n#orqo-widget[data-theme=\"light\"] .art-note { background: var(--g02); border-color: var(--g03); border-left-color: var(--acc); color: var(--g06); }";
  document.head.appendChild(style);

  var wrap = document.createElement('div');
  wrap.innerHTML = "<div id=\"orqo-widget\" style=\"opacity:0;pointer-events:none;\">\r\n  <div id=\"orqo-window\" class=\"w-hidden\">\r\n    <div class=\"w-header\">\r\n      <div class=\"w-hd-left\">\r\n        <svg width=\"20\" height=\"20\" viewBox=\"0 0 72 72\" fill=\"none\">\r\n          <path d=\"M52 59.5 A30 30 0 1 1 59.5 52\" stroke=\"currentColor\" stroke-width=\"3.5\" stroke-linecap=\"round\" fill=\"none\"/>\r\n          <line x1=\"59.5\" y1=\"52\" x2=\"66\" y2=\"58\" stroke=\"#2CB978\" stroke-width=\"3.5\" stroke-linecap=\"round\"/>\r\n          <circle cx=\"66\" cy=\"58\" r=\"4\" fill=\"#2CB978\"/>\r\n        </svg>\r\n        <span class=\"w-brand\">ORQO</span>\r\n        <span class=\"w-online\"><span class=\"w-online-dot\"></span>En línea</span>\r\n      </div>\r\n      <div class=\"w-hd-right\">\n        <button class=\"w-hbtn\" id=\"btn-clear\" title=\"Borrar chats\">\n          <svg width=\"14\" height=\"14\" viewBox=\"0 0 16 16\" fill=\"none\">\n            <path d=\"M3 4h10M6 4V2h4v2M5 4l.6 9h4.8L11 4\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          </svg>\n        </button>\n        <button class=\"w-hbtn\" id=\"btn-min\" title=\"Minimizar\">\n          <svg width=\"14\" height=\"14\" viewBox=\"0 0 16 16\" fill=\"none\"><path d=\"M3 8h10\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/></svg>\n        </button>\n        <button class=\"w-hbtn\" id=\"btn-max\" title=\"Maximizar\">\r\n          <svg width=\"14\" height=\"14\" viewBox=\"0 0 16 16\" fill=\"none\" id=\"ico-max\">\r\n            <rect x=\"2.5\" y=\"2.5\" width=\"11\" height=\"11\" rx=\"2\" stroke=\"currentColor\" stroke-width=\"1.3\"/>\r\n            <path d=\"M10 2.5V1M6 2.5V1M2.5 6H1M2.5 10H1M6 13.5V15M10 13.5V15M13.5 6H15M13.5 10H15\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\r\n          </svg>\r\n        </button>\r\n        <button class=\"w-hbtn\" id=\"btn-close\" title=\"Cerrar\">\r\n          <svg width=\"11\" height=\"11\" viewBox=\"0 0 12 12\" fill=\"none\">\r\n            <path d=\"M1 1l10 10M11 1L1 11\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/>\r\n          </svg>\r\n        </button>\r\n      </div>\r\n    </div>\r\n    <div class=\"w-backbar\" id=\"w-backbar\">\r\n      <button class=\"w-back-btn\" id=\"btn-back\">\r\n        <svg width=\"13\" height=\"13\" viewBox=\"0 0 16 16\" fill=\"none\"><path d=\"M10 3L5 8l5 5\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>\r\n        Volver\r\n      </button>\r\n      <span class=\"w-backbar-title\" id=\"backbar-title\"></span>\r\n    </div>\r\n    <div class=\"w-body\">\r\n      <div id=\"screen-home\" class=\"w-screen active\">\r\n        <div class=\"h-hero\">\r\n          <div class=\"h-iso-ring\">\r\n            <svg width=\"28\" height=\"28\" viewBox=\"0 0 72 72\" fill=\"none\">\r\n              <path d=\"M52 59.5 A30 30 0 1 1 59.5 52\" stroke=\"currentColor\" stroke-width=\"4\" stroke-linecap=\"round\" fill=\"none\"/>\r\n              <line x1=\"59.5\" y1=\"52\" x2=\"66\" y2=\"58\" stroke=\"#2CB978\" stroke-width=\"4\" stroke-linecap=\"round\"/>\r\n              <circle cx=\"66\" cy=\"58\" r=\"5\" fill=\"#2CB978\"/>\r\n            </svg>\r\n          </div>\r\n          <div class=\"h-title\">Hola, soy ORQO</div>\r\n          <div class=\"h-sub\">Tu asistente de orquestación.<br>¿En qué puedo ayudarte hoy?</div>\r\n        </div>\r\n        <div class=\"h-actions\">\r\n          <button class=\"h-action\" onclick=\"goToNewChat()\">\r\n            <div class=\"h-action-ico\"><svg width=\"15\" height=\"15\" viewBox=\"0 0 16 16\" fill=\"none\"><path d=\"M8 2v12M2 8h12\" stroke=\"#2CB978\" stroke-width=\"1.5\" stroke-linecap=\"round\"/></svg></div>\r\n            <div style=\"flex:1;min-width:0;\"><div class=\"h-action-name\">Nueva conversación</div><div class=\"h-action-desc\">Inicia un nuevo chat con ORQO Agent</div></div>\r\n            <div class=\"h-arrow\"><svg width=\"13\" height=\"13\" viewBox=\"0 0 16 16\" fill=\"none\"><path d=\"M6 4l4 4-4 4\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></div>\r\n          </button>\r\n          <button class=\"h-action\" onclick=\"switchTab('help')\">\r\n            <div class=\"h-action-ico\"><svg width=\"15\" height=\"15\" viewBox=\"0 0 16 16\" fill=\"none\"><circle cx=\"8\" cy=\"8\" r=\"6\" stroke=\"#2CB978\" stroke-width=\"1.4\"/><path d=\"M8 9V8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2\" stroke=\"#2CB978\" stroke-width=\"1.4\" stroke-linecap=\"round\"/><circle cx=\"8\" cy=\"11.5\" r=\"0.75\" fill=\"#2CB978\"/></svg></div>\r\n            <div style=\"flex:1;min-width:0;\"><div class=\"h-action-name\">Buscar ayuda</div><div class=\"h-action-desc\">Artículos, soporte y documentación</div></div>\r\n            <div class=\"h-arrow\"><svg width=\"13\" height=\"13\" viewBox=\"0 0 16 16\" fill=\"none\"><path d=\"M6 4l4 4-4 4\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></div>\r\n          </button>\r\n        </div>\r\n        <div class=\"h-divider\"></div>\r\n        <div class=\"h-section-lbl\">Conversaciones recientes</div>\r\n        <div class=\"h-recent\" id=\"home-recent\"></div>\r\n        <div class=\"h-divider\"></div>\r\n        <div class=\"h-section-lbl\">Artículos populares</div>\r\n        <div class=\"h-pop-arts\" id=\"home-pop-arts\"></div>\r\n      </div>\r\n      <div id=\"screen-messages\" class=\"w-screen\">\r\n        <div class=\"m-head\">\r\n          <span class=\"m-title\">Mensajes</span>\r\n          <button class=\"m-new\" onclick=\"goToNewChat()\">\r\n            <svg width=\"11\" height=\"11\" viewBox=\"0 0 12 12\" fill=\"none\"><path d=\"M6 1v10M1 6h10\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/></svg>\r\n            Nuevo\r\n          </button>\r\n        </div>\r\n        <div class=\"m-token-bar\">\r\n          <div class=\"m-tok-row\"><span class=\"m-tok-lbl\">Interacciones disponibles</span><span class=\"m-tok-val\" id=\"tok-display\">— / —</span></div>\r\n          <div class=\"m-tok-track\"><div class=\"m-tok-fill\" id=\"tok-fill\" style=\"width:100%\"></div></div>\r\n        </div>\r\n        <div class=\"m-list\" id=\"msgs-list\"></div>\r\n      </div>\r\n      <div id=\"screen-disclaimer\" class=\"w-screen\">\r\n        <div class=\"d-wrap\">\r\n          <div class=\"d-ico\"><div class=\"d-ico-ring\">\r\n            <svg width=\"24\" height=\"24\" viewBox=\"0 0 72 72\" fill=\"none\"><path d=\"M52 59.5 A30 30 0 1 1 59.5 52\" stroke=\"currentColor\" stroke-width=\"4.5\" stroke-linecap=\"round\" fill=\"none\"/><line x1=\"59.5\" y1=\"52\" x2=\"66\" y2=\"58\" stroke=\"#2CB978\" stroke-width=\"4.5\" stroke-linecap=\"round\"/><circle cx=\"66\" cy=\"58\" r=\"5.5\" fill=\"#2CB978\"/></svg>\r\n          </div></div>\r\n          <div class=\"d-title\">Envíanos un mensaje</div>\r\n          <div class=\"d-sub\">ORQO Agent responde en segundos.<br>El historial queda guardado en tu dispositivo.</div>\r\n          <div class=\"d-token-box\">\r\n            <div class=\"d-tok-row\"><span class=\"d-tok-lbl\">Interacciones disponibles</span><div style=\"text-align:right\"><span class=\"d-tok-num\" id=\"d-tok-num\">20</span><span class=\"d-tok-of\">de 20 disponibles</span></div></div>\r\n            <div class=\"d-tok-track\"><div class=\"d-tok-fill\" id=\"d-tok-fill\" style=\"width:100%\"></div></div>\r\n          </div>\r\n          <div class=\"d-disclaimer\">\r\n            <strong>Política de datos y uso:</strong> ORQO Agent es un asistente de inteligencia artificial operado por Bacata Digital Media S.A.S. Al continuar, autorizas el procesamiento de tus mensajes para generar respuestas. No compartas información confidencial, datos bancarios ni documentos de identidad. Las respuestas son automáticas y no sustituyen asesoría profesional.<br><br>\r\n            Tus conversaciones de demostración se almacenan únicamente en tu dispositivo (localStorage). Para más información consulta nuestra <a href=\"/privacy\" target=\"_blank\" style=\"color:var(--acc);\">Política de Privacidad</a>.\r\n          </div>\r\n          <div style=\"display:flex;gap:0.6rem;margin-top:0.2rem;\">\r\n            <button class=\"d-decline\" onclick=\"declineDisclaimer()\">\r\n              <svg width=\"13\" height=\"13\" viewBox=\"0 0 16 16\" fill=\"none\"><path d=\"M1 1l14 14M15 1L1 15\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/></svg>\r\n              Rechazar\r\n            </button>\r\n            <button class=\"d-accept\" onclick=\"acceptDisclaimer()\" style=\"flex:1;\">\r\n              <svg width=\"15\" height=\"15\" viewBox=\"0 0 16 16\" fill=\"none\"><path d=\"M3 8l3.5 3.5L13 5\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>\r\n              Aceptar política\r\n            </button>\r\n          </div>\r\n          <div class=\"d-sugg\">\r\n            <div class=\"d-sugg-lbl\">Preguntas frecuentes</div>\r\n            <div class=\"d-chips\">\r\n              <div class=\"d-chip\" onclick=\"startWithSugg(this)\">¿Cómo funciona ORQO?</div>\r\n              <div class=\"d-chip\" onclick=\"startWithSugg(this)\">¿Qué integraciones tiene?</div>\r\n              <div class=\"d-chip\" onclick=\"startWithSugg(this)\">¿Cuánto cuesta?</div>\r\n              <div class=\"d-chip\" onclick=\"startWithSugg(this)\">Quiero una demo</div>\r\n            </div>\r\n          </div>\r\n        </div>\r\n      </div>\r\n      <div id=\"screen-chat\" class=\"w-screen\">\r\n        <div class=\"chat-msgs\" id=\"chat-msgs\"></div>\r\n        <div class=\"chat-input-area\">\r\n          <div class=\"chat-box\">\r\n            <textarea class=\"chat-ta\" id=\"chat-ta\" placeholder=\"Escribe un mensaje...\" rows=\"1\"></textarea>\r\n            <div class=\"chat-actions\">\r\n              <button class=\"chat-att\" title=\"Adjuntar\"><svg width=\"15\" height=\"15\" viewBox=\"0 0 16 16\" fill=\"none\"><path d=\"M13.5 7.5l-5.6 5.6a4 4 0 01-5.65-5.65l5.6-5.6a2.5 2.5 0 013.54 3.54L5.78 11a1 1 0 01-1.41-1.41l5.6-5.6\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linecap=\"round\"/></svg></button>\r\n              <button class=\"chat-att\" title=\"Imagen\"><svg width=\"15\" height=\"15\" viewBox=\"0 0 16 16\" fill=\"none\"><rect x=\"2\" y=\"3\" width=\"12\" height=\"10\" rx=\"2\" stroke=\"currentColor\" stroke-width=\"1.3\"/><circle cx=\"5.5\" cy=\"6.5\" r=\"1.2\" stroke=\"currentColor\" stroke-width=\"1.3\"/><path d=\"M2 10.5l3-3 2.5 2.5 2-2 2.5 2.5\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></button>\r\n              <button class=\"chat-att\" title=\"Voz\"><svg width=\"15\" height=\"15\" viewBox=\"0 0 16 16\" fill=\"none\"><rect x=\"6\" y=\"2\" width=\"4\" height=\"7\" rx=\"2\" stroke=\"currentColor\" stroke-width=\"1.3\"/><path d=\"M3.5 8.5a4.5 4.5 0 009 0M8 13v2\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linecap=\"round\"/></svg></button>\r\n              <button class=\"chat-att chat-gif\" title=\"GIF\">GIF</button>\r\n              <button class=\"chat-send\" id=\"btn-send\" onclick=\"sendMessage()\">\r\n                <svg width=\"13\" height=\"13\" viewBox=\"0 0 16 16\" fill=\"none\"><path d=\"M8 13V3M4 7l4-4 4 4\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>\r\n              </button>\r\n            </div>\r\n          </div>\r\n        </div>\r\n      </div>\r\n      <div id=\"screen-help\" class=\"w-screen\">\r\n        <div class=\"help-head\">\r\n          <div class=\"help-title\">Centro de ayuda</div>\r\n          <div class=\"help-search-box\">\r\n            <svg width=\"13\" height=\"13\" viewBox=\"0 0 16 16\" fill=\"none\" style=\"flex-shrink:0;opacity:0.28;\"><circle cx=\"7\" cy=\"7\" r=\"5\" stroke=\"currentColor\" stroke-width=\"1.5\"/><path d=\"M11 11l3 3\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/></svg>\r\n            <input class=\"help-search-inp\" placeholder=\"Busca artículos, guías...\">\r\n          </div>\r\n        </div>\r\n        <div class=\"help-cats\">\r\n          <div class=\"help-sec-lbl\">Categorías</div>\r\n          <div class=\"help-cat\" onclick=\"goToArticle('plugin-install')\"><div class=\"help-cat-ico\"><svg width=\"13\" height=\"13\" viewBox=\"0 0 16 16\" fill=\"none\"><path d=\"M8 1.5L2 4.5v7l6 3 6-3v-7L8 1.5z\" stroke=\"rgba(233,237,233,0.45)\" stroke-width=\"1.3\" stroke-linejoin=\"round\"/></svg></div><span class=\"help-cat-name\">Primeros pasos</span><span class=\"help-cat-count\">6 artículos</span><svg width=\"11\" height=\"11\" viewBox=\"0 0 16 16\" fill=\"none\" style=\"opacity:0.18;flex-shrink:0;margin-left:0.5rem;\"><path d=\"M6 4l4 4-4 4\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></div>\r\n          <div class=\"help-cat\" onclick=\"goToArticle('wp-connect')\"><div class=\"help-cat-ico\"><svg width=\"13\" height=\"13\" viewBox=\"0 0 16 16\" fill=\"none\"><rect x=\"1.5\" y=\"1.5\" width=\"5\" height=\"5\" rx=\"1.5\" stroke=\"rgba(233,237,233,0.45)\" stroke-width=\"1.3\"/><rect x=\"9.5\" y=\"1.5\" width=\"5\" height=\"5\" rx=\"1.5\" stroke=\"rgba(233,237,233,0.45)\" stroke-width=\"1.3\"/><rect x=\"1.5\" y=\"9.5\" width=\"5\" height=\"5\" rx=\"1.5\" stroke=\"rgba(233,237,233,0.45)\" stroke-width=\"1.3\"/><rect x=\"9.5\" y=\"9.5\" width=\"5\" height=\"5\" rx=\"1.5\" stroke=\"rgba(233,237,233,0.45)\" stroke-width=\"1.3\"/></svg></div><span class=\"help-cat-name\">Integraciones</span><span class=\"help-cat-count\">12 artículos</span><svg width=\"11\" height=\"11\" viewBox=\"0 0 16 16\" fill=\"none\" style=\"opacity:0.18;flex-shrink:0;margin-left:0.5rem;\"><path d=\"M6 4l4 4-4 4\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></div>\r\n          <div class=\"help-cat\" onclick=\"goToArticle('tokens')\"><div class=\"help-cat-ico\"><svg width=\"13\" height=\"13\" viewBox=\"0 0 16 16\" fill=\"none\"><circle cx=\"8\" cy=\"8\" r=\"5.5\" stroke=\"rgba(233,237,233,0.45)\" stroke-width=\"1.3\"/><path d=\"M8 9V8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2\" stroke=\"rgba(233,237,233,0.45)\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><circle cx=\"8\" cy=\"11\" r=\"0.7\" fill=\"rgba(233,237,233,0.45)\"/></svg></div><span class=\"help-cat-name\">Cómo obtener soporte</span><span class=\"help-cat-count\">3 artículos</span><svg width=\"11\" height=\"11\" viewBox=\"0 0 16 16\" fill=\"none\" style=\"opacity:0.18;flex-shrink:0;margin-left:0.5rem;\"><path d=\"M6 4l4 4-4 4\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></div>\r\n        </div>\r\n        <div class=\"help-divider\"></div>\r\n        <div class=\"help-arts\">\r\n          <div class=\"help-sec-lbl\">Artículos populares</div>\r\n          <div class=\"help-art\" onclick=\"goToArticle('wp-connect')\"><span class=\"help-art-name\">¿Cómo conectar ORQO con WordPress?</span><svg width=\"11\" height=\"11\" viewBox=\"0 0 16 16\" fill=\"none\" style=\"opacity:0.18;flex-shrink:0;\"><path d=\"M6 4l4 4-4 4\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></div>\r\n          <div class=\"help-art\" onclick=\"goToArticle('whatsapp-setup')\"><span class=\"help-art-name\">Configurar tu número de WhatsApp Business</span><svg width=\"11\" height=\"11\" viewBox=\"0 0 16 16\" fill=\"none\" style=\"opacity:0.18;flex-shrink:0;\"><path d=\"M6 4l4 4-4 4\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></div>\r\n          <div class=\"help-art\" onclick=\"goToArticle('agents')\"><span class=\"help-art-name\">Flujos y agentes disponibles</span><svg width=\"11\" height=\"11\" viewBox=\"0 0 16 16\" fill=\"none\" style=\"opacity:0.18;flex-shrink:0;\"><path d=\"M6 4l4 4-4 4\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></div>\r\n          <div class=\"help-art\" onclick=\"goToArticle('tokens')\"><span class=\"help-art-name\">Límites de tokens e interacciones</span><svg width=\"11\" height=\"11\" viewBox=\"0 0 16 16\" fill=\"none\" style=\"opacity:0.18;flex-shrink:0;\"><path d=\"M6 4l4 4-4 4\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></div>\r\n          <div class=\"help-art\" onclick=\"goToArticle('plugin-install')\"><span class=\"help-art-name\">Instalar el plugin ORQO en WordPress</span><svg width=\"11\" height=\"11\" viewBox=\"0 0 16 16\" fill=\"none\" style=\"opacity:0.18;flex-shrink:0;\"><path d=\"M6 4l4 4-4 4\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></div>\r\n        </div>\r\n      </div>\r\n      <div id=\"screen-article\" class=\"w-screen\">\r\n        <div class=\"art-view\">\r\n          <div class=\"help-title\" id=\"art-title\"></div>\r\n          <div class=\"art-date\" id=\"art-date\"></div>\r\n          <div class=\"art-body\" id=\"art-body\"></div>\r\n        </div>\r\n      </div>\r\n    </div>\r\n    <div class=\"w-tabs\">\r\n      <button class=\"w-tab active\" id=\"tab-home\" onclick=\"switchTab('home')\">\r\n        <svg width=\"17\" height=\"17\" viewBox=\"0 0 20 20\" fill=\"none\"><path d=\"M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linejoin=\"round\" fill=\"none\"/><path d=\"M7 18v-6h6v6\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linejoin=\"round\"/></svg>\r\n        <span class=\"tab-lbl\">Inicio</span>\r\n      </button>\r\n      <button class=\"w-tab\" id=\"tab-messages\" onclick=\"switchTab('messages')\">\r\n        <svg width=\"17\" height=\"17\" viewBox=\"0 0 20 20\" fill=\"none\"><path d=\"M17 2H3a1 1 0 00-1 1v9a1 1 0 001 1h3l4 3.5 4-3.5h3a1 1 0 001-1V3a1 1 0 00-1-1z\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linejoin=\"round\" fill=\"none\"/></svg>\r\n        <span class=\"tab-lbl\">Mensajes</span>\r\n        <span class=\"tab-dot\" id=\"tab-msgs-dot\" style=\"display:none\"></span>\r\n      </button>\r\n      <button class=\"w-tab\" id=\"tab-help\" onclick=\"switchTab('help')\">\r\n        <svg width=\"17\" height=\"17\" viewBox=\"0 0 20 20\" fill=\"none\"><circle cx=\"10\" cy=\"10\" r=\"7.5\" stroke=\"currentColor\" stroke-width=\"1.4\"/><path d=\"M10 11.5V11c1.38 0 2.5-1.12 2.5-2.5S11.38 6 10 6 7.5 7.12 7.5 8.5\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\"/><circle cx=\"10\" cy=\"14.5\" r=\"0.9\" fill=\"currentColor\"/></svg>\r\n        <span class=\"tab-lbl\">Ayuda</span>\r\n      </button>\r\n    </div>\r\n    <div class=\"w-powered\" id=\"orqo-powered-by\">powered by <a href=\"https://orqo.io\" target=\"_blank\" rel=\"noopener\">orqo.io</a></div>\r\n  </div>\r\n  <button id=\"orqo-trigger\" onclick=\"toggleWidget()\" aria-label=\"Abrir ORQO Chat\">\r\n    <div class=\"t-pulse\"></div>\r\n    <div class=\"t-pulse p2\"></div>\r\n    <svg width=\"26\" height=\"26\" viewBox=\"0 0 72 72\" fill=\"none\" id=\"trigger-ico\">\r\n      <path d=\"M52 59.5 A30 30 0 1 1 59.5 52\" stroke=\"currentColor\" stroke-width=\"4.5\" stroke-linecap=\"round\" fill=\"none\"/>\r\n      <line x1=\"59.5\" y1=\"52\" x2=\"66\" y2=\"58\" stroke=\"#2CB978\" stroke-width=\"4.5\" stroke-linecap=\"round\"/>\r\n      <circle cx=\"66\" cy=\"58\" r=\"5.5\" fill=\"#2CB978\"/>\r\n    </svg>\r\n    <span class=\"t-badge\" id=\"t-badge\" style=\"display:none\">1</span>\r\n  </button>\r\n</div>";
  while (wrap.firstChild) document.body.appendChild(wrap.firstChild);

  // ══ CHAT WIDGET ══
let TOTAL_INT = 20;
const STORAGE_KEY = 'orqo_wgt';
let isOpen = false, isMax = false;
let curTab = 'home', curScreen = 'home';
let activeConvId = null;
let pendingSugg = '';

const S = {
  load: () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } },
  save: d => localStorage.setItem(STORAGE_KEY, JSON.stringify(d)),
  convs: () => S.load().conversations || [],
  saveConvs: cs => { const d = S.load(); d.conversations = cs; S.save(d); },
  disclaimerOk: () => !!S.load().disclaimerAccepted,
  acceptDisclaimer: () => { const d = S.load(); d.disclaimerAccepted = true; S.save(d); },
  usedInt: () => S.convs().reduce((n, c) => n + (c.messages || []).filter(m => m.role === 'user').length, 0),
  remaining: () => Math.max(0, TOTAL_INT - S.usedInt()),
};

function toggleWidget() {
  isOpen = !isOpen;
  const win = document.getElementById('orqo-window');
  const btn = document.getElementById('orqo-trigger');
  if (isOpen) {
    win.classList.remove('w-hidden');
    btn.classList.add('open');
    document.getElementById('t-badge').style.display = 'none';
    renderHome(); renderHomeArticles(); renderMsgsList(); updateTokenUI();
  } else {
    win.classList.add('w-hidden');
    btn.classList.remove('open');
  }
}

function clearAllChats() {
  const convs = S.convs();
  if (!convs.length) return;

  const ok = window.confirm('¿Borrar todos los chats guardados en este dispositivo?');
  if (!ok) return;

  const data = S.load();
  data.conversations = [];
  S.save(data);

  activeConvId = null;
  pendingSugg = '';

  const chatMsgs = document.getElementById('chat-msgs');
  if (chatMsgs) chatMsgs.innerHTML = '';

  const badge = document.getElementById('t-badge');
  if (badge) badge.style.display = 'none';
  const dot = document.getElementById('tab-msgs-dot');
  if (dot) dot.style.display = 'none';

  renderHome();
  renderMsgsList();
  updateTokenUI();
  showScreen('messages', false);
  hlTab('messages');
}

document.getElementById('btn-close').onclick = () => { isOpen = false; document.getElementById('orqo-window').classList.add('w-hidden'); document.getElementById('orqo-trigger').classList.remove('open'); };
document.getElementById('btn-min').onclick  = () => { isOpen = false; document.getElementById('orqo-window').classList.add('w-hidden'); document.getElementById('orqo-trigger').classList.remove('open'); };
document.getElementById('btn-clear').onclick = () => { clearAllChats(); };
document.getElementById('btn-max').onclick  = () => {
  isMax = !isMax;
  document.getElementById('orqo-window').classList.toggle('w-max', isMax);
  document.getElementById('ico-max').innerHTML = isMax
    ? '<path d="M1 6h6V1M15 6h-6V1M1 10h6v5M15 10h-6v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>'
    : '<rect x="2.5" y="2.5" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M10 2.5V1M6 2.5V1M2.5 6H1M2.5 10H1M6 13.5V15M10 13.5V15M13.5 6H15M13.5 10H15" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>';
};

function switchTab(tab) {
  ['home','messages','help'].forEach(t => document.getElementById('tab-'+t).classList.toggle('active', t === tab));
  curTab = tab;
  if (tab === 'messages') { renderMsgsList(); showScreen('messages', false); }
  else { showScreen(tab, false); }
  setBack(false);
}

function showScreen(name, back, backTitle) {
  document.querySelectorAll('.w-screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-'+name).classList.add('active');
  curScreen = name;
  setBack(back, backTitle);
  if (name === 'chat') scrollMsgs();
}

function setBack(show, title) {
  const bar = document.getElementById('w-backbar');
  document.getElementById('backbar-title').textContent = title || '';
  bar.classList.toggle('vis', !!show);
}

document.getElementById('btn-back').onclick = () => {
  if (curScreen === 'chat') { renderMsgsList(); showScreen('messages', false); hlTab('messages'); }
  else if (curScreen === 'disclaimer') { showScreen('messages', false); hlTab('messages'); }
  else { switchTab(curTab); }
};

function hlTab(tab) {
  ['home','messages','help'].forEach(t => document.getElementById('tab-'+t).classList.toggle('active', t === tab));
  curTab = tab;
}

function goToNewChat() {
  if (!S.disclaimerOk()) { updateTokenUI(); showScreen('disclaimer', true, 'Nuevo mensaje'); hlTab('messages'); }
  else { startNewConv(); }
}

function acceptDisclaimer() {
  S.acceptDisclaimer();
  startNewConv(pendingSugg || '');
  pendingSugg = '';
}

function declineDisclaimer() {
  pendingSugg = '';
  // Close the widget entirely
  isOpen = false;
  document.getElementById('orqo-window').classList.add('w-hidden');
  document.getElementById('orqo-trigger').classList.remove('open');
  // Go back to home tab for next open
  setTimeout(() => { switchTab('home'); }, 350);
}

function startWithSugg(el) {
  pendingSugg = el.textContent;
  if (!S.disclaimerOk()) { updateTokenUI(); showScreen('disclaimer', true, 'Nuevo mensaje'); hlTab('messages'); }
  else { startNewConv(pendingSugg); pendingSugg = ''; }
}

function startNewConv(initial) {
  const id = 'conv_' + Date.now();
  const convs = S.convs();
  convs.unshift({ id, title: initial ? initial.slice(0,42) : 'Nueva conversación', createdAt: new Date().toISOString(), messages: [] });
  S.saveConvs(convs);
  openConv(id, initial);
}

function openConv(id, initial) {
  activeConvId = id;
  renderChatMsgs(id);
  showScreen('chat', true, 'ORQO Agent');
  hlTab('messages');
  const convs = S.convs();
  const conv = convs.find(c => c.id === id);
  if (conv && conv.messages.length === 0 && !initial) {
    setTimeout(() => addBotMsg(id, '¡Hola! Soy ORQO Agent. ¿En qué puedo ayudarte hoy?'), 350);
  }
  if (initial) setTimeout(() => sendMessage(initial), 400);
}

const NOTCH_SM = `<svg width="14" height="14" viewBox="0 0 72 72" fill="none" style="color:var(--g07)"><path d="M52 59.5 A30 30 0 1 1 59.5 52" stroke="currentColor" stroke-width="5" stroke-linecap="round" fill="none"/><line x1="59.5" y1="52" x2="66" y2="58" stroke="#2CB978" stroke-width="5" stroke-linecap="round"/><circle cx="66" cy="58" r="6" fill="#2CB978"/></svg>`;

function renderChatMsgs(convId) {
  const conv = S.convs().find(c => c.id === convId);
  const c = document.getElementById('chat-msgs');
  c.innerHTML = '';
  if (!conv) return;
  conv.messages.forEach(m => appendBubble(m.role, m.content, m.timestamp, false));
  scrollMsgs();
}

function appendBubble(role, content, ts, anim) {
  const c = document.getElementById('chat-msgs');
  const w = document.createElement('div');
  w.className = 'bub-wrap ' + role;
  const t = ts ? new Date(ts).toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit'}) : '';
  if (role === 'bot') {
    w.innerHTML = `<div class="bub-av">${NOTCH_SM}</div><div><div class="bub">${escHtml(content)}</div><div class="bub-time">${t}</div></div>`;
  } else {
    w.innerHTML = `<div><div class="bub">${escHtml(content)}</div><div class="bub-time">${t}</div></div>`;
  }
  c.appendChild(w);
  if (anim) scrollMsgs();
}

// ── Notification sound (Web Audio API — no external file needed) ──
function playNotificationSound() {
  if (window._ORQO_SOUND === false) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    function note(freq, start, dur, vol) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.start(start); osc.stop(start + dur);
    }
    const t = ctx.currentTime;
    note(880,     t,        0.28, 0.18); // A5
    note(1174.66, t + 0.11, 0.32, 0.13); // D6
    setTimeout(() => ctx.close(), 700);
  } catch {}
}

function addBotMsg(convId, text) {
  const convs = S.convs();
  const conv = convs.find(c => c.id === convId);
  if (!conv) return;
  const m = { role: 'bot', content: text, timestamp: new Date().toISOString() };
  conv.messages.push(m); S.saveConvs(convs);
  appendBubble('bot', text, m.timestamp, true);
  playNotificationSound();
}

function showTyping() {
  const c = document.getElementById('chat-msgs');
  const w = document.createElement('div');
  w.className = 'bub-wrap bot'; w.id = 'typing';
  w.innerHTML = `<div class="bub-av">${NOTCH_SM}</div><div class="bub" style="padding:0.72rem 0.9rem;"><div class="typing-dots"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
  c.appendChild(w); scrollMsgs();
}

function removeTyping() { const e = document.getElementById('typing'); if (e) e.remove(); }
function scrollMsgs() { const c = document.getElementById('chat-msgs'); if (c) setTimeout(() => c.scrollTop = c.scrollHeight, 20); }

function sendMessage(override) {
  const ta = document.getElementById('chat-ta');
  const text = override || ta.value.trim();
  if (!text || !activeConvId) return;
  if (S.remaining() <= 0) {
    addBotMsg(activeConvId, 'Has alcanzado el límite de interacciones. Contáctanos al +57 301 321 1669 para continuar.');
    return;
  }
  const convs = S.convs();
  const conv = convs.find(c => c.id === activeConvId);
  if (!conv) return;
  const m = { role: 'user', content: text, timestamp: new Date().toISOString() };
  conv.messages.push(m);
  if (conv.messages.filter(x => x.role === 'user').length === 1) conv.title = text.slice(0, 42);
  S.saveConvs(convs);
  appendBubble('user', text, m.timestamp, true);
  ta.value = ''; ta.style.height = 'auto';
  updateTokenUI(); showTyping();
  (async () => {
    const reply = await getBotReplyFromApi(activeConvId, text, conv.messages);
    removeTyping();
    addBotMsg(activeConvId, reply || getBotReply(text));
    updateTokenUI(); renderHome();
    const dot = document.getElementById('tab-msgs-dot');
    if (dot) dot.style.display = 'none';
  })();
}

async function getBotReplyFromApi(convId, userText, messages) {
  try {
    const history = (messages || [])
      .slice(0, -1)
      .filter(m => m.role === 'user' || m.role === 'bot')
      .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.content }))
      .slice(-12);

    const res = await fetch(API_BASE + '/api/widget/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: apiKey,
        visitorId: convId || `v_${Date.now()}`,
        agentId: scriptAgentId || 'default',
        agentToken: scriptAgentToken || '',
        message: userText,
        history,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return String(data?.reply || '').trim();
  } catch (e) {
    console.warn('[ORQO] widget reply fallback local:', e?.message || e);
    return '';
  }
}

function getBotReply(txt) {
  const t = txt.toLowerCase();
  if (t.includes('funciona') || t.includes('qué es')) return 'ORQO conecta tu WordPress con WhatsApp vía MCP. Cuando llega un mensaje: interpreta la intención → ejecuta la acción en WooCommerce, formularios o REST API → responde al cliente. Todo en menos de 200ms, sin intervención humana.';
  if (t.includes('integra') || t.includes('woocommerce') || t.includes('plugin')) return 'ORQO se integra de forma nativa con WooCommerce, WPForms, Gravity Forms, Bookly, Calendly y cualquier endpoint de la API REST de WordPress. El plugin se instala en 10 minutos, sin una línea de código.';
  if (t.includes('cuesta') || t.includes('precio') || t.includes('plan') || t.includes('tarifa')) return 'Los planes están en fase de lanzamiento. Puedes agendar una demo gratuita de 30 minutos y te mostramos ORQO operando en un WordPress real. ¿Te interesa agendar?';
  if (t.includes('demo')) return '¡Perfecto! Agenda tu demo por WhatsApp al +57 301 321 1669 o escribe a hello@orqo.io. La sesión dura 30 minutos y verás el sistema ejecutando acciones reales en un e-commerce en vivo.';
  if (t.includes('wordpress')) return 'ORQO se conecta a WordPress mediante nuestra API REST y el protocolo MCP. Funciona con cualquier instalación estándar de WordPress 6.0 o superior.';
  if (t.includes('whatsapp')) return 'ORQO usa la API oficial de WhatsApp Business. Tus clientes escriben al número de tu empresa y ORQO gestiona la conversación completa: pedidos, reservas, consultas y soporte.';
  return 'Gracias por tu mensaje. Para una respuesta más detallada o una demostración en vivo, puedes contactarnos directamente por WhatsApp al +57 301 321 1669 o en hello@orqo.io.';
}

function renderMsgsList() {
  const convs = S.convs();
  const el = document.getElementById('msgs-list');
  if (!convs.length) { el.innerHTML = '<div class="m-empty">No tienes conversaciones aún.<br>Inicia una nueva con el botón de arriba.</div>'; return; }
  el.innerHTML = convs.map(c => {
    const last = c.messages[c.messages.length - 1];
    const prev = last ? last.content.slice(0, 48) + (last.content.length > 48 ? '…' : '') : '—';
    return `<div class="m-item" onclick="openConv('${c.id}')"><div class="m-item-ico">${NOTCH_SM}</div><div style="flex:1;min-width:0;"><div class="m-item-title">${escHtml(c.title)}</div><div class="m-item-prev">${escHtml(prev)}</div></div><span class="m-item-time">${wRelTime(c.createdAt)}</span></div>`;
  }).join('');
}

function renderHome() {
  const convs = S.convs().slice(0, 3);
  const el = document.getElementById('home-recent');
  if (!convs.length) { el.innerHTML = '<div class="h-empty">Aún no tienes conversaciones recientes.</div>'; return; }
  el.innerHTML = convs.map(c => {
    const last = c.messages[c.messages.length - 1];
    const prev = last ? last.content.slice(0, 42) + (last.content.length > 42 ? '…' : '') : '—';
    return `<div class="h-conv" onclick="openConv('${c.id}')"><div class="h-conv-ico">${NOTCH_SM}</div><div style="flex:1;min-width:0;"><div class="h-conv-name">${escHtml(c.title)}</div><div class="h-conv-preview">${escHtml(prev)}</div></div><span class="h-conv-time">${wRelTime(c.createdAt)}</span></div>`;
  }).join('');
  renderHomeArticles();
}

function updateTokenUI() {
  const r = S.remaining(), pct = (r / TOTAL_INT) * 100;
  [['tok-display', `${r} / ${TOTAL_INT}`], ['d-tok-num', `${r}`]].forEach(([id, v]) => { const e = document.getElementById(id); if (e) e.textContent = v; });
  ['tok-fill','d-tok-fill'].forEach(id => { const e = document.getElementById(id); if (e) e.style.width = pct + '%'; });
}

// ══ WIDGET CONFIG — edita aquí los artículos del home ══
const WIDGET_CONFIG = {
  homeArticles: [
    { id: 'wp-connect',      label: '¿Cómo conectar ORQO con WordPress?' },
    { id: 'plugin-install',  label: 'Instalar el plugin ORQO en WordPress' },
    { id: 'whatsapp-setup',  label: 'Configurar tu número de WhatsApp Business' },
    { id: 'agents',          label: 'Flujos y agentes disponibles' },
  ],
};

function renderHomeArticles() {
  const el = document.getElementById('home-pop-arts');
  if (!el) return;
  if (!WIDGET_CONFIG.homeArticles.length) { el.innerHTML = ''; return; }
  const ART_ICO = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M3 7h8M3 10h6" stroke="#2CB978" stroke-width="1.4" stroke-linecap="round"/></svg>`;
  el.innerHTML = WIDGET_CONFIG.homeArticles.map(a =>
    `<div class="h-pop-art" onclick="goToArticle('${a.id}')">
       <div class="h-pop-art-ico">${ART_ICO}</div>
       <span class="h-pop-art-name">${escHtml(a.label)}</span>
       <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style="opacity:0.2;flex-shrink:0;"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
     </div>`
  ).join('');
}

// ══ ARTICLES ══
const ARTICLES = {
  'wp-connect': {
    title: '¿Cómo conectar ORQO con WordPress?',
    date: 'Actualizado hace 3 días',
    body: `<p>ORQO se conecta a tu WordPress a través de nuestra <strong>API REST</strong> y el protocolo <strong>MCP (Model Context Protocol)</strong>. La conexión permite a ORQO leer y ejecutar acciones directamente sobre tu sitio.</p>
<h3>Requisitos previos</h3>
<ul>
  <li>WordPress 6.0 o superior</li>
  <li>Plugin ORQO instalado y activado</li>
  <li>API REST de WordPress habilitada (activa por defecto)</li>
  <li>Cuenta activa en dashboard.orqo.io</li>
</ul>
<h3>Pasos de conexión</h3>
<ol>
  <li>Entra a tu dashboard en <strong>dashboard.orqo.io</strong></li>
  <li>Ve a <strong>Integraciones → WordPress</strong></li>
  <li>Ingresa la URL de tu sitio (ej: https://mitienda.com)</li>
  <li>Copia el token generado y pégalo en el plugin de WordPress</li>
  <li>Haz clic en <strong>Verificar conexión</strong></li>
</ol>
<div class="art-note">La conexión se establece en segundos. Una vez verificada, ORQO puede leer productos, pedidos, formularios y ejecutar acciones en tu sitio en tiempo real.</div>
<h3>¿Qué puede hacer ORQO en WordPress?</h3>
<p>Con la conexión activa, ORQO puede: consultar inventario de WooCommerce, crear pedidos, registrar usuarios, leer y enviar respuestas de formularios (WPForms, Gravity Forms), y ejecutar cualquier endpoint de tu API REST personalizada.</p>`
  },
  'whatsapp-setup': {
    title: 'Configurar tu número de WhatsApp Business',
    date: 'Actualizado hace 5 días',
    body: `<p>ORQO usa la <strong>API oficial de WhatsApp Business</strong> para gestionar conversaciones. Puedes conectar el número de tu empresa en pocos minutos.</p>
<h3>Requisitos</h3>
<ul>
  <li>Número de teléfono dedicado para tu negocio (puede ser fijo o móvil)</li>
  <li>Cuenta de Meta Business verificada</li>
  <li>Acceso al dashboard de ORQO</li>
</ul>
<h3>Proceso de configuración</h3>
<ol>
  <li>En el dashboard, ve a <strong>Integraciones → WhatsApp</strong></li>
  <li>Haz clic en <strong>Conectar número</strong></li>
  <li>Inicia sesión con tu cuenta de Meta Business</li>
  <li>Selecciona el número o registra uno nuevo</li>
  <li>Verifica el número con el código SMS o llamada</li>
  <li>Configura el nombre del agente y el mensaje de bienvenida</li>
</ol>
<div class="art-note"><strong>Nota:</strong> Si ya usas WhatsApp Business App en ese número, deberás desvincularlo antes de conectarlo a la API. Los mensajes anteriores no se migran.</div>
<h3>Prueba de la integración</h3>
<p>Una vez conectado, envía un mensaje de prueba desde otro número. ORQO responderá automáticamente. Puedes ver la conversación en tiempo real desde la sección <strong>Conversaciones</strong> del dashboard.</p>`
  },
  'agents': {
    title: 'Flujos y agentes disponibles',
    date: 'Actualizado hace 1 semana',
    body: `<p>ORQO incluye agentes pre-configurados para los flujos más comunes de e-commerce y servicios. Cada agente puede personalizarse desde el dashboard.</p>
<h3>Agentes incluidos</h3>
<ul>
  <li><strong>Agente de Pedidos:</strong> Consulta estado de pedidos WooCommerce, rastrea envíos y gestiona devoluciones.</li>
  <li><strong>Agente de Soporte:</strong> Responde preguntas frecuentes, escala a humano cuando es necesario.</li>
  <li><strong>Agente de Reservas:</strong> Integrado con Bookly y Calendly para agendar citas directamente por WhatsApp.</li>
  <li><strong>Agente de Catálogo:</strong> Muestra productos, precios, disponibilidad y permite agregar al carrito.</li>
  <li><strong>Agente de Captación:</strong> Registra leads desde WhatsApp hacia tu CRM o WPForms.</li>
</ul>
<h3>Crear un agente personalizado</h3>
<p>En el dashboard ve a <strong>Agentes → Nuevo agente</strong>. Define el objetivo, las instrucciones de comportamiento, los datos que puede consultar y las acciones que puede ejecutar. Puedes usar lenguaje natural para configurarlo.</p>
<div class="art-note">Los agentes son independientes entre sí. Puedes tener múltiples agentes activos para diferentes números de WhatsApp o para diferentes secciones de tu WordPress.</div>`
  },
  'tokens': {
    title: 'Límites de tokens e interacciones',
    date: 'Actualizado hace 2 semanas',
    body: `<p>ORQO mide el uso en <strong>interacciones</strong>. Una interacción equivale a un mensaje de usuario más la respuesta del agente.</p>
<h3>Límites por plan</h3>
<ul>
  <li><strong>Demo:</strong> 20 interacciones (esta versión de prueba del widget)</li>
  <li><strong>Starter:</strong> 500 interacciones / mes</li>
  <li><strong>Pro:</strong> 2.000 interacciones / mes</li>
  <li><strong>Business:</strong> 10.000 interacciones / mes + soporte prioritario</li>
</ul>
<h3>¿Qué cuenta como interacción?</h3>
<p>Cada mensaje que envía un usuario a cualquiera de tus agentes conectados (WhatsApp o widget web) cuenta como una interacción. Los mensajes internos del sistema, las notificaciones y los mensajes de error no cuentan.</p>
<div class="art-note"><strong>¿Llegaste al límite?</strong> Escríbenos al +57 301 321 1669 o a hello@orqo.io. Podemos ampliar tu límite de forma inmediata mientras gestionas el cambio de plan.</div>
<h3>Cómo revisar tu consumo</h3>
<p>En el dashboard, la sección <strong>Resumen</strong> muestra en tiempo real cuántas interacciones has usado y cuántas te quedan en el mes en curso. También recibirás un email cuando llegues al 80% del límite.</p>`
  },
  'plugin-install': {
    title: 'Instalar el plugin ORQO en WordPress',
    date: 'Actualizado hace 4 días',
    body: `<p>El plugin de ORQO es el puente entre tu WordPress y la plataforma. Se instala en menos de 10 minutos y no requiere código.</p>
<h3>Método 1: Desde el dashboard de WordPress</h3>
<ol>
  <li>Entra al panel de administración de tu WordPress</li>
  <li>Ve a <strong>Plugins → Añadir nuevo</strong></li>
  <li>Busca <strong>"ORQO"</strong> en el buscador</li>
  <li>Haz clic en <strong>Instalar ahora</strong> y luego en <strong>Activar</strong></li>
</ol>
<h3>Método 2: Subir el archivo .zip</h3>
<ol>
  <li>Descarga el plugin desde tu dashboard en <strong>Integraciones → WordPress → Descargar plugin</strong></li>
  <li>En WordPress ve a <strong>Plugins → Añadir nuevo → Subir plugin</strong></li>
  <li>Selecciona el archivo <strong>orqo-connector.zip</strong></li>
  <li>Instala y activa</li>
</ol>
<h3>Configuración inicial</h3>
<p>Después de activar, ve a <strong>Ajustes → ORQO</strong> en tu WordPress. Pega el <strong>token de conexión</strong> que encontrarás en tu dashboard y guarda los cambios.</p>
<div class="art-note">El plugin requiere WordPress 6.0+ y PHP 7.4+. Verifica que tu hosting cumpla estos requisitos antes de instalarlo.</div>`
  }
};

function goToArticle(id) {
  const art = ARTICLES[id];
  if (!art) return;
  document.getElementById('art-title').textContent = art.title;
  document.getElementById('art-date').textContent = art.date;
  document.getElementById('art-body').innerHTML = art.body;
  // Auto-maximize on desktop
  if (window.innerWidth >= 768 && !isMax) {
    isMax = true;
    document.getElementById('orqo-window').classList.add('w-max');
    document.getElementById('ico-max').innerHTML = '<path d="M1 6h6V1M15 6h-6V1M1 10h6v5M15 10h-6v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  showScreen('article', true, 'Centro de ayuda');
}

function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function wRelTime(iso) {
  if (!iso) return '';
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return 'ahora'; if (m < 60) return m + 'm';
  const h = Math.floor(m / 60); if (h < 24) return h + 'h';
  return Math.floor(h / 24) + 'd';
}

const chatTa = document.getElementById('chat-ta');
chatTa.addEventListener('input', function() { this.style.height = 'auto'; this.style.height = Math.min(this.scrollHeight, 96) + 'px'; });
chatTa.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

// Expose handlers used by inline onclick attributes in embedded HTML.
window.toggleWidget = toggleWidget;
window.switchTab = switchTab;
window.goToNewChat = goToNewChat;
window.acceptDisclaimer = acceptDisclaimer;
window.declineDisclaimer = declineDisclaimer;
window.startWithSugg = startWithSugg;
window.sendMessage = sendMessage;
window.openConv = openConv;
window.goToArticle = goToArticle;

updateTokenUI();
if (S.convs().length > 0) {
  document.getElementById('t-badge').style.display = 'flex';
  document.getElementById('tab-msgs-dot').style.display = 'block';
}

// ══ WIDGET CONFIG — cargar desde dashboard API ══════════════════════════════
(async function loadWidgetConfig() {
  const widget = document.getElementById('orqo-widget');
  function showWidget() {
    if (widget) { widget.style.opacity = ''; widget.style.pointerEvents = ''; }
  }
  function hideWidget() {
    if (widget) widget.style.display = 'none';
  }

  try {
    const res = await fetch(`${API_BASE}/api/public/widget?key=${encodeURIComponent(apiKey)}&agentId=${encodeURIComponent(scriptAgentId || '')}&agentToken=${encodeURIComponent(scriptAgentToken || '')}`, { cache: 'no-store' });
    if (!res.ok) { showWidget(); return; }
    const cfg = await res.json();
    console.log('[ORQO] config:', JSON.stringify({ active: cfg.active, title: cfg.title, position: cfg.position, interactionLimit: cfg.interactionLimit }));

    // 1. Activo / inactivo
    if (cfg.active === false) {
      hideWidget();
      return;
    }
    showWidget();

    // 2. Textos
    if (cfg.title) {
      document.querySelectorAll('.h-title').forEach(el => { el.textContent = cfg.title; });
    }
    if (cfg.subtitle) {
      document.querySelectorAll('.h-sub').forEach(el => { el.innerHTML = cfg.subtitle; });
    }
    if (cfg.placeholder) {
      const ta = document.getElementById('chat-ta');
      if (ta) ta.placeholder = cfg.placeholder;
    }

    // 3. Colores y tema del widget (scope local al widget)
    const widgetEl = document.getElementById('orqo-widget');
    if (cfg.accentColor && widgetEl) widgetEl.style.setProperty('--acc', cfg.accentColor);
    // Theme-sensitive colors scoped to widget so landing theme is not forced
    {
      const darkBg      = cfg.darkBg      || '#060908';
      const darkSurface = cfg.darkSurface || '#0B100D';
      const lightBg     = cfg.lightBg     || '#F4F7F4';
      const lightSurface= cfg.lightSurface|| '#FFFFFF';
      let styleEl = document.getElementById('orqo-theme-vars');
      if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'orqo-theme-vars'; document.head.appendChild(styleEl); }
      styleEl.textContent =
        `#orqo-widget{` +
        `--g00:${darkBg};--g01:${darkSurface};--g02:#111812;--g03:#1D2920;--g04:#2E4038;--g05:#7A9488;--g06:#B4C4BC;--g07:#E9EDE9;--g08:#F5F5F2;` +
        `}` +
        `#orqo-widget[data-theme="light"]{` +
        `--g00:${lightBg};--g01:${lightSurface};--g02:#EDF2ED;--g03:#D5E3D5;--g04:#B0C8B0;--g05:#527060;--g06:#2A4434;--g07:#152018;--g08:#090F0A;` +
        `}`;
      const applyWidgetThemeVars = (theme) => {
        if (!widgetEl) return;
        const mode = String(cfg.themeMode || 'auto').toLowerCase();
        const resolved = (mode === 'light' || mode === 'dark') ? mode : (theme === 'light' ? 'light' : 'dark');
        widgetEl.setAttribute('data-theme', resolved);
      };
      window.__orqoApplyWidgetThemeVars = applyWidgetThemeVars;
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      applyWidgetThemeVars(currentTheme);
    }

    // 4. Opacidad ventana y botón
    if (cfg.windowOpacity != null && cfg.windowOpacity < 1) {
      const win = document.getElementById('orqo-window');
      if (win) win.style.opacity = cfg.windowOpacity;
    }
    if (cfg.buttonOpacity != null && cfg.buttonOpacity < 1) {
      const btn = document.getElementById('orqo-trigger');
      if (btn) btn.style.opacity = cfg.buttonOpacity;
    }

    // 5. Icono / avatar en el botón trigger
    const PHOTO_MAP = {
      w1: 'https://randomuser.me/api/portraits/women/44.jpg',
      w2: 'https://randomuser.me/api/portraits/women/65.jpg',
      w3: 'https://randomuser.me/api/portraits/women/90.jpg',
      w4: 'https://randomuser.me/api/portraits/women/29.jpg',
      m1: 'https://randomuser.me/api/portraits/men/32.jpg',
      m2: 'https://randomuser.me/api/portraits/men/43.jpg',
      m3: 'https://randomuser.me/api/portraits/men/75.jpg',
      m4: 'https://randomuser.me/api/portraits/men/91.jpg',
    };
    const ICON_SVGS = {
      chat:     '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>',
      support:  '<path d="M3 11a9 9 0 1 1 18 0" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M21 11v4a2 2 0 0 1-2 2h-1M3 11v4a2 2 0 0 0 2 2h1" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M12 18v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      robot:    '<rect x="3" y="9" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.8" fill="none"/><circle cx="9" cy="14" r="1.5" fill="currentColor"/><circle cx="15" cy="14" r="1.5" fill="currentColor"/><path d="M9 18h6M12 9V6m-3 0h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      spark:    '<path d="M12 2l1.5 4H18l-3.5 2.5 1.5 4L12 10l-4 2.5 1.5-4L6 6h4.5z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/><path d="M19 15l1 2-2 1 2 1-1 2-1-2-2 1 1-2-2-1 2-1z" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linejoin="round"/>',
      bolt:     '<path d="M13 2L4.5 13H12l-1 9L21 11H14z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>',
      heart:    '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>',
      star:     '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>',
      phone:    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.12 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>',
      store:    '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="1.8"/><path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
      question: '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="12" cy="17" r="0.8" fill="currentColor"/>',
    };
    const triggerBtn = document.getElementById('orqo-trigger');
    if (triggerBtn) {
      if (cfg.iconMode === 'favicon') {
        if (cfg.faviconPreset && ICON_SVGS[cfg.faviconPreset]) {
          triggerBtn.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none">${ICON_SVGS[cfg.faviconPreset]}</svg>`;
        } else if (cfg.faviconUrl) {
          triggerBtn.innerHTML = `<img src="${cfg.faviconUrl}" width="32" height="32" style="border-radius:50%;object-fit:cover;" alt=""/>`;
        }
      } else if (cfg.iconMode === 'photo' && cfg.agentPhoto) {
        const photoUrl = PHOTO_MAP[cfg.agentPhoto] || cfg.agentPhoto;
        triggerBtn.innerHTML = `<img src="${photoUrl}" width="48" height="48" style="border-radius:50%;object-fit:cover;" alt=""/>`;
      }
    }

    // 5b. Posición del widget
    if (cfg.position) {
      const widgetEl = document.getElementById('orqo-widget');
      const windowEl = document.getElementById('orqo-window');
      if (widgetEl) {
        const isTop = cfg.position.includes('top');
        const isLeft = cfg.position.includes('left');
        const isCenter = cfg.position.includes('center');
        widgetEl.style.bottom = isTop ? 'auto' : '2rem';
        widgetEl.style.top = isTop ? '2rem' : 'auto';
        widgetEl.style.right = (isLeft || isCenter) ? 'auto' : '2rem';
        widgetEl.style.left = isLeft ? '2rem' : isCenter ? '50%' : 'auto';
        widgetEl.style.alignItems = isLeft ? 'flex-start' : isCenter ? 'center' : 'flex-end';
        widgetEl.style.transform = isCenter ? 'translateX(-50%)' : '';
        if (windowEl) {
          const vOrig = isTop ? 'top' : 'bottom';
          const hOrig = isLeft ? 'left' : isCenter ? 'center' : 'right';
          windowEl.style.transformOrigin = `${vOrig} ${hOrig}`;
        }
      }
    }

    // 6. Artículos desde API (override ARTICLES y WIDGET_CONFIG)
    if (Array.isArray(cfg.articles) && cfg.articles.length > 0) {
      cfg.articles.forEach(a => {
        ARTICLES[a.id] = { title: a.title, date: a.date, body: a.body };
      });
    }
    if (Array.isArray(cfg.homeArticles) && cfg.homeArticles.length > 0) {
      WIDGET_CONFIG.homeArticles = cfg.homeArticles.map(id => {
        const art = ARTICLES[id];
        return { id, label: art ? art.title : id };
      });
      renderHomeArticles();
    }

    // 6c. Branding
    if (cfg.showBranding === false) {
      const pb = document.getElementById('orqo-powered-by');
      if (pb) pb.style.display = 'none';
    }

    // 7. Límite de interacciones
    if (cfg.interactionLimit) {
      TOTAL_INT = cfg.interactionLimit;
      updateTokenUI();
    }

    // 8. Sonido de respuesta (default true si no está definido)
    window._ORQO_SOUND = cfg.soundEnabled !== false;

    // 9. Auto-abrir en modo preview (?preview=1)
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') === '1' && !isOpen) {
      setTimeout(toggleWidget, 600);
    }

  } catch (e) {
    console.error('[ORQO] loadWidgetConfig error:', e);
    showWidget();
  }
})();
})();
