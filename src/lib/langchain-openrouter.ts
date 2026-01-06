import { ChatOpenAI } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

// OpenAI models mapping
export const OPENAI_MODELS = {
  'gpt-4': 'gpt-4',
  'gpt-4-turbo': 'gpt-4-turbo',
  'gpt-3.5-turbo': 'gpt-3.5-turbo',
  'gpt-4o': 'gpt-4o',
  'gpt-4o-mini': 'gpt-4o-mini'
} as const;

export type OpenAIModelId = keyof typeof OPENAI_MODELS;

/**
 * Factory function to create a properly configured ChatOpenAI instance
 * This ensures tool calling support is available
 */
export function createChatOpenAI(fields: {
  modelName?: OpenAIModelId;
  temperature?: number;
  maxTokens?: number;
  openAIApiKey?: string;
} = {}): ChatOpenAI {
  const apiKey = fields.openAIApiKey || import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured. Please add it to your environment.');
  }

  const modelName = fields.modelName 
    ? OPENAI_MODELS[fields.modelName] || fields.modelName
    : OPENAI_MODELS['gpt-3.5-turbo'];

  return new ChatOpenAI({
    openAIApiKey: apiKey,
    modelName: modelName,
    temperature: fields.temperature || 0.7,
    maxTokens: fields.maxTokens || 2048,
  });
}

/**
 * Type alias for ChatOpenAI - use createChatOpenAI() to create instances
 */
export type ChatOpenAIClient = ChatOpenAI;

// Export for backward compatibility
export const ChatOpenRouter = ChatOpenAI;
export type OpenRouterModelId = OpenAIModelId;