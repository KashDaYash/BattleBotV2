import { MongoClient } from "mongodb";

const mongoUri = process.env.MONGO_URI;
const dbName   = "battlebotv2";

let client;

async function getDB() {
  if (!client) client = new MongoClient(mongoUri);
  if (!client.topology?.isConnected()) await client.connect();
  return client.db(dbName);
}

export default async function handler(req, res) {

  if (req.method !== "POST")
    return res.status(200).json({ ok:false, message:"Use POST" });

  try {
    const { telegramId } = req.body;

    if (!telegramId)
      return res.status(400).json({ ok:false, message:"Missing telegramId" });

    const db = await getDB();
    const user = await db.collection("users").findOne({ telegramId });

    if (!user)
      return res.status(404).json({ ok:false, message:"User not found" });

    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;

    if (user.lastDaily && now - user.lastDaily < cooldown) {
      const remaining = Math.ceil(
        (cooldown - (now - user.lastDaily)) / (60 * 1000)
      );

      return res.status(200).json({
        ok: false,
        message: `Come back in ${remaining} minutes`
      });
    }

    const reward = 50;

    await db.collection("users").updateOne(
      { telegramId },
      {
        $inc: { coins: reward },
        $set: { lastDaily: now }
      }
    );

    return res.status(200).json({
      ok: true,
      reward
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok:false, message:"Server error" });
  }
} 