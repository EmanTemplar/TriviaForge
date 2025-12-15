#!/usr/bin/env node

/**
 * TriviaForge Automated Test Runner
 *
 * Simple, powerful testing framework for simulating real trivia sessions
 *
 * Usage:
 *   npm run test:session           # Run default test scenario
 *   npm run test:stress            # Run stress test with many players
 *   node test-runner.js --help     # Show all options
 *
 * Requirements:
 *   - Docker container must be running with DEBUG_MODE=true
 *   - Server must be accessible at http://localhost:3000
 */

import http from 'http';

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Test configuration
const config = {
  baseUrl: process.env.TEST_SERVER_URL || 'http://localhost:3000',
  quizId: parseInt(process.env.TEST_QUIZ_ID) || 1,
  numPlayers: parseInt(process.env.TEST_PLAYERS) || 5,
  answerDelay: parseInt(process.env.TEST_ANSWER_DELAY) || 2000, // ms between answers
  questionDelay: parseInt(process.env.TEST_QUESTION_DELAY) || 5000, // ms between questions
  simulateDisconnects: process.env.TEST_DISCONNECTS === 'true',
  verbose: process.env.TEST_VERBOSE === 'true',
};

// Test state
let testResults = {
  passed: 0,
  failed: 0,
  tests: [],
};

// Utility functions
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, colors.green);
  testResults.passed++;
  testResults.tests.push({ status: 'PASS', message });
}

function fail(message, error = null) {
  log(`✗ ${message}`, colors.red);
  if (error && config.verbose) {
    log(`  Error: ${error.message || error}`, colors.dim);
  }
  testResults.failed++;
  testResults.tests.push({ status: 'FAIL', message, error });
}

function info(message) {
  log(`ℹ ${message}`, colors.blue);
}

function warn(message) {
  log(`⚠ ${message}`, colors.yellow);
}

function section(title) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`  ${title}`, colors.bright + colors.cyan);
  log(`${'='.repeat(60)}`, colors.cyan);
}

/**
 * Make HTTP request to debug API
 */
function apiRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, config.baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${result.message || body}`));
          }
        } catch (err) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Wait for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate random player name
 */
function generatePlayerName(index) {
  const prefixes = ['Test', 'Player', 'User', 'Demo'];
  const suffixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
  return `${prefixes[index % prefixes.length]}_${suffixes[Math.floor(index / prefixes.length) % suffixes.length]}${index}`;
}

/**
 * Test: Check if debug API is accessible
 */
async function testDebugApiAccess() {
  section('Pre-Flight Checks');

  try {
    const state = await apiRequest('GET', '/api/debug/state');
    success(`Debug API is accessible`);
    info(`Server has ${state.totalRooms} active rooms`);
    info(`Server uptime: ${Math.floor(state.serverUptime)}s`);
    return true;
  } catch (err) {
    fail('Debug API is not accessible', err);
    warn('Make sure the server is running with DEBUG_MODE=true or NODE_ENV=development');
    warn('Restart with: docker-compose restart app');
    return false;
  }
}

/**
 * Test: Create a test room
 */
async function testCreateRoom() {
  section('Room Creation');

  try {
    const result = await apiRequest('POST', '/api/debug/create-test-room', {
      quizId: config.quizId,
      presenterName: 'TestPresenter',
    });

    success(`Created test room: ${result.roomCode}`);
    info(`Quiz: ${result.quizTitle} (${result.questionsCount} questions)`);
    return result.roomCode;
  } catch (err) {
    fail('Failed to create test room', err);
    throw err;
  }
}

/**
 * Test: Add multiple players to room
 */
async function testAddPlayers(roomCode, numPlayers) {
  section(`Adding ${numPlayers} Players`);

  const players = [];

  for (let i = 0; i < numPlayers; i++) {
    try {
      const playerName = generatePlayerName(i);
      const result = await apiRequest('POST', '/api/debug/add-test-player', {
        roomCode,
        username: playerName.toLowerCase(),
        displayName: playerName,
      });

      players.push(result.player);
      success(`Added player: ${playerName}`);

      // Small delay to simulate real-world joins
      await sleep(200);
    } catch (err) {
      fail(`Failed to add player ${i + 1}`, err);
    }
  }

  info(`Total players added: ${players.length}/${numPlayers}`);
  return players;
}

/**
 * Test: Present question and collect answers
 */
async function testPresentQuestion(roomCode, questionIndex, players) {
  section(`Question ${questionIndex + 1}`);

  try {
    // Present the question
    const presentResult = await apiRequest('POST', '/api/debug/present-question', {
      roomCode,
      questionIndex,
    });

    success(`Presented question ${questionIndex + 1}`);
    info(`Question: ${presentResult.questionText}`);
    info(`Choices: ${presentResult.choices.length}`);

    // Wait for players to "think"
    await sleep(1000);

    // Simulate players answering
    const answerPromises = players.map(async (player, idx) => {
      // Random delay to simulate real answering patterns
      await sleep(Math.random() * config.answerDelay);

      // Choose a random answer (simulate realistic answering patterns)
      const choice = Math.floor(Math.random() * presentResult.choices.length);

      try {
        await apiRequest('POST', '/api/debug/submit-answer', {
          roomCode,
          username: player.username,
          choice,
        });

        if (config.verbose) {
          log(`  ${player.name} answered: ${choice}`, colors.dim);
        }
      } catch (err) {
        if (config.verbose) {
          log(`  ${player.name} failed to answer`, colors.dim + colors.red);
        }
      }
    });

    await Promise.all(answerPromises);
    success(`All players submitted answers`);

    // Wait before revealing
    await sleep(1000);

    // Reveal the answer
    const revealResult = await apiRequest('POST', '/api/debug/reveal-answer', {
      roomCode,
      questionIndex,
    });

    success(`Revealed answer for question ${questionIndex + 1}`);

    const correctCount = revealResult.results.filter(r => r.is_correct).length;
    const totalAnswers = revealResult.results.length;
    const accuracy = ((correctCount / totalAnswers) * 100).toFixed(1);

    info(`Results: ${correctCount}/${totalAnswers} correct (${accuracy}% accuracy)`);

    // Wait between questions
    await sleep(config.questionDelay);

    return { correctCount, totalAnswers, accuracy };
  } catch (err) {
    fail(`Failed to complete question ${questionIndex + 1}`, err);
    throw err;
  }
}

/**
 * Test: Cleanup test data
 */
async function testCleanup(roomCode) {
  section('Cleanup');

  try {
    const result = await apiRequest('POST', '/api/debug/cleanup', {
      roomCode,
      deleteTestUsers: true,
    });

    if (config.verbose) {
      console.log('[DEBUG] Cleanup result:', JSON.stringify(result, null, 2));
    }

    success('Cleaned up test data');

    // Always display cleanup stats
    info(`Deleted ${result.roomsDeleted || 0} room(s)`);
    info(`Deleted ${result.sessionsDeleted || 0} database session(s)`);
    info(`Deleted ${result.usersDeleted || 0} test user(s)`);
  } catch (err) {
    warn('Cleanup failed - you may need to manually clean test data');
    if (config.verbose) {
      log(`  Error: ${err.message}`, colors.dim);
    }
  }
}

/**
 * Display test summary
 */
function displaySummary(startTime, roomCode) {
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  section('Test Summary');

  log(`Duration: ${duration}s`, colors.cyan);
  log(`Room Code: ${roomCode}`, colors.cyan);
  log(`\nResults:`, colors.bright);
  log(`  Passed: ${testResults.passed}`, colors.green);
  log(`  Failed: ${testResults.failed}`, testResults.failed > 0 ? colors.red : colors.green);

  const successRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1);
  log(`  Success Rate: ${successRate}%`, successRate === '100.0' ? colors.green : colors.yellow);

  if (testResults.failed > 0) {
    log(`\n${'='.repeat(60)}`, colors.red);
    log('  FAILED TESTS', colors.bright + colors.red);
    log(`${'='.repeat(60)}`, colors.red);
    testResults.tests.filter(t => t.status === 'FAIL').forEach(test => {
      log(`  ✗ ${test.message}`, colors.red);
      if (test.error && config.verbose) {
        log(`    ${test.error.message || test.error}`, colors.dim);
      }
    });
  }

  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(testResults.failed === 0 ? '  ALL TESTS PASSED! ✓' : '  SOME TESTS FAILED ✗',
      testResults.failed === 0 ? colors.bright + colors.green : colors.bright + colors.red);
  log(`${'='.repeat(60)}`, colors.cyan);

  process.exit(testResults.failed > 0 ? 1 : 0);
}

/**
 * Main test execution
 */
async function runTests() {
  const startTime = Date.now();
  let roomCode = null;

  section('TriviaForge Automated Test Runner');
  log(`Configuration:`, colors.cyan);
  log(`  Server: ${config.baseUrl}`, colors.dim);
  log(`  Quiz ID: ${config.quizId}`, colors.dim);
  log(`  Players: ${config.numPlayers}`, colors.dim);
  log(`  Answer Delay: ${config.answerDelay}ms`, colors.dim);
  log(`  Question Delay: ${config.questionDelay}ms`, colors.dim);

  try {
    // Pre-flight checks
    const apiAccessible = await testDebugApiAccess();
    if (!apiAccessible) {
      throw new Error('Debug API not accessible');
    }

    // Create room
    roomCode = await testCreateRoom();

    // Add players
    const players = await testAddPlayers(roomCode, config.numPlayers);

    if (players.length === 0) {
      throw new Error('No players were added successfully');
    }

    // Get room state to determine number of questions
    const roomState = await apiRequest('GET', `/api/debug/room/${roomCode}`);
    const numQuestions = Math.min(3, roomState.quizData.totalQuestions); // Test first 3 questions

    info(`\nRunning ${numQuestions} questions...`);

    // Run through questions
    for (let i = 0; i < numQuestions; i++) {
      await testPresentQuestion(roomCode, i, players);
    }

    // Final state check
    section('Final State');
    const finalState = await apiRequest('GET', `/api/debug/room/${roomCode}`);
    success(`Session completed successfully`);
    info(`Questions presented: ${finalState.presentedQuestions.length}`);
    info(`Questions revealed: ${finalState.revealedQuestions.length}`);
    info(`Total players: ${finalState.players.length}`);

  } catch (err) {
    fail('Test suite failed', err);
  } finally {
    // Always try to cleanup
    if (roomCode) {
      await testCleanup(roomCode);
    }

    displaySummary(startTime, roomCode);
  }
}

// Handle CLI arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
TriviaForge Automated Test Runner

Usage:
  npm run test:session              Run default test scenario
  npm run test:stress               Run stress test with 20 players
  node test-runner.js [options]     Run with custom options

Environment Variables:
  TEST_SERVER_URL        Server URL (default: http://localhost:3000)
  TEST_QUIZ_ID           Quiz ID to use (default: 1)
  TEST_PLAYERS           Number of players (default: 5)
  TEST_ANSWER_DELAY      Max delay between answers in ms (default: 2000)
  TEST_QUESTION_DELAY    Delay between questions in ms (default: 5000)
  TEST_DISCONNECTS       Simulate disconnections (default: false)
  TEST_VERBOSE           Verbose output (default: false)

Examples:
  TEST_PLAYERS=10 npm run test:session
  TEST_VERBOSE=true node test-runner.js
  TEST_QUIZ_ID=2 TEST_PLAYERS=15 npm run test:session

Requirements:
  - Server must be running with DEBUG_MODE=true
  - Set in .env file: NODE_ENV=development
  - Restart server after changing: docker-compose restart app
`);
  process.exit(0);
}

// Run the tests
runTests().catch(err => {
  log(`\n${'='.repeat(60)}`, colors.red);
  log('  FATAL ERROR', colors.bright + colors.red);
  log(`${'='.repeat(60)}`, colors.red);
  log(err.message, colors.red);
  if (config.verbose) {
    console.error(err);
  }
  process.exit(1);
});
