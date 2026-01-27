import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { VERSION } from './src/config/version.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Database Migration System
 *
 * Version-based migration tracking:
 * - Stores app version in schema_migrations table
 * - Only runs migration check when version changes
 * - Tracks individual migrations to prevent re-running
 * - All migrations must be idempotent (use IF NOT EXISTS, etc.)
 */

/**
 * Wait for database to be ready
 */
async function waitForDatabase(pool, maxRetries = 30, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ Database connection established');
      return true;
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`❌ Failed to connect to database after ${maxRetries} attempts`);
        throw error;
      }
      console.log(`⏳ Waiting for database... (attempt ${attempt}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Ensure the schema_migrations table exists
 */
async function ensureMigrationsTableExists(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(100) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Get the stored app version from database
 * Returns null if no version stored (fresh install or pre-migration DB)
 */
async function getStoredVersion(pool) {
  try {
    const result = await pool.query(
      "SELECT filename FROM schema_migrations WHERE filename LIKE '__app_version_%'"
    );
    if (result.rows.length === 0) return null;
    // Extract version from '__app_version_5.0.0__'
    const match = result.rows[0].filename.match(/__app_version_(.+)__/);
    return match ? match[1] : null;
  } catch (error) {
    return null; // Table doesn't exist yet
  }
}

/**
 * Update stored app version after migrations
 */
async function updateStoredVersion(pool, version) {
  // Remove old version marker
  await pool.query("DELETE FROM schema_migrations WHERE filename LIKE '__app_version_%'");
  // Insert new version marker
  await pool.query(
    'INSERT INTO schema_migrations (filename) VALUES ($1)',
    [`__app_version_${version}__`]
  );
}

/**
 * Get list of applied migrations (excluding version marker)
 */
async function getAppliedMigrations(pool) {
  const result = await pool.query(
    "SELECT filename FROM schema_migrations WHERE filename NOT LIKE '__app_version_%'"
  );
  return new Set(result.rows.map(row => row.filename));
}

/**
 * Record a migration as applied
 */
async function recordMigration(pool, filename) {
  await pool.query(
    'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
    [filename]
  );
}

/**
 * Get all SQL migration files from init directory
 */
async function getMigrationFiles() {
  const initDir = path.join(__dirname, 'init');
  try {
    const files = await fs.readdir(initDir);
    return files
      .filter(f => f.endsWith('.sql'))
      .sort(); // Alphabetical = numeric order with NN- prefix
  } catch (error) {
    console.error('❌ Error reading init directory:', error.message);
    return [];
  }
}

/**
 * Run a SQL migration file
 */
async function runSQLFile(pool, filePath) {
  try {
    const sql = await fs.readFile(filePath, 'utf8');
    console.log(`📄 Running migration: ${path.basename(filePath)}`);
    await pool.query(sql);
    console.log(`✅ Completed: ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`❌ Error executing ${path.basename(filePath)}:`, error.message);
    throw error;
  }
}

/**
 * Main database initialization function
 *
 * Uses version-based migration tracking:
 * - If stored version matches current version, skip migration check
 * - If versions differ (or no stored version), check and apply pending migrations
 * - Update stored version after successful migration
 */
export async function initializeDatabase(pool) {
  try {
    // Wait for database to be ready
    console.log('🔍 Waiting for database to be ready...');
    await waitForDatabase(pool);

    // Ensure migrations table exists
    await ensureMigrationsTableExists(pool);

    // Check stored version vs current version
    const storedVersion = await getStoredVersion(pool);
    const currentVersion = VERSION;

    console.log(`📦 App version: ${currentVersion}`);
    console.log(`💾 Stored version: ${storedVersion || '(none)'}`);

    if (storedVersion === currentVersion) {
      console.log('✅ Database schema is up to date (version match)');
      return;
    }

    // Version changed or fresh install - run migration check
    console.log('🔄 Version change detected, checking for pending migrations...');

    // Get all migration files and already-applied ones
    const allMigrations = await getMigrationFiles();
    const appliedMigrations = await getAppliedMigrations(pool);

    // Find pending migrations
    const pendingMigrations = allMigrations.filter(f => !appliedMigrations.has(f));

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
    } else {
      console.log(`🚀 Applying ${pendingMigrations.length} migration(s)...`);

      // Apply each pending migration
      for (const filename of pendingMigrations) {
        const filePath = path.join(__dirname, 'init', filename);
        await runSQLFile(pool, filePath);
        await recordMigration(pool, filename);
      }

      console.log('✅ All migrations applied successfully');
    }

    // Update stored version
    await updateStoredVersion(pool, currentVersion);
    console.log(`💾 Stored version updated to ${currentVersion}`);

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}
