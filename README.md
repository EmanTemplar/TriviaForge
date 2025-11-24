# TriviaForge

A real-time, interactive trivia game platform built with Socket.IO, designed for educators, event organizers, and trivia enthusiasts.

<!-- Screenshot Placeholder: Landing Page -->
![Landing Page](screenshots/landing-page.png?v=202511)

<!-- Screenshot Placeholder: Main Game Interface -->
![TriviaForge Main Interface](screenshots/main-interface.png?v=202511)

## Features

### For Administrators
- **Quiz Management**: Create, edit, and delete custom quizzes with an intuitive interface
- **Excel Import**: Bulk import quizzes from professionally formatted Excel templates (supports 2-10 answer choices)
- **Session Management**: Resume interrupted sessions with full state preservation
- **Real-time Monitoring**: Track active rooms and player participation live
- **User Management**: View and manage all user accounts (guest and registered players)
- **Password Reset**: Reset player passwords and manage account types

<!-- Screenshot Placeholder: Admin Dashboard -->
![Admin Dashboard](screenshots/admin-dashboard.png?v=202511)

### For Presenters
- **Live Quiz Control**: Present questions, reveal answers, and navigate through quizzes in real-time
- **Player Management**: See connected players with live status indicators
- **QR Code Generation**: Quick player join via scannable QR codes
- **Session Resume**: Continue interrupted quizzes exactly where you left off
- **Multi-room Support**: Manage multiple concurrent trivia sessions

<!-- Screenshot Placeholder: Presenter View -->
![Presenter View](screenshots/presenter-view.png?v=202511)

### For Players
- **Mobile-Optimized Interface**: Responsive design that works seamlessly on all devices
- **Real-time Feedback**: Instant answer submission and result display
- **Answer Locking**: Prevents re-answering after submission (even on reconnection)
- **Reconnection Support**: Automatically restore progress when rejoining
- **Progress Tracking**: Visual indicators for answered questions
- **Account System**: Guest accounts with optional registration for persistent profiles
- **Recent Rooms**: Quick rejoin to recently played active rooms
- **Account Management**: Update display names and manage account settings
- **Session Persistence**: Stay logged in for extended periods without re-authentication

<table>
  <tr>
    <td width="33%" align="center">
      <img src="screenshots/player-mobile-waiting.png?v=202511" alt="Player Waiting" width="100%"/>
      <br/>
      <em>Waiting for Question</em>
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

- **Backend**: Node.js, Express.js, Socket.IO
- **Database**: PostgreSQL 15 (fully normalized schema)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Excel Processing**: ExcelJS, XLSX, Multer
- **Real-time Communication**: WebSocket (via Socket.IO)
- **Containerization**: Docker, Docker Compose

## Installation

### Prerequisites
- **Docker** and **Docker Compose** (recommended)
  - OR Node.js (v20 or higher) + PostgreSQL 15

### Quick Start with Docker (Recommended)

**Choose your preferred setup method:**

#### Option A: Docker Desktop UI (Easiest for Beginners)

1. **Clone the repository**
   ```bash
   git clone git@github.com:EmanTemplar/TriviaForge.git
   cd TriviaForge
   ```

2. **Open Docker Desktop**
   - Navigate to the directory containing `docker-compose.yml` or import the project

3. **Configure environment variables via Docker Desktop UI**

   Before starting, set these environment variables in Docker Desktop:
   - Click on the `triviagame-app` service configuration
   - Go to the **Environment** or **Configuration** tab
   - Add/edit these variables:

   | Variable | Recommended Value | Required |
   |----------|------------------|----------|
   | `ADMIN_PASSWORD` | `your_secure_password_here` | **Yes** |
   | `SERVER_URL` | `http://YOUR_IP:3000` | **Yes** |
   | `HOST_IP` | `YOUR_IP_ADDRESS` | Optional |
   | `TZ` | `America/New_York` | Optional |

   Find your IP address:
   - **Windows**: Run `ipconfig` in Command Prompt
   - **Mac/Linux**: Run `ifconfig` or `ip addr` in Terminal

