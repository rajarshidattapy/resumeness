Below is a **Claude Code–style PRD prompt** you can paste directly into Claude Code (or Cursor / Kiro style coding agents).
It instructs the agent to **refactor the architecture**, fix **tool calling**, and move logic from **Next.js API routes → FastAPI + LangChain agent backend**.

It is written so the coding agent can **plan → implement → refactor → validate**.

---

# Claude Code Prompt — PRD for Refactoring Resumeness AI into a Proper Agentic System

You are a senior AI systems engineer tasked with **refactoring and completing the Resumeness AI project** into a robust **agentic AI system with proper tool-calling, orchestration, and backend architecture**.

The current system works partially but has architectural flaws:

* Tool calling is implemented through **Next.js API routes**, which is unreliable and not suitable for complex multi-step agent workflows.
* The **LangChain agent logic is weak and poorly structured**.
* Tools are not clearly defined or modular.
* The system does not fully behave like an **autonomous agent**.

Your goal is to **re-architect the application into a proper AI agent system with a dedicated backend runtime**.

---

# Project Goal

Build a **fully functional AI-powered resume optimization platform** that:

1. Uses **LLM agents with tool-calling**
2. Retrieves relevant experience from a **knowledge base**
3. Rewrites **LaTeX resumes**
4. Computes **ATS compatibility scores**
5. Operates through a **FastAPI backend runtime**

The frontend should remain **React + Next.js**, but all AI orchestration must move to the backend.

---

# Target Architecture

## Frontend

Tech stack remains unchanged:

* React 18
* TypeScript
* Vite / Next.js
* TailwindCSS
* shadcn/ui
* Framer Motion
* CodeMirror (LaTeX editor)
* Zustand state management

Frontend responsibilities:

* Resume editing UI
* LaTeX editor
* Job description input
* Chat interface
* Display ATS score
* Render agent responses
* Show updated LaTeX + PDF preview

Frontend must **never call the LLM directly**.

Instead it communicates with the backend via:

```
POST /agent/run
POST /knowledge/search
POST /resume/compile
GET /resume/version
```

---

# Backend Architecture (New)

Create a **FastAPI backend** that handles all AI logic.

Backend stack:

* FastAPI
* LangChain
* OpenAI API
* PostgreSQL (Neon)
* Redis (optional caching)
* Python LaTeX parsing utilities
* Vector search (pgvector or Mem0)

Directory structure:

```
backend/
  app/
    main.py
    agents/
        resume_agent.py
        ats_optimizer_agent.py
        jd_analyzer.py
    tools/
        knowledge_search.py
        latex_editor.py
        ats_score.py
        job_parser.py
    services/
        knowledge_service.py
        resume_service.py
    db/
        models.py
        vector_store.py
    schemas/
        requests.py
        responses.py
```

---

# Agent System Design

Implement a **LangChain tool-calling agent**.

The main agent:
`ResumeOptimizationAgent`

Agent loop:

1. Analyze Job Description
2. Retrieve relevant experience
3. Modify LaTeX resume
4. Calculate ATS score
5. Self-check for improvements

Agent must use tools instead of hallucinating.

---

# Required Tools

Define each tool as a **LangChain Tool class**.

## Tool 1 — Job Description Analyzer

Purpose:

Extract structured information from job descriptions.

Output:

```
{
  role_title,
  seniority,
  required_skills,
  optional_skills,
  keywords,
  industry
}
```

---

## Tool 2 — Knowledge Base Search

Search the PostgreSQL knowledge base for:

* Projects
* Skills
* Experience
* Achievements

Use **vector similarity search**.

Return ranked results.

---

## Tool 3 — LaTeX Resume Editor

Modify LaTeX resume content **without breaking formatting**.

Capabilities:

* Update bullet points
* Rewrite sections
* Insert relevant projects
* Maintain LaTeX structure

Never regenerate the entire document blindly.

---

## Tool 4 — ATS Score Calculator

Compute ATS score based on:

* keyword coverage
* formatting structure
* experience relevance
* skill match

Return:

```
{
score: int,
keyword_match: percent,
missing_keywords: [],
suggestions: []
}
```

---

# Agent Workflow

For every job description:

Step 1
Parse job description.

Step 2
Search knowledge base.

Step 3
Select relevant projects/experience.

Step 4
Rewrite LaTeX sections.

Step 5
Run ATS scoring.

Step 6
Iteratively improve until score improves.

---

# API Endpoints

## Run Agent

```
POST /agent/run
```

Input:

```
{
job_description,
resume_latex,
user_id
}
```

Output:

```
{
updated_resume_latex,
ats_score_before,
ats_score_after,
changes_summary
}
```

---

## Knowledge Base Search

```
POST /knowledge/search
```

---

## Resume Compile

Compile LaTeX → PDF.

```
POST /resume/compile
```

Return PDF URL.

---

# Improvements Over Current System

The current system incorrectly:

* mixes frontend and backend logic
* uses weak tool calls
* lacks structured agent planning

The refactor must:

* separate frontend and AI runtime
* use **LangChain tool calling properly**
* create **clear agent workflows**
* implement **structured tool outputs**

---

# Performance Requirements

* Agent response < 10 seconds
* Resume rewrite must preserve formatting
* ATS score must be deterministic
* Knowledge retrieval must return top 5 matches

---

# Error Handling

Handle cases where:

* job description is empty
* knowledge base returns no results
* LaTeX compilation fails
* LLM produces invalid edits

Agent must retry automatically.

---

# Deliverables

The coding agent must:

1. Refactor architecture
2. Implement FastAPI backend
3. Implement LangChain agent
4. Define tools properly
5. Expose API endpoints
6. Integrate frontend with backend
7. Ensure the system runs locally

---

# Final Output Requirements

The final application must:

* allow a user to paste a job description
* automatically optimize the resume
* improve ATS score
* show rewritten LaTeX
* generate a downloadable PDF

---

# Development Rules

* Use modular Python design
* Avoid monolithic files
* Write clear tool interfaces
* Avoid hardcoded prompts
* Make agents easily extendable

---

# Final Objective

Convert the current resume builder into a **true AI agent system** capable of:

* reasoning
* retrieving information
* modifying structured documents
* optimizing resumes autonomously.

---

If you want, I can also show you **one extremely important upgrade** most people miss:

Turning this into a **multi-agent system (Planner + Editor + ATS Evaluator)** which will make the product **10x stronger than typical AI resume builders**.
