// Core types for the autonomous agent system
import { KnowledgeItem } from '@/stores/useResumeStore';

export enum AgentStep {
  PLANNING = 'planning',
  ANALYZING = 'analyzing',
  RETRIEVING = 'retrieving',
  REWRITING = 'rewriting',
  OPTIMIZING = 'optimizing',
  VERIFYING = 'verifying',
  PRESENTING = 'presenting',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export enum SeniorityLevel {
  ENTRY = 'entry',
  MID = 'mid',
  SENIOR = 'senior',
  EXECUTIVE = 'executive'
}

export enum ErrorType {
  NETWORK_ERROR = 'network_error',
  TOOL_UNAVAILABLE = 'tool_unavailable',
  LATEX_SYNTAX_ERROR = 'latex_syntax_error',
  KNOWLEDGE_BASE_EMPTY = 'knowledge_base_empty',
  VERIFICATION_FAILED = 'verification_failed',
  TIMEOUT_ERROR = 'timeout_error',
  CRITICAL_ERROR = 'critical_error'
}

export interface SkillCategory {
  type: 'hard' | 'soft';
  skills: string[];
  priority: number;
}

export interface ExecutionPlan {
  targetRole: string;
  requiredSkills: SkillCategory[];
  atsKeywords: string[];
  seniorityLevel: SeniorityLevel;
  industryTerms: string[];
  optimizationStrategy: string;
  estimatedDuration: number;
}

export interface ExecutionStep {
  step: AgentStep;
  timestamp: Date;
  input: any;
  output: any;
  duration: number;
  success: boolean;
  errorMessage?: string;
  retryCount: number;
}

export interface AgentState {
  currentStep: AgentStep;
  sessionId: string;
  startTime: Date;
  planningResults?: ExecutionPlan;
  executionHistory: ExecutionStep[];
  verificationResults?: VerificationResult;
  retryCount: number;
  maxRetries: number;
}

export interface OptimizationResult {
  sessionId: string;
  originalResume: string;
  optimizedResume: string;
  atsScoreBefore: number;
  atsScoreAfter: number;
  changesApplied: ChangeDescription[];
  executionTime: number;
  verificationPassed: boolean;
}

export interface ChangeDescription {
  section: string;
  changeType: 'content' | 'structure' | 'keywords';
  description: string;
  impact: string;
  confidence: number;
}

export interface RankedResult {
  item: KnowledgeItem;
  relevanceScore: number;
  matchingCriteria: string[];
  suggestedUsage: string;
}

export interface ATSScore {
  overall: number;
  keywordCoverage: number;
  keywordDensity: number;
  naturalFlow: number;
  matchedKeywords: string[];
  missingKeywords: string[];
}

export interface VerificationResult {
  isAccurate: boolean;
  inaccuracies: Inaccuracy[];
  confidence: number;
}

export interface Inaccuracy {
  claim: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ValidationResult {
  isValid: boolean;
  errors: LaTeXError[];
  warnings: LaTeXWarning[];
}

export interface LaTeXError {
  line: number;
  message: string;
  type: string;
}

export interface LaTeXWarning {
  line: number;
  message: string;
  type: string;
}

export interface RedundancyReport {
  duplicates: DuplicateContent[];
  redundancyScore: number;
}

export interface DuplicateContent {
  content: string;
  locations: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface CritiqueResult {
  issues: CritiqueIssue[];
  overallScore: number;
  recommendations: string[];
}

export interface CritiqueIssue {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface AgentConfig {
  maxRetries: number;
  timeoutPerStep: number;
  atsTargetScore: number;
  keywordCoverageThreshold: number;
  verificationStrictness: 'low' | 'medium' | 'high';
  enableSelfCritique: boolean;
  cacheResults: boolean;
}

export interface ErrorResolution {
  resolved: boolean;
  action: string;
  message: string;
  shouldRetry: boolean;
}

export interface RecoveryStrategy {
  type: string;
  steps: string[];
  fallbackAction: string;
}