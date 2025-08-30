# AI Service Testing Documentation

This directory contains comprehensive tests for the BooksOfLife AI Service Infrastructure, covering unit tests, integration tests, and end-to-end scenarios.

## Test Structure

### Unit Tests

- **`base.test.ts`** - Tests for core AI adapter classes and utilities
  - BaseAIAdapter abstract class functionality
  - CircuitBreaker pattern implementation
  - AICache caching mechanisms
  - LoadBalancer strategies
  - AIUtils helper functions

- **`providers.test.ts`** - Tests for individual AI provider adapters
  - Gemini adapter implementation
  - DeepSeek adapter implementation  
  - Qwen adapter implementation
  - Kimi adapter implementation
  - Provider factory functions

- **`orchestration.test.ts`** - Tests for orchestration components
  - AIRouter request routing logic
  - AIOrchestrator service coordination
  - Load balancing strategies
  - Provider selection algorithms

### Integration Tests

- **`integration.test.ts`** - Complex end-to-end scenarios
  - Multi-provider failover chains
  - Circuit breaker recovery patterns
  - Load balancing under varying conditions
  - Rate limiting and retry mechanisms
  - Caching behavior across providers
  - Streaming with provider switching

## Running Tests

### Prerequisites

Install testing dependencies:

```bash
pnpm add -D jest @types/jest jest-environment-node ts-jest @testing-library/jest-dom
```

### Running All Tests

```bash
# Run all AI service tests
pnpm test src/services/ai

# Run with coverage
pnpm test src/services/ai --coverage

# Run in watch mode
pnpm test src/services/ai --watch
```

### Running Specific Test Suites

```bash
# Unit tests only
pnpm test base.test.ts
pnpm test providers.test.ts
pnpm test orchestration.test.ts

# Integration tests only
pnpm test integration.test.ts
```

## Test Configuration

### Environment Variables

Tests use mocked environment variables defined in `setup.ts`:

```bash
# Provider configurations for testing
AI_GEMINI_ENABLED=true
AI_GEMINI_API_KEY=test-gemini-key
AI_DEEPSEEK_ENABLED=true  
AI_DEEPSEEK_API_KEY=test-deepseek-key
AI_QWEN_ENABLED=true
AI_QWEN_API_KEY=test-qwen-key
AI_KIMI_ENABLED=true
AI_KIMI_API_KEY=test-kimi-key
```

### Jest Configuration

Key settings in `jest.config.js`:

- `testEnvironment: 'node'` - Node.js environment for backend testing
- `maxWorkers: 1` - Serial execution to avoid API conflicts
- `testTimeout: 30000` - Extended timeout for integration tests
- `setupFilesAfterEnv` - Global test setup and mocking

## Mock Implementations

### MockAIAdapter

Basic mock for unit tests:
- Configurable health status
- Mock model responses
- Failure simulation
- Rate limiting simulation

### IntegrationMockAdapter  

Enhanced mock for integration tests:
- Failure pattern configuration
- Latency simulation  
- Rate limiting behaviors
- Request counting and statistics

## Test Scenarios

### Failover Testing

- **Single Provider Failure** - Primary provider fails, system fails over to backup
- **Cascading Failures** - Multiple providers fail in sequence
- **Complete System Failure** - All providers unavailable
- **Provider Recovery** - Failed providers come back online

### Circuit Breaker Testing

- **Threshold Triggering** - Circuit opens after failure threshold
- **Recovery Timing** - Circuit closes after recovery timeout
- **Half-Open State** - Testing recovery attempts
- **Manual Reset** - Administrative circuit breaker control

### Load Balancing Testing

- **Priority Strategy** - Highest priority provider always selected
- **Round Robin** - Even distribution across providers
- **Random Selection** - Statistical distribution verification
- **Least Latency** - Performance-based selection (if implemented)

### Rate Limiting Testing

- **Provider Limits** - Individual provider rate limiting
- **Retry Logic** - Exponential backoff on rate limits
- **Failover on Limits** - Switch providers when rate limited
- **Recovery Behavior** - Resume using provider after limit reset

### Caching Testing

- **Cache Hits** - Identical requests return cached responses
- **Cache Misses** - Different requests hit providers
- **TTL Expiration** - Cached responses expire correctly
- **Cache Invalidation** - Failed requests don't get cached

### Streaming Testing

- **Stream Continuity** - Streaming responses maintain order
- **Stream Failover** - Failover during streaming requests
- **Stream Errors** - Error handling in streaming mode
- **Stream Performance** - Latency and throughput testing

## Performance Benchmarks

### Expected Performance

- **Request Latency** - < 2s for typical requests
- **Failover Time** - < 500ms to switch providers
- **Circuit Recovery** - < 5s for circuit breaker recovery
- **Cache Performance** - < 10ms for cache hits

### Load Testing

Integration tests include scenarios with:
- 10+ concurrent requests
- Mixed success/failure patterns
- Varying response latencies
- Multiple provider switching

## Debugging Tests

### Console Output

Tests mock console methods by default. Use `restoreConsole()` for debugging:

```typescript
import { restoreConsole } from './setup';

describe('Debug Test', () => {
  beforeAll(restoreConsole);
  
  it('should log debug info', async () => {
    console.log('This will be visible');
    // ... test code
  });
});
```

### Test Data Inspection

Use `captureConsole()` to inspect logged data:

```typescript
import { captureConsole } from './setup';

it('should log specific messages', async () => {
  const { logs, warnings, errors } = captureConsole();
  
  // ... run test code
  
  expect(logs).toContain('Expected log message');
  expect(errors).toHaveLength(0);
});
```

## Coverage Targets

- **Unit Tests** - 90%+ code coverage
- **Integration Tests** - 80%+ scenario coverage
- **Critical Paths** - 100% coverage (failover, circuit breaker)

## Continuous Integration

Tests are designed to run in CI environments:

- No external API dependencies (fully mocked)
- Deterministic timing (configurable delays)
- Clean setup/teardown (no shared state)
- Comprehensive error reporting

## Troubleshooting

### Common Issues

1. **Timeout Errors** - Increase jest timeout in individual tests
2. **Mock State** - Ensure proper beforeEach/afterEach cleanup
3. **Async Issues** - Use proper async/await patterns
4. **Timer Issues** - Use jest.useFakeTimers() for time-dependent tests

### Mock API Responses

Tests include realistic mock responses for each provider:

- **Gemini** - Google AI API response format
- **DeepSeek** - OpenAI-compatible response format
- **Qwen** - Alibaba Cloud response format  
- **Kimi** - Moonshot AI response format

This ensures tests reflect real API interactions while remaining fully isolated.