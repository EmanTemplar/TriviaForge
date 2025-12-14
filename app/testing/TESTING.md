# TriviaForge Testing Guide

Complete guide for testing TriviaForge using the automated testing framework.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Test Scenarios](#test-scenarios)
3. [Configuration](#configuration)
4. [Understanding Test Output](#understanding-test-output)
5. [Troubleshooting](#troubleshooting)
6. [Advanced Usage](#advanced-usage)

---

## 🚀 Quick Start

### Prerequisites

1. **Docker container must be running:**
   ```bash
   docker-compose up -d
   ```

2. **Enable debug mode** in `.env`:
   ```env
   NODE_ENV=development
   DEBUG_MODE=true
   ```

3. **Restart the app** after changing .env:
   ```bash
   docker-compose restart app
   ```

### Run Your First Test

```bash
# Enter the app container
docker-compose exec app sh

# Run default test (5 players, 3 questions)
npm run test:session
```

That's it! You'll see:
- ✓ Room creation
- ✓ Players joining
- ✓ Questions presented
- ✓ Answers submitted
- ✓ Results revealed
- ✓ Test summary

---

## 🎯 Test Scenarios

### Default Session Test
**Command:** `npm run test:session`

Simulates a realistic trivia session with 5 players answering 3 questions.

**What it tests:**
- Room creation
- Player joins
- Question presentation
- Answer submission
- Answer reveal
- Result calculation

**Duration:** ~20-30 seconds

---

### Stress Test
**Command:** `npm run test:stress`

Simulates a high-load scenario with 20 players.

**What it tests:**
- Concurrent player joins
- Database connection pooling
- Socket.IO scalability
- Server performance under load

**Duration:** ~45-60 seconds

---

### Quick Test
**Command:** `npm run test:quick`

Fast test with 3 players and reduced delays.

**What it tests:**
- Basic functionality
- Rapid iteration during development

**Duration:** ~10 seconds

---

### Verbose Test
**Command:** `npm run test:verbose`

Same as default but with detailed logging.

**What it shows:**
- Individual player answers
- Timing information
- API request/response details
- Error stack traces

**Duration:** ~20-30 seconds

---

## ⚙️ Configuration

### Environment Variables

All tests can be customized using environment variables:

```bash
# Server Configuration
TEST_SERVER_URL=http://localhost:3000    # Server URL

# Test Scenario
TEST_QUIZ_ID=1                          # Which quiz to use
TEST_PLAYERS=5                          # Number of simulated players

# Timing
TEST_ANSWER_DELAY=2000                  # Max delay between answers (ms)
TEST_QUESTION_DELAY=5000                # Delay between questions (ms)

# Features
TEST_DISCONNECTS=false                  # Simulate player disconnections
TEST_VERBOSE=false                      # Verbose logging

# Example: Custom test
TEST_PLAYERS=10 TEST_VERBOSE=true npm run test:session
```

---

### Custom Test Scenarios

Create custom test runs by combining environment variables:

```bash
# Large session with 15 players
TEST_PLAYERS=15 npm run test:session

# Quick development test
TEST_PLAYERS=3 TEST_QUESTION_DELAY=1000 npm run test:session

# Stress test with verbose logging
TEST_PLAYERS=30 TEST_VERBOSE=true npm run test:stress

# Test specific quiz
TEST_QUIZ_ID=2 npm run test:session
```

---

## 📊 Understanding Test Output

### Sample Output

```
============================================================
  TriviaForge Automated Test Runner
============================================================
Configuration:
  Server: http://localhost:3000
  Quiz ID: 1
  Players: 5
  Answer Delay: 2000ms
  Question Delay: 5000ms

============================================================
  Pre-Flight Checks
============================================================
✓ Debug API is accessible
ℹ Server has 0 active rooms
ℹ Database pool: 10 total, 8 idle

============================================================
  Room Creation
============================================================
✓ Created test room: ABCD
ℹ Quiz: Christmas Party Trivia (10 questions)

============================================================
  Adding 5 Players
============================================================
✓ Added player: Test_Alpha0
✓ Added player: Player_Beta1
✓ Added player: User_Gamma2
✓ Added player: Demo_Delta3
✓ Added player: Test_Epsilon4
ℹ Total players added: 5/5

============================================================
  Question 1
============================================================
✓ Presented question 1
ℹ Question: What is the capital of France?
ℹ Choices: 4
✓ All players submitted answers
✓ Revealed answer for question 1
ℹ Results: 4/5 correct (80.0% accuracy)

[... more questions ...]

============================================================
  Final State
============================================================
✓ Session completed successfully
ℹ Questions presented: 3
ℹ Questions revealed: 3
ℹ Total players: 5

============================================================
  Cleanup
============================================================
✓ Cleaned up test data

============================================================
  Test Summary
============================================================
Duration: 23.5s
Room Code: ABCD

Results:
  Passed: 15
  Failed: 0
  Success Rate: 100.0%

============================================================
  ALL TESTS PASSED! ✓
============================================================
```

### Color Coding

- **Green (✓):** Success
- **Red (✗):** Failure
- **Blue (ℹ):** Information
- **Yellow (⚠):** Warning
- **Cyan:** Section headers

---

## 🔧 Troubleshooting

### Debug API Not Accessible

**Error:**
```
✗ Debug API is not accessible
⚠ Make sure the server is running with DEBUG_MODE=true or NODE_ENV=development
```

**Solution:**
1. Check `.env` file has `NODE_ENV=development`
2. Restart the app: `docker-compose restart app`
3. Verify server is running: `docker-compose logs app`

---

### Connection Refused

**Error:**
```
FATAL ERROR
connect ECONNREFUSED 127.0.0.1:3000
```

**Solution:**
1. Make sure Docker containers are running:
   ```bash
   docker-compose ps
   ```

2. If not running, start them:
   ```bash
   docker-compose up -d
   ```

3. Check logs for errors:
   ```bash
   docker-compose logs app
   ```

---

### No Quizzes Available

**Error:**
```
✗ Failed to create test room
  Error: Quiz not found
```

**Solution:**
1. Make sure quiz ID exists in database
2. Create a quiz using the Admin panel
3. Or specify different quiz ID:
   ```bash
   TEST_QUIZ_ID=1 npm run test:session
   ```

---

### Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
1. Stop any running instances:
   ```bash
   docker-compose down
   ```

2. Restart:
   ```bash
   docker-compose up -d
   ```

---

## 🎓 Advanced Usage

### Running Tests from Outside Container

If you have Node.js installed locally:

```bash
# From project root
cd app
TEST_SERVER_URL=http://localhost:3000 node test-runner.js
```

### Continuous Testing During Development

Use `watch` mode to re-run tests on code changes:

```bash
# Install nodemon (one-time)
npm install -g nodemon

# Watch for changes and re-run tests
nodemon --watch server.js --exec "npm run test:quick"
```

### Automated CI/CD Integration

Add to your CI/CD pipeline (e.g., GitHub Actions):

```yaml
- name: Run Integration Tests
  run: |
    docker-compose up -d
    docker-compose exec -T app npm run test:session
```

### Custom Test Scenarios

Create your own test scripts by copying `test-runner.js`:

```javascript
// custom-test.js
const config = {
  baseUrl: 'http://localhost:3000',
  quizId: 1,
  numPlayers: 10,
  // ... your custom configuration
};

// Add your custom test logic
```

---

## 📈 Performance Benchmarks

Expected test durations on standard hardware:

| Test Type | Players | Questions | Duration |
|-----------|---------|-----------|----------|
| Quick | 3 | 3 | ~10s |
| Default | 5 | 3 | ~25s |
| Stress | 20 | 3 | ~60s |
| Full Quiz | 5 | 10 | ~80s |

---

## 🐛 Debugging Failed Tests

### Enable Verbose Mode

```bash
TEST_VERBOSE=true npm run test:session
```

This will show:
- Individual player actions
- API request/response bodies
- Full error stack traces
- Timing information

### Check Server Logs

```bash
docker-compose logs -f app
```

Look for:
- Error messages
- Socket.IO connection issues
- Database errors
- Debug API calls

### Inspect Database State

```bash
docker-compose exec db psql -U triviauser -d triviadb -c "SELECT * FROM sessions ORDER BY created_at DESC LIMIT 5;"
```

---

## 🎉 Next Steps

Once you're comfortable with basic testing:

1. **Create custom test scenarios** for your specific use cases
2. **Integrate tests into CI/CD** for automated testing
3. **Monitor performance** metrics during tests
4. **Test edge cases** like network failures and disconnections

---

## 📚 Additional Resources

- [DEV-SUMMARY.md](DEV-SUMMARY.md) - Development documentation
- [README.md](README.md) - Project overview
- [DEBUG-USER-MANAGEMENT.md](DEBUG-USER-MANAGEMENT.md) - Debug tools guide

---

## ❓ Getting Help

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review server logs: `docker-compose logs app`
3. Verify `.env` configuration
4. Check database connectivity
5. Create an issue on GitHub (if applicable)

---

**Happy Testing!** 🚀
