/**
 * Base AI Adapter Implementation for BooksOfLife Multi-Provider System
 * 
 * This module provides the core abstractions for the AI service infrastructure,
 * including the base adapter class, circuit breaker pattern, caching, and
 * load balancing capabilities.
 */

import {
  AIProvider,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  AIModel,
  ProviderConfig,
  IAIAdapter,
  CircuitBreakerConfig,
  CircuitBreakerState,
  CircuitBreakerStatus,
  CacheConfig,
  LoadBalancingStrategy,
  AIServiceConfig,
  AIServiceStats,
  AIError,
  RateLimitError,
  AuthenticationError,
  QuotaExceededError,
  NetworkError,
  ModelNotAvailableError,
  TimeoutError,
} from '@/types/ai';

/**
 * Abstract base class for AI adapters
 * Provides common functionality and patterns for all provider implementations
 */
export abstract class BaseAIAdapter implements IAIAdapter {
  public abstract readonly provider: AIProvider;
  
  protected config: ProviderConfig | null = null;
  protected initialized = false;
  protected models: AIModel[] = [];
  
  /**
   * Initialize the adapter with provider-specific configuration
   */
  public async initialize(config: ProviderConfig): Promise<void> {
    this.config = config;
    
    if (!config.apiKey) {
      throw new AuthenticationError(this.provider, new Error('API key is required'));
    }
    
    try {
      // Validate configuration and test connection
      await this.validateConfiguration();
      
      // Load available models
      this.models = await this.fetchModels();
      
      this.initialized = true;
    } catch (error) {
      throw new AIError(
        `Failed to initialize ${this.provider} adapter`,
        this.provider,
        'INITIALIZATION_FAILED',
        false,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Check if the adapter is healthy and available
   */
  public async healthCheck(): Promise<boolean> {
    if (!this.initialized || !this.config) {
      return false;
    }

    try {
      return await this.performHealthCheck();
    } catch (error) {
      console.error(`Health check failed for ${this.provider}:`, error);
      return false;
    }
  }

  /**
   * Get available models for this provider
   */
  public async getModels(): Promise<AIModel[]> {
    if (!this.initialized) {
      throw new AIError(
        `Adapter not initialized for ${this.provider}`,
        this.provider,
        'NOT_INITIALIZED'
      );
    }
    
    return this.models;
  }

  /**
   * Send a request to the AI provider
   */
  public async request(request: AIRequest): Promise<AIResponse> {
    if (!this.initialized || !this.config) {
      throw new AIError(
        `Adapter not initialized for ${this.provider}`,
        this.provider,
        'NOT_INITIALIZED'
      );
    }

    const startTime = Date.now();

    try {
      // Validate request
      this.validateRequest(request);

      // Apply timeout
      const timeout = request.maxTokens ? 
        Math.max(this.config.timeout || 30000, request.maxTokens * 50) : 
        this.config.timeout || 30000;

      const response = await this.withTimeout(
        this.performRequest(request),
        timeout
      );

      response.metadata.duration = Date.now() - startTime;
      response.metadata.timestamp = startTime;
      response.provider = this.provider;

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      throw this.wrapError(error, duration);
    }
  }

  /**
   * Send a streaming request to the AI provider
   */
  public async* streamRequest(request: AIRequest): AsyncGenerator<AIStreamChunk, void, unknown> {
    if (!this.initialized || !this.config) {
      throw new AIError(
        `Adapter not initialized for ${this.provider}`,
        this.provider,
        'NOT_INITIALIZED'
      );
    }

    try {
      // Validate request
      this.validateRequest(request);

      // Ensure streaming is supported
      const model = this.models.find(m => m.id === request.model);
      if (model && !model.capabilities.supportsStreaming) {
        throw new AIError(
          `Model ${request.model} does not support streaming`,
          this.provider,
          'STREAMING_NOT_SUPPORTED'
        );
      }

      yield* this.performStreamRequest(request);
    } catch (error) {
      throw this.wrapError(error, 0);
    }
  }

  /**
   * Get current rate limit status
   */
  public async getRateLimitStatus(): Promise<{
    remaining: number;
    resetTime: number;
    limit: number;
  }> {
    if (!this.initialized) {
      throw new AIError(
        `Adapter not initialized for ${this.provider}`,
        this.provider,
        'NOT_INITIALIZED'
      );
    }

    return this.fetchRateLimitStatus();
  }

  // Abstract methods to be implemented by provider-specific adapters

  /**
   * Validate provider-specific configuration
   */
  protected abstract validateConfiguration(): Promise<void>;

  /**
   * Fetch available models from the provider
   */
  protected abstract fetchModels(): Promise<AIModel[]>;

  /**
   * Perform provider-specific health check
   */
  protected abstract performHealthCheck(): Promise<boolean>;

  /**
   * Perform the actual AI request
   */
  protected abstract performRequest(request: AIRequest): Promise<AIResponse>;

  /**
   * Perform the actual streaming AI request
   */
  protected abstract performStreamRequest(request: AIRequest): AsyncGenerator<AIStreamChunk, void, unknown>;

  /**
   * Fetch current rate limit status from provider
   */
  protected abstract fetchRateLimitStatus(): Promise<{
    remaining: number;
    resetTime: number;
    limit: number;
  }>;

  // Protected utility methods

  /**
   * Validate request parameters
   */
  protected validateRequest(request: AIRequest): void {
    if (!request.messages || request.messages.length === 0) {
      throw new AIError('Messages are required', this.provider, 'INVALID_REQUEST');
    }

    if (request.model) {
      const model = this.models.find(m => m.id === request.model);
      if (!model) {
        throw new ModelNotAvailableError(this.provider, request.model);
      }
      if (!model.available) {
        throw new ModelNotAvailableError(this.provider, request.model);
      }
    }

    if (request.temperature && (request.temperature < 0 || request.temperature > 1)) {
      throw new AIError('Temperature must be between 0 and 1', this.provider, 'INVALID_REQUEST');
    }

    if (request.topP && (request.topP < 0 || request.topP > 1)) {
      throw new AIError('Top-p must be between 0 and 1', this.provider, 'INVALID_REQUEST');
    }
  }

  /**
   * Add timeout to a promise
   */
  protected async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(this.provider, timeoutMs));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Wrap errors with appropriate AI error types
   */
  protected wrapError(error: unknown, duration: number): AIError {
    if (error instanceof AIError) {
      return error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const originalError = error instanceof Error ? error : new Error(String(error));

    // Common error patterns
    if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
      return new RateLimitError(this.provider, Date.now() + 60000, originalError);
    }

    if (errorMessage.includes('auth') || errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
      return new AuthenticationError(this.provider, originalError);
    }

    if (errorMessage.includes('timeout')) {
      return new TimeoutError(this.provider, duration, originalError);
    }

    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return new NetworkError(this.provider, originalError);
    }

    // Default to generic AI error
    return new AIError(
      `Request failed for ${this.provider}: ${errorMessage}`,
      this.provider,
      'REQUEST_FAILED',
      true,
      originalError
    );
  }
}

/**
 * Circuit breaker implementation for provider reliability
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private lastFailureTime?: number;
  private nextAttemptTime?: number;

  constructor(
    private readonly config: CircuitBreakerConfig,
    private readonly name: string
  ) {}

  /**
   * Execute a function with circuit breaker protection
   */
  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() < (this.nextAttemptTime || 0)) {
        throw new AIError(
          `Circuit breaker is open for ${this.name}`,
          this.name as AIProvider,
          'CIRCUIT_BREAKER_OPEN'
        );
      }
      
      // Try to transition to half-open
      this.state = 'half-open';
    }

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Circuit breaker timeout')), this.config.timeout);
        })
      ]);

      // Success - reset or close circuit
      this.onSuccess();
      return result;
    } catch (error) {
      // Failure - record and potentially open circuit
      this.onFailure();
      throw error;
    }
  }

  /**
   * Get current circuit breaker status
   */
  public getStatus(): CircuitBreakerStatus {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  public reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
    this.nextAttemptTime = undefined;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
    }
  }
}

