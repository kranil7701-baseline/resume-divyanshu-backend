import mongoose from "mongoose";

const SkillsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    skills: {
      type: [String],  // Array of skill strings
      required: true,
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Skills", SkillsSchema);
