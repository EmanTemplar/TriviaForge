# TriviaForge Debug System Documentation

**Version:** 1.0.0
**Last Updated:** December 6, 2025
**Status:** Development Tool Only

---

## ⚠️ Important Security Notice

**DO NOT ENABLE DEBUG MODE IN PRODUCTION!**

The debug system provides unrestricted access to system internals, including:
- Creating/deleting rooms without authentication
- Manipulating player data
- Viewing all active sessions
- Direct database access for test users

**This is intended for development and testing only.**

---

## 🎯 Purpose

The TriviaForge Debug System is designed to:

1. **Speed up development** - Test features without manual UI interaction
2. **Automate testing** - Run complete quiz scenarios with one click
3. **Debug issues** - Inspect live room state and player data
4. **Isolate bugs** - Test specific operations independently

---

## 🚀 Getting Started

### Enable Debug Mode

Add one of the following to your `.env` file:

```env
# Option 1: Set NODE_ENV to development
NODE_ENV=development

# Option 2: Use DEBUG_MODE flag
DEBUG_MODE=true
```

### Start the Server

```bash
# With Docker
docker-compose up

# Without Docker
cd app
npm start
```

### Access the Debug Console

Open your browser and navigate to:

```
http://localhost:3000/debug
```

You should see the **TriviaForge Debug Console** interface.

---

## 🖥️ Debug Console Interface

The debug console provides a visual interface for all debug operations:

### System State Dashboard
- **Live Rooms** - Number of active game rooms
- **Total Players** - Count of connected players across all rooms
- **Server Uptime** - How long the server has been running
- **Memory Usage** - Current heap memory in MB
- **Room List** - Detailed view of each active room

### Available Operations

#### 1. 🎮 Create Test Room
Creates a new game room with a quiz loaded and ready.

**Inputs:**
- Quiz ID (optional) - Specific quiz to load, or leave empty for first available
- Room Code (optional) - Custom code, or auto-generate

**Example:**
```
Quiz ID: [empty]
Room Code: TEST01
```

#### 2. 👤 Add Test Player
Adds a simulated player to an existing room.

**Inputs:**
- Room Code - Target room
- Username - Player's account username
- Display Name - Name shown in game
- Is Spectator - Checkbox for spectator mode

**Example:**
```
Room Code: TEST01
Username: testPlayer1
Display Name: Test Player 1
Is Spectator: ☐
```

#### 3. ❓ Present Question
Presents a specific question to all players in a room.

**Inputs:**
- Room Code
- Question Index (0-based)

**Example:**
```
Room Code: TEST01
Question Index: 0
```

#### 4. ✅ Submit Answer
Simulates a player submitting an answer.

**Inputs:**
- Room Code
- Player Username
- Choice Index (0-based)

**Example:**
```
Room Code: TEST01
Player Username: testPlayer1
Choice Index: 2
```

#### 5. 🔓 Reveal Answer
Reveals the correct answer and shows results.

**Inputs:**
- Room Code

**Example:**
```
Room Code: TEST01
```

#### 6. 🔍 Inspect Room
Shows detailed information about a room's state.

**Inputs:**
- Room Code

**Returns:**
- Quiz data
- Player list with answers
- Current question state
- Presented/revealed question history

#### 7. 🤖 Automated Scenarios
Runs complete test scenarios automatically.

**Available Scenarios:**
- **Basic Quiz Flow** - Creates room → adds players → presents question → submits answers → reveals

#### 8. 🧹 Cleanup
Removes test data from the system.

**Options:**
- Delete All Rooms - Removes all live rooms
- Delete Test Users - Removes users with 'test' or 'debug' prefix
- Delete Everything - Both of the above

---

## 📡 Debug API Endpoints

All endpoints are prefixed with `/api/debug/` and only available when debug mode is enabled.

### GET /api/debug/state

Returns complete system state.

**Response:**
```json
{
  "liveRooms": [
    {
      "roomCode": "TEST01",
      "quizTitle": "Sample Quiz",
      "players": [...],
      "currentQuestionIndex": 0,
      "presentedQuestions": [0],
      "revealedQuestions": []
    }
  ],
  "totalRooms": 1,
  "totalPlayers": 3,
  "serverUptime": 1234.56,
  "memoryUsage": {...}
}
```

