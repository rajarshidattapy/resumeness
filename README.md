# Resumeness AI

AI-powered resume optimization platform. Paste a job description, and the agent automatically rewrites your LaTeX resume for maximum ATS compatibility.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, CodeMirror
- **Backend**: FastAPI, LangChain, Python
- **LLM**: Ollama (local) or OpenAI API
- **PDF**: LaTeX compilation via ytotech API

## How to Run

### 1. Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Python](https://python.org/) 3.10+
- [Ollama](https://ollama.ai/) (or an OpenAI API key)

### 2. Clone & install

```bash
git clone https://github.com/rajarshidattapy/resumeness
cd resumeness
npm install
cd backend
pip install -r requirements.txt
```

### 3. Configure environment

```bash
# From project root
cp .env.template .env
cp backend/.env.example backend/.env
```

Edit `backend/.env` — pick **one** LLM provider:

| Provider | Variables |
|----------|-----------|
| Ollama (default) | `OLLAMA_BASE_URL=http://localhost:11434` / `OLLAMA_MODEL=llama3` |
| OpenAI | `OPENAI_API_KEY=sk-...` / `OPENAI_MODEL=gpt-4o-mini` |

If using Ollama, pull a model first:

```bash
ollama pull llama3
```

### 4. Start

```bash
# Terminal 1 — Backend (port 8000)
cd backend
uvicorn app.main:app --reload

# Terminal 2 — Frontend (port 5173)
npm run dev
```

Open **http://localhost:5173**, paste a job description in the chat, and the agent will optimize your resume.

## Architecture

```
Frontend (React)  ──POST /agent/run──▶  FastAPI Backend
                  ──POST /resume/ats-score──▶    │
                  ──POST /resume/compile──▶      │
                                                 ▼
                                          LangChain Agent
                                         ┌───────────────┐
                                         │ 1. Parse JD    │
                                         │ 2. Search KB   │
                                         │ 3. Rewrite LaTeX│
                                         │ 4. Score ATS   │
                                         │ 5. Self-improve│
                                         └───────────────┘
```
