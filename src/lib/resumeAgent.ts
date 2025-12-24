// Resume AI Agent - Multi-step workflow for resume tailoring
import { createChatCompletion, streamChatCompletion, ModelId } from './openrouter';
import { KnowledgeItem } from '@/stores/useResumeStore';

const SYSTEM_PROMPT = `You are an expert resume engineer AI agent. Your job is to help tailor resumes to match job descriptions for maximum ATS (Applicant Tracking System) compatibility.

CRITICAL RULES:
1. When asked to modify a resume, output ONLY pure LaTeX code. No markdown, no explanations, no comments.
2. Preserve the exact LaTeX template structure - only modify content, not formatting commands.
3. Never break LaTeX syntax.
4. Use the exact keywords and phrases from the job description.
5. Quantify achievements whenever possible.
6. Keep bullet points concise (one line each).
7. Focus on relevance - remove or de-emphasize irrelevant experience.

When analyzing a job description:
- Extract key requirements, skills, and keywords
- Identify the most important qualifications
- Note the company's language and tone

When rewriting resume content:
- Mirror the job description's language
- Prioritize relevant experience
- Add metrics and specific achievements
- Use strong action verbs`;

export interface AgentContext {
  jobDescription: string;
  currentLatex: string;
  knowledgeBase: KnowledgeItem[];
}

export interface AgentStep {
  type: 'analyze_jd' | 'search_kb' | 'rewrite_latex' | 'calculate_ats';
  input: string;
  output: string;
}

// Simple semantic similarity using word overlap
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\W+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\W+/).filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

// Search knowledge base for relevant items
export function searchKnowledgeBase(
  query: string,
  knowledgeBase: KnowledgeItem[],
  topK: number = 5
): KnowledgeItem[] {
  const scored = knowledgeBase.map(item => ({
    item,
    score: calculateSimilarity(query, `${item.title} ${item.content} ${item.tags.join(' ')}`),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter(s => s.score > 0.05)
    .map(s => s.item);
}

// Extract keywords from job description
export function extractKeywords(jd: string): string[] {
  const technicalKeywords = jd.match(/\b(?:JavaScript|TypeScript|Python|Java|C\+\+|React|Vue|Angular|Node\.js|AWS|GCP|Azure|Docker|Kubernetes|SQL|NoSQL|MongoDB|PostgreSQL|Redis|GraphQL|REST|API|CI\/CD|Git|Agile|Scrum|Machine Learning|AI|ML|Data Science|DevOps|Frontend|Backend|Full-?Stack|Microservices|Cloud|SaaS|B2B|B2C)\b/gi) || [];
  
  const softSkills = jd.match(/\b(?:leadership|communication|problem-solving|analytical|collaborative|self-motivated|detail-oriented|innovative|strategic|cross-functional)\b/gi) || [];
  
  const allKeywords = [...technicalKeywords, ...softSkills];
  return [...new Set(allKeywords.map(k => k.toLowerCase()))];
}

// Calculate ATS match score
export function calculateATSScore(resume: string, jd: string): { score: number; matched: string[]; missing: string[] } {
  const jdKeywords = extractKeywords(jd);
  const resumeLower = resume.toLowerCase();
  
  const matched: string[] = [];
  const missing: string[] = [];
  
  for (const keyword of jdKeywords) {
    if (resumeLower.includes(keyword.toLowerCase())) {
      matched.push(keyword);
    } else {
      missing.push(keyword);
    }
  }
  
  const score = jdKeywords.length > 0 
    ? Math.round((matched.length / jdKeywords.length) * 100) 
    : 0;
  
  return { score, matched, missing };
}

// Analyze job description
export async function analyzeJobDescription(
  jd: string,
  model: ModelId = 'mistral-7b'
): Promise<string> {
  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    {
      role: 'user' as const,
      content: `Analyze this job description and extract:
1. Key Requirements (must-haves)
2. Nice-to-haves
3. Important Keywords for ATS
4. Company Culture Indicators
5. Recommended Resume Focus Areas

Job Description:
${jd}

Provide a structured analysis.`,
    },
  ];

  return createChatCompletion(messages, { model });
}

// Rewrite resume LaTeX
export async function rewriteResume(
  context: AgentContext,
  instructions: string,
  model: ModelId = 'mistral-7b'
): Promise<string> {
  const relevantKB = searchKnowledgeBase(context.jobDescription, context.knowledgeBase, 3);
  
  const kbContext = relevantKB.length > 0
    ? `\n\nRelevant experience from knowledge base that can be incorporated:\n${relevantKB.map(item => 
        `- ${item.title} (${item.type}): ${item.content}`
      ).join('\n')}`
    : '';

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    {
      role: 'user' as const,
      content: `Job Description:
${context.jobDescription}

Current Resume LaTeX:
${context.currentLatex}
${kbContext}

Instructions: ${instructions}

IMPORTANT: Output ONLY the modified LaTeX code. No explanations, no markdown, no comments. Just pure LaTeX that compiles.`,
    },
  ];

  return createChatCompletion(messages, { model, maxTokens: 4096 });
}

// Stream rewrite for better UX
export async function* streamRewriteResume(
  context: AgentContext,
  instructions: string,
  model: ModelId = 'mistral-7b'
): AsyncGenerator<string, void, unknown> {
  const relevantKB = searchKnowledgeBase(context.jobDescription, context.knowledgeBase, 3);
  
  const kbContext = relevantKB.length > 0
    ? `\n\nRelevant experience from knowledge base that can be incorporated:\n${relevantKB.map(item => 
        `- ${item.title} (${item.type}): ${item.content}`
      ).join('\n')}`
    : '';

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    {
      role: 'user' as const,
      content: `Job Description:
${context.jobDescription}

Current Resume LaTeX:
${context.currentLatex}
${kbContext}

Instructions: ${instructions}

IMPORTANT: Output ONLY the modified LaTeX code. No explanations, no markdown, no comments. Just pure LaTeX that compiles.`,
    },
  ];

  yield* streamChatCompletion(messages, { model, maxTokens: 4096 });
}

// Chat with the resume agent
export async function chatWithAgent(
  userMessage: string,
  context: AgentContext,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  model: ModelId = 'mistral-7b'
): Promise<string> {
  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    {
      role: 'user' as const,
      content: `Context:
- Job Description: ${context.jobDescription ? 'Provided' : 'Not provided yet'}
- Current Resume: Available
- Knowledge Base Items: ${context.knowledgeBase.length}

User Message: ${userMessage}`,
    },
  ];

  return createChatCompletion(messages, { model });
}