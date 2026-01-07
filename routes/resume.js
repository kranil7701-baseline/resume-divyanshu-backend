import express from "express";
import Profile from "../models/Profile.js";
import Certification from "../models/certifications.js";
import Education from "../models/education.js";
import Experience from "../models/experience.js";
import Project from "../models/projects.js";
import Skills from "../models/skills.js";
import Social from "../models/social.js";
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
    case 'social': return Social;
    default: return null;
  }
};

// GET /api/user/data - Fetch all user data
router.get("/user/data", requireSignin, async (req, res) => {
  try {
    const userId = req.auth._id; // detailed in requireSignin

    const [profile, certifications, education, experience, projects, skills, socials] = await Promise.all([
      Profile.findOne({ userId }),
      Certification.find({ userId }),
      Education.find({ userId }),
      Experience.find({ userId }),
      Project.find({ userId }),
      Skills.find({ userId }),
      Social.find({ userId })
    ]);

    let skillsData = [];
    if (skills && skills.length > 0) {
      if (skills[0].skills) {
        skillsData = skills[0].skills;
      } else {
        skillsData = skills;
      }
    }

    res.json({
      profile: profile || {},
      certifications: certifications || [],
      education: education || [],
      experience: experience || [],
      projects: projects || [],
      skills: skillsData || [],
      social: socials || []
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
      const updated = await Skills.findOneAndUpdate(
        { userId },
        { skills: data, userId },
        { new: true, upsert: true }
      );
      return res.json(updated.skills);
    }

    // For other sections (Arrays of Documents: Education, Experience, Projects, Social, Certs)
    const Model = getModel(section);
    if (!Model) {
      return res.status(400).json({ error: "Invalid section" });
    }

    // Replace strategy: Delete all for user and insert new list
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
