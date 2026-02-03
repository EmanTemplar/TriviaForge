# TriviaForge - Active Development Tasks (2026)

> **Purpose:** Current development priorities and pending tasks
> **Last Updated:** 2026-02-02
> **Version:** v5.3.4

---

## 🎉 Recent Milestones (v4.2.1 - January 2026)

### Style Refactoring Release ✅ COMPLETE
- Component-first CSS architecture with enhanced Button, FormInput, and Card components
- 560+ lines of duplicate CSS eliminated (12.5% reduction)
- Theme-aware color system with zero hardcoded colors
- Centralized version management
- 4 shared CSS files (navbars, scrollbars, badges, modals)

### Architecture Refactoring ✅ MOSTLY COMPLETE
- **Phase 1-3:** Foundation layer, REST API routes, Service layer ✅ COMPLETE
- **Phase 4:** Vue Component Refactoring ✅ MOSTLY COMPLETE
  - PlayerPage: 2,168 → 1,098 lines (49% reduction) ✅
  - PresenterPage: 1,815 → 762 lines (58% reduction) ✅
  - AdminPage: Refactored to current state ✅ (good enough for now)
  - Light theme visibility enhancements ✅

### Mobile Reconnection Improvements ✅ COMPLETE
- PlayerID persistence with UUID fallback for HTTP/mobile
- RoomSessionID architecture for robust session tracking
- Auto-rejoin on page refresh and app switching
- Comprehensive debug logging system

---

## 🚀 Current Priorities (Active Development)

### v5.1.0 Features - Auto Database Migrations ✅ COMPLETE

**Status:** ✅ COMPLETE
**Priority:** HIGH
**Completed:** 2026-01-26
**Branch:** `database-schema-fix-v5`

#### Database Migration System ✅
- [x] Version-based migration tracking in schema_migrations table
- [x] Automatic schema updates when version changes
- [x] Dynamic migration file detection (scans init/ directory)
- [x] Fast startup when version unchanged (skips migration check)
- [x] Individual migration tracking prevents re-running
- [x] Idempotent migrations safe for existing databases

**Files Modified:**
- `app/db-init.js` - Complete rewrite with version-based migration logic
- `app/src/config/version.js` - Updated to v5.1.0

---

### v5.0.0 Features - Multi-Admin Support & UI Improvements ✅ COMPLETE

**Status:** ✅ COMPLETE
**Priority:** HIGH
**Completed:** 2026-01-26
**Branch:** `app-enhancements-v5.0.0`

#### Multi-Admin Support System ✅
- [x] Admin session isolation - regular admins only see their own quizzes/sessions
- [x] Root admin sees all sessions across all admins
- [x] Session creator tracking - displays which admin created each session
- [x] Socket.IO ownership validation for room operations (resume, view, close)
- [x] Admin account creation with auto-generated passwords (root admin only)
- [x] Admin account deletion (root admin only, cannot delete self)
- [x] Admin password reset by root admin

#### Account Settings Enhancements ✅
- [x] Account Settings modal on Admin page with email and password change
- [x] Account Settings modal on Presenter page (matching Admin page)
- [x] Password change with current password verification
- [x] Email address management for future recovery features
- [x] Password visibility toggle on all password fields

#### UI/UX Improvements ✅
- [x] Presenter navbar dropdown matching Admin page style
- [x] User Management tab visual alignment fix (CSS Grid layout)
- [x] Last seen timestamp fix - now includes session token activity
- [x] Text truncation with ellipsis for long usernames/emails

#### Bug Fixes ✅
- [x] Logout button working on Admin and Presenter pages
- [x] Player disconnect now properly sets connectionState to 'disconnected'
- [x] Players clicking "Leave Room" immediately marked as disconnected

**Files Modified:**
- `app/src/middleware/auth.js` - Added is_root_admin flag to requireAdmin
- `app/src/controllers/session.controller.js` - Session filtering by admin
- `app/src/controllers/user.controller.js` - Fixed last seen query
- `app/src/controllers/auth.controller.js` - Admin CRUD operations
- `app/src/routes/auth.routes.js` - Admin management routes
- `app/server.js` - Socket ownership validation, disconnect fix
- `app/src/pages/AdminPage.vue` - Account settings, admin management UI
- `app/src/pages/PresenterPage.vue` - Account settings modal
- `app/src/components/presenter/PresenterNavbar.vue` - Dropdown style
- `app/src/components/admin/UserCategorySection.vue` - Grid layout
- `app/src/components/admin/SessionsList.vue` - Creator display
- `app/src/components/common/FormInput.vue` - Password toggle

