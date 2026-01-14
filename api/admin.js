import clientPromise from '../lib/mongodb.js';

const ADMIN_ID = 1302298741; 

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { adminId, action, targetId, type, amount, name, type: itemType, price, stat, image, duration } = req.body;

  if (parseInt(adminId) !== ADMIN_ID) return res.status(403).json({ ok: false, message: "❌ Access Denied" });

  const client = await clientPromise;
  const db = client.db("BattleBotV2");
  const users = db.collection("users");
  const shop = db.collection("shop");

  try {
    // 1. Get Users (All, Sorted by Newest)
    if (action === 'getUsers') {
        const list = await users.find().sort({ createdAt: -1 }).limit(100).toArray();
        return res.json({ ok: true, users: list });
    }

    // 2. Add Coins / XP
    if (action === 'updateUser') {
        let update = (type === 'coins') ? { coins: amount } : { "character.xp": amount };
        await users.updateOne({ telegramId: parseInt(targetId) }, { $inc: update });
        return res.json({ ok: true });
    }

    // 3. Reset User
    if (action === 'resetUser') {
        await users.updateOne({ telegramId: parseInt(targetId) }, { 
            $set: { 
                coins: 100, 
                "character.level": 1, 
                "character.xp": 0, 
                "character.xpToNext": 100,
                "character.stats": { hp: 100, attack: 15, defense: 5, speed: 5 }
            }
        });
        return res.json({ ok: true });
    }

    // 4. Delete User (Permanent)
    if (action === 'deleteUser') {
        await users.deleteOne({ telegramId: parseInt(targetId) });
        return res.json({ ok: true });
    }

    // 5. BAN USER (With Time Duration)
    if (action === 'banUser') {
        let banExpires = null;
        
        if (duration !== 'permanent') {
            const days = parseInt(duration);
            banExpires = new Date();
            banExpires.setDate(banExpires.getDate() + days); // Add days to current date
        } else {
            banExpires = new Date("2099-12-31"); // Permanent (Far future)
        }

        await users.updateOne({ telegramId: parseInt(targetId) }, { 
            $set: { isBanned: true, banExpires: banExpires }
        });
        return res.json({ ok: true });
    }

    // 6. Shop Add Item
    if (action === 'addItem') {
        await shop.insertOne({
            name, type: itemType, price, stat, image, createdAt: new Date()
        });
        return res.json({ ok: true });
    }

  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
