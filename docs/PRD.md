# Resumeness AI — Product & Technical Specification

**Status:** Active development (pre-launch) · **Doc version:** 1.0 · **Last updated:** 2026-07-22

---

## 1. Product Overview

### 1.1 What it is

Resumeness AI is a web app that tailors a user's LaTeX résumé to a specific job description. The user pastes a JD into a chat panel; an LLM-backed backend extracts role requirements, pulls the user's most relevant knowledge-base entries (past projects, skills, achievements), rewrites the weakest résumé bullets to better match the JD, and streams the updated LaTeX into a live CodeMirror editor next to a compiled PDF preview.

### 1.2 Product philosophy (non-negotiable constraints)

These rules exist in the codebase (`backend/backend.md`, `backend/app/prompts/optimize.txt`) and shape every backend decision:

- **Never fabricate.** No invented projects, employers, dates, or metrics. The AI may only reword existing content.
- **Never touch LaTeX syntax.** The LLM operates on plain-text bullet content only (see §4.4); a separate patch layer re-inserts that text into the original LaTeX so formatting, packages, and structure are never at risk.
- **Curation, not generation.** This is "AI-powered resume curation," not "AI resume generation" — selectively improve and reorder what's true, don't write a new resume from scratch.
- **No agent framework.** Explicitly a retrieval → rank → rewrite pipeline. No LangGraph, CrewAI, multi-agent orchestration, or autonomous tool-use loops. `langchain` appears in `package.json` but is unused by the current backend — the actual implementation calls the OpenAI SDK directly.

### 1.3 Target user

Job seekers who maintain (or are willing to maintain) a LaTeX résumé and a running list of their projects/skills/achievements, and who apply to multiple roles requiring per-application tailoring.

### 1.4 Core user flow

1. User signs in (Clerk) and lands on `/resume`.
2. User pastes a job description into the chat panel, or issues a direct edit command ("change my email to x@y.com").
3. Backend classifies the message as either an **edit command** or a **JD** (see §4.2 intent detection).
4. For a JD: backend computes an ATS score, embeds the JD, ranks the user's knowledge-base items by cosine similarity, asks the LLM to improve the top-relevant résumé bullets, patches those bullets back into the LaTeX by exact string match, and streams the result.
5. The CodeMirror editor updates live; a version snapshot is recorded; the ATS score badge and matched-keyword chips update.
6. User reviews the PDF preview (compiled client-side via a third-party LaTeX-to-PDF API), downloads the `.tex` or `.pdf`, or keeps iterating.

### 1.5 Out of scope (explicit non-goals)

Per `backend/backend.md`: autonomous agents, multi-agent systems, LangGraph/CrewAI, workflow DAG engines, browser agents, generic chat-memory systems. Per current codebase state (not yet built, see §6): resume parsing to structured JSON (`/resume/parse` is documented in the README but not implemented), payments, team/collaboration features, non-LaTeX résumé formats.

---

## 2. System Architecture

```
┌──────────────────────────────┐
│   React 18 + Vite Frontend   │
│  (localhost:5173)            │
│                               │
│  Clerk (auth) ── AuthSync ───┼──> scopes localStorage per userId
│  Zustand store (persisted)   │
│  CodeMirror editor            │
│  Chat panel (SSE client)      │
└──────────────┬────────────────┘
               │ POST /api/chat (SSE)      ── only endpoint actually wired up
               │ (fetch, streamed)
               ▼
┌──────────────────────────────┐
│   FastAPI Backend             │        ┌──────────────────┐
│  (localhost:8000)             │──────▶ │  OpenAI API       │
│                               │        │  gpt-4o-mini +    │
│  routes: chat / optimize /    │        │  text-embedding-  │
│  ats / resume / kb            │        │  3-small          │
│                               │        └──────────────────┘
│  services: extractor,         │
│  retriever, ranker, optimizer,│        ┌──────────────────┐
│  ats_analyzer, latex_patch,   │──────▶ │  MongoDB          │
│  editor, embedding_service    │        │  (optional — app  │
└──────────────────────────────┘        │  degrades if down)│
                                          └──────────────────┘

Separately, the browser calls a third-party service directly:
Frontend ──POST──▶ https://latex.ytotech.com/builds/sync   (LaTeX → PDF, no backend involved)
```

### 2.1 Repositories / directories

