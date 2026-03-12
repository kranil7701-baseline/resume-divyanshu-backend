import express from "express";
import { uploadResumeToR2, getGeneratedResumes } from "../controllers/generatedResume.js";
import { requireSignin } from "../controllers/auth.js";

const router = express.Router();

router.post("/upload-resume", requireSignin, uploadResumeToR2);
router.get("/my-resumes", requireSignin, getGeneratedResumes);

export default router;