---

### 1. Fix Stay-Awake Notification on Mobile 📱
**Status:** ✅ COMPLETE
**Priority:** HIGH
**Completed:** 2026-01-01 (v4.2.2)
**Branch:** `player-improvements-v4`

**Issue:** Wake lock indicator not visible on mobile browsers (navbar space constraint)

**Problem:**
- Stay-awake/wake lock status badge showed on desktop but was completely hidden on mobile
- Mobile navbar had limited space, causing wake lock indicator to be cut off
- Specifically affected Android devices at ~1008px width (Brave browser)

**Solution Implemented:**
- Changed mobile breakpoint from 768px to 1024px to match hamburger menu threshold
- Room info section now wraps to two lines on mobile (≤1024px)
- Wake lock indicator (🔆) appears on its own line below room code and connection status
- Right-aligned and slightly larger (1.1rem) for better visibility
- Increased max-width to 140px for proper layout

**Files Modified:**
- `app/src/components/player/PlayerNavbar.vue` - Added mobile-specific wrapping layout

**Testing:**
✅ Should now be visible on Android devices (~1008px width)
✅ Wraps to own line on mobile devices
✅ Desktop layout unchanged

---

### 2. Player Answer Confirmation Modal 🎯
**Status:** ✅ COMPLETE
**Priority:** HIGHEST (Biggest player experience improvement)
**Completed:** 2026-01-01 (v4.2.2)
**Branch:** `player-improvements-v4`

**Description:**
Add confirmation modal when players select an answer to prevent accidental misclicks and improve answer confidence.

**Implementation Summary:**
✅ Created `AnswerConfirmModal.vue` component with:
   - Props: `isOpen`, `selectedIndex`, `choices`
   - Emits: `confirm`, `cancel`
   - Large mobile-friendly buttons (56px-64px touch targets)
   - Grey cancel button clearly differentiated from green confirm
   - Keyboard support (Enter = Confirm, Esc = Cancel)

✅ Modified `QuestionDisplay.vue`:
   - Refactored answer choice structure for better text wrapping
   - Separated letter ("A.") from answer text as independent elements
   - Fixed mobile text wrapping issues (letters no longer wrap)
   - Fixed long word overflow with word-break on text only

✅ Modified `PlayerPage.vue`:
   - Added modal state management (showAnswerConfirmModal, pendingAnswerIndex)
   - selectAnswer() now shows modal instead of immediate submission
   - Added confirmAnswer() and cancelAnswer() handlers
   - Answer submission only on explicit confirmation

**Technical Achievements:**
- Mobile-optimized with iOS-recommended touch target sizes
- Theme-aware styling using CSS custom properties
- Comprehensive word-wrapping for normal text and long URLs/technical terms
- Letter ("A.") never wraps regardless of screen size
- Answer text wraps naturally with word-break support for edge cases

**Files Created:**
- `app/src/components/modals/AnswerConfirmModal.vue` (208 lines)

**Files Modified:**
- `app/src/components/player/QuestionDisplay.vue` - Structural refactoring for text wrapping
- `app/src/pages/PlayerPage.vue` - Modal integration

**Testing:**
✅ Mobile responsiveness verified
✅ Long text and URLs handled correctly
✅ Letter wrapping eliminated
✅ Keyboard shortcuts working
✅ Cancel/Confirm flow working correctly

---

### 3. Presenter Connected Players - Visual Improvements 👥
**Status:** ✅ COMPLETE
**Priority:** HIGH
**Completed:** 2026-01-03 (v4.2.3)
**Branch:** `presenter-improvements-v4`

**Description:**
Enhance connected players sidebar with better organization, player count summary, and connection status grouping.

**Implementation Summary:**
✅ **Player Count Summary (Priority 1)**
   - Compact icon-based summary at top: ✅ 5 • ⚠️ 2 • ❌ 1
   - Color-coded numbers (green/yellow/red)
   - Tooltips for clarity ("Connected players", etc.)
   - No text wrapping with nowrap layout

