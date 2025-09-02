/**
 * Gemini AI Provider Adapter for BooksOfLife
 * 
 * Integrates with Google's Generative AI API (Gemini models)
 * Supports both chat and text generation capabilities
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
 * Gemini API response interface
 */
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Gemini streaming response chunk
 */
interface GeminiStreamChunk {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role: string;
    };
    finishReason?: string;
    index: number;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Gemini model information
 */
interface GeminiModelInfo {
  name: string;
  displayName: string;
  description: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  supportedGenerationMethods: string[];
}

/**
 * Gemini provider adapter implementation
 */
export class GeminiAdapter extends BaseAIAdapter {
  public readonly provider: AIProvider = 'gemini';
  
  private baseUrl = 'https://generativelanguage.googleapis.com';
  private apiVersion = 'v1beta';

  /**
   * Validate Gemini API configuration
   */
  protected async validateConfiguration(): Promise<void> {
    if (!this.config?.apiKey) {
      throw new AuthenticationError(this.provider, new Error('API key is required'));
    }

    try {
      // Test API connection by listing models
      const response = await fetch(
        `${this.config.baseUrl || this.baseUrl}/${this.apiVersion}/models?key=${this.config.apiKey}`,
        {
          method: 'GET',
          headers: {
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
   * Fetch available models from Gemini API
   */
  protected async fetchModels(): Promise<AIModel[]> {
    try {
      const response = await fetch(
        `${this.config?.baseUrl || this.baseUrl}/${this.apiVersion}/models?key=${this.config?.apiKey}`,
        {
          method: 'GET',
          headers: {
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
      if (data.models && Array.isArray(data.models)) {
        for (const modelInfo of data.models) {
          // Only include generative models
          if (modelInfo.supportedGenerationMethods?.includes('generateContent')) {
            const model = this.mapGeminiModelToAIModel(modelInfo);
            models.push(model);
          }
        }
      }

      // Add fallback models if API doesn't return expected models
      if (models.length === 0) {
        models.push(...this.getDefaultModels());
      }

      return models;
    } catch (error) {
      console.warn('Failed to fetch Gemini models from API, using defaults:', error);
      return this.getDefaultModels();
    }
  }

  /**
   * Map Gemini API model info to our AIModel format
   */
  private mapGeminiModelToAIModel(modelInfo: GeminiModelInfo): AIModel {
    const modelId = modelInfo.name.replace('models/', '');
    
    // Determine capabilities based on model name
    const capabilities = this.getModelCapabilities(modelId);

    return {
      id: modelId,
      name: modelInfo.displayName || modelId,
      provider: this.provider,
      capabilities,
      available: true,
    };
  }

  /**
   * Get default Gemini models
   */
  private getDefaultModels(): AIModel[] {
    return [
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: this.provider,
        capabilities: this.getModelCapabilities('gemini-1.5-pro'),
        available: true,
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: this.provider,
        capabilities: this.getModelCapabilities('gemini-1.5-flash'),
        available: true,
      },
      {
        id: 'gemini-1.0-pro',
        name: 'Gemini 1.0 Pro',
        provider: this.provider,
        capabilities: this.getModelCapabilities('gemini-1.0-pro'),
        available: true,
      },
    ];
  }

  /**
   * Get capabilities for a specific model
   */
  private getModelCapabilities(modelId: string): ModelCapabilities {
    const capabilities: Record<string, ModelCapabilities> = {
      'gemini-1.5-pro': {
        maxContextTokens: 2000000, // 2M context window
        maxOutputTokens: 8192,
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsImages: true,
        supportsDocuments: true,
        costPerInputToken: 0.0000035, // $3.50 per 1M tokens
        costPerOutputToken: 0.0000105, // $10.50 per 1M tokens
      },
      'gemini-1.5-flash': {
        maxContextTokens: 1000000, // 1M context window
        maxOutputTokens: 8192,
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsImages: true,
        supportsDocuments: true,
        costPerInputToken: 0.00000035, // $0.35 per 1M tokens
        costPerOutputToken: 0.00000105, // $1.05 per 1M tokens
      },
      'gemini-1.0-pro': {
        maxContextTokens: 32768, // 32K context window
        maxOutputTokens: 8192,
        supportsStreaming: true,
        supportsFunctionCalling: false,
        supportsImages: false,
        supportsDocuments: false,
        costPerInputToken: 0.0000005, // $0.50 per 1M tokens
        costPerOutputToken: 0.0000015, // $1.50 per 1M tokens
      },
    };

    return capabilities[modelId] || capabilities['gemini-1.5-flash'];
  }

  /**
   * Perform health check
   */
  protected async performHealthCheck(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config?.baseUrl || this.baseUrl}/${this.apiVersion}/models?key=${this.config?.apiKey}`,
        {
          method: 'GET',
          headers: {
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
    const modelName = request.model || 'gemini-1.5-flash';
    const url = `${this.config?.baseUrl || this.baseUrl}/${this.apiVersion}/models/${modelName}:generateContent?key=${this.config?.apiKey}`;

    const requestBody = this.buildRequestBody(request);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        await this.handleApiError(response);
      }

      const data: GeminiResponse = await response.json();
      return this.mapGeminiResponseToAIResponse(data, modelName, request);
    } catch (error) {
      throw this.wrapError(error, 0);
    }
  }

  /**
   * Perform streaming AI request
   */
  protected async* performStreamRequest(request: AIRequest): AsyncGenerator<AIStreamChunk, void, unknown> {
    const modelName = request.model || 'gemini-1.5-flash';
    const url = `${this.config?.baseUrl || this.baseUrl}/${this.apiVersion}/models/${modelName}:streamGenerateContent?key=${this.config?.apiKey}`;

    const requestBody = this.buildRequestBody(request);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
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
                const chunk: GeminiStreamChunk = JSON.parse(jsonData);
                const streamChunk = this.mapGeminiStreamChunkToAIStreamChunk(chunk, modelName);
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
    // Gemini doesn't provide detailed rate limit headers
    // Return approximate values based on known limits
    return {
      remaining: 60, // Approximate requests per minute
      resetTime: Date.now() + 60000, // Reset in 1 minute
      limit: 60,
    };
  }

  /**
   * Build request body for Gemini API
   */
  private buildRequestBody(request: AIRequest): any {
    const contents = this.convertMessagesToGeminiFormat(request.messages);
    
    const body: any = {
      contents,
      generationConfig: {
        temperature: request.temperature,
        topP: request.topP,
        maxOutputTokens: request.maxTokens,
      },
    };

    // Add system instruction if provided
    if (request.systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: request.systemPrompt }],
      };
    }

    return body;
  }

  /**
   * Convert our message format to Gemini format
   */
  private convertMessagesToGeminiFormat(messages: AIMessage[]): any[] {
    const geminiContents = [];

    for (const message of messages) {
      // Skip system messages as they're handled separately
      if (message.role === 'system') continue;

      const role = message.role === 'assistant' ? 'model' : 'user';
      
      geminiContents.push({
        role,
        parts: [{ text: message.content }],
      });
    }

    return geminiContents;
  }

  /**
   * Map Gemini response to our AIResponse format
   */
  private mapGeminiResponseToAIResponse(response: GeminiResponse, model: string, request: AIRequest): AIResponse {
    const candidate = response.candidates?.[0];
    if (!candidate) {
      throw new AIError('No candidates in response', this.provider, 'INVALID_RESPONSE');
    }

    const content = candidate.content?.parts?.[0]?.text || '';
    const finishReason = this.mapFinishReason(candidate.finishReason);

    const usage = response.usageMetadata ? {
      inputTokens: response.usageMetadata.promptTokenCount,
      outputTokens: response.usageMetadata.candidatesTokenCount,
      totalTokens: response.usageMetadata.totalTokenCount,
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
   * Map Gemini stream chunk to our format
   */
  private mapGeminiStreamChunkToAIStreamChunk(chunk: GeminiStreamChunk, model: string): AIStreamChunk | null {
    const candidate = chunk.candidates?.[0];
    if (!candidate) return null;

    const delta = candidate.content?.parts?.[0]?.text || '';
    const done = candidate.finishReason !== undefined;

    const streamChunk: AIStreamChunk = {
      delta,
      done,
      model,
      provider: this.provider,
    };

    if (done && chunk.usageMetadata) {
      streamChunk.usage = {
        inputTokens: chunk.usageMetadata.promptTokenCount,
        outputTokens: chunk.usageMetadata.candidatesTokenCount,
        totalTokens: chunk.usageMetadata.totalTokenCount,
      };
    }

    return streamChunk;
  }

  /**
   * Map Gemini finish reason to our format
   */
  private mapFinishReason(finishReason: string): 'stop' | 'length' | 'function_call' | 'error' {
    switch (finishReason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
      case 'RECITATION':
      case 'OTHER':
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