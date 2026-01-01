import { MongoClient } from "mongodb";
import crypto from "crypto";

const mongoUri = process.env.MONGO_URI;
const dbName   = "battlebotv2";

let client;

async function getDB() {
  if (!client) client = new MongoClient(mongoUri);
  if (!client.topology?.isConnected()) await client.connect();
  return client.db(dbName);
}

// -------- verify telegram signature -------- //
function verifyTelegram(initData) {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");
    urlParams.delete("hash");

    const dataCheckString = Array
      .from(urlParams)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([k,v]) => `${k}=${v}`)
      .join("\n");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(process.env.BOT_TOKEN)
      .digest();

    const hmac = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    return hmac === hash;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(200).json({ ok:false, message:"Use POST" });

  try {
    const { initData } = req.body;

    if (!initData)
      return res.status(400).json({ ok:false, message:"Missing initData" });

    if (!verifyTelegram(initData))
      return res.status(401).json({ ok:false, message:"Invalid signature" });

    const db = await getDB();
    const tg = JSON.parse(
      decodeURIComponent(
        new URLSearchParams(initData).get("user")
      )
    );

    let user = await db.collection("users").findOne({ telegramId: tg.id });

    if (!user) {
      user = {
        telegramId: tg.id,
        fullname: `${tg.first_name || ""} ${tg.last_name || ""}`.trim(),
        username: tg.username || "",
        coins: 50,
        createdAt: Date.now(),
        lastDaily: 0,
        character: {
          name: "Knight",
          level: 1,
          imageUrl: "https://i.imgur.com/Vc5gV3t.png",
          stats: { hp: 60, attack: 12, defense: 9, speed: 6 }
        }
      };

      await db.collection("users").insertOne(user);
    }

    return res.status(200).json({
      ok: true,
      user: {
        telegramId: user.telegramId,
        fullname: user.fullname,
        username: user.username,
        coins: user.coins
      }
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok:false, message:"Server error" });
  }
}