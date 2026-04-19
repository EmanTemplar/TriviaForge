# TriviaForge

A production-ready, real-time interactive trivia game platform built with **Vue 3**, **Socket.IO**, and **PostgreSQL**. Designed for educators, event organizers, and trivia enthusiasts with robust connection stability, persistent player sessions, and estimated capacity for 50+ concurrent players.

**Latest Release**: v5.10.5 - Auto-Pilot Fixes & Connection Optimization, PDF Session Export, GitHub Actions CI/CD

### Key Highlights

- 🎯 **Production-Ready**: Tested with simulated sessions of 50+ concurrent players
- ⚡ **Persistent Player Sessions**: Dual-ID architecture (PlayerID + RoomSessionID) for seamless reconnection and state preservation
- 📱 **Mobile-Optimized**: HTTP-compatible UUID generation, CORS/CSRF configured for cross-origin mobile access
- 🏗️ **Modular Architecture**: Clean separation of concerns with controllers, services, middleware, and routes (v4.0.0)
- 🧪 **Fully Tested**: Comprehensive automated testing suite with 8 scenarios (quick to extreme load)
- 🔒 **Secure**: bcrypt password hashing, session-based auth, CSRF protection, rate limiting, SQL injection prevention
- 📊 **Scalable**: PostgreSQL connection pooling optimized for concurrent sessions with in-memory session tracking
- 🐳 **Easy Deploy**: Single-command Docker Compose setup with automatic database initialization

<!-- Screenshot Placeholder: Landing Page -->
![Landing Page](screenshots/landing-page.png?v=202602)

<!-- Screenshot Placeholder: Main Game Interface -->
![TriviaForge Main Interface](screenshots/main-interface.png?v=202602)

## Features

### For Administrators
- **Quiz Management**: Create, edit, and delete custom quizzes with an intuitive interface
- **Quiz Visibility Controls**: Toggle quizzes for Live mode (presenter-led) and/or Solo mode (self-study) with visual badges
- **Question Bank**: Centralized question management across all quizzes with search, filter, and archive capabilities
- **Tag System**: Organize questions with customizable color-coded tags
- **Duplicate Detection**: Find and manage duplicate questions with similarity-based detection and merge tools
- **Question Types**: Support for Multiple Choice and True/False questions
- **Image Support**: Add images to questions via file upload or external URL
- **Timer Settings**: Configure per-quiz question timers and reveal delays for auto-mode
- **Results Display Toggle**: Per-quiz option to show celebratory results podium with gold/silver/bronze when quiz completes
- **Drag-and-Drop Reordering**: Reorganize questions and answer choices with visual drag-and-drop or arrow buttons
- **Smart Answer Tracking**: Correct answer automatically updates when reordering choices
- **Excel Import**: Bulk import quizzes from professionally formatted Excel templates with duplicate review (supports 2-10 answer choices)
- **Session Management**: Resume interrupted sessions with full state preservation
- **Real-time Monitoring**: Track active rooms and player participation live
- **User Management**: View and manage all user accounts (guest, registered players, and admins)
- **Password Reset**: Reset player passwords and manage account types
- **Multi-Admin Support**: Multiple admin accounts with isolated quizzes and sessions
- **Admin Management** (Root Admin): Create/delete admin accounts, reset admin passwords
- **Account Settings**: Update email and password from any admin page
- **Session Health Monitoring**: View memory usage, active sessions, and live room statistics in real-time
- **Server Settings**: Configure the server URL for QR codes directly from the admin panel (no container rebuild needed)
- **PDF Export**: Export richly formatted session reports as PDF — includes podium leaderboard, full player rankings, per-question accuracy chart, and detailed question breakdown with embedded images
- **Bulk PDF Export**: Select multiple sessions and download a ZIP archive of individual PDF reports

<!-- Screenshot Placeholder: Admin Dashboard -->
![Admin Dashboard](screenshots/admin-dashboard.png?v=202602)

<table>
  <tr>
    <td width="33%" align="center">
      <img src="screenshots/question-bank.png?v=202602" alt="Question Bank" width="100%"/>
      <br/>
      <em>Question Bank</em>
    </td>
    <td width="33%" align="center">
      <img src="screenshots/user-management.png?v=202602" alt="User Management" width="100%"/>
      <br/>
      <em>User Management</em>
    </td>
    <td width="33%" align="center">
      <img src="screenshots/2FA-login.png?v=202602" alt="Two-Factor Authentication" width="100%"/>
      <br/>
      <em>Two-Factor Authentication</em>
    </td>
  </tr>
</table>

### For Presenters
- **Live Quiz Control**: Present questions, reveal answers, and navigate through quizzes in real-time
- **Auto-Mode Timer System**: Server-side timers run independently of presenter's browser with pause/resume support
- **Configurable Timers**: Question timer (10-120 seconds) and reveal delay (2-30 seconds) per quiz or global defaults
- **Auto-Advance**: Automatically advance to next question after reveal delay expires
- **Smart Timer Skip**: All players answered detection skips remaining question timer automatically
- **Player Management**: See connected players with live status indicators, organized by connection status (connected/away/disconnected)
- **Real-time Answer Progress**: Track how many players have answered with percentage and animated progress bar
- **All Players Answered Notification**: Visual notification when all active players have submitted answers
- **Auto-Reveal Option**: Configurable 3-second auto-reveal countdown when all players answer (can be canceled)
- **Kick Player**: Remove disruptive players from sessions with confirmation dialog
- **Ban Display Names**: Block offensive display names globally to prevent rejoining
- **Live Standings Dashboard**: Real-time leaderboard showing all players' scores, accuracy, and rankings with medal recognition for top performers
- **QR Code Generation**: Quick player join via scannable QR codes
- **Session Resume**: Continue interrupted quizzes exactly where you left off
- **Multi-room Support**: Manage multiple concurrent trivia sessions
- **Class Performance Analytics**: View overall class statistics (total correct/incorrect, class accuracy percentage, average performance)
- **Question Progress Counter**: Live "X / Y" counter showing revealed questions vs total
- **Auto-Complete Detection**: Quiz automatically completes when all questions have been revealed (both manual and auto-mode)