### GET /api/debug/room/:roomCode

Returns detailed information about a specific room.

**Response:**
```json
{
  "roomCode": "TEST01",
  "quizData": {
    "id": 1,
    "title": "Sample Quiz",
    "totalQuestions": 10
  },
  "players": [
    {
      "socketId": "debug_testPlayer1_1234",
      "username": "testPlayer1",
      "displayName": "Test Player 1",
      "connected": true,
      "currentChoice": 2,
      "answers": { "0": 2 }
    }
  ],
  "currentQuestionIndex": 0,
  "presentedQuestions": [0],
  "revealedQuestions": []
}
```

### POST /api/debug/create-test-room

Creates a new test room.

**Request:**
```json
{
  "quizId": 1,           // optional
  "roomCode": "TEST01"   // optional
}
```

**Response:**
```json
{
  "success": true,
  "roomCode": "TEST01",
  "quizTitle": "Sample Quiz",
  "questionsCount": 10,
  "message": "Test room TEST01 created successfully"
}
```

### POST /api/debug/add-test-player

Adds a test player to a room.

**Request:**
```json
{
  "roomCode": "TEST01",
  "username": "testPlayer1",
  "displayName": "Test Player 1",
  "isSpectator": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test player testPlayer1 added to room TEST01",
  "socketId": "debug_testPlayer1_1733520000000",
  "playersCount": 1
}
```

### POST /api/debug/submit-answer

Submits an answer for a test player.

**Request:**
```json
{
  "roomCode": "TEST01",
  "username": "testPlayer1",
  "choice": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "Answer 2 submitted for player testPlayer1",
  "questionIndex": 0,
  "choice": 2
}
```

### POST /api/debug/present-question

Presents a question to all players.

**Request:**
```json
{
  "roomCode": "TEST01",
  "questionIndex": 0
}
```

**Response:**
```json
{
  "success": true,
  "message": "Question 0 presented",
  "questionIndex": 0,
  "questionText": "What is 2 + 2?",
  "choices": ["1", "2", "3", "4"]
}
```

### POST /api/debug/reveal-answer

Reveals the answer for the current question.

**Request:**
```json
{
  "roomCode": "TEST01"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Answer revealed for question 0",
  "questionIndex": 0,
  "correctChoice": 3,
  "results": [
    {
      "username": "testPlayer1",
      "displayName": "Test Player 1",
      "choice": 2,
      "isCorrect": false
    }
  ]
}
```

### POST /api/debug/cleanup

Cleans up test data.

**Request:**
```json
{
  "deleteRooms": true,
  "deleteTestUsers": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cleanup completed",
  "roomsDeleted": 5,
  "usersDeleted": 12
}
```

### POST /api/debug/run-test-scenario

Runs an automated test scenario.

**Request:**
```json
{
  "scenario": "basic-quiz-flow"
}
```

**Response:**
```json
{
  "steps": [
    { "step": "create-room", "roomCode": "TESTABCD", "success": true },
    { "step": "add-players", "count": 3, "success": true },
    { "step": "present-question", "questionIndex": 0, "success": true },
    { "step": "submit-answers", "count": 3, "success": true },
    { "step": "reveal-answer", "correctAnswers": 2, "totalPlayers": 3, "success": true }
  ],
  "roomCode": "TESTABCD",
  "message": "Basic quiz flow test completed successfully",
  "success": true
}
```

---

## 🧪 Testing Workflows

### Quick Test: Single Question Flow

1. Create a test room
2. Add 2-3 test players
3. Present question 0
4. Submit different answers for each player
5. Reveal answer
6. Inspect room to verify results

### Automated Test: Complete Quiz

1. Click "Basic Quiz Flow" in Automated Scenarios
2. Review the output - should show 5 successful steps
3. Inspect the created room to verify state

### Bug Reproduction Workflow

1. Inspect current system state
2. Create room with specific quiz
3. Add players matching bug scenario
4. Manually trigger the problematic sequence
5. Inspect room state after each step
6. Review player answers and connection states

---

## 🔧 Using with API Clients

### cURL Examples

**Get System State:**
```bash
curl http://localhost:3000/api/debug/state
```

