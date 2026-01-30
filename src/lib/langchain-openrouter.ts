import { ChatOllama } from "@langchain/community/chat_models/ollama";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

// Ollama models mapping - focusing on GLM-4.7 Cloud model
export const OLLAMA_MODELS = {
  'glm-4.7:cloud': 'glm-4.7:cloud',
  // Backup models (commented out since you want only GLM-4.7)
  // 'llama3.1:8b': 'llama3.1:8b',
  // 'llama3.2:3b': 'llama3.2:3b',
  // 'mistral:7b': 'mistral:7b',
} as const;

export type OllamaModelId = keyof typeof OLLAMA_MODELS;

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

  const baseUrl = fields.baseUrl || getEnvVar('VITE_OLLAMA_BASE_URL', 'http://localhost:11434');
  const modelName = fields.modelName 
    ? OLLAMA_MODELS[fields.modelName] || fields.modelName
    : getEnvVar('VITE_OLLAMA_MODEL', OLLAMA_MODELS['glm-4.7:cloud']);

  return new ChatOllama({
    baseUrl: baseUrl,
    model: modelName,
    temperature: fields.temperature || 0.7,
    numCtx: fields.maxTokens || 4096, // Context window size for Ollama
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