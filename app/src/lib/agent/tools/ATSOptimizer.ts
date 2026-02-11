// ATS Optimizer - Uses LLM to optimise resume for maximum ATS compatibility
import { ATSScore, ExecutionPlan, AgentConfig } from '../types';
import { createChatOllama } from '@/lib/langchain-openrouter';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

export class ATSOptimizer {
  private config: AgentConfig;
  private llm = createChatOllama({ temperature: 0.3, maxTokens: 8192 });

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Optimise resume for ATS using a single LLM pass
   */
  async optimizeForATS(
    rewriteResults: any,
    planningResults: ExecutionPlan
  ): Promise<{
    optimizedLatex: string;
    atsScoreBefore: ATSScore;
    atsScoreAfter: ATSScore;
    optimizationChanges: Array<{
      type: 'keyword_density' | 'natural_flow' | 'structure';
      description: string;
      impact: number;
    }>;
    rollbackRequired: boolean;
  }> {
    const { rewrittenLatex } = rewriteResults;
    const { atsKeywords } = planningResults;

    console.log('⚡ ATSOptimizer: Starting LLM-based ATS optimization');

    // Calculate score BEFORE optimization
    const atsScoreBefore = this.calculateScore(rewrittenLatex, atsKeywords);
    console.log('📊 ATS score before:', atsScoreBefore.overall);
    console.log('🔑 Missing keywords:', atsScoreBefore.missingKeywords.slice(0, 10));

    // If already above target, skip the LLM call
    if (atsScoreBefore.keywordCoverage >= this.config.keywordCoverageThreshold * 100) {
      console.log('✅ Already above keyword threshold – skipping LLM optimization');
      return {
        optimizedLatex: rewrittenLatex,
        atsScoreBefore,
        atsScoreAfter: atsScoreBefore,
        optimizationChanges: [],
        rollbackRequired: false,
      };
    }

    // Ask LLM to weave missing keywords in
    const optimizedLatex = await this.optimizeWithLLM(
      rewrittenLatex,
      atsScoreBefore.missingKeywords,
      planningResults
    );

    const atsScoreAfter = this.calculateScore(optimizedLatex, atsKeywords);
    console.log('📊 ATS score after:', atsScoreAfter.overall);

    const rollbackRequired = atsScoreAfter.overall < atsScoreBefore.overall;
    const changes: Array<{
      type: 'keyword_density' | 'natural_flow' | 'structure';
      description: string;
      impact: number;
    }> = [];

    if (atsScoreAfter.keywordCoverage > atsScoreBefore.keywordCoverage) {
      const gained = atsScoreAfter.matchedKeywords.filter(
        k => !atsScoreBefore.matchedKeywords.includes(k)
      );
      changes.push({
        type: 'keyword_density',
        description: `Added ${gained.length} keywords: ${gained.join(', ')}`,
        impact: atsScoreAfter.keywordCoverage - atsScoreBefore.keywordCoverage,
      });
    }

    return {
      optimizedLatex: rollbackRequired ? rewrittenLatex : optimizedLatex,
      atsScoreBefore,
      atsScoreAfter: rollbackRequired ? atsScoreBefore : atsScoreAfter,
      optimizationChanges: changes,
      rollbackRequired,
    };
  }

  // ──────────────────────────────────────────────────────────────
  // LLM optimiser
  // ──────────────────────────────────────────────────────────────

  private async optimizeWithLLM(
    latex: string,
    missingKeywords: string[],
    plan: ExecutionPlan
  ): Promise<string> {
    const systemPrompt = `You are an ATS (Applicant Tracking System) optimisation expert who works with LaTeX resumes.

TASK: Naturally incorporate as many of the MISSING KEYWORDS as possible into the resume below.

MISSING KEYWORDS: ${missingKeywords.join(', ')}
TARGET ROLE: ${plan.targetRole}

RULES:
1. Output the COMPLETE LaTeX document – from \\documentclass to \\end{document}.
2. Preserve ALL LaTeX commands, environments, and formatting EXACTLY.
3. Do NOT add fictional experience, companies, or degrees.
4. Weave keywords naturally into existing bullet points, summaries, and skills lists.
5. Avoid keyword-stuffing – each keyword should appear once or twice at most.
6. Do NOT wrap output in markdown code fences.
7. Keep braces balanced. Every \\begin{...} must have a matching \\end{...}.`;

    try {
      const result = await this.llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(latex),
      ]);

