// =========================================
// 1. SETUP & CONFIG
// =========================================
const tg = window.Telegram?.WebApp;
tg?.ready(); 
tg?.expand();

let AUTH = null;
let activeEnemy = null;
let playerCurrentHp = 0; // Global Player HP Tracker

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

      // Update Global HP Tracker when profile loads
      playerCurrentHp = c.stats.hp;

      const filename = getImgPath(c.image);
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
// 4. BATTLE LOGIC (SMOOTH HP BARS)
// =========================================

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

async function searchMonster() {
  if(!AUTH) await authUser();
  const btn = event?.target; 
  if(btn) btn.innerText = "Searching...";

  // Reset UI
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

function startCombat() {
  if(!activeEnemy) return;

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

  // IMPORTANT: Set initial HP for bars
  playerCurrentHp = AUTH.user.character.stats.hp; 
  
  // Set bars to full initially or current state
  updateBars(activeEnemy.hp, activeEnemy.maxHp, playerCurrentHp, AUTH.user.character.stats.hp);

  document.getElementById("fightControls").style.display = "flex";
  document.getElementById("fightEndBtn").style.display = "none";
  
  // Clear Logs
  const logBox = document.getElementById("battleLog");
  logBox.innerHTML = "";
  addLog("⚔️ Battle Started!", "neutral");
  
  const atkBtn = document.querySelector("#fightControls button.red");
  atkBtn.disabled = false;
  atkBtn.style.opacity = "1";
}

async function attackTurn() {
  const btn = document.querySelector("#fightControls button.red");
  btn.disabled = true; 
  btn.style.opacity = "0.5";

  // Player Animation
  const pImg = document.getElementById("battlePlayerImg");
  pImg.classList.add("lunge-right");
  setTimeout(() => pImg.classList.remove("lunge-right"), 300);

  // 🔥 IMPORTANT: Capture HP BEFORE API updates it
  let visualEnemyHp = activeEnemy.hp;
  let visualPlayerHp = playerCurrentHp;

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

    // NOTE: Hum data ko save karenge, par display 'visual' variables se karenge
    activeEnemy.hp = data.newEnemyHp;
    playerCurrentHp = data.newPlayerHp; // Global tracker update

    let delay = 0;

    data.log.forEach((l) => {
        setTimeout(() => {
            if(l.type === 'player') {
                addLog(`👊 You hit <b>${l.msg}</b> dmg!`, l.isCrit ? "crit" : "player");
                spawnDamage(l.msg, 'enemy', l.isCrit, false);
                
                // Shake Enemy
                const eImg = document.getElementById("battleEnemyImg");
                eImg.classList.add("shake");
                setTimeout(() => eImg.classList.remove("shake"), 300);

                // 🔥 LOGIC FIX: Subtract from VISUAL variable
                let dmg = parseInt(l.msg);
                visualEnemyHp -= dmg; 
                if(visualEnemyHp < 0) visualEnemyHp = 0;
                
                updateBars(visualEnemyHp, activeEnemy.maxHp, visualPlayerHp, AUTH.user.character.stats.hp);
            } 
            else if (l.type === 'enemy-miss') {
                 addLog(`💨 You dodged the attack!`, "dodge");
                 spawnDamage("DODGE!", 'player', false, true); 
            }
            else if (l.type === 'levelup') {
                 addLog(`✨ LEVEL UP! Stats increased!`, "gold");
                 spawnDamage("LEVEL UP!", 'player', true, false); 
            }
            else {
                addLog(`💔 Enemy hit <b>${l.msg}</b> dmg!`, "enemy");
                spawnDamage(l.msg, 'player', false, false);

                // Shake Player
                pImg.classList.add("shake");
                setTimeout(() => pImg.classList.remove("shake"), 300);

                 // 🔥 LOGIC FIX: Subtract from VISUAL variable
                 let dmg = parseInt(l.msg);
                 visualPlayerHp -= dmg;
                 if(visualPlayerHp < 0) visualPlayerHp = 0;

                 updateBars(visualEnemyHp, activeEnemy.maxHp, visualPlayerHp, AUTH.user.character.stats.hp);
            }
        }, delay);
        
        delay += 800; // 800ms gap for each action
    });

    // End Logic
    setTimeout(() => {
        // Ensure final state matches backend exactly
        updateBars(data.newEnemyHp, activeEnemy.maxHp, data.newPlayerHp, AUTH.user.character.stats.hp);

        if(data.win) { 
            addLog(`🏆 <b>VICTORY!</b> +${activeEnemy.coins} Coins`, "win");
            endFight(true); 
        }
        else if(data.playerDied) { 
            addLog(`☠️ <b>DEFEAT...</b> You fainted.`, "lose");
            endFight(false); 
        }
        
        if(!data.win && !data.playerDied) {
            btn.disabled = false;
            btn.style.opacity = "1";
        }
    }, delay + 200);

  } catch(e) { 
      alert(e.message); 
      btn.disabled = false; 
      btn.style.opacity = "1";
  }
}

// Log Function
function addLog(msg, type) {
    const logBox = document.getElementById("battleLog");
    const p = document.createElement("div");
    p.innerHTML = msg;
    p.style.marginBottom = "4px";
    
    if(type === 'player') p.style.color = "#3498db";
    if(type === 'crit') p.style.color = "#f1c40f";
    if(type === 'enemy') p.style.color = "#e74c3c";
    if(type === 'dodge') p.style.color = "#1abc9c";
    if(type === 'win') p.style.color = "#2ecc71";
    if(type === 'lose') p.style.color = "#95a5a6";
    
    logBox.prepend(p);
}

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

function updateBars(e, eM, p, pM) { 
    // Calculate percentage based on CURRENT / MAX
    let ePer = (e / eM) * 100;
    let pPer = (p / pM) * 100;

    // Safety clamps
    if(ePer < 0) ePer = 0;
    if(pPer < 0) pPer = 0;
    if(ePer > 100) ePer = 100;
    if(pPer > 100) pPer = 100;

    document.getElementById("battleEnemyBar").style.width = ePer + "%"; 
    document.getElementById("battlePlayerBar").style.width = pPer + "%"; 
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
