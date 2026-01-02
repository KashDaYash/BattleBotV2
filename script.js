// =========================================
// 1. CONFIG
// =========================================
const tg = window.Telegram?.WebApp;
tg?.ready(); tg?.expand();
const isDebug = !tg.initData; 
let AUTH = null; let activeEnemy = null; let playerCurrentHp = 0;

// 🔥 HELPER: Ensure Path is /images/... (Not public/images)
function resolveImg(imgName) {
  if (!imgName) return "/images/HarutoHikari.jpg"; 
  if (imgName.startsWith("http")) return imgName; 
  
  // Clean up 'public' if present
  let cleanPath = imgName.replace("/public", "").replace("public", "");
  
  // Ensure it starts with /images/
  if (!cleanPath.startsWith("/")) cleanPath = "/" + cleanPath;
  if (!cleanPath.startsWith("/images/")) cleanPath = "/images" + cleanPath;
  
  // Double slash fix just in case (e.g. //images)
  return cleanPath.replace("//", "/");
}

// ... Navigation (Same) ...
const screens = { profile: document.getElementById("screen-profile"), arena: document.getElementById("screen-arena"), shop: document.getElementById("screen-shop"), leaderboard: document.getElementById("screen-leaderboard") };
document.querySelectorAll("nav button").forEach(btn => btn.onclick = () => show(btn.dataset.go));
function show(name){ Object.values(screens).forEach(s => s.classList.remove("active")); screens[name].classList.add("active"); if(name==="profile") loadProfile(false); if(name==="arena") resetArenaUI(); }

// ... Auth (Same) ...
async function authUser(){
  if(isDebug) { AUTH = { user: { telegramId: 123, username: "debug", fullname: "Tester", coins: 999, character: { name: "Ryuujin Kai", image: "/images/RyuujinKai.jpg", level: 10, stats: { hp: 100, attack: 20, defense: 5, speed: 5 }, xp: 0, xpToNext: 100 } } }; return; }
  try { const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData: tg.initData }) }); const data = await res.json(); if(data.ok) AUTH = data; else alert("Login Failed: " + data.message); } catch(e) { alert("Conn Error: " + e.message); }
}

