/**
 * TriviaForge - Startup Service
 *
 * One-time initialization tasks that run at server startup:
 * - Admin password setup from environment variable
 */

import { query } from '../config/database.js';
import { env } from '../config/environment.js';

export async function initializeAdminPassword() {
  if (!process.env.ADMIN_PASSWORD) {
    console.log('⚠️  ADMIN_PASSWORD not set - admin login will not work');
    return;
  }

  try {
    // Check if admin user exists
    const adminResult = await query(
      "SELECT id, password_hash FROM users WHERE username = 'admin'"
    );

    if (adminResult.rows.length === 0) {
      console.log('ℹ️  No admin user found in database - will be created by init scripts');
      return;
    }

    const admin = adminResult.rows[0];

    // Check if password hash is the placeholder or NULL
    const needsUpdate = !admin.password_hash || admin.password_hash.startsWith('$2b$10$rKzF5EqZQZZ');

    if (needsUpdate) {
      console.log('🔐 Updating admin password from environment variable...');

      // Import bcrypt dynamically
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash(env.adminPassword, 10);

      await query(
        'UPDATE users SET password_hash = $1 WHERE username = $2',
        [passwordHash, 'admin']
      );

      console.log('✅ Admin password updated successfully');
    } else {
      console.log('✅ Admin password already configured');
    }
  } catch (err) {
    // If bcrypt is not installed yet, skip this step
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      console.log('⚠️  bcrypt not installed yet - admin password will be set after npm install');
    } else {
      console.error('❌ Error initializing admin password:', err.message);
    }
  }
}
