/**
 * Jest Test Setup for AI Services
 * 
 * Global configuration and utilities for testing AI service components
 */

// Mock environment variables for testing
process.env.NODE_ENV = 'test';

// Mock AI provider configurations
process.env.AI_GEMINI_ENABLED = 'true';
process.env.AI_GEMINI_API_KEY = 'test-gemini-key';
process.env.AI_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com';
process.env.AI_GEMINI_TIMEOUT = '30000';
process.env.AI_GEMINI_RATE_LIMIT = '60';
process.env.AI_GEMINI_PRIORITY = '4';

process.env.AI_DEEPSEEK_ENABLED = 'true';
process.env.AI_DEEPSEEK_API_KEY = 'test-deepseek-key';
process.env.AI_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
process.env.AI_DEEPSEEK_TIMEOUT = '30000';
process.env.AI_DEEPSEEK_RATE_LIMIT = '60';
process.env.AI_DEEPSEEK_PRIORITY = '3';

process.env.AI_QWEN_ENABLED = 'true';
process.env.AI_QWEN_API_KEY = 'test-qwen-key';
process.env.AI_QWEN_BASE_URL = 'https://dashscope.aliyuncs.com';
process.env.AI_QWEN_TIMEOUT = '30000';
process.env.AI_QWEN_RATE_LIMIT = '60';
process.env.AI_QWEN_PRIORITY = '2';

process.env.AI_KIMI_ENABLED = 'true';
process.env.AI_KIMI_API_KEY = 'test-kimi-key';
process.env.AI_KIMI_BASE_URL = 'https://api.moonshot.cn';
process.env.AI_KIMI_TIMEOUT = '30000';
process.env.AI_KIMI_RATE_LIMIT = '60';
process.env.AI_KIMI_PRIORITY = '1';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Restore console for specific tests that need it
export const restoreConsole = () => {
  global.console = originalConsole;
};

// Helper to capture console output
export const captureConsole = () => {
  const logs: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  
  (console.log as jest.Mock).mockImplementation((...args) => {
    logs.push(args.map(arg => String(arg)).join(' '));
  });
  
  (console.warn as jest.Mock).mockImplementation((...args) => {
    warnings.push(args.map(arg => String(arg)).join(' '));
  });
  
  (console.error as jest.Mock).mockImplementation((...args) => {
    errors.push(args.map(arg => String(arg)).join(' '));
  });
  
  return { logs, warnings, errors };
};

// Clear all console mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Global teardown
afterAll(() => {
  global.console = originalConsole;
});