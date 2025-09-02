/**
 * Unit Tests for AI Provider Adapters
 * 
 * Tests all provider implementations: Gemini, DeepSeek, Qwen, Kimi
 */

import {
  AIProvider,
  ProviderConfig,
  AIRequest,
  AIResponse,
  AIModel,
  AuthenticationError,
  NetworkError,
  RateLimitError,
  AIError,
} from '@/types/ai';

import {
  GeminiAdapter,
  DeepSeekAdapter,
  QwenAdapter,
  KimiAdapter,
  createAdapter,
  createAdapters,
  getSupportedProviders,
  isProviderSupported,
  getProvidersWithCapabilities,
} from '../providers';

// Mock fetch globally
global.fetch = jest.fn();

// Mock console to reduce test noise
const originalConsole = console;

beforeAll(() => {
  global.console = {
    ...originalConsole,
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
  };
});

afterAll(() => {
  global.console = originalConsole;
});

describe('Provider Adapters', () => {
  const testProviders: Array<{
    name: string;
    provider: AIProvider;
    adapter: new () => any;
    baseUrl: string;
  }> = [
    {
      name: 'Gemini',
      provider: 'gemini',
      adapter: GeminiAdapter,
      baseUrl: 'https://generativelanguage.googleapis.com',
    },
    {
      name: 'DeepSeek',
      provider: 'deepseek',
      adapter: DeepSeekAdapter,
      baseUrl: 'https://api.deepseek.com',
    },
    {
      name: 'Qwen',
      provider: 'qwen',
      adapter: QwenAdapter,
      baseUrl: 'https://dashscope.aliyuncs.com',
    },
    {
      name: 'Kimi',
      provider: 'kimi',
      adapter: KimiAdapter,
      baseUrl: 'https://api.moonshot.cn',
    },
  ];

  describe.each(testProviders)('$name Adapter', ({ provider, adapter: AdapterClass, baseUrl }) => {
    let adapter: any;
    let config: ProviderConfig;

    beforeEach(() => {
      adapter = new AdapterClass();
      config = {
        provider,
        apiKey: `test-${provider}-key`,
        baseUrl,
        timeout: 30000,
        rateLimit: 60,
        enabled: true,
        priority: 1,
        models: [`test-${provider}-model`],
      };

      // Reset fetch mock
      (fetch as jest.Mock).mockReset();
    });

    describe('Basic Properties', () => {
      it('should have correct provider name', () => {
        expect(adapter.provider).toBe(provider);
      });

      it('should extend BaseAIAdapter', () => {
        expect(adapter.constructor.name).toContain('Adapter');
      });
    });

    describe('Initialization', () => {
      it('should initialize successfully with valid config', async () => {
        // Mock successful API responses
        mockSuccessfulApiResponses(provider);

        await adapter.initialize(config);
        expect(adapter.getModels()).resolves.toBeDefined();
      });

      it('should throw AuthenticationError with invalid API key', async () => {
        // Mock authentication failure
        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        });

        await expect(adapter.initialize(config)).rejects.toThrow(AuthenticationError);
      });

      it('should throw AuthenticationError with missing API key', async () => {
        config.apiKey = '';
        await expect(adapter.initialize(config)).rejects.toThrow(AuthenticationError);
      });

      it('should handle network errors during validation', async () => {
        // Mock network error
        (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

        await expect(adapter.initialize(config)).rejects.toThrow();
      });

      it('should use default models when API fails', async () => {
        // Mock validation success but model fetch failure
        (fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
          })
          .mockRejectedValueOnce(new Error('API error'));

        await adapter.initialize(config);
        const models = await adapter.getModels();
        expect(models.length).toBeGreaterThan(0);
      });
    });

    describe('Health Check', () => {
      beforeEach(async () => {
        mockSuccessfulApiResponses(provider);
        await adapter.initialize(config);
      });

      it('should return true for healthy provider', async () => {
        // Mock successful health check
        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        });

        const isHealthy = await adapter.healthCheck();
        expect(isHealthy).toBe(true);
      });

      it('should return false for unhealthy provider', async () => {
        // Mock failed health check
        (fetch as jest.Mock).mockRejectedValueOnce(new Error('Service unavailable'));

        const isHealthy = await adapter.healthCheck();
        expect(isHealthy).toBe(false);
      });
    });

    describe('Model Management', () => {
      beforeEach(async () => {
        mockSuccessfulApiResponses(provider);
        await adapter.initialize(config);
      });

      it('should return available models', async () => {
        const models = await adapter.getModels();
        expect(Array.isArray(models)).toBe(true);
        expect(models.length).toBeGreaterThan(0);
        
        models.forEach((model: AIModel) => {
          expect(model).toHaveProperty('id');
          expect(model).toHaveProperty('name');
          expect(model.provider).toBe(provider);
          expect(model).toHaveProperty('capabilities');
          expect(model.capabilities).toHaveProperty('maxContextTokens');
          expect(model.capabilities).toHaveProperty('maxOutputTokens');
        });
      });

      it('should have provider-specific models', async () => {
        const models = await adapter.getModels();
        const modelIds = models.map((m: AIModel) => m.id);
        
        // Each provider should have its expected models
        switch (provider) {
          case 'gemini':
            expect(modelIds).toEqual(
              expect.arrayContaining(['gemini-1.5-pro', 'gemini-1.5-flash'])
            );
            break;
          case 'deepseek':
            expect(modelIds).toEqual(
              expect.arrayContaining(['deepseek-chat'])
            );
            break;
          case 'qwen':
            expect(modelIds).toEqual(
              expect.arrayContaining(['qwen-max', 'qwen-plus'])
            );
            break;
          case 'kimi':
            expect(modelIds).toEqual(
              expect.arrayContaining(['moonshot-v1-8k', 'moonshot-v1-32k'])
            );
            break;
        }
      });
    });

    describe('Request Processing', () => {
      beforeEach(async () => {
        mockSuccessfulApiResponses(provider);
        await adapter.initialize(config);
      });

      it('should process basic request successfully', async () => {
        // Mock successful request response
        mockSuccessfulRequestResponse(provider);

        const request: AIRequest = {
          messages: [{ role: 'user', content: 'Test message' }],
        };

        const response = await adapter.request(request);
        
        expect(response).toHaveProperty('content');
        expect(response).toHaveProperty('usage');
        expect(response.provider).toBe(provider);
        expect(response.usage.totalTokens).toBeGreaterThan(0);
      });

      it('should handle rate limiting', async () => {
        // Mock rate limit response
        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Map([['retry-after', '60']]),
        });

        const request: AIRequest = {
          messages: [{ role: 'user', content: 'Test message' }],
        };

        await expect(adapter.request(request)).rejects.toThrow();
      });

      it('should handle API errors gracefully', async () => {
        // Mock API error
        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        });

        const request: AIRequest = {
          messages: [{ role: 'user', content: 'Test message' }],
        };

        await expect(adapter.request(request)).rejects.toThrow(AIError);
      });

      it('should validate request parameters', async () => {
        const invalidRequest: AIRequest = {
          messages: [], // Empty messages array
        };

        await expect(adapter.request(invalidRequest)).rejects.toThrow(AIError);
      });
    });

    describe('Streaming', () => {
      beforeEach(async () => {
        mockSuccessfulApiResponses(provider);
        await adapter.initialize(config);
      });

      it('should process streaming request', async () => {
        // Mock streaming response
        mockSuccessfulStreamingResponse(provider);

        const request: AIRequest = {
          messages: [{ role: 'user', content: 'Test streaming message' }],
          stream: true,
        };

        const chunks = [];
        for await (const chunk of adapter.streamRequest(request)) {
          chunks.push(chunk);
        }

        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks[chunks.length - 1].done).toBe(true);
      });
    });

    describe('Rate Limiting', () => {
      beforeEach(async () => {
        mockSuccessfulApiResponses(provider);
        await adapter.initialize(config);
      });

      it('should return rate limit status', async () => {
        // Mock rate limit status response
        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Map([
            ['x-ratelimit-remaining', '50'],
            ['x-ratelimit-limit', '60'],
            ['x-ratelimit-reset', String(Date.now() + 3600000)],
          ]),
          json: () => Promise.resolve({}),
        });

        const status = await adapter.getRateLimitStatus();
        
        expect(status).toHaveProperty('remaining');
        expect(status).toHaveProperty('limit');
        expect(status).toHaveProperty('resetTime');
        expect(typeof status.remaining).toBe('number');
        expect(typeof status.limit).toBe('number');
        expect(typeof status.resetTime).toBe('number');
      });
    });
  });

  // Helper functions for mocking API responses
  function mockSuccessfulApiResponses(provider: AIProvider) {
    switch (provider) {
      case 'gemini':
        (fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              models: [
                {
                  name: 'models/gemini-1.5-pro',
                  displayName: 'Gemini 1.5 Pro',
                  supportedGenerationMethods: ['generateContent'],
                  inputTokenLimit: 2000000,
                  outputTokenLimit: 8192,
                },
              ],
            }),
          });
        break;
      
      default:
        (fetch as jest.Mock).mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        });
    }
  }

  function mockSuccessfulRequestResponse(provider: AIProvider) {
    const mockResponse = {
      ok: true,
      status: 200,
      json: () => Promise.resolve(getProviderMockResponse(provider)),
    };
    (fetch as jest.Mock).mockResolvedValueOnce(mockResponse);
  }

  function mockSuccessfulStreamingResponse(provider: AIProvider) {
    const mockReadableStream = new ReadableStream({
      start(controller) {
        const chunks = [
          'data: ' + JSON.stringify(getProviderStreamChunk(provider, 'Test ', false)) + '\n\n',
          'data: ' + JSON.stringify(getProviderStreamChunk(provider, 'streaming ', false)) + '\n\n',
          'data: ' + JSON.stringify(getProviderStreamChunk(provider, 'response', true)) + '\n\n',
          'data: [DONE]\n\n',
        ];
        
        chunks.forEach((chunk, index) => {
          setTimeout(() => {
            controller.enqueue(new TextEncoder().encode(chunk));
            if (index === chunks.length - 1) {
              controller.close();
            }
          }, index * 10);
        });
      },
    });

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: mockReadableStream,
    });
  }

  function getProviderMockResponse(provider: AIProvider) {
    switch (provider) {
      case 'gemini':
        return {
          candidates: [{
            content: {
              parts: [{ text: 'Mock Gemini response' }],
              role: 'model',
            },
            finishReason: 'STOP',
            index: 0,
          }],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 15,
            totalTokenCount: 25,
          },
        };
      
      case 'deepseek':
        return {
          choices: [{
            message: {
              role: 'assistant',
              content: 'Mock DeepSeek response',
            },
            finish_reason: 'stop',
            index: 0,
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 15,
            total_tokens: 25,
          },
        };
      
      case 'qwen':
        return {
          output: {
            text: 'Mock Qwen response',
            finish_reason: 'stop',
          },
          usage: {
            input_tokens: 10,
            output_tokens: 15,
            total_tokens: 25,
          },
        };
      
      case 'kimi':
        return {
          choices: [{
            message: {
              role: 'assistant',
              content: 'Mock Kimi response',
            },
            finish_reason: 'stop',
            index: 0,
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 15,
            total_tokens: 25,
          },
        };
      
      default:
        return {
          content: 'Mock response',
          usage: { total_tokens: 25 },
        };
    }
  }

  function getProviderStreamChunk(provider: AIProvider, text: string, done: boolean) {
    switch (provider) {
      case 'gemini':
        return {
          candidates: [{
            content: {
              parts: [{ text }],
              role: 'model',
            },
            finishReason: done ? 'STOP' : undefined,
            index: 0,
          }],
          ...(done && {
            usageMetadata: {
              promptTokenCount: 10,
              candidatesTokenCount: 15,
              totalTokenCount: 25,
            },
          }),
        };
      
      default:
        return {
          choices: [{
            delta: {
              content: text,
            },
            finish_reason: done ? 'stop' : null,
            index: 0,
          }],
          ...(done && {
            usage: {
              prompt_tokens: 10,
              completion_tokens: 15,
              total_tokens: 25,
            },
          }),
        };
    }
  }
});

