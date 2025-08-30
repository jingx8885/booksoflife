/**
 * AI Router for BooksOfLife Multi-Provider System
 * 
 * This module provides intelligent routing logic for AI requests,
 * selecting the best provider based on model capabilities, availability,
 * request requirements, and current system state.
 */

import {
  AIProvider,
  AIRequest,
  AIModel,
  IAIAdapter,
  LoadBalancingStrategy,
  AIError,
  ModelNotAvailableError,
} from '@/types/ai';

import { AIUtils, CircuitBreaker } from './base';
import { 
  PROVIDER_CAPABILITIES, 
  getProvidersWithCapabilities, 
  getRecommendedProvider 
} from './providers';

/**
 * Routing criteria for provider selection
 */
export interface RoutingCriteria {
  /** Required capabilities */
  capabilities?: {
    streaming?: boolean;
    functionCalling?: boolean;
    images?: boolean;
    documents?: boolean;
    minContextTokens?: number;
  };
  /** Preferred cost tier */
  costPreference?: 'low' | 'medium' | 'high';
  /** Reliability requirement */
  reliabilityLevel?: 'low' | 'medium' | 'high';
  /** Performance preference */
  performance?: 'speed' | 'quality' | 'balanced';
  /** Specific provider preference (if any) */
  preferredProvider?: AIProvider;
  /** Providers to exclude */
  excludedProviders?: AIProvider[];
}

/**
 * Provider selection result
 */
export interface ProviderSelection {
  /** Selected provider */
  provider: AIProvider;
  /** Provider adapter */
  adapter: IAIAdapter;
  /** Selection confidence (0-1) */
  confidence: number;
  /** Reason for selection */
  reason: string;
  /** Fallback providers (ordered by preference) */
  fallbacks: AIProvider[];
}

/**
 * Provider scoring for routing decisions
 */
interface ProviderScore {
  provider: AIProvider;
  score: number;
  reasons: string[];
  availability: boolean;
  capabilities: boolean;
  performance: number;
  reliability: number;
  cost: number;
}

/**
 * AI Router class for intelligent provider selection
 */
export class AIRouter {
  constructor(
    private readonly adapters: Map<AIProvider, IAIAdapter>,
    private readonly circuitBreakers: Map<AIProvider, CircuitBreaker>,
    private readonly loadBalancingStrategy: LoadBalancingStrategy = 'priority'
  ) {}

  /**
   * Select the best provider for a given request
   * 
   * @param request The AI request to route
   * @param criteria Optional routing criteria
   * @returns Provider selection result
   */
  public async selectProvider(
    request: AIRequest,
    criteria: RoutingCriteria = {}
  ): Promise<ProviderSelection | null> {
    // Get available providers
    const availableProviders = await this.getAvailableProviders();
    
    if (availableProviders.length === 0) {
      return null;
    }

    // Filter providers based on capabilities
    const capableProviders = this.filterByCapabilities(availableProviders, request, criteria);
    
    if (capableProviders.length === 0) {
      throw new AIError(
        'No providers available with required capabilities',
        'gemini',
        'NO_CAPABLE_PROVIDERS'
      );
    }

    // Score providers based on various factors
    const providerScores = await this.scoreProviders(capableProviders, request, criteria);
    
    // Sort by score (highest first)
    providerScores.sort((a, b) => b.score - a.score);
    
    const bestProvider = providerScores[0];
    const adapter = this.adapters.get(bestProvider.provider)!;
    
    return {
      provider: bestProvider.provider,
      adapter,
      confidence: Math.min(bestProvider.score / 100, 1.0),
      reason: bestProvider.reasons.join(', '),
      fallbacks: providerScores.slice(1, 4).map(p => p.provider),
    };
  }

  /**
   * Select provider using load balancing strategy
   * 
   * @param availableProviders List of available providers with their priorities
   * @returns Selected provider or null if none available
   */
  public async selectWithLoadBalancing(
    availableProviders: { provider: AIProvider; priority: number; adapter: IAIAdapter }[]
  ): Promise<{ provider: AIProvider; adapter: IAIAdapter } | null> {
    if (availableProviders.length === 0) {
      return null;
    }

    // Filter to only healthy providers
    const healthyProviders = [];
    for (const p of availableProviders) {
      const circuitBreaker = this.circuitBreakers.get(p.provider);
      const isHealthy = await p.adapter.healthCheck();
      const circuitOpen = circuitBreaker?.getStatus().state === 'open';
      
      if (isHealthy && !circuitOpen) {
        healthyProviders.push(p);
      }
    }

    if (healthyProviders.length === 0) {
      return null;
    }

    switch (this.loadBalancingStrategy) {
      case 'round-robin':
        return this.roundRobinSelect(healthyProviders);
      case 'priority':
        return this.prioritySelect(healthyProviders);
      case 'random':
        return this.randomSelect(healthyProviders);
      case 'least-latency':
        return await this.latencyBasedSelect(healthyProviders);
      default:
        return this.prioritySelect(healthyProviders);
    }
  }

