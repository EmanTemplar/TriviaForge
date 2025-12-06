#!/usr/bin/env node

/**
 * TriviaForge Debug CLI Tool
 *
 * Quick console-based debugging for TriviaForge
 * Run commands to check system status, create test data, and diagnose issues
 *
 * Usage:
 *   node debug-cli.js <command> [options]
 *
 * Commands:
 *   status              - Show system state (rooms, players, memory)
 *   room <code>         - Inspect specific room
 *   create-room [code]  - Create test room
 *   add-player <room> <username> - Add test player
 *   test-flow           - Run complete automated test
 *   cleanup             - Delete all test data
 *   health              - Quick health check
 */

import fetch from 'node-fetch';

const API_BASE = process.env.DEBUG_API_URL || 'http://localhost:3000/api/debug';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Helper functions
function log(msg, color = 'white') {
  console.log(colors[color] + msg + colors.reset);
}

function success(msg) { log('✅ ' + msg, 'green'); }
function error(msg) { log('❌ ' + msg, 'red'); }
function info(msg) { log('ℹ️  ' + msg, 'cyan'); }
function warn(msg) { log('⚠️  ' + msg, 'yellow'); }

async function apiCall(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to server. Is it running?');
    }
    throw err;
  }
}

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
}

// Commands

async function cmdStatus() {
  info('Fetching system state...\n');

  const state = await apiCall('/state');

  log('═══════════════════════════════════════', 'blue');
  log('  SYSTEM STATUS', 'bright');
  log('═══════════════════════════════════════', 'blue');

  console.log(`📊 Live Rooms:    ${colors.bright}${state.totalRooms}${colors.reset}`);
  console.log(`👥 Total Players: ${colors.bright}${state.totalPlayers}${colors.reset}`);
  console.log(`⏱️  Uptime:        ${colors.bright}${formatUptime(state.serverUptime)}${colors.reset}`);
  console.log(`💾 Memory:        ${colors.bright}${formatBytes(state.memoryUsage.heapUsed)}${colors.reset} / ${formatBytes(state.memoryUsage.heapTotal)}`);

  if (state.liveRooms.length > 0) {
    log('\n═══════════════════════════════════════', 'blue');
    log('  ACTIVE ROOMS', 'bright');
    log('═══════════════════════════════════════', 'blue');

    state.liveRooms.forEach(room => {
      console.log(`\n🎮 Room: ${colors.cyan}${room.roomCode}${colors.reset}`);
      console.log(`   Quiz: ${room.quizTitle}`);
      console.log(`   Players: ${room.players.length} (${room.players.filter(p => !p.isSpectator).length} non-spectators)`);
      console.log(`   Question: ${room.currentQuestionIndex !== null ? room.currentQuestionIndex : 'None'}`);
      console.log(`   Status: ${room.status}`);
    });
  } else {
    log('\n📭 No active rooms', 'yellow');
  }

  log('\n═══════════════════════════════════════\n', 'blue');
}

async function cmdRoom(roomCode) {
  if (!roomCode) {
    error('Room code is required');
    console.log('Usage: node debug-cli.js room <CODE>');
    process.exit(1);
  }

  info(`Fetching room ${roomCode}...\n`);

  const room = await apiCall(`/room/${roomCode}`);

  log('═══════════════════════════════════════', 'blue');
  log(`  ROOM: ${roomCode}`, 'bright');
  log('═══════════════════════════════════════', 'blue');

  console.log(`\n📚 Quiz: ${colors.cyan}${room.quizData.title}${colors.reset}`);
  console.log(`   Total Questions: ${room.quizData.totalQuestions}`);
  console.log(`   Current Question: ${room.currentQuestionIndex !== null ? room.currentQuestionIndex : 'None'}`);
  console.log(`   Presented: [${room.presentedQuestions.join(', ')}]`);
  console.log(`   Revealed: [${room.revealedQuestions.join(', ')}]`);

  if (room.players.length > 0) {
    log('\n👥 PLAYERS:', 'bright');
    room.players.forEach(player => {
      const status = player.connected ? colors.green + '●' : colors.red + '○';
      const spectator = player.isSpectator ? colors.yellow + '(spectator)' : '';
      console.log(`   ${status}${colors.reset} ${player.displayName} (@${player.username}) ${spectator}`);
      console.log(`      Answers: ${Object.keys(player.answers || {}).length}`);
      if (player.currentChoice !== null && player.currentChoice !== undefined) {
        console.log(`      Current choice: ${player.currentChoice}`);
      }
    });
  } else {
    log('\n📭 No players in room', 'yellow');
  }

  log('\n═══════════════════════════════════════\n', 'blue');
}

