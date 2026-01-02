import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  const { telegramId } = req.body;
  const client = await clientPromise;
  const db = client.db("BattleBotV2");
  
  const user = await db.collection("users").findOne({ telegramId });
  if(!user) return res.json({ ok: false });

  const player = user.character;
  
  // Monsters List
  const monsters = [
    { name: "Slime", hp: 40, atk: 5, xp: 10, coins: 10 },
    { name: "Wolf", hp: 60, atk: 10, xp: 20, coins: 20 },
    { name: "Orc", hp: 90, atk: 15, xp: 40, coins: 40 }
  ];
  
  // Random Monster Select
  const monster = monsters[Math.floor(Math.random() * monsters.length)];
  
  let playerHp = player.stats.hp;
  let monsterHp = monster.hp;
  let log = [`⚠️ You encountered a wild ${monster.name}!`];
  let win = false;

  // Turn-based loop
  while(playerHp > 0 && monsterHp > 0) {
    // Player Attack
    let dmg = Math.floor(player.stats.attack * (0.9 + Math.random() * 0.2));
    monsterHp -= dmg;
    log.push(`⚔️ You hit ${monster.name} for ${dmg} dmg.`);
    
    if(monsterHp <= 0) { win = true; break; }

    // Monster Attack
    let mDmg = Math.max(0, Math.floor(monster.atk - (player.stats.defense * 0.5)));
    if(mDmg === 0) mDmg = 1; // Minimum 1 damage
    playerHp -= mDmg;
    log.push(`🛡️ ${monster.name} hit you for ${mDmg} dmg.`);
  }

  // Result Save
  const reward = { coins: 0, xp: 0 };
  if(win) {
    reward.coins = monster.coins;
    reward.xp = monster.xp;
    await db.collection("users").updateOne(
      { telegramId },
      { $inc: { coins: reward.coins, "character.xp": reward.xp } }
    );
    log.push(`${monster.name} defeated!`);
  } else {
    log.push("You were knocked out...");
  }

  res.json({ ok: true, win, log, monsterName: monster.name, reward });
}
