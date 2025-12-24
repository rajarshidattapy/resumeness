import { LatexResumeParser, extractTextFromLatex, isValidLatex } from './latex-parser';
import { ChatOpenRouter, OpenRouterModelId } from './langchain-openrouter';
import { Tool } from "@langchain/core/tools";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { KnowledgeItem } from '@/stores/useResumeStore';

// Resume Agent Tools
class AnalyzeJobDescriptionTool extends Tool {
  name = "analyze_job_description";
  description = "Analyze a job description to extract key requirements, skills, and keywords";

  constructor(private llm: ChatOpenRouter, private knowledgeBase: KnowledgeItem[]) {
    super();
  }

  async _call(input: string): Promise<string> {
    const prompt = `Analyze this job description and extract:
1. Key Requirements (must-haves)
2. Nice-to-haves
3. Important Keywords for ATS
4. Company Culture Indicators
5. Recommended Resume Focus Areas

Job Description:
${input}

Provide a structured analysis.`;

    const messages = [
      { role: 'system' as const, content: 'You are an expert resume engineer. Analyze job descriptions professionally.' },
      { role: 'user' as const, content: prompt }
    ];

    const result = await this.llm.call(messages);
    return result.content;
  }
}

class SearchKnowledgeBaseTool extends Tool {
  name = "search_knowledge_base";
  description = "Search the knowledge base for relevant experience and skills";

  constructor(private knowledgeBase: KnowledgeItem[]) {
    super();
  }

  async _call(query: string): Promise<string> {
    // Simple semantic search (could be enhanced with embeddings)
    const relevant = this.knowledgeBase.filter(item =>
      item.content.toLowerCase().includes(query.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    ).slice(0, 3);

    if (relevant.length === 0) {
      return "No relevant items found in knowledge base.";
    }

    return `Relevant knowledge base items:
${relevant.map(item => `- ${item.title} (${item.type}): ${item.content}`).join('\n')}`;
  }
}

class RewriteResumeTool extends Tool {
  name = "rewrite_resume";
  description = "Rewrite resume LaTeX content based on job description and instructions";

  constructor(
    private llm: ChatOpenRouter,
    private currentLatex: string,
    private jobDescription: string,
    private knowledgeBase: KnowledgeItem[]
  ) {
    super();
  }

  async _call(instructions: string): Promise<string> {
    try {
      const parser = new LatexResumeParser(this.currentLatex);
      const modifiableSections = parser.getModifiableSections();

      // Get relevant knowledge base items
      const relevantKB = this.knowledgeBase.filter(item =>
        this.jobDescription.toLowerCase().includes(item.title.toLowerCase()) ||
        item.tags.some(tag => this.jobDescription.toLowerCase().includes(tag.toLowerCase()))
      ).slice(0, 3);

      const kbContext = relevantKB.length > 0
        ? `\n\nRelevant experience from knowledge base:\n${relevantKB.map(item =>
            `- ${item.title} (${item.type}): ${item.content}`
          ).join('\n')}`
        : '';

      // Process each modifiable section
      const modifiedSections: { [key: string]: string } = {};

      for (const [sectionName, section] of Object.entries(modifiableSections)) {
        const modifiedContent = await this.rewriteSection(
          sectionName,
          section.content,
          instructions,
          kbContext
        );

        if (modifiedContent) {
          modifiedSections[sectionName] = modifiedContent;
        }
      }

      // Reconstruct the full LaTeX document
      const result = parser.reconstructFromSections(modifiedSections);

      // Validate the result
      if (!isValidLatex(result)) {
        console.warn('Generated LaTeX may have syntax issues, returning original');
        return this.currentLatex;
      }

      return result;

    } catch (error) {
      console.error('Error rewriting resume:', error);
      return this.currentLatex; // Return original on error
    }
  }

