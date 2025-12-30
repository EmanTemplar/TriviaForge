# TriviaForge - Future Enhancements & Tasks

This document tracks planned features, improvements, and tasks for future development.

## 🏗️ Active Development: Architecture Refactoring (v4.0.0)

### Phase 1: Foundation Layer ✅ IN PROGRESS (2025-12-21)
**Branch:** `refactor/architecture-phase1-foundation`
**Status:** Foundation layer complete, ready for Phase 2
**Goal:** Create structural building blocks for scalable development

**Completed:**
- ✅ Created organized `src/` directory structure
- ✅ Extracted all constants to `src/config/constants.js` (500+ lines)
  - User roles, room states, API endpoints, Socket.IO events
  - HTTP status codes, error codes, validation rules
  - Database table names, environment variables
  - Single source of truth for all magic strings
- ✅ Created custom error classes (`src/utils/errors.js`, 400+ lines)
  - AppError, ValidationError, NotFoundError, UnauthorizedError
  - ForbiddenError, ConflictError, BadRequestError, DatabaseError
  - RoomError, UserError, SessionExpiredError, PasswordResetRequiredError
  - Standardized error formatting with HTTP status codes
- ✅ Created response utilities (`src/utils/responses.js`)
  - Standardized success/error response formatting
  - Pagination helpers, bulk operation responses
  - Consistent API response structure
- ✅ Created validation utilities (`src/utils/validators.js`, 500+ lines)
  - Username, password, email, display name validators
  - Room code, quiz title, question text validators
  - Express middleware for body/query/param validation
  - Input sanitization (XSS prevention)
- ✅ Created database configuration (`src/config/database.js`)
  - PostgreSQL connection pool with health checks
  - Transaction helpers with automatic rollback
  - Query execution with error handling
  - Pool statistics monitoring
- ✅ Created environment configuration (`src/config/environment.js`)
  - Centralized environment variable access
  - Type-safe configuration with validation
  - Development/production mode detection
  - Application info helpers
- ✅ Created error handler middleware (`src/middleware/errorHandler.js`)
  - Global error handling for Express routes
  - Operational vs programming error detection
  - Request context logging
  - Async route wrapper for promise handling

**Files Created:**
- `app/src/config/constants.js`
- `app/src/config/database.js`
- `app/src/config/environment.js`
- `app/src/utils/errors.js`
- `app/src/utils/responses.js`
- `app/src/utils/validators.js`
- `app/src/middleware/errorHandler.js`

**Benefits Delivered:**
- 🎯 **DRY Principle:** Eliminated 100+ instances of magic strings
- 🛡️ **Type Safety:** JSDoc-compatible type hints for better IDE support
- 🔧 **Maintainability:** Single source of truth for constants
- ✅ **Consistency:** Standardized error handling and validation
- 📊 **Observability:** Better logging and error tracking
- 🚀 **Scalability:** Foundation for modular architecture

### Phase 2: REST API Routes Modularization ✅ COMPLETE (2025-12-22)
**Branch:** `refactor/architecture-phase1-foundation`
**Status:** All REST API routes extracted to modular architecture
**Goal:** Separate route definitions from business logic for maintainability

**Completed:**
- ✅ Extract authentication routes (Phase 2a)
  - Created `src/routes/auth.routes.js` - Route definitions
  - Created `src/controllers/auth.controller.js` - Auth business logic
  - Handles: login, logout, registration, password reset, token verification
- ✅ Extract quiz routes (Phase 2b)
  - Created `src/routes/quiz.routes.js` (115 lines) - Route definitions
  - Created `src/controllers/quiz.controller.js` (720+ lines) - Quiz business logic
  - Handles: CRUD operations, Excel import/export, quiz templates
  - Removed ~580 lines from server.js
- ✅ Extract session routes (Phase 2c)
  - Created `src/routes/session.routes.js` (58 lines) - Route definitions
  - Created `src/controllers/session.controller.js` (367 lines) - Session business logic
  - Handles: List sessions (all/completed/incomplete), get session details, delete session
  - Removed ~300 lines from server.js
- ✅ Extract user routes (Phase 2d)
  - Created `src/routes/user.routes.js` (62 lines) - Route definitions
  - Created `src/controllers/user.controller.js` (170 lines) - User management logic
  - Handles: List users, delete user, downgrade player to guest, reset password
  - Removed ~140 lines from server.js
- [ ] Create route index and organize endpoints (optional - routes working well as is)

**Results:**
- **server.js reduction:** 4,275 lines → 2,859 lines (33% reduction, 1,416 lines removed)
- **Exceeded target:** Original target was 3,300 lines, achieved 2,859 lines (441 lines better)
- **New architecture:** Clear separation of routes → controllers → database
- **All features working:** No functionality lost, all endpoints tested and operational

**Architecture Roadmap:**
- **Phase 1:** Foundation layer (constants, errors, validation) ✅ COMPLETE
- **Phase 2:** Extract routes into separate modules ✅ COMPLETE
- **Phase 3:** Create service layer (RoomService, SessionService, QuizService) ✅ COMPLETE
- **Phase 4:** Refactor large Vue components (AdminPage, PlayerPage) - NEXT
- **Phase 5:** Add unit tests for utilities and services

**Documentation:**
- See `DEV-SUMMARY.md` for detailed architectural analysis
- All new modules include JSDoc comments for IDE autocomplete
- Consistent import/export patterns using ES6 modules

### Phase 3: Create Service Layer ✅ COMPLETE (2025-12-23)
**Branch:** `refactor/architecture-phase1-foundation`
**Status:** All business logic services extracted from Socket.IO handlers
**Goal:** Separate Socket.IO event handlers from business logic for testability and reusability

**Completed:**
- ✅ Created RoomService (336 lines)
  - Manages live game room state (previously `liveRooms` object)
  - Methods: createOrUpdateRoom, restoreRoom, addPlayer, removePlayer, kickPlayer
  - Methods: getRoom, getPlayers, isPlayerKicked, setCurrentQuestion
  - Methods: markQuestionPresented, markQuestionRevealed, completeQuiz, deleteRoom
  - Provides getActiveRoomsSummary for client API
  - Singleton pattern with exported instance
- ✅ Created SessionService (395 lines)
  - Handles session persistence to PostgreSQL database
  - Methods: saveSession with full transaction handling (UPSERT operations)
  - Methods: loadSession to restore game state from database
  - Auto-save scheduling and management (120 second intervals)
  - Manages autoSaveIntervals for active rooms
  - Database transaction rollback on errors
- ✅ Created QuizService (145 lines)
  - Data access layer for quiz operations
  - Methods: getQuizById, parseQuizId, formatQuizForRoom, isValidQuiz
  - Provides quiz data for Socket.IO handlers
  - Database connection pooling and error handling
- ✅ Refactored server.js Socket.IO handlers
  - Replaced all direct `liveRooms` access with `roomService.liveRooms` (50+ occurrences)
  - Updated disconnect handler, zombie cleanup, and debug endpoints
  - Replaced saveSession/getQuizById functions with service wrappers
  - Updated auto-save functions to use sessionService

**Results:**
- **Service layer complete:** 3 services (876 total lines) extracted from Socket.IO handlers
- **Architecture improvement:** Clear separation of concerns (handlers → services → database)
- **Maintainability:** Business logic now testable and reusable outside Socket.IO
- **All features working:** Real-time gameplay, auto-save, reconnection all operational

**Files Created:**
- `app/src/services/room.service.js` (336 lines)
- `app/src/services/session.service.js` (395 lines)
- `app/src/services/quiz.service.js` (145 lines)

**Files Modified:**
- `app/server.js` - Socket.IO handlers refactored to use services

### Phase 4: Vue Component Refactoring ✅ IN PROGRESS (2025-12-27)
**Branch:** `refactor/architecture-phase1-foundation`
**Status:** PlayerPage and PresenterPage refactoring complete, AdminPage pending
**Goal:** Break down monolithic Vue components into smaller, maintainable, reusable components

**Completed:**
- ✅ Extracted PlayerPage modals (Phase 4a - 2025-12-26)
  - Created 5 modal components: LoginModal, SetPasswordModal, LogoutConfirmModal, LeaveRoomConfirmModal, ChangeUsernameConfirmModal
  - Reduced PlayerPage from 2,168 → 2,115 lines (-53 lines, 2.4% reduction)
  - Replaced native `confirm()` dialogs with custom styled modals
  - All modals use consistent props/emits pattern for communication

- ✅ Extracted PlayerPage ProgressModal (Phase 4b - 2025-12-26)
  - Created ProgressModal.vue component (280 lines) - self-contained progress tracking
  - Manages own computed properties for stats (correct/incorrect/accuracy/answered)
  - Includes helper functions for question status display (getQuestionStatusClass/Icon/Text)
  - Reduced PlayerPage from 2,115 → 1,857 lines (-258 lines, 12% reduction)

- ✅ Complete PlayerPage component extraction (Phase 4c - 2025-12-26)
  - **Final Result:** PlayerPage 2,168 → 1,098 lines (-1,070 lines, 49.4% reduction)
  - Created 7 new player components (957 lines total):
    1. **PlayerNavbar.vue** (328 lines) - Navigation bar with hamburger menu, connection status, player list
    2. **QuestionDisplay.vue** (146 lines) - Quiz questions with answer selection and feedback
    3. **WaitingDisplay.vue** (123 lines) - Waiting screen with recent rooms quick join
    4. **JoinRoomSection.vue** (164 lines) - Username, display name, room code input form
    5. **RoomInfoSection.vue** (77 lines) - Room code display with action buttons
    6. **PlayersList.vue** (72 lines) - Player list with online/offline status indicators
    7. **StatusMessage.vue** (47 lines) - Dynamic status messages with type-based styling
  - Removed ~600 lines of CSS (moved to scoped component styles)
  - Simplified template from ~200 lines of nested markup to clean component tags
  - All components use props-down/events-up communication pattern
  - v-model syntax for JoinRoomSection form inputs
  - Build successful, all components importing correctly