<!-- Screenshot Placeholder: Presenter View -->
![Presenter View](screenshots/presenter-view.png?v=202602)

![Live Standings](screenshots/live-standings.png?v=202602)

### For Players
- **Mobile-Optimized Interface**: Responsive design that works seamlessly on all devices (HTTP and HTTPS)
- **Solo Play Mode**: Self-study mode without a presenter - browse solo-enabled quizzes and play at your own pace
- **Per-Question Timer**: Countdown timer for each question with visual progress bar
- **Immediate Feedback**: See correct/incorrect status immediately after answering in solo mode
- **Results Summary**: Detailed breakdown of performance with per-question review after completing a quiz
- **Guest Solo Play**: No account required - play solo quizzes as a guest
- **Persistent Player Identity**: UUID-based PlayerID stored in localStorage for seamless reconnection across sessions
- **Wake Lock Support**: Keeps mobile screens on during games (Chrome 84+, Safari 16.4+) with visual indicator
- **Enhanced Connection Stability**: Infinite reconnection attempts with intelligent page visibility detection (30-second debounce)
- **Real-time Feedback**: Instant answer submission and result display in live games
- **Answer Locking**: Prevents re-answering after submission (even on reconnection)
- **Smart Reconnection**: Automatically restore progress when rejoining with full state preservation via RoomSessionID
- **Progress Tracking**: Comprehensive modal showing detailed session statistics and question-by-question history with correct/incorrect/pending status (persists across disconnections)
- **Question Progress Counter**: Live "X / Y" counter in navbar showing game progress
- **End-of-Game Results**: Celebratory podium display showing top 3 players with gold/silver/bronze and full rankings
- **Quiz Complete Notification**: Clear "Quiz Complete!" screen with countdown transition when results are enabled
- **Account System**: Guest accounts with optional registration for persistent profiles
- **Recent Rooms**: Quick rejoin to recently played active rooms
- **Account Management**: Update display names and manage account settings
- **Session Persistence**: Stay logged in for extended periods without re-authentication
- **Cross-Origin Support**: Join games from any device on the local network with proper CORS/CSRF handling
- **Player Stats Dashboard**: Dedicated `/stats` page for registered players with game history, summary stats, and trend charts
- **Performance Summary**: View total games, overall accuracy, best score, multiplayer wins, average rank, and play streak
- **Trend Charts**: Accuracy and score trends over time with theme-aware Chart.js visualizations
- **Game History**: Paginated table of past games with quiz name, score, accuracy, rank, and type filter (solo/multiplayer)

<table>
  <tr>
    <td width="33%" align="center">
      <img src="screenshots/player-mobile-waiting.png?v=202602" alt="Player Waiting" width="100%"/>
      <br/>
      <em>Player Lobby</em>
    </td>
    <td width="33%" align="center">
      <img src="screenshots/player-questions.png?v=202602" alt="Player Answering" width="100%"/>
      <br/>
      <em>Answering Questions</em>
    </td>
    <td width="33%" align="center">
      <img src="screenshots/confirmation-modal.png?v=202602" alt="Answer Confirmation" width="100%"/>
      <br/>
      <em>Answer Confirmation</em>
    </td>
  </tr>
  <tr>
    <td width="33%" align="center">
      <img src="screenshots/desktop-player-page.png?v=202602" alt="Desktop Player View" width="100%"/>
      <br/>
      <em>Desktop Player View</em>
    </td>
    <td width="33%" align="center">
      <img src="screenshots/player-countdown.png?v=202602" alt="Countdown Timer" width="100%"/>
      <br/>
      <em>Countdown Timer</em>
    </td>
    <td width="33%" align="center">
      <img src="screenshots/player-standings.png?v=202602" alt="Player Standings" width="100%"/>
      <br/>
      <em>Player Standings</em>
    </td>
  </tr>
  <tr>
    <td width="33%" align="center">
      <img src="screenshots/theme-selection.png?v=202602" alt="Theme Selection" width="100%"/>
      <br/>
      <em>Theme Selection</em>
    </td>
    <td width="33%" align="center">
      <img src="screenshots/player-mobile.png?v=202602" alt="Player Overview" width="100%"/>
      <br/>
      <em>Mobile Interface</em>
    </td>
    <td width="33%" align="center">
      <img src="screenshots/solo-mode-landing.png?v=202602" alt="Solo Mode Landing" width="100%"/>
      <br/>
      <em>Solo Mode Landing</em>
    </td>
  </tr>
  <tr>
    <td width="33%" align="center">
      <img src="screenshots/solo-mode-playing.png?v=202602" alt="Solo Mode Playing" width="100%"/>
      <br/>
      <em>Solo Mode Playing</em>
    </td>
    <td width="33%" align="center">
    </td>
    <td width="33%" align="center">
    </td>
  </tr>
</table>

