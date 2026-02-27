import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";

const app = express();
app.use(express.json());
app.use(cors());

// ---------------- API KEYS ----------------
if (!process.env.GEMINI_API_KEY)
  console.error("Missing GEMINI_API_KEY");

if (!process.env.OPENAI_API_KEY)
  console.error("Missing OPENAI_API_KEY (needed for retrieval embeddings)");

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ---------------- RETRIEVER ----------------
let retriever = null;

async function initRetriever() {
  try {
    const embeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-small",
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const db = await Chroma.fromExistingCollection(embeddings, {
      collectionName: "adfb1b86-17c8-4b14-bfc1-6322cff958b5",          // change if different
      url: process.env.CHROMA_SERVER_URL ?? "http://localhost:8000",
      collectionMetadata: { "hnsw:space": "cosine" },
    });

    retriever = db.asRetriever({ k: 5 });

    console.log("✅ Chroma retriever ready");
  } catch (err) {
    console.error("❌ Failed to connect to Chroma:", err.message);
  }
}

await initRetriever();

// ---------------- RAG ROUTE ----------------
app.post("/rag", async (req, res) => {
  try {
    const query = req.body.userMessage;
    if (!query) return res.status(400).json({ error: "Missing userMessage" });

    if (!retriever)
      return res.status(500).json({ error: "Retriever not initialized" });

    // ---- Retrieve context from Chroma ----
    const docs =
      typeof retriever.getRelevantDocuments === "function"
        ? await retriever.getRelevantDocuments(query)
        : await retriever.invoke(query);

    const context = docs
      .map((d, i) => `Chunk ${i + 1}:\n${d.pageContent ?? d.page_content}`)
      .join("\n\n");

    // ---- Generate response (Gemini) ----
    const result = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
You are SafeSpace AI, a CBT-guided emotionally supportive assistant.
Use retrieved context when helpful but prioritize empathy and psychological safety.

Context:
${context}

User:
${query}
      `,
    });

    return res.json({ reply: result.text });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------- SERVER ----------------
app.listen(3000, () => console.log("🚀 RAG server running on port 3000"));
