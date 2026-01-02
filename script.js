// =========================================
// 1. INITIALIZATION & SETUP
// =========================================
const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

// Testing Mode
const isDebug = !tg.initData; 

let AUTH = null;

// GLOBAL VARIABLES FOR BATTLE
let activeEnemy = null; // Store current monster data
let playerCurrentHp = 0; // Track local HP during fight

// =========================================
// 2. NAVIGATION SYSTEM
// =========================================
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
  
  if(name === "profile") loadProfile(false);
  if(name === "arena") resetArenaUI();
}


// =========================================
// 3. AUTHENTICATION
// =========================================
async function authUser(){
  if (isDebug) {
    console.warn("⚠️ Browser Mode");
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

  } catch(e) { alert("Connection Error: " + e.message); }
}


// =========================================
// 4. PROFILE LOADER (Realtime)
// =========================================
async function loadProfile(silent = false){
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

    if(!res.ok && !silent) return;

    const data = await res.json();
    
    if(data.ok){
      const u = data.user;
      const c = u.character;

      document.getElementById("coinsMini").innerText = u.coins;
      document.getElementById("name").innerText = u.fullname; 
      
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
  } catch (e) { if(!silent) console.error(e); }
}

// Auto Refresh Profile
setInterval(() => {
  if(document.getElementById("screen-profile").classList.contains("active")) {
    loadProfile(true); 
  }
}, 3000);


// =========================================
// 5. DAILY REWARD
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
  } catch(e) { alert("Error: " + e.message); }
};


// =========================================
// 6. ARENA SYSTEM (New Turn-Based Logic)
// =========================================

// A. Reset UI
function resetArenaUI() {
  document.getElementById("arena-select").style.display = "block";
  document.getElementById("arena-preview").style.display = "none";
  document.getElementById("arena-fight").style.display = "none";
}

// B. Step 1: SEARCH MONSTER
async function searchMonster() {
  if(!AUTH) await authUser();

  // Button loading state
  const btn = event?.target; 
  if(btn) btn.innerText = "Searching...";

  try {
    const res = await fetch("/api/battle", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId: AUTH.user.telegramId, action: 'search' })
    });
    const data = await res.json();

    // Show Preview
    document.getElementById("arena-select").style.display = "none";
    document.getElementById("arena-preview").style.display = "block";
    
    // Set Data
    activeEnemy = data.enemy;
    document.getElementById("prevName").innerText = activeEnemy.name;
    document.getElementById("prevEmoji").innerText = activeEnemy.emoji;
    document.getElementById("prevHp").innerText = activeEnemy.hp;
    document.getElementById("prevAtk").innerText = activeEnemy.atk;
    document.getElementById("prevCoin").innerText = activeEnemy.coins;
    document.getElementById("prevXp").innerText = activeEnemy.xp;

    if(btn) btn.innerText = "Find Monster (PvM)"; // Reset Button Text

  } catch(e) { alert("Error: " + e.message); resetArenaUI(); }
}

// C. Step 2: START COMBAT (User accepted fight)
function startCombat() {
  document.getElementById("arena-preview").style.display = "none";
  document.getElementById("arena-fight").style.display = "block";

  // Init UI
  document.getElementById("battleEnemyName").innerText = activeEnemy.name;
  document.getElementById("battleEnemyEmoji").innerText = activeEnemy.emoji;
  
  // Set HP Bars
  const maxHp = AUTH.user.character.stats.hp;
  playerCurrentHp = maxHp; // Full HP at start
  updateBars(activeEnemy.hp, activeEnemy.maxHp, playerCurrentHp, maxHp);

  document.getElementById("battleLog").innerHTML = `<p style="color:yellow; margin-bottom:5px;">⚠️ You encountered a ${activeEnemy.name}!</p>`;
  document.getElementById("fightControls").style.display = "flex";
  document.getElementById("fightEndBtn").style.display = "none";
}

// D. Step 3: PLAYER ATTACK TURN
async function attackTurn() {
  const logBox = document.getElementById("battleLog");
  
  // Disable Button
  const atkBtn = document.querySelector("#fightControls button:last-child");
  atkBtn.disabled = true;
  atkBtn.innerText = "Wait...";

  try {
    const res = await fetch("/api/battle", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        telegramId: AUTH.user.telegramId, 
        action: 'attack',
        currentEnemy: activeEnemy,
        playerHp: playerCurrentHp
      })
    });
    const data = await res.json();

    // Update Local State
    activeEnemy.hp = data.newEnemyHp;
    playerCurrentHp = data.newPlayerHp;

    // Show Logs
    data.log.forEach(l => {
        const p = document.createElement("p");
        p.innerText = l.msg;
        p.style.color = l.type === 'player' ? '#3498db' : '#e74c3c';
        p.style.marginBottom = "4px";
        p.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
        logBox.appendChild(p);
    });
    logBox.scrollTop = logBox.scrollHeight;

    // Update Bars
    updateBars(activeEnemy.hp, activeEnemy.maxHp, playerCurrentHp, AUTH.user.character.stats.hp);

    // Check Win/Loss
    if(data.win) {
        logBox.innerHTML += `<p style="color:#2ecc71; font-weight:bold; margin-top:10px; font-size:14px;">🏆 VICTORY! Earned ${activeEnemy.coins} coins.</p>`;
        endFight(true);
    } else if (data.playerDied) {
        logBox.innerHTML += `<p style="color:red; font-weight:bold; margin-top:10px; font-size:14px;">💀 YOU DIED...</p>`;
        endFight(false);
    }

  } catch(e) { alert("Error: " + e.message); }
  
  // Re-enable Button
  atkBtn.disabled = false;
  atkBtn.innerText = "⚔️ ATTACK";
}

// Helper: Update Bars
function updateBars(eHp, eMax, pHp, pMax) {
    let ePct = (eHp/eMax*100); if(ePct<0) ePct=0;
    document.getElementById("battleEnemyBar").style.width = ePct + "%";
    document.getElementById("battleEnemyHpText").innerText = eHp + " / " + eMax;
    
    let pPct = (pHp/pMax*100); if(pPct<0) pPct=0;
    document.getElementById("battlePlayerBar").style.width = pPct + "%";
    document.getElementById("battlePlayerHpText").innerText = pHp;
}

// Helper: End Fight
function endFight(win) {
    document.getElementById("fightControls").style.display = "none";
    document.getElementById("fightEndBtn").style.display = "block";
    if(win) loadProfile(true); // Update coins silently
    
    // Auto scroll to bottom
    const logBox = document.getElementById("battleLog");
    logBox.scrollTop = logBox.scrollHeight;
}

// E. Run Away
function runAway() {
    if(confirm("Are you sure you want to run?")) {
        resetArenaUI();
        alert("🏃 You ran away safely!");
    }
}

// START APP
show("profile");