**Create Test Room:**
```bash
curl -X POST http://localhost:3000/api/debug/create-test-room \
  -H "Content-Type: application/json" \
  -d '{"roomCode": "TEST01"}'
```

**Add Test Player:**
```bash
curl -X POST http://localhost:3000/api/debug/add-test-player \
  -H "Content-Type: application/json" \
  -d '{
    "roomCode": "TEST01",
    "username": "testPlayer1",
    "displayName": "Test Player 1"
  }'
```

### JavaScript/Fetch Examples

```javascript
// Get system state
const state = await fetch('/api/debug/state').then(r => r.json());

// Create test room
const room = await fetch('/api/debug/create-test-room', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ roomCode: 'TEST01' })
}).then(r => r.json());

// Add player
const player = await fetch('/api/debug/add-test-player', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roomCode: 'TEST01',
    username: 'testPlayer1',
    displayName: 'Test Player 1'
  })
}).then(r => r.json());
```

---

## 📝 Common Use Cases

### Test Answer Locking
```
1. Create room
2. Add player
3. Present question
4. Submit answer
5. Try to submit different answer (should fail in real UI)
6. Inspect room - verify only first answer is recorded
```

### Test Reconnection
```
1. Create room with resumed session flag
2. Add players with existing answers
3. Verify answer history is preserved
4. Inspect room state
```

### Test Spectator Filtering
```
1. Create room
2. Add normal players
3. Add spectator (isSpectator: true)
4. Present question
5. Reveal answer
6. Verify spectator excluded from results
```

### Test Multi-Question Flow
```
1. Create room
2. Add players
3. Loop through questions 0-4:
   - Present question
   - Submit answers for each player
   - Reveal answer
4. Inspect final state
```

---

## 🐛 Troubleshooting

### Debug Mode Not Enabling

**Check:**
- `.env` file has `NODE_ENV=development` or `DEBUG_MODE=true`
- Server was restarted after changing `.env`
- Console logs show "🐛 Debug mode ENABLED"

### Debug Console Not Loading

**Check:**
- Navigate to exactly `http://localhost:3000/debug`
- Check browser console for errors
- Verify `debug.html` exists in `app/` directory

### API Endpoints Return 404

**Check:**
- Debug mode is enabled (see console logs)
- URL is correct: `/api/debug/state` not `/debug/state`
- Server is running on expected port

### Room Not Found Errors

**Check:**
- Room code is exactly correct (case-sensitive)
- Room still exists (use /api/debug/state to verify)
- Room wasn't auto-deleted

### Test Users Persist After Cleanup

**Check:**
- Used correct cleanup flags: `{ deleteTestUsers: true }`
- Users start with 'test' or 'debug' prefix
- Database connection is working

---

## 📊 Performance Considerations

- Debug mode adds minimal overhead (~0.1% CPU)
- Debug endpoints are fast (< 10ms response time)
- System state endpoint may be slow with 100+ rooms
- Automated scenarios create real database entries
- Cleanup removes data permanently

---

## 🔒 Security Best Practices

1. **Never enable in production**
   - Always set `NODE_ENV=production` for deployed instances

2. **Use on localhost only**
   - Don't expose port 3000 to public internet with debug enabled

3. **Clean up test data**
   - Run cleanup before disabling debug mode

4. **Don't commit .env files**
   - Keep debug configuration local

---

## 🎓 Tips & Tricks

### Quick Room Creation
Leave quiz ID and room code empty for fastest room creation.

### Rapid Testing
Use the automated scenario feature to create complete test environments instantly.

### State Inspection
The state endpoint auto-refreshes every 10 seconds in the debug console.

### Player Naming Convention
Use `testPlayer1`, `testPlayer2`, etc. for easy cleanup later.

### Spectator Testing
Add a spectator with username "Display" or display name "Spectator Display".

---

## 📚 Related Documentation

- [README.md](README.md) - User-facing documentation
- [TODO.md](TODO.md) - Feature roadmap
- [DEV-SUMMARY.md](DEV-SUMMARY.md) - Developer onboarding (internal)
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines

---

## 🆘 Support

If you encounter issues with the debug system:

1. Check this documentation first
2. Review console logs for errors
3. Verify debug mode is enabled
4. Try restarting the server
5. Report persistent issues on GitHub

---

**Happy Debugging! 🐛**
