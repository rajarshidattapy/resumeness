# Resumeness AI — Project Overview

## Description

Resumeness AI is an AI-powered resume editor that combines a LaTeX editor with an LLM-driven optimization agent. Users write or paste their resume in LaTeX, provide a job description, and the AI agent rewrites and tailors the resume to maximize ATS (Applicant Tracking System) compatibility. The app is split into a React frontend and a FastAPI Python backend.

---

## Architecture

```
app/
├── src/                  # React + TypeScript frontend (Vite)
│   ├── components/
│   │   ├── chat/         # AI chat panel (ChatPanel.tsx)
│   │   ├── editor/       # LaTeX editor (LaTeXEditor.tsx)
│   │   ├── sidebar/      # Version history sidebar
│   │   ├── layout/       # Main split-panel layout
│   │   └── dev/          # Dev-only LLM config popup
│   ├── pages/
│   │   ├── Index.tsx         # Main editor + chat view
│   │   └── KnowledgeBasePage.tsx  # Knowledge base manager
│   ├── stores/
│   │   └── useResumeStore.ts # Zustand global state
│   └── lib/
│       ├── apiClient.ts       # FastAPI backend client
│       ├── agentIntegration.ts # Agent orchestration bridge
│       ├── latexCompiler.ts   # LaTeX → PDF compilation
│       └── db/knowledgeBaseDb.ts # Local knowledge base DB
└── backend/              # FastAPI Python backend
    └── requirements.txt  # Python dependencies
```

---

## Features

### AI Resume Optimization
- Chat-based interface to submit a job description and trigger the AI agent pipeline.
- The agent runs on the FastAPI backend using LangChain and OpenAI.
- Multi-step pipeline: planning → analyzing → knowledge retrieval → rewriting → ATS optimization → verification.
- Real-time progress indicator with per-step status messages.

### LaTeX Editor
- Full-featured LaTeX editor powered by CodeMirror with syntax highlighting (One Dark theme).
- Split-panel layout: chat on the left, editor on the right.
- Typewriter-effect streaming of AI-generated LaTeX content into the editor.
- Toggle between code view and preview.

### ATS Scoring
- Calculates an ATS compatibility score before and after optimization.
- Returns matched/missing keywords and improvement suggestions.
- Score is displayed in the chat after each optimization run.

### Knowledge Base
- Dedicated `/knowledge-base` page to manage personal career data.
- Supports four item types: **Project**, **Skill**, **Experience**, **Achievement**.
- Items have a title, content, and tags.
- Persisted locally via a lightweight DB layer (`knowledgeBaseDb.ts`).
- The agent retrieves relevant knowledge base items during optimization to enrich the resume.

### Version History
- Every AI optimization (and manual save) creates a versioned snapshot of the LaTeX content.
- Sidebar panel lists all versions with timestamps and descriptions.
- Users can restore any previous version.

### PDF Export
- Compile LaTeX to PDF via the backend (`/resume/compile`).
- Download the compiled PDF directly from the editor toolbar.
- Also supports downloading the raw `.tex` file.

### Backend Agent Pipeline (FastAPI)
- `/agent/run` — full optimization pipeline.
- `/resume/ats-score` — ATS keyword scoring.
- `/resume/compile` — LaTeX → PDF compilation.
- `/knowledge/search` — semantic search over the knowledge base.
- `/health` — health check endpoint.
- Uses PostgreSQL with `pgvector` for vector similarity search, Redis for caching, and LangChain for LLM orchestration.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui (Radix UI), Framer Motion |
| Editor | CodeMirror 6 via `@uiw/react-codemirror` |
| State | Zustand (with persistence middleware) |
| Data fetching | TanStack Query |
| Backend | FastAPI, Uvicorn |
| AI / LLM | LangChain, LangChain-OpenAI |
| Database | PostgreSQL + pgvector (NeonDB serverless) |
| Cache | Redis |
| Validation | Zod (frontend), Pydantic (backend) |

---

## Running the App

```bash
# Frontend
npm install
npm run dev          # starts Vite dev server

# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Set `VITE_BACKEND_URL` in the frontend env (defaults to `http://localhost:8000`).