  private async rewriteSection(
    sectionName: string,
    sectionContent: string,
    instructions: string,
    kbContext: string
  ): Promise<string> {
    // Extract text content for analysis
    const textContent = extractTextFromLatex(sectionContent);

    // Skip sections that are too short or don't contain meaningful content
    if (textContent.length < 50) {
      return sectionContent;
    }

    const sectionPrompt = this.getSectionSpecificPrompt(sectionName);

    const prompt = `${sectionPrompt}

Job Description:
${this.jobDescription}
${kbContext}

Current ${sectionName} section:
${sectionContent}

Instructions: ${instructions}

IMPORTANT: Output ONLY the modified LaTeX code for this section. Preserve the exact LaTeX formatting and commands. Do not include section headers or surrounding LaTeX structure.`;

    const messages = [
      { role: 'system' as const, content: `You are an expert resume engineer specializing in LaTeX resume formatting. You understand complex LaTeX templates and custom commands.

CRITICAL RULES:
1. Output ONLY the LaTeX content for the specific section being modified
2. Preserve ALL LaTeX commands, custom commands, and formatting exactly as in the original
3. Never break LaTeX syntax - maintain proper brace matching and command structure
4. Only modify the actual content text, not the LaTeX formatting commands
5. Use keywords from the job description naturally in the content
6. Keep the same structure and number of items as the original unless specifically instructed otherwise` },
      { role: 'user' as const, content: prompt }
    ];

    try {
      const result = await this.llm.call(messages);
      const modifiedContent = result.content.trim();

      // Basic validation - ensure it still looks like LaTeX
      if (modifiedContent.includes('\\') || modifiedContent.includes('{')) {
        return modifiedContent;
      } else {
        // If it doesn't contain LaTeX commands, it might be plain text, wrap it
        return this.wrapAsLatexSection(modifiedContent, sectionName);
      }
    } catch (error) {
      console.error(`Error rewriting section ${sectionName}:`, error);
      return sectionContent; // Return original section on error
    }
  }

  private getSectionSpecificPrompt(sectionName: string): string {
    const lowerName = sectionName.toLowerCase();

    if (lowerName.includes('experience') || lowerName.includes('professional')) {
      return `Rewrite the Professional Experience section to better match the job description. Focus on:
- Emphasizing relevant technologies and skills mentioned in the job posting
- Quantifying achievements where possible
- Using action verbs that match the job requirements
- Prioritizing experience most relevant to the target role`;
    }

    if (lowerName.includes('project')) {
      return `Optimize the Projects section to highlight relevant technical skills and experiences. Focus on:
- Projects that demonstrate skills needed for the target role
- Technologies and tools mentioned in the job description
- Quantifiable results and impacts
- Relevance to the company's domain`;
    }

    if (lowerName.includes('skill') || lowerName.includes('technical')) {
      return `Refine the Skills section to prioritize competencies mentioned in the job description. Focus on:
- Moving relevant skills to the top
- Adding missing skills that are required for the role
- Grouping related skills logically
- Using exact terminology from the job posting`;
    }

    if (lowerName.includes('education')) {
      return `Review the Education section for relevance to the target role. Focus on:
- Highlighting relevant coursework or specializations
- Including relevant certifications or training
- Maintaining academic achievements that demonstrate capability`;
    }

    if (lowerName.includes('achievement') || lowerName.includes('certification')) {
      return `Curate achievements and certifications that are most relevant to the job. Focus on:
- Industry-recognized certifications
- Achievements demonstrating required skills
- Quantifiable accomplishments
- Relevance to the target role's requirements`;
    }

    // Default prompt for other sections
    return `Optimize this section to better align with the job description requirements. Focus on relevance, quantifiable achievements, and using terminology from the job posting.`;
  }

  private wrapAsLatexSection(content: string, sectionName: string): string {
    // If content doesn't contain LaTeX, try to format it properly
    // This is a fallback for when the AI returns plain text
    const lines = content.split('\n');
    const formattedLines = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('\\')) {
        return `  \\cvitem{${trimmed}}`;
      }
      return line;
    });

    return formattedLines.join('\n');
  }
}

class CalculateATSTool extends Tool {
  name = "calculate_ats_score";
  description = "Calculate ATS compatibility score between resume and job description";

  constructor(private currentLatex: string) {
    super();
  }

  async _call(jobDescription: string): Promise<string> {
    try {
      const textContent = extractTextFromLatex(this.currentLatex);

      const keywords = this.extractKeywords(jobDescription);
      const resumeWords = textContent.toLowerCase().split(/\W+/).filter(w => w.length > 2);

      const matched: string[] = [];
      const missing: string[] = [];

      for (const keyword of keywords) {
        const keywordLower = keyword.toLowerCase();
        if (resumeWords.some(word => word.includes(keywordLower) || keywordLower.includes(word))) {
          matched.push(keyword);
        } else {
          missing.push(keyword);
        }
      }

      const score = keywords.length > 0
        ? Math.round((matched.length / keywords.length) * 100)
        : 0;

      return `ATS Score: ${score}%
Matched keywords: ${matched.join(', ')}
Missing keywords: ${keywords.filter(k => !matched.includes(k)).join(', ')}
Total keywords analyzed: ${keywords.length}`;
    } catch (error) {
      console.error('Error calculating ATS score:', error);
      return 'Error calculating ATS score. Please try again.';
    }
  }

