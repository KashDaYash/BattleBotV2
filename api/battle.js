import clientPromise from '../lib/mongodb.js';

// 🦖 Monster Database (Updated Tiers)
const MONSTERS = [
  // --- TIER 1: LOW LEVEL (Levels 1-3) ---
  // Ye sab ab shuruwat me milenge:
  { name: "Snirk",   minLvl: 1, hp: 30,  atk: 8,  def: 1, xp: 15, coins: 10, image: "/images/Snirk.png" },
  { name: "Glop",    minLvl: 1, hp: 40,  atk: 6,  def: 2, xp: 20, coins: 15, image: "/images/Glop.png" },
  { name: "Skitter", minLvl: 1, hp: 35,  atk: 10, def: 1, xp: 18, coins: 12, image: "/images/Skitter.png" },
  { name: "Rattle",  minLvl: 2, hp: 50,  atk: 12, def: 3, xp: 25, coins: 20, image: "/images/Rattle.png" }, // Added to Low
  { name: "Gronk",   minLvl: 2, hp: 60,  atk: 15, def: 4, xp: 30, coins: 25, image: "/images/Gronk.png" },  // Added to Low

  // --- TIER 2: MID LEVEL (Levels 4-9) ---
  // Thode strong wale:
  { name: "Zombino", minLvl: 4, hp: 90,  atk: 20, def: 5, xp: 50, coins: 40, image: "/images/Zombino.jpg" },
  { name: "Venmora", minLvl: 5, hp: 100, atk: 22, def: 6, xp: 60, coins: 50, image: "/images/Venmora.jpg" }, // New Mid
  { name: "Floraxa", minLvl: 6, hp: 110, atk: 18, def: 8, xp: 55, coins: 45, image: "/images/Floraxa.jpg" }, // New Mid

  // --- TIER 3: BOSS LEVEL (Levels 10+) ---
  { name: "Voltrix", minLvl: 10, hp: 160, atk: 35, def: 12, xp: 120, coins: 100, image: "/images/Voltrix.jpg" },
  { name: "Grudor",  minLvl: 12, hp: 220, atk: 40, def: 15, xp: 180, coins: 150, image: "/images/Grudor.jpg" },
  { name: "Drakor",  minLvl: 15, hp: 350, atk: 55, def: 20, xp: 350, coins: 300, image: "/images/Drakor.jpg" }
];

export default async function handler(req, res) {
  const { telegramId, action, currentEnemy, playerHp } = req.body; 
  const client = await clientPromise;
  const db = client.db("BattleBotV2");

  const user = await db.collection("users").findOne({ telegramId });
  if(!user) return res.status(404).json({ ok: false, message: "User not found" });

  const player = user.character;

  // ==========================================
  // ACTION: SEARCH MONSTER
  // ==========================================
  if (action === 'search') {
    // 1. Level Filter: Player ke level ke hisab se monster dhundo
    let availableMonsters = MONSTERS.filter(m => m.minLvl <= player.level);
    
    // Fallback
    if (availableMonsters.length === 0) availableMonsters = [MONSTERS[0]];

    const baseEnemy = availableMonsters[Math.floor(Math.random() * availableMonsters.length)];
    
    // 2. Random Variation (+/- 10%)
    const enemy = { 
        ...baseEnemy, 
        hp: Math.floor(baseEnemy.hp * (0.9 + Math.random() * 0.2)) 
    };

    return res.json({ ok: true, type: 'search', enemy });
  }

  // ==========================================
  // ACTION: ATTACK
  // ==========================================
  if (action === 'attack') {
    if (!currentEnemy) return res.status(400).json({ ok: false, message: "No enemy data" });

    let log = []; 
    let win = false; 
    let playerDied = false; 
    let e_hp = currentEnemy.hp; 
    let p_hp = playerHp;

    // --- PHASE 1: PLAYER ATTACKS ---
    const pAtk = player.stats.attack;
    const isCrit = Math.random() > 0.85; 
    
    let rawDmg = Math.floor(pAtk * (0.9 + Math.random() * 0.2));
    if (isCrit) rawDmg = Math.floor(rawDmg * 1.5);

    const eDef = currentEnemy.def || 0;
    const finalDmg = Math.max(1, rawDmg - Math.floor(eDef / 2));

    e_hp -= finalDmg;
    log.push({ msg: `${finalDmg}`, type: 'player', isCrit });

    // --- PHASE 2: CHECK WIN ---
    if (e_hp <= 0) { 
      e_hp = 0; 
      win = true; 
      
      // LEVEL UP LOGIC
      let newXp = player.xp + currentEnemy.xp;
      let newLevel = player.level;
      let newXpToNext = player.xpToNext;
      let newStats = { ...player.stats };

      if (newXp >= newXpToNext) {
          newXp -= newXpToNext; 
          newLevel += 1;
          newXpToNext = Math.floor(newXpToNext * 1.5); 
          
          newStats.hp += 10;
          newStats.attack += 3;
          newStats.defense += 2;
          
          log.push({ msg: "LEVEL UP!", type: 'levelup' });
      }

      await db.collection("users").updateOne({ telegramId }, { 
          $inc: { coins: currentEnemy.coins },
          $set: { 
              "character.xp": newXp, 
              "character.level": newLevel, 
              "character.xpToNext": newXpToNext, 
              "character.stats": newStats 
          }
      }); 
    } 
    else {
      // --- PHASE 3: ENEMY COUNTER ---
      const isDodged = Math.random() < 0.1; 
      
      if (isDodged) {
        log.push({ msg: "MISS", type: 'enemy-miss' });
      } else {
        const eAtk = currentEnemy.atk;
        const pDef = player.stats.defense;
        
        const mDmg = Math.max(1, Math.floor(eAtk - (pDef * 0.4))); 
        
        p_hp -= mDmg;
        log.push({ msg: `${mDmg}`, type: 'enemy' });
        
        if (p_hp <= 0) { p_hp = 0; playerDied = true; }
      }
    }

    return res.json({ ok: true, win, playerDied, newEnemyHp: e_hp, newPlayerHp: p_hp, log });
  }
}
