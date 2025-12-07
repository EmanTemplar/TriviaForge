# TriviaForge Debug CLI

**Console-based debugging tool for rapid testing and diagnostics**

## Quick Start

```bash
# Install dependencies (if not already done)
cd app
npm install

# Run a command
npm run debug status
# OR
node debug-cli.js status
```

## Commands

### 📊 System Status
```bash
npm run debug:status
# OR
node debug-cli.js status
```
Shows live system state:
- Number of active rooms
- Total players
- Server uptime
- Memory usage
- List of all rooms with details

### 🏥 Health Check
```bash
npm run debug:health
# OR
node debug-cli.js health
```
Quick system health check (exits with code 0 if healthy)
Perfect for monitoring scripts and CI/CD

### 🔍 Inspect Room
```bash
node debug-cli.js room ABC123
```
Detailed view of specific room:
- Quiz information
- Current question
- All players with connection status
- Answer history

### 🎮 Create Test Room
```bash
# Auto-generate room code
node debug-cli.js create-room

# Custom room code
node debug-cli.js create-room TEST01
```
Creates a room with first available quiz

### 👤 Add Test Player
```bash
node debug-cli.js add-player <ROOM> <USERNAME>
```
Example:
```bash
node debug-cli.js add-player TEST01 testPlayer1
```

### 🤖 Run Automated Test
```bash
npm run debug:test
# OR
node debug-cli.js test-flow
```
Runs complete quiz flow:
1. Creates room
2. Adds 3 players
3. Presents question
4. Submits random answers
5. Reveals answer

### 🧹 Cleanup
```bash
node debug-cli.js cleanup
```
Deletes all test data (rooms + test users)

## Quick Workflows

### Check if System is Healthy
```bash
npm run debug:health
echo $?  # Should output 0 if healthy
```

### Create & Test Complete Flow
```bash
# Run automated test
npm run debug:test

# Get the room code from output, then inspect it
node debug-cli.js room TESTABCD

# Clean up when done
node debug-cli.js cleanup
```

### Debug Specific Issue
```bash
# 1. Check current state
npm run debug:status

# 2. Create test environment
node debug-cli.js create-room TEST01
node debug-cli.js add-player TEST01 player1
node debug-cli.js add-player TEST01 player2

# 3. Inspect room
node debug-cli.js room TEST01

# 4. Clean up
node debug-cli.js cleanup
```

### Monitor System
```bash
# Watch system status (refresh every 5 seconds)
watch -n 5 "npm run debug:status"

# Or on Windows with PowerShell:
while($true) { npm run debug:status; sleep 5; clear }
```

## Output Colors

- ✅ **Green** - Success
- ❌ **Red** - Error
- ⚠️  **Yellow** - Warning
- ℹ️  **Cyan** - Info
- 🎮 **Blue** - Headings

## Environment Variables

```bash
# Change debug API URL (default: http://localhost:3000/api/debug)
export DEBUG_API_URL=http://192.168.1.100:3000/api/debug
node debug-cli.js status
```

## Requirements

- Node.js (already installed if running TriviaForge)
- Server must be running with debug mode enabled
- `NODE_ENV=development` or `DEBUG_MODE=true` in `.env`

## Integration with CI/CD

```bash
#!/bin/bash
# health-check.sh

# Start server in background
docker-compose up -d

# Wait for server to start
sleep 5

# Run health check
cd app
npm run debug:health

# Capture exit code
HEALTH=$?

# Stop server
docker-compose down

# Exit with health check result
exit $HEALTH
```

## Comparison: CLI vs Web Interface

| Feature | CLI Tool | Web Interface |
|---------|----------|---------------|
| Speed | ⚡ Instant | Fast |
| Scripting | ✅ Yes | ❌ No |
| Automation | ✅ Easy | ❌ Manual |
| Visual | ❌ Text only | ✅ Beautiful UI |
| Monitoring | ✅ Easy with `watch` | ✅ Auto-refresh |
| Best For | Quick checks, CI/CD | Detailed inspection |

## Tips

1. **Alias for quick access:**
   ```bash
   alias trivia-debug='cd /path/to/app && node debug-cli.js'
   trivia-debug status
   ```

2. **Pipe to file for logging:**
   ```bash
   npm run debug:status > status.log
   ```

3. **Use in scripts:**
   ```javascript
   const { execSync } = require('child_process');
   const status = execSync('node debug-cli.js status');
   console.log(status.toString());
   ```

4. **Combine commands:**
   ```bash
   node debug-cli.js test-flow && node debug-cli.js status
   ```

## Troubleshooting

**"Cannot connect to server"**
- Ensure server is running: `docker-compose ps`
- Check debug mode is enabled in `.env`
- Verify port 3000 is accessible

**"Unknown command"**
- Run `node debug-cli.js help` to see all commands
- Check spelling and syntax

**"Room not found"**
- Verify room code is correct (case-sensitive)
- Check room exists: `npm run debug:status`

## See Also

- [DEBUG.md](DEBUG.md) - Full API documentation
- [DEBUGGING-QUICKSTART.md](DEBUGGING-QUICKSTART.md) - Web interface guide
- [DEV-SUMMARY.md](DEV-SUMMARY.md) - Development overview