async function cmdCreateRoom(roomCode) {
  info('Creating test room...\n');

  const result = await apiCall('/create-test-room', 'POST', {
    roomCode: roomCode || undefined
  });

  success(`Room created: ${result.roomCode}`);
  console.log(`   Quiz: ${result.quizTitle}`);
  console.log(`   Questions: ${result.questionsCount}`);
}

async function cmdAddPlayer(roomCode, username) {
  if (!roomCode || !username) {
    error('Room code and username are required');
    console.log('Usage: node debug-cli.js add-player <ROOM> <USERNAME>');
    process.exit(1);
  }

  info(`Adding player ${username} to room ${roomCode}...\n`);

  const result = await apiCall('/add-test-player', 'POST', {
    roomCode,
    username,
    displayName: username
  });

  success(result.message);
  console.log(`   Players in room: ${result.playersCount}`);
}

async function cmdTestFlow() {
  info('Running automated test scenario...\n');

  const result = await apiCall('/run-test-scenario', 'POST', {
    scenario: 'basic-quiz-flow'
  });

  log('═══════════════════════════════════════', 'blue');
  log('  TEST SCENARIO RESULTS', 'bright');
  log('═══════════════════════════════════════', 'blue');

  result.steps.forEach((step, i) => {
    const icon = step.success ? '✅' : '❌';
    console.log(`${i + 1}. ${icon} ${step.step}`);
    if (step.roomCode) console.log(`   Room: ${colors.cyan}${step.roomCode}${colors.reset}`);
    if (step.count) console.log(`   Count: ${step.count}`);
    if (step.questionIndex !== undefined) console.log(`   Question: ${step.questionIndex}`);
    if (step.correctAnswers !== undefined) {
      console.log(`   Results: ${step.correctAnswers}/${step.totalPlayers} correct`);
    }
  });

  log('\n' + result.message, 'green');
  log(`Room Code: ${colors.cyan}${result.roomCode}${colors.reset}`, 'bright');
  log('\n═══════════════════════════════════════\n', 'blue');
}

async function cmdCleanup() {
  warn('This will delete ALL test data!\n');

  const result = await apiCall('/cleanup', 'POST', {
    deleteRooms: true,
    deleteTestUsers: true
  });

  success(result.message);
  console.log(`   Rooms deleted: ${result.roomsDeleted}`);
  console.log(`   Users deleted: ${result.usersDeleted}`);
}

async function cmdHealth() {
  try {
    const state = await apiCall('/state');

    const checks = [];

    // Check if server is responding
    checks.push({ name: 'Server responding', passed: true });

    // Check memory usage
    const memPercent = (state.memoryUsage.heapUsed / state.memoryUsage.heapTotal) * 100;
    checks.push({
      name: 'Memory usage',
      passed: memPercent < 90,
      detail: `${memPercent.toFixed(1)}%`
    });

    // Check if server has been up for reasonable time
    checks.push({
      name: 'Server uptime',
      passed: state.serverUptime > 0,
      detail: formatUptime(state.serverUptime)
    });

    log('═══════════════════════════════════════', 'blue');
    log('  HEALTH CHECK', 'bright');
    log('═══════════════════════════════════════', 'blue');

    checks.forEach(check => {
      const icon = check.passed ? '✅' : '❌';
      const detail = check.detail ? ` (${check.detail})` : '';
      console.log(`${icon} ${check.name}${detail}`);
    });

    const allPassed = checks.every(c => c.passed);

    if (allPassed) {
      log('\n✅ All checks passed - System healthy\n', 'green');
    } else {
      log('\n⚠️  Some checks failed - Review above\n', 'yellow');
    }

    log('═══════════════════════════════════════\n', 'blue');

    process.exit(allPassed ? 0 : 1);

  } catch (err) {
    error('Health check failed: ' + err.message);
    process.exit(1);
  }
}

// User Management Commands

