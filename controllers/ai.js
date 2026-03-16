import pdf from "pdf-parse";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import Profile from "../models/Profile.js";
import Certification from "../models/certifications.js";
import Education from "../models/education.js";
import Experience from "../models/experience.js";
import Project from "../models/projects.js";
import Skills from "../models/skills.js";
import Social from "../models/social.js";
import ProjectExperience from "../models/projectExperience.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getUserResumeText = async (userId) => {
    const [profile, certifications, education, experience, projects, projectExperience, skills, socials] = await Promise.all([
        Profile.findOne({ userId }),
        Certification.find({ userId }),
        Education.find({ userId }),
        Experience.find({ userId }),
        Project.find({ userId }),
        ProjectExperience.find({ userId }),
        Skills.findOne({ userId }),
        Social.find({ userId })
    ]);

    let resumeText = `Name: ${profile?.name || 'N/A'}\nTitle: ${profile?.title || 'N/A'}\nSummary: ${profile?.summary || 'N/A'}\n\n`;

    resumeText += "EXPERIENCE:\n";
    experience.forEach(exp => {
        resumeText += `- ${exp.title} at ${exp.company} (${exp.startDate} - ${exp.endDate}): ${exp.description}\n`;
    });

    resumeText += "\nEDUCATION:\n";
    education.forEach(edu => {
        resumeText += `- ${edu.degree} from ${edu.school} (${edu.year})\n`;
    });

    resumeText += "\nSKILLS:\n";
    if (skills?.skills) {
        resumeText += skills.skills.join(", ") + "\n";
    }

    resumeText += "\nPROJECTS:\n";
    projects.forEach(p => {
        resumeText += `- ${p.title}: ${p.description}\n`;
    });

    // Added Project Experience and Certifications
    resumeText += "\nPROJECT EXPERIENCE:\n";
    projectExperience.forEach(pe => {
        resumeText += `- Role: ${pe.role} in ${pe.projectTitle}: ${pe.description}\n`;
    });

    resumeText += "\nCERTIFICATIONS:\n";
    certifications.forEach(cert => {
        resumeText += `- ${cert.name} from ${cert.organization} (${cert.year})\n`;
    });

    return resumeText;
};

export const getATSScore = async (req, res) => {
    try {
        const { jd } = req.body;
        const userId = req.auth._id;

        if (!jd) {
            return res.status(400).json({ error: "Job description is required" });
        }

        const resumeText = await getUserResumeText(userId);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

        const prompt = `
            You are an expert ATS (Applicant Tracking System) analyzer. 
            Analyze the following Resume against the Job Description.
            
            RESUME:
            ${resumeText}

            JOB DESCRIPTION:
            ${jd}

            Provide a response in strict JSON format with the following fields:
            {
                "score": (a number between 0-100 representing the match percentage),
                "observations": [
                    {"type": "positive", "text": "a positive remark about the match"},
                    {"type": "warning", "text": "an area for improvement or missing keyword"}
                ]
            }
            Only return the JSON. No other text.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up markdown code blocks if present
        text = text.replace(/```json|```/g, "").trim();

        const analysis = JSON.parse(text);
        res.json(analysis);

    } catch (error) {
        console.error("ATS Score Error:", error);
        res.status(500).json({ error: "Failed to analyze ATS score" });
    }
};

export const generateInterviewQuestions = async (req, res) => {
    try {
        const { role } = req.body;
        const userId = req.auth._id;

        if (!role) {
            return res.status(400).json({ error: "Target role is required" });
        }

        const resumeText = await getUserResumeText(userId);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });


        const prompt = `
            You are a technical interviewer. Based on the candidate's resume and their target role, generate 5 personalized interview questions.
            
            CANDIDATE RESUME:
            ${resumeText}

            TARGET ROLE:
            ${role}

            Provide a response in strict JSON format with an array of objects:
            [
                {"id": 1, "type": "Technical/Behavioral/etc", "question": "the question"},
                ...
            ]
            Only return the JSON. No other text.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up markdown code blocks if present
        text = text.replace(/```json|```/g, "").trim();

        const questions = JSON.parse(text);
        res.json(questions);

    } catch (error) {
        console.error("Interview Questions Error:", error);
        res.status(500).json({ error: "Failed to generate interview questions" });
    }
};

export const extractResumeData = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        let resumeText = "";
        const buffer = req.file.buffer;

        if (req.file.mimetype === "application/pdf") {
            const data = await pdf(buffer);
            resumeText = data.text;
        } else if (req.file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            const data = await mammoth.extractRawText({ buffer });
            resumeText = data.value;
        } else {
            return res.status(400).json({ error: "Unsupported file type. Please upload PDF or DOCX." });
        }

        if (!resumeText.trim()) {
            return res.status(400).json({ error: "Could not extract text from the file." });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

        const prompt = `
            You are an expert resume parser. Extract information from the following resume text and format it into structured JSON.
            
            RESUME TEXT:
            ${resumeText}

            Provide a response in strict JSON format with the following fields:
            {
                "experience": [
                    {"role": "string", "company": "string", "start": "ISO Date or null", "end": "ISO Date or null", "details": "string"}
                ],
                "education": [
                    {"school": "string", "degree": "string", "start": "ISO Date or null", "end": "ISO Date or null", "grade": "string"}
                ],
                "projects": [
                    {"title": "string", "link": "string or null", "desc": "string"}
                ]
            }
            
            Guidelines:
            - "details" in experience should be a summary or bullet points of responsibilities.
            - Dates should be in YYYY-MM-DD format if possible, or null.
            - Only return the JSON. No other text.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up markdown code blocks if present
        text = text.replace(/```json|```/g, "").trim();

        const extractedData = JSON.parse(text);
        res.json(extractedData);

    } catch (error) {
        console.error("Resume Extraction Error:", error);
        res.status(500).json({ error: "Failed to extract resume data" });
    }
};