  /**
   * Get providers that can handle a specific request
   * 
   * @param request The AI request
   * @param excludeProviders Providers to exclude
   * @returns List of capable providers
   */
  public async getCapableProviders(
    request: AIRequest,
    excludeProviders: AIProvider[] = []
  ): Promise<AIProvider[]> {
    const availableProviders = await this.getAvailableProviders();
    const filteredProviders = availableProviders.filter(
      provider => !excludeProviders.includes(provider)
    );

    return this.filterByCapabilities(filteredProviders, request, {});
  }

  /**
   * Get model-specific routing recommendations
   * 
   * @param modelId Specific model ID requested
   * @returns Providers that support the model
   */
  public async getProvidersForModel(modelId: string): Promise<{
    providers: AIProvider[];
    model?: AIModel;
  }> {
    const providers: AIProvider[] = [];
    let foundModel: AIModel | undefined;

    for (const [provider, adapter] of this.adapters) {
      try {
        const models = await adapter.getModels();
        const model = models.find(m => m.id === modelId);
        
        if (model && model.available) {
          providers.push(provider);
          if (!foundModel) {
            foundModel = model;
          }
        }
      } catch (error) {
        console.warn(`Failed to get models from ${provider}:`, error);
      }
    }

    return { providers, model: foundModel };
  }

  /**
   * Get routing recommendations based on use case
   * 
   * @param useCase The intended use case
   * @returns Recommended providers in order of preference
   */
  public getRecommendationsForUseCase(
    useCase: 'book-analysis' | 'recommendation' | 'summarization' | 'chat' | 'translation'
  ): AIProvider[] {
    const useCaseMapping = {
      'book-analysis': {
        requirements: { documents: true, minContextTokens: 32000 },
        preferred: ['kimi', 'gemini', 'qwen', 'deepseek'] as AIProvider[]
      },
      'recommendation': {
        requirements: { functionCalling: true },
        preferred: ['gemini', 'deepseek', 'qwen', 'kimi'] as AIProvider[]
      },
      'summarization': {
        requirements: { minContextTokens: 16000 },
        preferred: ['gemini', 'kimi', 'qwen', 'deepseek'] as AIProvider[]
      },
      'chat': {
        requirements: { streaming: true },
        preferred: ['deepseek', 'gemini', 'qwen', 'kimi'] as AIProvider[]
      },
      'translation': {
        requirements: {},
        preferred: ['qwen', 'gemini', 'deepseek', 'kimi'] as AIProvider[]
      }
    };

    const config = useCaseMapping[useCase];
    if (!config) {
      return ['gemini', 'deepseek', 'qwen', 'kimi'];
    }

    // Filter providers based on requirements
    const capableProviders = getProvidersWithCapabilities(config.requirements);
    
    // Return in preferred order, filtered by capability
    return config.preferred.filter(provider => capableProviders.includes(provider));
  }

  // Private methods

  /**
   * Get list of currently available providers
   */
  private async getAvailableProviders(): Promise<AIProvider[]> {
    const availableProviders: AIProvider[] = [];

    for (const [provider, adapter] of this.adapters) {
      try {
        const isHealthy = await adapter.healthCheck();
        const circuitBreaker = this.circuitBreakers.get(provider);
        const circuitOpen = circuitBreaker?.getStatus().state === 'open';
        
        if (isHealthy && !circuitOpen) {
          availableProviders.push(provider);
        }
      } catch (error) {
        console.warn(`Health check failed for ${provider}:`, error);
      }
    }

    return availableProviders;
  }

