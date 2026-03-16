import mongoose from "mongoose";

const jobApplicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["applied", "interviewing", "offered", "accepted", "rejected", "withdrawn"],
      default: "applied",
    },
    appliedDate: {
      type: String,
      default: "",
    },
    interviewDate: {
      type: String,
      default: "",
    },
    joiningDate: {
      type: String,
      default: "",
    },
    salary: {
      type: String,
      trim: true,
      default: "",
    },
    jobLink: {
      type: String,
      trim: true,
      default: "",
    },
    contactPerson: {
      type: String,
      trim: true,
      default: "",
    },
    contactEmail: {
      type: String,
      trim: true,
      default: "",
    },
    contactPhone: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("JobApplication", jobApplicationSchema);
