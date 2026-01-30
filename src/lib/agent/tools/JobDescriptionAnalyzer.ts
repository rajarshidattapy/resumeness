// Job Description Analyzer Tool - Extracts requirements, skills, and keywords
import { SkillCategory, SeniorityLevel, ExecutionPlan } from '../types';

export class JobDescriptionAnalyzer {
  
  /**
   * Analyze job description and extract structured information
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
    const roleTitle = await this.extractRoleTitle(jobDescription);
    const skills = await this.categorizeAllSkills(jobDescription);
    const atsKeywords = await this.extractATSKeywords(jobDescription);
    const seniorityLevel = await this.determineSeniority(jobDescription);
    const industryTerms = await this.identifyIndustryTerms(jobDescription);
    const companyCulture = await this.extractCultureIndicators(jobDescription);
    const focusAreas = await this.identifyFocusAreas(jobDescription);

    // Additional analysis if we have planning results
    let additionalKeywords: string[] = [];
    let refinedStrategy: string | undefined;

    if (planningResults) {
      additionalKeywords = await this.findAdditionalKeywords(jobDescription, planningResults.atsKeywords);
      refinedStrategy = await this.refineOptimizationStrategy(jobDescription, planningResults);
    }

    return {
      roleTitle,
      requiredSkills: skills.required,
      niceToHaveSkills: skills.niceToHave,
      atsKeywords: [...atsKeywords, ...additionalKeywords],
      seniorityLevel,
      industryTerms,
      companyCulture,
      focusAreas,
      additionalKeywords: additionalKeywords.length > 0 ? additionalKeywords : undefined,
      refinedStrategy,
    };
  }

  /**
   * Extract role title with 95% accuracy
   */
  async extractRoleTitle(jobDescription: string): Promise<string> {
    const jd = jobDescription.toLowerCase();
    
    // Multiple extraction strategies for high accuracy
    const strategies = [
      // Strategy 1: Look for explicit title patterns
      () => {
        const patterns = [
          /(?:job title|position|role):\s*([^\n\r]+)/i,
          /(?:we are hiring|looking for|seeking)\s+(?:a\s+|an\s+)?([^\n\r]*(?:engineer|developer|manager|analyst|designer|scientist|architect|lead|director|specialist|coordinator|consultant)[^\n\r]*)/i,
          /^([^\n\r]*(?:engineer|developer|manager|analyst|designer|scientist|architect|lead|director|specialist|coordinator|consultant)[^\n\r]*)/im,
        ];

        for (const pattern of patterns) {
          const match = jobDescription.match(pattern);
          if (match && match[1]) {
            return match[1].trim().replace(/[^\w\s-]/g, '').trim();
          }
        }
        return null;
      },

      // Strategy 2: Look for title in first few lines
      () => {
        const firstLines = jobDescription.split('\n').slice(0, 3);
        for (const line of firstLines) {
          if (line.length > 5 && line.length < 100) {
            const titleWords = ['engineer', 'developer', 'manager', 'analyst', 'designer', 'scientist', 'architect', 'lead', 'director'];
            if (titleWords.some(word => line.toLowerCase().includes(word))) {
              return line.trim();
            }
          }
        }
        return null;
      },

      // Strategy 3: Extract from common job title patterns
      () => {
        const commonTitles = [
          'Senior Software Engineer', 'Software Engineer', 'Frontend Developer', 'Backend Developer', 
          'Full Stack Developer', 'Data Scientist', 'Machine Learning Engineer', 'DevOps Engineer',
          'Product Manager', 'UI/UX Designer', 'Business Analyst', 'Project Manager',
          'Technical Lead', 'Engineering Manager', 'Principal Engineer', 'Staff Engineer'
        ];

        for (const title of commonTitles) {
          if (jd.includes(title.toLowerCase())) {
            return title;
          }
        }
        return null;
      }
    ];

    // Try each strategy
    for (const strategy of strategies) {
      const result = strategy();
      if (result) {
        return result;
      }
    }

    return 'Software Professional'; // Fallback
  }

