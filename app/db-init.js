import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Database Initialization Module
 * Checks if the database is initialized and runs SQL scripts if needed
 */

async function isDatabaseInitialized(pool) {
  try {
    // Check if the users table exists
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
      );
    `);
    return result.rows[0].exists;
  } catch (error) {
    console.error('❌ Error checking database initialization:', error.message);
    return false;
  }
}

async function runSQLFile(pool, filePath) {
  try {
    const sql = await fs.readFile(filePath, 'utf8');
    console.log(`📄 Running SQL file: ${path.basename(filePath)}`);
    await pool.query(sql);
    console.log(`✅ Successfully executed: ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`❌ Error executing ${path.basename(filePath)}:`, error.message);
    throw error;
  }
}

export async function initializeDatabase(pool) {
  try {
    console.log('🔍 Checking if database needs initialization...');

    const isInitialized = await isDatabaseInitialized(pool);

    if (isInitialized) {
      console.log('✅ Database already initialized');
      return;
    }

    console.log('🚀 Initializing database schema...');

    // Get the init directory path
    const initDir = path.join(__dirname, 'init');

    // Read all SQL files in order
    const sqlFiles = [
      '01-tables.sql',
      '02-migrate_timestamps.sql',
      '03-update-admin-password.sql'
    ];

    // Execute each SQL file in order
    for (const sqlFile of sqlFiles) {
      const filePath = path.join(initDir, sqlFile);
      await runSQLFile(pool, filePath);
    }

    console.log('✅ Database initialization completed successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}
