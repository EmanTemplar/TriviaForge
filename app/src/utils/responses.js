/**
 * TriviaForge - Response Utilities
 *
 * Standardized response formatting for API endpoints.
 * Ensures consistent structure across all responses.
 */

import { HTTP_STATUS } from '../config/constants.js';

/**
 * Create a standardized success response
 *
 * @param {any} data - Response payload
 * @param {string} message - Success message
 * @param {Object} meta - Optional metadata (pagination, etc.)
 * @returns {Object} Formatted success response
 *
 * @example
 * res.json(success(quizzes, 'Quizzes retrieved successfully'));
 * // Returns: { success: true, message: '...', data: [...], timestamp: '...' }
 */
export function success(data = null, message = 'Success', meta = {}) {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
  };

  // Only include data if provided
  if (data !== null && data !== undefined) {
    response.data = data;
  }

  // Include metadata if provided
  if (Object.keys(meta).length > 0) {
    response.meta = meta;
  }

  return response;
}

/**
 * Create a paginated response with metadata
 *
 * @param {Array} data - Array of items
 * @param {number} page - Current page number (1-indexed)
 * @param {number} pageSize - Items per page
 * @param {number} total - Total number of items
 * @param {string} message - Success message
 * @returns {Object} Formatted paginated response
 *
 * @example
 * res.json(paginated(quizzes, 1, 20, 43, 'Quizzes retrieved'));
 * // Returns: {
 * //   success: true,
 * //   message: '...',
 * //   data: [...],
 * //   meta: { pagination: { page: 1, pageSize: 20, total: 43, totalPages: 3 } }
 * // }
 */
export function paginated(data, page, pageSize, total, message = 'Success') {
  return success(data, message, {
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasNextPage: page < Math.ceil(total / pageSize),
      hasPreviousPage: page > 1,
    },
  });
}

/**
 * Create a response with no content (204)
 * Use for successful DELETE or UPDATE operations with no response body
 *
 * @returns {null} Empty response (Express will set 204 status)
 *
 * @example
 * res.status(204).send(noContent());
 */
export function noContent() {
  return null;
}

/**
 * Create a response for created resources (201)
 *
 * @param {Object} data - Created resource
 * @param {string} message - Success message
 * @param {string|null} location - Optional resource location URL
 * @returns {Object} Formatted created response
 *
 * @example
 * res.status(201).json(created(quiz, 'Quiz created', `/api/quizzes/${quiz.id}`));
 */
export function created(data, message = 'Resource created', location = null) {
  const response = success(data, message);

  if (location) {
    response.meta = { location };
  }

  return response;
}

/**
 * Send success response with proper status code
 * Helper function that combines res.json() with status code
 *
 * @param {Object} res - Express response object
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 *
 * @example
 * sendSuccess(res, quizzes, 'Quizzes retrieved', 200);
 */
export function sendSuccess(res, data, message = 'Success', statusCode = HTTP_STATUS.OK) {
  return res.status(statusCode).json(success(data, message));
}

/**
 * Send created response with 201 status
 *
 * @param {Object} res - Express response object
 * @param {Object} data - Created resource
 * @param {string} message - Success message
 * @param {string|null} location - Optional resource location
 *
 * @example
 * sendCreated(res, quiz, 'Quiz created successfully', `/api/quizzes/${quiz.id}`);
 */
export function sendCreated(res, data, message = 'Resource created', location = null) {
  const response = created(data, message, location);

  if (location) {
    res.setHeader('Location', location);
  }

  return res.status(HTTP_STATUS.CREATED).json(response);
}

/**
 * Send no content response with 204 status
 *
 * @param {Object} res - Express response object
 *
 * @example
 * sendNoContent(res); // Returns 204 with no body
 */
export function sendNoContent(res) {
  return res.status(HTTP_STATUS.NO_CONTENT).send();
}

/**
 * Send paginated response
 *
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {number} page - Current page
 * @param {number} pageSize - Items per page
 * @param {number} total - Total items
 * @param {string} message - Success message
 *
 * @example
 * sendPaginated(res, quizzes, 1, 20, 43, 'Quizzes retrieved');
 */
export function sendPaginated(res, data, page, pageSize, total, message = 'Success') {
  return res.status(HTTP_STATUS.OK).json(
    paginated(data, page, pageSize, total, message)
  );
}

/**
 * Create response for bulk operations
 *
 * @param {number} processed - Number of items processed
 * @param {number} succeeded - Number of successful operations
 * @param {number} failed - Number of failed operations
 * @param {Array} errors - Array of error messages for failed items
 * @param {string} message - Overall message
 * @returns {Object} Formatted bulk operation response
 *
 * @example
 * res.json(bulkOperation(10, 8, 2, ['Item 3 failed', 'Item 7 failed'], 'Bulk import completed'));
 */
export function bulkOperation(processed, succeeded, failed, errors = [], message = 'Bulk operation completed') {
  return success(null, message, {
    bulk: {
      processed,
      succeeded,
      failed,
      errors: failed > 0 ? errors : undefined,
    },
  });
}

/**
 * Create response for async operations (e.g., background jobs)
 *
 * @param {string} jobId - Job identifier
 * @param {string} status - Job status (pending, processing, completed, failed)
 * @param {string} message - Status message
 * @returns {Object} Formatted async operation response
 *
 * @example
 * res.status(202).json(asyncOperation('job-123', 'pending', 'Import started'));
 */
export function asyncOperation(jobId, status, message = 'Operation started') {
  return success(null, message, {
    job: {
      id: jobId,
      status,
    },
  });
}

// Export all functions
export default {
  success,
  paginated,
  noContent,
  created,
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendPaginated,
  bulkOperation,
  asyncOperation,
};
