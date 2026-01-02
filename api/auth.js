import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { initData } = req.body;
  const searchParams = new URLSearchParams(initData);
  const user = JSON.parse(searchParams.get('user'));

  // ✅ Sirf Filename save karo (No folders)
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
    
    let existingUser = await db.collection("users").findOne({ telegramId: user.id });
    let charUpdate = null;
    
    if (!existingUser) {
        // CASE 1: New User
        const randomChar = STARTER_CHARS[Math.floor(Math.random() * STARTER_CHARS.length)];
        charUpdate = {
             name: randomChar.name,
             image: randomChar.image, // Saves just "Name.jpg"
             level: 1,
             stats: { hp: 100, attack: 15, defense: 5, speed: 5 },
             xp: 0, xpToNext: 100
        };
    } 
    else {
        // CASE 2: Fix Old Paths (Remove folders from DB)
        let currentImg = existingUser.character.image || "";
        
        // Agar DB me /public/ ya /images/ hai, to hata do
        if (currentImg.includes("/")) {
            const filename = currentImg.split("/").pop(); // Get last part
            charUpdate = { image: filename };
        }
    }

    let updateQuery = {
        $setOnInsert: { coins: 100, createdAt: new Date() },
        $set: { username: user.username, fullname: user.first_name }
    };

    if (charUpdate) {
        if (!existingUser) {
            updateQuery.$set.character = charUpdate;
        } else {
            updateQuery.$set["character.image"] = charUpdate.image; 
        }
    }

    const result = await db.collection("users").findOneAndUpdate(
      { telegramId: user.id },
      updateQuery,
      { upsert: true, returnDocument: 'after' }
    );
    
    res.status(200).json({ ok: true, user: result }); 

  } catch (e) {
    console.error("Auth Error:", e);
    res.status(500).json({ error: e.message });
  }
}
