/**
 * TriviaForge - Environment Configuration
 *
 * Centralized access to environment variables with validation and defaults.
 * Provides type-safe environment configuration.
 */

import { DEFAULTS, ENV_VARS } from './constants.js';

/**
 * Parse boolean environment variables
 * @param {string} value - Environment variable value
 * @param {boolean} defaultValue - Default value if not set
 * @returns {boolean}
 */
function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  return value === 'true' || value === '1';
}

/**
 * Parse integer environment variables
 * @param {string} value - Environment variable value
 * @param {number} defaultValue - Default value if not set
 * @returns {number}
 */
function parseInt Value(value, defaultValue = 0) {
  if (value === undefined || value === null) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Environment configuration object
 * All environment variables accessed through this object
 */
export const env = {
  // Node Environment
  nodeEnv: process.env[ENV_VARS.NODE_ENV] || 'production',
  isDevelopment: process.env[ENV_VARS.NODE_ENV] === 'development',
  isProduction: process.env[ENV_VARS.NODE_ENV] === 'production',
  isTest: process.env[ENV_VARS.NODE_ENV] === 'test',

  // Server Configuration
  port: parseIntValue(process.env[ENV_VARS.APP_PORT], 3000),
  serverUrl: process.env[ENV_VARS.SERVER_URL] || 'http://localhost:3000',
  hostIp: process.env[ENV_VARS.HOST_IP] || null,
  timezone: process.env[ENV_VARS.TZ] || 'America/New_York',

  // Database
  databaseUrl: process.env[ENV_VARS.DATABASE_URL] || 'postgres://trivia:trivia@db:5432/trivia',

  // Authentication
  adminPassword: process.env[ENV_VARS.ADMIN_PASSWORD] || 'changeme',
  csrfSecret: process.env[ENV_VARS.CSRF_SECRET] || 'default-csrf-secret-change-in-production',
  sessionTimeout: parseIntValue(process.env[ENV_VARS.SESSION_TIMEOUT], DEFAULTS.SESSION_TIMEOUT),

  // Debug & Logging
  debugMode: parseBoolean(process.env[ENV_VARS.DEBUG_MODE], false),
  verboseLogging: parseBoolean(process.env[ENV_VARS.VERBOSE_LOGGING], false),

  // Auto-computed
  isDebugMode: parseBoolean(process.env[ENV_VARS.DEBUG_MODE], false) ||
                process.env[ENV_VARS.NODE_ENV] === 'development',
  isVerboseLogging: parseBoolean(process.env[ENV_VARS.VERBOSE_LOGGING], false) ||
                     process.env[ENV_VARS.NODE_ENV] === 'development',
};

/**
 * Validate required environment variables
 * Call this during application startup
 *
 * @throws {Error} If required variables are missing
 */
export function validateEnvironment() {
  const warnings = [];
  const errors = [];

  // Check for default password in production
  if (env.isProduction && env.adminPassword === 'changeme') {
    warnings.push('ADMIN_PASSWORD is using default value. Please change it in production!');
  }

  // Check for default CSRF secret in production
  if (env.isProduction && env.csrfSecret === 'default-csrf-secret-change-in-production') {
    warnings.push('CSRF_SECRET is using default value. Please change it in production!');
  }

  // Check for missing database URL
  if (!env.databaseUrl) {
    errors.push('DATABASE_URL is required');
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn('[ENVIRONMENT] Configuration warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  // Throw errors
  if (errors.length > 0) {
    console.error('[ENVIRONMENT] Configuration errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Invalid environment configuration');
  }

  // Log environment info
  console.log('[ENVIRONMENT] Configuration loaded:', {
    nodeEnv: env.nodeEnv,
    port: env.port,
    debugMode: env.isDebugMode,
    verboseLogging: env.isVerboseLogging,
    database: env.databaseUrl.replace(/:[^:@]+@/, ':****@'), // Hide password
  });
}

/**
 * Get environment variable with fallback
 *
 * @param {string} key - Environment variable key
 * @param {any} defaultValue - Default value if not set
 * @returns {any} Environment variable value or default
 */
export function getEnv(key, defaultValue = null) {
  return process.env[key] || defaultValue;
}

/**
 * Check if running in Docker container
 * @returns {boolean}
 */
export function isDocker() {
  return process.env.DOCKER === 'true' ||
         process.env.HOSTNAME?.startsWith('triviaforge-') ||
         !!process.env.KUBERNETES_SERVICE_HOST;
}

/**
 * Get application info for logging/debugging
 * @returns {Object}
 */
export function getAppInfo() {
  return {
    name: 'TriviaForge',
    environment: env.nodeEnv,
    version: process.env.npm_package_version || 'unknown',
    nodeVersion: process.version,
    platform: process.platform,
    pid: process.pid,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };
}

// Export default object
export default {
  env,
  validateEnvironment,
  getEnv,
  isDocker,
  getAppInfo,
};
