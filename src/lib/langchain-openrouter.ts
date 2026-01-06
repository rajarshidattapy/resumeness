import { ChatOpenAI } from "@langchain/openai";

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
 * Custom LangChain Chat Model wrapper for OpenAI
 * Provides a consistent interface for the resume agent
 */
export class ChatOpenAIClient extends ChatOpenAI {
  constructor(fields: {
    modelName?: OpenAIModelId;
    temperature?: number;
    maxTokens?: number;
    openAIApiKey?: string;
  } = {}) {
    const apiKey = fields.openAIApiKey || import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured. Please add it to your environment.');
    }

    const modelName = fields.modelName 
      ? OPENAI_MODELS[fields.modelName] || fields.modelName
      : OPENAI_MODELS['gpt-3.5-turbo'];

    super({
      openAIApiKey: apiKey,
      modelName: modelName,
      temperature: fields.temperature || 0.7,
      maxTokens: fields.maxTokens || 2048,
    });
  }
}

// Export for backward compatibility
export const ChatOpenRouter = ChatOpenAIClient;
export type OpenRouterModelId = OpenAIModelId;