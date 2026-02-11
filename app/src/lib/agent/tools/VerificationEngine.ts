// Verification Engine - Verifies and validates optimization results
import { VerificationResult, ValidationResult, RedundancyReport, CritiqueResult, AgentConfig } from '../types';
import { KnowledgeItem } from '@/stores/useResumeStore';

export class VerificationEngine {
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Verify optimization results comprehensively
   */
  async verifyResults(
    optimizationResults: any,
    knowledgeBase: KnowledgeItem[]
  ): Promise<{
    passed: boolean;
    optimizedLatex: string;
    verificationResult: VerificationResult;
    validationResult: ValidationResult;
    redundancyReport: RedundancyReport;
    critiqueResult?: CritiqueResult;
    autoFixedIssues: string[];
    escalationRequired: boolean;
  }> {
    const { optimizedLatex } = optimizationResults;
    let currentLatex = optimizedLatex;
    const autoFixedIssues: string[] = [];
    let attemptCount = 0;
    const maxAttempts = 3;

    while (attemptCount < maxAttempts) {
      attemptCount++;

      // Step 1: Verify factual accuracy
      const verificationResult = await this.verifyFactualAccuracy(currentLatex, knowledgeBase);

      // Step 2: Validate LaTeX syntax
      const validationResult = await this.validateLaTeXSyntax(currentLatex);

      // Step 3: Detect redundancy
      const redundancyReport = await this.detectRedundancy(currentLatex);

      // Step 4: Perform self-critique if enabled
      let critiqueResult: CritiqueResult | undefined;
      if (this.config.enableSelfCritique) {
        critiqueResult = await this.performSelfCritique({
          ...optimizationResults,
          optimizedLatex: currentLatex,
        });
      }

      // Step 5: Auto-fix issues if possible
      const fixResult = await this.autoFixIssues(
        currentLatex,
        verificationResult,
        validationResult,
        redundancyReport
      );

      if (fixResult.fixed) {
        currentLatex = fixResult.fixedLatex;
        autoFixedIssues.push(...fixResult.fixedIssues);
        continue; // Re-verify after fixes
      }

      // Step 6: Determine if verification passed
      const passed = this.determineVerificationStatus(
        verificationResult,
        validationResult,
        redundancyReport,
        critiqueResult
      );

      const escalationRequired = !passed && attemptCount >= maxAttempts;

      return {
        passed,
        optimizedLatex: currentLatex,
        verificationResult,
        validationResult,
        redundancyReport,
        critiqueResult,
        autoFixedIssues,
        escalationRequired,
      };
    }

    // If we reach here, max attempts exceeded
    return {
      passed: false,
      optimizedLatex: currentLatex,
      verificationResult: { isAccurate: false, inaccuracies: [], confidence: 0 },
      validationResult: { isValid: false, errors: [], warnings: [] },
      redundancyReport: { duplicates: [], redundancyScore: 0 },
      autoFixedIssues,
      escalationRequired: true,
    };
  }

