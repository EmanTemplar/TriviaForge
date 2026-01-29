# TriviaForge Development Summary

> **Purpose:** Summary of development changes for the current session
> **Last Updated:** 2026-01-28
> **Version:** v5.1.2

---

## Session Summary: v5.0.0 - v5.1.2 Release

### Overview

This development period covered multiple releases:
1. **v5.0.0** - Multi-Admin Support with session isolation, account settings, and UI/UX improvements
2. **v5.1.0** - Automatic database migration system with version-based tracking
3. **v5.1.1** - Idempotent migrations fix for existing databases
4. **v5.1.2** - Login modal fix for registered account authentication

---

## v5.1.2 - Login Modal Fix

**Release Date:** 2026-01-28
**Branch:** `main`

### Problem Solved

When a player tried to join a room using a registered account username from a new device (where they hadn't logged in), the app threw a JavaScript error instead of showing the login modal.

**Error:** `loginPassword is not defined`

### Root Cause

During the Phase 4 refactoring (commit `2a2ad5b`), modal components were extracted from PlayerPage. The `loginPassword` ref was correctly removed from the declarations, but one usage at line 1197 was missed:

```javascript
// This line was left behind after refactoring
loginPassword.value = ''  // ❌ ReferenceError
```

The `LoginModal.vue` component now manages its own password field internally, so this line was no longer needed.

### Fix

Removed the orphaned `loginPassword.value = ''` line from `handleJoinRoom()` function.

**File Modified:** `app/src/pages/PlayerPage.vue`

---

## v5.1.1 - Idempotent Migrations Fix

**Release Date:** 2026-01-27

### Fix

Made all database migrations idempotent (safe to run on existing databases) by adding proper `IF NOT EXISTS` and `IF EXISTS` clauses.

---

## v5.1.0 - Auto Database Migrations

**Release Date:** 2026-01-26
**Branch:** `database-schema-fix-v5`

### Problem Solved

When deploying new Docker images to production, database schema changes were not automatically applied. The previous `db-init.js` had two critical issues:
1. **Hardcoded migration list** - Only included migrations 01-05, missing 06 and 07
2. **All-or-nothing check** - If `users` table existed, ALL migrations were skipped

### Implementation

**File Modified:** `app/db-init.js` - Complete rewrite

**New Migration System:**
1. **Version-based tracking** - Stores app version in `schema_migrations` table
2. **Version comparison** - Compares stored version with `version.js` VERSION
3. **Conditional execution** - Only runs migration check when versions differ
4. **Dynamic file scanning** - Automatically detects all `*.sql` files in `init/` directory
5. **Individual tracking** - Records each migration file to prevent re-running
6. **Idempotent design** - All migrations use `IF NOT EXISTS` clauses

**Startup Behavior:**
- **Same version**: Skip migrations, fast startup (just 2 queries)
- **Version change**: Check for pending migrations, apply them, update stored version
- **Fresh install**: Run all migrations, store version

### Key Code Patterns

```javascript
// Version tracking in schema_migrations table
// Uses special row: '__app_version_5.1.0__'

async function getStoredVersion(pool) {
  const result = await pool.query(
    "SELECT filename FROM schema_migrations WHERE filename LIKE '__app_version_%'"
  );
  // Extract version from pattern
}

async function updateStoredVersion(pool, version) {
  await pool.query("DELETE FROM schema_migrations WHERE filename LIKE '__app_version_%'");
  await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)',
    [`__app_version_${version}__`]);
}
```

---

## v5.0.0 - Multi-Admin Support & UI Improvements

**Release Date:** 2026-01-26
**Branch:** `app-enhancements-v5.0.0`

### 1. Multi-Admin Session Isolation

**Purpose:** Allow multiple admins to operate independently with their own quizzes and sessions.

**Implementation:**

- **Auth Middleware** (`app/src/middleware/auth.js`)
  - Added `is_root_admin` flag fetching in `requireAdmin` middleware
  - Flag is attached to `req.user` for downstream filtering

- **Session Controller** (`app/src/controllers/session.controller.js`)
  - Modified `listSessionsFromDB()` to accept filtering options
  - Regular admins see only sessions where `created_by = user_id`
  - Root admin sees all sessions (no filtering)
  - Added `created_by_username` to session responses

- **Socket.IO Ownership Validation** (`app/server.js`)
  - `resumeSession`: Validates admin owns the session before resuming
  - `viewRoom`: Validates admin owns the room before viewing
  - `closeRoom`: Validates admin owns the room before closing

- **Presenter Page** (`app/src/pages/PresenterPage.vue`)
  - Passes `userId` and `isRootAdmin` to socket events
  - Filters active rooms based on ownership

### 2. Session Creator Display

**Purpose:** Root admin can see which admin created each session.

**Implementation:**

- **Sessions List Component** (`app/src/components/admin/SessionsList.vue`)
  - Added `isRootAdmin` prop
  - Displays "by {username}" badge when viewing as root admin
  - Styled with info color theme

### 3. Last Seen Bug Fix

**Problem:** Admin "last seen" showed "Never logged in" even after logging in.

**Root Cause:** Query only tracked game participation via `game_sessions`, not session token activity.

**Fix:** (`app/src/controllers/user.controller.js`)
```sql
GREATEST(
  MAX(gs.created_at),
  MAX(us.last_used_at)
) as last_seen
```
Now combines game session timestamps with user session token activity.

### 4. User Management Visual Alignment

**Problem:** Email and login status columns didn't align across different user sections.

**Fix:** (`app/src/components/admin/UserCategorySection.vue`)
- Changed from flexbox to CSS Grid layout
- Defined column proportions: `minmax(180px, 1fr) minmax(200px, 1.5fr) auto`
- Added text truncation with ellipsis for long content
- Mobile responsive with single-column stacking

### 5. Presenter Navbar Dropdown

**Purpose:** Match Admin page navbar style with dropdown menu.

**Changes:** (`app/src/components/presenter/PresenterNavbar.vue`)
- Replaced inline username/logout with dropdown button
- Added Account Settings and Logout options
- Added click-outside-to-close behavior
- Styled to match AdminNavbar

### 6. Presenter Account Settings Modal

**Purpose:** Allow admins to manage account settings from Presenter page.

**Changes:** (`app/src/pages/PresenterPage.vue`)
- Added Account Settings modal (matching AdminPage)
- Email address management
- Password change with verification
- Password visibility toggles

### 7. Player Disconnect Fix

**Problem:** Players clicking "Leave Room" weren't marked as disconnected immediately.

**Root Cause:** Disconnect handler set `connected = false` but not `connectionState`.

**Fix:** (`app/server.js:2093`)
```javascript
room.players[socket.id].connected = false;
room.players[socket.id].connectionState = 'disconnected';
```

### 8. Case Sensitivity Fix

**Problem:** Docker builds failed due to file name case mismatch.

**Fix:** Renamed `AdminNavBar.vue` to `AdminNavbar.vue` to match import statements (Linux is case-sensitive).

---

## Files Modified Summary

### v5.1.0 Files
| File | Changes |
|------|---------|
| `app/db-init.js` | Complete rewrite with version-based migration logic |
| `app/src/config/version.js` | Updated to v5.1.0 |
| `README.md` | Added v5.1.0 release notes |
| `TODO.md` | Added v5.1.0 section |

### v5.0.0 Files
| File | Changes |
|------|---------|
| `app/src/middleware/auth.js` | Added is_root_admin flag fetching |
| `app/src/controllers/session.controller.js` | Session filtering, creator tracking |
| `app/src/controllers/user.controller.js` | Fixed last seen query |
| `app/server.js` | Socket ownership validation, disconnect fix |
| `app/src/pages/AdminPage.vue` | isRootAdmin prop passing |
| `app/src/pages/PresenterPage.vue` | Account settings modal, socket auth |
| `app/src/components/presenter/PresenterNavbar.vue` | Dropdown style |
| `app/src/components/admin/UserCategorySection.vue` | CSS Grid layout |
| `app/src/components/admin/SessionsList.vue` | Creator display |
| `app/src/components/admin/AdminNavbar.vue` | Renamed from AdminNavBar.vue |
| `app/src/components/admin/AboutPanel.vue` | Updated for v5.0.0 |

---

## Database Changes

### New Table: schema_migrations
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename VARCHAR(100) PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### Existing Migrations (already present)
- Migration 06: `add-media-fields.sql` - Question image support
- Migration 07: `multi-admin-support.sql` - is_root_admin, created_by columns

---

## Patterns Learned

### 1. Version-Based Migration Tracking
Store app version in a special table row to enable fast startup when version unchanged.

### 2. Case Sensitivity in Docker
Always use consistent case for file names - Linux/Docker is case-sensitive while Windows is not.

### 3. Connection State Management
When disconnecting players, set BOTH `connected` and `connectionState` for immediate UI feedback.

### 4. CSS Grid for Alignment
Use CSS Grid instead of flexbox when column alignment across multiple rows is required.

---

## Testing Notes

### Database Migration System
- [x] Fresh install runs all 7 migrations
- [x] Same version restart skips migrations (fast startup)
- [x] Version change triggers migration check
- [x] Idempotent migrations safe to run multiple times

### Multi-Admin Session Isolation
- [x] Regular admin can only see their own sessions
- [x] Root admin can see all sessions
- [x] Session creator badge visible to root admin only
- [x] Cannot resume/view/close sessions owned by other admins

### Account Settings
- [x] Can change email from Admin page
- [x] Can change email from Presenter page
- [x] Password change requires current password
- [x] Password visibility toggle works

### Player Disconnect
- [x] Player clicking "Leave Room" shows as disconnected immediately
- [x] Network disconnect also marks player as disconnected

---

**Session Date:** 2026-01-26
**Releases:** v5.0.0, v5.1.0
