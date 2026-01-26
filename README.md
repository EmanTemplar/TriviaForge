# TriviaForge

A production-ready, real-time interactive trivia game platform built with **Vue 3**, **Socket.IO**, and **PostgreSQL**. Designed for educators, event organizers, and trivia enthusiasts with robust connection stability, persistent player sessions, and estimated capacity for 50+ concurrent players.

**Latest Release**: v5.0.0 - Multi-Admin Support: Session isolation, account management, and UI improvements

### Key Highlights

🎯 **Production-Ready**: Tested with simulated sessions of 50+ concurrent players
⚡ **Persistent Player Sessions**: Dual-ID architecture (PlayerID + RoomSessionID) for seamless reconnection and state preservation
📱 **Mobile-Optimized**: HTTP-compatible UUID generation, CORS/CSRF configured for cross-origin mobile access
🏗️ **Modular Architecture**: Clean separation of concerns with controllers, services, middleware, and routes (v4.0.0)
🧪 **Fully Tested**: Comprehensive automated testing suite with 8 scenarios (quick to extreme load)
🔒 **Secure**: bcrypt password hashing, session-based auth, CSRF protection, rate limiting, SQL injection prevention
📊 **Scalable**: PostgreSQL connection pooling optimized for concurrent sessions with in-memory session tracking
🐳 **Easy Deploy**: Single-command Docker Compose setup with automatic database initialization

<!-- Screenshot Placeholder: Landing Page -->
![Landing Page](screenshots/landing-page.png?v=202511)

<!-- Screenshot Placeholder: Main Game Interface -->
![TriviaForge Main Interface](screenshots/main-interface.png?v=202511)

## Features

### For Administrators
- **Quiz Management**: Create, edit, and delete custom quizzes with an intuitive interface
- **Drag-and-Drop Reordering**: Reorganize questions and answer choices with visual drag-and-drop or arrow buttons
- **Smart Answer Tracking**: Correct answer automatically updates when reordering choices
- **Excel Import**: Bulk import quizzes from professionally formatted Excel templates (supports 2-10 answer choices)
- **Session Management**: Resume interrupted sessions with full state preservation
- **Real-time Monitoring**: Track active rooms and player participation live
- **User Management**: View and manage all user accounts (guest, registered players, and admins)
- **Password Reset**: Reset player passwords and manage account types
- **Multi-Admin Support**: Multiple admin accounts with isolated quizzes and sessions
- **Admin Management** (Root Admin): Create/delete admin accounts, reset admin passwords
- **Account Settings**: Update email and password from any admin page

<!-- Screenshot Placeholder: Admin Dashboard -->
![Admin Dashboard](screenshots/admin-dashboard.png?v=202511)

### For Presenters
- **Live Quiz Control**: Present questions, reveal answers, and navigate through quizzes in real-time
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

<!-- Screenshot Placeholder: Presenter View -->
![Presenter View](screenshots/presenter-view.png?v=202511)

### For Players
- **Mobile-Optimized Interface**: Responsive design that works seamlessly on all devices (HTTP and HTTPS)
- **Persistent Player Identity**: UUID-based PlayerID stored in localStorage for seamless reconnection across sessions
- **Wake Lock Support**: Keeps mobile screens on during games (Chrome 84+, Safari 16.4+) with visual indicator
- **Enhanced Connection Stability**: Infinite reconnection attempts with intelligent page visibility detection (30-second debounce)
- **Real-time Feedback**: Instant answer submission and result display
- **Answer Locking**: Prevents re-answering after submission (even on reconnection)
- **Smart Reconnection**: Automatically restore progress when rejoining with full state preservation via RoomSessionID
- **Progress Tracking**: Comprehensive modal showing detailed session statistics and question-by-question history with correct/incorrect/pending status (persists across disconnections)
- **Account System**: Guest accounts with optional registration for persistent profiles
- **Recent Rooms**: Quick rejoin to recently played active rooms
- **Account Management**: Update display names and manage account settings
- **Session Persistence**: Stay logged in for extended periods without re-authentication
- **Cross-Origin Support**: Join games from any device on the local network with proper CORS/CSRF handling

<table>
  <tr>
    <td width="33%" align="center">
      <img src="screenshots/player-mobile-waiting.png?v=202511" alt="Player Waiting" width="100%"/>
      <br/>
      <em>Player Lobby</em>
    </td>
    <td width="33%" align="center">
      <img src="screenshots/player-questions.png?v=202511" alt="Player Answering" width="100%"/>
      <br/>
      <em>Answering Questions</em>
    </td>
    <td width="33%" align="center">
      <img src="screenshots/player-mobile.png?v=202511" alt="Player Overview" width="100%"/>
      <br/>
      <em>Interface Overview</em>
    </td>
  </tr>
</table>

### For Spectators
- **Display Mode**: Large-screen view perfect for projectors and TVs
- **Live Results**: Real-time answer distribution and statistics
- **Reveal Animations**: Engaging answer reveals with visual feedback

<!-- Screenshot Placeholder: Display/Spectator View -->
![Spectator Display](screenshots/spectator-display.png?v=202511)

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
- **Real-time Client**: Socket.IO Client (^4.7.0)
- **Styling**: Modern CSS3 with custom properties and responsive design
- **Theme System**: 4-theme support (Light, Dark, Grey, System) with enhanced light theme visibility

