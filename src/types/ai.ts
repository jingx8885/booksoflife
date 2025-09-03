// AI Service Type Definitions for BooksOfLife Multi-Provider System

/**
 * Supported AI providers
 */
export type AIProvider = 'gemini' | 'deepseek' | 'qwen' | 'kimi' | 'mock';

/**
 * AI model capabilities
 */
export interface ModelCapabilities {
  /** Maximum context window size in tokens */
  maxContextTokens: number;
  /** Maximum output tokens per request */
  maxOutputTokens: number;
  /** Supports streaming responses */
  supportsStreaming: boolean;
  /** Supports function calling */
  supportsFunctionCalling: boolean;
  /** Supports image analysis */
  supportsImages: boolean;
  /** Supports document analysis */
  supportsDocuments: boolean;
  /** Cost per 1000 input tokens */
  costPerInputToken: number;
  /** Cost per 1000 output tokens */
  costPerOutputToken: number;
}

/**
 * AI model definition
 */
export interface AIModel {
  /** Model identifier */
  id: string;
  /** Display name */
  name: string;
  /** Provider that offers this model */
  provider: AIProvider;
  /** Model capabilities */
  capabilities: ModelCapabilities;
  /** Whether model is currently available */
  available: boolean;
}

/**
 * AI request configuration
 */
export interface AIRequest {
  /** The prompt/message content */
  messages: AIMessage[];
  /** Model to use for the request */
  model?: string;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature for response randomness (0-1) */
  temperature?: number;
  /** Top-p for nucleus sampling */
  topP?: number;
  /** Whether to stream the response */
  stream?: boolean;
  /** Function definitions for function calling */
  functions?: AIFunction[];
  /** System prompt */
  systemPrompt?: string;
}

/**
 * AI message structure
 */
export interface AIMessage {
  /** Message role */
  role: 'user' | 'assistant' | 'system' | 'function';
  /** Message content */
  content: string;
  /** Function call details (if applicable) */
  functionCall?: {
    name: string;
    arguments: Record<string, any>;
  };
  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Function definition for AI function calling
 */
export interface AIFunction {
  /** Function name */
  name: string;
  /** Function description */
  description: string;
  /** JSON schema for function parameters */
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * AI response structure
 */
export interface AIResponse {
  /** Generated content */
  content: string;
  /** Model used for generation */
  model: string;
  /** Provider used */
  provider: AIProvider;
  /** Usage statistics */
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  /** Response metadata */
  metadata: {
    /** Request duration in milliseconds */
    duration: number;
    /** Request timestamp */
    timestamp: number;
    /** Finish reason */
    finishReason: 'stop' | 'length' | 'function_call' | 'error';
    /** Function call result (if applicable) */
    functionCall?: {
      name: string;
      arguments: Record<string, any>;
    };
  };
}

/**
 * Streaming AI response chunk
 */
export interface AIStreamChunk {
  /** Chunk content delta */
  delta: string;
  /** Whether this is the final chunk */
  done: boolean;
  /** Model used */
  model: string;
  /** Provider used */
  provider: AIProvider;
  /** Partial usage stats (final chunk only) */
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  /** Provider name */
  provider: AIProvider;
  /** API key */
  apiKey: string;
  /** Base URL for API endpoints */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Rate limit (requests per minute) */
  rateLimit?: number;
  /** Whether provider is enabled */
  enabled: boolean;
  /** Priority for load balancing (higher = preferred) */
  priority: number;
  /** Available models */
  models: string[];
}

/**
 * AI adapter interface - implemented by each provider
 */
export interface IAIAdapter {
  /** Provider identifier */
  readonly provider: AIProvider;
  
  /** Initialize the adapter with configuration */
  initialize(config: ProviderConfig): Promise<void>;
  
  /** Check if the adapter is healthy and available */
  healthCheck(): Promise<boolean>;
  
  /** Get available models */
  getModels(): Promise<AIModel[]>;
  
  /** Send a request to the AI provider */
  request(request: AIRequest): Promise<AIResponse>;
  
  /** Send a streaming request to the AI provider */
  streamRequest(request: AIRequest): AsyncGenerator<AIStreamChunk, void, unknown>;
  
