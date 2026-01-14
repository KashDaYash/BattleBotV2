// =========================================
// 1. SETUP & CONFIG
// =========================================
const tg = window.Telegram?.WebApp;
tg?.ready(); 
tg?.expand();

let AUTH = null;
let activeEnemy = null;
let playerCurrentHp = 0; // Tracks HP during battle

// Helper: Get Clean Image Filename
function getImgPath(imgName) {
  if (!imgName) return "HarutoHikari.jpg"; 
  return imgName.split('/').pop(); 
}

// Helper: Fix Broken Images (Fallback)
window.fixImg = function(imgEl) {
  const filename = imgEl.getAttribute('data-filename');
  if (!filename) return;
  // Try public path first, then images path, then placeholder
  if (imgEl.src.includes("/public/images/")) {
      imgEl.src = `/images/${filename}`;
  } else if (imgEl.src.includes("/images/")) {
      imgEl.onerror = null; 
      imgEl.src = "https://placehold.co/100x100/333/fff?text=Item"; 
  }
};

const screens = {
  profile: document.getElementById("screen-profile"),
  arena: document.getElementById("screen-arena"),
  shop: document.getElementById("screen-shop"),
  leaderboard: document.getElementById("screen-leaderboard"),
};

// Navigation Handling
document.querySelectorAll("nav button").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    show(btn.dataset.go);
  };
});

function show(name){
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
  
  // Load specific data when tab opens
  if(name === "profile") loadProfile(false);
  if(name === "arena") resetArenaUI();
  if(name === "shop") loadShop(); 
  if(name === "leaderboard") loadLeaderboard('level');
}

// =========================================
// 2. AUTH, PROFILE & BACKPACK
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
      
      // Update Top Header
      document.getElementById("coinsMini").innerText = u.coins;
      const userEl = document.getElementById("username");
      const safeName = u.username ? `@${u.username}` : "No Username";
      userEl.innerHTML = `<span style="color:#3b82f6; font-weight:600;">${safeName}</span><br><span style="font-size:11px; opacity:0.6;">ID: ${u.telegramId}</span>`;

      // Character Card Stats
      const filename = getImgPath(c.image);
      const maxHp = 100 + (c.level * 10); // Formula must match backend logic
      const hpPercent = Math.min((c.stats.hp / maxHp) * 100, 100);
      const xpPercent = Math.min((c.xp / c.xpToNext) * 100, 100);

      document.getElementById("profileBox").innerHTML = `
        <div style="background:rgba(0,0,0,0.3); padding:15px; border-radius:12px; display:flex; gap:15px; align-items:center; border:1px solid rgba(255,255,255,0.05);">
          <img src="/public/images/${filename}" 
               data-filename="${filename}"
               onerror="window.fixImg(this)"
               style="width:70px; height:70px; border-radius:10px; object-fit:cover; border:2px solid #fff; background:#000;">
          <div style="flex:1;">
             <div style="font-weight:bold; font-size:16px;">
                ${c.name} 
                <span style="font-size:11px; background:#3b82f6; padding:2px 6px; border-radius:4px; margin-left:5px;">Lvl ${c.level}</span>
             </div>
             
             <div style="font-size:11px; margin-top:8px; display:flex; justify-content:space-between; color:#cbd5e1;">
                 <span>HP ${c.stats.hp} / ${maxHp}</span>
             </div>
             <div style="width:100%; height:8px; background:#334155; margin-top:2px; border-radius:4px; overflow:hidden;">
                <div style="height:100%; width:${hpPercent}%; background:#2ecc71; transition:width 0.3s;"></div>
             </div>

             <div style="font-size:12px; margin-top:8px; display:grid; grid-template-columns:1fr 1fr; gap:4px; color:#cbd5e1;">
                <span>⚔️ ATK: ${c.stats.attack}</span>
                <span>🛡️ DEF: ${c.stats.defense}</span>
                <span>⚡ SPD: ${c.stats.speed}</span>
             </div>
             
             <div style="width:100%; height:4px; background:#334155; margin-top:8px; border-radius:4px;">
                <div style="height:100%; width:${xpPercent}%; background:#facc15; border-radius:4px;"></div>
             </div>
          </div>
        </div>
        
        <h3 style="margin-top:20px; font-size:16px;">🎒 Backpack</h3>
        ${renderBackpack(u.inventory)}
      `;

      // OWNER PANEL BUTTON (Only for ID: 1302298741)
      if (AUTH.user.telegramId === 1302298741) {
          if (!document.getElementById("adminBtn")) {
              const btn = document.createElement("button");
              btn.id = "adminBtn";
              btn.innerText = "🛡️ OWNER PANEL";
              btn.className = "action-btn"; 
              btn.style.background = "#0f172a"; 
              btn.style.border = "1px solid #334155";
              btn.style.marginTop = "15px";
              btn.onclick = () => { window.location.href = "admin.html"; };
              document.querySelector("#screen-profile .content-box").appendChild(btn);
          }
      }
    }
  } catch(e) { if(!silent) console.error(e); }
}

