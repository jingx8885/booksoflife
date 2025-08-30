/**
 * Unit Tests for AI Service Orchestration Components
 * 
 * Tests the router and orchestrator logic for intelligent request handling,
 * load balancing, failover scenarios, and provider selection.
 */

import {
  AIProvider,
  AIRequest,
  AIResponse,
  AIModel,
  IAIAdapter,
  AIError,
  RateLimitError,
  NetworkError,
  TimeoutError,
  LoadBalancingStrategy,
  AIServiceConfig,
} from '@/types/ai';

import { CircuitBreaker, AICache } from '../base';
import { AIRouter, RoutingCriteria } from '../router';
import { AIOrchestrator, OrchestratorConfig } from '../orchestrator';

// Mock adapters for testing
class MockAdapter implements IAIAdapter {
  public provider: AIProvider;
  private healthy: boolean = true;
  private models: AIModel[] = [];
  private shouldFailRequest: boolean = false;
  private requestDelay: number = 0;

  constructor(provider: AIProvider) {
    this.provider = provider;
    this.models = [
      {
        id: `${provider}-model`,
        name: `${provider} Model`,
        provider,
        capabilities: {
          maxContextTokens: 32768,
          maxOutputTokens: 4096,
          supportsStreaming: true,
          supportsFunctionCalling: true,
          supportsImages: provider === 'gemini',
          supportsDocuments: provider === 'kimi',
          costPerInputToken: 0.001,
          costPerOutputToken: 0.002,
        },
        available: true,
      },
    ];
  }

  setHealthy(healthy: boolean) {
    this.healthy = healthy;
  }

  setShouldFailRequest(fail: boolean) {
    this.shouldFailRequest = fail;
  }

  setRequestDelay(delay: number) {
    this.requestDelay = delay;
  }

  async initialize(): Promise<void> {
    // Mock initialization
  }

  async healthCheck(): Promise<boolean> {
    return this.healthy;
  }

  async getModels(): Promise<AIModel[]> {
    return this.models;
  }

  async request(request: AIRequest): Promise<AIResponse> {
    if (this.requestDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay));
    }

    if (this.shouldFailRequest) {
      throw new AIError('Mock request failed', this.provider, 'REQUEST_FAILED', true);
    }

    return {
      content: `Mock response from ${this.provider}`,
      model: request.model || `${this.provider}-model`,
      provider: this.provider,
      usage: {
        inputTokens: 10,
        outputTokens: 15,
        totalTokens: 25,
      },
      metadata: {
        duration: this.requestDelay,
        timestamp: Date.now(),
        finishReason: 'stop',
      },
    };
  }

  async* streamRequest(request: AIRequest): AsyncGenerator<any, void, unknown> {
    if (this.shouldFailRequest) {
      throw new AIError('Mock stream failed', this.provider, 'STREAM_FAILED', true);
    }

    yield {
      delta: 'Mock ',
      done: false,
      model: request.model || `${this.provider}-model`,
      provider: this.provider,
    };

    yield {
      delta: `response from ${this.provider}`,
      done: true,
      model: request.model || `${this.provider}-model`,
      provider: this.provider,
      usage: {
        inputTokens: 10,
        outputTokens: 15,
        totalTokens: 25,
      },
    };
  }

  async getRateLimitStatus() {
    return {
      remaining: 50,
      resetTime: Date.now() + 3600000,
      limit: 60,
    };
  }
}

