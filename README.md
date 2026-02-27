# SafeSpaceAI

A calm, CBT-guided, RAG-powered chatbot for anxiety support, with a web dashboard and chat UI.

## Overview
SafeSpaceAI combines a lightweight web client with a Node/Express backend that uses Gemini for embeddings and generation. User messages are embedded, matched against a small local knowledge base, and then used as context for response generation.

This repo contains:
- A static web UI (dashboard + chat)
- A Node server that exposes a `/rag` endpoint
- Scripts to generate embeddings for the knowledge base
- An optional Python ingestion pipeline for building a Chroma vector store

## Features
- RAG workflow with cosine similarity over a local knowledge base
- CBT-oriented responses and grounding guidance
- Clean, responsive dashboard and chat interface
- Embedding regeneration workflow for updated KB content
- Optional document ingestion pipeline (Chroma + OpenAI embeddings)

## Architecture
```
[Browser UI]  -->  POST /rag  -->  [Node/Express]
                                       |
                                       |  embed user query (Gemini)
                                       |  cosine similarity against kb_embeddings.json
                                       v
                                [KB context + user message]
                                       |
                                       v
                             [Gemini generation]
```

## Tech Stack
- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js, Express, CORS
- LLM/Embeddings: Google Gemini (`@google/genai`, `@google/generative-ai`)
- Optional ingestion: Python, LangChain, Chroma, OpenAI embeddings

## Project Structure
```
SafeSpaceAI/
  assets/
    knowledgeBase.json        # Seed knowledge base (CBT + grounding snippets)
  client/
    index.html
    styles.css
    chat.css
    script.js
    chat.js
  dataIngestion/
    docs/                     # Place .txt documents here
    ingestion_pipeline.py
  server/
    server.js                 # RAG endpoint
    embed.js                  # Regenerate kb_embeddings.json from knowledgeBase.json
    kb_embeddings.json
    test.js
    package.json
```

## Setup
### Prerequisites
- Node.js 18+
- npm
- Python 3.10+ (only for ingestion pipeline)

### Environment variables
Create `server/.env` with:
```
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
```
Notes:
- `GEMINI_API_KEY` is required for `server.js` and `embed.js`.
- `OPENAI_API_KEY` is only required for `dataIngestion/ingestion_pipeline.py`.
- Do not commit real API keys to git.

## Run the Server
```
cd server
npm install
node server.js
```
The server runs on `http://localhost:3000`.

## Run the Client
Serve the static files locally (recommended):
```
cd client
python -m http.server 5500
```
Then open `http://localhost:5500` in your browser.

## RAG API
### Endpoint
`POST /rag`

### Request
```
{
  "userMessage": "I'm feeling anxious"
}
```

### Response
```
{
  "reply": "..."
}
```

### Example (curl)
```
curl -X POST http://localhost:3000/rag \
  -H "Content-Type: application/json" \
  -d "{\"userMessage\":\"I'm feeling anxious\"}"
```

## Knowledge Base & Embeddings
- Edit `assets/knowledgeBase.json` to update the knowledge base.
- Regenerate embeddings:
```
cd server
node embed.js
```
This rebuilds `server/kb_embeddings.json`.

## Optional: Document Ingestion Pipeline
The ingestion pipeline builds a Chroma vector store from `.txt` files and uses OpenAI embeddings. This is not wired into `server.js` by default, but can be used for experiments or future integration.

1. Add `.txt` files to `dataIngestion/docs`.
2. Install Python dependencies (example):
```
pip install langchain-core langchain-text-splitters langchain-openai langchain-chroma python-dotenv
```
3. Run the pipeline:
```
cd dataIngestion
python ingestion_pipeline.py
```
The vector store is persisted to `db/chroma_db`.

## Testing
There are no automated tests yet. You can quickly validate Gemini connectivity with:
```
cd server
node test.js
```

## Safety Disclaimer
SafeSpaceAI is not a substitute for professional medical advice, diagnosis, or treatment. If you are in crisis or need immediate help, call 988 (U.S.) or your local emergency number.

## Contributing
Contributions are welcome. Please open an issue or PR with clear context and steps to reproduce changes.

## License
No license is currently specified.