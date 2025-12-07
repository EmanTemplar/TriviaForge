# User Management Debug Tools

Quick reference for debugging user account and password reset issues.

## 🚀 Quick Start

**Restart the server first to load new endpoints:**
```bash
docker-compose restart
```

## 📋 CLI Commands

### List All Users
```bash
npm run debug users
```
Shows all users with password status and account type.

### Get User Details
```bash
npm run debug user <USERNAME>
```
Shows detailed user info including:
- Password hash length
- Active sessions
- Account creation/update timestamps

Example:
```bash
npm run debug user testPlayer1
```

### Reset User Password
```bash
# Set new password
npm run debug reset-password <USERNAME> <NEW_PASSWORD>

# Clear password (force reset on next login)
npm run debug reset-password <USERNAME>
```

Examples:
```bash
npm run debug reset-password testPlayer1 newpass123
npm run debug reset-password testPlayer1  # Clears password
```

### Test Password Reset Flow
```bash
npm run debug test-password <USERNAME>
```
Runs 6 automated tests to verify password reset functionality:
1. Check current password state
2. Clear password to NULL
3. Verify password is cleared
4. Invalidate sessions
5. Set new password
6. Verify new password works

Example:
```bash
npm run debug test-password testPlayer1
```

### Create Test User
```bash
npm run debug create-user <USERNAME> [PASSWORD]
```

Examples:
```bash
npm run debug create-user testUser1 pass123
npm run debug create-user testUser2  # No password
```

### Delete User
```bash
npm run debug delete-user <USERNAME>
```
Note: Cannot delete admin user

Example:
```bash
npm run debug delete-user testUser1
```

---

## 🌐 API Endpoints

All endpoints require debug mode enabled.

### GET /api/debug/users
List all users with basic info.

**Response:**
```json
{
  "success": true,
  "totalUsers": 5,
  "users": [
    {
      "id": 1,
      "username": "admin",
      "account_type": "admin",
      "has_password": true,
      "created_at": "2025-12-01T00:00:00Z",
      "updated_at": "2025-12-01T00:00:00Z"
    }
  ]
}
```

### GET /api/debug/user/:username
Get detailed user information including sessions.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 2,
    "username": "testPlayer1",
    "account_type": "player",
    "has_password": true,
    "password_hash": "[REDACTED - Length: 60]",
    "created_at": "2025-12-06T00:00:00Z",
    "updated_at": "2025-12-06T00:00:00Z"
  },
  "sessions": [
    {
      "token": "abc123...",
      "expires_at": "2025-12-07T00:00:00Z",
      "created_at": "2025-12-06T00:00:00Z"
    }
  ]
}
```

### POST /api/debug/reset-password
Reset or clear user password.

**Request:**
```json
{
  "username": "testPlayer1",
  "newPassword": "newpass123"  // Optional - omit to clear
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password set for user testPlayer1",
  "sessionsInvalidated": true
}
```

### POST /api/debug/test-password-reset
Run automated password reset tests.

**Request:**
```json
{
  "username": "testPlayer1"
}
```

**Response:**
```json
{
  "success": true,
  "message": "All password reset tests passed",
  "tests": [
    {
      "test": "Password Hash State",
      "passed": true,
      "result": "Has password (length: 60)"
    },
    {
      "test": "Clear Password",
      "passed": true,
      "result": "Password set to NULL"
    }
  ],
  "user": {
    "id": 2,
    "username": "testPlayer1",
    "accountType": "player"
  }
}
```

### POST /api/debug/create-user
Create a test user.

**Request:**
```json
{
  "username": "testUser1",
  "password": "pass123",  // Optional
  "accountType": "guest"  // Optional: guest, player, admin
}
```

**Response:**
```json
{
  "success": true,
  "message": "User testUser1 created",
  "user": {
    "id": 10,
    "username": "testUser1",
    "account_type": "guest"
  }
}
```

### DELETE /api/debug/user/:username
Delete a user (except admin).

**Response:**
```json
{
  "success": true,
  "message": "User testUser1 deleted",
  "user": {
    "id": 10,
    "username": "testUser1"
  }
}
```

---

## 🔍 Debugging Password Reset Issues

### Step 1: Identify the Problem
```bash
# Check if user exists and has password
npm run debug user <USERNAME>
```

Look for:
- `has_password`: Should be `true` for registered players
- `password_hash`: Shows as `[REDACTED - Length: XX]`
- Active sessions

### Step 2: Run Diagnostic Test
```bash
npm run debug test-password <USERNAME>
```

This will:
1. ✅ Check current password state
2. ✅ Test clearing password
3. ✅ Verify password cleared
4. ✅ Test session invalidation
5. ✅ Test setting new password
6. ✅ Verify new password works

If any step fails, you'll see which one and why.

### Step 3: Fix the Issue

**If password reset fails:**
```bash
# Force clear the password
npm run debug reset-password <USERNAME>

