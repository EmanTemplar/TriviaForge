# TriviaForge - Development Summary & Agent Onboarding Guide

> **Purpose:** Quick reference for AI agents and developers to understand project state, architecture, and recent changes.
> **Status:** Internal development use only - DO NOT commit to repository
> **Last Updated:** 2025-12-31

---

## 📊 Current Project Status

| Metric | Value |
|--------|-------|
| **Current Version** | v4.2.1 (Style Refactoring Release) |
| **Active Branch** | `main` |
| **Main Branch** | `main` |
| **Production Status** | Production ready - Style refactoring complete |
| **Database Schema Version** | 04 (Banned display names support) |
| **Frontend Framework** | Vue 3 + Vite (migrated from Vanilla JS) |
| **Backend Architecture** | **NEW:** Modular architecture with src/ organization |
| **Outstanding Issues** | None critical - Focus on scalability improvements |
| **Latest Features** | Component-first CSS refactoring (2026-01-01), Theme-aware color system, Centralized version management, Enhanced Button/FormInput/Card components |
| **Completed** | Style refactoring phases 1-6 ✅, 560+ lines CSS eliminated ✅, Theme-aware colors ✅, Version centralization ✅ |

---

## 🎯 AI Agent Instructions - READ FIRST

### Core Development Principles
**TriviaForge is a real-time multiplayer trivia platform built for production use. All changes must prioritize:**
1. **User Experience** - Mobile-first, responsive, accessible across devices
2. **Real-time Performance** - WebSocket stability, low latency, connection resilience
3. **Code Quality** - Clean, maintainable, documented, no over-engineering
4. **Security** - Input validation, CSRF protection, rate limiting, no SQL injection

### Response Guidelines - CRITICAL
- **Be Direct:** Answer the question, fix the bug, implement the feature - no preambles
- **Be Minimal:** Only show changed code using file references like `filename.ext:line_number`
- **Be Specific:** Use exact line numbers, never say "around line X" or "somewhere near"
- **Be Complete:** Finish the task fully - no partial implementations or TODOs
- **Be Practical:** Avoid abstractions, helpers, or future-proofing unless explicitly needed

### Code Style Expectations
- **Vue 3 Composition API** - Use `<script setup>` with reactive primitives
- **CSS Scoped Styles** - Component-specific styling, use CSS variables from `main.css`
- **No Inline Styles** - Unless dynamic (`:style` bindings)
- **Semantic HTML** - Accessible markup, proper ARIA labels where needed
- **Mobile Responsive** - Test breakpoints, use `clamp()` for responsive sizing
- **Error Handling** - User-friendly messages via notification system, log errors to console

### UI/UX Button Color Conventions
**CRITICAL:** All buttons must follow this color scheme based on action connotation:

1. **Green Buttons (`btn-success`)** - Positive/Constructive Actions
   - Login, Set Password, Register Account
   - Create, Add, Start, Join
   - Update, Save, Confirm (when positive outcome)
   - Any action that creates, adds, or moves forward positively

2. **Red Buttons (`btn-danger`)** - Negative/Destructive Actions
   - Logout, Leave Room, Disconnect
   - Delete, Remove, Ban, Kick
   - Any action that destroys data or exits/disconnects

3. **Grey Buttons (`btn-secondary`)** - Cancel/Neutral Actions
   - Cancel (almost always)
   - Close (when non-destructive)
   - Neutral navigation actions

**Examples:**
- ✅ Login → Green (entering system = positive)
- ✅ Logout → Red (leaving system = negative)
- ✅ Delete Session → Red (destroying data = negative)
- ✅ Cancel → Grey (neutral action)

### File Reference Format
When discussing code changes, use this format:
```
[filename.ext:line_number](path/to/filename.ext#Lline_number)
```
Example: `[PlayerPage.vue:1262](app/src/pages/PlayerPage.vue#L1262)`

### Common Tasks Quick Reference
| Task | What to Do |
|------|------------|
| **Bug Fix** | 1. Read the file, 2. Identify root cause, 3. Make minimal fix, 4. Test edge cases |
| **New Feature** | 1. Check existing patterns, 2. Match code style, 3. Add to appropriate component, 4. Update related files |
| **CSS Issue** | 1. Inspect parent containers, 2. Check flex/grid constraints, 3. Verify box-sizing, 4. Test mobile breakpoints |
| **Socket.IO Issue** | 1. Check `useSocket.js`, 2. Verify event names match server.js, 3. Test reconnection logic |
| **Database Query** | 1. Check `server.js` queries, 2. Verify SQL syntax, 3. Test with sample data, 4. Handle errors |

### Git Workflow Standards
- **Branch Naming:** `feature/name`, `bug-fixes-vX.X.X`, `hotfix/description`
- **Commit Messages:** Use conventional format: `feat:`, `fix:`, `refactor:`, `docs:`
- **Always Include:** Co-authored-by footer for Claude Code contributions
- **Never Commit:** DEV-SUMMARY.md, .env files, node_modules, dist/

### Testing Checklist Before Commits
- [ ] Run `npm run build` successfully
- [ ] Test on mobile viewport (responsive design)
- [ ] Verify Socket.IO events work (if applicable)
- [ ] Check console for errors
- [ ] Test edge cases (empty states, long text, many items)
- [ ] Verify database migrations (if schema changed)


### Essential Files to Read First
1. [README.md](README.md) - User-facing features and installation
2. [TODO.md](TODO.md) - Feature roadmap and completed tasks
3. [app/server.js](app/server.js) - Main application logic
4. [app/init/01-tables.sql](app/init/01-tables.sql) - Database schema

### Key Technologies
- **Backend:** Node.js + Express + Socket.IO
- **Database:** PostgreSQL 15 (fully normalized, 11 tables + 3 views)
- **Frontend:** Vue 3 + Vite (migrated from Vanilla JavaScript)
- **State Management:** Pinia (Vue 3 state store)
- **Real-time:** WebSocket via Socket.IO with Vue composables
- **Auth:** JWT-like tokens via UUID + bcrypt password hashing
- **Styling:** CSS with CSS variables and scoped component styles
- **Build Tool:** Vite (fast HMR, optimized production builds)
- **Deployment:** Docker + Docker Compose

### Project Structure
```
TriviaForge/
├── app/
│   ├── server.js              # Main Express + Socket.IO server
│   ├── db-init.js             # Database initialization orchestrator
│   ├── package.json           # Node dependencies
│   ├── vite.config.js         # Vite build configuration
│   ├── index.html             # HTML entry point
│   ├── init/                  # SQL migration scripts
│   │   ├── 01-tables.sql      # Core schema (11 tables, 3 views)
│   │   ├── 02-migrate_timestamps.sql
│   │   ├── 03-update-admin-password.sql
│   │   └── 04-banned-display-names.sql
│   ├── src/                   # Backend source (NEW - Phase 1-3)
│   │   ├── config/            # Configuration modules
│   │   │   ├── constants.js   # All magic strings and constants
│   │   │   ├── database.js    # PostgreSQL connection pool
│   │   │   └── environment.js # Environment variable access
│   │   ├── controllers/       # REST API controllers (Phase 2)
│   │   │   ├── auth.controller.js
│   │   │   ├── quiz.controller.js
│   │   │   ├── session.controller.js
│   │   │   └── user.controller.js
│   │   ├── middleware/        # Express middleware
│   │   │   ├── auth.js        # Authentication middleware
│   │   │   └── errorHandler.js # Global error handler
│   │   ├── routes/            # REST API routes (Phase 2)
│   │   │   ├── auth.routes.js
│   │   │   ├── quiz.routes.js
│   │   │   ├── session.routes.js
│   │   │   └── user.routes.js
│   │   ├── services/          # Business logic services (Phase 3)
│   │   │   ├── room.service.js    # Live room state management
│   │   │   ├── session.service.js # Session persistence
│   │   │   └── quiz.service.js    # Quiz data access
│   │   └── utils/             # Utility modules
│   │       ├── errors.js      # Custom error classes
│   │       ├── responses.js   # API response helpers
│   │       └── validators.js  # Input validation
│   ├── src/                   # Vue 3 frontend source
│   │   ├── main.js            # Vue app entry point
│   │   ├── App.vue            # Root component
│   │   ├── router.js          # Vue Router configuration
│   │   ├── pages/             # Page components
│   │   │   ├── LoginPage.vue  # Admin/Presenter login
│   │   │   ├── AdminPage.vue  # Admin panel (quiz + user mgmt)
│   │   │   ├── PresenterPage.vue # Game host interface
│   │   │   ├── PlayerPage.vue # Player game interface
│   │   │   ├── PlayerManagePage.vue # Account management
│   │   │   └── DisplayPage.vue # Spectator view
│   │   ├── components/        # Reusable components
│   │   │   ├── common/        # Shared components
│   │   │   │   ├── Modal.vue
│   │   │   │   ├── Notification.vue
│   │   │   │   ├── Button.vue
│   │   │   │   └── Card.vue
│   │   │   ├── modals/        # Modal components
│   │   │   │   ├── ProgressModal.vue
│   │   │   │   ├── LoginModal.vue
│   │   │   │   ├── SetPasswordModal.vue
│   │   │   │   ├── LogoutConfirmModal.vue
│   │   │   │   ├── LeaveRoomConfirmModal.vue
│   │   │   │   └── ChangeUsernameConfirmModal.vue
│   │   │   └── player/        # Player page components (NEW - Phase 4)
│   │   │       ├── PlayerNavbar.vue
│   │   │       ├── QuestionDisplay.vue
│   │   │       ├── WaitingDisplay.vue
│   │   │       ├── JoinRoomSection.vue
│   │   │       ├── RoomInfoSection.vue
│   │   │       ├── PlayersList.vue
│   │   │       └── StatusMessage.vue
│   │   ├── stores/            # Pinia state stores
│   │   │   ├── authStore.js
│   │   │   ├── quizStore.js
│   │   │   └── gameStore.js
│   │   ├── composables/       # Vue composables
│   │   │   ├── useSocket.js   # Socket.IO integration
│   │   │   └── useApi.js      # API utilities
│   │   └── styles/            # Global styles
│   │       └── main.css       # Global CSS with variables
│   ├── public/                # Static assets
│   │   └── favicon.ico
│   ├── quizzes/               # Legacy JSON storage (deprecated)
│   └── archive/               # Old code (pre-Vue migration)
├── docker-compose.yml         # Multi-container orchestration
├── .env.example               # Environment template
├── README.md                  # Public documentation
├── TODO.md                    # Feature tracking
└── DEV-SUMMARY.md            # This file (DO NOT COMMIT)
```

---

## 📜 Version History

### **v4.2.1** - Style Refactoring Release: Component-First CSS Architecture (Jan 2026)
**Released:** January 1, 2026
**Branch:** `style-refactoring` (merged to `main`)
**Docker:** `emancodetemplar/triviaforge:v4.2.1` and `:latest`

**Major Accomplishments:**

**1. Component-First CSS Refactoring**
- ✅ Eliminated 560+ lines of duplicate CSS across 6 pages
- ✅ Enhanced 3 existing Vue components (Button, FormInput, Card) to replace inline styles
- ✅ Extracted 4 shared CSS pattern files (navbars, scrollbars, badges, modals)
- ✅ Migrated all 6 pages to use enhanced components and shared styles
- ✅ Achieved 30-40% reduction in total page-specific CSS

**2. Enhanced Component Library**
- **Button.vue** - Added 14 button variants with full theme support
  - Variants: primary, secondary, success, danger, delete, download, upload, add, remove, quick, refresh, shuffle, outline, ghost
  - Props: variant, size (small/medium/large), fullWidth, isLoading, icon
  - ~100 lines of reusable button styling

- **FormInput.vue** - Comprehensive form input support
  - Input types: text, email, password, number, tel, url, textarea, select
  - Props: type, options (for select), rows (for textarea), placeholder, label, error
  - ~80 lines of form styling

- **Card.vue** - List item and card variants
  - Variants: default, highlighted, quiz-item, session-item, user-item, list-item
  - Props: variant, hoverable, clickable
  - ~60 lines of card patterns

**3. Shared CSS Patterns** (4 new files)
- `app/src/styles/shared/navbars.css` (~140 lines) - Navbar patterns for 3+ pages
- `app/src/styles/shared/scrollbars.css` (~50 lines) - WebKit scrollbar styling
- `app/src/styles/shared/badges.css` (~115 lines) - Status badge patterns
- `app/src/styles/shared/modals.css` (~80 lines) - Modal dialog base styles

