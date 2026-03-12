import mongoose from "mongoose";

const GeneratedResumeSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        file_url: {
            type: String,
            required: true,
        },
        file_expires_at: {
            type: Date,
        },
        template: {
            type: String,
        },
        status: {
            type: String,
            default: "completed"
        }
    },
    { timestamps: true }
);

export default mongoose.model("GeneratedResume", GeneratedResumeSchema);
