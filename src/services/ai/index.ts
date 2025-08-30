/**
 * Main AI Service for BooksOfLife Multi-Provider System
 * 
 * This service coordinates multiple AI providers, implements intelligent routing,
 * failover mechanisms, load balancing, and provides a unified interface for
 * all AI operations in the BooksOfLife application.
 */

import {
  AIProvider,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  AIModel,
  ProviderConfig,
  IAIAdapter,
  AIServiceConfig,
  AIServiceStats,
  LoadBalancingStrategy,
  AIError,
  RateLimitError,
  NetworkError,
  TimeoutError,
} from '@/types/ai';

import {
  BaseAIAdapter,
  CircuitBreaker,
  AICache,
  LoadBalancer,
  AIUtils,
} from './base';

import { createAdapter } from './providers';

/**
 * Main AI service class that orchestrates all AI providers
 */
export class AIService {
  private adapters = new Map<AIProvider, IAIAdapter>();
  private circuitBreakers = new Map<AIProvider, CircuitBreaker>();
  private cache: AICache;
  private loadBalancer: LoadBalancer;
  private initialized = false;
  private stats: AIServiceStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    providerStats: {} as any,
    cacheHitRate: 0,
    totalTokensUsed: 0,
    estimatedCost: 0,
  };

  constructor(private readonly config: AIServiceConfig) {
    this.cache = new AICache(config.cache);
    this.initializeStats();
  }

  /**
   * Initialize the AI service with all configured providers
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const adapterPromises = this.config.providers.map(async (providerConfig) => {
      if (!providerConfig.enabled) {
        return;
      }

      try {
        // Create adapter instance (would be provider-specific)
        const adapter = await this.createAdapter(providerConfig);
        await adapter.initialize(providerConfig);
        
        this.adapters.set(providerConfig.provider, adapter);
        
        // Create circuit breaker for this provider
        const circuitBreaker = new CircuitBreaker(
          this.config.circuitBreaker,
          providerConfig.provider
        );
        this.circuitBreakers.set(providerConfig.provider, circuitBreaker);

        console.log(`Initialized ${providerConfig.provider} adapter`);
      } catch (error) {
        console.error(`Failed to initialize ${providerConfig.provider} adapter:`, error);
      }
    });

    await Promise.allSettled(adapterPromises);

    // Create load balancer with initialized adapters
    const providerList = Array.from(this.adapters.entries()).map(([provider, adapter]) => {
      const config = this.config.providers.find(p => p.provider === provider)!;
      return {
        provider,
        priority: config.priority,
        adapter,
      };
    });

    this.loadBalancer = new LoadBalancer(this.config.loadBalancingStrategy, providerList);
    this.initialized = true;

    console.log(`AI Service initialized with ${this.adapters.size} providers`);
  }

  /**
   * Send a request to the best available AI provider
   */
  public async request(request: AIRequest): Promise<AIResponse> {
    if (!this.initialized) {
      throw new AIError('AI Service not initialized', 'gemini', 'NOT_INITIALIZED');
    }

    this.stats.totalRequests++;
    const startTime = Date.now();

    try {
      // Check cache first
      const cachedResponse = this.cache.get(request);
      if (cachedResponse) {
        this.updateCacheHitStats();
        return cachedResponse;
      }

      // Select provider and make request with retry logic
      const response = await this.requestWithRetry(request);
      
      // Cache successful response
      this.cache.set(request, response);
      
      // Update statistics
      this.updateSuccessStats(response.provider, Date.now() - startTime, response);
      
      return response;
    } catch (error) {
      this.updateFailureStats(Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Send a streaming request to the best available AI provider
   */
  public async* streamRequest(request: AIRequest): AsyncGenerator<AIStreamChunk, void, unknown> {
    if (!this.initialized) {
      throw new AIError('AI Service not initialized', 'gemini', 'NOT_INITIALIZED');
    }

    this.stats.totalRequests++;
    const startTime = Date.now();

    try {
      // Get best provider
      const selection = await this.loadBalancer.selectProvider();
      if (!selection) {
        throw new AIError('No providers available', 'gemini', 'NO_PROVIDERS_AVAILABLE');
      }

      const { provider, adapter } = selection;
      const circuitBreaker = this.circuitBreakers.get(provider)!;

      // Execute with circuit breaker protection
      const generator = await circuitBreaker.execute(async () => {
        return adapter.streamRequest(request);
      });

      let totalTokens = 0;
      let outputTokens = 0;

      for await (const chunk of generator) {
        yield chunk;

        if (chunk.usage) {
          totalTokens = chunk.usage.totalTokens;
          outputTokens = chunk.usage.outputTokens;
        }
      }

      // Update statistics for streaming request
      this.updateSuccessStats(provider, Date.now() - startTime, {
        usage: { totalTokens, outputTokens, inputTokens: totalTokens - outputTokens },
      } as any);

    } catch (error) {
      this.updateFailureStats(Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Get all available models across all providers
   */
  public async getAllModels(): Promise<AIModel[]> {
    if (!this.initialized) {
      throw new AIError('AI Service not initialized', 'gemini', 'NOT_INITIALIZED');
    }

    const modelPromises = Array.from(this.adapters.values()).map(async (adapter) => {
      try {
        return await adapter.getModels();
      } catch (error) {
        console.error(`Failed to get models from adapter:`, error);
        return [];
      }
    });

    const modelArrays = await Promise.allSettled(modelPromises);
    const allModels = modelArrays
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => (result as PromiseFulfilledResult<AIModel[]>).value);

    return allModels;
  }

  /**
   * Get models from a specific provider
   */
  public async getModelsByProvider(provider: AIProvider): Promise<AIModel[]> {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new AIError(`Provider ${provider} not available`, provider, 'PROVIDER_NOT_AVAILABLE');
    }

    return adapter.getModels();
  }

  /**
   * Check health status of all providers
   */
  public async getHealthStatus(): Promise<Record<AIProvider, boolean>> {
    const healthPromises = Array.from(this.adapters.entries()).map(async ([provider, adapter]) => {
      try {
        const isHealthy = await adapter.healthCheck();
        return [provider, isHealthy] as const;
      } catch (error) {
        return [provider, false] as const;
      }
    });

    const healthResults = await Promise.allSettled(healthPromises);
    const healthStatus: Record<string, boolean> = {};

    healthResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        const [provider, isHealthy] = result.value;
        healthStatus[provider] = isHealthy;
      }
    });

    return healthStatus as Record<AIProvider, boolean>;
  }

  /**
   * Get comprehensive service statistics
   */
  public getStats(): AIServiceStats {
    return { ...this.stats };
  }

  /**
   * Reset all statistics
   */
  public resetStats(): void {
    this.initializeStats();
  }

  /**
   * Get circuit breaker status for all providers
   */
  public getCircuitBreakerStatus(): Record<AIProvider, any> {
    const status: Record<string, any> = {};
    
    this.circuitBreakers.forEach((breaker, provider) => {
      status[provider] = breaker.getStatus();
    });

    return status as Record<AIProvider, any>;
  }

  /**
   * Manually reset circuit breaker for a provider
   */
  public resetCircuitBreaker(provider: AIProvider): void {
    const breaker = this.circuitBreakers.get(provider);
    if (breaker) {
      breaker.reset();
    }
  }

  /**
   * Clear the response cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return this.cache.getStats();
  }

  // Private methods

  /**
   * Create adapter instance for a provider
   */
  private async createAdapter(config: ProviderConfig): Promise<IAIAdapter> {
    return createAdapter(config.provider);
  }

  /**
   * Make request with retry logic and provider failover
   */
  private async requestWithRetry(request: AIRequest): Promise<AIResponse> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        // Get best provider
        const selection = await this.loadBalancer.selectProvider();
        if (!selection) {
          throw new AIError('No providers available', 'gemini', 'NO_PROVIDERS_AVAILABLE');
        }

        const { provider, adapter } = selection;
        const circuitBreaker = this.circuitBreakers.get(provider)!;

        // Validate model capabilities if specific model requested
        if (request.model) {
          const models = await adapter.getModels();
          const model = models.find(m => m.id === request.model);
          if (model && !AIUtils.validateModelCapabilities(request, model)) {
            throw new AIError(
              `Model ${request.model} capabilities don't match request requirements`,
              provider,
              'MODEL_CAPABILITIES_MISMATCH'
            );
          }
        }

        // Execute with circuit breaker protection
        const response = await circuitBreaker.execute(() => adapter.request(request));
        return response;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry non-retryable errors
        if (!AIUtils.isRetryableError(error)) {
          break;
        }

        // Wait before retry with exponential backoff
        if (attempt < this.config.maxRetries - 1) {
          const delay = AIUtils.calculateRetryDelay(attempt, this.config.retryDelay);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    throw lastError || new AIError('All retry attempts failed', 'gemini', 'ALL_RETRIES_FAILED');
  }

  /**
   * Initialize statistics structure
   */
  private initializeStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      providerStats: {},
      cacheHitRate: 0,
      totalTokensUsed: 0,
      estimatedCost: 0,
    };

    // Initialize provider stats
    this.config.providers.forEach(({ provider }) => {
      this.stats.providerStats[provider] = {
        requests: 0,
        successes: 0,
        failures: 0,
        averageLatency: 0,
        lastUsed: 0,
      };
    });
  }

  /**
   * Update statistics for successful requests
   */
  private updateSuccessStats(provider: AIProvider, duration: number, response: AIResponse): void {
    this.stats.successfulRequests++;
    this.stats.totalTokensUsed += response.usage.totalTokens;
    
    // Update average response time
    const totalDuration = this.stats.averageResponseTime * (this.stats.totalRequests - 1) + duration;
    this.stats.averageResponseTime = totalDuration / this.stats.totalRequests;

    // Update provider-specific stats
    const providerStats = this.stats.providerStats[provider];
    if (providerStats) {
      providerStats.requests++;
      providerStats.successes++;
      providerStats.lastUsed = Date.now();
      
      // Update provider average latency
      const totalLatency = providerStats.averageLatency * (providerStats.requests - 1) + duration;
      providerStats.averageLatency = totalLatency / providerStats.requests;
    }
  }

  /**
   * Update statistics for failed requests
   */
  private updateFailureStats(duration: number): void {
    this.stats.failedRequests++;
    
    // Update average response time (including failures)
    const totalDuration = this.stats.averageResponseTime * (this.stats.totalRequests - 1) + duration;
    this.stats.averageResponseTime = totalDuration / this.stats.totalRequests;
  }

  /**
   * Update cache hit statistics
   */
  private updateCacheHitStats(): void {
    // Cache hit doesn't count as a provider request, but affects hit rate
    const cacheStats = this.cache.getStats();
    this.stats.cacheHitRate = cacheStats.hitRate;
  }
}

