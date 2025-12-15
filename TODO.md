# TriviaForge - Future Enhancements & Tasks

This document tracks planned features, improvements, and tasks for future development.

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
**Status:** ⏳ Pending
**Description:** Update the Docker build and deployment configuration to properly compile and serve the Vue 3 application with Vite.

**Requirements:**
- Update Dockerfile to run `npm run build` (Vite build)
- Configure Node server to serve dist/ folder (production build)
- Update docker-compose.yml if needed
- Test Docker build locally before merging to main
- Ensure environment variables work correctly in Docker

**Implementation Notes:**
- Vite outputs to `dist/` folder during build
- Server needs to serve static files from dist/
- Index.html should be served for all routes (SPA routing)

**Files to Modify:**
- `app/Dockerfile`
- `app/docker-compose.yml` (if needed)
- `app/server.js` (may need static file serving setup)

---

### B. Security Audit of Vue Migration
**Status:** ⏳ Pending
**Description:** Perform comprehensive security audit of the Vue 3 migration to identify and fix potential vulnerabilities.

**Security Checks Needed:**
- **XSS (Cross-Site Scripting):** Verify Vue's automatic escaping is working
- **CSRF (Cross-Site Request Forgery):** Check token handling in requests
- **Input Validation:** Review all form inputs and API calls
- **Authentication:** Verify token handling and session management
- **Authorization:** Check role-based access control
- **Socket.IO:** Verify authentication on WebSocket events
- **Dependencies:** Check for known vulnerabilities in packages

**Key Areas to Review:**
- `useApi.js` - API request handling
- `useSocket.js` - Socket.IO event handling
- Form components - Input sanitization
- Authentication store - Token management
- Router guards - Page access control

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

## High Priority

### 1. Preserve Choice Data in Question Editor
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

### 9. GitHub Actions - Docker Auto-Build & Push
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
**Status:** ⏳ Pending
**Description:** Allow presenters to temporarily remove (kick) a player from an active game session. This is a one-time action - kicked players can rejoin the same room if they want to.

**Questions to Clarify:**
1. Should kicked players see a notification explaining they were kicked?
2. Should kicks be logged/tracked in the session history for presenter reference?
3. Should there be a confirmation dialog before kicking?
4. What happens to the kicked player's existing answers - are they preserved or cleared?
5. Should kicked players be shown in a separate "Kicked Players" section if they rejoin?
6. Can spectators be kicked, or only active players?
7. Should there be a cooldown period before a kicked player can rejoin?
8. Should the presenter see who was kicked and when in the player list?

**Prerequisites Before Implementation:**
- [ ] Review current player connection/disconnection flow in server.js
- [ ] Understand Socket.IO room management and forced disconnections
- [ ] Review how player state is stored in `liveRooms` object
- [ ] Determine if kicked status needs database persistence or in-memory only
- [ ] Design UI/UX flow for kick action in PresenterPage.vue
- [ ] Plan notification system for kicked players in PlayerPage.vue

**Implementation Details:**
- **Backend Changes:**
  - Add `POST /api/room/kick-player` endpoint in server.js
  - Add `kickedPlayers` array to room state in `liveRooms` object
  - Emit `player-kicked` Socket.IO event to specific player
  - Update connected players list to show kick status
  - Preserve player's answer history (don't clear on kick)

- **Frontend Changes (PresenterPage.vue):**
  - Add "Kick" button next to each player in Connected Players list
  - Add confirmation modal: "Are you sure you want to kick [username]?"
  - Show kick status indicator (e.g., "👢 Kicked" badge) if player rejoins
  - Add filter to show/hide kicked players

- **Frontend Changes (PlayerPage.vue):**
  - Listen for `player-kicked` event
  - Show notification: "You have been removed from this session by the presenter. You may rejoin if needed."
  - Clear current room state and return to room entry screen
  - Allow immediate rejoin (no cooldown unless specified)

- **Database Considerations:**
  - Track kicks in `game_participants` table with `kicked_at` timestamp
  - Add `kick_count` column to track repeat offenders
  - Log kick events for presenter review

**Security Considerations:**
- Verify presenter authentication before allowing kick
- Rate limit kick actions to prevent abuse (max 10 kicks per minute)
- Validate room ownership before processing kick
- Prevent kicking the presenter themselves

