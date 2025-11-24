import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(express.json());
app.use(cors());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
        const embedModel = genAI.getGenerativeModel({
            model: "text-embedding-004"
        });

        const embedRes = await embedModel.embedContent({
            content: {
              parts: [{ text: query }]
            }
          });
        const qVec = embedRes.embedding.values;

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
        const chatModel = genAI.getGenerativeModel({
            model: "gemini-1.5-flash-002"
        });

        const result = await chatModel.generateContent(`
You are SafeSpace AI, a CBT-guided, emotionally supportive AI.
Use the following knowledge base context to answer safely:

Context:
${best.text}

User message:
${query}
        `);

        return res.json({ reply: result.response.text() });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log("RAG server running on port 3000"));
