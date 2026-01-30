// Resume Rewriter - Rewrites LaTeX resume content with job-aligned language
import { ExecutionPlan, RankedResult } from '../types';
import { KnowledgeItem } from '@/stores/useResumeStore';

export class ResumeRewriter {
  
  /**
   * Rewrite resume content based on retrieval results and planning
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
    console.log('🔄 ResumeRewriter: Starting rewrite process');
    console.log('📄 Original LaTeX length:', currentLatex.length);
    console.log('🎯 Target role:', planningResults.targetRole);
    console.log('🔑 ATS keywords:', planningResults.atsKeywords.slice(0, 10));
    
    const { relevantItems, gaps } = retrievalResults;
    
    // Parse the LaTeX structure
    const sections = this.parseLatexSections(currentLatex);
    console.log('📑 Parsed sections:', Object.keys(sections));
    
    const modifiedSections: string[] = [];
    const changesApplied: Array<{
      section: string;
      changeType: 'content' | 'structure' | 'keywords';
      description: string;
      confidence: number;
    }> = [];

    let rewrittenLatex = currentLatex;
    let complexity = 0;

    // Rewrite each section based on job alignment
    for (const [sectionName, sectionContent] of Object.entries(sections)) {
      console.log(`🔧 Processing section: ${sectionName}`);
      
      const rewriteResult = await this.rewriteSection(
        sectionName,
        sectionContent,
        relevantItems,
        planningResults,
        gaps
      );

      if (rewriteResult.modified) {
        console.log(`✅ Modified section: ${sectionName}`);
        console.log(`📝 Changes: ${rewriteResult.changes.length}`);
        
        rewrittenLatex = rewrittenLatex.replace(sectionContent, rewriteResult.newContent);
        modifiedSections.push(sectionName);
        changesApplied.push(...rewriteResult.changes);
        complexity += rewriteResult.complexity;
      } else {
        console.log(`⏭️ Skipped section: ${sectionName}`);
      }
    }

    // Inject quantified impact where available
    rewrittenLatex = await this.injectQuantifiedImpact(rewrittenLatex, relevantItems);

    // Ensure no hallucination by cross-referencing knowledge base
    rewrittenLatex = await this.preventHallucination(rewrittenLatex, relevantItems);

    console.log('✨ ResumeRewriter: Completed rewrite process');
    console.log('📄 Final LaTeX length:', rewrittenLatex.length);
    console.log('🔄 Sections modified:', modifiedSections);
    console.log('📊 Total changes:', changesApplied.length);

    return {
      rewrittenLatex,
      sectionsModified: modifiedSections,
      changesApplied,
      complexity: Math.ceil(complexity / Math.max(modifiedSections.length, 1)),
    };
  }

  /**
   * Parse LaTeX into modifiable sections with better pattern matching
   */
  private parseLatexSections(latex: string): Record<string, string> {
    const sections: Record<string, string> = {};
    
    // Enhanced section pattern matching
    const sectionPatterns = [
      // Standard sections
      /\\section\*?\{([^}]+)\}([\s\S]*?)(?=\\section\*?\{|\\end\{document\}|$)/g,
      // Subsections
      /\\subsection\*?\{([^}]+)\}([\s\S]*?)(?=\\(?:sub)?section\*?\{|\\end\{document\}|$)/g,
      // Custom section commands
      /\\(?:resumesection|cvsection)\{([^}]+)\}([\s\S]*?)(?=\\(?:resumesection|cvsection|section)\{|\\end\{document\}|$)/g
    ];

    // Try each pattern
    for (const pattern of sectionPatterns) {
      let match;
      while ((match = pattern.exec(latex)) !== null) {
        const sectionName = match[1].trim();
        const sectionContent = match[0]; // Include the section header
        sections[sectionName] = sectionContent;
      }
    }

    // If no sections found, look for common resume patterns
    if (Object.keys(sections).length === 0) {
      // Look for textbf headers that might be section-like
      const headerPattern = /\\textbf\{([^}]+)\}[\s\S]*?(?=\\textbf\{|\\end\{document\}|$)/g;
      let match;
      while ((match = headerPattern.exec(latex)) !== null) {
        const headerName = match[1].trim();
        if (headerName.length > 3) { // Likely a section header
          sections[headerName] = match[0];
        }
      }
    }

    // If still no sections, treat as single content block
    if (Object.keys(sections).length === 0) {
      sections['main'] = latex;
    }

    return sections;
  }

