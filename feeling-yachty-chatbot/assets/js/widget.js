(function () {
  const root = document.getElementById("fy-fleet-chat");
  if (!root || typeof fyFleetChat === "undefined") return;

  const toggle = root.querySelector(".fy-fleet-chat__toggle");
  const panel = root.querySelector(".fy-fleet-chat__panel");
  const log = root.querySelector(".fy-fleet-chat__log");
  const form = root.querySelector(".fy-fleet-chat__form");
  const input = root.querySelector("#fy-fleet-chat-input");

  let intent = {};
  const session =
    "fy-" + Math.random().toString(36).slice(2) + Date.now().toString(36);

  function add(role, text, yachts) {
    const msg = document.createElement("div");
    msg.className = "fy-fleet-chat__msg fy-fleet-chat__msg--" + role;
    msg.textContent = text;
    log.appendChild(msg);
    if (yachts && yachts.length) {
      const wrap = document.createElement("div");
      wrap.className = "fy-fleet-chat__cards";
      yachts.forEach(function (yacht) {
        const a = document.createElement("a");
        a.className = "fy-fleet-chat__card";
        a.href = yacht.url || "#";
        a.target = "_blank";
        a.rel = "noopener";
        if (yacht.image_url) {
          const img = document.createElement("img");
          img.src = yacht.image_url;
          img.alt = yacht.title || "";
          a.appendChild(img);
        }
        const meta = document.createElement("div");
        const price = yacht.display_price
          ? " · from $" + Number(yacht.display_price).toLocaleString()
          : "";
        meta.textContent =
          (yacht.title || "Yacht") +
          (yacht.size_ft ? " · " + yacht.size_ft + "ft" : "") +
          price;
        a.appendChild(meta);
        wrap.appendChild(a);
      });
      log.appendChild(wrap);
    }
    log.scrollTop = log.scrollHeight;
  }

  toggle.addEventListener("click", function () {
    const open = panel.hasAttribute("hidden");
    if (open) {
      panel.removeAttribute("hidden");
      toggle.setAttribute("aria-expanded", "true");
      if (!log.childElementCount) add("bot", fyFleetChat.greeting, []);
      input.focus();
    } else {
      panel.setAttribute("hidden", "");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const message = (input.value || "").trim();
    if (!message) return;
    input.value = "";
    add("user", message, []);
    try {
      const res = await fetch(fyFleetChat.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": fyFleetChat.nonce,
        },
        body: JSON.stringify({ message: message, session: session, intent: intent }),
      });
      const data = await res.json();
      intent = data.intent || intent;
      add("bot", data.reply || "Sorry — try that again.", data.yachts || []);
    } catch (err) {
      add("bot", "I could not reach the fleet right now. Call or text " + fyFleetChat.phone + ".", []);
    }
  });
})();
