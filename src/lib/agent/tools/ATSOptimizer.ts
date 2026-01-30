// ATS Optimizer - Optimizes resume for ATS compatibility and scoring
import { ATSScore, ExecutionPlan, AgentConfig } from '../types';

export class ATSOptimizer {
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Optimize resume for ATS compatibility
   */
  async optimizeForATS(
    rewriteResults: any,
    planningResults: ExecutionPlan
  ): Promise<{
    optimizedLatex: string;
    atsScoreBefore: ATSScore;
    atsScoreAfter: ATSScore;
    optimizationChanges: Array<{
      type: 'keyword_density' | 'natural_flow' | 'structure';
      description: string;
      impact: number;
    }>;
    rollbackRequired: boolean;
  }> {
    const { rewrittenLatex } = rewriteResults;
    const { atsKeywords } = planningResults;

    // Calculate initial ATS score
    const atsScoreBefore = await this.calculateScore(rewrittenLatex, atsKeywords);

    // Apply ATS optimizations
    let optimizedLatex = rewrittenLatex;
    const optimizationChanges: Array<{
      type: 'keyword_density' | 'natural_flow' | 'structure';
      description: string;
      impact: number;
    }> = [];

    // Step 1: Optimize keyword density
    const keywordResult = await this.optimizeKeywordDensity(optimizedLatex, atsKeywords);
    if (keywordResult.improved) {
      optimizedLatex = keywordResult.optimizedContent;
      optimizationChanges.push({
        type: 'keyword_density',
        description: `Improved keyword coverage from ${atsScoreBefore.keywordCoverage}% to ${keywordResult.newCoverage}%`,
        impact: keywordResult.newCoverage - atsScoreBefore.keywordCoverage,
      });
    }

    // Step 2: Validate natural flow
    const flowResult = await this.validateNaturalFlow(optimizedLatex);
    if (!flowResult.isNatural) {
      const improvedFlow = await this.improveNaturalFlow(optimizedLatex, flowResult.issues);
      optimizedLatex = improvedFlow.content;
      optimizationChanges.push({
        type: 'natural_flow',
        description: `Fixed ${flowResult.issues.length} natural flow issues`,
        impact: 10, // Fixed impact for flow improvements
      });
    }

    // Step 3: Calculate final ATS score
    const atsScoreAfter = await this.calculateScore(optimizedLatex, atsKeywords);

    // Step 4: Check if rollback is required
    const rollbackRequired = atsScoreAfter.overall < atsScoreBefore.overall;
    if (rollbackRequired) {
      optimizedLatex = rewrittenLatex; // Revert to pre-optimization state
    }

    return {
      optimizedLatex,
      atsScoreBefore,
      atsScoreAfter: rollbackRequired ? atsScoreBefore : atsScoreAfter,
      optimizationChanges,
      rollbackRequired,
    };
  }