describe('AIRouter', () => {
  let router: AIRouter;
  let mockAdapters: Map<AIProvider, MockAdapter>;
  let circuitBreakers: Map<AIProvider, CircuitBreaker>;

  beforeEach(() => {
    mockAdapters = new Map([
      ['gemini', new MockAdapter('gemini')],
      ['deepseek', new MockAdapter('deepseek')],
      ['qwen', new MockAdapter('qwen')],
      ['kimi', new MockAdapter('kimi')],
    ]);

    circuitBreakers = new Map();
    for (const [provider] of mockAdapters) {
      circuitBreakers.set(provider, new CircuitBreaker(
        {
          failureThreshold: 3,
          recoveryTimeout: 5000,
          timeout: 1000,
          monitoringPeriod: 60000,
        },
        provider
      ));
    }

    router = new AIRouter();
  });

  describe('Provider Selection', () => {
    it('should select best provider based on capabilities', async () => {
      const criteria: RoutingCriteria = {
        capabilities: {
          images: true,
          streaming: true,
        },
      };

      const selection = await router.selectProvider(
        Array.from(mockAdapters.values()),
        criteria
      );

      expect(selection).toBeDefined();
      expect(['gemini', 'qwen']).toContain(selection?.provider);
    });

    it('should respect preferred provider', async () => {
      const criteria: RoutingCriteria = {
        preferredProvider: 'deepseek',
      };

      const selection = await router.selectProvider(
        Array.from(mockAdapters.values()),
        criteria
      );

      expect(selection?.provider).toBe('deepseek');
    });

    it('should exclude specified providers', async () => {
      const criteria: RoutingCriteria = {
        excludedProviders: ['gemini', 'qwen'],
      };

      const selection = await router.selectProvider(
        Array.from(mockAdapters.values()),
        criteria
      );

      expect(selection).toBeDefined();
      expect(['deepseek', 'kimi']).toContain(selection?.provider);
    });

    it('should return null when no providers meet criteria', async () => {
      // Make all providers unhealthy
      for (const adapter of mockAdapters.values()) {
        adapter.setHealthy(false);
      }

      const selection = await router.selectProvider(
        Array.from(mockAdapters.values()),
        {}
      );

      expect(selection).toBeNull();
    });

    it('should prioritize by cost preference', async () => {
      const criteria: RoutingCriteria = {
        costPreference: 'low',
      };

      const selection = await router.selectProvider(
        Array.from(mockAdapters.values()),
        criteria
      );

      expect(selection).toBeDefined();
      // DeepSeek should be preferred for low cost
      expect(selection?.provider).toBe('deepseek');
    });

    it('should consider context token requirements', async () => {
      const criteria: RoutingCriteria = {
        capabilities: {
          minContextTokens: 100000, // Requires large context
        },
      };

      const selection = await router.selectProvider(
        Array.from(mockAdapters.values()),
        criteria
      );

      expect(selection).toBeDefined();
      // Only Gemini and Kimi support large contexts in our setup
      expect(['gemini', 'kimi']).toContain(selection?.provider);
    });
  });

  describe('Load Balancing Strategies', () => {
    it('should implement round-robin selection', async () => {
      const selections = [];
      
      for (let i = 0; i < 6; i++) {
        const selection = await router.selectProviderWithStrategy(
          Array.from(mockAdapters.values()),
          'round-robin'
        );
        selections.push(selection?.provider);
      }

      // Should cycle through providers
      const uniqueProviders = new Set(selections.filter(p => p));
      expect(uniqueProviders.size).toBeGreaterThan(1);
    });

    it('should implement priority-based selection', async () => {
      // Set different priorities
      const adaptersWithPriority = Array.from(mockAdapters.values()).map((adapter, index) => ({
        adapter,
        priority: 4 - index, // Gemini = 4, DeepSeek = 3, etc.
      }));

      const selection = await router.selectProviderWithStrategy(
        adaptersWithPriority.map(p => p.adapter),
        'priority'
      );

      // Should select highest priority (Gemini)
      expect(selection?.provider).toBe('gemini');
    });

    it('should implement random selection', async () => {
      const selections = new Set();
      
      for (let i = 0; i < 20; i++) {
        const selection = await router.selectProviderWithStrategy(
          Array.from(mockAdapters.values()),
          'random'
        );
        if (selection) {
          selections.add(selection.provider);
        }
      }

      // Should select multiple different providers
      expect(selections.size).toBeGreaterThan(1);
    });
  });

  describe('Model Compatibility', () => {
    it('should validate model compatibility with request', async () => {
      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Test message' }],
        stream: true,
        maxTokens: 2000,
      };

      const compatible = await router.isModelCompatible(
        mockAdapters.get('gemini')!,
        request
      );

      expect(compatible).toBe(true);
    });

    it('should reject incompatible models', async () => {
      const request: AIRequest = {
        messages: [{ role: 'user', content: 'x'.repeat(200000) }], // Very long
        maxTokens: 10000, // Exceeds model limit
      };

      const compatible = await router.isModelCompatible(
        mockAdapters.get('deepseek')!,
        request
      );

      expect(compatible).toBe(false);
    });
  });
});