- ✅ Complete PresenterPage component extraction (Phase 4d - 2025-12-27)
  - **Final Result:** PresenterPage 1,815 → 762 lines (-1,053 lines, 58% reduction)
  - Created 8 new presenter components (1,346 lines total):
    1. **QRCodeModal.vue** (51 lines) - QR code display modal for room joining
    2. **LiveStandingsModal.vue** (277 lines) - Real-time standings with stats dashboard
    3. **AnswerRevealModal.vue** (196 lines) - Answer reveal with player responses
    4. **PresenterNavbar.vue** (158 lines) - Navigation bar with hamburger menu
    5. **PresenterSidebar.vue** (210 lines) - Create room, resume session, active rooms widgets
    6. **QuizDisplay.vue** (228 lines) - Question list with presenter controls
    7. **ConnectedPlayersList.vue** (260 lines) - Players list with kick/ban actions
  - All business logic and Socket.IO handlers preserved in parent
  - Component-based architecture with props-down/events-up pattern
  - Simplified template structure with clean component composition

**Results:**
- **PlayerPage.vue:** 2,168 → 1,098 lines (-1,070 lines, 49.4% reduction)
- **PresenterPage.vue:** 1,815 → 762 lines (-1,053 lines, 58% reduction)
- **Total components created:** 16 (5 modals + 7 player + 3 presenter modals + 4 presenter page components)
- **Total extracted code:** 2,583 lines (1,237 player + 1,346 presenter)
- **Maintainability:** Each component has single responsibility
- **Reusability:** Components can be used in other views if needed
- **Testability:** Isolated components easier to test
- **Organization:** Related code grouped together with scoped styles

**Files Created:**
- `app/src/components/modals/ProgressModal.vue` (280 lines)
- `app/src/components/modals/LoginModal.vue` (75 lines)
- `app/src/components/modals/SetPasswordModal.vue` (92 lines)
- `app/src/components/modals/LogoutConfirmModal.vue` (35 lines)
- `app/src/components/modals/LeaveRoomConfirmModal.vue` (35 lines)
- `app/src/components/modals/ChangeUsernameConfirmModal.vue` (40 lines)
- `app/src/components/player/PlayerNavbar.vue` (328 lines)
- `app/src/components/player/QuestionDisplay.vue` (146 lines)
- `app/src/components/player/WaitingDisplay.vue` (123 lines)
- `app/src/components/player/JoinRoomSection.vue` (164 lines)
- `app/src/components/player/RoomInfoSection.vue` (77 lines)
- `app/src/components/player/PlayersList.vue` (72 lines)
- `app/src/components/player/StatusMessage.vue` (47 lines)
- `app/src/components/presenter/QRCodeModal.vue` (51 lines)
- `app/src/components/presenter/LiveStandingsModal.vue` (277 lines)
- `app/src/components/presenter/AnswerRevealModal.vue` (196 lines)
- `app/src/components/presenter/PresenterNavbar.vue` (158 lines)
- `app/src/components/presenter/PresenterSidebar.vue` (210 lines)
- `app/src/components/presenter/QuizDisplay.vue` (228 lines)
- `app/src/components/presenter/ConnectedPlayersList.vue` (260 lines)

**Files Modified:**
- `app/src/pages/PlayerPage.vue` - Refactored to use extracted components
- `app/src/pages/PresenterPage.vue` - Refactored to use extracted components

**Pending:**
- [ ] Refactor AdminPage.vue (3,345 lines → target ~500 lines)
  - Extract NavigationBar, TabNavigation, AboutPanel
  - Extract QuizOptionsPanel, BannedNamesPanel
  - Extract SessionsPanel, UserManagementPanel, Quiz components
  - Create composables (useQuizManagement, useDragAndDrop, useDialog)
- [ ] Test extracted components in browser for runtime errors
- [ ] Update documentation with Phase 4 completion details

**Architecture Roadmap:**
- **Phase 1:** Foundation layer (constants, errors, validation) ✅ COMPLETE
- **Phase 2:** Extract routes into separate modules ✅ COMPLETE
- **Phase 3:** Create service layer (RoomService, SessionService, QuizService) ✅ COMPLETE
- **Phase 4:** Refactor large Vue components ⏳ IN PROGRESS (PlayerPage ✅, PresenterPage ✅, AdminPage pending)
- **Phase 5:** Add unit tests for utilities and services - NEXT

---

## Recent Completed Features (v3.2.2)

### 1. Player Reconnection Fix
**Status:** ✅ Completed (2025-12-15)
**Description:** Fixed race condition preventing players from reconnecting after disconnection, eliminating "already a player in the room with their name" error.

**Features Implemented:**
- Force-disconnect old socket when new connection attempt detected
- New socket automatically replaces stale socket during reconnection
- Logs `[RECONNECT]` messages instead of blocking duplicates
- Seamless player experience when network drops or page refreshes
- Eliminated reconnection race condition

**Files Modified:**
- `app/server.js` - Reconnection logic (lines 2735-2759)

---

### 2. Database Query Optimization (85% Reduction)
**Status:** ✅ Completed (2025-12-15)
**Description:** Replaced inefficient DELETE+INSERT pattern with UPSERT operations, reducing database queries by 85%.

**Features Implemented:**
- Session questions use `ON CONFLICT DO UPDATE` instead of DELETE+INSERT
- Game participants use `ON CONFLICT DO UPDATE` instead of DELETE+INSERT
- Reduced queries per save from ~49 to ~15 (70% reduction per save)
- Added spectator filtering - Display sockets no longer saved to database
- Added participant cleanup query to remove kicked/left players
- Combined with interval increase: 85% total reduction in database load

**Performance Metrics:**
- DB queries per save: ~49 → ~15 (70% reduction)
- Auto-saves per hour: 60 → 30 (50% reduction)
- Total queries/hour (5 rooms): ~14,700 → ~2,250 (85% reduction)

**Files Modified:**
- `app/server.js` - UPSERT implementation (lines 328-348, 351-430)

---

### 3. Environment-based Logging Controls
**Status:** ✅ Completed (2025-12-15)
**Description:** Added verbose logging environment variable to reduce console log spam in production by ~90%.

**Features Implemented:**
- Added `VERBOSE_LOGGING` environment variable
- Automatically enabled in development mode
- Can be manually enabled in production via `VERBOSE_LOGGING=true`
- Auto-save logs now conditional (start/stop/success messages)
- Zombie cleanup logs now conditional (all levels)
- Error logs always logged regardless of mode
- Clean, minimal console output in production

**Files Modified:**
- `app/server.js` - Conditional logging throughout
- `.env.example` - Documentation for VERBOSE_LOGGING

---

### 4. Auto-save Interval Optimization
**Status:** ✅ Completed (2025-12-15)
**Description:** Increased auto-save interval from 60 seconds to 120 seconds, reducing database load by 50%.

**Features Implemented:**
- Changed AUTO_SAVE_INTERVAL from 60s to 120s (2 minutes)
- Reduces database saves by 50% while maintaining data safety
- 2-minute data loss window acceptable for quiz sessions
- Combined with UPSERT optimization for maximum performance impact

**Files Modified:**
- `app/server.js` - AUTO_SAVE_INTERVAL constant (line 2297)

---

## Recent Completed Features (v3.2.1)

### 1. Password Reset Flow Fix
**Status:** ✅ Completed (2025-12-14)
**Description:** Fixed registered player password reset workflow to properly detect admin-initiated password resets and prompt users to set new passwords.

**Features Implemented:**
- HTTP status 428 detection in PlayerPage login handler
- Automatic modal transition from login to set-password
- Fixed endpoint reference in useApi.js (`/api/auth/set-new-password`)
- Comprehensive server-side logging for authentication debugging
- End-to-end password reset flow verification

**Files Modified:**
- `app/src/pages/PlayerPage.vue` - Added 428 status detection
- `app/src/composables/useApi.js` - Fixed endpoint reference
- `app/server.js` - Added detailed logging

---

### 2. User Management Page Reorganization
**Status:** ✅ Completed (2025-12-14)
**Description:** Reorganized User Management page with separate sections for each user type, scrollable containers, and improved visual organization.

**Features Implemented:**
- Three distinct user sections:
  - 🔐 Administrators (red theme) - read-only display
  - 👤 Registered Players (blue theme) - full management actions
  - 👥 Guest Users (gray theme) - delete only
- Scrollable containers (400px max-height) with custom styled scrollbars
- Category headers with count badges
- Color-coded sections for better visual distinction
- Computed properties for automatic user filtering
- Hover effects and smooth transitions

**Files Modified:**
- `app/src/pages/AdminPage.vue` - Complete UI restructure

---

### 3. Automated Test Cleanup
**Status:** ✅ Completed (2025-12-14)
**Description:** Enhanced test suite to automatically clean up all test data (rooms, sessions, users) after test completion, eliminating manual cleanup needs.

**Features Implemented:**
- Enhanced `/api/debug/cleanup` endpoint with roomCode parameter
- Deletes specific rooms, completed sessions, and test users
- Expanded user pattern matching (test%, debug%, player%, user%, demo%)
- Clears auto-save intervals before room deletion
- Detailed cleanup statistics display:
  - Rooms deleted count
  - Database sessions deleted count
  - Test users deleted count

**Files Modified:**
- `app/server.js` - Enhanced cleanup endpoint (lines 3582-3659)
- `app/testing/test-runner.js` - Display cleanup statistics

---

## Recent Completed Features (v3.1.0)

### 1. Quiz Editor Drag-and-Drop Reordering
**Status:** ✅ Completed (2025-12-08)
**Description:** Complete quiz editor reordering system with drag-and-drop support for both questions and answer choices.

**Features Implemented:**
1. **Question Reordering:**
   - Four-arrow navigation (⇈↑↓⇊) for precise positioning
   - Drag-and-drop support with visual feedback
   - Arrows move questions up/down or to first/last position
   - Visual states: dragging opacity, drag-over highlighting, hover effects

2. **Choice Reordering:**
   - Drag letter indicators (A/B/C/D) to reorder choices
   - Smart correct answer index tracking during reordering
   - Clean UI with hover states and grab cursors

3. **UI Improvements:**
   - Removed redundant edit button (click anywhere on question to edit)
   - Increased spacing between reorder arrows and delete button (1rem gap)
   - Full visual feedback for all drag operations

**Files Modified:**
- `app/src/pages/AdminPage.vue` - Reordering functions and drag-and-drop handlers

---

### 2. Player Management: Kick Player
**Status:** ✅ Completed (2025-12-08)
**Description:** Allow presenters to remove disruptive players from active game sessions with confirmation dialog.

**Features Implemented:**
- Player action menu (⋮) next to each connected player in PresenterPage
- "Kick Player" option with confirmation modal
- Socket.IO event `kickPlayer` forcibly disconnects player
- Kicked player receives notification and returns to room entry screen
- Player can rejoin immediately if desired (no cooldown)