  /**
   * Rewrite a specific section with job-aligned language
   */
  private async rewriteSection(
    sectionName: string,
    sectionContent: string,
    relevantItems: RankedResult[],
    planningResults: ExecutionPlan,
    gaps: string[]
  ): Promise<{
    modified: boolean;
    newContent: string;
    changes: Array<{
      section: string;
      changeType: 'content' | 'structure' | 'keywords';
      description: string;
      confidence: number;
    }>;
    complexity: number;
  }> {
    const sectionLower = sectionName.toLowerCase();
    console.log(`🔍 Analyzing section: ${sectionName} (${sectionLower})`);
    
    const changes: Array<{
      section: string;
      changeType: 'content' | 'structure' | 'keywords';
      description: string;
      confidence: number;
    }> = [];
    
    let newContent = sectionContent;
    let modified = false;
    let complexity = 1;

    // Skip non-content sections
    if (this.shouldSkipSection(sectionLower)) {
      console.log(`⏭️ Skipping section: ${sectionName} (non-content)`);
      return { modified: false, newContent, changes, complexity };
    }

    // Professional Summary / Objective
    if (sectionLower.includes('summary') || sectionLower.includes('objective')) {
      console.log(`📝 Processing summary section: ${sectionName}`);
      const summaryResult = await this.rewriteSummary(sectionContent, planningResults);
      if (summaryResult.modified) {
        console.log(`✅ Summary modified successfully`);
        newContent = summaryResult.content;
        modified = true;
        complexity = 3;
        changes.push({
          section: sectionName,
          changeType: 'content',
          description: 'Updated summary to align with target role and seniority level',
          confidence: 0.9,
        });
      } else {
        console.log(`⏭️ Summary not modified`);
      }
    }

    // Experience Section
    if (sectionLower.includes('experience') || sectionLower.includes('professional')) {
      console.log(`💼 Processing experience section: ${sectionName}`);
      const experienceResult = await this.rewriteExperience(
        sectionContent, 
        relevantItems, 
        planningResults
      );
      if (experienceResult.modified) {
        console.log(`✅ Experience modified: ${experienceResult.changes.length} changes`);
        newContent = experienceResult.content;
        modified = true;
        complexity = 5;
        changes.push(...experienceResult.changes.map(change => ({
          section: sectionName,
          changeType: change.type as 'content' | 'structure' | 'keywords',
          description: change.description,
          confidence: change.confidence,
        })));
      } else {
        console.log(`⏭️ Experience not modified`);
      }
    }

    // Skills Section
    if (sectionLower.includes('skill') || sectionLower.includes('technical')) {
      console.log(`🛠️ Processing skills section: ${sectionName}`);
      const skillsResult = await this.rewriteSkills(sectionContent, planningResults);
      if (skillsResult.modified) {
        console.log(`✅ Skills modified successfully`);
        newContent = skillsResult.content;
        modified = true;
        complexity = 2;
        changes.push({
          section: sectionName,
          changeType: 'keywords',
          description: `Prioritized ${planningResults.atsKeywords.length} job-relevant skills`,
          confidence: 0.95,
        });
      } else {
        console.log(`⏭️ Skills not modified`);
      }
    }

    // Projects Section
    if (sectionLower.includes('project')) {
      console.log(`🚀 Processing projects section: ${sectionName}`);
      const projectsResult = await this.rewriteProjects(
        sectionContent, 
        relevantItems, 
        planningResults
      );
      if (projectsResult.modified) {
        console.log(`✅ Projects modified: ${projectsResult.changes.length} changes`);
        newContent = projectsResult.content;
        modified = true;
        complexity = 4;
        changes.push(...projectsResult.changes.map(change => ({
          section: sectionName,
          changeType: change.type as 'content' | 'structure' | 'keywords',
          description: change.description,
          confidence: change.confidence,
        })));
      } else {
        console.log(`⏭️ Projects not modified`);
      }
    }

    console.log(`📊 Section ${sectionName} result: modified=${modified}, changes=${changes.length}`);
    return { modified, newContent, changes, complexity };
  }

