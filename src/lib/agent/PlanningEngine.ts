// Planning Engine - Creates execution plans before acting
import { ExecutionPlan, SkillCategory, SeniorityLevel, AgentStep } from './types';

export class PlanningEngine {
  
  /**
   * Create an execution plan based on job description analysis
   */
  async createExecutionPlan(jobDescription: string): Promise<ExecutionPlan> {
    const analysis = await this.analyzeJobDescription(jobDescription);
    
    const plan: ExecutionPlan = {
      targetRole: analysis.roleTitle,
      requiredSkills: analysis.skills,
      atsKeywords: analysis.keywords,
      seniorityLevel: analysis.seniority,
      industryTerms: analysis.industryTerms,
      optimizationStrategy: this.determineOptimizationStrategy(analysis),
      estimatedDuration: this.estimateExecutionTime(analysis),
    };

    return plan;
  }

  /**
   * Update plan based on step results
   */
  async updatePlan(step: AgentStep, results: any, currentPlan: ExecutionPlan): Promise<ExecutionPlan> {
    const updatedPlan = { ...currentPlan };

    switch (step) {
      case AgentStep.ANALYZING:
        // Update plan based on deeper analysis
        if (results.additionalKeywords) {
          updatedPlan.atsKeywords = [...updatedPlan.atsKeywords, ...results.additionalKeywords];
        }
        if (results.refinedStrategy) {
          updatedPlan.optimizationStrategy = results.refinedStrategy;
        }
        break;

      case AgentStep.RETRIEVING:
        // Adjust strategy based on available knowledge
        if (results.availableContent && results.availableContent.length < 3) {
          updatedPlan.optimizationStrategy = 'conservative'; // Less aggressive changes
        }
        break;

      case AgentStep.REWRITING:
        // Update estimated duration based on actual rewrite complexity
        if (results.complexity) {
          updatedPlan.estimatedDuration = Math.max(
            updatedPlan.estimatedDuration,
            results.complexity * 10000 // 10 seconds per complexity point
          );
        }
        break;
    }

    return updatedPlan;
  }

  /**
   * Analyze job description to extract planning information
   */
  private async analyzeJobDescription(jobDescription: string): Promise<{
    roleTitle: string;
    skills: SkillCategory[];
    keywords: string[];
    seniority: SeniorityLevel;
    industryTerms: string[];
  }> {
    // Extract role title
    const roleTitle = this.extractRoleTitle(jobDescription);
    
    // Categorize skills
    const skills = this.categorizeSkills(jobDescription);
    
    // Extract ATS keywords
    const keywords = this.extractATSKeywords(jobDescription);
    
    // Determine seniority level
    const seniority = this.determineSeniorityLevel(jobDescription);
    
    // Identify industry terms
    const industryTerms = this.identifyIndustryTerms(jobDescription);

    return {
      roleTitle,
      skills,
      keywords,
      seniority,
      industryTerms,
    };
  }

  /**
   * Extract role title from job description
   */
  private extractRoleTitle(jobDescription: string): string {
    // Look for common patterns in job titles
    const titlePatterns = [
      /(?:job title|position|role):\s*([^\n\r]+)/i,
      /^([^\n\r]*(?:engineer|developer|manager|analyst|designer|scientist|architect|lead|director|specialist|coordinator|consultant)[^\n\r]*)/im,
      /hiring\s+(?:for\s+)?([^\n\r]+)/i,
      /seeking\s+(?:a\s+)?([^\n\r]+)/i,
    ];

    for (const pattern of titlePatterns) {
      const match = jobDescription.match(pattern);
      if (match && match[1]) {
        return match[1].trim().replace(/[^\w\s-]/g, '').trim();
      }
    }

    // Fallback: look for common job titles
    const commonTitles = [
      'Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
      'Data Scientist', 'Machine Learning Engineer', 'DevOps Engineer', 'Product Manager',
      'UI/UX Designer', 'Business Analyst', 'Project Manager', 'Technical Lead',
      'Engineering Manager', 'Senior Developer', 'Principal Engineer'
    ];

    for (const title of commonTitles) {
      if (jobDescription.toLowerCase().includes(title.toLowerCase())) {
        return title;
      }
    }

    return 'Software Professional'; // Default fallback
  }

