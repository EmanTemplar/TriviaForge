# Vue.js Migration Plan - TriviaForge v3.0.0

## Overview
This document outlines the comprehensive plan to migrate TriviaForge from vanilla JavaScript to Vue.js 3, ensuring scalability, maintainability, and security while preserving all existing functionality.

**Branch:** `feat/vue-migration`
**Status:** Planning & Development
**Target Version:** v3.0.0

---

## 🎯 Strategic Objectives

1. **Improve Scalability** - Component-based architecture for easier feature additions
2. **Enhance Maintainability** - Clear separation of concerns and reusable components
3. **Reduce Code Duplication** - Shared logic in composables and stores
4. **Better State Management** - Pinia store for centralized state (auth, room data, player data)
5. **Type Safety** - Optional TypeScript support for future additions
6. **Developer Experience** - Better debugging, hot module reload, dev tools
7. **Security** - Vue's built-in XSS protection, input validation via composables

---

## 📋 Technology Stack

### Core Dependencies
```json
{
  "vue": "^3.3.0",
  "vite": "^5.0.0",
  "pinia": "^2.1.0",
  "socket.io-client": "^4.7.0",
  "@vue/router": "^4.2.0",
  "axios": "^1.6.0"
}
```

### Dev Dependencies
```json
{
  "@vitejs/plugin-vue": "^5.0.0",
  "sass": "^1.70.0",
  "eslint": "^8.0.0",
  "@vue/eslint-config-recommended": "^7.0.0"
}
```

---

## 🏗️ Architecture Design

### Directory Structure (Post-Migration)
```
app/
├── public/
│   ├── index.html                 # Single HTML entry point
│   └── favicon.ico
├── src/
│   ├── main.js                    # Vue app initialization
│   ├── App.vue                    # Root component
│   ├── router.js                  # Vue Router configuration
│   ├── stores/                    # Pinia stores
│   │   ├── auth.js               # Authentication store
│   │   ├── room.js               # Room/game state
│   │   ├── player.js             # Player state
│   │   └── ui.js                 # UI state (modals, tabs)
│   ├── composables/               # Reusable logic
│   │   ├── useSocket.js          # Socket.IO integration
│   │   ├── useAuth.js            # Authentication utilities
│   │   ├── useApi.js             # API calls (axios)
│   │   ├── useLocalStorage.js    # LocalStorage management
│   │   └── useValidation.js      # Input validation
│   ├── components/                # Reusable components
│   │   ├── common/
│   │   │   ├── Modal.vue
│   │   │   ├── Button.vue
│   │   │   ├── Card.vue
│   │   │   └── LoadingSpinner.vue
│   │   ├── auth/
│   │   │   └── LoginForm.vue
│   │   ├── admin/
│   │   │   ├── QuizManager.vue
│   │   │   ├── UserManager.vue
│   │   │   ├── SessionsViewer.vue
│   │   │   ├── AdminSettings.vue
│   │   │   └── AboutTab.vue
│   │   ├── presenter/
│   │   │   ├── QuestionDisplay.vue
│   │   │   ├── AnswerReveal.vue
│   │   │   ├── PlayerStandings.vue
│   │   │   └── RoomInfo.vue
│   │   ├── player/
│   │   │   ├── QuestionView.vue
│   │   │   ├── AnswerButtons.vue
│   │   │   ├── PlayerProgress.vue
│   │   │   └── RoomHeader.vue
│   │   └── spectator/
│   │       └── DisplayView.vue
│   ├── pages/                     # Page components
│   │   ├── LoginPage.vue          # Login/landing page
│   │   ├── AdminPage.vue          # Admin panel
│   │   ├── PresenterPage.vue      # Presenter host
│   │   ├── PlayerPage.vue         # Player game interface
│   │   ├── PlayerManagePage.vue   # Account management
│   │   └── DisplayPage.vue        # Spectator display
│   ├── styles/
│   │   ├── main.css              # Global styles
│   │   ├── variables.css         # CSS variables (colors, spacing)
│   │   └── responsive.css        # Responsive design breakpoints
│   └── utils/
│       ├── constants.js          # App constants
│       ├── helpers.js            # Utility functions
│       └── security.js           # Security utilities (sanitization)
├── vite.config.js                # Vite configuration
├── package.json                  # Dependencies
├── Dockerfile                    # Docker build (updated for Vite)
└── server.js                     # Keep mostly unchanged
```

