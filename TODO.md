# TriviaForge - Active Development Tasks (2026)

> **Purpose:** Current development priorities and pending tasks
> **Last Updated:** 2026-04-05
> **Version:** v5.10.5

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

### v5.7.0 Features - Admin-Configurable Server URL ✅ COMPLETE

**Status:** ✅ COMPLETE
**Priority:** HIGH
**Completed:** 2026-02-19
**Branch:** `server-url-tweaks-v5.7.0`

#### Admin Server URL Settings Panel ✅
- [x] New Server Settings panel in Admin > Settings tab
- [x] Shows auto-detected IP and active QR code URL
- [x] Custom server URL input with save/clear functionality
- [x] Dynamic URL resolution per-request (DB setting > env var > auto-detected IP)
- [x] Database migration for server_url in app_settings
- [x] URL format validation on save

#### Player Auth Redirect Fix ✅
- [x] Fixed pre-existing bug where players with expired tokens were redirected to landing page
- [x] Added verify-player to 401 interceptor exclusion list in useApi.js

**Files Created:**
- `app/init/15-server-url-setting.sql` - Database migration
- `app/src/components/admin/ServerSettingsPanel.vue` - Server settings panel

**Files Modified:**
- `app/server.js` - Dynamic `getServerUrl()`, updated QR endpoints, updated loadQuizOptions/GET/POST options
- `app/src/pages/AdminPage.vue` - Added ServerSettingsPanel to Settings tab
- `app/src/composables/useApi.js` - Fixed 401 interceptor for player auth
- `app/src/config/version.js` - Version bump to v5.7.0
- `docker-compose.yml` - Updated SERVER_URL default
- `.env.example` - Updated SERVER_URL comments

---

### v5.10.0 Features - Unified Navbar Redesign ✅ COMPLETE

**Status:** ✅ COMPLETE
**Priority:** HIGH
**Completed:** 2026-03-06
**Branch:** `main`

#### Unified Navbar Design System ✅
- [x] Complete rewrite of shared `navbars.css` with semantic class names
- [x] All 5 navbars unified: AdminNavbar, PresenterNavbar, PlayerNavbar, StatsNavbar, SoloPlayPage
- [x] Consistent right-aligned link placement across all pages
- [x] AppIcon (Lucide) on every navigation link
- [x] Active page bottom border underline (`--info-light`)
- [x] Hover: color change + subtle bottom border (no text underline)
- [x] Danger links (Logout, Leave) in red with danger hover
- [x] Admin-only links with `--info-light` color + opacity
- [x] Hamburger mobile menu at <=1024px with tight spacing
- [x] Admin/Presenter links visible on player-side pages when logged in as admin
- [x] Replaced emoji rank medals with AppIcon in Stats GameHistoryTable
- [x] Fixed global `a:hover` text-decoration override

**Files Modified:**
- `app/src/styles/shared/navbars.css` - Complete rewrite
- `app/src/components/admin/AdminNavbar.vue` - Complete rewrite
- `app/src/components/presenter/PresenterNavbar.vue` - Complete rewrite
- `app/src/components/player/PlayerNavbar.vue` - Complete rewrite
- `app/src/components/stats/StatsNavbar.vue` - Complete rewrite
- `app/src/pages/SoloPlayPage.vue` - Navbar unified + authStore
- `app/src/components/stats/GameHistoryTable.vue` - Emoji to AppIcon
- `app/src/config/version.js` - Bumped to v5.10.0

---

### v5.9.0 Features - Trusted Devices & Score Fix ✅ COMPLETE

**Status:** ✅ COMPLETE
**Priority:** HIGH
**Completed:** 2026-03-05
**Branch:** `main`

#### Remember Device for 2FA (30-day Trusted Devices) ✅
- [x] `trusted_devices` database table with token, expiry, user agent
- [x] Device token check in adminLogin() - skip 2FA for valid tokens
- [x] Device token generation in verifyTOTP() when "Remember" checked
- [x] "Remember this device for 30 days" checkbox on TOTP form
- [x] localStorage storage/retrieval of device token
- [x] Device token cleared on logout
- [x] All trusted devices removed when 2FA disabled
- [x] Expired device cleanup in periodic server scheduler

