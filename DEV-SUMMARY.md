# TriviaForge Development Summary

> **Purpose:** Summary of development changes for the current session
> **Last Updated:** 2026-03-05
> **Version:** v5.8.0

---

## Session Summary: v5.8.0 Release

### Overview

This development period added a player-facing statistics dashboard:
1. **v5.8.0** - Player Stats Dashboard with game history, summary stats, and trend charts

---

## v5.8.0 - Player Stats Dashboard

**Release Date:** 2026-03-05
**Branch:** `main`

### Technical Implementation Details

#### Authentication Architecture
- **Dedicated Player API:** playerApi composable avoids admin token conflicts
- **Token Fallback Chain:** playerAuthToken in localStorage → axios Authorization header
- **Solo Play Auth:** optionalAuth middleware allows authenticated players to save stats, guests remain anonymous
- **Rank Calculation:** Based on correct_answers count from participant_answers table (not broken gp.score)

#### Database Calculations
- **Play Streak:** Consecutive days of game participation (checks created_at dates)
- **Accuracy:** (total_correct_answers / total_questions_answered) × 100
- **Best Score:** Max score from any game
- **Wins:** Sessions where rank = 1
- **Avg Rank:** Average rank across all games (solo games have rank based on score percentile)

#### Chart.js Integration
- Theme-aware styling: reads CSS custom properties (--text-primary, --bg-overlay-10, etc.) at runtime
- 30-day lookback for accuracy trends and score data points
- Daily aggregation of scores and accuracy percentages
- Line charts with gradients matching app theme

### Features

#### Player Stats Page (/stats)
- New dedicated stats page for registered players at `/stats`
- Summary cards: total games played, overall accuracy %, best score, wins, average rank, day streak
- Accuracy Over Time and Score Trend line charts (Chart.js + vue-chartjs)
- Paginated game history table with quiz name, score, accuracy, rank
- Type filter: All / Multiplayer / Solo with color-coded badges
- Mobile-responsive layout (table collapses to card view on mobile)
- Unauthenticated users see friendly "Login Required" message
- Theme-aware charts reading CSS custom properties at runtime

#### Navigation Links
- "My Stats" link in Player navbar (visible when logged in)
- "My Stats" link in Solo Play navbar

### Dependencies Added
- `chart.js` - Charting library for trend visualization
- `vue-chartjs` - Vue 3 wrapper for Chart.js

### API Endpoints (all require player auth)
- `GET /api/stats/summary` - Aggregate stats (total games, accuracy, best score, wins, avg rank, streak)
- `GET /api/stats/history?page=1&limit=20&type=all` - Paginated game history with rank
- `GET /api/stats/charts?days=30` - Daily accuracy and score data points for charts

### Files Created
- `app/src/controllers/stats.controller.js` - Stats API handlers: /summary (aggregate stats with streaks), /history (paginated with rank), /charts (daily data points)
- `app/src/routes/stats.routes.js` - Stats routes with requireAuth middleware
- `app/src/pages/StatsPage.vue` - Main stats dashboard page with auth check
- `app/src/components/stats/StatsNavbar.vue` - Stats page navbar with "Back to Player" button
- `app/src/components/stats/StatsSummary.vue` - Summary cards: Total Games, Accuracy, Best Score, Wins, Avg Rank, Play Streak
- `app/src/components/stats/StatsCharts.vue` - Chart.js line charts: Accuracy Over Time (30 days), Score Trends
- `app/src/components/stats/GameHistoryTable.vue` - Paginated history table (20 items/page) with type filter (All/Multiplayer/Solo), mobile card layout

### Files Modified
- `app/server.js` - Mounted statsRoutes at `/api/stats`, added playerAuthToken fallback in useApi
- `app/src/router.js` - Added `/stats` route
- `app/src/composables/useApi.js` - Added playerAuthToken fallback for auth header
- `app/src/components/player/PlayerNavbar.vue` - Added "My Stats" nav link
- `app/src/pages/SoloPlayPage.vue` - Added "My Stats" nav link and StatsNavbar component
- `app/src/pages/SoloPlayPage.vue` - Solo play now saves user_id for authenticated players via useApi
- `app/src/config/version.js` - Bumped to v5.8.0
- `app/package.json` - Added chart.js + vue-chartjs dependencies
- `app/src/controllers/solo.controller.js` - optionalAuth middleware, solo play saves user_id
- `app/src/routes/solo.routes.js` - optionalAuth middleware on create endpoint