---

## 🔄 Migration Phases

### Phase 1: Setup & Infrastructure (Days 1-2)
**Objective:** Establish Vue development environment

- [ ] Install Vue 3, Vite, and dependencies
- [ ] Create `vite.config.js` with appropriate aliases
- [ ] Create `src/main.js` entry point
- [ ] Create root `App.vue` component with router
- [ ] Set up Vue Router for page navigation
- [ ] Create Pinia stores directory structure
- [ ] Create composables directory structure
- [ ] Update package.json scripts (`dev`, `build`, `preview`)
- [ ] Test Vite dev server starts successfully

### Phase 2: Core Infrastructure (Days 2-3)
**Objective:** Build foundational systems

- [ ] **Socket.IO Integration:**
  - Create `useSocket.js` composable
  - Implement Socket.IO connection management
  - Create event emitters/listeners utilities
  - Handle disconnection/reconnection

- [ ] **Authentication System:**
  - Migrate `auth.js` logic to `useAuth.js` composable
  - Create auth Pinia store
  - Implement token management
  - Add login/logout functionality

- [ ] **State Management (Pinia):**
  - Create `stores/auth.js` - User, token, role
  - Create `stores/room.js` - Game session data
  - Create `stores/player.js` - Player-specific state
  - Create `stores/ui.js` - Modal visibility, current tab, notifications

- [ ] **Common Components:**
  - Create reusable Modal component with accessibility
  - Create Button component with loading states
  - Create Card component for content blocks
  - Create LoadingSpinner component

### Phase 3: Page Migration - Tier 1 (Days 3-5)
**Objective:** Migrate login and foundational pages
**Priority:** High (blocks other pages)

- [ ] **LoginPage.vue** (`landing.html`)
  - Migrate login form UI
  - Integrate with auth store
  - Handle form validation and errors
  - Add role-based redirect logic

- [ ] **DisplayPage.vue** (`display.html`)
  - Simple spectator view component
  - Real-time updates via Socket.IO
  - No complex state needed

### Phase 4: Page Migration - Tier 2 (Days 5-8)
**Objective:** Migrate player-facing pages
**Priority:** High (core gameplay)

- [ ] **PlayerPage.vue** (`player.html`)
  - Create sub-components:
    - QuestionView.vue
    - AnswerButtons.vue
    - PlayerProgress.vue
    - RoomHeader.vue
  - Integrate Socket.IO for game events
  - Implement answer locking logic
  - Real-time score/progress updates

- [ ] **PlayerManagePage.vue** (`player-manage.html`)
  - Account information display
  - Password change form
  - Session management UI
  - Recent rooms list

### Phase 5: Page Migration - Tier 3 (Days 8-12)
**Objective:** Migrate presenter interface
**Priority:** High (critical for game flow)

- [ ] **PresenterPage.vue** (`presenter.html`)
  - Create sub-components:
    - QuestionDisplay.vue
    - AnswerReveal.vue
    - PlayerStandings.vue
    - RoomInfo.vue
  - Button actions: Present Question, Reveal Answer, Next Question, End Quiz
  - Socket.IO event handlers for real-time player updates
  - Standings modal integration

### Phase 6: Page Migration - Tier 4 (Days 12-16)
**Objective:** Migrate admin panel (most complex)
**Priority:** High (feature-rich)

- [ ] **AdminPage.vue** (`index.html`)
  - Create sub-components:
    - QuizManager.vue (quiz CRUD, reordering)
    - SessionsViewer.vue (active/completed sessions)
    - AdminSettings.vue (app configuration)
    - UserManager.vue (user admin functions)
    - AboutTab.vue (about information)
  - Tab navigation logic
  - Excel import/export functionality
  - Real-time updates from server