/**
 * Global AI service instance
 */
let aiServiceInstance: AIService | null = null;

/**
 * Initialize the global AI service instance
 */
export async function initializeAIService(config: AIServiceConfig): Promise<AIService> {
  if (aiServiceInstance) {
    return aiServiceInstance;
  }

  aiServiceInstance = new AIService(config);
  await aiServiceInstance.initialize();
  
  return aiServiceInstance;
}

/**
 * Get the global AI service instance
 */
export function getAIService(): AIService {
  if (!aiServiceInstance) {
    throw new AIError('AI Service not initialized', 'gemini', 'NOT_INITIALIZED');
  }
  
  return aiServiceInstance;
}

/**
 * Convenience function for making AI requests
 */
export async function askAI(request: AIRequest): Promise<AIResponse> {
  const service = getAIService();
  return service.request(request);
}

/**
 * Convenience function for streaming AI requests
 */
export async function* streamAI(request: AIRequest): AsyncGenerator<AIStreamChunk, void, unknown> {
  const service = getAIService();
  yield* service.streamRequest(request);
}

// Export types and classes for use by provider implementations
export * from './base';
export type {
  AIProvider,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  AIModel,
  ProviderConfig,
  IAIAdapter,
  AIServiceConfig,
  AIServiceStats,
} from '@/types/ai';