// --- BACKPACK HELPERS ---
function renderBackpack(inventory) {
    if (!inventory || inventory.length === 0) {
        return `<div style="padding:15px; text-align:center; background:rgba(0,0,0,0.2); border-radius:10px; font-size:13px; color:#94a3b8;">Empty Backpack</div>`;
    }

    let html = `<div class="backpack-grid">`;
    
    inventory.forEach((item) => {
        let actionBtn = "";
        let color = "#fff";
        
        if (item.type === 'potion') {
            color = "#22c55e";
            actionBtn = `<button onclick="useItem('${item.name}')" style="width:100%; margin-top:5px; background:#22c55e; border:none; padding:6px; border-radius:6px; color:black; font-weight:bold; font-size:11px; cursor:pointer;">Use</button>`;
        } else {
            actionBtn = `<div style="font-size:10px; color:#94a3b8; margin-top:8px;">Equipped</div>`;
        }

        let icon = item.type === 'weapon' ? '⚔️' : item.type === 'armor' ? '🛡️' : '🧪';

        html += `
        <div class="bp-item" style="border-bottom: 2px solid ${color}">
            <div style="font-size:24px;">${icon}</div>
            <div style="font-size:12px; font-weight:bold; margin-top:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.name}</div>
            ${actionBtn}
        </div>`;
    });
    
    html += `</div>`;
    return html;
}

async function useItem(itemName) {
    const res = await fetch('/api/shop', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ telegramId: AUTH.user.telegramId, action: 'use', itemId: itemName })
    });
    const data = await res.json();
    alert(data.message); // Shows "HP Full" or "Used"
    if(data.ok) loadProfile(false); // Refresh HP Bar
}

// Daily Reward
document.getElementById("dailyBtn").onclick = async () => {
  if(!AUTH) await authUser();
  try {
      const res = await fetch("/api/daily", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ telegramId: AUTH.user.telegramId })
      });
      const data = await res.json();
      // Message contains either reward or time remaining
      alert(data.ok ? `🎁 Reward: ${data.reward} coins!` : `⏳ ${data.message}`);
      if(data.ok) loadProfile(false); 
  } catch(e) { alert("Error: " + e.message); }
};

// Auto Refresh Profile
setInterval(() => {
  if(document.getElementById("screen-profile").classList.contains("active")) loadProfile(true); 
}, 5000);


