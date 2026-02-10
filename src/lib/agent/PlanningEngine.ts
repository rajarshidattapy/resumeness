// Planning Engine - Uses LLM to create execution plans
import { ExecutionPlan, SkillCategory, SeniorityLevel, AgentStep } from './types';
import { createChatOllama } from '@/lib/langchain-openrouter';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

export class PlanningEngine {
  private llm = createChatOllama({ temperature: 0.3 });

  /**
   * Create an execution plan by asking the LLM to analyse the JD
   */
  async createExecutionPlan(jobDescription: string): Promise<ExecutionPlan> {
    console.log('🧠 PlanningEngine: Invoking LLM for execution plan');

    const systemPrompt = `You are an expert resume strategist. Analyse the following job description and return a JSON object (no markdown fences) with exactly this structure:

{
  "targetRole": "<exact job title>",
  "requiredSkills": [
    { "type": "hard", "skills": ["Skill1", "Skill2"], "priority": 1 },
    { "type": "soft", "skills": ["Skill1"], "priority": 2 }
  ],
  "atsKeywords": ["keyword1", "keyword2", "...at least 15 keywords"],
  "seniorityLevel": "<entry|mid|senior|executive>",
  "industryTerms": ["term1", "term2"],
  "optimizationStrategy": "<one sentence describing the best approach>",
  "estimatedDuration": 30000
}

Rules:
- atsKeywords must contain at least 15 keywords extracted from the JD, including technical skills, tools, frameworks, soft skills, and industry terms.
- requiredSkills should separate hard (technical) and soft skills.
- seniorityLevel must be exactly one of: entry, mid, senior, executive.
- Return ONLY the JSON object, no explanation, no markdown.`;

    const result = await this.llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(jobDescription),
    ]);

    const text = typeof result.content === 'string' ? result.content : String(result.content);
    console.log('🧠 PlanningEngine: LLM response length:', text.length);

    try {
      const parsed = this.parseJSON(text);
      return this.normalizePlan(parsed);
    } catch {
      console.error('⚠️ PlanningEngine: Failed to parse LLM JSON, using fallback extraction');
      return this.fallbackPlan(jobDescription);
    }
  }

  /** Try to find the JSON object in possibly noisy LLM output */
  private parseJSON(raw: string): any {
    const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON object found');
    return JSON.parse(cleaned.slice(start, end + 1));
  }

  /** Map parsed JSON into strict ExecutionPlan type */
  private normalizePlan(raw: any): ExecutionPlan {
    const seniorityMap: Record<string, SeniorityLevel> = {
      entry: SeniorityLevel.ENTRY,
      mid: SeniorityLevel.MID,
      senior: SeniorityLevel.SENIOR,
      executive: SeniorityLevel.EXECUTIVE,
    };

    return {
      targetRole: String(raw.targetRole || 'Software Professional'),
      requiredSkills: (raw.requiredSkills || []).map((s: any) => ({
        type: s.type === 'soft' ? 'soft' : 'hard',
        skills: Array.isArray(s.skills) ? s.skills.map(String) : [],
        priority: Number(s.priority) || 1,
      })) as SkillCategory[],
      atsKeywords: Array.isArray(raw.atsKeywords) ? raw.atsKeywords.map(String) : [],
      seniorityLevel: seniorityMap[String(raw.seniorityLevel).toLowerCase()] ?? SeniorityLevel.MID,
      industryTerms: Array.isArray(raw.industryTerms) ? raw.industryTerms.map(String) : [],
      optimizationStrategy: String(raw.optimizationStrategy || 'balanced_optimization'),
      estimatedDuration: Number(raw.estimatedDuration) || 30000,
    };
  }

  /** Minimal fallback if LLM response is unparseable */
  private fallbackPlan(jd: string): ExecutionPlan {
    return {
      targetRole: 'Software Professional',
      requiredSkills: [],
      atsKeywords: this.quickExtractKeywords(jd),
      seniorityLevel: SeniorityLevel.MID,
      industryTerms: [],
      optimizationStrategy: 'balanced_optimization',
      estimatedDuration: 30000,
    };
  }

  private quickExtractKeywords(jd: string): string[] {
    const kw = jd.match(/\b(?:JavaScript|TypeScript|Python|Java|React|Vue|Angular|Node\.js|AWS|Docker|Kubernetes|SQL|MongoDB|PostgreSQL|GraphQL|REST|API|CI\/CD|Git|Agile|Scrum|Machine Learning|DevOps|Microservices|Cloud)\b/gi) || [];
    return [...new Set(kw.map(k => k.toLowerCase()))];
  }

  /** Update plan based on step results */
  async updatePlan(step: AgentStep, results: any, currentPlan: ExecutionPlan): Promise<ExecutionPlan> {
    const updatedPlan = { ...currentPlan };
    if (step === AgentStep.ANALYZING && results.additionalKeywords) {
      updatedPlan.atsKeywords = [...new Set([...updatedPlan.atsKeywords, ...results.additionalKeywords])];
    }
    if (step === AgentStep.ANALYZING && results.refinedStrategy) {
      updatedPlan.optimizationStrategy = results.refinedStrategy;
    }
    return updatedPlan;
  }
}
