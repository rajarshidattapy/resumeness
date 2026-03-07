/**
 * API client for the FastAPI backend.
 * All AI orchestration goes through the backend — the frontend never calls LLMs directly.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// ── Types ──────────────────────────────────────────────────────────────────

export interface AgentRunRequest {
  job_description: string;
  resume_latex: string;
  knowledge_base: {
    id: string;
    type: string;
    title: string;
    content: string;
    tags: string[];
  }[];
}

export interface ChangeDetail {
  section: string;
  description: string;
}

export interface AgentRunResponse {
  updated_resume_latex: string;
  ats_score_before: number;
  ats_score_after: number;
  changes_summary: string[];
  changes: ChangeDetail[];
  execution_time_ms: number;
  success: boolean;
}

export interface ATSScoreResponse {
  score: number;
  keyword_match: number;
  matched_keywords: string[];
  missing_keywords: string[];
  suggestions: string[];
}

export interface ResumeCompileResponse {
  success: boolean;
  pdf_base64: string | null;
  error: string | null;
}

export interface KnowledgeSearchResponse {
  results: {
    id: string;
    type: string;
    title: string;
    content: string;
    tags: string[];
  }[];
  query: string;
}

export interface HealthCheckResponse {
  status: string;
  service: string;
}

// ── Helper ─────────────────────────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BACKEND_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    let detail: string;
    try {
      const body = await res.json();
      detail = body?.detail?.error ?? body?.detail ?? JSON.stringify(body);
    } catch {
      detail = res.statusText;
    }
    throw new Error(`Backend error (${res.status}): ${detail}`);
  }

  return res.json() as Promise<T>;
}

// ── API functions ──────────────────────────────────────────────────────────

/** Check if the backend is reachable. */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Run the full resume optimization agent pipeline. */
export async function runAgent(body: AgentRunRequest): Promise<AgentRunResponse> {
  return request<AgentRunResponse>('/agent/run', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Compute ATS score for a resume against a job description. */
export async function getATSScore(
  resumeLatex: string,
  jobDescription: string,
): Promise<ATSScoreResponse> {
  return request<ATSScoreResponse>('/resume/ats-score', {
    method: 'POST',
    body: JSON.stringify({
      resume_latex: resumeLatex,
      job_description: jobDescription,
    }),
  });
}

/** Compile LaTeX to PDF (returns base64-encoded PDF). */
export async function compileResume(latexContent: string): Promise<ResumeCompileResponse> {
  return request<ResumeCompileResponse>('/resume/compile', {
    method: 'POST',
    body: JSON.stringify({ latex_content: latexContent }),
  });
}

/** Search the knowledge base on the backend. */
export async function searchKnowledge(
  query: string,
  topK = 5,
  types?: string[],
): Promise<KnowledgeSearchResponse> {
  return request<KnowledgeSearchResponse>('/knowledge/search', {
    method: 'POST',
    body: JSON.stringify({ query, top_k: topK, types: types ?? null }),
  });
}