**Files Modified:**
- `app/src/pages/PresenterPage.vue` - Player menu and kick UI
- `app/server.js` - Socket.IO kick player event handler

---

### 3. Player Management: Ban Display Name
**Status:** ✅ Completed (2025-12-08)
**Description:** Allow presenters/admins to ban offensive display names globally, preventing anyone from using them in the future.

**Features Implemented:**
- "Ban Display Name" option in player action menu
- Adds display name to global banned names list in database
- Database table: `banned_display_names` with pattern matching support
- HTTP endpoints: `POST /api/banned-names`, `GET /api/banned-names`
- Banned player is automatically kicked from session
- Name validation prevents rejoining with banned name

**Database Changes:**
- Created `app/init/04-banned-display-names.sql` migration
- Schema includes: id, pattern, pattern_type (exact/contains), banned_by, created_at
- Indexed on pattern for fast lookups

**Files Created:**
- `app/init/04-banned-display-names.sql` - Database schema

**Files Modified:**
- `app/src/pages/PresenterPage.vue` - Ban display name UI
- `app/server.js` - Ban endpoints and validation
- `app/db-init.js` - Added migration to initialization list

---

### 4. Complete Spectator Filtering
**Status:** ✅ Completed (2025-12-08)
**Description:** Fixed all instances where spectators (Display user) appeared in presenter views, ensuring complete invisibility.

**Bugs Fixed:**
1. **Spectators in Connected Players (New Sessions):**
   - Added `.filter(p => !p.isSpectator)` to all `playerListUpdate` socket emissions
   - Affected 7 locations in server.js

2. **Spectators in Connected Players (Resumed Sessions):**
   - Proper spectator detection when loading from database
   - Detection logic: `isSpectator = row.username === 'Display' || row.display_name === 'Spectator Display'`
   - Applied at session restoration time (lines 2415-2426)

3. **Spectators in Live Standings Modal:**
   - Filtered spectators from progress API endpoint responses
   - Frontend filtering in PresenterPage standings computation

4. **Spectators in Revealed Answer Modal:**
   - Server-side filtering in `questionRevealed` event
   - Results array filters spectators before emission (line 2808)

**Files Modified:**
- `app/server.js` - Spectator filtering in multiple socket events and database loading
- `app/src/pages/PresenterPage.vue` - Spectator filtering in modals

---

## Post-Vue 3 Migration Bug Fixes (Previously Completed)

### X. Spectator Filtering, Late Joiner Security, QR Code Restoration
**Status:** ✅ Completed (2025-12-03)
**Description:** Fixed critical bugs discovered during Vue 3 migration testing related to spectator display, answer submission security, and QR code functionality.

**Bugs Fixed:**
1. **Spectator Exclusion from Statistics:**
   - Spectators were incorrectly counted as players in Live Standings modal
   - Spectators appeared in Answers Revealed modal player responses
   - Player count included spectators in status messages
   - Fixed by adding `nonSpectatorPlayers` computed property to filter `.isSpectator` users
   - Applied cross-referencing technique for server results without `isSpectator` property

2. **Late Joiner Answer Lock Security:**
   - Players joining after a question was revealed could still submit answers (cheating exploit)
   - Fixed by sending `revealed: true` flag from server for late joiners
   - Client now checks `revealed` or `isRevealed` properties and locks answer choices
   - Status message clearly indicates "This question has already been revealed"

3. **QR Code Functionality Restoration:**
   - QR codes pointed to non-existent URLs (`/player.html` instead of `/player`)
   - No auto-fill or auto-join functionality from QR codes
   - Fixed by updating server endpoints to `/player` and `/player?room=CODE` format
   - Implemented Vue Router query parameter handling with `useRoute`
   - Added auto-join functionality when QR code is scanned

**Files Modified:**
- `app/src/pages/PresenterPage.vue` - Spectator filtering in modals
- `app/src/pages/PlayerPage.vue` - Spectator filtering, revealed check, QR auto-join
- `app/src/pages/DisplayPage.vue` - Spectator filtering, QR auto-join
- `app/server.js` - QR code endpoints, revealed flag transmission

---

## Post-Vue 3 Migration Tasks (High Priority)

### A. Update Docker Build Process for Vue 3
**Status:** ✅ Completed (v3.2.2 - 2025-12-15)
**Description:** Docker build and deployment configuration properly compiles and serves the Vue 3 application with Vite.

**Implementation Verified:**
- ✅ Dockerfile runs `npm run build` (Vite build) - Line 12
- ✅ Node server configured to serve dist/ folder - server.js:78-81
- ✅ SPA fallback route for Vue Router - server.js:4184-4195
- ✅ docker-compose.yml configured with local build option
- ✅ Environment variables properly configured in docker-compose.yml
- ✅ `.dockerignore` excludes unnecessary files (node_modules, dist, .env)
- ✅ Vite build configuration optimized for production (vite.config.js)
- ✅ Code splitting enabled (vue, socket.io, utils chunks)
- ✅ Successfully tested in local Docker environment

**Build Process:**
1. Dockerfile uses Node 20 Alpine (lightweight)
2. Installs dependencies with `npm install`
3. Builds Vue app with `npm run build` → outputs to `dist/`
4. Server serves static files from `dist/` folder
5. SPA fallback serves `index.html` for all non-API routes
6. PostgreSQL database with health checks

**Production Deployment Ready:**
- Local build: Uncommented in docker-compose.yml (current)
- Docker Hub: Image reference available but commented (line 21)
- Ready to push to `emancodetemplar/triviaforge:latest`

**Files Modified:**
- ✅ `app/Dockerfile` - Complete Vue 3 build process
- ✅ `docker-compose.yml` - Added VERBOSE_LOGGING env var (v3.2.2)
- ✅ `app/server.js` - Static file serving and SPA routing
- ✅ `vite.config.js` - Production build optimization
- ✅ `app/.dockerignore` - Clean build exclusions

---

### B. Security Audit of Vue Migration
**Status:** ✅ Completed (v3.2.2 - 2025-12-15)
**Description:** Comprehensive security audit performed for self-hosted and educational deployment scenarios.

**Audit Completed:**
- ✅ XSS (Cross-Site Scripting) - Vue's automatic escaping verified, no v-html usage
- ✅ CSRF (Cross-Site Request Forgery) - **CRITICAL: Not implemented** (see report)
- ✅ Input Validation - **HIGH: Needs joi validation** (see report)
- ✅ Authentication - Verified, tokens in localStorage (**HIGH: Move to HttpOnly cookies**)
- ✅ Authorization - Role-based checks present, needs Socket.IO authentication
- ✅ Socket.IO - **HIGH: No per-event authentication** (see report)
- ✅ Dependencies - **CRITICAL: xlsx vulnerability** (see report)
- ✅ SQL Injection - **SECURE:** All queries properly parameterized
- ✅ Rate Limiting - **CRITICAL: Not implemented** (see report)

**Audit Results:**
- **Overall Rating:** ⚠️ MODERATE (requires improvements before school deployment)
- **Critical Issues:** 4 (CSRF, xlsx vulnerability, password logging, no rate limiting)
- **High Priority:** 3 (localStorage tokens, input validation, Socket.IO auth)
- **Medium Priority:** 5 (CSP, HTTPS, session timeout, weak passwords, request limits)
- **Low Priority:** 3 (security headers, audit logging, env hardening)

**Detailed Report:** See `SECURITY-AUDIT.md` for full findings and implementation guide

**Implementation Roadmap:**
- **Phase 1 (CRITICAL):** ~1 day - Required before school deployment
  - Remove password logging (5 min)
  - Replace xlsx with exceljs (2 hrs)
  - Add rate limiting (1 hr)
  - Implement CSRF protection (3 hrs)

- **Phase 2 (HIGH):** ~2 days - Enhanced security
  - Move tokens to HttpOnly cookies (4 hrs)
  - Add joi input validation (6 hrs)
  - Authenticate Socket.IO events (3 hrs)

- **Phase 3 (MEDIUM):** ~1-2 days - Production hardening
  - CSP headers, HTTPS enforcement, password strength, etc.

**Files Created:**
- `SECURITY-AUDIT.md` - Complete security audit report with fixes

**Key Areas Reviewed:**
- ✅ `useApi.js` - API request handling (needs CSRF tokens)
- ✅ `useSocket.js` - Socket.IO event handling (needs per-event auth)
- ✅ `auth.js` - Authentication store (localStorage → HttpOnly cookies)
- ✅ `router.js` - Page access control (client-side only, needs server verification)
- ✅ `server.js` - Backend security (parameterized queries ✅, needs rate limiting)

---

### C. Complete Socket.IO Production Integration Testing
**Status:** ⏳ Pending
**Description:** Test Socket.IO integration in production environment to ensure real-time features work correctly.

**Testing Requirements:**
- Test player-presenter communication in production
- Test session creation and management
- Test question presentation and answer submission
- Test real-time standings update
- Test player reconnection handling
- Test large group scenarios (50+ players)
- Test network failure recovery
- Cross-browser compatibility testing

---

### D. Production Deployment & Testing
**Status:** ⏳ Pending
**Description:** Build, test, and deploy the Vue 3 migration to production.

**Deployment Checklist:**
- Build Docker image with Vite production build
- Test locally with `docker-compose up`
- Push to Docker Hub: `emancodetemplar/triviaforge:v3.0.0`
- Test production deployment
- Verify all features work end-to-end
- Monitor for errors in production
- Update documentation if needed

---

## High Priority - Player & Presenter Experience (CRITICAL)

### 1. Mobile Reconnection Stability
**Status:** ✅ RESOLVED (2025-12-29) - Session ID architecture planned for v5.0.0
**Priority:** HIGHEST → COMPLETE
**Description:** Improve Socket.IO connection handling for seamless player experience on mobile devices.

**RESOLVED ISSUES:**

1. **Mobile Page Refresh Auto-Rejoin** ✅
   - **Problem:** Players had to manually click "Quick Join" after page refresh
   - **Root Cause:** PlayerPage's `setupSocketListeners()` removed useSocket.js event listeners with `socket.off('connect')`
   - **Fix:** Removed `.off('connect')` and `.off('disconnect')` calls (PlayerPage.vue:457-458)
   - **Result:** Auto-rejoin now works seamlessly on page refresh
   - **Files Modified:** `app/src/pages/PlayerPage.vue`