// =========================================
// 3. SHOP SYSTEM (With Balance)
// =========================================
async function loadShop() {
    const shopContainer = document.querySelector("#screen-shop .content-box");
    
    // Balance Widget
    let balanceHtml = `<div style="text-align:center; padding:12px; background:rgba(245, 158, 11, 0.1); border-radius:10px; margin-bottom:15px; border:1px solid rgba(245, 158, 11, 0.3);">
        <div style="font-size:12px; color:#fbbf24;">Your Balance</div>
        <div style="font-size:20px; font-weight:bold; color:#fff;">💰 ${AUTH?.user?.coins || 0}</div>
    </div>`;

    shopContainer.innerHTML = balanceHtml + "<h3>🛒 Loading Items...</h3>";

    if(!AUTH) await authUser();

    try {
        const res = await fetch('/api/shop', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ telegramId: AUTH.user.telegramId, action: 'getShop' })
        });
        const data = await res.json();

        if (!data.items || data.items.length === 0) {
            shopContainer.innerHTML = balanceHtml + "<h3>🛒 Shop</h3><p>Shop is empty.</p>";
            return;
        }

        let html = balanceHtml + `<h3>🛒 Equipment</h3>`;
        
        data.items.forEach(item => {
            let icon = "❓";
            let color = "#fff";
            if(item.type === 'weapon') { icon = "⚔️"; color = "#ef4444"; }
            if(item.type === 'armor') { icon = "🛡️"; color = "#3b82f6"; }
            if(item.type === 'potion') { icon = "🧪"; color = "#22c55e"; }

            html += `
            <div class="item-card" style="border-left: 4px solid ${color}">
                <div class="item-icon">${icon}</div>
                <div style="flex:1;">
                    <div style="font-weight:bold;">${item.name}</div>
                    <div style="font-size:12px; opacity:0.7;">+${item.stat} ${item.type.toUpperCase()}</div>
                </div>
                <button onclick="buyItem('${item.name}')" class="action-btn" style="width:auto; padding:8px 15px; font-size:13px; background:#facc15; color:#000; margin:0; box-shadow:none;">
                    ${item.price} 💰
                </button>
            </div>`;
        });
        
        shopContainer.innerHTML = html;

    } catch (e) { shopContainer.innerHTML = "Error loading shop."; }
}

async function buyItem(itemName) {
    if(!confirm(`Buy ${itemName}?`)) return;

    const res = await fetch('/api/shop', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ telegramId: AUTH.user.telegramId, action: 'buy', itemId: itemName })
    });
    const data = await res.json();
    alert(data.message);
    if(data.ok) {
        authUser().then(() => loadShop()); // Reload to show new balance
    } 
}

