/**
 * Unit Tests for Base AI Adapter Classes and Utilities
 */

import {
  BaseAIAdapter,
  CircuitBreaker,
  AICache,
  LoadBalancer,
  AIUtils,
} from '../base';

import {
  AIProvider,
  ProviderConfig,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  AIModel,
  IAIAdapter,
  AIError,
  AuthenticationError,
  TimeoutError,
  ModelNotAvailableError,
  LoadBalancingStrategy,
} from '@/types/ai';

// Mock implementation of BaseAIAdapter for testing
class MockAIAdapter extends BaseAIAdapter {
  public readonly provider: AIProvider = 'gemini';
  
  private mockHealthy = true;
  private mockModels: AIModel[] = [
    {
      id: 'test-model',
      name: 'Test Model',
      provider: 'gemini',
      capabilities: {
        maxContextTokens: 32768,
        maxOutputTokens: 4096,
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsImages: false,
        supportsDocuments: false,
        costPerInputToken: 0.001,
        costPerOutputToken: 0.002,
      },
      available: true,
    },
  ];

  public setMockHealthy(healthy: boolean) {
    this.mockHealthy = healthy;
  }

  public setMockModels(models: AIModel[]) {
    this.mockModels = models;
  }

  protected async validateConfiguration(): Promise<void> {
    // Mock validation - could throw errors for testing
  }

  protected async fetchModels(): Promise<AIModel[]> {
    return this.mockModels;
  }

  protected async performHealthCheck(): Promise<boolean> {
    return this.mockHealthy;
  }

  protected async performRequest(request: AIRequest): Promise<AIResponse> {
    // Mock response
    return {
      content: 'Mock response content',
      model: request.model || 'test-model',
      provider: this.provider,
      usage: {
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
      },
      metadata: {
        duration: 100,
        timestamp: Date.now(),
        finishReason: 'stop',
      },
    };
  }

  protected async* performStreamRequest(request: AIRequest): AsyncGenerator<AIStreamChunk, void, unknown> {
    yield {
      delta: 'Mock ',
      done: false,
      model: request.model || 'test-model',
      provider: this.provider,
    };
    yield {
      delta: 'streaming ',
      done: false,
      model: request.model || 'test-model',
      provider: this.provider,
    };
    yield {
      delta: 'response',
      done: true,
      model: request.model || 'test-model',
      provider: this.provider,
      usage: {
        inputTokens: 10,
        outputTokens: 15,
        totalTokens: 25,
      },
    };
  }

  protected async fetchRateLimitStatus(): Promise<{
    remaining: number;
    resetTime: number;
    limit: number;
  }> {
    return {
      remaining: 50,
      resetTime: Date.now() + 3600000,
      limit: 60,
    };
  }
}