### Phase 7: Styling & Responsive Design (Days 16-17)
**Objective:** Migrate and enhance CSS

- [ ] Migrate `styles.css` to Vue scoped styles + global variables
- [ ] Create `styles/variables.css` for color scheme, spacing
- [ ] Create `styles/responsive.css` for media queries
- [ ] Test on mobile, tablet, desktop
- [ ] Implement dark mode infrastructure (optional for v3.0)

### Phase 8: Security Audit (Day 18)
**Objective:** Ensure Vue migration maintains security

- [ ] **XSS Prevention:**
  - Verify Vue's auto-escaping is used ({{ }} not v-html)
  - Audit any v-html usage (should sanitize with DOMPurify)
  - Check for dangerous patterns (innerHTML, eval)

- [ ] **CSRF & Authentication:**
  - Verify token handling in composables
  - Check Socket.IO auth middleware (untouched, server-side)
  - Validate form submissions use POST/PUT with CSRF consideration

- [ ] **Input Validation:**
  - Quiz text inputs validated on client AND server
  - Username/email validation
  - Password strength checking
  - Room code validation

- [ ] **Data Privacy:**
  - No sensitive data in localStorage except tokens
  - User passwords never sent to client (already correct)
  - Session cleanup on logout

- [ ] **Dependencies:**
  - Check for known vulnerabilities: `npm audit`
  - Review all third-party packages in package.json
  - Pin versions in package-lock.json

### Phase 9: Testing & QA (Days 18-20)
**Objective:** Comprehensive testing

- [ ] **Functional Testing:**
  - Login with admin/player accounts
  - Create and manage quizzes
  - Import Excel files
  - Create game sessions
  - Join as player (guest & registered)
  - Submit answers and locking
  - Reveal answers and statistics
  - Complete quiz and database save
  - Resume incomplete session
  - Player reconnection

- [ ] **UI/UX Testing:**
  - Responsive design on mobile/tablet/desktop
  - All buttons and modals functional
  - Form validation working
  - Error messages clear
  - Loading states visible

- [ ] **Performance Testing:**
  - Page load time < 2 seconds
  - Socket.IO latency < 100ms
  - No memory leaks in dev tools

- [ ] **Cross-browser Testing:**
  - Chrome/Chromium
  - Firefox
  - Safari
  - Edge

### Phase 10: Docker & Deployment (Days 20-21)
**Objective:** Update build and deployment process

- [ ] Update `Dockerfile` for Vue/Vite:
  - Build stage: `npm install && npm run build`
  - Serve stage: Copy `dist/` to public folder
  - Ensure proper port exposure (3000)

- [ ] Update `docker-compose.yml` if needed
- [ ] Test Docker build locally
- [ ] Test deployed app in Docker container
- [ ] Document any configuration changes

### Phase 11: Final Review & Merge (Day 21)
**Objective:** Complete migration and merge to main

- [ ] Code review of migration
- [ ] Security sign-off
- [ ] Performance benchmarks comparison
- [ ] Documentation updates (README, DEV-SUMMARY)
- [ ] Merge `feat/vue-migration` to `main`
- [ ] Tag as v3.0.0 in Git

---

## 🔐 Security Considerations

### XSS Prevention
- ✅ Vue auto-escapes template expressions (`{{ }}`)
- ✅ Never use `v-html` with user input
- ✅ Use DOMPurify if HTML rendering is required
- ✅ Content Security Policy headers on server

### CSRF Protection
- ✅ Server-side session tokens (already implemented)
- ✅ Socket.IO auth middleware (keep existing)
- ✅ Same-origin cookie policy

### Input Validation
- ✅ Client-side validation for UX (trim, length checks)
- ✅ Server-side validation for security (all API endpoints)
- ✅ Sanitize quiz text and descriptions
- ✅ Validate email/username format

### Password Security
- ✅ Never store passwords in localStorage
- ✅ Passwords hashed on server (bcrypt, unchanged)
- ✅ HTTPS recommended for production

### API Security
- ✅ Use axios with CSRF token headers
- ✅ Validate all responses on client
- ✅ Handle auth errors (token refresh/login redirect)

