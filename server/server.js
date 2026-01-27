import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json());
app.use(cors());

if (!process.env.GEMINI_API_KEY) {
    console.error("ERROR: GEMINI_API_KEY is not set in .env file!");
    console.error("Please create a .env file in the server directory with: GEMINI_API_KEY=your_api_key_here");
}

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Load KB + embeddings
const docs = JSON.parse(fs.readFileSync("../assets/knowledgeBase.json", "utf8"));
const embeddedDocs = JSON.parse(fs.readFileSync("kb_embeddings.json", "utf8"));

// Cosine similarity
function cosineSimilarity(a, b) {
    let dot = 0,
        normA = 0,
        normB = 0;

    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] ** 2;
        normB += b[i] ** 2;
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

app.post("/rag", async (req, res) => {
    try {
        const query = req.body.userMessage;

        // ------ Embed user query ------
        const embedRes = await genAI.models.embedContent({
            model: "text-embedding-004",
            contents: query
        });
        const qVec =
            embedRes?.embedding?.values ??
            embedRes?.embeddings?.[0]?.values;
        if (!qVec) {
            throw new Error("Embedding response missing values");
        }

        // ------ Retrieve best document ------
        let best = { text: "", score: -Infinity };

        embeddedDocs.forEach((vec, i) => {
            const score = cosineSimilarity(qVec, vec);
            if (score > best.score) {
                best = {
                    text: docs[i].text,
                    score
                };
            }
        });

        // ------ Generate answer using Gemini ------
        const modelName = "gemini-3-flash-preview";

        const result = await genAI.models.generateContent({
            model: modelName,
            contents: `
You are SafeSpace AI, a CBT-guided, emotionally supportive AI.
Use the following knowledge base context to answer safely:

Context:
${best.text}

User message:
${query}
            `
        });

        return res.json({ reply: result.text });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log("RAG server running on port 3000"));
