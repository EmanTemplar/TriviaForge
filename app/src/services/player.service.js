/**
 * TriviaForge - Player Service
 *
 * Runtime utilities for player management:
 * - Display name validation against banned patterns
 */

import { query } from '../config/database.js';

export async function isDisplayNameBanned(displayName) {
  try {
    const result = await query(
      'SELECT id, pattern, pattern_type FROM banned_display_names'
    );

    const lowerDisplayName = displayName.toLowerCase();

    for (const ban of result.rows) {
      const lowerPattern = ban.pattern.toLowerCase();

      if (ban.pattern_type === 'exact') {
        // Exact match (case-insensitive)
        if (lowerDisplayName === lowerPattern) {
          return { banned: true, reason: `Display name "${displayName}" is not allowed` };
        }
      } else if (ban.pattern_type === 'contains') {
        // Contains match (case-insensitive)
        if (lowerDisplayName.includes(lowerPattern)) {
          return { banned: true, reason: `Display name contains banned word "${ban.pattern}"` };
        }
      }
    }

    return { banned: false };
  } catch (err) {
    console.error('Error checking banned display names:', err);
    // On error, allow the name (fail open)
    return { banned: false };
  }
}
