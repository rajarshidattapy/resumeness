// Agent Integration - Bridges the new AgentController with existing chat interface
import { AgentController } from './agent/AgentController';
import { KnowledgeItem } from '@/stores/useResumeStore';
import { AgentStep, OptimizationResult } from './agent/types';

// Legacy interface compatibility
export interface AgentContext {
  jobDescription: string;
  currentLatex: string;
  knowledgeBase: KnowledgeItem[];
}

// Progress callback for UI updates
export type ProgressCallback = (step: AgentStep, progress: number, message: string) => void;

// Main integration class
export class ResumeAgentIntegration {
  private agentController: AgentController;
  private progressCallback?: ProgressCallback;

  constructor(progressCallback?: ProgressCallback) {
    this.agentController = new AgentController({
      maxRetries: 3,
      timeoutPerStep: 30000,
      atsTargetScore: 70,
      keywordCoverageThreshold: 0.7,
      verificationStrictness: 'medium',
      enableSelfCritique: true,
      cacheResults: true,
    });
    this.progressCallback = progressCallback;
  }

  /**
   * Execute the full autonomous optimization process
   */
  async optimizeResume(context: AgentContext): Promise<{
    optimizedLatex: string;
    atsScoreBefore: number;
    atsScoreAfter: number;
    changes: string[];
    executionTime: number;
    success: boolean;
  }> {
    const { jobDescription, currentLatex, knowledgeBase } = context;

    try {
      // Set up progress monitoring
      this.setupProgressMonitoring();

      // Execute the optimization
      const result = await this.agentController.executeOptimization(
        jobDescription,
        currentLatex,
        knowledgeBase
      );

      return {
        optimizedLatex: result.optimizedResume,
        atsScoreBefore: result.atsScoreBefore,
        atsScoreAfter: result.atsScoreAfter,
        changes: result.changesApplied.map(change => change.description),
        executionTime: result.executionTime,
        success: result.verificationPassed,
      };

    } catch (error) {
      console.error('Agent optimization failed:', error);
      
      // Return safe fallback
      return {
        optimizedLatex: currentLatex, // Preserve original
        atsScoreBefore: 0,
        atsScoreAfter: 0,
        changes: ['Optimization failed - original resume preserved'],
        executionTime: 0,
        success: false,
      };
    }
  }

  /**
   * Get current agent state for UI display
   */
  getCurrentState() {
    return this.agentController.getCurrentState();
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    return this.agentController.getSessionStats();
  }

  /**
   * Reset the agent session
   */
  resetSession() {
    this.agentController.resetSession();
  }

  /**
   * Set up progress monitoring for UI updates
   */
  private setupProgressMonitoring() {
    if (!this.progressCallback) return;

    // Monitor agent state changes
    const checkProgress = () => {
      const state = this.agentController.getCurrentState();
      if (state) {
        const progress = this.calculateProgress(state.currentStep);
        const message = this.getStepMessage(state.currentStep);
        this.progressCallback!(state.currentStep, progress, message);
      }
    };

    // Check progress every 500ms during execution
    const progressInterval = setInterval(checkProgress, 500);
    
    // Clean up after 60 seconds (max execution time)
    setTimeout(() => {
      clearInterval(progressInterval);
    }, 60000);
  }

  /**
   * Calculate progress percentage based on current step
   */
  private calculateProgress(step: AgentStep): number {
    const stepProgress: Record<AgentStep, number> = {
      [AgentStep.PLANNING]: 10,
      [AgentStep.ANALYZING]: 25,
      [AgentStep.RETRIEVING]: 40,
      [AgentStep.REWRITING]: 60,
      [AgentStep.OPTIMIZING]: 75,
      [AgentStep.VERIFYING]: 90,
      [AgentStep.PRESENTING]: 95,
      [AgentStep.COMPLETED]: 100,
      [AgentStep.ERROR]: 0,
    };

    return stepProgress[step] || 0;
  }

  /**
   * Get user-friendly message for current step
   */
  private getStepMessage(step: AgentStep): string {
    const stepMessages: Record<AgentStep, string> = {
      [AgentStep.PLANNING]: 'Creating optimization strategy...',
      [AgentStep.ANALYZING]: 'Analyzing job description requirements...',
      [AgentStep.RETRIEVING]: 'Searching knowledge base for relevant experience...',
      [AgentStep.REWRITING]: 'Rewriting resume content with job-aligned language...',
      [AgentStep.OPTIMIZING]: 'Optimizing for ATS compatibility...',
      [AgentStep.VERIFYING]: 'Verifying accuracy and quality...',
      [AgentStep.PRESENTING]: 'Preparing results...',
      [AgentStep.COMPLETED]: 'Optimization completed successfully!',
      [AgentStep.ERROR]: 'An error occurred during optimization',
    };

    return stepMessages[step] || 'Processing...';
  }
}

