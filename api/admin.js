import clientPromise from '../lib/mongodb.js';

const ADMIN_ID = 1302298741; // 🔒 SECURITY: Sirf ye ID allow hogi

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { adminId, action, targetId, type, amount } = req.body;

  // 🛡️ SECURITY CHECK
  if (parseInt(adminId) !== ADMIN_ID) {
    return res.status(403).json({ ok: false, message: "❌ ACCESS DENIED! You are not the Owner." });
  }

  const client = await clientPromise;
  const db = client.db("BattleBotV2");
  const users = db.collection("users");

  try {
    // 1. Get Stats (Total Users)
    if (action === 'getStats') {
        const count = await users.countDocuments();
        return res.json({ ok: true, totalUsers: count });
    }

    // 2. Get Recent Users List (Last 10)
    if (action === 'getUsers') {
        const list = await users.find().sort({ createdAt: -1 }).limit(10).toArray();
        return res.json({ ok: true, users: list });
    }

    // 3. Find Specific User
    if (action === 'findUser') {
        const user = await users.findOne({ telegramId: parseInt(targetId) });
        return res.json({ ok: !!user, user });
    }

    // 4. Update User (Coins/XP)
    if (action === 'updateUser') {
        let updateField = {};
        if (type === 'coins') updateField = { coins: amount };
        if (type === 'xp') updateField = { "character.xp": amount };

        await users.updateOne({ telegramId: parseInt(targetId) }, { $inc: updateField });
        return res.json({ ok: true, message: `✅ Added ${amount} ${type} to user ${targetId}` });
    }

    // 5. Ban User (Delete Account)
    if (action === 'banUser') {
        await users.deleteOne({ telegramId: parseInt(targetId) });
        return res.json({ ok: true, message: `🚫 User ${targetId} has been BANNED (Deleted).` });
    }

  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
