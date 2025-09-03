/**
 * AI Service Configuration for BooksOfLife Multi-Provider System
 * 
 * This module provides configuration management for the AI service,
 * loading settings from environment variables and providing defaults
 * for various AI providers.
 */

import {
  AIProvider,
  ProviderConfig,
  AIServiceConfig,
  LoadBalancingStrategy,
  CircuitBreakerConfig,
  CacheConfig,
} from '@/types/ai';

/**
 * Default circuit breaker configuration
 */
const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 60000, // 1 minute
  timeout: 30000, // 30 seconds
  monitoringPeriod: 300000, // 5 minutes
};

/**
 * Default cache configuration
 */
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 300000, // 5 minutes
  maxSize: 1000,
  enabled: true,
};

/**
 * Get provider configuration from environment variables
 */
function getProviderConfig(provider: AIProvider): ProviderConfig {
  const envPrefix = `AI_${provider.toUpperCase()}`;
  const enabled = process.env[`${envPrefix}_ENABLED`] === 'true';
  const apiKey = process.env[`${envPrefix}_API_KEY`] || '';
  const baseUrl = process.env[`${envPrefix}_BASE_URL`];
  const timeout = parseInt(process.env[`${envPrefix}_TIMEOUT`] || '30000');
  const rateLimit = parseInt(process.env[`${envPrefix}_RATE_LIMIT`] || '60');
  const priority = parseInt(process.env[`${envPrefix}_PRIORITY`] || '1');

  // Provider-specific model lists
  const modelMap: Record<string, string[]> = {
    gemini: [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.0-pro',
    ],
    deepseek: [
      'deepseek-chat',
      'deepseek-coder',
    ],
    qwen: [
      'qwen-max',
      'qwen-plus',
      'qwen-turbo',
    ],
    kimi: [
      'moonshot-v1-8k',
      'moonshot-v1-32k',
      'moonshot-v1-128k',
    ],
    mock: [
      'mock-model',
      'mock-advanced',
      'mock-fast',
    ],
  };

  return {
    provider,
    apiKey,
    baseUrl,
    timeout,
    rateLimit,
    enabled,
    priority,
    models: modelMap[provider],
  };
}

/**
 * Load AI service configuration from environment
 */
