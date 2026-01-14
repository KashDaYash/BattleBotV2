import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  const { telegramId, action } = req.body;
  const client = await clientPromise;
  const db = client.db("BattleBotV2");
  
  // 1. SEARCH OPPONENT
  if (action === 'search') {
      // Find a random user who is NOT me
      const pipeline = [
          { $match: { telegramId: { $ne: telegramId } } }, // Khud ko exclude karo
          { $sample: { size: 1 } } // Random 1 uthao
      ];
      
      const opponent = await db.collection("users").aggregate(pipeline).toArray();
      
      if (opponent.length === 0) {
          return res.json({ ok: false, message: "No opponents found!" });
      }

      const enemy = opponent[0];
      
      // Calculate Win Rate (Optional)
      const total = (enemy.pvpWins || 0) + (enemy.pvpLosses || 0);
      const winRate = total === 0 ? 0 : Math.round((enemy.pvpWins / total) * 100);

      // Construct Safe Enemy Object (Sensitive data mat bhejo)
      const enemyData = {
          name: enemy.fullname,
          username: enemy.username,
          level: enemy.character.level,
          hp: enemy.character.stats.hp,
          maxHp: 100 + (enemy.character.level * 10), // Formula same rakhna
          atk: enemy.character.stats.attack,
          def: enemy.character.stats.defense,
          image: enemy.character.image,
          winRate: winRate,
          // PvP Rewards are Higher
          xp: enemy.character.level * 20, 
          coins: enemy.character.level * 50
      };

      return res.json({ ok: true, enemy: enemyData });
  }
}