describe('BaseAIAdapter', () => {
  let adapter: MockAIAdapter;
  let config: ProviderConfig;

  beforeEach(() => {
    adapter = new MockAIAdapter();
    config = {
      provider: 'gemini',
      apiKey: 'test-api-key',
      baseUrl: 'https://api.test.com',
      timeout: 30000,
      rateLimit: 60,
      enabled: true,
      priority: 1,
      models: ['test-model'],
    };
  });

  describe('initialize', () => {
    it('should initialize successfully with valid config', async () => {
      await adapter.initialize(config);
      expect(adapter.getModels()).resolves.toHaveLength(1);
    });

    it('should throw AuthenticationError when API key is missing', async () => {
      config.apiKey = '';
      await expect(adapter.initialize(config)).rejects.toThrow(AuthenticationError);
    });

    it('should handle initialization failure', async () => {
      // Mock validation failure
      adapter.validateConfiguration = jest.fn().mockRejectedValue(new Error('Validation failed'));
      await expect(adapter.initialize(config)).rejects.toThrow(AIError);
    });
  });

  describe('healthCheck', () => {
    it('should return false when not initialized', async () => {
      const result = await adapter.healthCheck();
      expect(result).toBe(false);
    });

    it('should return true when healthy and initialized', async () => {
      await adapter.initialize(config);
      adapter.setMockHealthy(true);
      
      const result = await adapter.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false when unhealthy', async () => {
      await adapter.initialize(config);
      adapter.setMockHealthy(false);
      
      const result = await adapter.healthCheck();
      expect(result).toBe(false);
    });

    it('should handle health check error gracefully', async () => {
      await adapter.initialize(config);
      adapter.performHealthCheck = jest.fn().mockRejectedValue(new Error('Health check failed'));
      
      const result = await adapter.healthCheck();
      expect(result).toBe(false);
    });
  });

  describe('getModels', () => {
    it('should throw error when not initialized', async () => {
      await expect(adapter.getModels()).rejects.toThrow(AIError);
    });

    it('should return models when initialized', async () => {
      await adapter.initialize(config);
      const models = await adapter.getModels();
      expect(models).toHaveLength(1);
      expect(models[0].id).toBe('test-model');
    });
  });

  describe('request', () => {
    beforeEach(async () => {
      await adapter.initialize(config);
    });

    it('should process valid request successfully', async () => {
      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Test message' }],
        model: 'test-model',
      };

      const response = await adapter.request(request);
      expect(response.content).toBe('Mock response content');
      expect(response.provider).toBe('gemini');
      expect(response.usage.totalTokens).toBe(30);
    });

    it('should throw error when not initialized', async () => {
      const uninitializedAdapter = new MockAIAdapter();
      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Test message' }],
      };

      await expect(uninitializedAdapter.request(request)).rejects.toThrow(AIError);
    });

    it('should validate request parameters', async () => {
      const request: AIRequest = {
        messages: [],
      };

      await expect(adapter.request(request)).rejects.toThrow(AIError);
    });

    it('should validate model availability', async () => {
      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Test message' }],
        model: 'non-existent-model',
      };

      await expect(adapter.request(request)).rejects.toThrow(ModelNotAvailableError);
    });

    it('should validate temperature range', async () => {
      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Test message' }],
        temperature: 2.0,
      };

      await expect(adapter.request(request)).rejects.toThrow(AIError);
    });

    it('should handle request timeout', async () => {
      adapter.performRequest = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 60000))
      );

      config.timeout = 100; // Very short timeout
      await adapter.initialize(config);

      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Test message' }],
      };

      await expect(adapter.request(request)).rejects.toThrow(TimeoutError);
    }, 10000);
  });

  describe('streamRequest', () => {
    beforeEach(async () => {
      await adapter.initialize(config);
    });

    it('should process streaming request successfully', async () => {
      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Test message' }],
        model: 'test-model',
        stream: true,
      };

      const chunks: AIStreamChunk[] = [];
      for await (const chunk of adapter.streamRequest(request)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0].delta).toBe('Mock ');
      expect(chunks[2].done).toBe(true);
      expect(chunks[2].usage).toBeDefined();
    });

    it('should throw error for non-streaming model', async () => {
      const nonStreamingModel: AIModel = {
        ...adapter['models'][0],
        capabilities: {
          ...adapter['models'][0].capabilities,
          supportsStreaming: false,
        },
      };
      adapter.setMockModels([nonStreamingModel]);
      await adapter.initialize(config);

      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Test message' }],
        model: 'test-model',
        stream: true,
      };

      await expect(async () => {
        for await (const _ of adapter.streamRequest(request)) {
          // Should not reach here
        }
      }).rejects.toThrow(AIError);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return rate limit status when initialized', async () => {
      await adapter.initialize(config);
      const status = await adapter.getRateLimitStatus();
      
      expect(status.remaining).toBe(50);
      expect(status.limit).toBe(60);
      expect(status.resetTime).toBeGreaterThan(Date.now());
    });

    it('should throw error when not initialized', async () => {
      await expect(adapter.getRateLimitStatus()).rejects.toThrow(AIError);
    });
  });
});

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker(
      {
        failureThreshold: 3,
        recoveryTimeout: 5000,
        timeout: 1000,
        monitoringPeriod: 60000,
      },
      'test-provider'
    );
  });

  it('should execute function successfully when circuit is closed', async () => {
    const mockFn = jest.fn().mockResolvedValue('success');
    const result = await circuitBreaker.execute(mockFn);
    
    expect(result).toBe('success');
    expect(circuitBreaker.getStatus().state).toBe('closed');
  });

  it('should open circuit after failure threshold', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('Request failed'));
    
    // Fail 3 times to reach threshold
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(mockFn);
      } catch (error) {
        // Expected
      }
    }
    
    const status = circuitBreaker.getStatus();
    expect(status.state).toBe('open');
    expect(status.failureCount).toBe(3);
  });

  it('should throw error when circuit is open', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('Request failed'));
    
    // Trigger circuit opening
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(mockFn);
      } catch (error) {
        // Expected
      }
    }
    
    // Now circuit should be open and reject immediately
    await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('Circuit breaker is open');
  });

  it('should reset after successful execution', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValue('success');
    
    // One failure
    try {
      await circuitBreaker.execute(mockFn);
    } catch (error) {
      // Expected
    }
    
    expect(circuitBreaker.getStatus().failureCount).toBe(1);
    
    // Success should reset
    await circuitBreaker.execute(mockFn);
    expect(circuitBreaker.getStatus().failureCount).toBe(0);
    expect(circuitBreaker.getStatus().state).toBe('closed');
  });

  it('should handle timeout correctly', async () => {
    const mockFn = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 2000))
    );
    
    await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('Circuit breaker timeout');
  });
});

