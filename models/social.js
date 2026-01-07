import mongoose from "mongoose";

const SocialSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        network: {
            type: String, // e.g., "GitHub", "LinkedIn"
            required: true,
            trim: true,
        },
        username: {
            type: String,
            trim: true,
            default: "",
        },
        url: {
            type: String,
            required: true,
            trim: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Social", SocialSchema);