4. **Start the containers**
   - Click the **Start** or **Play** button in Docker Desktop
   - Wait 30-60 seconds for database initialization to complete
   - Check the logs to confirm successful startup

5. **Access the application**
   - Admin Panel: `http://localhost:3000/index.html`
   - Use the ADMIN_PASSWORD you set in step 3

#### Option B: Command Line with .env File

1. **Clone the repository**
   ```bash
   git clone git@github.com:EmanTemplar/TriviaForge.git
   cd TriviaForge
   ```

2. **Create and configure .env file**

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file with your configuration:
   ```env
   # Required Settings
   ADMIN_PASSWORD=your_secure_password_here
   SERVER_URL=http://192.168.1.100:3000  # Use your actual IP

   # Optional Settings (defaults shown)
   APP_PORT=3000
   NODE_ENV=production
   TZ=America/New_York
   SESSION_TIMEOUT=3600000
   APP_NAME=TriviaForge
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

   The database schema will be automatically initialized on first run (takes 30-60 seconds).

4. **Verify startup**
   ```bash
   docker-compose logs -f app
   ```
   Wait for the message: `Server running on port 3000`

5. **Access the application**
   - Admin Panel: `http://localhost:3000/index.html`
   - Presenter: `http://localhost:3000/presenter.html`
   - Player: `http://localhost:3000/player.html`
   - Display: `http://localhost:3000/display.html`

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

## File Structure

```
TriviaForge/
├── app/
│   ├── public/           # Frontend files
│   │   ├── index.html    # Admin panel
│   │   ├── landing.html  # Landing page
│   │   ├── presenter.html # Presenter interface
│   │   ├── player.html   # Player interface
│   │   ├── player-manage.html # Player account management
│   │   ├── display.html  # Spectator/display view
│   │   ├── styles.css    # Shared styles
│   │   └── *.js          # Client-side scripts
│   ├── init/             # Database initialization
│   │   ├── tables.sql    # PostgreSQL schema
│   │   ├── migrate_timestamps.sql # Timezone migration
│   │   └── update-admin-password.sql # Admin password update
│   ├── quizzes/          # Legacy quiz storage (deprecated)
│   ├── sessions/         # Legacy session storage (deprecated)
│   ├── server.js         # Main server application
│   ├── Dockerfile        # Docker container definition
│   └── package.json      # Dependencies
├── docker-compose.yml    # Docker orchestration
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
| `NODE_ENV` | Environment mode | `production` | No |
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
- Automatic session state saving to PostgreSQL database
- Player answer history preservation with transactions
- Reconnection support with progress restoration
- Timestamp tracking for created and resumed sessions (timezone-aware)
- Status indicators (In Progress, Interrupted, Completed)
- Session analytics with participant performance views

### User Management
- Guest accounts created automatically on first join
- Optional registration for persistent accounts
- Password-protected registered player accounts
- Session tokens with configurable timeout (default 1 hour)
- Admin password reset functionality
- Account type management (guest/registered/admin)
- Recent rooms tracking with active session filtering

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

Completed features:
- [x] **User authentication and accounts** (Phase 2 - Nov 2025)
  - Guest and registered player accounts
  - Session persistence with JWT tokens
  - Password reset functionality
  - User management interface
  - Recent rooms with active filtering

Potential future features:
- [ ] Question media support (images, audio)
- [ ] Leaderboard and scoring systems
- [ ] Timer-based questions
- [ ] Team mode
- [ ] Export results to CSV/PDF
- [ ] Swapping Between Dark & Light mode
- [ ] Internationalization
- [ ] Player statistics and performance analytics

## Credits

Built with love for educators, event organizers, and trivia enthusiasts.

### AI Assistance Disclosure

This project was developed with assistance from AI tools, including:
- **Claude Code** - for code generation, debugging, and feature implementation
- **Anthropic's Claude** - for architecture design and problem-solving

While AI tools were instrumental in the development process, all code has been reviewed, tested, and validated for functionality and security. The project architecture, feature decisions, and final implementation remain the responsibility of the human developers.

---

**TriviaForge** - Where Knowledge Meets Fun 🎮
