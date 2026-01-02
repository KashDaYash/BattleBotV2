import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { initData } = req.body;
  const searchParams = new URLSearchParams(initData);
  const user = JSON.parse(searchParams.get('user'));

  // 🔥 CORRECT PATHS: /public/images/filename.jpg
  const STARTER_CHARS = [
    { name: "Ryuujin Kai", image: "/public/images/RyuujinKai.jpg" }, 
    { name: "Akari Yume", image: "/public/images/AkariYume.jpg" }, 
    { name: "Kurogane Raiden", image: "/public/images/KuroganeRaiden.jpg" }, 
    { name: "Yasha Noctis", image: "/public/images/YashaNoctis.jpg" }, 
    { name: "Lumina", image: "/public/images/Lumina.jpg" }, 
    { name: "Haruto Hikari", image: "/public/images/HarutoHikari.jpg" }
  ];

  try {
    const client = await clientPromise;
    const db = client.db("BattleBotV2");
    
    // Check User
    let existingUser = await db.collection("users").findOne({ telegramId: user.id });

    // 🛠️ SMART LOGIC: Fix Image Path
    let charUpdate = null;
    
    if (!existingUser) {
        // CASE 1: NEW USER -> Random Character
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
        // CASE 2: OLD USER -> Fix Broken/Old Paths
        // Agar image path me "/public/" nahi hai, to use update karo
        const currentImg = existingUser.character.image || "";
        
        if (!currentImg.includes("/public/images/")) {
            const found = STARTER_CHARS.find(c => c.name === existingUser.character.name);
            // Default Haruto agar match na mile
            const correctImage = found ? found.image : "/public/images/HarutoHikari.jpg"; 
            charUpdate = { image: correctImage };
        }
    }

    // Prepare DB Update
    let updateQuery = {
        $setOnInsert: { coins: 100, createdAt: new Date() },
        $set: { username: user.username, fullname: user.first_name }
    };

    if (charUpdate) {
        if (!existingUser) {
            updateQuery.$set.character = charUpdate;
        } else {
            updateQuery.$set["character.image"] = charUpdate.image; // Fix path
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
