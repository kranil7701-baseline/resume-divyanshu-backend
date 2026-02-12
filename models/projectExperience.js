import mongoose from "mongoose";

const ProjectExperienceSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        client: {
            type: String,
            trim: true,
        },
        role: {
            type: String,
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
        details: {
            type: String,
            default: "",
            trim: true,
        },
        technologies: {
            type: String,
            default: "",
            trim: true,
        }
    },
    { timestamps: true }
);

export default mongoose.model("ProjectExperience", ProjectExperienceSchema);
