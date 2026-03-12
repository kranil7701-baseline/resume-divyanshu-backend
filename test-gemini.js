import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

async function listModels() {
    try {
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await listResponse.json();
        if (data.models) {
            const names = data.models.map(m => m.name).join('\n');
            fs.writeFileSync('model_list.txt', names);
            console.log("Wrote to model_list.txt");
        } else {
            console.log("Error:", JSON.stringify(data));
        }
    } catch (error) {
        console.error(error);
    }
}

listModels();
