import { MongoClient } from "mongodb";

const mongoUri = process.env.MONGO_URI;
const dbName   = "battlebotv2";

let client;

async function getDB() {
  if (!client) client = new MongoClient(mongoUri);
  if (!client.topology?.isConnected()) await client.connect();
  return client.db(dbName);
}

function rand(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default async function handler(req, res) {

  if (req.method !== "POST")
    return res.status(200).json({ ok:false, message:"Use POST" });

  try {
    const { telegramId } = req.body;

    if (!telegramId)
      return res.status(400).json({ ok:false, message:"Missing telegramId" });

    const db = await getDB();
    const user = await db.collection("users").findOne({ telegramId });

    if (!user)
      return res.status(404).json({ ok:false, message:"User not found" });

    const char = user.character;

    // ------------ generate monster ------------ //
    const monsterLevel = Math.max(1, char.level + rand(-1, 1));

    const monster = {
      name: "Goblin",
      level: monsterLevel,
      hp: 40 + monsterLevel * 6,
      attack: 8 + monsterLevel * 2,
      defense: 4 + monsterLevel,
      speed: 4 + monsterLevel
    };

    let log = [];
    let playerHp = char.stats.hp;
    let mobHp = monster.hp;

    let turn = char.stats.speed >= monster.speed ? "player" : "mob";

    while (playerHp > 0 && mobHp > 0) {

      if (turn === "player") {
        const dmg = Math.max(1, char.stats.attack - monster.defense);
        mobHp -= dmg;
        log.push(`You dealt ${dmg} to ${monster.name}`);
        turn = "mob";
      } else {
        const dmg = Math.max(1, monster.attack - char.stats.defense);
        playerHp -= dmg;
        log.push(`${monster.name} dealt ${dmg} to you`);
        turn = "player";
      }
    }

    const win = mobHp <= 0;

    let reward = { coins:0, xp:0 };

    if (win) {
      reward.coins = rand(10, 25);
      reward.xp = rand(5, 12);

      char.level += reward.xp >= 10 ? 1 : 0;

      await db.collection("users").updateOne(
        { telegramId },
        {
          $inc: { coins: reward.coins },
          $set: { character: char }
        }
      );
    }

    return res.status(200).json({
      ok: true,
      win,
      log,
      reward,
      monster
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok:false, message:"Server error" });
  }
}