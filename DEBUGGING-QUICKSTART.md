# Debug System Quick Start Guide

> **⚡ Fast track to testing TriviaForge without clicking through the UI**

## Enable Debug Mode (30 seconds)

1. Open `.env` file in the root directory
2. Change this line:
   ```env
   NODE_ENV=production
   ```
   To:
   ```env
   NODE_ENV=development
   ```
3. Restart the server:
   ```bash
   docker-compose restart
   # OR
   npm start
   ```
4. Install dependencies (if not already done):
   ```bash
   cd app && npm install
   ```

## Two Ways to Debug

### Option 1: Console/CLI (⚡ Fastest)

**Perfect for:** Quick checks, automation, scripting

```bash
# Check system status
npm run debug:status

# Run health check
npm run debug:health

# Run automated test
npm run debug:test

# See all commands
node debug-cli.js help
```

### Option 2: Web Interface (👁️ Visual)

**Perfect for:** Detailed inspection, interactive testing

Open browser: **http://localhost:3000/debug**

## Quick Actions

### Console (CLI)

```bash
# Full quiz test (1 command)
npm run debug:test

# Check system status
npm run debug:status

# Inspect a room
node debug-cli.js room ABC123

# Clean up test data
node debug-cli.js cleanup

# Health check
npm run debug:health
```

### Web Interface

1. **Full Quiz Test (1 click):**
   - Click **"▶️ Basic Quiz Flow"** under Automated Scenarios
   - Done! You now have a room with 3 players, 1 answered question

2. **Manual Test Flow:**
   - **Create Test Room** → [Create Room]
   - **Add Test Player** → Enter room code + username → [Add Player]
   - **Present Question** → Enter room code + "0" → [Present Question]
   - **Submit Answer** → Enter room code + username + "1" → [Submit Answer]
   - **Reveal Answer** → Enter room code → [Reveal Answer]

3. **Inspect Any Room:**
   - Copy room code from System State
   - Enter in **Inspect Room**
   - See all players, answers, and state

4. **Clean Up:**
   - Click **"Delete Everything"** in Cleanup section

## Comparison: CLI vs Web

| Use Case | Best Tool |
|----------|-----------|
| Quick system check | ✅ CLI: `npm run debug:status` |
| Automated testing | ✅ CLI: `npm run debug:test` |
| Detailed inspection | ✅ Web Interface |
| CI/CD integration | ✅ CLI: `npm run debug:health` |
| Visual exploration | ✅ Web Interface |
| Scripting | ✅ CLI |

## Learn More

- **CLI Tool:** See [DEBUG-CLI.md](DEBUG-CLI.md) for all CLI commands
- **Web Interface:** See [DEBUG.md](DEBUG.md) for API reference
- **Development:** See [DEV-SUMMARY.md](DEV-SUMMARY.md) for project overview

## Remember

- 🔒 **Never enable in production** (always set NODE_ENV=production before deploying)
- 🧹 **Clean up test data** before switching back to production mode
- 📚 **Full documentation** available in the files above

---

**That's it! Happy testing! 🚀**
