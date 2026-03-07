// Agent Integration — All AI logic runs on the FastAPI backend.
// The frontend sends requests to the backend and renders results.
import { KnowledgeItem } from '@/stores/useResumeStore';
import { AgentStep } from './agent/types';
import {
  runAgent,
  getATSScore,
  checkBackendHealth,
  type AgentRunResponse,
} from './apiClient';

export interface AgentContext {
  jobDescription: string;
  currentLatex: string;
  knowledgeBase: KnowledgeItem[];
}

export type ProgressCallback = (step: AgentStep, progress: number, message: string) => void;

/**
 * Execute the full resume optimization via the FastAPI backend agent pipeline.
 * A simulated step-progress is emitted so the UI can show incremental updates.
 */
export async function optimizeResumeWithAgent(
  jobDescription: string,
  currentLatex: string,
  knowledgeBase: KnowledgeItem[],
  progressCallback?: ProgressCallback,
): Promise<{
  optimizedLatex: string;
  atsScoreBefore: number;
  atsScoreAfter: number;
  changes: string[];
  executionTime: number;
  success: boolean;
}> {
  // Emit simulated progress steps while the backend runs
  const steps: [AgentStep, number, string][] = [
    [AgentStep.PLANNING, 10, 'Creating optimization strategy...'],
    [AgentStep.ANALYZING, 25, 'Analyzing job requirements...'],
    [AgentStep.RETRIEVING, 40, 'Searching knowledge base...'],
    [AgentStep.REWRITING, 60, 'Rewriting resume content...'],
    [AgentStep.OPTIMIZING, 75, 'Optimizing for ATS...'],
    [AgentStep.VERIFYING, 90, 'Verifying quality...'],
  ];

  let stepIdx = 0;
  const interval = progressCallback
    ? setInterval(() => {
        if (stepIdx < steps.length) {
          const [step, pct, msg] = steps[stepIdx];
          progressCallback(step, pct, msg);
          stepIdx++;
        }
      }, 2500)
    : undefined;

  try {
    const res: AgentRunResponse = await runAgent({
      job_description: jobDescription,
      resume_latex: currentLatex,
      knowledge_base: knowledgeBase.map((kb) => ({
        id: kb.id,
        type: kb.type,
        title: kb.title,
        content: kb.content,
        tags: kb.tags,
      })),
    });

    if (interval) clearInterval(interval);
    progressCallback?.(AgentStep.COMPLETED, 100, 'Optimization complete!');

    return {
      optimizedLatex: res.updated_resume_latex,
      atsScoreBefore: res.ats_score_before,
      atsScoreAfter: res.ats_score_after,
      changes: res.changes_summary,
      executionTime: res.execution_time_ms,
      success: res.success,
    };
  } catch (error) {
    if (interval) clearInterval(interval);
    console.error('Backend agent optimization failed:', error);
    return {
      optimizedLatex: currentLatex,
      atsScoreBefore: 0,
      atsScoreAfter: 0,
      changes: [`Optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      executionTime: 0,
      success: false,
    };
  }
}

/**
 * Compute ATS score via the backend's deterministic scorer.
 * Falls back to a simple client-side check if the backend is unreachable.
 */
export async function calculateATSScore(
  resume: string,
  jobDescription: string,
): Promise<{ score: number; matched: string[]; missing: string[] }> {
  try {
    const res = await getATSScore(resume, jobDescription);
    return {
      score: res.score,
      matched: res.matched_keywords,
      missing: res.missing_keywords,
    };
  } catch {
    // Fallback: lightweight client-side keyword match
    return calculateATSScoreLocal(resume, jobDescription);
  }
}

/** Check if the backend is up. */
export { checkBackendHealth };

// ── Local fallbacks ────────────────────────────────────────────────────────

function calculateATSScoreLocal(resume: string, jobDescription: string) {
  const extractKeywords = (text: string): string[] => {
    const technical =
      text.match(
        /\b(?:JavaScript|TypeScript|Python|Java|C\+\+|React|Vue|Angular|Node\.js|AWS|GCP|Azure|Docker|Kubernetes|SQL|NoSQL|MongoDB|PostgreSQL|Redis|GraphQL|REST|API|CI\/CD|Git|Agile|Scrum|Machine Learning|AI|ML|Data Science|DevOps|Frontend|Backend|Full-?Stack|Microservices|Cloud|SaaS|B2B|B2C)\b/gi,
      ) || [];
    const soft =
      text.match(
        /\b(?:leadership|communication|problem-solving|analytical|collaborative|self-motivated|detail-oriented|innovative|strategic|cross-functional)\b/gi,
      ) || [];
    return [...new Set([...technical, ...soft].map((k) => k.toLowerCase()))];
  };

  const jdKeywords = extractKeywords(jobDescription);
  const resumeLower = resume.toLowerCase();
  const matched: string[] = [];
  const missing: string[] = [];

  for (const kw of jdKeywords) {
    if (resumeLower.includes(kw)) matched.push(kw);
    else missing.push(kw);
  }

  const score = jdKeywords.length > 0 ? Math.round((matched.length / jdKeywords.length) * 100) : 0;
  return { score, matched, missing };
}

export function searchKnowledgeBase(
  query: string,
  knowledgeBase: KnowledgeItem[],
  topK = 5,
): KnowledgeItem[] {
  const sim = (a: string, b: string): number => {
    const w1 = new Set(a.toLowerCase().split(/\W+/).filter((w) => w.length > 2));
    const w2 = new Set(b.toLowerCase().split(/\W+/).filter((w) => w.length > 2));
    const inter = new Set([...w1].filter((x) => w2.has(x)));
    const union = new Set([...w1, ...w2]);
    return union.size > 0 ? inter.size / union.size : 0;
  };

  return knowledgeBase
    .map((item) => ({
      item,
      score: sim(query, `${item.title} ${item.content} ${item.tags.join(' ')}`),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter((s) => s.score > 0.05)
    .map((s) => s.item);
}

export async function rewriteResume(context: AgentContext): Promise<string> {
  const result = await optimizeResumeWithAgent(
    context.jobDescription,
    context.currentLatex,
    context.knowledgeBase,
  );
  return result.optimizedLatex;
}

export async function chatWithAgent(userMessage: string, context: AgentContext): Promise<string> {
  if (userMessage.toLowerCase().includes('optimize') || userMessage.toLowerCase().includes('rewrite')) {
    const result = await optimizeResumeWithAgent(
      context.jobDescription,
      context.currentLatex,
      context.knowledgeBase,
    );
    if (result.success) {
      return `**Resume optimized!** ATS Score: ${result.atsScoreBefore}% → ${result.atsScoreAfter}%\n\n${result.changes.map((c) => `• ${c}`).join('\n')}`;
    }
    return `Optimization failed. ${result.changes.join(' ')}`;
  }

  return `Paste a job description to optimize your resume, or say "optimize" to start.`;
}