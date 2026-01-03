# TriviaForge - Active Development Tasks (2026)

> **Purpose:** Current development priorities and pending tasks
> **Last Updated:** 2026-01-03
> **Version:** v4.2.3

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
**Status:** ⏳ PENDING
**Priority:** MEDIUM

**Description:**
Add notification to presenter when all connected players have answered the current question, with optional auto-reveal feature.

**Features:**
- Visual notification banner: "All players have answered! 🎯"
- Audio alert option (toggle in settings)
- Progress indicator during question: "8/10 players answered (80%)"
- Auto-reveal option (configurable):
  - Toggle: "Auto-reveal answer when all players answer"
  - Default: OFF (manual reveal)
  - When enabled: Answer reveals automatically after 3-second delay

**Implementation:**
- Add computed property to track answered count vs total players
- Emit socket event when last player answers
- Display banner in PresenterPage (slide down from top)
- Add auto-reveal toggle to quiz settings
- Store preference in quiz options or session settings
- Optional audio chime when all answered

**Files to Modify:**
- `app/server.js` - Track answered count, emit "allPlayersAnswered" event
- `app/src/pages/PresenterPage.vue` - Display notification banner
- `app/src/components/presenter/QuizDisplay.vue` - Show answered progress
- `app/src/pages/AdminPage.vue` - Add auto-reveal toggle to quiz options (optional)

---

## 🔍 Items Needing Verification

> **Note:** These items were marked incomplete in the archived TODO. Please verify if they've been implemented or are still needed.

### Post-Vue 3 Migration Tasks

**C. Socket.IO Production Integration Testing**
- [ ] Test player-presenter communication in production
- [ ] Test session creation and management
- [ ] Test question presentation and answer submission
- [ ] Test real-time standings update
- [ ] Test player reconnection handling
- [ ] Test large group scenarios (50+ players)
- [ ] Test network failure recovery
- [ ] Cross-browser compatibility testing

**D. Production Deployment & Testing**
- [ ] Build Docker image with Vite production build
- [ ] Test locally with `docker-compose up`
- [ ] Push to Docker Hub: `emancodetemplar/triviaforge:v4.x.x`
- [ ] Test production deployment
- [ ] Verify all features work end-to-end
- [ ] Monitor for errors in production

---

## 📋 Long-term / Future Enhancements

> **Note:** These are planned features but not immediate priorities. See archived TODO-2025.md for detailed specifications.

### Database & Infrastructure
- [ ] Database backup/restore strategy
- [ ] Database migration versioning
- [ ] Performance monitoring and query optimization
- [ ] GitHub Actions - Docker Auto-Build & Push to Docker Hub

### Security & User Management
- [ ] Implement Phase 1 security fixes from SECURITY-AUDIT.md (if not done)
- [ ] Ban Player Account system (permanent/temporary bans)
- [ ] Enhanced Player Security & Management (needs re-review post v3.2.1 improvements)
- [ ] Multi-Admin Support System (role-based permissions)

### Player & Presenter Features
- [ ] Automated Presenter Mode with Timers (auto-reveal, auto-advance)
- [ ] Solo-Play Mode for Players (self-study without presenter)
- [ ] mDNS Service Discovery + Smart QR Code URLs (design phase complete, ready for implementation)

### Bug Investigations
- [ ] Incorrect Answer Notification Bug (may be fixed by reconnection changes - needs testing)
- [ ] Socket.IO performance with large sessions (200+ concurrent players)

---

## 📝 Development Notes

### Current Focus Areas
1. **Mobile UX:** Stay-awake notification visibility
2. **Player Experience:** Answer confirmation to prevent mistakes
3. **Presenter Experience:** Better player status visibility and grouping
4. **Quality Assurance:** Test reconnection fixes in real scenarios

### Testing Priorities
- Mobile browser testing (iOS Safari, Chrome Mobile, Firefox Mobile)
- Large group testing (50+ players) when possible
- Cross-browser compatibility (Edge, Firefox, Chrome, Safari)
- Network failure scenarios (airplane mode, wifi switching)

### Version Planning
- **v4.2.2 (Released):** Stay-awake fix + Answer confirmation modal ✅
- **v4.2.3 (Released):** Presenter connected players visual improvements ✅
- **v4.3.0 (Next Feature):** All players answered notification + potential automation
- **v5.0.0 (Future Major):** Consider solo-play mode, automated presenter, mDNS

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

**Last Updated:** 2026-01-03
**Maintained By:** TriviaForge Development Team
