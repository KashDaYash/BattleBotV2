import crypto from "crypto";
import { connectDB } from "./mongo.js";
import User from "./models/User.js";
import Character from "./models/Character.js";
import { getRandomCharacter } from "./utils/characters.js";

function verify(initData, botToken) {
  const urlParams = new URLSearchParams(initData);
  const data = [];

  urlParams.forEach((value, key) => {
    if (key !== "hash") data.push(`${key}=${value}`);
  });

  data.sort();
  const dataCheck = data.join("\n");

  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const hash = crypto
    .createHmac("sha256", secret)
    .update(dataCheck)
    .digest("hex");

  return hash === urlParams.get("hash");
}

export default async function handler(req, res) {
  await connectDB(process.env.MONGO_URI);

  let body = req.body;
  if (!body) {
    body = await new Promise(resolve => {
      let d = "";
      req.on("data", c => (d += c));
      req.on("end", () => resolve(JSON.parse(d || "{}")));
    });
  }

  const { initData } = body;

  if (!initData) return res.status(400).json({ error: "initData required" });

  const ok = verify(initData, process.env.BOT_TOKEN);

  if (!ok) return res.status(401).json({ error: "invalid signature" });

  // extract user
  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get("user"));

  let dbUser = await User.findOne({ telegramId: user.id });

  if (!dbUser) {
    dbUser = await User.create({
      telegramId: user.id,
      username: user.username || "",
      fullname: `${user.first_name || ""} ${user.last_name || ""}`.trim()
    });

    const starter = getRandomCharacter();
    await Character.create({ userId: dbUser._id, ...starter });
  }

  const character = await Character.findOne({ userId: dbUser._id });

  res.json({
    ok: true,
    user: dbUser,
    character
  });
}