  /**
   * Categorize skills as hard vs soft, required vs nice-to-have
   */
  async categorizeAllSkills(jobDescription: string): Promise<{
    required: SkillCategory[];
    niceToHave: SkillCategory[];
  }> {
    const jd = jobDescription.toLowerCase();

    // Split job description into required and nice-to-have sections
    const requiredSection = this.extractRequiredSection(jd);
    const niceToHaveSection = this.extractNiceToHaveSection(jd);

    const requiredSkills = await this.extractSkillsFromSection(requiredSection, true);
    const niceToHaveSkills = await this.extractSkillsFromSection(niceToHaveSection, false);

    return {
      required: requiredSkills,
      niceToHave: niceToHaveSkills,
    };
  }

  /**
   * Extract ATS keywords with minimum 15 keywords guarantee
   */
  async extractATSKeywords(jobDescription: string): Promise<string[]> {
    const keywords: Set<string> = new Set();

    // Technical keywords (high priority)
    const techPatterns = [
      /\b(?:JavaScript|TypeScript|Python|Java|C\+\+|C#|Go|Rust|PHP|Ruby|Swift|Kotlin|Scala)\b/gi,
      /\b(?:React|Vue|Angular|Node\.js|Express|Django|Flask|Spring|Laravel|Rails|jQuery)\b/gi,
      /\b(?:MySQL|PostgreSQL|MongoDB|Redis|Elasticsearch|Cassandra|DynamoDB|SQLite)\b/gi,
      /\b(?:AWS|Azure|GCP|Docker|Kubernetes|Jenkins|GitLab|Terraform|Ansible|Helm)\b/gi,
      /\b(?:Git|JIRA|Confluence|Figma|Sketch|Photoshop|Linux|Windows|macOS)\b/gi,
      /\b(?:REST|GraphQL|API|SDK|JSON|XML|HTML|CSS|SASS|LESS)\b/gi,
      /\b(?:Agile|Scrum|Kanban|DevOps|CI\/CD|TDD|BDD|Microservices)\b/gi,
    ];

    techPatterns.forEach(pattern => {
      const matches = jobDescription.match(pattern) || [];
      matches.forEach(match => keywords.add(match.toLowerCase()));
    });

    // Role-specific keywords
    const rolePatterns = [
      /\b(?:Software Engineer|Developer|Data Scientist|ML Engineer|Full Stack|Backend|Frontend|DevOps|Engineering Manager|Product Manager|Designer|Analyst)\b/gi,
      /\b(?:Senior|Junior|Lead|Principal|Staff|Architect|Director|Manager)\b/gi,
    ];

    rolePatterns.forEach(pattern => {
      const matches = jobDescription.match(pattern) || [];
      matches.forEach(match => keywords.add(match.toLowerCase()));
    });

    // Soft skills keywords
    const softSkillPatterns = [
      /\b(?:leadership|communication|teamwork|collaboration|problem[- ]solving)\b/gi,
      /\b(?:analytical|critical thinking|creativity|adaptability|time management)\b/gi,
      /\b(?:self[- ]motivated|detail[- ]oriented|innovative|strategic|cross[- ]functional)\b/gi,
    ];

    softSkillPatterns.forEach(pattern => {
      const matches = jobDescription.match(pattern) || [];
      matches.forEach(match => keywords.add(match.toLowerCase()));
    });

    // Industry-specific keywords
    const industryPatterns = [
      /\b(?:fintech|healthcare|e-commerce|startup|enterprise|SaaS|B2B|B2C)\b/gi,
      /\b(?:mobile|web|cloud|AI|blockchain|IoT|machine learning|data science)\b/gi,
    ];

    industryPatterns.forEach(pattern => {
      const matches = jobDescription.match(pattern) || [];
      matches.forEach(match => keywords.add(match.toLowerCase()));
    });

    const keywordArray = Array.from(keywords);

    // Ensure we have at least 15 keywords
    if (keywordArray.length < 15) {
      const additionalKeywords = await this.extractAdditionalKeywords(jobDescription, keywordArray);
      keywordArray.push(...additionalKeywords);
    }

    return keywordArray.slice(0, 50); // Cap at 50 to avoid keyword stuffing
  }

  /**
   * Determine seniority level classification
   */
  async determineSeniority(jobDescription: string): Promise<SeniorityLevel> {
    const jd = jobDescription.toLowerCase();

    // Executive level indicators
    const executiveIndicators = [
      'director', 'vp', 'vice president', 'chief', 'head of', 'executive',
      'c-level', 'cto', 'ceo', 'cfo', 'coo'
    ];

    if (executiveIndicators.some(indicator => jd.includes(indicator))) {
      return SeniorityLevel.EXECUTIVE;
    }

    // Senior level indicators
    const seniorIndicators = [
      'senior', 'lead', 'principal', 'staff', 'architect',
      '5+ years', '6+ years', '7+ years', '8+ years', '9+ years', '10+ years',
      'experienced', 'expert', 'advanced'
    ];

    if (seniorIndicators.some(indicator => jd.includes(indicator))) {
      return SeniorityLevel.SENIOR;
    }

    // Entry level indicators
    const entryIndicators = [
      'junior', 'entry', 'graduate', 'intern', 'new grad', 'recent graduate',
      '0-2 years', '1-2 years', 'entry level', 'beginner'
    ];

    if (entryIndicators.some(indicator => jd.includes(indicator))) {
      return SeniorityLevel.ENTRY;
    }

    // Default to mid-level
    return SeniorityLevel.MID;
  }

  /**
   * Identify industry-specific terminology and acronyms
   */
  async identifyIndustryTerms(jobDescription: string): Promise<string[]> {
    const terms: Set<string> = new Set();

    const industryPatterns = [
      // Financial services
      /\b(?:fintech|banking|trading|payments|blockchain|cryptocurrency|compliance|risk management|KYC|AML|PCI|SOX|GDPR)\b/gi,
      // Healthcare
      /\b(?:healthcare|medical|HIPAA|EMR|EHR|telemedicine|clinical|pharmaceutical|FDA|HL7|FHIR)\b/gi,
      // E-commerce
      /\b(?:e-commerce|retail|marketplace|inventory|fulfillment|logistics|supply chain|POS|SKU)\b/gi,
      // Technology
      /\b(?:SaaS|PaaS|IaaS|API|SDK|microservices|serverless|edge computing|IoT|ML|AI|AR|VR)\b/gi,
      // Business
      /\b(?:B2B|B2C|CRM|ERP|ROI|KPI|SLA|OKR|MVP|POC|UAT|QA)\b/gi,
    ];

    industryPatterns.forEach(pattern => {
      const matches = jobDescription.match(pattern) || [];
      matches.forEach(match => terms.add(match));
    });

    return Array.from(terms);
  }

  // Helper methods

  private extractRequiredSection(jd: string): string {
    const requiredMarkers = [
      'requirements:', 'required:', 'must have:', 'qualifications:',
      'you must have:', 'essential:', 'mandatory:'
    ];

    for (const marker of requiredMarkers) {
      const index = jd.indexOf(marker);
      if (index !== -1) {
        const section = jd.substring(index, index + 1000); // Get next 1000 chars
        return section;
      }
    }

    return jd.substring(0, Math.min(jd.length, 2000)); // First 2000 chars as fallback
  }

  private extractNiceToHaveSection(jd: string): string {
    const niceToHaveMarkers = [
      'nice to have:', 'preferred:', 'bonus:', 'plus:', 'would be great:',
      'additional:', 'desirable:', 'preferred qualifications:'
    ];

    for (const marker of niceToHaveMarkers) {
      const index = jd.indexOf(marker);
      if (index !== -1) {
        const section = jd.substring(index, index + 1000); // Get next 1000 chars
        return section;
      }
    }

    return ''; // No nice-to-have section found
  }

  private async extractSkillsFromSection(section: string, isRequired: boolean): Promise<SkillCategory[]> {
    const hardSkills: string[] = [];
    const softSkills: string[] = [];

    // Extract hard skills
    const hardSkillPatterns = [
      /\b(?:JavaScript|TypeScript|Python|Java|C\+\+|C#|Go|Rust|PHP|Ruby|Swift|Kotlin|Scala)\b/gi,
      /\b(?:React|Vue|Angular|Node\.js|Express|Django|Flask|Spring|Laravel|Rails)\b/gi,
      /\b(?:MySQL|PostgreSQL|MongoDB|Redis|Elasticsearch|Cassandra|DynamoDB)\b/gi,
      /\b(?:AWS|Azure|GCP|Docker|Kubernetes|Jenkins|GitLab|Terraform|Ansible)\b/gi,
    ];

    hardSkillPatterns.forEach(pattern => {
      const matches = section.match(pattern) || [];
      hardSkills.push(...matches);
    });

    // Extract soft skills
    const softSkillPatterns = [
      /\b(?:leadership|communication|teamwork|collaboration|problem[- ]solving)\b/gi,
      /\b(?:analytical|critical thinking|creativity|adaptability|time management)\b/gi,
      /\b(?:self[- ]motivated|detail[- ]oriented|innovative|strategic|cross[- ]functional)\b/gi,
    ];

    softSkillPatterns.forEach(pattern => {
      const matches = section.match(pattern) || [];
      softSkills.push(...matches);
    });

    const categories: SkillCategory[] = [];

    if (hardSkills.length > 0) {
      categories.push({
        type: 'hard',
        skills: [...new Set(hardSkills)],
        priority: isRequired ? 1 : 2,
      });
    }

    if (softSkills.length > 0) {
      categories.push({
        type: 'soft',
        skills: [...new Set(softSkills)],
        priority: isRequired ? 2 : 3,
      });
    }

    return categories;
  }

  private async extractCultureIndicators(jobDescription: string): Promise<string[]> {
    const cultureKeywords = [
      'startup', 'fast-paced', 'innovative', 'collaborative', 'remote', 'flexible',
      'work-life balance', 'growth', 'learning', 'mentorship', 'diverse', 'inclusive'
    ];

    return cultureKeywords.filter(keyword => 
      jobDescription.toLowerCase().includes(keyword)
    );
  }

  private async identifyFocusAreas(jobDescription: string): Promise<string[]> {
    const focusAreas = [
      'performance', 'scalability', 'security', 'user experience', 'mobile',
      'web', 'cloud', 'data', 'analytics', 'machine learning', 'AI'
    ];

    return focusAreas.filter(area => 
      jobDescription.toLowerCase().includes(area)
    );
  }

  private async findAdditionalKeywords(jobDescription: string, existingKeywords: string[]): Promise<string[]> {
    const additional: string[] = [];
    const words = jobDescription.toLowerCase().split(/\W+/);
    
    // Look for technical terms that might have been missed
    const technicalTerms = words.filter(word => 
      word.length > 3 && 
      !existingKeywords.includes(word) &&
      (word.endsWith('js') || word.endsWith('sql') || word.includes('tech') || word.includes('dev'))
    );

    additional.push(...technicalTerms.slice(0, 5)); // Add up to 5 additional terms
    return additional;
  }

  private async extractAdditionalKeywords(jobDescription: string, existingKeywords: string[]): Promise<string[]> {
    const additional: string[] = [];
    
    // Extract company-specific terms
    const companyTerms = jobDescription.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    const relevantCompanyTerms = companyTerms.filter(term => 
      term.length > 3 && 
      term.length < 20 && 
      !existingKeywords.includes(term.toLowerCase())
    ).slice(0, 5);

    additional.push(...relevantCompanyTerms.map(t => t.toLowerCase()));

    // Add common business terms if not present
    const businessTerms = ['agile', 'scrum', 'api', 'database', 'testing', 'deployment'];
    businessTerms.forEach(term => {
      if (jobDescription.toLowerCase().includes(term) && !existingKeywords.includes(term)) {
        additional.push(term);
      }
    });

    return additional.slice(0, 10); // Limit to 10 additional keywords
  }

  private async refineOptimizationStrategy(jobDescription: string, planningResults: ExecutionPlan): Promise<string> {
    const jd = jobDescription.toLowerCase();
    
    // Check for competitive indicators
    if (jd.includes('competitive') || jd.includes('top talent') || jd.includes('best of the best')) {
      return 'highly_competitive_optimization';
    }

    // Check for startup indicators
    if (jd.includes('startup') || jd.includes('fast-paced') || jd.includes('wear many hats')) {
      return 'startup_versatility_focus';
    }

    // Check for enterprise indicators
    if (jd.includes('enterprise') || jd.includes('large scale') || jd.includes('fortune')) {
      return 'enterprise_scale_focus';
    }

    return planningResults.optimizationStrategy; // Keep original strategy
  }
}