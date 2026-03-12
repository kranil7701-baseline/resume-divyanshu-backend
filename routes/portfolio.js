import express from "express";
import User from "../models/user.js";
import Profile from "../models/Profile.js";
import Certification from "../models/certifications.js";
import Education from "../models/education.js";
import Experience from "../models/experience.js";
import Project from "../models/projects.js";
import Skills from "../models/skills.js";
import Social from "../models/social.js";
import ProjectExperience from "../models/projectExperience.js";
import GeneratedResume from "../models/GeneratedResume.js";

const router = express.Router();

router.get("/portfolio/:username", async (req, res) => {
    try {
        const username = req.params.username;

        // Find the user by username
        const user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const userId = user._id;

        // Fetch all user sections and the latest generated resume for the download link
        const [
            profile,
            certifications,
            education,
            experience,
            projects,
            projectExperience,
            skills,
            socials,
            latestResume
        ] = await Promise.all([
            Profile.findOne({ userId }),
            Certification.find({ userId }),
            Education.find({ userId }),
            Experience.find({ userId }),
            Project.find({ userId }),
            ProjectExperience.find({ userId }),
            Skills.findOne({ userId }),
            Social.find({ userId }),
            GeneratedResume.findOne({ userId }).sort({ createdAt: -1 })
        ]);

        let skillsData = [];
        if (skills && skills.skills) {
            skillsData = skills.skills;
        }

        res.json({
            user: {
                name: user.name,
                username: user.username,
                email: user.email
            },
            profile: profile || {},
            certifications: certifications || [],
            education: education || [],
            experience: experience || [],
            projects: projects || [],
            projectExperience: projectExperience || [],
            skills: skillsData || [],
            social: socials || [],
            latestResume: latestResume || null
        });

    } catch (error) {
        console.error("Fetch portfolio data error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;
