# TriviaForge - Security Audit Report
**Date:** 2025-12-15
**Version Audited:** v3.2.2
**Deployment Target:** Self-hosted & Educational (School Campus)
**Auditor:** Claude Code Security Analysis

---

## Executive Summary

**Overall Security Rating:** ⚠️ **MODERATE** (Requires improvements before school deployment)

TriviaForge has **good foundational security** with proper authentication, parameterized SQL queries, and Vue's automatic XSS protection. However, several **critical and high-priority vulnerabilities** must be addressed before deployment in educational settings where student data protection and network security are paramount.

### Priority Classification
- 🔴 **CRITICAL** (4 issues) - Address immediately before school deployment
- 🟠 **HIGH** (3 issues) - Address before production use
- 🟡 **MEDIUM** (5 issues) - Recommended for enhanced security
- 🟢 **LOW** (3 issues) - Nice-to-have improvements

---

## 🔴 CRITICAL Vulnerabilities

### 1. **No CSRF Protection**
**Impact:** Attackers can trick authenticated admins into executing malicious actions
**Severity:** CRITICAL
**Affected:** All authenticated POST/PUT/DELETE endpoints

**Current State:**
- No CSRF tokens implemented
- All admin actions vulnerable to CSRF attacks
- An attacker could create a malicious page that deletes quizzes, bans players, or modifies settings when an admin visits

**Recommendation:**
Implement CSRF tokens using the `csurf` npm package:
```javascript
const csurf = require('csurf');
const csrfProtection = csurf({ cookie: true });

// Apply to all state-changing routes
app.post('/api/*', csrfProtection, (req, res) => { ... });
app.put('/api/*', csrfProtection, (req, res) => { ... });
app.delete('/api/*', csrfProtection, (req, res) => { ... });
```

Client-side:
```javascript
// Add CSRF token to axios headers
apiClient.interceptors.request.use((config) => {
  const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
  config.headers['X-CSRF-Token'] = csrfToken;
  return config;
});
```

**Files to Modify:**
- `app/server.js` - Add csurf middleware
- `app/src/composables/useApi.js` - Add CSRF token to requests
- `app/index.html` - Add CSRF meta tag

---

### 2. **Dependency Vulnerabilities (xlsx package)**
**Impact:** Prototype Pollution and ReDoS attacks via malicious Excel files
**Severity:** CRITICAL
**CVE:** GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9

**Current State:**
```
xlsx  *
Severity: high
Prototype Pollution in sheetJS
SheetJS Regular Expression Denial of Service (ReDoS)
No fix available
```

**Attack Scenario:**
1. Attacker creates malicious .xlsx file
2. Admin imports it via quiz import feature
3. Server executes malicious code or crashes (DoS)

**Recommendation:**
Replace `xlsx` with `exceljs` (actively maintained, no known CVEs):
```bash
npm uninstall xlsx
npm install exceljs@^4.4.0
```

Update import logic in `server.js`:
```javascript
// OLD: const xlsx = require('xlsx');
const ExcelJS = require('exceljs');

// Replace xlsx.read() with ExcelJS API
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(buffer);
```

**Files to Modify:**
- `app/package.json` - Replace dependency
- `app/server.js` - Rewrite Excel parsing (lines 968-1094)

---

### 3. **Password Logging in Production**
**Impact:** Admin passwords exposed in Docker logs
**Severity:** CRITICAL
**Location:** server.js:507-508

**Current State:**
```javascript
console.log('🔑 Auth attempt - Password provided:', password ? 'yes' : 'no');
console.log('🔑 Expected password:', ADMIN_PASSWORD);
```

**Attack Scenario:**
- Admin password logged to stdout
- Accessible via `docker logs triviagame-app`
- Anyone with Docker access can retrieve admin credentials

**Recommendation:**
**IMMEDIATE FIX:** Remove password logging entirely:
```javascript
// REMOVE THESE LINES:
// console.log('🔑 Auth attempt - Password provided:', password ? 'yes' : 'no');
// console.log('🔑 Expected password:', ADMIN_PASSWORD);

// Keep only success/failure logs:
if (password === ADMIN_PASSWORD) {
  console.log('✅ Admin auth successful');
  // ...
} else {
  console.log('❌ Admin auth failed');
  // ...
}
```

**Files to Modify:**
- `app/server.js` - Lines 507-508 (DELETE)

---

### 4. **No Rate Limiting on Authentication Endpoints**
**Impact:** Brute-force attacks on admin and player accounts
**Severity:** CRITICAL
**Affected Endpoints:**
- `/api/auth/check` (admin login)
- `/api/auth/player-login` (player login)
- `/api/auth/register-player`

**Attack Scenario:**
1. Attacker scripts password attempts against `/api/auth/check`
2. No rate limiting means unlimited attempts
3. Can crack weak passwords in minutes

**Recommendation:**
Implement rate limiting using `express-rate-limit`:
```javascript
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts. Please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/auth/check', authLimiter, async (req, res) => { ... });
app.post('/api/auth/player-login', authLimiter, async (req, res) => { ... });
```

