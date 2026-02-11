// Result Presenter - Formats and presents optimization results
import { ChangeDescription, ATSScore } from '../types';

export class ResultPresenter {
  
  /**
   * Present comprehensive optimization results
   */
  async presentResults(
    originalLatex: string,
    optimizedLatex: string,
    optimizationResults: any,
    verificationResults: any
  ): Promise<{
    atsScoreBefore: number;
    atsScoreAfter: number;
    changes: ChangeDescription[];
    summary: string;
    recommendations: string[];
    metrics: {
      sectionsModified: number;
      keywordsAdded: number;
      improvementPercentage: number;
      verificationPassed: boolean;
    };
  }> {
    // Safely destructure with defaults
    const atsScoreBefore = optimizationResults?.atsScoreBefore || { overall: 0 };
    const atsScoreAfter = optimizationResults?.atsScoreAfter || { overall: 0 };
    const changesApplied = optimizationResults?.changesApplied || [];
    const sectionsModified = optimizationResults?.sectionsModified || [];
    const verificationResult = verificationResults?.verificationResult || {};
    const autoFixedIssues = verificationResults?.autoFixedIssues || [];
    const verificationPassed = verificationResults?.passed ?? false;

    // Format changes for presentation
    const changes = this.formatChanges(changesApplied, autoFixedIssues);

    // Generate summary
    const summary = this.generateSummary(
      atsScoreBefore,
      atsScoreAfter,
      sectionsModified,
      verificationPassed
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      atsScoreAfter,
      verificationResult,
      optimizationResults || {}
    );

    // Calculate metrics
    const metrics = this.calculateMetrics(
      originalLatex,
      optimizedLatex,
      atsScoreBefore,
      atsScoreAfter,
      sectionsModified,
      verificationPassed
    );

    return {
      atsScoreBefore: atsScoreBefore?.overall ?? 0,
      atsScoreAfter: atsScoreAfter?.overall ?? 0,
      changes,
      summary,
      recommendations,
      metrics,
    };
  }

