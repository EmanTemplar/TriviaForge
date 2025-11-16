# TriviaForge - Future Enhancements & Tasks

This document tracks planned features, improvements, and tasks for future development.

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
**Status:** Planned
**Description:** Fix the text layout in the presenter's question reveal modal to display player answers in a stacked/vertical layout for easier reading.

**Current Issue:**
- Player answers may display in a cramped horizontal format
- Difficult to read when many players have answered

**Proposed Solution:**
- Stack player answers vertically
- Consider table format with columns: Player Name | Answer | Result (✓/✗)
- Add visual separators between players
- Improve responsive design for mobile presenters

---

## Medium Priority

### 4. Migrate to Database Backend
**Status:** Planned
**Description:** Replace JSON file-based storage with a proper database system (PostgreSQL recommended).

**Benefits:**
- Better data integrity and relationships
- Improved performance with large datasets
- Concurrent access support
- Query optimization
- Backup and recovery capabilities

**Database Schema Design:**
```
Tables:
- users (id, username, email, role, created_at)
- admins (user_id, permissions)
- questions (id, text, created_by, created_at, updated_at)
- choices (id, question_id, text, is_correct, order)
- quizzes (id, title, description, created_by, created_at)
- quiz_questions (quiz_id, question_id, order)
- sessions (id, quiz_id, room_code, status, created_at)
- player_answers (session_id, player_name, question_id, choice_id, timestamp)
```

**Migration Tasks:**
- [ ] Design complete database schema
- [ ] Set up PostgreSQL container/service
- [ ] Write migration scripts from JSON to database
- [ ] Update API endpoints to use database queries
- [ ] Implement proper authentication and authorization
- [ ] Add data validation and constraints
- [ ] Create database backup strategy

**Benefits of Separation:**
- Questions can be reused across multiple quizzes
- Updates to question text/answers propagate to all quizzes
- Better question library management
- Analytics on question difficulty and performance

---

## Long-term / Major Refactors

### 5. React Migration for Frontend
**Status:** Under Consideration
**Description:** Restructure the HTML/JavaScript codebase using React to improve scalability, maintainability, and developer experience.

**Benefits:**
- Component-based architecture
- Better state management (Context API or Redux)
- Improved code reusability
- Better testing capabilities
- Modern development workflow
- Easier to onboard new developers

**Considerations:**
- **Pros:**
  - Cleaner component structure
  - Better separation of concerns
  - Rich ecosystem and tooling
  - Improved performance with Virtual DOM

- **Cons:**
  - Significant development time investment
  - Breaking change for contributors familiar with current codebase
  - Need to rebuild all components
  - Bundle size increase

**Migration Strategy (if approved):**
1. Set up React development environment
2. Create component library matching current UI
3. Migrate page by page (start with Player page)
4. Implement state management solution
5. Add TypeScript for type safety
6. Update documentation and contribution guidelines

**Alternative Consideration:**
- Could modernize current vanilla JS with better structure first
- Consider lighter alternatives (Preact, Alpine.js, Lit)
- Evaluate if React is necessary for project scale

---

### 6. GitHub Actions - Docker Auto-Build & Push
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

## Notes

- Tasks are prioritized based on user impact and implementation complexity
- Each task should be broken down into subtasks when work begins
- Consider creating GitHub Issues for each task for better tracking
- Some tasks may require breaking changes - plan versioning accordingly

---

**Last Updated:** November 2025
**Maintained By:** TriviaForge Development Team