```
resumeness-ai/
├── src/                        React frontend (this doc's "frontend")
│   ├── components/
│   │   ├── auth/               ProtectedRoute, AuthSync (Clerk integration)
│   │   ├── chat/                ChatPanel — SSE client, the only backend caller
│   │   ├── editor/              LaTeXEditor (CodeMirror) + PDF preview
│   │   ├── layout/               MainLayout (resizable split), Sidebar
│   │   ├── sidebar/              ATSScore, KnowledgeBase, VersionHistory
│   │   └── ui/                   shadcn/ui primitives (Radix-based)
│   ├── lib/
│   │   ├── latexCompiler.ts     Client-side call to ytotech LaTeX→PDF API
│   │   ├── latex-parser.ts      Section-level LaTeX parsing (currently unused
│   │   │                         by the live optimize flow — see §6.2)
│   │   └── db/
│   │       ├── knowledgeBaseDb.ts  KB CRUD — localStorage, scoped by Clerk userId
│   │       └── initDb.ts           No-op init shim (kept for API compatibility)
│   ├── stores/useResumeStore.ts  Zustand store — single source of truth for
│   │                              editor content, chat messages, KB, versions,
│   │                              ATS score, UI panel state
│   └── pages/                    LandingPage (public), Index (/resume, protected),
│                                  KnowledgeBasePage (protected)
│
├── backend/
│   ├── app/
│   │   ├── main.py               FastAPI app, CORS, Mongo lifespan hook
│   │   ├── routes/               chat.py, optimize.py, ats.py, resume.py, kb.py
│   │   ├── services/             extractor, retriever, ranker, optimizer,
│   │   │                          ats_analyzer, latex_patch, editor,
│   │   │                          embedding_service
│   │   ├── models/               Pydantic request/response schemas
│   │   ├── prompts/               optimize.txt, ats.txt, extract.txt
│   │   └── db/mongo.py            Motor client; app runs in degraded mode
│   │                              (KB/version persistence disabled) if Mongo
│   │                              is unreachable
│   ├── backend.md                 Original backend PRD (design intent —
│   │                               superseded/detailed by this document)
│   └── requirements.txt
│
└── backend/hiring-agent/          Separate, untracked, self-contained Python
                                    tool (its own .git) for LLM-based résumé/
                                    GitHub evaluation. Not wired into the app;
                                    referenced in docs/to_add.md as a candidate
                                    source for ATS benchmarking. Treat as a
                                    future integration, not current architecture.
```

---

## 3. Frontend

### 3.1 Stack

- **React 18** + **TypeScript**, built with **Vite** (`@vitejs/plugin-react-swc`)
- **Tailwind CSS** + **shadcn/ui** (Radix primitives) for styling
- **Zustand** (`persist` middleware) for global state
- **@tanstack/react-query** — installed, `QueryClientProvider` wraps the app, but no queries are defined yet (reserved for future server-state needs)
- **@uiw/react-codemirror** (CodeMirror 6) for the LaTeX editor
- **react-resizable-panels** for the chat/editor split view
- **framer-motion** for transitions
- **@clerk/react** for authentication
- **react-router-dom** for routing
- **react-markdown** for rendering assistant chat messages

### 3.2 Routing (`src/App.tsx`)

| Path | Component | Access |
|---|---|---|
| `/` | `LandingPage` | Public — marketing page, Clerk `SignInButton`/`UserButton` |
| `/resume` | `Index` (chat + editor) | Protected via `ProtectedRoute` |
| `/knowledge-base` | `KnowledgeBasePage` | Protected via `ProtectedRoute` |
| `*` | `NotFound` | Public |

`ProtectedRoute` uses Clerk's `useAuth()`; unauthenticated users are sent to `RedirectToSignIn`. There is no server-side route protection — protection is purely client-side routing plus (for KB data) per-user localStorage scoping.

### 3.3 State management (`src/stores/useResumeStore.ts`)

Single Zustand store, `persist`-backed to `localStorage` under key `resumeness-storage`. Only `latexContent` and `versions` are persisted (`partialize`); knowledge base is deliberately excluded from this persisted slice because it's managed by a separate, user-scoped localStorage layer (`knowledgeBaseDb.ts`).