  private extractKeywords(text: string): string[] {
    // Extract technical keywords, skills, and important terms
    const techKeywords = text.match(/\b(?:JavaScript|TypeScript|Python|Java|C\+\+|React|Vue|Angular|Node\.js|AWS|GCP|Azure|Docker|Kubernetes|SQL|NoSQL|MongoDB|PostgreSQL|Redis|GraphQL|REST|API|CI\/CD|Git|Agile|Scrum|Machine Learning|AI|ML|Data Science|DevOps|Frontend|Backend|Full-?Stack|Microservices|Cloud|SaaS|B2B|B2C|Leadership|Communication|Problem.solving|Analytical|Collaborative|Self.motivated|Detail.oriented|Innovative|Strategic|Cross.functional)\b/gi) || [];

    // Also extract some common job title keywords
    const roleKeywords = text.match(/\b(?:Software Engineer|Developer|Data Scientist|ML Engineer|Full Stack|Backend|Frontend|DevOps|Engineering Manager|Product Manager|Designer|Analyst)\b/gi) || [];

    const allKeywords = [...techKeywords, ...roleKeywords];
    return [...new Set(allKeywords.map(k => k.toLowerCase()))];
  }
}

// Main Resume Agent Class
export class ResumeAgent {
  private llm: ChatOpenRouter;
  private agentExecutor: AgentExecutor;
  private knowledgeBase: KnowledgeItem[];
  private currentLatex: string;
  private jobDescription: string;

  constructor(
    model: OpenRouterModelId = 'mistral-7b',
    knowledgeBase: KnowledgeItem[] = [],
    currentLatex = '',
    jobDescription = ''
  ) {
    this.llm = new ChatOpenRouter({ modelName: model });
    this.knowledgeBase = knowledgeBase;
    this.currentLatex = currentLatex;
    this.jobDescription = jobDescription;

    this.initializeAgent();
  }

  private async initializeAgent() {
    const tools = [
      new AnalyzeJobDescriptionTool(this.llm, this.knowledgeBase),
      new SearchKnowledgeBaseTool(this.knowledgeBase),
      new RewriteResumeTool(this.llm, this.currentLatex, this.jobDescription, this.knowledgeBase),
      new CalculateATSTool(this.currentLatex),
    ];

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", `You are an expert resume engineer AI agent. Your job is to help tailor resumes to match job descriptions for maximum ATS compatibility.

You have access to these tools:
- analyze_job_description: Extract key requirements and keywords from job postings
- search_knowledge_base: Find relevant experience and skills from the user's knowledge base
- rewrite_resume: Modify resume LaTeX content based on job requirements
- calculate_ats_score: Evaluate how well the resume matches the job description

Always use the appropriate tools to provide comprehensive resume optimization. When rewriting resumes, output ONLY pure LaTeX code.`],
      ["human", "{input}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ]);

    const agent = await createToolCallingAgent({
      llm: this.llm,
      tools,
      prompt,
    });

    this.agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: true,
    });
  }

  async updateContext(currentLatex: string, jobDescription: string, knowledgeBase: KnowledgeItem[]) {
    this.currentLatex = currentLatex;
    this.jobDescription = jobDescription;
    this.knowledgeBase = knowledgeBase;
    // Reinitialize agent with new context
    await this.initializeAgent();
  }

  async chat(message: string): Promise<string> {
    try {
      // Ensure agent is initialized

      if (!this.agentExecutor) {

        await this.initializeAgent();

      }

      

      const result = await this.agentExecutor.call({
        input: message,
      });
      return result.output;
    } catch (error) {
      console.error('Agent execution error:', error);
      return 'I encountered an error while processing your request. Please try again.';
    }
  }

  async analyzeJobDescription(jd: string): Promise<string> {
    const tool = new AnalyzeJobDescriptionTool(this.llm, this.knowledgeBase);
    return tool._call(jd);
  }

  async searchKnowledgeBase(query: string): Promise<string> {
    const tool = new SearchKnowledgeBaseTool(this.knowledgeBase);
    return tool._call(query);
  }

  async rewriteResume(instructions: string): Promise<string> {
    const tool = new RewriteResumeTool(this.llm, this.currentLatex, this.jobDescription, this.knowledgeBase);
    return tool._call(instructions);
  }

  async calculateATSScore(): Promise<string> {
    const tool = new CalculateATSTool(this.currentLatex);
    return tool._call(this.jobDescription);
  }
}

// Factory function to create agent
export function createResumeAgent(
  model: OpenRouterModelId = 'mistral-7b',
  knowledgeBase: KnowledgeItem[] = [],
  currentLatex = '',
  jobDescription = ''
): ResumeAgent {
  return new ResumeAgent(model, knowledgeBase, currentLatex, jobDescription);
}