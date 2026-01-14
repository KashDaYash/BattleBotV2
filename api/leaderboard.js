import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db("BattleBotV2");

  try {
    // Top 10 users sort by Level (desc) then Coins (desc)
    const topUsers = await db.collection("users")
      .find({}, { projection: { 
          fullname: 1, 
          username: 1, 
          "character.level": 1, 
          coins: 1 
      }})
      .sort({ "character.level": -1, coins: -1 })
      .limit(10)
      .toArray();

    return res.json({ ok: true, leaderboard: topUsers });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
