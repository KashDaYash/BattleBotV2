import clientPromise from '../lib/mongodb.js';

const ADMIN_ID = 1302298741; // 🔒 OWNER ID

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { adminId, action, targetId, type, amount } = req.body;

  // 🛡️ SECURITY CHECK: Sirf OWNER ID hi access kar payegi
  if (parseInt(adminId) !== ADMIN_ID) {
    return res.status(403).json({ ok: false, message: "❌ ACCESS DENIED! You are not the Owner." });
  }

  const client = await clientPromise;
  const db = client.db("BattleBotV2");
  const users = db.collection("users");

  try {
    // 1. Get Stats
    if (action === 'getStats') {
        const count = await users.countDocuments();
        return res.json({ ok: true, totalUsers: count });
    }

    // 2. Get Recent Users
    if (action === 'getUsers') {
        const list = await users.find().sort({ createdAt: -1 }).limit(10).toArray();
        return res.json({ ok: true, users: list });
    }

    // 3. Find Single User
    if (action === 'findUser') {
        const user = await users.findOne({ telegramId: parseInt(targetId) });
        return res.json({ ok: !!user, user });
    }

    // 4. Update (Add Coins/XP)
    if (action === 'updateUser') {
        let updateField = {};
        if (type === 'coins') updateField = { coins: amount };
        if (type === 'xp') updateField = { "character.xp": amount };

        await users.updateOne({ telegramId: parseInt(targetId) }, { $inc: updateField });
        return res.json({ ok: true, message: `✅ Successfully added ${amount} ${type} to user ${targetId}` });
    }

    // 5. Reset User (Back to Level 1)
    if (action === 'resetUser') {
        await users.updateOne(
            { telegramId: parseInt(targetId) },
            { 
                $set: { 
                    coins: 100,
                    "character.level": 1,
                    "character.xp": 0,
                    "character.xpToNext": 100,
                    "character.stats": { hp: 100, attack: 15, defense: 5, speed: 5 }
                }
            }
        );
        return res.json({ ok: true, message: `🔄 User ${targetId} has been reset to Level 1.` });
    }

    // 6. 🔥 DELETE USER (Permanent Removal)
    if (action === 'deleteUser') {
        const result = await users.deleteOne({ telegramId: parseInt(targetId) });
        
        if (result.deletedCount === 1) {
            return res.json({ ok: true, message: `🗑️ SUCCESS: User ${targetId} has been permanently DELETED.` });
        } else {
            return res.json({ ok: false, message: `⚠️ User ${targetId} not found in database.` });
        }
    }

  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