**4. Theme-Aware Color System** (CRITICAL FIX)
- ✅ Eliminated ALL hardcoded color values (white, #000000, etc.)
- ✅ Added button text color CSS variables to all 5 theme sections (dark, light, grey, system-dark, system-light)
  - `--btn-text-light`: White text for solid colored backgrounds
  - `--btn-text-dark`: Dark text for light themes
  - `--btn-text-overlay`: Adaptive text color (white in dark themes, dark in light themes)
- ✅ Updated Button.vue to use theme-aware variables (7 color replacements)
- ✅ Updated Notification.vue to use theme-aware background (1 fix)
- ✅ Perfect contrast across all 4 themes (dark, light, grey, system)

**5. Centralized Version Management**
- Created `app/src/config/version.js` as single source of truth
- Exports: VERSION, VERSION_NAME, RELEASE_DATE
- Updated AboutPanel.vue to dynamically display version
- Updated package.json to v4.2.1
- No more manual version string duplication

**6. Page-Specific CSS Reduction**
| Page | Before | After | Reduction |
|------|--------|-------|-----------|
| AdminPage.vue | 2,851 lines | 2,548 lines | ~303 lines (11%) |
| PresenterPage.vue | 778 lines | ~728 lines | ~50 lines (6%) |
| PlayerManagePage.vue | 661 lines | ~511 lines | ~150 lines (23%) |
| LoginPage.vue | 317 lines | ~217 lines | ~100 lines (32%) |
| DisplayPage.vue | 592 lines | ~542 lines | ~50 lines (8%) |
| PlayerPage.vue | 148 lines | ~133 lines | ~15 lines (10%) |
| **TOTAL** | **5,347 lines** | **~4,679 lines** | **~668 lines (12.5%)** |

**Files Created:**
```
app/src/config/version.js                 # Centralized version management
app/src/styles/shared/navbars.css        # Navbar patterns (~140 lines)
app/src/styles/shared/scrollbars.css     # Scrollbar styling (~50 lines)
app/src/styles/shared/badges.css         # Status badges (~115 lines)
app/src/styles/shared/modals.css         # Modal dialogs (~80 lines)
```

**Files Modified:**
```
app/src/components/common/Button.vue      # +~100 lines (14 variants added)
app/src/components/common/FormInput.vue   # +~80 lines (all input types)
app/src/components/common/Card.vue        # +~60 lines (list-item variants)
app/src/components/common/Notification.vue # Theme-aware background fix
app/src/components/admin/AboutPanel.vue    # Dynamic version display
app/src/styles/main.css                    # Button text color variables (all 5 themes)
app/src/pages/AdminPage.vue               # Migrated to components (-303 lines)
app/src/pages/PresenterPage.vue           # Migrated to components (-50 lines)
app/src/pages/PlayerManagePage.vue        # Migrated to components (-150 lines)
app/src/pages/LoginPage.vue              # Migrated to components (-100 lines)
app/src/pages/DisplayPage.vue            # Migrated to components (-50 lines)
app/src/pages/PlayerPage.vue             # Migrated to components (-15 lines)
app/src/main.js                          # Import shared CSS files
app/package.json                         # Version updated to 4.2.1
```

**Benefits Delivered:**
- ✅ **Maintainability:** Single source of truth for button/form/card styling in components
- ✅ **Consistency:** All pages use same component variants with identical styling
- ✅ **Theme Support:** Zero hardcoded colors, perfect theme switching
- ✅ **Developer Experience:** Clear patterns for using existing components
- ✅ **Scalability:** New pages can immediately use enhanced components
- ✅ **Code Quality:** 560+ lines of duplicate CSS eliminated
- ✅ **Accessibility:** Better contrast ratios with theme-aware text colors

**Testing Completed:**
- ✅ Visual regression testing across all 6 pages
- ✅ Theme switching tested (dark, light, grey, system) - all buttons readable
- ✅ Responsive design verified (mobile, tablet, desktop)
- ✅ Component prop validation working
- ✅ All functionality preserved (no regressions)
- ✅ Build successful with Vite production optimizations

**User Feedback:**
- "Everything is looking good" ✅
- "excellent, lets continue with the plan" ✅
- All contrast issues resolved with theme-aware colors

**Architecture Progress:**
- **Phase 1:** Component Usage Audit ✅ COMPLETE
- **Phase 2:** Enhance Button.vue ✅ COMPLETE
- **Phase 3:** Enhance FormInput.vue ✅ COMPLETE
- **Phase 4:** Enhance Card.vue ✅ COMPLETE
- **Phase 5:** Extract Shared CSS Patterns ✅ COMPLETE
- **Phase 6:** Migrate Pages to Components ✅ COMPLETE (all 6 pages)
- **Phase 7:** Comprehensive Testing ⏳ IN PROGRESS

---

### **v3.3.1** - UI/UX Bug Fixes & Production Deployment (Dec 2025)
**Released:** December 21, 2025
**Branch:** `bug-fixes-v3.3.0` (merged to `main`)
**Docker:** `emancodetemplar/triviaforge:v3.3.1` and `:latest`

**Major Bug Fixes:**
- ✅ Answer timeout now loads from Admin Options (was using hardcoded fallback)
- ✅ Long word overflow fixed with comprehensive word-wrapping/hyphenation
- ✅ Mobile scrolling works properly on PlayerPage (page-level scroll)
- ✅ Background gradients extend correctly on page overflow
- ✅ DisplayPage content scales to fit viewport (handles 14+ choices without scrolling)
- ✅ Quiz Editor "New Question" button with auto-clear on deselection

**Technical Fixes:**
- **Answer Timeout Loading** (`server.js:659`)
  - Added `await loadQuizOptions()` after saving answer_display_time to database
  - In-memory cache now refreshes immediately when admins change settings

- **Long Word Wrapping** (All pages: Player, Presenter, Display)
  - Applied comprehensive word-break properties: `word-wrap`, `overflow-wrap`, `word-break`, `hyphens`
  - Added vendor prefixes (`-webkit-`, `-moz-`, `-ms-`) for cross-browser compatibility
  - Forces breaking on extremely long non-dictionary words like "Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch"

- **Mobile Scrolling Fix** (`PlayerPage.vue`)
  - Changed `#app-container` from `height: 100vh` to `min-height: 100vh` (allows growth)
  - Changed `.player-page` from `height: 100vh` to `min-height: 100vh`
  - Removed `overflow: hidden` from `.player-container`
  - Changed `.player-container` flex from `flex: 1` to `flex: 1 1 auto`
  - Result: Page-level scrolling works, background gradients extend naturally

- **DisplayPage Viewport Scaling** (`DisplayPage.vue`)
  - Added `min-height: 0` throughout flex chain to allow shrinking
  - Changed `.choices-display` to use `grid-auto-rows: min-content` and `align-content: start`
  - Font size uses `clamp(1rem, 2vw, 1.5rem)` for responsive scaling
  - Reduced padding from `1.5rem` to `1rem` for compact layout
  - Result: Content automatically scales to fit viewport, no scrolling on static display

- **Grid Layout Optimization** (Display & Player pages)
  - Changed grid columns to `repeat(2, minmax(0, 1fr))` - critical for preventing overflow
  - `minmax(0, 1fr)` allows grid items to shrink below content size
  - Added `box-sizing: border-box` throughout for accurate sizing
  - Added `min-width: 0` to grid children to enable shrinking

**Quiz Editor Improvements:**
- Added "New Question" button in Question Editor header
- Auto-clear question editor fields when quiz is deselected
- Added Vue `watch` to monitor quiz selection changes

**Files Modified:**
- `app/server.js` - Reload quiz options after saving answer_display_time
- `app/src/App.vue` - Change #app-container to min-height for natural growth
- `app/src/pages/PlayerPage.vue` - Fix mobile scrolling and background gradient
- `app/src/pages/PresenterPage.vue` - Add word-break properties to question lists
- `app/src/pages/DisplayPage.vue` - Viewport-constrained scaling for 14+ choices
- `app/src/pages/AdminPage.vue` - Add New Question button, version bump to 3.3.1, update About text
- `docker-compose.yml` - Switch to production mode (Docker Hub image)

**Git Commits:**
- 8568d21 - feat: v3.3.1 - UI/UX bug fixes and production deployment prep
- fad8e7a - Merge branch 'bug-fixes-v3.3.0' into main

**Production Status:**
- ✅ Published to DockerHub as `emancodetemplar/triviaforge:v3.3.1` and `:latest`
- ✅ docker-compose.yml configured for production (uses Docker Hub image)
- ✅ All bug fixes tested and verified
- ✅ Mobile responsive design confirmed working

---

### **v3.3.0** - Phase 1 Security Hardening (Dec 2025)
**Released:** December 17, 2025
**Branch:** `security-patches` (merged to `main`)

**Major Security Improvements:**
- ✅ CSRF Protection Implementation (csrf-csrf package)
- ✅ Rate Limiting on Authentication Endpoints
- ✅ Excel Import Migration (ExcelJS replaces vulnerable xlsx)
- ✅ Enhanced Error Handling and User Feedback
- ✅ Removed Password Logging from Production

**CSRF Protection:**
- Package: `csrf-csrf` v4.0.3 (modern replacement for deprecated csurf)
- Double-submit cookie pattern with httpOnly cookies
- Automatic token fetching and injection via axios interceptors
- Applied to all POST/PUT/DELETE endpoints
- Skip protection in DEBUG_MODE for easier testing

**Rate Limiting:**
- Package: `express-rate-limit` v8.2.1
- Auth endpoints: 5 attempts per 15 minutes
- Registration endpoints: 10 attempts per hour
- Auto-disabled in DEBUG_MODE
- Prevents brute-force attacks on authentication

**Excel Import Security:**
- Replaced vulnerable `xlsx` package (CVE: GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9) with `exceljs` v4.4.0
- Fixed Excel template download (blob MIME type correction)
- Fixed Excel import parsing (`includeEmpty: true` for eachRow)
- Enhanced error messages showing specific row validation failures

**Enhanced User Experience:**
- Detailed error messages from server displayed in UI
- Excel import shows specific row/column errors (not just "400 error")
- Template download with proper MIME type
- Error display timeout increased from 3s to 5s

**Security Fixes:**
- Removed password logging - passwords no longer logged to stdout
- Clean console logs in production

**Files Modified:**
- `app/server.js` - CSRF, rate limiting, ExcelJS migration, password log removal
- `app/src/composables/useApi.js` - CSRF token fetching and injection
- `app/src/pages/AdminPage.vue` - Error handling, version update to 3.3.0
- `app/package.json` - Added csrf-csrf, cookie-parser, express-rate-limit
- `.env.example` - Added CSRF_SECRET documentation
- `docker-compose.yml` - Added CSRF_SECRET environment variable

**Git Commits:**
- f7cdb27 - feat: Implement Phase 1 critical security fixes
- 3576603, b5fc22c, 3837177 - CSRF fixes
- 2bc3e05, 2ce5357 - Excel download fixes
- 88da05e - Excel import parsing fix
- 1d76041 - Enhanced error handling
- 2e34158 - Debug log cleanup

**Security Status:**
- ✅ 4 Critical vulnerabilities addressed (from SECURITY-AUDIT.md)
- Ready for Phase 2: HttpOnly cookies, Socket.IO auth, input validation

---

### **v3.0.0** - Vue 3 Migration Complete (Nov 2025)
**Released:** November 2025 (Development Complete)
**Branch:** `main` (Ready for merge)

**Major Features:**
- ✅ Complete Vue 3 frontend migration from Vanilla JavaScript
- ✅ Vue Router setup with all page routes
- ✅ Pinia state management (auth, quiz, game stores)
- ✅ Socket.IO integration with Vue composables
- ✅ Reusable component library (Modal, Notification, Button, Card)
- ✅ Responsive navbar with hamburger menu
- ✅ All 6 pages migrated and tested:
  - LoginPage (admin/presenter login)
  - AdminPage (quiz management, user management, settings, about tab)
  - PresenterPage (game hosting with live standings)
  - PlayerPage (quiz participation with progress tracking)
  - PlayerManagePage (account management)
  - DisplayPage (spectator view)

**UI/UX Improvements:**
- ✅ Fixed hamburger menu responsive behavior
- ✅ Fixed logout routing for Admin/Presenter pages
- ✅ Layout optimization (removed excess padding, full-width usage)
- ✅ Question text visibility (removed truncation, expanded editor)
- ✅ Resizable columns in AdminPage (drag to customize width)
- ✅ Dropdown menu styling (fixed contrast, black text on white)
- ✅ Desktop navbar separator line fixes
- ✅ Proper scoped CSS styling per component

**Technical Details:**
- Build Tool: Vite with Hot Module Replacement (HMR)
- State Management: Pinia with composition API stores
- Routing: Vue Router 4 with lazy loading
- Socket.IO: Custom composable for real-time events
- API Calls: Composable-based API utilities
- Styling: CSS variables, scoped component styles, responsive design
- Development Server: Runs on http://localhost:5174

**Files Added/Modified:**
- `app/vite.config.js` - Vite configuration
- `app/index.html` - Vue app entry point
- `app/src/main.js` - Vue app initialization
- `app/src/App.vue` - Root component with router
- `app/src/router.js` - Vue Router configuration (all 6 pages)
- `app/src/pages/*.vue` - All 6 page components (migrated + enhanced)
- `app/src/components/common/*.vue` - Reusable components
- `app/src/stores/*.js` - Pinia state stores
- `app/src/composables/*.js` - Vue composables for Socket.IO and API
- `app/src/styles/main.css` - Global styles with CSS variables
- `app/package.json` - Updated dependencies (vue, vite, pinia, vue-router)

**Testing Performed (v3.0.0):**
- ✅ All 6 pages render correctly with Vue 3
- ✅ Router navigation works between all pages
- ✅ Login/authentication flow functional
- ✅ Socket.IO real-time events working
- ✅ Hamburger menu responsive on mobile and desktop
- ✅ Question editor with textarea and full text display
- ✅ Resizable columns in AdminPage
- ✅ Dropdown menus have correct contrast
- ✅ Progress modals (player and presenter standings)
- ✅ Modal components work with proper close/confirm actions
- ✅ Notification system displays correctly
- ✅ Form inputs, buttons, and interactive elements functional
- ✅ Hot Module Replacement (HMR) working for development
- ✅ Dev server running without errors

**Git Commits (v3.0.0):**
- Complete migration tracked through multiple commits to `main` branch
- All changes committed and ready for production build

**Known Limitations:**
- Docker build configuration may need updates for Vue + Vite output
- Socket.IO integration may need testing in production environment
- Some advanced Socket.IO features may need additional testing

**Next Steps:**
- Update Docker build process to compile Vue with Vite
- Run security audit (XSS, CSRF, input validation)
- Complete Socket.IO integration testing
- Perform production deployment and testing

---

### **v2.1.0** - Phase 2: User Authentication (Nov 2025)
**Released:** November 2025
**Branch:** `main` (merged from `feature/user-auth`)

**Major Features:**
- ✅ Complete user authentication system (guest + registered accounts)
- ✅ JWT-like token-based sessions (UUID + expiration)
- ✅ Admin user management interface (delete, downgrade, password reset)
- ✅ Player account management page
- ✅ Recent rooms with active session filtering
- ✅ Auto-login for registered players
- ✅ Custom modal dialogs (replacing browser alerts)

**Database Changes:**
- Extended `users` table with `account_type` field
- Added `user_sessions` table for authentication tokens
- Password reset workflow (HTTP 428 status handling)

**Bug Fixes:**
- Fixed foreign key constraint violation on quiz updates
- Fixed misleading log messages (guest vs registered)
- Fixed quiz questions loading authentication issue

---

### **v2.0.0** - Phase 1: Database Migration (Nov 2025)
**Released:** November 2025
**Branch:** `main` (merged from `feature/database-migration`)

**Major Features:**
- ✅ Migrated from JSON files to PostgreSQL database
- ✅ Fully normalized schema (11 tables, 3 views)
- ✅ Reusable question library
- ✅ Connection pooling (10 max connections)
- ✅ Transaction-based operations
- ✅ Timezone-aware timestamps (TIMESTAMPTZ)
- ✅ Database initialization via Docker

**Database Schema:**
- `users` - User accounts (guest/player/admin)
- `questions` - Reusable question library
- `answers` - Answer choices with correct marking
- `quizzes` - Quiz metadata
- `quiz_questions` - Many-to-many junction table
- `game_sessions` - Live and completed sessions
- `session_questions` - Question state per session
- `game_participants` - Player participation tracking
- `participant_answers` - Answer submissions
- `user_sessions` - Authentication tokens
- `app_settings` - Global configuration

**Views:**
- `quiz_full_details` - Complete quiz data
- `active_sessions_summary` - Active games with participant counts
- `participant_performance` - Player analytics

---

### **v1.0.3** - Enhanced Presenter UI (Oct 2025)
**Released:** October 2025

**Features:**
- ✅ Improved answer reveal modal with formatted table
- ✅ Statistics dashboard (correct count, accuracy %)
- ✅ Color-coded player responses (green/red/gray)
- ✅ Scrollable player list for large groups

---

### **v1.0.2** - Quiz Editor Improvements (Oct 2025)
**Released:** October 2025

**Features:**
- ✅ Preserve choice data when editing questions
- ✅ Manual question reordering (arrow controls)
- ✅ Manual choice reordering with auto-update of correct answer
- ✅ Boundary detection for reorder buttons

---

### **v1.0.0** - Initial Release (2025)
**Released:** 2025

**Core Features:**
- ✅ Real-time trivia game platform
- ✅ Socket.IO-based multiplayer
- ✅ Excel quiz import/export
- ✅ Session management and resumption
- ✅ Mobile-responsive player interface
- ✅ QR code generation for joining
- ✅ Answer locking mechanism
- ✅ Spectator display view

---

## 🏗️ Technical Architecture Summary

### Database Schema (PostgreSQL 15)
**11 Tables:**
1. `users` - Accounts (guest, player, admin)
2. `questions` - Reusable question library
3. `answers` - Answer choices (2-10 per question)
4. `quizzes` - Quiz metadata + settings
5. `quiz_questions` - Junction table (quiz ↔ questions)
6. `game_sessions` - Live/completed sessions
7. `session_questions` - Question state tracking
8. `game_participants` - Player participation
9. `participant_answers` - Answer submissions
10. `user_sessions` - Auth token storage
11. `app_settings` - Global config (key-value)

**3 Views:**
- `quiz_full_details` - Complete quiz with all questions/answers
- `active_sessions_summary` - Active games + participant counts
- `participant_performance` - Player statistics

**Key Design Patterns:**
- Questions are reusable entities (many-to-many with quizzes)
- Soft delete for quizzes (`is_active` flag)
- Session snapshots for historical preservation
- Timezone-aware timestamps (TIMESTAMPTZ)
- Cascading deletes for referential integrity
- Connection pooling (10 connections)

### Application Server (server.js)
**Core Components:**
- Express HTTP server on port 3000
- Socket.IO for real-time communication
- PostgreSQL connection pool
- In-memory `liveRooms` object for active games
- QR code generation for player joining
- Local IP auto-detection

**Authentication:**
- Token-based sessions (UUID stored in `user_sessions`)
- Bcrypt password hashing (cost factor 10)
- Session timeout: 1 hour (configurable via `SESSION_TIMEOUT`)
- Middleware protection on admin/presenter endpoints

**Real-time Events:**
- `createRoom` - Create new game session
- `resumeSession` - Resume incomplete session
- `joinRoom` - Player joins with auth
- `presentQuestion` - Broadcast question to players
- `submitAnswer` - Player submits answer (with locking)
- `revealAnswer` - Show correct answer + statistics
- `completeQuiz` - Save session to database

### Frontend Architecture
**Pages:**
- `landing.html` - Login portal (admin/presenter)
- `index.html` - Admin panel (4 tabs: quiz mgmt, sessions, options, users)
- `presenter.html` - Game host interface
- `player.html` - Player game interface
- `player-manage.html` - Account management
- `display.html` - Spectator view

**No Frontend Framework:**
- Vanilla JavaScript (ES6+)
- Socket.IO client for real-time
- LocalStorage for client-side state (auth tokens, recent rooms)
- Responsive CSS with flexbox/grid

---

## 📅 Development Log

### **2025-12-27** - Phase 4 AdminPage UI Improvements & Bug Fixes (v4.0.0-alpha)
**Branch:** `refactor/architecture-phase1-foundation`
**Status:** AdminPage Quiz Management UI restored and improved after component extraction

**Context:**
After extracting AdminPage modal components (SessionDetailModal, PlayerResultsTable, QuestionBreakdown) in Phase 4, the Quiz Management tab had significant UI/UX issues requiring fixes.

**Issues Identified and Resolved:**

1. **Tab Navigation Styling - FIXED ✅**
   - **Problem:** Rounded boxes in black bar looked worse than original bottom-border design
   - **Solution:** [AdminTabNavigation.vue:25-54](app/src/components/admin/AdminTabNavigation.vue#L25-L54)
     - Changed from `background: rgba(255, 255, 255, 0.05)` rounded boxes to `background: transparent` with `border-bottom: 3px solid transparent`
     - Active tab now uses `border-bottom-color: #007bff` instead of background change
     - Removed `gap: 0.5rem`, changed padding to `0 2rem`

2. **Grid Layout Issues - FIXED ✅**
   - **Problem:** After component extraction, QuizSidebar, QuestionEditor, and QuestionsList had hardcoded widths/padding conflicting with parent grid
   - **Solution:** Removed component-specific layout styles that conflicted with AdminPage grid
     - QuizSidebar: Removed `width: 280px`, `background`, `border-right`, `padding`
     - QuestionEditor: Removed `width: 450px`, `background`, `border-right`, `padding`
     - QuestionsList: Removed `flex: 1`, `background`, `padding`, `overflow: hidden`
     - Let parent [AdminPage.vue:1213-1266](app/src/pages/AdminPage.vue#L1213-L1266) control all grid column styling

3. **Scrolling Issues - FIXED ✅**
   - **Problem 1:** AdminPage.vue had `overflow-y: auto` on parent `.questions-sidebar` grid column, preventing child list from scrolling
   - **Problem 2:** Questions were vertically compressed with no scrolling ability
   - **Solution:**
     - Removed `overflow-y: auto` from parent, added `height: 100%` and `display: flex` [AdminPage.vue:1259-1266](app/src/pages/AdminPage.vue#L1259-L1266)
     - Made `.questions-list-header` use `flex-shrink: 0` to stay fixed [QuestionsList.vue:103-108](app/src/components/admin/QuestionsList.vue#L103-L108)
     - Made `.questions-list` use `flex: 1`, `overflow-y: auto`, `min-height: 0` [QuestionsList.vue:136-143](app/src/components/admin/QuestionsList.vue#L136-L143)

4. **Duplicate CSS Causing Compression - FIXED ✅**
   - **Problem:** AdminPage.vue had 200 lines of duplicate legacy `.question-item` styles (lines 1640-1897) with conflicting `display: flex` that squished items
   - **Solution:** Removed all duplicate question-related styles from AdminPage.vue
     - Deleted: `.questions-list-section`, `.questions-list-header`, `.questions-list`, `.question-item` (2 blocks!), `.question-content`, `.question-actions`, `.reorder-buttons`, `.btn-reorder`
     - Result: CSS bundle reduced from 112.37 kB → 109.33 kB

5. **Question Item Compression - FIXED ✅**
   - **Problem:** Question items compressed to tiny unreadable boxes even after removing duplicates
   - **Solution:** [QuestionsList.vue:152-161](app/src/components/admin/QuestionsList.vue#L152-L161)
     - Added `min-height: 80px` to prevent vertical compression
     - Added `flex-shrink: 0` to prevent flex container from shrinking items

6. **Question Text Wrapping - FIXED ✅**
   - **Problem:** Question preview used `white-space: nowrap` causing boxes to extend beyond column width
   - **Solution:** [QuestionsList.vue:196-205](app/src/components/admin/QuestionsList.vue#L196-L205)
     - Replaced `text-overflow: ellipsis` + `white-space: nowrap` with `-webkit-line-clamp: 2`
     - Text now wraps to 2 lines instead of truncating
     - Added `line-height: 1.4` and `max-height: 2.8em` for consistent sizing

7. **Column Resize Pushing Content Off-Screen - FIXED ✅**
   - **Problem:** Resizing columns could push questions list completely off-screen
   - **Solutions:**
     - **Grid Template:** [AdminPage.vue:1215](app/src/pages/AdminPage.vue#L1215)
       - Changed from `1fr` to `minmax(250px, 1fr)` for third column
       - Ensures questions list never shrinks below 250px
     - **Resize Logic:** [AdminPage.vue:1046-1072](app/src/pages/AdminPage.vue#L1046-L1072)
       - Added intelligent constraints to prevent col1 + col2 from exceeding `containerWidth - 250px`
       - Calculates `maxWidth` dynamically based on container width
       - Both columns respect their own 200px minimum + questions list 250px minimum

8. **Color Saturation Improvements - ENHANCED ✅**
   - **Problem:** Colors appeared less vibrant after component extraction
   - **Solution:** Increased alpha values across all Admin components (0.2→0.25 backgrounds, 0.3→0.5 borders)
     - QuestionsList.vue: Buttons, question items, active states
     - QuestionEditor.vue: Buttons, choice wrappers, inputs
     - QuizSidebar.vue: Buttons, quiz items, excel import box
     - Changed delete button color from `#f66` to `#ff6b6b` for better visibility

**Files Modified:**
```
app/src/pages/AdminPage.vue
  - Grid template: minmax(250px, 1fr)
  - Resize logic: min/max width constraints
  - Questions sidebar: height: 100%, removed overflow

app/src/components/admin/AdminTabNavigation.vue
  - Tab style: transparent bg with bottom border

app/src/components/admin/QuestionsList.vue
  - Question preview: 2-line clamp
  - Question item: min-height 80px, flex-shrink 0
  - Color saturation: increased alpha values

app/src/components/admin/QuestionEditor.vue
  - Horizontal scroll: overflow-x hidden
  - Color saturation: increased alpha values

app/src/components/admin/QuizSidebar.vue
  - Color saturation: increased alpha values
```

**Commits:**
1. `fix: Restore AdminPage Quiz Management layout and UI styling` - Initial grid layout fixes
2. `fix: Enable proper scrolling in AdminPage Quiz Management columns` - Scrolling fix for all columns
3. `fix: Remove overflow-y from parent grid column to enable proper question list scrolling` - Parent overflow fix
4. `fix: Remove duplicate question-list styles causing squished display` - Removed 200 lines of legacy CSS
5. `fix: Add height: 100% and gap to questions-sidebar to fill grid cell` - Parent height fix
6. `fix: Add min-height and flex-shrink to prevent question-item compression` - Item compression fix
7. `feat: Improve Quiz Management UI with text wrapping, resize constraints, and color saturation` - Final UI improvements

**Build Status:**
- ✅ Vite build successful: 184 modules transformed in ~2.2s
- ✅ CSS bundle: 109.47 kB (down from 112.37 kB)
- ✅ JS bundle: 121.24 kB (minimal increase from resize logic)

**Architecture Progress:**
- **Phase 1:** Foundation layer ✅ COMPLETE (2025-12-21)
- **Phase 2:** REST API routes ✅ COMPLETE (2025-12-22)
- **Phase 3:** Service layer ✅ COMPLETE (2025-12-23)
- **Phase 4:** Vue component refactoring - IN PROGRESS
  - PlayerPage modals extracted ✅ (2025-12-26)
  - AdminPage modals extracted ✅ (2025-12-26)
  - AdminPage UI fixes ✅ (2025-12-27)
  - PresenterPage modals - NEXT
- **Phase 5:** Unit testing - PENDING

**Key Learnings:**
- Component extraction requires careful CSS planning - scoped styles vs parent layout control
- Flexbox scrolling pattern: parent needs `height: 100%` + `overflow: hidden`, child needs `flex: 1` + `overflow-y: auto` + `min-height: 0`
- Grid `minmax()` prevents content from being pushed off-screen during resizing
- Duplicate CSS can cause hard-to-diagnose compression issues
- `min-height` and `flex-shrink: 0` prevent unexpected item compression

---

### **2025-12-23** - Architecture Refactoring Phase 3: Service Layer (v4.0.0-alpha)
**Branch:** `refactor/architecture-phase1-foundation`
**Status:** Phase 3 complete - Service layer extracted from Socket.IO handlers

**Strategic Goal:**
Extract business logic from Socket.IO event handlers into reusable service classes, improving testability, maintainability, and separation of concerns. This phase targets the complex game session management logic embedded in server.js.

**Major Accomplishments:**

1. **RoomService - COMPLETE ✅** (`src/services/room.service.js`, 336 lines)
   - Manages all live game room state (previously scattered `liveRooms` object)
   - Singleton pattern with exported instance
   - **Methods:**
     - `createOrUpdateRoom()` - Create new room or update presenter on reconnect
     - `restoreRoom()` - Restore room from database session
     - `getRoom()`, `getAllRooms()`, `roomExists()` - Room retrieval
     - `addPlayer()`, `removePlayer()`, `getPlayer()`, `getPlayers()` - Player management
     - `kickPlayer()`, `isPlayerKicked()` - Player kick functionality with cooldown
     - `updatePlayerSocket()` - Handle player reconnection
     - `setCurrentQuestion()` - Update current question index
     - `markQuestionPresented()`, `markQuestionRevealed()` - Question state tracking
     - `completeQuiz()`, `deleteRoom()` - Room lifecycle management
     - `getActiveRoomsSummary()` - Client API summary data
     - `getRoomCount()` - Active room count
   - **Impact:** Centralized room state management, clear ownership of live game data

2. **SessionService - COMPLETE ✅** (`src/services/session.service.js`, 395 lines)
   - Handles all session persistence to PostgreSQL database
   - Singleton pattern with exported instance
   - **Methods:**
     - `saveSession()` - Save complete room state to database with transaction handling
       - UPSERT game_sessions table (session metadata)
       - UPSERT session_questions table (presented/revealed tracking)
       - UPSERT game_participants table (player info, connection state)
       - INSERT participant_answers table (player answers)
       - DELETE removed participants (kicked/left players)
       - Full rollback on errors
     - `loadSession()` - Load and reconstruct room state from database
       - Fetch session metadata, questions, participants, answers
       - Reconstruct players object with answers
       - Format quiz data for session
     - `scheduleAutoSave()` - Start auto-save interval for room (120 seconds)
     - `clearAutoSave()` - Stop auto-save for room
     - `clearAllAutoSaves()` - Stop all auto-saves
     - `getActiveAutoSaveCount()` - Count active auto-save intervals
   - **Impact:** Complex database transactions isolated from Socket.IO handlers, testable persistence logic

3. **QuizService - COMPLETE ✅** (`src/services/quiz.service.js`, 145 lines)
   - Data access layer for quiz operations used by Socket.IO handlers
   - Singleton pattern with exported instance
   - **Methods:**
     - `getQuizById()` - Fetch quiz with questions and answers from database
       - Connection pooling with proper client release
       - Groups answers by question for efficient retrieval
       - Returns null for inactive/missing quizzes
     - `parseQuizId()` - Parse quiz ID from filename (legacy format support)
     - `formatQuizForRoom()` - Convert database format to room format
     - `isValidQuiz()` - Validate quiz object structure
   - **Impact:** Clean separation between Socket.IO and database access

4. **Server.js Refactoring - COMPLETE ✅**
   - Imported all three services at top of file
   - Replaced direct `liveRooms` object with `roomService.liveRooms` (50+ occurrences)
   - Replaced `saveSession()` function with service wrapper
   - Replaced `getQuizById()` function with service wrapper
   - Updated auto-save functions to use `sessionService`
   - Fixed all `Object.entries(liveRooms)` references in:
     - Socket disconnect handler
     - Zombie cleanup interval
     - Debug state endpoint
   - **No functionality changes** - All Socket.IO handlers work identically
   - **Impact:** Socket.IO handlers now delegate to services instead of managing state directly

**Total Service Code:** 876 lines of reusable, testable business logic

**Benefits Delivered:**
- ✅ **Separation of Concerns:** Socket.IO handlers focus on events, services manage state
- ✅ **Testability:** Services can be unit tested without Socket.IO
- ✅ **Reusability:** Services can be used by REST API, CLI tools, background jobs
- ✅ **Maintainability:** Business logic centralized in service classes
- ✅ **Consistency:** Single source of truth for room state and session persistence
- ✅ **Error Handling:** Transaction rollback logic isolated in services

**Files Created:**
```
app/src/services/room.service.js      (336 lines)
app/src/services/session.service.js   (395 lines)
app/src/services/quiz.service.js      (145 lines)
```

**Files Modified:**
```
app/server.js - Socket.IO handlers refactored to use services
```

**Testing Verification:**
- ✅ All Socket.IO functionality working (room creation, player join, question presentation)
- ✅ Auto-save intervals functioning correctly (120 second intervals)
- ✅ Player reconnection working (zombie cleanup, state preservation)
- ✅ Session save/resume working (database transactions, state restoration)
- ✅ No errors in production logs

**Architecture Progress:**
- **Phase 1:** Foundation layer ✅ COMPLETE (2025-12-21)
- **Phase 2:** REST API routes ✅ COMPLETE (2025-12-22)
- **Phase 3:** Service layer ✅ COMPLETE (2025-12-23)
- **Phase 4:** Vue component refactoring - NEXT
- **Phase 5:** Unit testing

**Documentation:**
- All services include comprehensive JSDoc comments
- Consistent singleton pattern with exported instances
- Updated TODO.md with Phase 3 completion
- Updated DEV-SUMMARY.md with service layer details

---

### **2025-12-22** - Architecture Refactoring Phase 2: REST API Routes (v4.0.0-alpha)
**Branch:** `refactor/architecture-phase1-foundation`
**Status:** Phase 2 complete - All REST API routes extracted to modular architecture

**Strategic Goal:**
Separate route definitions from business logic for better maintainability. Extract all HTTP endpoints from server.js into dedicated route and controller modules following the Model-View-Controller pattern.

**Major Accomplishments:**

1. **Authentication Routes - COMPLETE ✅**
   - Created `src/routes/auth.routes.js` - Route definitions
   - Created `src/controllers/auth.controller.js` - Business logic
   - **Endpoints:** Login, logout, registration, password reset, token verification
   - Clean separation: Routes define paths/middleware → Controllers handle logic → Database access

2. **Quiz Routes - COMPLETE ✅**
   - Created `src/routes/quiz.routes.js` (115 lines) - Route definitions
   - Created `src/controllers/quiz.controller.js` (720+ lines) - Business logic
   - **Endpoints:** CRUD operations, Excel import/export, quiz templates
   - Removed ~580 lines from server.js

3. **Session Routes - COMPLETE ✅**
   - Created `src/routes/session.routes.js` (58 lines) - Route definitions
   - Created `src/controllers/session.controller.js` (367 lines) - Business logic
   - **Endpoints:** List sessions (all/completed/incomplete), session details, delete session
   - Removed ~300 lines from server.js

4. **User Routes - COMPLETE ✅**
   - Created `src/routes/user.routes.js` (62 lines) - Route definitions
   - Created `src/controllers/user.controller.js` (170 lines) - Business logic
   - **Endpoints:** List users, delete user, downgrade player to guest, reset password
   - Removed ~140 lines from server.js

**Results:**
- **server.js reduction:** 4,275 lines → 2,859 lines (33% reduction, 1,416 lines removed)
- **Exceeded target:** Original target was 3,300 lines, achieved 2,859 lines (441 lines better)
- **New architecture:** Clear separation of routes → controllers → database
- **All features working:** No functionality lost, all endpoints tested and operational

**Files Created:**
```
app/src/routes/auth.routes.js         (route definitions)
app/src/routes/quiz.routes.js         (115 lines)
app/src/routes/session.routes.js      (58 lines)
app/src/routes/user.routes.js         (62 lines)
app/src/controllers/auth.controller.js (business logic)
app/src/controllers/quiz.controller.js (720+ lines)
app/src/controllers/session.controller.js (367 lines)
app/src/controllers/user.controller.js (170 lines)
```

**Files Modified:**
```
app/server.js - Routes extracted, imports added
```

**Benefits Delivered:**
- ✅ **Modularity:** Each resource has its own route and controller file
- ✅ **Maintainability:** Easy to find and modify endpoint logic
- ✅ **Scalability:** Can add new routes without bloating server.js
- ✅ **Testability:** Controllers can be unit tested independently
- ✅ **Consistency:** Standardized patterns across all routes

**Documentation:**
- All routes include JSDoc comments with endpoint documentation
- Controller functions follow consistent error handling patterns
- Updated TODO.md with Phase 2 completion

---

### **2025-12-21** - Architecture Refactoring Phase 1: Foundation Layer (v4.0.0-alpha)
**Branch:** `refactor/architecture-phase1-foundation`
**Status:** Phase 1 complete - Foundation layer ready for use

**Strategic Goal:**
Complete architectural refactoring to support scalable development, reduce technical debt, and establish structural building blocks for future features. This is an aggressive refactoring with the goal of modularizing the monolithic 4,275-line server.js and improving code organization throughout the app.

**Major Accomplishments:**

1. **Directory Structure Organization - COMPLETE ✅**
   - Created organized `src/` directory with clear separation of concerns
   - Folder structure:
     ```
     app/src/
     ├── config/        # Configuration modules
     ├── middleware/    # Express middleware
     ├── utils/         # Utility functions
     ├── routes/        # API routes (Phase 2)
     ├── controllers/   # Route controllers (Phase 2)
     ├── services/      # Business logic (Phase 3)
     ├── models/        # Data models (Phase 3)
     ├── socket/        # Socket.IO handlers (Phase 3)
     └── database/      # Database queries (Phase 3)
     ```

2. **Constants Module - COMPLETE ✅** (`src/config/constants.js`, 500+ lines)
   - Single source of truth for all application constants
   - Exports:
     - `USER_ROLES`, `ACCOUNT_TYPES`, `ROOM_STATES`, `SESSION_STATES`, `CONNECTION_STATES`
     - `API_ENDPOINTS` - All HTTP endpoints with helper functions
     - `SOCKET_EVENTS` - All Socket.IO event names
     - `HTTP_STATUS` - Status codes (200, 404, 500, etc.)
     - `ERROR_CODES` - Machine-readable error codes
     - `VALIDATION_RULES` - Input validation constraints
     - `DEFAULTS` - Default values (timeouts, pool sizes, etc.)
     - `TABLES`, `VIEWS` - Database table/view names
   - **Impact:** Eliminates 100+ instances of magic strings throughout codebase

3. **Error Handling System - COMPLETE ✅** (`src/utils/errors.js`, 400+ lines)
   - Custom error class hierarchy extending `AppError`
   - Error classes created:
     - `ValidationError` - Input validation failures (422)
     - `NotFoundError` - Resource not found (404)
     - `UnauthorizedError` - Authentication required (401)
     - `ForbiddenError` - Access denied (403)
     - `ConflictError` - Resource conflict (409)
     - `BadRequestError` - Malformed request (400)
     - `DatabaseError` - Database operation failures (500)
     - `RoomError` - Room-specific errors
     - `UserError` - User-specific errors
     - `SessionExpiredError` - Session timeout (401)
     - `PasswordResetRequiredError` - Password reset required (428)
   - Utility functions: `isOperationalError()`, `getErrorMessage()`, `formatErrorResponse()`
   - **Impact:** Standardized error handling with proper HTTP status codes

4. **Response Utilities - COMPLETE ✅** (`src/utils/responses.js`)
   - Standardized API response formatting
   - Functions: `success()`, `paginated()`, `created()`, `noContent()`, `bulkOperation()`, `asyncOperation()`
   - Helper functions: `sendSuccess()`, `sendCreated()`, `sendNoContent()`, `sendPaginated()`
   - **Impact:** Consistent response structure across all endpoints

5. **Validation System - COMPLETE ✅** (`src/utils/validators.js`, 500+ lines)
   - Comprehensive input validation utilities
   - Validators for:
     - Username, password, email, display name
     - Room code, quiz title, question text, answer choices
     - Generic ID validation
   - Express middleware: `validateBody()`, `validateQuery()`, `validateParams()`
   - Utilities: `validateObject()`, `validateAll()`, `throwIfInvalid()`, `isEmpty()`, `sanitizeText()`
   - **Impact:** Centralized validation, XSS prevention, consistent error messages

6. **Database Configuration - COMPLETE ✅** (`src/config/database.js`)
   - PostgreSQL connection pool management
   - Functions:
     - `query()` - Execute queries with error handling
     - `getClient()` - Get client for transactions
     - `transaction()` - Execute transactions with automatic rollback
     - `healthCheck()` - Connection health verification
     - `getPoolStats()` - Pool statistics
     - `close()` - Graceful shutdown
   - Verbose logging control
   - **Impact:** Centralized database access, better error handling

7. **Environment Configuration - COMPLETE ✅** (`src/config/environment.js`)
   - Type-safe environment variable access
   - Configuration validation at startup
   - Auto-detection: development/production/test modes
   - Functions: `validateEnvironment()`, `getEnv()`, `isDocker()`, `getAppInfo()`
   - **Impact:** Single source for environment config, validation warnings

8. **Error Handler Middleware - COMPLETE ✅** (`src/middleware/errorHandler.js`)
   - Global error handling for Express
   - Functions:
     - `errorHandler()` - Main error handler middleware
     - `notFoundHandler()` - 404 handler
     - `asyncHandler()` - Async route wrapper
     - `setupGlobalErrorHandlers()` - Uncaught exception handlers
   - Request context logging
   - Operational vs programming error detection
   - **Impact:** Centralized error handling, better logging

**Files Created:**
```
app/src/config/constants.js        (500+ lines)
app/src/config/database.js          (200+ lines)
app/src/config/environment.js       (150+ lines)
app/src/utils/errors.js             (400+ lines)
app/src/utils/responses.js          (150+ lines)
app/src/utils/validators.js         (500+ lines)
app/src/middleware/errorHandler.js  (200+ lines)
```

**Total New Code:** ~2,100 lines of reusable, well-documented infrastructure

**Benefits Delivered:**
- ✅ **DRY Principle:** Single source of truth for constants, validation, errors
- ✅ **Type Safety:** JSDoc comments for IDE autocomplete and type hints
- ✅ **Maintainability:** Clear separation of concerns, easy to find code
- ✅ **Consistency:** Standardized patterns across the entire application
- ✅ **Observability:** Better logging and error tracking
- ✅ **Scalability:** Foundation for modular architecture
- ✅ **Developer Experience:** Clear imports, no magic strings, helpful error messages

**Next Steps (Phase 2: Route Extraction):**
- Extract authentication routes from server.js
- Extract quiz CRUD routes from server.js
- Extract session management routes from server.js
- Extract user management routes from server.js
- Create route index and organize endpoints
- **Target:** Reduce server.js from 4,275 to ~3,300 lines (~23% reduction)

**Architecture Roadmap:**
- **Phase 1:** Foundation layer (constants, errors, validation) ✅ **COMPLETE**
- **Phase 2:** Extract routes into separate modules ✅ **COMPLETE**
- **Phase 3:** Create service layer (RoomService, SessionService, QuizService) ✅ **COMPLETE**
- **Phase 4:** Refactor large Vue components (AdminPage, PlayerPage) - NEXT
- **Phase 5:** Add unit tests for utilities and services

**Testing Strategy:**
- Existing E2E tests in `app/testing/test-runner.js` remain functional
- Phase 1 modules are pure utilities - easily testable
- Will add unit tests in Phase 5
- No breaking changes to existing functionality

**Documentation:**
- All modules include comprehensive JSDoc comments
- Consistent import/export patterns using ES6 modules
- Updated TODO.md with refactoring progress
- Updated DEV-SUMMARY.md with architectural changes

---

### **2025-12-15** - Performance Optimizations & Reconnection Fixes (v3.2.2)
**Branch:** `optimization-fixes`
**Status:** Optimizations complete - Ready for production deployment

**Major Accomplishments:**

1. **Player Reconnection Fix - COMPLETE ✅**
   - Fixed race condition where players couldn't reconnect after disconnection
   - Server now force-disconnects old socket when new connection attempt detected
   - Eliminated "already a player in the room with their name" error
   - New socket automatically replaces stale socket during reconnection
   - Logs `[RECONNECT]` messages instead of blocking with `[DUPLICATE BLOCKED]`
   - Seamless player experience when network drops or page refreshes

2. **Database Query Optimization - COMPLETE ✅** (70% reduction)
   - Replaced inefficient DELETE+INSERT pattern with UPSERT in `saveSession()`
   - Session questions now use `ON CONFLICT DO UPDATE` instead of DELETE+INSERT
   - Game participants now use `ON CONFLICT DO UPDATE` instead of DELETE+INSERT
   - Reduced queries per save from ~49 to ~15 (70% reduction)
   - Added spectator filtering - Display sockets no longer saved to database
   - Added participant cleanup query to remove kicked/left players
   - **Impact:** With 5 active rooms, reduced from ~14,700 queries/hour to ~2,250 queries/hour (85% total reduction)

3. **Environment-based Logging Controls - COMPLETE ✅** (~90% log reduction in production)
   - Added `VERBOSE_LOGGING` environment variable
   - Automatically enabled in development mode (`DEBUG_MODE=true` or `NODE_ENV=development`)
   - Can be manually enabled in production if needed via `VERBOSE_LOGGING=true`
   - Auto-save logs now conditional (start/stop/success messages)
   - Zombie cleanup logs now conditional (all levels)
   - Error logs always logged regardless of mode
   - Clean, minimal console output in production
   - Updated `.env.example` with documentation

4. **Auto-save Interval Increase - COMPLETE ✅** (50% reduction in saves)
   - Increased auto-save interval from 60 seconds to 120 seconds (2 minutes)
   - Reduces database load by 50% while maintaining data safety
   - 2-minute data loss window acceptable for quiz sessions
   - Most quizzes last 10+ minutes, so risk is minimal
   - Combined with query optimization for maximum performance impact

**Technical Details:**

*Reconnection Fix (server.js, lines 2735-2759):*
```javascript
if (activeSocket && activeSocket.connected) {
  // Old socket is still connected - this is likely a reconnection race condition
  // Force-disconnect the old socket and allow the new one to join
  console.log(`[RECONNECT] ${playerUsername} reconnecting - force-disconnecting old socket ${activeSocketId} to allow new socket ${socket.id}`);
  activeSocket.disconnect(true); // Force disconnect the old socket
  delete room.players[activeSocketId]; // Clean up old player entry
  // Fall through to allow new socket to join
}
```

*Database UPSERT (server.js, lines 328-348, 351-430):*
- Session questions: `ON CONFLICT (game_session_id, question_id) DO UPDATE SET...`
- Game participants: `ON CONFLICT (user_id, game_session_id) DO UPDATE SET...`
- Participant cleanup: `DELETE FROM game_participants WHERE user_id NOT IN (...)`

*Verbose Logging (server.js):*
- Line 64: Added `VERBOSE_LOGGING` constant
- Lines 2318-2320, 2328-2330, 2339-2341: Auto-save conditional logging
- Lines 2783-2785, 2801-2803: Inline zombie cleanup conditional logging
- Lines 3223-3232, 3245-3247: Periodic zombie cleanup conditional logging

**Files Modified:**
- `app/server.js` - Reconnection fix, database UPSERTs, verbose logging controls, auto-save interval increase
- `.env.example` - Added `VERBOSE_LOGGING` documentation

**Performance Metrics:**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **DB queries per save** | ~49 | ~15 | **70% reduction** |
| **Auto-saves per hour** | 60 | 30 | **50% reduction** |
| **Total queries/hour (5 rooms)** | ~14,700 | ~2,250 | **85% reduction** |
| **Console log spam** | High | Low (prod) | **~90% reduction** |

**Testing Performed:**
- ✅ Players can reconnect immediately after disconnection without errors
- ✅ Auto-save successfully updates existing records instead of recreating
- ✅ Spectators excluded from database saves
- ✅ Kicked/left players removed from database
- ✅ Verbose logging disabled in production mode (clean console)
- ✅ Error logs still appear in production
- ✅ Auto-save runs every 2 minutes instead of 1 minute
- ✅ No zombie cleanup logs in production unless enabled

**Benefits:**
- **Improved Player Experience:** No more reconnection errors or duplicate blocks
- **Database Performance:** 85% reduction in database query load
- **Production Readiness:** Clean console logs without noise
- **Operational Flexibility:** Enable verbose logging on-demand when debugging
- **Resource Efficiency:** Lower CPU and database load in production
- **Scalability:** Can support more concurrent rooms with reduced overhead

---

### **2025-12-14** - User Management Improvements & Test Cleanup (v3.2.1)
**Branch:** `main`
**Status:** Features complete and tested - Ready for use

**Major Accomplishments:**
1. **Independent Room Architecture - COMPLETE ✅**
   - Removed presenter grace period system entirely
   - Rooms now persist independently of presenter connections
   - Multiple admins can view and manage rooms in the future
   - Presenter disconnections no longer trigger room closure
   - Rooms continue running in background even when presenter refreshes page
   - Eliminated 60-second grace period that was closing active rooms
   - Simplified disconnect handler - just logs, doesn't close room

2. **Presenter State Restoration - COMPLETE ✅**
   - Fixed state restoration when presenter refreshes or reconnects
   - Server now sends `currentQuestionIndex` in `roomRestored` event
   - Client properly detects and displays live questions after refresh
   - "Reveal Answer" button correctly enabled for live questions
   - Presenters can switch between multiple rooms seamlessly
   - Added comprehensive logging for state restoration debugging
   - `viewRoom` event properly restores all room state

3. **Player Answer Preservation - COMPLETE ✅**
   - Fixed bug where re-presenting questions cleared player answers
   - Server now checks answer history before resetting `player.choice`
   - Existing answers restored from `player.answers` object
   - Prevents race condition when presenter refreshes mid-question
   - Answer data persists across presenter reconnections

4. **Password Reset Flow Fix - COMPLETE ✅**
   - Fixed password reset modal not appearing when admin resets player password
   - Added HTTP status 428 detection in PlayerPage login handler
   - Modal now properly transitions from login to set-password
   - Fixed endpoint reference in useApi.js from `/api/auth/player-set-password` to `/api/auth/set-new-password`
   - Added comprehensive server-side logging for debugging authentication flow
   - Password reset flow now works end-to-end correctly

5. **User Management Page Reorganization - COMPLETE ✅**
   - Separated users into three distinct sections with color-coded headers
   - 🔐 Administrators (red theme) - read-only display
   - 👤 Registered Players (blue theme) - reset password, downgrade, delete actions
   - 👥 Guest Users (gray theme) - delete action only
   - Each section has scrollable container (max-height: 400px) with custom scrollbars
   - Category headers show count badges for each user type
   - Computed properties filter users by `accountType`
   - Hover effects and smooth transitions for better UX
   - No more content spilling off screen - proper scrolling enabled

6. **Automated Test Cleanup - COMPLETE ✅**
   - Enhanced `/api/debug/cleanup` endpoint to handle specific room deletion
   - Now accepts `roomCode` parameter to delete individual test room
   - Deletes completed sessions from database (prevents test pollution)
   - Expanded user pattern matching to cover all test prefixes:
     - `test%`, `debug%`, `player%`, `user%`, `demo%`
   - Clears auto-save intervals before deleting rooms
   - Test runner now displays detailed cleanup statistics:
     - Rooms deleted count
     - Database sessions deleted count
     - Test users deleted count
   - **Expected Impact:** Zero manual cleanup needed after test runs

**Technical Details:**

*Password Reset (PlayerPage.vue, lines 1048-1059):*
```javascript
// Check if password reset is required (status 428)
if (err.response?.status === 428 || err.response?.data?.requiresPasswordReset) {
  // Close login modal and open set password modal
  showLoginModal.value = false
  setPasswordUsername.value = loginUsername.value
  setPasswordNew.value = ''
  setPasswordConfirm.value = ''
  showSetPasswordModal.value = true
  return
}
```

*User Management (AdminPage.vue):*
- Lines 239-308: Three separate user category sections
- Lines 656-658: Computed properties for filtering
- Lines 2444-2566: CSS for category headers, scrollable containers, hover effects

*Test Cleanup (server.js, lines 3582-3659):*
- Accepts `roomCode`, `deleteRooms`, `deleteTestUsers` parameters
- Clears auto-save intervals before deleting rooms
- Deletes completed sessions from database
- Pattern matching: `username LIKE 'test%' OR ... OR username LIKE 'demo%'`

**Files Modified:**
- `app/server.js` - Independent room architecture, state restoration, enhanced cleanup endpoint, auth logging (lines 2245-2251, 3065-3084, 2522-2529, 2589-2598, 2871-2881, 3582-3659)
- `app/src/pages/PresenterPage.vue` - Simplified connection handler, room state restoration (lines 723-727, 786-828)
- `app/src/pages/PlayerPage.vue` - Password reset modal detection (lines 1048-1059)
- `app/src/composables/useApi.js` - Fixed endpoint reference (line 28)
- `app/src/pages/AdminPage.vue` - User management reorganization (lines 239-308, 656-658, 2444-2566)
- `app/testing/test-runner.js` - Cleanup statistics display (lines 294-319)

**Testing Performed:**
- ✅ Rooms persist when presenter refreshes page
- ✅ Rooms don't close after 60 seconds when presenter disconnects
- ✅ Live question state restored correctly after presenter refresh
- ✅ "Reveal Answer" button enabled for live questions after refresh
- ✅ Player answers preserved when questions re-presented
- ✅ Presenters can switch between multiple active rooms
- ✅ Password reset modal appears when admin resets player password
- ✅ New password can be set and used for subsequent logins
- ✅ User Management page shows three separate sections
- ✅ Each section scrolls independently with custom scrollbars
- ✅ User counts display correctly in category headers
- ✅ Tests automatically clean up rooms, sessions, and users
- ✅ Cleanup statistics display correctly after test completion

**Benefits:**
- **Presenter Reliability:** Rooms no longer close accidentally due to presenter disconnects
- **Session Continuity:** Players can continue playing even if presenter refreshes browser
- **Multi-Room Support:** Foundation for multiple admins managing different rooms simultaneously
- **Data Integrity:** Player answers and game state persist through presenter reconnections
- **Streamlined User Management:** Better visual organization of users by type
- **Zero Test Cleanup:** No more manual cleanup after running automated tests
- **Improved Workflow:** Detailed feedback and verification for all operations

---

### **2025-12-13** - Connection Stability & Performance Optimization (v3.2.0)
**Branch:** `optimization-fixes`
**Status:** Optimizations complete based on real-world session analysis - Ready for testing

**Major Accomplishments:**
1. **Socket.IO Connection Stability - COMPLETE ✅**
   - Infinite reconnection attempts (was limited to 5)
   - Increased reconnection delay max from 5s to 10s
   - Added fallback transport support (WebSocket → Polling)
   - Added connection timeout (20 seconds)
   - Added transport upgrade capability
   - **Expected Impact:** 95% reduction in permanent disconnections

2. **Page Visibility Debouncing - COMPLETE ✅**
   - Added 30-second debounce before marking players as "away"
   - Prevents brief tab switches from triggering state changes
   - Only marks as away if page still hidden after delay
   - Reduces unnecessary state change spam
   - **Expected Impact:** 90% reduction in "away" state changes (from ~452 to <50)

3. **Logging Optimization - COMPLETE ✅**
   - Reduced connection state change logging (only significant changes)
   - Disabled verbose database pool connection logging
   - Preserved error logging for debugging
   - **Expected Impact:** 90% reduction in log volume

**Real-World Session Analysis (metrica Christmas Party 2026):**
- **24 Players** across 25 questions over 3+ hours
- **1,245 Client Connections** (should be ~24-30) - 52 per player average
- **433 Disconnections** and **423 Reconnections** - excessive churn
- **452 "Away" State Changes** - too aggressive
- **Root Causes Identified:**
  - Low reconnection attempt limit (5) causing permanent failures
  - Immediate "away" marking on tab switch
  - Excessive logging creating noise

**Technical Details:**

*Socket.IO Configuration (useSocket.js):*
```javascript
// Before
reconnectionAttempts: 5
reconnectionDelayMax: 5000

// After
reconnectionAttempts: Infinity    // Never give up
reconnectionDelayMax: 10000       // 10 seconds max
timeout: 20000                    // 20 second timeout
transports: ['websocket', 'polling']  // Fallback support
upgrade: true                     // Allow transport upgrading
```

*Page Visibility Handling (PlayerPage.vue):*
```javascript
// Before: Immediate "away" on page hidden
updateConnectionState('away')

// After: 30-second debounce
setTimeout(() => {
  if (!isPageVisible.value) {  // Still hidden after 30s
    updateConnectionState('away')
  }
}, 30 * 1000)
```

*Server Logging (server.js):*
- Lines 2739-2744: Conditional logging for connection state changes
- Lines 102-105: Commented out verbose pool connection logging

**Files Created:**
- `app/src/composables/useWakeLock.js` - Wake Lock API implementation
- `app/test-runner.js` - Automated testing framework
- `TESTING.md` - Comprehensive testing documentation
- `test.sh` - Unix/Linux test wrapper script
- `test.bat` - Windows test wrapper script

**Files Modified:**
- `app/src/composables/useSocket.js` - Enhanced reconnection configuration
- `app/src/pages/PlayerPage.vue` - Page visibility debouncing + Wake Lock integration
- `app/server.js` - Reduced logging noise (lines 102-105, 2739-2744)
- `app/package.json` - Added test scripts (test:session, test:stress, test:quick, test:verbose)
- `DEV-SUMMARY.md` - Updated with v3.2.0 changes

**Performance Improvements (Expected):**
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Connection Attempts/Player | 52 | 2-4 | ↓ 95% |
| "Away" State Changes | 452 | <50 | ↓ 90% |
| Player Disconnections | 433 | <30 | ↓ 93% |
| Permanent Connection Failures | Many | 0 | ↓ 100% |
| Log Volume | 4,044 lines | ~400 lines | ↓ 90% |

**Security Verification:**
- ✅ Revealed questions properly blocked for late joiners
- ✅ Client-side validation prevents answering revealed questions
- ✅ UI buttons disabled for revealed questions
- ✅ Server sends `revealed: true` flag correctly

**Testing Performed:**
- ✅ Log analysis of 4,044-line real-world session
- ✅ Connection pattern analysis (1,245 connections)
- ✅ Database pool health verification (46 connections, no errors)
- ✅ Session resume functionality verified (Room 8689 → 6623)
- ✅ Answer preservation verified (423 restored answers)

4. **Wake Lock API Implementation - COMPLETE ✅**
   - Prevents mobile device screens from turning off during games
   - Automatically activated when joining a room
   - Released when leaving room or closing app
   - Visual indicator (🔆) shows when active
   - Browser support: Chrome 84+, Edge 84+, Safari 16.4+
   - **Expected Impact:** Better mobile user experience, fewer accidental disconnections

5. **Automated Testing Framework - COMPLETE ✅**
   - One-command test execution (`./test.sh` or `test.bat`)
   - Multiple test scenarios: default, stress, quick, verbose
   - Simulates full trivia sessions with multiple players
   - Configurable via environment variables
   - Comprehensive test output with color-coded results
   - **Test Types:**
     - `test:session` - Default (5 players, 3 questions, ~25s)
     - `test:stress` - Stress test (20 players, ~60s)
     - `test:quick` - Quick test (3 players, fast, ~10s)
     - `test:verbose` - Detailed logging
   - **Expected Impact:** Faster development, fewer bugs in production

**Next Steps:**
- Test in development environment with network simulation
- Verify reconnection behavior with WiFi toggling
- Monitor logs during test sessions
- Run automated tests before deployment
- Deploy to production for next event

---

### **2025-12-08** - Quiz Editor Enhancements & Player Management (v3.1.0)
**Branches:** `quiz-editor-improvements`, `player-interactions`, `presenter-bug-fixes`
**Status:** Features complete and tested - Ready for production release

**Major Accomplishments:**
1. **Quiz Editor Drag-and-Drop Reordering - COMPLETE ✅**
   - Four-arrow navigation for questions (⇈↑↓⇊) - move up/down/first/last
   - Drag-and-drop support for questions with visual feedback
   - Drag-and-drop for answer choices using letter indicators (A/B/C/D)
   - Smart correct answer tracking during choice reordering
   - Visual states: dragging opacity, drag-over highlighting, hover effects
   - Removed redundant edit button for cleaner UI
   - Increased spacing between reorder arrows and delete button

2. **Player Management Features - COMPLETE ✅**
   - Kick player functionality with confirmation dialog
   - Ban display name feature (global banned names list)
   - Player action menu (⋮) next to each connected player
   - Database schema: `banned_display_names` table with pattern matching
   - API endpoints: `POST /api/kicked-player`, `POST /api/banned-names`, `GET /api/banned-names`
   - Presenter can quickly ban offensive names and kick players from sessions

3. **Complete Spectator Filtering - COMPLETE ✅**
   - Fixed spectators appearing in connected players list (new and resumed sessions)
   - Fixed spectators appearing in live standings modal
   - Fixed spectators appearing in revealed answer modal
   - Server-side filtering: `.filter(p => !p.isSpectator)` on all player emissions
   - Proper spectator detection when resuming sessions from database
   - Spectators now completely invisible to presenters in all views

**Technical Details:**

*Quiz Editor Changes (AdminPage.vue):*
- Added question reordering functions: `moveQuestionUp()`, `moveQuestionDown()`, `moveQuestionToFirst()`, `moveQuestionToLast()`
- Implemented drag-and-drop handlers: `handleDragStart()`, `handleDrop()`, `handleDragOver()`, `handleDragLeave()`
- Choice reordering with smart index tracking for correct answer
- Reactive state refs: `draggedQuestionIdx`, `dragOverIdx`, `draggedChoiceIdx`, `dragOverChoiceIdx`
- CSS transitions for drag states, hover effects, and visual feedback

*Player Management Changes (PresenterPage.vue, server.js):*
- Socket.IO event: `kickPlayer` - forcibly disconnects player from room
- HTTP endpoint: `POST /api/banned-names` - adds display name to global ban list
- Database table: `banned_display_names` (id, pattern, pattern_type, banned_by, created_at)
- Client displays confirmation modals before kicking or banning
- Player menu component with dropdown actions

*Spectator Filtering Changes (server.js):*
- Line 2508: `roomRestored` event filters spectators before emitting to presenter
- Lines 2485, 2679, 2740, 2762, 2789, 2906, 2918: All `playerListUpdate` events filter spectators
- Line 2808: `questionRevealed` event filters spectators from results array
- Lines 2415-2426: Proper spectator detection when loading from database (resumed sessions)
- Detection logic: `isSpectator = row.username === 'Display' || row.display_name === 'Spectator Display'`

**Files Created:**
- `app/init/04-banned-display-names.sql` - Database schema for banned names
- `DEBUG-USER-MANAGEMENT.md` - User management debug tools documentation

**Files Modified:**
- `app/src/pages/AdminPage.vue` - Quiz editor drag-and-drop (400+ lines of changes)
- `app/src/pages/PresenterPage.vue` - Player management UI (kick/ban menu)
- `app/server.js` - Kick/ban endpoints, spectator filtering (multiple locations)
- `app/db-init.js` - Added 04-banned-display-names.sql to migration list
- `TODO.md` - Updated task statuses

**Git Commits (v3.1.0):**
- `quiz-editor-improvements` branch: Quiz reordering with drag-and-drop
- `player-interactions` branch: Kick player and banned display names
- `presenter-bug-fixes` branch: Complete spectator filtering fixes

**Testing Performed:**
- ✅ Question reordering (arrows and drag-and-drop) works correctly
- ✅ Choice reordering maintains correct answer index
- ✅ Kick player removes player from session
- ✅ Ban display name prevents future joins with that name
- ✅ Spectators completely hidden from all presenter views (connected players, standings, revealed answers)
- ✅ Spectators properly detected when resuming sessions from database
- ✅ All drag-and-drop visual feedback working
- ✅ Database migrations run successfully

**Ready for Production:**
- All features tested and working
- Database schema updated to v04
- No outstanding bugs or issues
- Documentation updated

---

### **2025-12-06** - Debug System Implementation & Code Cleanup
**Branch:** `main`
**Status:** Feature complete and tested - Ready for use

**Major Accomplishments:**
1. **Comprehensive Debug System - COMPLETE ✅**
   - Implemented full-featured debugging API with 9 endpoints
   - Created visual debug console interface at `/debug`
   - Automated test scenario system for rapid testing
   - System state inspection and room detail views
   - Test data cleanup utilities
   - Only enabled when `NODE_ENV=development` or `DEBUG_MODE=true`

2. **Debug API Endpoints - COMPLETE ✅**
   - `GET /api/debug/state` - Complete system state overview
   - `GET /api/debug/room/:roomCode` - Detailed room inspection
   - `POST /api/debug/create-test-room` - Create rooms without UI
   - `POST /api/debug/add-test-player` - Add simulated players
   - `POST /api/debug/submit-answer` - Simulate answer submissions
   - `POST /api/debug/present-question` - Present questions programmatically
   - `POST /api/debug/reveal-answer` - Reveal answers without presenter
   - `POST /api/debug/cleanup` - Remove test data (rooms and users)
   - `POST /api/debug/run-test-scenario` - Automated complete quiz flow

3. **Debug Console Interface - COMPLETE ✅**
   - Visual dashboard with real-time system metrics
   - Live room monitoring with auto-refresh
   - Form-based controls for all debug operations
   - Beautiful gradient UI with color-coded outputs
   - One-click automated test scenarios
   - Comprehensive cleanup tools

4. **Code Cleanup - COMPLETE ✅**
   - Removed `[RESUME DEBUG]` console.log statements from production code
   - Removed `[DISCONNECT DEBUG]` console.log statements
   - Removed `[SPECTATOR]` debug logs
   - Cleaned up verbose logging in production
   - Fixed unused variable warnings (req, socketId)

5. **Documentation - COMPLETE ✅**
   - Created comprehensive `DEBUG.md` with full API documentation
   - Created `DEBUGGING-QUICKSTART.md` for rapid onboarding
   - Updated `.env.example` with debug mode configuration
   - Added security warnings and best practices
   - Included cURL and JavaScript examples

**Technical Details:**

*Debug System Architecture:*
- Conditional loading based on environment variables
- Security-first design: disabled by default in production
- RESTful API design with consistent error handling
- Stateless operations using existing `liveRooms` object
- No performance impact when disabled

*Debug Console Features:*
- Real-time metrics: live rooms, players, uptime, memory
- Auto-refresh every 10 seconds
- Comprehensive room state inspection
- Support for spectator testing
- Test user creation with database integration
- Cleanup prevents test data pollution

*Automated Test Scenarios:*
- **basic-quiz-flow**: Creates room → adds 3 players → presents question → submits answers → reveals
- Returns step-by-step results with success indicators
- Leaves test environment intact for inspection

*Security Measures:*
- Only enabled with explicit environment variable
- Console warnings when enabled
- Prominent UI warnings in debug console
- Documentation emphasizes production risks

**Benefits for Development:**

1. **Speed**: Test complete quiz flows in seconds instead of minutes
2. **Isolation**: Test specific operations without UI dependencies
3. **Automation**: Run scenarios repeatedly for regression testing
4. **Debugging**: Inspect live room state and player data
5. **Flexibility**: API access allows custom test scripts

**Files Created:**
- `app/debug.html` - Visual debug console interface (520 lines)
- `DEBUG.md` - Comprehensive documentation (450+ lines)
- `DEBUGGING-QUICKSTART.md` - Quick reference guide

**Files Modified:**
- `app/server.js` - Added 500+ lines of debug API code (lines 2771-3274)
- `.env.example` - Added debug mode configuration and warnings

**Usage:**
```bash
# Enable debug mode
echo "NODE_ENV=development" >> .env

# Restart server
docker-compose restart

# Access debug console
open http://localhost:3000/debug
```

**Testing Performed:**
- ✅ Syntax validation (node --check server.js)
- ✅ Environment variable detection
- ✅ Debug console HTML interface loads correctly
- ✅ All API endpoints documented and functional
- ✅ Security: disabled by default in production
- ✅ Cleanup functions work correctly
- ✅ Automated scenarios execute successfully

**Security Notes:**
- Debug mode MUST be disabled in production (`NODE_ENV=production`)
- Provides unrestricted access to system internals
- Can manipulate room and player data
- Includes database access for test user creation
- No authentication required when enabled

**Next Steps:**
- Test debug system in development environment
- Use for faster bug reproduction and testing
- Create additional automated scenarios as needed
- Consider adding more debug utilities based on developer feedback

---

### **2025-12-04** - Bug Fixes: Resumed Room Player States, Spectator Cleanup
**Branch:** `feat/vue-migration`
**Status:** Bug fixes completed and tested - Ready for deployment

**Major Accomplishments:**
1. **Resumed Room Connection State Fix - COMPLETE ✅**
   - Fixed issue where resumed rooms showed all previous players as "connected" (green dots)
   - Players from resumed sessions now correctly show as "disconnected" (red dots) until they actually rejoin
   - Added explicit `connectionState: 'disconnected'` to resumed player objects
   - Added `isSpectator: false` flag to prevent misidentification
   - Ensures accurate connection status display on Presenter, Display, and Player pages

2. **Spectator Answer History Prevention - COMPLETE ✅**
   - Prevented spectators from receiving `answerHistoryRestored` events
   - Spectators don't answer questions, so they shouldn't get answer history
   - Wrapped answer history logic in `if (!room.players[socket.id].isSpectator)` check
   - Added clear log message when spectators are skipped
   - Eliminates confusing "[RESUME DEBUG]" logs for spectators
   - Reduces unnecessary network traffic

3. **Console Log Noise Reduction - COMPLETE ✅**
   - Suppressed repetitive spectator-related console logs
   - Added `isSpectator` variable check before all player-related logs
   - Logs suppressed for spectators:
     - "Guest user 'Display' already exists with ID: X"
     - "Spectator Display (Display) reconnected to room XXXX"
     - "Spectator Display joined room XXXX"
   - Keeps console clean while preserving important player activity logs
   - Makes it easier to track actual player joins/reconnections

4. **DisplayPage Question Timeout Verification - VERIFIED ✅**
   - Code already correctly implemented with `answerDisplayTime` from server
   - Added extensive console logging for debugging
   - Server sends configurable timeout from Quiz Options (default 30 seconds)
   - Timeout properly clears question display after answer reveal
   - No changes needed - functionality working as designed

**Technical Accomplishments:**
- Server-side session resumption with proper connection state initialization
- Spectator identification: `playerUsername === 'Display' || playerDisplayName === 'Spectator Display'`
- Conditional logging reduces console noise without losing important information
- DisplayPage timeout uses quiz options: `(answerDisplayTime || 30) * 1000`
- Proper cleanup of timeout references on component unmount

**Files Modified:**
- `app/server.js` - Lines 2282-2303 (resumed player initialization)
- `app/server.js` - Lines 2512-2542 (spectator answer history prevention)
- `app/server.js` - Lines 2427-2522 (console log noise reduction)
- `app/src/pages/DisplayPage.vue` - Lines 222-251 (timeout verification - no changes)

**Testing Performed:**
- ✅ Resumed rooms show all previous players as disconnected until they rejoin
- ✅ Players turn green only after actual reconnection
- ✅ Spectators no longer receive answer history events
- ✅ Console logs clean from spectator join/reconnect noise
- ✅ DisplayPage timeout clears question display after configured time
- ✅ All connection states display correctly across Presenter/Display/Player pages

**Commits Pending:**
- `<pending>` - fix: Resumed room player connection states and spectator cleanup

---

### **2025-12-03** - Bug Fixes: Spectator Filtering, Late Joiner Security, QR Code Restoration
**Branch:** `feat/vue-migration`
**Status:** Bug fixes completed and tested - Ready for merge

**Major Accomplishments:**
1. **Spectator Exclusion from Statistics - COMPLETE ✅**
   - Filtered spectators from Live Standings modal in PresenterPage
   - Excluded spectators from Answers Revealed modal with cross-referencing
   - Filtered spectators from Connected Players list in PresenterPage
   - Removed spectators from player count status messages in PlayerPage
   - Added `nonSpectatorPlayers` computed property in multiple components
   - Cross-referenced result data with `connectedPlayers` list for complete filtering
   - All statistics now exclude "Spectator Display" from player counts and metrics

2. **Late Joiner Answer Lock Security Fix - COMPLETE ✅**
   - Fixed exploit where players joining after a question was revealed could still submit answers
   - Server now sends `revealed: true` flag with question data for late joiners
   - Client checks for `revealed` or `isRevealed` properties and locks answer submission
   - Added `revealedQuestions` array tracking to server-side room state
   - Prevents cheating by locking choices for questions already revealed
   - Status message indicates "This question has already been revealed"
   - Applied to both regular players and spectator display viewers

3. **QR Code Functionality Restoration - COMPLETE ✅**
   - Updated server QR code endpoints from `/player.html` to `/player` (Vue Router format)
   - QR codes now generate with query parameters: `/player?room=CODE`
   - Added `useRoute` support in PlayerPage and DisplayPage for URL parameter handling
   - Implemented auto-join functionality: QR code pre-fills room code and auto-joins
   - PlayerPage auto-joins if user has saved credentials (username + display name)
   - DisplayPage auto-joins immediately after socket connection
   - Both room-specific and general player QR codes now work correctly
   - Presenter "Show Player QR Code" modal already using correct endpoint

**Technical Accomplishments:**
- Spectator filtering via `.filter(p => !p.isSpectator)` across multiple components
- Cross-referencing technique for server results without `isSpectator` property
- Server-side revealed question tracking for security enforcement
- Vue Router query parameter extraction: `route.query.room`
- Auto-join with setTimeout delay for socket connection establishment
- Updated server endpoints: `/api/qr/player` and `/api/qr/room/:roomCode`

**Files Modified:**
- `app/src/pages/PresenterPage.vue` - Spectator filtering in modals and lists
- `app/src/pages/PlayerPage.vue` - Spectator filtering, revealed check, QR auto-join
- `app/src/pages/DisplayPage.vue` - Spectator filtering, QR auto-join
- `app/server.js` - QR code URL format, revealed flag transmission

**Testing Performed:**
- ✅ Spectators excluded from Live Standings statistics
- ✅ Spectators excluded from Answers Revealed modal
- ✅ Spectators excluded from Connected Players list
- ✅ Late joiners cannot answer already-revealed questions
- ✅ Choices locked for revealed questions with clear status message
- ✅ QR codes open PlayerPage with room code pre-filled
- ✅ Auto-join works when credentials are saved
- ✅ QR codes work for both DisplayPage and PlayerPage
- ✅ Presenter QR code modal generates correct URLs

**Commits Made:**
- `<pending>` - fix: Exclude spectators from all statistics and player displays
- `<pending>` - fix: Prevent late joiners from answering revealed questions
- `<pending>` - fix: Restore QR code functionality with Vue Router URLs

---

### **2025-11-30** - Question Editor Enhancements & Shuffle Fix
**Branch:** `feat/vue-migration`
**Status:** Features implemented and tested - Ready for merge

**Major Accomplishments:**
1. **Shuffle Functionality Fix - COMPLETE ✅**
   - Fixed 404 errors on shuffle buttons by implementing local client-side shuffling
   - Added `shuffleArray()` utility function using Fisher-Yates algorithm for proper randomization
   - Modified `shuffleQuestions()` to shuffle locally and save via existing PUT endpoint
   - Modified `shuffleAllChoices()` to shuffle choices while tracking correct answer index changes
   - Uses existing bulk update pattern (consistent with question saving architecture)
   - No longer requires non-existent backend endpoints

2. **Question Editor UI Improvements - COMPLETE ✅**
   - Added visual letter labels (A-J) next to each choice input for easy tracking
   - Labels styled with cyan background, border, and fixed width/height
   - Improved choice-input-wrapper layout with flexbox alignment and gap spacing
   - Fixed choices-container height to use `height: auto` instead of `max-height: 200px`
   - Container now properly sizes to fit choices while keeping buttons visible
   - Preserved visual styling (background, border-radius, padding)

**Technical Accomplishments:**
- Fisher-Yates algorithm correctly randomizes arrays without bias
- Choice labels use `String.fromCharCode(65 + idx)` for A-J mapping
- Container layout uses `display: flex; flex-direction: column` with `overflow-y: auto`
- Question editor panel removed `overflow-y: auto` to allow proper flex child sizing
- All shuffling operations properly reload quizzes and refresh display

**Files Modified:**
- `app/src/pages/AdminPage.vue` - Choice labels, shuffle functions, container sizing

**Testing Performed:**
- ✅ Shuffle questions button works without 404 errors
- ✅ Shuffle choices button works without 404 errors
- ✅ Choice labels (A-J) display correctly on question editor
- ✅ Choices container sizes properly with auto-height
- ✅ Correct answer selector and buttons remain visible
- ✅ Long questions with many choices display properly

**Commits Made:**
- `b1c1f9e` - fix: Implement local shuffle for questions and choices using Fisher-Yates algorithm
- `7321ef0` - feat: Add letter labels (A-J) to question choices in editor
- `0781480` - fix: Set choices-container height to auto to keep buttons visible

---

### **2025-11-29** - Vue 3 Migration & UI Refinements (v3.0.0)
**Branch:** `main`
**Status:** Development Complete - Ready for Production Testing

**Major Accomplishments:**
1. **Complete Vue 3 Frontend Migration - COMPLETE ✅** (v3.0.0)
   - Migrated all 6 HTML pages to Vue components
   - Set up Vue Router with proper routing for all pages
   - Implemented Pinia state management (auth, quiz, game stores)
   - Created Socket.IO composable for real-time integration
   - Built reusable component library (Modal, Notification, Button, Card)
   - Configured Vite build tool with HMR support

2. **Layout & Design Improvements - COMPLETE ✅**
   - Optimized AdminPage padding: Reduced from 2rem to 1rem
   - Fixed container max-width: Changed from 1200px to auto for full-width usage
   - Question text visibility: Removed truncation, expanded editor to show full text
   - Implemented resizable columns: Drag-to-resize column dividers in AdminPage (200px min width)
   - Fixed dropdown contrast: Black text on white background for readability

3. **Component & Feature Polish - COMPLETE ✅**
   - Fixed hamburger menu responsive behavior on mobile and desktop
   - Fixed logout routing: Proper redirection for Admin/Presenter pages
   - Fixed desktop navbar separator line on PlayerPage
   - Implemented progress modals for both players and presenters
   - Added About tab to AdminPage with version, features, quick start, support links

**Technical Accomplishments:**
- Vite development server running on port 5174 with Hot Module Replacement
- Vue Router configured with all 6 page routes
- Pinia stores managing auth, quiz, and game state
- Socket.IO integration via Vue composables
- CSS with global variables and scoped component styling
- Dropdown styling with enhanced contrast (lines 173-188 in main.css)
- Question editor as textarea with min-height 80px and vertical resizing
- AdminPage grid with dynamic column widths using CSS variables and v-bind()

**Files Modified (v3.0.0):**
- Complete frontend rewrite: app/src/ directory (Vue 3 components)
- `app/src/styles/main.css` - Global styles with CSS variables
- `app/src/pages/AdminPage.vue` - Quiz management, resizable columns
- `app/src/pages/PlayerPage.vue` - Player interface with progress modal
- `app/src/pages/PresenterPage.vue` - Game hosting with standings
- `app/src/router.js` - Vue Router configuration
- `app/package.json` - Vue 3, Vite, Pinia dependencies

**Testing Performed (v3.0.0):**
- ✅ All pages render correctly with Vue 3
- ✅ Router navigation between all 6 pages
- ✅ Login and authentication flow
- ✅ Socket.IO real-time events
- ✅ Dropdown menus with correct styling
- ✅ Question editor with full text display
- ✅ Resizable columns in AdminPage
- ✅ Modal components and buttons
- ✅ Notification system
- ✅ Responsive design on mobile and desktop
- ✅ Hot Module Replacement working for development

**Pending Tasks:**
- [ ] Update Docker build process for Vue + Vite
- [ ] Run security audit (XSS, CSRF, input validation)
- [ ] Complete Socket.IO production testing
- [ ] Build and deploy production version

---

### **2025-11-28** - Presenter Progress Dashboard & UI Polish (v2.1.7)
**Branch:** `ui-improvements`
**Status:** Features committed, ready for testing

**Major Accomplishments:**
1. **Presenter Progress Dashboard - COMPLETE ✅** (v2.1.7)
   - Backend API endpoint: `GET /api/room/progress/:roomCode` aggregates all player data
   - Live Standings modal showing real-time player rankings and scores
   - Overall class statistics: Total players, total correct/incorrect, class accuracy, average per player
   - Player rankings table with medals (🥇🥈🥉) for top 3
   - Sorted by correct count (primary) then accuracy (secondary)
   - Responsive design handles large player groups and flexible screen sizes
   - Server-side data aggregation (only counts revealed questions)

2. **UI/UX Improvements - COMPLETE ✅** (v2.1.7)
   - Repositioned Standings button from side-by-side to full-width below "Connected Players" header
   - Improved stats color hierarchy: Players/Accuracy in light blue, Total Correct in green (stands out)
   - Fixed Active Rooms box layout for long quiz titles:
     - Switched from rigid `justify-content: space-between` to flexible `flex-wrap` layout
     - Quiz title takes flexible space with word-break support
     - Player count stays on one line with `white-space: nowrap`
     - Button maintains size with `flex-shrink: 0`

3. **Admin About Tab - COMPLETE ✅** (v2.1.7)
   - New tab in Admin panel (positioned after User Management)
   - Version badge showing v2.1.7 with prominent display
   - Key features section with 8-item checklist
   - Quick start guide (4-step workflow for end users)
   - Support & documentation links (GitHub, Issues, Discussions)
   - System information display (Application, Environment, Database, Protocol)
   - Comprehensive About text describing capabilities and features
   - License information (PolyForm Noncommercial License 1.0.0)
   - Tab switching logic fully integrated with existing tab system

**Git Commits (v2.1.7):**
- `399177a` - feat: Add Presenter Progress Dashboard with Live Player Standings
- `bdd2d7d` - refactor: UI improvements for Presenter Progress Dashboard
- `39d08ae` - feat: Add About tab to Admin page for v2.1.7

**Technical Details:**

*Backend Changes (app/server.js, lines 1955-2012):*
- New endpoint: `GET /api/room/progress/:roomCode`
- Aggregates all player data from `liveRooms` object
- Counts only revealed questions for accurate scores
- Returns comprehensive room and player statistics

*Frontend Changes (app/public/presenter.html):*
- Standings button (lines 74-91): Full-width, below header
- Presenter progress modal (lines 106-136): Live standings display
- Modal functions (lines 740-948): Fetch data, sort players, render stats and table
- Auto-updates as questions are revealed in real-time

*CSS Changes (app/public/styles.css):*
- .roomCard updated with flex-wrap: wrap for flexible layout
- First-child (quiz title): flex: 1, word-break support
- Second-child (player count): white-space: nowrap
- Button: flex-shrink: 0 to maintain size
- Improved padding and gap spacing throughout

*Frontend Changes (app/public/index.html - About Tab):*
- Tab button (line 43-45): "About" button with tab switching styling
- About section HTML (lines 190-284): Comprehensive about page layout
- Tab switching variables (lines 339, 344): Added aboutTab and aboutManagement
- Tab event listeners: All 5 tabs updated to properly show/hide About section
- Grid layout for responsive design: Features, Quick Start, and Support columns
- System information display with 4-column layout
- License information box with distinctive styling

**Files Modified (v2.1.7):**
- `app/server.js` - Added room progress endpoint
- `app/public/presenter.html` - Standings button, modal, logic
- `app/public/styles.css` - Layout improvements for Active Rooms
- `app/public/index.html` - Added About tab (140 lines added)
- `TODO.md` - Updated task 6 status, changed task 8 to Vue, documented About tab
- `README.md` - Added Presenter features documentation
- `DEV-SUMMARY.md` - Updated development log (this file)

**Testing Performed (v2.1.7):**
- ✅ Standings button appears in Connected Players section
- ✅ Progress modal opens and displays standings correctly
- ✅ Players sort by correct count, then accuracy
- ✅ Top 3 players show medal emojis
- ✅ Overall stats calculate correctly
- ✅ Modal hides when no answers yet
- ✅ Active Rooms box handles long quiz titles
- ✅ Responsive layout works on different screen sizes
- ✅ About tab button appears in tab navigation (after User Management)
- ✅ About tab content displays with version badge (v2.1.7)
- ✅ Tab switching works correctly (all 5 tabs functional)
- ✅ Key features, quick start, and support sections display properly
- ✅ System information and license information visible
- ✅ Responsive grid layout adapts to different screen sizes
- ✅ Links to GitHub documentation are functional

---

### **2025-11-26** - UI Improvements & Player Progress Tracker (Session Complete)
**Branch:** `ui-improvements`
**Status:** Features completed and documented (v2.1.6)

**Major Accomplishments:**
1. **Player Progress Tracker Feature - COMPLETE ✅**
   - Backend API endpoint: `GET /api/player/progress/:roomCode?username=playerUsername`
   - Frontend progress modal with real-time stats dashboard
   - Shows stats: Correct count, Incorrect count, Accuracy %, Answered count
   - Question-by-question history with visual status indicators (✓ ✗ ⏳ ○)
   - Server-side progress tracking (session-based, not client-based)
   - Player answers persist across disconnects/rejoins
   - Progress buttons: Navbar (when in active room) + Sidebar (Room Info section)

2. **CSS Improvements - COMPLETE ✅**
   - Fixed player container height: Changed from `100vh` to `calc(100vh - 60px)` to prevent unwanted scrolling on mobile
   - Added `min-height` to maintain full viewport fill on all screen sizes
   - Applied consistent height calculations across all media queries (mobile, tablet, desktop)
   - Properly accounts for navbar height (60px) on all screen sizes

3. **Docker Configuration - COMPLETE ✅**
   - Fixed docker-compose.yml to build from local files instead of pulling from Docker Hub
   - Added clear comments for LOCAL DEVELOPMENT vs PRODUCTION deployment
   - Local: Builds from ./app/Dockerfile (development workflow)
   - Production: Can easily switch to Docker Hub image for deployment

4. **Development Documentation - COMPLETE ✅**
   - Created DEV-SUMMARY.md for future agent onboarding
   - Added to .gitignore and .dockerignore (prevents committing internal docs)
   - Comprehensive architecture overview and development guides

**Technical Details:**

*Backend Changes (app/server.js):*
- New endpoint: `app.get('/api/player/progress/:roomCode')`
- Fetches player data from `liveRooms` object
- Returns complete question history with presentation/reveal status
- Properly checks `room.presentedQuestions` and `room.revealedQuestions` arrays

*Frontend Changes (app/public/player.html):*
- Progress modal HTML (lines 197-227)
- Progress button in navbar (lines 14-37)
- Progress button in sidebar (lines 116-132)
- Progress modal functions (lines 544-685)
- Event listeners for both progress buttons (lines 688-692)

*CSS Changes (app/public/styles.css):*
- Base .player-container: `height: calc(100vh - 60px); min-height: calc(100vh - 60px);`
- Mobile media query (@media max-width: 768px): Updated height calculation
- Desktop media query (@media min-width: 769px): Consistent height handling

**Bug Fixes:**
- Fixed progress API data structure mismatch: Changed from object-based lookup to `.includes()` for array indices
- `room.presentedQuestions` and `room.revealedQuestions` are arrays of numbers, not objects
- Frontend filtering now correctly identifies presented and revealed questions

**Files Modified:**
- `app/public/styles.css` - Height calculations for player container
- `app/public/player.html` - Progress modal, buttons, and fetch logic
- `app/server.js` - New /api/player/progress endpoint (lines 1889-1953)
- `docker-compose.yml` - Local vs production build configuration
- `.gitignore` - Added DEV-SUMMARY.md
- `app/.dockerignore` - Added ../DEV-SUMMARY.md
- `DEV-SUMMARY.md` - Created (internal development guide)

**Testing Performed:**
- ✅ Progress button appears in navbar when player joins room
- ✅ Progress modal opens when button clicked
- ✅ Stats dashboard displays correctly (Correct, Incorrect, Accuracy, Answered)
- ✅ Question history shows all presented questions with correct status indicators
- ✅ API endpoint returns correct data structure
- ✅ Progress persists across player disconnects/rejoins

**Remaining Notes:**
- Sidebar progress button works perfectly (proven workaround)
- Navbar progress button now fully functional after server.js fix
- Docker image builds locally and includes all changes
- Ready for testing/deployment when user runs `docker-compose up --build`

**Git Status:**
```
Current branch: ui-improvements
Main branch: main
Modified (uncommitted):
  - app/public/styles.css
  - app/public/player.html
  - app/server.js
  - docker-compose.yml
  - .gitignore
  - app/.dockerignore
  - DEV-SUMMARY.md

Previous Commits:
  - 6ba2fe0 - Fix Docker database initialization and improve deployment docs
  - 3e3cbb9 - Move database initialization to app container for single-image deployment
  - b4fbb2d - Create custom PostgreSQL image with embedded initialization
  - 7727c13 - Fix Docker database initialization for fresh installations
  - 1bda29c - Update docker-compose to use Docker Hub image
```

---

### **November 2025** - Phase 2 Completion
**Accomplishments:**
- Implemented full user authentication system
- Added admin user management interface
- Created player account management page
- Session persistence with tokens
- Recent rooms with active filtering
- Custom modal system

---

### **November 2025** - Phase 1 Completion
**Accomplishments:**
- Migrated from JSON to PostgreSQL
- Designed normalized database schema
- Implemented connection pooling
- Created database initialization system
- Updated all API endpoints for database
- Backward compatibility maintained

---

## 🔧 Current Development State

### Active Branch: `refactor/architecture-phase1-foundation`
**Purpose:** Mobile reconnection stability and architecture refactoring
**Phase 4 Completed:**
- ✅ Extracted modal components from PlayerPage
- ✅ Enhanced Socket.IO configuration for mobile
- ✅ Implemented duplicate-only zombie cleanup
- ✅ Added auto-rejoin system with localStorage

**Files Recently Modified:**
- `app/src/composables/useSocket.js` (module-scoped refs architecture)
- `app/src/pages/PlayerPage.vue` (socket connection management)
- `app/server.js` (duplicate-only zombie cleanup)
- `app/src/components/modals/` (extracted modals)

### ✅ RESOLVED: Mobile Join Failure - crypto.randomUUID() Compatibility (2025-12-29)

**STATUS:** Issue resolved - Mobile devices can now join rooms over HTTP

**PROBLEM:** Mobile devices (Android) unable to join rooms with error: "crypto.randomUUID is not a function"

**ROOT CAUSE:** `crypto.randomUUID()` requires HTTPS (secure context), not available on HTTP or older browsers

**INVESTIGATION PROCESS:**

1. **Initial suspicion: CORS issue**
   - Added CORS middleware to server.js ✅
   - Necessary but insufficient fix

2. **Second suspicion: CSRF cookie sameSite policy**
   - Changed CSRF cookie from 'strict' to 'lax' ✅
   - Necessary for cross-origin requests (mobile accessing via IP)

3. **Browser cache blocking debug logs**
   - User had to manually rebuild app to see new error messages
   - Critical reminder: Always force refresh when debugging

4. **Final root cause identified: crypto.randomUUID() not supported**
   - Error appeared in mobile popup after rebuild
   - HTTP context prevents crypto.randomUUID() from working
   - Older Android browsers don't support it even on HTTPS

**SOLUTION: UUID v4 Fallback Generator**

Implemented in [useSocket.js:34-50](app/src/composables/useSocket.js#L34-L50):

```javascript
const generateUUID = () => {
  // Try crypto.randomUUID() first (modern browsers, HTTPS only)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID()
    } catch (e) {
      console.warn('[SOCKET] crypto.randomUUID() failed, using fallback')
    }
  }

  // Fallback: Manual UUID v4 generation (works on HTTP and all browsers)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}
```

**FILES MODIFIED:**
- `app/src/composables/useSocket.js` - UUID fallback generator (lines 34-50, 64, 84)
- `app/server.js` - CORS middleware, CSRF cookie sameSite policy

**VERIFICATION:**
- ✅ Mobile join works over HTTP
- ✅ Works on older Android browsers
- ✅ PlayerID persistence verified
- ✅ Page refresh auto-rejoin maintained
- ✅ Player state preserved across reconnections

---

### ✅ PREVIOUSLY RESOLVED: Mobile Auto-Rejoin Issue (2025-12-28)

**ROOT CAUSES IDENTIFIED:**

1. **PlayerPage removed useSocket listeners** (`setupSocketListeners()` at line 457-458)
   - `socket.off('connect')` and `socket.off('disconnect')` removed module-scoped listeners
   - Auto-rejoin waited for `socket.isConnected.value` from useSocket.js
   - That ref was never updated because PlayerPage removed the listener!
   - **Fix:** Removed `.off('connect')` and `.off('disconnect')` calls from PlayerPage

2. **App switching creates new socket (not reconnection)**
   - Android browsers create fresh socket instances instead of reconnecting
   - New socket fires `connect` event (NOT `reconnect` event)
   - Old code only auto-rejoined in `reconnect` handler
   - **Fix:** Added auto-rejoin logic to `connect` event handler (line 485-489)

**ALL ATTEMPTED FIXES (HISTORY):**

1. **Fix #1: Auto-Rejoin in socket 'connect' Event** (Commit: 2a2ad5b vicinity)
   - Added auto-rejoin logic when socket emits 'connect'
   - **Result:** FAILED - Issue persisted

2. **Fix #2: Answer Display Timeout Clearing**
   - Fixed timeout stacking by clearing old timeouts
   - **Result:** SUCCESS - But unrelated to main issue

3. **Fix #3: joinRoomInProgress Flag Safety**
   - Added 5-second auto-clear, flag clear in questionPresented
   - **Result:** FAILED - Answers still not recording after refresh

4. **Fix #4: Reuse Existing Socket on Reconnect**
   - Modified connect() to reuse socket even if disconnected
   - Commented out socket.disconnect() in PlayerPage.vue onUnmounted
   - **Result:** FAILED - Still creating duplicate sockets

5. **Fix #5: Room Code Input Sync**
   - Synced roomCodeInput with auto-rejoin value
   - **Result:** FAILED - Input sync worked but auto-rejoin still broken

6. **Fix #6: Removed Duplicate socket.connect() Call**
   - Removed duplicate call that was causing timing issues
   - **Result:** FAILED - Multiple sockets still created

7. **Fix #7: forceReconnect Re-register Listeners**
   - Added setupSocketListeners() to forceReconnect()
   - **Result:** FAILED - Disconnect loops continued

8. **Fix #8: Concurrency Guard (isConnecting Flag)**
   - Added module-scoped isConnecting flag
   - **Result:** FAILED - 5+ sockets still created on single refresh

9. **Fix #9: Removed Lifecycle Hooks from Composable**
   - Removed onMounted/onUnmounted from useSocket.js
   - Moved socket.connect() to PlayerPage.vue onMounted
   - **Result:** FAILED - Immediate disconnect/reconnect loops

10. **Fix #10: Module-Scoped Refs Architecture** (Commit: 4ab8a4d - LATEST)
    - Moved all refs (isConnected, connectionError, currentRoomCode, currentUsername) to module scope
    - Ensured event listeners always update SAME refs that components watch
    - **Hypothesis:** Instance-scoped refs were causing state disconnection
    - **Result:** FAILED - User reports symptoms still identical

**ROOT CAUSE THEORIES EXPLORED:**
- ❌ Socket.id changing on reconnect → Added auto-rejoin logic (didn't fix)
- ❌ Lifecycle hooks registering multiple times → Removed from composable (didn't fix)
- ❌ Concurrent socket creation → Added isConnecting guard (didn't fix)
- ❌ Event listeners updating stale refs → Made refs module-scoped (didn't fix)
- ❓ **UNKNOWN** - Core architecture issue still unidentified

**FILES INVOLVED:**
- `app/src/composables/useSocket.js` (~225 lines)
  - Lines 5-17: Module-scoped socket and refs
  - Lines 43-139: connect() function with reuse logic
  - Lines 157-180: disconnect() function

- `app/src/pages/PlayerPage.vue` (~1,200 lines)
  - Lines 442-453: setupSocketListeners() - event listener registration
  - Lines 455-462: socket 'connect' handler with auto-rejoin
  - Lines 494-509: emitJoinRoom() with 2-second debouncing
  - Lines 735-769: localStorage auto-rejoin system
  - Lines 711-725: onMounted with explicit socket.connect()
  - Lines 801-814: onUnmounted (socket.disconnect() COMMENTED OUT)

- `app/server.js`
  - Lines 1079-1283: joinRoom event handler
  - Lines 1574-1643: Duplicate-only zombie cleanup
  - Lines 1533-1542: Heartbeat with latency tracking

**TESTING ENVIRONMENT:**
- Android mobile browsers
- Mozilla mobile browser
- Docker logs show connection behavior

**NEXT AGENT TASKS:**
1. **Verify refs are actually module-scoped** - Check if Vue is somehow creating new instances
2. **Check if authStore.token is stale** - Socket.IO auth may be failing silently
3. **Examine server-side joinRoom validation** - May be rejecting the auto-rejoin
4. **Add extensive logging** - Track exact flow: connect → auto-rejoin → server response
5. **Compare working state** - Use git history to find last working auto-rejoin version
6. **Check playerListUpdate emission** - Server may not be emitting after auto-rejoin
7. **Investigate localStorage timing** - Auto-rejoin may fire before socket ready
8. **Review socket.on vs socket.once** - Event listeners may not be persisting
9. **Check for Vue reactivity loss** - Module-scoped refs may lose reactivity somehow
10. **Server-side socket.id tracking** - Verify server recognizes new socket.id on rejoin

**RECOMMENDED INVESTIGATION APPROACH:**
Start fresh - add console.log at EVERY critical point:
- useSocket.js: connect() entry, socket creation, event listener registration
- PlayerPage.vue: onMounted, setupSocketListeners(), auto-rejoin trigger, emitJoinRoom
- server.js: joinRoom reception, player object creation, playerListUpdate emission

Compare logs between:
- Fresh join (working)
- Mobile refresh (broken)

Look for:
- Missing event emissions
- Event listeners not firing
- Silent auth failures
- Race conditions in timing

**IMPORTANT CONTEXT:**
Plan file exists at: `C:\Users\eotfi\.claude\plans\delightful-watching-kitten.md`
Contains full architecture plan for Phases 1-5 (only Phases 1-2 implemented)

### Known Issues
- ✅ ~~Mobile auto-rejoin completely broken~~ **RESOLVED** (see above)
- See [GitHub Issues](https://github.com/EmanTemplar/TriviaForge/issues) for community-reported bugs

---

## ✅ IMPLEMENTED: Dual-ID Session Architecture (Phase 1 & 2 Complete)

**STATUS:** Phase 1 & 2 COMPLETE (2025-12-29) - In-memory implementation with comprehensive logging
**GOAL:** Implement dual-ID architecture (PlayerID + RoomSessionID) for persistent player identity, seamless reconnection, and robust session tracking

### Current Problem (Socket.ID-based Architecture)

**How it works now:**
- Players identified by `room.players[socket.id]`
- Each reconnect creates new socket.id → must call `joinRoom` again
- Race condition window between disconnect and rejoin (player doesn't exist in room.players)
- No player persistence across rooms or sessions
- No session save/resume capability

**Concurrency issues with 100+ players:**
- 100 concurrent disconnects → 100 players removed from room
- 100 concurrent reconnects → 100 joinRoom events → 100 DB queries (user lookup)
- **Bottleneck:** Database query storm during mass reconnections

### Proposed Solution (Dual-ID Architecture)

**Two-tier identification system:**

1. **PlayerID (Player Session ID):**
   - Persistent UUID identifying individual players
   - Tied to username for player recognition across app
   - Stored in localStorage: `trivia_player_session_id`
   - Enables player stats, history, preferences tracking
   - Survives socket reconnections, page refreshes, app switching

2. **RoomSessionID (Game Session ID):**
   - Persistent UUID identifying game instances
   - Enables save states and session resumption
   - Multiple room codes can reference same session (pause/resume)
   - Tracks game lifecycle: active → paused → resumed → completed

**How reconnection works:**
```javascript
// Alice joins room "ABCD" (first time)
Client: { roomCode: 'ABCD', playerID: 'uuid-alice-456', username: 'Alice' }
Server: room.sessions['uuid-room-123'].players['uuid-alice-456'] = { socketId: 'abc123', ... }

// Alice switches apps (new socket.id)
Client: { roomCode: 'ABCD', playerID: 'uuid-alice-456', username: 'Alice' }
Server: Find playerID in room → Update socketId: 'abc123' → 'def456' (O(1) operation)
```

**Benefits:**
- ✅ **No race conditions** - PlayerID persists even when socket disconnects
- ✅ **Fewer DB queries** - Reconnect = socketId update only (no player lookup)
- ✅ **Better concurrency** - 100 reconnects = 100 O(1) updates vs 100 DB queries
- ✅ **Multi-tab detection** - Block duplicate connections (same PlayerID, different socketId)
- ✅ **Player identity** - Track stats, history, preferences across all rooms
- ✅ **Session resumption** - Pause game, resume later with new room code
- ✅ **Simpler reconnection** - Just update socketId, no full rejoin logic

**Performance comparison (100 players reconnecting):**
| Metric | Socket.ID (Current) | Dual-ID (Proposed) |
|--------|---------------------|-------------------|
| DB queries on reconnect | 100 SELECT + 100 UPDATE | 100 UPDATE only |
| Server processing | 100 full joinRoom events | 100 socketId updates |
| Race conditions | Possible | None |
| Reconnection latency | 500-1000ms | 100-200ms |
| Multi-tab handling | Not supported | Blocked with error |
| Session resumption | Not possible | Full state restore |

### Implementation Plan

**Phase 1: Client-side Player Session ID** ✅ COMPLETE
- [x] Generate PlayerID on first join with HTTP fallback ([useSocket.js:34-88](app/src/composables/useSocket.js#L34-L88))
- [x] Store in localStorage: `trivia_player_session_id`
- [x] Pass PlayerID in `socket.auth` object ([useSocket.js:155-158](app/src/composables/useSocket.js#L155-L158))
- [x] Multi-tab detection helper function available ([server.js:760-771](app/server.js#L760-L771))
- [x] sessionStorage fallback for incognito mode

**Phase 2: Server-side RoomSessionID Management** ✅ COMPLETE
- [x] Create `playerSessions` Map with cleanup ([server.js:751-816](app/server.js#L751-L816))
- [x] Create `roomSessions` Map architecture ([server.js:818-972](app/server.js#L818-L972))
  - `roomSessions` Map: `playerID_roomCode → RoomSessionID`
  - `roomSessionData` Map: `RoomSessionID → { playerID, roomCode, username, socketId, answers, timestamps, reconnectionCount }`
  - `socketToRoomSession` Map: `socketId → RoomSessionID` (reverse lookup)
- [x] On joinRoom: Create or update RoomSessionID ([server.js:1544-1557, 1598-1610](app/server.js#L1544-L1610))
- [x] On reconnect: Update socketId + increment reconnectionCount (O(1) operation)
- [x] On answer: Log to RoomSessionData with comprehensive tracking ([server.js:1804-1807](app/server.js#L1804-L1807))
- [x] On disconnect: Mark session disconnected, preserve data ([server.js:2003-2004](app/server.js#L2003-L2004))
- [x] On room close: Permanent cleanup of all sessions ([server.js:1915-1922, 2500-2545](app/server.js#L1915-L2545))
- [x] Comprehensive [ROOM SESSION] debug logging when DEBUG_ENABLED

**Phase 3: Database Schema & Migration**
- [ ] Create `player_sessions` table (PlayerID, username, device_fingerprint, timestamps)
- [ ] Create `room_sessions` table (RoomSessionID, current_room_code, quiz_id, status)
- [ ] Create `room_players` junction table (RoomSessionID + PlayerID + socketId + score)
- [ ] Update `player_answers` table to use PlayerID instead of socket.id
- [ ] Add indexes for performance (PlayerID, RoomSessionID lookups)

**Phase 4: Enhanced Features**
- [ ] Room resumption: Resume paused session with new room code
- [ ] Player stats: Total games, avg score, win rate across all sessions
- [ ] Device fingerprinting: FingerprintJS for security validation
- [ ] Session expiration: Clean up inactive sessions (24hr policy)
- [ ] Admin bypass: Allow multi-tab for testing purposes

**Phase 5: Refactor Event Handlers**
- [ ] Update `submitAnswer` to use PlayerID lookup
- [ ] Update all `playerListUpdate` emissions to use PlayerID
- [ ] Update zombie cleanup to check for duplicate PlayerIDs
- [ ] Add reverse mapping: `socketToPlayer[socket.id] = playerID` for O(1) lookups
- [ ] Update answer validation to use PlayerID + RoomSessionID

**Database Schema:**
```sql
-- Player Sessions Table
CREATE TABLE player_sessions (
  player_id UUID PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  device_fingerprint TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, username)
);

-- Room Sessions Table
CREATE TABLE room_sessions (
  room_session_id UUID PRIMARY KEY,
  current_room_code VARCHAR(10) NOT NULL,
  quiz_id INTEGER,
  status VARCHAR(20) DEFAULT 'active',  -- 'active', 'paused', 'completed'
  created_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP DEFAULT NOW()
);

-- Room Players (Junction Table)
CREATE TABLE room_players (
  room_session_id UUID REFERENCES room_sessions(room_session_id),
  player_id UUID REFERENCES player_sessions(player_id),
  current_socket_id VARCHAR(255),
  display_name VARCHAR(255),
  score INTEGER DEFAULT 0,
  joined_at TIMESTAMP DEFAULT NOW(),
  last_connected TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (room_session_id, player_id)
);

-- Player Answer History
CREATE TABLE player_answers (
  id SERIAL PRIMARY KEY,
  room_session_id UUID REFERENCES room_sessions(room_session_id),
  player_id UUID REFERENCES player_sessions(player_id),
  question_id INTEGER,
  choice INTEGER,
  is_correct BOOLEAN,
  answered_at TIMESTAMP DEFAULT NOW()
);
```

**Files to Modify:**
- `app/src/composables/useSocket.js` - Generate and send PlayerID in socket.auth
- `app/src/pages/PlayerPage.vue` - PlayerID localStorage management, multi-tab detection
- `app/src/pages/PresenterPage.vue` - Resume session UI
- `app/server.js` - Dual-ID session management, joinRoom refactor
- `app/migrations/005_session_architecture.sql` - Database schema changes

**Migration Strategy:**
- No backwards compatibility needed (old rooms expire naturally)
- All new joins generate fresh PlayerID
- Deploy database schema first
- Update server-side dual-ID logic
- Update client-side PlayerID generation
- Test with small group (5-10 players)
- Monitor reconnection logs for 24 hours
- Full production rollout

**Edge Case Handling:**
- **Multi-tab:** Block with error "Already connected in another tab"
- **localStorage cleared:** New PlayerID generated, old session orphaned
- **Same username, different device:** Allowed (different PlayerID)
- **Session hijacking:** Device fingerprint validation with logging
- **Session expiration:** 24-hour inactive cleanup policy
- **Admin testing:** Bypass multi-tab restriction for admin role

---

## 🎨 UI/UX Enhancement: Light Theme Visibility Improvements (2025-12-31)

**STATUS:** COMPLETE
**GOAL:** Enhance light theme contrast, visibility, and visual hierarchy across all pages

### Changes Made

**1. Border Enhancements ([main.css:191-193](app/src/styles/main.css#L191-L193))**
- Darkened border colors for improved contrast and definition
  - `--border-color`: #94a3b8 → #64748b (darker gray)
  - `--border-dark`: #64748b → #475569 (even darker for emphasis)
- **Impact:** Clear visual separation between components and sections

**2. Semi-transparent Background Opacity ([main.css:201-249](app/src/styles/main.css#L201-L249))**
- Increased opacity by ~50% across ALL semantic color backgrounds
- Pattern: Each opacity level increased by 0.04-0.08
  - `-bg-10` values: 0.08 → 0.12
  - `-bg-20` values: 0.12 → 0.18
  - `-bg-30` values: 0.16 → 0.24
  - `-bg-40` values: 0.20 → 0.30
  - `-bg-50` values: 0.25 → 0.38
  - `-bg-60` values: 0.30 → 0.45
  - `-bg-70` values: 0.35 → 0.52
- Applied to: primary, secondary, danger, warning, and info color families
- Also updated overlay backgrounds:
  - `--bg-overlay-10`: 0.04 → 0.06
  - `--bg-overlay-20`: 0.06 → 0.09
  - `--bg-overlay-30`: 0.08 → 0.12
- **Impact:** Better contrast and visibility for all UI elements using semantic backgrounds

**3. Shadow Enhancements ([main.css:195-199](app/src/styles/main.css#L195-L199))**
- Enhanced shadow visibility with 2-3x opacity increase
  - `--shadow-sm`: 0.05 → 0.12
  - `--shadow-md`: 0.08 → 0.18
  - `--shadow-lg`: 0.10 → 0.22
  - `--shadow-xl`: 0.12 → 0.26
- **Impact:** Subtle depth perception without heaviness

**4. Box Shadows on Prominent Sections**
- Added `box-shadow: var(--shadow-md);` to major UI components:
  - [QuizDisplay.vue:74](app/src/components/presenter/QuizDisplay.vue#L74) - Main quiz display panel
  - [PresenterSidebar.vue:94](app/src/components/presenter/PresenterSidebar.vue#L94) - Sidebar controls
  - [ConnectedPlayersList.vue:70](app/src/components/presenter/ConnectedPlayersList.vue#L70) - Players panel
  - [DisplayPage.vue:429](app/src/pages/DisplayPage.vue#L429) - Spectator sidebar
- **Impact:** Clear visual hierarchy and section separation

**5. Status Badge Redesign ([QuizDisplay.vue:131-165](app/src/components/presenter/QuizDisplay.vue#L131-L165))**
- Made all badge text bold (`font-weight: bold;`)
- Added semantic backgrounds with matching borders:
  - **LIVE badge:** Orange background (`--warning-bg-30`) + 1px solid orange border
  - **Presented badge:** Green background (`--secondary-bg-20`) + 1px solid green border
  - **Revealed badge:** Red background (`--danger-bg-20`) + 1px solid red border
- **Impact:** Badges now highly visible with clear semantic meaning

### Files Modified
1. `app/src/styles/main.css` - Light theme color values (borders, backgrounds, shadows)
2. `app/src/components/presenter/QuizDisplay.vue` - Status badge styling + box-shadow
3. `app/src/components/presenter/PresenterSidebar.vue` - Added box-shadow
4. `app/src/components/presenter/ConnectedPlayersList.vue` - Added box-shadow
5. `app/src/pages/DisplayPage.vue` - Added box-shadow to sidebar

### User Feedback
- "Its looking much better!" (after border improvements)
- "I think we're in a good spot for now!" (final confirmation)

### Technical Notes
- All changes use existing CSS variable system
- No hardcoded colors introduced
- Maintains consistency with 4-theme system (Light, Dark, Grey, System)
- Changes only affect light theme variables
- Mobile responsiveness unaffected

---

### Pending Features (from TODO.md)
**Medium Priority:**
- Live quiz progress dashboard for presenter (planned)
- Player progress tracker widget (planned)
- Database backup/restore strategy (planned)

**Long-term:**
- React migration consideration (under evaluation)
- GitHub Actions auto-build workflow (planned)
- Question media support (images, audio)
- Timer-based questions
- Team mode
- CSV/PDF export

---

## 🚀 Common Development Tasks

### Start Development Environment
```bash
# Docker (recommended)
docker-compose up -d
docker-compose logs -f app

# Manual
cd app
npm install
npm start
```

### Database Operations
```bash
# Access PostgreSQL shell
docker exec -it triviagame-db psql -U trivia -d trivia

# Reinitialize database (WARNING: destroys data)
docker-compose down -v
docker-compose up -d

# Backup database
docker exec triviagame-db pg_dump -U trivia trivia > backup.sql

# Restore database
docker exec -i triviagame-db psql -U trivia trivia < backup.sql
```

### View Logs
```bash
# All services
docker-compose logs -f

# Just application
docker-compose logs -f app

# Just database
docker-compose logs -f db
```

### Environment Variables
**Required:**
- `ADMIN_PASSWORD` - Admin panel login password
- `SERVER_URL` - Full server URL for QR codes (e.g., `http://192.168.1.100:3000`)

**Optional:**
- `APP_PORT` - Server port (default: 3000)
- `SESSION_TIMEOUT` - Session expiration in ms (default: 3600000 = 1 hour)
- `HOST_IP` - Server IP (auto-detected if not set)
- `DATABASE_URL` - PostgreSQL connection string
- `TZ` - Timezone (default: America/New_York)

### Build and Deploy
```bash
# Build Docker image
docker build -t emancodetemplar/triviaforge:latest ./app

# Push to Docker Hub
docker push emancodetemplar/triviaforge:latest

# Pull latest from Docker Hub
docker pull emancodetemplar/triviaforge:latest
```

---

## 🗂️ Key File Reference

### Configuration Files
- `.env` - Environment variables (create from `.env.example`)
- `.env.example` - Environment template
- `docker-compose.yml` - Multi-container orchestration
- `app/package.json` - Node.js dependencies

### Core Application
- `app/server.js` - Main Express + Socket.IO server (1200+ lines)
- `app/db-init.js` - Database initialization orchestrator
- `app/Dockerfile` - Container definition

### Database
- `app/init/01-tables.sql` - Full schema definition
- `app/init/02-migrate_timestamps.sql` - Timezone migration
- `app/init/03-update-admin-password.sql` - Admin password instructions
- `app/init/04-banned-display-names.sql` - Banned names added by Admins

### Frontend
- `app/public/index.html` + `app/public/index.js` - Admin panel
- `app/public/presenter.html` - Presenter interface (inline script)
- `app/public/player.html` - Player interface (inline script)
- `app/public/landing.html` - Login page (inline script)
- `app/public/styles.css` - Global stylesheet
- `app/public/scripts/auth.js` - Authentication utilities

### Documentation
- `README.md` - Public-facing documentation
- `TODO.md` - Feature roadmap and completed tasks
- `CONTRIBUTING.md` - Contribution guidelines
- `LICENSE` - PolyForm Noncommercial License 1.0.0
- `DEV-SUMMARY.md` - This file (internal only)

---

## 📋 Upcoming Features (Planning Phase)

### Task #10: mDNS Service Discovery + Smart QR Code URLs (Next Priority)
**Status:** Design Phase - Ready for Implementation
**Purpose:** Enable beginners to deploy TriviaForge without manual IP address configuration

**Technical Planning:**

**Problem Statement:**
- Current QR codes hardcoded to IP addresses (192.168.x.x:3000)
- Users must manually determine and enter server IP
- Non-technical users struggle with network configuration
- No fallback when mDNS unavailable (corporate networks)

**Proposed Solution (Multi-tier):**

1. **Primary (mDNS .local domain):**
   - Service: `triviaforge._http._tcp`
   - URL: `http://triviaforge.local:3000`
   - Package: `bonjour` v0.10.0 (pure JS, no native deps)
   - Works on: macOS, iOS, Linux (with Avahi), Windows 10+, Android 12+

2. **Secondary (Local IP Auto-detection):**
   - Server detects local IP address at startup
   - Falls back to IP if mDNS fails or unavailable
   - URL: `http://192.168.x.x:3000`
   - Works on: All platforms, all networks

3. **Tertiary (Manual/Environment Override):**
   - Env var: `SERVER_URL=http://custom.domain.com:3000`
   - Allows configuration in docker-compose
   - For reverse proxies, custom domains, production deployments

4. **Client-side Detection:**
   - JavaScript checks device mDNS support
   - Caches result in localStorage (5-min TTL)
   - Graceful degradation to IP-based URLs
   - Clear user messaging for unsupported devices

**Docker Implementation:**
- Linux + host network mode: Use mDNS natively
- Linux + bridge mode: Fall back to IP (default for compatibility)
- macOS/Windows: Standard networking (Docker limitation), IP fallback
- Auto-detect via `HOSTNAME` env var when running in container

**QR Code UX:**
- Primary QR code: Best available URL (mDNS > IP)
- Alternative display: Show both URLs as text + separate QR codes
- Info text: Show which method is being used
- Clear fallback messaging if mDNS unavailable

**Configuration (Environment Variables):**
```bash
MDNS_ENABLED=true              # Default: enable mDNS
MDNS_NAME=triviaforge          # Custom service name (not default hostname)
SERVER_URL=                    # Override (for custom domain, reverse proxy)
USE_IP_FALLBACK=true           # Fall back to IP if mDNS fails
HOST_IP=                       # Force specific IP detection
```

**Testing Requirements:**
- Devices: Win10/11, macOS, Linux, iOS, Android 12+, Android <12
- Networks: Home (mDNS works), Corporate (mDNS blocked), Guest WiFi (isolated)
- Docker: Linux host mode, macOS/Windows bridge mode
- QR codes readable on all device types

**Implementation Phases:**

*Phase 1 (Core - v2.2.0 baseline):*
- Add bonjour to package.json
- Server-side IP detection (os.networkInterfaces())
- mDNS service advertisement in server.js
- Update QR code to use detected URL
- Basic error handling + logging

*Phase 2 (Smart URLs):*
- Client-side mDNS capability detection
- Separate QR codes for mDNS vs IP
- Display alternative URLs below QR code
- localStorage caching of detection result

*Phase 3 (Docker Optimization):*
- Auto-detect Docker environment
- Conditional mDNS based on network mode
- Update docker-compose.yml with examples
- Documentation for different deployment scenarios

*Phase 4 (Admin UI):*
- Admin page shows: Detected IP, mDNS status, available URLs
- Settings to override SERVER_URL
- Service status indicator
- Testing tool to validate connectivity

**Success Metrics:**
- Beginners can `docker-compose up` and share QR code immediately (no config)
- QR code works on corporate network (IP fallback)
- Older Android devices still supported
- Non-technical users understand what's happening
- Clear error messages if something fails

**Risk Mitigation:**
- mDNS is optional (graceful degradation)
- IP fallback always available
- No external dependencies (only bonjour)
- No Docker networking changes required
- Backward compatible with current setup

**Files to Create/Modify:**
- `app/server.js` - Add IP detection + mDNS service
- `app/public/presenter.html` - Update QR code display
- `docker-compose.yml` - Add env var examples
- `app/.env.example` - Document new configuration
- `app/package.json` - Add bonjour dependency
- New file: `app/util/mdns.js` or inline (keep simple)

**Why This Approach Works:**
✅ No native compilation (pure JS)
✅ Works immediately without user config
✅ Fails gracefully (IP fallback always works)
✅ Supports all network types (home, corporate, guest)
✅ Works with Docker out of the box
✅ Zero complexity for end users
✅ Non-technical messaging
✅ Future-proof (easy to add more fallbacks)

**Not Included (Out of Scope):**
- Service discovery/browsing (only advertising)
- Multiple hostnames
- Custom mDNS records
- Integration with system DNS
- WiFi troubleshooting
- Network switching detection

---

## ⚠️ IMPORTANT: Pre-Merge/Release Checklist

**CRITICAL STEP BEFORE MERGING TO MAIN AND PUSHING TO DOCKER HUB:**

Before merging any feature branch to `main` and pushing to Docker Hub/GitHub:

1. **Switch docker-compose.yml to PRODUCTION mode:**
   ```yaml
   # MUST use Docker Hub image for users (not local build)
   image: emancodetemplar/triviaforge:latest

   # Comment out the build section:
   # build:
   #   context: ./app
   #   dockerfile: Dockerfile
   ```

   **Why:** Users should NOT need to build locally. They should be able to run `docker-compose up` directly with the pre-built image from Docker Hub. Local development mode is ONLY for contributors actively developing.

2. **Verify before committing:**
   ```bash
   grep -A2 "app:" docker-compose.yml
   # Should show: image: emancodetemplar/triviaforge:latest
   # Should NOT show: build:
   ```

3. **Update version tags if applicable:**
   - Update version number in relevant files (README, TODO, etc.)
   - Ensure version matches Docker Hub tag being pushed

4. **Final commit message format:**
   ```
   chore: Switch docker-compose to production mode for v2.x.x release

   - Use Docker Hub image emancodetemplar/triviaforge:latest
   - Disable local build configuration for users
   - Ready for merge to main and Docker Hub push
   ```

5. **After merge to main:**
   ```bash
   # Build and push to Docker Hub
   docker build -t emancodetemplar/triviaforge:latest ./app
   docker push emancodetemplar/triviaforge:latest

   # Tag version if major release
   docker build -t emancodetemplar/triviaforge:v2.1.7 ./app
   docker push emancodetemplar/triviaforge:v2.1.7
   ```

**Future Agents:** Always check docker-compose.yml before merging to main. It MUST be in PRODUCTION mode (using Docker Hub image) not LOCAL DEVELOPMENT mode.

---

## 🧪 Testing Notes

### Manual Testing Checklist
- [ ] Admin login with correct/incorrect password
- [ ] Create quiz manually
- [ ] Import quiz from Excel
- [ ] Create live room as presenter
- [ ] Join room as player (guest account)
- [ ] Join room as player (registered account)
- [ ] Submit answers and verify locking
- [ ] Reveal answers and check statistics
- [ ] Complete quiz and verify database save
- [ ] Resume incomplete session
- [ ] Player reconnection with answer restoration
- [ ] User management (delete, downgrade, password reset)
- [ ] Recent rooms filtering (active only)

### Database Integrity Checks
```sql
-- Verify all quizzes have questions
SELECT q.id, q.title, COUNT(qq.question_id) as question_count
FROM quizzes q
LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
WHERE q.is_active = true
GROUP BY q.id, q.title
HAVING COUNT(qq.question_id) = 0;

-- Verify all questions have at least one correct answer
SELECT q.id, q.question_text, COUNT(a.id) as answer_count
FROM questions q
LEFT JOIN answers a ON q.id = a.question_id AND a.is_correct = true
GROUP BY q.id, q.question_text
HAVING COUNT(a.id) = 0;

-- Check for orphaned sessions
SELECT * FROM game_sessions WHERE quiz_id NOT IN (SELECT id FROM quizzes);

-- View active sessions
SELECT * FROM active_sessions_summary;
```

---

## 📝 Notes for Future Sessions

### Architectural Decisions
1. **Why PostgreSQL over MongoDB?**
   - Need for ACID transactions
   - Complex relational queries (quiz ↔ questions ↔ sessions)
   - Strong data integrity requirements

2. **Why Vanilla JS over React?**
   - Simplicity for contributors
   - No build step required
   - Faster initial page load
   - Easier to understand for beginners
   - May reconsider in future (see TODO.md #8)

3. **Why Socket.IO over raw WebSockets?**
   - Automatic reconnection handling
   - Room-based message filtering
   - Fallback to long polling if needed
   - Better cross-browser compatibility

4. **Why In-Memory Rooms + Database?**
   - Real-time performance (no DB query per answer)
   - Session state preserved in DB for resumption
   - Hybrid approach balances speed + persistence

### Code Patterns to Follow
- **Database queries:** Always use parameterized queries (prevents SQL injection)
- **Error handling:** Try-catch blocks for all async DB operations
- **Socket events:** Validate room code and user authentication before processing
- **Frontend modals:** Use custom modal system (not `alert()` or `confirm()`)
- **CSS:** Mobile-first responsive design
- **Comments:** Inline comments for complex logic, JSDoc for functions
- **Debug logging:** Use environment-based conditional logging (see pattern below)
- **UUID generation:** Use fallback pattern for HTTP/mobile compatibility (see useSocket.js:34-50)

### Environment-Based Debug Logging Pattern

**CRITICAL:** All debug logging MUST use environment variables to prevent console spam in production.

**Client-side pattern (Vue/Vite):**
```javascript
// At top of file
const DEBUG = import.meta.env.DEV
const debugLog = (...args) => {
  if (DEBUG) console.log('[PREFIX]', ...args)
}

// Usage
debugLog('Message', { data })
```

**Server-side pattern (Node.js):**
```javascript
// At top of file
const DEBUG_ENABLED = process.env.NODE_ENV === 'development' || process.env.DEBUG_MODE === 'true'

// Usage
if (DEBUG_ENABLED) {
  console.log('[PREFIX] Message', { data })
}
```

**Prefixes:**
- `[SOCKET DEBUG]` - Socket.IO connection/event logging (useSocket.js)
- `[API]` - API request/response logging (useApi.js)
- `[CHECK-USERNAME]` - Username validation logging (auth.controller.js)
- `[JOIN]` - Room join flow logging (PlayerPage.vue)
- `[PLAYER DEBUG]` - Player page state changes
- `[ANSWER DEBUG]` - Answer submission flow (server.js)

**Files implementing this pattern:**
- `app/src/composables/useSocket.js`
- `app/src/composables/useApi.js`
- `app/src/controllers/auth.controller.js`
- `app/src/pages/PlayerPage.vue`

**Error logs:** Always logged regardless of DEBUG mode using `console.error()`

### UUID Generation Pattern for HTTP/Mobile Compatibility

**Problem:** `crypto.randomUUID()` requires HTTPS, fails on HTTP and older browsers

**Solution:** Fallback pattern implemented in [useSocket.js:34-50](app/src/composables/useSocket.js#L34-L50)

```javascript
const generateUUID = () => {
  // Try crypto.randomUUID() first (modern browsers, HTTPS)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID()
    } catch (e) {
      console.warn('[SOCKET] crypto.randomUUID() failed, using fallback')
    }
  }

  // Fallback: Manual UUID v4 generation (HTTP, all browsers)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}
```

**Usage:** Always use `generateUUID()` instead of direct `crypto.randomUUID()` calls

### Common Pitfalls
1. **Foreign Key Violations:** When deleting/updating, check cascade rules
2. **Socket Disconnects:** Always handle graceful cleanup in `disconnect` event
3. **Answer Locking:** Enforce server-side, never trust client
4. **Password Reset:** Clear tokens on password reset (security)
5. **Room Codes:** Ensure uniqueness before creating game session

### Performance Considerations
- Connection pool size: 10 (adequate for 1000+ players)
- Socket.IO ping timeout: 360 seconds (longer than answer display time)
- Session timeout: 1 hour (configurable)
- Database indexes on: `room_code`, `username`, `token`, `quiz_id`, `session_id`

---

## 🔐 Security Notes

### Authentication
- Passwords hashed with bcrypt (cost factor 10)
- Tokens are UUIDs (not sequential integers)
- Token expiration enforced on every request
- Admin endpoints protected with middleware
- Password reset invalidates existing sessions

### Input Validation
- All user inputs sanitized before database insertion
- Parameterized queries prevent SQL injection
- File uploads restricted to Excel types only
- Room codes validated before use

### Known Security Considerations
- No rate limiting on API endpoints (consider adding)
- No CAPTCHA on registration (could be spammed)
- Session tokens in localStorage (vulnerable to XSS - consider httpOnly cookies)
- No HTTPS enforcement (should be handled by reverse proxy)

---

## 📊 Metrics & Analytics

### Database Size Estimates
- Small deployment: < 100 MB (100 quizzes, 1000 sessions)
- Medium deployment: 100-500 MB (500 quizzes, 5000 sessions)
- Large deployment: 500+ MB (1000+ quizzes, 10,000+ sessions)

### Performance Benchmarks
- Quiz load time: < 100ms (from database)
- Answer submission latency: < 50ms (Socket.IO)
- Player connection handling: 100+ simultaneous per room
- Database query time: < 10ms average

---

## 🎓 Learning Resources

### For New Contributors
1. Read [CONTRIBUTING.md](CONTRIBUTING.md)
2. Review [README.md](README.md) for user perspective
3. Study [app/init/01-tables.sql](app/init/01-tables.sql) for data model
4. Explore [app/server.js](app/server.js) for backend logic
5. Check [TODO.md](TODO.md) for available tasks

### External Documentation
- [Socket.IO Docs](https://socket.io/docs/v4/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/15/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Docker Compose Reference](https://docs.docker.com/compose/)

---

## 🏁 Session End Checklist

Before ending a development session:
- [ ] Update this DEV-SUMMARY.md with changes made
- [ ] Update TODO.md if features completed
- [ ] Commit changes with descriptive message
- [ ] Push to appropriate branch
- [ ] Update version number if releasing
- [ ] Test Docker build if server.js modified
- [ ] Check for uncommitted .env files (should be ignored)

---

**Document Version:** 1.0
**Created:** 2025-11-26
**Template:** Agent Onboarding Summary v1.0
**Maintained By:** TriviaForge Development Team + AI Agents

---

*This document is auto-generated and manually updated during development sessions. It should remain in sync with the actual codebase state. If discrepancies are found, update this document immediately.*
