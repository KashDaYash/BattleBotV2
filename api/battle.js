import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  const { telegramId, action, currentEnemy } = req.body; 
  const client = await clientPromise;
  const db = client.db("BattleBotV2");
  
  const user = await db.collection("users").findOne({ telegramId });
  if(!user) return res.status(404).json({ ok: false, message: "User not found" });

  const player = user.character;

  if (action === 'search') {
    const monsters = [
      // ✅ Correct URLs (No 'public')
      { name: "Snirk", hp: 30, maxHp: 30, atk: 8, xp: 15, coins: 10, image: "/images/Snirk.png" },
      { name: "Glop", hp: 40, maxHp: 40, atk: 5, xp: 20, coins: 15, image: "/images/Glop.png" },
      { name: "Gronk", hp: 50, maxHp: 50, atk: 12, xp: 25, coins: 20, image: "/images/Gronk.png" },
      { name: "Skitter", hp: 35, maxHp: 35, atk: 10, xp: 18, coins: 12, image: "/images/Skitter.png" },
      { name: "Rattle", hp: 45, maxHp: 45, atk: 11, xp: 22, coins: 18, image: "/images/Rattle.png" },
      { name: "Zombino", hp: 55, maxHp: 55, atk: 13, xp: 28, coins: 22, image: "/images/Zombino.jpg" },

      { name: "Grudor", hp: 120, maxHp: 120, atk: 15, xp: 50, coins: 40, image: "/images/Grudor.jpg" },
      { name: "Voltrix", hp: 80, maxHp: 80, atk: 25, xp: 60, coins: 50, image: "/images/Voltrix.jpg" },
      { name: "Glacier", hp: 150, maxHp: 150, atk: 12, xp: 70, coins: 60, image: "/images/Glacier.jpg" },
      { name: "Abyzoth", hp: 100, maxHp: 100, atk: 20, xp: 80, coins: 70, image: "/images/Abyzoth.jpg" },
      { name: "Venmora", hp: 90, maxHp: 90, atk: 18, xp: 55, coins: 45, image: "/images/Venmora.jpg" },
      { name: "Floraxa", hp: 110, maxHp: 110, atk: 14, xp: 45, coins: 35, image: "/images/Floraxa.jpg" },
      { name: "Nimbrax", hp: 60, maxHp: 60, atk: 30, xp: 40, coins: 30, image: "/images/Nimbrax.jpg" },
      { name: "Drakor", hp: 200, maxHp: 200, atk: 35, xp: 150, coins: 150, image: "/images/Drakor.jpg" },
      { name: "Zarnok", hp: 70, maxHp: 70, atk: 22, xp: 50, coins: 40, image: "/images/Zarnok.jpg" },
      { name: "Silicox", hp: 130, maxHp: 130, atk: 18, xp: 90, coins: 80, image: "/images/Silicox.jpg" }
    ];
    
    const enemy = monsters[Math.floor(Math.random() * monsters.length)];
    return res.json({ ok: true, type: 'search', enemy });
  }

  // ... Attack logic same as before ...
  if (action === 'attack') {
    if (!currentEnemy) return res.status(400).json({ ok: false, message: "No enemy" });
    let log = []; let win = false; let playerDied = false; let e_hp = currentEnemy.hp; let p_hp = req.body.playerHp;
    const dmg = Math.floor(player.stats.attack * (0.9 + Math.random() * 0.3));
    const isCrit = Math.random() > 0.85; const finalDmg = isCrit ? Math.floor(dmg * 1.5) : dmg;
    e_hp -= finalDmg; log.push({ msg: `${finalDmg} dmg`, type: 'player', isCrit });
    if (e_hp <= 0) { e_hp = 0; win = true; await db.collection("users").updateOne({ telegramId }, { $inc: { coins: currentEnemy.coins, "character.xp": currentEnemy.xp } }); }
    else { const mDmg = Math.max(1, Math.floor(currentEnemy.atk - (player.stats.defense * 0.2))); p_hp -= mDmg; log.push({ msg: `${mDmg} dmg`, type: 'enemy' }); if (p_hp <= 0) { p_hp = 0; playerDied = true; } }
    return res.json({ ok: true, type: 'attack', win, playerDied, newEnemyHp: e_hp, newPlayerHp: p_hp, log });
  }
}
