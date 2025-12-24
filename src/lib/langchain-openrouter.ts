import { ChatOpenAI } from "@langchain/openai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { BaseMessage, HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { ChatResult } from "@langchain/core/outputs";

// OpenRouter models mapping
export const OPENROUTER_MODELS = {
  'mistral-7b': 'mistralai/mistral-7b-instruct:free',
  'gemma-7b': 'google/gemma-7b-it:free',
  'llama-3-8b': 'meta-llama/llama-3-8b-instruct:free'
} as const;

export type OpenRouterModelId = keyof typeof OPENROUTER_MODELS;

/**
 * Custom LangChain Chat Model for OpenRouter
 */
export class ChatOpenRouter extends BaseChatModel {
  private client: ChatOpenAI;
  modelName: string;
  temperature: number;
  maxTokens?: number;

  constructor(fields: {
    modelName?: OpenRouterModelId;
    temperature?: number;
    maxTokens?: number;
    openAIApiKey?: string;
  } = {}) {
    super(fields);

    const apiKey = fields.openAIApiKey || import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured. Please add it to your environment.');
    }

    this.modelName = OPENROUTER_MODELS[fields.modelName || 'mistral-7b'];
    this.temperature = fields.temperature || 0.7;
    this.maxTokens = fields.maxTokens || 2048;

    // Use OpenAI client with OpenRouter base URL
    this.client = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: this.modelName,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Resumeness',
        },
      },
    });
  }

  _llmType(): string {
    return "openrouter";
  }

  async _generate(
    messages: BaseMessage[],
    options?: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    // Convert LangChain messages to OpenAI format
    const openaiMessages = messages.map(msg => {
      if (msg instanceof HumanMessage) {
        return { role: 'user' as const, content: msg.content };
      } else if (msg instanceof AIMessage) {
        return { role: 'assistant' as const, content: msg.content };
      } else if (msg instanceof SystemMessage) {
        return { role: 'system' as const, content: msg.content };
      }
      return { role: 'user' as const, content: msg.content };
    });

    const result = await this.client.call(openaiMessages, options, runManager);
    return result;
  }

  async *_streamResponseChunks(
    messages: BaseMessage[],
    options?: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<any> {
    // Convert LangChain messages to OpenAI format
    const openaiMessages = messages.map(msg => {
      if (msg instanceof HumanMessage) {
        return { role: 'user' as const, content: msg.content };
      } else if (msg instanceof AIMessage) {
        return { role: 'assistant' as const, content: msg.content };
      } else if (msg instanceof SystemMessage) {
        return { role: 'system' as const, content: msg.content };
      }
      return { role: 'user' as const, content: msg.content };
    });

    for await (const chunk of this.client.stream(openaiMessages, options, runManager)) {
      yield chunk;
    }
  }
}