export function loadAIServiceConfig(): AIServiceConfig {
  const providers: ProviderConfig[] = [
    getProviderConfig('gemini'),
    getProviderConfig('deepseek'),
    getProviderConfig('qwen'),
    getProviderConfig('kimi'),
    getProviderConfig('mock'),
  ].filter(config => config.enabled && config.apiKey);

  const loadBalancingStrategy = (process.env.AI_LOAD_BALANCING_STRATEGY || 'priority') as LoadBalancingStrategy;
  
  const circuitBreaker: CircuitBreakerConfig = {
    failureThreshold: parseInt(process.env.AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5'),
    recoveryTimeout: parseInt(process.env.AI_CIRCUIT_BREAKER_RECOVERY_TIMEOUT || '60000'),
    timeout: parseInt(process.env.AI_CIRCUIT_BREAKER_TIMEOUT || '30000'),
    monitoringPeriod: parseInt(process.env.AI_CIRCUIT_BREAKER_MONITORING_PERIOD || '300000'),
  };

  const cache: CacheConfig = {
    ttl: parseInt(process.env.AI_CACHE_TTL || '300000'),
    maxSize: parseInt(process.env.AI_CACHE_MAX_SIZE || '1000'),
    enabled: process.env.AI_CACHE_ENABLED !== 'false',
  };

  const defaultTimeout = parseInt(process.env.AI_DEFAULT_TIMEOUT || '30000');
  const maxRetries = parseInt(process.env.AI_MAX_RETRIES || '3');
  const retryDelay = parseInt(process.env.AI_RETRY_DELAY || '1000');

  return {
    providers,
    loadBalancingStrategy,
    circuitBreaker,
    cache,
    defaultTimeout,
    maxRetries,
    retryDelay,
  };
}

/**
 * Validate AI service configuration
 */
export function validateAIServiceConfig(config: AIServiceConfig): void {
  if (config.providers.length === 0) {
    throw new Error('No AI providers configured. Please check your environment variables.');
  }

  // Validate each provider
  config.providers.forEach(provider => {
    if (!provider.apiKey) {
      throw new Error(`API key is required for provider: ${provider.provider}`);
    }

    if (provider.priority < 0) {
      throw new Error(`Priority must be non-negative for provider: ${provider.provider}`);
    }

    if (provider.rateLimit && provider.rateLimit < 1) {
      throw new Error(`Rate limit must be at least 1 for provider: ${provider.provider}`);
    }
  });

  // Validate circuit breaker config
  if (config.circuitBreaker.failureThreshold < 1) {
    throw new Error('Circuit breaker failure threshold must be at least 1');
  }

  if (config.circuitBreaker.recoveryTimeout < 1000) {
    throw new Error('Circuit breaker recovery timeout must be at least 1000ms');
  }

  // Validate cache config
  if (config.cache.maxSize < 1) {
    throw new Error('Cache max size must be at least 1');
  }

  if (config.cache.ttl < 1000) {
    throw new Error('Cache TTL must be at least 1000ms');
  }

  // Validate retry config
  if (config.maxRetries < 0) {
    throw new Error('Max retries must be non-negative');
  }

  if (config.retryDelay < 0) {
    throw new Error('Retry delay must be non-negative');
  }
}

/**
 * Default AI service configuration for development
 */
export const DEFAULT_AI_SERVICE_CONFIG: AIServiceConfig = {
  providers: [],
  loadBalancingStrategy: 'priority',
  circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  cache: DEFAULT_CACHE_CONFIG,
  defaultTimeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
};

/**
 * Get AI service configuration with validation
 */
export function getAIServiceConfig(): AIServiceConfig {
  const config = loadAIServiceConfig();
  validateAIServiceConfig(config);
  return config;
}

/**
 * Environment variables documentation
 * 
 * Add these environment variables to your .env.local file:
 * 
 * # AI Service Configuration
 * AI_LOAD_BALANCING_STRATEGY=priority # priority|round-robin|random|least-latency
 * AI_DEFAULT_TIMEOUT=30000
 * AI_MAX_RETRIES=3
 * AI_RETRY_DELAY=1000
 * 
 * # Circuit Breaker Configuration
 * AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
 * AI_CIRCUIT_BREAKER_RECOVERY_TIMEOUT=60000
 * AI_CIRCUIT_BREAKER_TIMEOUT=30000
 * AI_CIRCUIT_BREAKER_MONITORING_PERIOD=300000
 * 
 * # Cache Configuration
 * AI_CACHE_ENABLED=true
 * AI_CACHE_TTL=300000
 * AI_CACHE_MAX_SIZE=1000
 * 
 * # Gemini Provider
 * AI_GEMINI_ENABLED=true
 * AI_GEMINI_API_KEY=your_gemini_api_key
 * AI_GEMINI_BASE_URL=https://generativelanguage.googleapis.com
 * AI_GEMINI_TIMEOUT=30000
 * AI_GEMINI_RATE_LIMIT=60
 * AI_GEMINI_PRIORITY=4
 * 
 * # DeepSeek Provider
 * AI_DEEPSEEK_ENABLED=true
 * AI_DEEPSEEK_API_KEY=your_deepseek_api_key
 * AI_DEEPSEEK_BASE_URL=https://api.deepseek.com
 * AI_DEEPSEEK_TIMEOUT=30000
 * AI_DEEPSEEK_RATE_LIMIT=60
 * AI_DEEPSEEK_PRIORITY=3
 * 
 * # Qwen Provider
 * AI_QWEN_ENABLED=true
 * AI_QWEN_API_KEY=your_qwen_api_key
 * AI_QWEN_BASE_URL=https://dashscope.aliyuncs.com
 * AI_QWEN_TIMEOUT=30000
 * AI_QWEN_RATE_LIMIT=60
 * AI_QWEN_PRIORITY=2
 * 
 * # Kimi Provider (Moonshot AI)
 * AI_KIMI_ENABLED=true
 * AI_KIMI_API_KEY=your_kimi_api_key
 * AI_KIMI_BASE_URL=https://api.moonshot.cn
 * AI_KIMI_TIMEOUT=30000
 * AI_KIMI_RATE_LIMIT=60
 * AI_KIMI_PRIORITY=1
 */