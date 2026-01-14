import clientPromise from '../lib/mongodb.js';

// Default items if shop is empty
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
      // 1. GET SHOP (Auto-fill)
      if (action === 'getShop') {
          const count = await shopColl.countDocuments();
          if (count === 0) await shopColl.insertMany(DEFAULT_ITEMS);
          const items = await shopColl.find().toArray();
          return res.json({ ok: true, items });
      }

      // 2. BUY ITEM
      if (action === 'buy') {
          const user = await usersColl.findOne({ telegramId });
          const item = await shopColl.findOne({ name: itemId });

          if (!item) return res.json({ ok: false, message: "Item not found!" });
          if (user.coins < item.price) return res.json({ ok: false, message: "Not enough coins!" });

          // Check Duplicates (Only for Equipment)
          const alreadyHas = user.inventory?.some(i => i.name === item.name);
          if (alreadyHas && item.type !== 'potion') {
              return res.json({ ok: false, message: "You already have this!" });
          }

          let updateQuery = { 
              $inc: { coins: -item.price },
              $push: { inventory: item }
          };

          // Auto-Equip Stats (Weapons/Armor)
          if (item.type === 'weapon') updateQuery.$inc = { "character.stats.attack": item.stat };
          if (item.type === 'armor') updateQuery.$inc = { "character.stats.defense": item.stat };
          
          await usersColl.updateOne({ telegramId }, updateQuery);
          return res.json({ ok: true, message: `✅ Purchased ${item.name}!` });
      }

      // 3. USE ITEM (New: Backpack Logic)
      if (action === 'use') {
          const user = await usersColl.findOne({ telegramId });
          // Find item in inventory
          const itemIndex = user.inventory?.findIndex(i => i.name === itemId);
          
          if (itemIndex === -1 || itemIndex === undefined) {
              return res.json({ ok: false, message: "Item not in backpack!" });
          }
          
          const item = user.inventory[itemIndex];
          
          // Logic for Potion
          if (item.type === 'potion') {
              // Remove 1 instance of item
              // Since MongoDB $pull removes ALL instances, we need a specific approach or just pull one.
              // For simplicity in V2, we assume distinct objects or use $pull with just the item object if they are identical.
              // Better approach for array of objects: Read, spllice, Update.
              
              const newInventory = [...user.inventory];
              newInventory.splice(itemIndex, 1); // Remove one item

              // Heal User
              let newHp = user.character.stats.hp + item.stat;
              // Optional: Cap HP at 100 + (Level * 10) or just let it go up
              
              await usersColl.updateOne(
                  { telegramId },
                  { 
                      $set: { inventory: newInventory, "character.stats.hp": newHp }
                  }
              );
              
              return res.json({ ok: true, message: `🧪 Used ${item.name}! HP +${item.stat}` });
          } else {
              return res.json({ ok: false, message: "Cannot use this item directly." });
          }
      }

  } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
  }
}
