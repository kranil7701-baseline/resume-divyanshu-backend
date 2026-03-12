
import express from "express";
// import fetch from "node-fetch"; // Using native fetch in Node 18+
import { requireSignin } from "./auth.js";
import GeneratedResume from "../models/GeneratedResume.js";

const router = express.Router();

const API_KEY = "ur_live_BP16-hpIIPL2xQRE8BvQIP30edV56tca";

router.post("/resume/generate", requireSignin, async (req, res) => {
    try {
        const payload = req.body;

        const response = await fetch('https://useresume.ai/api/v3/resume/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("External API Error:", response.status, errorText);

            try {
                // If the error response is JSON, parse and return it directly
                const errorJson = JSON.parse(errorText);
                return res.status(response.status).json(errorJson);
            } catch (e) {
                // Fallback for non-JSON errors
                return res.status(response.status).json({ error: errorText });
            }
        }

        const data = await response.json();

        // Save to DB if successful
        if (data.success && data.data?.file_url) {
            try {
                const newGenerated = new GeneratedResume({
                    userId: req.auth._id,
                    file_url: data.data.file_url,
                    file_expires_at: data.data.file_expires_at,
                    template: payload.style?.template || "default"
                });
                await newGenerated.save();
            } catch (dbErr) {
                console.error("DB Save Error (GeneratedResume):", dbErr);
                // We don't fail the request if saving to history fails, but we log it
            }
        }

        res.json(data);

    } catch (error) {
        console.error("Proxy Error:", error);
        res.status(500).json({ error: "Internal Server Error during resume generation" });
    }
});

router.get("/resume/history", requireSignin, async (req, res) => {
    try {
        const userId = req.auth._id;
        const history = await GeneratedResume.find({ userId }).sort({ createdAt: -1 });
        res.json(history);
    } catch (error) {
        console.error("Fetch history error:", error);
        res.status(500).json({ error: "Failed to fetch resume history" });
    }
});

export default router;
