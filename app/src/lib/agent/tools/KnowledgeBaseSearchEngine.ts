// Knowledge Base Search Engine - Searches and ranks relevant experience
import { KnowledgeItem } from '@/stores/useResumeStore';
import { RankedResult } from '../types';

export class KnowledgeBaseSearchEngine {
  private knowledgeBase: KnowledgeItem[];

  constructor(knowledgeBase: KnowledgeItem[]) {
    this.knowledgeBase = knowledgeBase;
  }

  /**
   * Search for relevant content based on analysis results
   */
  async searchRelevantContent(analysisResults: any): Promise<{
    relevantItems: RankedResult[];
    gaps: string[];
    totalSearched: number;
  }> {
    const { requiredSkills, atsKeywords, industryTerms, focusAreas } = analysisResults;
    
    // Combine all search criteria
    const searchCriteria = [
      ...atsKeywords,
      ...industryTerms,
      ...focusAreas,
      ...requiredSkills.flatMap((category: any) => category.skills),
    ];

    // Search for relevant items
    const relevantItems = await this.searchRelevantExperience(
      searchCriteria.join(' '), 
      Math.max(3, Math.ceil(this.knowledgeBase.length * 0.6)) // At least 3 items or 60% of KB
    );

    // Identify gaps
    const gaps = this.identifyGaps(searchCriteria, this.knowledgeBase);

    return {
      relevantItems,
      gaps,
      totalSearched: this.knowledgeBase.length,
    };
  }

