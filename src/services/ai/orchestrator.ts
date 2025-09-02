/**
 * AI Orchestrator for BooksOfLife Multi-Provider System
 * 
 * This module provides high-level orchestration of AI services, coordinating
 * between providers, managing failover scenarios, implementing load balancing,
 * and providing comprehensive error handling and recovery mechanisms.
 */

import {
  AIProvider,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  AIModel,
  IAIAdapter,
  AIServiceConfig,
  AIServiceStats,
  AIError,
  RateLimitError,
  NetworkError,
  TimeoutError,
  AuthenticationError,
} from '@/types/ai';

import { CircuitBreaker, AICache, AIUtils } from './base';
import { AIRouter, RoutingCriteria, ProviderSelection } from './router';
import { createAdapter } from './providers';

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig extends AIServiceConfig {
  /** Enable automatic failover */
  enableFailover: boolean;
  /** Maximum providers to try in failover chain */
  maxFailoverAttempts: number;
  /** Enable request queuing during high load */
  enableRequestQueuing: boolean;
  /** Maximum queue size */
  maxQueueSize: number;
  /** Queue timeout in milliseconds */
  queueTimeout: number;
}

/**
 * Request context for orchestration
 */
export interface RequestContext {
  /** Original request */
  request: AIRequest;
  /** Routing criteria */
  criteria: RoutingCriteria;
  /** Attempt number */
  attempt: number;
  /** Start time */
  startTime: number;
  /** Attempted providers */
  attemptedProviders: AIProvider[];
  /** Last error encountered */
  lastError?: Error;
  /** Request ID for tracking */
  requestId: string;
}

/**
 * Orchestration result
 */
export interface OrchestrationResult<T = AIResponse> {
  /** Result data */
  data: T;
  /** Provider used */
  provider: AIProvider;
  /** Total attempts made */
  attempts: number;
  /** Total duration */
  duration: number;
  /** Whether failover was used */
  failoverUsed: boolean;
  /** Providers attempted */
  providersAttempted: AIProvider[];
}

/**
 * Request queue item
 */
interface QueuedRequest {
  context: RequestContext;
  resolve: (result: OrchestrationResult) => void;
  reject: (error: Error) => void;
  queuedAt: number;
}

/**
 * Main AI Orchestrator class
 */
export class AIOrchestrator {
  private adapters = new Map<AIProvider, IAIAdapter>();
  private circuitBreakers = new Map<AIProvider, CircuitBreaker>();
  private cache: AICache;
  private router: AIRouter;
  private initialized = false;
  private stats: AIServiceStats;
  private requestQueue: QueuedRequest[] = [];
  private activeRequests = 0;
  private maxConcurrentRequests = 10;

  constructor(private readonly config: OrchestratorConfig) {
    this.cache = new AICache(config.cache);
    this.stats = this.initializeStats();
    this.maxConcurrentRequests = config.providers.length * 3; // Allow 3 concurrent per provider
  }