# Verify it's cleared
npm run debug user <USERNAME>
# Should show: has_password: false
```

**If sessions won't invalidate:**
```bash
# Get user details
npm run debug user <USERNAME>
# Check sessions count

# Reset password (automatically clears sessions)
npm run debug reset-password <USERNAME> newpass123

# Verify sessions cleared
npm run debug user <USERNAME>
# Should show: "No active sessions"
```

### Step 4: Verify Fix
```bash
# List all users
npm run debug users

# Verify specific user is fixed
npm run debug user <USERNAME>
```

---

## 📊 Common Scenarios

### Scenario 1: Player can't reset password

**Symptoms:** Password reset doesn't work in UI

**Debug:**
```bash
# 1. Check user state
npm run debug user playerName

# 2. Run password test
npm run debug test-password playerName

# 3. If tests fail, check which step
# Look for failed tests in output
```

**Fix:**
```bash
# Clear password and let user reset
npm run debug reset-password playerName
```

### Scenario 2: Password hash is NULL but shouldn't be

**Symptoms:** User has account_type 'player' but no password

**Debug:**
```bash
npm run debug user playerName
# Check: has_password: false (should be true for players)
```

**Fix:**
```bash
# Set a new password
npm run debug reset-password playerName temppass123
```

### Scenario 3: Sessions won't clear

**Symptoms:** User gets logged out but can still access account

**Debug:**
```bash
npm run debug user playerName
# Check sessions array - should be empty after logout
```

**Fix:**
```bash
# Force password reset (invalidates all sessions)
npm run debug reset-password playerName newpass123
```

### Scenario 4: Need to test with fresh user

**Create test user:**
```bash
npm run debug create-user testUser1 pass123
npm run debug user testUser1
```

**Clean up when done:**
```bash
npm run debug delete-user testUser1
```

---

## 🛡️ Security Notes

- Debug endpoints are **only available** when `NODE_ENV=development`
- Password hashes are **redacted** in API responses (show length only)
- Cannot delete admin user via debug tools
- All password operations use bcrypt with 10 rounds
- Resetting password automatically invalidates all sessions

---

## 💡 Tips

1. **Always restart server after code changes**
   ```bash
   docker-compose restart
   ```

2. **Use test-password to verify functionality**
   - Runs all 6 tests automatically
   - Shows exactly what's failing
   - Leaves user with test password "test123"

3. **Check user details before and after**
   ```bash
   npm run debug user playerName
   # ... make changes ...
   npm run debug user playerName
   ```

4. **List all users to see overview**
   ```bash
   npm run debug users
   # Shows 🔒 for users with passwords
   # Shows 🔓 for users without passwords
   ```

---

## 📚 Related Documentation

- [DEBUG-CLI.md](DEBUG-CLI.md) - Full CLI reference
- [DEBUG.md](DEBUG.md) - Complete API documentation
- [DEBUGGING-QUICKSTART.md](DEBUGGING-QUICKSTART.md) - Quick start guide
