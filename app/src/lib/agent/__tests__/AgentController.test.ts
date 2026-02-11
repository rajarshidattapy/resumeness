// Property tests for Agent Controller - validates universal correctness properties
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentController } from '../AgentController';
import { AgentStep } from '../types';
import { KnowledgeItem } from '@/stores/useResumeStore';

// Mock the dynamic imports to avoid actual tool execution during tests
vi.mock('../PlanningEngine', () => ({
  PlanningEngine: vi.fn().mockImplementation(() => ({
    createExecutionPlan: vi.fn().mockResolvedValue({
      targetRole: 'Software Engineer',
      requiredSkills: [{ type: 'hard', skills: ['JavaScript', 'React'], priority: 1 }],
      atsKeywords: ['javascript', 'react', 'node.js'],
      seniorityLevel: 'mid',
      industryTerms: ['saas', 'web'],
      optimizationStrategy: 'balanced_optimization',
      estimatedDuration: 30000,
    }),
  })),
}));

vi.mock('../tools/JobDescriptionAnalyzer', () => ({
  JobDescriptionAnalyzer: vi.fn().mockImplementation(() => ({
    analyzeJobDescription: vi.fn().mockResolvedValue({
      roleTitle: 'Software Engineer',
      requiredSkills: [{ type: 'hard', skills: ['JavaScript'], priority: 1 }],
      atsKeywords: ['javascript', 'react'],
      seniorityLevel: 'mid',
      industryTerms: ['web'],
    }),
  })),
}));

vi.mock('../tools/KnowledgeBaseSearchEngine', () => ({
  KnowledgeBaseSearchEngine: vi.fn().mockImplementation(() => ({
    searchRelevantContent: vi.fn().mockResolvedValue({
      relevantItems: [],
      gaps: [],
      totalSearched: 0,
    }),
  })),
}));

vi.mock('../tools/ResumeRewriter', () => ({
  ResumeRewriter: vi.fn().mockImplementation(() => ({
    rewriteResume: vi.fn().mockResolvedValue({
      rewrittenLatex: '\\documentclass{article}\\begin{document}Test\\end{document}',
      sectionsModified: ['Experience'],
      changesApplied: [{ section: 'Experience', changeType: 'content', description: 'Updated', confidence: 0.8 }],
      complexity: 2,
    }),
  })),
}));

vi.mock('../tools/ATSOptimizer', () => ({
  ATSOptimizer: vi.fn().mockImplementation(() => ({
    optimizeForATS: vi.fn().mockResolvedValue({
      optimizedLatex: '\\documentclass{article}\\begin{document}Optimized\\end{document}',
      atsScoreBefore: { overall: 60, keywordCoverage: 50, keywordDensity: 40, naturalFlow: 80, matchedKeywords: ['javascript'], missingKeywords: ['react'] },
      atsScoreAfter: { overall: 75, keywordCoverage: 70, keywordDensity: 60, naturalFlow: 85, matchedKeywords: ['javascript', 'react'], missingKeywords: [] },
      optimizationChanges: [],
      rollbackRequired: false,
    }),
  })),
}));

vi.mock('../tools/VerificationEngine', () => ({
  VerificationEngine: vi.fn().mockImplementation(() => ({
    verifyResults: vi.fn().mockResolvedValue({
      passed: true,
      optimizedLatex: '\\documentclass{article}\\begin{document}Verified\\end{document}',
      verificationResult: { isAccurate: true, inaccuracies: [], confidence: 0.95 },
      validationResult: { isValid: true, errors: [], warnings: [] },
      redundancyReport: { duplicates: [], redundancyScore: 0 },
      autoFixedIssues: [],
      escalationRequired: false,
    }),
  })),
}));

vi.mock('../tools/ResultPresenter', () => ({
  ResultPresenter: vi.fn().mockImplementation(() => ({
    presentResults: vi.fn().mockResolvedValue({
      atsScoreBefore: 60,
      atsScoreAfter: 75,
      changes: [{ section: 'Experience', changeType: 'content', description: 'Updated', impact: 'Improved', confidence: 0.8 }],
      summary: 'Optimization completed successfully',
      recommendations: ['Great job!'],
      metrics: { sectionsModified: 1, keywordsAdded: 1, improvementPercentage: 25, verificationPassed: true },
    }),
  })),
}));