describe('AICache', () => {
  let cache: AICache;
  let request: AIRequest;
  let response: AIResponse;

  beforeEach(() => {
    cache = new AICache({
      ttl: 5000,
      maxSize: 10,
      enabled: true,
    });
    
    request = {
      messages: [{ role: 'user', content: 'Test message' }],
      model: 'test-model',
    };
    
    response = {
      content: 'Test response',
      model: 'test-model',
      provider: 'gemini',
      usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      metadata: {
        duration: 100,
        timestamp: Date.now(),
        finishReason: 'stop',
      },
    };
  });

  it('should cache and retrieve response', () => {
    cache.set(request, response);
    const cached = cache.get(request);
    
    expect(cached).toEqual(response);
  });

  it('should return null for cache miss', () => {
    const cached = cache.get(request);
    expect(cached).toBeNull();
  });

  it('should expire cached entries', (done) => {
    const shortTtlCache = new AICache({
      ttl: 100, // 100ms
      maxSize: 10,
      enabled: true,
    });
    
    shortTtlCache.set(request, response);
    expect(shortTtlCache.get(request)).toEqual(response);
    
    setTimeout(() => {
      expect(shortTtlCache.get(request)).toBeNull();
      done();
    }, 150);
  });

  it('should evict oldest entries when cache is full', () => {
    const smallCache = new AICache({
      ttl: 5000,
      maxSize: 2,
      enabled: true,
    });
    
    const request1 = { ...request, messages: [{ role: 'user', content: 'Message 1' }] };
    const request2 = { ...request, messages: [{ role: 'user', content: 'Message 2' }] };
    const request3 = { ...request, messages: [{ role: 'user', content: 'Message 3' }] };
    
    smallCache.set(request1, response);
    smallCache.set(request2, response);
    smallCache.set(request3, response); // Should evict request1
    
    expect(smallCache.get(request1)).toBeNull();
    expect(smallCache.get(request2)).toEqual(response);
    expect(smallCache.get(request3)).toEqual(response);
  });

  it('should not cache when disabled', () => {
    const disabledCache = new AICache({
      ttl: 5000,
      maxSize: 10,
      enabled: false,
    });
    
    disabledCache.set(request, response);
    const cached = disabledCache.get(request);
    
    expect(cached).toBeNull();
  });

  it('should clear all cache entries', () => {
    cache.set(request, response);
    expect(cache.get(request)).toEqual(response);
    
    cache.clear();
    expect(cache.get(request)).toBeNull();
  });
});

describe('LoadBalancer', () => {
  let mockAdapters: { provider: AIProvider; priority: number; adapter: IAIAdapter }[];
  
  beforeEach(() => {
    mockAdapters = [
      {
        provider: 'gemini',
        priority: 4,
        adapter: {
          provider: 'gemini',
          healthCheck: jest.fn().mockResolvedValue(true),
        } as any,
      },
      {
        provider: 'deepseek',
        priority: 3,
        adapter: {
          provider: 'deepseek',
          healthCheck: jest.fn().mockResolvedValue(true),
        } as any,
      },
      {
        provider: 'qwen',
        priority: 2,
        adapter: {
          provider: 'qwen',
          healthCheck: jest.fn().mockResolvedValue(false), // Unhealthy
        } as any,
      },
    ];
  });

  it('should select highest priority provider for priority strategy', async () => {
    const loadBalancer = new LoadBalancer('priority', mockAdapters);
    const selected = await loadBalancer.selectProvider();
    
    expect(selected?.provider).toBe('gemini'); // Highest priority and healthy
  });

  it('should skip unhealthy providers', async () => {
    // Make gemini unhealthy
    (mockAdapters[0].adapter.healthCheck as jest.Mock).mockResolvedValue(false);
    
    const loadBalancer = new LoadBalancer('priority', mockAdapters);
    const selected = await loadBalancer.selectProvider();
    
    expect(selected?.provider).toBe('deepseek'); // Second highest priority and healthy
  });

  it('should return null when no providers are healthy', async () => {
    // Make all providers unhealthy
    mockAdapters.forEach(p => {
      (p.adapter.healthCheck as jest.Mock).mockResolvedValue(false);
    });
    
    const loadBalancer = new LoadBalancer('priority', mockAdapters);
    const selected = await loadBalancer.selectProvider();
    
    expect(selected).toBeNull();
  });

  it('should round robin between providers', async () => {
    const loadBalancer = new LoadBalancer('round-robin', mockAdapters);
    
    const first = await loadBalancer.selectProvider();
    const second = await loadBalancer.selectProvider();
    const third = await loadBalancer.selectProvider();
    
    // Should cycle through healthy providers (gemini, deepseek)
    expect([first?.provider, second?.provider, third?.provider]).toEqual([
      'gemini', 'deepseek', 'gemini'
    ]);
  });

  it('should randomly select from healthy providers', async () => {
    const loadBalancer = new LoadBalancer('random', mockAdapters);
    
    // Mock Math.random to return predictable values
    const originalRandom = Math.random;
    Math.random = jest.fn()
      .mockReturnValueOnce(0.1) // Select first healthy provider
      .mockReturnValueOnce(0.9); // Select second healthy provider
    
    const first = await loadBalancer.selectProvider();
    const second = await loadBalancer.selectProvider();
    
    expect(first?.provider).toBe('gemini');
    expect(second?.provider).toBe('deepseek');
    
    Math.random = originalRandom;
  });
});