// Legacy function compatibility - these maintain the existing API
export async function optimizeResumeWithAgent(
  jobDescription: string,
  currentLatex: string,
  knowledgeBase: KnowledgeItem[],
  progressCallback?: ProgressCallback
): Promise<{
  optimizedLatex: string;
  atsScoreBefore: number;
  atsScoreAfter: number;
  changes: string[];
  executionTime: number;
  success: boolean;
}> {
  const integration = new ResumeAgentIntegration(progressCallback);
  return integration.optimizeResume({
    jobDescription,
    currentLatex,
    knowledgeBase,
  });
}

// Simplified analysis function for quick job description analysis
export async function analyzeJobDescriptionWithAgent(
  jobDescription: string,
  knowledgeBase: KnowledgeItem[] = []
): Promise<string> {
  try {
    // Import the analyzer tool directly for quick analysis
    const { JobDescriptionAnalyzer } = await import('./agent/tools/JobDescriptionAnalyzer');
    const analyzer = new JobDescriptionAnalyzer();
    
    const analysis = await analyzer.analyzeJobDescription(jobDescription);
    
    // Format the analysis for display
    const { roleTitle, requiredSkills, atsKeywords, seniorityLevel, industryTerms } = analysis;
    
    return `**Job Analysis Complete**

**Role:** ${roleTitle}
**Seniority:** ${seniorityLevel}

**Required Skills:**
${requiredSkills.map(category => 
  `• ${category.type === 'hard' ? 'Technical' : 'Soft'}: ${category.skills.join(', ')}`
).join('\n')}

**Key ATS Keywords:** ${atsKeywords.slice(0, 10).join(', ')}

**Industry Terms:** ${industryTerms.join(', ')}

**Recommendation:** Use the full optimization to automatically align your resume with these requirements.`;

  } catch (error) {
    console.error('Job description analysis failed:', error);
    return 'Failed to analyze job description. Please try the full optimization process.';
  }
}

// Quick ATS score calculation
export function calculateATSScore(resume: string, jobDescription: string): { 
  score: number; 
  matched: string[]; 
  missing: string[] 
} {
  // Extract keywords from job description
  const extractKeywords = (text: string): string[] => {
    const technicalKeywords = text.match(/\b(?:JavaScript|TypeScript|Python|Java|C\+\+|React|Vue|Angular|Node\.js|AWS|GCP|Azure|Docker|Kubernetes|SQL|NoSQL|MongoDB|PostgreSQL|Redis|GraphQL|REST|API|CI\/CD|Git|Agile|Scrum|Machine Learning|AI|ML|Data Science|DevOps|Frontend|Backend|Full-?Stack|Microservices|Cloud|SaaS|B2B|B2C)\b/gi) || [];
    const softSkills = text.match(/\b(?:leadership|communication|problem-solving|analytical|collaborative|self-motivated|detail-oriented|innovative|strategic|cross-functional)\b/gi) || [];
    return [...new Set([...technicalKeywords, ...softSkills].map(k => k.toLowerCase()))];
  };

  const jdKeywords = extractKeywords(jobDescription);
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

// Search knowledge base (legacy compatibility)
export function searchKnowledgeBase(
  query: string,
  knowledgeBase: KnowledgeItem[],
  topK: number = 5
): KnowledgeItem[] {
  const calculateSimilarity = (text1: string, text2: string): number => {
    const words1 = new Set(text1.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    const words2 = new Set(text2.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  };

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

// Legacy rewrite function - now uses the full agent system
export async function rewriteResume(
  context: AgentContext,
  instructions: string
): Promise<string> {
  try {
    const integration = new ResumeAgentIntegration();
    const result = await integration.optimizeResume(context);
    return result.optimizedLatex;
  } catch (error) {
    console.error('Resume rewrite failed:', error);
    return context.currentLatex; // Return original on error
  }
}

// Legacy chat function - simplified for now
export async function chatWithAgent(
  userMessage: string,
  context: AgentContext
): Promise<string> {
  // For now, route to job description analysis or full optimization
  if (userMessage.toLowerCase().includes('analyze')) {
    return analyzeJobDescriptionWithAgent(context.jobDescription, context.knowledgeBase);
  }
  
  if (userMessage.toLowerCase().includes('optimize') || userMessage.toLowerCase().includes('rewrite')) {
    const integration = new ResumeAgentIntegration();
    const result = await integration.optimizeResume(context);
    
    if (result.success) {
      return `✅ **Resume optimized successfully!**

**ATS Score:** ${result.atsScoreBefore}% → ${result.atsScoreAfter}% (+${result.atsScoreAfter - result.atsScoreBefore}%)

**Changes Applied:**
${result.changes.map(change => `• ${change}`).join('\n')}

**Execution Time:** ${Math.round(result.executionTime / 1000)}s

The optimized resume has been updated in the editor.`;
    } else {
      return `❌ **Optimization failed**

The original resume has been preserved. Please check:
• Job description is complete and detailed
• Knowledge base contains relevant experience
• Try with a shorter or more specific job description`;
    }
  }
  
  return `I can help you optimize your resume for job applications. Try:
• "Analyze this job description"
• "Optimize my resume"
• "Rewrite my resume for this job"

Paste a job description and I'll automatically optimize your resume for maximum ATS compatibility.`;
}