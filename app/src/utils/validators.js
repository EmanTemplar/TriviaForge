/**
 * TriviaForge - Validation Utilities
 *
 * Centralized validation logic for consistent validation across frontend and backend.
 * All validation functions return { valid: boolean, error?: string } format.
 */

import { VALIDATION_RULES, ERROR_CODES } from '../config/constants.js';
import { ValidationError } from './errors.js';

/**
 * Validation result type
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string} [error] - Error message if validation failed
 */

/**
 * Validate username
 *
 * @param {string} username - Username to validate
 * @returns {ValidationResult}
 *
 * @example
 * const result = validateUsername('john_doe123');
 * if (!result.valid) console.error(result.error);
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }

  const trimmed = username.trim();

  if (trimmed.length < VALIDATION_RULES.USERNAME.MIN_LENGTH) {
    return {
      valid: false,
      error: `Username must be at least ${VALIDATION_RULES.USERNAME.MIN_LENGTH} characters`,
    };
  }

  if (trimmed.length > VALIDATION_RULES.USERNAME.MAX_LENGTH) {
    return {
      valid: false,
      error: `Username must not exceed ${VALIDATION_RULES.USERNAME.MAX_LENGTH} characters`,
    };
  }

  if (!VALIDATION_RULES.USERNAME.PATTERN.test(trimmed)) {
    return {
      valid: false,
      error: 'Username can only contain letters, numbers, and underscores',
    };
  }

  return { valid: true };
}

/**
 * Validate password
 *
 * @param {string} password - Password to validate
 * @returns {ValidationResult}
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < VALIDATION_RULES.PASSWORD.MIN_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${VALIDATION_RULES.PASSWORD.MIN_LENGTH} characters`,
    };
  }

  if (password.length > VALIDATION_RULES.PASSWORD.MAX_LENGTH) {
    return {
      valid: false,
      error: `Password must not exceed ${VALIDATION_RULES.PASSWORD.MAX_LENGTH} characters`,
    };
  }

  return { valid: true };
}

/**
 * Validate email address
 *
 * @param {string} email - Email to validate
 * @returns {ValidationResult}
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const trimmed = email.trim();

  if (!VALIDATION_RULES.EMAIL.PATTERN.test(trimmed)) {
    return {
      valid: false,
      error: 'Invalid email format',
    };
  }

  return { valid: true };
}

/**
 * Validate display name
 *
 * @param {string} displayName - Display name to validate
 * @returns {ValidationResult}
 */
export function validateDisplayName(displayName) {
  if (!displayName || typeof displayName !== 'string') {
    return { valid: false, error: 'Display name is required' };
  }

  const trimmed = displayName.trim();

  if (trimmed.length < VALIDATION_RULES.DISPLAY_NAME.MIN_LENGTH) {
    return {
      valid: false,
      error: `Display name must be at least ${VALIDATION_RULES.DISPLAY_NAME.MIN_LENGTH} character`,
    };
  }

  if (trimmed.length > VALIDATION_RULES.DISPLAY_NAME.MAX_LENGTH) {
    return {
      valid: false,
      error: `Display name must not exceed ${VALIDATION_RULES.DISPLAY_NAME.MAX_LENGTH} characters`,
    };
  }

  return { valid: true };
}

/**
 * Validate room code
 *
 * @param {string} roomCode - Room code to validate
 * @returns {ValidationResult}
 */
export function validateRoomCode(roomCode) {
  if (!roomCode || typeof roomCode !== 'string') {
    return { valid: false, error: 'Room code is required' };
  }

  if (roomCode.length !== VALIDATION_RULES.ROOM_CODE.LENGTH) {
    return {
      valid: false,
      error: `Room code must be exactly ${VALIDATION_RULES.ROOM_CODE.LENGTH} digits`,
    };
  }

  if (!VALIDATION_RULES.ROOM_CODE.PATTERN.test(roomCode)) {
    return {
      valid: false,
      error: 'Room code must contain only digits',
    };
  }

  return { valid: true };
}

/**
 * Validate quiz title
 *
 * @param {string} title - Quiz title to validate
 * @returns {ValidationResult}
 */
export function validateQuizTitle(title) {
  if (!title || typeof title !== 'string') {
    return { valid: false, error: 'Quiz title is required' };
  }

  const trimmed = title.trim();

  if (trimmed.length < VALIDATION_RULES.QUIZ_TITLE.MIN_LENGTH) {
    return {
      valid: false,
      error: `Quiz title must be at least ${VALIDATION_RULES.QUIZ_TITLE.MIN_LENGTH} characters`,
    };
  }

  if (trimmed.length > VALIDATION_RULES.QUIZ_TITLE.MAX_LENGTH) {
    return {
      valid: false,
      error: `Quiz title must not exceed ${VALIDATION_RULES.QUIZ_TITLE.MAX_LENGTH} characters`,
    };
  }

  return { valid: true };
}

/**
 * Validate question text
 *
 * @param {string} questionText - Question text to validate
 * @returns {ValidationResult}
 */
export function validateQuestionText(questionText) {
  if (!questionText || typeof questionText !== 'string') {
    return { valid: false, error: 'Question text is required' };
  }

  const trimmed = questionText.trim();

  if (trimmed.length < VALIDATION_RULES.QUESTION_TEXT.MIN_LENGTH) {
    return {
      valid: false,
      error: `Question must be at least ${VALIDATION_RULES.QUESTION_TEXT.MIN_LENGTH} characters`,
    };
  }

  if (trimmed.length > VALIDATION_RULES.QUESTION_TEXT.MAX_LENGTH) {
    return {
      valid: false,
      error: `Question must not exceed ${VALIDATION_RULES.QUESTION_TEXT.MAX_LENGTH} characters`,
    };
  }

  return { valid: true };
}