---

## Previous Session Summary: v5.7.0 Release

### Overview

This development period covered server configuration improvements and a player auth bug fix:
1. **v5.7.0** - Admin-configurable Server URL for QR codes (no container rebuild needed)
2. **v5.7.0** - Player auth verify-player 401 redirect fix

---

## v5.7.0 - Admin-Configurable Server URL

**Release Date:** 2026-02-19
**Branch:** `server-url-tweaks-v5.7.0`

### Features

#### Admin Server URL Setting
- New "Server Settings" panel in Admin > Settings tab
- Displays auto-detected server IP and active QR code URL
- Custom Server URL input field with save/clear buttons
- URL priority chain: DB setting > SERVER_URL env var > HOST_IP env var > auto-detected IP
- Changes take effect immediately for new QR codes without container restart
- URL validation ensures valid format before saving

#### Dynamic QR Code URL Resolution
- Replaced static `SERVER_URL` constant with dynamic `getServerUrl()` function
- QR code URLs now resolved per-request instead of at server startup
- `loadQuizOptions()` expanded to load `server_url` from `app_settings` table
- GET/POST `/api/options` endpoints updated to include `serverUrl`, `detectedIp`, and `activeServerUrl`

### Bug Fixes

#### Player Auth Redirect Fix
- **Problem:** Registered players with expired tokens were redirected to landing page instead of the player join screen when scanning QR codes
- **Root Cause:** The `useApi` 401 interceptor didn't exclude `verify-player` requests, so expired player tokens triggered `authStore.logout()` + redirect to `/`
- **Fix:** Added `verify-player` to the player auth request exclusion list in `useApi.js`, allowing the PlayerPage's catch block to handle the 401 gracefully (clears stale token, shows join screen)

### Database Migration

**New migration:** `15-server-url-setting.sql`
```sql
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES ('server_url', '', 'Server URL for QR codes (leave empty to auto-detect from IP)')
ON CONFLICT (setting_key) DO NOTHING;
```

### Files Created
- `app/init/15-server-url-setting.sql` - Database migration for server_url setting
- `app/src/components/admin/ServerSettingsPanel.vue` - Server Settings panel component

### Files Modified
- `app/server.js` - `getServerUrl()` function, dynamic URL resolution, updated loadQuizOptions/GET/POST options endpoints, QR endpoints
- `app/src/composables/useApi.js` - Added verify-player to 401 exclusion list
- `app/src/pages/AdminPage.vue` - Import and add ServerSettingsPanel to Settings tab
- `app/src/config/version.js` - Bumped to v5.7.0
- `docker-compose.yml` - Updated SERVER_URL default to empty, added comment
- `.env.example` - Updated SERVER_URL comments (Admin UI recommended)
- `.gitignore` - Added archive/Session Logs/

---

## v5.6.0 - Game Experience & Results Display

**Release Date:** 2026-02-18
**Branch:** `feature-enhancements-v5.6.0`

### Features

#### Question Progress Counter
- "X / Y" pill badge showing revealed questions vs total in Player navbar, Display sidebar, and Presenter controls
- Server broadcasts `revealedCount` and `totalQuestions` with `questionRevealed` and `playerListUpdate` events
- Late joiners and reconnecting players receive current count immediately

#### End-of-Game Results Podium
- Celebratory podium-style results screen with gold/silver/bronze for top 3 players
- Staggered entrance animations for each podium slot
- Remaining players listed below with rank and score
- Class average chip in header
- Per-quiz `show_results` toggle (defaults to TRUE, opt-out model)
- Admin toggle in Quiz Sidebar dropdown menu with "Results" badge on quiz items

#### Quiz Completion Screen
- Universal "Quiz Complete!" screen shown for ALL quizzes when they finish
- For results-enabled quizzes: animated countdown "Results in 5...4...3..." before podium appears
- For non-results quizzes: static message "Check your Progress to see how you did!"
- Both Player and Display pages show the completion screen
- Smooth transition from completion screen to results podium

