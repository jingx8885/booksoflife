/**
 * Kimi AI Provider Adapter for BooksOfLife
 * 
 * Integrates with Moonshot AI's Kimi API (OpenAI-compatible)
 * Supports chat completions and streaming
 */

import {
  AIProvider,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  AIModel,
  ProviderConfig,
  AIMessage,
  ModelCapabilities,
  AuthenticationError,
  RateLimitError,
  NetworkError,
  ModelNotAvailableError,
  AIError,
} from '@/types/ai';
import { BaseAIAdapter } from '../base';

/**
 * Kimi API response interface (OpenAI-compatible)
 */
interface KimiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Kimi streaming response chunk
 */
interface KimiStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Kimi model information
 */
interface KimiModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

/**
 * Kimi provider adapter implementation
 */
export class KimiAdapter extends BaseAIAdapter {
  public readonly provider: AIProvider = 'kimi';
  
  private baseUrl = 'https://api.moonshot.cn';
  private apiVersion = 'v1';

  /**
   * Validate Kimi API configuration
   */
  protected async validateConfiguration(): Promise<void> {
    if (!this.config?.apiKey) {
      throw new AuthenticationError(this.provider, new Error('API key is required'));
    }

    try {
      // Test API connection by listing models
      const response = await fetch(
        `${this.config.baseUrl || this.baseUrl}/${this.apiVersion}/models`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new AuthenticationError(this.provider, new Error(`API key validation failed: ${response.status}`));
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new NetworkError(this.provider, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Fetch available models from Kimi API
   */
  protected async fetchModels(): Promise<AIModel[]> {
    try {
      const response = await fetch(
        `${this.config?.baseUrl || this.baseUrl}/${this.apiVersion}/models`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config?.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const models: AIModel[] = [];

      // Process each model from the API response
      if (data.data && Array.isArray(data.data)) {
        for (const modelInfo of data.data) {
          const model = this.mapKimiModelToAIModel(modelInfo);
          models.push(model);
        }
      }

      // Add fallback models if API doesn't return expected models
      if (models.length === 0) {
        models.push(...this.getDefaultModels());
      }

      return models;
    } catch (error) {
      console.warn('Failed to fetch Kimi models from API, using defaults:', error);
      return this.getDefaultModels();
    }
  }

  /**
   * Map Kimi API model info to our AIModel format
   */
  private mapKimiModelToAIModel(modelInfo: KimiModel): AIModel {
    const capabilities = this.getModelCapabilities(modelInfo.id);

    return {
      id: modelInfo.id,
      name: this.getModelDisplayName(modelInfo.id),
      provider: this.provider,
      capabilities,
      available: true,
    };
  }

  /**
   * Get default Kimi models
   */
  private getDefaultModels(): AIModel[] {
    return [
      {
        id: 'moonshot-v1-8k',
        name: 'Moonshot v1 8K',
        provider: this.provider,
        capabilities: this.getModelCapabilities('moonshot-v1-8k'),
        available: true,
      },
      {
        id: 'moonshot-v1-32k',
        name: 'Moonshot v1 32K',
        provider: this.provider,
        capabilities: this.getModelCapabilities('moonshot-v1-32k'),
        available: true,
      },
      {
        id: 'moonshot-v1-128k',
        name: 'Moonshot v1 128K',
        provider: this.provider,
        capabilities: this.getModelCapabilities('moonshot-v1-128k'),
        available: true,
      },
    ];
  }

  /**
   * Get display name for a model
   */
  private getModelDisplayName(modelId: string): string {
    const displayNames: Record<string, string> = {
      'moonshot-v1-8k': 'Moonshot v1 8K',
      'moonshot-v1-32k': 'Moonshot v1 32K',
      'moonshot-v1-128k': 'Moonshot v1 128K',
    };

    return displayNames[modelId] || modelId;
  }

  /**
   * Get capabilities for a specific model
   */
  private getModelCapabilities(modelId: string): ModelCapabilities {
    const capabilities: Record<string, ModelCapabilities> = {
      'moonshot-v1-8k': {
        maxContextTokens: 8192, // 8K context window
        maxOutputTokens: 4096,
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsImages: false,
        supportsDocuments: true,
        costPerInputToken: 0.000012, // ¥12 per 1M tokens (approximate USD)
        costPerOutputToken: 0.000012, // ¥12 per 1M tokens (approximate USD)
      },
      'moonshot-v1-32k': {
        maxContextTokens: 32768, // 32K context window
        maxOutputTokens: 4096,
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsImages: false,
        supportsDocuments: true,
        costPerInputToken: 0.000024, // ¥24 per 1M tokens (approximate USD)
        costPerOutputToken: 0.000024, // ¥24 per 1M tokens (approximate USD)
      },
      'moonshot-v1-128k': {
        maxContextTokens: 131072, // 128K context window
        maxOutputTokens: 4096,
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsImages: false,
        supportsDocuments: true,
        costPerInputToken: 0.00006, // ¥60 per 1M tokens (approximate USD)
        costPerOutputToken: 0.00006, // ¥60 per 1M tokens (approximate USD)
      },
    };

    return capabilities[modelId] || capabilities['moonshot-v1-8k'];
  }

  /**
   * Perform health check
   */
  protected async performHealthCheck(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config?.baseUrl || this.baseUrl}/${this.apiVersion}/models`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config?.apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        }
      );

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Perform the actual AI request
   */
  protected async performRequest(request: AIRequest): Promise<AIResponse> {
    const modelName = request.model || 'moonshot-v1-8k';
    const url = `${this.config?.baseUrl || this.baseUrl}/${this.apiVersion}/chat/completions`;

    const requestBody = this.buildRequestBody(request, modelName);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config?.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        await this.handleApiError(response);
      }

      const data: KimiResponse = await response.json();
      return this.mapKimiResponseToAIResponse(data, request);
    } catch (error) {
      throw this.wrapError(error, 0);
    }
  }

  /**
   * Perform streaming AI request
   */
  protected async* performStreamRequest(request: AIRequest): AsyncGenerator<AIStreamChunk, void, unknown> {
    const modelName = request.model || 'moonshot-v1-8k';
    const url = `${this.config?.baseUrl || this.baseUrl}/${this.apiVersion}/chat/completions`;

    const requestBody = this.buildRequestBody(request, modelName, true);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config?.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        await this.handleApiError(response);
      }

      if (!response.body) {
        throw new Error('No response body for streaming request');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonData = line.slice(6);
              if (jsonData.trim() === '[DONE]') {
                return;
              }

              try {
                const chunk: KimiStreamChunk = JSON.parse(jsonData);
                const streamChunk = this.mapKimiStreamChunkToAIStreamChunk(chunk);
                if (streamChunk) {
                  yield streamChunk;
                }
              } catch (parseError) {
                console.warn('Failed to parse streaming chunk:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      throw this.wrapError(error, 0);
    }
  }

  /**
   * Fetch current rate limit status
   */
  protected async fetchRateLimitStatus(): Promise<{
    remaining: number;
    resetTime: number;
    limit: number;
  }> {
    // Kimi doesn't provide detailed rate limit headers in all responses
    // Return approximate values based on known limits
    return {
      remaining: 200, // Approximate requests per minute
      resetTime: Date.now() + 60000, // Reset in 1 minute
      limit: 200,
    };
  }

  /**
   * Build request body for Kimi API
   */
  private buildRequestBody(request: AIRequest, model: string, stream: boolean = false): any {
    const messages = this.convertMessagesToOpenAIFormat(request.messages, request.systemPrompt);
    
    const body: any = {
      model,
      messages,
      temperature: request.temperature,
      top_p: request.topP,
      max_tokens: request.maxTokens,
      stream,
    };

    return body;
  }

  /**
   * Convert our message format to OpenAI format
   */
  private convertMessagesToOpenAIFormat(messages: AIMessage[], systemPrompt?: string): any[] {
    const openaiMessages = [];

    // Add system message if provided
    if (systemPrompt) {
      openaiMessages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    // Convert messages
    for (const message of messages) {
      openaiMessages.push({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content,
      });
    }

    return openaiMessages;
  }

  /**
   * Map Kimi response to our AIResponse format
   */
  private mapKimiResponseToAIResponse(response: KimiResponse, request: AIRequest): AIResponse {
    const choice = response.choices?.[0];
    if (!choice) {
      throw new AIError('No choices in response', this.provider, 'INVALID_RESPONSE');
    }

    const content = choice.message?.content || '';
    const finishReason = this.mapFinishReason(choice.finish_reason);

    const usage = {
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
    };

    return {
      content,
      model: response.model,
      provider: this.provider,
      usage,
      metadata: {
        duration: 0, // Will be set by base adapter
        timestamp: 0, // Will be set by base adapter
        finishReason,
      },
    };
  }

  /**
   * Map Kimi stream chunk to our format
   */
  private mapKimiStreamChunkToAIStreamChunk(chunk: KimiStreamChunk): AIStreamChunk | null {
    const choice = chunk.choices?.[0];
    if (!choice) return null;

    const delta = choice.delta?.content || '';
    const done = choice.finish_reason !== null && choice.finish_reason !== undefined;

    const streamChunk: AIStreamChunk = {
      delta,
      done,
      model: chunk.model,
      provider: this.provider,
    };

    if (done && chunk.usage) {
      streamChunk.usage = {
        inputTokens: chunk.usage.prompt_tokens,
        outputTokens: chunk.usage.completion_tokens,
        totalTokens: chunk.usage.total_tokens,
      };
    }

    return streamChunk;
  }

  /**
   * Map finish reason to our format
   */
  private mapFinishReason(finishReason: string): 'stop' | 'length' | 'function_call' | 'error' {
    switch (finishReason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'function_call':
      case 'tool_calls':
        return 'function_call';
      case 'content_filter':
        return 'error';
      default:
        return 'stop';
    }
  }

  /**
   * Handle API errors
   */
  private async handleApiError(response: Response): Promise<never> {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

    try {
      const errorData = JSON.parse(errorText);
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      }
    } catch {
      // Use default error message if JSON parsing fails
    }

    if (response.status === 401 || response.status === 403) {
      throw new AuthenticationError(this.provider, new Error(errorMessage));
    }

    if (response.status === 429) {
      throw new RateLimitError(this.provider, Date.now() + 60000, new Error(errorMessage));
    }

    if (response.status === 404) {
      throw new ModelNotAvailableError(this.provider, 'unknown', new Error(errorMessage));
    }

    if (response.status >= 500) {
      throw new NetworkError(this.provider, new Error(errorMessage));
    }

    throw new AIError(errorMessage, this.provider, 'API_ERROR', true);
  }
}