### For Spectators
- **Display Mode**: Large-screen view perfect for projectors and TVs
- **Live Results**: Real-time answer distribution and statistics
- **Reveal Animations**: Engaging answer reveals with visual feedback
- **Multiple Displays**: Connect multiple spectator screens to the same room simultaneously
- **Question Progress Counter**: Live tracking of revealed questions
- **End-of-Game Results**: Full podium display on spectator screens when quiz completes

<!-- Screenshot Placeholder: Display/Spectator View -->
![Spectator Display](screenshots/spectator-display.png?v=202602)

## Technology Stack

### Backend
- **Runtime**: Node.js (v20+) with ES Modules
- **Framework**: Express.js (^4.18.2) with modular architecture (v4.0.0)
- **Architecture**: MVC pattern with controllers, services, middleware, and routes
- **Real-time**: Socket.IO (^4.7.2) with WebSocket transport and persistent session tracking
- **Database**: PostgreSQL 15 with connection pooling (pg ^8.11.0)
- **Authentication**: bcrypt (^5.1.1) for password hashing, session-based tokens
- **Security**: CSRF protection (csrf-csrf), rate limiting (express-rate-limit), CORS (cors)
- **File Processing**: ExcelJS (^4.4.0), XLSX (^0.18.5), Multer (^2.0.2)
- **Utilities**: crypto (built-in), QRCode (^1.5.1), dotenv (^16.1.4), cookie-parser (^1.4.6)

### Frontend
- **Framework**: Vue 3 (^3.3.0) - Composition API
- **Build Tool**: Vite (^5.4.21) - Fast HMR and optimized builds
- **State Management**: Pinia (^2.1.0) - Vue's official state management
- **Routing**: Vue Router (^4.2.0) - SPA navigation
- **HTTP Client**: Axios (^1.6.0)
- **Charts**: Chart.js (^4.4.0) + vue-chartjs (^5.3.0) - Theme-aware data visualization
- **Real-time Client**: Socket.IO Client (^4.7.0)
- **Styling**: Modern CSS3 with custom properties and responsive design
- **Theme System**: 4-theme support (Light, Dark, Grey, System) with enhanced light theme visibility

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions — automatically builds and pushes Docker images to Docker Hub on version tag push (`v*.*.*`)
- **Database**: PostgreSQL 15 (official Docker image)
- **Schema**: Fully normalized relational design with foreign keys
- **Connection Pooling**: Optimized for concurrent sessions
- **Session Persistence**: Database-backed session storage

### Development & Testing
- **Testing**: Custom automated testing framework (HTTP-based)
- **Debug Tools**: Built-in debug API and CLI tools
- **Logging**: Conditional logging with connection state tracking
- **Linting**: ESLint for code quality

## Installation

### Prerequisites
- **Docker** and **Docker Compose** (recommended)
  - OR Node.js (v20 or higher) + PostgreSQL 15

### Quick Start with Docker (Recommended)

> **Important**: TriviaForge requires **TWO containers** to run:
> 1. `triviagame-app` - The Node.js application (pulls from Docker Hub)
> 2. `triviagame-db` - PostgreSQL 15 database (pulls from Docker Hub)
>
> You **MUST** use docker-compose to start both containers together.

**Choose your preferred setup method:**

#### Option A: Command Line (Recommended)

1. **Clone the repository**
   ```bash
   git clone git@github.com:EmanTemplar/TriviaForge.git
   cd TriviaForge
   ```

2. **⚠️ IMPORTANT: Configure environment variables BEFORE starting**

   Create your `.env` file from the template:
   ```bash
   cp .env.example .env
   ```

   **Now open the `.env` file in a text editor and configure these REQUIRED settings:**

   ```env
   # REQUIRED: Set your admin password (login won't work without this!)
   ADMIN_PASSWORD=your_secure_password_here

   # Optional: Server URL for QR codes (can also be set in Admin > Settings tab)
   # SERVER_URL=http://192.168.1.100:3000

   # Optional: Set your host IP (helps with network detection)
   HOST_IP=192.168.1.100  # Replace with YOUR actual IP
   ```

   Find your IP address:
   - **Windows**: Run `ipconfig` in Command Prompt (look for IPv4 Address)
   - **Mac/Linux**: Run `ifconfig` or `ip addr` in Terminal

   **Do not proceed until you've set `ADMIN_PASSWORD` in your .env file!**

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

   This will:
   - Pull `postgres:15` from Docker Hub
   - Pull `emancodetemplar/triviaforge:latest` from Docker Hub
   - Start the database and wait for it to be healthy
   - Initialize the database schema automatically (takes 30-60 seconds)
   - Start the application

4. **Verify startup**
   ```bash
   docker-compose logs -f app
   ```

   Wait for these success messages:
   - `✅ Database connection established`
   - `✅ Database initialization completed successfully`
   - `Server running on port 3000`

5. **Access the application**
   - Landing Page: `http://localhost:3000` (or use your SERVER_URL)
   - Admin Panel: `http://localhost:3000/index.html`
   - Use the ADMIN_PASSWORD you set in your .env file

#### Option B: Docker Desktop UI

1. **Clone the repository**
   ```bash
   git clone git@github.com:EmanTemplar/TriviaForge.git
   cd TriviaForge
   ```

2. **⚠️ IMPORTANT: Configure .env file FIRST**

   ```bash
   cp .env.example .env
   ```

   Open `.env` in a text editor and set at minimum:
   - `ADMIN_PASSWORD=your_secure_password`
   - `SERVER_URL=http://YOUR_IP:3000`
   - `HOST_IP=YOUR_IP`

   (See Option A step 2 for details)