#### Manual Mode Auto-Complete
- When all questions are revealed in manual mode (no auto-pilot), quiz automatically completes
- Waits for the answer display timeout so players can see the last answer
- Then triggers the same completion flow as auto-pilot (save, broadcast, results)

#### Multiple Simultaneous Displays
- Each Display/Spectator connection gets a unique ID (e.g., `Display-a3f9`)
- `isSpectator: true` flag sent in join payload as authoritative source for spectator detection
- Reserved name protection: players cannot name themselves "Display" or "Spectator"
- Reconnection lookup skips spectator entries to prevent socket hijacking

#### Bug Fixes
- **Shuffle All Choices**: Now skips True/False questions (prevents answer corruption)
- **Heartbeat False Positives**: Raised high-latency log threshold from 1000ms to 2000ms (browser tab throttling causes ~1000ms readings on desktop)
- **Stale Room Rejoin**: Clear `localStorage.trivia_last_room` on `roomClosed` and `roomError` events
- **Auto-Pilot State Reset**: Reset `autoMode`, `timerStartedAt`, `timerDuration`, `timerPaused` when leaving/closing rooms on Player, Display, and Presenter pages

### Database Migration

**New migration:** `14-show-results-setting.sql`
```sql
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS show_results BOOLEAN DEFAULT TRUE;
```

### Files Created
- `app/init/14-show-results-setting.sql` - Database migration for show_results column
- `app/src/components/player/GameResults.vue` - Podium-style results component

### Files Modified
- `app/server.js` - Heartbeat threshold, spectator flag, reserved names, broadcastQuizResults helper, quizCompleted broadcast to room, manual auto-complete logic, revealedCount/totalQuestions in payloads
- `app/src/services/autoMode.service.js` - Results broadcast with delay, quizCompleted with showResults flag, revealedCount/totalQuestions in emissions
- `app/src/controllers/quiz.controller.js` - show_results in all SQL queries and response mappings
- `app/src/pages/PlayerPage.vue` - Progress counter, quizCompleted/quizResults listeners, GameResults integration, completion screen, countdown, localStorage cleanup, auto-mode reset
- `app/src/pages/DisplayPage.vue` - Unique display ID, isSpectator flag, progress counter, quizCompleted/quizResults listeners, GameResults integration, completion screen, countdown, auto-mode reset
- `app/src/pages/AdminPage.vue` - Shuffle skip T/F fix, show_results toggle handler
- `app/src/pages/PresenterPage.vue` - Auto-mode state reset in resetRoom
- `app/src/components/player/PlayerNavbar.vue` - Responsive logo (TriviaForge Player/TF), question counter pill, progress container gap
- `app/src/components/presenter/QuizDisplay.vue` - "Revealed: X / Y" counter
- `app/src/components/admin/QuizSidebar.vue` - Show Results toggle + Results badge
- `app/src/config/version.js` - Bumped to v5.6.0
- `docker-compose.yml` - Updated image tag for v5.6.0

---

## Previous Session Summary: v5.5.0 Release

### Overview

This development period covered backend performance optimizations:
1. **v5.5.0** - Backend performance optimizations (memory cleanup, rate limiting, session health monitoring)
2. **v5.5.0** - Session Health admin panel with memory and session statistics
3. **v5.5.0** - Configurable Socket.IO rate limits via environment variables
4. **v5.5.0** - Presenter layout reorganization (two-column controls)

---

## v5.5.0 - Backend Performance & Session Health

**Release Date:** 2026-02-08
**Branch:** `main`

### Features

#### Backend Performance Optimizations
- **Memory Cleanup Scheduler**: Added `cleanupSocketRateLimits()` to the periodic cleanup interval that runs every 5 minutes. Cleans up stale entries from `socketRateLimits` and `socketJoinTracker` Maps.
- **Socket.IO Rate Limiting**: Per-IP rate limiting for `joinRoom` (50/minute) and `submitAnswer` (300/minute) events to prevent abuse
- **Room Activity Tracking**: Added `lastActivityAt` field to rooms, updated on join, presentQuestion, and submitAnswer events. Room expiry now uses actual activity time (4-hour inactivity timeout).

