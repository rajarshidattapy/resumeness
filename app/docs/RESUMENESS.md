# Resumeness AI

> **AI-powered resume optimization platform** — Paste a job description and let an autonomous agent rewrite your LaTeX resume for maximum ATS compatibility.

---

## 📝 App Description

Resumeness is a full-stack web application that uses AI (OpenAI GPT-4o-mini via LangChain) to automatically tailor LaTeX resumes to match specific job descriptions. The app features a split-pane IDE-style interface with an AI chat panel on the left and a live LaTeX editor on the right. Users paste a job description into the chat, and a multi-step autonomous agent analyzes the JD, searches a personal knowledge base for relevant experience, rewrites the resume, optimizes it for ATS (Applicant Tracking System) compatibility, and verifies the output — all without manual intervention.

---

## 🏗️ Architecture

```
Frontend (React/Vite)  ──POST /agent/run──────▶  FastAPI Backend
                       ──POST /resume/ats-score──▶      │
                       ──POST /resume/compile────▶       │
                       ──POST /knowledge/search──▶       │
                                                         ▼
                                                  LangChain Agent
                                                 ┌─────────────────┐
                                                 │ 1. Plan          │
                                                 │ 2. Analyze JD    │
                                                 │ 3. Search KB     │
                                                 │ 4. Rewrite LaTeX │
                                                 │ 5. ATS Optimize  │
                                                 │ 6. Verify        │
                                                 └─────────────────┘
```

---

## ⚙️ Tech Stack

| Layer        | Technology                                                    |
| ------------ | ------------------------------------------------------------- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui           |
| **Editor**   | CodeMirror (via `@uiw/react-codemirror`) with One Dark theme  |
| **State**    | Zustand (persisted to localStorage)                           |
| **Routing**  | React Router v6                                               |
| **Backend**  | FastAPI, Uvicorn, Python 3.10+                                |
| **AI/LLM**   | LangChain, OpenAI API (GPT-4o-mini), Ollama (optional local)  |
| **Database** | Neon (serverless Postgres), pgvector, SQLAlchemy, Redis        |
| **PDF**      | LaTeX compilation via ytotech API                             |
| **UI Lib**   | Radix UI primitives, Lucide icons, Framer Motion, Recharts    |
| **MCP**      | Flask backend with Overleaf Git sync                          |

---

## ✨ Features

### 🤖 Autonomous Agent Pipeline
- **6-step agent workflow**: Planning → Analysis → Retrieval → Rewriting → Optimization → Verification
- Agent is powered by `AgentController` with modular tool architecture
- Built-in `PlanningEngine` that analyzes job descriptions and creates execution plans
- `MemoryManager` for tracking agent session history
- Robust `ErrorHandler` with typed errors, retry logic, and recovery strategies
- Self-improvement loop — agent critiques its own output and iterates

### 🧠 Agent Tools (Modular)
| Tool                          | Purpose                                                     |
| ----------------------------- | ----------------------------------------------------------- |
| `JobDescriptionAnalyzer`      | Extracts role, skills (hard/soft), ATS keywords, seniority  |
| `KnowledgeBaseSearchEngine`   | Semantic search of user's KB for relevant experience/skills |
| `ResumeRewriter`              | Rewrites LaTeX resume sections with job-aligned content      |
| `ATSOptimizer`                | Maximizes ATS keyword coverage and density                   |
| `VerificationEngine`          | Validates LaTeX syntax, checks for inaccuracies/redundancy   |
| `ResultPresenter`             | Formats and presents final optimization results              |

### 📝 LaTeX Editor
- Full CodeMirror-based editor with syntax highlighting (One Dark theme)
- Typewriter animation effect when the agent writes new content
- Editor/Preview panel toggle
- Direct CodeMirror `EditorView` integration for programmatic updates

### 💬 AI Chat Interface
- Conversational chat panel to interact with the agent
- Markdown rendering for agent responses
- Streaming message support with loading indicators
- Message history management

### 📊 ATS Scoring
- Real-time ATS compatibility scoring against a given JD
- Keyword coverage and keyword density metrics
- Matched vs. missing keyword breakdown
- Score visualization via Recharts

### 📚 Knowledge Base
- Persistent knowledge base with categorized entries: **Projects**, **Skills**, **Experience**, **Achievements**
- CRUD operations with database-backed storage (Neon Postgres / localStorage fallback)
- Tag-based filtering and search
- Seeded with default sample data on first run
- Dedicated `/knowledge-base` page for management

### 📋 Version History
- Automatic snapshotting of resume versions
- Restore any previous version with one click
- Each version records its ATS score and a description
- Persisted across sessions via Zustand + localStorage