  /**
   * Filter providers by request capabilities
   */
  private filterByCapabilities(
    providers: AIProvider[],
    request: AIRequest,
    criteria: RoutingCriteria
  ): AIProvider[] {
    return providers.filter(provider => {
      const caps = PROVIDER_CAPABILITIES[provider];
      
      // Check request requirements
      if (request.stream && !caps.supportsStreaming) {
        return false;
      }
      
      if (request.functions && !caps.supportsFunctionCalling) {
        return false;
      }

      // Check criteria requirements
      if (criteria.capabilities) {
        const reqCaps = criteria.capabilities;
        
        if (reqCaps.streaming && !caps.supportsStreaming) return false;
        if (reqCaps.functionCalling && !caps.supportsFunctionCalling) return false;
        if (reqCaps.images && !caps.supportsImages) return false;
        if (reqCaps.documents && !caps.supportsDocuments) return false;
        if (reqCaps.minContextTokens && caps.maxContextTokens < reqCaps.minContextTokens) return false;
      }

      // Check excluded providers
      if (criteria.excludedProviders?.includes(provider)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Score providers based on various factors
   */
  private async scoreProviders(
    providers: AIProvider[],
    request: AIRequest,
    criteria: RoutingCriteria
  ): Promise<ProviderScore[]> {
    const scores: ProviderScore[] = [];

    for (const provider of providers) {
      const caps = PROVIDER_CAPABILITIES[provider];
      const adapter = this.adapters.get(provider)!;
      const circuitBreaker = this.circuitBreakers.get(provider)!;
      
      let score = 0;
      const reasons: string[] = [];

      // Base availability score
      const isHealthy = await adapter.healthCheck();
      const circuitStatus = circuitBreaker.getStatus();
      
      if (!isHealthy || circuitStatus.state === 'open') {
        scores.push({
          provider,
          score: 0,
          reasons: ['Provider unavailable'],
          availability: false,
          capabilities: false,
          performance: 0,
          reliability: 0,
          cost: 0
        });
        continue;
      }

      // Availability score (30 points max)
      score += 30;
      reasons.push('Available');

      // Reliability score (25 points max)
      const reliabilityMultiplier = caps.reliability === 'high' ? 1.0 : caps.reliability === 'medium' ? 0.7 : 0.4;
      const reliabilityScore = 25 * reliabilityMultiplier;
      score += reliabilityScore;
      
      if (caps.reliability === 'high') {
        reasons.push('High reliability');
      }

      // Cost score (20 points max)
      let costScore = 0;
      const costPreference = criteria.costPreference || 'medium';
      
      if (costPreference === 'low' && caps.costTier === 'low') {
        costScore = 20;
        reasons.push('Low cost');
      } else if (costPreference === 'medium' && caps.costTier === 'medium') {
        costScore = 15;
        reasons.push('Balanced cost');
      } else if (costPreference === 'high' && caps.costTier === 'high') {
        costScore = 10; // High cost is generally less desirable
      }
      
      score += costScore;

      // Capability bonus (15 points max)
      let capabilityScore = 0;
      if (request.stream && caps.supportsStreaming) {
        capabilityScore += 3;
        reasons.push('Supports streaming');
      }
      if (request.functions && caps.supportsFunctionCalling) {
        capabilityScore += 5;
        reasons.push('Supports functions');
      }
      if (criteria.capabilities?.images && caps.supportsImages) {
        capabilityScore += 4;
        reasons.push('Supports images');
      }
      if (criteria.capabilities?.documents && caps.supportsDocuments) {
        capabilityScore += 3;
        reasons.push('Supports documents');
      }
      
      score += capabilityScore;

      // Model-specific scoring (10 points max)
      if (request.model) {
        try {
          const models = await adapter.getModels();
          const model = models.find(m => m.id === request.model);
          
          if (model) {
            if (AIUtils.validateModelCapabilities(request, model)) {
              score += 10;
              reasons.push(`Supports model ${request.model}`);
            } else {
              score += 5;
              reasons.push(`Partial support for ${request.model}`);
            }
          }
        } catch (error) {
          // Model check failed, slight penalty
          score -= 2;
        }
      }

      // Preferred provider bonus
      if (criteria.preferredProvider === provider) {
        score += 15;
        reasons.push('Preferred provider');
      }

      // Circuit breaker penalty
      if (circuitStatus.failureCount > 0) {
        const penalty = Math.min(circuitStatus.failureCount * 2, 10);
        score -= penalty;
        reasons.push(`Recent failures (-${penalty})`);
      }

      scores.push({
        provider,
        score: Math.max(score, 0),
        reasons,
        availability: true,
        capabilities: capabilityScore > 0,
        performance: score * 0.01, // Normalized performance score
        reliability: reliabilityScore / 25,
        cost: costScore / 20
      });
    }

    return scores;
  }

  /**
   * Round-robin selection
   */
  private roundRobinSelect(
    providers: { provider: AIProvider; adapter: IAIAdapter }[]
  ): { provider: AIProvider; adapter: IAIAdapter } {
    // Simple round-robin - in real implementation, would track state
    const index = Math.floor(Math.random() * providers.length);
    return providers[index];
  }

  /**
   * Priority-based selection
   */
  private prioritySelect(
    providers: { provider: AIProvider; priority: number; adapter: IAIAdapter }[]
  ): { provider: AIProvider; adapter: IAIAdapter } {
    const sorted = providers.sort((a, b) => b.priority - a.priority);
    return { provider: sorted[0].provider, adapter: sorted[0].adapter };
  }

  /**
   * Random selection
   */
  private randomSelect(
    providers: { provider: AIProvider; adapter: IAIAdapter }[]
  ): { provider: AIProvider; adapter: IAIAdapter } {
    const index = Math.floor(Math.random() * providers.length);
    return providers[index];
  }

  /**
   * Latency-based selection
   */
  private async latencyBasedSelect(
    providers: { provider: AIProvider; adapter: IAIAdapter }[]
  ): Promise<{ provider: AIProvider; adapter: IAIAdapter }> {
    // For now, fall back to priority selection
    // In a full implementation, would track latency metrics
    return this.prioritySelect(providers as any);
  }
}

/**
 * Routing utility functions
 */
export class RoutingUtils {
  /**
   * Calculate routing score for a provider
   */
  public static calculateProviderScore(
    provider: AIProvider,
    request: AIRequest,
    criteria: RoutingCriteria,
    healthStatus: boolean,
    circuitBreakerStatus: any
  ): number {
    if (!healthStatus || circuitBreakerStatus?.state === 'open') {
      return 0;
    }

    const caps = PROVIDER_CAPABILITIES[provider];
    let score = 50; // Base score for being available

    // Add capability bonuses
    if (request.stream && caps.supportsStreaming) score += 10;
    if (request.functions && caps.supportsFunctionCalling) score += 10;
    if (criteria.capabilities?.images && caps.supportsImages) score += 5;
    if (criteria.capabilities?.documents && caps.supportsDocuments) score += 5;

    // Reliability bonus
    if (caps.reliability === 'high') score += 15;
    else if (caps.reliability === 'medium') score += 10;

    // Cost preference
    const costPref = criteria.costPreference || 'medium';
    if ((costPref === 'low' && caps.costTier === 'low') ||
        (costPref === 'medium' && caps.costTier === 'medium')) {
      score += 10;
    }

    // Preferred provider
    if (criteria.preferredProvider === provider) {
      score += 20;
    }

    // Circuit breaker penalty
    if (circuitBreakerStatus?.failureCount > 0) {
      score -= Math.min(circuitBreakerStatus.failureCount * 3, 15);
    }

    return Math.max(score, 0);
  }

  /**
   * Get best provider for specific model
   */
  public static getBestProviderForModel(
    modelId: string,
    availableProviders: AIProvider[]
  ): AIProvider | null {
    // Model to provider mapping
    const modelProviderMap: Record<string, AIProvider> = {
      'gemini-1.5-pro': 'gemini',
      'gemini-1.5-flash': 'gemini',
      'gemini-1.0-pro': 'gemini',
      'deepseek-chat': 'deepseek',
      'deepseek-coder': 'deepseek',
      'qwen-max': 'qwen',
      'qwen-plus': 'qwen',
      'qwen-turbo': 'qwen',
      'moonshot-v1-8k': 'kimi',
      'moonshot-v1-32k': 'kimi',
      'moonshot-v1-128k': 'kimi',
    };

    const preferredProvider = modelProviderMap[modelId];
    if (preferredProvider && availableProviders.includes(preferredProvider)) {
      return preferredProvider;
    }

    // Fall back to any available provider
    return availableProviders[0] || null;
  }

  /**
   * Determine if request needs high-context provider
   */
  public static needsHighContextProvider(request: AIRequest): boolean {
    const totalTokens = request.messages.reduce(
      (sum, msg) => sum + AIUtils.estimateTokens(msg.content), 0
    );
    
    return totalTokens > 16000 || (request.maxTokens && request.maxTokens > 8000);
  }

  /**
   * Get fallback provider chain
   */
  public static getFallbackChain(
    primaryProvider: AIProvider,
    availableProviders: AIProvider[]
  ): AIProvider[] {
    const fallbackOrder: Record<AIProvider, AIProvider[]> = {
      gemini: ['deepseek', 'qwen', 'kimi'],
      deepseek: ['gemini', 'qwen', 'kimi'],
      qwen: ['gemini', 'deepseek', 'kimi'],
      kimi: ['gemini', 'qwen', 'deepseek'],
    };

    const fallbacks = fallbackOrder[primaryProvider] || [];
    return fallbacks.filter(provider => 
      provider !== primaryProvider && availableProviders.includes(provider)
    );
  }
}