import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import GeneratedResume from "../models/GeneratedResume.js";
import dotenv from "dotenv";

dotenv.config();

const s3Client = new S3Client({
    region: process.env.R2_REGION || "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});

export const uploadResumeToR2 = async (req, res) => {
    try {
        const userId = req.auth._id;
        const { fileName, pdfBase64, pdfUrl, templateName } = req.body;

        let buffer;
        if (pdfBase64) {
            // Remove the data:application/pdf;base64, part if present
            const base64Data = pdfBase64.includes(",") ? pdfBase64.split(",")[1] : pdfBase64;
            buffer = Buffer.from(base64Data, "base64");
        } else if (pdfUrl) {
            const response = await fetch(pdfUrl);
            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        } else {
            return res.status(400).json({ error: "PDF data or URL is required" });
        }

        const actualFileName = fileName || `resume-${Date.now()}.pdf`;
        const key = `uploads/resumes/${userId}/${Date.now()}-${actualFileName}`;

        const uploadParams = {
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: "application/pdf"
        };

        await s3Client.send(new PutObjectCommand(uploadParams));

        const fileUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

        const newGeneratedResume = new GeneratedResume({
            userId,
            file_url: fileUrl,
            template: templateName || "Default",
            status: "completed"
        });

        await newGeneratedResume.save();

        res.json({ message: "Resume uploaded and saved successfully", fileUrl, newGeneratedResume });
    } catch (error) {
        console.error("R2 Upload Error:", error);
        res.status(500).json({ error: "Failed to upload resume to Cloudflare R2" });
    }
};

export const getGeneratedResumes = async (req, res) => {
    try {
        const userId = req.auth._id;
        const resumes = await GeneratedResume.find({ userId }).sort({ createdAt: -1 });
        res.json(resumes);
    } catch (error) {
        console.error("Fetch Resumes Error:", error);
        res.status(500).json({ error: "Failed to fetch generated resumes" });
    }
};
