// =========================================
// 1. SETUP & CONFIG
// =========================================
const tg = window.Telegram?.WebApp;
tg?.ready(); 
tg?.expand();

let AUTH = null;
let activeEnemy = null;
let playerCurrentHp = 0;

// Helper: Get Clean Image Filename
function getImgPath(imgName) {
  if (!imgName) return "HarutoHikari.jpg"; 
  return imgName.split('/').pop(); 
}

// Helper: Fix Broken Images
window.fixImg = function(imgEl) {
  const filename = imgEl.getAttribute('data-filename');
  if (!filename) return;
  if (imgEl.src.includes("/public/images/")) {
      imgEl.src = `/images/${filename}`;
  } else if (imgEl.src.includes("/images/")) {
      imgEl.onerror = null; 
      imgEl.src = "https://placehold.co/100x100?text=No+Img"; 
  }
};

// =========================================
// 2. NAVIGATION
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
// 3. AUTHENTICATION & PROFILE
// =========================================
async function authUser(){
  try {
    const res = await fetch("/api/auth", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData })
    });
    const data = await res.json();
    if(data.ok) AUTH = data;
    else alert("Login Failed: " + data.message);
  } catch(e) { alert("Connection Error: " + e.message); }
}

async function loadProfile(silent){
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
    const data = await res.json();

    if(data.ok){
      const u = data.user;
      const c = u.character;
      AUTH.user = u; 
      document.getElementById("coinsMini").innerText = u.coins;

      const filename = getImgPath(c.image);
      
      // ✅ FIX: XP Bar Overflow prevented using Math.min
      const xpPercent = Math.min((c.xp / c.xpToNext) * 100, 100);

      document.getElementById("profileBox").innerHTML = `
        <div style="background:rgba(0,0,0,0.2); padding:15px; border-radius:12px; display:flex; gap:15px; align-items:center;">
          <img src="/public/images/${filename}" 
               data-filename="${filename}"
               onerror="window.fixImg(this)"
               style="width:70px; height:70px; border-radius:10px; object-fit:cover; border:2px solid #fff; background:#000;">
          <div style="flex:1;">
             <div style="font-weight:bold; font-size:16px;">
                ${c.name} 
                <span style="font-size:12px; background:#3498db; padding:2px 6px; border-radius:4px; margin-left:5px;">Lvl ${c.level}</span>
             </div>
             <div style="font-size:12px; margin-top:6px; opacity:0.9; display:grid; grid-template-columns:1fr 1fr; gap:5px;">
                <span>❤️ HP: ${c.stats.hp}</span>
                <span>⚔️ ATK: ${c.stats.attack}</span>
                <span>🛡️ DEF: ${c.stats.defense}</span>
                <span>⚡ SPD: ${c.stats.speed}</span>
             </div>
             <div style="width:100%; height:4px; background:#444; margin-top:8px; border-radius:4px;">
                <div style="height:100%; width:${xpPercent}%; background:#f1c40f; border-radius:4px;"></div>
             </div>
          </div>
        </div>
      `;
    }
  } catch(e) { if(!silent) console.error(e); }
}

setInterval(() => {
  if(document.getElementById("screen-profile").classList.contains("active")) loadProfile(true); 
}, 3000);

// =========================================
// 4. BATTLE LOGIC (FIXED)
// =========================================

// Daily Reward
document.getElementById("dailyBtn").onclick = async () => {
  if(!AUTH) await authUser();
  try {
      const res = await fetch("/api/daily", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ telegramId: AUTH.user.telegramId })
      });
      const data = await res.json();
      alert(data.ok ? `🎁 Reward: ${data.reward} coins!` : `⏳ ${data.message}`);
      if(data.ok) loadProfile(false); 
  } catch(e) { alert("Error: " + e.message); }
};

