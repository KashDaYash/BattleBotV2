import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { initData } = req.body;
  const searchParams = new URLSearchParams(initData);
  const user = JSON.parse(searchParams.get('user'));

  // 🔥 Character List (Name + Image File)
  const STARTER_CHARS = [
    { name: "Ryuujin Kai", image: "RyuujinKai.jpg" }, 
    { name: "Akari Yume", image: "AkariYume.jpg" }, 
    { name: "Kurogane Raiden", image: "KuroganeRaiden.jpg" }, 
    { name: "Yasha Noctis", image: "YashaNoctis.jpg" }, 
    { name: "Lumina", image: "Lumina.jpg" }, 
    { name: "Haruto Hikari", image: "HarutoHikari.jpg" }
  ];

  try {
    const client = await clientPromise;
    const db = client.db("BattleBotV2");
    
    // Check old user
    let existingUser = await db.collection("users").findOne({ telegramId: user.id });

    // 🛠️ LOGIC: New User or Missing Image Repair
    let charData;
    
    if (!existingUser) {
        // CASE 1: New User -> Pick Random
        charData = STARTER_CHARS[Math.floor(Math.random() * STARTER_CHARS.length)];
    } else if (!existingUser.character.image) {
        // CASE 2: Old User (Fix Missing Image) -> Find matching image for their name
        // Agar naam list me nahi mila to default Haruto de do
        const found = STARTER_CHARS.find(c => c.name === existingUser.character.name);
        charData = found || { name: existingUser.character.name, image: "HarutoHikari.jpg" };
    }

    // Prepare Update Object
    let updateFields = {
      username: user.username,
      fullname: user.first_name,
    };

    // Sirf tab update karo jab zaroorat ho (New User ya Repair)
    if (charData) {
       // Note: Hum stats reset nahi kar rahe, sirf photo/name fix kar rahe hain
       if(!existingUser) {
           // New User Full Setup
           updateFields.character = {
             name: charData.name,
             image: charData.image, // ✅ Saved to DB
             level: 1,
             stats: { hp: 100, attack: 15, defense: 5, speed: 5 },
             xp: 0, xpToNext: 100
           };
           updateFields.coins = 100;
           updateFields.createdAt = new Date();
       } else {
           // Old User Patch (Sirf Image add karo)
           updateFields["character.image"] = charData.image;
       }
    }

    const result = await db.collection("users").findOneAndUpdate(
      { telegramId: user.id },
      { $set: updateFields },
      { upsert: true, returnDocument: 'after' }
    );
    
    res.status(200).json({ ok: true, user: result }); 

  } catch (e) {
    console.error("Auth Error:", e);
    res.status(500).json({ error: e.message });
  }
}