#### Fix gp.score Persistence ✅
- [x] Compute playerScore from answers vs correctChoice in saveSession()
- [x] Persist score for registered users (INSERT + ON CONFLICT UPDATE)
- [x] Persist score for guest users (INSERT + UPDATE on re-save)
- [x] Resolves long-standing issue where game_participants.score was always 0

**Files Created:**
- `app/init/16-trusted-devices.sql` - Database migration

**Files Modified:**
- `app/src/controllers/auth.controller.js` - Trusted device backend logic
- `app/src/services/session.service.js` - Score computation and persistence
- `app/src/pages/LoginPage.vue` - Remember device checkbox + localStorage
- `app/server.js` - cleanupExpiredDevices in scheduler
- `app/src/config/version.js` - Version bump to v5.9.0

---

### v5.8.0 Features - Player Stats Dashboard ✅ COMPLETE

**Status:** ✅ COMPLETE
**Priority:** HIGH
**Completed:** 2026-03-05
**Branch:** `main`

#### Player Stats Page ✅
- [x] New `/stats` page for registered players
- [x] Summary cards: total games, accuracy, best score, wins, avg rank, day streak
- [x] Accuracy Over Time and Score Trend line charts (Chart.js + vue-chartjs)
- [x] Paginated game history table with rank, accuracy, type badges
- [x] Type filter: All / Multiplayer / Solo with color-coded badges
- [x] Mobile-responsive card layout for history (table → cards on mobile)
- [x] Unauthenticated users see login prompt
- [x] Theme-aware Chart.js integration (reads CSS custom properties at runtime)

#### Solo Play Auth Integration ✅
- [x] Solo play saves user_id for authenticated players
- [x] optionalAuth middleware allows guest play without user_id
- [x] Dedicated playerApi composable avoids admin token conflicts
- [x] playerAuthToken fallback in Authorization header

#### Navigation ✅
- [x] "My Stats" link in PlayerNavbar (visible when logged in)
- [x] "My Stats" link in SoloPlayPage navbar
- [x] Back button in Stats navbar

#### Backend API ✅
- [x] `GET /api/stats/summary` - Aggregate stats: total games, accuracy, best score, wins, avg rank, play streak
- [x] `GET /api/stats/history?page=1&limit=20&type=all` - Paginated game history with rank computation
- [x] `GET /api/stats/charts?days=30` - Daily aggregated accuracy and score data points
- [x] Display name fallback in stats queries (for legacy sessions without user_id)

#### Technical Implementation ✅
- [x] Rank calculations based on correct_answers count from participant_answers table
- [x] Play streak: consecutive days of game participation
- [x] Accuracy calculation: (correct_answers / total_questions) × 100
- [x] All scores computed from participant_answers, not broken gp.score column
- [x] 30-day lookback for chart data

**Files Created:**
- `app/src/controllers/stats.controller.js` - Stats API handlers
- `app/src/routes/stats.routes.js` - Stats routes with requireAuth
- `app/src/pages/StatsPage.vue` - Main stats dashboard
- `app/src/components/stats/StatsNavbar.vue` - Stats navbar
- `app/src/components/stats/StatsSummary.vue` - Summary cards grid
- `app/src/components/stats/StatsCharts.vue` - Chart.js visualizations
- `app/src/components/stats/GameHistoryTable.vue` - Paginated history with filters

**Files Modified:**
- `app/server.js` - Mounted /api/stats routes
- `app/src/router.js` - Added /stats route
- `app/src/composables/useApi.js` - playerAuthToken fallback
- `app/src/config/version.js` - Bumped to v5.8.0
- `app/src/components/player/PlayerNavbar.vue` - Added "My Stats" link
- `app/src/pages/SoloPlayPage.vue` - Added StatsNavbar and "My Stats" link, saves user_id
- `app/src/controllers/solo.controller.js` - optionalAuth middleware
- `app/src/routes/solo.routes.js` - optionalAuth on create endpoint
- `app/package.json` - Added chart.js, vue-chartjs dependencies

---

### v5.6.0 Features - Game Experience & Results Display ✅ COMPLETE