### Infrastructure
- **Containerization**: Docker & Docker Compose
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

   # REQUIRED: Set your server IP for QR codes to work
   SERVER_URL=http://192.168.1.100:3000  # Replace with YOUR actual IP

   # Optional: Set your host IP (helps with network detection)
   HOST_IP=192.168.1.100  # Replace with YOUR actual IP
   ```

   Find your IP address:
   - **Windows**: Run `ipconfig` in Command Prompt (look for IPv4 Address)
   - **Mac/Linux**: Run `ifconfig` or `ip addr` in Terminal

   **Do not proceed until you've set `ADMIN_PASSWORD` and `SERVER_URL` in your .env file!**

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
![Quiz Creation Interface](screenshots/quiz-creation.png?v=202511)

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
![Live Session in Progress](screenshots/live-session.png?v=202511)

### Resuming an Interrupted Session

If a session is interrupted (server restart, connection loss, etc.):

1. Go to Presenter or Admin page
2. Find the session in "Resume Session" or "Incomplete Sessions" dropdown
3. Click "Resume"
4. A new room code is generated
5. Players rejoin with their **original names** to restore their progress
6. Continue from where you left off

<!-- Screenshot Placeholder: Resume Session -->
![Resume Session Feature](screenshots/resume-session.png?v=202511)

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
![Past Sessions History](screenshots/past-sessions.png?v=202511)

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
│   ├── src/              # Backend source (NEW v4.0.0 - Modular Architecture)
│   │   ├── config/       # Configuration modules
│   │   │   ├── constants.js # Application constants
│   │   │   ├── database.js  # PostgreSQL connection pool
│   │   │   └── environment.js # Environment variable access
│   │   ├── controllers/  # REST API controllers
│   │   │   ├── auth.controller.js
│   │   │   ├── quiz.controller.js
│   │   │   ├── session.controller.js
│   │   │   └── user.controller.js
│   │   ├── middleware/   # Express middleware
│   │   │   ├── auth.js         # Authentication middleware
│   │   │   └── errorHandler.js # Global error handler
│   │   ├── routes/       # REST API routes
│   │   │   ├── auth.routes.js
│   │   │   ├── quiz.routes.js
│   │   │   ├── session.routes.js
│   │   │   └── user.routes.js
│   │   ├── services/     # Business logic services
│   │   │   ├── room.service.js    # Live room state management
│   │   │   ├── session.service.js # Session persistence
│   │   │   └── quiz.service.js    # Quiz data access
│   │   └── utils/        # Utility modules
│   │       ├── errors.js      # Custom error classes
│   │       ├── responses.js   # API response helpers
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
│   │   │   └── DisplayPage.vue
│   │   ├── components/   # Reusable Vue components
│   │   │   ├── common/   # Shared components (Modal, Button, etc.)
│   │   │   ├── modals/   # Modal components
│   │   │   ├── player/   # Player page components
│   │   │   └── presenter/ # Presenter page components
│   │   ├── stores/       # Pinia state stores
│   │   │   ├── auth.js
│   │   │   ├── ui.js
│   │   │   └── game.js
│   │   ├── composables/  # Vue composables
│   │   │   ├── useSocket.js # Socket.IO integration (w/ PlayerID)
│   │   │   └── useApi.js    # Axios wrapper (w/ CSRF)
│   │   ├── assets/       # Static assets (CSS, images)
│   │   └── main.css      # Global styles
│   ├── init/             # Database initialization SQL scripts
│   │   ├── 01-tables.sql # PostgreSQL schema
│   │   ├── 02-migrate_timestamps.sql
│   │   ├── 03-update-admin-password.sql
│   │   └── 04-banned-display-names.sql
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
| `SERVER_URL` | Full server URL (overrides HOST_IP) | - | **Yes** (for QR codes) |
| `SESSION_TIMEOUT` | Session expiration time (ms) | `3600000` (1 hour) | No |
| `NODE_ENV` | Environment mode (`development` or `production`) | `production` | No |
| `DEBUG_MODE` | Enable comprehensive debug logging (server-side) | `false` | No |
| `TZ` | Timezone for timestamps | `America/New_York` | No |
| `APP_NAME` | Application name | `TriviaForge` | No |

### Important Notes

- **For Docker Desktop users:** Variables set in the UI will override `.env` file values
- **For Docker Compose CLI users:** Create a `.env` file from `.env.example` and configure there
- **`ADMIN_PASSWORD`** must be set before first run for admin login to work
- **`SERVER_URL`** should be set to your server's accessible IP/hostname for QR code generation to work correctly

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

**v5.0.0 (Jan 2026) - Multi-Admin Support**
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
- [ ] Question media support (images, audio, video)
- [ ] True/False question type
- [ ] Advanced leaderboard and scoring systems
- [ ] Timer-based questions with countdown
- [ ] Team mode for collaborative play
- [ ] Export results to CSV/PDF
- [ ] Email verification for admin accounts
- [ ] Two-Factor Authentication (2FA) for admins
- [ ] Internationalization (i18n)
- [ ] Player statistics dashboard
- [ ] Performance analytics and insights
- [ ] AI-powered question generation
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