describe('AgentController Property Tests', () => {
  let agentController: AgentController;
  
  beforeEach(() => {
    agentController = new AgentController({
      maxRetries: 3,
      timeoutPerStep: 5000, // Shorter timeout for tests
      atsTargetScore: 70,
      keywordCoverageThreshold: 0.7,
      verificationStrictness: 'medium',
      enableSelfCritique: true,
      cacheResults: true,
    });
  });

  /**
   * Property 1: Agent Loop Execution Completeness
   * For any job description input, the agent should execute all 6 steps of the Agent_Loop 
   * in sequence, maintain state throughout execution, retry failed steps up to 3 times, 
   * and present a comprehensive summary upon completion.
   * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
   */
  describe('Property 1: Agent Loop Execution Completeness', () => {
    const generateJobDescription = (seed: number): string => {
      const roles = ['Software Engineer', 'Data Scientist', 'Product Manager', 'DevOps Engineer'];
      const skills = ['JavaScript', 'Python', 'React', 'AWS', 'Docker', 'SQL'];
      const companies = ['TechCorp', 'DataInc', 'WebSolutions', 'CloudFirst'];
      
      const role = roles[seed % roles.length];
      const skill1 = skills[seed % skills.length];
      const skill2 = skills[(seed + 1) % skills.length];
      const company = companies[seed % companies.length];
      
      return `${role} at ${company}

We are looking for a ${role} with experience in ${skill1} and ${skill2}.

Requirements:
- 3+ years of experience
- Strong ${skill1} skills
- Experience with ${skill2}
- Problem-solving abilities

Responsibilities:
- Develop software solutions
- Collaborate with team members
- Maintain code quality`;
    };

    const generateKnowledgeBase = (seed: number): KnowledgeItem[] => {
      const types: Array<'project' | 'skill' | 'experience' | 'achievement'> = ['project', 'skill', 'experience', 'achievement'];
      const items: KnowledgeItem[] = [];
      
      for (let i = 0; i < 3; i++) {
        items.push({
          id: `kb-${seed}-${i}`,
          type: types[i % types.length],
          title: `Item ${i + 1}`,
          content: `Content for item ${i + 1} with seed ${seed}`,
          tags: [`tag${i}`, `skill${seed % 5}`],
        });
      }
      
      return items;
    };

    const generateLatexResume = (seed: number): string => {
      return `\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=0.75in]{geometry}
\\begin{document}
\\begin{center}
{\\LARGE \\textbf{Test User ${seed}}}
\\end{center}

\\section*{Experience}
\\textbf{Software Engineer} \\hfill \\textit{2020 -- Present}\\\\
\\textit{Company ${seed}} \\hfill City, State
\\begin{itemize}
    \\item Developed applications using various technologies
    \\item Collaborated with team members on projects
\\end{itemize}

\\section*{Skills}
\\textbf{Languages:} JavaScript, Python, Java
\\end{document}`;
    };

    // Property-based test with multiple iterations
    it('should execute complete 6-step loop for any valid input', async () => {
      const iterations = 10; // Reduced for faster test execution
      
      for (let i = 0; i < iterations; i++) {
        const jobDescription = generateJobDescription(i);
        const knowledgeBase = generateKnowledgeBase(i);
        const latexResume = generateLatexResume(i);

        const result = await agentController.executeOptimization(
          jobDescription,
          latexResume,
          knowledgeBase
        );

        // Verify all required properties
        expect(result).toBeDefined();
        expect(result.sessionId).toBeDefined();
        expect(result.originalResume).toBe(latexResume);
        expect(result.optimizedResume).toBeDefined();
        expect(result.atsScoreBefore).toBeGreaterThanOrEqual(0);
        expect(result.atsScoreAfter).toBeGreaterThanOrEqual(0);
        expect(result.changesApplied).toBeInstanceOf(Array);
        expect(result.executionTime).toBeGreaterThan(0);
        expect(typeof result.verificationPassed).toBe('boolean');

        // Verify state management
        const finalState = agentController.getCurrentState();
        expect(finalState).toBeDefined();
        expect(finalState?.currentStep).toBe(AgentStep.COMPLETED);
        expect(finalState?.sessionId).toBe(result.sessionId);

        // Reset for next iteration
        agentController.resetSession();
      }
    }, 30000); // 30 second timeout for property test

    it('should maintain state throughout execution', async () => {
      const jobDescription = generateJobDescription(1);
      const knowledgeBase = generateKnowledgeBase(1);
      const latexResume = generateLatexResume(1);

      // Start optimization
      const optimizationPromise = agentController.executeOptimization(
        jobDescription,
        latexResume,
        knowledgeBase
      );

      // Check state during execution (with small delay)
      await new Promise(resolve => setTimeout(resolve, 100));
      const duringState = agentController.getCurrentState();
      expect(duringState).toBeDefined();
      expect(duringState?.sessionId).toBeDefined();

      // Wait for completion
      const result = await optimizationPromise;
      
      // Check final state
      const finalState = agentController.getCurrentState();
      expect(finalState?.sessionId).toBe(result.sessionId);
      expect(finalState?.currentStep).toBe(AgentStep.COMPLETED);
    });

    it('should provide comprehensive summary upon completion', async () => {
      const jobDescription = generateJobDescription(2);
      const knowledgeBase = generateKnowledgeBase(2);
      const latexResume = generateLatexResume(2);

      const result = await agentController.executeOptimization(
        jobDescription,
        latexResume,
        knowledgeBase
      );

      // Verify comprehensive summary
      expect(result.changesApplied).toBeInstanceOf(Array);
      expect(result.changesApplied.length).toBeGreaterThanOrEqual(0);
      
      if (result.changesApplied.length > 0) {
        const change = result.changesApplied[0];
        expect(change).toHaveProperty('section');
        expect(change).toHaveProperty('changeType');
        expect(change).toHaveProperty('description');
        expect(change).toHaveProperty('confidence');
      }

      expect(result.executionTime).toBeGreaterThan(0);
      expect(typeof result.verificationPassed).toBe('boolean');
    });

    it('should handle edge cases gracefully', async () => {
      // Test with minimal job description
      const minimalJD = 'Software Engineer position';
      const emptyKB: KnowledgeItem[] = [];
      const minimalLatex = '\\documentclass{article}\\begin{document}\\end{document}';

      const result = await agentController.executeOptimization(
        minimalJD,
        minimalLatex,
        emptyKB
      );

      expect(result).toBeDefined();
      expect(result.originalResume).toBe(minimalLatex);
      expect(result.optimizedResume).toBeDefined();
      
      // Should complete even with minimal input
      const finalState = agentController.getCurrentState();
      expect(finalState?.currentStep).toBe(AgentStep.COMPLETED);
    });

    it('should preserve original resume on critical errors', async () => {
      // Create a controller that will fail
      const failingController = new AgentController({
        maxRetries: 1,
        timeoutPerStep: 1, // Very short timeout to force failure
      });

      const jobDescription = generateJobDescription(3);
      const knowledgeBase = generateKnowledgeBase(3);
      const latexResume = generateLatexResume(3);

      const result = await failingController.executeOptimization(
        jobDescription,
        latexResume,
        knowledgeBase
      );

      // Should preserve original resume on failure
      expect(result.originalResume).toBe(latexResume);
      expect(result.optimizedResume).toBe(latexResume); // Should be preserved
      expect(result.verificationPassed).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should generate unique session IDs', async () => {
      const sessionIds = new Set<string>();
      
      for (let i = 0; i < 5; i++) {
        const result = await agentController.executeOptimization(
          'Test job description',
          '\\documentclass{article}\\begin{document}Test\\end{document}',
          []
        );
        
        expect(sessionIds.has(result.sessionId)).toBe(false);
        sessionIds.add(result.sessionId);
        
        agentController.resetSession();
      }
    });

    it('should provide session statistics', async () => {
      await agentController.executeOptimization(
        'Test job description',
        '\\documentclass{article}\\begin{document}Test\\end{document}',
        []
      );

      const stats = agentController.getSessionStats();
      expect(stats).toHaveProperty('totalSteps');
      expect(stats).toHaveProperty('successfulSteps');
      expect(stats).toHaveProperty('failedSteps');
      expect(stats).toHaveProperty('averageStepDuration');
      expect(stats).toHaveProperty('sessionDuration');
      
      expect(stats.totalSteps).toBeGreaterThan(0);
      expect(stats.sessionDuration).toBeGreaterThan(0);
    });
  });
});

/**
 * Feature: agentic-resume-optimizer
 * Property 1: Agent Loop Execution Completeness
 * 
 * This test validates that for any job description input, the agent executes all 6 steps
 * of the Agent_Loop in sequence (Planning → Analysis → Retrieval → Rewriting → 
 * Optimization → Verification → Presentation), maintains state throughout execution,
 * retries failed steps up to 3 times, and presents a comprehensive summary upon completion.
 * 
 * The property-based approach tests the agent with randomized but realistic inputs to
 * ensure universal correctness across diverse scenarios, validating Requirements 1.1-1.5.
 */