  /**
   * Search relevant experience with relevance scoring (0-100)
   */
  async searchRelevantExperience(query: string, limit: number = 10): Promise<RankedResult[]> {
    if (this.knowledgeBase.length === 0) {
      return [];
    }

    const queryTerms = this.extractSearchTerms(query);
    const results: RankedResult[] = [];

    for (const item of this.knowledgeBase) {
      const relevanceScore = this.calculateRelevanceScore(item, queryTerms);
      
      if (relevanceScore > 0) {
        const matchingCriteria = this.getMatchingCriteria(item, queryTerms);
        const suggestedUsage = this.generateSuggestedUsage(item, matchingCriteria);

        results.push({
          item,
          relevanceScore,
          matchingCriteria,
          suggestedUsage,
        });
      }
    }

    // Sort by relevance score (descending) and return top results
    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  /**
   * Rank items by relevance with matching technologies/skills prioritized
   */
  rankByRelevance(items: KnowledgeItem[], criteria: string[]): RankedResult[] {
    const queryTerms = this.extractSearchTerms(criteria.join(' '));
    
    return items.map(item => {
      const relevanceScore = this.calculateRelevanceScore(item, queryTerms);
      const matchingCriteria = this.getMatchingCriteria(item, queryTerms);
      const suggestedUsage = this.generateSuggestedUsage(item, matchingCriteria);

      return {
        item,
        relevanceScore,
        matchingCriteria,
        suggestedUsage,
      };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Identify gaps between required skills and available knowledge
   */
  identifyGaps(required: string[], available: KnowledgeItem[]): string[] {
    const availableSkills = new Set<string>();
    
    // Extract all skills/technologies from available items
    available.forEach(item => {
      // Add tags
      item.tags.forEach(tag => availableSkills.add(tag.toLowerCase()));
      
      // Extract skills from content
      const contentSkills = this.extractSkillsFromContent(item.content);
      contentSkills.forEach(skill => availableSkills.add(skill.toLowerCase()));
    });

    // Find missing required skills
    const gaps: string[] = [];
    required.forEach(skill => {
      const skillLower = skill.toLowerCase();
      if (!availableSkills.has(skillLower) && 
          !Array.from(availableSkills).some(available => 
            available.includes(skillLower) || skillLower.includes(available)
          )) {
        gaps.push(skill);
      }
    });

    return gaps;
  }

  /**
   * Calculate relevance score (0-100) for an item
   */
  private calculateRelevanceScore(item: KnowledgeItem, queryTerms: string[]): number {
    let score = 0;
    const maxScore = 100;

    // Title matching (high weight)
    const titleMatches = this.countMatches(item.title.toLowerCase(), queryTerms);
    score += titleMatches * 15;

    // Content matching (medium weight)
    const contentMatches = this.countMatches(item.content.toLowerCase(), queryTerms);
    score += contentMatches * 8;

    // Tag matching (high weight - exact matches)
    const tagMatches = item.tags.filter(tag => 
      queryTerms.some(term => 
        tag.toLowerCase().includes(term) || term.includes(tag.toLowerCase())
      )
    ).length;
    score += tagMatches * 20;

    // Type-based bonus
    if (item.type === 'project' && queryTerms.some(term => 
      ['project', 'built', 'developed', 'created'].includes(term)
    )) {
      score += 10;
    }

    if (item.type === 'achievement' && queryTerms.some(term => 
      ['improved', 'increased', 'reduced', 'optimized'].includes(term)
    )) {
      score += 10;
    }

    // Quantified achievements bonus
    if (this.hasQuantifiedMetrics(item.content)) {
      score += 15;
    }

    return Math.min(score, maxScore);
  }

  /**
   * Extract search terms from query
   */
  private extractSearchTerms(query: string): string[] {
    return query
      .toLowerCase()
      .split(/\W+/)
      .filter(term => term.length > 2)
      .filter(term => !['the', 'and', 'for', 'with', 'using', 'from'].includes(term));
  }

  /**
   * Count matches between text and query terms
   */
  private countMatches(text: string, queryTerms: string[]): number {
    return queryTerms.reduce((count, term) => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = text.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  /**
   * Get matching criteria for an item
   */
  private getMatchingCriteria(item: KnowledgeItem, queryTerms: string[]): string[] {
    const matches: string[] = [];

    // Check title matches
    queryTerms.forEach(term => {
      if (item.title.toLowerCase().includes(term)) {
        matches.push(`Title: ${term}`);
      }
    });

    // Check tag matches
    item.tags.forEach(tag => {
      if (queryTerms.some(term => 
        tag.toLowerCase().includes(term) || term.includes(tag.toLowerCase())
      )) {
        matches.push(`Technology: ${tag}`);
      }
    });

    // Check content matches for key technologies
    const techTerms = queryTerms.filter(term => 
      /^(react|vue|angular|node|python|java|aws|docker|kubernetes|sql|mongodb|postgresql|redis|graphql|rest|api|javascript|typescript|go|rust|php|ruby|swift|kotlin|scala)$/i.test(term)
    );

    techTerms.forEach(term => {
      if (item.content.toLowerCase().includes(term)) {
        matches.push(`Experience: ${term}`);
      }
    });

    return [...new Set(matches)]; // Remove duplicates
  }

  /**
   * Generate suggested usage for an item
   */
  private generateSuggestedUsage(item: KnowledgeItem, matchingCriteria: string[]): string {
    const suggestions: string[] = [];

    switch (item.type) {
      case 'project':
        suggestions.push('Add to Projects section');
        if (matchingCriteria.some(c => c.includes('Technology'))) {
          suggestions.push('Highlight matching technologies');
        }
        if (this.hasQuantifiedMetrics(item.content)) {
          suggestions.push('Emphasize quantified results');
        }
        break;

      case 'achievement':
        suggestions.push('Include in relevant experience bullet');
        if (this.hasQuantifiedMetrics(item.content)) {
          suggestions.push('Use specific metrics');
        }
        break;

      case 'skill':
        suggestions.push('Add to Skills section');
        if (matchingCriteria.some(c => c.includes('Technology'))) {
          suggestions.push('Prioritize in skills list');
        }
        break;

      case 'experience':
        suggestions.push('Incorporate into Experience section');
        if (matchingCriteria.length > 2) {
          suggestions.push('Create dedicated bullet point');
        }
        break;
    }

    return suggestions.join(', ') || 'Include in relevant section';
  }

  /**
   * Check if content has quantified metrics
   */
  private hasQuantifiedMetrics(content: string): boolean {
    const metricPatterns = [
      /\d+%/,           // Percentages
      /\d+x/,           // Multipliers
      /\$\d+/,          // Dollar amounts
      /\d+\+?\s*(users?|customers?|requests?|transactions?)/i,
      /\d+\+?\s*(seconds?|minutes?|hours?|days?|weeks?|months?)/i,
      /\d+\+?\s*(MB|GB|TB|KB)/i,
      /reduced?\s+by\s+\d+/i,
      /increased?\s+by\s+\d+/i,
      /improved?\s+by\s+\d+/i,
    ];

    return metricPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Extract skills from content text
   */
  private extractSkillsFromContent(content: string): string[] {
    const skillPatterns = [
      /\b(?:JavaScript|TypeScript|Python|Java|C\+\+|C#|Go|Rust|PHP|Ruby|Swift|Kotlin|Scala)\b/gi,
      /\b(?:React|Vue|Angular|Node\.js|Express|Django|Flask|Spring|Laravel|Rails)\b/gi,
      /\b(?:MySQL|PostgreSQL|MongoDB|Redis|Elasticsearch|Cassandra|DynamoDB)\b/gi,
      /\b(?:AWS|Azure|GCP|Docker|Kubernetes|Jenkins|GitLab|Terraform|Ansible)\b/gi,
      /\b(?:Git|JIRA|Confluence|Figma|Sketch|Linux|Windows|macOS)\b/gi,
    ];

    const skills: string[] = [];
    skillPatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      skills.push(...matches);
    });

    return [...new Set(skills.map(s => s.toLowerCase()))];
  }

  /**
   * Get statistics about the knowledge base
   */
  getKnowledgeBaseStats(): {
    totalItems: number;
    itemsByType: Record<string, number>;
    totalTags: number;
    uniqueTags: string[];
    hasQuantifiedItems: number;
  } {
    const itemsByType: Record<string, number> = {};
    const allTags: string[] = [];
    let hasQuantifiedItems = 0;

    this.knowledgeBase.forEach(item => {
      // Count by type
      itemsByType[item.type] = (itemsByType[item.type] || 0) + 1;
      
      // Collect tags
      allTags.push(...item.tags);
      
      // Count quantified items
      if (this.hasQuantifiedMetrics(item.content)) {
        hasQuantifiedItems++;
      }
    });

    const uniqueTags = [...new Set(allTags)];

    return {
      totalItems: this.knowledgeBase.length,
      itemsByType,
      totalTags: allTags.length,
      uniqueTags,
      hasQuantifiedItems,
    };
  }
}