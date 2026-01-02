import clientPromise from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  // NOTE: Production me Telegram Hash verification yahan zaroor lagana chahiye
  // Abhi ke liye hum direct user data le rahe hain taaki aap test kar sako
  const { initData } = req.body;
  const searchParams = new URLSearchParams(initData);
  const user = JSON.parse(searchParams.get('user'));

  try {
    const client = await clientPromise;
    const db = client.db("BattleBotV2");
    
    const result = await db.collection("users").findOneAndUpdate(
      { telegramId: user.id },
      {
        $setOnInsert: {
          username: user.username,
          fullname: user.first_name,
          coins: 100,
          createdAt: new Date(),
          character: {
            name: "Rookie Bot",
            level: 1,
            stats: { hp: 100, attack: 15, defense: 5, speed: 5 },
            xp: 0, xpToNext: 100
          }
        }
      },
      { upsert: true, returnDocument: 'after' }
    );
    res.status(200).json({ ok: true, user: result.value });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
