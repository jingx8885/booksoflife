/**
 * Qwen AI Provider Adapter for BooksOfLife
 * 
 * Integrates with Alibaba's DashScope API for Qwen models
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
 * Qwen API response interface
 */
interface QwenResponse {
  status_code: number;
  request_id: string;
  code: string;
  message: string;
  output: {
    text: string;
    finish_reason: string;
  };
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

/**
 * Qwen streaming response chunk
 */
interface QwenStreamChunk {
  status_code?: number;
  request_id?: string;
  output?: {
    text?: string;
    finish_reason?: string;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

/**
 * Qwen model information
 */
interface QwenModel {
  model: string;
  type: string;
  support_function_call: boolean;
}

/**
 * Qwen provider adapter implementation
 */
export class QwenAdapter extends BaseAIAdapter {
  public readonly provider: AIProvider = 'qwen';
  
  private baseUrl = 'https://dashscope.aliyuncs.com';
  private apiVersion = 'v1';

  /**
   * Validate Qwen API configuration
   */
  protected async validateConfiguration(): Promise<void> {
    if (!this.config?.apiKey) {
      throw new AuthenticationError(this.provider, new Error('API key is required'));
    }

    try {
      // Test API connection by making a simple text generation request
      const response = await fetch(
        `${this.config.baseUrl || this.baseUrl}/api/${this.apiVersion}/services/aigc/text-generation/generation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'X-DashScope-SSE': 'disable',
          },
          body: JSON.stringify({
            model: 'qwen-turbo',
            input: {
              messages: [
                { role: 'user', content: 'Hi' }
              ]
            },
            parameters: {
              max_tokens: 10,
              temperature: 0.1,
            }
          }),
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
   * Fetch available models from Qwen API
   */
  protected async fetchModels(): Promise<AIModel[]> {
    // DashScope doesn't provide a public models endpoint
    // Return known available models
    return this.getDefaultModels();
  }

  /**
   * Get default Qwen models
   */
  private getDefaultModels(): AIModel[] {
    return [
      {
        id: 'qwen-max',
        name: 'Qwen Max',
        provider: this.provider,
        capabilities: this.getModelCapabilities('qwen-max'),
        available: true,
      },
      {
        id: 'qwen-plus',
        name: 'Qwen Plus',
        provider: this.provider,
        capabilities: this.getModelCapabilities('qwen-plus'),
        available: true,
      },
      {
        id: 'qwen-turbo',
        name: 'Qwen Turbo',
        provider: this.provider,
        capabilities: this.getModelCapabilities('qwen-turbo'),
        available: true,
      },
    ];
  }

  /**
   * Get capabilities for a specific model
   */
  private getModelCapabilities(modelId: string): ModelCapabilities {
    const capabilities: Record<string, ModelCapabilities> = {
      'qwen-max': {
        maxContextTokens: 32768, // 32K context window
        maxOutputTokens: 8192,
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsImages: true,
        supportsDocuments: false,
        costPerInputToken: 0.00002, // $20 per 1M tokens (approximate)
        costPerOutputToken: 0.00006, // $60 per 1M tokens (approximate)
      },
      'qwen-plus': {
        maxContextTokens: 32768, // 32K context window
        maxOutputTokens: 8192,
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsImages: true,
        supportsDocuments: false,
        costPerInputToken: 0.000004, // $4 per 1M tokens (approximate)
        costPerOutputToken: 0.000012, // $12 per 1M tokens (approximate)
      },
      'qwen-turbo': {
        maxContextTokens: 8192, // 8K context window
        maxOutputTokens: 1500,
        supportsStreaming: true,
        supportsFunctionCalling: false,
        supportsImages: false,
        supportsDocuments: false,
        costPerInputToken: 0.0000008, // $0.8 per 1M tokens (approximate)
        costPerOutputToken: 0.000002, // $2 per 1M tokens (approximate)
      },
    };

    return capabilities[modelId] || capabilities['qwen-turbo'];
  }

  /**
   * Perform health check
   */
  protected async performHealthCheck(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config?.baseUrl || this.baseUrl}/api/${this.apiVersion}/services/aigc/text-generation/generation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config?.apiKey}`,
            'Content-Type': 'application/json',
            'X-DashScope-SSE': 'disable',
          },
          body: JSON.stringify({
            model: 'qwen-turbo',
            input: {
              messages: [
                { role: 'user', content: 'Hi' }
              ]
            },
            parameters: {
              max_tokens: 5,
              temperature: 0.1,
            }
          }),
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
    const modelName = request.model || 'qwen-turbo';
    const url = `${this.config?.baseUrl || this.baseUrl}/api/${this.apiVersion}/services/aigc/text-generation/generation`;

    const requestBody = this.buildRequestBody(request, modelName);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config?.apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-SSE': 'disable',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        await this.handleApiError(response);
      }

      const data: QwenResponse = await response.json();
      return this.mapQwenResponseToAIResponse(data, modelName, request);
    } catch (error) {
      throw this.wrapError(error, 0);
    }
  }

  /**
   * Perform streaming AI request
   */
  protected async* performStreamRequest(request: AIRequest): AsyncGenerator<AIStreamChunk, void, unknown> {
    const modelName = request.model || 'qwen-turbo';
    const url = `${this.config?.baseUrl || this.baseUrl}/api/${this.apiVersion}/services/aigc/text-generation/generation`;

    const requestBody = this.buildRequestBody(request, modelName, true);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config?.apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-SSE': 'enable',
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
            if (line.startsWith('data:')) {
              const jsonData = line.slice(5).trim();
              if (jsonData === '[DONE]') {
                return;
              }

              try {
                const chunk: QwenStreamChunk = JSON.parse(jsonData);
                const streamChunk = this.mapQwenStreamChunkToAIStreamChunk(chunk, modelName);
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
    // DashScope doesn't provide detailed rate limit headers
    // Return approximate values based on known limits
    return {
      remaining: 60, // Approximate requests per minute
      resetTime: Date.now() + 60000, // Reset in 1 minute
      limit: 60,
    };
  }

  /**
   * Build request body for Qwen API
   */
  private buildRequestBody(request: AIRequest, model: string, stream: boolean = false): any {
    const messages = this.convertMessagesToQwenFormat(request.messages, request.systemPrompt);
    
    const body: any = {
      model,
      input: {
        messages,
      },
      parameters: {
        temperature: request.temperature,
        top_p: request.topP,
        max_tokens: request.maxTokens,
        incremental_output: stream,
      },
    };

    return body;
  }

  /**
   * Convert our message format to Qwen format
   */
  private convertMessagesToQwenFormat(messages: AIMessage[], systemPrompt?: string): any[] {
    const qwenMessages = [];

    // Add system message if provided
    if (systemPrompt) {
      qwenMessages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    // Convert messages
    for (const message of messages) {
      qwenMessages.push({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content,
      });
    }

    return qwenMessages;
  }

  /**
   * Map Qwen response to our AIResponse format
   */
  private mapQwenResponseToAIResponse(response: QwenResponse, model: string, request: AIRequest): AIResponse {
    if (response.status_code !== 200) {
      throw new AIError(
        response.message || `API error: ${response.code}`,
        this.provider,
        'API_ERROR'
      );
    }

    const content = response.output?.text || '';
    const finishReason = this.mapFinishReason(response.output?.finish_reason || 'stop');

    const usage = response.usage ? {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.total_tokens,
    } : {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };

    return {
      content,
      model,
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
   * Map Qwen stream chunk to our format
   */
  private mapQwenStreamChunkToAIStreamChunk(chunk: QwenStreamChunk, model: string): AIStreamChunk | null {
    if (!chunk.output) return null;

    const delta = chunk.output.text || '';
    const done = chunk.output.finish_reason !== undefined;

    const streamChunk: AIStreamChunk = {
      delta,
      done,
      model,
      provider: this.provider,
    };

    if (done && chunk.usage) {
      streamChunk.usage = {
        inputTokens: chunk.usage.input_tokens,
        outputTokens: chunk.usage.output_tokens,
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
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error?.message) {
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