# Resumeness AI — Backend PRD

## Objective

Build a FastAPI backend for Resumeness AI that integrates tightly with the existing frontend architecture and transforms the current UI into a fully functional AI-powered resume optimization platform.

The backend should NOT behave like a generic chatbot.

It should function as a focused resume intelligence engine that:
- understands a target job description
- retrieves relevant career information from the user's knowledge base
- intelligently rewrites resume sections
- preserves LaTeX structure
- streams professional edits back into the editor

The system should prioritize:
- reliability
- maintainability
- structured editing
- frontend synchronization
- minimal agent complexity

Do NOT overengineer with multi-agent systems or autonomous workflows.

This is a retrieval + ranking + rewriting system.

---

# Existing Frontend Context (IMPORTANT)

You MUST inspect the existing frontend repository before implementing the backend.

The frontend already contains:

## Pages
- `/` → Main resume editor
- `/knowledge-base` → KB manager
- `404`

## Core Components
- `ChatPanel`
- `LaTeXEditor`
- `MainLayout`
- `Sidebar`
- `ATSScore`
- `KnowledgeBase`
- `VersionHistory`

## Existing Libraries
- `latexCompiler.ts`
- `latex-parser.ts`
- `knowledgeBaseDb.ts`
- `initDb.ts`
- `utils.ts`

## State Management
- Zustand store:
  - `useResumeStore.ts`
  - central state manager
  - handles editor state
  - version history
  - ATS state
  - UI synchronization

## Existing UI Behavior
The backend MUST preserve:
- typewriter streaming updates
- editor synchronization
- version history logic
- ATS score updates
- live patching behavior

Do NOT redesign frontend architecture.

The backend must adapt to the frontend.

---

# Product Philosophy

The AI should NOT:
- generate fake experiences
- rewrite the entire resume blindly
- hallucinate projects
- break LaTeX formatting
- produce generic corporate text

The AI SHOULD:
- prioritize the most relevant existing experiences
- selectively improve resume bullets
- tailor content toward the job description
- preserve formatting consistency
- make intelligent section-level edits

This is closer to:
"AI-powered resume curation"
than
"AI resume generation."

---

# Core User Flow

## Step 1
User pastes a Job Description into chat.

Example:
- ML Engineer Intern
- NLP
- TensorFlow
- Python
- Research mindset

---

## Step 2
Backend extracts:
- role type
- relevant skills
- important keywords
- role priorities

---

## Step 3
Backend retrieves relevant entries from Knowledge Base:
- projects
- achievements
- experience
- skills

Example:
If role is ML-focused:
- prioritize ML projects
- prioritize research experience
- prioritize Python/NLP bullets
- reduce irrelevant frontend content

---

## Step 4
Backend generates structured resume edits.

IMPORTANT:
The backend should NEVER directly rewrite raw LaTeX.

