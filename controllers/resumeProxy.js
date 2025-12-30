
import express from "express";
// import fetch from "node-fetch"; // Using native fetch in Node 18+
import { requireSignin } from "./auth.js";

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
            return res.status(response.status).json({ error: errorText });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error("Proxy Error:", error);
        res.status(500).json({ error: "Internal Server Error during resume generation" });
    }
});

export default router;