async function cmdListUsers() {
  info('Fetching users...\n');

  const data = await apiCall('/users');

  log('═══════════════════════════════════════', 'blue');
  log('  USER LIST', 'bright');
  log('═══════════════════════════════════════', 'blue');

  console.log(`Total Users: ${colors.bright}${data.totalUsers}${colors.reset}\n`);

  if (data.users.length === 0) {
    log('No users found', 'yellow');
  } else {
    data.users.forEach(user => {
      const typeColor = user.account_type === 'admin' ? 'red' : user.account_type === 'player' ? 'green' : 'yellow';
      const pwdIcon = user.has_password ? '🔒' : '🔓';
      console.log(`${pwdIcon} ${colors[typeColor]}${user.username}${colors.reset} (${user.account_type})`);
      console.log(`   ID: ${user.id} | Created: ${new Date(user.created_at).toLocaleString()}`);
    });
  }

  log('\n═══════════════════════════════════════\n', 'blue');
}

async function cmdUserInfo(username) {
  if (!username) {
    error('Username is required');
    console.log('Usage: node debug-cli.js user <USERNAME>');
    process.exit(1);
  }

  info(`Fetching info for ${username}...\n`);

  const data = await apiCall(`/user/${username}`);

  log('═══════════════════════════════════════', 'blue');
  log(`  USER: ${username}`, 'bright');
  log('═══════════════════════════════════════', 'blue');

  console.log(`\nID: ${data.user.id}`);
  console.log(`Username: ${colors.cyan}${data.user.username}${colors.reset}`);
  console.log(`Account Type: ${data.user.account_type}`);
  console.log(`Has Password: ${data.user.has_password ? colors.green + 'Yes' : colors.red + 'No'}${colors.reset}`);
  if (data.user.password_hash) {
    console.log(`Password Hash: ${data.user.password_hash}`);
  }
  console.log(`Created: ${new Date(data.user.created_at).toLocaleString()}`);
  console.log(`Updated: ${new Date(data.user.updated_at).toLocaleString()}`);

  if (data.sessions.length > 0) {
    console.log(`\n📱 Active Sessions: ${data.sessions.length}`);
    data.sessions.forEach((session, i) => {
      console.log(`   ${i + 1}. Expires: ${new Date(session.expires_at).toLocaleString()}`);
    });
  } else {
    console.log('\n📭 No active sessions');
  }

  log('\n═══════════════════════════════════════\n', 'blue');
}

async function cmdResetPassword(username, newPassword) {
  if (!username) {
    error('Username is required');
    console.log('Usage: node debug-cli.js reset-password <USERNAME> [NEW_PASSWORD]');
    console.log('       Leave NEW_PASSWORD empty to clear password');
    process.exit(1);
  }

  if (newPassword) {
    info(`Setting new password for ${username}...\n`);
  } else {
    warn(`Clearing password for ${username}...\n`);
  }

  const data = await apiCall('/reset-password', 'POST', {
    username,
    newPassword
  });

  success(data.message);
  if (data.sessionsInvalidated) {
    console.log('   All user sessions have been invalidated');
  }
}

async function cmdTestPasswordReset(username) {
  if (!username) {
    error('Username is required');
    console.log('Usage: node debug-cli.js test-password <USERNAME>');
    process.exit(1);
  }

  info(`Running password reset tests for ${username}...\n`);

  const data = await apiCall('/test-password-reset', 'POST', { username });

  log('═══════════════════════════════════════', 'blue');
  log('  PASSWORD RESET TEST RESULTS', 'bright');
  log('═══════════════════════════════════════', 'blue');

  console.log(`\nUser: ${colors.cyan}${data.user.username}${colors.reset} (ID: ${data.user.id})`);
  console.log(`Account Type: ${data.user.accountType}\n`);

  data.tests.forEach((test, i) => {
    const icon = test.passed ? '✅' : '❌';
    console.log(`${i + 1}. ${icon} ${test.test}`);
    console.log(`   ${test.result}`);
  });

  if (data.success) {
    log('\n✅ All password reset tests passed\n', 'green');
  } else {
    log('\n❌ Some password reset tests failed\n', 'red');
  }

  log('═══════════════════════════════════════\n', 'blue');
}