// =========================================
// 4. LEADERBOARD (Filters)
// =========================================
async function loadLeaderboard(filter = 'level') {
    const box = document.querySelector("#screen-leaderboard .content-box");
    box.innerHTML = `<h3>🏆 Leaderboard</h3><p>Loading...</p>`;

    try {
        const res = await fetch('/api/leaderboard', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ filter: filter })
        });
        const data = await res.json();

        // Filter Buttons
        let btnLevelStyle = filter === 'level' ? 'background:#facc15; color:#000;' : 'background:rgba(255,255,255,0.1); color:#fff;';
        let btnCoinStyle = filter === 'coins' ? 'background:#facc15; color:#000;' : 'background:rgba(255,255,255,0.1); color:#fff;';

        let html = `
            <h3>🏆 Leaderboard</h3>
            <div style="display:flex; gap:10px; margin-bottom:15px;">
                <button onclick="loadLeaderboard('level')" style="flex:1; padding:10px; border:none; border-radius:8px; font-weight:bold; cursor:pointer; ${btnLevelStyle}">⚡ Levels</button>
                <button onclick="loadLeaderboard('coins')" style="flex:1; padding:10px; border:none; border-radius:8px; font-weight:bold; cursor:pointer; ${btnCoinStyle}">💰 Rich List</button>
            </div>
        `;
        
        if(data.leaderboard.length === 0) {
             html += "<p>No players yet.</p>";
        } else {
             html += `<div style="display:flex; flex-direction:column; gap:8px;">`;
             data.leaderboard.forEach((u, index) => {
                 let rankClass = index === 0 ? "rank-1" : index === 1 ? "rank-2" : index === 2 ? "rank-3" : "";
                 let rankIcon = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index+1}`;
                 let bgStyle = index === 0 ? "background:linear-gradient(90deg, rgba(251, 191, 36, 0.1), transparent); border-left:3px solid #facc15;" : "background:rgba(255,255,255,0.03);";
                 
                 let displayVal = filter === 'coins' ? `${u.coins} 💰` : `Lvl ${u.character?.level || 1}`;

                 html += `
                 <div style="${bgStyle} padding:12px; border-radius:8px; display:flex; align-items:center; justify-content:space-between;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <span style="font-size:16px; width:25px; font-weight:bold;" class="${rankClass}">${rankIcon}</span>
                        <div>
                            <div style="font-weight:600; font-size:14px;">${u.fullname}</div>
                            <div style="font-size:11px; opacity:0.5;">@${u.username || 'unknown'}</div>
                        </div>
                    </div>
                    <div style="font-weight:bold; color:#facc15; font-size:14px;">${displayVal}</div>
                 </div>`;
             });
             html += `</div>`;
        }
        box.innerHTML = html;
    } catch(e) { box.innerHTML = "Error loading leaderboard."; }
}


// =========================================
// 5. BATTLE LOGIC (Refined)
// =========================================
async function searchMonster() {
  if(!AUTH) await authUser();
  const btn = event?.target; 
  if(btn) btn.innerText = "Searching...";

  activeEnemy = null; 
  document.getElementById("prevImage").src = ""; 
  document.getElementById("prevName").innerText = "Loading...";

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

  document.getElementById("battlePlayerImg").src = `/public/images/${pFile}`;
  document.getElementById("battleEnemyImg").src = `/public/images/${eFile}`;

  document.getElementById("battlePlayerName").innerText = AUTH.user.character.name;
  document.getElementById("battleEnemyName").innerText = activeEnemy.name;

  playerCurrentHp = AUTH.user.character.stats.hp; 
  updateBars(activeEnemy.hp, activeEnemy.maxHp, playerCurrentHp, AUTH.user.character.stats.hp);

  document.getElementById("fightControls").style.display = "flex";
  document.getElementById("fightEndBtn").style.display = "none";
  
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

  const pImg = document.getElementById("battlePlayerImg");
  pImg.classList.add("lunge-right");
  setTimeout(() => pImg.classList.remove("lunge-right"), 300);

  // Store visual state before API returns
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

    activeEnemy.hp = data.newEnemyHp;
    playerCurrentHp = data.newPlayerHp;

    let delay = 0;

    data.log.forEach((l) => {
        setTimeout(() => {
            if(l.type === 'player') {
                addLog(`👊 You hit <b>${l.msg}</b> dmg!`, l.isCrit ? "crit" : "player");
                spawnDamage(l.msg, 'enemy', l.isCrit, false);
                
                document.getElementById("battleEnemyImg").classList.add("shake");
                setTimeout(() => document.getElementById("battleEnemyImg").classList.remove("shake"), 300);

                let dmg = parseInt(l.msg);
                visualEnemyHp = Math.max(0, visualEnemyHp - dmg);
                updateBars(visualEnemyHp, activeEnemy.maxHp, visualPlayerHp, AUTH.user.character.stats.hp);
            } 
            else if (l.type === 'enemy-miss') {
                 addLog(`💨 You dodged!`, "dodge");
                 spawnDamage("DODGE!", 'player', false, true); 
            }
            else if (l.type === 'levelup') {
                 addLog(`✨ LEVEL UP!`, "gold");
                 spawnDamage("LEVEL UP!", 'player', true, false); 
            }
            else {
                addLog(`💔 Took <b>${l.msg}</b> dmg!`, "enemy");
                spawnDamage(l.msg, 'player', false, false);

                pImg.classList.add("shake");
                setTimeout(() => pImg.classList.remove("shake"), 300);

                 let dmg = parseInt(l.msg);
                 visualPlayerHp = Math.max(0, visualPlayerHp - dmg);
                 updateBars(visualEnemyHp, activeEnemy.maxHp, visualPlayerHp, AUTH.user.character.stats.hp);
            }
        }, delay);
        
        delay += 800; 
    });

    setTimeout(() => {
        // Sync final state
        updateBars(data.newEnemyHp, activeEnemy.maxHp, data.newPlayerHp, AUTH.user.character.stats.hp);

        if(data.win) { 
            addLog(`🏆 <b>VICTORY!</b> +${activeEnemy.coins} Coins`, "win");
            endFight(true); 
        }
        else if(data.playerDied) { 
            addLog(`☠️ <b>DEFEAT...</b>`, "lose");
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

// LOGS: Scroll to bottom style
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
    
    logBox.appendChild(p); 
    logBox.scrollTop = logBox.scrollHeight; 
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
    if(!eM) eM = 100; 
    if(!pM) pM = 100;

    let ePer = (e / eM) * 100;
    let pPer = (p / pM) * 100;

    document.getElementById("battleEnemyBar").style.width = Math.max(0, Math.min(100, ePer)) + "%"; 
    document.getElementById("battlePlayerBar").style.width = Math.max(0, Math.min(100, pPer)) + "%"; 
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

// INIT
show("profile");