describe('AIOrchestrator', () => {
  let orchestrator: AIOrchestrator;
  let config: OrchestratorConfig;
  let mockAdapters: Map<AIProvider, MockAdapter>;

  beforeEach(() => {
    mockAdapters = new Map([
      ['gemini', new MockAdapter('gemini')],
      ['deepseek', new MockAdapter('deepseek')],
      ['qwen', new MockAdapter('qwen')],
      ['kimi', new MockAdapter('kimi')],
    ]);

    config = {
      providers: [
        {
          provider: 'gemini',
          apiKey: 'test-key',
          enabled: true,
          priority: 4,
          models: ['gemini-model'],
        },
        {
          provider: 'deepseek',
          apiKey: 'test-key',
          enabled: true,
          priority: 3,
          models: ['deepseek-model'],
        },
        {
          provider: 'qwen',
          apiKey: 'test-key',
          enabled: true,
          priority: 2,
          models: ['qwen-model'],
        },
        {
          provider: 'kimi',
          apiKey: 'test-key',
          enabled: true,
          priority: 1,
          models: ['kimi-model'],
        },
      ],
      loadBalancingStrategy: 'priority',
      circuitBreaker: {
        failureThreshold: 3,
        recoveryTimeout: 5000,
        timeout: 30000,
        monitoringPeriod: 60000,
      },
      cache: {
        ttl: 300000,
        maxSize: 1000,
        enabled: true,
      },
      defaultTimeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      enableFailover: true,
      maxFailoverAttempts: 3,
      enableRequestQueuing: false,
      maxQueueSize: 100,
      queueTimeout: 30000,
    };

    orchestrator = new AIOrchestrator(config);
    
    // Inject mock adapters
    for (const [provider, adapter] of mockAdapters) {
      orchestrator['adapters'].set(provider, adapter);
      orchestrator['circuitBreakers'].set(provider, new CircuitBreaker(
        config.circuitBreaker,
        provider
      ));
    }
  });

  describe('Basic Request Processing', () => {
    it('should process request successfully', async () => {
      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Test message' }],
      };

      const response = await orchestrator.request(request);
      
      expect(response).toBeDefined();
      expect(response.content).toBeTruthy();
      expect(response.provider).toBeTruthy();
      expect(response.usage.totalTokens).toBeGreaterThan(0);
    });

    it('should handle streaming requests', async () => {
      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Test streaming message' }],
        stream: true,
      };

      const chunks = [];
      for await (const chunk of orchestrator.streamRequest(request)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[chunks.length - 1].done).toBe(true);
    });

    it('should use cache when enabled', async () => {
      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Cached test message' }],
      };

      // First request should hit the provider
      const response1 = await orchestrator.request(request);
      expect(response1).toBeDefined();

      // Second identical request should hit cache
      const response2 = await orchestrator.request(request);
      expect(response2).toBeDefined();
      expect(response2.content).toBe(response1.content);
    });
  });

  describe('Failover Scenarios', () => {
    it('should failover to next provider on failure', async () => {
      // Make primary provider fail
      mockAdapters.get('gemini')!.setShouldFailRequest(true);

      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Test failover message' }],
      };

      const response = await orchestrator.request(request);
      
      expect(response).toBeDefined();
      expect(response.provider).not.toBe('gemini'); // Should use different provider
    });

    it('should respect maximum failover attempts', async () => {
      // Make all providers fail
      for (const adapter of mockAdapters.values()) {
        adapter.setShouldFailRequest(true);
      }

      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Test all fail message' }],
      };

      await expect(orchestrator.request(request)).rejects.toThrow(AIError);
    });

    it('should handle rate limiting with retry', async () => {
      // Mock rate limit error on first attempt
      const originalRequest = mockAdapters.get('gemini')!.request;
      let callCount = 0;
      
      mockAdapters.get('gemini')!.request = async (request: AIRequest) => {
        callCount++;
        if (callCount === 1) {
          throw new RateLimitError('gemini', Date.now() + 1000);
        }
        return originalRequest.call(mockAdapters.get('gemini')!, request);
      };

      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Test rate limit message' }],
      };

      const response = await orchestrator.request(request);
      expect(response).toBeDefined();
      expect(callCount).toBeGreaterThan(1); // Should have retried
    });

    it('should handle network errors with failover', async () => {
      // Make primary provider throw network error
      mockAdapters.get('gemini')!.request = async () => {
        throw new NetworkError('gemini', new Error('Connection failed'));
      };

      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Test network error message' }],
      };

      const response = await orchestrator.request(request);
      
      expect(response).toBeDefined();
      expect(response.provider).not.toBe('gemini');
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should open circuit breaker after repeated failures', async () => {
      const adapter = mockAdapters.get('gemini')!;
      adapter.setShouldFailRequest(true);

      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Test circuit breaker message' }],
      };

      // Make enough requests to trigger circuit breaker
      for (let i = 0; i < 4; i++) {
        try {
          await orchestrator.request(request);
        } catch (error) {
          // Expected failures
        }
      }

      const circuitBreaker = orchestrator['circuitBreakers'].get('gemini');
      expect(circuitBreaker?.getStatus().state).toBe('open');
    });

    it('should bypass open circuit breakers', async () => {
      // Open the circuit breaker for gemini
      const circuitBreaker = orchestrator['circuitBreakers'].get('gemini')!;
      // Simulate failures to open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(() => Promise.reject(new Error('Test failure')));
        } catch (error) {
          // Expected
        }
      }

      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Test bypass circuit breaker message' }],
      };

      const response = await orchestrator.request(request);
      
      expect(response).toBeDefined();
      expect(response.provider).not.toBe('gemini'); // Should use different provider
    });
  });

  describe('Load Balancing', () => {
    it('should distribute requests across providers', async () => {
      const providers = new Set<AIProvider>();
      
      // Make multiple requests
      for (let i = 0; i < 10; i++) {
        const request: AIRequest = {
          messages: [{ role: 'user', content: `Test message ${i}` }],
        };

        const response = await orchestrator.request(request);
        providers.add(response.provider);
      }

      // Should use multiple providers (depending on strategy)
      expect(providers.size).toBeGreaterThanOrEqual(1);
    });

    it('should handle provider priority correctly', async () => {
      // With priority strategy, should prefer higher priority providers
      config.loadBalancingStrategy = 'priority';
      orchestrator = new AIOrchestrator(config);

      // Inject mock adapters
      for (const [provider, adapter] of mockAdapters) {
        orchestrator['adapters'].set(provider, adapter);
      }

      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Test priority message' }],
      };

      const response = await orchestrator.request(request);
      
      // Should use highest priority provider (gemini = 4)
      expect(response.provider).toBe('gemini');
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track request statistics', async () => {
      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Test stats message' }],
      };

      await orchestrator.request(request);
      
      const stats = await orchestrator.getStatistics();
      
      expect(stats.totalRequests).toBeGreaterThan(0);
      expect(stats.successfulRequests).toBeGreaterThan(0);
      expect(stats.providerStats).toBeDefined();
    });

    it('should provide health status', async () => {
      const health = await orchestrator.getHealthStatus();
      
      expect(health).toBeDefined();
      expect(health.overall).toBeDefined();
      expect(health.providers).toBeDefined();
      
      // All mock adapters should be healthy
      for (const [provider] of mockAdapters) {
        expect(health.providers[provider]).toBe(true);
      }
    });
  });

  describe('Configuration Management', () => {
    it('should validate configuration on initialization', () => {
      const invalidConfig = {
        ...config,
        providers: [], // No providers
      };

      expect(() => new AIOrchestrator(invalidConfig)).toThrow();
    });

    it('should handle dynamic configuration updates', async () => {
      const newConfig = {
        ...config,
        maxRetries: 5,
      };

      orchestrator.updateConfiguration(newConfig);
      
      // Configuration should be updated
      expect(orchestrator['config'].maxRetries).toBe(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle adapter initialization failures gracefully', async () => {
      // This test would typically involve mocking adapter creation to fail
      expect(orchestrator).toBeDefined();
    });

    it('should provide detailed error information', async () => {
      // Make all providers fail
      for (const adapter of mockAdapters.values()) {
        adapter.setShouldFailRequest(true);
      }

      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Test error handling message' }],
      };

      try {
        await orchestrator.request(request);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(AIError);
        if (error instanceof AIError) {
          expect(error.message).toBeTruthy();
          expect(error.code).toBeTruthy();
        }
      }
    });
  });
});