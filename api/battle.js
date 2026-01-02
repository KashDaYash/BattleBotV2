import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  const { telegramId, action, currentEnemy } = req.body; 
  // action: 'search' | 'attack'
  
  const client = await clientPromise;
  const db = client.db("BattleBotV2");
  
  const user = await db.collection("users").findOne({ telegramId });
  if(!user) return res.status(404).json({ ok: false, message: "User not found" });

  const player = user.character;

  // ==========================================
  // CASE 1: SEARCH MONSTER (Fight start nahi hui)
  // ==========================================
  if (action === 'search') {
    const monsters = [
      { name: "Slime", hp: 40, maxHp: 40, atk: 5, xp: 10, coins: 5, emoji: "💧" },
      { name: "Wolf", hp: 70, maxHp: 70, atk: 12, xp: 25, coins: 15, emoji: "🐺" },
      { name: "Goblin", hp: 100, maxHp: 100, atk: 18, xp: 40, coins: 30, emoji: "👺" },
      { name: "Orc", hp: 150, maxHp: 150, atk: 25, xp: 80, coins: 60, emoji: "👹" },
      { name: "Dragon", hp: 300, maxHp: 300, atk: 40, xp: 200, coins: 200, emoji: "🐲" }
    ];
    
    // Level ke hisab se difficulty filter kar sakte ho (abhi random hai)
    const enemy = monsters[Math.floor(Math.random() * monsters.length)];
    
    return res.json({ ok: true, type: 'search', enemy });
  }

  // ==========================================
  // CASE 2: ATTACK (1 Turn Calculation)
  // ==========================================
  if (action === 'attack') {
    if (!currentEnemy) return res.status(400).json({ ok: false, message: "No enemy found" });

    let log = [];
    let win = false;
    let playerDied = false;
    
    let e_hp = currentEnemy.hp;
    let p_hp = req.body.playerHp || player.stats.hp; // Frontend se current HP lo

    // 1. PLAYER ATTACKS
    const dmg = Math.floor(player.stats.attack * (0.9 + Math.random() * 0.2));
    const isCrit = Math.random() > 0.8; // 20% Crit chance
    const finalDmg = isCrit ? Math.floor(dmg * 1.5) : dmg;

    e_hp -= finalDmg;
    log.push({ 
      msg: `⚔️ You dealt ${finalDmg} dmg ${isCrit ? '(CRIT!)' : ''}`, 
      type: 'player' 
    });

    // 2. CHECK ENEMY DEATH
    if (e_hp <= 0) {
      e_hp = 0;
      win = true;
      // Reward Save
      await db.collection("users").updateOne(
        { telegramId },
        { $inc: { coins: currentEnemy.coins, "character.xp": currentEnemy.xp } }
      );
    } else {
      // 3. ENEMY ATTACKS BACK (Agar zinda hai)
      const mDmg = Math.max(1, Math.floor(currentEnemy.atk - (player.stats.defense * 0.3)));
      p_hp -= mDmg;
      log.push({ 
        msg: `🛡️ ${currentEnemy.name} hit you for ${mDmg} dmg`, 
        type: 'enemy' 
      });

      if (p_hp <= 0) {
        p_hp = 0;
        playerDied = true;
      }
    }

    return res.json({ 
      ok: true, 
      type: 'attack', 
      win, 
      playerDied,
      newEnemyHp: e_hp,
      newPlayerHp: p_hp,
      log 
    });
  }
}
