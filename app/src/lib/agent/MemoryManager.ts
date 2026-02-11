// Memory Manager for maintaining agent state and session persistence
import { AgentState, ExecutionStep, AgentStep } from './types';

export class MemoryManager {
  private sessionData: Map<string, any> = new Map();
  private executionHistory: ExecutionStep[] = [];
  private currentState: AgentState | null = null;

  constructor() {
    // Initialize with empty state
  }

  /**
   * Store session data with a key-value pair
   */
  storeSessionData(key: string, data: any): void {
    this.sessionData.set(key, {
      data,
      timestamp: new Date(),
    });
  }

  /**
   * Retrieve session data by key
   */
  retrieveSessionData(key: string): any {
    const entry = this.sessionData.get(key);
    return entry ? entry.data : null;
  }

  /**
   * Get the complete execution history
   */
  getExecutionHistory(): ExecutionStep[] {
    return [...this.executionHistory];
  }

  /**
   * Add a new execution step to history
   */
  addExecutionStep(step: ExecutionStep): void {
    this.executionHistory.push(step);
    
    // Keep only last 50 steps to prevent memory bloat
    if (this.executionHistory.length > 50) {
      this.executionHistory = this.executionHistory.slice(-50);
    }
  }

  /**
   * Update the current agent state
   */
  updateState(state: Partial<AgentState>): void {
    if (this.currentState) {
      this.currentState = { ...this.currentState, ...state };
    } else {
      this.currentState = state as AgentState;
    }
  }

  /**
   * Get the current agent state
   */
  getCurrentState(): AgentState | null {
    return this.currentState;
  }

  /**
   * Initialize a new session
   */
  initializeSession(sessionId: string): AgentState {
    const newState: AgentState = {
      currentStep: AgentStep.PLANNING,
      sessionId,
      startTime: new Date(),
      executionHistory: [],
      retryCount: 0,
      maxRetries: 3,
    };

    this.currentState = newState;
    this.executionHistory = [];
    this.sessionData.clear();

    return newState;
  }

  /**
   * Persist state to localStorage (for browser persistence)
   */
  async persistState(): Promise<void> {
    if (!this.currentState) return;

    try {
      const stateData = {
        currentState: this.currentState,
        executionHistory: this.executionHistory,
        sessionData: Object.fromEntries(this.sessionData),
        timestamp: new Date().toISOString(),
      };

      localStorage.setItem(`agent-state-${this.currentState.sessionId}`, JSON.stringify(stateData));
    } catch (error) {
      console.error('Failed to persist agent state:', error);
    }
  }

  /**
   * Load state from localStorage
   */
  async loadState(sessionId: string): Promise<AgentState | null> {
    try {
      const stateJson = localStorage.getItem(`agent-state-${sessionId}`);
      if (!stateJson) return null;

      const stateData = JSON.parse(stateJson);
      
      // Restore state
      this.currentState = {
        ...stateData.currentState,
        startTime: new Date(stateData.currentState.startTime),
      };

      // Restore execution history
      this.executionHistory = stateData.executionHistory.map((step: any) => ({
        ...step,
        timestamp: new Date(step.timestamp),
      }));

      // Restore session data
      this.sessionData = new Map(Object.entries(stateData.sessionData));

      return this.currentState;
    } catch (error) {
      console.error('Failed to load agent state:', error);
      return null;
    }
  }

  /**
   * Clear all session data
   */
  clearSession(): void {
    this.sessionData.clear();
    this.executionHistory = [];
    this.currentState = null;
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    averageStepDuration: number;
    sessionDuration: number;
  } {
    const totalSteps = this.executionHistory.length;
    const successfulSteps = this.executionHistory.filter(step => step.success).length;
    const failedSteps = totalSteps - successfulSteps;
    
    const totalDuration = this.executionHistory.reduce((sum, step) => sum + step.duration, 0);
    const averageStepDuration = totalSteps > 0 ? totalDuration / totalSteps : 0;
    
    const sessionDuration = this.currentState 
      ? Date.now() - this.currentState.startTime.getTime()
      : 0;

    return {
      totalSteps,
      successfulSteps,
      failedSteps,
      averageStepDuration,
      sessionDuration,
    };
  }

  /**
   * Check if we have data for a specific step
   */
  hasStepData(step: AgentStep): boolean {
    return this.executionHistory.some(h => h.step === step && h.success);
  }

  /**
   * Get the last successful result for a step
   */
  getLastStepResult(step: AgentStep): any {
    const lastStep = this.executionHistory
      .filter(h => h.step === step && h.success)
      .pop();
    
    return lastStep ? lastStep.output : null;
  }

  /**
   * Record a step execution
   */
  recordStepExecution(
    step: AgentStep,
    input: any,
    output: any,
    duration: number,
    success: boolean,
    errorMessage?: string,
    retryCount: number = 0
  ): void {
    const executionStep: ExecutionStep = {
      step,
      timestamp: new Date(),
      input,
      output,
      duration,
      success,
      errorMessage,
      retryCount,
    };

    this.addExecutionStep(executionStep);
    
    // Update current state
    this.updateState({
      currentStep: step,
      retryCount: success ? 0 : retryCount,
    });
  }
}