3. **Start via Docker Desktop**
   - Open Docker Desktop
   - Open a terminal in the TriviaForge directory
   - Run: `docker-compose up -d`
   - OR drag the project folder into Docker Desktop (if supported)

4. **Monitor in Docker Desktop UI**
   - Go to **Containers** tab
   - You should see both containers running:
     - `triviagame-app`
     - `triviagame-db`
   - Click on `triviagame-app` to view logs
   - Wait for: `Server running on port 3000`

5. **Access the application**
   - Landing Page: `http://localhost:3000`
   - Use the ADMIN_PASSWORD from your .env file

#### Common Docker Commands

**View logs:**
```bash
docker-compose logs -f        # All services
docker-compose logs -f app    # Just the application
docker-compose logs -f db     # Just the database
```

**Stop the application:**
```bash
docker-compose down           # Stop and remove containers
docker-compose down -v        # Also remove database volume (fresh start)
```

**Restart after changes:**
```bash
docker-compose restart        # Restart existing containers
docker-compose up -d          # Recreate containers if needed
```

### Manual Setup (Without Docker)

1. **Install PostgreSQL 15**
   - Follow [PostgreSQL installation guide](https://www.postgresql.org/download/)

2. **Create database**
   ```bash
   createdb trivia
   psql trivia < app/init/tables.sql
   ```

3. **Install Node.js dependencies**
   ```bash
   cd app
   npm install
   ```

4. **Configure environment variables**

   Create `.env` file in `app` directory:
   ```env
   DATABASE_URL=postgres://your_user:your_password@localhost:5432/trivia
   ADMIN_PASSWORD=your_secure_password_here
   APP_PORT=3000
   ```

5. **Start the server**
   ```bash
   npm start
   ```

## Usage Guide

### Creating a Quiz

#### Method 1: Manual Creation (Admin Panel)
1. Navigate to the Admin panel
2. Enter admin password
3. Fill in quiz title and description
4. Add questions with 2-10 answer choices
5. Mark the correct answer for each question
6. Click "Save Quiz"

#### Method 2: Excel Import
1. Download the Excel template from the Admin panel
2. Fill in your quiz data following the template format:
   - Column A: Question text
   - Columns B-K: Answer choices (2-10 choices)
   - Column L: Correct answer index (0-9)
3. Upload the completed Excel file
4. Review and save the imported quiz

<!-- Screenshot Placeholder: Quiz Creation -->
![Quiz Creation Interface](screenshots/quiz-creation.png?v=202602)

### Running a Live Session

1. **Presenter Setup**
   - Open the Presenter page
   - Select a quiz from the dropdown
   - Click "Make Live" to create a room
   - Share the room code or QR code with players

2. **Player Join**
   - Players open the Player page
   - Enter room code and their name
   - Wait for questions to be presented

3. **Presenting Questions**
   - Navigate through questions using Previous/Next buttons
   - Click "Present Question to Players" to show current question
   - Players submit their answers
   - Click "Reveal Answer" to show correct answer and results

4. **Completing the Session**
   - Click "Complete Quiz & Save Results" to finish
   - Session data is automatically saved

<!-- Screenshot Placeholder: Live Session Flow -->
![Live Session in Progress](screenshots/live-session.png?v=202602)

### Resuming an Interrupted Session

If a session is interrupted (server restart, connection loss, etc.):

1. Go to Presenter or Admin page
2. Find the session in "Resume Session" or "Incomplete Sessions" dropdown
3. Click "Resume"
4. A new room code is generated
5. Players rejoin with their **original names** to restore their progress
6. Continue from where you left off

<!-- Screenshot Placeholder: Resume Session -->
![Resume Session Feature](screenshots/resume-session.png?v=202602)

### Viewing Past Sessions

All completed and interrupted sessions are saved and can be reviewed:

1. Navigate to the Admin panel
2. Scroll to the "Completed Sessions" section
3. View session details including:
   - Quiz title and room code
   - Start/resume timestamps
   - Player names and scores
   - Individual question results

<!-- Screenshot Placeholder: Past Sessions -->
![Past Sessions History](screenshots/past-sessions.png?v=202602)

## Testing

TriviaForge includes a comprehensive automated testing suite for validating functionality and performance.

### Quick Test

```bash
# Windows
test.bat quick

# Linux/Mac
./test.sh quick
```

### Available Test Scenarios

**Quick Tests** (Development)
- `quick` - Fast validation (3 players) - ~10s
- `session` - Default test (5 players, 3 questions) - ~25s
- `verbose` - Detailed logging - ~25s

**Stress Tests** (Performance)
- `light` - Light load (5 players) - ~25s
- `medium` - Medium load (15 players) - ~45s
- `heavy` - Large event simulation (25 players) - ~2min
- `extreme` - Maximum capacity (50 players) - ~3min
- `stress` - Standard stress (20 players) - ~1min

### Running Tests

```bash
# Run default test
test.bat

# Run specific scenario
test.bat heavy

# View all options
test.bat help
```

### Custom Test Configuration

Set environment variables for custom scenarios:

```bash
# Example: 30 players, 10 questions
docker-compose exec -e TEST_PLAYERS=30 app node testing/test-runner.js
```

**Available Environment Variables:**
- `TEST_PLAYERS` - Number of simulated players (default: 5)
- `TEST_QUIZ_ID` - Quiz to use (default: 1)
- `TEST_ANSWER_DELAY` - Max delay between answers in ms (default: 2000)
- `TEST_QUESTION_DELAY` - Delay between questions in ms (default: 5000)
- `TEST_VERBOSE` - Detailed logging (default: false)

### Documentation

For comprehensive testing documentation, see:
- [app/testing/README.md](app/testing/README.md) - Testing suite overview
- [app/testing/TESTING.md](app/testing/TESTING.md) - Complete testing guide
- [app/testing/stress-test.config.js](app/testing/stress-test.config.js) - Scenario configurations

## File Structure

```
TriviaForge/
├── app/
│   ├── src/              # Backend source (v4.0.0+ Modular Architecture)
│   │   ├── config/       # Configuration modules
│   │   │   ├── constants.js    # Application constants
│   │   │   ├── database.js     # PostgreSQL connection pool
│   │   │   ├── environment.js  # Environment variable access
│   │   │   └── version.js      # Centralized version management
│   │   ├── controllers/  # REST API controllers
│   │   │   ├── auth.controller.js
│   │   │   ├── quiz.controller.js
│   │   │   ├── questionBank.controller.js
│   │   │   ├── session.controller.js
│   │   │   ├── solo.controller.js    # Solo play REST API
│   │   │   ├── stats.controller.js   # Player stats API
│   │   │   ├── tag.controller.js     # Tag management
│   │   │   └── user.controller.js
│   │   ├── middleware/   # Express middleware
│   │   │   ├── auth.js         # Authentication middleware
│   │   │   └── errorHandler.js # Global error handler
│   │   ├── routes/       # REST API routes
│   │   │   ├── auth.routes.js
│   │   │   ├── quiz.routes.js
│   │   │   ├── questionBank.routes.js
│   │   │   ├── session.routes.js
│   │   │   ├── solo.routes.js        # Solo play routes
│   │   │   ├── stats.routes.js       # Player stats routes
│   │   │   ├── tag.routes.js         # Tag routes
│   │   │   └── user.routes.js
│   │   ├── services/     # Business logic services
│   │   │   ├── autoMode.service.js   # Server-side auto-mode timer engine
│   │   │   ├── export.service.js     # CSV export functionality
│   │   │   ├── quiz.service.js       # Quiz data access
│   │   │   ├── room.service.js       # Live room state management
│   │   │   ├── session.service.js    # Session persistence
│   │   │   └── totp.service.js       # Two-factor authentication
│   │   └── utils/        # Utility modules
│   │       ├── constants.js   # Shared constants
│   │       ├── errors.js      # Custom error classes
│   │       ├── helpers.js     # Helper functions
│   │       ├── responses.js   # API response helpers
│   │       ├── similarity.js  # Duplicate detection algorithm
│   │       └── validators.js  # Input validation
│   ├── src/              # Frontend source (Vue 3 + Vite)
│   │   ├── main.js       # Vue app entry point
│   │   ├── App.vue       # Root component
│   │   ├── router.js     # Vue Router configuration
│   │   ├── pages/        # Page components
│   │   │   ├── LoginPage.vue
│   │   │   ├── AdminPage.vue
│   │   │   ├── PresenterPage.vue
│   │   │   ├── PlayerPage.vue
│   │   │   ├── PlayerManagePage.vue
│   │   │   ├── DisplayPage.vue
│   │   │   ├── SoloPlayPage.vue      # Solo play mode
│   │   │   └── StatsPage.vue         # Player stats dashboard
│   │   ├── components/   # Reusable Vue components
│   │   │   ├── admin/    # Admin panel components (Question Bank, Tags, Duplicates)
│   │   │   ├── common/   # Shared components (Modal, Button, AppIcon, etc.)
│   │   │   ├── modals/   # Modal components
│   │   │   ├── player/   # Player page components (CountdownTimer, etc.)
│   │   │   ├── stats/    # Player stats components (Summary, Charts, History, Navbar)
│   │   │   └── presenter/ # Presenter page components
│   │   ├── stores/       # Pinia state stores
│   │   │   ├── auth.js
│   │   │   ├── ui.js
│   │   │   ├── player.js
│   │   │   ├── question.js
│   │   │   ├── quiz.js
│   │   │   └── room.js
│   │   ├── composables/  # Vue composables
│   │   │   ├── useApi.js         # Axios wrapper (w/ CSRF)
│   │   │   ├── useAuth.js        # Authentication composable
│   │   │   ├── useLocalStorage.js # LocalStorage wrapper
│   │   │   ├── useSocket.js      # Socket.IO integration (w/ PlayerID)
│   │   │   ├── useSoloGame.js    # Solo play state management
│   │   │   ├── useTheme.js       # Theme management
│   │   │   └── useWakeLock.js    # Screen wake lock
│   │   ├── assets/       # Static assets (CSS, images)
│   │   └── main.css      # Global styles
│   ├── init/             # Database initialization SQL scripts
│   │   ├── 01-tables.sql              # PostgreSQL schema
│   │   ├── 02-migrate_timestamps.sql
│   │   ├── ...                        # Additional migrations (03-08)
│   │   ├── 09-question-tags.sql       # Question Bank & tags
│   │   ├── 10-duplicate-detection.sql # Text hash for duplicates
│   │   ├── 11-ignored-duplicate-pairs.sql # Ignored pairs
│   │   ├── 12-auto-mode-solo-play.sql # Auto-mode & solo play
│   │   ├── 13-fix-solo-guest-participants.sql # Guest participant fix
│   │   ├── 14-show-results-setting.sql    # Show results toggle
│   │   └── 15-server-url-setting.sql      # Server URL setting
│   ├── testing/          # Automated testing suite
│   │   ├── README.md     # Testing suite overview
│   │   ├── TESTING.md    # Complete testing guide
│   │   ├── test-runner.js
│   │   └── stress-test.config.js
│   ├── server.js         # Main server application (Express + Socket.IO)
│   ├── db-init.js        # Database initialization orchestrator
│   ├── vite.config.js    # Vite build configuration
│   ├── index.html        # HTML entry point
│   ├── Dockerfile        # Docker container definition
│   └── package.json      # Dependencies
├── test.bat              # Windows test runner wrapper
├── test.sh               # Linux/Mac test runner wrapper
├── docker-compose.yml    # Docker orchestration configuration
├── .env.example          # Environment variables template
├── LICENSE               # PolyForm Noncommercial License
├── CONTRIBUTING.md       # Contribution guidelines
├── TODO.md               # Feature roadmap
└── README.md             # This file
```

## Environment Variables

### Configuration Methods

Environment variables can be set in multiple ways (listed by precedence, highest to lowest):

1. **Docker Desktop UI** - Set directly in the container configuration (highest priority)
2. **`.env` file** - Place in the root directory alongside `docker-compose.yml`
3. **Default values** - Built into `docker-compose.yml` (lowest priority)

### Available Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `APP_PORT` | Port number for the server | `3000` | No |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://trivia:trivia@db:5432/trivia` | Yes (auto-configured in Docker) |
| `ADMIN_PASSWORD` | Password to access admin panel | - | **Yes** |
| `HOST_IP` | Server IP address for network access | Auto-detected | No |
| `SERVER_URL` | Server URL for QR codes (can also be set in Admin > Settings) | Auto-detected | No |
| `SESSION_TIMEOUT` | Session expiration time (ms) | `3600000` (1 hour) | No |
| `NODE_ENV` | Environment mode (`development` or `production`) | `production` | No |
| `DEBUG_MODE` | Enable comprehensive debug logging (server-side) | `false` | No |
| `TZ` | Timezone for timestamps | `America/New_York` | No |
| `APP_NAME` | Application name | `TriviaForge` | No |
| `SOCKET_RATE_WINDOW_MS` | Socket.IO rate limit window (ms) | `60000` (1 min) | No |
| `SOCKET_JOIN_LIMIT` | Max join attempts per IP per window | `50` | No |
| `SOCKET_ANSWER_LIMIT` | Max answer submissions per IP per window | `300` | No |

### Important Notes

- **For Docker Desktop users:** Variables set in the UI will override `.env` file values
- **For Docker Compose CLI users:** Create a `.env` file from `.env.example` and configure there
- **`ADMIN_PASSWORD`** must be set before first run for admin login to work
- **`SERVER_URL`** can be set in your `.env` file OR configured in the Admin > Settings tab. The Admin UI setting takes priority over the environment variable

## Features in Detail

### Excel Quiz Import
- Download a formatted Excel template with color-coded sections
- Support for 2-10 answer choices per question
- Automatic validation of quiz structure
- Preserves question formatting and special characters

### Session Management
- **Dual-ID Architecture (v4.0.0)**: PlayerID (persistent across sessions) + RoomSessionID (per-room tracking)
- Automatic session state saving to PostgreSQL database
- In-memory session tracking with Maps for O(1) lookups
- Player answer history preservation with comprehensive logging
- Reconnection support with full state restoration (answers, progress, reconnection count)
- Timestamp tracking for created and resumed sessions (timezone-aware)
- Status indicators (In Progress, Interrupted, Completed)
- Session analytics with participant performance views
- Debug logging modes: `[SESSION DEBUG]`, `[ROOM SESSION]`, `[JOIN DEBUG]`, `[ANSWER DEBUG]`

### User Management
- **Persistent Player Identity (v4.0.0)**: UUID-based PlayerID stored in localStorage for seamless reconnection
- Guest accounts created automatically on first join
- Optional registration for persistent accounts
- Password-protected registered player accounts
- Session tokens with configurable timeout (default 1 hour)
- Admin password reset functionality
- Account type management (guest/registered/admin)
- Recent rooms tracking with active session filtering
- Cross-origin support with CORS and CSRF protection for mobile devices

### Answer Integrity
- Server-side validation prevents answer manipulation
- Answer locking after submission (persists across disconnects)
- Prevents re-answering after reveal
- Tamper-proof answer tracking

### Responsive Design
- Mobile-first interface for players
- Desktop-optimized admin and presenter views
- Adaptive text sizing with viewport scaling
- Touch-friendly controls

## License

This project is licensed under the **PolyForm Noncommercial License 1.0.0**.

**Key points:**
- ✅ Free for personal use, research, and educational purposes
- ✅ Open source and available for modification
- ✅ Can be used by nonprofits and educational institutions
- ❌ Cannot be used for commercial purposes or profit-making activities

See the [LICENSE](LICENSE) file for full details.

## Contributing

We welcome contributions from the community! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) guide before submitting pull requests.

