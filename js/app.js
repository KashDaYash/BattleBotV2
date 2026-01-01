const view = document.getElementById("view");
const tg = window.Telegram?.WebApp;
tg?.expand();

let CURRENT_PAGE = "profile";

document.querySelectorAll("nav button").forEach(btn => {
  btn.onclick = () => load(btn.dataset.page);
});

async function load(page) {
  CURRENT_PAGE = page;

  const res = await fetch(`/pages/${page}.html`);
  const html = await res.text();
  view.innerHTML = html;

  // ⭐ AFTER HTML loads — run page logic
  if (page === "profile") initProfile();
}

load("profile");

// ---------------- PROFILE LOGIC ---------------- //

let AUTH = null;

async function initProfile() {
  const tgUser = tg?.initDataUnsafe?.user;

  if (!tg?.initData) {
    document.getElementById("char-card").innerHTML =
      "⚠️ Open inside Telegram WebApp.";
    return;
  }

  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData: tg.initData })
  });

  const data = await res.json();
  if (!data.ok) {
    document.getElementById("char-card").innerHTML = "❌ Auth failed.";
    return;
  }

  AUTH = data;
  const user = data.user;

  const fullname =
    user.fullname ||
    ((tgUser?.first_name || "") +
      (tgUser?.last_name ? " " + tgUser.last_name : ""));

  const username =
    user.username ||
    tgUser?.username ||
    "";

  // HEADER
  document.getElementById("name").innerText = fullname || "Player";
  document.getElementById("username").innerText =
    username ? "@" + username : "@unknown";
  document.getElementById("uid").innerText = "ID: " + user.telegramId;

  document.getElementById("avatar").src =
    tgUser?.photo_url ||
    "https://api.dicebear.com/7.x/thumbs/svg?seed=" + (user.telegramId || "guest");

  document.getElementById("coinsMini").innerText = user.coins || 0;

  // LOWER PROFILE CARD
  document.getElementById("p-name").innerText = fullname;
  document.getElementById("p-username").innerText =
    username ? "@" + username : "—";
  document.getElementById("p-id").innerText = "ID: " + user.telegramId;

  document.getElementById("p-avatar").src =
    tgUser?.photo_url ||
    "https://api.dicebear.com/7.x/thumbs/svg?seed=" + (user.telegramId || "guest");

  document.getElementById("coins").innerHTML =
    "<b>Coins:</b> " + (user.coins || 0);

  // CHARACTER
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
    <p>❤️ HP: <b>${c.stats.hp}</b></p>
    <p>⚔ Attack: <b>${c.stats.attack}</b></p>
    <p>🛡 Defense: <b>${c.stats.defense}</b></p>
    <p>⚡ Speed: <b>${c.stats.speed}</b></p>
  `;

  document.getElementById("xpBar").style.width =
    Math.min(100, c.level * 10) + "%";

  document.getElementById("dailyBtn").onclick = claimDaily;
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
    alert("🎁 Claimed! Coins: " + data.coins);
    initProfile();
  } else {
    alert("⏳ wait " + data.cooldown + " minutes");
  }
}