2. **App Switching Reconnection** ✅
   - **Problem:** Players appeared connected but answers didn't record after app switching
   - **Root Cause:** Android creates new socket (fires `connect`, not `reconnect` event). Old code only auto-rejoined in `reconnect` handler.
   - **Fix:** Added auto-rejoin logic to `connect` event handler (PlayerPage.vue:485-489)
   - **Result:** Seamless reconnection when switching apps
   - **Files Modified:** `app/src/pages/PlayerPage.vue`

3. **Mobile Join Failure - crypto.randomUUID() Compatibility** ✅ (2025-12-29)
   - **Problem:** Mobile devices (Android) unable to join rooms, error: "crypto.randomUUID is not a function"
   - **Root Cause:** `crypto.randomUUID()` requires HTTPS (secure context), not available on HTTP or older browsers
   - **Investigation:**
     - Initially suspected CORS issue - added CORS middleware ✅
     - Then suspected CSRF cookie issue - changed sameSite from 'strict' to 'lax' ✅
     - Both fixes necessary but insufficient
     - Browser cache prevented new debug logs from showing (required app rebuild)
     - Final error revealed: crypto.randomUUID() not supported on HTTP
   - **Fix:** Implemented UUID v4 fallback generator (useSocket.js:34-50)
     - Try `crypto.randomUUID()` first (modern browsers, HTTPS)
     - Fall back to `Math.random()` based UUID generation (HTTP, all browsers)
     - Works across all contexts and devices
   - **Result:** Mobile devices can now join rooms successfully over HTTP
   - **Files Modified:**
     - `app/src/composables/useSocket.js` - UUID fallback generator
     - `app/server.js` - CORS middleware, CSRF cookie policy

4. **Environment-Based Debug Logging** ✅ (2025-12-29)
   - **Implementation:** Converted all new debug logging to use environment variables
   - **Pattern:**
     - Client-side: `const DEBUG = import.meta.env.DEV` + `debugLog()` helper
     - Server-side: `const DEBUG_ENABLED = process.env.DEBUG_MODE === 'true'` or `NODE_ENV === 'development'`
   - **Affected Logs:** `[API]`, `[CHECK-USERNAME]`, `[JOIN]` debug logging
   - **Result:** Clean production logs, easy to enable for troubleshooting
   - **Files Modified:**
     - `app/src/composables/useApi.js` - Environment-based debug logging
     - `app/src/controllers/auth.controller.js` - Environment-based debug logging
     - `app/src/pages/PlayerPage.vue` - Updated [JOIN] logs to use DEBUG constant

5. **Debug Logging System** ✅ (Initial Implementation)
   - **Implementation:** Added comprehensive debug logging with `import.meta.env.DEV` flag
   - **Client Logs:** `[SOCKET DEBUG]` in useSocket.js, `[PLAYER DEBUG]` in PlayerPage.vue
   - **Server Logs:** `[JOIN DEBUG]`, `[ANSWER DEBUG]` in server.js (controlled by `DEBUG_MODE` env var)
   - **Result:** Future issues can be diagnosed quickly
   - **Files Modified:** `app/src/composables/useSocket.js`, `app/src/pages/PlayerPage.vue`, `app/server.js`

**PHASE 1 & 1.5: PlayerID Persistence** ✅ VERIFIED (2025-12-29)
- **Implementation:** Persistent UUID-based player identification across sessions
- **Storage:** localStorage with sessionStorage fallback (incognito mode)
- **Key:** `trivia_player_session_id` - generated once, reused forever
- **Verification Results:**
  - ✅ Page refresh auto-rejoin works correctly
  - ✅ Player state maintained (can answer immediately after reconnect)
  - ✅ PlayerID persists across browser sessions
  - ✅ Works on HTTP and HTTPS contexts (with UUID fallback)
- **Files:** `app/src/composables/useSocket.js` (lines 27-88, 151-158)

**PLANNED IMPROVEMENTS (v5.0.0 - Session ID Architecture):**

1. **Eliminate Race Conditions:**
   - Replace socket.id-based player tracking with persistent session IDs
   - Sessions persist across disconnections (no race condition window)
   - Reduces database queries by 100% on reconnection (0 vs 100 for 100 players)
   - See DEV-SUMMARY.md "UPCOMING: Session ID Architecture" section for full plan

2. **Enhanced Concurrency Handling:**
   - Handle 100+ concurrent reconnections without database bottleneck
   - O(1) socketId updates instead of full joinRoom processing
   - Multi-tab detection (same session, multiple sockets)

**REMAINING ISSUES TO ADDRESS:**

1. **Socket.IO Performance with Large Sessions:** (Partially addressed by Session ID plan)
   - Current performance degrades with many concurrent players
   - Session ID architecture will reduce DB load significantly
   - May still need connection pooling or event batching for 200+ players
   - Research comparison with Jackbox.tv games architecture

2. **Incorrect Answer Notification Bug:** (Needs investigation)
   - Players receiving wrong answer feedback ("Correct" vs "Incorrect")
   - Socket connections may be sending notifications to wrong players
   - Need to audit answer submission and result broadcasting logic
   - Add player ID validation to all answer-related socket events

3. **Stay-Awake Status Not Showing on Mobile:** (MEDIUM priority)
   - Wake lock indicator visible on desktop/dev tools but not on mobile browsers
   - May be browser-specific wake lock API compatibility issue
   - Test across iOS Safari, Chrome Mobile, Firefox Mobile
   - Add fallback visual indicator if wake lock fails

**Implementation Priority:**
1. ~~Mobile page refresh auto-rejoin~~ ✅ COMPLETE
2. ~~App switching reconnection~~ ✅ COMPLETE
3. Session ID architecture (v5.0.0 - see DEV-SUMMARY.md)
4. Fix incorrect answer notifications (CRITICAL BUG - needs investigation)
5. Stay-awake mobile visibility (MEDIUM - minor UX issue)
6. Large session performance investigation (MEDIUM - addressed by Session ID)

**Files Modified (Mobile Reconnection Fixes):**
- `app/src/composables/useSocket.js` - Debug logging, module-scoped refs
- `app/src/pages/PlayerPage.vue` - Auto-rejoin in connect handler, removed listener removal
- `app/server.js` - Debug logging for join/answer events

---

### 2. Player Answer Confirmation Modal
**Status:** ⏳ HIGH PRIORITY - Pending
**Description:** Add confirmation modal when players select an answer to prevent accidental misclicks.

**Requirements:**
- Modal appears after player taps/clicks an answer choice
- Shows selected answer with "Confirm" and "Cancel" buttons
- "Confirm" submits answer and locks choice
- "Cancel" allows re-selection
- Modal should be mobile-optimized (large touch targets)
- Optional: Show countdown timer if quiz has time limits

**Implementation:**
- Create `AnswerConfirmModal.vue` in `app/src/components/modals/`
- Add `showAnswerConfirm` state to PlayerPage
- Modify answer selection flow in QuestionDisplay component
- Style modal for mobile-first design (large buttons)
- Add keyboard support (Enter = Confirm, Esc = Cancel)

**Files to Modify:**
- `app/src/components/player/QuestionDisplay.vue` - Trigger confirmation modal
- `app/src/pages/PlayerPage.vue` - Manage confirmation state
- Create: `app/src/components/modals/AnswerConfirmModal.vue`

---

### 3. Presenter Connected Players Visual Improvements
**Status:** ⏳ HIGH PRIORITY - Pending
**Description:** Enhance connected players sidebar with better zombie disconnect handling and visual organization.

**Issues to Address:**
1. **Zombie Disconnect Handling:**
   - Current zombie cleanup causes constant reconnection issues
   - Was added to fix duplicate player bug (12x duplication in one instance)
   - Need to modify zombie detection to only trigger on actual duplicates
   - Logic: Only flag as zombie if same player appears multiple times in same room
   - Preserve legitimate disconnected players for reconnection grace period

2. **Visual Enhancements:**
   - Improve player list layout and spacing
   - Add visual grouping (connected vs disconnected vs away)
   - Show connection quality indicators (latency, stability)
   - Add player count summary at top ("12 connected, 2 away, 1 disconnected")
   - Improve answered status indicator prominence

**Implementation Details:**
- Modify zombie detection logic in `app/server.js`:
  - Check for duplicate socketIds for same username in same room
  - Only trigger zombie cleanup if duplicates detected
  - Add grace period (30 seconds) before marking as zombie

- Enhance ConnectedPlayersList.vue:
  - Add player count summary component
  - Group players by connection status
  - Add connection quality icons/colors
  - Improve answered checkmark visibility

**Files to Modify:**
- `app/server.js` - Zombie detection logic in disconnect handler
- `app/src/components/presenter/ConnectedPlayersList.vue` - Visual improvements
- `app/src/services/room.service.js` - Player duplicate detection

---

### 4. All Players Answered Notification (Presenter)
**Status:** ⏳ MEDIUM PRIORITY - Pending
**Description:** Add notification to presenter when all connected players have answered the current question, with optional auto-reveal feature.

**Features:**
- Visual notification banner: "All players have answered! 🎯"
- Audio alert option (toggle in settings)
- Progress indicator: "8/10 players answered" during question
- Auto-reveal option (configurable):
  - Toggle: "Auto-reveal answer when all players answer"
  - Default: OFF (manual reveal)
  - When enabled: Answer reveals automatically after 3-second delay

**Implementation:**
- Add computed property to track answered count vs total players
- Emit socket event when last player answers
- Display banner in PresenterPage
- Add auto-reveal toggle to quiz settings
- Store preference in quiz options or session settings

**Files to Modify:**
- `app/server.js` - Track answered count, emit "allPlayersAnswered" event
- `app/src/pages/PresenterPage.vue` - Display notification banner
- `app/src/components/presenter/QuizDisplay.vue` - Show answered progress
- `app/src/pages/AdminPage.vue` - Add auto-reveal toggle to quiz options

---

## High Priority - Feature Enhancements

### 5. Preserve Choice Data in Question Editor
**Status:** ✅ Completed (v1.0.2)
**Description:** When adding or removing answer choices in the question editor, the existing choice data disappears. Need to preserve the original choices when modifying the number of choices to prevent data loss.

**Implementation:**
- Modified `renderChoiceInputs()` to capture existing values before re-rendering
- Choice values are now preserved when adding new choices
- When removing choices, only the last choice is removed
- Data integrity maintained throughout editing process

