const tg = window.Telegram?.WebApp;
tg?.expand();

const view = document.getElementById("view");

document.querySelectorAll("nav button").forEach(btn => {
  btn.onclick = () => load(btn.dataset.page);
});

async function load(page) {
  const html = await fetch(`/pages/${page}.html`).then(r => r.text());
  view.innerHTML = html;

  if (page === "profile") {
    setTimeout(() => {
      alert("INIT PROFILE CALLED");
      initProfile();
    }, 80);
  }
}

load("profile");

let AUTH = null;

async function initProfile() {

  try {

    alert("CHECK: telegram data");

    if (!tg?.initData) {
      alert("❗ NO TELEGRAM initData — bot se open karo");
      document.getElementById("char-card").innerHTML =
        "⚠️ Open from Telegram bot.";
      return;
    }

    alert("CALLING /api/auth");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData })
    });

    const data = await res.json();

    alert("AUTH RESPONSE: " + JSON.stringify(data));

    if (!data.ok) {
      document.getElementById("char-card").innerHTML = "❌ Auth failed.";
      return;
    }

    AUTH = data;

    const user = data.user;
    const t = tg?.initDataUnsafe?.user || {};

    const fullname =
      user.fullname || `${t.first_name || ""} ${t.last_name || ""}`.trim();

    const username =
      user.username || t.username || "";

    // HEADER
    document.getElementById("name").innerText = fullname || "Player";
    document.getElementById("username").innerText =
      username ? "@" + username : "@unknown";
    document.getElementById("uid").innerText = "ID: " + user.telegramId;

    document.getElementById("avatar").src =
      t.photo_url ||
      `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.telegramId}`;

    document.getElementById("coinsMini").innerText = user.coins || 0;

    // LOWER CARD
    document.getElementById("p-name").innerText = fullname;
    document.getElementById("p-username").innerText =
      username ? "@" + username : "—";
    document.getElementById("p-id").innerText = "ID: " + user.telegramId;

    document.getElementById("p-avatar").src =
      t.photo_url ||
      `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.telegramId}`;

    document.getElementById("coins").innerHTML =
      "<b>Coins:</b> " + (user.coins || 0);

    const c = data.character;

    document.getElementById("char-card").innerHTML = `
      <div style="display:flex;gap:10px;align-items:center">
        <img src="${c.imageUrl}"
             style="width:90px;height:90px;border-radius:18px;object-fit:cover">
        <div>
          <h4 style="margin:0">${c.name}</h4>
          <small>Level ${c.level}</small>
        </div>
      </div>
      <hr>
      ❤️ HP: <b>${c.stats.hp}</b><br>
      ⚔ Attack: <b>${c.stats.attack}</b><br>
      🛡 Defense: <b>${c.stats.defense}</b><br>
      ⚡ Speed: <b>${c.stats.speed}</b>
    `;

    document.getElementById("xpBar").style.width =
      Math.min(100, c.level * 10) + "%";

    document.getElementById("dailyBtn").onclick = claimDaily;

    alert("PROFILE DONE ✔");

  } catch (e) {
    alert("ERROR: " + e.message);
  }
}

async function claimDaily() {
  if (!AUTH) return;

  const res = await fetch("/api/daily", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId: AUTH.user.telegramId })
  });

  const data = await res.json();

  if (data.ok) {
    alert("🎁 Claimed: " + data.coins);
    initProfile();
  } else {
    alert("⏳ wait " + data.cooldown + " minutes");
  }
}