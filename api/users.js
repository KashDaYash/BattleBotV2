import { connectDB } from "./mongo.js";
import User from "./models/User.js";
import Character from "./models/Character.js";
import { getRandomCharacter } from "./utils/characters.js";

export default async function handler(req, res) {

  // --- TEMP: allow GET just to test in browser ---
  if (req.method === "GET") {
    return res.json({
      ok: true,
      message: "Users API alive — use POST to sync user"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectDB(process.env.MONGO_URI);

  // --- Parse JSON manually (Vercel serverless requirement) ---
  let body = req.body;

  if (!body) {
    body = await new Promise(resolve => {
      let data = "";
      req.on("data", chunk => (data += chunk));
      req.on("end", () => resolve(JSON.parse(data || "{}")));
    });
  }

  const { telegramId, username, fullname } = body;

  if (!telegramId) {
    return res.status(400).json({ error: "telegramId required" });
  }

  let user = await User.findOne({ telegramId });

  // --- New user: create + assign starter character ---
  if (!user) {
    user = await User.create({ telegramId, username, fullname });

    const starter = getRandomCharacter();
    await Character.create({
      userId: user._id,
      ...starter
    });
  }

  const character = await Character.findOne({ userId: user._id });

  return res.json({ user, character });
}