✅ **Player Status Grouping (Priority 2)**
   - Grouped players by connection status:
     - ✅ **Connected** - Active, online players (includes warning state)
     - ⚠️ **Away** - Tab/app switched
     - ❌ **Disconnected** - Network issues
   - Collapsible groups with click-to-toggle headers
   - Disconnected group starts collapsed by default
   - Alphabetical sorting within each group using localeCompare

✅ **Visual Improvements**
   - Fixed player menu dropdown overlay (removed overflow clipping)
   - Increased z-index to 9999 for proper layering
   - Neutral backgrounds with existing connection state styling
   - Improved visual hierarchy
   - Group headers with hover effects

**Technical Achievements:**
- Computed properties filter and sort players by connectionState
- CSS position: relative on groups and items for proper menu positioning
- overflow: visible on group-content to allow menu spillover
- Session-persistent collapse state (in component ref)

**Files Modified:**
- `app/src/components/presenter/ConnectedPlayersList.vue` - Complete refactor (225 insertions, 21 deletions)

**Testing:**
✅ Compact icon layout prevents text wrapping
✅ Player menus overlay correctly without border clipping
✅ Collapsible groups with persistent state
✅ Alphabetical sorting working correctly

---

### 4. All Players Answered Notification (Presenter) 📊
**Status:** ✅ COMPLETE
**Priority:** MEDIUM
**Completed:** 2026-01-03 (v4.3.0)
**Branch:** `presenter-improvements-v4`

**Description:**
Add notification to presenter when all connected players have answered the current question, with optional auto-reveal feature.

**Implementation Summary:**
✅ **Real-time Progress Tracking**
   - Progress indicator showing "X/Y answered" with percentage
   - Animated gradient progress bar
   - Only counts connected + away players (excludes disconnected)
   - Updates in real-time as players submit answers

✅ **Notification Banner**
   - Appears when all active players have answered
   - Slide-down animation for visual appeal
   - 🎯 emoji icon for clear visual indicator
   - Auto-hides when new question is presented

✅ **Auto-Reveal Functionality**
   - 3-second countdown timer with visual badge
   - Pulsing animation on countdown badge
   - Cancel button to stop auto-reveal
   - Configurable toggle (default: enabled)
   - Manual reveal cancels auto-reveal timer
   - Automatic state reset on new questions

✅ **Server-Side Detection**
   - Filters players by connection state
   - Only counts connected, away, and warning states
   - Emits 'allPlayersAnswered' event with metadata
   - Includes question index and timestamp

**Technical Achievements:**
- Vue 3 Composition API with reactive refs
- setInterval timer management with proper cleanup
- Socket.IO event-based communication
- CSS animations (slideDown, pulse)
- Theme-aware styling with custom properties
- Mobile-responsive layout

**Files Modified:**
- `app/server.js` - Server-side detection logic (17 additions)
- `app/src/pages/PresenterPage.vue` - State management and auto-reveal (85 additions)
- `app/src/components/presenter/QuizDisplay.vue` - UI components (192 additions)
- `TODO.md` - Documentation update

**Testing:**
✅ Progress bar updates in real-time
✅ Notification appears when all players answer
✅ Auto-reveal countdown works correctly
✅ Cancel button stops auto-reveal
✅ Toggle persists during session
✅ Manual reveal cancels auto-reveal
✅ New question resets state

---

---

### v5.3.x Features - Question Bank & Duplicate Detection ✅ COMPLETE

**Status:** ✅ COMPLETE
**Priority:** HIGH
**Completed:** 2026-02-02
**Branch:** `question-database-enhancement-v5`

#### v5.3.0 - Question Bank & Tagging System ✅
- [x] Question Bank panel for centralized question management
- [x] Tag system with colors for question organization
- [x] Question filtering by tag, type, archived status, search text
- [x] Archive/restore questions (soft delete)
- [x] Add existing questions to quizzes from the bank
- [x] Question Details modal with metadata and quiz usage
- [x] TagSelector and TagManager components

#### v5.3.1 - Find Duplicates Tool ✅
- [x] Levenshtein distance similarity algorithm
- [x] Configurable similarity threshold (default 80%)
- [x] Duplicate groups view with merge support
- [x] Text hash column for fast exact-match detection
- [x] FindDuplicatesPanel component

#### v5.3.2 - Ignore Duplicate Pairs ✅
- [x] Mark question pairs as "not duplicates"
- [x] Ignored pairs hidden from Find Duplicates results
- [x] View and restore ignored pairs
- [x] Database table for persistence

