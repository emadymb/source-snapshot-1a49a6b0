// Serves the Fiksu AI chat widget as a self-contained JavaScript bundle.
// External sites embed with a single tag:
//
//   <script src="https://<host>/api/public/widget/embed.js"
//           data-fiksu-workspace="<optional workspace uuid>"
//           data-fiksu-color="#6366f1"
//           data-fiksu-title="Fiksu AI"></script>
//
// The script injects a floating chat bubble that talks to
// /api/public/widget/chat on the same origin the script was loaded from.

import { createFileRoute } from "@tanstack/react-router";

const WIDGET_JS = String.raw`(function () {
  if (window.__fiksuWidgetLoaded) return;
  window.__fiksuWidgetLoaded = true;

  var script = document.currentScript;
  if (!script) {
    var all = document.getElementsByTagName("script");
    for (var i = all.length - 1; i >= 0; i--) {
      if ((all[i].src || "").indexOf("/api/public/widget/embed.js") !== -1) { script = all[i]; break; }
    }
  }
  if (!script) return;

  var srcUrl;
  try { srcUrl = new URL(script.src); } catch (_) { return; }
  var API = srcUrl.origin + "/api/public/widget/chat";
  var WORKSPACE = script.getAttribute("data-fiksu-workspace") || "";
  var COLOR = script.getAttribute("data-fiksu-color") || "#6366f1";
  var TITLE = script.getAttribute("data-fiksu-title") || "Fiksu AI";
  var GREETING = script.getAttribute("data-fiksu-greeting") ||
    "مرحباً! أنا مساعد Fiksu. كيف أستطيع مساعدتك؟";

  var STYLE = ""
    + ".fiksu-fab{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;"
    + "background:" + COLOR + ";color:#fff;border:0;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.2);"
    + "display:flex;align-items:center;justify-content:center;z-index:2147483000;transition:transform .15s ease}"
    + ".fiksu-fab:hover{transform:scale(1.05)}"
    + ".fiksu-fab svg{width:26px;height:26px}"
    + ".fiksu-panel{position:fixed;bottom:88px;right:20px;width:360px;max-width:calc(100vw - 32px);"
    + "height:520px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;overflow:hidden;"
    + "box-shadow:0 20px 50px rgba(0,0,0,.25);display:none;flex-direction:column;z-index:2147483000;"
    + "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111}"
    + ".fiksu-panel.open{display:flex}"
    + ".fiksu-head{padding:14px 16px;background:" + COLOR + ";color:#fff;font-weight:600;display:flex;"
    + "align-items:center;justify-content:space-between}"
    + ".fiksu-head button{background:transparent;color:#fff;border:0;font-size:20px;cursor:pointer;line-height:1}"
    + ".fiksu-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f8fafc}"
    + ".fiksu-msg{max-width:82%;padding:8px 12px;border-radius:12px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}"
    + ".fiksu-user{align-self:flex-end;background:" + COLOR + ";color:#fff;border-bottom-right-radius:4px}"
    + ".fiksu-bot{align-self:flex-start;background:#fff;border:1px solid #e5e7eb;border-bottom-left-radius:4px}"
    + ".fiksu-typing{align-self:flex-start;color:#6b7280;font-size:13px;font-style:italic}"
    + ".fiksu-form{display:flex;gap:6px;padding:10px;border-top:1px solid #e5e7eb;background:#fff}"
    + ".fiksu-form input{flex:1;padding:9px 12px;border:1px solid #d1d5db;border-radius:10px;font-size:14px;outline:none}"
    + ".fiksu-form input:focus{border-color:" + COLOR + "}"
    + ".fiksu-form button{background:" + COLOR + ";color:#fff;border:0;border-radius:10px;padding:0 14px;font-weight:600;cursor:pointer}"
    + ".fiksu-form button:disabled{opacity:.5;cursor:not-allowed}"
    + ".fiksu-foot{padding:6px 12px;font-size:11px;color:#94a3b8;text-align:center;background:#fff;border-top:1px solid #f1f5f9}";

  var style = document.createElement("style"); style.textContent = STYLE; document.head.appendChild(style);

  var fab = document.createElement("button");
  fab.className = "fiksu-fab"; fab.setAttribute("aria-label", TITLE);
  fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

  var panel = document.createElement("div"); panel.className = "fiksu-panel";
  panel.innerHTML = ''
    + '<div class="fiksu-head"><span>' + escapeHtml(TITLE) + '</span><button aria-label="Close" data-close>×</button></div>'
    + '<div class="fiksu-msgs" role="log" aria-live="polite"></div>'
    + '<form class="fiksu-form"><input type="text" placeholder="اكتب رسالتك…" autocomplete="off" required><button type="submit">إرسال</button></form>'
    + '<div class="fiksu-foot">Powered by Fiksu AI</div>';

  document.body.appendChild(fab); document.body.appendChild(panel);

  var msgsEl = panel.querySelector(".fiksu-msgs");
  var form = panel.querySelector(".fiksu-form");
  var input = form.querySelector("input");
  var sendBtn = form.querySelector("button");
  var closeBtn = panel.querySelector("[data-close]");
  var messages = [];

  function escapeHtml(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
  function scroll() { msgsEl.scrollTop = msgsEl.scrollHeight; }
  function append(role, text) {
    var el = document.createElement("div");
    el.className = "fiksu-msg " + (role === "user" ? "fiksu-user" : "fiksu-bot");
    el.textContent = text; msgsEl.appendChild(el); scroll();
    return el;
  }
  function showTyping() {
    var el = document.createElement("div");
    el.className = "fiksu-typing"; el.textContent = "…"; el.dataset.typing = "1";
    msgsEl.appendChild(el); scroll(); return el;
  }
  function open() { panel.classList.add("open"); if (!messages.length) { append("assistant", GREETING); } input.focus(); }
  function close() { panel.classList.remove("open"); }

  fab.addEventListener("click", function () { panel.classList.contains("open") ? close() : open(); });
  closeBtn.addEventListener("click", close);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim(); if (!text) return;
    input.value = ""; sendBtn.disabled = true;
    append("user", text); messages.push({ role: "user", content: text });
    var typing = showTyping();
    fetch(API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: WORKSPACE || undefined, messages: messages }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        typing.remove();
        var reply = (data && data.reply) || "عذراً، حدث خطأ. حاول مرة أخرى.";
        append("assistant", reply); messages.push({ role: "assistant", content: reply });
      })
      .catch(function () {
        typing.remove();
        append("assistant", "تعذّر الاتصال بالخادم.");
      })
      .finally(function () { sendBtn.disabled = false; input.focus(); });
  });
})();`;

export const Route = createFileRoute("/api/public/widget/embed.js")({
  server: {
    handlers: {
      GET: async () =>
        new Response(WIDGET_JS, {
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "Access-Control-Allow-Origin": "*",
          },
        }),
    },
  },
});