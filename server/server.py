import os
import re
import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

import google.generativeai as genai

from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings

def format_safespace(text: str):
    sections = dict(re.findall(r"\[(.*?)\]\s*(.*?)(?=\n\[|$)", text, re.S))

    return f"""
🌿 {sections.get('ACKNOWLEDGE','')}

{sections.get('EXPLAIN','')}

— Example —
{sections.get('EXAMPLE','')}

✨ Try this:
{sections.get('TRY','')}

💬 {sections.get('QUESTION','')}
"""
# ---------------- ENV ----------------
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("Missing GEMINI_API_KEY in .env")

if not OPENAI_API_KEY:
    raise ValueError("Missing OPENAI_API_KEY in .env")

genai.configure(api_key=GEMINI_API_KEY)

# ---------------- FASTAPI ----------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Query(BaseModel):
    userMessage: str


# ---------------- RETRIEVER ----------------
PERSIST_DIRECTORY = "db/chroma_db"

embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")

db = Chroma(
    persist_directory=PERSIST_DIRECTORY,
    embedding_function=embedding_model,
    collection_metadata={"hnsw:space": "cosine"},
)

retriever = db.as_retriever(search_kwargs={"k": 5})


def _parse_retry_seconds(error_message: str) -> float:
    """Parse 'Please retry in X.XXs' from Gemini API error message."""
    match = re.search(r"retry in (\d+(?:\.\d+)?)\s*s", error_message, re.I)
    if match:
        return min(float(match.group(1)) + 1, 60)
    return 25.0


# ---------------- RAG ENDPOINT ----------------
@app.post("/rag")
def rag(query: Query):
    user_query = query.userMessage

    docs = retriever.invoke(user_query)
    context = "\n\n".join(
        [f"Chunk {i + 1}:\n{doc.page_content}" for i, doc in enumerate(docs)]
    )

    model = genai.GenerativeModel("gemini-2.5-flash-lite")

    prompt = f"""
You are SafeSpace AI, a calm mental wellness support companion.

GUIDING PRINCIPLE
- Use retrieved context only when it is directly relevant to the user's current question or emotional state.
- If none of the context chunks are relevant, do NOT reference them; respond based on the user's message alone.

MUST-FOLLOW OUTPUT CONTRACT
You MUST respond using EXACTLY this format (no extra text before/after, no markdown):

[ACKNOWLEDGE]
short emotional acknowledgement (1-2 sentences)

[EXPLAIN]
simple explanation in 1-3 sentences — incorporate retrieved context **only if relevant**. If you reference context, start the sentence with "Based on Chunk N:" and paraphrase it in one short clause, then give the explanation.

[EXAMPLE]
relatable real life example (1-2 sentences) — you may use context here only to make the example more concrete if it clearly matches the user's situation.

[TRY]
one small coping step the user can try right now (1 sentence). If you use context to personalize the step, keep it short and actionable and mention "Chunk N" once.

[QUESTION]
one gentle reflective question (one short sentence). If context makes a targeted question obvious, you may reference Chunk N.

RULES
- No extra text beyond the five sections.
- No markdown.
- Maximum 2 sentences per section.
- Warm, validating, conversational tone.
- Prefer brief paraphrase over quoting.
- If multiple chunks seem relevant, choose at most one (the most relevant).
- If the model cannot determine relevance, do not use any context.

Context:
{context}

User:
{user_query}
"""

    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt)
            raw_text = response.text if response and response.text else ""
            formatted = format_safespace(raw_text)
            return {
                "raw": raw_text,
                "reply": formatted,
            }
        except Exception as e:
            msg = str(e)
            is_quota = (
                "429" in msg
                or "quota" in msg.lower()
                or "RESOURCE_EXHAUSTED" in msg
                or "rate" in msg.lower()
            )
            if is_quota and attempt < max_retries - 1:
                delay = _parse_retry_seconds(msg)
                time.sleep(delay)
                continue
            if is_quota:
                raise HTTPException(
                    status_code=429,
                    detail="Gemini API rate limit reached. Please wait a moment and try again, or check your quota at https://ai.google.dev/gemini-api/docs/rate-limits",
                )
            raise HTTPException(status_code=502, detail=f"Model error: {msg}")
