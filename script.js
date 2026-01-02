const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

let AUTH = null;

// --- Navigation ---
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
  if(name === "arena") resetArenaUI();
}

// --- Auth ---
async function authUser(){
  if (!tg?.initData) return;
  try {
    const res = await fetch("/api/auth", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData })
    });
    const data = await res.json();
    if(data.ok) AUTH = data;
  } catch(e) { console.error("Auth Error", e); }
}

// --- Profile ---
async function loadProfile(){
  if(!AUTH) await authUser();
  if(!AUTH) return;

  const res = await fetch("/api/syncUser", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId: AUTH.user.telegramId })
  });
  const data = await res.json();
  
  if(data.ok){
    const u = data.user;
    const c = u.character;
    
    document.getElementById("name").innerText = u.fullname;
    document.getElementById("username").innerText = "@" + u.username;
    document.getElementById("coinsMini").innerText = u.coins;
    document.getElementById("avatar").src = tg.initDataUnsafe?.user?.photo_url || 
      `https://api.dicebear.com/7.x/bottts/svg?seed=${u.telegramId}`;

    document.getElementById("profileBox").innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <div>⚡ Lvl ${c.level}</div>
        <div>❤️ HP ${c.stats.hp}</div>
        <div>⚔️ Atk ${c.stats.attack}</div>
        <div>🛡️ Def ${c.stats.defense}</div>
      </div>
      <div style="margin-top:10px; font-size:12px; opacity:0.7">XP: ${c.xp} / ${c.xpToNext}</div>
    `;
  }
}

// --- Daily Reward ---
document.getElementById("dailyBtn").onclick = async () => {
  if(!AUTH) await authUser();
  const res = await fetch("/api/daily", {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ telegramId: AUTH.user.telegramId })
  });
  const data = await res.json();
  alert(data.ok ? `🎁 You got ${data.reward} coins!` : `⏳ ${data.message}`);
  if(data.ok) loadProfile();
};

// --- Arena Logic ---
function resetArenaUI() {
  document.getElementById("monsterHpBar").style.width = "100%";
  document.getElementById("monsterHpText").innerText = "HP: 100%";
  document.getElementById("monsterName").innerText = "Wild Monster";
  document.getElementById("battleLog").innerHTML = "A wild monster appeared! Ready to fight?";
}

document.getElementById("attackBtn").onclick = async () => {
  if(!AUTH) await authUser();
  const logBox = document.getElementById("battleLog");
  
  logBox.innerHTML += `<p style="opacity:0.5">⚔️ Attacking...</p>`;
  logBox.scrollTop = logBox.scrollHeight;

  const res = await fetch("/api/battle", {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ telegramId: AUTH.user.telegramId })
  });
  const data = await res.json();

  if(!data.ok) { logBox.innerHTML = "Error!"; return; }

  // Update UI based on result
  document.getElementById("monsterName").innerText = data.monsterName;
  
  // Clear log and animate lines
  logBox.innerHTML = "";
  data.log.forEach((line, i) => {
    setTimeout(() => {
      logBox.innerHTML += `<p>${line}</p>`;
      logBox.scrollTop = logBox.scrollHeight;
    }, i * 300); // 300ms delay per line for effect
  });

  // Final Outcome
  setTimeout(() => {
    if(data.win) {
      document.getElementById("monsterHpBar").style.width = "0%";
      document.getElementById("monsterHpText").innerText = "HP: 0";
      logBox.innerHTML += `<p style="color:#2ecc71; margin-top:5px"><b>🏆 VICTORY! +${data.reward.coins} Coins</b></p>`;
      loadProfile(); // Background refresh
    } else {
      logBox.innerHTML += `<p style="color:#e74c3c; margin-top:5px"><b>💀 DEFEAT...</b></p>`;
    }
    logBox.scrollTop = logBox.scrollHeight;
  }, data.log.length * 300);
};

// Init
show("profile");
