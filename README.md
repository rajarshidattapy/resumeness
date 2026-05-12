# Resumeness AI

> **AI-powered resume optimization** — Transform your resume to match any job description. Paste a JD, get AI-driven suggestions, and compile a perfectly formatted LaTeX resume optimized for ATS systems.

![Resumeness AI](app/public/image.png)

## ✨ Features

- **Intelligent Job Matching** — AI agent analyzes job descriptions and maps your experience to key requirements
- **Knowledge Base Search** — Automatically retrieves your past work experiences from your knowledge base
- **LaTeX Resume Editing** — Edit your resume directly in an integrated LaTeX editor with real-time preview
- **ATS Scoring** — Get instant feedback on how well your resume matches the target job (ATS compatibility score)
- **One-Click Compilation** — Compile your resume to PDF with ytotech API integration
- **Chat Interface** — Natural conversation with the AI agent about resume optimization
- **Version History** — Track all changes to your resume over time
- **Self-Improving** — The agent iteratively refines suggestions based on feedback

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Python](https://python.org/) 3.10+
- [OpenAI API key](https://platform.openai.com/api-keys)

### Installation

```bash
# Clone the repository
git clone https://github.com/rajarshidattapy/resumeness
cd resumeness

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
pip install -r requirements.txt
cd ..
```

### Configuration

```bash
# Create environment file
cp backend/.env.example backend/.env
```

Update `backend/.env` with your OpenAI API key:

```env
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini
```

### Running Locally

**Terminal 1 — Start Backend (port 8000)**
```bash
cd backend
uvicorn app.main:app --reload
```

**Terminal 2 — Start Frontend (port 5173)**
```bash
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser, paste a job description, and watch the agent optimize your resume.

## 📋 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast builds
- **Tailwind CSS** + **shadcn/ui** for styling
- **CodeMirror** for LaTeX editing

### Backend
- **FastAPI** — Modern async Python framework
- **LangChain** — AI agent orchestration
- **OpenAI API** (GPT-4o-mini) — LLM backbone
- **MongoDB** — Knowledge base storage
- **ytotech API** — LaTeX → PDF compilation

## 🏗️ Architecture

```
┌─────────────────┐
│  React Frontend │ (Vite + Tailwind + shadcn/ui)
│  - Chat UI      │
│  - LaTeX Editor │
│  - ATS Scorer   │
└────────┬────────┘
         │
    HTTP/JSON
         │
         ▼
┌─────────────────────────────────┐
│      FastAPI Backend            │
│  ┌─────────────────────────────┐│
│  │   LangChain AI Agent        ││
│  │ 1. Parse job description    ││
│  │ 2. Search knowledge base    ││
│  │ 3. Generate resume changes  ││
│  │ 4. Score ATS compatibility  ││
│  │ 5. Iteratively improve      ││
│  └─────────────────────────────┘│
│         │         │         │   │
│         ▼         ▼         ▼   │
│    [MongoDB] [OpenAI] [ytotech] │
└─────────────────────────────────┘
```

## 📁 Project Structure

```
resumeness/
├── src/                    # React frontend
│   ├── components/        # UI components
│   ├── pages/            # Page components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities (LaTeX parser, compiler)
│   └── stores/           # Zustand state management
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── models/      # Pydantic models (Resume, ATS, Extract)
│   │   ├── routes/      # API endpoints (resume, ats, chat, kb, optimize)
│   │   ├── services/    # Business logic (ATS analyzer, optimizer, extractor)
│   │   ├── prompts/     # LLM prompt templates
│   │   ├── db/          # Database (MongoDB connection)
│   │   └── utils/       # Logger, helpers
│   └── requirements.txt # Python dependencies
├── package.json         # Frontend dependencies
└── README.md           # This file
```

## 🔧 Environment Variables

Create a `backend/.env` file:

```env
# LLM Configuration
OPENAI_API_KEY=sk-your-api-key
OPENAI_MODEL=gpt-4o-mini

# Database
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=resumeness

# Server
BACKEND_PORT=8000
```

## 🌐 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/agent/run` | POST | Run the optimization agent |
| `/resume/parse` | POST | Parse LaTeX resume to JSON |
| `/resume/ats-score` | POST | Score resume for ATS compatibility |
| `/resume/compile` | POST | Compile LaTeX to PDF |
| `/chat/message` | POST | Send message to chat agent |
| `/kb/search` | POST | Search knowledge base |
| `/kb/add` | POST | Add experience to knowledge base |

## 💡 How It Works

1. **Paste a Job Description** — User shares what role they're targeting
2. **AI Analysis** — Agent parses JD and identifies key skills/requirements
3. **Knowledge Base Search** — Retrieves relevant past experiences
4. **Resume Generation** — LLM rewrites LaTeX sections to match job
5. **ATS Scoring** — Calculates compatibility with applicant tracking systems
6. **Iterative Refinement** — Agent self-improves until score is optimal
7. **Download** — Compile and download the optimized PDF resume


**Built with ❤️ to help you land your next role.**
