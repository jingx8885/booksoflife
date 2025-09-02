/**
 * AI Providers Index for BooksOfLife
 * 
 * Central export point for all AI provider adapters and factory functions
 */

import {
  AIProvider,
  ProviderConfig,
  IAIAdapter,
  AIError,
} from '@/types/ai';

// Import all provider adapters
import { GeminiAdapter } from './gemini';
import { DeepSeekAdapter } from './deepseek';
import { QwenAdapter } from './qwen';
import { KimiAdapter } from './kimi';

// Export all adapters
export { GeminiAdapter } from './gemini';
export { DeepSeekAdapter } from './deepseek';
export { QwenAdapter } from './qwen';
export { KimiAdapter } from './kimi';

/**
 * Registry of available adapter classes
 */
const ADAPTER_REGISTRY: Record<AIProvider, new () => IAIAdapter> = {
  gemini: GeminiAdapter,
  deepseek: DeepSeekAdapter,
  qwen: QwenAdapter,
  kimi: KimiAdapter,
};

/**
 * Create an adapter instance for a specific provider
 * 
 * @param provider The AI provider to create an adapter for
 * @returns A new adapter instance
 * @throws AIError if the provider is not supported
 */
export function createAdapter(provider: AIProvider): IAIAdapter {
  const AdapterClass = ADAPTER_REGISTRY[provider];
  
  if (!AdapterClass) {
    throw new AIError(
      `Unsupported provider: ${provider}`,
      provider,
      'UNSUPPORTED_PROVIDER'
    );
  }

  return new AdapterClass();
}

/**
 * Create multiple adapters from provider configurations
 * 
 * @param configs Array of provider configurations
 * @returns Array of initialized adapter instances
 */
export async function createAdapters(configs: ProviderConfig[]): Promise<IAIAdapter[]> {
  const adapters: IAIAdapter[] = [];
  
  for (const config of configs) {
    if (!config.enabled) {
      continue;
    }

    try {
      const adapter = createAdapter(config.provider);
      await adapter.initialize(config);
      adapters.push(adapter);
    } catch (error) {
      console.error(`Failed to create adapter for ${config.provider}:`, error);
      // Continue with other adapters even if one fails
    }
  }

  return adapters;
}

/**
 * Get list of all supported providers
 * 
 * @returns Array of supported provider names
 */
export function getSupportedProviders(): AIProvider[] {
  return Object.keys(ADAPTER_REGISTRY) as AIProvider[];
}

/**
 * Check if a provider is supported
 * 
 * @param provider The provider to check
 * @returns True if the provider is supported
 */
export function isProviderSupported(provider: string): provider is AIProvider {
  return provider in ADAPTER_REGISTRY;
}

/**
 * Adapter factory function with validation
 * 
 * @param config Provider configuration
 * @returns Initialized adapter instance
 * @throws AIError if validation fails
 */
export async function createAndInitializeAdapter(config: ProviderConfig): Promise<IAIAdapter> {
  // Validate configuration
  if (!config.provider) {
    throw new AIError('Provider is required', config.provider, 'INVALID_CONFIG');
  }

  if (!config.apiKey) {
    throw new AIError('API key is required', config.provider, 'INVALID_CONFIG');
  }

  if (!config.enabled) {
    throw new AIError('Provider is disabled', config.provider, 'PROVIDER_DISABLED');
  }

  // Create and initialize adapter
  const adapter = createAdapter(config.provider);
  await adapter.initialize(config);
  
  return adapter;
}

/**
 * Utility function to get adapter class by provider name
 * 
 * @param provider The provider name
 * @returns The adapter class constructor
 * @throws AIError if provider is not supported
 */
export function getAdapterClass(provider: AIProvider): new () => IAIAdapter {
  const AdapterClass = ADAPTER_REGISTRY[provider];
  
  if (!AdapterClass) {
    throw new AIError(
      `Unsupported provider: ${provider}`,
      provider,
      'UNSUPPORTED_PROVIDER'
    );
  }

  return AdapterClass;
}

/**
 * Provider capabilities map
 * Helps with provider selection based on required features
 */
export const PROVIDER_CAPABILITIES = {
  gemini: {
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsImages: true,
    supportsDocuments: true,
    maxContextTokens: 2000000, // 2M for 1.5-pro
    reliability: 'high',
    costTier: 'medium',
  },
  deepseek: {
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsImages: false,
    supportsDocuments: false,
    maxContextTokens: 32768,
    reliability: 'high',
    costTier: 'low',
  },
  qwen: {
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsImages: true,
    supportsDocuments: false,
    maxContextTokens: 32768,
    reliability: 'medium',
    costTier: 'medium',
  },
  kimi: {
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsImages: false,
    supportsDocuments: true,
    maxContextTokens: 131072, // 128K for v1-128k
    reliability: 'medium',
    costTier: 'medium',
  },
} as const;