/**
 * Validate answer choice text
 *
 * @param {string} choiceText - Answer choice text to validate
 * @returns {ValidationResult}
 */
export function validateAnswerChoice(choiceText) {
  if (!choiceText || typeof choiceText !== 'string') {
    return { valid: false, error: 'Answer choice is required' };
  }

  const trimmed = choiceText.trim();

  if (trimmed.length < VALIDATION_RULES.ANSWER_CHOICE.MIN_LENGTH) {
    return {
      valid: false,
      error: `Answer choice must be at least ${VALIDATION_RULES.ANSWER_CHOICE.MIN_LENGTH} character`,
    };
  }

  if (trimmed.length > VALIDATION_RULES.ANSWER_CHOICE.MAX_LENGTH) {
    return {
      valid: false,
      error: `Answer choice must not exceed ${VALIDATION_RULES.ANSWER_CHOICE.MAX_LENGTH} characters`,
    };
  }

  return { valid: true };
}

/**
 * Validate object against a schema
 * Used for complex validation scenarios
 *
 * @param {Object} obj - Object to validate
 * @param {Object} schema - Validation schema
 * @returns {{ valid: boolean, errors: Object }}
 *
 * @example
 * const result = validateObject(userData, {
 *   username: { required: true, validator: validateUsername },
 *   email: { required: false, validator: validateEmail }
 * });
 */
export function validateObject(obj, schema) {
  const errors = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = obj[field];

    // Check required fields
    if (rules.required && (value === null || value === undefined || value === '')) {
      errors[field] = `${field} is required`;
      continue;
    }

    // Skip validation if field is optional and not provided
    if (!rules.required && (value === null || value === undefined || value === '')) {
      continue;
    }

    // Run custom validator
    if (rules.validator) {
      const result = rules.validator(value);
      if (!result.valid) {
        errors[field] = result.error;
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };
}

/**
 * Express middleware for request body validation
 *
 * @param {Object} schema - Validation schema
 * @returns {Function} Express middleware
 *
 * @example
 * app.post('/api/auth/login',
 *   validateBody({
 *     username: { required: true, validator: validateUsername },
 *     password: { required: true, validator: validatePassword }
 *   }),
 *   authController.login
 * );
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const result = validateObject(req.body, schema);

    if (!result.valid) {
      return next(new ValidationError('Validation failed', result.errors));
    }

    next();
  };
}

/**
 * Express middleware for query parameter validation
 *
 * @param {Object} schema - Validation schema
 * @returns {Function} Express middleware
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    const result = validateObject(req.query, schema);

    if (!result.valid) {
      return next(new ValidationError('Invalid query parameters', result.errors));
    }

    next();
  };
}

/**
 * Express middleware for route parameter validation
 *
 * @param {Object} schema - Validation schema
 * @returns {Function} Express middleware
 */
export function validateParams(schema) {
  return (req, res, next) => {
    const result = validateObject(req.params, schema);

    if (!result.valid) {
      return next(new ValidationError('Invalid route parameters', result.errors));
    }

    next();
  };
}

/**
 * Utility: Check if value is empty
 *
 * @param {any} value - Value to check
 * @returns {boolean} True if empty
 */
export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Utility: Sanitize text to prevent XSS
 *
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') return text;

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Utility: Validate ID (must be positive integer)
 *
 * @param {any} id - ID to validate
 * @returns {ValidationResult}
 */
export function validateId(id) {
  const numId = parseInt(id, 10);

  if (isNaN(numId) || numId < 1) {
    return {
      valid: false,
      error: 'Invalid ID format',
    };
  }

  return { valid: true };
}

/**
 * Throw ValidationError if validation fails
 * Helper for simplified error handling
 *
 * @param {ValidationResult} result - Validation result
 * @throws {ValidationError} If validation failed
 *
 * @example
 * const result = validateUsername(username);
 * throwIfInvalid(result); // Throws if invalid
 */
export function throwIfInvalid(result) {
  if (!result.valid) {
    throw new ValidationError(result.error);
  }
}

/**
 * Validate multiple fields and collect all errors
 *
 * @param {Object} validations - Map of field names to validation results
 * @returns {{ valid: boolean, errors: Object }}
 *
 * @example
 * const result = validateAll({
 *   username: validateUsername(data.username),
 *   email: validateEmail(data.email),
 *   password: validatePassword(data.password)
 * });
 *
 * if (!result.valid) {
 *   throw new ValidationError('Validation failed', result.errors);
 * }
 */
export function validateAll(validations) {
  const errors = {};

  for (const [field, result] of Object.entries(validations)) {
    if (!result.valid) {
      errors[field] = result.error;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };
}

// Export all validators
export default {
  validateUsername,
  validatePassword,
  validateEmail,
  validateDisplayName,
  validateRoomCode,
  validateQuizTitle,
  validateQuestionText,
  validateAnswerChoice,
  validateObject,
  validateBody,
  validateQuery,
  validateParams,
  isEmpty,
  sanitizeText,
  validateId,
  throwIfInvalid,
  validateAll,
};