#### Session Health Monitoring
- **Admin Memory Endpoint**: New `/api/admin/memory` endpoint returning:
  - Memory usage (heap, RSS, external, arrayBuffers)
  - Session counts (active rooms, total players, rate limit entries)
  - Server uptime
  - Live room details (room code, players, questions, last activity)
- **Session Health Panel**: New admin tab with visual dashboard featuring:
  - Memory usage progress bars with color-coding (green <60%, yellow 60-80%, red >80%)
  - Session counts grid with room, player, and rate limit counts
  - Server uptime display
  - Live rooms table with detailed statistics
  - Auto-refresh toggle (10-second interval)

#### Configurable Socket.IO Rate Limits
Environment variables for tuning rate limits for venues with many players on shared IP (NAT):
- `SOCKET_RATE_WINDOW_MS` - Rate limit window (default: 60000ms / 1 minute)
- `SOCKET_JOIN_LIMIT` - Max join attempts per IP per window (default: 50)
- `SOCKET_ANSWER_LIMIT` - Max answer submissions per IP per window (default: 300)

#### Presenter Layout Improvements
- Reorganized presenter controls into two-column layout
- Left column: Progress indicator, Previous/Next buttons, Present Question, Reveal Answer, Complete Quiz
- Right column: Auto-Pilot toggle with timer settings, Auto-Reveal toggle
- Responsive design: single column on mobile (<900px width)

### Files Created
- `app/src/components/admin/SessionHealthPanel.vue` - Session Health dashboard component

### Files Modified
- `app/server.js` - Rate limiting, memory cleanup, activity tracking, admin memory endpoint
- `app/src/config/constants.js` - Added SOCKET_RATE_WINDOW_MS, SOCKET_JOIN_LIMIT, SOCKET_ANSWER_LIMIT defaults
- `app/src/config/environment.js` - Added socketRateWindowMs, socketJoinLimit, socketAnswerLimit config
- `app/src/pages/AdminPage.vue` - Session Health tab integration
- `app/src/components/presenter/QuizDisplay.vue` - Two-column controls layout with CSS Grid
- `docker-compose.yml` - Added new environment variables with comments
- `.env.example` - Added Socket.IO rate limiting variables

---

## Previous Session Summary: v5.4.0 - v5.4.4 Release

### Overview

This development period covered the Auto-Mode & Solo Play features:
1. **v5.4.0** - Auto-Mode Timer System for presenters (server-side timers with pause/resume)
2. **v5.4.0** - Solo Play Mode for players (REST-based self-study without presenter)
3. **v5.4.1** - Database migration fix for guest participants
4. **v5.4.2** - Session service ON CONFLICT fix for guests
5. **v5.4.3** - Timer pause/resume sync fix for player clients
6. **v5.4.4** - Solo mode UI fixes (answer text theming, selection reset)

---

## v5.4.4 - Solo Mode UI Fixes

**Release Date:** 2026-02-06
**Branch:** `main`

### Fixes

1. **Answer Text Theme Colors**: Added `color: var(--text-primary)` to `.choice-btn` and `.choice-text` in SoloPlayPage.vue. Button elements don't inherit text color, causing black text in dark mode.

2. **Answer Selection Reset**: Created `goToNextQuestion()` wrapper function that resets `selectedAnswer` to null before calling `advanceToNextQuestion()`. Previously, the selected styling persisted to the next question.

### Files Modified
- `app/src/pages/SoloPlayPage.vue` - Theme colors and selection reset

---

## v5.4.3 - Timer Pause/Resume Sync Fix

**Release Date:** 2026-02-06
**Branch:** `main`

### Problem Solved

When presenter paused auto-mode, the server updated correctly but player timer bars continued running. On resume, players saw incorrect timer state.

### Root Cause

The CountdownTimer component's `updateBar()` and `updateText()` functions only checked `props.active` but not `props.paused`. The watcher on `[startedAt, duration]` also didn't check paused state before restarting.

### Fix

Added `props.paused` checks to:
- `updateBar()` - Returns early if paused
- `updateText()` - Returns early if paused
- Watcher on `[startedAt, duration]` - Only restarts if not paused

### Files Modified
- `app/src/components/player/CountdownTimer.vue`

---

## v5.4.2 - Session Service ON CONFLICT Fix

**Release Date:** 2026-02-06
**Branch:** `main`

### Problem Solved

