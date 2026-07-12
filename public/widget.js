/**
 * Fiksu Chat Widget
 * Embed with: <script async src="https://your-fiksu-app/widget.js" data-fiksu-workspace="ws_id"></script>
 */
(function () {
  if (window.__fiksuWidgetLoaded) return;
  window.__fiksuWidgetLoaded = true;

  var script = document.currentScript;
  var workspace = (script && script.getAttribute("data-fiksu-workspace")) || "ws_demo";
  var origin = (script && new URL(script.src).origin) || window.location.origin;

  var css = ""
    + ".fk-btn{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;box-shadow:0 10px 30px rgba(79,70,229,.35);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2147483647;border:none;transition:transform .2s}"
    + ".fk-btn:hover{transform:scale(1.05)}"
    + ".fk-panel{position:fixed;bottom:90px;right:20px;width:360px;max-width:calc(100vw - 40px);height:520px;max-height:calc(100vh - 120px);background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden;z-index:2147483647;font-family:system-ui,-apple-system,sans-serif}"
    + ".fk-panel.open{display:flex}"
    + ".fk-head{padding:14px 16px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-weight:600;display:flex;align-items:center;gap:10px}"
    + ".fk-msgs{flex:1;overflow-y:auto;padding:12px;background:#fafafa;font-size:14px}"
    + ".fk-msg{padding:8px 12px;border-radius:12px;margin:6px 0;max-width:80%;white-space:pre-wrap;word-wrap:break-word}"
    + ".fk-msg.u{background:#4f46e5;color:#fff;margin-left:auto;border-bottom-right-radius:4px}"
    + ".fk-msg.a{background:#fff;border:1px solid #eee;margin-right:auto;border-bottom-left-radius:4px}"
    + ".fk-form{display:flex;gap:6px;padding:10px;border-top:1px solid #eee;background:#fff}"
    + ".fk-form input{flex:1;padding:10px 12px;border:1px solid #e5e7eb;border-radius:12px;font-size:14px;outline:none}"
    + ".fk-form input:focus{border-color:#4f46e5}"
    + ".fk-form button{padding:10px 14px;border:none;border-radius:12px;background:#4f46e5;color:#fff;font-weight:600;cursor:pointer}"
    + ".fk-form button:disabled{opacity:.5}";

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var btn = document.createElement("button");
  btn.className = "fk-btn";
  btn.setAttribute("aria-label", "Fiksu Chat");
  btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

  var panel = document.createElement("div");
  panel.className = "fk-panel";
  panel.innerHTML =
    '<div class="fk-head"><span>🤖</span><span>Fiksu Assistant</span></div>'
    + '<div class="fk-msgs" id="fk-msgs"><div class="fk-msg a">مرحباً! كيف أساعدك اليوم؟</div></div>'
    + '<form class="fk-form" id="fk-form"><input id="fk-input" placeholder="اكتب رسالتك..." autocomplete="off"/><button type="submit">إرسال</button></form>';

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  var msgs = panel.querySelector("#fk-msgs");
  var form = panel.querySelector("#fk-form");
  var input = panel.querySelector("#fk-input");
  var history = [];

  btn.addEventListener("click", function () {
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) input.focus();
  });

  function push(role, text) {
    var el = document.createElement("div");
    el.className = "fk-msg " + (role === "user" ? "u" : "a");
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    push("user", text);
    history.push({ role: "user", parts: [{ type: "text", text: text }] });
    input.value = "";
    input.disabled = true;

    var reply = push("assistant", "…");

    fetch(origin + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Fiksu-Workspace": workspace },
      body: JSON.stringify({ messages: history, id: "widget_" + Date.now() }),
    })
      .then(function (res) {
        if (!res.body) throw new Error("no stream");
        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var buf = "";
        var acc = "";
        function pump() {
          return reader.read().then(function (r) {
            if (r.done) return;
            buf += decoder.decode(r.value, { stream: true });
            var lines = buf.split("\n");
            buf = lines.pop() || "";
            for (var i = 0; i < lines.length; i++) {
              var line = lines[i].trim();
              if (!line.startsWith("data:")) continue;
              try {
                var payload = JSON.parse(line.slice(5).trim());
                if (payload.type === "text-delta" && payload.delta) {
                  acc += payload.delta;
                  reply.textContent = acc;
                  msgs.scrollTop = msgs.scrollHeight;
                }
              } catch (_) {}
            }
            return pump();
          });
        }
        return pump().then(function () {
          history.push({ role: "assistant", parts: [{ type: "text", text: acc }] });
        });
      })
      .catch(function () {
        reply.textContent = "تعذّر الاتصال بالخدمة.";
      })
      .finally(function () {
        input.disabled = false;
        input.focus();
      });
  });
})();