#### v5.3.3 - Import Duplicates Review ✅
- [x] Two-step Excel import flow (preview → review → import)
- [x] Batch duplicate checking for bulk imports
- [x] Per-item decisions: Use Existing / Create New / Skip
- [x] ImportDuplicatesReview modal component

#### v5.3.4 - Single Question Duplicate Detection ✅
- [x] Duplicate check when saving questions
- [x] DuplicateWarningModal with options
- [x] Integration with Question Editor save flow

**Files Created:**
- `app/init/09-question-bank.sql` - Question Bank tables
- `app/init/10-duplicate-detection.sql` - Text hash column
- `app/init/11-ignored-duplicate-pairs.sql` - Ignored pairs table
- `app/src/utils/similarity.js` - Levenshtein algorithm
- `app/src/controllers/questionBank.controller.js`
- `app/src/routes/questionBank.routes.js`
- `app/src/components/admin/QuestionBankPanel.vue`
- `app/src/components/admin/TagSelector.vue`
- `app/src/components/admin/TagManager.vue`
- `app/src/components/admin/QuestionDetailModal.vue`
- `app/src/components/admin/FindDuplicatesPanel.vue`
- `app/src/components/admin/DuplicateWarningModal.vue`
- `app/src/components/admin/ImportDuplicatesReview.vue`

---

### v5.2.2 Features - Lucide Icons & UI Polish ✅ COMPLETE

**Status:** ✅ COMPLETE
**Priority:** HIGH
**Completed:** 2026-02-01

#### Icon System Overhaul ✅
- [x] Replaced all emojis with Lucide icons via Iconify
- [x] Created AppIcon wrapper component for consistent icon usage
- [x] Size presets (xs, sm, md, lg, xl, 2xl) for standardized sizing
- [x] Theme-aware icon colors across all components
- [x] Fixed icon color inheritance in FormInput, ThemeSelector, WakeLockIndicator, etc.

**Files Created:**
- `app/src/components/common/AppIcon.vue` - Icon wrapper component

**Files Modified:**
- 15+ Vue components updated to use AppIcon instead of emojis
- `app/package.json` - Added @iconify/vue dependency

---

### v5.2.1 Features - Quick Fixes ✅ COMPLETE

**Status:** ✅ COMPLETE
**Priority:** HIGH
**Completed:** 2026-01-31

#### UI Improvements ✅
- [x] Widened Account Settings modal from small (400px) to medium (600px)
- [x] Removed placeholder PDF export (text file masquerading as PDF)
- [x] CSV export is sufficient for current needs

---

### v5.2.0 Features - Session Management & 2FA ✅ COMPLETE

**Status:** ✅ COMPLETE
**Priority:** HIGH
**Completed:** 2026-01-30

#### Session Management Improvements ✅
- [x] Session results export (CSV format)
- [x] Bulk export for multiple sessions (CSV)
- [x] Session filtering by date range
- [x] Session filtering by quiz name
- [x] Session filtering by status
- [x] Bulk selection and delete for sessions
- [x] Question images displayed in session details
- [x] Question breakdown with player responses

#### Two-Factor Authentication (TOTP) ✅
- [x] Database migration for TOTP fields (08-totp-support.sql)
- [x] TOTP service with otpauth library
- [x] QR code generation for authenticator apps
- [x] Two-step login flow (password → TOTP)
- [x] Backup codes generation and storage
- [x] 2FA setup UI in Account Settings
- [x] Rate limiting on TOTP verification

**Files Created:**
- `app/src/services/totp.service.js` - TOTP generation and verification
- `app/src/services/export.service.js` - CSV export functionality
- `app/src/components/admin/SessionFilters.vue` - Filter UI component
- `app/src/components/modals/TwoFactorSetupModal.vue` - 2FA setup modal
- `app/init/08-totp-support.sql` - Database migration for 2FA

**Future Consideration:**
- [ ] Remember device for 2FA (30-day trusted devices) - deferred to v5.3.0
- [ ] PDF export with proper formatting - deferred to future version

---

## 📋 Long-term / Future Enhancements

> **Note:** These are planned features but not immediate priorities. See archived TODO-2025.md for detailed specifications.

### Database & Infrastructure
- [ ] Database backup/restore strategy
- [x] Database migration versioning - v5.1.0 ✅
- [ ] Performance monitoring and query optimization
- [ ] GitHub Actions - Docker Auto-Build & Push to Docker Hub

