// Job Description Analyzer - Uses LLM to extract requirements, skills, and keywords
import { SkillCategory, SeniorityLevel, ExecutionPlan } from '../types';
import { createChatOllama } from '@/lib/langchain-openrouter';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

export class JobDescriptionAnalyzer {
  private llm = createChatOllama({ temperature: 0.2 });

  /**
   * Analyse job description with LLM and return structured data
   */
  async analyzeJobDescription(jobDescription: string, planningResults?: ExecutionPlan): Promise<{
    roleTitle: string;
    requiredSkills: SkillCategory[];
    niceToHaveSkills: SkillCategory[];
    atsKeywords: string[];
    seniorityLevel: SeniorityLevel;
    industryTerms: string[];
    companyCulture: string[];
    focusAreas: string[];
    additionalKeywords?: string[];
    refinedStrategy?: string;
  }> {
    console.log('🔍 JobDescriptionAnalyzer: Invoking LLM for deep analysis');

    const existingKeywords = planningResults?.atsKeywords?.join(', ') || 'none yet';

    const systemPrompt = `You are an expert ATS (Applicant Tracking System) analyst. Analyse the job description and return a JSON object (no markdown fences) with this exact structure:

{
  "roleTitle": "<exact job title>",
  "requiredSkills": [
    { "type": "hard", "skills": ["React", "TypeScript", "..."], "priority": 1 },
    { "type": "soft", "skills": ["leadership", "..."], "priority": 2 }
  ],
  "niceToHaveSkills": [
    { "type": "hard", "skills": ["..."], "priority": 3 }
  ],
  "atsKeywords": ["keyword1", "keyword2", "...at least 20 keywords"],
  "seniorityLevel": "entry|mid|senior|executive",
  "industryTerms": ["SaaS", "fintech", "..."],
  "companyCulture": ["fast-paced", "collaborative", "..."],
  "focusAreas": ["backend development", "system design", "..."],
  "additionalKeywords": ["keywords not already in: ${existingKeywords}"],
  "refinedStrategy": "<one sentence: best resume optimization approach for this specific JD>"
}

Rules:
- atsKeywords: at least 20. Include ALL technologies, tools, methodologies, soft skills, action verbs, and domain terms from the JD.
- additionalKeywords: only keywords NOT already listed in the existing set above.
- seniorityLevel must be exactly one of: entry, mid, senior, executive.
- Return ONLY the JSON, no explanation.`;

    const result = await this.llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(jobDescription),
    ]);

    const text = typeof result.content === 'string' ? result.content : String(result.content);
    console.log('🔍 JobDescriptionAnalyzer: LLM response length:', text.length);

    try {
      const parsed = this.parseJSON(text);
      return this.normalize(parsed);
    } catch {
      console.error('⚠️ JobDescriptionAnalyzer: Failed to parse LLM JSON, returning minimal analysis');
      return this.fallbackAnalysis(jobDescription, planningResults);
    }
  }

  private parseJSON(raw: string): any {
    const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON object found');
    return JSON.parse(cleaned.slice(start, end + 1));
  }

  private normalize(raw: any): ReturnType<JobDescriptionAnalyzer['analyzeJobDescription']> extends Promise<infer R> ? R : never {
    const seniorityMap: Record<string, SeniorityLevel> = {
      entry: SeniorityLevel.ENTRY,
      mid: SeniorityLevel.MID,
      senior: SeniorityLevel.SENIOR,
      executive: SeniorityLevel.EXECUTIVE,
    };
    const toStringArray = (v: any) => (Array.isArray(v) ? v.map(String) : []);
    const toSkillCategories = (v: any): SkillCategory[] =>
      (Array.isArray(v) ? v : []).map((s: any) => ({
        type: s.type === 'soft' ? ('soft' as const) : ('hard' as const),
        skills: toStringArray(s.skills),
        priority: Number(s.priority) || 1,
      }));

    return {
      roleTitle: String(raw.roleTitle || 'Software Professional'),
      requiredSkills: toSkillCategories(raw.requiredSkills),
      niceToHaveSkills: toSkillCategories(raw.niceToHaveSkills),
      atsKeywords: toStringArray(raw.atsKeywords),
      seniorityLevel: seniorityMap[String(raw.seniorityLevel).toLowerCase()] ?? SeniorityLevel.MID,
      industryTerms: toStringArray(raw.industryTerms),
      companyCulture: toStringArray(raw.companyCulture),
      focusAreas: toStringArray(raw.focusAreas),
      additionalKeywords: raw.additionalKeywords ? toStringArray(raw.additionalKeywords) : undefined,
      refinedStrategy: raw.refinedStrategy ? String(raw.refinedStrategy) : undefined,
    };
  }

  private fallbackAnalysis(jd: string, plan?: ExecutionPlan) {
    return {
      roleTitle: plan?.targetRole || 'Software Professional',
      requiredSkills: plan?.requiredSkills || [],
      niceToHaveSkills: [] as SkillCategory[],
      atsKeywords: plan?.atsKeywords || [],
      seniorityLevel: plan?.seniorityLevel || SeniorityLevel.MID,
      industryTerms: plan?.industryTerms || [],
      companyCulture: [] as string[],
      focusAreas: [] as string[],
      additionalKeywords: undefined,
      refinedStrategy: undefined,
    };
  }
}
