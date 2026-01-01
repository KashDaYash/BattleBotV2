// ---------------- TELEGRAM INIT ---------------- //
const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

let AUTH = null;   // server se authenticated user payload

// ---------------- SCREEN SYSTEM ---------------- //
const screens = {
  profile: document.getElementById("screen-profile"),
  arena: document.getElementById("screen-arena"),
  shop: document.getElementById("screen-shop"),
  leaderboard: document.getElementById("screen-leaderboard"),
};

document.querySelectorAll("nav button").forEach(btn => {
  btn.onclick = () => show(btn.dataset.go);
});

function show(name){
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");

  if(name === "profile") loadProfile();
}

show("profile");


// ---------------- AUTH (calls /api/auth) ---------------- //
async function authUser(){
  if (!tg?.initData) {
    alert("Open from Telegram bot only");
    return;
  }

  const res = await fetch("/api/auth", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ initData: tg.initData })
  });

  const data = await res.json();
  if(!data.ok){
    alert("Auth failed");
    return;
  }

  AUTH = data;
}


// ---------------- PROFILE LOADER ---------------- //
async function loadProfile(){

  if(!AUTH) await authUser();
  if(!AUTH) return;

  const res = await fetch("/api/syncUser", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ telegramId: AUTH.user.telegramId })
  });

  const data = await res.json();
  if(!data.ok){
    document.getElementById("profileBox").innerHTML = "❌ Could not load profile";
    return;
  }

  const user = data.user;
  const char = data.character;
  const tgUser = tg?.initDataUnsafe?.user || {};

  // header
  document.getElementById("name").innerText =
    user.fullname || tgUser.first_name || "Player";

  document.getElementById("username").innerText =
    user.username ? "@" + user.username :
    tgUser.username ? "@" + tgUser.username : "@unknown";

  document.getElementById("avatar").src =
    tgUser.photo_url ||
    `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.telegramId}`;

  document.getElementById("coinsMini").innerText = user.coins || 0;
  document.getElementById("uid").innerText = "ID: " + user.telegramId;

  // profile card
  document.getElementById("profileBox").innerHTML = `
    <div class="glass" style="padding:10px">
      <p><b>Character:</b> ${char.name}</p>
      <p><b>Level:</b> ${char.level}</p>
      <p><b>HP:</b> ${char.stats.hp}</p>
      <p><b>Attack:</b> ${char.stats.attack}</p>
      <p><b>Defense:</b> ${char.stats.defense}</p>
      <p><b>Speed:</b> ${char.stats.speed}</p>
    </div>
  `;
}


// ---------------- DAILY REWARD ---------------- //
document.getElementById("dailyBtn").onclick = async () => {
  if(!AUTH) await authUser();
  if(!AUTH) return;

  const res = await fetch("/api/daily", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ telegramId: AUTH.user.telegramId })
  });

  const data = await res.json();

  if(data.ok){
    alert("🎁 Claimed " + data.reward + " coins");
    loadProfile();
  } else {
    alert("⏳ " + data.message);
  }
};

// -------------- ARENA FIGHT -------------- //
async function startFight(){

  if(!AUTH) await authUser();
  if(!AUTH) return;

  const res = await fetch("/api/battle", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ telegramId: AUTH.user.telegramId })
  });

  const data = await res.json();

  if(!data.ok) return alert("Battle error");

  let text = "";
  data.log.forEach(l => text += l + "\n");

  if(data.win){
    text += `\n🎉 Victory!\n+${data.reward.coins} coins\n+${data.reward.xp} XP`;
  } else {
    text += `\n💀 Defeat...`;
  }

  alert(text);

  loadProfile();
}

document.getElementById("arenaBox").innerHTML =
  `<button onclick="startFight()" style="
     padding:10px;border:none;border-radius:14px;background:#ff7675;color:#000;width:100%">
     ⚔ Start Battle
   </button>`;