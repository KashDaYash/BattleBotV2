import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { initData } = req.body;
  const searchParams = new URLSearchParams(initData);
  const user = JSON.parse(searchParams.get('user'));

  try {
    const client = await clientPromise;
    const db = client.db("BattleBotV2");
    
    // User Update/Insert
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

    // 🔴 OLD CODE: user: result.value (Ye v6 me undefined return karta hai)
    // 🟢 NEW CODE: user: result (Ye direct document return karega)
    
    res.status(200).json({ ok: true, user: result }); 

  } catch (e) {
    console.error("Auth Error:", e);
    res.status(500).json({ error: e.message });
  }
}