  /**
   * Rewrite professional summary with more aggressive approach
   */
  private async rewriteSummary(
    content: string,
    planningResults: ExecutionPlan
  ): Promise<{ modified: boolean; content: string }> {
    const { targetRole, seniorityLevel, atsKeywords } = planningResults;
    
    // Extract current summary text
    const summaryText = this.extractTextFromLatex(content);
    
    // Always modify if we have planning results - be more aggressive
    if (!targetRole || atsKeywords.length === 0) {
      return { modified: false, content };
    }

    // Generate new summary with job-aligned language
    const newSummaryText = this.generateJobAlignedSummary(
      summaryText,
      targetRole,
      seniorityLevel,
      atsKeywords.slice(0, 8) // Use more keywords
    );

    // Replace the text content while preserving LaTeX structure
    const newContent = this.replaceTextInLatex(content, summaryText, newSummaryText);
    
    return { modified: true, content: newContent };
  }

  /**
   * Rewrite experience section
   */
  private async rewriteExperience(
    content: string,
    relevantItems: RankedResult[],
    planningResults: ExecutionPlan
  ): Promise<{
    modified: boolean;
    content: string;
    changes: Array<{
      type: string;
      description: string;
      confidence: number;
    }>;
  }> {
    const changes: Array<{
      type: string;
      description: string;
      confidence: number;
    }> = [];
    
    let newContent = content;
    let modified = false;

    // Extract experience entries
    const experienceEntries = this.extractExperienceEntries(content);
    
    for (let i = 0; i < experienceEntries.length; i++) {
      const entry = experienceEntries[i];
      const relevantExperience = relevantItems.filter(item => 
        item.item.type === 'experience' || item.item.type === 'achievement'
      );

      if (relevantExperience.length > 0) {
        const enhancedEntry = await this.enhanceExperienceEntry(
          entry,
          relevantExperience,
          planningResults
        );

        if (enhancedEntry.modified) {
          newContent = newContent.replace(entry.content, enhancedEntry.content);
          modified = true;
          changes.push({
            type: 'content',
            description: `Enhanced experience entry with ${enhancedEntry.addedKeywords} relevant keywords`,
            confidence: 0.85,
          });
        }
      }
    }

    return { modified, content: newContent, changes };
  }

  /**
   * Rewrite skills section
   */
  private async rewriteSkills(
    content: string,
    planningResults: ExecutionPlan
  ): Promise<{ modified: boolean; content: string }> {
    const { requiredSkills, atsKeywords } = planningResults;
    
    // Extract current skills
    const currentSkills = this.extractSkillsFromContent(content);
    
    // Prioritize job-mentioned skills
    const jobSkills = requiredSkills.flatMap(category => category.skills);
    const prioritizedSkills = this.prioritizeSkills(currentSkills, jobSkills, atsKeywords);
    
    // Check if reordering is needed
    const needsReordering = !this.areSkillsPrioritized(currentSkills, prioritizedSkills);
    
    if (!needsReordering) {
      return { modified: false, content };
    }

    // Rewrite skills section with new order
    const newContent = this.reorderSkillsInLatex(content, prioritizedSkills);
    
    return { modified: true, content: newContent };
  }

  /**
   * Rewrite projects section
   */
  private async rewriteProjects(
    content: string,
    relevantItems: RankedResult[],
    planningResults: ExecutionPlan
  ): Promise<{
    modified: boolean;
    content: string;
    changes: Array<{
      type: string;
      description: string;
      confidence: number;
    }>;
  }> {
    const changes: Array<{
      type: string;
      description: string;
      confidence: number;
    }> = [];
    
    const relevantProjects = relevantItems.filter(item => item.item.type === 'project');
    
    if (relevantProjects.length === 0) {
      return { modified: false, content, changes };
    }

    // Extract current projects
    const currentProjects = this.extractProjectEntries(content);
    
    // Enhance projects with relevant technologies and outcomes
    let newContent = content;
    let modified = false;

    for (const project of currentProjects) {
      const matchingKBProjects = relevantProjects.filter(rp => 
        this.projectsMatch(project.title, rp.item.title)
      );

      if (matchingKBProjects.length > 0) {
        const enhancedProject = await this.enhanceProjectEntry(
          project,
          matchingKBProjects[0],
          planningResults
        );

        if (enhancedProject.modified) {
          newContent = newContent.replace(project.content, enhancedProject.content);
          modified = true;
          changes.push({
            type: 'content',
            description: `Enhanced project "${project.title}" with relevant technologies`,
            confidence: 0.8,
          });
        }
      }
    }

    return { modified, content: newContent, changes };
  }