// ... Profile (Same Logic) ...
async function loadProfile(silent){
  const tgUser = tg?.initDataUnsafe?.user || {};
  if(tgUser.id && !silent) { document.getElementById("name").innerText = tgUser.first_name; document.getElementById("avatar").src = tgUser.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${tgUser.id}`; }
  if(!AUTH) await authUser(); if(!AUTH) return; 

  try {
    const res = await fetch("/api/syncUser", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telegramId: AUTH.user.telegramId }) });
    const data = await res.json();
    if(data.ok){
      const u = data.user; const c = u.character; AUTH.user = u; 
      document.getElementById("coinsMini").innerText = u.coins;
      
      const imgPath = resolveImg(c.image); // ✅ Using new resolver

      document.getElementById("profileBox").innerHTML = `
        <div style="background:rgba(0,0,0,0.2); padding:15px; border-radius:12px; display:flex; gap:15px; align-items:center;">
          <img src="${imgPath}" style="width:70px; height:70px; border-radius:10px; object-fit:cover; border:2px solid #fff; background:#000;">
          <div style="flex:1;">
             <div style="font-weight:bold; font-size:16px;">${c.name} <span style="font-size:12px; background:#3498db; padding:2px 6px; border-radius:4px;">Lvl ${c.level}</span></div>
             <div style="font-size:12px; margin-top:6px; opacity:0.9;">❤️ ${c.stats.hp} ⚔️ ${c.stats.attack} 🛡️ ${c.stats.defense}</div>
             <div style="width:100%; height:4px; background:#444; margin-top:8px; border-radius:4px;"><div style="height:100%; width:${(c.xp/c.xpToNext)*100}%; background:#f1c40f;"></div></div>
          </div>
        </div>`;
    }
  } catch(e) { if(!silent) console.error(e); }
}
setInterval(() => { if(document.getElementById("screen-profile").classList.contains("active")) loadProfile(true); }, 3000);

// ... Gameplay (Same Logic) ...
document.getElementById("dailyBtn").onclick = async () => {
  if(!AUTH) await authUser(); try { const res = await fetch("/api/daily", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ telegramId: AUTH.user.telegramId }) }); const data = await res.json(); alert(data.ok ? `🎁 +${data.reward} coins!` : `⏳ ${data.message}`); if(data.ok) loadProfile(false); } catch(e) { alert("Error: " + e.message); }
};

async function searchMonster() {
  if(!AUTH) await authUser(); const btn = event?.target; if(btn) btn.innerText = "Searching...";
  try {
    const res = await fetch("/api/battle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telegramId: AUTH.user.telegramId, action: 'search' }) });
    const data = await res.json();
    document.getElementById("arena-select").style.display = "none"; document.getElementById("arena-preview").style.display = "block"; activeEnemy = data.enemy;
    
    document.getElementById("prevName").innerText = activeEnemy.name;
    document.getElementById("prevImage").src = resolveImg(activeEnemy.image); // ✅
    document.getElementById("prevHp").innerText = activeEnemy.hp; document.getElementById("prevAtk").innerText = activeEnemy.atk; document.getElementById("prevCoin").innerText = activeEnemy.coins;
    if(btn) btn.innerText = "Find Monster"; 
  } catch(e) { alert(e.message); resetArenaUI(); }
}

function startCombat() {
  document.getElementById("arena-preview").style.display = "none"; document.getElementById("arena-fight").style.display = "block";
  document.getElementById("battlePlayerImg").src = resolveImg(AUTH.user.character.image); // ✅
  document.getElementById("battleEnemyImg").src = resolveImg(activeEnemy.image); // ✅
  document.getElementById("battlePlayerName").innerText = AUTH.user.character.name; document.getElementById("battleEnemyName").innerText = activeEnemy.name;
  playerCurrentHp = AUTH.user.character.stats.hp; updateBars(activeEnemy.hp, activeEnemy.maxHp, playerCurrentHp, AUTH.user.character.stats.hp);
  document.getElementById("fightControls").style.display = "flex"; document.getElementById("fightEndBtn").style.display = "none"; document.getElementById("battleLog").innerHTML = "Battle Started...";
}

async function attackTurn() {
  const btn = document.querySelector("#fightControls button.red"); btn.disabled = true;
  const pImg = document.getElementById("battlePlayerImg"); pImg.classList.add("lunge-right"); setTimeout(() => pImg.classList.remove("lunge-right"), 300);
  try {
    const res = await fetch("/api/battle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telegramId: AUTH.user.telegramId, action: 'attack', currentEnemy: activeEnemy, playerHp: playerCurrentHp }) });
    const data = await res.json(); activeEnemy.hp = data.newEnemyHp; playerCurrentHp = data.newPlayerHp; updateBars(activeEnemy.hp, activeEnemy.maxHp, playerCurrentHp, AUTH.user.character.stats.hp);
    data.log.forEach(l => {
        const val = l.msg.replace(" dmg", "");
        if(l.type === 'player') { spawnDamage(val, 'enemy', l.isCrit); const eImg = document.getElementById("battleEnemyImg"); eImg.classList.add("shake"); setTimeout(() => eImg.classList.remove("shake"), 300); }
        else { setTimeout(() => { spawnDamage(val, 'player', false); pImg.classList.add("shake"); setTimeout(() => pImg.classList.remove("shake"), 300); }, 500); }
    });
    if(data.win) { document.getElementById("battleLog").innerHTML = `<span style='color:#2ecc71'>VICTORY! +${activeEnemy.coins} Coins</span>`; endFight(true); }
    else if(data.playerDied) { document.getElementById("battleLog").innerHTML = `<span style='color:red'>DEFEAT...</span>`; endFight(false); }
  } catch(e) { alert(e.message); } btn.disabled = false;
}

function spawnDamage(val, target, isCrit) { const overlay = document.getElementById("damageOverlay"); const el = document.createElement("div"); el.classList.add("damage-text"); if(target === 'enemy') { el.classList.add(isCrit ? "dmg-crit" : "dmg-player"); el.style.left = "75%"; el.style.top = "40%"; } else { el.classList.add("dmg-enemy"); el.style.left = "25%"; el.style.top = "40%"; } el.innerText = val; overlay.appendChild(el); setTimeout(() => el.remove(), 800); }
function updateBars(e, eM, p, pM) { document.getElementById("battleEnemyBar").style.width = (e/eM*100) + "%"; document.getElementById("battlePlayerBar").style.width = (p/pM*100) + "%"; }
function endFight(win) { document.getElementById("fightControls").style.display = "none"; document.getElementById("fightEndBtn").style.display = "block"; if(win) loadProfile(true); }
function resetArenaUI() { document.getElementById("arena-select").style.display = "block"; document.getElementById("arena-preview").style.display = "none"; document.getElementById("arena-fight").style.display = "none"; }
function runAway() { if(confirm("Run away?")) resetArenaUI(); }
show("profile");
