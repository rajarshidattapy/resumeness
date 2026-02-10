// Error Handler for managing agent errors and recovery strategies
import { ErrorType, ErrorResolution, RecoveryStrategy } from './types';

export class ErrorHandler {
  private maxRetries: number = 3;
  private retryDelays: number[] = [1000, 2000, 4000]; // Exponential backoff in ms

  constructor(maxRetries: number = 3) {
    this.maxRetries = maxRetries;
  }

  /**
   * Handle an error and determine the appropriate resolution
   */
  async handleError(error: ErrorType, context: any, attemptCount: number = 0): Promise<ErrorResolution> {
    console.error(`Handling error: ${error}, attempt: ${attemptCount + 1}`, context);

    const strategy = this.getRecoveryStrategy(error);
    const shouldRetry = this.shouldRetry(error, attemptCount);

    if (shouldRetry && attemptCount < this.maxRetries) {
      // Wait before retry with exponential backoff
      const delay = this.retryDelays[Math.min(attemptCount, this.retryDelays.length - 1)];
      await this.sleep(delay);

      return {
        resolved: false,
        action: 'retry',
        message: `Retrying after ${delay}ms delay (attempt ${attemptCount + 1}/${this.maxRetries})`,
        shouldRetry: true,
      };
    }

    // Apply recovery strategy
    return this.applyRecoveryStrategy(error, strategy, context);
  }

  /**
   * Determine if an error should be retried
   */
  shouldRetry(error: ErrorType, attemptCount: number): boolean {
    if (attemptCount >= this.maxRetries) {
      return false;
    }

    switch (error) {
      case ErrorType.NETWORK_ERROR:
      case ErrorType.TOOL_UNAVAILABLE:
      case ErrorType.TIMEOUT_ERROR:
        return true;
      
      case ErrorType.LATEX_SYNTAX_ERROR:
      case ErrorType.VERIFICATION_FAILED:
        return attemptCount < 2; // Limited retries for these
      
      case ErrorType.KNOWLEDGE_BASE_EMPTY:
        return false; // No retries
      
      case ErrorType.CRITICAL_ERROR:
        return attemptCount < 1; // Allow one retry for critical errors
      
      default:
        return true;
    }
  }

  /**
   * Get recovery strategy for a specific error type
   */
  getRecoveryStrategy(error: ErrorType): RecoveryStrategy {
    switch (error) {
      case ErrorType.NETWORK_ERROR:
        return {
          type: 'offline_mode',
          steps: [
            'Switch to cached data',
            'Use offline capabilities',
            'Inform user of limited functionality'
          ],
          fallbackAction: 'continue_with_cached_data'
        };

      case ErrorType.TOOL_UNAVAILABLE:
        return {
          type: 'graceful_degradation',
          steps: [
            'Identify alternative tools',
            'Use fallback implementations',
            'Inform user of reduced capabilities'
          ],
          fallbackAction: 'use_fallback_tools'
        };

      case ErrorType.LATEX_SYNTAX_ERROR:
        return {
          type: 'syntax_repair',
          steps: [
            'Identify syntax issues',
            'Apply common fixes',
            'Validate corrected LaTeX'
          ],
          fallbackAction: 'revert_to_original'
        };

      case ErrorType.KNOWLEDGE_BASE_EMPTY:
        return {
          type: 'request_information',
          steps: [
            'Identify missing information',
            'Request specific data from user',
            'Provide guidance on what to add'
          ],
          fallbackAction: 'request_user_input'
        };

      case ErrorType.VERIFICATION_FAILED:
        return {
          type: 'auto_correction',
          steps: [
            'Identify verification issues',
            'Apply automatic corrections',
            'Re-run verification'
          ],
          fallbackAction: 'escalate_to_user'
        };

      case ErrorType.TIMEOUT_ERROR:
        return {
          type: 'optimize_performance',
          steps: [
            'Reduce processing complexity',
            'Use cached results where possible',
            'Simplify operations'
          ],
          fallbackAction: 'use_simplified_approach'
        };

      case ErrorType.CRITICAL_ERROR:
        return {
          type: 'preserve_and_escalate',
          steps: [
            'Preserve original resume',
            'Log error details',
            'Escalate to user with clear explanation'
          ],
          fallbackAction: 'preserve_original_and_explain'
        };

      default:
        return {
          type: 'generic_recovery',
          steps: [
            'Log error details',
            'Attempt graceful degradation',
            'Inform user of issue'
          ],
          fallbackAction: 'inform_user_and_continue'
        };
    }
  }

