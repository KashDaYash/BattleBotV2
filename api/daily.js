import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  const { telegramId } = req.body;
  const client = await clientPromise;
  const db = client.db("BattleBotV2");
  const users = db.collection("users");

  const user = await users.findOne({ telegramId });
  const now = new Date();
  
  // 24 Hours in milliseconds
  const COOLDOWN = 24 * 60 * 60 * 1000; 

  if (user.lastDaily) {
      const last = new Date(user.lastDaily);
      const diff = now - last;

      if (diff < COOLDOWN) {
          // Calculate remaining time
          const remaining = COOLDOWN - diff;
          const hours = Math.floor(remaining / (1000 * 60 * 60));
          const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
          
          return res.json({ 
              ok: false, 
              message: `Come back in ${hours}h ${minutes}m!` 
          });
      }
  }

  // Claim Reward
  await users.updateOne({ telegramId }, { $inc: { coins: 100 }, $set: { lastDaily: now } });
  res.json({ ok: true, reward: 100 });
}