**Files to Modify:**
- `app/package.json` - Add express-rate-limit
- `app/server.js` - Add rate limiting middleware

---

## 🟠 HIGH Priority Issues

### 5. **Tokens Stored in localStorage (XSS Vulnerability)**
**Impact:** XSS attacks can steal admin/player tokens
**Severity:** HIGH
**Location:** auth.js:6-8, 18-20

**Current State:**
```javascript
const token = ref(localStorage.getItem('authToken') || null)
localStorage.setItem('authToken', authToken)
```

**Issue:**
- localStorage is accessible to JavaScript (vulnerable to XSS)
- If attacker injects malicious script, they can steal tokens
- Though Vue prevents most XSS, third-party libraries could introduce vulnerabilities

**Recommendation:**
Use **HttpOnly cookies** for tokens (not accessible to JavaScript):

Server-side:
```javascript
// Set token as HttpOnly cookie
res.cookie('authToken', token, {
  httpOnly: true,
  secure: true, // HTTPS only
  sameSite: 'strict',
  maxAge: 3600000 // 1 hour
});
```

Client-side:
```javascript
// Remove localStorage usage
// Tokens automatically sent with requests via cookies
apiClient.defaults.withCredentials = true;
```

**Files to Modify:**
- `app/server.js` - Set cookies instead of sending tokens in response body
- `app/src/stores/auth.js` - Remove localStorage, use cookie-based auth
- `app/src/composables/useApi.js` - Enable withCredentials

---

### 6. **No Input Validation on Critical Fields**
**Impact:** Malformed data can crash server or bypass security checks
**Severity:** HIGH
**Affected:** Quiz creation, user registration, room join

**Current State:**
- No validation library used
- Minimal input checking
- Example: Room codes, usernames, display names not properly sanitized

**Recommendation:**
Use `joi` for comprehensive input validation:
```javascript
const Joi = require('joi');

const usernameSchema = Joi.string()
  .alphanum()
  .min(3)
  .max(30)
  .required();

const roomCodeSchema = Joi.string()
  .pattern(/^[A-Z0-9]{4}$/)
  .required();

// Validate before processing
app.post('/api/rooms/join', (req, res) => {
  const { error } = roomCodeSchema.validate(req.body.roomCode);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  // ... proceed
});
```

**Files to Modify:**
- `app/package.json` - Add joi
- `app/server.js` - Add validation schemas for all user inputs

---

### 7. **Socket.IO Events Not Authenticated**
**Impact:** Unauthorized users can emit malicious socket events
**Severity:** HIGH
**Location:** server.js (all socket.on handlers)

**Current State:**
```javascript
socket.on('joinRoom', ({ roomCode, username }) => {
  // No verification that this socket should be allowed to join
});
```

**Issue:**
- Anyone can emit socket events without authentication
- Can join rooms, kick players, manipulate game state
- Token is sent in `auth` but not validated per-event

**Recommendation:**
Validate socket authentication and authorization:
```javascript
// Middleware to authenticate all socket events
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));

  // Verify token
  const user = await verifyToken(token);
  if (!user) return next(new Error('Invalid token'));

  socket.user = user; // Attach to socket
  next();
});

// Per-event validation
socket.on('kickPlayer', async (data) => {
  // Verify socket.user is admin/presenter
  if (socket.user.account_type !== 'admin') {
    return socket.emit('error', 'Unauthorized');
  }
  // ... proceed
});
```

**Files to Modify:**
- `app/server.js` - Add Socket.IO authentication middleware

---

## 🟡 MEDIUM Priority Issues

### 8. **No Content Security Policy (CSP)**
**Impact:** XSS attacks have higher success rate
**Severity:** MEDIUM

**Recommendation:**
Add CSP headers using `helmet`:
```javascript
const helmet = require('helmet');
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"], // Vue needs unsafe-inline
    imgSrc: ["'self'", "data:"],
    connectSrc: ["'self'", "ws:", "wss:"] // Socket.IO
  }
}));
```

**Files to Modify:**
- `app/package.json` - Add helmet
- `app/server.js` - Add helmet middleware

---

### 9. **No HTTPS Enforcement**
**Impact:** Man-in-the-middle attacks, credential interception
**Severity:** MEDIUM (HIGH for school deployment)

**Recommendation:**
For school deployment, **require HTTPS**:
```javascript
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});
```

Add to docker-compose.yml:
```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
```

**Files to Create:**
- `nginx.conf` - Reverse proxy with SSL
- `docker-compose.yml` - Add nginx service

---

### 10. **Session Timeout Not Enforced Client-Side**
**Impact:** Expired tokens still usable until server check
**Severity:** MEDIUM

**Current State:**
- Server checks expiration on each request
- Client doesn't pre-validate or refresh tokens

**Recommendation:**
```javascript
// Add token expiration checking
const isTokenExpired = (token) => {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return payload.exp * 1000 < Date.now();
};

// Check before API calls
apiClient.interceptors.request.use((config) => {
  if (authStore.token && isTokenExpired(authStore.token)) {
    authStore.logout();
    window.location.href = '/';
    return Promise.reject(new Error('Session expired'));
  }
  return config;
});
```

