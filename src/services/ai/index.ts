/**
 * Main AI Service for BooksOfLife Multi-Provider System
 * 
 * This service provides a simplified interface that coordinates between
 * the orchestrator and router components to provide intelligent AI services
 * with automatic failover, load balancing, and comprehensive error handling.
 */

import {
  AIProvider,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  AIModel,
  AIServiceConfig,
  AIServiceStats,
  AIError,
} from '@/types/ai';

import { AIOrchestrator, createOrchestrator, OrchestrationResult } from './orchestrator';
import { RoutingCriteria } from './router';

/**
 * Main AI service class that provides a simplified interface
 * Built on top of the orchestrator for high-level operations
 */
export class AIService {
  private orchestrator: AIOrchestrator;

  constructor(config: AIServiceConfig) {
    this.orchestrator = createOrchestrator(config);
  }

  /**
   * Initialize the AI service
   */
  public async initialize(): Promise<void> {
    await this.orchestrator.initialize();
  }

  /**
   * Send a request to the best available AI provider
   */
  public async request(
    request: AIRequest, 
    criteria?: RoutingCriteria
  ): Promise<AIResponse> {
    const result = await this.orchestrator.executeRequest(request, criteria);
    return result.data;
  }

  /**
   * Send a streaming request to the best available AI provider
   */
  public async* streamRequest(
    request: AIRequest,
    criteria?: RoutingCriteria
  ): AsyncGenerator<AIStreamChunk, void, unknown> {
    yield* this.orchestrator.executeStreamRequest(request, criteria);
  }

  /**
   * Get comprehensive service statistics
   */
  public getStats(): AIServiceStats {
    return this.orchestrator.getStats();
  }

  /**
   * Check health status of all providers
   */
  public async getHealthStatus(): Promise<Record<AIProvider, boolean>> {
    return this.orchestrator.getHealthStatus();
  }

  /**
   * Get circuit breaker status for all providers
   */
  public getCircuitBreakerStatus(): Record<AIProvider, any> {
    return this.orchestrator.getCircuitBreakerStatus();
  }

  /**
   * Manually reset circuit breaker for a provider
   */
  public resetCircuitBreaker(provider: AIProvider): void {
    this.orchestrator.resetCircuitBreaker(provider);
  }

  /**
   * Clear the response cache
   */
  public clearCache(): void {
    this.orchestrator.clearCache();
  }

  /**
   * Reset all statistics
   */
  public resetStats(): void {
    this.orchestrator.resetStats();
  }

  /**
   * Gracefully shutdown the service
   */
  public async shutdown(): Promise<void> {
    await this.orchestrator.shutdown();
  }

  /**
   * Execute request with detailed orchestration result
   */
  public async executeWithDetails(
    request: AIRequest,
    criteria?: RoutingCriteria
  ): Promise<OrchestrationResult> {
    return this.orchestrator.executeRequest(request, criteria);
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
export async function askAI(
  request: AIRequest, 
  criteria?: RoutingCriteria
): Promise<AIResponse> {
  const service = getAIService();
  return service.request(request, criteria);
}

/**
 * Convenience function for streaming AI requests
 */
export async function* streamAI(
  request: AIRequest,
  criteria?: RoutingCriteria
): AsyncGenerator<AIStreamChunk, void, unknown> {
  const service = getAIService();
  yield* service.streamRequest(request, criteria);
}

/**
 * Convenience function for requests with detailed results
 */
export async function askAIWithDetails(
  request: AIRequest,
  criteria?: RoutingCriteria
): Promise<OrchestrationResult> {
  const service = getAIService();
  return service.executeWithDetails(request, criteria);
}

// Export all components and types
export * from './base';
export * from './router';
export * from './orchestrator';
export * from './providers';
export * from './config';

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