  /**
   * Inject quantified impact from knowledge base
   */
  private async injectQuantifiedImpact(
    latex: string,
    relevantItems: RankedResult[]
  ): Promise<string> {
    const quantifiedItems = relevantItems.filter(item => 
      this.hasQuantifiedMetrics(item.item.content)
    );

    if (quantifiedItems.length === 0) {
      return latex;
    }

    let enhancedLatex = latex;

    // Find bullet points that could benefit from quantification
    const bulletPattern = /\\item\s+([^\\]+?)(?=\\item|\\end|$)/g;
    let match;

    while ((match = bulletPattern.exec(latex)) !== null) {
      const bulletContent = match[1].trim();
      
      // Find matching quantified item
      const matchingItem = quantifiedItems.find(item => 
        this.contentMatches(bulletContent, item.item.content)
      );

      if (matchingItem) {
        const metrics = this.extractMetrics(matchingItem.item.content);
        if (metrics.length > 0) {
          const enhancedBullet = this.addMetricsToBullet(bulletContent, metrics);
          enhancedLatex = enhancedLatex.replace(match[0], `\\item ${enhancedBullet}`);
        }
      }
    }

    return enhancedLatex;
  }

  /**
   * Prevent hallucination by cross-referencing knowledge base
   */
  private async preventHallucination(
    latex: string,
    relevantItems: RankedResult[]
  ): Promise<string> {
    // Extract all factual claims from the resume
    const claims = this.extractFactualClaims(latex);
    const knowledgeBase = relevantItems.map(item => item.item);
    
    // Verify each claim against knowledge base
    const verifiedLatex = claims.reduce((currentLatex, claim) => {
      if (!this.isClaimSupported(claim, knowledgeBase)) {
        // Remove or soften unsupported claims
        return this.softenUnsupportedClaim(currentLatex, claim);
      }
      return currentLatex;
    }, latex);

    return verifiedLatex;
  }

  // Helper methods

  private shouldSkipSection(sectionName: string): boolean {
    const skipSections = ['education', 'contact', 'header', 'footer'];
    return skipSections.some(skip => sectionName.includes(skip));
  }

