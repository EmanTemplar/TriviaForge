/**
 * TriviaForge - Error Handler Middleware
 *
 * Centralized error handling for Express routes.
 * Catches all errors and formats them into standardized responses.
 */

import { AppError, isOperationalError, formatErrorResponse } from '../utils/errors.js';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';
import { env } from '../config/environment.js';

/**
 * Error handler middleware
 * Should be added AFTER all routes
 *
 * @param {Error} err - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 *
 * @example
 * // In server.js
 * app.use(errorHandler);
 */
export function errorHandler(err, req, res, next) {
  // Log error with context
  logError(err, req);

  // Handle known operational errors
  if (err instanceof AppError || isOperationalError(err)) {
    return res.status(err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(formatErrorResponse(err));
  }

  // Handle unexpected errors (programming errors)
  // Don't expose internal details in production
  if (env.isProduction) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {
        message: 'An unexpected error occurred',
        code: ERROR_CODES.INTERNAL_ERROR,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // In development, show full error details
  return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    error: {
      message: err.message,
      code: ERROR_CODES.INTERNAL_ERROR,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log error with request context
 *
 * @param {Error} err - Error object
 * @param {Object} req - Express request
 */
function logError(err, req) {
  const errorInfo = {
    message: err.message,
    code: err.code || ERROR_CODES.INTERNAL_ERROR,
    statusCode: err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString(),
  };

  // Include user context if available
  if (req.user) {
    errorInfo.user = {
      id: req.user.user_id,
      username: req.user.username,
      accountType: req.user.account_type,
    };
  }

  // Log based on error severity
  if (err.statusCode >= 500 || !err.statusCode) {
    // Server errors - log with stack trace
    console.error('[ERROR]', errorInfo);
    if (env.isDevelopment || env.isVerboseLogging) {
      console.error('[ERROR] Stack trace:', err.stack);
    }
  } else if (err.statusCode >= 400) {
    // Client errors - log at warn level
    console.warn('[WARN]', errorInfo);
  }

  // Log original error if it's a wrapped error (e.g., DatabaseError)
  if (err.originalError && env.isVerboseLogging) {
    console.error('[ERROR] Original error:', err.originalError);
  }
}

/**
 * Not Found handler (404)
 * Use this before the error handler for routes that don't exist
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 *
 * @example
 * // In server.js, after all routes
 * app.use(notFoundHandler);
 * app.use(errorHandler);
 */
export function notFoundHandler(req, res, next) {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: ERROR_CODES.NOT_FOUND,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Async route wrapper
 * Wraps async route handlers to catch promise rejections
 *
 * @param {Function} fn - Async route handler
 * @returns {Function} Wrapped handler
 *
 * @example
 * app.get('/api/quizzes', asyncHandler(async (req, res) => {
 *   const quizzes = await QuizService.getAll();
 *   res.json(success(quizzes));
 * }));
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation error formatter
 * Converts validation errors into standard format
 *
 * @param {Object} errors - Validation errors object
 * @returns {Object} Formatted error response
 */
export function formatValidationErrors(errors) {
  return {
    error: {
      message: 'Validation failed',
      code: ERROR_CODES.VALIDATION_ERROR,
      details: errors,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Handle uncaught exceptions
 * Log and gracefully shutdown
 */
export function handleUncaughtException(err) {
  console.error('[FATAL] Uncaught exception:', err);
  console.error('[FATAL] Stack trace:', err.stack);

  // Give time for logs to flush
  setTimeout(() => {
    process.exit(1);
  }, 1000);
}

/**
 * Handle unhandled promise rejections
 * Log and gracefully shutdown
 */
export function handleUnhandledRejection(reason, promise) {
  console.error('[FATAL] Unhandled promise rejection:', reason);
  console.error('[FATAL] Promise:', promise);

  // Give time for logs to flush
  setTimeout(() => {
    process.exit(1);
  }, 1000);
}

/**
 * Setup global error handlers
 * Call this during application initialization
 */
export function setupGlobalErrorHandlers() {
  process.on('uncaughtException', handleUncaughtException);
  process.on('unhandledRejection', handleUnhandledRejection);

  console.log('[ERROR HANDLER] Global error handlers registered');
}

// Export all handlers
export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  formatValidationErrors,
  setupGlobalErrorHandlers,
};
