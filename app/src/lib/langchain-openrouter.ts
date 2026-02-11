import { ChatOllama } from "@langchain/community/chat_models/ollama";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { Serialized } from "@langchain/core/load/serializable";
import type { LLMResult } from "@langchain/core/outputs";
import type { BaseMessage } from "@langchain/core/messages";

// Ollama models mapping - focusing on GLM-4.7 Cloud model
export const OLLAMA_MODELS = {
  'glm-4.7:cloud': 'glm-4.7:cloud',
  // Backup models (commented out since you want only GLM-4.7)
  // 'llama3.1:8b': 'llama3.1:8b',
  // 'llama3.2:3b': 'llama3.2:3b',
  // 'mistral:7b': 'mistral:7b',
} as const;

export type OllamaModelId = keyof typeof OLLAMA_MODELS;

// ─── Dev-only LLM log store ────────────────────────────────────────────────
export interface LLMLogEntry {
  id: number;
  timestamp: Date;
  type: 'request' | 'response' | 'error';
  runId: string;
  /** For requests: array of { role, text } */
  messages?: { role: string; text: string }[];
  /** Model identifier string */
  model?: string;
  /** For responses: generated text */
  output?: string;
  /** For errors */
  error?: string;
}

type LLMLogListener = (entries: LLMLogEntry[]) => void;

class LLMLogStore {
  private entries: LLMLogEntry[] = [];
  private listeners = new Set<LLMLogListener>();
  private counter = 0;

  push(entry: Omit<LLMLogEntry, 'id' | 'timestamp'>) {
    this.counter++;
    const full: LLMLogEntry = { ...entry, id: this.counter, timestamp: new Date() };
    this.entries.push(full);
    // Keep last 50 entries to avoid unbounded growth
    if (this.entries.length > 50) this.entries = this.entries.slice(-50);
    this.listeners.forEach(fn => fn(this.getAll()));
  }

  getAll(): LLMLogEntry[] {
    return [...this.entries];
  }

  clear() {
    this.entries = [];
    this.listeners.forEach(fn => fn([]));
  }

  subscribe(fn: LLMLogListener): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }
}

/** Singleton – importable from React components */
export const llmLogStore = new LLMLogStore();

// ─── LangChain callback handler ────────────────────────────────────────────
/**
 * Console logger callback for ChatOllama – logs every LLM request/response
 * and pushes entries to llmLogStore for the dev popup.
 */
class OllamaConsoleLogger extends BaseCallbackHandler {
  name = 'OllamaConsoleLogger';

  private callCounter = 0;

  async handleChatModelStart(
    llm: Serialized,
    messages: BaseMessage[][],
    runId: string,
  ) {
    this.callCounter++;
    const id = this.callCounter;
    console.group(`🦙 Ollama Request #${id}  (runId: ${runId})`);
    console.log('%c Model:', 'font-weight:bold', llm?.id ?? 'unknown');

    const parsed: { role: string; text: string }[] = [];
    for (const batch of messages) {
      for (const msg of batch) {
        const role = msg._getType?.() ?? 'unknown';
        const text = typeof msg.content === 'string'
          ? msg.content
          : JSON.stringify(msg.content);
        parsed.push({ role, text });
        console.log(
          `%c [${role}] %c${text.length > 2000 ? text.slice(0, 2000) + '…(truncated)' : text}`,
          'color:#8b5cf6;font-weight:bold',
          'color:inherit',
        );
      }
    }
    console.groupEnd();

    llmLogStore.push({
      type: 'request',
      runId,
      model: (llm?.id ?? []).toString(),
      messages: parsed,
    });
  }

  async handleLLMEnd(output: LLMResult, runId: string) {
    console.group(`🦙 Ollama Response  (runId: ${runId})`);
    let fullText = '';
    for (const gen of output.generations) {
      for (const g of gen) {
        const text = g.text ?? JSON.stringify(g.message?.content ?? '');
        fullText += text;
        console.log(
          `%c ${text.length > 3000 ? text.slice(0, 3000) + '…(truncated)' : text}`,
          'color:#10b981',
        );
      }
    }
    if (output.llmOutput) {
      console.log('%c LLM metadata:', 'font-weight:bold', output.llmOutput);
    }
    console.groupEnd();

    llmLogStore.push({ type: 'response', runId, output: fullText });
  }

  async handleLLMError(error: Error, runId: string) {
    console.error(`🦙❌ Ollama Error  (runId: ${runId})`, error);
    llmLogStore.push({ type: 'error', runId, error: error.message });
  }
}

/**
 * Factory function to create a properly configured ChatOllama instance
 * This ensures tool calling support is available for compatible models
 */
export function createChatOllama(fields: {
  modelName?: OllamaModelId;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;
} = {}): ChatOllama {
  // Handle both browser (import.meta.env) and Node.js (process.env) environments
  const getEnvVar = (key: string, fallback: string) => {
    if (typeof window !== 'undefined' && import.meta?.env) {
      return import.meta.env[key] || fallback;
    }
    return process.env[key] || fallback;
  };

  // Use Flask backend proxy to avoid CORS issues with Ollama
  // Falls back to direct Ollama URL if proxy env var is not set
  const baseUrl = fields.baseUrl || getEnvVar('VITE_OLLAMA_PROXY_URL', getEnvVar('VITE_OLLAMA_BASE_URL', 'http://localhost:11434'));
  const modelName = fields.modelName 
    ? OLLAMA_MODELS[fields.modelName] || fields.modelName
    : getEnvVar('VITE_OLLAMA_MODEL', OLLAMA_MODELS['glm-4.7:cloud']);

  console.log(`🦙 Creating ChatOllama → model: ${modelName}, baseUrl: ${baseUrl}`);

  return new ChatOllama({
    baseUrl: baseUrl,
    model: modelName,
    temperature: fields.temperature || 0.7,
    numCtx: fields.maxTokens || 4096, // Context window size for Ollama
    callbacks: [new OllamaConsoleLogger()],
  });
}

/**
 * Type alias for ChatOllama - use createChatOllama() to create instances
 */
export type ChatOllamaClient = ChatOllama;

// Export for backward compatibility
export const ChatOpenRouter = ChatOllama;
export type OpenRouterModelId = OllamaModelId;

// Legacy exports for compatibility
export const createChatOpenAI = createChatOllama;
export type OpenAIModelId = OllamaModelId;
export const OPENAI_MODELS = OLLAMA_MODELS;