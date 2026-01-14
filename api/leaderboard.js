import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db("BattleBotV2");
  
  // Frontend se filter mango ('level' ya 'coins')
  // Agar kuch nahi aaya to default 'level' mano
  const { filter } = req.body || {}; 

  let sortQuery = {};

  if (filter === 'coins') {
      // Sort by Coins (High to Low)
      sortQuery = { coins: -1, "character.level": -1 };
  } else {
      // Default: Sort by Level (High to Low)
      sortQuery = { "character.level": -1, coins: -1 };
  }

  try {
    const topUsers = await db.collection("users")
      .find({}, { projection: { 
          fullname: 1, 
          username: 1, 
          "character.level": 1, 
          coins: 1 
      }})
      .sort(sortQuery)
      .limit(10)
      .toArray();

    return res.json({ ok: true, leaderboard: topUsers, filterType: filter || 'level' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
