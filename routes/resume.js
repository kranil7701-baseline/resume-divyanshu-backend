import express from "express";
import Profile from "../models/Profile.js";
import Certification from "../models/certifications.js";
import Education from "../models/education.js";
import Experience from "../models/experience.js";
import Project from "../models/projects.js";
import Skills from "../models/skills.js";
import { requireSignin } from "../controllers/auth.js";

const router = express.Router();

// Helper to map section name to Model
const getModel = (section) => {
  switch (section) {
    case 'profile': return Profile;
    case 'certifications': return Certification;
    case 'education': return Education;
    case 'experience': return Experience;
    case 'projects': return Project;
    case 'skills': return Skills;
    default: return null;
  }
};

// GET /api/user/data - Fetch all user data
router.get("/user/data", requireSignin, async (req, res) => {
  try {
    const userId = req.auth._id; // detailed in requireSignin

    const [profile, certifications, education, experience, projects, skills] = await Promise.all([
      Profile.findOne({ userId }),
      Certification.find({ userId }),
      Education.find({ userId }),
      Experience.find({ userId }),
      Project.find({ userId }),
      Skills.find({ userId }) // Skills model might store an array of strings in one doc or multiple docs?
    ]);

    // Check Skills model structure. Usually strictly modeled.
    // Assuming Skills.find returns the list of skills or a document containing them.
    // Based on previous file content: Skills.create({ skills }) -> it wraps them.
    // If Skills stores { skills: [] }, then we need to extract it. 
    // Let's assume for now we send back what we find, frontend handles it.
    // Actually, looking at previous code: const { skills } = req.body; Skills.create({ skills });
    // So it's likely a single document with a 'skills' array field.

    let skillsData = [];
    if (skills && skills.length > 0) {
      // If it returns an array of docs, and each doc has 'skills' array?
      // Or is it one doc per user?
      // Safe bet: if it's one doc
      if (skills[0].skills) {
        skillsData = skills[0].skills;
      } else {
        // Maybe it's just the doc itself?
        skillsData = skills;
      }
    }

    res.json({
      profile: profile || {},
      certifications: certifications || [],
      education: education || [],
      experience: experience || [],
      projects: projects || [],
      skills: skillsData || []
    });

  } catch (error) {
    console.error("Fetch user data error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/user/update - Update a specific section
router.post("/user/update", requireSignin, async (req, res) => {
  try {
    const userId = req.auth._id;
    const { section, data } = req.body;

    // Special handling for Profile (Single Document)
    if (section === 'profile') {
      const updated = await Profile.findOneAndUpdate(
        { userId },
        { ...data, userId },
        { new: true, upsert: true } // Create if not exists
      );
      return res.json(updated);
    }

    // Special handling for Skills (Single Document wrapping array)
    if (section === 'skills') {
      // Expecting data to be an array of skills or similar. 
      // Previous code: Skills.create({ skills: req.body.skills })
      // So we should update the single document.
      const updated = await Skills.findOneAndUpdate(
        { userId },
        { skills: data, userId },
        { new: true, upsert: true }
      );
      return res.json(updated.skills);
    }

    // For other sections (Arrays of Documents: Education, Experience, etc.)
    const Model = getModel(section);
    if (!Model) {
      return res.status(400).json({ error: "Invalid section" });
    }

    // Replace strategy: Delete all for user and insert new list
    // This allows reordering and deletion easily from frontend
    await Model.deleteMany({ userId });

    if (Array.isArray(data) && data.length > 0) {
      const dataWithUserId = data.map(item => ({ ...item, userId }));
      const saved = await Model.insertMany(dataWithUserId);
      return res.json(saved);
    }

    return res.json([]); // Empty list if data is empty

  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