**Files to Modify:**
- `app/server.js` - Kick endpoint, Socket.IO event handling
- `app/src/pages/PresenterPage.vue` - Kick button and confirmation UI
- `app/src/pages/PlayerPage.vue` - Kicked notification handling
- `app/src/composables/useSocket.js` - Add player-kicked event listener
- `app/init/tables.sql` - Add kicked tracking to game_participants

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
**Status:** ⏳ Pending
**Description:** Allow presenters/admins to ban specific offensive display names without banning the entire account. Players can rejoin with a different display name.

**Questions to Clarify:**
1. Should display name bans be case-insensitive?
2. Should partial matches be blocked (e.g., ban "badword" blocks "badword123")?
3. Should there be a global banned names list or per-room customization?
4. Who can manage the banned names list - presenters, admins, or both?
5. Should wildcard patterns be supported (e.g., "*badword*")?
6. What message should players see when their display name is banned?
7. Should players be automatically kicked if they change to a banned name mid-session?
8. Should there be a profanity filter library integration or manual list only?
9. Can players appeal display name bans?
10. Should similar spellings be detected (e.g., "b@dword", "bad_word")?

**Prerequisites Before Implementation:**
- [ ] Research profanity filter libraries (bad-words, profanity-check)
- [ ] Design banned names database schema
- [ ] Review display name validation in server.js
- [ ] Plan admin/presenter UI for managing banned names
- [ ] Determine scope (global vs room-specific vs presenter-specific)
- [ ] Define matching algorithm (exact, partial, regex, fuzzy)

**Implementation Details:**
- **Database Schema:**
  - Create `banned_display_names` table:
    - `id` (serial, primary key)
    - `banned_name` (varchar, unique)
    - `pattern_type` (enum: 'exact', 'contains', 'regex')
    - `banned_by` (foreign key to users.id)
    - `scope` (enum: 'global', 'room_specific')
    - `room_code` (varchar, nullable for room-specific bans)
    - `created_at` (timestamptz)

  - Add index on banned_name (lowercase) for fast lookups

- **Backend Changes:**
  - Add `POST /api/admin/ban-display-name` endpoint
  - Add `DELETE /api/admin/unban-display-name/:id` endpoint
  - Add `GET /api/admin/banned-display-names` endpoint
  - Integrate profanity filter library (optional): `bad-words` npm package
  - Add display name validation middleware
  - Check banned names on:
    - Room join attempts
    - Display name changes mid-session
    - Guest account creation
  - Emit `display-name-rejected` event with reason

- **Frontend Changes (AdminPage.vue):**
  - Add "Banned Display Names" section in User Management tab
  - Add form to ban new display names:
    - Name pattern (text input)
    - Pattern type (dropdown: Exact match, Contains, Regex)
    - Scope (dropdown: Global, This room only)
  - Show list of banned names with unban buttons
  - Add "Import Common Profanity List" button (pre-populate)

- **Frontend Changes (PresenterPage.vue):**
  - Add quick ban option next to player names in Connected Players
  - Show notification when player is auto-kicked for banned name

- **Frontend Changes (PlayerPage.vue):**
  - Show error on join: "This display name is not allowed. Please choose a different name."
  - Show error on name change: "Display name rejected. Please choose a different name."
  - Auto-clear name input and allow retry

**Security Considerations:**
- Validate regex patterns to prevent ReDoS attacks
- Rate limit ban name additions (prevent spam)
- Sanitize input to prevent SQL injection
- Log all display name bans for audit
- Prevent banning admin usernames

**Files to Modify:**
- `app/init/tables.sql` - Create banned_display_names table
- `app/server.js` - Name validation, ban endpoints
- `app/src/pages/AdminPage.vue` - Ban name management UI
- `app/src/pages/PresenterPage.vue` - Quick ban option
- `app/src/pages/PlayerPage.vue` - Name rejection handling
- `app/package.json` - Add bad-words library

---

### 14. Enhanced Player Security & Management
**Status:** ⏳ Pending
**Description:** Shore up player security controls and management features in the Admin User Management tab with comprehensive oversight and protection mechanisms.

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
1. Task A: Docker build process for Vue + Vite
2. Task B: Security audit (XSS, CSRF, input validation)
3. Task C: Socket.IO production testing
4. Task 9: GitHub Actions auto-build (when main is stable)
5. Task 10: mDNS service discovery for easy network access

---

**Last Updated:** 2025-12-03 (Bug fixes: Spectator filtering, Late joiner security, QR codes)
**Maintained By:** TriviaForge Development Team