async function cmdCreateUser(username, password) {
  if (!username) {
    error('Username is required');
    console.log('Usage: node debug-cli.js create-user <USERNAME> [PASSWORD]');
    process.exit(1);
  }

  info(`Creating user ${username}...\n`);

  const data = await apiCall('/create-user', 'POST', {
    username,
    password,
    accountType: 'guest'
  });

  success(data.message);
  console.log(`   ID: ${data.user.id}`);
  console.log(`   Type: ${data.user.account_type}`);
}

async function cmdDeleteUser(username) {
  if (!username) {
    error('Username is required');
    console.log('Usage: node debug-cli.js delete-user <USERNAME>');
    process.exit(1);
  }

  warn(`Deleting user ${username}...\n`);

  const data = await apiCall(`/user/${username}`, 'DELETE');

  success(data.message);
  console.log(`   ID: ${data.user.id}`);
}

function showHelp() {
  console.log(`
${colors.bright}TriviaForge Debug CLI${colors.reset}

${colors.cyan}USAGE:${colors.reset}
  node debug-cli.js <command> [options]

${colors.cyan}ROOM COMMANDS:${colors.reset}
  ${colors.green}status${colors.reset}                Show system state (rooms, players, memory)
  ${colors.green}room <code>${colors.reset}           Inspect specific room details
  ${colors.green}create-room [code]${colors.reset}    Create test room (auto-generates code if not provided)
  ${colors.green}add-player <room> <user>${colors.reset}  Add test player to room
  ${colors.green}test-flow${colors.reset}             Run complete automated test scenario
  ${colors.green}cleanup${colors.reset}               Delete all test data (rooms + test users)

${colors.cyan}USER MANAGEMENT COMMANDS:${colors.reset}
  ${colors.green}users${colors.reset}                    List all users
  ${colors.green}user <username>${colors.reset}          Get user details and sessions
  ${colors.green}reset-password <user> [pwd]${colors.reset}  Reset user password (leave pwd empty to clear)
  ${colors.green}test-password <user>${colors.reset}     Test password reset functionality
  ${colors.green}create-user <user> [pwd]${colors.reset}  Create test user
  ${colors.green}delete-user <user>${colors.reset}       Delete user (cannot delete admin)

${colors.cyan}SYSTEM COMMANDS:${colors.reset}
  ${colors.green}health${colors.reset}                Quick health check (exit code 0 = healthy)
  ${colors.green}help${colors.reset}                  Show this help message

${colors.cyan}EXAMPLES:${colors.reset}
  ${colors.bright}Room Testing:${colors.reset}
    node debug-cli.js status
    node debug-cli.js room ABC123
    node debug-cli.js create-room
    node debug-cli.js test-flow

  ${colors.bright}User Management:${colors.reset}
    node debug-cli.js users
    node debug-cli.js user testPlayer1
    node debug-cli.js reset-password testPlayer1 newpass123
    node debug-cli.js test-password testPlayer1

${colors.cyan}ENVIRONMENT:${colors.reset}
  DEBUG_API_URL       Debug API base URL (default: http://localhost:3000/api/debug)

${colors.yellow}NOTE:${colors.reset} Debug mode must be enabled (NODE_ENV=development or DEBUG_MODE=true)
`);
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }

  try {
    switch (command) {
      case 'status':
        await cmdStatus();
        break;

      case 'room':
        await cmdRoom(args[1]);
        break;

      case 'create-room':
        await cmdCreateRoom(args[1]);
        break;

      case 'add-player':
        await cmdAddPlayer(args[1], args[2]);
        break;

      case 'test-flow':
        await cmdTestFlow();
        break;

      case 'cleanup':
        await cmdCleanup();
        break;

      case 'health':
        await cmdHealth();
        break;

      // User Management Commands
      case 'users':
        await cmdListUsers();
        break;

      case 'user':
        await cmdUserInfo(args[1]);
        break;

      case 'reset-password':
        await cmdResetPassword(args[1], args[2]);
        break;

      case 'test-password':
        await cmdTestPasswordReset(args[1]);
        break;

      case 'create-user':
        await cmdCreateUser(args[1], args[2]);
        break;

      case 'delete-user':
        await cmdDeleteUser(args[1]);
        break;

      default:
        error(`Unknown command: ${command}`);
        console.log('Run "node debug-cli.js help" for usage');
        process.exit(1);
    }
  } catch (err) {
    error(err.message);
    process.exit(1);
  }
}

main();