  /**
   * Format changes for user-friendly presentation
   */
  private formatChanges(
    changesApplied: any[] | undefined,
    autoFixedIssues: string[] | undefined
  ): ChangeDescription[] {
    const formattedChanges: ChangeDescription[] = [];

    // Format optimization changes
    (changesApplied || []).forEach(change => {
      formattedChanges.push({
        section: change.section || 'General',
        changeType: change.changeType || 'content',
        description: this.enhanceChangeDescription(change.description),
        impact: this.quantifyImpact(change),
        confidence: change.confidence || 0.8,
      });
    });

    // Format auto-fixed issues
    (autoFixedIssues || []).forEach(issue => {
      formattedChanges.push({
        section: 'Quality Assurance',
        changeType: 'structure',
        description: issue,
        impact: 'Improved document quality',
        confidence: 0.95,
      });
    });

    // Sort by confidence and impact
    return formattedChanges.sort((a, b) => {
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }
      return this.getImpactWeight(b.impact) - this.getImpactWeight(a.impact);
    });
  }

  /**
   * Generate comprehensive summary
   */
  private generateSummary(
    atsScoreBefore: ATSScore,
    atsScoreAfter: ATSScore,
    sectionsModified: string[],
    verificationPassed: boolean
  ): string {
    const scoreImprovement = atsScoreAfter.overall - atsScoreBefore.overall;
    const keywordImprovement = atsScoreAfter.keywordCoverage - atsScoreBefore.keywordCoverage;
    
    let summary = `Resume optimization completed successfully. `;
    
    // ATS Score Summary
    if (scoreImprovement > 0) {
      summary += `ATS compatibility improved by ${scoreImprovement} points (${atsScoreBefore.overall}% → ${atsScoreAfter.overall}%). `;
    } else if (scoreImprovement === 0) {
      summary += `ATS score maintained at ${atsScoreAfter.overall}%. `;
    } else {
      summary += `ATS score decreased by ${Math.abs(scoreImprovement)} points. Changes were reverted to preserve quality. `;
    }

    // Keyword Coverage Summary
    if (keywordImprovement > 0) {
      summary += `Keyword coverage increased by ${keywordImprovement}% with ${atsScoreAfter.matchedKeywords.length} relevant keywords now included. `;
    }

    // Sections Modified Summary
    if (sectionsModified.length > 0) {
      summary += `Modified ${sectionsModified.length} section${sectionsModified.length > 1 ? 's' : ''}: ${sectionsModified.join(', ')}. `;
    }

    // Verification Summary
    if (verificationPassed) {
      summary += `All quality checks passed successfully.`;
    } else {
      summary += `Some quality issues were detected and automatically resolved where possible.`;
    }

    return summary;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    atsScoreAfter: ATSScore,
    verificationResult: any,
    optimizationResults: any
  ): string[] {
    const recommendations: string[] = [];

    // ATS Score Recommendations
    if (atsScoreAfter.overall < 70) {
      recommendations.push(`🎯 Target ATS Score: Your current score of ${atsScoreAfter.overall}% could be improved. Consider adding more relevant keywords from the job description.`);
    } else if (atsScoreAfter.overall >= 85) {
      recommendations.push(`✅ Excellent ATS Score: Your ${atsScoreAfter.overall}% score indicates strong keyword alignment with the job requirements.`);
    } else {
      recommendations.push(`📈 Good ATS Score: Your ${atsScoreAfter.overall}% score is solid. Minor keyword additions could push it higher.`);
    }

    // Keyword Coverage Recommendations
    if (atsScoreAfter.keywordCoverage < 60) {
      const missingKeywords = atsScoreAfter.missingKeywords.slice(0, 3);
      recommendations.push(`🔑 Missing Keywords: Consider incorporating these important terms: ${missingKeywords.join(', ')}.`);
    }

    // Natural Flow Recommendations
    if (atsScoreAfter.naturalFlow < 80) {
      recommendations.push(`📝 Content Flow: Review the resume for natural readability. Avoid keyword stuffing while maintaining professional tone.`);
    }

    // Knowledge Base Recommendations
    const kbGaps = optimizationResults.retrievalResults?.gaps || [];
    if (kbGaps.length > 0) {
      recommendations.push(`📚 Knowledge Base: Add more details about ${kbGaps.slice(0, 2).join(' and ')} to your knowledge base for better optimization.`);
    }

    // Verification Recommendations
    if (verificationResult && !verificationResult.isAccurate) {
      const highSeverityIssues = verificationResult.inaccuracies.filter((i: any) => i.severity === 'high');
      if (highSeverityIssues.length > 0) {
        recommendations.push(`⚠️ Accuracy Check: Review claims about ${highSeverityIssues[0].claim} to ensure they're supported by your experience.`);
      }
    }

    // Success Recommendations
    if (recommendations.length === 0 || atsScoreAfter.overall >= 85) {
      recommendations.push(`🚀 Ready to Apply: Your resume is well-optimized for this position. Consider customizing the summary for different roles.`);
    }

    return recommendations.slice(0, 5); // Limit to 5 most important recommendations
  }

  /**
   * Calculate presentation metrics
   */
  private calculateMetrics(
    originalLatex: string,
    optimizedLatex: string,
    atsScoreBefore: ATSScore,
    atsScoreAfter: ATSScore,
    sectionsModified: string[],
    verificationPassed: boolean
  ): {
    sectionsModified: number;
    keywordsAdded: number;
    improvementPercentage: number;
    verificationPassed: boolean;
  } {
    const keywordsAdded = atsScoreAfter.matchedKeywords.length - atsScoreBefore.matchedKeywords.length;
    const improvementPercentage = atsScoreBefore.overall > 0 
      ? Math.round(((atsScoreAfter.overall - atsScoreBefore.overall) / atsScoreBefore.overall) * 100)
      : 0;

    return {
      sectionsModified: sectionsModified.length,
      keywordsAdded: Math.max(0, keywordsAdded),
      improvementPercentage,
      verificationPassed,
    };
  }

  /**
   * Enhance change descriptions for better readability
   */
  private enhanceChangeDescription(description: string): string {
    // Add emojis and improve formatting
    const enhancements: Record<string, string> = {
      'Updated summary': '📝 Updated professional summary to align with target role',
      'Enhanced experience': '💼 Enhanced experience descriptions with relevant keywords',
      'Prioritized skills': '🛠️ Reordered skills to highlight job-relevant technologies',
      'Enhanced project': '🚀 Enhanced project descriptions with matching technologies',
      'Added keywords': '🔑 Integrated additional ATS keywords naturally',
      'Fixed': '🔧 Fixed',
      'Improved': '📈 Improved',
      'Optimized': '⚡ Optimized',
    };

    let enhanced = description;
    Object.entries(enhancements).forEach(([key, value]) => {
      if (description.toLowerCase().includes(key.toLowerCase())) {
        enhanced = enhanced.replace(new RegExp(key, 'gi'), value);
      }
    });

    return enhanced;
  }

  /**
   * Quantify the impact of changes
   */
  private quantifyImpact(change: any): string {
    if (change.impact && typeof change.impact === 'string') {
      return change.impact;
    }

    // Generate impact description based on change type
    switch (change.changeType) {
      case 'keywords':
        return 'Improved ATS keyword matching';
      case 'content':
        return 'Enhanced content relevance';
      case 'structure':
        return 'Improved document structure';
      default:
        return 'General improvement';
    }
  }

  /**
   * Get numeric weight for impact sorting
   */
  private getImpactWeight(impact: string): number {
    const weights: Record<string, number> = {
      'Improved ATS keyword matching': 10,
      'Enhanced content relevance': 8,
      'Improved document structure': 6,
      'Improved document quality': 7,
      'General improvement': 5,
    };

    return weights[impact] || 5;
  }

  /**
   * Generate detailed change report
   */
  generateDetailedReport(
    changes: ChangeDescription[],
    atsScoreBefore: ATSScore,
    atsScoreAfter: ATSScore
  ): string {
    let report = `## Resume Optimization Report\n\n`;

    // ATS Score Comparison
    report += `### ATS Compatibility Analysis\n`;
    report += `- **Overall Score:** ${atsScoreBefore.overall}% → ${atsScoreAfter.overall}% `;
    report += `(${atsScoreAfter.overall >= atsScoreBefore.overall ? '+' : ''}${atsScoreAfter.overall - atsScoreBefore.overall})\n`;
    report += `- **Keyword Coverage:** ${atsScoreBefore.keywordCoverage}% → ${atsScoreAfter.keywordCoverage}%\n`;
    report += `- **Natural Flow:** ${atsScoreBefore.naturalFlow}% → ${atsScoreAfter.naturalFlow}%\n\n`;

    // Keywords Analysis
    report += `### Keywords Analysis\n`;
    report += `- **Matched Keywords:** ${atsScoreAfter.matchedKeywords.join(', ')}\n`;
    if (atsScoreAfter.missingKeywords.length > 0) {
      report += `- **Missing Keywords:** ${atsScoreAfter.missingKeywords.slice(0, 5).join(', ')}\n`;
    }
    report += `\n`;

    // Changes Applied
    report += `### Changes Applied\n`;
    changes.forEach((change, index) => {
      report += `${index + 1}. **${change.section}** (${change.changeType}): ${change.description}\n`;
      report += `   - Impact: ${change.impact}\n`;
      report += `   - Confidence: ${Math.round(change.confidence * 100)}%\n\n`;
    });

    return report;
  }

  /**
   * Generate quick summary for chat interface
   */
  generateQuickSummary(
    atsScoreBefore: number,
    atsScoreAfter: number,
    keywordsAdded: number,
    sectionsModified: number
  ): string {
    const improvement = atsScoreAfter - atsScoreBefore;
    const emoji = improvement > 0 ? '📈' : improvement === 0 ? '📊' : '📉';
    
    return `${emoji} **ATS Score: ${atsScoreAfter}%** (${improvement >= 0 ? '+' : ''}${improvement}%) | ` +
           `🔑 ${keywordsAdded} keywords added | ` +
           `📝 ${sectionsModified} sections updated`;
  }
}