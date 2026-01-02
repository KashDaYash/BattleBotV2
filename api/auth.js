import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { initData } = req.body;
  const searchParams = new URLSearchParams(initData);
  const user = JSON.parse(searchParams.get('user'));

  // ✅ CORRECT URL PATHS (Vercel hides 'public' folder)
  const STARTER_CHARS = [
    { name: "Ryuujin Kai", image: "/images/RyuujinKai.jpg" }, 
    { name: "Akari Yume", image: "/images/AkariYume.jpg" }, 
    { name: "Kurogane Raiden", image: "/images/KuroganeRaiden.jpg" }, 
    { name: "Yasha Noctis", image: "/images/YashaNoctis.jpg" }, 
    { name: "Lumina", image: "/images/Lumina.jpg" }, 
    { name: "Haruto Hikari", image: "/images/HarutoHikari.jpg" }
  ];

  try {
    const client = await clientPromise;
    const db = client.db("BattleBotV2");
    
    let existingUser = await db.collection("users").findOne({ telegramId: user.id });
    let charUpdate = null;
    
    if (!existingUser) {
        // CASE 1: NEW USER
        const randomChar = STARTER_CHARS[Math.floor(Math.random() * STARTER_CHARS.length)];
        charUpdate = {
             name: randomChar.name,
             image: randomChar.image, 
             level: 1,
             stats: { hp: 100, attack: 15, defense: 5, speed: 5 },
             xp: 0, xpToNext: 100
        };
    } 
    else {
        // CASE 2: OLD USER (Repair Path)
        // Agar path me "/public" likha hai, to use hata do
        let currentImg = existingUser.character.image || "";
        
        // Fix: Replace '/public/images' with '/images'
        if (currentImg.includes("/public/")) {
            currentImg = currentImg.replace("/public", "");
            charUpdate = { image: currentImg };
        }
        // Fix: Agar bilkul path nahi hai
        else if (!currentImg.includes("/images/")) {
             const found = STARTER_CHARS.find(c => c.name === existingUser.character.name);
             charUpdate = { image: found ? found.image : "/images/HarutoHikari.jpg" };
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
