const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

// Testing Mode: Agar Telegram me nahi khula hai to true ho jayega
const isDebug = !tg.initData; 

let AUTH = null;

// ---------------- NAVIGATION ---------------- //
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

// ---------------- AUTHENTICATION ---------------- //
async function authUser(){
  // 1. Agar Browser me hai, to fake Auth create karo (Testing ke liye)
  if (isDebug) {
    console.warn("⚠️ Running in Browser Mode (Mock Data)");
    AUTH = {
      user: {
        telegramId: 123456,
        username: "test_user",
        fullname: "Test Warrior",
        coins: 500,
        character: { 
          name: "Debug Bot", level: 5, xp: 50, xpToNext: 100,
          stats: { hp: 100, attack: 20, defense: 10, speed: 5 }
        }
      }
    };
    return;
  }

  // 2. Real Telegram Auth
  try {
    const res = await fetch("/api/auth", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData })
    });
    
    const data = await res.json();
    if(data.ok) {
      AUTH = data;
    } else {
      console.error("Auth Failed:", data);
      document.getElementById("profileBox").innerText = "Login Failed. Try reopening.";
    }
  } catch(e) {
    console.error("Connection Error", e);
    document.getElementById("profileBox").innerText = "Connection Error.";
  }
}

// ---------------- PROFILE LOADER (FIXED) ---------------- //
async function loadProfile(){
  // Step A: Pehle turant Telegram ka local data dikhao (Wait mat karo)
  const tgUser = tg?.initDataUnsafe?.user || {};
  
  // Set Basic Info from Telegram immediately
  if(tgUser.id) {
    document.getElementById("name").innerText = `${tgUser.first_name} ${tgUser.last_name || ''}`.trim();
    document.getElementById("username").innerText = tgUser.username ? `@${tgUser.username}` : "No Username";
    // Photo Logic (Telegram photo nahi hai to DiceBear use karo)
    document.getElementById("avatar").src = tgUser.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${tgUser.id}`;
  }

  // Step B: Ab Server se latest data lo
  if(!AUTH) await authUser();
  if(!AUTH) return; // Agar abhi bhi auth nahi hua to ruk jao

  // Server sync call
  try {
    const res = await fetch("/api/syncUser", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId: AUTH.user.telegramId })
    });
    const data = await res.json();
    
    if(data.ok){
      const u = data.user;
      const c = u.character;
      
      // Update UI with Server Data (Ye final data hai)
      document.getElementById("name").innerText = u.fullname;
      document.getElementById("username").innerText = u.username ? `@${u.username}` : "@warrior";
      document.getElementById("coinsMini").innerText = u.coins;
      
      // Avatar Fallback again (just in case)
      if(!document.getElementById("avatar").src) {
         document.getElementById("avatar").src = `https://api.dicebear.com/7.x/bottts/svg?seed=${u.telegramId}`;
      }

      // Character Stats Box
      document.getElementById("profileBox").innerHTML = `
        <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:10px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:14px;">
            <div>🤖 <b>${c.name}</b></div>
            <div>⚡ Lvl: ${c.level}</div>
            <div>❤️ HP: ${c.stats.hp}</div>
            <div>⚔️ Atk: ${c.stats.attack}</div>
          </div>
          <div style="margin-top:8px; font-size:12px; opacity:0.7; border-top:1px solid rgba(255,255,255,0.1); padding-top:5px;">
             ✨ XP: ${c.xp} / ${c.xpToNext}
          </div>
        </div>
        <div style="margin-top:10px; font-size:12px; text-align:center; opacity:0.5">
          User ID: ${u.telegramId}
        </div>
      `;
    }
  } catch (e) {
    console.error("Sync Error:", e);
  }
}

// ---------------- DAILY REWARD ---------------- //
document.getElementById("dailyBtn").onclick = async () => {
  if(!AUTH) await authUser();
  if(!AUTH) return alert("Please wait, logging in...");

  const res = await fetch("/api/daily", {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ telegramId: AUTH.user.telegramId })
  });
  const data = await res.json();
  alert(data.ok ? `🎁 You got ${data.reward} coins!` : `⏳ ${data.message}`);
  if(data.ok) loadProfile();
};

// ---------------- ARENA UI ---------------- //
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

  document.getElementById("monsterName").innerText = data.monsterName;
  logBox.innerHTML = "";
  
  data.log.forEach((line, i) => {
    setTimeout(() => {
      logBox.innerHTML += `<p>${line}</p>`;
      logBox.scrollTop = logBox.scrollHeight;
    }, i * 300);
  });

  setTimeout(() => {
    if(data.win) {
      document.getElementById("monsterHpBar").style.width = "0%";
      document.getElementById("monsterHpText").innerText = "HP: 0";
      logBox.innerHTML += `<p style="color:#2ecc71; margin-top:5px"><b>🏆 VICTORY! +${data.reward.coins} Coins</b></p>`;
      loadProfile(); 
    } else {
      logBox.innerHTML += `<p style="color:#e74c3c; margin-top:5px"><b>💀 DEFEAT...</b></p>`;
    }
    logBox.scrollTop = logBox.scrollHeight;
  }, data.log.length * 300);
};

// Start
show("profile");
