import clientPromise from '../lib/mongodb.js';

const DEFAULT_ITEMS = [
    { name: "Wooden Sword", type: "weapon", price: 50, stat: 5, image: "wooden_sword.png" },
    { name: "Iron Sword", type: "weapon", price: 150, stat: 12, image: "iron_sword.png" },
    { name: "Golden Blade", type: "weapon", price: 500, stat: 25, image: "gold_sword.png" },
    { name: "Leather Armor", type: "armor", price: 80, stat: 5, image: "leather_armor.png" },
    { name: "Iron Armor", type: "armor", price: 200, stat: 15, image: "iron_armor.png" },
    { name: "Small Potion", type: "potion", price: 20, stat: 30, image: "potion_small.png" }, // Heals 30 HP
    { name: "Mega Potion", type: "potion", price: 50, stat: 100, image: "potion_large.png" } // Heals 100 HP
];

export default async function handler(req, res) {
  const { telegramId, action, itemId } = req.body;
  const client = await clientPromise;
  const db = client.db("BattleBotV2");
  const shopColl = db.collection("shop");
  const usersColl = db.collection("users");

  try {
      // 1. GET SHOP ITEMS (AUTO-FILL DEFAULTS)
      if (action === 'getShop') {
          const count = await shopColl.countDocuments();
          
          if (count === 0) {
              // Agar shop khali hai, to defaults daal do
              await shopColl.insertMany(DEFAULT_ITEMS);
          }

          const items = await shopColl.find().toArray();
          return res.json({ ok: true, items });
      }

      // 2. BUY ITEM
      if (action === 'buy') {
          const user = await usersColl.findOne({ telegramId });
          const item = await shopColl.findOne({ name: itemId });

          if (!item) return res.json({ ok: false, message: "Item not found!" });
          if (user.coins < item.price) return res.json({ ok: false, message: "Not enough coins!" });

          // Check Inventory (Prevent duplicates for equipment)
          const alreadyHas = user.inventory?.some(i => i.name === item.name);
          if (alreadyHas && item.type !== 'potion') {
              return res.json({ ok: false, message: "You already have this!" });
          }

          // Transaction Logic
          let updateQuery = { 
              $inc: { coins: -item.price },
              $push: { inventory: item }
          };

          // Auto-Equip Logic (Stats Update)
          if (item.type === 'weapon') {
              // Purana weapon hatana padega logic wise, but abhi direct add kar rahe for simplicity
              // Better: Base stats + Weapon stat. Abhi ke liye seedha boost karte hain.
              updateQuery.$inc["character.stats.attack"] = item.stat;
          }
          if (item.type === 'armor') {
              updateQuery.$inc["character.stats.defense"] = item.stat;
          }
          if (item.type === 'potion') {
              // Potion abhi inventory me jayega, use inventory se hoga
              // Agar turant heal karna hai to:
               updateQuery.$set = { "character.stats.hp": Math.min(user.character.stats.hp + item.stat, 100 + (user.character.level * 10)) }; // Max HP logic needed later
               // Note: Potion buy karte hi use ho raha hai is logic se.
               // Agar inventory me rakhna hai to upar wala $set hata do.
          }

          await usersColl.updateOne({ telegramId }, updateQuery);

          return res.json({ ok: true, message: `✅ Purchased ${item.name}!` });
      }

  } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
  }
}
