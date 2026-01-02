// =========================================
// 1. INITIALIZATION & SETUP
// =========================================
const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

// Testing Mode: Agar Telegram me nahi khula hai to True
const isDebug = !tg.initData; 

let AUTH = null;

// =========================================
// 2. NAVIGATION SYSTEM
// =========================================
const screens = {
  profile: document.getElementById("screen-profile"),
  arena: document.getElementById("screen-arena"),
  shop: document.getElementById("screen-shop"),
  leaderboard: document.getElementById("screen-leaderboard"),
};

// Bottom Nav Click Listeners
document.querySelectorAll("nav button").forEach(btn => {
  btn.onclick = () => show(btn.dataset.go);
});

function show(name){
  // Sab screens chupao
  Object.values(screens).forEach(s => s.classList.remove("active"));
  // Jo mangi hai wo dikhao
  screens[name].classList.add("active");
  
  // Specific Actions
  if(name === "profile") loadProfile(false); // False = User clicked, show alerts if error
  if(name === "arena") resetArenaUI();      // Arena hamesha Menu se start ho
}


// =========================================
// 3. AUTHENTICATION (Login)
// =========================================
async function authUser(){
  // A. Browser Testing (Fake Data)
  if (isDebug) {
    console.warn("⚠️ Running in Browser Mode (Mock Data)");
    AUTH = {
      user: {
        telegramId: 123456,
        username: "browser_test",
        fullname: "Debug Warrior",
        coins: 100,
        character: { 
          name: "Test Bot", level: 1, xp: 0, xpToNext: 100, 
          stats: { hp: 100, attack: 15, defense: 5, speed: 5 } 
        }
      }
    };
    return;
  }

  // B. Real Telegram Login
  try {
    const res = await fetch("/api/auth", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData })
    });
    
    if(!res.ok) {
        const txt = await res.text();
        alert("🚨 Auth Error: " + txt);
        return;
    }

    const data = await res.json();
    if(data.ok) AUTH = data;
    else alert("❌ Login Failed: " + data.message);

  } catch(e) {
    alert("❌ Connection Error (Auth): " + e.message);
  }
}


// =========================================
// 4. PROFILE LOADER (Realtime)
// =========================================
// silent = true (Background refresh, No alerts)
// silent = false (User click, Show alerts)
async function loadProfile(silent = false){
  
  // 1. Local Data (Instant Show)
  const tgUser = tg?.initDataUnsafe?.user || {};
  if(tgUser.id && !silent) {
     document.getElementById("name").innerText = tgUser.first_name;
     document.getElementById("avatar").src = tgUser.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${tgUser.id}`;
  }

  // 2. Auth Check
  if(!AUTH) await authUser();
  if(!AUTH) return; 

  try {
    // 3. Fetch Data
    const res = await fetch("/api/syncUser", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId: AUTH.user.telegramId })
    });

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

      // 4. Update UI
      document.getElementById("coinsMini").innerText = u.coins;
      document.getElementById("name").innerText = u.fullname; 
      
      // Stats Box HTML
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
    } 

  } catch (e) {
    if(!silent) alert("❌ Catch Error: " + e.message);
  }
}

// 🔥 Realtime Engine (Auto-Refresh every 3 seconds)
setInterval(() => {
  if(document.getElementById("screen-profile").classList.contains("active")) {
    loadProfile(true); 
  }
}, 3000);


// =========================================
// 5. DAILY REWARD SYSTEM
// =========================================
document.getElementById("dailyBtn").onclick = async () => {
  if(!AUTH) await authUser();
  
  try {
      const res = await fetch("/api/daily", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ telegramId: AUTH.user.telegramId })
      });
      
      const data = await res.json();
      alert(data.ok ? `🎁 You got ${data.reward} coins!` : `⏳ ${data.message}`);
      
      if(data.ok) loadProfile(false); 

  } catch(e) {
      alert("Error: " + e.message);
  }
};


// =========================================
// 6. ARENA & BATTLE SYSTEM (PvP + PvM)
// =========================================

// A. Reset UI (Back to Menu)
function resetArenaUI() {
  document.getElementById("arena-select").style.display = "block";
  document.getElementById("arena-fight").style.display = "none";
  document.getElementById("backToArenaBtn").style.display = "none";
}

// B. Start Battle
async function startBattle(mode) {
  if(!AUTH) await authUser();

  // Switch Screens
  document.getElementById("arena-select").style.display = "none";
  document.getElementById("arena-fight").style.display = "block";
  
  // Reset Visuals
  document.getElementById("enemyHpBar").style.width = "100%";
  document.getElementById("playerHpBar").style.width = "100%";
  document.getElementById("enemyHpText").innerText = "HP: 100%";
  document.getElementById("playerHpText").innerText = "100%";
  
  document.getElementById("enemyName").innerText = "Searching...";
  document.getElementById("enemyEmoji").innerText = mode === 'pvp' ? "🤺" : "🦖";
  
  const logBox = document.getElementById("battleLog");
  logBox.innerHTML = "<p>🔍 Searching for opponent...</p>";
  
  try {
    // API Call
    const res = await fetch("/api/battle", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ telegramId: AUTH.user.telegramId, mode: mode })
    });

    const data = await res.json();
    if(!data.ok) { 
        alert("Error: " + data.message); 
        resetArenaUI(); 
        return; 
    }

    // Found Opponent
    document.getElementById("enemyName").innerText = data.enemyName;
    logBox.innerHTML = ""; // Clear log

    // 🔥 ANIMATION LOOP (Play Turn-by-Turn)
    let step = 0;
    
    function playTurn() {
        if (step >= data.events.length) {
            // End of Fight
            document.getElementById("backToArenaBtn").style.display = "block";
            if(data.win) loadProfile(true); // Update coins in background
            return;
        }

        const event = data.events[step];
        
        // 1. Add Log Text
        const p = document.createElement("p");
        p.innerText = event.text;
        p.style.opacity = "0";
        p.style.animation = "fadeIn 0.3s forwards"; // CSS animation
        
        // Color coding
        if(event.text.includes("VICTORY")) p.style.color = "#2ecc71";
        if(event.text.includes("DEFEAT")) p.style.color = "#e74c3c";
        if(event.text.includes("You hit")) p.style.color = "#3498db";
        
        logBox.appendChild(p);
        logBox.scrollTop = logBox.scrollHeight;

        // 2. Update HP Bars (Math)
        // Enemy HP
        let e_pct = (event.e_hp / event.e_max) * 100;
        if(e_pct < 0) e_pct = 0;
        document.getElementById("enemyHpBar").style.width = e_pct + "%";
        document.getElementById("enemyHpText").innerText = "HP: " + Math.floor(e_pct) + "%";
        
        // Player HP
        let p_pct = (event.p_hp / event.p_max) * 100;
        if(p_pct < 0) p_pct = 0;
        document.getElementById("playerHpBar").style.width = p_pct + "%";
        document.getElementById("playerHpText").innerText = Math.floor(p_pct) + "%";

        // Next Turn (Delay 0.8s)
        step++;
        setTimeout(playTurn, 800); 
    }

    // Start Animation
    playTurn();

  } catch(e) {
      alert("Network Error: " + e.message);
      resetArenaUI();
  }
}

// Start App
show("profile");