// Search Monster
async function searchMonster() {
  if(!AUTH) await authUser();
  const btn = event?.target; 
  if(btn) btn.innerText = "Searching...";

  // ✅ FIX: Clear Old Data to prevent Flickering/Ghosting
  activeEnemy = null; 
  document.getElementById("prevImage").src = ""; 
  document.getElementById("prevName").innerText = "Loading...";
  document.getElementById("prevHp").innerText = "-";
  document.getElementById("prevAtk").innerText = "-";

  try {
    const res = await fetch("/api/battle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telegramId: AUTH.user.telegramId, action: 'search' }) });
    const data = await res.json();

    document.getElementById("arena-select").style.display = "none";
    document.getElementById("arena-preview").style.display = "block";
    
    // Set new enemy
    activeEnemy = data.enemy;

    document.getElementById("prevName").innerText = activeEnemy.name;
    const filename = getImgPath(activeEnemy.image);
    const imgEl = document.getElementById("prevImage");
    imgEl.src = `/public/images/${filename}`;
    imgEl.setAttribute("data-filename", filename);
    imgEl.onerror = function() { window.fixImg(this); };

    document.getElementById("prevHp").innerText = activeEnemy.hp;
    document.getElementById("prevAtk").innerText = activeEnemy.atk;
    document.getElementById("prevCoin").innerText = activeEnemy.coins;

    if(btn) btn.innerText = "Find Monster"; 
  } catch(e) { alert(e.message); resetArenaUI(); }
}

// Start Combat UI
function startCombat() {
  if(!activeEnemy) return; // Prevent starting if no enemy

  document.getElementById("arena-preview").style.display = "none";
  document.getElementById("arena-fight").style.display = "block";

  const pFile = getImgPath(AUTH.user.character.image);
  const eFile = getImgPath(activeEnemy.image);

  const pImg = document.getElementById("battlePlayerImg");
  pImg.src = `/public/images/${pFile}`;
  pImg.setAttribute("data-filename", pFile);
  pImg.onerror = function() { window.fixImg(this); };

  const eImg = document.getElementById("battleEnemyImg");
  eImg.src = `/public/images/${eFile}`;
  eImg.setAttribute("data-filename", eFile);
  eImg.onerror = function() { window.fixImg(this); };

  document.getElementById("battlePlayerName").innerText = AUTH.user.character.name;
  document.getElementById("battleEnemyName").innerText = activeEnemy.name;

  playerCurrentHp = AUTH.user.character.stats.hp;
  updateBars(activeEnemy.hp, activeEnemy.maxHp, playerCurrentHp, AUTH.user.character.stats.hp);

  document.getElementById("fightControls").style.display = "flex";
  document.getElementById("fightEndBtn").style.display = "none";
  document.getElementById("battleLog").innerHTML = "Battle Started...";
  
  // Enable button
  const atkBtn = document.querySelector("#fightControls button.red");
  atkBtn.disabled = false;
  atkBtn.style.opacity = "1";
}

// Attack Turn Logic
async function attackTurn() {
  const btn = document.querySelector("#fightControls button.red");
  // ✅ FIX: Disable button instantly to prevent spam
  btn.disabled = true; 
  btn.style.opacity = "0.5";

  // Player Animation
  const pImg = document.getElementById("battlePlayerImg");
  pImg.classList.add("lunge-right");
  setTimeout(() => pImg.classList.remove("lunge-right"), 300);

  try {
    const res = await fetch("/api/battle", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
            telegramId: AUTH.user.telegramId, 
            action: 'attack', 
            currentEnemy: activeEnemy, 
            playerHp: playerCurrentHp 
        }) 
    });
    const data = await res.json();

    // Sync State
    activeEnemy.hp = data.newEnemyHp;
    playerCurrentHp = data.newPlayerHp;
    updateBars(activeEnemy.hp, activeEnemy.maxHp, playerCurrentHp, AUTH.user.character.stats.hp);

    // ✅ ANIMATION LOOP (With Delay)
    data.log.forEach((l, index) => {
        setTimeout(() => {
            if(l.type === 'player') {
                spawnDamage(l.msg, 'enemy', l.isCrit, false);
                const eImg = document.getElementById("battleEnemyImg");
                eImg.classList.add("shake");
                setTimeout(() => eImg.classList.remove("shake"), 300);
            } 
            else if (l.type === 'enemy-miss') {
                spawnDamage("DODGE!", 'player', false, true); 
            }
            else if (l.type === 'levelup') {
                spawnDamage("LEVEL UP!", 'player', true, false); 
            }
            else {
                spawnDamage(l.msg, 'player', false, false);
                pImg.classList.add("shake");
                setTimeout(() => pImg.classList.remove("shake"), 300);
            }
        }, index * 800); // 800ms delay between actions
    });

    // Wait for animations to end
    setTimeout(() => {
        if(data.win) { 
            document.getElementById("battleLog").innerHTML = `<span style='color:#2ecc71; font-weight:bold;'>🏆 VICTORY! <br>+${activeEnemy.coins} Coins</span>`; 
            endFight(true); 
        }
        else if(data.playerDied) { 
            document.getElementById("battleLog").innerHTML = `<span style='color:#e74c3c; font-weight:bold;'>☠️ DEFEAT...</span>`; 
            endFight(false); 
        }
        
        // Re-enable button if fight continues
        if(!data.win && !data.playerDied) {
            btn.disabled = false;
            btn.style.opacity = "1";
        }
    }, data.log.length * 800);

  } catch(e) { 
      alert(e.message); 
      btn.disabled = false; 
      btn.style.opacity = "1";
  }
}

// Damage Text Effect
function spawnDamage(val, target, isCrit, isDodge) {
    const overlay = document.getElementById("damageOverlay");
    const el = document.createElement("div");
    el.classList.add("damage-text");

    if (isDodge) {
        el.classList.add("dmg-dodge");
        el.style.left = "25%"; el.style.top = "20%";
    } 
    else if(target === 'enemy') { 
        el.classList.add(isCrit ? "dmg-crit" : "dmg-player"); 
        el.style.left = "70%"; el.style.top = "30%"; 
    } 
    else { 
        el.classList.add("dmg-enemy"); 
        el.style.left = "30%"; el.style.top = "30%"; 
    }
    
    el.innerText = val; 
    overlay.appendChild(el); 
    setTimeout(() => el.remove(), 800);
}

// UI Helpers
function updateBars(e, eM, p, pM) { 
    document.getElementById("battleEnemyBar").style.width = (e/eM*100) + "%"; 
    document.getElementById("battlePlayerBar").style.width = (p/pM*100) + "%"; 
}
function endFight(win) { 
    document.getElementById("fightControls").style.display = "none"; 
    document.getElementById("fightEndBtn").style.display = "block"; 
    if(win) loadProfile(true); 
}
function resetArenaUI() { 
    document.getElementById("arena-select").style.display = "block"; 
    document.getElementById("arena-preview").style.display = "none"; 
    document.getElementById("arena-fight").style.display = "none"; 
}
function runAway() { if(confirm("Run away?")) resetArenaUI(); }
show("profile");