Key state:
- `latexContent`, `setLatexContent`, `forceSetLatexContent` (bypasses CodeMirror's internal update latch by dispatching directly to the `EditorView`), `setLatexContentWithTypewriter` (chunked animated write used for the initial "AI is writing" experience)
- `messages: Message[]` — chat history (not persisted; resets per session)
- `versions: ResumeVersion[]` — client-side version history, persisted, capped for display at 5 in the UI (`VersionHistory.tsx`) but unbounded in the store
- `knowledgeBase: KnowledgeItem[]` — loaded via `loadKnowledgeBase()`, backed by `localStorage`
- `atsScore`, `matchedKeywords` — set from SSE events
- `isTypewriting`, `isAgentThinking`, `activePanel` — UI flags

**Important caveat:** `resumeness-storage` (LaTeX content + versions) uses one fixed localStorage key — it is *not* scoped per Clerk user, unlike the knowledge base. A shared browser/profile will leak résumé content and version history across different signed-in users. This is flagged inline in the source as a known gap.

### 3.4 Editor & preview (`src/components/editor/LaTeXEditor.tsx`)

- CodeMirror instance bound two-way to `latexContent`; an effect diffs the store value against `view.state.doc` on every render to avoid feedback loops when the AI (not the user) updates content.
- "Preview" tab compiles the current LaTeX to PDF on every change via `compileLatexToPdf()` and renders it in an `<iframe>`. This means **every keystroke that changes tab, or every AI patch, triggers a network round-trip to a third-party compilation service** — see §6.3 for the cost/latency implication.
- Toolbar actions: save version (manual snapshot), download `.tex`, download `.pdf` (compiles on demand), fullscreen (button present, not wired up).

### 3.5 Chat panel (`src/components/chat/ChatPanel.tsx`)

The only component that talks to the backend. On send:
1. Classifies the message client-side as a likely JD (`length > 100`) vs. a short instruction, to decide whether to overwrite the stored `jobDescription`.
2. POSTs to `${VITE_API_URL}/api/chat` with the full message history, current `latexContent`, `jobDescription`, and `knowledgeBase` snapshot.
3. Reads the response as an SSE stream (`text/event-stream`) and switches on `event.type`:
   - `text` — incremental assistant reply tokens, appended to the placeholder message
   - `status` — transient progress text (not currently rendered distinctly from `text` in the UI — informational log only in practice)
   - `ats` — updates `atsScore` / `matchedKeywords`
   - `patches` — contains `updatedLatex`; if different from the live store value, calls `forceSetLatexContent` and records a new version
   - `error` / `done` — terminal events
4. Quick actions: insert a sample JD, list KB items inline, point at version history.

### 3.6 Design system

Tailwind config + `src/index.css` define the token set (`--primary`, `--chat-ai`, `--success`, `--warning`, `--destructive`, `--editor-bg`, etc.) consumed via `hsl(var(--x))`, plus `tailwindcss-animate` and `@tailwindcss/typography` (used for the markdown-rendered chat bubbles). shadcn/ui components live in `src/components/ui/` and are the base for all custom components — no other UI kit is used.

---

## 4. Backend

### 4.1 Stack

FastAPI (async), Motor (async MongoDB driver), Pydantic v2, OpenAI SDK (`gpt-4o-mini` for generation, `text-embedding-3-small` for embeddings). `anthropic` is a listed dependency but unused in the current code path — `AI_PROVIDER` env var exists but nothing branches on it yet.

CORS is hard-coded to `localhost:5173/3000/4173` in `main.py` — will need updating before any non-localhost deploy.

### 4.2 `POST /api/chat` — the primary and only integration point

Streams Server-Sent Events. Logic (`routes/chat.py`):

1. **Intent detection** — `is_edit_command()` (regex over imperative verbs: change/update/replace/add/remove/etc., message ≤ 300 chars) decides between two paths:
   - **Direct edit** (`services/editor.py`): the *entire* current LaTeX document plus the instruction is sent to the LLM with a strict "change only what's asked, preserve everything else verbatim" prompt, and the LLM returns the full replacement document. This is the one place the model *does* see raw LaTeX — a deliberate, narrow exception to the "never touch LaTeX" rule, used only for small surgical edits.
   - **JD optimization**: triggered when the message is not an edit command and is >50 chars. Runs ATS scoring, then (if KB items were sent) the full retrieve → optimize pipeline (§4.3–4.4).
2. Regardless of path, a conversational reply is streamed first from a lightweight system-prompted chat completion (`gpt-4o-mini`, `max_tokens=200`, 3-sentence limit), so the user always gets an immediate textual response even before/regardless of any patch.
3. If nothing resembles a résumé yet (`resumeLatex` < 100 chars), the action path is skipped entirely.

### 4.3 Retrieval (`services/retriever.py`, `services/embedding_service.py`)

- Embeds the job description once via `text-embedding-3-small`.
- For each KB item, uses its precomputed `embedding` if present, else computes one on the fly.
- Ranks by cosine similarity (pure-Python dot product, no vector DB/index — fine at the current KB sizes of a few dozen items).
- Returns top-5 by default. On any embedding-service failure, falls back to returning the first *k* items unranked rather than failing the request.
- `services/ranker.py` is a one-line pass-through to `retriever.py` — vestigial separation, not doing independent work today.

### 4.4 Optimization (`services/optimizer.py`, `services/latex_patch.py`, `prompts/optimize.txt`)

This is the mechanism that enforces "never let the LLM touch LaTeX syntax":

1. `extract_resume_bullets()` regex-parses `\section{...}`/`\subsection{...}` blocks and pulls every `\item ...` inside them, producing a numbered list of `{section, raw (verbatim LaTeX), display (LaTeX commands stripped for readability)}`.
2. The numbered, plain-text `display` bullets (capped at 30) plus the top-ranked KB items are interpolated into `prompts/optimize.txt` and sent to the LLM with `temperature=0.35`.
3. The LLM must return strict JSON referencing bullets **by index**, not by text match — this sidesteps a whole class of "couldn't find the exact string" bugs. Response is validated (`bulletIndex` bounds-checked, JSON-decode errors caught) and degrades to a no-op result with an explanatory summary on any failure.
4. `latex_patch.apply_patches()` takes each `{old: raw, new: improved}` pair and does a direct string replace of the **original raw LaTeX bullet** in the document (with a whitespace-normalized fallback match). Because `old` is the exact substring pulled from the document in step 1, this is a high-confidence, structure-preserving patch — the LLM never generates or touches LaTeX markup, only the human-readable bullet text.
5. Returns `updatedLatex`, the list of applied patches, a natural-language `summary`, and `appliedCount`.

The prompt caps improvements at 6 bullets per call and explicitly forbids fabricated metrics/dates/employers.

### 4.5 ATS scoring (`services/ats_analyzer.py`)

Deliberately simple, keyword-based, no LLM call (fast, free, deterministic):
- Strips LaTeX commands from the résumé to get plain text.
- Extracts JD keywords via regex heuristics: CamelCase terms, ALL-CAPS acronyms, and a hard-coded whitelist of ~25 common tech/soft-skill terms.
- Score = `matched / total_jd_keywords * 100`.
- Generates up to 3 templated suggestions based on score thresholds.

This is intentionally naive (no synonym matching, no stemming, no semantic similarity) and is the most likely component to need iteration if score quality becomes a complaint — see §6.4.

### 4.6 Other routes (built, currently unused by the frontend)

| Route | Purpose | Frontend caller? |
|---|---|---|
| `POST /api/optimize` | Non-streaming version of the full extract→retrieve→optimize→patch pipeline, returns before/after ATS scores | None — superseded by the inline logic in `/api/chat` |
| `POST /api/optimize/extract` | JD → `{role, skills, keywords, priority}` via LLM | None |
| `POST /api/ats/analyze` | Standalone ATS scoring endpoint | None — `/api/chat` computes this inline |
| `GET/POST/DELETE /api/resume/{user_id}/versions` | MongoDB-backed version history (survives across devices/browsers) | None — frontend versions live only in `localStorage` |
| `GET/POST/PUT/DELETE /api/kb/{user_id}` | MongoDB-backed KB CRUD, computes embeddings on write | None — frontend KB lives only in `localStorage` |
| `POST /api/kb/{user_id}/sync` | Bulk-upsert localStorage KB items into MongoDB | None |

**These are not dead code to delete** — they're the intended persistence layer per `backend/backend.md` (MongoDB Atlas, cross-device sync) that the frontend has not yet been wired up to consume. Currently the app works entirely off `localStorage` for KB and versions, with MongoDB only reachable through routes nothing calls. See §6.1 for the decision this forces.

### 4.7 No authentication on the backend

None of the FastAPI routes verify a Clerk session. `{user_id}` in `/api/kb/{user_id}` and `/api/resume/{user_id}/versions` is a client-supplied path parameter with no token check — anyone who knows or guesses a `user_id` can read/write another user's KB or version history via these endpoints. This is moot today only because the frontend never calls them; it becomes a hard blocker the moment §6.1 is resolved and the frontend starts syncing to Mongo. See §7.

---

## 5. Data Model

### 5.1 Client-side (localStorage, no backend involvement today)

```ts
// resumeness-storage (fixed key, NOT user-scoped)
{ latexContent: string, versions: ResumeVersion[] }

ResumeVersion { id, latex, timestamp, description, atsScore? }

// resumeness-kb-{clerkUserId}  (scoped key, set by AuthSync)
KnowledgeItem[]
KnowledgeItem { id, type: 'project'|'skill'|'experience'|'achievement', title, content, tags: string[], embedding? }
```

### 5.2 Backend / MongoDB (schema-less, defined by usage — reachable but unused by frontend)

```
db.knowledge_base:   { id, userId, type, title, content, tags[], embedding[] }
db.resume_versions:  { id, userId, latex, description, atsScore?, timestamp }
```

No indexes are created explicitly (`db/mongo.py` only pings on connect) — `userId` lookups will table-scan; fine at current scale, worth an index on `{userId}` (and `{userId, id}` for point lookups) before this path goes live.

---

## 6. Known Gaps & Decisions Needed

### 6.1 Two persistence layers, only one wired up (highest priority)

Frontend state (KB, versions) lives entirely in `localStorage`. The backend has a complete MongoDB-backed persistence layer (§4.6) that nothing calls. Consequences today: no cross-device access, data loss on browser data clear, no server-side backup. **Decision needed:** either (a) wire `AuthSync`/`useResumeStore` to call the `/api/kb` and `/api/resume/versions` endpoints and treat MongoDB as source of truth with localStorage as cache, or (b) formally drop the Mongo-backed routes as premature and simplify the backend. Given the backend PRD explicitly calls for MongoDB Atlas persistence, (a) appears to be the intended direction — it's just unfinished.

### 6.2 `latex-parser.ts` is unused

A section-aware LaTeX parser/reconstructor exists client-side (`src/lib/latex-parser.ts`) but the live patch flow is entirely server-side regex + exact-string replacement (`latex_patch.py`). Either this file is dead code from an earlier design, or it's intended for a future client-side editing feature. Worth a decision before it bit-rots further.

### 6.3 PDF preview recompiles on every keystroke/tab switch

`ResumePreview` calls the external `latex.ytotech.com` API on every `latex` change while the Preview tab is mounted. For a free third-party API this is a rate-limit and latency risk, and it happens with zero debouncing. A debounce (e.g., 800ms–1s after the last edit) or "compile on demand" button would reduce both cost and flakiness.

### 6.4 ATS scoring is a fixed keyword whitelist

`extract_keywords()` in `ats_analyzer.py` only recognizes ~25 hard-coded terms plus generic CamelCase/acronym patterns. It will silently under-score JDs in domains outside that whitelist (e.g., non-software roles, or software niches like embedded/robotics). Not wrong for the MVP, but the scoring quality ceiling is this list.

### 6.5 No backend auth (§4.7)

Must be closed before the Mongo-backed routes (§6.1) go live — otherwise §6.1's cross-device sync also means cross-*user* data exposure. Straightforward fix: verify the Clerk session JWT (Clerk provides a FastAPI/Python verification helper) in a dependency and derive `user_id` from the verified token instead of trusting the path parameter.

### 6.6 `resumeness-storage` is not user-scoped (§3.3)

Low effort, same fix pattern as the KB layer already uses (`knowledgeBaseDb.ts`'s `setCurrentUserId`) — key the store's persisted slice by Clerk user id, or namespace it the same way.

### 6.7 `hiring-agent/` is an unintegrated nested git repo

Lives at `backend/hiring-agent/` with its own `.git`, untracked by the main repo. Per `docs/to_add.md`, the intent is to reuse it for ATS benchmarking. It should either be added as a proper git submodule/subtree or have its useful logic extracted — right now it's an orphaned directory that `git status` will always flag.

---

## 7. Environment & Configuration Reference

### Frontend (`.env`, Vite-prefixed)
```
VITE_CLERK_PUBLISHABLE_KEY=      # required — app throws a console error and Clerk auth silently fails without it
VITE_API_URL=                     # optional, defaults to http://localhost:8000
```

### Backend (`backend/.env`)
```
AI_PROVIDER=openai                # declared, not yet branched on in code
OPENAI_API_KEY=
ANTHROPIC_API_KEY=                # declared, unused
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=resumeness
PORT=8000
```

### Local run

```bash
# backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload            # :8000

# frontend
npm install
npm run dev                               # :5173
```

MongoDB is optional for local dev — `connect_db()` catches connection failures and sets `mongodb.available = False`; any route that calls `get_db()` will then raise a 500, but the app boots and `/api/chat` (which doesn't touch Mongo) works fine.

---

## 8. Suggested Near-Term Roadmap

1. Close the backend auth gap (§6.5) — required before anything else touches Mongo.
2. Decide and implement §6.1 (wire frontend to Mongo-backed KB/version routes, or remove them).
3. Debounce PDF preview compilation (§6.3) — cheap, immediate UX/cost win.
4. Scope `resumeness-storage` per user (§6.6) — small diff, prevents data leakage on shared machines.
5. Resolve `latex-parser.ts` (§6.2) — delete or document its intended future use.
6. Revisit ATS keyword coverage (§6.4) once real user feedback on score accuracy comes in — not before, to avoid over-building a scorer nobody has complained about yet.
