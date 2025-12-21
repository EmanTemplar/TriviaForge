/**
 * TriviaForge - Custom Error Classes
 *
 * Standardized error handling with proper HTTP status codes and error codes.
 * All errors extend AppError for consistent structure.
 */

import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';

/**
 * Base Application Error
 * All custom errors should extend this class
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Machine-readable error code
   * @param {Object|null} details - Additional error context
   */
  constructor(
    message,
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code = ERROR_CODES.INTERNAL_ERROR,
    details = null
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true; // Operational vs programming errors

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.code,
        details: this.details,
        timestamp: this.timestamp,
      },
    };
  }
}

/**
 * Validation Error (422 Unprocessable Entity)
 * Used for input validation failures
 */
export class ValidationError extends AppError {
  /**
   * @param {string} message - Validation error message
   * @param {Object|Array} details - Field-specific validation errors
   *
   * @example
   * throw new ValidationError('Validation failed', {
   *   username: 'Username must be 3-50 characters',
   *   password: 'Password must be at least 6 characters'
   * });
   */
  constructor(message = 'Validation failed', details = null) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, ERROR_CODES.VALIDATION_ERROR, details);
  }
}

/**
 * Not Found Error (404)
 * Used when a resource doesn't exist
 */
export class NotFoundError extends AppError {
  /**
   * @param {string} resource - Name of the resource that wasn't found
   *
   * @example
   * throw new NotFoundError('Quiz');
   * // Returns: "Quiz not found"
   */
  constructor(resource = 'Resource') {
    super(
      `${resource} not found`,
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.NOT_FOUND
    );
  }
}

/**
 * Unauthorized Error (401)
 * Used for authentication failures
 */
export class UnauthorizedError extends AppError {
  /**
   * @param {string} message - Authentication error message
   *
   * @example
   * throw new UnauthorizedError('Invalid or expired session');
   */
  constructor(message = 'Authentication required') {
    super(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED);
  }
}

/**
 * Forbidden Error (403)
 * Used for authorization failures (authenticated but lacking permissions)
 */
export class ForbiddenError extends AppError {
  /**
   * @param {string} message - Authorization error message
   *
   * @example
   * throw new ForbiddenError('Admin access required');
   */
  constructor(message = 'Access forbidden') {
    super(message, HTTP_STATUS.FORBIDDEN, ERROR_CODES.ADMIN_ACCESS_REQUIRED);
  }
}

/**
 * Conflict Error (409)
 * Used when a resource already exists or conflicts with current state
 */
export class ConflictError extends AppError {
  /**
   * @param {string} message - Conflict description
   * @param {string} code - Specific conflict code
   *
   * @example
   * throw new ConflictError('Room already exists', ERROR_CODES.ROOM_ALREADY_EXISTS);
   */
  constructor(message, code = ERROR_CODES.ROOM_ALREADY_EXISTS) {
    super(message, HTTP_STATUS.CONFLICT, code);
  }
}

/**
 * Bad Request Error (400)
 * Used for malformed requests or invalid input
 */
export class BadRequestError extends AppError {
  /**
   * @param {string} message - Description of what's wrong with the request
   *
   * @example
   * throw new BadRequestError('Room code is required');
   */
  constructor(message = 'Bad request') {
    super(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }
}

/**
 * Database Error (500)
 * Used for database operation failures
 */
export class DatabaseError extends AppError {
  /**
   * @param {string} message - Database error description
   * @param {Error|null} originalError - Original database error for logging
   *
   * @example
   * throw new DatabaseError('Failed to save session', err);
   */
  constructor(message = 'Database operation failed', originalError = null) {
    super(
      message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.DATABASE_ERROR,
      originalError ? { original: originalError.message } : null
    );

    if (originalError) {
      this.originalError = originalError;
    }
  }
}

/**
 * Room Error (404 or 400)
 * Used for room-related errors
 */
export class RoomError extends AppError {
  /**
   * @param {string} message - Room error message
   * @param {string} code - Specific room error code
   *
   * @example
   * throw new RoomError('Room not found', ERROR_CODES.ROOM_NOT_FOUND);
   * throw new RoomError('Answer already locked', ERROR_CODES.ANSWER_LOCKED);
   */
  constructor(message, code = ERROR_CODES.ROOM_NOT_FOUND) {
    const statusCode = code === ERROR_CODES.ROOM_NOT_FOUND
      ? HTTP_STATUS.NOT_FOUND
      : HTTP_STATUS.BAD_REQUEST;

    super(message, statusCode, code);
  }
}

/**
 * User Error (404 or 409)
 * Used for user-related errors
 */
export class UserError extends AppError {
  /**
   * @param {string} message - User error message
   * @param {string} code - Specific user error code
   *
   * @example
   * throw new UserError('Username already taken', ERROR_CODES.USERNAME_TAKEN);
   * throw new UserError('Display name is banned', ERROR_CODES.DISPLAY_NAME_BANNED);
   */
  constructor(message, code = ERROR_CODES.USER_NOT_FOUND) {
    const statusCode = code === ERROR_CODES.USER_NOT_FOUND
      ? HTTP_STATUS.NOT_FOUND
      : HTTP_STATUS.CONFLICT;

    super(message, statusCode, code);
  }
}

/**
 * Session Expired Error (401)
 * Used when user session has expired
 */
export class SessionExpiredError extends UnauthorizedError {
  constructor() {
    super('Your session has expired. Please log in again.');
    this.code = ERROR_CODES.SESSION_EXPIRED;
  }
}

/**
 * Password Reset Required Error (428 Precondition Required)
 * Used when admin has reset a user's password
 */
export class PasswordResetRequiredError extends AppError {
  constructor() {
    super(
      'Password reset required',
      HTTP_STATUS.PRECONDITION_REQUIRED,
      ERROR_CODES.PASSWORD_RESET_REQUIRED
    );
  }
}

/**
 * Utility: Check if error is operational (expected) or programming error
 * @param {Error} error - The error to check
 * @returns {boolean} True if error is operational
 */
export function isOperationalError(error) {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Utility: Extract user-friendly message from any error
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
export function getErrorMessage(error) {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  if (error.message) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Utility: Create error response object for HTTP responses
 * @param {Error} error - The error object
 * @returns {Object} Standardized error response
 */
export function formatErrorResponse(error) {
  if (error instanceof AppError) {
    return error.toJSON();
  }

  // Unknown error - return generic response
  return {
    error: {
      message: 'An unexpected error occurred',
      code: ERROR_CODES.INTERNAL_ERROR,
      timestamp: new Date().toISOString(),
    },
  };
}

// Export all error classes
export default {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
  DatabaseError,
  RoomError,
  UserError,
  SessionExpiredError,
  PasswordResetRequiredError,
  isOperationalError,
  getErrorMessage,
  formatErrorResponse,
};
