import { connectDB } from "./mongo.js";
import User from "./models/User.js";

export default async function handler(req, res) {

  await connectDB(process.env.MONGO_URI);

  let body = req.body;
  if (!body) {
    body = await new Promise(resolve => {
      let data = "";
      req.on("data", c => data += c);
      req.on("end", () => resolve(JSON.parse(data || "{}")));
    });
  }

  const { telegramId } = body;

  if (!telegramId) return res.status(400).json({ error: "telegramId required" });

  const user = await User.findOne({ telegramId });

  if (!user) return res.status(404).json({ error: "user not found" });

  const now = Date.now();
  const last = user.lastDailyClaim ? user.lastDailyClaim.getTime() : 0;

  // 24 hours
  if (now - last < 24 * 60 * 60 * 1000) {
    const remaining = 24 * 60 * 60 * 1000 - (now - last);
    return res.json({
      ok: false,
      cooldown: Math.ceil(remaining / (60 * 1000)) // minutes
    });
  }

  user.coins += 100;        // 👈 reward
  user.lastDailyClaim = new Date();
  await user.save();

  res.json({
    ok: true,
    coins: user.coins
  });
} 