**Quick guidelines:**
- By contributing, you agree your contributions will be under the same noncommercial license
- Follow the existing code style
- Test your changes thoroughly
- Write clear commit messages
- Update documentation as needed

## Support

- **Issues**: Report bugs via [GitHub Issues](https://github.com/EmanTemplar/TriviaForge/issues)
- **Discussions**: Ask questions and share ideas in [GitHub Discussions](https://github.com/EmanTemplar/TriviaForge/discussions)

## Roadmap

### Completed Features

**v5.10.5 (Apr 2026) - Auto-Pilot Fixes & Connection Optimization**
- [x] Fixed auto-pilot skipping the live question when starting mid-session
- [x] Fixed auto-pilot resume not correctly calculating remaining time after pause
- [x] Fixed answer reveal modal appearing twice when auto-mode and auto-reveal both active
- [x] Fixed "All players answered" banner stuck on presenter across question transitions
- [x] Fixed presenter losing auto-pilot control after page refresh (viewRoom now updates presenterId)
- [x] Prevented Display/spectator connections from creating ghost users in the database
- [x] Removed redundant app-level heartbeat (saves ~240 WebSocket messages/minute at 30 players)
- [x] Reduced socket pingTimeout from 360s to 60s — dead connections detected within ~85 seconds

**v5.10.4 (Mar 2026) - Display & Player UI Polish**
- [x] Fixed Display page content breaking words mid-character on small viewports
- [x] Display page now scales with vmin-based clamp() — never scrolls on any screen size
- [x] Fixed player choice text breaking mid-word (removed aggressive word-break)
- [x] Fixed player navbar question progress pill hidden on mobile (≤480px)
- [x] Player progress counter (X/Y) now updates correctly in real-time

**v5.10.3 (Mar 2026) - Auto-Pilot State Sync**
- [x] Auto-pilot timer and state now correctly sync to all connected clients on start
- [x] Presenter reconnection fully restores auto-mode state (timer, settings, active status)
- [x] Second browser/viewRoom no longer loses auto-mode UI
- [x] Session resume now includes auto-mode state in room restore payload

**v5.10.2 (Mar 2026) - Session & CSRF Resilience**
- [x] Sliding session expiry — sessions extend on activity, not fixed timeout from login
- [x] CSRF token auto-retry: expired tokens transparently refreshed and request retried once
- [x] Quiz settings no longer reset to defaults when a partial update is submitted

**v5.10.1 (Mar 2026) - CSRF & Import Bugfix**
- [x] Fixed CSRF token validation failures in Docker behind a proxy (trust proxy setting)
- [x] Fixed quiz import "Use Existing" option crashing with duplicate key error

**v5.10.0 (Mar 2026) - Unified Navbar Redesign**
- [x] Unified navbar design system across all 5 navbars with shared CSS classes
- [x] Admin/Presenter links visible on player-side pages when logged in as admin
- [x] Consistent right-aligned links, AppIcon on every link, active page underline
- [x] Hover: color change + subtle bottom border, danger links in red
- [x] Hamburger mobile menu with tight spacing, replaced emoji rank medals with AppIcon

**v5.9.0 (Mar 2026) - Trusted Devices & Score Fix**
- [x] "Remember this device for 30 days" checkbox on 2FA login - skips TOTP on trusted devices
- [x] Secure device token storage with 30-day expiry and periodic cleanup
- [x] Fixed `game_participants.score` always being 0 - now computes correct answer count on save
- [x] Guest participant scores also updated on re-save

**v5.8.0 (Mar 2026) - Player Stats Dashboard**
- [x] Dedicated `/stats` page for registered players with login required
- [x] Summary cards: total games, overall accuracy, best score, wins, avg rank, play streak
- [x] Accuracy and score trend charts (Chart.js + vue-chartjs) with theme-aware styling
- [x] Paginated game history table with type filter (all/solo/multiplayer)
- [x] Mobile-responsive layout with card view for small screens
- [x] "My Stats" navigation links from Player and Solo Play pages
- [x] Solo play now tracks user_id for authenticated players (enables stats)
- [x] Three new API endpoints: /api/stats/summary, /history, /charts

**v5.7.0 (Feb 2026) - Admin-Configurable Server URL**
- [x] Server Settings panel in Admin > Settings tab for configuring QR code URLs
- [x] Dynamic URL resolution: DB setting takes priority over env var over auto-detected IP
- [x] No container rebuild needed - changes take effect immediately for new QR codes
- [x] Fixed player auth redirect bug for expired tokens scanning QR codes

**v5.5.0 (Feb 2026) - Backend Performance & Session Health**
- [x] Backend Performance Optimizations - Memory cleanup scheduler, Socket.IO rate limiting, room activity tracking
- [x] Session Health Monitoring - Admin panel with memory usage, session counts, and live room statistics
- [x] Configurable Socket.IO Rate Limits - Environment variables for join and answer rate limits (NAT-friendly defaults)
- [x] Presenter Layout Improvements - Two-column layout for controls (buttons left, auto-mode right)
- [x] Memory Progress Bars - Color-coded visualization (green/yellow/red) based on usage percentage
- [x] Auto-refresh Toggle - 10-second interval for real-time monitoring

**v5.4.4 (Feb 2026) - Auto-Mode & Solo Play**
- [x] Auto-Mode Timer System - Server-side timers run independently of presenter's browser
- [x] Configurable question timer (10-120 seconds) and reveal delay (2-30 seconds)
- [x] Pause/Resume functionality with remaining time preservation
- [x] Auto-advance to next question after reveal delay
- [x] All players answered detection skips remaining question timer
- [x] Solo Play Mode - REST-based self-study without presenter
- [x] Solo quiz browser with solo-enabled quizzes only
- [x] Per-question countdown timer with immediate feedback
- [x] Results summary with per-question breakdown
- [x] Quiz visibility controls (available_live, available_solo flags)
- [x] Live/Solo badges on quiz list items with toggle controls
- [x] CountdownTimer component for player and display views

**v5.3.4 (Feb 2026) - Complete Duplicate Detection System**
- [x] Question Bank with centralized question management across all quizzes
- [x] Tag system with customizable colors for question organization
- [x] Question filtering by tag, type, archived status, and search text
- [x] Archive/restore questions with soft delete functionality
- [x] Find Duplicates tool with Levenshtein similarity algorithm (configurable threshold)
- [x] Ignore duplicate pairs feature for false positive management
- [x] Import duplicates review for bulk Excel imports with per-item decisions
- [x] Single question duplicate detection on save with warning modal
- [x] Question Details modal with metadata, quiz usage, and tag management
- [x] Add existing questions to quizzes directly from the Question Bank

**v5.2.2 (Feb 2026) - Lucide Icons & UI Polish**
- [x] Replaced all emojis with Lucide icons via Iconify for consistent UI
- [x] Created AppIcon wrapper component for standardized icon usage
- [x] Theme-aware icon colors across all components
- [x] Professional icon set throughout the application

**v5.2.1 (Jan 2026) - Quick Fixes**
- [x] Widened Account Settings modal for better usability
- [x] Removed placeholder PDF export (CSV is sufficient)

**v5.2.0 (Jan 2026) - Session Management & 2FA**
- [x] Two-Factor Authentication (TOTP) with QR code setup
- [x] Backup codes generation for 2FA recovery
- [x] Session filtering by date range, quiz name, and status
- [x] CSV export for individual and bulk sessions
- [x] Bulk session selection and deletion
- [x] Question images displayed in session details
- [x] Session breakdown with player responses per question

**v5.1.0 (Jan 2026) - Auto Database Migrations**
- [x] Version-based database migration system
- [x] Automatic schema updates on deployment
- [x] Dynamic migration file detection (no hardcoded list)
- [x] Fast startup when version unchanged (skips migration check)
- [x] Individual migration tracking prevents re-running
- [x] Idempotent migrations safe for existing databases

**v5.0.0 (Jan 2026) - Multi-Admin Support**
- [x] Media images now supported in questions via URL or local upload to container
- [x] True/False option added for questions
- [x] Multi-admin support with isolated quizzes and sessions per admin
- [x] Root admin can create/delete admin accounts and reset passwords
- [x] Session isolation - regular admins only see their own sessions
- [x] Session creator tracking - root admin sees who created each session
- [x] Account settings modal on Admin and Presenter pages
- [x] Password change with current password verification
- [x] Email address management for future recovery features
- [x] Presenter navbar dropdown matching Admin page style
- [x] User Management visual alignment improvements (CSS Grid)
- [x] Last seen timestamp fix including session token activity
- [x] Player disconnect immediately marks as disconnected

**v4.3.0 (Jan 2026) - Presenter Enhancements**
- [x] Real-time answer progress tracking with percentage and animated progress bar
- [x] All players answered notification banner with visual indicator
- [x] Auto-reveal functionality with 3-second countdown and cancel option
- [x] Configurable auto-reveal toggle (persists during session)
- [x] Smart player counting (excludes disconnected players)
- [x] Enhanced player status grouping (connected/away/disconnected)
- [x] Player count summary with color-coded icons

**v4.2.1 (Jan 2026) - Style Refactoring Release**
- [x] Component-first CSS architecture (Button, FormInput, Card enhancements)
- [x] Eliminated 560+ lines of duplicate CSS across 6 pages (12.5% reduction)
- [x] Theme-aware color system (zero hardcoded colors, perfect theme switching)
- [x] Centralized version management (single source of truth)
- [x] Extracted 4 shared CSS pattern files (navbars, scrollbars, badges, modals)
- [x] Migrated all 6 pages to use enhanced components
- [x] Perfect contrast across all 4 themes (dark, light, grey, system)

**v3.2.0 (Dec 2025) - Performance & Testing**
- [x] Enhanced connection stability (infinite reconnection attempts, 30s page visibility debounce)
- [x] Wake Lock API for mobile devices (prevents screen sleep)
- [x] Automated testing framework with 8 predefined scenarios (3-50 players)
- [x] Stress test configurations for scalable testing
- [x] Optimized logging (90% reduction in log volume)
- [x] Comprehensive testing documentation

**v3.0.0 (Nov 2025) - User Management & Session Persistence**
- [x] User authentication and accounts
  - Guest and registered player accounts
  - Session persistence with JWT tokens
  - Password reset functionality
  - User management interface
  - Recent rooms with active filtering

**v2.0.0 and earlier**
- [x] Real-time multiplayer trivia sessions
- [x] Admin panel with quiz management
- [x] Excel import/export functionality
- [x] QR code generation for quick joins
- [x] Session resume capability
- [x] PostgreSQL database integration
- [x] Docker containerization

### Future Features

**Under Consideration:**
- [ ] Advanced leaderboard and scoring systems
- [ ] Team mode for collaborative play
- [ ] PDF export with proper formatting
- [ ] Email verification for admin accounts
- [ ] Remember device for 2FA (30-day trusted devices)
- [ ] Internationalization (i18n)
- [ ] Custom scoring algorithms
- [ ] Powerups and game modifiers

## Credits

Built with love for educators, event organizers, and trivia enthusiasts.

### AI Assistance Disclosure

This project was developed with assistance from AI tools, including:
- **Claude Code** - for code generation, debugging, and feature implementation
- **Anthropic's Claude** - for architecture design and problem-solving

While AI tools were instrumental in the development process, all code has been reviewed, tested, and validated for functionality and security. The project architecture, feature decisions, and final implementation remain the responsibility of the human developers.

---

**TriviaForge** - Where Knowledge Meets Fun 🎮