---

### 2. Manual Question & Choice Reordering
**Status:** ✅ Completed (v1.0.2)
**Description:** Add drag-and-drop or arrow-based controls to manually reorder questions within a quiz and choices within a question.

**Implementation:**
- Arrow-based controls for question reordering (▲/▼ buttons on each question card)
- Arrow-based controls for choice reordering (▲/▼ buttons next to each choice input)
- Auto-update correct answer index when choices are reordered
- Buttons automatically disable at boundaries (first/last position)
- Visual feedback with disabled state styling

**Features Delivered:**
- Up/down arrows for question position adjustment
- Up/down arrows for choice reordering
- Auto-update correct answer index when choices are reordered
- Boundary detection (disabled buttons at first/last positions)

---

### 3. Improve Presenter Answer Reveal Layout
**Status:** ✅ Completed (v1.0.3)
**Description:** Fix the text layout in the presenter's question reveal modal to display player answers in a stacked/vertical layout for easier reading.

**Implementation:**
- Created enhanced answer reveal modal with formatted table
- Table displays: Player Name | Answer | Result (✓/✗)
- Added statistics summary (correct count, accuracy %, no answer count)
- Color-coded rows (green for correct, red for incorrect, gray for no answer)
- Scrollable player list with max-height for many players
- Visual separators between rows
- Highlighted correct answer display at top

**Features Delivered:**
- Vertical stacked table layout
- Three-column format: Player | Answer | Result
- Statistics dashboard showing accuracy metrics
- Color-coded visual feedback
- Improved readability for large groups

---

### 4. User Authentication & Account Management
**Status:** ✅ Completed (v2.1.0 - Phase 2)
**Description:** Implemented comprehensive user authentication system with guest and registered player accounts, session management, and admin controls.

**Implementation:**
- **Player Authentication System:**
  - Guest accounts created automatically on first join
  - Optional registration to upgrade guest accounts
  - Password-protected registered accounts (bcrypt hashing)
  - Separate username (account) and display name (in-game)
  - Account type indicators (guest/player/admin)

- **Session Management:**
  - JWT-based authentication tokens (UUID from PostgreSQL)
  - Configurable session timeout (default: 1 hour)
  - Token verification endpoint for persistent login
  - Auto-login for registered players with valid tokens
  - Logout functionality with session cleanup

- **User Management Interface (Admin):**
  - View all users (guests and registered players)
  - User statistics (games played, last seen, created date)
  - Password reset functionality (sets password to NULL)
  - Downgrade players to guest accounts
  - Delete user accounts with confirmation
  - Custom modal dialogs for all actions

- **Password Management:**
  - Admin-initiated password reset
  - Set password modal for players after reset
  - Password requirements (minimum 6 characters)
  - HTTP 428 status for password reset detection
  - Session invalidation on password reset

- **Player Features:**
  - Recent rooms list with active filtering
  - Quick rejoin functionality
  - Player account management page
  - Display name updates
  - Guest account registration
  - Auto-login welcome message

- **Security Features:**
  - Protected API endpoints with middleware
  - Authentication checks for registered usernames
  - Token expiration and cleanup
  - Secure password storage (bcrypt)
  - Session persistence across page reloads

- **Database Schema:**
  - Extended users table with account_type field
  - user_sessions table for authentication tokens
  - Foreign key constraints and indexes
  - Timezone-aware timestamp migration (TIMESTAMPTZ)

**Features Delivered:**
- Complete authentication flow for players
- Guest-to-registered account upgrade path
- Admin user management dashboard
- Password reset workflow
- Session persistence (1-2+ hours)
- Recent rooms with activity detection
- Custom modal system (replacing browser alerts)
- Proper log messages for account types

**Bug Fixes:**
- Fixed foreign key constraint violation when updating quizzes
- Fixed quiz questions loading authentication issue
- Fixed misleading log messages (guest vs registered)
- Reorganized UI shuffle button placement

---

## Medium Priority

### 5. Migrate to Database Backend
**Status:** ✅ Completed (v2.0.0 - Phase 1)
**Description:** Replaced JSON file-based storage with PostgreSQL database for improved data integrity, performance, and scalability.

**Implementation:**
- **Database Schema**: Fully normalized PostgreSQL schema with 11 tables:
  - `users` - User accounts (guest, player, admin)
  - `questions` - Reusable question library
  - `answers` - Answer choices with correct answer marking
  - `quizzes` - Quiz metadata and configuration
  - `quiz_questions` - Many-to-many junction for quiz-question relationships
  - `game_sessions` - Live and completed game sessions
  - `session_questions` - Session-specific question state
  - `game_participants` - Player participation tracking
  - `participant_answers` - Individual answer submissions
  - `user_sessions` - Authentication session management
  - `app_settings` - Global application settings (quiz options)

- **Database Views**: 3 optimized views for common queries
  - `quiz_full_details` - Complete quiz with questions and answers
  - `active_sessions_summary` - Active sessions with participant counts
  - `participant_performance` - Player performance statistics

- **Migration Completed:**
  - [x] Designed fully normalized database schema
  - [x] Set up PostgreSQL container via Docker Compose
  - [x] Created initialization SQL scripts (app/init/tables.sql)
  - [x] Migrated all quiz CRUD endpoints to database
  - [x] Migrated session management (create, save, list, delete, resume)
  - [x] Migrated quiz options from localStorage to database
  - [x] Updated Excel import to save to database
  - [x] Updated frontend (index.js) to work with database APIs
  - [x] Added connection pooling for concurrent access
  - [x] Implemented database transactions for data integrity
  - [x] Soft delete support for quizzes (is_active flag)
  - [x] Backward compatibility with filename format (quiz_123.json)

**Benefits Delivered:**
- Questions reusable across multiple quizzes
- Better data integrity with foreign key constraints
- Connection pooling for concurrent access (10 max connections)
- Transaction-based operations for data consistency
- Indexed queries for better performance
- Auto-updating timestamps via database triggers
- Prepared for future analytics and reporting

**Phase 2 (Authentication & User Management):**
- [x] Implement full user authentication system (✅ Completed v2.1.0)
- [x] Add role-based access control (guest/player/admin) (✅ Completed v2.1.0)
- [ ] Create database backup/restore strategy
- [ ] Add database migration versioning
- [ ] Performance monitoring and query optimization

---

### 6. Live Quiz Progress Dashboard for Presenter
**Status:** ✅ Completed (v2.1.7)
**Description:** Implemented real-time progress dashboard for presenters to view all players' quiz results and performance during active sessions.

**Implementation:**
- **Backend API**: `GET /api/room/progress/:roomCode` endpoint aggregates all player data
- **Live Standings Modal**: Full-screen dashboard accessible via "📊 Standings" button in Connected Players section
- **Overall Class Statistics**:
  - Total players connected
  - Total correct answers across all players
  - Total incorrect answers
  - Class-wide accuracy percentage
  - Average correct answers per player
- **Player Rankings Table**:
  - Sorted by correct count (primary), then by accuracy (secondary)
  - Medal recognition for top 3 players (🥇🥈🥉)
  - Per-player stats: Player name, correct count, incorrect count, accuracy %, answered count
  - Special row coloring for top performers
- **Responsive Design**: Table adapts to flexible screen sizes and handles large player groups
- **Data Integrity**: Uses server-side data only (counts only revealed questions)

**Features Delivered:**
- Real-time player standings with live rankings
- Overall class statistics dashboard
- Per-player performance metrics
- Medal recognition for top performers
- Mobile and desktop responsive layout
- Server-side validation prevents data manipulation
- Connection status tracking

**Technical Details:**
- **Frontend**: Progress modal in presenter.html with auto-updating standings table
- **Backend**: Aggregates player data from `liveRooms` object, counts only revealed questions
- **API Response**: Includes room info, total questions, player list with scores
- **Button Placement**: Full-width button below "Connected Players" header
- **Files Modified**:
  - `app/server.js` - Added `/api/room/progress/:roomCode` endpoint (lines 1955-2012)
  - `app/public/presenter.html` - Standings button, modal, and JavaScript logic
  - `app/public/styles.css` - Modal styling and responsive layout

**UI Improvements (v2.1.7):**
- Stats color hierarchy: Players/Accuracy in light blue, Total Correct in green (stands out)
- Improved layout flexibility in Active Rooms section
- Button repositioned for better layout clarity
- Added About tab to Admin page with version display and system information
  - Version badge showing v2.1.7
  - Key features overview with checklist
  - Quick start guide (4-step workflow)
  - Support & documentation links (GitHub, Issues, Discussions)
  - System information display (Application, Environment, Database, Real-time Protocol)
  - About text describing TriviaForge capabilities
  - License information (PolyForm Noncommercial License)

---

### 7. Player Progress Tracker
**Status:** ✅ Completed (v2.1.6)
**Description:** Implemented server-side session tracking and comprehensive progress modal for players to view their performance throughout the quiz.

**Implementation:**
- **Backend API**: `GET /api/player/progress/:roomCode` endpoint retrieves complete question history with correct/incorrect/pending status
- **Server-side Tracking**: Uses `room.presentedQuestions` and `room.revealedQuestions` arrays to track question presentation and answer reveal status
- **Modal Interface**: Full-screen progress modal displaying:
  - Statistics dashboard: Correct count, Incorrect count, Accuracy %, Answered count
  - Question-by-question history with status indicators:
    - ✓ Correct
    - ✗ Incorrect
    - ⏳ Waiting for reveal (answer submitted, not yet revealed)
    - ○ Not answered
  - Player's answer for each question displayed alongside correct answer after reveal

- **Persistent Data**: Progress data persists across player disconnections/reconnections within the same session
- **UI Components**:
  - Progress button in navbar (center-aligned, visible only when in active room)
  - Alternative button in sidebar for accessibility
  - Modal opens on button click with smooth animation

- **Data Integrity**: Server-side calculation based on actual room state, not client-side estimation

**Features Delivered:**
- Complete session-based progress tracking without client-side storage
- Statistics dashboard with accuracy metrics
- Detailed question-by-question history with visual status icons
- Persistent across disconnections and rejoin attempts
- Mobile-optimized modal display
- Real-time answer status indicators
- Server-side validation prevents data manipulation

