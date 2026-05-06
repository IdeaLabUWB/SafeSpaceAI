import os
import re
import time
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
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


def _extract_gemini_text(response) -> str:
    """Safely read model text (blocked or malformed responses can make `.text` raise)."""
    if not response:
        return ""
    try:
        t = getattr(response, "text", None)
        if t:
            return t
    except (ValueError, AttributeError):
        pass
    try:
        for cand in response.candidates or []:
            content = getattr(cand, "content", None)
            parts = getattr(content, "parts", None) if content else None
            for part in parts or []:
                text = getattr(part, "text", None)
                if text:
                    return text
    except Exception:
        pass
    return ""


# ---------------- ENV ----------------
# Resolve paths from this file so the app works no matter the process working directory.
_BASE_DIR = Path(__file__).resolve().parent
load_dotenv(_BASE_DIR / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Ports: backend runs on PORT, CORS allows FRONTEND_ORIGIN (frontend port).
# Default 3001 so another app can use 3000 locally; override with PORT in .env.
PORT = int(os.getenv("PORT", 3001))
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5500")

if not GEMINI_API_KEY:
    raise ValueError("Missing GEMINI_API_KEY in .env")

if not OPENAI_API_KEY:
    raise ValueError("Missing OPENAI_API_KEY in .env")

genai.configure(api_key=GEMINI_API_KEY)

# ---------------- FASTAPI ----------------
app = FastAPI()


def _cors_headers(request: Request) -> dict[str, str]:
    """Echo Origin so browsers accept error responses (500/502) that skip CORSMiddleware otherwise."""
    origin = request.headers.get("origin")
    if not origin:
        return {}
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
    }


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
        headers=_cors_headers(request),
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=_cors_headers(request),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    import traceback

    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers=_cors_headers(request),
    )


# Local dev: allow any port on localhost/127.0.0.1 (Live Server, Vite, etc.), not only FRONTEND_ORIGIN.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://127.0.0.1:5500", "http://localhost:5500"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def ensure_cors_on_all_responses(request: Request, call_next):
    """Echo Origin on every response so 500s and other edge paths still pass browser CORS checks."""
    response = await call_next(request)
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response


class Query(BaseModel):
    userMessage: str


# ---------------- RETRIEVER ----------------
PERSIST_DIRECTORY = str(_BASE_DIR / "db" / "chroma_db")

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
    user_query = (query.userMessage or "").strip()
    if not user_query:
        raise HTTPException(status_code=400, detail="userMessage is required")

    try:
        docs = retriever.invoke(user_query)
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Vector retrieval failed: {e!s}",
        ) from e
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
            raw_text = _extract_gemini_text(response)
            if not raw_text.strip():
                raise ValueError(
                    "Model returned no text (empty or blocked). Try rephrasing your message."
                )
            formatted = format_safespace(raw_text)
            return {
                "raw": raw_text,
                "reply": formatted,
            }
        except HTTPException:
            raise
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=PORT)
