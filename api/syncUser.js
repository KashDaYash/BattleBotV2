import clientPromise from '../../lib/mongodb';

export default async function handler(req, res) {
  const { telegramId } = req.body;
  const client = await clientPromise;
  const db = client.db("BattleBotV2");
  
  const user = await db.collection("users").findOne({ telegramId });
  res.json({ ok: !!user, user });
}