/**
 * Simple in-memory cache for AI responses
 */
export class AICache {
  private cache = new Map<string, { data: AIResponse; expiry: number }>();
  private maxSize: number;

  constructor(private readonly config: CacheConfig) {
    this.maxSize = config.maxSize;
  }

  /**
   * Generate cache key from request
   */
  private getCacheKey(request: AIRequest): string {
    // Create a hash of the request to use as cache key
    const key = JSON.stringify({
      messages: request.messages,
      model: request.model,
      temperature: request.temperature,
      topP: request.topP,
      maxTokens: request.maxTokens,
      systemPrompt: request.systemPrompt,
    });
    
    return Buffer.from(key).toString('base64');
  }

  /**
   * Get cached response if available and not expired
   */
  public get(request: AIRequest): AIResponse | null {
    if (!this.config.enabled) {
      return null;
    }

    const key = this.getCacheKey(request);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Store response in cache
   */
  public set(request: AIRequest, response: AIResponse): void {
    if (!this.config.enabled) {
      return;
    }

    const key = this.getCacheKey(request);
    const expiry = Date.now() + this.config.ttl;

    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, { data: response, expiry });
  }

  /**
   * Clear all cached entries
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  public getStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // TODO: Implement hit rate tracking
    };
  }
}

/**
 * Load balancer for distributing requests across providers
 */
export class LoadBalancer {
  private roundRobinIndex = 0;