  private extractTextFromLatex(latex: string): string {
    return latex
      .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?(\{[^}]*\})?/g, ' ') // Remove LaTeX commands, replace with space
      .replace(/[{}]/g, ' ') // Remove braces, replace with space
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private replaceTextInLatex(latex: string, oldText: string, newText: string): string {
    // More sophisticated text replacement that preserves LaTeX structure
    
    // First try exact replacement
    if (latex.includes(oldText)) {
      return latex.replace(oldText, newText);
    }
    
    // Try replacing within common LaTeX text containers
    const textContainers = [
      /\\textbf\{([^}]*)\}/g,
      /\\textit\{([^}]*)\}/g,
      /\\emph\{([^}]*)\}/g,
      /([^\\{]+)/g // Plain text
    ];
    
    let result = latex;
    for (const pattern of textContainers) {
      result = result.replace(pattern, (match, content) => {
        if (content && content.includes(oldText)) {
          return match.replace(oldText, newText);
        }
        return match;
      });
    }
    
    // If still not replaced, try fuzzy matching
    const oldWords = oldText.toLowerCase().split(/\s+/);
    const latexText = this.extractTextFromLatex(latex).toLowerCase();
    
    if (oldWords.length > 2 && oldWords.every(word => latexText.includes(word))) {
      // Find the best matching section and replace it
      const sentences = latex.split(/(?<=[.!?])\s+/);
      for (let i = 0; i < sentences.length; i++) {
        const sentenceText = this.extractTextFromLatex(sentences[i]).toLowerCase();
        const matchCount = oldWords.filter(word => sentenceText.includes(word)).length;
        
        if (matchCount >= Math.ceil(oldWords.length * 0.7)) {
          // Replace this sentence
          sentences[i] = this.replaceTextInSentence(sentences[i], newText);
          return sentences.join(' ');
        }
      }
    }
    
    return result;
  }
  
  private replaceTextInSentence(sentence: string, newText: string): string {
    // Replace the main content of a sentence while preserving LaTeX structure
    const textPattern = /^(\\[^{]*\{)?([^}]+)(\}.*)?$/;
    const match = sentence.match(textPattern);
    
    if (match) {
      const prefix = match[1] || '';
      const suffix = match[3] || '';
      return `${prefix}${newText}${suffix}`;
    }
    
    return newText;
  }

  private generateJobAlignedSummary(
    currentSummary: string,
    targetRole: string,
    seniorityLevel: string,
    keywords: string[]
  ): string {
    // Generate a new summary that incorporates the target role and keywords
    const experienceLevel = seniorityLevel === 'senior' ? 'Senior' : 
                           seniorityLevel === 'entry' ? 'Entry-level' : 
                           'Experienced';
    
    const keywordPhrase = keywords.slice(0, 3).join(', ');
    
    // Create a more comprehensive summary that integrates keywords naturally
    const sentences = currentSummary.split('.').filter(s => s.trim().length > 0);
    const firstSentence = sentences[0] || '';
    const restSentences = sentences.slice(1).join('. ').trim();
    
    // Build new summary with target role and keywords
    let newSummary = `${experienceLevel} ${targetRole} with proven expertise in ${keywordPhrase}`;
    
    // Add additional keywords naturally
    if (keywords.length > 3) {
      const additionalKeywords = keywords.slice(3, 6).join(', ');
      newSummary += ` and experience with ${additionalKeywords}`;
    }
    
    // Incorporate original content if it adds value
    if (restSentences.length > 0) {
      newSummary += `. ${restSentences}`;
    } else if (firstSentence.length > 0 && !firstSentence.toLowerCase().includes(targetRole.toLowerCase())) {
      newSummary += `. ${firstSentence.trim()}`;
    }
    
    // Ensure it ends with a period
    if (!newSummary.endsWith('.')) {
      newSummary += '.';
    }
    
    return newSummary;
  }

  private extractExperienceEntries(content: string): Array<{
    title: string;
    content: string;
  }> {
    // Extract individual experience entries
    const entries: Array<{ title: string; content: string }> = [];
    const entryPattern = /\\textbf\{([^}]+)\}[\s\S]*?(?=\\textbf\{|\\section|\\end|$)/g;
    let match;

    while ((match = entryPattern.exec(content)) !== null) {
      entries.push({
        title: match[1],
        content: match[0],
      });
    }

    return entries;
  }

  private async enhanceExperienceEntry(
    entry: { title: string; content: string },
    relevantExperience: RankedResult[],
    planningResults: ExecutionPlan
  ): Promise<{ modified: boolean; content: string; addedKeywords: number }> {
    const keywords = planningResults.atsKeywords;
    const currentKeywords = keywords.filter(keyword => 
      entry.content.toLowerCase().includes(keyword.toLowerCase())
    );

    const missingKeywords = keywords.filter(keyword => 
      !currentKeywords.includes(keyword)
    ).slice(0, 5); // Increase to 5 missing keywords

    if (missingKeywords.length === 0) {
      return { modified: false, content: entry.content, addedKeywords: 0 };
    }

    // Enhance bullet points with missing keywords more aggressively
    let enhancedContent = entry.content;
    let addedCount = 0;

    // Find all bullet points in the entry
    const bulletPattern = /\\item\s+([^\\]+?)(?=\\item|\\end|$)/g;
    const bullets: Array<{ original: string; text: string; index: number }> = [];
    let match;
    
    while ((match = bulletPattern.exec(entry.content)) !== null) {
      bullets.push({
        original: match[0],
        text: match[1].trim(),
        index: match.index
      });
    }

    // Add keywords to different bullets
    missingKeywords.forEach((keyword, keywordIndex) => {
      const bulletIndex = keywordIndex % bullets.length;
      if (bullets[bulletIndex] && this.canAddKeywordNaturally(bullets[bulletIndex].text, keyword)) {
        const enhancedBullet = this.addKeywordToContent(bullets[bulletIndex].text, keyword);
        enhancedContent = enhancedContent.replace(
          bullets[bulletIndex].original,
          `\\item ${enhancedBullet}`
        );
        addedCount++;
      }
    });

    // If no bullets found, try to add to the main content
    if (bullets.length === 0 && missingKeywords.length > 0) {
      missingKeywords.slice(0, 2).forEach(keyword => {
        if (this.canAddKeywordNaturally(enhancedContent, keyword)) {
          enhancedContent = this.addKeywordToContent(enhancedContent, keyword);
          addedCount++;
        }
      });
    }

    return {
      modified: addedCount > 0,
      content: enhancedContent,
      addedKeywords: addedCount,
    };
  }

  private extractSkillsFromContent(content: string): string[] {
    // Extract skills from LaTeX content
    const skillPattern = /\\textbf\{[^}]*\}:\s*([^\\]+)/g;
    const skills: string[] = [];
    let match;

    while ((match = skillPattern.exec(content)) !== null) {
      const skillList = match[1].split(',').map(s => s.trim());
      skills.push(...skillList);
    }

    return skills;
  }

  private prioritizeSkills(
    currentSkills: string[],
    jobSkills: string[],
    atsKeywords: string[]
  ): string[] {
    const prioritized: string[] = [];
    const remaining: string[] = [...currentSkills];

    // First, add job-mentioned skills
    jobSkills.forEach(jobSkill => {
      const matchingSkill = remaining.find(skill => 
        skill.toLowerCase().includes(jobSkill.toLowerCase()) ||
        jobSkill.toLowerCase().includes(skill.toLowerCase())
      );
      if (matchingSkill) {
        prioritized.push(matchingSkill);
        remaining.splice(remaining.indexOf(matchingSkill), 1);
      }
    });

    // Then, add ATS keywords
    atsKeywords.forEach(keyword => {
      const matchingSkill = remaining.find(skill => 
        skill.toLowerCase().includes(keyword.toLowerCase())
      );
      if (matchingSkill) {
        prioritized.push(matchingSkill);
        remaining.splice(remaining.indexOf(matchingSkill), 1);
      }
    });

    // Finally, add remaining skills
    prioritized.push(...remaining);

    return prioritized;
  }

  private areSkillsPrioritized(current: string[], prioritized: string[]): boolean {
    // Check if the first 3 skills are already prioritized
    return current.slice(0, 3).every((skill, index) => 
      skill === prioritized[index]
    );
  }

  private reorderSkillsInLatex(content: string, prioritizedSkills: string[]): string {
    // Reorder skills in LaTeX while preserving structure
    const skillsText = prioritizedSkills.join(', ');
    return content.replace(
      /(\\textbf\{[^}]*\}:\s*)([^\\]+)/,
      `$1${skillsText}`
    );
  }

  private extractProjectEntries(content: string): Array<{
    title: string;
    content: string;
  }> {
    // Similar to experience entries but for projects
    return this.extractExperienceEntries(content);
  }

  private projectsMatch(title1: string, title2: string): boolean {
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalize(title1).includes(normalize(title2)) || 
           normalize(title2).includes(normalize(title1));
  }

  private async enhanceProjectEntry(
    project: { title: string; content: string },
    matchingKBProject: RankedResult,
    planningResults: ExecutionPlan
  ): Promise<{ modified: boolean; content: string }> {
    const relevantTechs = planningResults.atsKeywords.filter(keyword =>
      matchingKBProject.item.content.toLowerCase().includes(keyword.toLowerCase())
    );

    if (relevantTechs.length === 0) {
      return { modified: false, content: project.content };
    }

    // Add relevant technologies to project description
    let enhancedContent = project.content;
    relevantTechs.slice(0, 2).forEach(tech => {
      if (!enhancedContent.toLowerCase().includes(tech.toLowerCase())) {
        enhancedContent = this.addTechnologyToProject(enhancedContent, tech);
      }
    });

    return {
      modified: enhancedContent !== project.content,
      content: enhancedContent,
    };
  }

  private hasQuantifiedMetrics(content: string): boolean {
    const metricPatterns = [
      /\d+%/, /\d+x/, /\$\d+/, /\d+\+?\s*(users?|customers?|requests?)/i,
      /reduced?\s+by\s+\d+/i, /increased?\s+by\s+\d+/i
    ];
    return metricPatterns.some(pattern => pattern.test(content));
  }

  private contentMatches(content1: string, content2: string): boolean {
    const words1 = content1.toLowerCase().split(/\W+/);
    const words2 = content2.toLowerCase().split(/\W+/);
    const commonWords = words1.filter(word => 
      word.length > 3 && words2.includes(word)
    );
    return commonWords.length >= 3;
  }

  private extractMetrics(content: string): string[] {
    const metricPattern = /(\d+%|\d+x|\$\d+[\d,]*|\d+\+?\s*(?:users?|customers?|requests?|seconds?|minutes?|hours?|MB|GB|TB))/gi;
    return content.match(metricPattern) || [];
  }

  private addMetricsToBullet(bullet: string, metrics: string[]): string {
    // Add the first metric to the bullet if it doesn't already have one
    if (!this.hasQuantifiedMetrics(bullet) && metrics.length > 0) {
      return `${bullet.trim()}, achieving ${metrics[0]} improvement`;
    }
    return bullet;
  }

  private extractFactualClaims(latex: string): string[] {
    // Extract specific claims that could be hallucinated
    const claims: string[] = [];
    const text = this.extractTextFromLatex(latex);
    
    // Look for specific numbers, company names, technologies
    const claimPatterns = [
      /\d+%\s+\w+/g, // Percentage improvements
      /\$\d+[\d,]*/g, // Dollar amounts
      /\d+\+?\s*(?:users?|customers?|requests?)/gi, // User counts
    ];

    claimPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      claims.push(...matches);
    });

    return claims;
  }

  private isClaimSupported(claim: string, knowledgeBase: KnowledgeItem[]): boolean {
    return knowledgeBase.some(item => 
      item.content.toLowerCase().includes(claim.toLowerCase())
    );
  }

  private softenUnsupportedClaim(latex: string, claim: string): string {
    // Replace specific numbers with approximate language
    return latex.replace(claim, claim.replace(/\d+/, 'significant'));
  }

  private canAddKeywordNaturally(content: string, keyword: string): boolean {
    // Check if keyword can be added without seeming forced - be more aggressive
    const contextWords = ['using', 'with', 'implementing', 'developing', 'building', 'creating', 'designing', 'working', 'experience', 'skilled'];
    const hasContext = contextWords.some(context => content.toLowerCase().includes(context));
    
    // Also allow if content doesn't already contain the keyword
    const alreadyHasKeyword = content.toLowerCase().includes(keyword.toLowerCase());
    
    // Allow addition if there's context OR if keyword is missing (be more aggressive)
    return hasContext || !alreadyHasKeyword;
  }

  private addKeywordToContent(content: string, keyword: string): string {
    // Add keyword naturally to existing content with multiple strategies
    
    // Strategy 1: Add to existing "using" context
    const usingMatch = content.match(/(.*using\s+)([^.]+)(.*)/i);
    if (usingMatch) {
      const beforeUsing = usingMatch[1];
      const currentTech = usingMatch[2];
      const afterUsing = usingMatch[3];
      return `${beforeUsing}${currentTech}, ${keyword}${afterUsing}`;
    }
    
    // Strategy 2: Add to existing "with" context
    const withMatch = content.match(/(.*with\s+)([^.]+)(.*)/i);
    if (withMatch) {
      const beforeWith = withMatch[1];
      const currentTech = withMatch[2];
      const afterWith = withMatch[3];
      return `${beforeWith}${currentTech} and ${keyword}${afterWith}`;
    }
    
    // Strategy 3: Add to existing "implementing" context
    const implementingMatch = content.match(/(.*implementing\s+)([^.]+)(.*)/i);
    if (implementingMatch) {
      const beforeImpl = implementingMatch[1];
      const currentTech = implementingMatch[2];
      const afterImpl = implementingMatch[3];
      return `${beforeImpl}${currentTech} and ${keyword}${afterImpl}`;
    }
    
    // Strategy 4: Add to end of first sentence
    const firstSentenceEnd = content.indexOf('.');
    if (firstSentenceEnd !== -1) {
      const beforePeriod = content.substring(0, firstSentenceEnd);
      const afterPeriod = content.substring(firstSentenceEnd);
      return `${beforePeriod} utilizing ${keyword}${afterPeriod}`;
    }
    
    // Strategy 5: Add at the end
    return `${content} leveraging ${keyword}`;
  }

  private addTechnologyToProject(content: string, technology: string): string {
    // Add technology to project description
    const techPhrase = ` utilizing ${technology}`;
    const insertPoint = content.lastIndexOf('.');
    if (insertPoint !== -1) {
      return content.substring(0, insertPoint) + techPhrase + content.substring(insertPoint);
    }
    return content + techPhrase;
  }
}