      let text = typeof result.content === 'string' ? result.content : String(result.content);
      text = text.replace(/^```(?:latex|tex)?\s*/i, '').replace(/```\s*$/i, '').trim();

      // Sanity check
      if (!text.includes('\\documentclass') || !text.includes('\\end{document}')) {
        console.warn('⚠️ ATSOptimizer: LLM output missing document structure – keeping original');
        return latex;
      }

      return text;
    } catch (err) {
      console.error('❌ ATSOptimizer LLM call failed:', err);
      return latex;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Scoring (kept heuristic – fast & deterministic)
  // ──────────────────────────────────────────────────────────────

  calculateScore(resume: string, keywords: string[]): ATSScore {
    const resumeText = this.extractText(resume).toLowerCase();
    const resumeWords = resumeText.split(/\W+/).filter(w => w.length > 2);

    const matchedKeywords: string[] = [];
    const missingKeywords: string[] = [];

    for (const keyword of keywords) {
      const kw = keyword.toLowerCase();
      const found = resumeWords.some(
        w => w.includes(kw) || kw.includes(w) || this.similar(w, kw)
      );
      (found ? matchedKeywords : missingKeywords).push(keyword);
    }

    const keywordCoverage = keywords.length > 0
      ? Math.round((matchedKeywords.length / keywords.length) * 100)
      : 0;

    const keywordDensity = this.density(resumeText, matchedKeywords);
    const naturalFlow = this.flowScore(resumeText);
    const overall = Math.round(keywordCoverage * 0.4 + keywordDensity * 0.3 + naturalFlow * 0.3);

    return { overall, keywordCoverage, keywordDensity, naturalFlow, matchedKeywords, missingKeywords };
  }

  explainScoreImprovement(before: ATSScore, after: ATSScore): string[] {
    const explanations: string[] = [];
    if (after.overall > before.overall) explanations.push(`Overall ATS score improved by ${after.overall - before.overall} points`);
    if (after.keywordCoverage > before.keywordCoverage) {
      const newKw = after.matchedKeywords.filter(k => !before.matchedKeywords.includes(k));
      explanations.push(`Added ${newKw.length} new keywords: ${newKw.join(', ')}`);
    }
    if (explanations.length === 0) explanations.push('No significant improvements detected');
    return explanations;
  }

  // ── private helpers ──

  private extractText(latex: string): string {
    return latex
      .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?(\{[^}]*\})?/g, ' ')
      .replace(/[{}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private similar(a: string, b: string): boolean {
    const map: [string, string][] = [
      ['js', 'javascript'], ['ts', 'typescript'], ['react', 'reactjs'],
      ['node', 'nodejs'], ['k8s', 'kubernetes'], ['aws', 'amazon web services'],
    ];
    return map.some(([s, l]) => (a === s && b === l) || (a === l && b === s));
  }

  private density(text: string, keywords: string[]): number {
    const words = text.split(/\W+/).filter(w => w.length > 2);
    const count = keywords.reduce((n, kw) => {
      const k = kw.toLowerCase();
      return n + words.filter(w => w.toLowerCase().includes(k)).length;
    }, 0);
    const d = words.length > 0 ? (count / words.length) * 100 : 0;
    if (d < 1) return Math.round(d * 20);
    if (d > 8) return Math.round(100 - (d - 8) * 10);
    return Math.round(Math.min(d * 20, 100));
  }

  private flowScore(text: string): number {
    let score = 100;
    const awkward = [/\b(\w+)\s+\1\b/gi, /\b(and|with|using)\s+(and|with|using)\b/gi];
    for (const p of awkward) score -= (text.match(p) || []).length * 10;
    const sentences = text.split(/[.!?]+/);
    for (const s of sentences) {
      const w = s.split(/\W+/);
      if (w.length > 5 && new Set(w.map(x => x.toLowerCase())).size / w.length < 0.6) score -= 15;
    }
    return Math.max(score, 0);
  }
}
