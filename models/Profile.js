import mongoose from "mongoose";

const ProfileSchema = new mongoose.Schema(

  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    title: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },
    about: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Profile", ProfileSchema);
