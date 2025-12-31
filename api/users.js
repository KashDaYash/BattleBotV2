import { connectDB } from "./mongo.js";
import User from "./models/User.js";
import Character from "./models/Character.js";
import { getRandomCharacter } from "./utils/characters.js";

export default async function handler(req,res){

  if (req.method !== "POST") return res.status(405).end();

  await connectDB(process.env.MONGO_URI);

  // parse body
  let body = req.body;
  if (!body) {
    body = await new Promise(resolve=>{
      let data="";
      req.on("data",c=> data+=c);
      req.on("end",()=> resolve(JSON.parse(data||"{}")));
    });
  }

  const { telegramId, username, fullname } = body;

  let user = await User.findOne({ telegramId });

  if (!user){
    user = await User.create({ telegramId, username, fullname });
    const starter = getRandomCharacter();
    await Character.create({ userId:user._id, ...starter });
  }

  const character = await Character.findOne({ userId:user._id });

  res.json({ user, character });
} 