  /**
   * Categorize skills as hard or soft skills
   */
  private categorizeSkills(jobDescription: string): SkillCategory[] {
    const hardSkillsPatterns = [
      // Programming languages
      /\b(?:JavaScript|TypeScript|Python|Java|C\+\+|C#|Go|Rust|PHP|Ruby|Swift|Kotlin|Scala)\b/gi,
      // Frameworks and libraries
      /\b(?:React|Vue|Angular|Node\.js|Express|Django|Flask|Spring|Laravel|Rails)\b/gi,
      // Databases
      /\b(?:MySQL|PostgreSQL|MongoDB|Redis|Elasticsearch|Cassandra|DynamoDB)\b/gi,
      // Cloud and DevOps
      /\b(?:AWS|Azure|GCP|Docker|Kubernetes|Jenkins|GitLab|Terraform|Ansible)\b/gi,
      // Tools and technologies
      /\b(?:Git|JIRA|Confluence|Figma|Sketch|Photoshop|Linux|Windows|macOS)\b/gi,
    ];

    const softSkillsPatterns = [
      /\b(?:leadership|communication|teamwork|collaboration|problem[- ]solving)\b/gi,
      /\b(?:analytical|critical thinking|creativity|adaptability|time management)\b/gi,
      /\b(?:self[- ]motivated|detail[- ]oriented|innovative|strategic|cross[- ]functional)\b/gi,
    ];

    const hardSkills: string[] = [];
    const softSkills: string[] = [];

    // Extract hard skills
    hardSkillsPatterns.forEach(pattern => {
      const matches = jobDescription.match(pattern) || [];
      hardSkills.push(...matches.map((m: string) => m.trim()));
    });

    // Extract soft skills
    softSkillsPatterns.forEach(pattern => {
      const matches = jobDescription.match(pattern) || [];
      softSkills.push(...matches.map((m: string) => m.trim()));
    });

    return [
      {
        type: 'hard' as const,
        skills: [...new Set(hardSkills)], // Remove duplicates
        priority: 1, // High priority for hard skills
      },
      {
        type: 'soft' as const,
        skills: [...new Set(softSkills)], // Remove duplicates
        priority: 2, // Lower priority for soft skills
      },
    ].filter(category => category.skills.length > 0);
  }

  /**
   * Extract ATS keywords from job description
   */
  private extractATSKeywords(jobDescription: string): string[] {
    const keywords: Set<string> = new Set();

    // Technical keywords
    const techKeywords = jobDescription.match(/\b(?:JavaScript|TypeScript|Python|Java|C\+\+|React|Vue|Angular|Node\.js|AWS|GCP|Azure|Docker|Kubernetes|SQL|NoSQL|MongoDB|PostgreSQL|Redis|GraphQL|REST|API|CI\/CD|Git|Agile|Scrum|Machine Learning|AI|ML|Data Science|DevOps|Frontend|Backend|Full-?Stack|Microservices|Cloud|SaaS|B2B|B2C)\b/gi) || [];
    techKeywords.forEach(keyword => keywords.add(keyword.toLowerCase()));

    // Role-specific keywords
    const roleKeywords = jobDescription.match(/\b(?:Software Engineer|Developer|Data Scientist|ML Engineer|Full Stack|Backend|Frontend|DevOps|Engineering Manager|Product Manager|Designer|Analyst)\b/gi) || [];
    roleKeywords.forEach(keyword => keywords.add(keyword.toLowerCase()));

    // Industry terms
    const industryKeywords = jobDescription.match(/\b(?:fintech|healthcare|e-commerce|startup|enterprise|SaaS|B2B|B2C|mobile|web|cloud|AI|blockchain|IoT)\b/gi) || [];
    industryKeywords.forEach(keyword => keywords.add(keyword.toLowerCase()));

    // Soft skills
    const softKeywords = jobDescription.match(/\b(?:leadership|communication|problem-solving|analytical|collaborative|self-motivated|detail-oriented|innovative|strategic|cross-functional)\b/gi) || [];
    softKeywords.forEach(keyword => keywords.add(keyword.toLowerCase()));

    return Array.from(keywords);
  }

  /**
   * Determine seniority level from job description
   */
  private determineSeniorityLevel(jobDescription: string): SeniorityLevel {
    const jdLower = jobDescription.toLowerCase();

    // Check for executive level indicators
    if (jdLower.includes('director') || jdLower.includes('vp') || jdLower.includes('chief') || 
        jdLower.includes('head of') || jdLower.includes('executive')) {
      return SeniorityLevel.EXECUTIVE;
    }

    // Check for senior level indicators
    if (jdLower.includes('senior') || jdLower.includes('lead') || jdLower.includes('principal') ||
        jdLower.includes('staff') || jdLower.includes('architect') || 
        jdLower.match(/\b(?:5|6|7|8|9|10)\+?\s*years?\b/)) {
      return SeniorityLevel.SENIOR;
    }

    // Check for entry level indicators
    if (jdLower.includes('junior') || jdLower.includes('entry') || jdLower.includes('graduate') ||
        jdLower.includes('intern') || jdLower.includes('new grad') ||
        jdLower.match(/\b(?:0|1|2)\+?\s*years?\b/)) {
      return SeniorityLevel.ENTRY;
    }

    // Default to mid-level
    return SeniorityLevel.MID;
  }

  /**
   * Identify industry-specific terms
   */
  private identifyIndustryTerms(jobDescription: string): string[] {
    const industryTerms: Set<string> = new Set();

    // Financial services
    const financeTerms = jobDescription.match(/\b(?:fintech|banking|trading|payments|blockchain|cryptocurrency|compliance|risk management|KYC|AML)\b/gi) || [];
    financeTerms.forEach(term => industryTerms.add(term));

    // Healthcare
    const healthTerms = jobDescription.match(/\b(?:healthcare|medical|HIPAA|EMR|EHR|telemedicine|clinical|pharmaceutical)\b/gi) || [];
    healthTerms.forEach(term => industryTerms.add(term));

    // E-commerce
    const ecommerceTerms = jobDescription.match(/\b(?:e-commerce|retail|marketplace|inventory|fulfillment|logistics|supply chain)\b/gi) || [];
    ecommerceTerms.forEach(term => industryTerms.add(term));

    // Technology
    const techTerms = jobDescription.match(/\b(?:SaaS|PaaS|IaaS|API|SDK|microservices|serverless|edge computing|IoT)\b/gi) || [];
    techTerms.forEach(term => industryTerms.add(term));

    return Array.from(industryTerms);
  }

  /**
   * Determine optimization strategy based on analysis
   */
  private determineOptimizationStrategy(analysis: any): string {
    const { seniority, skills, keywords } = analysis;

    // High keyword density strategy for competitive roles
    if (keywords.length > 20) {
      return 'aggressive_keyword_optimization';
    }

    // Conservative strategy for senior roles
    if (seniority === SeniorityLevel.SENIOR || seniority === SeniorityLevel.EXECUTIVE) {
      return 'conservative_professional_focus';
    }

    // Skill-focused strategy for technical roles
    const hardSkills = skills.find((s: SkillCategory) => s.type === 'hard');
    if (hardSkills && hardSkills.skills.length > 10) {
      return 'technical_skills_emphasis';
    }

    // Balanced strategy as default
    return 'balanced_optimization';
  }

  /**
   * Estimate execution time based on complexity
   */
  private estimateExecutionTime(analysis: any): number {
    let baseTime = 30000; // 30 seconds base

    // Add time for complex analysis
    baseTime += analysis.keywords.length * 100; // 100ms per keyword
    baseTime += analysis.skills.reduce((sum: number, category: SkillCategory) => sum + category.skills.length * 50, 0); // 50ms per skill
    baseTime += analysis.industryTerms.length * 200; // 200ms per industry term

    // Cap at 60 seconds
    return Math.min(baseTime, 60000);
  }
}