/**
 * Get providers that support specific capabilities
 * 
 * @param requirements Object specifying required capabilities
 * @returns Array of providers that meet the requirements
 */
export function getProvidersWithCapabilities(requirements: {
  streaming?: boolean;
  functionCalling?: boolean;
  images?: boolean;
  documents?: boolean;
  minContextTokens?: number;
}): AIProvider[] {
  return getSupportedProviders().filter((provider) => {
    const caps = PROVIDER_CAPABILITIES[provider];
    
    if (requirements.streaming && !caps.supportsStreaming) return false;
    if (requirements.functionCalling && !caps.supportsFunctionCalling) return false;
    if (requirements.images && !caps.supportsImages) return false;
    if (requirements.documents && !caps.supportsDocuments) return false;
    if (requirements.minContextTokens && caps.maxContextTokens < requirements.minContextTokens) return false;
    
    return true;
  });
}

/**
 * Default provider priority order
 * Used for fallback when no specific provider is requested
 */
export const DEFAULT_PROVIDER_PRIORITY: AIProvider[] = [
  'gemini',     // High capability, good reliability
  'deepseek',   // Low cost, good for code
  'qwen',       // Good balance of features
  'kimi',       // Large context, good for documents
];

/**
 * Get recommended provider for a specific use case
 * 
 * @param useCase The use case to optimize for
 * @returns Recommended provider
 */
export function getRecommendedProvider(useCase: 'general' | 'code' | 'documents' | 'images' | 'cost-efficient'): AIProvider {
  switch (useCase) {
    case 'general':
      return 'gemini';
    case 'code':
      return 'deepseek';
    case 'documents':
      return 'kimi';
    case 'images':
      return 'gemini';
    case 'cost-efficient':
      return 'deepseek';
    default:
      return 'gemini';
  }
}

/**
 * Adapter health check for all providers
 * 
 * @param adapters Array of adapter instances
 * @returns Map of provider health status
 */
export async function checkAdapterHealth(adapters: IAIAdapter[]): Promise<Record<AIProvider, boolean>> {
  const healthStatus: Partial<Record<AIProvider, boolean>> = {};
  
  const healthChecks = adapters.map(async (adapter) => {
    try {
      const isHealthy = await adapter.healthCheck();
      healthStatus[adapter.provider] = isHealthy;
    } catch (error) {
      console.error(`Health check failed for ${adapter.provider}:`, error);
      healthStatus[adapter.provider] = false;
    }
  });

  await Promise.allSettled(healthChecks);
  
  return healthStatus as Record<AIProvider, boolean>;
}

/**
 * Get adapter statistics
 * 
 * @param adapters Array of adapter instances
 * @returns Summary of adapter capabilities and status
 */
export async function getAdapterSummary(adapters: IAIAdapter[]): Promise<{
  total: number;
  byProvider: Record<AIProvider, { available: boolean; modelCount: number }>;
  capabilities: {
    streaming: number;
    functionCalling: number;
    images: number;
    documents: number;
  };
}> {
  const summary = {
    total: adapters.length,
    byProvider: {} as Record<AIProvider, { available: boolean; modelCount: number }>,
    capabilities: {
      streaming: 0,
      functionCalling: 0,
      images: 0,
      documents: 0,
    },
  };

  for (const adapter of adapters) {
    try {
      const isHealthy = await adapter.healthCheck();
      const models = await adapter.getModels();
      
      summary.byProvider[adapter.provider] = {
        available: isHealthy,
        modelCount: models.length,
      };

      // Count capabilities
      const caps = PROVIDER_CAPABILITIES[adapter.provider];
      if (caps.supportsStreaming) summary.capabilities.streaming++;
      if (caps.supportsFunctionCalling) summary.capabilities.functionCalling++;
      if (caps.supportsImages) summary.capabilities.images++;
      if (caps.supportsDocuments) summary.capabilities.documents++;
      
    } catch (error) {
      console.error(`Failed to get summary for ${adapter.provider}:`, error);
      summary.byProvider[adapter.provider] = {
        available: false,
        modelCount: 0,
      };
    }
  }

  return summary;
}