  /** Get current rate limit status */
  getRateLimitStatus(): Promise<{
    remaining: number;
    resetTime: number;
    limit: number;
  }>;
}

/**
 * Circuit breaker states
 */
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Failure threshold before opening circuit */
  failureThreshold: number;
  /** Recovery timeout in milliseconds */
  recoveryTimeout: number;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Monitor window in milliseconds */
  monitoringPeriod: number;
}

/**
 * Circuit breaker status
 */
export interface CircuitBreakerStatus {
  /** Current state */
  state: CircuitBreakerState;
  /** Number of failures in current window */
  failureCount: number;
  /** Last failure time */
  lastFailureTime?: number;
  /** Next attempt time (for open state) */
  nextAttemptTime?: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Cache TTL in milliseconds */
  ttl: number;
  /** Maximum cache size */
  maxSize: number;
  /** Whether to enable cache */
  enabled: boolean;
}

/**
 * Load balancing strategy
 */
export type LoadBalancingStrategy = 
  | 'round-robin'
  | 'priority'
  | 'least-latency'
  | 'random';

/**
 * AI service configuration
 */
export interface AIServiceConfig {
  /** Provider configurations */
  providers: ProviderConfig[];
  /** Load balancing strategy */
  loadBalancingStrategy: LoadBalancingStrategy;
  /** Circuit breaker configuration */
  circuitBreaker: CircuitBreakerConfig;
  /** Cache configuration */
  cache: CacheConfig;
  /** Default request timeout */
  defaultTimeout: number;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Retry delay in milliseconds */
  retryDelay: number;
}

/**
 * AI service statistics
 */
export interface AIServiceStats {
  /** Total requests made */
  totalRequests: number;
  /** Successful requests */
  successfulRequests: number;
  /** Failed requests */
  failedRequests: number;
  /** Average response time */
  averageResponseTime: number;
  /** Requests per provider */
  providerStats: Record<AIProvider, {
    requests: number;
    successes: number;
    failures: number;
    averageLatency: number;
    lastUsed: number;
  }>;
  /** Cache hit rate */
  cacheHitRate: number;
  /** Total tokens used */
  totalTokensUsed: number;
  /** Estimated cost */
  estimatedCost: number;
}

/**
 * Error types for AI services
 */
export class AIError extends Error {
  constructor(
    message: string,
    public readonly provider: AIProvider,
    public readonly code: string,
    public readonly retryable: boolean = false,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'AIError';
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends AIError {
  constructor(
    provider: AIProvider,
    public readonly resetTime: number,
    originalError?: Error
  ) {
    super(`Rate limit exceeded for ${provider}`, provider, 'RATE_LIMIT', true, originalError);
    this.name = 'RateLimitError';
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AIError {
  constructor(provider: AIProvider, originalError?: Error) {
    super(`Authentication failed for ${provider}`, provider, 'AUTH_ERROR', false, originalError);
    this.name = 'AuthenticationError';
  }
}

/**
 * Quota exceeded error
 */
export class QuotaExceededError extends AIError {
  constructor(provider: AIProvider, originalError?: Error) {
    super(`Quota exceeded for ${provider}`, provider, 'QUOTA_EXCEEDED', false, originalError);
    this.name = 'QuotaExceededError';
  }
}

/**
 * Network error
 */
export class NetworkError extends AIError {
  constructor(provider: AIProvider, originalError?: Error) {
    super(`Network error for ${provider}`, provider, 'NETWORK_ERROR', true, originalError);
    this.name = 'NetworkError';
  }
}

/**
 * Model not available error
 */
export class ModelNotAvailableError extends AIError {
  constructor(provider: AIProvider, model: string, originalError?: Error) {
    super(`Model ${model} not available for ${provider}`, provider, 'MODEL_NOT_AVAILABLE', false, originalError);
    this.name = 'ModelNotAvailableError';
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends AIError {
  constructor(provider: AIProvider, timeout: number, originalError?: Error) {
    super(`Request timeout (${timeout}ms) for ${provider}`, provider, 'TIMEOUT', true, originalError);
    this.name = 'TimeoutError';
  }
}