  /**
   * Verify factual accuracy against knowledge base
   */
  async verifyFactualAccuracy(
    content: string,
    knowledgeBase: KnowledgeItem[]
  ): Promise<VerificationResult> {
    const claims = this.extractFactualClaims(content);
    const inaccuracies: Array<{
      claim: string;
      reason: string;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    let accurateClaimsCount = 0;

    for (const claim of claims) {
      const verification = await this.verifyClaim(claim, knowledgeBase);
      
      if (verification.isSupported) {
        accurateClaimsCount++;
      } else {
        inaccuracies.push({
          claim: claim.text,
          reason: verification.reason,
          severity: this.assessClaimSeverity(claim),
        });
      }
    }

    const confidence = claims.length > 0 
      ? Math.round((accurateClaimsCount / claims.length) * 100) / 100
      : 1.0;

    const isAccurate = inaccuracies.filter(i => i.severity === 'high').length === 0;

    return {
      isAccurate,
      inaccuracies,
      confidence,
    };
  }

  /**
   * Validate LaTeX syntax and compilation
   */
  async validateLaTeXSyntax(latex: string): Promise<ValidationResult> {
    const errors: Array<{
      line: number;
      message: string;
      type: string;
    }> = [];
    
    const warnings: Array<{
      line: number;
      message: string;
      type: string;
    }> = [];

    const lines = latex.split('\n');

    // Check for common LaTeX syntax errors
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Check brace matching
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        errors.push({
          line: lineNumber,
          message: `Mismatched braces: ${openBraces} open, ${closeBraces} close`,
          type: 'syntax',
        });
      }

      // Check for unescaped special characters
      const unescapedChars = line.match(/(?<!\\)[&%#$]/g);
      if (unescapedChars) {
        warnings.push({
          line: lineNumber,
          message: `Unescaped special characters: ${unescapedChars.join(', ')}`,
          type: 'formatting',
        });
      }

      // Check for malformed commands (but exclude known valid patterns)
      // Allow: fontawesome commands (fa*), commands followed by }, ], ), \, or end of line
      const potentialMalformed = line.match(/\\[a-zA-Z]+[^a-zA-Z\s\{\[\*\}\]\)\\,.:;!?~\-]/g);
      if (potentialMalformed) {
        // Filter out known valid command patterns (fontawesome, etc.)
        const knownValidPrefixes = ['\\fa', '\\textbf', '\\textit', '\\href', '\\url', '\\item'];
        const actualMalformed = potentialMalformed.filter(cmd => 
          !knownValidPrefixes.some(prefix => cmd.startsWith(prefix))
        );
        if (actualMalformed.length > 0) {
          errors.push({
            line: lineNumber,
            message: `Malformed commands: ${actualMalformed.join(', ')}`,
            type: 'command',
          });
        }
      }

      // Check for missing required packages
      if (line.includes('\\faEnvelope') && !latex.includes('\\usepackage{fontawesome')) {
        warnings.push({
          line: lineNumber,
          message: 'FontAwesome icons used but package not included',
          type: 'package',
        });
      }
    }

    // Global checks
    if (!latex.includes('\\documentclass')) {
      errors.push({
        line: 1,
        message: 'Missing \\documentclass declaration',
        type: 'structure',
      });
    }

    if (!latex.includes('\\begin{document}')) {
      errors.push({
        line: 1,
        message: 'Missing \\begin{document}',
        type: 'structure',
      });
    }

    if (!latex.includes('\\end{document}')) {
      errors.push({
        line: lines.length,
        message: 'Missing \\end{document}',
        type: 'structure',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Detect redundancy in content
   */
  async detectRedundancy(content: string): Promise<RedundancyReport> {
    const text = this.extractTextFromLatex(content);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    const duplicates: Array<{
      content: string;
      locations: string[];
      severity: 'low' | 'medium' | 'high';
    }> = [];

    // Check for duplicate sentences
    const sentenceMap = new Map<string, number[]>();
    sentences.forEach((sentence, index) => {
      const normalized = this.normalizeSentence(sentence);
      if (!sentenceMap.has(normalized)) {
        sentenceMap.set(normalized, []);
      }
      sentenceMap.get(normalized)!.push(index);
    });

    sentenceMap.forEach((indices, sentence) => {
      if (indices.length > 1) {
        duplicates.push({
          content: sentence,
          locations: indices.map(i => `Sentence ${i + 1}`),
          severity: indices.length > 2 ? 'high' : 'medium',
        });
      }
    });

    // Check for repeated phrases
    const phrases = this.extractPhrases(text);
    const phraseMap = new Map<string, number>();
    
    phrases.forEach(phrase => {
      phraseMap.set(phrase, (phraseMap.get(phrase) || 0) + 1);
    });

    phraseMap.forEach((count, phrase) => {
      if (count > 3 && phrase.length > 20) {
        duplicates.push({
          content: phrase,
          locations: [`Repeated ${count} times`],
          severity: count > 5 ? 'high' : 'medium',
        });
      }
    });

    // Calculate redundancy score
    const totalContent = sentences.length;
    const redundantContent = duplicates.reduce((sum, dup) => 
      sum + (dup.severity === 'high' ? 3 : dup.severity === 'medium' ? 2 : 1), 0
    );
    
    const redundancyScore = totalContent > 0 
      ? Math.min(Math.round((redundantContent / totalContent) * 100), 100)
      : 0;

    return {
      duplicates,
      redundancyScore,
    };
  }

  /**
   * Perform self-critique on optimization results
   */
  async performSelfCritique(result: any): Promise<CritiqueResult> {
    const { optimizedLatex, atsScoreAfter } = result;
    const changesApplied = result.changesApplied || result.optimizationChanges || [];
    
    const issues: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
      suggestion: string;
    }> = [];

    const recommendations: string[] = [];

    // Critique ATS score
    if (atsScoreAfter && atsScoreAfter.overall < 70) {
      issues.push({
        type: 'ats_score',
        description: `ATS score of ${atsScoreAfter.overall}% is below optimal threshold`,
        severity: 'high',
        suggestion: 'Add more relevant keywords or improve keyword placement',
      });
    }

    // Critique keyword coverage
    if (atsScoreAfter && atsScoreAfter.keywordCoverage < 60) {
      issues.push({
        type: 'keyword_coverage',
        description: `Only ${atsScoreAfter.keywordCoverage}% of keywords are covered`,
        severity: 'medium',
        suggestion: 'Include more job-relevant keywords in experience descriptions',
      });
    }

    // Critique natural flow
    if (atsScoreAfter && atsScoreAfter.naturalFlow < 80) {
      issues.push({
        type: 'natural_flow',
        description: 'Content may sound unnatural or keyword-stuffed',
        severity: 'medium',
        suggestion: 'Revise content to improve readability and flow',
      });
    }

    // Critique changes applied
    if (changesApplied && changesApplied.length < 3) {
      issues.push({
        type: 'insufficient_changes',
        description: 'Very few changes were applied during optimization',
        severity: 'low',
        suggestion: 'Consider more aggressive optimization or add more knowledge base items',
      });
    }

    // Generate recommendations
    if (atsScoreAfter && atsScoreAfter.missingKeywords && atsScoreAfter.missingKeywords.length > 0) {
      recommendations.push(`Consider adding these missing keywords: ${atsScoreAfter.missingKeywords.slice(0, 3).join(', ')}`);
    }

    if (issues.filter(i => i.severity === 'high').length === 0) {
      recommendations.push('Resume optimization appears successful with good ATS compatibility');
    }

    // Calculate overall score
    const severityWeights = { high: 3, medium: 2, low: 1 };
    const totalIssueWeight = issues.reduce((sum, issue) => sum + severityWeights[issue.severity], 0);
    const overallScore = Math.max(0, 100 - (totalIssueWeight * 10));

    return {
      issues,
      overallScore,
      recommendations,
    };
  }

  /**
   * Auto-fix issues when possible
   */
  private async autoFixIssues(
    latex: string,
    verificationResult: VerificationResult,
    validationResult: ValidationResult,
    redundancyReport: RedundancyReport
  ): Promise<{
    fixed: boolean;
    fixedLatex: string;
    fixedIssues: string[];
  }> {
    let fixedLatex = latex;
    const fixedIssues: string[] = [];
    let hasChanges = false;

    // Fix LaTeX syntax errors
    for (const error of validationResult.errors) {
      const fixResult = await this.fixLatexError(fixedLatex, error);
      if (fixResult.fixed) {
        fixedLatex = fixResult.content;
        fixedIssues.push(`Fixed ${error.type} error: ${error.message}`);
        hasChanges = true;
      }
    }

    // Fix redundancy issues
    if (redundancyReport.redundancyScore > 20) {
      const dedupeResult = await this.removeRedundancy(fixedLatex, redundancyReport);
      if (dedupeResult.fixed) {
        fixedLatex = dedupeResult.content;
        fixedIssues.push(`Removed ${dedupeResult.removedCount} redundant items`);
        hasChanges = true;
      }
    }

    // Fix high-severity inaccuracies
    const highSeverityInaccuracies = verificationResult.inaccuracies.filter(i => i.severity === 'high');
    for (const inaccuracy of highSeverityInaccuracies) {
      const fixResult = await this.fixInaccuracy(fixedLatex, inaccuracy);
      if (fixResult.fixed) {
        fixedLatex = fixResult.content;
        fixedIssues.push(`Fixed inaccuracy: ${inaccuracy.claim}`);
        hasChanges = true;
      }
    }

    return {
      fixed: hasChanges,
      fixedLatex,
      fixedIssues,
    };
  }

  // Helper methods

  private extractFactualClaims(content: string): Array<{
    text: string;
    type: 'metric' | 'technology' | 'achievement' | 'experience';
    confidence: number;
  }> {
    const text = this.extractTextFromLatex(content);
    const claims: Array<{
      text: string;
      type: 'metric' | 'technology' | 'achievement' | 'experience';
      confidence: number;
    }> = [];

    // Extract metric claims
    const metricPatterns = [
      /\d+%\s+\w+/g,
      /\$\d+[\d,]*/g,
      /\d+\+?\s*(?:users?|customers?|requests?|transactions?)/gi,
      /reduced?\s+by\s+\d+/gi,
      /increased?\s+by\s+\d+/gi,
    ];

    metricPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(match => {
        claims.push({
          text: match,
          type: 'metric',
          confidence: 0.8, // Metrics are usually specific and verifiable
        });
      });
    });

    // Extract technology claims
    const techPattern = /\b(?:JavaScript|TypeScript|Python|Java|React|Vue|Angular|Node\.js|AWS|Docker|Kubernetes)\b/gi;
    const techMatches = text.match(techPattern) || [];
    techMatches.forEach(tech => {
      claims.push({
        text: tech,
        type: 'technology',
        confidence: 0.9, // Technologies are easily verifiable
      });
    });

    return claims;
  }

  private async verifyClaim(
    claim: { text: string; type: string; confidence: number },
    knowledgeBase: KnowledgeItem[]
  ): Promise<{ isSupported: boolean; reason: string }> {
    const claimText = claim.text.toLowerCase();

    // Check if claim is supported by knowledge base
    const supportingItems = knowledgeBase.filter(item => 
      item.content.toLowerCase().includes(claimText) ||
      item.tags.some(tag => tag.toLowerCase().includes(claimText))
    );

    if (supportingItems.length > 0) {
      return {
        isSupported: true,
        reason: `Supported by ${supportingItems.length} knowledge base item(s)`,
      };
    }

    // For technology claims, be more lenient
    if (claim.type === 'technology') {
      const hasRelatedTech = knowledgeBase.some(item => 
        item.tags.some(tag => this.areTechnologiesRelated(claimText, tag.toLowerCase()))
      );
      
      if (hasRelatedTech) {
        return {
          isSupported: true,
          reason: 'Related technology found in knowledge base',
        };
      }
    }

    return {
      isSupported: false,
      reason: 'No supporting evidence found in knowledge base',
    };
  }

  private assessClaimSeverity(claim: { text: string; type: string }): 'low' | 'medium' | 'high' {
    switch (claim.type) {
      case 'metric':
        return 'high'; // Metrics should be accurate
      case 'achievement':
        return 'medium'; // Achievements are important but can be softened
      case 'technology':
        return 'low'; // Technologies can be inferred from related experience
      default:
        return 'medium';
    }
  }

  private extractTextFromLatex(latex: string): string {
    return latex
      .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?(\{[^}]*\})?/g, '')
      .replace(/[{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeSentence(sentence: string): string {
    return sentence
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractPhrases(text: string): string[] {
    const words = text.split(/\s+/);
    const phrases: string[] = [];
    
    // Extract 4-word phrases
    for (let i = 0; i <= words.length - 4; i++) {
      const phrase = words.slice(i, i + 4).join(' ');
      if (phrase.length > 15) {
        phrases.push(phrase);
      }
    }
    
    return phrases;
  }

  private determineVerificationStatus(
    verificationResult: VerificationResult,
    validationResult: ValidationResult,
    redundancyReport: RedundancyReport,
    critiqueResult?: CritiqueResult
  ): boolean {
    // Must pass all critical checks
    if (!validationResult.isValid) return false;
    if (!verificationResult.isAccurate) return false;
    if (redundancyReport.redundancyScore > 30) return false;
    
    // If self-critique is enabled, check overall score
    if (critiqueResult && critiqueResult.overallScore < 60) return false;
    
    return true;
  }

  private async fixLatexError(
    latex: string,
    error: { line: number; message: string; type: string }
  ): Promise<{ fixed: boolean; content: string }> {
    let fixedLatex = latex;
    let fixed = false;

    switch (error.type) {
      case 'syntax':
        if (error.message.includes('Mismatched braces')) {
          // Try to fix brace mismatches
          const lines = latex.split('\n');
          const line = lines[error.line - 1];
          const openBraces = (line.match(/\{/g) || []).length;
          const closeBraces = (line.match(/\}/g) || []).length;
          
          if (openBraces > closeBraces) {
            lines[error.line - 1] = line + '}'.repeat(openBraces - closeBraces);
            fixedLatex = lines.join('\n');
            fixed = true;
          }
        }
        break;
        
      case 'command':
        // Fix malformed commands by adding proper spacing
        // But skip fontawesome commands (fa*) and other known valid patterns
        fixedLatex = latex.replace(/\\([a-zA-Z]+)([^a-zA-Z\s\{\[\*\}\]\)\\,.:;!?~\-])/g, (match, cmd, char) => {
          // Don't "fix" fontawesome commands - they're valid
          if (cmd.startsWith('fa')) {
            return match;
          }
          return `\\${cmd} ${char}`;
        });
        fixed = true;
        break;
    }

    return { fixed, content: fixedLatex };
  }

  private async removeRedundancy(
    latex: string,
    redundancyReport: RedundancyReport
  ): Promise<{ fixed: boolean; content: string; removedCount: number }> {
    let fixedLatex = latex;
    let removedCount = 0;

    // Remove high-severity duplicates
    const highSeverityDuplicates = redundancyReport.duplicates.filter(d => d.severity === 'high');
    
    for (const duplicate of highSeverityDuplicates) {
      // Remove duplicate sentences (keep first occurrence)
      const sentences = duplicate.content;
      const regex = new RegExp(this.escapeRegex(sentences), 'gi');
      const matches = fixedLatex.match(regex) || [];
      
      if (matches.length > 1) {
        // Remove all but the first occurrence
        let firstFound = false;
        fixedLatex = fixedLatex.replace(regex, (match) => {
          if (!firstFound) {
            firstFound = true;
            return match;
          }
          removedCount++;
          return '';
        });
      }
    }

    return {
      fixed: removedCount > 0,
      content: fixedLatex,
      removedCount,
    };
  }

  private async fixInaccuracy(
    latex: string,
    inaccuracy: { claim: string; reason: string; severity: 'low' | 'medium' | 'high' }
  ): Promise<{ fixed: boolean; content: string }> {
    // For high-severity inaccuracies, remove or soften the claim
    if (inaccuracy.severity === 'high') {
      const fixedLatex = latex.replace(inaccuracy.claim, '');
      return { fixed: true, content: fixedLatex };
    }

    return { fixed: false, content: latex };
  }

  private areTechnologiesRelated(tech1: string, tech2: string): boolean {
    const relatedTechs = [
      ['javascript', 'js', 'node', 'nodejs', 'react', 'vue', 'angular'],
      ['python', 'django', 'flask', 'fastapi'],
      ['aws', 'amazon web services', 'ec2', 's3', 'lambda'],
      ['docker', 'kubernetes', 'k8s', 'containers'],
    ];

    return relatedTechs.some(group => 
      group.includes(tech1) && group.includes(tech2)
    );
  }

  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}