Session auto-save failed with error: `there is no unique or exclusion constraint matching the ON CONFLICT specification`

### Root Cause

Migration 13 dropped the full unique constraint on `(user_id, game_session_id)` and replaced it with a partial unique index (only for non-NULL user_ids). The old `ON CONFLICT` clause couldn't find a matching constraint for guest users.

### Fix

Modified `saveSession()` in session.service.js:
- For registered users (with user_id): Use `ON CONFLICT (user_id, game_session_id) WHERE user_id IS NOT NULL`
- For guest users (NULL user_id): Use SELECT + INSERT/UPDATE pattern since NULLs don't conflict

### Files Modified
- `app/src/services/session.service.js`

---

## v5.4.1 - Guest Participants Migration Fix

**Release Date:** 2026-02-06
**Branch:** `main`

### Problem Solved

Solo play failed with: `null value in column "user_id" of relation "game_participants" violates not-null constraint`

### Root Cause

Migration 12 was already applied before the guest participant changes were added. The automatic migration system correctly tracks applied migrations, so modifying an already-applied migration doesn't re-run it.

### Fix

Created new migration file `13-fix-solo-guest-participants.sql` with the same changes:
- `ALTER COLUMN user_id DROP NOT NULL`
- Drop existing unique constraint
- Create partial unique index for authenticated users only

Also fixed `presentation_order` NOT NULL constraint in solo.controller.js INSERT statement.

### Files Created
- `app/init/13-fix-solo-guest-participants.sql`

### Files Modified
- `app/src/controllers/solo.controller.js` - Added presentation_order to INSERT
- `app/src/composables/useSoloGame.js` - Fixed API response extraction (response.data.data)

---

## v5.4.0 - Auto-Mode & Solo Play

**Release Date:** 2026-02-06
**Branch:** `game-session-enhancements-v5.4`

### Features

#### Auto-Mode Timer System (Presenter)
- Server-side timers run independently of presenter's browser
- Question timer with configurable duration (10-120 seconds)
- Reveal delay timer (2-30 seconds between reveal and next question)
- Pause/Resume functionality with remaining time preservation
- Auto-advance to next question after reveal delay
- All players answered → skip remaining question timer
- Timer state synced to all clients via Socket.IO

#### Solo Play Mode (Players)
- REST-based self-study without presenter or Socket.IO
- Quiz browser with solo-enabled quizzes only
- Per-question timer with countdown display
- Immediate answer feedback (correct/incorrect)
- Self-paced advancement between questions
- Results summary with per-question breakdown
- Play Again and Choose Another Quiz options
- Guest player support (no account required)

#### Quiz Visibility Controls
- `available_live` flag - Quiz appears in Presenter's list
- `available_solo` flag - Quiz appears in Solo Play browser
- Both default TRUE for backwards compatibility
- Toggle controls in Quiz Sidebar dropdown menu
- Live/Solo badges on quiz list items

### Database Migration: `12-auto-mode-solo-play.sql`
```sql
-- Timer settings per quiz
ALTER TABLE quizzes ADD COLUMN question_timer INT DEFAULT NULL;
ALTER TABLE quizzes ADD COLUMN reveal_delay INT DEFAULT NULL;
ALTER TABLE quizzes ADD COLUMN available_live BOOLEAN DEFAULT TRUE;
ALTER TABLE quizzes ADD COLUMN available_solo BOOLEAN DEFAULT TRUE;

-- Session type for multiplayer vs solo
ALTER TABLE game_sessions ADD COLUMN session_type VARCHAR(20) DEFAULT 'multiplayer';

-- Global defaults in app_settings
INSERT INTO app_settings (setting_key, setting_value, description) VALUES
  ('default_question_timer', '30', 'Default question timer in seconds'),
  ('default_reveal_delay', '5', 'Default delay between answer reveal and next question');
```

### Files Created
- `app/init/12-auto-mode-solo-play.sql` - Database migration
- `app/src/services/autoMode.service.js` - Server-side timer engine
- `app/src/controllers/solo.controller.js` - Solo play REST API
- `app/src/routes/solo.routes.js` - Solo play routes
- `app/src/pages/SoloPlayPage.vue` - Solo play page
- `app/src/composables/useSoloGame.js` - Solo game state composable
- `app/src/components/player/CountdownTimer.vue` - Shared countdown timer

