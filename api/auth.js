import clientPromise from '../lib/mongodb.js';

// Aapka Logger Channel ID
const LOGGER_ID = "-1002751673545"; 
const BOT_TOKEN = process.env.BOT_TOKEN; // Vercel Environment Variables se aayega

// --- HELPER: Send Alert to Telegram ---
async function sendLog(userData) {
  if (!BOT_TOKEN) return; // Agar token nahi hai to skip karo

  const caption = `
🚨 <b>New Player Joined!</b>

👤 <b>Name:</b> ${userData.first_name}
🆔 <b>ID:</b> <code>${userData.id}</code>
🔗 <b>Username:</b> @${userData.username || "none"}
  `;

  try {
    // Agar photo hai to photo bhejo, nahi to sirf text
    const endpoint = userData.photo_url ? "sendPhoto" : "sendMessage";
    const body = {
      chat_id: LOGGER_ID,
      parse_mode: "HTML",
      [userData.photo_url ? "caption" : "text"]: caption
    };

    if (userData.photo_url) body.photo = userData.photo_url;

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    console.log("✅ Logger sent alert!");
  } catch (e) {
    console.error("⚠️ Logger Error:", e.message);
  }
}

// --- MAIN HANDLER ---
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { initData } = req.body;
  const searchParams = new URLSearchParams(initData);
  const user = JSON.parse(searchParams.get('user'));

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
    let isNewUser = false; // Flag to track new user

    if (!existingUser) {
        // CASE 1: New User (Create Character)
        isNewUser = true; // Mark as new
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
        // CASE 2: Fix Old Paths (Maintainance)
        let currentImg = existingUser.character.image || "";
        if (currentImg.includes("/")) {
            const filename = currentImg.split("/").pop();
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

    // 🔥 ALERT SYSTEM: Send log only if it's a NEW user
    if (isNewUser) {
        // Background me run karo, user ko wait mat karao
        sendLog(user); 
    }

    res.status(200).json({ ok: true, user: result }); 

  } catch (e) {
    console.error("Auth Error:", e);
    res.status(500).json({ error: e.message });
  }
}
