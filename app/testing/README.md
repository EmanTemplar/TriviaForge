# TriviaForge Testing Suite

Automated testing framework for TriviaForge trivia application.

## 📁 Directory Structure

```
testing/
├── README.md                    # This file
├── TESTING.md                   # Complete testing guide and documentation
├── test-runner.js              # Main automated test runner
├── stress-test.config.js       # Stress test scenario configurations
└── logs/                       # Test execution logs (future)
```

## 🚀 Quick Start

### From Project Root

```bash
# Windows
test.bat quick              # Fast test (3 players)
test.bat session            # Default test (5 players)
test.bat stress             # Stress test (20 players)

# Linux/Mac
./test.sh quick
./test.sh session
./test.sh stress
```

### From Docker Container

```bash
# Enter container
docker-compose exec app sh

# Run tests
npm run test:quick
npm run test:session
npm run test:stress
npm run test:verbose
```

### Custom Test Scenarios

```bash
# From container
TEST_PLAYERS=30 TEST_QUESTIONS=10 node testing/test-runner.js

# Or use environment variables
TEST_PLAYERS=15 npm run test:session
```

## 📊 Available Test Scenarios

Defined in [stress-test.config.js](stress-test.config.js):

| Scenario | Players | Questions | Duration | Use Case |
|----------|---------|-----------|----------|----------|
| `quick` | 3 | 2 | ~10s | Fast development iteration |
| `light` | 5 | 3 | ~25s | Small group testing |
| `medium` | 15 | 5 | ~45s | Average party/event |
| `heavy` | 25 | 10 | ~2min | Large event (like Metrica) |
| `extreme` | 50 | 10 | ~3min | Maximum capacity test |
| `marathon` | 10 | 50 | ~10min | Full quiz validation |
| `debug` | 5 | 3 | ~25s | Detailed logging |
| `chaos` | 20 | 5 | ~1min | Connection stability test |

## 🛠️ Configuration

### Environment Variables

```bash
TEST_SERVER_URL=http://localhost:3000    # Server URL
TEST_QUIZ_ID=1                           # Quiz to test with
TEST_PLAYERS=5                           # Number of players
TEST_ANSWER_DELAY=2000                   # Max delay between answers (ms)
TEST_QUESTION_DELAY=5000                 # Delay between questions (ms)
TEST_DISCONNECTS=false                   # Simulate disconnections
TEST_VERBOSE=false                       # Detailed logging
```

### Adding New Scenarios

Edit [stress-test.config.js](stress-test.config.js):

```javascript
export const stressTestScenarios = {
  myCustomTest: {
    name: 'My Custom Test',
    players: 20,
    questions: 5,
    answerDelay: 2000,
    questionDelay: 5000,
    disconnects: false,
    verbose: false,
    description: 'Testing my new feature'
  }
};
```

## 📈 Scaling Guidelines

1. **Development**: Use `quick` test for rapid iteration
2. **Feature Testing**: Create custom scenario in `stress-test.config.js`
3. **Pre-Deployment**: Run `medium` and `heavy` tests
4. **Production Validation**: Run `extreme` before major events
5. **Debugging**: Use `debug` scenario for detailed logs

## 🔍 Test Components

### test-runner.js

Main test orchestrator that:
- Creates test rooms via debug API
- Simulates multiple players joining
- Presents questions and collects answers
- Validates results
- Cleans up test data

### stress-test.config.js

Centralized configuration for:
- Predefined test scenarios
- Feature-specific test templates
- Custom scenario builder
- Scaling recommendations

## 📚 Documentation

See [TESTING.md](TESTING.md) for:
- Detailed usage instructions
- Troubleshooting guide
- Understanding test output
- Advanced usage examples
- CI/CD integration

## 🎯 Adding Tests for New Features

When you add a new feature:

1. **Define a test scenario** in `stress-test.config.js`:
   ```javascript
   featureTests: {
     myNewFeature: {
       name: 'My New Feature Test',
       players: 10,
       questions: 5,
       // ... configuration
     }
   }
   ```

2. **Update test-runner.js** if needed for feature-specific testing

3. **Document the test** in TESTING.md

4. **Add to CI/CD pipeline** if applicable

## 🐛 Debugging Tests

Enable verbose mode:

```bash
TEST_VERBOSE=true npm run test:session
```

Check server logs:

```bash
docker-compose logs -f app
```

Inspect database state:

```bash
docker-compose exec db psql -U trivia -d trivia
```

## ✅ Pre-Deployment Checklist

- [ ] Run `quick` test to validate basic functionality
- [ ] Run `light` test for typical use case
- [ ] Run `heavy` test to simulate your target audience size
- [ ] Run `extreme` test to validate capacity limits
- [ ] Check logs for warnings or errors
- [ ] Validate database connection pooling

---

**Happy Testing!** 🚀

For questions or issues, see the main [README.md](../../README.md)