### Security & User Management
- [ ] Implement Phase 1 security fixes from SECURITY-AUDIT.md (if not done)
- [ ] Ban Player Account system (permanent/temporary bans)
- [ ] Enhanced Player Security & Management (needs re-review post v3.2.1 improvements)
- [x] Multi-Admin Support System (isolated instances) - v5.0.0 ✅
- [x] Two-Factor Authentication (TOTP) for admins - v5.2.0 ✅
- [ ] Remember device for 2FA (30-day trusted devices) - planned v5.3.0
- [ ] Email verification for admin accounts

### Question Types & Media
- [x] True/False question type - v5.0.0 ✅
- [x] Question images (upload + URL reference) - v5.0.0 ✅
- [ ] Video/audio media support (future consideration)

### Player & Presenter Features
- [ ] Automated Presenter Mode with Timers (auto-reveal, auto-advance)
- [ ] Solo-Play Mode for Players (self-study without presenter)
- [ ] mDNS Service Discovery + Smart QR Code URLs (design phase complete, ready for implementation)
- [ ] Session analytics with charts/graphs (future)

### Bug Investigations
- [ ] Incorrect Answer Notification Bug (may be fixed by reconnection changes - needs testing)
- [ ] Socket.IO performance with large sessions (200+ concurrent players)

---

## 📝 Development Notes

### Current Focus Areas (v5.4.0)
1. ~~**2FA TOTP:** Two-Factor Authentication for admins~~ ✅ COMPLETE (v5.2.0)
2. ~~**Session Export:** CSV export of session results~~ ✅ COMPLETE (v5.2.0)
3. ~~**Session Filtering:** Date range, quiz, status filters~~ ✅ COMPLETE (v5.2.0)
4. ~~**Icons:** Replace emojis with Lucide icons~~ ✅ COMPLETE (v5.2.2)
5. ~~**Question Bank:** Centralized question management~~ ✅ COMPLETE (v5.3.0)
6. ~~**Duplicate Detection:** Find and manage duplicate questions~~ ✅ COMPLETE (v5.3.4)
7. **Remember Device:** 30-day trusted device for 2FA (planned v5.4.0)
8. **PDF Export:** Proper PDF formatting for session results (future)
9. **Solo-Play Mode:** Self-study without presenter (future)

### Testing Priorities
- Mobile browser testing (iOS Safari, Chrome Mobile, Firefox Mobile)
- Cross-browser compatibility (Edge, Firefox, Chrome, Safari)
- 2FA flow testing across devices
- Session export with large datasets

### Version Planning
- **v4.2.2 (Released):** Stay-awake fix + Answer confirmation modal ✅
- **v4.2.3 (Released):** Presenter connected players visual improvements ✅
- **v4.3.0 (Released):** All players answered notification with auto-reveal ✅
- **v5.0.0 (Released):** Multi-admin support, session isolation, account settings, True/False questions, Media/image support ✅
- **v5.1.0 (Released):** Auto database migrations with version tracking ✅
- **v5.1.1 (Released):** Idempotent migrations fix ✅
- **v5.1.2 (Released):** Login modal fix for registered accounts ✅
- **v5.2.0 (Released):** Session export (CSV), session filtering, 2FA TOTP authentication ✅
- **v5.2.1 (Released):** Widened modals, removed placeholder PDF export ✅
- **v5.2.2 (Released):** Lucide icons via Iconify, theme-aware icon colors ✅
- **v5.3.0 (Released):** Question Bank & Tagging System ✅
- **v5.3.1-5.3.4 (Released):** Duplicate Detection System (Find Duplicates, Ignore Pairs, Import Review, Single Question Check) ✅
- **v5.4.0 (Planned):** Remember device for 2FA, PDF export improvements

---

## 🏁 Completion Checklist

Before marking a task as complete:
- [ ] Feature implemented and tested locally
- [ ] Mobile responsiveness verified
- [ ] No console errors or warnings
- [ ] Code follows project patterns and style guide
- [ ] Update DEV-SUMMARY.md with changes
- [ ] Git commit with descriptive message
- [ ] Update version number if releasing

---

**Archive:** See [archive/TODO-2025.md](archive/TODO-2025.md) for historical tasks and completed features from 2025.

**Last Updated:** 2026-02-02
**Maintained By:** TriviaForge Development Team