**Technical Details:**
- **Frontend**: Fetches from `GET /api/player/progress/:roomCode` endpoint
- **Backend**: Queries `room.presentedQuestions.includes(index)` and `room.revealedQuestions.includes(index)` arrays
- **Data Storage**: Persists in server's `liveRooms` object during active sessions
- **API Response**: Returns array of questions with presentation status, reveal status, and player's answer
- **Files Modified**:
  - `app/server.js` - Added `/api/player/progress/:roomCode` endpoint (lines 1889-1953)
  - `app/public/player.html` - Added progress modal, button, and fetch/display logic
  - `app/public/styles.css` - Added modal styling and responsive layout
  - `docker-compose.yml` - Fixed to build from local Dockerfile instead of Docker Hub image

**Bug Fixes During Implementation:**
- Fixed data structure mismatch: Backend was expecting objects with `.index` and `.revealed` properties, but arrays stored simple number indices. Corrected to use `.includes()` method
- Fixed CSS viewport height: Changed player container from `height: 100vh` to `height: calc(100vh - 60px)` to prevent unwanted 5px scrolling on mobile devices

---

## Long-term / Major Refactors

### 8. Vue 3 Migration for Frontend
**Status:** ✅ Completed (v3.0.0)
**Description:** Restructured the HTML/JavaScript codebase using Vue 3 to improve scalability, maintainability, and developer experience while keeping bundle size minimal.

**Benefits Delivered:**
- ✅ Component-based architecture with reusable Vue components
- ✅ Reactive state management with Composition API and Pinia
- ✅ Improved code reusability and organization
- ✅ Modern development workflow with Vite and HMR
- ✅ Easier to onboard new developers with clear structure
- ✅ Better testing capabilities with component isolation
- ✅ Smaller bundle size compared to alternatives

**Implementation Summary:**
- ✅ Vue 3 + Vite development environment set up (dev server on :5174)
- ✅ Component library created: Modal, Notification, Button, Card
- ✅ All 6 pages migrated to Vue components:
  - LoginPage.vue - Admin/Presenter login
  - AdminPage.vue - Quiz and user management (with resizable columns)
  - PresenterPage.vue - Game hosting with live standings
  - PlayerPage.vue - Quiz participation with progress tracking
  - PlayerManagePage.vue - Account management
  - DisplayPage.vue - Spectator view
- ✅ Vue Router configured with proper routing
- ✅ Pinia state stores for auth, quiz, and game state
- ✅ Socket.IO integration via Vue composables
- ✅ Hot Module Replacement (HMR) enabled for development

**Improvements During Migration:**
- Fixed hamburger menu responsive behavior
- Fixed logout routing for Admin/Presenter pages
- Optimized layout padding and width constraints
- Enhanced question text visibility (removed truncation)
- Implemented resizable columns in AdminPage
- Fixed dropdown menu contrast
- Added desktop navbar separator fixes
- Proper scoped CSS styling per component

**Migration Strategy (Completed):**
1. ✅ Set up Vue 3 + Vite development environment
2. ✅ Create component library matching current UI
3. ✅ Migrate page by page (all 6 pages completed)
4. ✅ Implement state management with Pinia
5. ✅ Set up Socket.IO integration with Vue composables
6. ✅ Test all pages for functionality and layout
7. ✅ Optimize CSS and styling with variables
8. ✅ Enhance UI/UX during migration

**Why Vue 3 over React:**
- Better reactive state management for real-time features (like live quizzes)
- Smaller final bundle size (important for web apps)
- Lower cognitive overhead for team onboarding
- Excellent balance of features and simplicity
- Composition API better suited for complex interactive components
- Superior developer experience with single-file components

---

### 9. Automated Presenter Mode with Timers
**Status:** ⏳ Planned (Long-term Feature)
**Description:** Fully automated quiz hosting with configurable timers, auto-reveal, and auto-advance to next question.

**Features:**
1. **Question Timer System:**
   - Configurable timer per quiz (30s, 60s, 90s, 120s, custom)
   - Visual countdown display for presenter and players
   - Timer starts when question is presented
   - Timer pauses if all players answer early
   - Warning indicators at 10 seconds remaining

2. **Auto-Reveal Answer:**
   - Answer reveals automatically when:
     - Timer expires, OR
     - All connected players have answered (whichever comes first)
   - 3-second delay before revealing (grace period)
   - Option to disable auto-reveal (manual control only)

3. **Auto-Advance to Next Question:**
   - After answer is revealed, show results for 10 seconds (configurable)
   - Automatically present next question
   - Option to pause between questions (presenter can manually advance)
   - "Auto-mode ON" indicator in presenter UI

4. **Quiz Completion:**
   - After final question, auto-complete quiz after result display
   - Save session automatically
   - Display final standings modal
   - Option to restart quiz or return to lobby

**Configuration Options (Quiz Settings):**
- Enable/disable automated mode (default: OFF)
- Question timer duration (default: 60 seconds)
- Answer reveal delay (default: 3 seconds)
- Results display duration (default: 10 seconds)
- Auto-advance enabled/disabled (default: ON when auto-mode enabled)

**Implementation:**
- Add timer configuration to quiz options in database
- Create countdown timer component for presenter and player views
- Add server-side timer tracking and event emission
- Implement auto-reveal logic when timer expires or all answered
- Implement auto-advance logic with configurable delay
- Add UI controls to toggle auto-mode on/off during session

**Files to Modify:**
- `app/init/01-tables.sql` - Add timer settings to quiz options
- `app/server.js` - Server-side timer tracking and auto-reveal/advance logic
- `app/src/pages/PresenterPage.vue` - Auto-mode toggle, timer display
- `app/src/pages/PlayerPage.vue` - Countdown timer display
- `app/src/pages/AdminPage.vue` - Quiz timer configuration UI
- Create: `app/src/components/common/CountdownTimer.vue`

---

### 10. Solo-Play Mode for Players
**Status:** ⏳ Planned (Long-term Feature)
**Description:** Allow players to start and complete quizzes independently without presenter interaction, creating a "self-study" or "practice" mode.

**Features:**
1. **Quiz Browser for Players:**
   - Player page shows "Browse Quizzes" section
   - List all available quizzes from database
   - Show quiz title, question count, difficulty (if tagged)
   - "Start Solo Quiz" button for each quiz

2. **Solo Session Creation:**
   - Player clicks "Start Solo Quiz"
   - System creates a private room with auto-generated code
   - Room is marked as "self-ran" (solo mode)
   - Player automatically joins as participant
   - Quiz starts immediately (no presenter needed)