### 🔗 Overleaf Integration (MCP Module)
- Separate Flask-based backend for Overleaf sync
- Two modes:
  - **Manual paste** — generates LaTeX and returns it for copy/paste
  - **Git sync** — auto-pushes to Overleaf via local Git clone
- Chat endpoint for requesting LaTeX tweaks conversationally
- Knowledge base (KB) stored in `kb.json`

### 🛠️ Developer Tools
- `DevLLMPopup` component (dev-only) for switching between LLM providers/models at runtime
- Test scripts for agent optimization (`test-agent-optimization.ts`)
- Ollama integration for local LLM testing (`test-ollama.ts`, `langchain-openrouter.ts`)

### 🎨 UI / UX
- Responsive split-pane layout with resizable panels (`react-resizable-panels`)
- Sidebar with ATS score display, knowledge base summary, and version history
- shadcn/ui component library (30+ Radix primitives)
- Framer Motion animations
- Toast notifications (Sonner + Radix Toast)
- Mobile-aware hooks (`use-mobile`)
- Dark mode support (`next-themes`)

### 📄 PDF Compilation
- LaTeX → PDF compilation via external ytotech API
- Returns base64-encoded PDF for in-browser preview/download

---

## 📁 Project Structure

```
resumeness-ai/
├── app/                          # Main application
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/             # ChatPanel (AI conversation UI)
│   │   │   ├── editor/           # LaTeXEditor (CodeMirror)
│   │   │   ├── layout/           # MainLayout, Sidebar
│   │   │   ├── sidebar/          # ATSScore, KnowledgeBase, VersionHistory
│   │   │   ├── dev/              # DevLLMPopup (dev-only tooling)
│   │   │   └── ui/               # shadcn/ui component library
│   │   ├── hooks/                # use-mobile, use-toast
│   │   ├── lib/
│   │   │   ├── agent/            # Core agent system
│   │   │   │   ├── AgentController.ts
│   │   │   │   ├── PlanningEngine.ts
│   │   │   │   ├── MemoryManager.ts
│   │   │   │   ├── ErrorHandler.ts
│   │   │   │   ├── types.ts
│   │   │   │   └── tools/        # Modular agent tools (6 tools)
│   │   │   ├── db/               # Database init & KB queries
│   │   │   ├── apiClient.ts      # FastAPI backend client
│   │   │   ├── latexCompiler.ts  # PDF compilation
│   │   │   ├── latex-parser.ts   # LaTeX parsing utilities
│   │   │   └── resumeAgent.ts    # Legacy/alternative agent
│   │   ├── pages/                # Index, KnowledgeBasePage, NotFound
│   │   └── stores/               # useResumeStore (Zustand)
│   ├── backend/                  # FastAPI Python backend
│   │   ├── .env / .env.example
│   │   └── requirements.txt
│   └── docs/                     # Setup guides & analysis docs
├── mcp/                          # Overleaf sync module
│   ├── backend/
│   │   ├── app.py                # Flask server (generate, chat, sync)
│   │   └── kb.json               # Knowledge base (JSON)
│   └── frontend/                 # Standalone MCP frontend
└── README.md
```

---

## 🔌 API Endpoints (FastAPI Backend)

| Method | Endpoint             | Description                                     |
| ------ | -------------------- | ----------------------------------------------- |
| GET    | `/health`            | Health check                                    |
| POST   | `/agent/run`         | Run the full resume optimization agent pipeline |
| POST   | `/resume/ats-score`  | Compute ATS score for resume vs. JD             |
| POST   | `/resume/compile`    | Compile LaTeX to PDF (base64)                   |
| POST   | `/knowledge/search`  | Search the knowledge base                       |

---

## 🚀 How to Run

### Prerequisites
- Node.js 18+
- Python 3.10+
- OpenAI API key

### Install & Start

```bash
# Clone
git clone https://github.com/rajarshidattapy/resumeness
cd resumeness/app

# Frontend
npm install
npm run dev          # → http://localhost:5173

# Backend (separate terminal)
cd backend
pip install -r requirements.txt
cp .env.example .env # add your OPENAI_API_KEY
uvicorn app.main:app --reload  # → http://localhost:8000
```

---

## 📌 Key Design Decisions

- **Frontend-heavy agent system**: The agent architecture (controller, tools, planning, memory) is implemented in TypeScript on the frontend, with the backend serving as an LLM proxy and PDF compiler.
- **Dual backend strategy**: FastAPI for the main app, Flask for the MCP/Overleaf module.
- **Knowledge base persistence**: Uses Neon (serverless Postgres) with pgvector for embeddings, falling back to localStorage if unavailable.
- **Zustand for state**: Centralized store with selective persistence — versions and LaTeX content survive page reloads; chat messages and agent state do not.
- **Modular agent tools**: Each agent capability is a standalone TypeScript class, making it easy to add/replace tools.
