Here's a feature list that extends the existing architecture to cover what you've sketched out. I've tied each one to where it'd actually plug into the current system (routes, services, data model) so it's Claude-Code-delegation-ready.

**1. ATS Benchmark Engine (via `hiring-agent`)**
Right now `ats_analyzer.py` is a keyword-whitelist scorer (§4.5/§6.4 in your spec) — functional but crude. The orphaned `backend/hiring-agent/` repo (§6.7) already does LLM-based résumé/GitHub evaluation, so instead of building a second scorer from scratch, promote it to the real ATS backend: wire it in as a proper module (submodule or extracted into `services/`), expose it behind the existing `/api/ats/analyze` route, and use its output to replace or supplement the keyword-match score with something benchmarked against real evaluation criteria. This also finally resolves §6.7 — it stops being "an orphaned directory `git status` flags" and becomes load-bearing.

**2. Learning Dashboard (gap-driven)**
The core insight in your note — "resume is what it forces me to learn things" — is that every JD-vs-resume mismatch is implicitly a skill gap. When the retriever/ranker (§4.3) finds a JD requirement with no good KB match (low cosine similarity across all KB items, not just "top-5 but weak"), that's a signal worth surfacing instead of silently discarding. A new dashboard panel (sibling to `ATSScore`/`KnowledgeBase` in the sidebar) would list these unmatched JD requirements as "things you don't have evidence for yet," turning the app from a passive rewriter into something that tells the user what to go learn next.

**3. Pop Quiz / Platform Score**
For each identified gap (or each KB skill the user claims), generate a short quiz — a few LLM-generated questions calibrated to the skill/keyword in question — and track a running "platform score" per user. This serves two purposes: it's a lightweight verification layer (did they actually demonstrate the skill, not just paste a keyword), and it's a gamified reason to keep the KB fresh over time rather than filling it out once and letting it rot. Needs a new `services/quiz.py`, a `quiz_attempts` collection in Mongo, and a route like `POST /api/kb/{item_id}/quiz`.

**4. Certificate Backing**
The trust problem you're naming — "why would big employers trust it" — needs the quiz score to convert into something portable and credible, not just an internal number. Two pieces: (a) after a passing quiz score, generate a structured, timestamped certificate (PDF, verifiable via a public `/verify/{cert_id}` page) tied to that specific KB item; (b) for genuine gaps, auto-suggest a short (~6hr) curated learning path from a small set of vetted sources (official docs, well-known courses) rather than open web search, so the recommendation itself carries credibility. This is the piece most worth scoping carefully — a certificate is a trust claim, so the verification/audit trail matters more than the quiz UI does.

**5. DeepAgents as the backend agent layer**
Worth flagging directly: your product philosophy currently states *no agent framework, no LangGraph, no autonomous tool-use loops* (§1.2) — that's a deliberate constraint that's kept the optimize pipeline predictable and patch-safe. Introducing `langchain-ai/deepagents` for the new backend agents (quiz generation, gap analysis, learning-path curation) is reasonable *if scoped to the new surface area only* — i.e., these are genuinely open-ended, multi-step tasks (research a topic, curate sources, generate assessment) unlike the existing extract→retrieve→optimize→patch pipeline, which should stay deterministic and untouched by an agent loop. I'd explicitly document this as "two backends, two philosophies" rather than let it quietly erode the non-negotiable constraint that's protecting the LaTeX-safety guarantees in §4.4.

**Suggested sequencing:** ATS benchmark (1) and Learning Dashboard (2) share the same underlying signal (JD-vs-KB gaps) so build those together first. Quiz (3) depends on 2 existing. Certificates (4) depend on 3 producing a trustworthy score. DeepAgents (5) is really an infrastructure decision that should be made once, upfront, since it determines how 2–4 get implemented — not something to bolt on per-feature.

Fixes:
- The frontend only ever calls /api/chat — /api/kb, /api/resume/versions, /api/optimize, /api/ats/analyze are fully built but orphaned; KB and version history currently live only in localStorage.
- The backend has no auth check on {user_id} path params — fine today only because nothing calls those routes.
- resumeness-storage (LaTeX + versions) isn't scoped per Clerk user, unlike the KB store.
- PDF preview recompiles against a third-party API on every keystroke, undebounced.
- latex-parser.ts is dead/unused code.