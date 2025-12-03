# TriviaForge - Future Enhancements & Tasks

This document tracks planned features, improvements, and tasks for future development.

## Post-Vue 3 Migration Bug Fixes (Completed)

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