### Files Modified
- `app/server.js` - Auto-mode socket events, solo routes
- `app/src/services/room.service.js` - Auto-mode fields
- `app/src/pages/PresenterPage.vue` - Auto-mode controls
- `app/src/components/presenter/QuizDisplay.vue` - Auto-mode panel
- `app/src/pages/PlayerPage.vue` - Timer props
- `app/src/components/player/QuestionDisplay.vue` - Timer display
- `app/src/pages/DisplayPage.vue` - Timer display
- `app/src/router.js` - `/solo` route
- `app/src/components/admin/QuizSidebar.vue` - Visibility toggles

---

## Previous Session Summary: v5.3.0 - v5.3.4 Release

### Overview

This development period covered the Question Bank & Duplicate Detection System:
1. **v5.3.0** - Question Bank & Tagging System with centralized question management
2. **v5.3.1** - Find Duplicates tool with similarity detection
3. **v5.3.2** - Ignore Duplicate Pairs feature for false positives
4. **v5.3.3** - Import Duplicates Review modal for bulk import
5. **v5.3.4** - Single Question Duplicate Detection on save

---

## v5.3.4 - Single Question Duplicate Detection

**Release Date:** 2026-02-02
**Branch:** `question-database-enhancement-v5`

### Features

When saving a question in the Question Editor, the system now checks for similar existing questions and shows a warning modal with options:
- **Use Existing** - Link to the similar question instead of creating a duplicate
- **Create Anyway** - Proceed with creating the new question
- **Cancel** - Go back and edit

### Implementation

**Frontend Changes:**
- `AdminPage.vue` - Added duplicate check before save, `DuplicateWarningModal` integration
- State management for `showDuplicateWarningModal`, `duplicateWarningData`, `pendingQuestionSave`

**Files Modified:**
- `app/src/pages/AdminPage.vue` - Duplicate check integration in saveQuestion flow

---

## v5.3.3 - Import Duplicates Review

**Release Date:** 2026-02-02
**Branch:** `question-database-enhancement-v5`

### Features

Two-step Excel import flow with duplicate detection:
1. **Preview Mode** - Parse Excel file without creating quiz
2. **Batch Duplicate Check** - Check all questions against existing database
3. **Review Modal** - Show all potential duplicates with per-item decisions
4. **Import with Decisions** - Execute import respecting user choices

### Implementation

**New Component:** `ImportDuplicatesReview.vue`
- Shows all potential duplicates with similarity percentages
- Per-item actions: Use Existing / Create New / Skip
- Bulk actions: Skip All Duplicates / Create All Anyway

**Backend Changes:**
- `quiz.controller.js` - Added `?preview=true` mode to importQuiz endpoint
- Returns parsed questions without creating quiz
- Handles `decisions` array for skip/use-existing/create-new

**Files Created:**
- `app/src/components/admin/ImportDuplicatesReview.vue`

**Files Modified:**
- `app/src/controllers/quiz.controller.js` - Preview mode and decisions handling
- `app/src/pages/AdminPage.vue` - Two-step import flow integration

---

## v5.3.2 - Ignore Duplicate Pairs

**Release Date:** 2026-02-01
**Branch:** `question-database-enhancement-v5`

### Features

Allow users to mark question pairs as "not duplicates" to prevent false positive warnings:
- **Ignore Pair** button on each duplicate group
- Ignored pairs hidden from Find Duplicates results
- View and restore ignored pairs
- Persisted in database with timestamp and user tracking

### Implementation

**Database Migration:** `11-ignored-duplicate-pairs.sql`
```sql
CREATE TABLE ignored_duplicate_pairs (
  id SERIAL PRIMARY KEY,
  question_id_1 INTEGER REFERENCES questions(id) ON DELETE CASCADE,
  question_id_2 INTEGER REFERENCES questions(id) ON DELETE CASCADE,
  ignored_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  ignored_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);
```

**API Endpoints:**
- `POST /api/question-bank/duplicates/ignore` - Add ignored pair
- `DELETE /api/question-bank/duplicates/ignore/:id1/:id2` - Remove ignored pair
- `GET /api/question-bank/duplicates/ignored` - List ignored pairs

