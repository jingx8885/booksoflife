# AI Service Configuration Guide

This guide covers the complete configuration setup for the BooksOfLife multi-provider AI service infrastructure.

## Overview

The AI service supports multiple providers (Gemini, DeepSeek, Qwen, Kimi) with intelligent routing, automatic failover, load balancing, and comprehensive error handling.

## Environment Variables

### Global AI Service Settings

```bash
# Load Balancing Strategy
AI_LOAD_BALANCING_STRATEGY=priority  # priority|round-robin|random|least-latency

# Request Configuration
AI_DEFAULT_TIMEOUT=30000             # Default request timeout (ms)
AI_MAX_RETRIES=3                     # Maximum retry attempts
AI_RETRY_DELAY=1000                  # Base retry delay (ms)

# Circuit Breaker Configuration
AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD=5      # Failures before opening circuit
AI_CIRCUIT_BREAKER_RECOVERY_TIMEOUT=60000   # Recovery timeout (ms)
AI_CIRCUIT_BREAKER_TIMEOUT=30000            # Request timeout (ms)
AI_CIRCUIT_BREAKER_MONITORING_PERIOD=300000 # Monitoring window (ms)

# Cache Configuration
AI_CACHE_ENABLED=true                # Enable response caching
AI_CACHE_TTL=300000                  # Cache TTL (ms) - 5 minutes
AI_CACHE_MAX_SIZE=1000               # Maximum cached responses
```

### Provider-Specific Settings

Each provider follows the pattern: `AI_{PROVIDER}_{SETTING}`

#### Gemini (Google AI)

```bash
AI_GEMINI_ENABLED=true
AI_GEMINI_API_KEY=your_gemini_api_key
AI_GEMINI_BASE_URL=https://generativelanguage.googleapis.com
AI_GEMINI_TIMEOUT=30000
AI_GEMINI_RATE_LIMIT=60              # Requests per minute
AI_GEMINI_PRIORITY=4                 # Higher = preferred (1-10)
```