  /**
   * Calculate comprehensive ATS score (0-100)
   */
  async calculateScore(resume: string, keywords: string[]): Promise<ATSScore> {
    const resumeText = this.extractTextFromLatex(resume).toLowerCase();
    const resumeWords = resumeText.split(/\W+/).filter(w => w.length > 2);

    // Calculate keyword coverage
    const matchedKeywords: string[] = [];
    const missingKeywords: string[] = [];

    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      const isMatched = resumeWords.some(word => 
        word.includes(keywordLower) || keywordLower.includes(word) ||
        this.areKeywordsSimilar(word, keywordLower)
      );

      if (isMatched) {
        matchedKeywords.push(keyword);
      } else {
        missingKeywords.push(keyword);
      }
    });

    const keywordCoverage = keywords.length > 0 
      ? Math.round((matchedKeywords.length / keywords.length) * 100)
      : 0;

    // Calculate keyword density
    const keywordDensity = this.calculateKeywordDensity(resumeText, matchedKeywords);

    // Calculate natural flow score
    const naturalFlow = await this.calculateNaturalFlowScore(resumeText);

    // Calculate overall score
    const overall = Math.round(
      (keywordCoverage * 0.4) + 
      (keywordDensity * 0.3) + 
      (naturalFlow * 0.3)
    );

    return {
      overall,
      keywordCoverage,
      keywordDensity,
      naturalFlow,
      matchedKeywords,
      missingKeywords,
    };
  }

  /**
   * Optimize keyword density without stuffing
   */
  async optimizeKeywordDensity(
    content: string,
    keywords: string[]
  ): Promise<{
    improved: boolean;
    optimizedContent: string;
    newCoverage: number;
  }> {
    const currentScore = await this.calculateScore(content, keywords);
    
    // If already above threshold, don't modify
    if (currentScore.keywordCoverage >= this.config.keywordCoverageThreshold * 100) {
      return {
        improved: false,
        optimizedContent: content,
        newCoverage: currentScore.keywordCoverage,
      };
    }

    let optimizedContent = content;
    const missingKeywords = currentScore.missingKeywords.slice(0, 5); // Limit to 5 keywords

    // Add missing keywords naturally
    for (const keyword of missingKeywords) {
      const addResult = await this.addKeywordNaturally(optimizedContent, keyword);
      if (addResult.added) {
        optimizedContent = addResult.content;
      }
    }

    // Calculate new coverage
    const newScore = await this.calculateScore(optimizedContent, keywords);
    
    return {
      improved: newScore.keywordCoverage > currentScore.keywordCoverage,
      optimizedContent,
      newCoverage: newScore.keywordCoverage,
    };
  }

  /**
   * Validate natural sentence flow
   */
  async validateNaturalFlow(content: string): Promise<{
    isNatural: boolean;
    issues: Array<{
      type: 'keyword_stuffing' | 'awkward_phrasing' | 'repetition';
      location: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  }> {
    const text = this.extractTextFromLatex(content);
    const issues: Array<{
      type: 'keyword_stuffing' | 'awkward_phrasing' | 'repetition';
      location: string;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    // Check for keyword stuffing
    const sentences = text.split(/[.!?]+/);
    sentences.forEach((sentence, index) => {
      const words = sentence.split(/\W+/);
      const uniqueWords = new Set(words.map(w => w.toLowerCase()));
      
      // If sentence has less than 60% unique words, it might be stuffed
      if (words.length > 5 && uniqueWords.size / words.length < 0.6) {
        issues.push({
          type: 'keyword_stuffing',
          location: `Sentence ${index + 1}`,
          severity: 'high',
        });
      }
    });

    // Check for awkward phrasing patterns
    const awkwardPatterns = [
      /\b(\w+)\s+\1\b/gi, // Repeated words
      /\b(and|with|using)\s+(and|with|using)\b/gi, // Repeated conjunctions
      /\b\w+\s+\w+\s+\w+\s+\w+\s+\w+\s+and\b/gi, // Long lists without commas
    ];

    awkwardPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          issues.push({
            type: 'awkward_phrasing',
            location: `"${match}"`,
            severity: 'medium',
          });
        });
      }
    });

    // Check for excessive repetition
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 4);
    const wordCounts = words.reduce((counts, word) => {
      counts[word] = (counts[word] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    Object.entries(wordCounts).forEach(([word, count]) => {
      if (count > 5) { // Word appears more than 5 times
        issues.push({
          type: 'repetition',
          location: `Word "${word}" (${count} times)`,
          severity: count > 8 ? 'high' : 'medium',
        });
      }
    });

    return {
      isNatural: issues.filter(i => i.severity === 'high').length === 0,
      issues,
    };
  }

  /**
   * Explain score improvements
   */
  explainScoreImprovement(before: ATSScore, after: ATSScore): string[] {
    const explanations: string[] = [];

    if (after.overall > before.overall) {
      explanations.push(`Overall ATS score improved by ${after.overall - before.overall} points`);
    }

    if (after.keywordCoverage > before.keywordCoverage) {
      const newKeywords = after.matchedKeywords.filter(k => !before.matchedKeywords.includes(k));
      explanations.push(`Added ${newKeywords.length} new keywords: ${newKeywords.join(', ')}`);
    }

    if (after.keywordDensity > before.keywordDensity) {
      explanations.push(`Improved keyword density from ${before.keywordDensity}% to ${after.keywordDensity}%`);
    }

    if (after.naturalFlow > before.naturalFlow) {
      explanations.push(`Enhanced natural flow score by ${after.naturalFlow - before.naturalFlow} points`);
    }

    if (explanations.length === 0) {
      explanations.push('No significant improvements detected');
    }

    return explanations;
  }

  // Private helper methods

  private extractTextFromLatex(latex: string): string {
    return latex
      .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?(\{[^}]*\})?/g, '') // Remove LaTeX commands
      .replace(/[{}]/g, '') // Remove braces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private areKeywordsSimilar(word1: string, word2: string): boolean {
    // Check for common variations
    const variations = [
      ['js', 'javascript'],
      ['ts', 'typescript'],
      ['react', 'reactjs'],
      ['node', 'nodejs'],
      ['aws', 'amazon web services'],
      ['gcp', 'google cloud platform'],
      ['k8s', 'kubernetes'],
    ];

    return variations.some(([short, long]) => 
      (word1 === short && word2 === long) || 
      (word1 === long && word2 === short)
    );
  }

  private calculateKeywordDensity(text: string, keywords: string[]): number {
    const words = text.split(/\W+/).filter(w => w.length > 2);
    const keywordCount = keywords.reduce((count, keyword) => {
      const keywordLower = keyword.toLowerCase();
      return count + words.filter(word => 
        word.toLowerCase().includes(keywordLower)
      ).length;
    }, 0);

    const density = words.length > 0 ? (keywordCount / words.length) * 100 : 0;
    
    // Optimal density is 2-5%, penalize if too high or too low
    if (density < 1) return Math.round(density * 20); // Scale up low density
    if (density > 8) return Math.round(100 - (density - 8) * 10); // Penalize high density
    return Math.round(Math.min(density * 20, 100)); // Scale to 0-100
  }

  private async calculateNaturalFlowScore(text: string): Promise<number> {
    let score = 100;

    // Penalize for awkward patterns
    const awkwardPatterns = [
      /\b(\w+)\s+\1\b/gi, // Repeated words
      /\b(and|with|using)\s+(and|with|using)\b/gi, // Repeated conjunctions
    ];

    awkwardPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      score -= matches.length * 10; // -10 points per awkward pattern
    });

    // Penalize for excessive keyword density in sentences
    const sentences = text.split(/[.!?]+/);
    sentences.forEach(sentence => {
      const words = sentence.split(/\W+/);
      if (words.length > 5) {
        const uniqueWords = new Set(words.map(w => w.toLowerCase()));
        const uniqueRatio = uniqueWords.size / words.length;
        if (uniqueRatio < 0.6) {
          score -= 15; // -15 points for potential keyword stuffing
        }
      }
    });

    return Math.max(score, 0);
  }

  private async addKeywordNaturally(
    content: string,
    keyword: string
  ): Promise<{ added: boolean; content: string }> {
    // Find natural insertion points
    const insertionPatterns = [
      /(\busing\s+)([^.]+)/gi,
      /(\bwith\s+)([^.]+)/gi,
      /(\bimplementing\s+)([^.]+)/gi,
      /(\bdeveloping\s+)([^.]+)/gi,
      /(\bbuilding\s+)([^.]+)/gi,
    ];

    for (const pattern of insertionPatterns) {
      const match = content.match(pattern);
      if (match && !match[0].toLowerCase().includes(keyword.toLowerCase())) {
        // Add keyword to the existing list
        const newContent = content.replace(
          pattern,
          `$1$2, ${keyword}`
        );
        return { added: true, content: newContent };
      }
    }

    // If no natural insertion point found, try to add to skills section
    const skillsPattern = /(\\textbf\{[^}]*Skills[^}]*\}[^\\]*)(\\textbf\{[^}]*\}:\s*)([^\\]+)/i;
    const skillsMatch = content.match(skillsPattern);
    
    if (skillsMatch && !skillsMatch[3].toLowerCase().includes(keyword.toLowerCase())) {
      const newContent = content.replace(
        skillsPattern,
        `$1$2$3, ${keyword}`
      );
      return { added: true, content: newContent };
    }

    return { added: false, content };
  }

  private async improveNaturalFlow(
    content: string,
    issues: Array<{
      type: 'keyword_stuffing' | 'awkward_phrasing' | 'repetition';
      location: string;
      severity: 'low' | 'medium' | 'high';
    }>
  ): Promise<{ content: string }> {
    let improvedContent = content;

    // Fix high severity issues
    const highSeverityIssues = issues.filter(i => i.severity === 'high');
    
    for (const issue of highSeverityIssues) {
      switch (issue.type) {
        case 'keyword_stuffing':
          improvedContent = this.fixKeywordStuffing(improvedContent);
          break;
        case 'awkward_phrasing':
          improvedContent = this.fixAwkwardPhrasing(improvedContent);
          break;
        case 'repetition':
          improvedContent = this.fixRepetition(improvedContent);
          break;
      }
    }

    return { content: improvedContent };
  }

  private fixKeywordStuffing(content: string): string {
    // Remove excessive repetition of keywords in the same sentence
    const sentences = content.split(/([.!?]+)/);
    
    return sentences.map(sentence => {
      if (sentence.match(/[.!?]+/)) return sentence; // Keep punctuation
      
      const words = sentence.split(/(\s+)/);
      const cleanedWords: string[] = [];
      const seenWords = new Set<string>();
      
      words.forEach(word => {
        const cleanWord = word.toLowerCase().replace(/\W/g, '');
        if (cleanWord.length > 3 && seenWords.has(cleanWord)) {
          // Skip repeated word, but keep spacing
          if (word.match(/\s/)) cleanedWords.push(word);
        } else {
          cleanedWords.push(word);
          if (cleanWord.length > 3) seenWords.add(cleanWord);
        }
      });
      
      return cleanedWords.join('');
    }).join('');
  }

  private fixAwkwardPhrasing(content: string): string {
    return content
      .replace(/\b(and|with|using)\s+(and|with|using)\b/gi, '$1') // Remove repeated conjunctions
      .replace(/\b(\w+)\s+\1\b/gi, '$1') // Remove repeated words
      .replace(/,\s*,/g, ',') // Fix double commas
      .replace(/\s+/g, ' '); // Normalize spacing
  }

  private fixRepetition(content: string): string {
    // Replace some instances of overused words with synonyms
    const synonyms: Record<string, string[]> = {
      'developed': ['built', 'created', 'implemented', 'designed'],
      'improved': ['enhanced', 'optimized', 'increased', 'boosted'],
      'managed': ['led', 'oversaw', 'coordinated', 'supervised'],
      'created': ['developed', 'built', 'designed', 'established'],
    };

    let improvedContent = content;
    
    Object.entries(synonyms).forEach(([word, alternatives]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = improvedContent.match(regex) || [];
      
      if (matches.length > 3) {
        // Replace some instances with synonyms
        let replacementIndex = 0;
        improvedContent = improvedContent.replace(regex, (match) => {
          if (replacementIndex % 2 === 1 && alternatives.length > 0) {
            const synonym = alternatives[replacementIndex % alternatives.length];
            replacementIndex++;
            return match.charAt(0).toUpperCase() + synonym.slice(1);
          }
          replacementIndex++;
          return match;
        });
      }
    });

    return improvedContent;
  }
}