**Status:** ✅ COMPLETE
**Priority:** HIGH
**Completed:** 2026-02-18
**Branch:** `feature-enhancements-v5.6.0`

#### Question Progress Counter ✅
- [x] "X / Y" pill badge in Player navbar, Display sidebar, Presenter controls
- [x] Server broadcasts revealedCount/totalQuestions with questionRevealed and playerListUpdate
- [x] Late joiners and reconnectors receive current count
- [x] Responsive logo: "TriviaForge Player" on desktop, "TF" on mobile

#### End-of-Game Results Podium ✅
- [x] Podium-style results with gold/silver/bronze for top 3 players
- [x] Staggered entrance animations
- [x] Remaining players list with rank and score
- [x] Class average chip
- [x] Per-quiz `show_results` toggle (default TRUE)
- [x] Admin toggle in Quiz Sidebar with "Results" badge

#### Quiz Completion Screen ✅
- [x] Universal "Quiz Complete!" screen for ALL quizzes on completion
- [x] Results-enabled: animated countdown before podium appears
- [x] Non-results: static message "Check your Progress to see how you did!"
- [x] Both Player and Display pages

#### Manual Mode Auto-Complete ✅
- [x] Auto-complete when all questions revealed in manual mode
- [x] Waits for answer display timeout before triggering completion
- [x] Same completion flow as auto-pilot

#### Multiple Simultaneous Displays ✅
- [x] Unique Display IDs prevent reconnection collisions
- [x] isSpectator flag as authoritative spectator detection
- [x] Reserved name protection (Display, Spectator)
- [x] Reconnection lookup skips spectator entries

#### Bug Fixes ✅
- [x] Shuffle All Choices skips True/False questions
- [x] Heartbeat false positive threshold raised (1000ms → 2000ms)
- [x] Stale room rejoin: clear localStorage on roomClosed/roomError
- [x] Auto-pilot state reset on room leave/close (Player, Display, Presenter)

**Files Created:**
- `app/init/14-show-results-setting.sql` - Database migration
- `app/src/components/player/GameResults.vue` - Podium results component

**Files Modified:**
- `app/server.js`, `app/src/services/autoMode.service.js`, `app/src/controllers/quiz.controller.js`
- `app/src/pages/PlayerPage.vue`, `app/src/pages/DisplayPage.vue`, `app/src/pages/AdminPage.vue`, `app/src/pages/PresenterPage.vue`
- `app/src/components/player/PlayerNavbar.vue`, `app/src/components/presenter/QuizDisplay.vue`, `app/src/components/admin/QuizSidebar.vue`
- `app/src/config/version.js`, `docker-compose.yml`

---

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

### v5.5.0 Features - Backend Performance & Session Health ✅ COMPLETE

**Status:** ✅ COMPLETE
**Priority:** HIGH
**Completed:** 2026-02-08
**Branch:** `main`

#### Backend Performance Optimizations ✅
- [x] Memory cleanup scheduler for rate limit Maps (runs with room expiry interval)
- [x] Socket.IO rate limiting (join and answer events) with per-IP tracking
- [x] REST API rate limiting (100 requests per 15 minutes per IP)
- [x] Room expiry with `lastActivityAt` tracking (expires after 4 hours of inactivity)
- [x] Configurable Socket.IO rate limits via environment variables

#### Session Health Monitoring ✅
- [x] `/api/admin/memory` endpoint for memory and session statistics
- [x] Session Health tab in Admin panel with visual dashboard
- [x] Memory usage display with color-coded progress bars (green/yellow/red)
- [x] Session counts (active rooms, total players, rate limit entries)
- [x] Live room details table with room code, players, questions, and activity
- [x] Server uptime display
- [x] Auto-refresh toggle (10-second interval)

#### Presenter Layout Improvements ✅
- [x] Two-column layout for presenter controls
- [x] Left column: Progress indicator, navigation buttons, complete button
- [x] Right column: Auto-Pilot toggle, timer settings, auto-reveal toggle
- [x] Responsive design (single column on mobile <900px)

