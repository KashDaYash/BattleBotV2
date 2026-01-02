import clientPromise from '../../lib/mongodb';

export default async function handler(req, res) {
  const { telegramId } = req.body;
  const client = await clientPromise;
  const db = client.db("BattleBotV2");
  const users = db.collection("users");

  const user = await users.findOne({ telegramId });
  const now = new Date();
  
  if (user.lastDaily && (now - new Date(user.lastDaily) < 86400000)) {
    return res.json({ ok: false, message: "Come back tomorrow!" });
  }

  await users.updateOne({ telegramId }, { $inc: { coins: 100 }, $set: { lastDaily: now } });
  res.json({ ok: true, reward: 100 });
}