  /**
   * Apply a recovery strategy
   */
  private async applyRecoveryStrategy(
    error: ErrorType,
    strategy: RecoveryStrategy,
    context: any
  ): Promise<ErrorResolution> {
    try {
      switch (strategy.fallbackAction) {
        case 'continue_with_cached_data':
          return {
            resolved: true,
            action: 'use_cached_data',
            message: 'Continuing with cached data due to network issues',
            shouldRetry: false,
          };

        case 'use_fallback_tools':
          return {
            resolved: true,
            action: 'fallback_tools',
            message: 'Using alternative tools due to unavailability',
            shouldRetry: false,
          };

        case 'revert_to_original':
          return {
            resolved: true,
            action: 'revert',
            message: 'Reverted to original content due to syntax errors',
            shouldRetry: false,
          };

        case 'request_user_input':
          return {
            resolved: false,
            action: 'request_input',
            message: 'Please add more information to your knowledge base to continue',
            shouldRetry: false,
          };

        case 'escalate_to_user':
          return {
            resolved: false,
            action: 'escalate',
            message: 'Manual intervention required - please review and correct',
            shouldRetry: false,
          };

        case 'use_simplified_approach':
          return {
            resolved: true,
            action: 'simplify',
            message: 'Using simplified approach due to timeout',
            shouldRetry: false,
          };

        case 'preserve_original_and_explain':
          return {
            resolved: false,
            action: 'preserve',
            message: 'Critical error occurred - original resume preserved',
            shouldRetry: false,
          };

        default:
          return {
            resolved: false,
            action: 'unknown',
            message: 'Unknown error occurred - please try again',
            shouldRetry: false,
          };
      }
    } catch (recoveryError) {
      console.error('Recovery strategy failed:', recoveryError);
      return {
        resolved: false,
        action: 'recovery_failed',
        message: 'Error recovery failed - please try again or contact support',
        shouldRetry: false,
      };
    }
  }

  /**
   * Automatically fix common LaTeX syntax errors
   */
  async fixCommonLatexErrors(latex: string): Promise<string> {
    let fixed = latex;

    // Fix common brace mismatches
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    
    if (openBraces > closeBraces) {
      fixed += '}'.repeat(openBraces - closeBraces);
    }

    // Fix common command issues
    fixed = fixed
      .replace(/\\textbf\s*([^{])/g, '\\textbf{$1}') // Fix missing braces in textbf
      .replace(/\\textit\s*([^{])/g, '\\textit{$1}') // Fix missing braces in textit
      .replace(/\\section\*?\s*([^{])/g, '\\section*{$1}') // Fix missing braces in section
      .replace(/\\\\/g, '\\\\\n') // Fix line breaks
      .replace(/([^\\])&/g, '$1\\&') // Escape unescaped ampersands
      .replace(/([^\\])%/g, '$1\\%') // Escape unescaped percent signs
      .replace(/([^\\])#/g, '$1\\#'); // Escape unescaped hash symbols

    return fixed;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a user-friendly error message
   */
  createUserMessage(error: ErrorType, context?: any): string {
    switch (error) {
      case ErrorType.NETWORK_ERROR:
        return 'Network connection issue. Working with cached data where possible.';
      
      case ErrorType.TOOL_UNAVAILABLE:
        return 'Some AI tools are temporarily unavailable. Using alternative methods.';
      
      case ErrorType.LATEX_SYNTAX_ERROR:
        return 'LaTeX formatting issue detected. Attempting automatic correction.';
      
      case ErrorType.KNOWLEDGE_BASE_EMPTY:
        return 'Your knowledge base needs more information. Please add your projects, skills, and achievements.';
      
      case ErrorType.VERIFICATION_FAILED:
        return 'Quality check failed. Reviewing and correcting the content.';
      
      case ErrorType.TIMEOUT_ERROR:
        return 'Processing is taking longer than expected. Trying a faster approach.';
      
      case ErrorType.CRITICAL_ERROR:
        return 'A critical error occurred. Your original resume has been preserved.';
      
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}