---

## 📝 Development Guidelines

### Vue Component Best Practices
```vue
<template>
  <!-- Use semantic HTML -->
  <!-- v-bind shorthand: :prop -->
  <!-- v-if for conditional rendering (preferred) -->
</template>

<script setup>
// Composition API (preferred)
// Import composables for shared logic
// Define reactive data, computed, methods
// Set up event listeners
</script>

<style scoped>
/* Scoped styles prevent global pollution */
/* Use CSS variables for theming */
</style>
```

### Composable Pattern
```javascript
// composables/useExample.js
import { ref, computed } from 'vue'

export function useExample() {
  const data = ref('')

  const computed = computed(() => data.value.toUpperCase())

  const method = () => {
    // implementation
  }

  return { data, computed, method }
}
```

### Store Pattern (Pinia)
```javascript
// stores/example.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useExampleStore = defineStore('example', () => {
  const state = ref(initialValue)

  const getter = computed(() => state.value.processed)

  const action = (payload) => {
    // implementation
  }

  return { state, getter, action }
})
```

---

## 🔍 Testing Strategy

### Unit Tests (Composables & Utilities)
- Test composables in isolation
- Mock Socket.IO events
- Verify state mutations

### Component Tests
- Test component rendering
- Test user interactions
- Verify prop binding
- Test event emissions

### Integration Tests
- Test page workflows (login → game → results)
- Test Socket.IO integration
- Test state management flow

### E2E Tests (Future)
- Playwright or Cypress tests
- Full user workflows
- Cross-browser compatibility

---

## 📈 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Page Load Time | < 2s | TBD |
| First Contentful Paint | < 1s | TBD |
| Socket.IO Latency | < 100ms | < 50ms |
| Bundle Size | < 300KB gzipped | TBD |
| Memory Usage | < 50MB | TBD |

---

## 🚀 Post-Migration Enhancements (v3.1+)

These features become easier with Vue:

1. **Dark Mode** - CSS variables + theme switcher component
2. **Real-time Notifications** - Toast/notification system
3. **Advanced Analytics** - Player statistics dashboard
4. **TypeScript** - Gradual adoption for type safety
5. **PWA Support** - Service worker for offline capability
6. **Accessibility** - ARIA labels and keyboard navigation
7. **Internationalization** - i18n for multiple languages

---

## 📅 Timeline

- **Phase 1:** Days 1-2
- **Phase 2:** Days 2-3
- **Phase 3:** Days 3-5
- **Phase 4:** Days 5-8
- **Phase 5:** Days 8-12
- **Phase 6:** Days 12-16
- **Phase 7:** Days 16-17
- **Phase 8:** Day 18
- **Phase 9:** Days 18-20
- **Phase 10:** Days 20-21
- **Phase 11:** Day 21

**Estimated Total:** 3 weeks of focused development

---

## ✅ Rollback Plan

If migration encounters critical issues:

1. Keep `main` branch with vanilla JS version
2. All work on `feat/vue-migration` branch
3. If aborting: Delete branch, keep main untouched
4. If issues post-merge: Can revert commits or restore old branch

**Important:** Only merge when fully tested and security audited.

---

## 📞 Communication & Checkpoints

### Weekly Checkpoints
- Monday: Review progress, adjust timelines
- Wednesday: Security review checkpoint
- Friday: Testing & QA checkpoint

### Blockers to Watch
- Vue Router complexity with Socket.IO
- State management conflicts
- CSS migration edge cases
- Browser compatibility issues

---

## 📚 Resources

### Vue.js 3 Documentation
- [Vue 3 Guide](https://vuejs.org/)
- [Vue Router](https://router.vuejs.org/)
- [Pinia](https://pinia.vuejs.org/)

### Related Tools
- [Vite](https://vitejs.dev/)
- [Vue DevTools](https://devtools.vuejs.org/)
- [Socket.IO Client](https://socket.io/docs/v4/client-api/)

---

**Document Version:** 1.0
**Created:** 2025-11-29
**Branch:** feat/vue-migration
**Status:** Planning Phase

