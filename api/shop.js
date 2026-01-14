import clientPromise from '../lib/mongodb.js';

// ... (Default items array same as before) ...
const DEFAULT_ITEMS = [
    { name: "Wooden Sword", type: "weapon", price: 50, stat: 5, image: "wooden_sword.png" },
    { name: "Iron Sword", type: "weapon", price: 150, stat: 12, image: "iron_sword.png" },
    { name: "Golden Blade", type: "weapon", price: 500, stat: 25, image: "gold_sword.png" },
    { name: "Leather Armor", type: "armor", price: 80, stat: 5, image: "leather_armor.png" },
    { name: "Iron Armor", type: "armor", price: 200, stat: 15, image: "iron_armor.png" },
    { name: "Small Potion", type: "potion", price: 20, stat: 30, image: "potion_small.png" }, 
    { name: "Mega Potion", type: "potion", price: 50, stat: 100, image: "potion_large.png" } 
];

export default async function handler(req, res) {
  const { telegramId, action, itemId } = req.body;
  const client = await clientPromise;
  const db = client.db("BattleBotV2");
  const shopColl = db.collection("shop");
  const usersColl = db.collection("users");

  try {
      if (action === 'getShop') {
          const count = await shopColl.countDocuments();
          if (count === 0) await shopColl.insertMany(DEFAULT_ITEMS);
          const items = await shopColl.find().toArray();
          return res.json({ ok: true, items });
      }

      if (action === 'buy') {
          // ... (Same Buy Logic as previous response) ...
          const user = await usersColl.findOne({ telegramId });
          const item = await shopColl.findOne({ name: itemId });
          if (!item) return res.json({ ok: false, message: "Item not found!" });
          if (user.coins < item.price) return res.json({ ok: false, message: "Not enough coins!" });
          const alreadyHas = user.inventory?.some(i => i.name === item.name);
          if (alreadyHas && item.type !== 'potion') return res.json({ ok: false, message: "You already have this!" });

          let updateQuery = { $inc: { coins: -item.price }, $push: { inventory: item } };
          if (item.type === 'weapon') updateQuery.$inc["character.stats.attack"] = item.stat;
          if (item.type === 'armor') updateQuery.$inc["character.stats.defense"] = item.stat;
          
          await usersColl.updateOne({ telegramId }, updateQuery);
          return res.json({ ok: true, message: `✅ Purchased ${item.name}!` });
      }

      // 🔥 UPDATED USE LOGIC
      if (action === 'use') {
          const user = await usersColl.findOne({ telegramId });
          const itemIndex = user.inventory?.findIndex(i => i.name === itemId);
          
          if (itemIndex === -1 || itemIndex === undefined) return res.json({ ok: false, message: "Item not in backpack!" });
          const item = user.inventory[itemIndex];
          
          if (item.type === 'potion') {
              // Calculate Max HP (100 + level*10)
              const maxHp = 100 + (user.character.level * 10);
              const currentHp = user.character.stats.hp;

              if (currentHp >= maxHp) {
                  return res.json({ ok: false, message: "⚠️ HP is already full!" });
              }

              // Remove from inventory
              const newInventory = [...user.inventory];
              newInventory.splice(itemIndex, 1);

              // Heal (Cap at Max HP)
              let newHp = Math.min(currentHp + item.stat, maxHp);
              
              await usersColl.updateOne(
                  { telegramId },
                  { $set: { inventory: newInventory, "character.stats.hp": newHp } }
              );
              
              return res.json({ ok: true, message: `🧪 Used ${item.name}! HP restored.` });
          } else {
              return res.json({ ok: false, message: "Cannot use this item directly." });
          }
      }

  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
}
