import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  const { telegramId, mode } = req.body; // mode: 'pvm' or 'pvp'
  const client = await clientPromise;
  const db = client.db("BattleBotV2");
  
  // 1. Apna Player Lao
  const user = await db.collection("users").findOne({ telegramId });
  if(!user) return res.json({ ok: false, message: "User not found" });

  const player = user.character;
  let enemy;

  // 2. Enemy Choose Karo (PvM ya PvP)
  if (mode === 'pvp') {
    // Database se koi RANDOM real player uthao (jo hum khud na ho)
    const randomUsers = await db.collection("users").aggregate([
      { $match: { telegramId: { $ne: telegramId } } }, // Khud ko chhod kar
      { $sample: { size: 1 } } // Koi 1 random banda
    ]).toArray();

    if (randomUsers.length === 0) {
      // Agar koi aur player nahi hai, to Fake Bot de do
      enemy = { name: "Bot Player", hp: 100, atk: 10, xp: 20, coins: 20, isBot: true };
    } else {
      const u = randomUsers[0];
      enemy = { 
        name: u.fullname, 
        hp: u.character.stats.hp, 
        atk: u.character.stats.attack, 
        xp: u.character.level * 10, 
        coins: u.coins > 50 ? 50 : 10, // Max 50 loot
        isBot: false 
      };
    }
  } else {
    // PvM: Monsters List
    const monsters = [
      { name: "Slime", hp: 40, atk: 5, xp: 10, coins: 10 },
      { name: "Wolf", hp: 60, atk: 10, xp: 20, coins: 20 },
      { name: "Orc", hp: 90, atk: 15, xp: 40, coins: 40 },
      { name: "Dragon", hp: 150, atk: 25, xp: 100, coins: 100 }
    ];
    enemy = monsters[Math.floor(Math.random() * monsters.length)];
  }

  // 3. Battle Simulation (Smart Logs)
  let p_hp = player.stats.hp;
  let p_max = player.stats.hp;
  let e_hp = enemy.hp;
  let e_max = enemy.hp;
  
  let events = []; // Yahan hum text + HP dono bhejenge
  let win = false;

  // Start Log
  events.push({ 
    text: `⚠️ Found ${enemy.name} (HP: ${e_hp})!`, 
    p_hp, e_hp, p_max, e_max 
  });

  while(p_hp > 0 && e_hp > 0) {
    // Player Attack
    let dmg = Math.floor(player.stats.attack * (0.9 + Math.random() * 0.2));
    e_hp -= dmg;
    if(e_hp < 0) e_hp = 0;
    
    events.push({ 
      text: `⚔️ You hit ${enemy.name} for -${dmg}`, 
      p_hp, e_hp, p_max, e_max 
    });

    if(e_hp <= 0) { win = true; break; }

    // Enemy Attack
    let mDmg = Math.max(1, Math.floor(enemy.atk - (player.stats.defense * 0.3)));
    p_hp -= mDmg;
    if(p_hp < 0) p_hp = 0;

    events.push({ 
      text: `🛡️ ${enemy.name} hit you for -${mDmg}`, 
      p_hp, e_hp, p_max, e_max 
    });
  }

  // 4. Result Save
  const reward = { coins: 0, xp: 0 };
  if(win) {
    reward.coins = enemy.coins;
    reward.xp = enemy.xp;
    await db.collection("users").updateOne(
      { telegramId },
      { $inc: { coins: reward.coins, "character.xp": reward.xp } }
    );
    events.push({ text: `🏆 VICTORY!`, p_hp, e_hp, p_max, e_max });
  } else {
    events.push({ text: `💀 DEFEAT...`, p_hp, e_hp, p_max, e_max });
  }

  res.json({ ok: true, win, events, enemyName: enemy.name, reward });
}
