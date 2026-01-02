import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { initData } = req.body;
  const searchParams = new URLSearchParams(initData);
  const user = JSON.parse(searchParams.get('user'));

  try {
    const client = await clientPromise;
    const db = client.db("BattleBotV2");
    
    // 🔥 NEW: Available Characters List
    const starterCharacters = [
      "Ryuujin Kai", 
      "Akari Yume", 
      "Kurogane Raiden", 
      "Yasha Noctis", 
      "Haruto Hikari", 
      "Lumina"
    ];

    // Pick Random Character
    const randomCharName = starterCharacters[Math.floor(Math.random() * starterCharacters.length)];

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
            name: randomCharName, // ✅ Ab Random milega
            level: 1,
            // Stats sabke same rakhe hain taaki game fair rahe (Level 1 par)
            stats: { hp: 100, attack: 15, defense: 5, speed: 5 },
            xp: 0, xpToNext: 100
          }
        }
      },
      { upsert: true, returnDocument: 'after' }
    );
    
    res.status(200).json({ ok: true, user: result }); 

  } catch (e) {
    console.error("Auth Error:", e);
    res.status(500).json({ error: e.message });
  }
}