  constructor(
    private readonly strategy: LoadBalancingStrategy,
    private readonly providers: { provider: AIProvider; priority: number; adapter: IAIAdapter }[]
  ) {}

  /**
   * Select the best provider based on the configured strategy
   */
  public async selectProvider(): Promise<{ provider: AIProvider; adapter: IAIAdapter } | null> {
    const availableProviders = [];

    // Filter to only healthy providers
    for (const p of this.providers) {
      const isHealthy = await p.adapter.healthCheck();
      if (isHealthy) {
        availableProviders.push(p);
      }
    }

    if (availableProviders.length === 0) {
      return null;
    }

    switch (this.strategy) {
      case 'round-robin':
        return this.roundRobinSelect(availableProviders);
      case 'priority':
        return this.prioritySelect(availableProviders);
      case 'random':
        return this.randomSelect(availableProviders);
      case 'least-latency':
        // TODO: Implement latency-based selection
        return this.prioritySelect(availableProviders);
      default:
        return this.prioritySelect(availableProviders);
    }
  }

  private roundRobinSelect(providers: typeof this.providers): { provider: AIProvider; adapter: IAIAdapter } {
    const selected = providers[this.roundRobinIndex % providers.length];
    this.roundRobinIndex++;
    return { provider: selected.provider, adapter: selected.adapter };
  }

  private prioritySelect(providers: typeof this.providers): { provider: AIProvider; adapter: IAIAdapter } {
    const sorted = providers.sort((a, b) => b.priority - a.priority);
    return { provider: sorted[0].provider, adapter: sorted[0].adapter };
  }

  private randomSelect(providers: typeof this.providers): { provider: AIProvider; adapter: IAIAdapter } {
    const randomIndex = Math.floor(Math.random() * providers.length);
    const selected = providers[randomIndex];
    return { provider: selected.provider, adapter: selected.adapter };
  }
}

/**
 * Utility functions for AI service operations
 */
export class AIUtils {
  /**
   * Calculate estimated cost for a request
   */
  public static calculateCost(response: AIResponse, model: AIModel): number {
    const inputCost = (response.usage.inputTokens / 1000) * model.capabilities.costPerInputToken;
    const outputCost = (response.usage.outputTokens / 1000) * model.capabilities.costPerOutputToken;
    return inputCost + outputCost;
  }

  /**
   * Estimate tokens in text (rough approximation)
   */
  public static estimateTokens(text: string): number {
    // Rough approximation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Validate model capabilities against request requirements
   */
  public static validateModelCapabilities(request: AIRequest, model: AIModel): boolean {
    // Check context window
    const totalTokens = request.messages.reduce(
      (sum, msg) => sum + this.estimateTokens(msg.content), 0
    );
    
    if (totalTokens > model.capabilities.maxContextTokens) {
      return false;
    }

    // Check max output tokens
    if (request.maxTokens && request.maxTokens > model.capabilities.maxOutputTokens) {
      return false;
    }

    // Check streaming support
    if (request.stream && !model.capabilities.supportsStreaming) {
      return false;
    }

    // Check function calling support
    if (request.functions && !model.capabilities.supportsFunctionCalling) {
      return false;
    }

    return true;
  }

  /**
   * Create a retry delay with exponential backoff
   */
  public static calculateRetryDelay(attempt: number, baseDelay: number): number {
    return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
  }

  /**
   * Check if an error is retryable
   */
  public static isRetryableError(error: unknown): boolean {
    if (error instanceof AIError) {
      return error.retryable;
    }
    
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('timeout') || 
             message.includes('network') || 
             message.includes('connection') ||
             message.includes('rate limit');
    }

    return false;
  }
}