**Files Created:**
- `app/init/11-ignored-duplicate-pairs.sql`

**Files Modified:**
- `app/src/controllers/questionBank.controller.js` - Ignore pair methods
- `app/src/routes/questionBank.routes.js` - New routes
- `app/src/components/admin/FindDuplicatesPanel.vue` - UI for ignore/restore

---

## v5.3.1 - Find Duplicates Tool

**Release Date:** 2026-02-01
**Branch:** `question-database-enhancement-v5`

### Features

Cleanup tool to find and manage duplicate questions in the Question Bank:
- **Similarity Detection** using Levenshtein distance algorithm
- **Configurable Threshold** (default 80%)
- **Duplicate Groups** showing similar questions together
- **Merge Support** - Keep one question, update quiz references
- **Text Hash** for fast exact-match detection

### Implementation

**Database Migration:** `10-duplicate-detection.sql`
```sql
ALTER TABLE questions ADD COLUMN IF NOT EXISTS text_hash VARCHAR(32);
CREATE INDEX IF NOT EXISTS idx_questions_text_hash ON questions(text_hash);
```

**New Utility:** `app/src/utils/similarity.js`
- `normalizeText()` - Case-insensitive, whitespace-collapsed, punctuation-removed
- `levenshteinDistance()` - Edit distance calculation
- `calculateSimilarity()` - Percentage similarity (0-1)
- `generateTextHash()` - MD5 hash of normalized text

**API Endpoints:**
- `POST /api/question-bank/check-duplicates` - Check single question
- `POST /api/question-bank/check-duplicates/batch` - Check multiple questions
- `GET /api/question-bank/duplicates` - Find all duplicate groups

**Files Created:**
- `app/src/utils/similarity.js`
- `app/init/10-duplicate-detection.sql`
- `app/src/components/admin/FindDuplicatesPanel.vue`
- `app/src/components/admin/DuplicateWarningModal.vue`

**Files Modified:**
- `app/src/controllers/questionBank.controller.js` - Duplicate check methods
- `app/src/routes/questionBank.routes.js` - New routes
- `app/src/components/admin/QuestionBankPanel.vue` - Find Duplicates button

---

## v5.3.0 - Question Bank & Tagging System

**Release Date:** 2026-02-01
**Branch:** `question-database-enhancement-v5`

### Features

Centralized Question Bank for managing questions across all quizzes:
- **Question Bank Panel** - Browse, search, filter all questions
- **Tag System** - Create, edit, delete tags with colors
- **Question Filtering** - By tag, type, archived status, search text
- **Archive/Restore** - Soft delete questions without losing data
- **Add to Quiz** - Add existing questions to quizzes from the bank
- **Question Details Modal** - Full question view with metadata and quiz usage
- **Tag Selector** - Reusable component for tag management

### Implementation

**Database Migrations:**
- `09-question-bank.sql` - Questions table enhancements, tags table, junction tables

**New Tables:**
```sql
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(7) DEFAULT '#6b7280',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE question_tags (
  question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, tag_id)
);
```

**API Endpoints:**
- `GET /api/question-bank` - List questions with filters
- `GET /api/question-bank/:id` - Get question details
- `PATCH /api/question-bank/:id` - Update question
- `POST /api/question-bank/:id/archive` - Archive question
- `POST /api/question-bank/:id/restore` - Restore question
- `DELETE /api/question-bank/:id` - Permanently delete
- `PUT /api/question-bank/:id/tags` - Update question tags
- `GET /api/tags` - List all tags
- `POST /api/tags` - Create tag
- `PUT /api/tags/:id` - Update tag
- `DELETE /api/tags/:id` - Delete tag

**Files Created:**
- `app/init/09-question-bank.sql`
- `app/src/controllers/questionBank.controller.js`
- `app/src/routes/questionBank.routes.js`
- `app/src/components/admin/QuestionBankPanel.vue`
- `app/src/components/admin/TagSelector.vue`
- `app/src/components/admin/TagManager.vue`
- `app/src/components/admin/QuestionDetailModal.vue`

**Files Modified:**
- `app/server.js` - Added questionBank routes
- `app/src/pages/AdminPage.vue` - Question Bank tab integration

---

## Previous Session Summary: v5.0.0 - v5.1.2 Release

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