  /**
   * Initialize the orchestrator with all configured providers
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('Initializing AI Orchestrator...');

    // Initialize adapters and circuit breakers
    const initPromises = this.config.providers.map(async (providerConfig) => {
      if (!providerConfig.enabled) {
        return;
      }

      try {
        const adapter = createAdapter(providerConfig.provider);
        await adapter.initialize(providerConfig);
        
        this.adapters.set(providerConfig.provider, adapter);
        
        const circuitBreaker = new CircuitBreaker(
          this.config.circuitBreaker,
          providerConfig.provider
        );
        this.circuitBreakers.set(providerConfig.provider, circuitBreaker);

        console.log(`✓ Initialized ${providerConfig.provider} adapter`);
      } catch (error) {
        console.error(`✗ Failed to initialize ${providerConfig.provider}:`, error);
      }
    });

    await Promise.allSettled(initPromises);

    // Initialize router
    this.router = new AIRouter(
      this.adapters,
      this.circuitBreakers,
      this.config.loadBalancingStrategy
    );

    this.initialized = true;
    console.log(`AI Orchestrator initialized with ${this.adapters.size} providers`);

    // Start background tasks
    this.startBackgroundTasks();
  }

  /**
   * Execute an AI request with full orchestration
   */
  public async executeRequest(
    request: AIRequest,
    criteria: RoutingCriteria = {}
  ): Promise<OrchestrationResult> {
    this.ensureInitialized();
    this.stats.totalRequests++;

    // Check cache first
    const cachedResponse = this.cache.get(request);
    if (cachedResponse) {
      this.updateCacheHitStats();
      return {
        data: cachedResponse,
        provider: cachedResponse.provider,
        attempts: 0,
        duration: 0,
        failoverUsed: false,
        providersAttempted: [],
      };
    }

    const context: RequestContext = {
      request,
      criteria,
      attempt: 0,
      startTime: Date.now(),
      attemptedProviders: [],
      requestId: this.generateRequestId(),
    };

    // Handle request queuing if enabled
    if (this.config.enableRequestQueuing && this.shouldQueueRequest()) {
      return this.queueRequest(context);
    }

    return this.executeRequestInternal(context);
  }

  /**
   * Execute a streaming AI request with orchestration
   */
  public async* executeStreamRequest(
    request: AIRequest,
    criteria: RoutingCriteria = {}
  ): AsyncGenerator<AIStreamChunk, OrchestrationResult<void>, unknown> {
    this.ensureInitialized();
    this.stats.totalRequests++;

    const context: RequestContext = {
      request: { ...request, stream: true },
      criteria,
      attempt: 0,
      startTime: Date.now(),
      attemptedProviders: [],
      requestId: this.generateRequestId(),
    };

    yield* this.executeStreamRequestInternal(context);
  }

  /**
   * Get comprehensive orchestrator statistics
   */
  public getStats(): AIServiceStats {
    return { ...this.stats };
  }

