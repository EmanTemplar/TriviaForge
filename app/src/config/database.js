/**
 * TriviaForge - Database Configuration
 *
 * PostgreSQL connection pool and database utilities.
 * Centralizes database configuration and provides helper functions.
 */

import pkg from 'pg';
const { Pool } = pkg;

import { DEFAULTS, ENV_VARS } from './constants.js';
import { DatabaseError } from '../utils/errors.js';

// Get database configuration from environment
const databaseUrl = process.env[ENV_VARS.DATABASE_URL] || 'postgres://trivia:trivia@db:5432/trivia';

// Connection pool configuration
const poolConfig = {
  connectionString: databaseUrl,
  max: DEFAULTS.DATABASE_POOL_SIZE,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// Create connection pool
const pool = new Pool(poolConfig);

// Log pool errors (don't crash the app, but alert us)
pool.on('error', (err) => {
  console.error('[DATABASE] Unexpected error on idle client:', err);
});

// Optional: Log connection events in verbose mode
const VERBOSE_LOGGING = process.env[ENV_VARS.VERBOSE_LOGGING] === 'true' ||
                         process.env[ENV_VARS.NODE_ENV] === 'development';

if (VERBOSE_LOGGING) {
  pool.on('connect', () => {
    console.log('[DATABASE] New client connected to pool');
  });

  pool.on('remove', () => {
    console.log('[DATABASE] Client removed from pool');
  });
}

/**
 * Execute a query with automatic error handling
 *
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 * @throws {DatabaseError} If query fails
 *
 * @example
 * const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
 * const users = result.rows;
 */
export async function query(text, params = []) {
  try {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (VERBOSE_LOGGING) {
      console.log('[DATABASE] Query executed', { text, duration, rows: result.rowCount });
    }

    return result;
  } catch (err) {
    console.error('[DATABASE] Query failed:', { text, error: err.message });
    throw new DatabaseError('Database query failed', err);
  }
}

/**
 * Get a client from the pool for transactions
 *
 * @returns {Promise<Object>} Database client
 * @throws {DatabaseError} If unable to get client
 *
 * @example
 * const client = await getClient();
 * try {
 *   await client.query('BEGIN');
 *   // ... multiple queries
 *   await client.query('COMMIT');
 * } catch (err) {
 *   await client.query('ROLLBACK');
 *   throw err;
 * } finally {
 *   client.release();
 * }
 */
export async function getClient() {
  try {
    return await pool.connect();
  } catch (err) {
    console.error('[DATABASE] Failed to get client from pool:', err.message);
    throw new DatabaseError('Failed to connect to database', err);
  }
}

/**
 * Execute a transaction with automatic rollback on error
 *
 * @param {Function} callback - Async function that receives client
 * @returns {Promise<any>} Result from callback
 * @throws {DatabaseError} If transaction fails
 *
 * @example
 * const result = await transaction(async (client) => {
 *   const quiz = await client.query('INSERT INTO quizzes ...');
 *   const questions = await client.query('INSERT INTO questions ...');
 *   return { quiz, questions };
 * });
 */
export async function transaction(callback) {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DATABASE] Transaction rolled back:', err.message);
    throw new DatabaseError('Transaction failed', err);
  } finally {
    client.release();
  }
}

/**
 * Check if database connection is healthy
 *
 * @returns {Promise<boolean>} True if connection is healthy
 */
export async function healthCheck() {
  try {
    await query('SELECT 1');
    return true;
  } catch (err) {
    console.error('[DATABASE] Health check failed:', err.message);
    return false;
  }
}

/**
 * Get pool statistics
 *
 * @returns {Object} Pool statistics
 */
export function getPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}

/**
 * Close all database connections
 * Call this during graceful shutdown
 *
 * @returns {Promise<void>}
 */
export async function close() {
  try {
    await pool.end();
    console.log('[DATABASE] Connection pool closed');
  } catch (err) {
    console.error('[DATABASE] Error closing pool:', err.message);
  }
}

// Export pool for backward compatibility
export { pool };

// Export default object
export default {
  pool,
  query,
  getClient,
  transaction,
  healthCheck,
  getPoolStats,
  close,
};
