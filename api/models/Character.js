import mongoose from "mongoose";

const schema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  name:String,
  level:{ type:Number, default:1 },
  stats:{ hp:Number, attack:Number, defense:Number, speed:Number },
  imageUrl:String,
  abilities:[String]
});

export default mongoose.models.Character || mongoose.model("Character", schema);