**Getting Gemini API Key:**
1. Go to [Google AI Studio](https://makersuite.google.com/)
2. Create a new API key
3. Set usage quotas and billing if needed

#### DeepSeek

```bash
AI_DEEPSEEK_ENABLED=true
AI_DEEPSEEK_API_KEY=your_deepseek_api_key
AI_DEEPSEEK_BASE_URL=https://api.deepseek.com
AI_DEEPSEEK_TIMEOUT=30000
AI_DEEPSEEK_RATE_LIMIT=60
AI_DEEPSEEK_PRIORITY=3
```

**Getting DeepSeek API Key:**
1. Visit [DeepSeek Platform](https://platform.deepseek.com/)
2. Sign up and verify your account
3. Generate API key in dashboard

#### Qwen (Alibaba Cloud)

```bash
AI_QWEN_ENABLED=true
AI_QWEN_API_KEY=your_qwen_api_key
AI_QWEN_BASE_URL=https://dashscope.aliyuncs.com
AI_QWEN_TIMEOUT=30000
AI_QWEN_RATE_LIMIT=60
AI_QWEN_PRIORITY=2
```

**Getting Qwen API Key:**
1. Go to [Alibaba Cloud DashScope](https://dashscope.aliyun.com/)
2. Create account and complete verification
3. Generate API key in console

#### Kimi (Moonshot AI)

```bash
AI_KIMI_ENABLED=true
AI_KIMI_API_KEY=your_kimi_api_key
AI_KIMI_BASE_URL=https://api.moonshot.cn
AI_KIMI_TIMEOUT=30000
AI_KIMI_RATE_LIMIT=60
AI_KIMI_PRIORITY=1
```

**Getting Kimi API Key:**
1. Visit [Moonshot AI Platform](https://platform.moonshot.cn/)
2. Register and verify account
3. Create API key in settings

## Provider Capabilities

### Gemini
- **Context Window:** Up to 2M tokens (1.5-pro)
- **Streaming:** ✅ Yes
- **Function Calling:** ✅ Yes
- **Images:** ✅ Yes
- **Documents:** ✅ Yes
- **Cost:** Medium ($3.50-10.50 per 1M tokens)
- **Best For:** General purpose, multimodal tasks

### DeepSeek
- **Context Window:** 32K tokens
- **Streaming:** ✅ Yes
- **Function Calling:** ✅ Yes
- **Images:** ❌ No
- **Documents:** ❌ No
- **Cost:** Low ($0.14-0.28 per 1M tokens)
- **Best For:** Code generation, cost-efficient tasks

### Qwen
- **Context Window:** 32K tokens
- **Streaming:** ✅ Yes
- **Function Calling:** ✅ Yes
- **Images:** ✅ Yes
- **Documents:** ❌ No
- **Cost:** Medium
- **Best For:** Chinese language, balanced features

### Kimi
- **Context Window:** Up to 128K tokens
- **Streaming:** ✅ Yes
- **Function Calling:** ✅ Yes
- **Images:** ❌ No
- **Documents:** ✅ Yes
- **Cost:** Medium
- **Best For:** Long documents, large context

## Configuration Strategies

### Development Environment

```bash
# Minimal setup with one provider
AI_GEMINI_ENABLED=true
AI_GEMINI_API_KEY=your_key
AI_LOAD_BALANCING_STRATEGY=priority
AI_CACHE_ENABLED=false
AI_DEFAULT_TIMEOUT=10000
```

### Production Environment

```bash
# Multi-provider setup with failover
AI_GEMINI_ENABLED=true
AI_GEMINI_API_KEY=your_gemini_key
AI_GEMINI_PRIORITY=4

AI_DEEPSEEK_ENABLED=true
AI_DEEPSEEK_API_KEY=your_deepseek_key
AI_DEEPSEEK_PRIORITY=3

AI_QWEN_ENABLED=true
AI_QWEN_API_KEY=your_qwen_key
AI_QWEN_PRIORITY=2

AI_KIMI_ENABLED=true
AI_KIMI_API_KEY=your_kimi_key
AI_KIMI_PRIORITY=1

# Production settings
AI_LOAD_BALANCING_STRATEGY=priority
AI_CACHE_ENABLED=true
AI_CACHE_TTL=600000              # 10 minutes
AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD=3
AI_MAX_RETRIES=2
```

### Cost-Optimized Setup

```bash
# Prioritize cost-effective providers
AI_DEEPSEEK_ENABLED=true
AI_DEEPSEEK_API_KEY=your_deepseek_key
AI_DEEPSEEK_PRIORITY=4          # Highest priority

AI_QWEN_ENABLED=true
AI_QWEN_API_KEY=your_qwen_key
AI_QWEN_PRIORITY=3

AI_GEMINI_ENABLED=true          # Fallback for advanced features
AI_GEMINI_API_KEY=your_gemini_key
AI_GEMINI_PRIORITY=2

AI_LOAD_BALANCING_STRATEGY=priority
AI_CACHE_ENABLED=true
AI_CACHE_TTL=1800000            # 30 minutes - longer caching
```

### High-Performance Setup

```bash
# Optimize for speed and reliability
AI_GEMINI_ENABLED=true
AI_GEMINI_API_KEY=your_gemini_key
AI_GEMINI_PRIORITY=4
AI_GEMINI_TIMEOUT=15000         # Shorter timeout

AI_DEEPSEEK_ENABLED=true
AI_DEEPSEEK_API_KEY=your_deepseek_key
AI_DEEPSEEK_PRIORITY=3
AI_DEEPSEEK_TIMEOUT=10000

AI_LOAD_BALANCING_STRATEGY=least-latency
AI_CACHE_ENABLED=true
AI_CACHE_MAX_SIZE=5000          # Larger cache
AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD=2  # Quick failover
AI_CIRCUIT_BREAKER_RECOVERY_TIMEOUT=30000  # Faster recovery
```

## Load Balancing Strategies

### Priority Strategy (Default)
Always uses the highest priority available provider.

```bash
AI_LOAD_BALANCING_STRATEGY=priority
```

**Use Cases:**
- Development environments
- Cost optimization
- Quality preference

### Round Robin Strategy
Distributes requests evenly across all available providers.

```bash
AI_LOAD_BALANCING_STRATEGY=round-robin
```

**Use Cases:**
- High-volume applications
- Load distribution
- Rate limit avoidance

### Random Strategy
Randomly selects from available providers.

```bash
AI_LOAD_BALANCING_STRATEGY=random
```

**Use Cases:**
- Simple load distribution
- Testing scenarios
- Unpredictable traffic patterns

### Least Latency Strategy
Selects the provider with the best recent performance.

```bash
AI_LOAD_BALANCING_STRATEGY=least-latency
```

**Use Cases:**
- Performance-critical applications
- Real-time features
- User experience optimization

## Circuit Breaker Configuration

The circuit breaker prevents cascading failures by temporarily disabling failed providers.

### States

1. **Closed** - Normal operation, requests pass through
2. **Open** - Provider disabled, requests bypass to alternatives
3. **Half-Open** - Testing recovery, limited requests allowed

### Configuration Parameters

```bash
# Number of failures before opening circuit
AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD=5

# Time before attempting recovery (ms)
AI_CIRCUIT_BREAKER_RECOVERY_TIMEOUT=60000

# Request timeout (ms)
AI_CIRCUIT_BREAKER_TIMEOUT=30000

# Monitoring window for failure counting (ms)
AI_CIRCUIT_BREAKER_MONITORING_PERIOD=300000
```

### Tuning Guidelines

- **Low Threshold (2-3):** Quick failover, may be too sensitive
- **Medium Threshold (5-7):** Balanced approach, recommended
- **High Threshold (10+):** Tolerates more failures, slower failover

## Cache Configuration

Response caching improves performance and reduces API costs.

### Settings

```bash
AI_CACHE_ENABLED=true           # Enable/disable caching
AI_CACHE_TTL=300000            # Cache lifetime (5 minutes)
AI_CACHE_MAX_SIZE=1000         # Maximum cached responses
```

### Cache Key Generation

Cache keys are based on:
- Request messages
- Model name
- Temperature setting
- Top-p setting
- Max tokens
- System prompt

### Cache Invalidation

- **TTL Expiration:** Automatic after configured time
- **Size Limit:** LRU eviction when cache is full
- **Manual Clear:** Programmatic cache clearing

## Error Handling

### Retry Configuration

```bash
AI_MAX_RETRIES=3               # Maximum retry attempts
AI_RETRY_DELAY=1000           # Base delay between retries (ms)
```

The system uses exponential backoff: `delay * (2 ^ attempt)`

### Error Classifications

- **Retryable Errors:** Network, timeout, rate limit
- **Non-Retryable Errors:** Authentication, authorization, invalid input
- **Provider-Specific Errors:** Mapped to standard error types

## Monitoring and Health Checks

### Health Check Endpoints

The service provides health status for monitoring:

```typescript
// Get overall health
const health = await aiService.getHealthStatus();

// Get detailed statistics
const stats = await aiService.getStatistics();
```

### Key Metrics

- **Request Count:** Total and per-provider
- **Success Rate:** Percentage of successful requests
- **Average Latency:** Response time metrics
- **Cache Hit Rate:** Cache effectiveness
- **Circuit Breaker Status:** Provider availability

## Security Considerations

### API Key Management

- Store API keys as environment variables
- Use different keys for different environments
- Rotate keys regularly
- Monitor usage and set quotas

### Network Security

- Use HTTPS for all provider connections
- Implement request timeout limits
- Consider IP whitelisting where supported
- Monitor for unusual traffic patterns

### Data Privacy

- Review provider data retention policies
- Consider data locality requirements
- Implement request logging controls
- Use content filtering where appropriate

## Troubleshooting

### Common Issues

#### No Providers Available

```
Error: No AI providers configured
```

**Solution:** Enable at least one provider with valid API key.

#### Authentication Failures

```
AuthenticationError: API key validation failed
```

**Solutions:**
- Verify API key is correct
- Check key permissions and quotas
- Ensure provider account is active

#### Rate Limiting

```
RateLimitError: Rate limit exceeded
```

**Solutions:**
- Enable multiple providers for failover
- Adjust rate limits in configuration
- Implement request queuing
- Consider upgrading API plans

#### Circuit Breaker Issues

```
Circuit breaker is open for provider
```

**Solutions:**
- Check provider status
- Wait for recovery timeout
- Manually reset circuit breaker
- Review failure threshold settings

#### Cache Problems

```
High cache miss rate
```

**Solutions:**
- Review cache TTL settings
- Increase cache size
- Check request patterns for similarity
- Monitor cache eviction patterns

### Debug Configuration

For development and debugging:

```bash
# Enable detailed logging
NODE_ENV=development
DEBUG=ai:*

# Disable caching for testing
AI_CACHE_ENABLED=false

# Lower timeouts for faster testing
AI_DEFAULT_TIMEOUT=10000
AI_CIRCUIT_BREAKER_RECOVERY_TIMEOUT=5000

# Single provider for simpler debugging
AI_GEMINI_ENABLED=true
AI_DEEPSEEK_ENABLED=false
AI_QWEN_ENABLED=false
AI_KIMI_ENABLED=false
```

## Best Practices

### Configuration Management

1. **Use Environment Files:** Separate configs for dev, staging, production
2. **Validate on Startup:** Check required environment variables
3. **Document Dependencies:** List required API keys and services
4. **Version Control:** Keep configuration templates in version control

### Provider Selection

1. **Start Simple:** Begin with one reliable provider
2. **Add Gradually:** Introduce additional providers incrementally
3. **Monitor Performance:** Track latency and success rates
4. **Cost Awareness:** Monitor usage and costs across providers

### Error Handling

1. **Graceful Degradation:** Always have fallback options
2. **User Communication:** Provide meaningful error messages
3. **Logging Strategy:** Log errors with sufficient context
4. **Recovery Planning:** Document recovery procedures

### Testing

1. **Mock Providers:** Use mocks for development and testing
2. **Integration Tests:** Test failover and recovery scenarios
3. **Load Testing:** Verify performance under load
4. **Cost Testing:** Monitor costs during testing

This configuration guide provides the foundation for setting up and optimizing the BooksOfLife AI service infrastructure. Adjust settings based on your specific requirements, traffic patterns, and cost constraints.