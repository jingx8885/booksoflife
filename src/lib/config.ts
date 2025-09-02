/**
 * Centralized Configuration Management for BooksOfLife
 * 
 * This module provides centralized access to configuration settings
 * across the entire application, including AI services, database,
 * authentication, and other core services.
 */

import { loadAIServiceConfig } from '@/services/ai/config';

// Re-export AI service configuration
export {
  loadAIServiceConfig,
  validateAIServiceConfig,
  getAIServiceConfig,
  DEFAULT_AI_SERVICE_CONFIG,
} from '@/services/ai/config';

// Re-export AI types for easy access
export type {
  AIServiceConfig,
  ProviderConfig,
  AIProvider,
  LoadBalancingStrategy,
  CircuitBreakerConfig,
  CacheConfig,
} from '@/types/ai';

/**
 * Application environment configuration
 */
export interface AppConfig {
  /** Environment (development, production, test) */
  environment: string;
  /** Application URL */
  appUrl: string;
  /** API base URL */
  apiUrl: string;
  /** Database URL */
  databaseUrl: string;
  /** Redis URL (if available) */
  redisUrl?: string;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  /** NextAuth secret */
  secret: string;
  /** Google OAuth client ID */
  googleClientId?: string;
  /** Google OAuth client secret */
  googleClientSecret?: string;
  /** GitHub OAuth client ID */
  githubClientId?: string;
  /** GitHub OAuth client secret */
  githubClientSecret?: string;
  /** Session max age in seconds */
  sessionMaxAge: number;
}

/**
 * Payment configuration
 */
export interface PaymentConfig {
  /** Stripe publishable key */
  stripePublishableKey?: string;
  /** Stripe secret key */
  stripeSecretKey?: string;
  /** Stripe webhook secret */
  stripeWebhookSecret?: string;
  /** Creem configuration */
  creem?: {
    enabled: boolean;
    apiKey?: string;
    webhookSecret?: string;
  };
}

/**
 * Load application configuration
 */
export function loadAppConfig(): AppConfig {
  return {
    environment: process.env.NODE_ENV || 'development',
    appUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    apiUrl: process.env.API_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000',
    databaseUrl: process.env.DATABASE_URL || '',
    redisUrl: process.env.REDIS_URL,
  };
}

/**
 * Load authentication configuration
 */
export function loadAuthConfig(): AuthConfig {
  return {
    secret: process.env.NEXTAUTH_SECRET || 'development-secret-key',
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    githubClientId: process.env.GITHUB_CLIENT_ID,
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
    sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '2592000'), // 30 days
  };
}

/**
 * Load payment configuration
 */
export function loadPaymentConfig(): PaymentConfig {
  return {
    stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    creem: {
      enabled: process.env.CREEM_ENABLED === 'true',
      apiKey: process.env.CREEM_API_KEY,
      webhookSecret: process.env.CREEM_WEBHOOK_SECRET,
    },
  };
}

/**
 * Validate required environment variables
 */
export function validateEnvironment(): void {
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Get all configuration
 */
export function getAllConfig() {
  return {
    app: loadAppConfig(),
    auth: loadAuthConfig(),
    payment: loadPaymentConfig(),
    ai: loadAIServiceConfig(),
  };
}

/**
 * Configuration validation and initialization
 */
export function initializeConfig() {
  // Validate required environment variables
  validateEnvironment();
  
  // Validate AI service configuration
  const aiConfig = loadAIServiceConfig();
  
  if (aiConfig.providers.length === 0) {
    console.warn('No AI providers configured. AI features will be disabled.');
  } else {
    console.log(`AI service configured with ${aiConfig.providers.length} providers: ${aiConfig.providers.map(p => p.provider).join(', ')}`);
  }
  
  return getAllConfig();
}