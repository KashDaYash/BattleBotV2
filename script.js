// ---------------- TELEGRAM SETUP ---------------- //
const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

// Testing ke liye: Agar Telegram me nahi khula hai to
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
  
  if(name === "profile") loadProfile(false); // False = User ne click kiya, Alert dikhao agar error ho
  if(name === "arena") resetArenaUI();
}

// ---------------- AUTHENTICATION ---------------- //
async function authUser(){
  // 1. Browser Mode (Fake Data for Testing)
  if (isDebug) {
    AUTH = {
      user: {
        telegramId: 123456,
        username: "browser_test",
        fullname: "Debug Warrior",
        coins: 999,
        character: { name: "Test Bot", level: 10, xp: 500, xpToNext: 1000, stats: { hp: 100, attack: 50, defense: 20, speed: 10 } }
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
    
    if(!res.ok) {
        const txt = await res.text();
        alert("🚨 Auth Error: " + txt); // Auth fail hona bada issue hai, alert karo
        return;
    }

    const data = await res.json();
    if(data.ok) AUTH = data;
    else alert("❌ Login Failed: " + data.message);

  } catch(e) {
    alert("❌ Connection Error (Auth): " + e.message);
  }
}

// ---------------- PROFILE LOADER (REALTIME + ALERT) ---------------- //
// silent = true matlab background refresh (Alert mat dikhana)
// silent = false matlab user ne open kiya (Error aaye to Alert dikhana)
async function loadProfile(silent = false){
  
  // 1. Local Data (Turant dikhane ke liye)
  const tgUser = tg?.initDataUnsafe?.user || {};
  if(tgUser.id && !silent) {
     document.getElementById("name").innerText = tgUser.first_name;
     document.getElementById("avatar").src = tgUser.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${tgUser.id}`;
  }

  if(!AUTH) await authUser();
  if(!AUTH) return; 

  try {
    const res = await fetch("/api/syncUser", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId: AUTH.user.telegramId })
    });

    // Error Handling
    if(!res.ok) {
        if(!silent) {
            const txt = await res.text();
            alert("⚠️ API Error (Sync): " + res.status + "\n" + txt.slice(0, 100));
        }
        return;
    }

    const data = await res.json();
    
    if(data.ok){
      const u = data.user;
      const c = u.character;

      // Update UI
      document.getElementById("coinsMini").innerText = u.coins;
      document.getElementById("name").innerText = u.fullname; // DB name priority
      
      // Stats Box
      document.getElementById("profileBox").innerHTML = `
        <div style="background:rgba(0,0,0,0.2); padding:15px; border-radius:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
             <span style="font-size:18px; font-weight:bold;">🤖 ${c.name}</span>
             <span style="background:#3498db; padding:2px 8px; border-radius:6px; font-size:12px;">Lvl ${c.level}</span>
          </div>
          <div style="font-size:13px; opacity:0.8; display:grid; grid-template-columns:1fr 1fr; gap:5px">
            <div>❤️ HP: ${c.stats.hp}</div>
            <div>⚔️ ATK: ${c.stats.attack}</div>
            <div>🛡️ DEF: ${c.stats.defense}</div>
            <div>⚡ SPD: ${c.stats.speed}</div>
          </div>
          <div style="margin-top:10px;">
             <div style="font-size:10px; display:flex; justify-content:space-between">
                <span>XP Progress</span>
                <span>${c.xp} / ${c.xpToNext}</span>
             </div>
             <div style="width:100%; height:4px; background:#444; border-radius:4px; margin-top:2px;">
                <div style="height:100%; background:#f1c40f; width:${(c.xp/c.xpToNext)*100}%"></div>
             </div>
          </div>
        </div>
      `;
    } else {
      if(!silent) alert("❌ Logic Error: " + data.message);
    }

  } catch (e) {
    if(!silent) alert("❌ Catch Error: " + e.message);
  }
}

// 🔥 REALTIME ENGINE (3 Second Loop)
setInterval(() => {
  // Sirf tab refresh karo jab Profile screen active ho
  if(document.getElementById("screen-profile").classList.contains("active")) {
    loadProfile(true); // TRUE bheja hai, matlab error aane par ALERT MAT DIKHAO
  }
}, 3000);


// ---------------- DAILY REWARD ---------------- //
document.getElementById("dailyBtn").onclick = async () => {
  if(!AUTH) await authUser();
  
  try {
      const res = await fetch("/api/daily", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ telegramId: AUTH.user.telegramId })
      });
      
      if(!res.ok) {
          alert("Server Error in Daily Reward"); 
          return;
      }

      const data = await res.json();
      alert(data.ok ? `🎁 You got ${data.reward} coins!` : `⏳ ${data.message}`);
      
      if(data.ok) loadProfile(false); // Update stats immediately

  } catch(e) {
      alert("Error: " + e.message);
  }
};

// ---------------- ARENA LOGIC ---------------- //
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

  try {
      const res = await fetch("/api/battle", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ telegramId: AUTH.user.telegramId })
      });

      if(!res.ok) {
         const txt = await res.text();
         logBox.innerHTML += `<p style="color:red">Error: ${res.status}</p>`;
         alert("Battle Error: " + txt);
         return;
      }

      const data = await res.json();

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
          loadProfile(true); // Background stats update
        } else {
          logBox.innerHTML += `<p style="color:#e74c3c; margin-top:5px"><b>💀 DEFEAT...</b></p>`;
        }
        logBox.scrollTop = logBox.scrollHeight;
      }, data.log.length * 300);

  } catch(e) {
      alert("Battle Network Error: " + e.message);
  }
};

// Start
show("profile");