**Files to Modify:**
- `app/src/composables/useApi.js` - Add token expiration validation

---

### 11. **Weak Admin Password Validation**
**Impact:** Weak passwords can be set via environment variable
**Severity:** MEDIUM

**Recommendation:**
Add password strength validation:
```javascript
const validatePasswordStrength = (password) => {
  if (password.length < 12) return false;
  if (!/[A-Z]/.test(password)) return false; // Uppercase
  if (!/[a-z]/.test(password)) return false; // Lowercase
  if (!/[0-9]/.test(password)) return false; // Number
  if (!/[^A-Za-z0-9]/.test(password)) return false; // Special char
  return true;
};

// Check on startup
if (!validatePasswordStrength(ADMIN_PASSWORD)) {
  console.error('❌ ADMIN_PASSWORD does not meet security requirements');
  console.error('Requirements: 12+ chars, uppercase, lowercase, number, special char');
  process.exit(1);
}
```

**Files to Modify:**
- `app/server.js` - Add password validation on startup
- `.env.example` - Document password requirements

---

### 12. **No Request Size Limits**
**Impact:** DoS attacks via large payloads
**Severity:** MEDIUM

**Recommendation:**
```javascript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
```

**Files to Modify:**
- `app/server.js` - Add body size limits

---

## 🟢 LOW Priority Improvements

### 13. **No Security Headers**
**Severity:** LOW

**Recommendation:**
Use `helmet` for standard security headers:
```javascript
app.use(helmet());
```

---

### 14. **No Audit Logging**
**Severity:** LOW

**Recommendation:**
Log admin actions to database:
```javascript
const auditLog = async (userId, action, details) => {
  await pool.query(
    'INSERT INTO audit_log (user_id, action, details, created_at) VALUES ($1, $2, $3, NOW())',
    [userId, action, JSON.stringify(details)]
  );
};
```

---

### 15. **Environment Variable Exposure**
**Severity:** LOW

**Recommendation:**
Don't log environment variables on startup:
```javascript
// REMOVE any console.log that outputs env vars
```

---

## Implementation Priority Roadmap

### Phase 1: Before School Deployment (CRITICAL)
1. ✅ Remove password logging (5 minutes)
2. ✅ Replace xlsx with exceljs (2 hours)
3. ✅ Add rate limiting (1 hour)
4. ✅ Implement CSRF protection (3 hours)

**Estimated Time:** 1 day

---

### Phase 2: Enhanced Security (HIGH)
1. ✅ Move tokens to HttpOnly cookies (4 hours)
2. ✅ Add input validation with joi (6 hours)
3. ✅ Authenticate Socket.IO events (3 hours)

**Estimated Time:** 2 days

---

### Phase 3: Production Hardening (MEDIUM)
1. ✅ Add CSP headers (1 hour)
2. ✅ HTTPS enforcement with nginx (4 hours)
3. ✅ Client-side token expiration (2 hours)
4. ✅ Password strength validation (1 hour)
5. ✅ Request size limits (30 minutes)

**Estimated Time:** 1-2 days

---

### Phase 4: Optional Improvements (LOW)
1. ✅ Security headers with helmet
2. ✅ Audit logging
3. ✅ Environment hardening

**Estimated Time:** 1 day

---

## Testing Checklist

After implementing fixes, test:
- [ ] CSRF protection blocks unauthorized requests
- [ ] Rate limiting prevents brute force
- [ ] Excel imports work with exceljs
- [ ] Tokens in HttpOnly cookies work correctly
- [ ] Socket.IO authentication blocks unauthorized events
- [ ] Input validation rejects malformed data
- [ ] HTTPS redirects work
- [ ] CSP doesn't block legitimate resources
- [ ] Admin password validation works

---

## School Deployment Recommendations

For educational environments, also consider:
1. **FERPA Compliance:** Log student interactions, encrypt PII
2. **Network Isolation:** Deploy on internal network only
3. **SSO Integration:** Integrate with school's LDAP/Active Directory
4. **Content Filtering:** Integrate with school's profanity filter
5. **Data Retention:** Auto-delete student data after 90 days
6. **Backup Strategy:** Daily encrypted backups
7. **Access Controls:** Limit admin access to IT staff only
8. **Monitoring:** Set up alerts for unusual activity

---

## Conclusion

TriviaForge has a **solid security foundation** but requires **critical fixes** before school deployment. The most urgent issues are:
1. **Remove password logging** (5 minutes)
2. **Replace xlsx dependency** (2 hours)
3. **Add rate limiting** (1 hour)
4. **Implement CSRF protection** (3 hours)

After Phase 1 and 2 implementations, the application will be **suitable for educational deployment** with proper network isolation.

---

**Next Steps:**
1. Review this report with stakeholders
2. Prioritize fixes based on deployment timeline
3. Implement Phase 1 (CRITICAL) immediately
4. Schedule Phases 2-3 before production launch
5. Re-audit after all fixes implemented

**Report Generated:** 2025-12-15
**Security Audit Tool:** Claude Code v3.2.2