describe('Provider Factory Functions', () => {
  describe('createAdapter', () => {
    it('should create correct adapter for each provider', () => {
      const geminiAdapter = createAdapter('gemini');
      expect(geminiAdapter).toBeInstanceOf(GeminiAdapter);

      const deepseekAdapter = createAdapter('deepseek');
      expect(deepseekAdapter).toBeInstanceOf(DeepSeekAdapter);

      const qwenAdapter = createAdapter('qwen');
      expect(qwenAdapter).toBeInstanceOf(QwenAdapter);

      const kimiAdapter = createAdapter('kimi');
      expect(kimiAdapter).toBeInstanceOf(KimiAdapter);
    });

    it('should throw error for unsupported provider', () => {
      expect(() => createAdapter('unsupported' as AIProvider)).toThrow(AIError);
    });
  });

  describe('createAdapters', () => {
    beforeEach(() => {
      // Mock successful API responses
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
    });

    it('should create multiple adapters from configs', async () => {
      const configs: ProviderConfig[] = [
        {
          provider: 'gemini',
          apiKey: 'test-key',
          enabled: true,
          priority: 1,
          models: [],
        },
        {
          provider: 'deepseek',
          apiKey: 'test-key',
          enabled: true,
          priority: 2,
          models: [],
        },
      ];

      const adapters = await createAdapters(configs);
      expect(adapters).toHaveLength(2);
      expect(adapters[0]).toBeInstanceOf(GeminiAdapter);
      expect(adapters[1]).toBeInstanceOf(DeepSeekAdapter);
    });

    it('should skip disabled providers', async () => {
      const configs: ProviderConfig[] = [
        {
          provider: 'gemini',
          apiKey: 'test-key',
          enabled: true,
          priority: 1,
          models: [],
        },
        {
          provider: 'deepseek',
          apiKey: 'test-key',
          enabled: false,
          priority: 2,
          models: [],
        },
      ];

      const adapters = await createAdapters(configs);
      expect(adapters).toHaveLength(1);
      expect(adapters[0]).toBeInstanceOf(GeminiAdapter);
    });

    it('should handle adapter initialization failures', async () => {
      // Mock failure for one adapter
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        })
        .mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        });

      const configs: ProviderConfig[] = [
        {
          provider: 'gemini',
          apiKey: 'bad-key',
          enabled: true,
          priority: 1,
          models: [],
        },
        {
          provider: 'deepseek',
          apiKey: 'good-key',
          enabled: true,
          priority: 2,
          models: [],
        },
      ];

      const adapters = await createAdapters(configs);
      expect(adapters).toHaveLength(1);
      expect(adapters[0]).toBeInstanceOf(DeepSeekAdapter);
    });
  });

  describe('getSupportedProviders', () => {
    it('should return all supported providers', () => {
      const providers = getSupportedProviders();
      expect(providers).toEqual(['gemini', 'deepseek', 'qwen', 'kimi']);
    });
  });

  describe('isProviderSupported', () => {
    it('should return true for supported providers', () => {
      expect(isProviderSupported('gemini')).toBe(true);
      expect(isProviderSupported('deepseek')).toBe(true);
      expect(isProviderSupported('qwen')).toBe(true);
      expect(isProviderSupported('kimi')).toBe(true);
    });

    it('should return false for unsupported providers', () => {
      expect(isProviderSupported('openai')).toBe(false);
      expect(isProviderSupported('claude')).toBe(false);
    });
  });

  describe('getProvidersWithCapabilities', () => {
    it('should return providers supporting streaming', () => {
      const providers = getProvidersWithCapabilities({ streaming: true });
      expect(providers).toEqual(['gemini', 'deepseek', 'qwen', 'kimi']);
    });

    it('should return providers supporting function calling', () => {
      const providers = getProvidersWithCapabilities({ functionCalling: true });
      expect(providers).toEqual(['gemini', 'deepseek', 'qwen', 'kimi']);
    });

    it('should return providers supporting images', () => {
      const providers = getProvidersWithCapabilities({ images: true });
      expect(providers).toEqual(['gemini', 'qwen']);
    });

    it('should return providers supporting documents', () => {
      const providers = getProvidersWithCapabilities({ documents: true });
      expect(providers).toEqual(['gemini', 'kimi']);
    });

    it('should return providers with minimum context tokens', () => {
      const providers = getProvidersWithCapabilities({ minContextTokens: 100000 });
      expect(providers).toEqual(['gemini', 'kimi']);
    });

    it('should return providers matching multiple requirements', () => {
      const providers = getProvidersWithCapabilities({
        images: true,
        streaming: true,
        minContextTokens: 100000,
      });
      expect(providers).toEqual(['gemini']);
    });
  });
});