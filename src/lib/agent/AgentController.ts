// Main Agent Controller - orchestrates the autonomous 6-step optimization process
import { 
  AgentState, 
  AgentStep, 
  OptimizationResult, 
  ErrorType, 
  AgentConfig,
  ExecutionPlan 
} from './types';
import { MemoryManager } from './MemoryManager';
import { ErrorHandler } from './ErrorHandler';
import { KnowledgeItem } from '@/stores/useResumeStore';

export class AgentController {
  private memoryManager: MemoryManager;
  private errorHandler: ErrorHandler;
  private config: AgentConfig;

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = {
      maxRetries: 3,
      timeoutPerStep: 300000, // 5 minutes per step (LLM calls are sequential)
      atsTargetScore: 70,
      keywordCoverageThreshold: 0.7,
      verificationStrictness: 'medium',
      enableSelfCritique: true,
      cacheResults: true,
      ...config
    };

    this.memoryManager = new MemoryManager();
    this.errorHandler = new ErrorHandler(this.config.maxRetries);
  }

  /**
   * Execute the complete 6-step autonomous optimization process
   */
  async executeOptimization(
    jobDescription: string,
    currentLatex: string,
    knowledgeBase: KnowledgeItem[]
  ): Promise<OptimizationResult> {
    const sessionId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log('🚀 AgentController: Starting optimization process');
    console.log('📄 Input LaTeX length:', currentLatex.length);
    console.log('📋 Job description length:', jobDescription.length);
    console.log('📚 Knowledge base items:', knowledgeBase.length);

    // Validate job description - need meaningful content to optimize
    const MIN_JD_LENGTH = 50;
    if (jobDescription.trim().length < MIN_JD_LENGTH) {
      console.warn('⚠️ Job description too short for meaningful optimization');
      return {
        sessionId,
        originalResume: currentLatex,
        optimizedResume: currentLatex,
        atsScoreBefore: 0,
        atsScoreAfter: 0,
        changesApplied: [{
          section: 'Input Validation',
          changeType: 'content',
          description: `Job description is too short (${jobDescription.trim().length} characters). Please provide a detailed job description with at least ${MIN_JD_LENGTH} characters including required skills, responsibilities, and qualifications.`,
          impact: 'Cannot optimize without adequate job context',
          confidence: 1.0,
        }],
        executionTime: Date.now() - startTime,
        verificationPassed: false,
      };
    }

    // Initialize session
    const initialState = this.memoryManager.initializeSession(sessionId);
    
    try {
      // Store initial context
      this.memoryManager.storeSessionData('jobDescription', jobDescription);
      this.memoryManager.storeSessionData('originalLatex', currentLatex);
      this.memoryManager.storeSessionData('knowledgeBase', knowledgeBase);

      // Execute the mandatory 6-step loop
      console.log('🎯 Step 1: Planning Phase');
      const planningResults = await this.executePlanningPhase(jobDescription);
      console.log('✅ Planning completed:', planningResults.targetRole);

      console.log('🔍 Step 2: Analysis Phase');
      const analysisResults = await this.executeAnalysisPhase(jobDescription, planningResults);
      console.log('✅ Analysis completed');

      console.log('📚 Step 3: Retrieval Phase');
      const retrievalResults = await this.executeRetrievalPhase(analysisResults, knowledgeBase);
      console.log('✅ Retrieval completed');

      console.log('✍️ Step 4: Rewrite Phase');
      const rewriteResults = await this.executeRewritePhase(currentLatex, retrievalResults, planningResults);
      console.log('✅ Rewrite completed:', rewriteResults.sectionsModified?.length || 0, 'sections modified');
      console.log('📏 Rewrite result latex length:', rewriteResults.rewrittenLatex?.length);
      console.log('📏 Original latex length:', currentLatex.length);
      console.log('🔄 Content changed:', rewriteResults.rewrittenLatex !== currentLatex);

      console.log('⚡ Step 5: Optimization Phase');
      const optimizationResults = await this.executeOptimizationPhase(rewriteResults, planningResults);
      console.log('✅ Optimization completed');

      console.log('🔍 Step 6: Verification Phase');
      const verificationResults = await this.executeVerificationPhase(optimizationResults, knowledgeBase);
      console.log('✅ Verification completed:', verificationResults.passed ? 'PASSED' : 'FAILED');

      console.log('📊 Step 7: Presentation Phase');
      const presentationResults = await this.executePresentationPhase(
        currentLatex,
        verificationResults.optimizedLatex,
        optimizationResults,
        verificationResults
      );
      console.log('✅ Presentation completed');

      // Mark as completed
      this.memoryManager.updateState({ currentStep: AgentStep.COMPLETED });

      const executionTime = Date.now() - startTime;

      const result: OptimizationResult = {
        sessionId,
        originalResume: currentLatex,
        optimizedResume: verificationResults.optimizedLatex,
        atsScoreBefore: presentationResults.atsScoreBefore,
        atsScoreAfter: presentationResults.atsScoreAfter,
        changesApplied: presentationResults.changes,
        executionTime,
        verificationPassed: verificationResults.passed,
      };

      // Persist final state
      await this.memoryManager.persistState();

      console.log('🎉 AgentController: Optimization completed successfully!');
      console.log('📄 Output LaTeX length:', result.optimizedResume.length);
      console.log('📊 ATS Score:', result.atsScoreBefore, '→', result.atsScoreAfter);
      console.log('⏱️ Execution time:', Math.round(executionTime / 1000), 'seconds');

      return result;

    } catch (error) {
      console.error('❌ Agent optimization failed:', error);
      
      // Handle critical error
      const errorResolution = await this.errorHandler.handleError(
        ErrorType.CRITICAL_ERROR,
        { error, sessionId, step: this.getCurrentState()?.currentStep },
        0
      );

      // Return failed result with original resume preserved
      return {
        sessionId,
        originalResume: currentLatex,
        optimizedResume: currentLatex, // Preserve original
        atsScoreBefore: 0,
        atsScoreAfter: 0,
        changesApplied: [],
        executionTime: Date.now() - startTime,
        verificationPassed: false,
      };
    }
  }

  /**
   * Step 1: Planning Phase - Create execution plan
   */
  private async executePlanningPhase(jobDescription: string): Promise<ExecutionPlan> {
    return this.executeStepWithRetry(
      AgentStep.PLANNING,
      async () => {
        // Import planning engine dynamically to avoid circular dependencies
        const { PlanningEngine } = await import('./PlanningEngine');
        const planningEngine = new PlanningEngine();
        
        return await planningEngine.createExecutionPlan(jobDescription);
      },
      { jobDescription }
    );
  }

  /**
   * Step 2: Analysis Phase - Analyze job description
   */
  private async executeAnalysisPhase(
    jobDescription: string, 
    planningResults: ExecutionPlan
  ): Promise<any> {
    return this.executeStepWithRetry(
      AgentStep.ANALYZING,
      async () => {
        // Import analyzer dynamically
        const { JobDescriptionAnalyzer } = await import('./tools/JobDescriptionAnalyzer');
        const analyzer = new JobDescriptionAnalyzer();
        
        return await analyzer.analyzeJobDescription(jobDescription, planningResults);
      },
      { jobDescription, planningResults }
    );
  }

  /**
   * Step 3: Retrieval Phase - Search knowledge base
   */
  private async executeRetrievalPhase(
    analysisResults: any,
    knowledgeBase: KnowledgeItem[]
  ): Promise<any> {
    return this.executeStepWithRetry(
      AgentStep.RETRIEVING,
      async () => {
        // Import search engine dynamically
        const { KnowledgeBaseSearchEngine } = await import('./tools/KnowledgeBaseSearchEngine');
        const searchEngine = new KnowledgeBaseSearchEngine(knowledgeBase);
        
        return await searchEngine.searchRelevantContent(analysisResults);
      },
      { analysisResults, knowledgeBaseSize: knowledgeBase.length }
    );
  }

  /**
   * Step 4: Rewrite Phase - Rewrite resume content
   */
  private async executeRewritePhase(
    currentLatex: string,
    retrievalResults: any,
    planningResults: ExecutionPlan
  ): Promise<any> {
    return this.executeStepWithRetry(
      AgentStep.REWRITING,
      async () => {
        // Import rewriter dynamically
        const { ResumeRewriter } = await import('./tools/ResumeRewriter');
        const rewriter = new ResumeRewriter();
        
        return await rewriter.rewriteResume(currentLatex, retrievalResults, planningResults);
      },
      { latexLength: currentLatex.length, retrievalResults, planningResults }
    );
  }

  /**
   * Step 5: Optimization Phase - Optimize for ATS
   */
  private async executeOptimizationPhase(
    rewriteResults: any,
    planningResults: ExecutionPlan
  ): Promise<any> {
    return this.executeStepWithRetry(
      AgentStep.OPTIMIZING,
      async () => {
        // Import optimizer dynamically
        const { ATSOptimizer } = await import('./tools/ATSOptimizer');
        const optimizer = new ATSOptimizer(this.config);
        
        return await optimizer.optimizeForATS(rewriteResults, planningResults);
      },
      { rewriteResults, planningResults }
    );
  }

  /**
   * Step 6: Verification Phase - Verify and validate results
   */
  private async executeVerificationPhase(
    optimizationResults: any,
    knowledgeBase: KnowledgeItem[]
  ): Promise<any> {
    return this.executeStepWithRetry(
      AgentStep.VERIFYING,
      async () => {
        // Import verification engine dynamically
        const { VerificationEngine } = await import('./tools/VerificationEngine');
        const verifier = new VerificationEngine(this.config);
        
        return await verifier.verifyResults(optimizationResults, knowledgeBase);
      },
      { optimizationResults, knowledgeBaseSize: knowledgeBase.length }
    );
  }

  /**
   * Step 7: Presentation Phase - Format final results
   */
  private async executePresentationPhase(
    originalLatex: string,
    optimizedLatex: string,
    optimizationResults: any,
    verificationResults: any
  ): Promise<any> {
    return this.executeStepWithRetry(
      AgentStep.PRESENTING,
      async () => {
        // Import presenter dynamically
        const { ResultPresenter } = await import('./tools/ResultPresenter');
        const presenter = new ResultPresenter();
        
        return await presenter.presentResults(
          originalLatex,
          optimizedLatex,
          optimizationResults,
          verificationResults
        );
      },
      { originalLength: originalLatex.length, optimizedLength: optimizedLatex.length }
    );
  }

  /**
   * Execute a step with retry logic and error handling
   */
  private async executeStepWithRetry<T>(
    step: AgentStep,
    operation: () => Promise<T>,
    context: any,
    attemptCount: number = 0
  ): Promise<T> {
    const stepStartTime = Date.now();
    
    try {
      // Update state to current step
      this.memoryManager.updateState({ currentStep: step });

      // Execute the operation with timeout (clean up timer on success)
      const { promise: timeoutPromise, cancel: cancelTimeout } = this.createTimeoutPromise(this.config.timeoutPerStep);
      const result = await Promise.race([
        operation(),
        timeoutPromise
      ]);
      cancelTimeout();

      const duration = Date.now() - stepStartTime;

      // Record successful execution
      this.memoryManager.recordStepExecution(
        step,
        context,
        result,
        duration,
        true,
        undefined,
        attemptCount
      );

      return result;

    } catch (error) {
      const duration = Date.now() - stepStartTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Determine error type
      const errorType = this.classifyError(error);

      // Record failed execution
      this.memoryManager.recordStepExecution(
        step,
        context,
        null,
        duration,
        false,
        errorMessage,
        attemptCount
      );

      // Handle the error
      const resolution = await this.errorHandler.handleError(errorType, context, attemptCount);

      if (resolution.shouldRetry && attemptCount < this.config.maxRetries) {
        // Retry the operation
        return this.executeStepWithRetry(step, operation, context, attemptCount + 1);
      }

      // If we can't retry or resolve, throw the error
      throw new Error(`Step ${step} failed after ${attemptCount + 1} attempts: ${errorMessage}`);
    }
  }

  /**
   * Classify an error into our error types
   */
  private classifyError(error: any): ErrorType {
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return ErrorType.NETWORK_ERROR;
    }
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return ErrorType.TIMEOUT_ERROR;
    }
    if (errorMessage.includes('latex') || errorMessage.includes('syntax')) {
      return ErrorType.LATEX_SYNTAX_ERROR;
    }
    if (errorMessage.includes('knowledge') || errorMessage.includes('empty')) {
      return ErrorType.KNOWLEDGE_BASE_EMPTY;
    }
    if (errorMessage.includes('verification')) {
      return ErrorType.VERIFICATION_FAILED;
    }
    if (errorMessage.includes('tool') || errorMessage.includes('unavailable')) {
      return ErrorType.TOOL_UNAVAILABLE;
    }

    return ErrorType.CRITICAL_ERROR;
  }

  /**
   * Create a timeout promise with cancel handle to prevent timer leaks
   */
  private createTimeoutPromise(timeout: number): { promise: Promise<never>; cancel: () => void } {
    let timer: ReturnType<typeof setTimeout>;
    const promise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout);
    });
    return { promise, cancel: () => clearTimeout(timer!) };
  }

  /**
   * Get current agent state
   */
  getCurrentState(): AgentState | null {
    return this.memoryManager.getCurrentState();
  }

  /**
   * Reset the agent session
   */
  resetSession(): void {
    this.memoryManager.clearSession();
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    return this.memoryManager.getSessionStats();
  }

  /**
   * Load a previous session
   */
  async loadSession(sessionId: string): Promise<AgentState | null> {
    return this.memoryManager.loadState(sessionId);
  }
}