describe('AIUtils', () => {
  let model: AIModel;
  let response: AIResponse;

  beforeEach(() => {
    model = {
      id: 'test-model',
      name: 'Test Model',
      provider: 'gemini',
      capabilities: {
        maxContextTokens: 32768,
        maxOutputTokens: 4096,
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsImages: false,
        supportsDocuments: false,
        costPerInputToken: 0.001,
        costPerOutputToken: 0.002,
      },
      available: true,
    };

    response = {
      content: 'Test response',
      model: 'test-model',
      provider: 'gemini',
      usage: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 },
      metadata: {
        duration: 100,
        timestamp: Date.now(),
        finishReason: 'stop',
      },
    };
  });

  describe('calculateCost', () => {
    it('should calculate cost correctly', () => {
      const cost = AIUtils.calculateCost(response, model);
      // (1000/1000 * 0.001) + (500/1000 * 0.002) = 0.001 + 0.001 = 0.002
      expect(cost).toBe(0.002);
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens approximately', () => {
      const text = 'This is a test message with about twenty characters.'; // ~52 chars
      const tokens = AIUtils.estimateTokens(text);
      expect(tokens).toBe(13); // 52/4 = 13
    });
  });

  describe('validateModelCapabilities', () => {
    it('should validate context window', () => {
      const request: AIRequest = {
        messages: [
          { role: 'user', content: 'x'.repeat(200000) } // Very long message
        ],
      };
      
      const result = AIUtils.validateModelCapabilities(request, model);
      expect(result).toBe(false); // Exceeds context window
    });

    it('should validate max output tokens', () => {
      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Short message' }],
        maxTokens: 10000, // Exceeds model capability
      };
      
      const result = AIUtils.validateModelCapabilities(request, model);
      expect(result).toBe(false);
    });

    it('should validate streaming support', () => {
      const nonStreamingModel = {
        ...model,
        capabilities: {
          ...model.capabilities,
          supportsStreaming: false,
        },
      };
      
      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        stream: true,
      };
      
      const result = AIUtils.validateModelCapabilities(request, nonStreamingModel);
      expect(result).toBe(false);
    });

    it('should pass valid request', () => {
      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Short test message' }],
        maxTokens: 100,
        stream: true,
      };
      
      const result = AIUtils.validateModelCapabilities(request, model);
      expect(result).toBe(true);
    });
  });

  describe('calculateRetryDelay', () => {
    it('should calculate exponential backoff', () => {
      expect(AIUtils.calculateRetryDelay(0, 1000)).toBe(1000);
      expect(AIUtils.calculateRetryDelay(1, 1000)).toBe(2000);
      expect(AIUtils.calculateRetryDelay(2, 1000)).toBe(4000);
      expect(AIUtils.calculateRetryDelay(10, 1000)).toBe(30000); // Capped at 30 seconds
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable AI errors', () => {
      const retryableError = new AIError('Test error', 'gemini', 'NETWORK_ERROR', true);
      expect(AIUtils.isRetryableError(retryableError)).toBe(true);
    });

    it('should identify non-retryable AI errors', () => {
      const nonRetryableError = new AIError('Test error', 'gemini', 'AUTH_ERROR', false);
      expect(AIUtils.isRetryableError(nonRetryableError)).toBe(false);
    });

    it('should identify retryable generic errors by message', () => {
      const timeoutError = new Error('Request timeout');
      const networkError = new Error('Network connection failed');
      
      expect(AIUtils.isRetryableError(timeoutError)).toBe(true);
      expect(AIUtils.isRetryableError(networkError)).toBe(true);
    });

    it('should not retry non-network errors', () => {
      const validationError = new Error('Invalid input');
      expect(AIUtils.isRetryableError(validationError)).toBe(false);
    });
  });
});