  /**
   * Get health status of all providers
   */
  public async getHealthStatus(): Promise<Record<AIProvider, boolean>> {
    const healthStatus: Record<string, boolean> = {};
    
    const healthChecks = Array.from(this.adapters.entries()).map(async ([provider, adapter]) => {
      try {
        const isHealthy = await adapter.healthCheck();
        const circuitOpen = this.circuitBreakers.get(provider)?.getStatus().state === 'open';
        healthStatus[provider] = isHealthy && !circuitOpen;
      } catch (error) {
        healthStatus[provider] = false;
      }
    });

    await Promise.allSettled(healthChecks);
    return healthStatus as Record<AIProvider, boolean>;
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
   * Manually trigger failover for a provider
   */
  public async triggerFailover(
    provider: AIProvider,
    reason: string = 'Manual failover'
  ): Promise<void> {
    const circuitBreaker = this.circuitBreakers.get(provider);
    if (circuitBreaker) {
      // Force circuit breaker to open
      console.log(`Triggering failover for ${provider}: ${reason}`);
      // In a real implementation, would have a method to force-open the circuit
    }
  }

  /**
   * Reset circuit breaker for a provider
   */
  public resetCircuitBreaker(provider: AIProvider): void {
    const circuitBreaker = this.circuitBreakers.get(provider);
    if (circuitBreaker) {
      circuitBreaker.reset();
      console.log(`Circuit breaker reset for ${provider}`);
    }
  }

  /**
   * Clear response cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Reset all statistics
   */
  public resetStats(): void {
    this.stats = this.initializeStats();
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    console.log('Shutting down AI Orchestrator...');
    
    // Wait for active requests to complete (with timeout)
    const shutdownTimeout = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.activeRequests > 0 && Date.now() - startTime < shutdownTimeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Clear any remaining queued requests
    this.requestQueue.forEach(item => {
      item.reject(new AIError('Service shutting down', 'gemini', 'SHUTDOWN'));
    });
    this.requestQueue = [];

    this.initialized = false;
    console.log('AI Orchestrator shutdown complete');
  }

  // Private methods

  /**
   * Internal request execution with failover logic
   */
  private async executeRequestInternal(context: RequestContext): Promise<OrchestrationResult> {
    this.activeRequests++;
    
    try {
      while (context.attempt < this.config.maxRetries) {
        try {
          // Select provider
          const selection = await this.router.selectProvider(
            context.request,
            {
              ...context.criteria,
              excludedProviders: context.attemptedProviders,
            }
          );

          if (!selection) {
            throw new AIError(
              'No providers available',
              'gemini',
              'NO_PROVIDERS_AVAILABLE'
            );
          }

          context.attemptedProviders.push(selection.provider);
          context.attempt++;

          // Execute request with circuit breaker protection
          const response = await this.executeWithCircuitBreaker(
            selection.provider,
            selection.adapter,
            context.request
          );

          // Cache successful response
          this.cache.set(context.request, response);

          // Update success statistics
          const duration = Date.now() - context.startTime;
          this.updateSuccessStats(selection.provider, duration, response);

          return {
            data: response,
            provider: selection.provider,
            attempts: context.attempt,
            duration,
            failoverUsed: context.attempt > 1,
            providersAttempted: [...context.attemptedProviders],
          };

        } catch (error) {
          context.lastError = error instanceof Error ? error : new Error(String(error));
          
          console.warn(
            `Request attempt ${context.attempt} failed for ${context.requestId}:`,
            context.lastError.message
          );

          // Check if we should retry
          if (!this.shouldRetry(context.lastError, context.attempt)) {
            break;
          }

          // Wait before retry with exponential backoff
          if (context.attempt < this.config.maxRetries) {
            const delay = AIUtils.calculateRetryDelay(context.attempt - 1, this.config.retryDelay);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // All attempts failed
      const duration = Date.now() - context.startTime;
      this.updateFailureStats(duration);
      
      throw new AIError(
        `All ${context.attempt} attempts failed for request ${context.requestId}`,
        'gemini',
        'ALL_ATTEMPTS_FAILED',
        false,
        context.lastError
      );

    } finally {
      this.activeRequests--;
      this.processQueue(); // Process any queued requests
    }
  }

  /**
   * Internal streaming request execution
   */
  private async* executeStreamRequestInternal(
    context: RequestContext
  ): AsyncGenerator<AIStreamChunk, OrchestrationResult<void>, unknown> {
    this.activeRequests++;
    
    try {
      let lastError: Error | null = null;
      
      while (context.attempt < this.config.maxRetries) {
        try {
          // Select provider
          const selection = await this.router.selectProvider(
            context.request,
            {
              ...context.criteria,
              excludedProviders: context.attemptedProviders,
            }
          );

          if (!selection) {
            throw new AIError(
              'No providers available for streaming',
              'gemini',
              'NO_PROVIDERS_AVAILABLE'
            );
          }

          context.attemptedProviders.push(selection.provider);
          context.attempt++;

          // Execute streaming request with circuit breaker protection
          const generator = await this.executeStreamWithCircuitBreaker(
            selection.provider,
            selection.adapter,
            context.request
          );

          let totalTokens = 0;
          let outputTokens = 0;

          for await (const chunk of generator) {
            yield chunk;

            if (chunk.usage) {
              totalTokens = chunk.usage.totalTokens;
              outputTokens = chunk.usage.outputTokens;
            }
          }

          // Update success statistics
          const duration = Date.now() - context.startTime;
          this.updateSuccessStats(selection.provider, duration, {
            usage: { totalTokens, outputTokens, inputTokens: totalTokens - outputTokens },
          } as any);

          return {
            data: undefined as any,
            provider: selection.provider,
            attempts: context.attempt,
            duration,
            failoverUsed: context.attempt > 1,
            providersAttempted: [...context.attemptedProviders],
          };

        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          console.warn(
            `Streaming attempt ${context.attempt} failed for ${context.requestId}:`,
            lastError.message
          );

          // For streaming, we typically don't retry as the stream may have started
          if (!this.shouldRetryStream(lastError, context.attempt)) {
            break;
          }
        }
      }

      // All attempts failed
      const duration = Date.now() - context.startTime;
      this.updateFailureStats(duration);
      
      throw lastError || new AIError(
        `All streaming attempts failed for request ${context.requestId}`,
        'gemini',
        'ALL_STREAM_ATTEMPTS_FAILED'
      );

    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  /**
   * Execute request with circuit breaker protection
   */
  private async executeWithCircuitBreaker(
    provider: AIProvider,
    adapter: IAIAdapter,
    request: AIRequest
  ): Promise<AIResponse> {
    const circuitBreaker = this.circuitBreakers.get(provider)!;
    
    return circuitBreaker.execute(async () => {
      return adapter.request(request);
    });
  }

  /**
   * Execute streaming request with circuit breaker protection
   */
  private async executeStreamWithCircuitBreaker(
    provider: AIProvider,
    adapter: IAIAdapter,
    request: AIRequest
  ): Promise<AsyncGenerator<AIStreamChunk, void, unknown>> {
    const circuitBreaker = this.circuitBreakers.get(provider)!;
    
    return circuitBreaker.execute(async () => {
      return adapter.streamRequest(request);
    });
  }

  /**
   * Determine if a request should be retried
   */
  private shouldRetry(error: Error, attempt: number): boolean {
    if (attempt >= this.config.maxRetries) {
      return false;
    }

    if (!this.config.enableFailover) {
      return false;
    }

    return AIUtils.isRetryableError(error);
  }

  /**
   * Determine if a streaming request should be retried
   */
  private shouldRetryStream(error: Error, attempt: number): boolean {
    // Generally more conservative with streaming retries
    if (attempt >= Math.min(this.config.maxRetries, 2)) {
      return false;
    }

    // Only retry on connection errors before streaming starts
    return error instanceof NetworkError || error instanceof TimeoutError;
  }

  /**
   * Check if request should be queued
   */
  private shouldQueueRequest(): boolean {
    return this.activeRequests >= this.maxConcurrentRequests &&
           this.requestQueue.length < this.config.maxQueueSize;
  }

  /**
   * Queue a request for later processing
   */
  private async queueRequest(context: RequestContext): Promise<OrchestrationResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.requestQueue.findIndex(item => item.context.requestId === context.requestId);
        if (index !== -1) {
          this.requestQueue.splice(index, 1);
          reject(new AIError('Request queue timeout', 'gemini', 'QUEUE_TIMEOUT'));
        }
      }, this.config.queueTimeout);

      this.requestQueue.push({
        context,
        resolve: (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        queuedAt: Date.now(),
      });
    });
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
      const queuedRequest = this.requestQueue.shift()!;
      
      // Execute queued request
      this.executeRequestInternal(queuedRequest.context)
        .then(queuedRequest.resolve)
        .catch(queuedRequest.reject);
    }
  }

  /**
   * Start background maintenance tasks
   */
  private startBackgroundTasks(): void {
    // Health check interval
    setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        console.error('Background health check failed:', error);
      }
    }, 60000); // Every minute

    // Cache cleanup interval
    setInterval(() => {
      // Cache is self-cleaning based on TTL
      // This could add additional cleanup logic
    }, 300000); // Every 5 minutes

    // Statistics aggregation
    setInterval(() => {
      this.aggregateStats();
    }, 30000); // Every 30 seconds
  }

  /**
   * Perform background health checks
   */
  private async performHealthChecks(): Promise<void> {
    const healthPromises = Array.from(this.adapters.entries()).map(async ([provider, adapter]) => {
      try {
        const isHealthy = await adapter.healthCheck();
        if (!isHealthy) {
          console.warn(`Provider ${provider} health check failed`);
        }
      } catch (error) {
        console.warn(`Health check error for ${provider}:`, error);
      }
    });

    await Promise.allSettled(healthPromises);
  }

  /**
   * Aggregate statistics from various sources
   */
  private aggregateStats(): void {
    // Update cache hit rate from cache stats
    const cacheStats = this.cache.getStats();
    this.stats.cacheHitRate = cacheStats.hitRate;

    // Calculate success rate
    const totalCompleted = this.stats.successfulRequests + this.stats.failedRequests;
    if (totalCompleted > 0) {
      // Additional metrics could be calculated here
    }
  }

  /**
   * Ensure orchestrator is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new AIError('Orchestrator not initialized', 'gemini', 'NOT_INITIALIZED');
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize statistics structure
   */
  private initializeStats(): AIServiceStats {
    const stats: AIServiceStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      providerStats: {},
      cacheHitRate: 0,
      totalTokensUsed: 0,
      estimatedCost: 0,
    };

    // Initialize provider-specific stats
    this.config.providers.forEach(({ provider }) => {
      stats.providerStats[provider] = {
        requests: 0,
        successes: 0,
        failures: 0,
        averageLatency: 0,
        lastUsed: 0,
      };
    });

    return stats;
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
    // Cache hit affects overall statistics
    const cacheStats = this.cache.getStats();
    this.stats.cacheHitRate = cacheStats.hitRate;
  }
}

