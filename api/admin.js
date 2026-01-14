import clientPromise from '../lib/mongodb.js';
const ADMIN_ID = 1302298741; 

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { adminId, action, targetId, type, amount, name, stat, price, image } = req.body;

  if (parseInt(adminId) !== ADMIN_ID) return res.status(403).json({ error: "Access Denied" });

  const client = await clientPromise;
  const db = client.db("BattleBotV2");

  try {
    // --- USER MANAGEMENT ---
    if (action === 'getUsers') {
        // Table ke liye data fetch (Limit 50 users)
        const list = await db.collection("users").find().sort({ coins: -1 }).limit(50).toArray();
        return res.json({ ok: true, users: list });
    }

    if (action === 'deleteUser') {
        await db.collection("users").deleteOne({ telegramId: parseInt(targetId) });
        return res.json({ ok: true, message: "User Deleted" });
    }

    if (action === 'updateUser') {
        let update = (type === 'coins') ? { coins: amount } : { "character.xp": amount };
        await db.collection("users").updateOne({ telegramId: parseInt(targetId) }, { $inc: update });
        return res.json({ ok: true, message: "Updated!" });
    }

    // --- SHOP MANAGEMENT (NEW) ---
    if (action === 'addItem') {
        const item = {
            name, type, price, stat, image,
            createdAt: new Date()
        };
        await db.collection("shop").insertOne(item);
        return res.json({ ok: true, message: `✅ ${name} added to Shop!` });
    }

  } catch (e) { res.status(500).json({ error: e.message }); }
}
