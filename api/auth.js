import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { initData } = req.body;
  const searchParams = new URLSearchParams(initData);
  const user = JSON.parse(searchParams.get('user'));

  // ✅ FORCE 'public' IN PATH
  const STARTER_CHARS = [
    { name: "Ryuujin Kai", image: "/public/images/RyuujinKai.jpg" }, 
    { name: "Akari Yume", image: "/public/images/AkariYume.jpg" }, 
    { name: "Kurogane Raiden", image: "/public/images/KuroganeRaiden.jpg" }, 
    { name: "Yasha Noctis", image: "https://envs.sh/HqT.jpg" }, 
    { name: "Lumina", image: "/public/images/Lumina.jpg" }, 
    { name: "Haruto Hikari", image: "/public/images/HarutoHikari.jpg" }
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
             image: randomChar.image, 
             level: 1,
             stats: { hp: 100, attack: 15, defense: 5, speed: 5 },
             xp: 0, xpToNext: 100
        };
    } 
    else {
        // CASE 2: Old User (Fix Missing 'public' in path)
        let currentImg = existingUser.character.image || "";
        
        // Agar path me 'public' nahi hai, to usse fix karo
        if (!currentImg.includes("/public/")) {
             // Agar sirf filename hai ya '/images/' hai, to sahi path dhoondo ya banao
             const found = STARTER_CHARS.find(c => c.name === existingUser.character.name);
             
             if (found) {
                 charUpdate = { image: found.image };
             } else {
                 // Manual Fix: Agar DB me "/images/Name.jpg" hai to "/public" jodo
                 if (currentImg.startsWith("/images/")) {
                     charUpdate = { image: "/public" + currentImg };
                 } else if (!currentImg.includes("/")) {
                     // Agar sirf "Name.jpg" hai
                     charUpdate = { image: "/public/images/" + currentImg };
                 } else {
                     // Fallback
                     charUpdate = { image: "/public/images/HarutoHikari.jpg" };
                 }
             }
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