/**
 * Orchestrator factory with default configuration
 */
export function createOrchestrator(config: AIServiceConfig): AIOrchestrator {
  const orchestratorConfig: OrchestratorConfig = {
    ...config,
    enableFailover: true,
    maxFailoverAttempts: 3,
    enableRequestQueuing: true,
    maxQueueSize: 100,
    queueTimeout: 30000,
  };

  return new AIOrchestrator(orchestratorConfig);
}

/**
 * High-level orchestration utilities
 */
export class OrchestrationUtils {
  /**
   * Create a resilient request wrapper
   */
  public static async executeWithResilience<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries - 1) {
          const delay = AIUtils.calculateRetryDelay(attempt, baseDelay);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * Calculate optimal timeout based on request complexity
   */
  public static calculateOptimalTimeout(request: AIRequest): number {
    const baseTimeout = 30000; // 30 seconds
    
    // Add time based on estimated complexity
    const messageTokens = request.messages.reduce(
      (sum, msg) => sum + AIUtils.estimateTokens(msg.content), 0
    );
    
    const complexityFactor = Math.min(messageTokens / 1000, 5); // Cap at 5x
    const outputFactor = request.maxTokens ? Math.min(request.maxTokens / 1000, 3) : 1;
    
    return baseTimeout * (1 + complexityFactor + outputFactor);
  }

  /**
   * Detect if request needs special handling
   */
  public static analyzeRequestComplexity(request: AIRequest): {
    complexity: 'low' | 'medium' | 'high';
    factors: string[];
    recommendedTimeout: number;
  } {
    const factors: string[] = [];
    let complexity: 'low' | 'medium' | 'high' = 'low';
    
    const totalTokens = request.messages.reduce(
      (sum, msg) => sum + AIUtils.estimateTokens(msg.content), 0
    );
    
    if (totalTokens > 16000) {
      factors.push('Large context');
      complexity = 'high';
    } else if (totalTokens > 4000) {
      factors.push('Medium context');
      complexity = complexity === 'low' ? 'medium' : complexity;
    }
    
    if (request.maxTokens && request.maxTokens > 4000) {
      factors.push('Large output');
      complexity = 'high';
    }
    
    if (request.functions && request.functions.length > 3) {
      factors.push('Complex functions');
      complexity = complexity === 'low' ? 'medium' : complexity;
    }
    
    if (request.stream) {
      factors.push('Streaming request');
    }
    
    return {
      complexity,
      factors,
      recommendedTimeout: this.calculateOptimalTimeout(request),
    };
  }
}