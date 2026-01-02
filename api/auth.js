import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { initData } = req.body;
  const searchParams = new URLSearchParams(initData);
  const user = JSON.parse(searchParams.get('user'));

  // 🔥 FULL PATHS (Vercel public folder rule: /images/filename.jpg)
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
    
    // Existing User Check
    let existingUser = await db.collection("users").findOne({ telegramId: user.id });

    // 🛠️ SMART LOGIC: Decide Image
    let charUpdate = null;
    
    if (!existingUser) {
        // CASE 1: NEW USER -> Random Character
        const randomChar = STARTER_CHARS[Math.floor(Math.random() * STARTER_CHARS.length)];
        charUpdate = {
             name: randomChar.name,
             image: randomChar.image, // ✅ Saves "/images/Name.jpg"
             level: 1,
             stats: { hp: 100, attack: 15, defense: 5, speed: 5 },
             xp: 0, xpToNext: 100
        };
    } 
    else {
        // CASE 2: OLD USER -> FIX BROKEN PATHS
        // Agar image missing hai YA image path me "/images/" nahi hai
        const currentImg = existingUser.character.image || "";
        
        if (!currentImg.startsWith("/images/")) {
            // Sahi photo dhoondo
            const found = STARTER_CHARS.find(c => c.name === existingUser.character.name);
            const correctImage = found ? found.image : "/images/HarutoHikari.jpg"; // Fallback
            
            // Sirf image update karo
            charUpdate = { image: correctImage };
        }
    }

    // Database Operation
    let updateQuery = {
        $setOnInsert: { coins: 100, createdAt: new Date() },
        $set: { username: user.username, fullname: user.first_name }
    };

    // Agar character me kuch change karna hai to add karo
    if (charUpdate) {
        if (!existingUser) {
            updateQuery.$set.character = charUpdate; // New User: Full Char
        } else {
            updateQuery.$set["character.image"] = charUpdate.image; // Old User: Fix Image Only
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
