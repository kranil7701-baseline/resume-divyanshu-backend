import express from "express";
import JobApplication from "../models/JobApplication.js";
import { requireSignin } from "../controllers/auth.js";

const router = express.Router();

// GET /api/jobs - Fetch all job applications for the logged-in user
router.get("/jobs", requireSignin, async (req, res) => {
  try {
    const userId = req.auth._id;
    const jobs = await JobApplication.find({ userId }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    console.error("Fetch jobs error:", error);
    res.status(500).json({ error: "Failed to fetch job applications" });
  }
});

// POST /api/jobs - Create a new job application
router.post("/jobs", requireSignin, async (req, res) => {
  try {
    const userId = req.auth._id;
    const {
      companyName, jobTitle, location, status, appliedDate,
      interviewDate, joiningDate, salary, jobLink,
      contactPerson, contactEmail, contactPhone, notes
    } = req.body;

    if (!companyName || !jobTitle) {
      return res.status(400).json({ error: "Company name and job title are required" });
    }

    const job = new JobApplication({
      userId,
      companyName, jobTitle, location, status, appliedDate,
      interviewDate, joiningDate, salary, jobLink,
      contactPerson, contactEmail, contactPhone, notes
    });

    const saved = await job.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error("Create job error:", error);
    res.status(500).json({ error: "Failed to create job application" });
  }
});

// PUT /api/jobs/:id - Update a job application
router.put("/jobs/:id", requireSignin, async (req, res) => {
  try {
    const userId = req.auth._id;
    const jobId = req.params.id;

    const job = await JobApplication.findOne({ _id: jobId, userId });
    if (!job) {
      return res.status(404).json({ error: "Job application not found" });
    }

    const {
      companyName, jobTitle, location, status, appliedDate,
      interviewDate, joiningDate, salary, jobLink,
      contactPerson, contactEmail, contactPhone, notes
    } = req.body;

    const updated = await JobApplication.findByIdAndUpdate(
      jobId,
      {
        companyName, jobTitle, location, status, appliedDate,
        interviewDate, joiningDate, salary, jobLink,
        contactPerson, contactEmail, contactPhone, notes
      },
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    console.error("Update job error:", error);
    res.status(500).json({ error: "Failed to update job application" });
  }
});

// PATCH /api/jobs/:id/status - Quick status update
router.patch("/jobs/:id/status", requireSignin, async (req, res) => {
  try {
    const userId = req.auth._id;
    const jobId = req.params.id;
    const { status } = req.body;

    const validStatuses = ["applied", "interviewing", "offered", "accepted", "rejected", "withdrawn"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const job = await JobApplication.findOne({ _id: jobId, userId });
    if (!job) {
      return res.status(404).json({ error: "Job application not found" });
    }

    const updated = await JobApplication.findByIdAndUpdate(
      jobId,
      { status },
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    console.error("Update job status error:", error);
    res.status(500).json({ error: "Failed to update job status" });
  }
});

// DELETE /api/jobs/:id - Delete a job application
router.delete("/jobs/:id", requireSignin, async (req, res) => {
  try {
    const userId = req.auth._id;
    const jobId = req.params.id;

    const job = await JobApplication.findOne({ _id: jobId, userId });
    if (!job) {
      return res.status(404).json({ error: "Job application not found" });
    }

    await JobApplication.findByIdAndDelete(jobId);
    res.json({ message: "Job application deleted successfully" });
  } catch (error) {
    console.error("Delete job error:", error);
    res.status(500).json({ error: "Failed to delete job application" });
  }
});

export default router;
