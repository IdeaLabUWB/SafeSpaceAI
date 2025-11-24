import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Load knowledge base
const docs = JSON.parse(fs.readFileSync("../assets/knowledgeBase.json", "utf8"));

async function generateEmbeddings() {
    const embeddingModel = genAI.getGenerativeModel({
        model: "text-embedding-004" // Gemini embedding model
    });

    let embeddings = [];

    for (const doc of docs) {
        console.log("Embedding:", doc.text.slice(0, 60));

        const result = await embeddingModel.embedContent({
            content: {
              parts: [{ text: doc.text }]
            }
          });
        embeddings.push(result.embedding.values);
    }

    fs.writeFileSync("kb_embeddings.json", JSON.stringify(embeddings));
    console.log("Embeddings saved to kb_embeddings.json");
}

generateEmbeddings();
