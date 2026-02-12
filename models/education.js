import mongoose from "mongoose";

const EducationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    school: {
      type: String,
      required: true,
      trim: true,
    },
    degree: {
      type: String,
      required: true,
      trim: true,
    },
    start: {
      type: Date,
      required: false,
    },
    end: {
      type: Date,
      required: false,
    },
    grade: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Education", EducationSchema);
