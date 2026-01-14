import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  const { telegramId, action, itemId } = req.body;
  const client = await clientPromise;
  const db = client.db("BattleBotV2");
  
  const user = await db.collection("users").findOne({ telegramId });

  // 1. GET SHOP ITEMS
  if (action === 'getShop') {
      const items = await db.collection("shop").find().toArray();
      return res.json({ ok: true, items });
  }

  // 2. BUY ITEM
  if (action === 'buy') {
      // Find Item
      const item = await db.collection("shop").findOne({ name: itemId }); // using name as ID for simplicity
      if (!item) return res.json({ ok: false, message: "Item sold out!" });

      // Check Money
      if (user.coins < item.price) return res.json({ ok: false, message: "Not enough coins!" });

      // Check Inventory (Optional: Prevent duplicates for equipment)
      const alreadyHas = user.inventory?.some(i => i.name === item.name);
      if (alreadyHas && item.type !== 'potion') {
          return res.json({ ok: false, message: "You already have this!" });
      }

      // Transaction
      await db.collection("users").updateOne(
          { telegramId },
          { 
              $inc: { coins: -item.price },
              $push: { inventory: item }, // Add to inventory
              // Auto Equip Logic (Simple)
              $set: item.type === 'weapon' ? { "character.stats.attack": user.character.stats.attack + item.stat } 
                  : item.type === 'armor' ? { "character.stats.defense": user.character.stats.defense + item.stat }
                  : {} // Potions don't auto-equip stat
          }
      );

      return res.json({ ok: true, message: `Purchased ${item.name}!` });
  }
}