#### Environment Configuration ✅
- [x] `SOCKET_RATE_WINDOW_MS` - Rate limit window (default: 60000ms / 1 minute)
- [x] `SOCKET_JOIN_LIMIT` - Max join attempts per IP per window (default: 50)
- [x] `SOCKET_ANSWER_LIMIT` - Max answer submissions per IP per window (default: 300)

**Files Created:**
- `app/src/components/admin/SessionHealthPanel.vue` - Session Health dashboard

**Files Modified:**
- `app/server.js` - Rate limiting, memory cleanup, activity tracking, admin memory endpoint
- `app/src/config/constants.js` - New defaults and env vars
- `app/src/config/environment.js` - Socket rate limit config parsing
- `app/src/pages/AdminPage.vue` - Session Health tab integration
- `app/src/components/presenter/QuizDisplay.vue` - Two-column controls layout
- `docker-compose.yml` - New environment variables
- `.env.example` - New rate limiting variables

---

### v5.4.x Features - Auto-Mode & Solo Play ✅ COMPLETE

**Status:** ✅ COMPLETE
**Priority:** HIGH
**Completed:** 2026-02-06
**Branch:** `game-session-enhancements-v5.4`

#### v5.4.0 - Auto-Mode Timer System ✅
- [x] Server-side timer engine (runs independently of presenter's browser)
- [x] Question timer with configurable duration (10-120 seconds)
- [x] Reveal delay timer (2-30 seconds between reveal and next)
- [x] Pause/Resume with remaining time preservation
- [x] Auto-advance to next question after reveal delay
- [x] All players answered → skip remaining question timer
- [x] Timer state synced to all clients via Socket.IO
- [x] CountdownTimer component for player/display views

#### v5.4.0 - Solo Play Mode ✅
- [x] REST-based self-study without presenter or Socket.IO
- [x] Solo quiz browser with solo-enabled quizzes
- [x] Per-question timer with countdown display
- [x] Immediate answer feedback (correct/incorrect)
- [x] Self-paced advancement between questions
- [x] Results summary with per-question breakdown
- [x] Play Again and Choose Another Quiz options
- [x] Guest player support (no account required)

#### v5.4.0 - Quiz Visibility Controls ✅
- [x] `available_live` flag for Presenter's quiz list
- [x] `available_solo` flag for Solo Play browser
- [x] Toggle controls in Quiz Sidebar dropdown menu
- [x] Live/Solo badges on quiz list items

#### v5.4.1-v5.4.4 - Bug Fixes ✅
- [x] Guest participants database migration fix (13-fix-solo-guest-participants.sql)
- [x] Session service ON CONFLICT fix for guest users
- [x] Timer pause/resume sync fix for player clients
- [x] Solo mode answer text theme colors fix
- [x] Solo mode answer selection reset between questions
- [x] API response extraction fix (response.data.data)
- [x] presentation_order NOT NULL constraint fix

**Files Created:**
- `app/init/12-auto-mode-solo-play.sql` - Database migration
- `app/init/13-fix-solo-guest-participants.sql` - Guest fix migration
- `app/src/services/autoMode.service.js` - Server-side timer engine
- `app/src/controllers/solo.controller.js` - Solo play REST API
- `app/src/routes/solo.routes.js` - Solo play routes
- `app/src/pages/SoloPlayPage.vue` - Solo play page
- `app/src/composables/useSoloGame.js` - Solo game state composable
- `app/src/components/player/CountdownTimer.vue` - Shared countdown timer

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
- [x] Remember device for 2FA (30-day trusted devices) - v5.9.0 ✅
- [ ] PDF export with proper formatting - deferred to future version

---

## 📋 Known Issues & Technical Debt

### Solo Play Score Persistence (FIXED in v5.9.0) ✅
- **Issue:** `gp.score` column in multiplayer game_participants was always 0
- **Fix:** saveSession() now computes correct answer count from player answers and persists to gp.score
- **Note:** Stats queries still use participant_answers for robustness (belt-and-suspenders approach)

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
- [x] Remember device for 2FA (30-day trusted devices) - v5.9.0 ✅
- [ ] Email verification for admin accounts

### Question Types & Media
- [x] True/False question type - v5.0.0 ✅
- [x] Question images (upload + URL reference) - v5.0.0 ✅
- [ ] Video/audio media support (future consideration)

### Player & Presenter Features
- [x] Automated Presenter Mode with Timers (auto-reveal, auto-advance) - v5.4.0 ✅
- [x] Solo-Play Mode for Players (self-study without presenter) - v5.4.0 ✅
- [x] Admin-Configurable Server URL for QR codes (replaces mDNS approach) - v5.7.0 ✅
- [x] Player-facing statistics dashboard with charts - v5.8.0 ✅

### Bug Investigations
- [ ] Incorrect Answer Notification Bug (may be fixed by reconnection changes - needs testing)
- [ ] Socket.IO performance with large sessions (200+ concurrent players)

---

## 📝 Development Notes

### Current Focus Areas
1. ~~**2FA TOTP:** Two-Factor Authentication for admins~~ ✅ COMPLETE (v5.2.0)
2. ~~**Session Export:** CSV export of session results~~ ✅ COMPLETE (v5.2.0)
3. ~~**Session Filtering:** Date range, quiz, status filters~~ ✅ COMPLETE (v5.2.0)
4. ~~**Icons:** Replace emojis with Lucide icons~~ ✅ COMPLETE (v5.2.2)
5. ~~**Question Bank:** Centralized question management~~ ✅ COMPLETE (v5.3.0)
6. ~~**Duplicate Detection:** Find and manage duplicate questions~~ ✅ COMPLETE (v5.3.4)
7. ~~**Auto-Mode:** Automated presenter mode with timers~~ ✅ COMPLETE (v5.4.0)
8. ~~**Solo-Play Mode:** Self-study without presenter~~ ✅ COMPLETE (v5.4.0)
9. ~~**Backend Performance:** Memory cleanup, rate limiting, session health~~ ✅ COMPLETE (v5.5.0)
10. ~~**v5.6.0:** Game Experience & Results Display~~ ✅ COMPLETE
11. ~~**v5.7.0:** Admin-Configurable Server URL~~ ✅ COMPLETE
12. **v5.8.0:** Player Stats Dashboard ✅ COMPLETE
13. **v5.9.0:** Trusted Devices for 2FA + gp.score fix ✅ COMPLETE
14. **v5.10.0:** Unified Navbar Redesign ✅ COMPLETE
15. **v5.10.5:** Auto-Pilot Fixes & Connection Optimization ✅ COMPLETE
16. **v5.11.0:** PDF Export & GitHub Actions CI/CD ✅ COMPLETE
17. **Next:** Player Management enhancements, Ban system, branding/logo
18. **Backlog:** Enhanced security audits, PDF branding header (pending logo)

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
- **v5.4.0-5.4.4 (Released):** Auto-Mode Timer System, Solo Play Mode, quiz visibility controls, bug fixes ✅
- **v5.5.0 (Released):** Backend performance optimizations, Session Health monitoring, rate limiting, presenter layout improvements ✅
- **v5.6.0 (Released):** Game Experience & Results Display - progress counter, results podium, quiz completion screen, multiple displays, manual auto-complete, bug fixes ✅
- **v5.7.0 (Released):** Admin-configurable Server URL for QR codes, player auth redirect fix ✅
- **v5.8.0 (Released):** Player Stats Dashboard - game history, summary stats, trend charts, solo auth integration ✅
- **v5.9.0 (Released):** Trusted Devices for 2FA (30-day remember), gp.score persistence fix ✅
- **v5.10.0 (Released):** Unified Navbar Redesign - shared CSS design system, admin links on player pages, consistent styling ✅
- **v5.10.5 (Released):** Auto-Pilot fixes (live question start, resume, double-reveal, banner reset), Display ghost user prevention, connection optimization (removed redundant heartbeat, reduced pingTimeout) ✅
- **v5.11.0 (Released):** Rich PDF session export (podium, leaderboard, per-question breakdown, embedded images with WebP conversion), bulk PDF as ZIP, GitHub Actions CI/CD (auto Docker push on version tag) ✅

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

**Last Updated:** 2026-03-06
**Maintained By:** TriviaForge Development Team