Instead:
```txt
LaTeX Resume
    ↓
Structured Resume JSON
    ↓
AI modifies text content only
    ↓
Patch generator updates sections
    ↓
Frontend applies changes
````

---

# Critical Architecture Rule

NEVER ALLOW THE LLM TO MODIFY RAW LATEX DIRECTLY.

Use the existing:

* `latex-parser.ts`
* editor structure
* section mappings

The model should only modify:

* bullet text
* summaries
* ordering
* wording
* keyword optimization

NOT formatting syntax.

---

# Backend Tech Stack

## Required

* FastAPI
* Python 3.11+
* Motor (async MongoDB driver)
* Pydantic
* Uvicorn

## AI

* OpenAI SDK OR Anthropic SDK

## Embeddings

* OpenAI embeddings (`text-embedding-3-small`)

## Streaming

* FastAPI StreamingResponse
  OR
* SSE

## Database

* MongoDB Atlas

---

# Backend Folder Structure

```txt
backend/
│
├── app/
│   ├── main.py
│   │
│   ├── routes/
│   │   ├── optimize.py
│   │   ├── resume.py
│   │   ├── kb.py
│   │   ├── ats.py
│   │   └── chat.py
│   │
│   ├── services/
│   │   ├── extractor.py
│   │   ├── retriever.py
│   │   ├── ranker.py
│   │   ├── optimizer.py
│   │   ├── ats_analyzer.py
│   │   ├── latex_patch.py
│   │   └── embedding_service.py
│   │
│   ├── models/
│   │   ├── kb.py
│   │   ├── resume.py
│   │   ├── ats.py
│   │   └── chat.py
│   │
│   ├── db/
│   │   └── mongo.py
│   │
│   ├── prompts/
│   │   ├── optimize.txt
│   │   ├── ats.txt
│   │   └── extract.txt
│   │
│   └── utils/
│       └── logger.py
│
├── requirements.txt
└── .env
```

---

# Core Backend Features

# 1. Job Description Extraction

Endpoint:

```http
POST /api/optimize/extract
```

Input:

```json
{
  "jobDescription": "..."
}
```

Output:

```json
{
  "role": "ML Engineer Intern",
  "skills": ["Python", "PyTorch", "TensorFlow"],
  "keywords": ["NLP", "Research", "Deep Learning"],
  "priority": ["machine learning", "research"]
}
```

Use lightweight prompting.

Do NOT overengineer NLP parsing.

---

# 2. Knowledge Base Retrieval

Backend must:

* retrieve relevant KB entries
* compute embeddings
* rank relevance against JD

Supported KB categories:

* Projects
* Skills
* Experience
* Achievements

Store embeddings in MongoDB.

---

# 3. Resume Optimization

Core endpoint:

```http
POST /api/optimize
```

Input:

```json
{
  "resumeLatex": "...",
  "jobDescription": "...",
  "knowledgeBaseItems": [...]
}
```

The optimization engine should:

* prioritize relevant projects
* improve bullet wording
* reorder skills
* improve ATS alignment
* maintain professionalism

DO NOT:

* fabricate information
* create fake metrics
* rewrite unrelated sections

---

# 4. Structured Patch Generation

The backend should return PATCHES instead of full rewritten resumes.

Correct response format:

```json
{
  "changes": [
    {
      "section": "projects",
      "target": "Resume Optimizer",
      "old": "...",
      "new": "..."
    }
  ]
}
```

The frontend editor should apply patches.

This preserves:

* formatting
* history
* editor state
* undo behavior

---

# 5. ATS Analysis

Endpoint:

```http
POST /api/ats/analyze
```

Return:

* ATS score
* matched keywords
* missing keywords
* optimization suggestions

This must integrate with the existing `ATSScore` component.

---

# 6. Streaming AI Responses

Backend must support:

* token streaming
* typewriter updates
* incremental UI rendering

Compatible with the existing `ChatPanel`.

Use:

```python
StreamingResponse
```

---

# 7. Version Awareness

Frontend already has version history.

Backend should:

* return optimization summaries
* support resumable edits
* optionally generate concise change logs

Example:

```json
{
  "summary": "Prioritized ML projects and improved NLP-related bullet points."
}
```

---

# Embeddings Strategy

Use embeddings ONLY for retrieval.

Do NOT build complex RAG pipelines.

Workflow:

```txt
JD embedding
    ↓
similarity search
    ↓
retrieve top KB items
    ↓
pass into optimizer
```

Simple and maintainable.

---

# AI Prompting Rules

The prompts must explicitly instruct the model:

* preserve factual accuracy
* avoid fake metrics
* avoid keyword stuffing
* keep concise professional tone
* optimize for ATS readability
* never modify LaTeX syntax directly

---

# Expected Frontend Sync

Claude MUST inspect:

* editor update flow
* Zustand state shape
* existing component contracts
* current LaTeX parsing behavior

The backend response format should match the frontend architecture.

Avoid introducing unnecessary abstractions.

---

# Non-Goals

Do NOT build:

* autonomous agents
* multi-agent systems
* CrewAI
* LangGraph
* workflow DAG engines
* browser agents
* generic chat memory systems

This product is:
retrieval + ranking + rewriting.

Keep it focused.

