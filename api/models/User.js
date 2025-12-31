import mongoose from "mongoose";

const schema = new mongoose.Schema({
  telegramId: { type:String, unique:true },
  username: String,
  fullname: String,
  coins: { type:Number, default:0 },
  banned: { type:Boolean, default:false },
  tbanUntil: { type:Date, default:null },
  lastDailyClaim: { type:Date, default:null }
});

export default mongoose.models.User || mongoose.model("User", schema);