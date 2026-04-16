# SafeSpaceAI

SafeSpaceAI is a calm, CBT-guided web assistant that uses retrieval-augmented generation (RAG) to provide grounding and anxiety-support conversations.

## What This Project Demonstrates

- End-to-end AI application development (frontend + API + retrieval pipeline)
- FastAPI backend design with CORS, structured prompts, and resilient error handling
- RAG integration using LangChain + Chroma for context retrieval
- Human-centered UX for supportive, low-friction interactions

## Architecture

```text
[Browser (HTML/CSS/JS)]
        |
        | POST /rag
        v
[FastAPI backend]
        |
        | retrieve top-k context chunks from Chroma
        | generate response with Gemini
        v
[Structured supportive response]
```

## Tech Stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Python, FastAPI, Uvicorn
- Retrieval: LangChain + Chroma vector store
- Model APIs: Google Gemini (generation), OpenAI embeddings (retrieval)
- Environment/config: `python-dotenv`

## Repository Structure

```text
SafeSpaceAI/
  assets/
    knowledgeBase.json
  client/
    index.html
    chat.js
    script.js
    config.js
  dataIngestion/
    ingestion_pipeline.py
    docs/
  server/
    server.py
    .env.example
    db/                  # local vector store (gitignored)
  requirements.txt
```

## Quick Start

### 1) Install dependencies

```bash
pip install -r requirements.txt
```

### 2) Configure environment variables

Copy `server/.env.example` to `server/.env` and fill values:

```env
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
PORT=3000
FRONTEND_ORIGIN=http://localhost:5500
```

### 3) Run ingestion_pipeline -> backend

cd dataIngestion
python ingestion_pipeline.py

```bash
cd server
python server.py
```

Backend default: `http://localhost:3000`

### 4) Run frontend

```bash
cd client
python -m http.server 5500
```

Open `http://localhost:5500`.

## API

### `POST /rag`

Request:

```json
{
  "userMessage": "I'm feeling anxious"
}
```

Response:

```json
{
  "raw": "...",
  "reply": "..."
}
```

## Optional Data Ingestion Workflow

To rebuild a local Chroma store from text documents:

1. Place `.txt` files in `dataIngestion/docs/`
2. Run:

```bash
cd dataIngestion
python ingestion_pipeline.py
```

## Demo

### Landing Page
![Chat UI](screenshots/Landing%20Page.png)

### Breathing Tool
![Breathing](screenshots/Breathing%20Visualiser.png)

### LLM Chatbot
![Chat Support](screenshots/CBT%20grounded%20AI%20chatbot.png)

### Music Therapy
![Music Therapy](screenshots/Integrated%20Calming%20Music%20Therapy.png)

## Showcase Notes

- This project is intended as a **portfolio/work-sample artifact**.
- Secrets are excluded via `.gitignore`; use `server/.env.example` as the template.
- Generated runtime artifacts (vector DB, caches, `node_modules`) are excluded from version control.

## Safety Notice

This application is for supportive conversation and educational demonstration. It is **not** a replacement for professional medical care. In urgent situations, contact local emergency services or a crisis hotline (in the U.S., dial 988).

## License

MIT (see `LICENSE`).