3. **Solo Quiz Flow:**
   - Questions auto-advance after answer selection
   - Timer-based (use quiz's configured timer, default 60s)
   - Answer reveals automatically after selection
   - Immediate feedback (correct/incorrect)
   - Progress tracking throughout quiz
   - Can pause and resume later (save progress)

4. **Presenter View Integration:**
   - Solo sessions appear in Active Rooms list
   - Marked with "🎓 Solo" indicator
   - Presenter can view but not control (read-only)
   - Shows player progress and current question
   - Option to "Promote to Hosted Session" (take over as presenter)

5. **Solo Results & History:**
   - Session saved with "solo_mode: true" flag
   - Results displayed at completion
   - Player can view past solo attempts
   - Compare scores across attempts
   - Export results (optional)

**Database Changes:**
- Add `is_solo_mode` boolean to `game_sessions` table
- Add `solo_player_id` foreign key to track solo player
- Add indexes for solo session queries

**Security Considerations:**
- Solo rooms are private (cannot be joined by other players)
- Solo sessions count toward player statistics
- Rate limit solo session creation (prevent abuse)

**Implementation:**
- Add quiz browser to PlayerPage (when not in active room)
- Create solo session endpoint: `POST /api/player/start-solo/:quizId`
- Modify room creation logic to support solo mode
- Add auto-advance logic for solo sessions
- Update PresenterPage to display solo sessions differently
- Add "Promote to Hosted" feature for presenters

**Files to Modify:**
- `app/init/01-tables.sql` - Add solo mode columns to game_sessions
- `app/server.js` - Solo session creation endpoint, auto-advance logic
- `app/src/pages/PlayerPage.vue` - Quiz browser UI, solo session controls
- `app/src/pages/PresenterPage.vue` - Solo session indicator, promote feature
- `app/src/services/room.service.js` - Solo room creation and management
- `app/src/services/session.service.js` - Solo session persistence

---

### 11. GitHub Actions - Docker Auto-Build & Push
**Status:** Planned
**Description:** Set up GitHub Actions workflow to automatically build and push Docker images to Docker Hub on commits/releases.

**Workflow Requirements:**
- Trigger on push to `main` branch
- Trigger on new version tags (e.g., `v1.0.0`)
- Build Docker image with proper tagging
- Push to Docker Hub (emancodetemplar/triviaforge)
- Tag versions appropriately:
  - `latest` for main branch
  - `v1.0.0` for version tags
  - `dev` for development branch (optional)

**Implementation Steps:**
- [ ] Create `.github/workflows/docker-build.yml`
- [ ] Add Docker Hub credentials to GitHub Secrets
- [ ] Configure multi-stage build optimization
- [ ] Add build caching for faster builds
- [ ] Set up automated testing before build
- [ ] Add build status badge to README

**Sample Workflow Structure:**
```yaml
name: Docker Build and Push

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Set up Docker Buildx
      - Login to Docker Hub
      - Extract metadata
      - Build and push
      - Update Docker Hub description
```

---

### 10. mDNS Service Discovery + Smart QR Code URLs
**Status:** Planned (Design Phase)
**Description:** Implement Multicast DNS (mDNS) for easy local network access and smart QR code generation that automatically adapts to network capabilities. Users can access the server via `http://triviaforge.local` without needing to know the IP address. QR codes intelligently detect and use the best URL based on device capabilities.

**Problem Being Solved:**
- Users currently need to manually enter IP addresses to connect players to quiz sessions
- QR codes are currently tied to specific IP addresses, making them non-portable
- New/non-technical users struggle with IP address configuration
- Corporate networks often block mDNS, leaving no fallback option
- Older Android devices and some Windows systems don't support .local domains

**Design Approach:**

**1. Server-Side (mDNS Advertisement):**
- Package selection: `bonjour` (pure JavaScript, no native deps, cross-platform)
- Advertise service as `triviaforge` with type `_http._tcp`
- Service name: Configurable via environment variable (default: `triviaforge`)
- Include metadata: version, hostname, port
- Graceful initialization: Continue if mDNS fails (non-blocking)

**2. Docker Considerations (Critical):**
- Don't rely on mDNS inside containers due to network isolation
- Use `host` network mode on Linux (simplest, native mDNS works)
- For macOS/Windows with Docker Desktop: Skip mDNS in container, expose port normally
- Server detects if running in Docker and adjusts mDNS accordingly

**3. QR Code Smart URL Selection:**
- **Priority Order (what QR code should encode):**
  1. Check environment variable `SERVER_URL` (user override)
  2. Try mDNS hostname: `http://triviaforge.local:3000` (if enabled)
  3. Auto-detect local IP address as fallback: `http://192.168.x.x:3000`
  4. Allow manual IP entry in presenter UI (last resort)

- **QR Code Generation:**
  - Generate separate QR codes for different URL types
  - Display primary QR code (mDNS if available, IP if not)
  - Provide toggle to show alternative URLs (IP, room code)
  - Display plain text URLs below QR code for manual entry

**4. Client-Side Fallback Detection:**
- JavaScript detects if `.local` domain is accessible on the device
- If not supported: Fall back to room code + manual IP entry
- Implement detection via hidden iframe or fetch attempt (fast, non-blocking)
- Cache result in localStorage (5-minute TTL)
- Show helpful hints: "Your device doesn't support .local addresses. Use room code or manual IP entry."

**5. Configuration Options:**
- Environment variables:
  - `MDNS_ENABLED` (default: true) - Enable/disable mDNS advertising
  - `MDNS_NAME` (default: triviaforge) - Service name to advertise
  - `SERVER_URL` (optional) - Override all auto-detection
  - `USE_IP_FALLBACK` (default: true) - Allow IP fallback when mDNS fails

- Docker compose options:
  - Option 1 (Linux): `network_mode: host` for native mDNS
  - Option 2 (All platforms): Standard bridge networking + IP fallback
  - Automatic detection: Server checks `HOSTNAME` env var to detect Docker

**6. Testing Strategy:**
- Test on: Windows 10+, macOS, Linux, iOS, Android 12+, Android <12
- Test scenarios:
  - Corporate network (mDNS blocked) → IP fallback works
  - Home network (mDNS enabled) → .local domain works
  - Docker on Linux → host mode with mDNS
  - Docker on macOS/Windows → Standard networking with IP
  - Mixed device types in same room

**7. User Experience:**
- Presenter sees clear status: "Access via: triviaforge.local:3000" (with fallback info)
- QR code always available, works reliably across device types
- Admin settings page shows detected IP and mDNS status
- Error handling: Clear messages if connection fails, suggested alternatives

**Implementation Priority:**
1. Phase 1: Core mDNS + QR code (bonjour, basic config)
2. Phase 2: Client-side fallback detection + smart URL selection
3. Phase 3: Docker optimization + network mode detection
4. Phase 4: Admin UI for configuration + status display

**Files to Modify:**
- `app/server.js` - mDNS setup, IP detection, environment handling
- `app/public/presenter.html` - QR code display, URL alternatives
- `docker-compose.yml` - Network mode option, env variables
- `app/.env.example` - Configuration examples
- Documentation updates for setup instructions

**Success Criteria:**
- ✅ Beginners can deploy Docker and users auto-discover without IP entry
- ✅ Works reliably in corporate networks (with IP fallback)
- ✅ QR code works on all device types
- ✅ No compilation needed (pure JS mDNS package)
- ✅ Graceful degradation when mDNS unavailable
- ✅ Clear, non-technical user messaging

**Dependencies to Add:**
```json
{
  "bonjour": "^0.10.0"
}
```

**Excluded (Not Needed):**
- Complex mDNS browsing (only advertising is needed)
- Custom DNS configuration (use system default)
- HomeKit/Bonjour HAP compatibility (general HTTP is sufficient)

---

## High Priority - Player Interaction & Security Management

### 11. Kick Player from Live Session
**Status:** ✅ Mostly Completed (v3.1.0) - Minor enhancements pending
**Description:** Presenters can temporarily remove (kick) a player from an active game session. Kicked players can rejoin the room immediately.

**Features Implemented:**
- ✅ Players notified when kicked with clear message
- ✅ Confirmation modal before kicking player
- ✅ Kicked player's answers are preserved in session
- ✅ Spectators are not shown in player list (cannot be kicked)
- ✅ Socket.IO kick event forcibly disconnects player
- ✅ Player receives notification and returns to room entry screen
- ✅ Player can rejoin room immediately after kick

**Current Limitations / Future Enhancements:**
- ⏳ Kicks are not logged to database (in-memory only)
- ⏳ Kicked players are not differentiated visually if they rejoin
- ⚠️ **Bug:** Cooldown period intended but not working - players can rejoin immediately (needs fix)
- ⏳ No session history tracking for presenter reference
- ⏳ No "kicked count" tracking for repeat offenders

**Suggested Future Improvements:**
1. Fix cooldown period to enforce 5-second delay before rejoin
2. Add database logging for kick events (`game_participants.kicked_at`)
3. Add visual indicator (badge) for previously kicked players
4. Add kick history in presenter view

**Files Modified:**
- `app/src/pages/PresenterPage.vue` - Player menu and kick UI (v3.1.0)
- `app/server.js` - Socket.IO kick player event handler (v3.1.0)

---

### 12. Ban Player Account
**Status:** ⏳ Pending
**Description:** Allow admins to permanently ban player accounts from accessing any game sessions. Banned players cannot join any room until unbanned.

**Questions to Clarify:**
1. Should bans be global (all rooms) or room-specific?
2. Can presenters ban players, or only admins in the User Management tab?
3. Should there be ban reasons (required/optional text field)?
4. Should ban duration be configurable (permanent vs temporary - 1 hour, 1 day, 1 week)?
5. What message should banned players see when they try to join?
6. Should there be an appeal/unban workflow?
7. Should banned players' historical game data be preserved or deleted?
8. Should IP-based bans be supported in addition to account bans?
9. Can guest accounts be banned, or only registered players?
10. Should there be a ban history log showing who banned whom and when?

**Prerequisites Before Implementation:**
- [ ] Review user authentication system in server.js
- [ ] Understand difference between guest and registered player accounts
- [ ] Design ban database schema (bans table)
- [ ] Plan admin UI for ban management in AdminPage.vue
- [ ] Determine ban scope (global vs per-presenter)
- [ ] Define ban levels (account ban vs device ban)

**Implementation Details:**
- **Database Schema:**
  - Create `user_bans` table:
    - `id` (serial, primary key)
    - `user_id` (foreign key to users.id)
    - `banned_by` (foreign key to users.id - admin who issued ban)
    - `ban_reason` (text, required)
    - `ban_type` (enum: 'permanent', 'temporary')
    - `banned_at` (timestamptz)
    - `expires_at` (timestamptz, nullable)
    - `is_active` (boolean, default true)
    - `ip_address` (varchar, optional for IP bans)

  - Add `is_banned` boolean to users table for quick lookup
  - Add index on user_id and is_active for performance

- **Backend Changes:**
  - Add `POST /api/admin/ban-user` endpoint (admin only)
  - Add `POST /api/admin/unban-user` endpoint (admin only)
  - Add `GET /api/admin/banned-users` endpoint to list all bans
  - Add middleware to check ban status on room join attempts
  - Block Socket.IO connections from banned users
  - Add ban check to `/api/room/join` endpoint

- **Frontend Changes (AdminPage.vue):**
  - Add "Ban User" button in User Management tab
  - Create ban modal with fields:
    - Ban reason (required text area)
    - Ban type (radio: Permanent / Temporary)
    - Ban duration (dropdown: 1 hour, 1 day, 1 week, 1 month, custom)
    - IP ban option (checkbox)
  - Add "Banned Users" section showing active bans
  - Add "Unban" button with confirmation
  - Show ban status indicator (🚫) next to banned users

- **Frontend Changes (PlayerPage.vue):**
  - Show error message on join attempt: "Your account has been banned. Reason: [reason]. Contact admin for appeals."
  - Prevent Socket.IO connection if banned
  - Show ban expiration date if temporary ban

**Security Considerations:**
- Only admins can ban/unban users
- Rate limit ban actions (prevent ban spam)
- Log all ban/unban actions for audit trail
- Prevent admins from banning other admins
- Validate ban reasons (minimum length, no empty bans)

**Files to Modify:**
- `app/init/tables.sql` - Create user_bans table
- `app/server.js` - Ban endpoints, middleware, join validation
- `app/src/pages/AdminPage.vue` - Ban management UI
- `app/src/pages/PlayerPage.vue` - Ban error handling
- `app/src/composables/useApi.js` - Ban API calls

---

### 13. Ban Display Name Only
**Status:** ✅ Mostly Completed (v3.1.0) - Enhancement opportunities available
**Description:** Presenters/admins can ban specific offensive display names without banning the entire account. Players can rejoin with a different display name.

**Features Implemented:**
- ✅ Case-insensitive display name bans
- ✅ Partial match blocking (e.g., ban "badword" blocks "badword123")
- ✅ Global banned names list (applies to all rooms)
- ✅ Presenters and admins can manage banned names (presenters login as admins)
- ✅ Clear error notification when player tries to join with banned name
- ✅ Players automatically kicked if using banned name
- ✅ Database table `banned_display_names` with pattern matching
- ✅ HTTP endpoints: `POST /api/banned-names`, `GET /api/banned-names`
- ✅ Name validation on room join attempts
- ✅ Quick ban option in PresenterPage player action menu

**Current Limitations / Future Enhancements:**
- ⏳ Room-specific bans not supported (currently global only)
- ⏳ Wildcard/regex patterns not supported (uses `pattern_type: 'contains'`)
- ⏳ No profanity filter library integration (manual list only)
- ⏳ No appeal system (not needed for local sessions with direct host access)
- ⏳ Similar spellings not detected (e.g., "b@dword", "bad_word" not caught)

**Database Schema (Implemented):**
- Table: `banned_display_names` created via `app/init/04-banned-display-names.sql`
  - `id` (serial, primary key)
  - `pattern` (varchar, the banned text)
  - `pattern_type` (varchar: 'exact' or 'contains')
  - `banned_by` (integer, foreign key to users.id)
  - `created_at` (timestamptz)
  - Index on pattern for fast lookups

**Suggested Future Improvements:**
1. Add room-specific ban scope (optional per-room lists)
2. Integrate profanity filter library (`bad-words` npm package) for auto-detection
3. Add wildcard/regex pattern support for advanced matching
4. Add fuzzy matching to catch similar spellings (l33t speak, special characters)
5. Add "Import Common Profanity List" button in admin UI
6. Add pattern type selector in admin UI (exact/contains/regex)

**Files Modified:**
- `app/init/04-banned-display-names.sql` - Database schema (v3.1.0)
- `app/src/pages/PresenterPage.vue` - Ban display name UI (v3.1.0)
- `app/server.js` - Ban endpoints and validation (v3.1.0)
- `app/db-init.js` - Added migration to initialization list (v3.1.0)

---

### 14. Enhanced Player Security & Management
**Status:** 🔄 Needs Re-review (Post v3.2.1)
**Description:** Shore up player security controls and management features in the Admin User Management tab with comprehensive oversight and protection mechanisms.

**Note:** This task needs to be re-reviewed after the User Management improvements from v3.2.1. The reorganization into Administrators, Registered Players, and Guest Users sections may have addressed some of these requirements. A fresh assessment is needed to determine which features are still needed.

**Questions to Clarify:**
1. Should there be IP-based rate limiting to prevent spam registrations?
2. Should suspicious activity be auto-detected (e.g., rapid room joining, answer pattern anomalies)?
3. Should there be a quarantine/review status for flagged accounts?
4. What player actions should be logged for audit purposes?
5. Should admins see last login IP address and device info?
6. Should there be automatic session termination for suspicious activity?
7. Should there be export functionality for player activity logs?
8. Should GDPR data export be supported (player requests their data)?
9. Should there be account merge functionality for duplicate accounts?
10. Should two-factor authentication be supported for player accounts?

**Prerequisites Before Implementation:**
- [ ] Review current authentication system and session management
- [ ] Audit existing security vulnerabilities in player endpoints
- [ ] Design security event logging schema
- [ ] Research rate limiting libraries (express-rate-limit)
- [ ] Plan IP tracking and geolocation (optional)
- [ ] Review GDPR compliance requirements

**Implementation Details:**
- **Database Schema:**
  - Create `security_events` table:
    - `id` (serial, primary key)
    - `user_id` (foreign key to users.id)
    - `event_type` (varchar: login, join_room, kicked, banned, suspicious_activity)
    - `ip_address` (varchar)
    - `user_agent` (text)
    - `details` (jsonb)
    - `created_at` (timestamptz)

  - Add to `users` table:
    - `last_login_ip` (varchar)
    - `last_login_at` (timestamptz)
    - `login_count` (integer, default 0)
    - `is_flagged` (boolean, default false)
    - `flagged_reason` (text, nullable)

- **Backend Changes:**
  - Add rate limiting middleware:
    - Login attempts: 5 per minute per IP
    - Room joins: 10 per minute per user
    - Display name changes: 5 per hour per user

  - Add `POST /api/admin/flag-user` endpoint
  - Add `POST /api/admin/unflag-user` endpoint
  - Add `GET /api/admin/security-events/:userId` endpoint
  - Add `GET /api/admin/activity-log` endpoint (paginated)
  - Add IP tracking on login and room join
  - Add session hijacking detection (user agent changes)
  - Log all security-relevant events

- **Frontend Changes (AdminPage.vue):**
  - Enhanced User Management tab features:
    - Show last login timestamp and IP address
    - Show total games played and login count
    - Show flagged status with reason
    - Add "View Activity Log" button per user
    - Add "Flag Account" button with reason input
    - Add "Export User Data" button (GDPR compliance)

  - Add "Security Events" section:
    - Recent security events timeline
    - Filter by event type, user, date range
    - Export to CSV functionality

  - Add bulk actions:
    - Select multiple users for batch ban/delete
    - Bulk password reset
    - Bulk session termination

- **Security Features:**
  - Brute force protection on login endpoint
  - CAPTCHA integration for suspicious activity (optional)
  - Automatic session termination on password change
  - Detect and block VPN/proxy connections (optional)
  - Alert admins of unusual activity patterns

**Files to Modify:**
- `app/init/tables.sql` - Create security_events table, update users table
- `app/server.js` - Rate limiting, IP tracking, event logging
- `app/src/pages/AdminPage.vue` - Enhanced security UI
- `app/package.json` - Add express-rate-limit, helmet (security headers)

---

### 15. Multi-Admin Support System
**Status:** ⏳ Pending
**Description:** Create the ability to add multiple admin accounts for multi-coordinated administration. The global admin (from .env) remains the super admin with full privileges, while created admins have limited elevated permissions.

**Questions to Clarify:**
1. Should there be different admin permission levels (super admin, admin, moderator)?
2. What permissions should created admins have vs super admin?
   - Can they create other admins?
   - Can they delete users?
   - Can they ban users?
   - Can they modify quizzes?
   - Can they view security logs?
3. Should there be an admin approval workflow (super admin approves new admins)?
4. Should admin actions be logged with attribution (who did what)?
5. Can created admins be demoted back to regular players?
6. Should there be role-based access control (RBAC) with custom roles?
7. Should admins have separate login credentials or use player accounts with elevated privileges?
8. Should there be admin session timeout separate from player sessions?
9. Should admins see each other in an "Admin Team" list?
10. Should there be admin activity dashboards showing who's currently managing what?

**Prerequisites Before Implementation:**
- [ ] Design permission/role system architecture
- [ ] Review current admin authentication in server.js
- [ ] Plan database schema for roles and permissions
- [ ] Design admin creation UI/UX flow
- [ ] Determine permission inheritance model
- [ ] Plan audit logging for admin actions

**Implementation Details:**
- **Database Schema:**
  - Create `admin_roles` table:
    - `id` (serial, primary key)
    - `role_name` (varchar: super_admin, admin, moderator)
    - `permissions` (jsonb: array of permission strings)
    - `created_at` (timestamptz)

  - Modify `users` table:
    - Change `account_type` enum to include 'super_admin', 'admin', 'moderator'
    - Add `admin_role_id` (foreign key to admin_roles.id, nullable)
    - Add `promoted_by` (foreign key to users.id, nullable)
    - Add `promoted_at` (timestamptz, nullable)

  - Create `admin_audit_log` table:
    - `id` (serial, primary key)
    - `admin_id` (foreign key to users.id)
    - `action` (varchar: create_user, delete_user, ban_user, etc.)
    - `target_user_id` (foreign key to users.id, nullable)
    - `details` (jsonb)
    - `created_at` (timestamptz)

- **Permission System Design:**
  - **Super Admin (from .env):**
    - All permissions (unrestricted)
    - Create/demote admins
    - Delete admin accounts
    - Access all security logs
    - Modify global settings

  - **Admin (created accounts):**
    - Manage quizzes (create, edit, delete)
    - Ban/unban players (not other admins)
    - View user management
    - Reset player passwords
    - View security events
    - Kick players from sessions

  - **Moderator (optional):**
    - Kick/ban players from sessions
    - Ban display names
    - View security events (limited)
    - No quiz management
    - No permanent bans

- **Backend Changes:**
  - Add `POST /api/admin/promote-user` endpoint (super admin only)
  - Add `POST /api/admin/demote-admin` endpoint (super admin only)
  - Add `GET /api/admin/admin-list` endpoint
  - Add permission check middleware: `requirePermission(permission)`
  - Modify existing endpoints to check permissions
  - Log all admin actions to admin_audit_log
  - Separate super admin detection (check .env ADMIN_PASSWORD vs database admin)

- **Frontend Changes (AdminPage.vue):**
  - Add "Admin Management" tab (super admin only):
    - List all current admins with roles
    - Show "Promoted by" and "Promoted at" info
    - Add "Promote User to Admin" button:
      - Search/select user
      - Choose role (Admin or Moderator)
      - Confirm promotion
    - Add "Demote to Player" button per admin

  - Add "Admin Activity Log" section:
    - Show recent admin actions with timestamps
    - Filter by admin, action type, date range
    - Export to CSV

  - Show current admin's role and permissions in navbar
  - Disable UI elements based on permissions

- **Frontend Changes (LoginPage.vue):**
  - Maintain existing super admin login (uses ADMIN_PASSWORD)
  - Admin accounts login with username/password like players
  - Redirect based on account type (admin → AdminPage, player → PlayerPage)

**Security Considerations:**
- Super admin cannot be demoted or deleted
- Admins cannot promote/demote other admins (only super admin can)
- Admins cannot ban other admins
- All admin actions logged with attribution
- Permission checks on both frontend and backend
- Rate limit admin creation (prevent abuse)

**Files to Modify:**
- `app/init/tables.sql` - Create admin_roles, admin_audit_log tables
- `app/server.js` - Permission middleware, admin endpoints
- `app/src/pages/AdminPage.vue` - Admin management UI
- `app/src/pages/LoginPage.vue` - Admin login handling
- `app/src/stores/auth.js` - Role/permission state management
- `app/.env.example` - Document admin system

---

## Notes

- Tasks are prioritized based on user impact and implementation complexity
- Each task should be broken down into subtasks when work begins
- Consider creating GitHub Issues for each task for better tracking
- Some tasks may require breaking changes - plan versioning accordingly

## Summary of Completed Features

### v3.0.0 - Vue 3 Migration (Completed)
- ✅ Complete frontend migration to Vue 3
- ✅ All 6 pages migrated with enhanced functionality
- ✅ Layout optimization and UI improvements
- ✅ Resizable columns in AdminPage
- ✅ Fixed dropdown menu styling
- ✅ Ready for Docker build and production deployment

### Next Focus Areas
After Vue 3 migration is deployed to production:
1. ✅ ~~Task A: Docker build process for Vue + Vite~~ (Completed v3.2.2)
2. ✅ ~~Task B: Security audit (XSS, CSRF, input validation)~~ (Completed v3.2.2 - see SECURITY-AUDIT.md)
3. **Task B.1:** Implement Phase 1 security fixes (CRITICAL - 1 day)
4. **Task B.2:** Implement Phase 2 security fixes (HIGH - 2 days)
5. Task C: Socket.IO production testing
6. Task D: Production deployment & Docker Hub push
7. Task 9: GitHub Actions auto-build (when main is stable)
8. Task 10: mDNS service discovery for easy network access

**IMPORTANT:** Before school deployment, complete Task B.1 (Phase 1 security fixes)

---

**Last Updated:** 2025-12-15 (v3.2.2: Performance optimizations, reconnection fixes, TODO cleanup)
**Maintained By:** TriviaForge Development Team
