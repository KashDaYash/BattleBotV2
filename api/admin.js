import clientPromise from '../lib/mongodb.js';

const ADMIN_ID = 1302298741; 

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { adminId, action, targetId, type, amount, name, type: itemType, price, stat, image, duration } = req.body;

  if (parseInt(adminId) !== ADMIN_ID) return res.status(403).json({ ok: false, message: "Denied" });

  const client = await clientPromise;
  const db = client.db("BattleBotV2");
  const users = db.collection("users");
  const shop = db.collection("shop");

  try {
    if (action === 'getUsers') {
        const list = await users.find().sort({ createdAt: -1 }).limit(100).toArray();
        return res.json({ ok: true, users: list });
    }
    if (action === 'updateUser') {
        let update = (type === 'coins') ? { coins: amount } : { "character.xp": amount };
        await users.updateOne({ telegramId: parseInt(targetId) }, { $inc: update });
        return res.json({ ok: true });
    }
    if (action === 'deleteUser') {
        await users.deleteOne({ telegramId: parseInt(targetId) });
        return res.json({ ok: true });
    }
    // 🔥 RESTORED TIME BAN LOGIC
    if (action === 'banUser') {
        let banExpires = null;
        if (duration && duration !== 'permanent') {
            const days = parseInt(duration);
            banExpires = new Date();
            banExpires.setDate(banExpires.getDate() + days); 
        } else {
            banExpires = new Date("2099-12-31"); 
        }
        await users.updateOne({ telegramId: parseInt(targetId) }, { $set: { isBanned: true, banExpires: banExpires } });
        return res.json({ ok: true });
    }
    if (action === 'addItem') {
        await shop.insertOne({ name, type: itemType, price, stat, image, createdAt: new Date() });
        return res.json({ ok: true });
    }
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
}
