// Resume Rewriter - Uses LLM to rewrite LaTeX resume sections
import { ExecutionPlan, RankedResult } from '../types';
import { createChatOllama } from '@/lib/langchain-openrouter';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

export class ResumeRewriter {
  private llm = createChatOllama({ temperature: 0.4, maxTokens: 8192 });

  /**
   * Rewrite resume content using LLM, section by section
   */
  async rewriteResume(
    currentLatex: string,
    retrievalResults: any,
    planningResults: ExecutionPlan
  ): Promise<{
    rewrittenLatex: string;
    sectionsModified: string[];
    changesApplied: Array<{
      section: string;
      changeType: 'content' | 'structure' | 'keywords';
      description: string;
      confidence: number;
    }>;
    complexity: number;
  }> {
    console.log('✍️ ResumeRewriter: Starting LLM-based rewrite');
    const { relevantItems, gaps } = retrievalResults;

    // Build knowledge-base context string
    const kbContext = (relevantItems as RankedResult[])
      .slice(0, 8)
      .map((r) => `[${r.item.type}] ${r.item.title}: ${r.item.content}`)
      .join('\n');

    // Parse sections
    const sections = this.parseLatexSections(currentLatex);
    const sectionNames = Object.keys(sections);
    console.log('📑 Parsed sections:', sectionNames);

    const modifiedSections: string[] = [];
    const changesApplied: Array<{
      section: string;
      changeType: 'content' | 'structure' | 'keywords';
      description: string;
      confidence: number;
    }> = [];

    let rewrittenLatex = currentLatex;
    let complexity = 0;

    for (const [sectionName, sectionContent] of Object.entries(sections)) {
      // Skip tiny or structural sections
      if (this.shouldSkip(sectionName, sectionContent)) continue;

      console.log(`🔧 Rewriting section with LLM: ${sectionName}`);

      const newContent = await this.rewriteSectionWithLLM(
        sectionName,
        sectionContent,
        planningResults,
        kbContext,
        gaps
      );

      if (newContent && newContent !== sectionContent) {
        rewrittenLatex = rewrittenLatex.replace(sectionContent, newContent);
        modifiedSections.push(sectionName);
        changesApplied.push({
          section: sectionName,
          changeType: 'content',
          description: `LLM-rewritten "${sectionName}" to align with ${planningResults.targetRole} requirements`,
          confidence: 0.9,
        });
        complexity += 3;
      }
    }

    // Sanitize LaTeX
    rewrittenLatex = this.sanitizeLatex(rewrittenLatex);

    // Add optimization timestamp
    if (!rewrittenLatex.includes('% AI Optimized')) {
      rewrittenLatex = rewrittenLatex.replace(
        /\\end\{document\}/,
        `% AI Optimized on ${new Date().toISOString()}\n\\end{document}`
      );
      modifiedSections.push('Metadata');
    }

    console.log('✨ ResumeRewriter: Completed. Sections modified:', modifiedSections);
    return {
      rewrittenLatex,
      sectionsModified: modifiedSections,
      changesApplied,
      complexity: Math.ceil(complexity / Math.max(modifiedSections.length, 1)),
    };
  }

  // ──────────────────────────────────────────────────────────────
  // LLM section rewriter
  // ──────────────────────────────────────────────────────────────

  private async rewriteSectionWithLLM(
    sectionName: string,
    sectionContent: string,
    plan: ExecutionPlan,
    kbContext: string,
    gaps: string[]
  ): Promise<string | null> {
    const systemPrompt = `You are an expert resume engineer who writes perfect LaTeX resumes.

TASK: Rewrite the following LaTeX resume section so that it is tightly aligned with the target job.

TARGET ROLE: ${plan.targetRole}
SENIORITY: ${plan.seniorityLevel}
ATS KEYWORDS TO WEAVE IN: ${plan.atsKeywords.join(', ')}

KNOWLEDGE BASE (real candidate experience you can draw from):
${kbContext || 'No additional experience provided.'}

SKILL GAPS TO ADDRESS: ${gaps.length > 0 ? gaps.join(', ') : 'None identified'}

CRITICAL RULES:
1. Output ONLY the modified LaTeX for this section – include the \\section*{...} header.
2. Preserve ALL LaTeX commands, braces, environments, and formatting EXACTLY.
3. Never invent new companies, degrees, or job titles – only enhance existing content.
4. Naturally incorporate as many ATS keywords as possible WITHOUT keyword-stuffing.
5. Use strong action verbs and quantify achievements where possible, drawing numbers from the knowledge base.
6. Keep the same overall structure (number of items, environments) unless adding a bullet improves ATS match.
7. Do NOT wrap output in markdown code fences.
8. Every \\begin{...} must have a matching \\end{...}. Every { must have a matching }.`;

    const userPrompt = `Section "${sectionName}" to rewrite:

${sectionContent}`;

    try {
      const result = await this.llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);

      let text = typeof result.content === 'string' ? result.content : String(result.content);

      // Strip markdown fences if the LLM wrapped them anyway
      text = text.replace(/^```(?:latex|tex)?\s*/i, '').replace(/```\s*$/i, '').trim();

      // Basic sanity: must contain a backslash (LaTeX) and roughly balanced braces
      if (!text.includes('\\') || Math.abs(this.countChar(text, '{') - this.countChar(text, '}')) > 2) {
        console.warn(`⚠️ LLM output for "${sectionName}" looks broken – keeping original`);
        return null;
      }

      return text;
    } catch (err) {
      console.error(`❌ LLM rewrite failed for "${sectionName}":`, err);
      return null;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────

  private parseLatexSections(latex: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const pattern = /\\section\*?\{([^}]+)\}([\s\S]*?)(?=\\section\*?\{|\\end\{document\}|$)/g;
    let match;
    while ((match = pattern.exec(latex)) !== null) {
      sections[match[1].trim()] = match[0];
    }
    if (Object.keys(sections).length === 0) {
      sections['main'] = latex;
    }
    return sections;
  }

  private shouldSkip(name: string, content: string): boolean {
    const lower = name.toLowerCase();
    if (['education', 'contact', 'header', 'footer'].some(s => lower.includes(s))) return true;
    // Skip very small sections (e.g. just a header)
    return content.replace(/\\section\*?\{[^}]+\}/, '').trim().length < 30;
  }

  private countChar(str: string, ch: string): number {
    let n = 0;
    for (const c of str) if (c === ch) n++;
    return n;
  }

  /** Fix common LaTeX issues that LLM output might introduce */
  sanitizeLatex(latex: string): string {
    let result = latex;

    // Fix unescaped % (but not already-escaped \%)
    result = result.replace(/(?<!\\)%(?!\s*AI Optimized)/g, '\\%');

    // Remove any stray markdown fences
    result = result.replace(/```(?:latex|tex)?/gi, '');

    // Ensure every \begin{itemize} has \end{itemize}
    const beginCount = (result.match(/\\begin\{itemize\}/g) || []).length;
    const endCount = (result.match(/\\end\{itemize\}/g) || []).length;
    if (beginCount > endCount) {
      for (let i = 0; i < beginCount - endCount; i++) {
        result = result.replace(/\\end\{document\}/, '\\end{itemize}\n\\end{document}');
      }
    }

    return result;
  }
}
